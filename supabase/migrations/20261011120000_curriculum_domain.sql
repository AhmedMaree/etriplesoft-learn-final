-- Phase 08: ordered curriculum and private lesson resources.
-- Preview is explicit metadata on a lesson (default false). This migration does not grant
-- anonymous access to lesson bodies, resource locators, storage objects, or video playback.
-- Exact-locale public outline access is a narrow projection only.

-- Tables -------------------------------------------------------------------------------

CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE RESTRICT,
  position integer NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT course_modules_position_check CHECK (position > 0),
  CONSTRAINT course_modules_course_position_key UNIQUE (course_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE public.module_translations (
  module_id uuid NOT NULL REFERENCES public.course_modules (id) ON DELETE RESTRICT,
  locale text NOT NULL,
  title text NOT NULL,
  description text,
  publication_status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (module_id, locale),
  CONSTRAINT module_translations_locale_check CHECK (locale IN ('en', 'ar')),
  CONSTRAINT module_translations_title_check CHECK (
    title = pg_catalog.btrim(title) AND pg_catalog.char_length(title) BETWEEN 1 AND 160
  ),
  CONSTRAINT module_translations_description_check CHECK (
    description IS NULL OR (description = pg_catalog.btrim(description) AND pg_catalog.char_length(description) BETWEEN 1 AND 2000)
  ),
  CONSTRAINT module_translations_publication_check CHECK (publication_status IN ('draft', 'published')),
  CONSTRAINT module_translations_published_at_check CHECK (publication_status <> 'published' OR published_at IS NOT NULL)
);

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules (id) ON DELETE RESTRICT,
  position integer NOT NULL,
  lesson_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  is_required boolean NOT NULL DEFAULT true,
  is_preview boolean NOT NULL DEFAULT false,
  duration_seconds integer,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT lessons_module_position_key UNIQUE (module_id, position) DEFERRABLE INITIALLY IMMEDIATE,
  CONSTRAINT lessons_position_check CHECK (position > 0),
  CONSTRAINT lessons_type_check CHECK (lesson_type IN ('video', 'article', 'assessment', 'resource')),
  CONSTRAINT lessons_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT lessons_duration_check CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT lessons_published_at_check CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE TABLE public.lesson_translations (
  lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE RESTRICT,
  locale text NOT NULL,
  title text NOT NULL,
  summary text,
  body text,
  publication_status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (lesson_id, locale),
  CONSTRAINT lesson_translations_locale_check CHECK (locale IN ('en', 'ar')),
  CONSTRAINT lesson_translations_title_check CHECK (
    title = pg_catalog.btrim(title) AND pg_catalog.char_length(title) BETWEEN 1 AND 200
  ),
  CONSTRAINT lesson_translations_summary_check CHECK (
    summary IS NULL OR (summary = pg_catalog.btrim(summary) AND pg_catalog.char_length(summary) BETWEEN 1 AND 1000)
  ),
  CONSTRAINT lesson_translations_body_check CHECK (
    body IS NULL OR (body = pg_catalog.btrim(body) AND pg_catalog.char_length(body) BETWEEN 1 AND 100000)
  ),
  CONSTRAINT lesson_translations_publication_check CHECK (publication_status IN ('draft', 'published')),
  CONSTRAINT lesson_translations_published_at_check CHECK (publication_status <> 'published' OR published_at IS NOT NULL)
);

CREATE TABLE public.lesson_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE RESTRICT,
  kind text NOT NULL,
  locale text,
  position integer NOT NULL,
  storage_object_key text,
  external_url text,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT lesson_resources_locale_check CHECK (locale IS NULL OR locale IN ('en', 'ar')),
  CONSTRAINT lesson_resources_position_check CHECK (position > 0),
  CONSTRAINT lesson_resources_kind_check CHECK (kind IN ('file', 'external_url')),
  CONSTRAINT lesson_resources_locator_check CHECK (
    (kind = 'file' AND storage_object_key IS NOT NULL AND external_url IS NULL)
    OR (kind = 'external_url' AND storage_object_key IS NULL AND external_url IS NOT NULL)
  ),
  CONSTRAINT lesson_resources_object_key_check CHECK (
    storage_object_key IS NULL OR (
      pg_catalog.char_length(storage_object_key) BETWEEN 1 AND 512
      AND storage_object_key ~ '^[A-Za-z0-9][A-Za-z0-9_./-]*$'
      AND storage_object_key !~ '(^/|//|(^|/)\.{1,2}(/|$))'
    )
  ),
  CONSTRAINT lesson_resources_external_url_check CHECK (
    external_url IS NULL OR (
      external_url ~ '^https://[^/?#[:space:]@]+(/[^[:space:]#]*)?(\?[^[:space:]#]*)?(#[^[:space:]]*)?$'
    )
  )
);

CREATE TABLE public.lesson_resource_translations (
  resource_id uuid NOT NULL REFERENCES public.lesson_resources (id) ON DELETE CASCADE,
  locale text NOT NULL,
  label text NOT NULL,
  description text,
  publication_status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (resource_id, locale),
  CONSTRAINT lesson_resource_translations_locale_check CHECK (locale IN ('en', 'ar')),
  CONSTRAINT lesson_resource_translations_label_check CHECK (
    label = pg_catalog.btrim(label) AND pg_catalog.char_length(label) BETWEEN 1 AND 160
  ),
  CONSTRAINT lesson_resource_translations_description_check CHECK (
    description IS NULL OR (description = pg_catalog.btrim(description) AND pg_catalog.char_length(description) BETWEEN 1 AND 2000)
  ),
  CONSTRAINT lesson_resource_translations_publication_check CHECK (publication_status IN ('draft', 'published')),
  CONSTRAINT lesson_resource_translations_published_at_check CHECK (publication_status <> 'published' OR published_at IS NOT NULL)
);

-- A private bucket shares the repository's existing 50 MiB storage cap. No browser storage
-- policies are added here; uploads and signed downloads require a future authorized server path.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-resources', 'course-resources', false, 52428800);

-- Indexes ------------------------------------------------------------------------------

CREATE INDEX module_translations_published_locale_idx
  ON public.module_translations (locale, module_id) WHERE publication_status = 'published';
CREATE INDEX lesson_translations_published_locale_idx
  ON public.lesson_translations (locale, lesson_id) WHERE publication_status = 'published';
CREATE INDEX lesson_resource_translations_published_locale_idx
  ON public.lesson_resource_translations (locale, resource_id) WHERE publication_status = 'published';
CREATE UNIQUE INDEX lesson_resources_lesson_locale_position_key
  ON public.lesson_resources (lesson_id, (COALESCE(locale, '')), position);

-- Updated timestamps -------------------------------------------------------------------

CREATE TRIGGER course_modules_set_updated_at BEFORE UPDATE ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER module_translations_set_updated_at BEFORE UPDATE ON public.module_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lessons_set_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lesson_translations_set_updated_at BEFORE UPDATE ON public.lesson_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lesson_resources_set_updated_at BEFORE UPDATE ON public.lesson_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lesson_resource_translations_set_updated_at BEFORE UPDATE ON public.lesson_resource_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default-deny RLS. Safe published outlines are returned by a narrow function below. Bodies and
-- resource locators stay inaccessible to direct Data API table reads; entitlement and signed access
-- are deliberately deferred to their owning phases.
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resource_translations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.course_modules, public.module_translations, public.lessons,
  public.lesson_translations, public.lesson_resources, public.lesson_resource_translations
  FROM PUBLIC, anon, authenticated, service_role;

-- Safe public projection: exact locale, published ancestors and lesson translations only.
-- Preview is listed so the consumer can badge it; this does not authorize protected lesson access.
CREATE FUNCTION public.catalog_get_course_outline(
  p_course_slug text, p_locale text, p_limit integer DEFAULT 200, p_offset integer DEFAULT 0
)
RETURNS TABLE (
  course_id uuid,
  course_slug text,
  module_id uuid,
  module_position integer,
  module_title text,
  module_description text,
  lesson_id uuid,
  lesson_position integer,
  lesson_type text,
  lesson_title text,
  lesson_summary text,
  is_required boolean,
  is_preview boolean,
  duration_seconds integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT c.id, c.slug, m.id, m.position, mt.title, mt.description,
         l.id, l.position, l.lesson_type, lt.title, lt.summary,
         l.is_required, l.is_preview, l.duration_seconds
  FROM public.courses c
  JOIN public.course_translations ct
    ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  JOIN public.course_modules m ON m.course_id = c.id
  JOIN public.module_translations mt
    ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
  JOIN public.lessons l ON l.module_id = m.id AND l.status = 'published'
  JOIN public.lesson_translations lt
    ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
  WHERE c.slug = p_course_slug AND c.status = 'published'
  ORDER BY m.position, l.position
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_get_course_outline(text, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_get_course_outline(text, text, integer, integer) TO anon, authenticated;

-- Reorder operations require the complete sibling set. Deferred uniqueness makes the swap atomic
-- while preserving positive contiguous positions; partial/client-invented orderings are rejected.
CREATE FUNCTION public.admin_reorder_course_modules(p_course_id uuid, p_module_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_count bigint;
BEGIN
  PERFORM 1 FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('course_modules:' || p_course_id::text));
  SELECT pg_catalog.count(*) INTO v_count FROM public.course_modules WHERE course_id = p_course_id;
  IF p_module_ids IS NULL OR pg_catalog.cardinality(p_module_ids) <> v_count
     OR (SELECT pg_catalog.count(DISTINCT x) FROM pg_catalog.unnest(p_module_ids) AS x) <> v_count
     OR EXISTS (
       SELECT id FROM public.course_modules WHERE course_id = p_course_id
       EXCEPT SELECT pg_catalog.unnest(p_module_ids)
     ) THEN
    RAISE EXCEPTION 'module ordering must contain every module exactly once' USING ERRCODE = '22023';
  END IF;

  SET CONSTRAINTS course_modules_course_position_key DEFERRED;
  UPDATE public.course_modules m
  SET position = ordered.ordinality::integer
  FROM pg_catalog.unnest(p_module_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE m.id = ordered.id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, module_id, safe_summary)
  SELECT v_actor, 'course_module.reordered', 'course_module', m.id, 'Reordered course curriculum modules'
  FROM public.course_modules m WHERE m.course_id = p_course_id;
END;
$$;

CREATE FUNCTION public.admin_reorder_module_lessons(p_module_id uuid, p_lesson_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_count bigint;
BEGIN
  PERFORM 1 FROM public.course_modules WHERE id = p_module_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'module not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('module_lessons:' || p_module_id::text));
  SELECT pg_catalog.count(*) INTO v_count FROM public.lessons WHERE module_id = p_module_id;
  IF p_lesson_ids IS NULL OR pg_catalog.cardinality(p_lesson_ids) <> v_count
     OR (SELECT pg_catalog.count(DISTINCT x) FROM pg_catalog.unnest(p_lesson_ids) AS x) <> v_count
     OR EXISTS (
       SELECT id FROM public.lessons WHERE module_id = p_module_id
       EXCEPT SELECT pg_catalog.unnest(p_lesson_ids)
     ) THEN
    RAISE EXCEPTION 'lesson ordering must contain every lesson exactly once' USING ERRCODE = '22023';
  END IF;

  SET CONSTRAINTS lessons_module_position_key DEFERRED;
  UPDATE public.lessons l
  SET position = ordered.ordinality::integer
  FROM pg_catalog.unnest(p_lesson_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE l.id = ordered.id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
  SELECT v_actor, 'lesson.reordered', 'lesson', l.id, 'Reordered module lessons'
  FROM public.lessons l WHERE l.module_id = p_module_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reorder_course_modules(uuid, uuid[]),
  public.admin_reorder_module_lessons(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reorder_course_modules(uuid, uuid[]),
  public.admin_reorder_module_lessons(uuid, uuid[]) TO authenticated;

-- Narrow authoring operations. Direct table writes remain denied; every operation checks the
-- current admin grant, validates its parent, and writes a typed audit record atomically.
CREATE FUNCTION public.admin_create_course_module(p_course_id uuid, p_is_required boolean DEFAULT true)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_module_id uuid;
  v_position integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('course_modules:' || p_course_id::text));
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
    RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT COALESCE(pg_catalog.max(position), 0) + 1 INTO v_position
  FROM public.course_modules WHERE course_id = p_course_id;
  INSERT INTO public.course_modules (course_id, position, is_required)
  VALUES (p_course_id, v_position, COALESCE(p_is_required, true)) RETURNING id INTO v_module_id;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, module_id, safe_summary)
  VALUES (v_actor, 'course_module.created', 'course_module', v_module_id, 'Created curriculum module');
  RETURN v_module_id;
END;
$$;

CREATE FUNCTION public.admin_create_lesson(
  p_module_id uuid,
  p_lesson_type text,
  p_is_required boolean DEFAULT true,
  p_is_preview boolean DEFAULT false,
  p_duration_seconds integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_lesson_id uuid;
  v_position integer;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('module_lessons:' || p_module_id::text));
  IF NOT EXISTS (SELECT 1 FROM public.course_modules WHERE id = p_module_id) THEN
    RAISE EXCEPTION 'module not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT COALESCE(pg_catalog.max(position), 0) + 1 INTO v_position
  FROM public.lessons WHERE module_id = p_module_id;
  INSERT INTO public.lessons (module_id, position, lesson_type, is_required, is_preview, duration_seconds)
  VALUES (p_module_id, v_position, p_lesson_type, COALESCE(p_is_required, true), COALESCE(p_is_preview, false), p_duration_seconds)
  RETURNING id INTO v_lesson_id;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
  VALUES (v_actor, 'lesson.created', 'lesson', v_lesson_id, 'Created curriculum lesson');
  RETURN v_lesson_id;
END;
$$;

CREATE FUNCTION public.admin_update_lesson(
  p_lesson_id uuid, p_is_required boolean, p_is_preview boolean, p_duration_seconds integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin();
BEGIN
  UPDATE public.lessons SET is_required = COALESCE(p_is_required, is_required),
    is_preview = COALESCE(p_is_preview, is_preview), duration_seconds = p_duration_seconds
  WHERE id = p_lesson_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
  VALUES (v_actor, 'lesson.updated', 'lesson', p_lesson_id, 'Updated lesson required, preview or duration settings');
END;
$$;

CREATE FUNCTION public.admin_save_module_translation(
  p_module_id uuid, p_locale text, p_title text, p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin();
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.course_modules WHERE id = p_module_id) THEN RAISE EXCEPTION 'module not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.module_translations (module_id, locale, title, description)
  VALUES (p_module_id, p_locale, pg_catalog.btrim(COALESCE(p_title, '')), NULLIF(pg_catalog.btrim(p_description), ''))
  ON CONFLICT (module_id, locale) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
    publication_status = 'draft', published_at = NULL;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, module_id, safe_summary)
  VALUES (v_actor, 'course_module.translation_saved', 'course_module', p_module_id, 'Saved curriculum module translation');
END;
$$;

CREATE FUNCTION public.admin_save_lesson_translation(
  p_lesson_id uuid, p_locale text, p_title text, p_summary text DEFAULT NULL, p_body text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin();
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = p_lesson_id) THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.lesson_translations (lesson_id, locale, title, summary, body)
  VALUES (p_lesson_id, p_locale, pg_catalog.btrim(COALESCE(p_title, '')), NULLIF(pg_catalog.btrim(p_summary), ''), NULLIF(pg_catalog.btrim(p_body), ''))
  ON CONFLICT (lesson_id, locale) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, body = EXCLUDED.body,
    publication_status = 'draft', published_at = NULL;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
  VALUES (v_actor, 'lesson.translation_saved', 'lesson', p_lesson_id, 'Saved curriculum lesson translation');
END;
$$;

CREATE FUNCTION public.admin_set_module_translation_publication(p_module_id uuid, p_locale text, p_publish boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin(); v_course_id uuid;
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023'; END IF;
  SELECT m.course_id INTO v_course_id FROM public.course_modules m WHERE m.id = p_module_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'module not found' USING ERRCODE = 'P0002'; END IF;
  IF p_publish AND NOT EXISTS (
    SELECT 1 FROM public.courses c JOIN public.course_translations ct ON ct.course_id = c.id
    WHERE c.id = v_course_id AND c.status = 'published' AND ct.locale = p_locale AND ct.publication_status = 'published'
  ) THEN RAISE EXCEPTION 'published course translation required' USING ERRCODE = '23514'; END IF;
  UPDATE public.module_translations SET publication_status = CASE WHEN p_publish THEN 'published' ELSE 'draft' END,
    published_at = CASE WHEN p_publish THEN COALESCE(published_at, pg_catalog.now()) ELSE NULL END
  WHERE module_id = p_module_id AND locale = p_locale;
  IF NOT FOUND THEN RAISE EXCEPTION 'module translation not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, module_id, safe_summary)
  VALUES (v_actor, CASE WHEN p_publish THEN 'course_module.translation_published' ELSE 'course_module.translation_unpublished' END,
    'course_module', p_module_id, CASE WHEN p_publish THEN 'Published module translation' ELSE 'Unpublished module translation' END);
END;
$$;

CREATE FUNCTION public.admin_set_lesson_status(p_lesson_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin();
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('draft', 'published', 'archived') THEN RAISE EXCEPTION 'unsupported lesson status' USING ERRCODE = '22023'; END IF;
  IF p_status = 'published' AND NOT EXISTS (
    SELECT 1 FROM public.lesson_translations lt
    JOIN public.lessons l ON l.id = lt.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    JOIN public.module_translations mt ON mt.module_id = m.id AND mt.locale = lt.locale AND mt.publication_status = 'published'
    JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = lt.locale AND ct.publication_status = 'published'
    WHERE l.id = p_lesson_id AND c.status = 'published' AND lt.publication_status = 'published'
  ) THEN
    RAISE EXCEPTION 'a published lesson translation with published ancestors is required' USING ERRCODE = '23514';
  END IF;
  UPDATE public.lessons SET status = p_status,
    published_at = CASE WHEN p_status = 'published' THEN COALESCE(published_at, pg_catalog.now()) ELSE published_at END
  WHERE id = p_lesson_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
  VALUES (v_actor, 'lesson.updated', 'lesson', p_lesson_id, 'Changed curriculum lesson status');
END;
$$;

CREATE FUNCTION public.admin_set_lesson_translation_publication(p_lesson_id uuid, p_locale text, p_publish boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin();
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023'; END IF;
  IF p_publish AND NOT EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    JOIN public.module_translations mt ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
    JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
    WHERE l.id = p_lesson_id AND c.status = 'published'
  ) THEN RAISE EXCEPTION 'published lesson, module and course ancestors in this locale are required' USING ERRCODE = '23514'; END IF;
  UPDATE public.lesson_translations SET publication_status = CASE WHEN p_publish THEN 'published' ELSE 'draft' END,
    published_at = CASE WHEN p_publish THEN COALESCE(published_at, pg_catalog.now()) ELSE NULL END
  WHERE lesson_id = p_lesson_id AND locale = p_locale;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson translation not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
  VALUES (v_actor, CASE WHEN p_publish THEN 'lesson.translation_published' ELSE 'lesson.translation_unpublished' END,
    'lesson', p_lesson_id, CASE WHEN p_publish THEN 'Published lesson translation' ELSE 'Unpublished lesson translation' END);
END;
$$;

CREATE FUNCTION public.admin_create_lesson_resource(
  p_lesson_id uuid, p_kind text, p_locale text DEFAULT NULL, p_external_url text DEFAULT NULL
)
RETURNS TABLE (resource_id uuid, storage_object_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_course_id uuid;
  v_resource_id uuid := gen_random_uuid();
  v_object_key text;
  v_position integer;
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('file', 'external_url') THEN RAISE EXCEPTION 'unsupported resource kind' USING ERRCODE = '22023'; END IF;
  IF p_locale IS NOT NULL AND p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023'; END IF;
  SELECT c.id INTO v_course_id FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = p_lesson_id FOR UPDATE OF l;
  IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE = 'P0002'; END IF;
  IF p_kind = 'external_url' AND p_external_url IS NULL OR p_kind = 'file' AND p_external_url IS NOT NULL THEN
    RAISE EXCEPTION 'external URL must match the selected resource kind' USING ERRCODE = '22023';
  END IF;
  v_object_key := CASE WHEN p_kind = 'file' THEN 'courses/' || v_course_id::text || '/lessons/' || p_lesson_id::text || '/resources/' || v_resource_id::text ELSE NULL END;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('lesson_resources:' || p_lesson_id::text || ':' || COALESCE(p_locale, '*')));
  SELECT COALESCE(pg_catalog.max(r.position), 0) + 1 INTO v_position FROM public.lesson_resources r
    WHERE r.lesson_id = p_lesson_id AND COALESCE(r.locale, '') = COALESCE(p_locale, '');
  INSERT INTO public.lesson_resources (id, lesson_id, kind, locale, position, storage_object_key, external_url, created_by)
  VALUES (v_resource_id, p_lesson_id, p_kind, p_locale, v_position, v_object_key, p_external_url, v_actor);
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_resource_id, safe_summary)
  VALUES (v_actor, 'lesson_resource.created', 'lesson_resource', v_resource_id, 'Created lesson resource');
  RETURN QUERY SELECT v_resource_id, v_object_key;
END;
$$;

CREATE FUNCTION public.admin_save_resource_translation(
  p_resource_id uuid, p_locale text, p_label text, p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin();
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id = p_resource_id) THEN RAISE EXCEPTION 'resource not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.lesson_resource_translations (resource_id, locale, label, description)
  VALUES (p_resource_id, p_locale, pg_catalog.btrim(COALESCE(p_label, '')), NULLIF(pg_catalog.btrim(p_description), ''))
  ON CONFLICT (resource_id, locale) DO UPDATE SET label = EXCLUDED.label, description = EXCLUDED.description,
    publication_status = 'draft', published_at = NULL;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_resource_id, safe_summary)
  VALUES (v_actor, 'lesson_resource.translation_saved', 'lesson_resource', p_resource_id, 'Saved lesson resource translation');
END;
$$;

CREATE FUNCTION public.admin_set_resource_translation_publication(p_resource_id uuid, p_locale text, p_publish boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_actor uuid := public.assert_active_admin();
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023'; END IF;
  IF p_publish AND NOT EXISTS (
    SELECT 1 FROM public.lesson_resources r
    JOIN public.lessons l ON l.id = r.lesson_id AND l.status = 'published'
    JOIN public.lesson_translations lt ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.module_translations mt ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
    JOIN public.courses c ON c.id = m.course_id AND c.status = 'published'
    JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
    WHERE r.id = p_resource_id AND (r.locale IS NULL OR r.locale = p_locale)
  ) THEN RAISE EXCEPTION 'published resource ancestors in this locale are required' USING ERRCODE = '23514'; END IF;
  UPDATE public.lesson_resource_translations SET publication_status = CASE WHEN p_publish THEN 'published' ELSE 'draft' END,
    published_at = CASE WHEN p_publish THEN COALESCE(published_at, pg_catalog.now()) ELSE NULL END
  WHERE resource_id = p_resource_id AND locale = p_locale;
  IF NOT FOUND THEN RAISE EXCEPTION 'resource translation not found' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_resource_id, safe_summary)
  VALUES (v_actor, CASE WHEN p_publish THEN 'lesson_resource.translation_published' ELSE 'lesson_resource.translation_unpublished' END,
    'lesson_resource', p_resource_id, CASE WHEN p_publish THEN 'Published lesson resource translation' ELSE 'Unpublished lesson resource translation' END);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_course_module(uuid, boolean),
  public.admin_create_lesson(uuid, text, boolean, boolean, integer),
  public.admin_update_lesson(uuid, boolean, boolean, integer),
  public.admin_save_module_translation(uuid, text, text, text),
  public.admin_save_lesson_translation(uuid, text, text, text, text),
  public.admin_set_module_translation_publication(uuid, text, boolean),
  public.admin_set_lesson_status(uuid, text),
  public.admin_set_lesson_translation_publication(uuid, text, boolean),
  public.admin_create_lesson_resource(uuid, text, text, text),
  public.admin_save_resource_translation(uuid, text, text, text),
  public.admin_set_resource_translation_publication(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_course_module(uuid, boolean),
  public.admin_create_lesson(uuid, text, boolean, boolean, integer),
  public.admin_update_lesson(uuid, boolean, boolean, integer),
  public.admin_save_module_translation(uuid, text, text, text),
  public.admin_save_lesson_translation(uuid, text, text, text, text),
  public.admin_set_module_translation_publication(uuid, text, boolean),
  public.admin_set_lesson_status(uuid, text),
  public.admin_set_lesson_translation_publication(uuid, text, boolean),
  public.admin_create_lesson_resource(uuid, text, text, text),
  public.admin_save_resource_translation(uuid, text, text, text),
  public.admin_set_resource_translation_publication(uuid, text, boolean) TO authenticated;

-- Typed audit targets ------------------------------------------------------------------

ALTER TABLE public.admin_audit_log
  ADD COLUMN module_id uuid REFERENCES public.course_modules (id) ON DELETE RESTRICT,
  ADD COLUMN lesson_id uuid REFERENCES public.lessons (id) ON DELETE RESTRICT,
  ADD COLUMN lesson_resource_id uuid REFERENCES public.lesson_resources (id) ON DELETE RESTRICT;

CREATE INDEX admin_audit_log_module_occurred_at_idx
  ON public.admin_audit_log (module_id, occurred_at DESC) WHERE module_id IS NOT NULL;
CREATE INDEX admin_audit_log_lesson_occurred_at_idx
  ON public.admin_audit_log (lesson_id, occurred_at DESC) WHERE lesson_id IS NOT NULL;
CREATE INDEX admin_audit_log_resource_occurred_at_idx
  ON public.admin_audit_log (lesson_resource_id, occurred_at DESC) WHERE lesson_resource_id IS NOT NULL;

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT admin_audit_log_target_type_check,
  DROP CONSTRAINT admin_audit_log_target_shape_check,
  DROP CONSTRAINT admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check
    CHECK (target_type IN ('user_role', 'user', 'course', 'course_module', 'lesson', 'lesson_resource')),
  ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (
    -- Role audit records also retain accessed_user_id for the person whose role changed.
    (target_type = 'user_role' AND user_role_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'user' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'course' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NOT NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'course_module' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NOT NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'lesson' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NOT NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'lesson_resource' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NOT NULL)
  ),
  ADD CONSTRAINT admin_audit_log_action_check CHECK (
    action IN (
      'user_role.granted', 'user_role.revoked', 'user.looked_up',
      'course.created', 'course.updated', 'course.status_changed',
      'course.translation_saved', 'course.translation_published', 'course.translation_unpublished',
      'course.instructors_set',
      'course_module.created', 'course_module.updated', 'course_module.reordered',
      'course_module.translation_saved', 'course_module.translation_published', 'course_module.translation_unpublished',
      'lesson.created', 'lesson.updated', 'lesson.reordered', 'lesson.translation_saved',
      'lesson.translation_published', 'lesson.translation_unpublished',
      'lesson_resource.created', 'lesson_resource.translation_saved',
      'lesson_resource.translation_published', 'lesson_resource.translation_unpublished'
    )
  );
