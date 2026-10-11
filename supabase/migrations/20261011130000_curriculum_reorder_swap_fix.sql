-- Avoid deferred-constraint name lookup in functions with an empty search_path.
-- Moving all siblings above the current range first keeps each intermediate write unique.
CREATE OR REPLACE FUNCTION public.admin_reorder_course_modules(p_course_id uuid, p_module_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_count bigint;
  v_offset bigint;
BEGIN
  PERFORM 1 FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('course_modules:' || p_course_id::text));
  SELECT pg_catalog.count(*), COALESCE(pg_catalog.max(position), 0)
  INTO v_count, v_offset FROM public.course_modules WHERE course_id = p_course_id;
  IF p_module_ids IS NULL OR pg_catalog.cardinality(p_module_ids) <> v_count
     OR (SELECT pg_catalog.count(DISTINCT x) FROM pg_catalog.unnest(p_module_ids) AS x) <> v_count
     OR EXISTS (
       SELECT id FROM public.course_modules WHERE course_id = p_course_id
       EXCEPT SELECT pg_catalog.unnest(p_module_ids)
     ) THEN
    RAISE EXCEPTION 'module ordering must contain every module exactly once' USING ERRCODE = '22023';
  END IF;

  UPDATE public.course_modules SET position = position + v_offset + v_count
  WHERE course_id = p_course_id;
  UPDATE public.course_modules m
  SET position = ordered.ordinality::integer
  FROM pg_catalog.unnest(p_module_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE m.id = ordered.id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, module_id, safe_summary)
  SELECT v_actor, 'course_module.reordered', 'course_module', m.id, 'Reordered course curriculum modules'
  FROM public.course_modules m WHERE m.course_id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reorder_module_lessons(p_module_id uuid, p_lesson_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_count bigint;
  v_offset bigint;
BEGIN
  PERFORM 1 FROM public.course_modules WHERE id = p_module_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'module not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('module_lessons:' || p_module_id::text));
  SELECT pg_catalog.count(*), COALESCE(pg_catalog.max(position), 0)
  INTO v_count, v_offset FROM public.lessons WHERE module_id = p_module_id;
  IF p_lesson_ids IS NULL OR pg_catalog.cardinality(p_lesson_ids) <> v_count
     OR (SELECT pg_catalog.count(DISTINCT x) FROM pg_catalog.unnest(p_lesson_ids) AS x) <> v_count
     OR EXISTS (
       SELECT id FROM public.lessons WHERE module_id = p_module_id
       EXCEPT SELECT pg_catalog.unnest(p_lesson_ids)
     ) THEN
    RAISE EXCEPTION 'lesson ordering must contain every lesson exactly once' USING ERRCODE = '22023';
  END IF;

  UPDATE public.lessons SET position = position + v_offset + v_count
  WHERE module_id = p_module_id;
  UPDATE public.lessons l
  SET position = ordered.ordinality::integer
  FROM pg_catalog.unnest(p_lesson_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE l.id = ordered.id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
  SELECT v_actor, 'lesson.reordered', 'lesson', l.id, 'Reordered module lessons'
  FROM public.lessons l WHERE l.module_id = p_module_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_lesson(
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

REVOKE ALL ON FUNCTION public.admin_update_lesson(uuid, boolean, boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_lesson(uuid, boolean, boolean, integer) TO authenticated;
