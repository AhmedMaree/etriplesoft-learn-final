-- Phase 10 correction: retain a typed FK to the exact enrollment revoked in the audit log.
ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_expiry_after_grant_check
  CHECK (expires_at IS NULL OR expires_at > granted_at);

ALTER TABLE public.admin_audit_log
  ADD COLUMN enrollment_id uuid REFERENCES public.enrollments (id) ON DELETE RESTRICT;

CREATE INDEX admin_audit_log_enrollment_occurred_at_idx
  ON public.admin_audit_log (enrollment_id, occurred_at DESC) WHERE enrollment_id IS NOT NULL;

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT admin_audit_log_target_type_check,
  DROP CONSTRAINT admin_audit_log_target_shape_check;

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check CHECK (target_type IN (
    'user_role', 'user', 'course', 'course_module', 'lesson', 'lesson_resource', 'enrollment'
  )),
  ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (
    (target_type = 'user_role' AND user_role_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL)
    OR (target_type = 'user' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL)
    OR (target_type = 'course' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NOT NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL)
    OR (target_type = 'course_module' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NOT NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL)
    OR (target_type = 'lesson' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NOT NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL)
    OR (target_type = 'lesson_resource' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NOT NULL AND enrollment_id IS NULL)
    OR (target_type = 'enrollment' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NOT NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.admin_revoke_enrollment(p_enrollment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_user_id uuid;
  v_course_id uuid;
BEGIN
  UPDATE public.enrollments
  SET status = 'revoked', revoked_at = pg_catalog.now(), revoked_by = v_actor
  WHERE id = p_enrollment_id AND status IN ('active', 'completed')
  RETURNING user_id, course_id INTO v_user_id, v_course_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active enrollment not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_audit_log
    (actor_id, action, target_type, enrollment_id, course_id, accessed_user_id, safe_summary)
  VALUES
    (v_actor, 'enrollment.revoked', 'enrollment', p_enrollment_id, v_course_id, v_user_id, 'Revoked course enrollment');
END;
$$;

REVOKE ALL ON FUNCTION public.admin_revoke_enrollment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_enrollment(uuid) TO authenticated;
