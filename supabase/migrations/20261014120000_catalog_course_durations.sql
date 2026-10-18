-- Safe, bounded projection for displaying published course runtime in the learner catalog.
CREATE FUNCTION public.catalog_course_durations(
  p_course_ids uuid[],
  p_locale text
)
RETURNS TABLE (course_id uuid, duration_seconds bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.cardinality(COALESCE(p_course_ids, ARRAY[]::uuid[])) > 50 THEN
    RAISE EXCEPTION 'too many course ids' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT c.id, pg_catalog.sum(l.duration_seconds)::bigint
  FROM public.courses c
  JOIN public.course_translations ct
    ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  JOIN public.course_modules m ON m.course_id = c.id
  JOIN public.module_translations mt
    ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
  JOIN public.lessons l ON l.module_id = m.id AND l.status = 'published'
  JOIN public.lesson_translations lt
    ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
  WHERE c.status = 'published'
    AND c.id = ANY(COALESCE(p_course_ids, ARRAY[]::uuid[]))
  GROUP BY c.id;
END;
$$;

REVOKE ALL ON FUNCTION public.catalog_course_durations(uuid[], text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.catalog_course_durations(uuid[], text)
  TO anon, authenticated;
