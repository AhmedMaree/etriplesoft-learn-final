-- Corrective forward migration: GREATEST/LEAST are SQL syntax, not pg_catalog functions, so the
-- schema-qualified calls in 20261008120000 failed at runtime. Signatures and grants are unchanged.

CREATE OR REPLACE FUNCTION public.admin_list_role_grants(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_audit(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
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
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;
