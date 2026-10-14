-- Approved 2026-10-14: audited administrator-granted access for paid/free courses.
-- This is not a payment confirmation and does not change catalog prices.
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_source_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_source_check CHECK(grant_source IN ('free','admin'));
DO $$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_definition FROM pg_constraint
    WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
  ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
  EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK (action = ''enrollment.granted'' OR '
    || substring(v_definition FROM 8 FOR char_length(v_definition)-8) || ')';
END;
$$;
CREATE FUNCTION public.admin_grant_course_access(p_email text,p_slug text,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid:=public.assert_active_admin(); v_user uuid; v_course uuid; v_enrollment uuid;
BEGIN
  IF p_reason IS NULL OR p_reason NOT IN ('development_test','complimentary','support') OR p_email IS NULL OR char_length(p_email)>320
    THEN RAISE EXCEPTION 'invalid access grant' USING ERRCODE='22023'; END IF;
  SELECT c.id INTO v_course FROM public.courses c WHERE c.slug=p_slug AND c.status='published' FOR UPDATE;
  IF v_course IS NULL THEN RAISE EXCEPTION 'published course not found' USING ERRCODE='P0002'; END IF;
  SELECT u.id INTO v_user FROM auth.users u JOIN public.profiles p ON p.id=u.id WHERE lower(u.email)=lower(btrim(p_email));
  IF v_user IS NULL THEN RAISE EXCEPTION 'learner not found' USING ERRCODE='P0002'; END IF;
  SELECT e.id INTO v_enrollment FROM public.enrollments e WHERE e.course_id=v_course AND e.user_id=v_user AND e.status='active' FOR UPDATE;
  IF v_enrollment IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.enrollments e WHERE e.id=v_enrollment AND e.expires_at IS NOT NULL AND e.expires_at<=now()) THEN
      UPDATE public.enrollments SET status='expired' WHERE id=v_enrollment;
    ELSE RETURN v_enrollment; END IF;
  END IF;
  INSERT INTO public.enrollments(user_id,course_id,grant_source,granted_by)
    VALUES(v_user,v_course,'admin',v_actor) RETURNING id INTO v_enrollment;
  INSERT INTO public.admin_audit_log(actor_id,action,target_type,course_id,accessed_user_id,enrollment_id,safe_summary)
    VALUES(v_actor,'enrollment.granted','enrollment',v_course,v_user,v_enrollment,'Granted administrator access ('||p_reason||')');
  RETURN v_enrollment;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_grant_course_access(text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_grant_course_access(text,text,text) TO authenticated;
