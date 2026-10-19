-- Learning calendar, in-app notifications and learning streaks.
-- Product approval: user request 2026-10-18 (activates Phase 23 / D04 and Phase 24 / D05 for V1).
--
-- * course_events: sessions, office hours, workshops, deadlines and quiz dates that administrators
--   schedule for a course. Only learners with a current entitlement to that course see them (and
--   their meeting links). No table grants: every read and write goes through a narrow function.
-- * learner_study_sessions: personal study time a learner plans for themselves (owner only).
-- * notifications: an owner inbox written only by trusted database code (triggers on enrollments,
--   completions, certificates and quiz results, administrator scheduling, and the learner's own
--   reminder sync). There is no client insert path, so no caller can notify another learner.
-- * learning_activity_days: one row per learner per local day with genuine learning progress
--   (watched video time, a completed lesson, a submitted quiz). It is the source of the streak.
-- Local days use the learner's saved time zone (learner_preferences.timezone), falling back to UTC.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.course_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK (kind IN ('live_session','office_hours','workshop','deadline','quiz')),
 lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
 starts_at timestamptz NOT NULL,
 ends_at timestamptz,
 meeting_url text CHECK (meeting_url IS NULL OR (char_length(meeting_url) <= 500 AND meeting_url ~ '^https://[^[:space:]<>"]+$')),
 status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled')),
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 cancelled_at timestamptz,
 CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
 -- Deadlines and quiz dates are a single due moment; sessions last at most 12 hours.
 CHECK (CASE WHEN kind IN ('deadline','quiz') THEN ends_at IS NULL
   ELSE ends_at IS NULL OR (ends_at > starts_at AND ends_at <= starts_at + interval '12 hours') END)
);
CREATE INDEX course_events_course_time_idx ON public.course_events(course_id, starts_at);
CREATE INDEX course_events_time_idx ON public.course_events(starts_at) WHERE status = 'scheduled';
CREATE INDEX course_events_lesson_idx ON public.course_events(lesson_id) WHERE lesson_id IS NOT NULL;

CREATE TABLE public.course_event_translations (
 event_id uuid NOT NULL REFERENCES public.course_events(id) ON DELETE CASCADE,
 locale text NOT NULL CHECK (locale IN ('en','ar')),
 title text NOT NULL CHECK (title = btrim(title) AND char_length(title) BETWEEN 1 AND 160),
 description text CHECK (description IS NULL OR (description = btrim(description) AND char_length(description) BETWEEN 1 AND 2000)),
 PRIMARY KEY (event_id, locale)
);

CREATE TABLE public.learner_study_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (title = btrim(title) AND char_length(title) BETWEEN 1 AND 120),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at > starts_at AND ends_at <= starts_at + interval '8 hours')
);
CREATE INDEX learner_study_sessions_owner_time_idx ON public.learner_study_sessions(user_id, starts_at);

CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK (kind IN ('enrollment_started','course_completed','certificate_issued','quiz_passed',
   'quiz_failed','event_scheduled','event_cancelled','event_reminder','deadline_reminder','streak_reminder','streak_milestone')),
 course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
 lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
 event_id uuid REFERENCES public.course_events(id) ON DELETE CASCADE,
 certificate_id uuid REFERENCES public.certificates(id) ON DELETE CASCADE,
 -- Small, non-sensitive parameters only (scores, streak length). Text is localized at read time.
 data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) <= 1024),
 dedupe_key text NOT NULL CHECK (char_length(dedupe_key) BETWEEN 1 AND 200),
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz,
 CONSTRAINT notifications_one_per_source UNIQUE (user_id, dedupe_key)
);
CREATE INDEX notifications_owner_recent_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX notifications_owner_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX notifications_course_idx ON public.notifications(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX notifications_lesson_idx ON public.notifications(lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX notifications_event_idx ON public.notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX notifications_certificate_idx ON public.notifications(certificate_id) WHERE certificate_id IS NOT NULL;

CREATE TABLE public.learning_activity_days (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 activity_date date NOT NULL,
 first_at timestamptz NOT NULL,
 last_at timestamptz NOT NULL,
 activity_count integer NOT NULL DEFAULT 1 CHECK (activity_count > 0),
 PRIMARY KEY (user_id, activity_date),
 CHECK (last_at >= first_at)
);

ALTER TABLE public.course_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_event_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activity_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_events,public.course_event_translations,public.learner_study_sessions,
 public.notifications,public.learning_activity_days FROM PUBLIC,anon,authenticated,service_role;
-- Owners may read their own personal rows (data export); writes stay behind functions.
GRANT SELECT ON public.learner_study_sessions,public.notifications,public.learning_activity_days TO authenticated;
CREATE POLICY learner_study_sessions_owner ON public.learner_study_sessions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY notifications_owner ON public.notifications FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY learning_activity_days_owner ON public.learning_activity_days FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- Scheduling changes are audited against the course.
DO $$ DECLARE expr text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR action IN (''course.event_scheduled'',''course.event_cancelled''))';
END $$;

-- In-app reminders are on by default for new learners; existing saved choices are unchanged.
ALTER TABLE public.learner_preferences
 ALTER COLUMN course_reminders SET DEFAULT true,
 ALTER COLUMN assignment_deadlines SET DEFAULT true,
 ALTER COLUMN daily_learning_reminders SET DEFAULT true;

-- ---------------------------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------------------------
-- Local wall-clock time for a learner. A saved zone PostgreSQL does not recognise falls back to UTC,
-- so a bad preference can never break a progress write.
CREATE FUNCTION learning_private.local_time(p_user uuid, p_at timestamptz) RETURNS timestamp
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_zone text;
BEGIN
 SELECT p.timezone INTO v_zone FROM public.learner_preferences p WHERE p.user_id = p_user;
 BEGIN
  RETURN p_at AT TIME ZONE coalesce(v_zone, 'UTC');
 EXCEPTION WHEN OTHERS THEN
  RETURN p_at AT TIME ZONE 'UTC';
 END;
END $$;

CREATE FUNCTION learning_private.is_entitled(p_course_id uuid, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL AND EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id = p_user AND e.course_id = p_course_id
  AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at > now()));
$$;

-- Consecutive-day runs up to p_today. The current streak is the run ending today or yesterday,
-- so it stays alive until the learner misses a whole local day.
CREATE FUNCTION learning_private.streak_stats(p_user uuid, p_today date)
RETURNS TABLE(current_streak integer, longest_streak integer, total_days integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH days AS (
  SELECT a.activity_date, a.activity_date - (row_number() OVER (ORDER BY a.activity_date))::integer AS run
  FROM public.learning_activity_days a WHERE a.user_id = p_user AND a.activity_date <= p_today
 ), runs AS (
  SELECT max(activity_date) AS last_day, count(*)::integer AS length FROM days GROUP BY run
 )
 SELECT coalesce((SELECT r.length FROM runs r WHERE r.last_day >= p_today - 1 ORDER BY r.last_day DESC LIMIT 1), 0),
  coalesce((SELECT max(r.length) FROM runs r), 0),
  (SELECT count(*)::integer FROM days);
$$;

CREATE FUNCTION learning_private.record_activity(p_user uuid, p_at timestamptz) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_day date := learning_private.local_time(p_user, p_at)::date; v_new boolean; v_streak integer;
BEGIN
 IF p_user IS NULL OR p_at IS NULL THEN RETURN; END IF;
 INSERT INTO public.learning_activity_days AS a(user_id, activity_date, first_at, last_at)
 VALUES (p_user, v_day, p_at, p_at)
 ON CONFLICT (user_id, activity_date) DO UPDATE
  SET first_at = least(a.first_at, excluded.first_at), last_at = greatest(a.last_at, excluded.last_at), activity_count = a.activity_count + 1
 RETURNING (xmax = 0) INTO v_new;
 IF v_new THEN
  SELECT s.current_streak INTO v_streak FROM learning_private.streak_stats(p_user, v_day) s;
  IF v_streak IN (3, 7, 14, 30, 50, 100, 200, 365) THEN
   INSERT INTO public.notifications(user_id, kind, data, dedupe_key)
   VALUES (p_user, 'streak_milestone', jsonb_build_object('days', v_streak), 'streak-milestone:' || v_day)
   ON CONFLICT DO NOTHING;
  END IF;
 END IF;
END $$;

-- Every learner with a current entitlement to the course is told about a schedule change.
CREATE FUNCTION learning_private.notify_course_learners(p_course_id uuid, p_event_id uuid, p_kind text, p_key text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.notifications(user_id, kind, course_id, event_id, dedupe_key)
 SELECT DISTINCT e.user_id, p_kind, p_course_id, p_event_id, p_key FROM public.enrollments e
 WHERE e.course_id = p_course_id AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at > now())
 ON CONFLICT DO NOTHING;
$$;

-- ---------------------------------------------------------------------------------------------
-- Trusted event sources
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION learning_private.on_lesson_progress() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'completed') THEN
  PERFORM learning_private.record_activity(e.user_id, coalesce(NEW.completed_at, clock_timestamp()))
  FROM public.enrollments e WHERE e.id = NEW.enrollment_id;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER lesson_progress_learning_activity AFTER INSERT OR UPDATE OF status ON public.lesson_progress
 FOR EACH ROW EXECUTE FUNCTION learning_private.on_lesson_progress();

CREATE FUNCTION learning_private.on_video_progress() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM learning_private.record_activity(e.user_id, NEW.updated_at) FROM public.enrollments e WHERE e.id = NEW.enrollment_id;
 RETURN NULL;
END $$;
CREATE TRIGGER video_progress_learning_activity AFTER UPDATE OF watched_seconds ON public.video_progress
 FOR EACH ROW WHEN (NEW.watched_seconds > OLD.watched_seconds) EXECUTE FUNCTION learning_private.on_video_progress();

CREATE FUNCTION learning_private.on_quiz_finished() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM learning_private.record_activity(NEW.user_id, NEW.submitted_at);
 INSERT INTO public.notifications(user_id, kind, course_id, lesson_id, data, dedupe_key)
 SELECT NEW.user_id, CASE WHEN NEW.passed THEN 'quiz_passed' ELSE 'quiz_failed' END, e.course_id, q.lesson_id,
  jsonb_build_object('score', NEW.score, 'possible', NEW.possible_score), 'quiz-attempt:' || NEW.id
 FROM public.enrollments e, public.quizzes q WHERE e.id = NEW.enrollment_id AND q.id = NEW.quiz_id
 ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;
CREATE TRIGGER quiz_attempts_finished AFTER UPDATE OF status ON public.quiz_attempts
 FOR EACH ROW WHEN (OLD.status = 'active' AND NEW.status <> 'active') EXECUTE FUNCTION learning_private.on_quiz_finished();

CREATE FUNCTION learning_private.on_enrollment_started() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.notifications(user_id, kind, course_id, dedupe_key)
 VALUES (NEW.user_id, 'enrollment_started', NEW.course_id, 'enrollment:' || NEW.id) ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;
CREATE TRIGGER enrollments_started_notification AFTER INSERT ON public.enrollments
 FOR EACH ROW WHEN (NEW.status = 'active') EXECUTE FUNCTION learning_private.on_enrollment_started();

CREATE FUNCTION learning_private.on_course_completed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.notifications(user_id, kind, course_id, dedupe_key)
 SELECT e.user_id, 'course_completed', e.course_id, 'completion:' || NEW.id FROM public.enrollments e WHERE e.id = NEW.enrollment_id
 ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;
CREATE TRIGGER course_completions_notification AFTER INSERT ON public.course_completions
 FOR EACH ROW EXECUTE FUNCTION learning_private.on_course_completed();

CREATE FUNCTION learning_private.on_certificate_issued() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.notifications(user_id, kind, course_id, certificate_id, dedupe_key)
 SELECT e.user_id, 'certificate_issued', e.course_id, NEW.id, 'certificate:' || NEW.id
 FROM public.course_completions cc JOIN public.enrollments e ON e.id = cc.enrollment_id WHERE cc.id = NEW.course_completion_id
 ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;
CREATE TRIGGER certificates_issued_notification AFTER INSERT ON public.certificates
 FOR EACH ROW EXECUTE FUNCTION learning_private.on_certificate_issued();

-- Existing progress counts toward streaks from the start.
INSERT INTO public.learning_activity_days(user_id, activity_date, first_at, last_at, activity_count)
SELECT x.user_id, learning_private.local_time(x.user_id, x.at)::date, min(x.at), max(x.at), count(*)::integer
FROM (
 SELECT e.user_id, lp.completed_at AS at FROM public.lesson_progress lp JOIN public.enrollments e ON e.id = lp.enrollment_id WHERE lp.completed_at IS NOT NULL
 UNION ALL
 SELECT e.user_id, vp.updated_at FROM public.video_progress vp JOIN public.enrollments e ON e.id = vp.enrollment_id WHERE vp.watched_seconds > 0
 UNION ALL
 SELECT qa.user_id, qa.submitted_at FROM public.quiz_attempts qa WHERE qa.submitted_at IS NOT NULL
) x
GROUP BY x.user_id, learning_private.local_time(x.user_id, x.at)::date
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- Administrator scheduling
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.admin_create_course_event(p_course_id uuid, p_kind text, p_lesson_id uuid, p_starts_at timestamptz,
 p_ends_at timestamptz, p_meeting_url text, p_title_en text, p_title_ar text, p_description_en text, p_description_ar text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := public.assert_active_admin(); v_id uuid;
 v_title_en text := nullif(btrim(coalesce(p_title_en, '')), ''); v_title_ar text := nullif(btrim(coalesce(p_title_ar, '')), '');
 v_desc_en text := nullif(btrim(coalesce(p_description_en, '')), ''); v_desc_ar text := nullif(btrim(coalesce(p_description_ar, '')), '');
 v_url text := nullif(btrim(coalesce(p_meeting_url, '')), '');
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('live_session','office_hours','workshop','deadline','quiz')
  OR p_starts_at IS NULL OR p_starts_at < now() - interval '1 hour' OR p_starts_at > now() + interval '2 years'
  OR (v_title_en IS NULL AND v_title_ar IS NULL)
  OR char_length(coalesce(v_title_en, '')) > 160 OR char_length(coalesce(v_title_ar, '')) > 160
  OR char_length(coalesce(v_desc_en, '')) > 2000 OR char_length(coalesce(v_desc_ar, '')) > 2000
  OR (v_desc_en IS NOT NULL AND v_title_en IS NULL) OR (v_desc_ar IS NOT NULL AND v_title_ar IS NULL)
 THEN RAISE EXCEPTION 'invalid course event' USING ERRCODE = '22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.courses c WHERE c.id = p_course_id) THEN
  RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002'; END IF;
 IF p_lesson_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id AND m.course_id = p_course_id) THEN
  RAISE EXCEPTION 'lesson is not part of the course' USING ERRCODE = '22023'; END IF;
 INSERT INTO public.course_events(course_id, kind, lesson_id, starts_at, ends_at, meeting_url, created_by)
 VALUES (p_course_id, p_kind, p_lesson_id, p_starts_at, CASE WHEN p_kind IN ('deadline','quiz') THEN NULL ELSE p_ends_at END, v_url, actor)
 RETURNING id INTO v_id;
 INSERT INTO public.course_event_translations(event_id, locale, title, description)
 SELECT v_id, t.locale, t.title, t.description FROM (VALUES ('en', v_title_en, v_desc_en), ('ar', v_title_ar, v_desc_ar)) t(locale, title, description)
 WHERE t.title IS NOT NULL;
 PERFORM learning_private.notify_course_learners(p_course_id, v_id, 'event_scheduled', 'event-scheduled:' || v_id);
 PERFORM public.write_course_audit(actor, 'course.event_scheduled', p_course_id, 'Scheduled a ' || replace(p_kind, '_', ' '));
 RETURN v_id;
END $$;

CREATE FUNCTION public.admin_cancel_course_event(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := public.assert_active_admin(); v_event public.course_events;
BEGIN
 UPDATE public.course_events SET status = 'cancelled', cancelled_at = clock_timestamp()
 WHERE id = p_id AND status = 'scheduled' RETURNING * INTO v_event;
 IF v_event.id IS NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.course_events WHERE id = p_id) THEN RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002'; END IF;
  RETURN;
 END IF;
 IF coalesce(v_event.ends_at, v_event.starts_at) > now() THEN
  PERFORM learning_private.notify_course_learners(v_event.course_id, v_event.id, 'event_cancelled', 'event-cancelled:' || v_event.id);
 END IF;
 PERFORM public.write_course_audit(actor, 'course.event_cancelled', v_event.course_id, 'Cancelled a ' || replace(v_event.kind, '_', ' '));
END $$;

CREATE FUNCTION public.admin_list_course_events(p_locale text)
RETURNS TABLE(id uuid, course_id uuid, course_slug text, course_title text, kind text, lesson_id uuid, starts_at timestamptz,
 ends_at timestamptz, meeting_url text, status text, title_en text, title_ar text, learner_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
 RETURN QUERY SELECT ev.id, ev.course_id, c.slug, ct.title, ev.kind, ev.lesson_id, ev.starts_at, ev.ends_at, ev.meeting_url, ev.status,
  en.title, ar.title,
  (SELECT count(DISTINCT e.user_id)::integer FROM public.enrollments e WHERE e.course_id = ev.course_id
    AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at > now()))
 FROM public.course_events ev JOIN public.courses c ON c.id = ev.course_id
 LEFT JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale
 LEFT JOIN public.course_event_translations en ON en.event_id = ev.id AND en.locale = 'en'
 LEFT JOIN public.course_event_translations ar ON ar.event_id = ev.id AND ar.locale = 'ar'
 WHERE coalesce(ev.ends_at, ev.starts_at) >= now() - interval '30 days'
 ORDER BY (coalesce(ev.ends_at, ev.starts_at) < now()), ev.starts_at, ev.id
 LIMIT 300;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Learner calendar
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.learner_calendar_events(p_from timestamptz, p_to timestamptz, p_locale text)
RETURNS TABLE(id uuid, source text, kind text, status text, title text, description text, course_slug text, course_title text,
 lesson_id uuid, starts_at timestamptz, ends_at timestamptz, meeting_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') OR p_from IS NULL OR p_to IS NULL OR p_to <= p_from
  OR p_to - p_from > interval '400 days' THEN RAISE EXCEPTION 'invalid calendar range' USING ERRCODE = '22023'; END IF;
 RETURN QUERY
 SELECT * FROM (
  SELECT ev.id, 'course'::text, ev.kind, ev.status, t.title, t.description, c.slug, ct.title, ev.lesson_id, ev.starts_at, ev.ends_at,
   CASE WHEN ev.status = 'scheduled' THEN ev.meeting_url END
  FROM public.course_events ev JOIN public.courses c ON c.id = ev.course_id AND c.status = 'published'
  LEFT JOIN public.course_event_translations t ON t.event_id = ev.id AND t.locale = p_locale
  LEFT JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  WHERE coalesce(ev.ends_at, ev.starts_at) >= p_from AND ev.starts_at < p_to AND learning_private.is_entitled(ev.course_id, actor)
  UNION ALL
  SELECT s.id, 'personal'::text, 'study'::text, 'scheduled'::text, s.title, NULL::text, NULL::text, NULL::text, NULL::uuid, s.starts_at, s.ends_at, NULL::text
  FROM public.learner_study_sessions s WHERE s.user_id = actor AND s.ends_at >= p_from AND s.starts_at < p_to
 ) x ORDER BY 10, 1 LIMIT 500;
END $$;

CREATE FUNCTION public.learner_create_study_session(p_title text, p_starts_at timestamptz, p_ends_at timestamptz) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_title text := btrim(coalesce(p_title, '')); v_id uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF char_length(v_title) NOT BETWEEN 1 AND 120 OR p_starts_at IS NULL OR p_ends_at IS NULL
  OR p_starts_at < now() - interval '1 day' OR p_starts_at > now() + interval '1 year'
  OR p_ends_at <= p_starts_at OR p_ends_at > p_starts_at + interval '8 hours'
 THEN RAISE EXCEPTION 'invalid study session' USING ERRCODE = '22023'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('study-sessions:' || actor::text));
 IF (SELECT count(*) FROM public.learner_study_sessions s WHERE s.user_id = actor AND s.ends_at > now()) >= 200 THEN
  RAISE EXCEPTION 'study_session_limit' USING ERRCODE = '54000'; END IF;
 INSERT INTO public.learner_study_sessions(user_id, title, starts_at, ends_at) VALUES (actor, v_title, p_starts_at, p_ends_at) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.learner_delete_study_session(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 DELETE FROM public.learner_study_sessions WHERE id = p_id AND user_id = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'study session not found' USING ERRCODE = 'P0002'; END IF;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Learner streak
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.learner_learning_streak() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_today date; v_stats record;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 v_today := learning_private.local_time(actor, now())::date;
 SELECT * INTO v_stats FROM learning_private.streak_stats(actor, v_today);
 RETURN jsonb_build_object('current', v_stats.current_streak, 'longest', v_stats.longest_streak, 'totalDays', v_stats.total_days,
  'today', v_today,
  'activeToday', EXISTS(SELECT 1 FROM public.learning_activity_days a WHERE a.user_id = actor AND a.activity_date = v_today),
  'week', (SELECT jsonb_agg(jsonb_build_object('date', d.day, 'active',
     EXISTS(SELECT 1 FROM public.learning_activity_days a WHERE a.user_id = actor AND a.activity_date = d.day)) ORDER BY d.day)
   FROM (SELECT (v_today - g)::date AS day FROM generate_series(0, 6) g) d));
END $$;

-- ---------------------------------------------------------------------------------------------
-- Learner notifications
-- ---------------------------------------------------------------------------------------------
-- Creates the time-based reminders the learner has opted into, then trims old history. Idempotent:
-- every reminder has a stable dedupe key, so repeated calls never duplicate a notification.
CREATE FUNCTION public.learner_sync_notifications() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_pref public.learner_preferences; v_local timestamp; v_streak integer;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 SELECT * INTO v_pref FROM public.learner_preferences WHERE user_id = actor;
 IF coalesce(v_pref.course_reminders, false) THEN
  INSERT INTO public.notifications(user_id, kind, course_id, event_id, dedupe_key)
  SELECT actor, 'event_reminder', ev.course_id, ev.id, 'event-reminder:' || ev.id FROM public.course_events ev
  JOIN public.courses c ON c.id = ev.course_id AND c.status = 'published'
  WHERE ev.status = 'scheduled' AND ev.kind IN ('live_session','office_hours','workshop')
   AND ev.starts_at > now() AND ev.starts_at <= now() + interval '24 hours' AND learning_private.is_entitled(ev.course_id, actor)
  ON CONFLICT DO NOTHING;
 END IF;
 IF coalesce(v_pref.assignment_deadlines, false) THEN
  INSERT INTO public.notifications(user_id, kind, course_id, lesson_id, event_id, dedupe_key)
  SELECT actor, 'deadline_reminder', ev.course_id, ev.lesson_id, ev.id, 'deadline-reminder:' || ev.id FROM public.course_events ev
  JOIN public.courses c ON c.id = ev.course_id AND c.status = 'published'
  WHERE ev.status = 'scheduled' AND ev.kind IN ('deadline','quiz')
   AND ev.starts_at > now() AND ev.starts_at <= now() + interval '48 hours' AND learning_private.is_entitled(ev.course_id, actor)
  ON CONFLICT DO NOTHING;
 END IF;
 IF coalesce(v_pref.daily_learning_reminders, false) THEN
  v_local := learning_private.local_time(actor, now());
  IF extract(hour FROM v_local) >= 17 AND NOT EXISTS(SELECT 1 FROM public.learning_activity_days a
   WHERE a.user_id = actor AND a.activity_date = v_local::date) THEN
   SELECT s.current_streak INTO v_streak FROM learning_private.streak_stats(actor, v_local::date) s;
   IF v_streak > 0 THEN
    INSERT INTO public.notifications(user_id, kind, data, dedupe_key)
    VALUES (actor, 'streak_reminder', jsonb_build_object('days', v_streak), 'streak-reminder:' || v_local::date)
    ON CONFLICT DO NOTHING;
   END IF;
  END IF;
 END IF;
 -- Retention: in-app history is kept for 180 days.
 DELETE FROM public.notifications WHERE user_id = actor AND created_at < now() - interval '180 days';
END $$;

CREATE FUNCTION public.learner_list_notifications(p_locale text, p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, kind text, created_at timestamptz, read_at timestamptz, course_slug text, course_title text, lesson_id uuid,
 lesson_title text, event_id uuid, event_kind text, event_title text, event_starts_at timestamptz, certificate_id uuid, data jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 THEN
  RAISE EXCEPTION 'invalid notification request' USING ERRCODE = '22023'; END IF;
 RETURN QUERY SELECT n.id, n.kind, n.created_at, n.read_at, c.slug, ct.title, n.lesson_id, lt.title, n.event_id, ev.kind, et.title,
  ev.starts_at, n.certificate_id, n.data
 FROM public.notifications n
 LEFT JOIN public.courses c ON c.id = n.course_id
 LEFT JOIN public.course_translations ct ON ct.course_id = n.course_id AND ct.locale = p_locale AND ct.publication_status = 'published'
 LEFT JOIN public.lesson_translations lt ON lt.lesson_id = n.lesson_id AND lt.locale = p_locale AND lt.publication_status = 'published'
 LEFT JOIN public.course_events ev ON ev.id = n.event_id
 LEFT JOIN public.course_event_translations et ON et.event_id = n.event_id AND et.locale = p_locale
 WHERE n.user_id = auth.uid()
 ORDER BY n.created_at DESC, n.id DESC
 LIMIT p_limit;
END $$;

CREATE FUNCTION public.learner_unread_notification_count() RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 RETURN (SELECT count(*)::integer FROM public.notifications n WHERE n.user_id = auth.uid() AND n.read_at IS NULL);
END $$;

-- p_ids NULL marks everything read; otherwise only the caller's own listed notifications change.
CREATE FUNCTION public.learner_mark_notifications_read(p_ids uuid[] DEFAULT NULL) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_count integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_ids IS NOT NULL AND (cardinality(p_ids) = 0 OR cardinality(p_ids) > 100) THEN
  RAISE EXCEPTION 'invalid notification ids' USING ERRCODE = '22023'; END IF;
 UPDATE public.notifications n SET read_at = clock_timestamp()
 WHERE n.user_id = auth.uid() AND n.read_at IS NULL AND (p_ids IS NULL OR n.id = ANY(p_ids));
 GET DIAGNOSTICS v_count = ROW_COUNT;
 RETURN v_count;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION learning_private.local_time(uuid,timestamptz), learning_private.is_entitled(uuid,uuid),
 learning_private.streak_stats(uuid,date), learning_private.record_activity(uuid,timestamptz),
 learning_private.notify_course_learners(uuid,uuid,text,text), learning_private.on_lesson_progress(),
 learning_private.on_video_progress(), learning_private.on_quiz_finished(), learning_private.on_enrollment_started(),
 learning_private.on_course_completed(), learning_private.on_certificate_issued() FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_create_course_event(uuid,text,uuid,timestamptz,timestamptz,text,text,text,text,text),
 public.admin_cancel_course_event(uuid), public.admin_list_course_events(text),
 public.learner_calendar_events(timestamptz,timestamptz,text), public.learner_create_study_session(text,timestamptz,timestamptz),
 public.learner_delete_study_session(uuid), public.learner_learning_streak(), public.learner_sync_notifications(),
 public.learner_list_notifications(text,integer), public.learner_unread_notification_count(),
 public.learner_mark_notifications_read(uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_course_event(uuid,text,uuid,timestamptz,timestamptz,text,text,text,text,text),
 public.admin_cancel_course_event(uuid), public.admin_list_course_events(text),
 public.learner_calendar_events(timestamptz,timestamptz,text), public.learner_create_study_session(text,timestamptz,timestamptz),
 public.learner_delete_study_session(uuid), public.learner_learning_streak(), public.learner_sync_notifications(),
 public.learner_list_notifications(text,integer), public.learner_unread_notification_count(),
 public.learner_mark_notifications_read(uuid[]) TO authenticated;
