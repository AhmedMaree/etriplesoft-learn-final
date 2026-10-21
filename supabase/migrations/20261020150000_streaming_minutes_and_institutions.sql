-- Phase B: streaming minutes and institutions.
--
-- Streaming minutes
-- * learning_private.video_watch_daily: seconds of video played per enrollment, video and Cairo day. It is
--   written only inside learner_checkpoint_video, from the same server-validated segments that earn progress
--   credit (continuous play, up to 2x speed), so rewatching counts again and faster playback counts as the
--   content it covered. Seeks and long gaps add nothing. History starts when this migration is applied.
--
-- Institutions
-- * public.institutions: canonical universities and companies (English name, optional Arabic name).
-- * public.institution_aliases: normalized spellings (case, spacing and common Arabic letter variants folded)
--   that map typed names to an institution. Every institution's own names are aliases.
-- * learner_profiles.university_id / company_id are derived by a trigger from the typed name and cannot be
--   written by learners (the column-level UPDATE grant does not include them). Names nobody has linked yet stay
--   free text and are listed for admins to link or add.
-- * Seeded with the onboarding university list (src/features/auth/academic-options.ts) plus common acronyms.
-- * Institution edits are reference-data changes and are not written to the admin audit log.
--
-- The analytics RPCs gain streaming figures and group institutions by their linked identity.

CREATE TABLE learning_private.video_watch_daily (
 enrollment_id uuid NOT NULL,
 lesson_video_id uuid NOT NULL,
 watch_date date NOT NULL,
 seconds numeric(14,2) NOT NULL DEFAULT 0 CHECK (seconds >= 0),
 PRIMARY KEY (enrollment_id, lesson_video_id, watch_date),
 FOREIGN KEY (enrollment_id, lesson_video_id) REFERENCES public.video_progress(enrollment_id, lesson_video_id) ON DELETE RESTRICT
);
CREATE INDEX video_watch_daily_date_idx ON learning_private.video_watch_daily(watch_date);
ALTER TABLE learning_private.video_watch_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON learning_private.video_watch_daily FROM PUBLIC, anon, authenticated, service_role;

-- Same function as 20261018102309_bunny_stream_videos.sql plus the streaming log insert.
CREATE OR REPLACE FUNCTION public.learner_checkpoint_video(p_session_id uuid,p_locale text,p_sequence integer,p_position numeric,p_playing boolean)
RETURNS TABLE(position_seconds numeric,watched_seconds integer,duration_seconds integer,percent integer,completed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s learning_private.video_sessions; v_progress public.video_progress; v_video public.lesson_videos;
  v_now timestamptz:=clock_timestamp(); v_elapsed numeric; v_delta numeric; v_intervals int4multirange; v_watched integer; v_completed boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM learning_private.video_sessions vs WHERE vs.id=p_session_id FOR UPDATE;
  IF s.id IS NULL OR s.expires_at<=v_now OR NOT EXISTS(SELECT 1 FROM public.enrollments e
    WHERE e.id=s.enrollment_id AND e.user_id=(SELECT auth.uid()) AND e.status IN ('active','completed')
      AND (e.expires_at IS NULL OR e.expires_at>v_now)) THEN RAISE EXCEPTION 'session access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_video FROM public.lesson_videos v WHERE v.id=s.lesson_video_id;
  IF NOT EXISTS(SELECT 1 FROM public.learner_get_lesson_video(v_video.lesson_id,p_locale) a WHERE a.video_id=v_video.id)
    THEN RAISE EXCEPTION 'video access revoked' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_progress FROM public.video_progress vp WHERE vp.enrollment_id=s.enrollment_id AND vp.lesson_video_id=s.lesson_video_id FOR UPDATE;
  IF p_sequence IS NULL OR p_sequence<=0 OR p_position IS NULL OR p_position='NaN'::numeric
    OR p_position<0 OR p_position>v_progress.duration_seconds OR p_playing IS NULL
    THEN RAISE EXCEPTION 'invalid checkpoint' USING ERRCODE='22023'; END IF;
  IF p_sequence>s.last_sequence THEN
    v_elapsed:=EXTRACT(epoch FROM v_now-s.last_at); v_delta:=p_position-s.last_position;
    SELECT wi.intervals INTO v_intervals FROM learning_private.watched_intervals wi
      WHERE wi.enrollment_id=s.enrollment_id AND wi.lesson_video_id=s.lesson_video_id FOR UPDATE;
    -- Support up to 2x speed. Pauses/seeks reset the baseline. Long gaps earn no credit.
    IF s.was_playing AND p_playing AND v_elapsed BETWEEN 0.5 AND 30 AND v_delta>0 AND v_delta<=v_elapsed*2+0.5 THEN
      v_intervals:=v_intervals+int4multirange(int4range(floor(s.last_position)::integer,floor(p_position)::integer,'[)'));
      -- Streaming log: the same credited segment, counted again when rewatched (Cairo calendar day).
      INSERT INTO learning_private.video_watch_daily AS d(enrollment_id,lesson_video_id,watch_date,seconds)
        VALUES(s.enrollment_id,s.lesson_video_id,(v_now AT TIME ZONE 'Africa/Cairo')::date,v_delta)
        ON CONFLICT (enrollment_id,lesson_video_id,watch_date) DO UPDATE SET seconds=d.seconds+excluded.seconds;
    END IF;
    SELECT COALESCE(sum(upper(r)-lower(r)),0)::integer INTO v_watched FROM unnest(v_intervals) r;
    v_completed:=v_watched::numeric/v_progress.duration_seconds>=0.9;
    UPDATE learning_private.watched_intervals wi SET intervals=v_intervals WHERE wi.enrollment_id=s.enrollment_id AND wi.lesson_video_id=s.lesson_video_id;
    UPDATE learning_private.video_sessions vs SET last_position=p_position,last_at=v_now,last_sequence=p_sequence,was_playing=p_playing WHERE vs.id=s.id;
    UPDATE public.video_progress vp SET position_seconds=p_position,watched_seconds=v_watched,
      completed_at=CASE WHEN v_completed THEN COALESCE(vp.completed_at,v_now) ELSE vp.completed_at END,updated_at=v_now
      WHERE vp.enrollment_id=s.enrollment_id AND vp.lesson_video_id=s.lesson_video_id RETURNING * INTO v_progress;
    UPDATE public.lesson_progress lp SET percent=LEAST(100,(100::bigint*v_watched/v_progress.duration_seconds)::integer),
      status=CASE WHEN v_completed OR lp.status='completed' THEN 'completed' ELSE 'started' END,
      completed_at=CASE WHEN v_completed THEN COALESCE(lp.completed_at,v_now) ELSE lp.completed_at END,updated_at=v_now
      WHERE lp.enrollment_id=s.enrollment_id AND lp.lesson_id=v_video.lesson_id;
  END IF;
  RETURN QUERY SELECT v_progress.position_seconds,v_progress.watched_seconds,v_progress.duration_seconds,
    LEAST(100,(100::bigint*v_progress.watched_seconds/v_progress.duration_seconds)::integer),v_progress.completed_at IS NOT NULL;
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- Institutions
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION learning_private.normalize_institution_name(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT nullif(pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.translate(pg_catalog.btrim(p_name), 'أإآىة', 'ااايه'), '\s+', ' ', 'g')), '')
$$;

CREATE TABLE public.institutions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('university', 'company')),
 name_en text NOT NULL CHECK (name_en = btrim(name_en) AND char_length(name_en) BETWEEN 2 AND 160),
 name_ar text CHECK (name_ar IS NULL OR (name_ar = btrim(name_ar) AND char_length(name_ar) BETWEEN 2 AND 160)),
 created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id, kind)
);
CREATE UNIQUE INDEX institutions_kind_name_key ON public.institutions(kind, lower(name_en));
CREATE INDEX institutions_creator_idx ON public.institutions(created_by) WHERE created_by IS NOT NULL;

CREATE TABLE public.institution_aliases (
 kind text NOT NULL,
 normalized_name text NOT NULL CHECK (char_length(normalized_name) BETWEEN 1 AND 160),
 institution_id uuid NOT NULL,
 created_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (kind, normalized_name),
 FOREIGN KEY (institution_id, kind) REFERENCES public.institutions(id, kind) ON DELETE RESTRICT
);
CREATE INDEX institution_aliases_institution_idx ON public.institution_aliases(institution_id);
CREATE INDEX institution_aliases_creator_idx ON public.institution_aliases(created_by) WHERE created_by IS NOT NULL;

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institutions, public.institution_aliases FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.institutions(kind, name_en, name_ar)
SELECT 'university', v.name_en, v.name_ar FROM (VALUES
 ('Cairo University', 'جامعة القاهرة'),
 ('Ain Shams University', 'جامعة عين شمس'),
 ('Alexandria University', 'جامعة الإسكندرية'),
 ('Al-Azhar University', 'جامعة الأزهر'),
 ('Helwan University', 'جامعة حلوان'),
 ('Mansoura University', 'جامعة المنصورة'),
 ('Zagazig University', 'جامعة الزقازيق'),
 ('Tanta University', 'جامعة طنطا'),
 ('Assiut University', 'جامعة أسيوط'),
 ('Menoufia University', 'جامعة المنوفية'),
 ('Benha University', 'جامعة بنها'),
 ('Suez Canal University', 'جامعة قناة السويس'),
 ('Kafrelsheikh University', 'جامعة كفر الشيخ'),
 ('Beni-Suef University', 'جامعة بني سويف'),
 ('Fayoum University', 'جامعة الفيوم'),
 ('Minia University', 'جامعة المنيا'),
 ('South Valley University', 'جامعة جنوب الوادي'),
 ('Sohag University', 'جامعة سوهاج'),
 ('Aswan University', 'جامعة أسوان'),
 ('Port Said University', 'جامعة بورسعيد'),
 ('Damanhour University', 'جامعة دمنهور'),
 ('Damietta University', 'جامعة دمياط'),
 ('Suez University', 'جامعة السويس'),
 ('University of Sadat City', 'جامعة مدينة السادات'),
 ('Arish University', 'جامعة العريش'),
 ('Luxor University', 'جامعة الأقصر'),
 ('Matrouh University', 'جامعة مطروح'),
 ('New Valley University', 'جامعة الوادي الجديد'),
 ('The American University in Cairo', 'الجامعة الأمريكية بالقاهرة'),
 ('German University in Cairo', 'الجامعة الألمانية بالقاهرة'),
 ('The British University in Egypt', 'الجامعة البريطانية في مصر'),
 ('Arab Academy for Science, Technology and Maritime Transport', 'الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري'),
 ('Egypt-Japan University of Science and Technology', 'الجامعة المصرية اليابانية للعلوم والتكنولوجيا'),
 ('Nile University', 'جامعة النيل'),
 ('Misr International University', 'جامعة مصر الدولية'),
 ('Misr University for Science and Technology', 'جامعة مصر للعلوم والتكنولوجيا'),
 ('October 6 University', 'جامعة 6 أكتوبر'),
 ('October University for Modern Sciences and Arts (MSA)', 'جامعة أكتوبر للعلوم الحديثة والآداب'),
 ('Future University in Egypt', 'جامعة المستقبل'),
 ('Egyptian E-Learning University', 'الجامعة المصرية للتعلم الإلكتروني'),
 ('Sadat Academy for Management Sciences', 'أكاديمية السادات للعلوم الإدارية')
) AS v(name_en, name_ar);

INSERT INTO public.institution_aliases(kind, normalized_name, institution_id)
SELECT i.kind, n.name, i.id
FROM public.institutions i
CROSS JOIN LATERAL (VALUES (learning_private.normalize_institution_name(i.name_en)), (learning_private.normalize_institution_name(i.name_ar))) AS n(name)
WHERE n.name IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.institution_aliases(kind, normalized_name, institution_id)
SELECT 'university', learning_private.normalize_institution_name(v.alias), i.id
FROM (VALUES
 ('Al-Azhar University', 'Al Azhar University'),
 ('Kafrelsheikh University', 'Kafr El Sheikh University'),
 ('Beni-Suef University', 'Beni Suef University'),
 ('University of Sadat City', 'Sadat City University'),
 ('The American University in Cairo', 'American University in Cairo'),
 ('The American University in Cairo', 'AUC'),
 ('German University in Cairo', 'GUC'),
 ('The British University in Egypt', 'British University in Egypt'),
 ('The British University in Egypt', 'BUE'),
 ('Arab Academy for Science, Technology and Maritime Transport', 'AAST'),
 ('Arab Academy for Science, Technology and Maritime Transport', 'Arab Academy'),
 ('Egypt-Japan University of Science and Technology', 'E-JUST'),
 ('Egypt-Japan University of Science and Technology', 'EJUST'),
 ('Misr International University', 'MIU'),
 ('Misr University for Science and Technology', 'MUST'),
 ('October 6 University', 'O6U'),
 ('October University for Modern Sciences and Arts (MSA)', 'MSA'),
 ('October University for Modern Sciences and Arts (MSA)', 'MSA University'),
 ('October University for Modern Sciences and Arts (MSA)', 'October University for Modern Sciences and Arts'),
 ('Future University in Egypt', 'FUE'),
 ('Egyptian E-Learning University', 'EELU')
) AS v(name_en, alias)
JOIN public.institutions i ON i.kind = 'university' AND i.name_en = v.name_en
ON CONFLICT DO NOTHING;

ALTER TABLE public.learner_profiles
 ADD COLUMN university_id uuid REFERENCES public.institutions(id) ON DELETE RESTRICT,
 ADD COLUMN company_id uuid REFERENCES public.institutions(id) ON DELETE RESTRICT;
CREATE INDEX learner_profiles_university_idx ON public.learner_profiles(university_id) WHERE university_id IS NOT NULL;
CREATE INDEX learner_profiles_company_idx ON public.learner_profiles(company_id) WHERE company_id IS NOT NULL;

-- Derives both links from the typed names on every write; SECURITY DEFINER because learners cannot read aliases.
CREATE FUNCTION learning_private.learner_profiles_link_institutions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 NEW.university_id := (SELECT a.institution_id FROM public.institution_aliases a
  WHERE a.kind = 'university' AND a.normalized_name = learning_private.normalize_institution_name(NEW.university));
 NEW.company_id := (SELECT a.institution_id FROM public.institution_aliases a
  WHERE a.kind = 'company' AND a.normalized_name = learning_private.normalize_institution_name(NEW.company_name));
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION learning_private.learner_profiles_link_institutions(), learning_private.normalize_institution_name(text)
 FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER learner_profiles_link_institutions BEFORE INSERT OR UPDATE ON public.learner_profiles
 FOR EACH ROW EXECUTE FUNCTION learning_private.learner_profiles_link_institutions();

-- Link existing profiles without presenting the backfill as a learner edit.
ALTER TABLE public.learner_profiles DISABLE TRIGGER learner_profiles_set_updated_at;
UPDATE public.learner_profiles SET university = university;
ALTER TABLE public.learner_profiles ENABLE TRIGGER learner_profiles_set_updated_at;

-- Re-derives the links of profiles whose typed name matches one of p_names (normalized) and is still unlinked.
CREATE FUNCTION learning_private.relink_institution_names(p_kind text, p_names text[])
RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
 IF p_kind = 'university' THEN
  UPDATE public.learner_profiles pr SET university = pr.university
  WHERE pr.university_id IS NULL AND learning_private.normalize_institution_name(pr.university) = ANY(p_names);
 ELSE
  UPDATE public.learner_profiles pr SET company_name = pr.company_name
  WHERE pr.company_id IS NULL AND learning_private.normalize_institution_name(pr.company_name) = ANY(p_names);
 END IF;
 GET DIAGNOSTICS v_count = ROW_COUNT;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION learning_private.relink_institution_names(text, text[]) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admin_list_institutions(p_kind text)
RETURNS TABLE(id uuid, name_en text, name_ar text, aliases bigint, learners bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM public.assert_active_admin();
 IF p_kind IS NULL OR p_kind NOT IN ('university', 'company') THEN RAISE EXCEPTION 'invalid kind' USING ERRCODE = '22023'; END IF;
 RETURN QUERY
 SELECT i.id, i.name_en, i.name_ar,
  (SELECT count(*) FROM public.institution_aliases a WHERE a.institution_id = i.id),
  (SELECT count(*) FROM public.learner_profiles pr WHERE (p_kind = 'university' AND pr.university_id = i.id) OR (p_kind = 'company' AND pr.company_id = i.id))
 FROM public.institutions i WHERE i.kind = p_kind
 ORDER BY 5 DESC, i.name_en;
END $$;

-- Typed names with no linked institution, most common first (one row per normalized spelling).
CREATE FUNCTION public.admin_list_unmatched_institution_names(p_kind text)
RETURNS TABLE(name text, learners bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM public.assert_active_admin();
 IF p_kind IS NULL OR p_kind NOT IN ('university', 'company') THEN RAISE EXCEPTION 'invalid kind' USING ERRCODE = '22023'; END IF;
 RETURN QUERY
 SELECT min(x.name), count(*) FROM (
  SELECT CASE WHEN p_kind = 'university' THEN pr.university ELSE pr.company_name END AS name
  FROM public.learner_profiles pr
  WHERE (p_kind = 'university' AND pr.university IS NOT NULL AND pr.university_id IS NULL)
   OR (p_kind = 'company' AND pr.company_name IS NOT NULL AND pr.company_id IS NULL)
 ) x
 GROUP BY learning_private.normalize_institution_name(x.name)
 ORDER BY 2 DESC, 1
 LIMIT 200;
END $$;

-- Maps a typed name (and every spelling that normalizes the same way) to an existing institution.
CREATE FUNCTION public.admin_link_institution_name(p_kind text, p_name text, p_institution_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := public.assert_active_admin(); v_name text := learning_private.normalize_institution_name(p_name);
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('university', 'company') OR v_name IS NULL OR char_length(v_name) > 160 THEN
  RAISE EXCEPTION 'invalid institution name' USING ERRCODE = '22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.institutions i WHERE i.id = p_institution_id AND i.kind = p_kind) THEN
  RAISE EXCEPTION 'institution not found' USING ERRCODE = 'P0002';
 END IF;
 INSERT INTO public.institution_aliases(kind, normalized_name, institution_id, created_by) VALUES (p_kind, v_name, p_institution_id, actor);
 RETURN learning_private.relink_institution_names(p_kind, ARRAY[v_name]);
END $$;

-- Adds an institution; its names (and an optional typed name to fold in) become aliases and matching profiles link.
CREATE FUNCTION public.admin_create_institution(p_kind text, p_name_en text, p_name_ar text, p_link_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 actor uuid := public.assert_active_admin();
 v_en text := btrim(coalesce(p_name_en, ''));
 v_ar text := nullif(btrim(coalesce(p_name_ar, '')), '');
 v_names text[];
 v_id uuid;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('university', 'company') OR char_length(v_en) NOT BETWEEN 2 AND 160
    OR (v_ar IS NOT NULL AND char_length(v_ar) NOT BETWEEN 2 AND 160) OR char_length(coalesce(p_link_name, '')) > 160 THEN
  RAISE EXCEPTION 'invalid institution' USING ERRCODE = '22023';
 END IF;
 v_names := ARRAY(SELECT DISTINCT n FROM unnest(ARRAY[
  learning_private.normalize_institution_name(v_en), learning_private.normalize_institution_name(v_ar),
  learning_private.normalize_institution_name(p_link_name)]) n WHERE n IS NOT NULL);
 -- A spelling already mapped elsewhere must be resolved explicitly, never silently moved.
 IF EXISTS(SELECT 1 FROM public.institution_aliases a WHERE a.kind = p_kind AND a.normalized_name = ANY(v_names)) THEN
  RAISE EXCEPTION 'name already linked' USING ERRCODE = '23505';
 END IF;
 INSERT INTO public.institutions(kind, name_en, name_ar, created_by) VALUES (p_kind, v_en, v_ar, actor) RETURNING id INTO v_id;
 INSERT INTO public.institution_aliases(kind, normalized_name, institution_id, created_by)
 SELECT p_kind, n, v_id, actor FROM unnest(v_names) n;
 PERFORM learning_private.relink_institution_names(p_kind, v_names);
 RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_list_institutions(text), public.admin_list_unmatched_institution_names(text),
 public.admin_link_institution_name(text, text, uuid), public.admin_create_institution(text, text, text, text)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_institutions(text), public.admin_list_unmatched_institution_names(text),
 public.admin_link_institution_name(text, text, uuid), public.admin_create_institution(text, text, text, text)
 TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Analytics: streaming figures and linked institutions
-- ---------------------------------------------------------------------------------------------
DROP FUNCTION public.admin_analytics_courses(integer, text);
DROP FUNCTION public.admin_analytics_course_lessons(uuid, text);
DROP FUNCTION public.admin_analytics_learners(text, text, integer, integer);

CREATE OR REPLACE FUNCTION public.admin_analytics_overview(p_days integer)
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
  SELECT l.user_id, l.segment, p.created_at, pr.learner_type, pr.university, pr.company_name, pr.university_id, pr.company_id
  FROM learning_private.analytics_learners() l
  JOIN public.profiles p ON p.id = l.user_id
  LEFT JOIN public.learner_profiles pr ON pr.user_id = l.user_id
 ), enrolled AS MATERIALIZED (
  SELECT e.* FROM learning_private.analytics_enrollments() e
 ), streamed AS MATERIALIZED (
  SELECT w.watch_date, w.seconds FROM learning_private.video_watch_daily w JOIN enrolled e ON e.enrollment_id = w.enrollment_id
  WHERE w.watch_date >= v_prev_start
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
   'watchedMinutes', (SELECT floor(coalesce(sum(watched_seconds), 0) / 60)::bigint FROM enrolled),
   'streamedMinutes', (SELECT floor(coalesce(sum(seconds), 0) / 60)::bigint FROM streamed WHERE watch_date >= v_start),
   'streamedMinutesPrev', (SELECT floor(coalesce(sum(seconds), 0) / 60)::bigint FROM streamed WHERE watch_date < v_start)
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
  -- Linked institutions group under their canonical name; unlinked free text groups by its normalized form.
  'institutions', jsonb_build_object(
   'universities', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'nameAr', name_ar, 'matched', matched, 'learners', n) ORDER BY n DESC, name), '[]') FROM (
     SELECT coalesce(min(i.name_en), min(l.university)) AS name, min(i.name_ar) AS name_ar, bool_or(i.id IS NOT NULL) AS matched, count(*) AS n
     FROM learners l LEFT JOIN public.institutions i ON i.id = l.university_id
     WHERE l.university IS NOT NULL
     GROUP BY coalesce(l.university_id::text, learning_private.normalize_institution_name(l.university))
     ORDER BY n DESC, name LIMIT 8) x),
   'universityCount', (SELECT count(DISTINCT coalesce(university_id::text, learning_private.normalize_institution_name(university))) FROM learners WHERE university IS NOT NULL),
   'universityUnmatched', (SELECT count(*) FROM learners WHERE university IS NOT NULL AND university_id IS NULL),
   'companies', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'nameAr', name_ar, 'matched', matched, 'learners', n) ORDER BY n DESC, name), '[]') FROM (
     SELECT coalesce(min(i.name_en), min(l.company_name)) AS name, min(i.name_ar) AS name_ar, bool_or(i.id IS NOT NULL) AS matched, count(*) AS n
     FROM learners l LEFT JOIN public.institutions i ON i.id = l.company_id
     WHERE l.company_name IS NOT NULL
     GROUP BY coalesce(l.company_id::text, learning_private.normalize_institution_name(l.company_name))
     ORDER BY n DESC, name LIMIT 8) x),
   'companyCount', (SELECT count(DISTINCT coalesce(company_id::text, learning_private.normalize_institution_name(company_name))) FROM learners WHERE company_name IS NOT NULL),
   'companyUnmatched', (SELECT count(*) FROM learners WHERE company_name IS NOT NULL AND company_id IS NULL)
  ),
  'series', (SELECT jsonb_agg(jsonb_build_object(
     'date', g.d, 'signups', coalesce(s.n, 0), 'active', coalesce(act.n, 0), 'enrollments', coalesce(en.n, 0), 'revenue', coalesce(m.n, 0),
     'streamed', coalesce(st.n, 0)
    ) ORDER BY g.d)
   FROM (SELECT gs::date AS d FROM generate_series(date_trunc(v_bucket, v_start::timestamp), v_today::timestamp, ('1 ' || v_bucket)::interval) gs) g
   LEFT JOIN (SELECT date_trunc(v_bucket, created_at AT TIME ZONE tz)::date AS d, count(*) AS n FROM learners WHERE created_at >= v_from GROUP BY 1) s ON s.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, activity_date::timestamp)::date AS d, count(DISTINCT user_id) AS n FROM activity WHERE activity_date >= v_start GROUP BY 1) act ON act.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, granted_at AT TIME ZONE tz)::date AS d, count(*) AS n FROM enrolled WHERE granted_at >= v_from GROUP BY 1) en ON en.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, at AT TIME ZONE tz)::date AS d, sum(amount) AS n FROM money WHERE at >= v_from GROUP BY 1) m ON m.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, watch_date::timestamp)::date AS d, floor(sum(seconds) / 60)::bigint AS n FROM streamed WHERE watch_date >= v_start GROUP BY 1) st ON st.d = g.d)
 ) INTO v_result;
 RETURN v_result;
END $$;

CREATE FUNCTION public.admin_analytics_courses(p_days integer, p_locale text)
RETURNS TABLE(
 course_id uuid, slug text, title text, status text, price_minor bigint,
 enrollments bigint, enrollments_new bigint, free_enrollments bigint, paid_enrollments bigint, admin_enrollments bigint,
 active_learners bigint, completed bigint, cohort_size bigint, cohort_completed bigint, average_progress integer,
 watched_minutes bigint, streamed_minutes bigint, quiz_attempts bigint, quiz_passed bigint, rating numeric, reviews bigint, revenue_minor bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
 tz constant text := 'Africa/Cairo';
 v_start date;
 v_from timestamptz;
BEGIN
 PERFORM public.assert_active_admin();
 IF p_days IS NULL OR p_days NOT IN (7, 30, 90, 365) OR p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
  RAISE EXCEPTION 'invalid analytics request' USING ERRCODE = '22023';
 END IF;
 v_start := (now() AT TIME ZONE tz)::date - (p_days - 1);
 v_from := v_start::timestamp AT TIME ZONE tz;

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
  (SELECT floor(coalesce(sum(w.seconds), 0) / 60)::bigint FROM learning_private.video_watch_daily w JOIN enrolled e ON e.enrollment_id = w.enrollment_id
   WHERE e.course_id = c.id AND w.watch_date >= v_start),
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

CREATE FUNCTION public.admin_analytics_course_lessons(p_course_id uuid, p_locale text)
RETURNS TABLE(
 lesson_id uuid, module_position integer, lesson_position integer, title text, lesson_type text, is_required boolean,
 learners bigint, started bigint, completed bigint, average_watch_percent integer, streamed_minutes bigint
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
   JOIN public.lesson_videos lv ON lv.id = vp.lesson_video_id WHERE lv.lesson_id = l.id),
  (SELECT floor(coalesce(sum(w.seconds), 0) / 60)::bigint FROM learning_private.video_watch_daily w JOIN cohort ch ON ch.enrollment_id = w.enrollment_id
   JOIN public.lesson_videos lv ON lv.id = w.lesson_video_id WHERE lv.lesson_id = l.id)
 FROM public.lessons l
 JOIN public.course_modules m ON m.id = l.module_id
 LEFT JOIN public.lesson_translations t ON t.lesson_id = l.id AND t.locale = p_locale
 LEFT JOIN public.lesson_translations other ON other.lesson_id = l.id AND other.locale <> p_locale
 WHERE m.course_id = p_course_id AND l.status = 'published'
 ORDER BY m.position, l.position;
END $$;

CREATE FUNCTION public.admin_analytics_learners(p_search text, p_segment text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
RETURNS TABLE(
 user_id uuid, display_name text, email text, learner_type text, institution text, segment text, joined_at timestamptz,
 enrollments bigint, completed bigint, average_progress integer, watched_minutes bigint, streamed_minutes bigint, last_active date, total_count bigint
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
   coalesce(iu.name_en, pr.university, ic.name_en, pr.company_name) AS institution, l.segment, p.created_at,
   (SELECT max(a.activity_date) FROM public.learning_activity_days a WHERE a.user_id = l.user_id) AS last_active
  FROM learning_private.analytics_learners() l
  JOIN public.profiles p ON p.id = l.user_id
  JOIN auth.users u ON u.id = l.user_id
  LEFT JOIN public.learner_profiles pr ON pr.user_id = l.user_id
  LEFT JOIN public.institutions iu ON iu.id = pr.university_id
  LEFT JOIN public.institutions ic ON ic.id = pr.company_id
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
 ), streamed AS (
  SELECT e.user_id, floor(sum(w.seconds) / 60)::bigint AS minutes
  FROM learning_private.video_watch_daily w JOIN public.enrollments e ON e.id = w.enrollment_id
  WHERE e.user_id IN (SELECT pg.user_id FROM page pg)
  GROUP BY e.user_id
 )
 SELECT pg.user_id, pg.display_name, pg.email, pg.learner_type, pg.institution, pg.segment, pg.created_at,
  coalesce(s.enrollments, 0), coalesce(s.completed, 0), s.progress, coalesce(s.minutes, 0), coalesce(st.minutes, 0), pg.last_active, pg.total
 FROM page pg LEFT JOIN stats s ON s.user_id = pg.user_id LEFT JOIN streamed st ON st.user_id = pg.user_id
 ORDER BY pg.last_active DESC NULLS LAST, pg.created_at DESC, pg.user_id;
END $$;

REVOKE ALL ON FUNCTION public.admin_analytics_courses(integer, text), public.admin_analytics_course_lessons(uuid, text),
 public.admin_analytics_learners(text, text, integer, integer)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_analytics_courses(integer, text), public.admin_analytics_course_lessons(uuid, text),
 public.admin_analytics_learners(text, text, integer, integer)
 TO authenticated;
