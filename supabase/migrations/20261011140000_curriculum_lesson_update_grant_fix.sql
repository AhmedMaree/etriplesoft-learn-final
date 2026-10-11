-- Ensure the admin lesson metadata routine exists and is executable by authenticated admins.
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
