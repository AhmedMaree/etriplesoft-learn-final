-- Admin analytics (Phase A): read-only aggregates for the admin console.
--
-- Learner data is owner-scoped by RLS, so platform-wide figures need SECURITY DEFINER functions. Each public
-- function re-checks the caller with public.assert_active_admin() (active admin role + MFA) before reading,
-- returns aggregates or a paginated learner roster only, and writes nothing.
--
-- Definitions shared by every figure:
-- * learner: a profile with no active admin/instructor role (staff are excluded everywhere);
-- * segment: paid (any paid, unrefunded order) > free (any free enrollment) > complimentary (admin-granted
--   access only) > none;
-- * progress: completed required published lessons in required modules / all of them (the completion rule's
--   own definition), 100 once the enrollment is completed;
-- * watched minutes: unique seconds covered per video (video_progress.watched_seconds), so rewatching is not
--   counted; true streaming minutes need a separate watch log (Phase B);
-- * dates are bucketed in Africa/Cairo, the platform's business timezone.
--
-- Figures are computed live. If they become slow, move them to scheduled rollup tables behind the same RPCs.

CREATE INDEX learning_activity_days_date_idx ON public.learning_activity_days(activity_date);
CREATE INDEX payments_confirmed_at_idx ON public.payments(confirmed_at) WHERE confirmed_at IS NOT NULL;

-- Private helpers: not exposed through the Data API and only callable by the definer functions below.
CREATE FUNCTION learning_private.analytics_learners()
RETURNS TABLE(user_id uuid, segment text)
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT p.id,
  CASE
   WHEN EXISTS(SELECT 1 FROM public.orders o WHERE o.user_id = p.id AND o.status = 'paid') THEN 'paid'
   WHEN EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id = p.id AND e.grant_source = 'free') THEN 'free'
   WHEN EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id = p.id AND e.grant_source = 'admin') THEN 'complimentary'
   ELSE 'none'
  END
 FROM public.profiles p
 WHERE NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.revoked_at IS NULL)
$$;

CREATE FUNCTION learning_private.analytics_enrollments()
RETURNS TABLE(enrollment_id uuid, user_id uuid, course_id uuid, grant_source text, status text, granted_at timestamptz, progress integer, watched_seconds bigint)
LANGUAGE sql STABLE SET search_path = '' AS $$
 WITH required AS (
  SELECT m.course_id, l.id AS lesson_id FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  WHERE m.is_required AND l.is_required AND l.status = 'published'
 ), required_count AS (
  SELECT r.course_id, count(*) AS n FROM required r GROUP BY r.course_id
 ), done AS (
  SELECT lp.enrollment_id, count(*) AS n FROM public.lesson_progress lp JOIN required r ON r.lesson_id = lp.lesson_id
  WHERE lp.status = 'completed' GROUP BY lp.enrollment_id
 ), watched AS (
  SELECT vp.enrollment_id, sum(vp.watched_seconds)::bigint AS n FROM public.video_progress vp GROUP BY vp.enrollment_id
 )
 SELECT e.id, e.user_id, e.course_id, e.grant_source, e.status, e.granted_at,
  CASE WHEN e.status = 'completed' THEN 100 WHEN rc.n > 0 THEN least(100, 100 * coalesce(d.n, 0) / rc.n)::integer END,
  coalesce(w.n, 0)
 FROM public.enrollments e
 LEFT JOIN required_count rc ON rc.course_id = e.course_id
 LEFT JOIN done d ON d.enrollment_id = e.id
 LEFT JOIN watched w ON w.enrollment_id = e.id
 WHERE NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = e.user_id AND r.revoked_at IS NULL)
$$;

REVOKE ALL ON FUNCTION learning_private.analytics_learners(), learning_private.analytics_enrollments()
 FROM PUBLIC, anon, authenticated, service_role;

-- Headline figures, breakdowns and a time series for the last p_days calendar days (Cairo), with the same-length
-- previous period for comparison. Daily buckets up to 90 days, weekly for a year.
CREATE FUNCTION public.admin_analytics_overview(p_days integer)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 tz constant text := 'Africa/Cairo';
 v_today date := (now() AT TIME ZONE tz)::date;
 v_start date; v_prev_start date; v_from timestamptz; v_prev timestamptz; v_bucket text; v_result jsonb;
BEGIN
 PERFORM public.assert_active_admin();
 IF p_days IS NULL OR p_days NOT IN (7, 30, 90, 365) THEN RAISE EXCEPTION 'invalid range' USING ERRCODE = '22023'; END IF;
 v_start := v_today - (p_days - 1);
 v_prev_start := v_start - p_days;
 v_from := v_start::timestamp AT TIME ZONE tz;
 v_prev := v_prev_start::timestamp AT TIME ZONE tz;
 v_bucket := CASE WHEN p_days = 365 THEN 'week' ELSE 'day' END;

 WITH learners AS MATERIALIZED (
  SELECT l.user_id, l.segment, p.created_at, pr.learner_type, pr.university, pr.company_name
  FROM learning_private.analytics_learners() l
  JOIN public.profiles p ON p.id = l.user_id
  LEFT JOIN public.learner_profiles pr ON pr.user_id = l.user_id
 ), enrolled AS MATERIALIZED (
  SELECT e.* FROM learning_private.analytics_enrollments() e
 ), activity AS MATERIALIZED (
  SELECT a.user_id, a.activity_date FROM public.learning_activity_days a JOIN learners l ON l.user_id = a.user_id
  WHERE a.activity_date >= least(v_prev_start, v_today - 29)
 ), money AS MATERIALIZED (
  -- A refund is a negative entry on the day it was confirmed, so net revenue per period is a plain sum.
  SELECT pay.confirmed_at AS at, o.total_minor AS amount, o.discount_minor AS discount, 1 AS paid_order
  FROM public.orders o JOIN public.payments pay ON pay.order_id = o.id
  WHERE o.status IN ('paid', 'refunded') AND pay.confirmed_at >= v_prev
  UNION ALL
  SELECT pay.refunded_at, -o.total_minor, 0, 0
  FROM public.orders o JOIN public.payments pay ON pay.order_id = o.id
  WHERE o.status = 'refunded' AND pay.refunded_at >= v_prev
 )
 SELECT jsonb_build_object(
  'range', jsonb_build_object('days', p_days, 'start', v_start, 'end', v_today, 'bucket', v_bucket, 'timezone', tz),
  'users', jsonb_build_object(
   'total', (SELECT count(*) FROM learners),
   'new', (SELECT count(*) FROM learners WHERE created_at >= v_from),
   'newPrev', (SELECT count(*) FROM learners WHERE created_at >= v_prev AND created_at < v_from),
   'byType', (SELECT coalesce(jsonb_object_agg(k, n), '{}') FROM (
     SELECT coalesce(learner_type, 'not_onboarded') AS k, count(*) AS n FROM learners GROUP BY 1) x),
   'bySegment', (SELECT coalesce(jsonb_object_agg(segment, n), '{}') FROM (
     SELECT segment, count(*) AS n FROM learners GROUP BY 1) x),
   -- Has had access for 14+ days, still active, and no learning activity in the last 14 days.
   'atRisk', (SELECT count(*) FROM learners l
     WHERE EXISTS(SELECT 1 FROM enrolled e WHERE e.user_id = l.user_id AND e.status = 'active' AND e.granted_at < now() - interval '14 days')
     AND NOT EXISTS(SELECT 1 FROM activity a WHERE a.user_id = l.user_id AND a.activity_date > v_today - 14))
  ),
  'activity', jsonb_build_object(
   'today', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date = v_today),
   'week', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date > v_today - 7),
   'month', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date > v_today - 30),
   'range', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date >= v_start),
   'rangePrev', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date >= v_prev_start AND activity_date < v_start)
  ),
  'learning', jsonb_build_object(
   'enrollments', (SELECT count(*) FROM enrolled WHERE granted_at >= v_from),
   'enrollmentsPrev', (SELECT count(*) FROM enrolled WHERE granted_at >= v_prev AND granted_at < v_from),
   'bySource', (SELECT coalesce(jsonb_object_agg(grant_source, n), '{}') FROM (
     SELECT grant_source, count(*) AS n FROM enrolled WHERE granted_at >= v_from GROUP BY 1) x),
   'completions', (SELECT count(*) FROM public.course_completions c JOIN enrolled e ON e.enrollment_id = c.enrollment_id WHERE c.completed_at >= v_from),
   'completionsPrev', (SELECT count(*) FROM public.course_completions c JOIN enrolled e ON e.enrollment_id = c.enrollment_id
     WHERE c.completed_at >= v_prev AND c.completed_at < v_from),
   'certificates', (SELECT count(*) FROM public.certificates c WHERE c.issued_at >= v_from AND c.revoked_at IS NULL),
   'activeEnrollments', (SELECT count(*) FROM enrolled WHERE status = 'active'),
   'averageProgress', (SELECT round(avg(progress))::integer FROM enrolled WHERE status IN ('active', 'completed')),
   'watchedMinutes', (SELECT floor(coalesce(sum(watched_seconds), 0) / 60)::bigint FROM enrolled)
  ),
  'revenue', jsonb_build_object(
   'currency', 'EGP',
   'gross', (SELECT coalesce(sum(amount), 0) FROM money WHERE at >= v_from AND amount > 0),
   'refunds', (SELECT coalesce(-sum(amount), 0) FROM money WHERE at >= v_from AND amount < 0),
   'net', (SELECT coalesce(sum(amount), 0) FROM money WHERE at >= v_from),
   'netPrev', (SELECT coalesce(sum(amount), 0) FROM money WHERE at >= v_prev AND at < v_from),
   'paidOrders', (SELECT coalesce(sum(paid_order), 0) FROM money WHERE at >= v_from),
   'discounts', (SELECT coalesce(sum(discount), 0) FROM money WHERE at >= v_from),
   'ordersCreated', (SELECT count(*) FROM public.orders o WHERE o.created_at >= v_from),
   'ordersAbandoned', (SELECT count(*) FROM public.orders o WHERE o.created_at >= v_from AND o.status = 'pending' AND o.expires_at < now())
  ),
  -- Institution names are free text until Phase B normalizes them; group case- and space-insensitively.
  'institutions', jsonb_build_object(
   'universities', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'learners', n) ORDER BY n DESC, name), '[]') FROM (
     SELECT min(btrim(university)) AS name, count(*) AS n FROM learners WHERE university IS NOT NULL
     GROUP BY lower(btrim(university)) ORDER BY n DESC, name LIMIT 8) x),
   'universityCount', (SELECT count(DISTINCT lower(btrim(university))) FROM learners),
   'companies', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'learners', n) ORDER BY n DESC, name), '[]') FROM (
     SELECT min(btrim(company_name)) AS name, count(*) AS n FROM learners WHERE company_name IS NOT NULL
     GROUP BY lower(btrim(company_name)) ORDER BY n DESC, name LIMIT 8) x),
   'companyCount', (SELECT count(DISTINCT lower(btrim(company_name))) FROM learners)
  ),
  'series', (SELECT jsonb_agg(jsonb_build_object(
     'date', g.d, 'signups', coalesce(s.n, 0), 'active', coalesce(act.n, 0), 'enrollments', coalesce(en.n, 0), 'revenue', coalesce(m.n, 0)
    ) ORDER BY g.d)
   FROM (SELECT gs::date AS d FROM generate_series(date_trunc(v_bucket, v_start::timestamp), v_today::timestamp, ('1 ' || v_bucket)::interval) gs) g
   LEFT JOIN (SELECT date_trunc(v_bucket, created_at AT TIME ZONE tz)::date AS d, count(*) AS n FROM learners WHERE created_at >= v_from GROUP BY 1) s ON s.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, activity_date::timestamp)::date AS d, count(DISTINCT user_id) AS n FROM activity WHERE activity_date >= v_start GROUP BY 1) act ON act.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, granted_at AT TIME ZONE tz)::date AS d, count(*) AS n FROM enrolled WHERE granted_at >= v_from GROUP BY 1) en ON en.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, at AT TIME ZONE tz)::date AS d, sum(amount) AS n FROM money WHERE at >= v_from GROUP BY 1) m ON m.d = g.d)
 ) INTO v_result;
 RETURN v_result;
END $$;

-- One row per published or archived course. Enrollment counts exclude revoked and refunded access; revenue and
-- new enrollments cover the selected period, everything else is lifetime. Completion rate uses the 30-day cohort
-- (access granted at least 30 days ago) so a burst of new enrollments does not drag it down.
CREATE FUNCTION public.admin_analytics_courses(p_days integer, p_locale text)
RETURNS TABLE(
 course_id uuid, slug text, title text, status text, price_minor bigint,
 enrollments bigint, enrollments_new bigint, free_enrollments bigint, paid_enrollments bigint, admin_enrollments bigint,
 active_learners bigint, completed bigint, cohort_size bigint, cohort_completed bigint, average_progress integer,
 watched_minutes bigint, quiz_attempts bigint, quiz_passed bigint, rating numeric, reviews bigint, revenue_minor bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
 tz constant text := 'Africa/Cairo';
 v_from timestamptz;
BEGIN
 PERFORM public.assert_active_admin();
 IF p_days IS NULL OR p_days NOT IN (7, 30, 90, 365) OR p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
  RAISE EXCEPTION 'invalid analytics request' USING ERRCODE = '22023';
 END IF;
 v_from := (((now() AT TIME ZONE tz)::date - (p_days - 1))::timestamp) AT TIME ZONE tz;

 RETURN QUERY
 WITH enrolled AS MATERIALIZED (
  SELECT e.* FROM learning_private.analytics_enrollments() e
 ), valid AS (
  SELECT e.* FROM enrolled e WHERE e.status NOT IN ('revoked', 'refunded')
 ), sales AS (
  -- Each item's share of its order's discounted total, credited when paid and debited when refunded.
  SELECT oi.course_id, pay.confirmed_at, pay.refunded_at,
   round(oi.amount_minor * o.total_minor::numeric / o.subtotal_minor)::bigint AS amount
  FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id JOIN public.payments pay ON pay.order_id = o.id
  WHERE o.status IN ('paid', 'refunded')
 )
 SELECT c.id, c.slug, coalesce(t.title, other.title, c.slug), c.status, c.price_minor,
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id),
  (SELECT count(*) FROM enrolled e WHERE e.course_id = c.id AND e.granted_at >= v_from),
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id AND v.grant_source = 'free'),
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id AND v.grant_source = 'paid'),
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id AND v.grant_source = 'admin'),
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id AND v.status = 'active'),
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id AND v.status = 'completed'),
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id AND v.granted_at <= now() - interval '30 days'),
  (SELECT count(*) FROM valid v WHERE v.course_id = c.id AND v.granted_at <= now() - interval '30 days' AND v.status = 'completed'),
  (SELECT round(avg(v.progress))::integer FROM valid v WHERE v.course_id = c.id AND v.status IN ('active', 'completed')),
  (SELECT floor(coalesce(sum(e.watched_seconds), 0) / 60)::bigint FROM enrolled e WHERE e.course_id = c.id),
  (SELECT count(*) FROM public.quiz_attempts qa JOIN enrolled e ON e.enrollment_id = qa.enrollment_id WHERE e.course_id = c.id AND qa.status <> 'active'),
  (SELECT count(*) FROM public.quiz_attempts qa JOIN enrolled e ON e.enrollment_id = qa.enrollment_id WHERE e.course_id = c.id AND qa.passed),
  (SELECT round(avg(r.rating), 1) FROM public.course_reviews r WHERE r.course_id = c.id),
  (SELECT count(*) FROM public.course_reviews r WHERE r.course_id = c.id),
  (SELECT coalesce(sum(CASE WHEN s.confirmed_at >= v_from THEN s.amount ELSE 0 END)
     - sum(CASE WHEN s.refunded_at >= v_from THEN s.amount ELSE 0 END), 0) FROM sales s WHERE s.course_id = c.id)::bigint
 FROM public.courses c
 LEFT JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
 LEFT JOIN public.course_translations other ON other.course_id = c.id AND other.locale <> p_locale
 WHERE c.status IN ('published', 'archived')
 ORDER BY 6 DESC, c.slug;
END $$;

-- Per-lesson funnel for one course: how many of its learners started and completed each published lesson, in
-- curriculum order, plus average coverage of the lesson's videos. Drop-off shows where learners stop.
CREATE FUNCTION public.admin_analytics_course_lessons(p_course_id uuid, p_locale text)
RETURNS TABLE(
 lesson_id uuid, module_position integer, lesson_position integer, title text, lesson_type text, is_required boolean,
 learners bigint, started bigint, completed bigint, average_watch_percent integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM public.assert_active_admin();
 IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'invalid analytics request' USING ERRCODE = '22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.courses c WHERE c.id = p_course_id) THEN RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002'; END IF;

 RETURN QUERY
 WITH cohort AS MATERIALIZED (
  SELECT e.enrollment_id FROM learning_private.analytics_enrollments() e
  WHERE e.course_id = p_course_id AND e.status IN ('active', 'completed')
 )
 SELECT l.id, m.position, l.position, coalesce(t.title, other.title, ''), l.lesson_type, l.is_required AND m.is_required,
  (SELECT count(*) FROM cohort),
  (SELECT count(*) FROM public.lesson_progress lp JOIN cohort ch ON ch.enrollment_id = lp.enrollment_id WHERE lp.lesson_id = l.id),
  (SELECT count(*) FROM public.lesson_progress lp JOIN cohort ch ON ch.enrollment_id = lp.enrollment_id WHERE lp.lesson_id = l.id AND lp.status = 'completed'),
  (SELECT round(avg(100.0 * vp.watched_seconds / vp.duration_seconds))::integer
   FROM public.video_progress vp JOIN cohort ch ON ch.enrollment_id = vp.enrollment_id
   JOIN public.lesson_videos lv ON lv.id = vp.lesson_video_id WHERE lv.lesson_id = l.id)
 FROM public.lessons l
 JOIN public.course_modules m ON m.id = l.module_id
 LEFT JOIN public.lesson_translations t ON t.lesson_id = l.id AND t.locale = p_locale
 LEFT JOIN public.lesson_translations other ON other.lesson_id = l.id AND other.locale <> p_locale
 WHERE m.course_id = p_course_id AND l.status = 'published'
 ORDER BY m.position, l.position;
END $$;

-- Paginated learner roster with each learner's progress. Search matches email, name or institution; % and _ are
-- literal. An empty search or segment means no filter. Admins already see learner emails on the roles and enrollment screens.
CREATE FUNCTION public.admin_analytics_learners(p_search text, p_segment text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
RETURNS TABLE(
 user_id uuid, display_name text, email text, learner_type text, institution text, segment text, joined_at timestamptz,
 enrollments bigint, completed bigint, average_progress integer, watched_minutes bigint, last_active date, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
 v_search text := nullif(btrim(coalesce(p_search, '')), '');
 v_segment text := nullif(p_segment, '');
 v_pattern text;
BEGIN
 PERFORM public.assert_active_admin();
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000
    OR (v_segment IS NOT NULL AND v_segment NOT IN ('paid', 'free', 'complimentary', 'none'))
    OR char_length(coalesce(v_search, '')) > 120 THEN
  RAISE EXCEPTION 'invalid analytics request' USING ERRCODE = '22023';
 END IF;
 IF v_search IS NOT NULL THEN
  v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
 END IF;

 RETURN QUERY
 WITH roster AS (
  SELECT l.user_id, p.display_name, u.email::text AS email, pr.learner_type,
   coalesce(pr.university, pr.company_name) AS institution, l.segment, p.created_at,
   (SELECT max(a.activity_date) FROM public.learning_activity_days a WHERE a.user_id = l.user_id) AS last_active
  FROM learning_private.analytics_learners() l
  JOIN public.profiles p ON p.id = l.user_id
  JOIN auth.users u ON u.id = l.user_id
  LEFT JOIN public.learner_profiles pr ON pr.user_id = l.user_id
  WHERE (v_segment IS NULL OR l.segment = v_segment)
   AND (v_pattern IS NULL OR u.email ILIKE v_pattern OR coalesce(p.display_name, '') ILIKE v_pattern
    OR coalesce(pr.university, pr.company_name, '') ILIKE v_pattern)
 ), page AS (
  SELECT r.*, count(*) OVER () AS total FROM roster r
  ORDER BY r.last_active DESC NULLS LAST, r.created_at DESC, r.user_id
  LIMIT p_limit OFFSET p_offset
 ), stats AS (
  SELECT e.user_id,
   count(*) FILTER (WHERE e.status NOT IN ('revoked', 'refunded')) AS enrollments,
   count(*) FILTER (WHERE e.status = 'completed') AS completed,
   round(avg(e.progress) FILTER (WHERE e.status IN ('active', 'completed')))::integer AS progress,
   floor(sum(e.watched_seconds) / 60)::bigint AS minutes
  FROM learning_private.analytics_enrollments() e WHERE e.user_id IN (SELECT pg.user_id FROM page pg)
  GROUP BY e.user_id
 )
 SELECT pg.user_id, pg.display_name, pg.email, pg.learner_type, pg.institution, pg.segment, pg.created_at,
  coalesce(s.enrollments, 0), coalesce(s.completed, 0), s.progress, coalesce(s.minutes, 0), pg.last_active, pg.total
 FROM page pg LEFT JOIN stats s ON s.user_id = pg.user_id
 ORDER BY pg.last_active DESC NULLS LAST, pg.created_at DESC, pg.user_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_analytics_overview(integer), public.admin_analytics_courses(integer, text),
 public.admin_analytics_course_lessons(uuid, text), public.admin_analytics_learners(text, text, integer, integer)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_overview(integer), public.admin_analytics_courses(integer, text),
 public.admin_analytics_course_lessons(uuid, text), public.admin_analytics_learners(text, text, integer, integer)
 TO authenticated;
