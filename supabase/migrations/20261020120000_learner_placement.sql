-- Learner placement ("find your level") and course recommendations.
-- Product approval: user request 2026-10-20 (pre-assessment after sign-in; signup stays unchanged).
--
-- * Areas are course categories. A learner picks the areas they care about from the categories of
--   published courses, so recommendations follow the catalog without a second taxonomy.
-- * placement_versions/questions/options (+ translations): the skill check. A published version is
--   immutable; changing the questions means publishing a new version. Content is exact-locale: a
--   locale is offered only when every question and option of the version has that translation.
-- * learning_private.placement_answer_keys: one correct option per question, never readable by clients.
--   Scoring happens inside learner_placement_submit only.
-- * learner_placement_goals: the learner's current role, areas and Odoo experience (mutable).
-- * placement_results + placement_result_areas: append-only history of measured levels per area.
--   A learner with no Odoo experience may skip the questions; their areas are recorded as beginner
--   with method 'self_reported'.
-- * learner_placement_skips: "Skip for now". Removed when a result is recorded.
-- * course_recommendation_events: at most one 'shown' and one 'clicked' row per learner, course and
--   day, so admins can measure whether suggestions lead to clicks and enrollments.
-- * No table grants. Every read and write is a narrow learner_*/admin_* function that checks the caller.
-- * Abuse limit: 10 submissions per learner per day.
--
-- The v1 questions below are DRAFT content written for launch. They need instructor review and native
-- Arabic review; replace them by publishing a new version rather than editing v1.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.placement_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_number integer NOT NULL UNIQUE CHECK (version_number > 0),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((status = 'published') = (published_at IS NOT NULL))
);

CREATE TABLE public.placement_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES public.placement_versions(id) ON DELETE RESTRICT,
 area text NOT NULL CHECK (area ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(area) <= 40),
 position integer NOT NULL CHECK (position > 0),
 UNIQUE (version_id, area, position)
);

CREATE TABLE public.placement_question_translations (
 question_id uuid NOT NULL REFERENCES public.placement_questions(id) ON DELETE CASCADE,
 locale text NOT NULL CHECK (locale IN ('en','ar')),
 prompt text NOT NULL CHECK (prompt = btrim(prompt) AND char_length(prompt) BETWEEN 1 AND 500),
 PRIMARY KEY (question_id, locale)
);

CREATE TABLE public.placement_options (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 question_id uuid NOT NULL REFERENCES public.placement_questions(id) ON DELETE CASCADE,
 position integer NOT NULL CHECK (position > 0),
 UNIQUE (question_id, position),
 UNIQUE (question_id, id)
);

CREATE TABLE public.placement_option_translations (
 option_id uuid NOT NULL REFERENCES public.placement_options(id) ON DELETE CASCADE,
 locale text NOT NULL CHECK (locale IN ('en','ar')),
 label text NOT NULL CHECK (label = btrim(label) AND char_length(label) BETWEEN 1 AND 300),
 PRIMARY KEY (option_id, locale)
);

CREATE TABLE learning_private.placement_answer_keys (
 question_id uuid PRIMARY KEY REFERENCES public.placement_questions(id) ON DELETE CASCADE,
 option_id uuid NOT NULL,
 FOREIGN KEY (question_id, option_id) REFERENCES public.placement_options(question_id, id) ON DELETE CASCADE
);

CREATE TABLE public.learner_placement_goals (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('business_user','functional_consultant','developer','system_admin','exploring')),
 interest_areas text[] NOT NULL CHECK (cardinality(interest_areas) BETWEEN 1 AND 10),
 experience text NOT NULL CHECK (experience IN ('none','some','regular','expert')),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.placement_results (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 version_id uuid REFERENCES public.placement_versions(id) ON DELETE RESTRICT,
 method text NOT NULL CHECK (method IN ('quiz','self_reported')),
 -- clock_timestamp so several results in one transaction still order correctly.
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (method = 'self_reported' OR version_id IS NOT NULL)
);
CREATE INDEX placement_results_user_recent_idx ON public.placement_results(user_id, created_at DESC);
CREATE INDEX placement_results_version_idx ON public.placement_results(version_id) WHERE version_id IS NOT NULL;

CREATE TABLE public.placement_result_areas (
 result_id uuid NOT NULL REFERENCES public.placement_results(id) ON DELETE CASCADE,
 area text NOT NULL CHECK (area ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(area) <= 40),
 correct integer NOT NULL CHECK (correct >= 0),
 total integer NOT NULL CHECK (total >= 0),
 level text NOT NULL CHECK (level IN ('beginner','intermediate','advanced')),
 PRIMARY KEY (result_id, area),
 CHECK (correct <= total)
);

CREATE TABLE public.learner_placement_skips (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 skipped_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.course_recommendation_events (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
 event text NOT NULL CHECK (event IN ('shown','clicked')),
 day date NOT NULL DEFAULT current_date,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, course_id, event, day)
);
CREATE INDEX course_recommendation_events_course_idx ON public.course_recommendation_events(course_id, event, day);

ALTER TABLE public.placement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_question_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_option_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_private.placement_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_placement_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_result_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_placement_skips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_recommendation_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.placement_versions, public.placement_questions, public.placement_question_translations,
 public.placement_options, public.placement_option_translations, learning_private.placement_answer_keys,
 public.learner_placement_goals, public.placement_results, public.placement_result_areas,
 public.learner_placement_skips, public.course_recommendation_events
 FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------------------------
-- Areas a learner may choose: categories of published courses.
CREATE FUNCTION learning_private.placement_areas() RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(array_agg(DISTINCT c.category ORDER BY c.category), '{}')
 FROM public.courses c WHERE c.status = 'published' AND c.category IS NOT NULL;
$$;

CREATE FUNCTION learning_private.placement_current_version() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT id FROM public.placement_versions WHERE status = 'published' ORDER BY version_number DESC LIMIT 1;
$$;

CREATE FUNCTION learning_private.placement_level(p_correct integer, p_total integer) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE
  WHEN p_total = 0 THEN 'beginner'
  WHEN p_correct * 100 >= p_total * 85 THEN 'advanced'
  WHEN p_correct * 100 >= p_total * 50 THEN 'intermediate'
  ELSE 'beginner' END;
$$;

-- Validates goal input and returns the cleaned area list (distinct, original order).
CREATE FUNCTION learning_private.placement_clean_goals(p_role text, p_interests text[], p_experience text) RETURNS text[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE allowed text[] := learning_private.placement_areas(); cleaned text[];
BEGIN
 IF p_role IS NULL OR p_role NOT IN ('business_user','functional_consultant','developer','system_admin','exploring') THEN
  RAISE EXCEPTION 'invalid role' USING ERRCODE='22023'; END IF;
 IF p_experience IS NULL OR p_experience NOT IN ('none','some','regular','expert') THEN
  RAISE EXCEPTION 'invalid experience' USING ERRCODE='22023'; END IF;
 IF p_interests IS NULL OR cardinality(p_interests) NOT BETWEEN 1 AND 10 THEN
  RAISE EXCEPTION 'choose at least one area' USING ERRCODE='22023'; END IF;
 SELECT array_agg(a ORDER BY first_pos) INTO cleaned FROM (
  SELECT a, min(pos) first_pos FROM unnest(p_interests) WITH ORDINALITY AS x(a, pos) GROUP BY a) d;
 IF EXISTS (SELECT 1 FROM unnest(cleaned) a WHERE a IS NULL OR NOT (a = ANY (allowed))) THEN
  RAISE EXCEPTION 'unknown area' USING ERRCODE='22023'; END IF;
 RETURN cleaned;
END $$;

-- Everything the learner pages need about the caller's placement, in one projection.
CREATE FUNCTION learning_private.placement_status(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
  'learnerType', (SELECT lp.learner_type FROM public.learner_profiles lp WHERE lp.user_id = p_user),
  'skipped', EXISTS (SELECT 1 FROM public.learner_placement_skips s WHERE s.user_id = p_user),
  'areas', to_jsonb(learning_private.placement_areas()),
  'goals', (SELECT jsonb_build_object('role', g.role, 'interests', to_jsonb(g.interest_areas), 'experience', g.experience, 'updatedAt', g.updated_at)
            FROM public.learner_placement_goals g WHERE g.user_id = p_user),
  'result', (SELECT jsonb_build_object('id', r.id, 'method', r.method, 'createdAt', r.created_at,
              'areas', coalesce((SELECT jsonb_agg(jsonb_build_object('area', ra.area, 'correct', ra.correct, 'total', ra.total, 'level', ra.level) ORDER BY ra.area)
                                 FROM public.placement_result_areas ra WHERE ra.result_id = r.id), '[]'::jsonb))
             FROM public.placement_results r WHERE r.user_id = p_user ORDER BY r.created_at DESC, r.id DESC LIMIT 1),
  -- Highest level of a completed course per area; the overview uses it to show progress since the check.
  'completed', coalesce((SELECT jsonb_agg(jsonb_build_object('area', x.category, 'level', x.level) ORDER BY x.category) FROM (
     SELECT c.category, (array_agg(c.level ORDER BY CASE c.level WHEN 'advanced' THEN 3 WHEN 'intermediate' THEN 2 ELSE 1 END DESC))[1] AS level
     FROM public.course_completions cc
     JOIN public.enrollments e ON e.id = cc.enrollment_id
     JOIN public.courses c ON c.id = e.course_id
     WHERE e.user_id = p_user AND c.category IS NOT NULL AND c.level IS NOT NULL
     GROUP BY c.category) x), '[]'::jsonb));
$$;

REVOKE ALL ON FUNCTION learning_private.placement_areas(), learning_private.placement_current_version(),
 learning_private.placement_level(integer,integer), learning_private.placement_clean_goals(text,text[],text),
 learning_private.placement_status(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Learner functions
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.learner_placement_status() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 RETURN learning_private.placement_status(auth.uid());
END $$;

-- The current published skill check in exact locale, without answer keys. NULL when there is no
-- published version or it is not fully translated into p_locale.
CREATE FUNCTION public.learner_placement_questions(p_locale text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE version uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023'; END IF;
 version := learning_private.placement_current_version();
 IF version IS NULL THEN RETURN NULL; END IF;
 IF EXISTS (SELECT 1 FROM public.placement_questions q WHERE q.version_id = version AND NOT EXISTS
     (SELECT 1 FROM public.placement_question_translations t WHERE t.question_id = q.id AND t.locale = p_locale))
  OR EXISTS (SELECT 1 FROM public.placement_options o JOIN public.placement_questions q ON q.id = o.question_id
     WHERE q.version_id = version AND NOT EXISTS
     (SELECT 1 FROM public.placement_option_translations t WHERE t.option_id = o.id AND t.locale = p_locale)) THEN
  RETURN NULL;
 END IF;
 RETURN jsonb_build_object('versionId', version, 'questions', coalesce((
  SELECT jsonb_agg(jsonb_build_object('id', q.id, 'area', q.area, 'prompt', qt.prompt,
    'options', (SELECT jsonb_agg(jsonb_build_object('id', o.id, 'label', ot.label) ORDER BY o.position)
                FROM public.placement_options o JOIN public.placement_option_translations ot ON ot.option_id = o.id AND ot.locale = p_locale
                WHERE o.question_id = q.id)) ORDER BY q.area, q.position)
  FROM public.placement_questions q JOIN public.placement_question_translations qt ON qt.question_id = q.id AND qt.locale = p_locale
  WHERE q.version_id = version), '[]'::jsonb));
END $$;

-- Saves goals and records a scored result. p_answers maps question id -> option id (or null for
-- "not sure"); unanswered questions in a chosen area count as incorrect. With experience 'none' the
-- questions are skipped and each chosen area is recorded as beginner.
CREATE FUNCTION public.learner_placement_submit(p_role text, p_interests text[], p_experience text, p_version_id uuid DEFAULT NULL, p_answers jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid := auth.uid(); areas text[]; version uuid; result uuid; item record; qid uuid; oid uuid;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 areas := learning_private.placement_clean_goals(p_role, p_interests, p_experience);
 PERFORM pg_advisory_xact_lock(hashtextextended('placement:' || uid::text, 0));
 IF (SELECT count(*) FROM public.placement_results r WHERE r.user_id = uid AND r.created_at > now() - interval '1 day') >= 10 THEN
  RAISE EXCEPTION 'too many level checks today' USING ERRCODE='54000'; END IF;
 version := learning_private.placement_current_version();

 IF p_experience = 'none' OR version IS NULL THEN
  IF p_experience <> 'none' THEN RAISE EXCEPTION 'no published level check' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.placement_results(user_id, version_id, method) VALUES (uid, version, 'self_reported') RETURNING id INTO result;
  INSERT INTO public.placement_result_areas(result_id, area, correct, total, level)
   SELECT result, a, 0, 0, 'beginner' FROM unnest(areas) a;
 ELSE
  IF p_version_id IS DISTINCT FROM version THEN RAISE EXCEPTION 'level check changed; reload it' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'object' OR octet_length(p_answers::text) > 20000
   OR (SELECT count(*) FROM jsonb_object_keys(p_answers)) > 100 THEN
   RAISE EXCEPTION 'invalid answers' USING ERRCODE='22023'; END IF;
  -- Validate the whole answer set before writing anything.
  FOR item IN SELECT * FROM jsonb_each(p_answers) LOOP
   BEGIN qid := item.key::uuid; EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'invalid question' USING ERRCODE='22023'; END;
   IF NOT EXISTS (SELECT 1 FROM public.placement_questions q WHERE q.id = qid AND q.version_id = version AND q.area = ANY (areas)) THEN
    RAISE EXCEPTION 'question not in this level check' USING ERRCODE='22023'; END IF;
   IF jsonb_typeof(item.value) = 'null' THEN CONTINUE; END IF;
   IF jsonb_typeof(item.value) <> 'string' THEN RAISE EXCEPTION 'invalid option' USING ERRCODE='22023'; END IF;
   BEGIN oid := (item.value #>> '{}')::uuid; EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'invalid option' USING ERRCODE='22023'; END;
   IF NOT EXISTS (SELECT 1 FROM public.placement_options o WHERE o.id = oid AND o.question_id = qid) THEN
    RAISE EXCEPTION 'option does not belong to question' USING ERRCODE='22023'; END IF;
  END LOOP;
  INSERT INTO public.placement_results(user_id, version_id, method) VALUES (uid, version, 'quiz') RETURNING id INTO result;
  INSERT INTO public.placement_result_areas(result_id, area, correct, total, level)
   SELECT result, a, s.correct, s.total, learning_private.placement_level(s.correct, s.total)
   FROM unnest(areas) a
   CROSS JOIN LATERAL (
    SELECT count(q.id)::int AS total,
     count(k.question_id) FILTER (WHERE k.option_id::text = p_answers ->> q.id::text)::int AS correct
    FROM public.placement_questions q
    LEFT JOIN learning_private.placement_answer_keys k ON k.question_id = q.id
    WHERE q.version_id = version AND q.area = a) s;
 END IF;

 INSERT INTO public.learner_placement_goals(user_id, role, interest_areas, experience, updated_at)
  VALUES (uid, p_role, areas, p_experience, now())
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, interest_areas = EXCLUDED.interest_areas,
   experience = EXCLUDED.experience, updated_at = EXCLUDED.updated_at;
 DELETE FROM public.learner_placement_skips WHERE user_id = uid;
 RETURN learning_private.placement_status(uid);
END $$;

-- Changes goals without retaking the skill check.
CREATE FUNCTION public.learner_placement_update_goals(p_role text, p_interests text[], p_experience text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid := auth.uid(); areas text[];
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 areas := learning_private.placement_clean_goals(p_role, p_interests, p_experience);
 INSERT INTO public.learner_placement_goals(user_id, role, interest_areas, experience, updated_at)
  VALUES (uid, p_role, areas, p_experience, now())
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, interest_areas = EXCLUDED.interest_areas,
   experience = EXCLUDED.experience, updated_at = EXCLUDED.updated_at;
 RETURN learning_private.placement_status(uid);
END $$;

-- "Skip for now". Has no effect once a result exists.
CREATE FUNCTION public.learner_placement_skip() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid := auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF EXISTS (SELECT 1 FROM public.placement_results WHERE user_id = uid) THEN RETURN; END IF;
 INSERT INTO public.learner_placement_skips(user_id) VALUES (uid) ON CONFLICT (user_id) DO NOTHING;
END $$;

-- Records that recommended courses were shown or clicked. Unknown or unpublished courses are ignored.
CREATE FUNCTION public.learner_record_recommendation_events(p_event text, p_course_ids uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid := auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_event IS NULL OR p_event NOT IN ('shown','clicked') OR p_course_ids IS NULL OR cardinality(p_course_ids) > 12 THEN
  RAISE EXCEPTION 'invalid event' USING ERRCODE='22023'; END IF;
 INSERT INTO public.course_recommendation_events(user_id, course_id, event)
  SELECT DISTINCT uid, c.id, p_event FROM public.courses c WHERE c.id = ANY (p_course_ids) AND c.status = 'published'
  ON CONFLICT DO NOTHING;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Admin measurement
-- ---------------------------------------------------------------------------------------------
-- Per course since p_since: learners shown it, learners who clicked it, and clickers who then enrolled.
CREATE FUNCTION public.admin_recommendation_stats(p_since date DEFAULT (current_date - 30))
RETURNS TABLE (course_id uuid, slug text, learners_shown bigint, learners_clicked bigint, enrolled_after_click bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY
 SELECT c.id, c.slug,
  count(DISTINCT ev.user_id) FILTER (WHERE ev.event = 'shown'),
  count(DISTINCT ev.user_id) FILTER (WHERE ev.event = 'clicked'),
  count(DISTINCT ev.user_id) FILTER (WHERE ev.event = 'clicked' AND EXISTS (
   SELECT 1 FROM public.enrollments e WHERE e.user_id = ev.user_id AND e.course_id = ev.course_id AND e.granted_at >= ev.created_at))
 FROM public.course_recommendation_events ev JOIN public.courses c ON c.id = ev.course_id
 WHERE ev.day >= coalesce(p_since, current_date - 30)
 GROUP BY c.id, c.slug ORDER BY 3 DESC, c.slug;
END $$;

REVOKE ALL ON FUNCTION public.learner_placement_status(), public.learner_placement_questions(text),
 public.learner_placement_submit(text,text[],text,uuid,jsonb), public.learner_placement_update_goals(text,text[],text),
 public.learner_placement_skip(), public.learner_record_recommendation_events(text,uuid[]),
 public.admin_recommendation_stats(date) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.learner_placement_status(), public.learner_placement_questions(text),
 public.learner_placement_submit(text,text[],text,uuid,jsonb), public.learner_placement_update_goals(text,text[],text),
 public.learner_placement_skip(), public.learner_record_recommendation_events(text,uuid[]),
 public.admin_recommendation_stats(date) TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- v1 skill check (DRAFT content; see header). Four questions per area, easiest first.
-- In Arabic text, code is wrapped in U+2066/U+2069 (left-to-right isolate) so it keeps its order in RTL.
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.placement_versions(id, version_number, status, published_at)
VALUES ('a7000000-0000-4000-8000-000000000001', 1, 'published', now());

INSERT INTO public.placement_questions(id, version_id, area, position) VALUES
 ('a7100000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'functional', 1),
 ('a7100000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000001', 'functional', 2),
 ('a7100000-0000-4000-8000-000000000003', 'a7000000-0000-4000-8000-000000000001', 'functional', 3),
 ('a7100000-0000-4000-8000-000000000004', 'a7000000-0000-4000-8000-000000000001', 'functional', 4),
 ('a7100000-0000-4000-8000-000000000005', 'a7000000-0000-4000-8000-000000000001', 'technical', 1),
 ('a7100000-0000-4000-8000-000000000006', 'a7000000-0000-4000-8000-000000000001', 'technical', 2),
 ('a7100000-0000-4000-8000-000000000007', 'a7000000-0000-4000-8000-000000000001', 'technical', 3),
 ('a7100000-0000-4000-8000-000000000008', 'a7000000-0000-4000-8000-000000000001', 'technical', 4);

INSERT INTO public.placement_question_translations(question_id, locale, prompt) VALUES
 ('a7100000-0000-4000-8000-000000000001', 'en', 'How do you add a new business function, such as Inventory, to an Odoo database?'),
 ('a7100000-0000-4000-8000-000000000001', 'ar', 'كيف تضيف وظيفة عمل جديدة، مثل المخزون (Inventory)، إلى قاعدة بيانات Odoo؟'),
 ('a7100000-0000-4000-8000-000000000002', 'en', 'In the Sales app, what happens when you confirm a quotation?'),
 ('a7100000-0000-4000-8000-000000000002', 'ar', 'في تطبيق المبيعات (Sales)، ماذا يحدث عند تأكيد عرض السعر؟'),
 ('a7100000-0000-4000-8000-000000000003', 'en', 'In Odoo Accounting, what is the difference between a draft invoice and a posted invoice?'),
 ('a7100000-0000-4000-8000-000000000003', 'ar', 'في محاسبة Odoo، ما الفرق بين الفاتورة المسودة والفاتورة المُرحّلة؟'),
 ('a7100000-0000-4000-8000-000000000004', 'en', 'During an Odoo implementation, what is a fit-gap analysis used for?'),
 ('a7100000-0000-4000-8000-000000000004', 'ar', 'أثناء تنفيذ Odoo، ما الغرض من تحليل الملاءمة والفجوات (Fit-Gap)؟'),
 ('a7100000-0000-4000-8000-000000000005', 'en', 'What does this Python code print?  print(len([1, 2, 3]))'),
 ('a7100000-0000-4000-8000-000000000005', 'ar', U&'ماذا يطبع كود Python التالي؟ \2066print(len([1, 2, 3]))\2069'),
 ('a7100000-0000-4000-8000-000000000006', 'en', 'Which file in an Odoo module declares its name, version and dependencies?'),
 ('a7100000-0000-4000-8000-000000000006', 'ar', 'أي ملف في وحدة Odoo يحدد اسمها وإصدارها واعتمادياتها؟'),
 ('a7100000-0000-4000-8000-000000000007', 'en', 'Which base class do you inherit to create a new persistent Odoo model?'),
 ('a7100000-0000-4000-8000-000000000007', 'ar', 'ما الصنف الأساسي الذي ترث منه لإنشاء نموذج Odoo دائم جديد؟'),
 ('a7100000-0000-4000-8000-000000000008', 'en', 'How do you add a field to an existing model such as res.partner without changing Odoo''s source code?'),
 ('a7100000-0000-4000-8000-000000000008', 'ar', U&'كيف تضيف حقلًا إلى نموذج موجود مثل \2066res.partner\2069 دون تعديل الكود المصدري لـ Odoo؟');

INSERT INTO public.placement_options(id, question_id, position) VALUES
 ('a7200000-0000-4000-8000-000000000011', 'a7100000-0000-4000-8000-000000000001', 1),
 ('a7200000-0000-4000-8000-000000000012', 'a7100000-0000-4000-8000-000000000001', 2),
 ('a7200000-0000-4000-8000-000000000013', 'a7100000-0000-4000-8000-000000000001', 3),
 ('a7200000-0000-4000-8000-000000000014', 'a7100000-0000-4000-8000-000000000001', 4),
 ('a7200000-0000-4000-8000-000000000021', 'a7100000-0000-4000-8000-000000000002', 1),
 ('a7200000-0000-4000-8000-000000000022', 'a7100000-0000-4000-8000-000000000002', 2),
 ('a7200000-0000-4000-8000-000000000023', 'a7100000-0000-4000-8000-000000000002', 3),
 ('a7200000-0000-4000-8000-000000000024', 'a7100000-0000-4000-8000-000000000002', 4),
 ('a7200000-0000-4000-8000-000000000031', 'a7100000-0000-4000-8000-000000000003', 1),
 ('a7200000-0000-4000-8000-000000000032', 'a7100000-0000-4000-8000-000000000003', 2),
 ('a7200000-0000-4000-8000-000000000033', 'a7100000-0000-4000-8000-000000000003', 3),
 ('a7200000-0000-4000-8000-000000000034', 'a7100000-0000-4000-8000-000000000003', 4),
 ('a7200000-0000-4000-8000-000000000041', 'a7100000-0000-4000-8000-000000000004', 1),
 ('a7200000-0000-4000-8000-000000000042', 'a7100000-0000-4000-8000-000000000004', 2),
 ('a7200000-0000-4000-8000-000000000043', 'a7100000-0000-4000-8000-000000000004', 3),
 ('a7200000-0000-4000-8000-000000000044', 'a7100000-0000-4000-8000-000000000004', 4),
 ('a7200000-0000-4000-8000-000000000051', 'a7100000-0000-4000-8000-000000000005', 1),
 ('a7200000-0000-4000-8000-000000000052', 'a7100000-0000-4000-8000-000000000005', 2),
 ('a7200000-0000-4000-8000-000000000053', 'a7100000-0000-4000-8000-000000000005', 3),
 ('a7200000-0000-4000-8000-000000000054', 'a7100000-0000-4000-8000-000000000005', 4),
 ('a7200000-0000-4000-8000-000000000061', 'a7100000-0000-4000-8000-000000000006', 1),
 ('a7200000-0000-4000-8000-000000000062', 'a7100000-0000-4000-8000-000000000006', 2),
 ('a7200000-0000-4000-8000-000000000063', 'a7100000-0000-4000-8000-000000000006', 3),
 ('a7200000-0000-4000-8000-000000000064', 'a7100000-0000-4000-8000-000000000006', 4),
 ('a7200000-0000-4000-8000-000000000071', 'a7100000-0000-4000-8000-000000000007', 1),
 ('a7200000-0000-4000-8000-000000000072', 'a7100000-0000-4000-8000-000000000007', 2),
 ('a7200000-0000-4000-8000-000000000073', 'a7100000-0000-4000-8000-000000000007', 3),
 ('a7200000-0000-4000-8000-000000000074', 'a7100000-0000-4000-8000-000000000007', 4),
 ('a7200000-0000-4000-8000-000000000081', 'a7100000-0000-4000-8000-000000000008', 1),
 ('a7200000-0000-4000-8000-000000000082', 'a7100000-0000-4000-8000-000000000008', 2),
 ('a7200000-0000-4000-8000-000000000083', 'a7100000-0000-4000-8000-000000000008', 3),
 ('a7200000-0000-4000-8000-000000000084', 'a7100000-0000-4000-8000-000000000008', 4);

INSERT INTO public.placement_option_translations(option_id, locale, label) VALUES
 ('a7200000-0000-4000-8000-000000000011', 'en', 'Create a new database for it'),
 ('a7200000-0000-4000-8000-000000000011', 'ar', 'إنشاء قاعدة بيانات جديدة لها'),
 ('a7200000-0000-4000-8000-000000000012', 'en', 'Install its app from the Apps menu'),
 ('a7200000-0000-4000-8000-000000000012', 'ar', 'تثبيت التطبيق الخاص بها من قائمة التطبيقات (Apps)'),
 ('a7200000-0000-4000-8000-000000000013', 'en', 'Add a new user group only'),
 ('a7200000-0000-4000-8000-000000000013', 'ar', 'إضافة مجموعة مستخدمين جديدة فقط'),
 ('a7200000-0000-4000-8000-000000000014', 'en', 'Change the website theme'),
 ('a7200000-0000-4000-8000-000000000014', 'ar', 'تغيير قالب الموقع الإلكتروني'),
 ('a7200000-0000-4000-8000-000000000021', 'en', 'An invoice is posted automatically'),
 ('a7200000-0000-4000-8000-000000000021', 'ar', 'تُرحَّل فاتورة تلقائيًا'),
 ('a7200000-0000-4000-8000-000000000022', 'en', 'The customer is archived'),
 ('a7200000-0000-4000-8000-000000000022', 'ar', 'تتم أرشفة العميل'),
 ('a7200000-0000-4000-8000-000000000023', 'en', 'It becomes a sales order, and a delivery is created for storable products'),
 ('a7200000-0000-4000-8000-000000000023', 'ar', 'يتحول إلى أمر بيع، ويُنشأ أمر تسليم للمنتجات المخزنية'),
 ('a7200000-0000-4000-8000-000000000024', 'en', 'The products are removed from the catalog'),
 ('a7200000-0000-4000-8000-000000000024', 'ar', 'تُحذف المنتجات من الكتالوج'),
 ('a7200000-0000-4000-8000-000000000031', 'en', 'There is no difference'),
 ('a7200000-0000-4000-8000-000000000031', 'ar', 'لا يوجد فرق'),
 ('a7200000-0000-4000-8000-000000000032', 'en', 'A draft invoice is emailed to the customer automatically'),
 ('a7200000-0000-4000-8000-000000000032', 'ar', 'تُرسل الفاتورة المسودة إلى العميل بالبريد تلقائيًا'),
 ('a7200000-0000-4000-8000-000000000033', 'en', 'A posted invoice can always be deleted'),
 ('a7200000-0000-4000-8000-000000000033', 'ar', 'يمكن دائمًا حذف الفاتورة المُرحّلة'),
 ('a7200000-0000-4000-8000-000000000034', 'en', 'A posted invoice creates journal entries and gets its final number; a draft can still be edited'),
 ('a7200000-0000-4000-8000-000000000034', 'ar', 'الفاتورة المُرحّلة تُنشئ قيود اليومية وتحصل على رقمها النهائي، بينما يمكن تعديل المسودة'),
 ('a7200000-0000-4000-8000-000000000041', 'en', 'Comparing business requirements with standard Odoo features to find what needs configuration or customization'),
 ('a7200000-0000-4000-8000-000000000041', 'ar', 'مقارنة متطلبات العمل بميزات Odoo القياسية لتحديد ما يحتاج إلى إعداد أو تخصيص'),
 ('a7200000-0000-4000-8000-000000000042', 'en', 'Measuring server performance before go-live'),
 ('a7200000-0000-4000-8000-000000000042', 'ar', 'قياس أداء الخادم قبل التشغيل الفعلي'),
 ('a7200000-0000-4000-8000-000000000043', 'en', 'Choosing the colors of the user interface'),
 ('a7200000-0000-4000-8000-000000000043', 'ar', 'اختيار ألوان واجهة المستخدم'),
 ('a7200000-0000-4000-8000-000000000044', 'en', 'Importing the opening balances'),
 ('a7200000-0000-4000-8000-000000000044', 'ar', 'استيراد الأرصدة الافتتاحية'),
 ('a7200000-0000-4000-8000-000000000051', 'en', '3'),
 ('a7200000-0000-4000-8000-000000000051', 'ar', '3'),
 ('a7200000-0000-4000-8000-000000000052', 'en', '6'),
 ('a7200000-0000-4000-8000-000000000052', 'ar', '6'),
 ('a7200000-0000-4000-8000-000000000053', 'en', '[1, 2, 3]'),
 ('a7200000-0000-4000-8000-000000000053', 'ar', U&'\2066[1, 2, 3]\2069'),
 ('a7200000-0000-4000-8000-000000000054', 'en', 'An error'),
 ('a7200000-0000-4000-8000-000000000054', 'ar', 'خطأ'),
 ('a7200000-0000-4000-8000-000000000061', 'en', '__init__.py'),
 ('a7200000-0000-4000-8000-000000000061', 'ar', '__init__.py'),
 ('a7200000-0000-4000-8000-000000000062', 'en', '__manifest__.py'),
 ('a7200000-0000-4000-8000-000000000062', 'ar', '__manifest__.py'),
 ('a7200000-0000-4000-8000-000000000063', 'en', 'models.py'),
 ('a7200000-0000-4000-8000-000000000063', 'ar', 'models.py'),
 ('a7200000-0000-4000-8000-000000000064', 'en', 'ir.model.access.csv'),
 ('a7200000-0000-4000-8000-000000000064', 'ar', 'ir.model.access.csv'),
 ('a7200000-0000-4000-8000-000000000071', 'en', 'models.TransientModel'),
 ('a7200000-0000-4000-8000-000000000071', 'ar', 'models.TransientModel'),
 ('a7200000-0000-4000-8000-000000000072', 'en', 'http.Controller'),
 ('a7200000-0000-4000-8000-000000000072', 'ar', 'http.Controller'),
 ('a7200000-0000-4000-8000-000000000073', 'en', 'models.Model'),
 ('a7200000-0000-4000-8000-000000000073', 'ar', 'models.Model'),
 ('a7200000-0000-4000-8000-000000000074', 'en', 'models.AbstractModel'),
 ('a7200000-0000-4000-8000-000000000074', 'ar', 'models.AbstractModel'),
 ('a7200000-0000-4000-8000-000000000081', 'en', 'Edit the field list in Odoo''s base module'),
 ('a7200000-0000-4000-8000-000000000081', 'ar', 'تعديل قائمة الحقول في الوحدة الأساسية لـ Odoo'),
 ('a7200000-0000-4000-8000-000000000082', 'en', 'Add the column directly in PostgreSQL'),
 ('a7200000-0000-4000-8000-000000000082', 'ar', 'إضافة العمود مباشرة في PostgreSQL'),
 ('a7200000-0000-4000-8000-000000000083', 'en', 'Copy the whole model into a new module with a new _name'),
 ('a7200000-0000-4000-8000-000000000083', 'ar', U&'نسخ النموذج كاملًا إلى وحدة جديدة باسم \2066_name\2069 جديد'),
 ('a7200000-0000-4000-8000-000000000084', 'en', 'In your own module, create a class with _inherit = ''res.partner'' and declare the field'),
 ('a7200000-0000-4000-8000-000000000084', 'ar', U&'في وحدتك الخاصة، أنشئ صنفًا يحتوي على \2066_inherit = ''res.partner''\2069 وعرّف الحقل');

INSERT INTO learning_private.placement_answer_keys(question_id, option_id) VALUES
 ('a7100000-0000-4000-8000-000000000001', 'a7200000-0000-4000-8000-000000000012'),
 ('a7100000-0000-4000-8000-000000000002', 'a7200000-0000-4000-8000-000000000023'),
 ('a7100000-0000-4000-8000-000000000003', 'a7200000-0000-4000-8000-000000000034'),
 ('a7100000-0000-4000-8000-000000000004', 'a7200000-0000-4000-8000-000000000041'),
 ('a7100000-0000-4000-8000-000000000005', 'a7200000-0000-4000-8000-000000000051'),
 ('a7100000-0000-4000-8000-000000000006', 'a7200000-0000-4000-8000-000000000062'),
 ('a7100000-0000-4000-8000-000000000007', 'a7200000-0000-4000-8000-000000000073'),
 ('a7100000-0000-4000-8000-000000000008', 'a7200000-0000-4000-8000-000000000084');

-- Published versions are immutable: block edits to a published version's questions, options and keys.
CREATE FUNCTION learning_private.placement_block_published_edits() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE version uuid;
BEGIN
 IF TG_TABLE_NAME = 'placement_versions' THEN
  IF OLD.status = 'published' THEN RAISE EXCEPTION 'published level checks are immutable' USING ERRCODE='23514'; END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
 END IF;
 IF TG_TABLE_NAME = 'placement_questions' THEN
  version := CASE WHEN TG_OP = 'INSERT' THEN NEW.version_id ELSE OLD.version_id END;
 ELSIF TG_TABLE_NAME IN ('placement_question_translations','placement_answer_keys') THEN
  SELECT q.version_id INTO version FROM public.placement_questions q
   WHERE q.id = CASE WHEN TG_OP = 'INSERT' THEN NEW.question_id ELSE OLD.question_id END;
 ELSIF TG_TABLE_NAME = 'placement_options' THEN
  SELECT q.version_id INTO version FROM public.placement_questions q
   WHERE q.id = CASE WHEN TG_OP = 'INSERT' THEN NEW.question_id ELSE OLD.question_id END;
 ELSE
  SELECT q.version_id INTO version FROM public.placement_options o JOIN public.placement_questions q ON q.id = o.question_id
   WHERE o.id = CASE WHEN TG_OP = 'INSERT' THEN NEW.option_id ELSE OLD.option_id END;
 END IF;
 IF EXISTS (SELECT 1 FROM public.placement_versions v WHERE v.id = version AND v.status = 'published') THEN
  RAISE EXCEPTION 'published level checks are immutable' USING ERRCODE='23514'; END IF;
 RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION learning_private.placement_block_published_edits() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER placement_versions_immutable BEFORE UPDATE OR DELETE ON public.placement_versions
 FOR EACH ROW EXECUTE FUNCTION learning_private.placement_block_published_edits();
CREATE TRIGGER placement_questions_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.placement_questions
 FOR EACH ROW EXECUTE FUNCTION learning_private.placement_block_published_edits();
CREATE TRIGGER placement_question_translations_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.placement_question_translations
 FOR EACH ROW EXECUTE FUNCTION learning_private.placement_block_published_edits();
CREATE TRIGGER placement_options_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.placement_options
 FOR EACH ROW EXECUTE FUNCTION learning_private.placement_block_published_edits();
CREATE TRIGGER placement_option_translations_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.placement_option_translations
 FOR EACH ROW EXECUTE FUNCTION learning_private.placement_block_published_edits();
CREATE TRIGGER placement_answer_keys_immutable BEFORE INSERT OR UPDATE OR DELETE ON learning_private.placement_answer_keys
 FOR EACH ROW EXECUTE FUNCTION learning_private.placement_block_published_edits();
