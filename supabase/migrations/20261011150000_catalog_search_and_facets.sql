-- Phase 09: server-side public catalog search, counts and category facets.
-- These functions only project published, exact-locale catalog fields and remain invoker-secured.

CREATE FUNCTION public.catalog_search_courses(
  p_locale text,
  p_search text DEFAULT NULL,
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
  instructors text[]
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_search text := NULLIF(pg_catalog.btrim(p_search), '');
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;
  IF v_search IS NOT NULL AND pg_catalog.char_length(v_search) > 100 THEN
    RAISE EXCEPTION 'search query is too long' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT c.id, c.slug, t.title, t.summary, c.category, c.level, c.price_minor,
         c.currency::text, c.thumbnail_object_key, c.published_at,
         COALESCE((
           SELECT pg_catalog.array_agg(i.display_name ORDER BY i.position)
           FROM public.course_instructors i WHERE i.course_id = c.id
         ), '{}'::text[])
  FROM public.courses c
  JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
  WHERE c.status = 'published'
    AND t.publication_status = 'published'
    AND (p_category IS NULL OR c.category = p_category)
    AND (p_level IS NULL OR c.level = p_level)
    AND (
      v_search IS NULL
      OR pg_catalog.strpos(pg_catalog.lower(t.title), pg_catalog.lower(v_search)) > 0
      OR pg_catalog.strpos(pg_catalog.lower(t.summary), pg_catalog.lower(v_search)) > 0
      OR pg_catalog.strpos(pg_catalog.lower(COALESCE(c.category, '')), pg_catalog.lower(v_search)) > 0
      OR pg_catalog.strpos(pg_catalog.lower(COALESCE(c.level, '')), pg_catalog.lower(v_search)) > 0
      OR EXISTS (
        SELECT 1 FROM public.course_instructors i
        WHERE i.course_id = c.id
          AND pg_catalog.strpos(pg_catalog.lower(i.display_name), pg_catalog.lower(v_search)) > 0
      )
    )
  ORDER BY c.published_at DESC, c.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 24), 1), 50)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE FUNCTION public.catalog_count_courses(
  p_locale text,
  p_search text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_level text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_search text := NULLIF(pg_catalog.btrim(p_search), '');
  v_count bigint;
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;
  IF v_search IS NOT NULL AND pg_catalog.char_length(v_search) > 100 THEN
    RAISE EXCEPTION 'search query is too long' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.count(*) INTO v_count
  FROM public.courses c
  JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
  WHERE c.status = 'published'
    AND t.publication_status = 'published'
    AND (p_category IS NULL OR c.category = p_category)
    AND (p_level IS NULL OR c.level = p_level)
    AND (
      v_search IS NULL
      OR pg_catalog.strpos(pg_catalog.lower(t.title), pg_catalog.lower(v_search)) > 0
      OR pg_catalog.strpos(pg_catalog.lower(t.summary), pg_catalog.lower(v_search)) > 0
      OR pg_catalog.strpos(pg_catalog.lower(COALESCE(c.category, '')), pg_catalog.lower(v_search)) > 0
      OR pg_catalog.strpos(pg_catalog.lower(COALESCE(c.level, '')), pg_catalog.lower(v_search)) > 0
      OR EXISTS (
        SELECT 1 FROM public.course_instructors i
        WHERE i.course_id = c.id
          AND pg_catalog.strpos(pg_catalog.lower(i.display_name), pg_catalog.lower(v_search)) > 0
      )
    );
  RETURN v_count;
END;
$$;

CREATE FUNCTION public.catalog_list_categories(p_locale text)
RETURNS TABLE (category text)
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
  SELECT DISTINCT c.category
  FROM public.courses c
  JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
  WHERE c.status = 'published'
    AND t.publication_status = 'published'
    AND c.category IS NOT NULL
  ORDER BY c.category
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION
  public.catalog_search_courses(text, text, text, text, integer, integer),
  public.catalog_count_courses(text, text, text, text),
  public.catalog_list_categories(text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  public.catalog_search_courses(text, text, text, text, integer, integer),
  public.catalog_count_courses(text, text, text, text),
  public.catalog_list_categories(text)
TO anon, authenticated;
