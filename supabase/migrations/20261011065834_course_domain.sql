-- Phase 07: course identity, slug, lifecycle, per-locale publication and ordered instructor attribution.
--
-- Decisions: D01 launch currency is EGP only (widen courses_currency_check in a forward migration
-- if that changes); D12 ratings/review counts are not stored (reviews and ratings are out of V1).
--
-- Authority: every write goes through an admin_* function that checks the CURRENT admin role
-- (Phase 06 assert_active_admin) and writes an append-only audit row in the same transaction.
-- Clients have no INSERT/UPDATE/DELETE on these tables. Anonymous and signed-in readers see only
-- published rows, only the columns granted below, and only the exact locale they ask for: there is
-- no fallback between English and Arabic.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------

CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  level text,
  category text,
  price_minor bigint NOT NULL DEFAULT 0,
  currency char(3) NOT NULL DEFAULT 'EGP',
  thumbnail_object_key text,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT courses_slug_key UNIQUE (slug),
  CONSTRAINT courses_slug_check CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND pg_catalog.char_length(slug) BETWEEN 3 AND 80
  ),
  CONSTRAINT courses_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT courses_level_check CHECK (level IS NULL OR level IN ('beginner', 'intermediate', 'advanced')),
  CONSTRAINT courses_category_check CHECK (
    category IS NULL OR (category ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND pg_catalog.char_length(category) <= 40)
  ),
  CONSTRAINT courses_price_check CHECK (price_minor >= 0),
  CONSTRAINT courses_currency_check CHECK (currency = 'EGP'),
  CONSTRAINT courses_thumbnail_check CHECK (
    thumbnail_object_key IS NULL OR pg_catalog.char_length(thumbnail_object_key) BETWEEN 1 AND 255
  ),
  CONSTRAINT courses_published_at_check CHECK (status <> 'published' OR published_at IS NOT NULL)
);

CREATE TABLE public.course_translations (
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE RESTRICT,
  locale text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  description text,
  publication_status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (course_id, locale),
  CONSTRAINT course_translations_locale_check CHECK (locale IN ('en', 'ar')),
  CONSTRAINT course_translations_title_check CHECK (
    title = pg_catalog.btrim(title) AND pg_catalog.char_length(title) BETWEEN 1 AND 160
  ),
  CONSTRAINT course_translations_summary_check CHECK (
    summary = pg_catalog.btrim(summary) AND pg_catalog.char_length(summary) BETWEEN 1 AND 400
  ),
  CONSTRAINT course_translations_description_check CHECK (
    description IS NULL OR (description = pg_catalog.btrim(description) AND pg_catalog.char_length(description) BETWEEN 1 AND 8000)
  ),
  CONSTRAINT course_translations_publication_check CHECK (publication_status IN ('draft', 'published')),
  CONSTRAINT course_translations_published_at_check CHECK (publication_status <> 'published' OR published_at IS NOT NULL)
);

-- Ordered attribution only: a linked profile never gains permissions from being listed here.
CREATE TABLE public.course_instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE RESTRICT,
  position integer NOT NULL,
  profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  display_name text NOT NULL,
  assigned_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT course_instructors_position_key UNIQUE (course_id, position),
  CONSTRAINT course_instructors_position_check CHECK (position BETWEEN 1 AND 10),
  CONSTRAINT course_instructors_display_name_check CHECK (
    display_name = pg_catalog.btrim(display_name) AND pg_catalog.char_length(display_name) BETWEEN 1 AND 120
  )
);

CREATE UNIQUE INDEX course_instructors_course_profile_key
  ON public.course_instructors (course_id, profile_id)
  WHERE profile_id IS NOT NULL;

-- Access paths: catalog list (published, newest first), exact-locale joins, creator/updater lookups.
CREATE INDEX courses_published_catalog_idx
  ON public.courses (published_at DESC, id)
  WHERE status = 'published';
CREATE INDEX courses_status_category_level_idx
  ON public.courses (status, category, level);
CREATE INDEX course_translations_published_locale_idx
  ON public.course_translations (locale, course_id)
  WHERE publication_status = 'published';
CREATE INDEX courses_created_by_idx ON public.courses (created_by);
CREATE INDEX courses_updated_by_idx ON public.courses (updated_by);
CREATE INDEX course_instructors_profile_idx ON public.course_instructors (profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX course_instructors_assigned_by_idx ON public.course_instructors (assigned_by);

CREATE TRIGGER courses_set_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER course_translations_set_updated_at
  BEFORE UPDATE ON public.course_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Lifecycle guards that hold even for direct writes by a privileged role.
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION public.enforce_course_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Public URLs must stay stable once a course has ever been published.
  IF OLD.published_at IS NOT NULL AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'the slug of a published course cannot change' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF OLD.status = 'archived' THEN
      RAISE EXCEPTION 'an archived course must be restored to draft before publishing' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.course_translations t
      WHERE t.course_id = NEW.id AND t.publication_status = 'published'
    ) THEN
      RAISE EXCEPTION 'a published course needs at least one published translation' USING ERRCODE = '23514';
    END IF;
    NEW.published_at := COALESCE(OLD.published_at, pg_catalog.now());
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_course_lifecycle() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER courses_enforce_lifecycle
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_lifecycle();

-- ---------------------------------------------------------------------------------------------
-- Typed audit targets: add 'course' (Phase 06 left this extension point).
-- ---------------------------------------------------------------------------------------------

ALTER TABLE public.admin_audit_log
  ADD COLUMN course_id uuid REFERENCES public.courses (id) ON DELETE RESTRICT;

CREATE INDEX admin_audit_log_course_occurred_at_idx
  ON public.admin_audit_log (course_id, occurred_at DESC)
  WHERE course_id IS NOT NULL;

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT admin_audit_log_target_type_check,
  DROP CONSTRAINT admin_audit_log_target_shape_check,
  DROP CONSTRAINT admin_audit_log_action_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check CHECK (target_type IN ('user_role', 'user', 'course')),
  ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (
    (target_type = 'user_role' AND user_role_id IS NOT NULL AND course_id IS NULL)
    OR (target_type = 'user' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NULL)
    OR (target_type = 'course' AND course_id IS NOT NULL AND user_role_id IS NULL AND accessed_user_id IS NULL)
  ),
  ADD CONSTRAINT admin_audit_log_action_check CHECK (
    action IN (
      'user_role.granted', 'user_role.revoked', 'user.looked_up',
      'course.created', 'course.updated', 'course.status_changed',
      'course.translation_saved', 'course.translation_published', 'course.translation_unpublished',
      'course.instructors_set'
    )
  );

CREATE FUNCTION public.write_course_audit(p_actor uuid, p_action text, p_course_id uuid, p_summary text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, course_id, safe_summary)
  VALUES (p_actor, p_action, 'course', p_course_id, p_summary);
$$;

REVOKE ALL ON FUNCTION public.write_course_audit(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- RLS and grants: published, exact-locale, catalog-safe columns only; no client writes.
-- ---------------------------------------------------------------------------------------------

-- Policy helper that bypasses RLS on courses so the translation policies cannot recurse into it.
CREATE FUNCTION public.course_is_published(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.status = 'published');
$$;

REVOKE ALL ON FUNCTION public.course_is_published(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.course_is_published(uuid) TO anon, authenticated;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_select_published
  ON public.courses
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.course_translations t
      WHERE t.course_id = courses.id AND t.publication_status = 'published'
    )
  );

CREATE POLICY course_translations_select_published
  ON public.course_translations
  FOR SELECT
  TO anon, authenticated
  USING (publication_status = 'published' AND public.course_is_published(course_id));

CREATE POLICY course_instructors_select_published
  ON public.course_instructors
  FOR SELECT
  TO anon, authenticated
  USING (public.course_is_published(course_id));

REVOKE ALL ON TABLE public.courses, public.course_translations, public.course_instructors
  FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO anon;

-- Column-level grants keep created_by/updated_by, profile ids and draft state out of public reads.
GRANT SELECT (id, slug, status, level, category, price_minor, currency, thumbnail_object_key, published_at)
  ON public.courses TO anon, authenticated;
GRANT SELECT (course_id, locale, title, summary, description, publication_status, published_at)
  ON public.course_translations TO anon, authenticated; -- publication_status is always 'published' for rows RLS lets through
GRANT SELECT (course_id, position, display_name)
  ON public.course_instructors TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Public catalog projections (SECURITY INVOKER, so the policies above always apply).
-- The locale is required and exact: a course with no published translation in that locale is absent.
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION public.catalog_list_courses(
  p_locale text,
  p_category text DEFAULT NULL,
  p_level text DEFAULT NULL,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  summary text,
  category text,
  level text,
  price_minor bigint,
  currency text,
  thumbnail_object_key text,
  published_at timestamptz,
  instructors text[],
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.slug,
    t.title,
    t.summary,
    c.category,
    c.level,
    c.price_minor,
    c.currency::text,
    c.thumbnail_object_key,
    c.published_at,
    COALESCE(
      (SELECT pg_catalog.array_agg(i.display_name ORDER BY i.position)
       FROM public.course_instructors i WHERE i.course_id = c.id),
      '{}'::text[]
    ),
    pg_catalog.count(*) OVER ()
  FROM public.courses c
  JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
  WHERE c.status = 'published'
    AND t.publication_status = 'published'
    AND (p_category IS NULL OR c.category = p_category)
    AND (p_level IS NULL OR c.level = p_level)
  ORDER BY c.published_at DESC, c.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 24), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE FUNCTION public.catalog_get_course(p_slug text, p_locale text)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  summary text,
  description text,
  category text,
  level text,
  price_minor bigint,
  currency text,
  thumbnail_object_key text,
  published_at timestamptz,
  instructors text[]
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.slug,
    t.title,
    t.summary,
    t.description,
    c.category,
    c.level,
    c.price_minor,
    c.currency::text,
    c.thumbnail_object_key,
    c.published_at,
    COALESCE(
      (SELECT pg_catalog.array_agg(i.display_name ORDER BY i.position)
       FROM public.course_instructors i WHERE i.course_id = c.id),
      '{}'::text[]
    )
  FROM public.courses c
  JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
  WHERE c.slug = p_slug
    AND c.status = 'published'
    AND t.publication_status = 'published';
END;
$$;

REVOKE ALL ON FUNCTION
  public.catalog_list_courses(text, text, text, integer, integer),
  public.catalog_get_course(text, text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.catalog_list_courses(text, text, text, integer, integer),
  public.catalog_get_course(text, text)
TO anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Admin operations. Each checks the current admin role, validates, writes and audits atomically.
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION public.admin_create_course(
  p_slug text,
  p_category text DEFAULT NULL,
  p_level text DEFAULT NULL,
  p_price_minor bigint DEFAULT 0,
  p_thumbnail_object_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_id uuid;
  v_slug text := pg_catalog.btrim(COALESCE(p_slug, ''));
BEGIN
  INSERT INTO public.courses (slug, category, level, price_minor, thumbnail_object_key, created_by, updated_by)
  VALUES (v_slug, NULLIF(pg_catalog.btrim(p_category), ''), NULLIF(pg_catalog.btrim(p_level), ''), COALESCE(p_price_minor, 0), NULLIF(pg_catalog.btrim(p_thumbnail_object_key), ''), v_actor, v_actor)
  RETURNING id INTO v_id;

  PERFORM public.write_course_audit(v_actor, 'course.created', v_id, 'Created draft course ' || v_slug);
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.admin_update_course(
  p_course_id uuid,
  p_slug text,
  p_category text,
  p_level text,
  p_price_minor bigint,
  p_thumbnail_object_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_course public.courses;
BEGIN
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_course.status = 'archived' THEN
    RAISE EXCEPTION 'an archived course cannot be edited' USING ERRCODE = '23514';
  END IF;

  UPDATE public.courses
  SET slug = pg_catalog.btrim(COALESCE(p_slug, '')),
      category = NULLIF(pg_catalog.btrim(p_category), ''),
      level = NULLIF(pg_catalog.btrim(p_level), ''),
      price_minor = COALESCE(p_price_minor, 0),
      thumbnail_object_key = NULLIF(pg_catalog.btrim(p_thumbnail_object_key), ''),
      updated_by = v_actor
  WHERE id = p_course_id;

  PERFORM public.write_course_audit(v_actor, 'course.updated', p_course_id, 'Updated course ' || v_course.slug);
END;
$$;

CREATE FUNCTION public.admin_set_course_status(p_course_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_course public.courses;
BEGIN
  IF p_status IS NULL OR p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'unsupported status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_course.status = p_status THEN
    RETURN;
  END IF;

  -- The lifecycle trigger enforces: no archived -> published, and published needs a published translation.
  UPDATE public.courses SET status = p_status, updated_by = v_actor WHERE id = p_course_id;

  PERFORM public.write_course_audit(
    v_actor, 'course.status_changed', p_course_id,
    'Course ' || v_course.slug || ' status ' || v_course.status || ' to ' || p_status
  );
END;
$$;

CREATE FUNCTION public.admin_upsert_course_translation(
  p_course_id uuid,
  p_locale text,
  p_title text,
  p_summary text,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_course public.courses;
BEGIN
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_course.status = 'archived' THEN
    RAISE EXCEPTION 'an archived course cannot be edited' USING ERRCODE = '23514';
  END IF;

  -- Saving never changes publication state: a live translation stays live, a draft stays draft.
  INSERT INTO public.course_translations (course_id, locale, title, summary, description)
  VALUES (p_course_id, p_locale, pg_catalog.btrim(p_title), pg_catalog.btrim(p_summary), NULLIF(pg_catalog.btrim(p_description), ''))
  ON CONFLICT (course_id, locale) DO UPDATE
  SET title = EXCLUDED.title, summary = EXCLUDED.summary, description = EXCLUDED.description;

  UPDATE public.courses SET updated_by = v_actor WHERE id = p_course_id;
  PERFORM public.write_course_audit(v_actor, 'course.translation_saved', p_course_id, 'Saved ' || p_locale || ' translation for ' || v_course.slug);
END;
$$;

CREATE FUNCTION public.admin_set_translation_publication(p_course_id uuid, p_locale text, p_published boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_course public.courses;
  v_translation public.course_translations;
BEGIN
  IF p_published IS NULL THEN
    RAISE EXCEPTION 'publication flag required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_translation FROM public.course_translations
  WHERE course_id = p_course_id AND locale = p_locale FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'translation not found' USING ERRCODE = 'P0002';
  END IF;

  IF (v_translation.publication_status = 'published') = p_published THEN
    RETURN; -- already in the requested state
  END IF;

  IF p_published THEN
    IF v_course.status = 'archived' THEN
      RAISE EXCEPTION 'an archived course cannot be edited' USING ERRCODE = '23514';
    END IF;
    UPDATE public.course_translations
    SET publication_status = 'published', published_at = pg_catalog.now()
    WHERE course_id = p_course_id AND locale = p_locale;
  ELSE
    IF v_course.status = 'published' AND NOT EXISTS (
      SELECT 1 FROM public.course_translations
      WHERE course_id = p_course_id AND locale <> p_locale AND publication_status = 'published'
    ) THEN
      RAISE EXCEPTION 'a published course needs at least one published translation; unpublish or archive the course first'
        USING ERRCODE = '23514';
    END IF;
    UPDATE public.course_translations
    SET publication_status = 'draft', published_at = NULL
    WHERE course_id = p_course_id AND locale = p_locale;
  END IF;

  UPDATE public.courses SET updated_by = v_actor WHERE id = p_course_id;
  PERFORM public.write_course_audit(
    v_actor,
    CASE WHEN p_published THEN 'course.translation_published' ELSE 'course.translation_unpublished' END,
    p_course_id,
    CASE WHEN p_published THEN 'Published ' ELSE 'Unpublished ' END || p_locale || ' translation for ' || v_course.slug
  );
END;
$$;

CREATE FUNCTION public.admin_set_course_instructors(p_course_id uuid, p_instructors jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_course public.courses;
  v_item jsonb;
  v_position integer := 0;
BEGIN
  IF p_instructors IS NULL OR pg_catalog.jsonb_typeof(p_instructors) <> 'array'
     OR pg_catalog.jsonb_array_length(p_instructors) > 10 THEN
    RAISE EXCEPTION 'instructors must be an array of at most 10 entries' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_course.status = 'archived' THEN
    RAISE EXCEPTION 'an archived course cannot be edited' USING ERRCODE = '23514';
  END IF;

  -- Replace the whole ordered list in one transaction; array order becomes the position.
  DELETE FROM public.course_instructors WHERE course_id = p_course_id;

  FOR v_item IN SELECT * FROM pg_catalog.jsonb_array_elements(p_instructors) LOOP
    IF pg_catalog.jsonb_typeof(v_item) <> 'object' OR COALESCE(pg_catalog.jsonb_typeof(v_item -> 'display_name'), '') <> 'string' THEN
      RAISE EXCEPTION 'each instructor needs a display_name' USING ERRCODE = '22023';
    END IF;
    v_position := v_position + 1;
    INSERT INTO public.course_instructors (course_id, position, profile_id, display_name, assigned_by)
    VALUES (
      p_course_id,
      v_position,
      CASE WHEN pg_catalog.jsonb_typeof(v_item -> 'profile_id') = 'string' THEN (v_item ->> 'profile_id')::uuid END,
      pg_catalog.btrim(v_item ->> 'display_name'),
      v_actor
    );
  END LOOP;

  UPDATE public.courses SET updated_by = v_actor WHERE id = p_course_id;
  PERFORM public.write_course_audit(v_actor, 'course.instructors_set', p_course_id, 'Set ' || v_position || ' instructor(s) for ' || v_course.slug);
END;
$$;

CREATE FUNCTION public.admin_list_courses(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  status text,
  category text,
  level text,
  price_minor bigint,
  currency text,
  published_at timestamptz,
  updated_at timestamptz,
  locales_present text[],
  locales_published text[],
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin();

  IF p_status IS NOT NULL AND p_status NOT IN ('draft', 'published', 'archived') THEN
    RAISE EXCEPTION 'unsupported status' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.slug,
    c.status,
    c.category,
    c.level,
    c.price_minor,
    c.currency::text,
    c.published_at,
    c.updated_at,
    COALESCE((SELECT pg_catalog.array_agg(t.locale ORDER BY t.locale) FROM public.course_translations t WHERE t.course_id = c.id), '{}'::text[]),
    COALESCE((SELECT pg_catalog.array_agg(t.locale ORDER BY t.locale) FROM public.course_translations t WHERE t.course_id = c.id AND t.publication_status = 'published'), '{}'::text[]),
    pg_catalog.count(*) OVER ()
  FROM public.courses c
  WHERE p_status IS NULL OR c.status = p_status
  ORDER BY c.updated_at DESC, c.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE FUNCTION public.admin_get_course(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_active_admin();

  SELECT pg_catalog.jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'status', c.status,
    'category', c.category,
    'level', c.level,
    'price_minor', c.price_minor,
    'currency', c.currency,
    'thumbnail_object_key', c.thumbnail_object_key,
    'published_at', c.published_at,
    'updated_at', c.updated_at,
    'translations', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'locale', t.locale, 'title', t.title, 'summary', t.summary, 'description', t.description,
        'publication_status', t.publication_status, 'published_at', t.published_at
      ) ORDER BY t.locale)
      FROM public.course_translations t WHERE t.course_id = c.id
    ), '[]'::jsonb),
    'instructors', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'position', i.position, 'display_name', i.display_name, 'profile_id', i.profile_id
      ) ORDER BY i.position)
      FROM public.course_instructors i WHERE i.course_id = c.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.courses c
  WHERE c.id = p_course_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION
  public.admin_create_course(text, text, text, bigint, text),
  public.admin_update_course(uuid, text, text, text, bigint, text),
  public.admin_set_course_status(uuid, text),
  public.admin_upsert_course_translation(uuid, text, text, text, text),
  public.admin_set_translation_publication(uuid, text, boolean),
  public.admin_set_course_instructors(uuid, jsonb),
  public.admin_list_courses(text, integer, integer),
  public.admin_get_course(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.admin_create_course(text, text, text, bigint, text),
  public.admin_update_course(uuid, text, text, text, bigint, text),
  public.admin_set_course_status(uuid, text),
  public.admin_upsert_course_translation(uuid, text, text, text, text),
  public.admin_set_translation_publication(uuid, text, boolean),
  public.admin_set_course_instructors(uuid, jsonb),
  public.admin_list_courses(text, integer, integer),
  public.admin_get_course(uuid)
TO authenticated;

COMMENT ON TABLE public.courses IS
  'Language-independent course identity, slug, lifecycle, price (integer minor units, EGP only) and category/level keys. No ratings or review counts are stored. Archived, never deleted.';
COMMENT ON TABLE public.course_translations IS
  'Per-locale course text with independent publication. Reads require the exact locale; there is no fallback between en and ar.';
COMMENT ON TABLE public.course_instructors IS
  'Ordered attribution (display-name snapshot, optional profile link). Grants no permissions.';
COMMENT ON FUNCTION public.catalog_list_courses(text, text, text, integer, integer) IS
  'Public catalog projection: published courses with a published translation in the exact locale, bounded to 50 rows.';
COMMENT ON FUNCTION public.admin_set_translation_publication(uuid, text, boolean) IS
  'Admin-only, audited. Refuses to unpublish the last published translation of a published course.';
