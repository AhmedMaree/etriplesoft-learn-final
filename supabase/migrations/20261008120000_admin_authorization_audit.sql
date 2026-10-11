-- Phase 06: server-authoritative admin operations and typed, append-only audit targets.
--
-- Authority is checked inside every function against the CURRENT user_roles row, never against
-- JWT claims or metadata, so a revoked admin loses access on the next call. The application holds
-- no service-role key: signed-in admins call these functions with their own session.

-- ---------------------------------------------------------------------------------------------
-- Typed audit targets (extend target_type / action here as owning domains arrive).
-- ---------------------------------------------------------------------------------------------

ALTER TABLE public.admin_audit_log
  ALTER COLUMN user_role_id DROP NOT NULL;

ALTER TABLE public.admin_audit_log
  ADD COLUMN target_type text NOT NULL DEFAULT 'user_role';

ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check CHECK (target_type IN ('user_role', 'user')),
  ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (
    (target_type = 'user_role' AND user_role_id IS NOT NULL)
    OR (target_type = 'user' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL)
  );

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT admin_audit_log_action_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_action_check CHECK (
    action IN ('user_role.granted', 'user_role.revoked', 'user.looked_up')
  );

-- Append-only, even for the table owner: no update, delete or truncate.
CREATE FUNCTION public.reject_admin_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'admin audit records are append-only' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL ON FUNCTION public.reject_admin_audit_mutation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER admin_audit_log_reject_row_mutation
  BEFORE UPDATE OR DELETE ON public.admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_admin_audit_mutation();

CREATE TRIGGER admin_audit_log_reject_truncate
  BEFORE TRUNCATE ON public.admin_audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.reject_admin_audit_mutation();

-- ---------------------------------------------------------------------------------------------
-- Authority check (internal; not callable through the Data API).
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION public.assert_active_admin()
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
  RETURN v_actor;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_active_admin() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Grant / revoke. The existing user_roles triggers write the audit rows in the same transaction.
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION public.admin_grant_role(p_user_id uuid, p_role text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_id uuid;
BEGIN
  IF p_role IS NULL OR p_role NOT IN ('admin', 'instructor') THEN
    RAISE EXCEPTION 'unsupported role' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin_role_change'));

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = 'P0002';
  END IF;

  -- A concurrent or repeated grant hits user_roles_one_active_grant_idx (23505).
  INSERT INTO public.user_roles (user_id, role, granted_by)
  VALUES (p_user_id, p_role, v_actor)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE FUNCTION public.admin_revoke_role(p_role_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_role text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('admin_role_change'));

  SELECT role INTO v_role
  FROM public.user_roles
  WHERE id = p_role_id AND revoked_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active role grant not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'admin' AND (
    SELECT pg_catalog.count(*) FROM public.user_roles WHERE role = 'admin' AND revoked_at IS NULL
  ) <= 1 THEN
    RAISE EXCEPTION 'the last active administrator cannot be revoked' USING ERRCODE = '23514';
  END IF;

  UPDATE public.user_roles
  SET revoked_by = v_actor, revoked_at = pg_catalog.now()
  WHERE id = p_role_id;
END;
$$;

-- ---------------------------------------------------------------------------------------------
-- Lookup (audited) and bounded, paginated reads.
-- ---------------------------------------------------------------------------------------------

CREATE FUNCTION public.admin_find_user_by_email(p_email text)
RETURNS TABLE (user_id uuid, email text, display_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := public.assert_active_admin();
  v_email text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_found uuid;
BEGIN
  IF pg_catalog.char_length(v_email) NOT BETWEEN 3 AND 320 THEN
    RETURN;
  END IF;

  SELECT u.id INTO v_found
  FROM auth.users u
  WHERE pg_catalog.lower(u.email) = v_email;

  IF v_found IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_found) THEN
    RETURN;
  END IF;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, accessed_user_id, safe_summary)
  VALUES (v_actor, 'user.looked_up', 'user', v_found, 'User looked up by email for role management');

  RETURN QUERY
  SELECT p.id, v_email, p.display_name
  FROM public.profiles p
  WHERE p.id = v_found;
END;
$$;

CREATE FUNCTION public.admin_list_role_grants(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  granted_at timestamptz,
  granted_by_name text,
  revoked_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin();

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    u.email::text,
    p.display_name,
    r.role,
    r.granted_at,
    gp.display_name,
    r.revoked_at,
    pg_catalog.count(*) OVER ()
  FROM public.user_roles r
  JOIN public.profiles p ON p.id = r.user_id
  JOIN public.profiles gp ON gp.id = r.granted_by
  LEFT JOIN auth.users u ON u.id = r.user_id
  ORDER BY (r.revoked_at IS NULL) DESC, r.granted_at DESC, r.id
  LIMIT pg_catalog.least(pg_catalog.greatest(COALESCE(p_limit, 50), 1), 100)
  OFFSET pg_catalog.greatest(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE FUNCTION public.admin_list_audit(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  occurred_at timestamptz,
  action text,
  target_type text,
  actor_name text,
  actor_email text,
  subject_name text,
  subject_email text,
  safe_summary text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_active_admin();

  RETURN QUERY
  SELECT
    a.id,
    a.occurred_at,
    a.action,
    a.target_type,
    ap.display_name,
    au.email::text,
    sp.display_name,
    su.email::text,
    a.safe_summary,
    pg_catalog.count(*) OVER ()
  FROM public.admin_audit_log a
  JOIN public.profiles ap ON ap.id = a.actor_id
  LEFT JOIN auth.users au ON au.id = a.actor_id
  LEFT JOIN public.profiles sp ON sp.id = a.accessed_user_id
  LEFT JOIN auth.users su ON su.id = a.accessed_user_id
  ORDER BY a.occurred_at DESC, a.id
  LIMIT pg_catalog.least(pg_catalog.greatest(COALESCE(p_limit, 50), 1), 100)
  OFFSET pg_catalog.greatest(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION
  public.admin_grant_role(uuid, text),
  public.admin_revoke_role(uuid),
  public.admin_find_user_by_email(text),
  public.admin_list_role_grants(integer, integer),
  public.admin_list_audit(integer, integer)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.admin_grant_role(uuid, text),
  public.admin_revoke_role(uuid),
  public.admin_find_user_by_email(text),
  public.admin_list_role_grants(integer, integer),
  public.admin_list_audit(integer, integer)
TO authenticated;

COMMENT ON FUNCTION public.assert_active_admin() IS
  'Internal authority check: requires an unrevoked admin user_roles row for auth.uid() at call time.';
COMMENT ON FUNCTION public.admin_grant_role(uuid, text) IS
  'Admin-only. Grants an elevated role; the user_roles trigger writes the audit row in the same transaction.';
COMMENT ON FUNCTION public.admin_revoke_role(uuid) IS
  'Admin-only. Revokes an active grant; refuses to revoke the last active administrator.';
COMMENT ON FUNCTION public.admin_find_user_by_email(text) IS
  'Admin-only, audited exact-email lookup that returns only id, email and display name.';
COMMENT ON COLUMN public.admin_audit_log.target_type IS
  'Typed audit target. Add new values (and matching shape checks) in the migration that introduces the owning domain.';
