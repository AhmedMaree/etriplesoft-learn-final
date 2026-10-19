-- A database switch for the administrator MFA requirement (20261019120000), so a development project
-- can turn it off. It defaults to ON: every environment, production included, keeps requiring aal2
-- unless an operator changes the row with SQL. Clients cannot read or change it (private schema).
-- On a development project only:
--   UPDATE learning_private.admin_security SET mfa_required = false;

CREATE TABLE learning_private.admin_security (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  mfa_required boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO learning_private.admin_security DEFAULT VALUES;
REVOKE ALL ON TABLE learning_private.admin_security FROM PUBLIC, anon, authenticated;

-- True when the current session satisfies the admin MFA rule. A missing row counts as required.
CREATE FUNCTION public.admin_mfa_satisfied() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.jwt() ->> 'aal') IS NOT DISTINCT FROM 'aal2'
  OR NOT coalesce((SELECT s.mfa_required FROM learning_private.admin_security s WHERE s.id), true);
$$;
REVOKE ALL ON FUNCTION public.admin_mfa_satisfied() FROM PUBLIC, anon, authenticated;

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
  IF NOT public.admin_mfa_satisfied() THEN
    RAISE EXCEPTION 'administrator multi-factor authentication required' USING ERRCODE = '42501';
  END IF;
  RETURN v_actor;
END;
$$;

CREATE OR REPLACE FUNCTION public.course_feedback_is_admin(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL
  AND public.admin_mfa_satisfied()
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND r.role='admin' AND r.revoked_at IS NULL);
$$;
