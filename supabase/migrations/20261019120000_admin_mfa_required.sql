-- Administrator authority now also needs an MFA-verified session (aal2). A password-only session of an
-- admin account can no longer call admin RPCs directly. The app shows the TOTP setup or code screen
-- before the admin area. Signatures, SECURITY DEFINER, search_path and grants are unchanged
-- (CREATE OR REPLACE keeps the existing privileges).

CREATE OR REPLACE FUNCTION public.assert_active_admin()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_actor AND role = 'admin' AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'administrator role required' USING ERRCODE = '42501';
  END IF;
  IF (SELECT auth.jwt() ->> 'aal') IS DISTINCT FROM 'aal2' THEN
    RAISE EXCEPTION 'administrator multi-factor authentication required' USING ERRCODE = '42501';
  END IF;
  RETURN v_actor;
END;
$$;

-- Moderation authority on course reviews and Q&A follows the same rule; without aal2 an admin is
-- treated as an ordinary learner there.
CREATE OR REPLACE FUNCTION public.course_feedback_is_admin(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL
  AND (SELECT auth.jwt() ->> 'aal') IS NOT DISTINCT FROM 'aal2'
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND r.role='admin' AND r.revoked_at IS NULL);
$$;
