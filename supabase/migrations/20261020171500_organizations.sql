-- Phase C: organizations (B2B companies and universities), seat licenses and invitations.
-- Decisions (recorded as F01 in docs/phases/OPEN-DECISIONS.md, 2026-10-20):
-- * Model: an organization holds seat licenses per course. A license has a seat count and a 12-month term
--   (purchases) or an admin-chosen term (manual grants for invoiced or pilot deals).
-- * Seats are reassignable. Assigning a course to a member creates an 'organization' enrollment that
--   expires with its license; releasing the seat revokes that enrollment (history and certificates stay).
--   A seat is in use while its enrollment is active or completed.
-- * Payment: managers buy seats through the existing Kashier checkout. A seat order is an ordinary order
--   tagged with organization_id whose items carry a seat count; settlement creates licenses instead of
--   personal enrollments, and a confirmed refund ends the licenses and revokes their active seats.
-- * Visibility: managers see everything about their organization's sponsored courses for each member
--   (progress, streaming, quiz results, certificates, activity). Members are told before they accept.
--   Courses a member bought personally are never shown to the organization.
-- * Universities use the same model (kind = 'university'), optionally linked to a known institution.
-- * Joining: email-bound invitations. The code is shown once to the inviter (stored only as a SHA-256
--   hash), expires after 14 days and can only be accepted by a signed-in account with the same verified
--   email. A signed-in learner also sees pending invitations for their email without the code.
-- * Authority: organization reads and writes go through these functions only (no table grants). Viewers
--   are active managers of an active organization or MFA-verified platform admins; admin writes on an
--   organization are recorded in the admin audit log.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 2 AND 160),
 kind text NOT NULL CHECK (kind IN ('company', 'university')),
 institution_id uuid,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
 created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (institution_id, kind) REFERENCES public.institutions(id, kind) ON DELETE RESTRICT
);
CREATE INDEX organizations_institution_idx ON public.organizations(institution_id) WHERE institution_id IS NOT NULL;
CREATE INDEX organizations_creator_idx ON public.organizations(created_by);
CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Membership rows cascade with the account (account deletion) and keep removal history otherwise.
CREATE TABLE public.organization_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('manager', 'member')),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
 invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 joined_at timestamptz NOT NULL DEFAULT now(),
 removed_at timestamptz,
 removed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 CHECK ((status = 'removed') = (removed_at IS NOT NULL))
);
CREATE UNIQUE INDEX organization_members_active_key ON public.organization_members(organization_id, user_id) WHERE status = 'active';
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id, status);
CREATE INDEX organization_members_invited_by_idx ON public.organization_members(invited_by) WHERE invited_by IS NOT NULL;
CREATE INDEX organization_members_removed_by_idx ON public.organization_members(removed_by) WHERE removed_by IS NOT NULL;

CREATE TABLE public.organization_invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 email text NOT NULL CHECK (email = lower(btrim(email)) AND char_length(email) BETWEEN 3 AND 320 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 role text NOT NULL CHECK (role IN ('manager', 'member')),
 token_hash bytea NOT NULL UNIQUE,
 invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
 accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 accepted_at timestamptz,
 revoked_at timestamptz,
 CHECK (expires_at > created_at),
 CHECK (accepted_at IS NULL OR revoked_at IS NULL)
);
CREATE UNIQUE INDEX organization_invitations_pending_key ON public.organization_invitations(organization_id, email)
 WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX organization_invitations_email_idx ON public.organization_invitations(email) WHERE accepted_at IS NULL AND revoked_at IS NULL;
CREATE INDEX organization_invitations_invited_by_idx ON public.organization_invitations(invited_by) WHERE invited_by IS NOT NULL;
CREATE INDEX organization_invitations_accepted_by_idx ON public.organization_invitations(accepted_by) WHERE accepted_by IS NOT NULL;

CREATE TABLE public.organization_licenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
 seats integer NOT NULL CHECK (seats BETWEEN 1 AND 10000),
 starts_at timestamptz NOT NULL DEFAULT now(),
 ends_at timestamptz NOT NULL,
 source text NOT NULL CHECK (source IN ('purchase', 'admin')),
 order_item_id uuid UNIQUE REFERENCES public.order_items(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded', 'revoked')),
 note text CHECK (note IS NULL OR (note = btrim(note) AND char_length(note) BETWEEN 1 AND 200)),
 granted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at > starts_at),
 CHECK ((source = 'purchase') = (order_item_id IS NOT NULL))
);
CREATE INDEX organization_licenses_org_course_idx ON public.organization_licenses(organization_id, course_id, status, ends_at);
CREATE INDEX organization_licenses_course_idx ON public.organization_licenses(course_id);
CREATE INDEX organization_licenses_granted_by_idx ON public.organization_licenses(granted_by);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_licenses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organizations, public.organization_members, public.organization_invitations, public.organization_licenses
 FROM PUBLIC, anon, authenticated, service_role;

-- Organization-sponsored enrollments point at the license whose seat they use.
ALTER TABLE public.enrollments ADD COLUMN organization_license_id uuid REFERENCES public.organization_licenses(id) ON DELETE RESTRICT;
CREATE INDEX enrollments_organization_license_idx ON public.enrollments(organization_license_id, status) WHERE organization_license_id IS NOT NULL;
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_source_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_source_check CHECK (grant_source IN ('free', 'admin', 'paid', 'organization'));
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_organization_source_check
 CHECK ((grant_source = 'organization') = (organization_license_id IS NOT NULL));

-- Seat orders: an order bought for an organization, and a seat count per item (1 for personal orders).
ALTER TABLE public.orders ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX orders_organization_idx ON public.orders(organization_id, status) WHERE organization_id IS NOT NULL;
ALTER TABLE public.order_items ADD COLUMN seats integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 10000);

-- Typed audit target for organization administration (same extension pattern as coupons).
ALTER TABLE public.admin_audit_log ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;
CREATE INDEX admin_audit_organization_idx ON public.admin_audit_log(organization_id) WHERE organization_id IS NOT NULL;
DO $$ DECLARE expr text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR action IN (''organization.created'',''organization.status_changed'',''organization.license_granted'',''organization.members_changed''))';
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_target_type_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_target_type_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_type_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR target_type=''organization'')';
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_target_shape_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_target_shape_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (('||substring(expr FROM 8 FOR length(expr)-8)||') AND organization_id IS NULL OR (target_type=''organization'' AND organization_id IS NOT NULL AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL AND certificate_id IS NULL AND coupon_id IS NULL))';
END $$;

-- ---------------------------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION learning_private.org_caller_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin' AND r.revoked_at IS NULL)
  AND public.admin_mfa_satisfied()
$$;

-- Returns 'manager' or 'admin' for a caller allowed to see (and, when p_write, change) the organization.
-- Managers need an active organization; admins may also act on a suspended one.
CREATE FUNCTION learning_private.org_access(p_org uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := (SELECT auth.uid()); v_status text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 SELECT o.status INTO v_status FROM public.organizations o WHERE o.id = p_org;
 IF v_status IS NULL THEN RAISE EXCEPTION 'organization not found' USING ERRCODE = 'P0002'; END IF;
 IF v_status = 'active' AND EXISTS(SELECT 1 FROM public.organization_members m
   WHERE m.organization_id = p_org AND m.user_id = actor AND m.status = 'active' AND m.role = 'manager') THEN
  RETURN 'manager';
 END IF;
 IF learning_private.org_caller_is_admin() THEN RETURN 'admin'; END IF;
 RAISE EXCEPTION 'organization manager required' USING ERRCODE = '42501';
END $$;

-- Records an admin's write on an organization; managers' own actions are organization activity, not admin audit.
CREATE FUNCTION learning_private.org_audit(p_access text, p_org uuid, p_action text, p_summary text)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF p_access = 'admin' THEN
  INSERT INTO public.admin_audit_log(actor_id, action, target_type, organization_id, safe_summary)
  VALUES ((SELECT auth.uid()), p_action, 'organization', p_org, left(p_summary, 500));
 END IF;
END $$;

CREATE FUNCTION learning_private.org_new_invitation_code()
RETURNS text LANGUAGE sql VOLATILE SET search_path = '' AS $$
 SELECT pg_catalog.rtrim(pg_catalog.translate(pg_catalog.encode(extensions.gen_random_bytes(24), 'base64'), '+/', '-_'), '=')
$$;

-- One row per organization-sponsored enrollment with what a manager may see about it.
CREATE FUNCTION learning_private.org_enrollments(p_org uuid)
RETURNS TABLE(enrollment_id uuid, user_id uuid, course_id uuid, license_id uuid, status text, granted_at timestamptz,
 expires_at timestamptz, completed_at timestamptz, progress integer, streamed_seconds numeric, quiz_percent integer,
 certificate_number text, last_activity timestamptz)
LANGUAGE sql STABLE SET search_path = '' AS $$
 WITH en AS (
  SELECT e.* FROM public.enrollments e JOIN public.organization_licenses l ON l.id = e.organization_license_id
  WHERE l.organization_id = p_org
 ), required AS (
  SELECT m.course_id, l.id AS lesson_id FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  WHERE m.is_required AND l.is_required AND l.status = 'published' AND m.course_id IN (SELECT en.course_id FROM en)
 ), required_count AS (
  SELECT r.course_id, count(*) AS n FROM required r GROUP BY r.course_id
 ), done AS (
  SELECT lp.enrollment_id, count(*) AS n FROM public.lesson_progress lp JOIN required r ON r.lesson_id = lp.lesson_id
  WHERE lp.status = 'completed' AND lp.enrollment_id IN (SELECT en.id FROM en) GROUP BY lp.enrollment_id
 )
 SELECT e.id, e.user_id, e.course_id, e.organization_license_id, e.status, e.granted_at, e.expires_at, e.completed_at,
  CASE WHEN e.status = 'completed' THEN 100 WHEN rc.n > 0 THEN least(100, 100 * coalesce(d.n, 0) / rc.n)::integer END,
  coalesce((SELECT sum(w.seconds) FROM learning_private.video_watch_daily w WHERE w.enrollment_id = e.id), 0),
  -- Average of the best submitted score per quiz.
  (SELECT round(avg(q.best))::integer FROM (
    SELECT max(100.0 * qa.score / qa.possible_score) AS best FROM public.quiz_attempts qa
    WHERE qa.enrollment_id = e.id AND qa.status <> 'active' GROUP BY qa.quiz_id) q),
  (SELECT c.certificate_number FROM public.course_completions cc JOIN public.certificates c ON c.course_completion_id = cc.id
   WHERE cc.enrollment_id = e.id AND c.revoked_at IS NULL ORDER BY c.issued_at DESC LIMIT 1),
  greatest((SELECT max(lp.updated_at) FROM public.lesson_progress lp WHERE lp.enrollment_id = e.id),
   (SELECT max(vp.updated_at) FROM public.video_progress vp WHERE vp.enrollment_id = e.id))
 FROM en e
 LEFT JOIN required_count rc ON rc.course_id = e.course_id
 LEFT JOIN done d ON d.enrollment_id = e.id
$$;

-- Seats in use on a license: its active or completed enrollments.
CREATE FUNCTION learning_private.org_license_used(p_license uuid)
RETURNS bigint LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT count(*) FROM public.enrollments e WHERE e.organization_license_id = p_license AND e.status IN ('active', 'completed')
$$;

REVOKE ALL ON FUNCTION learning_private.org_caller_is_admin(), learning_private.org_access(uuid),
 learning_private.org_audit(text, uuid, text, text), learning_private.org_new_invitation_code(),
 learning_private.org_enrollments(uuid), learning_private.org_license_used(uuid)
 FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Platform admin
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.admin_create_organization(p_name text, p_kind text, p_institution_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := public.assert_active_admin(); v_name text := btrim(coalesce(p_name, '')); v_id uuid;
BEGIN
 IF char_length(v_name) NOT BETWEEN 2 AND 160 OR p_kind IS NULL OR p_kind NOT IN ('company', 'university') THEN
  RAISE EXCEPTION 'invalid organization' USING ERRCODE = '22023';
 END IF;
 IF p_institution_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.institutions i WHERE i.id = p_institution_id AND i.kind = p_kind) THEN
  RAISE EXCEPTION 'institution not found' USING ERRCODE = 'P0002';
 END IF;
 INSERT INTO public.organizations(name, kind, institution_id, created_by) VALUES (v_name, p_kind, p_institution_id, actor) RETURNING id INTO v_id;
 INSERT INTO public.admin_audit_log(actor_id, action, target_type, organization_id, safe_summary)
 VALUES (actor, 'organization.created', 'organization', v_id, 'Created organization ' || v_name);
 RETURN v_id;
END $$;

CREATE FUNCTION public.admin_set_organization_status(p_org uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := public.assert_active_admin(); v_name text;
BEGIN
 IF p_status IS NULL OR p_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023'; END IF;
 UPDATE public.organizations SET status = p_status WHERE id = p_org AND status <> p_status RETURNING name INTO v_name;
 IF v_name IS NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id = p_org) THEN RAISE EXCEPTION 'organization not found' USING ERRCODE = 'P0002'; END IF;
  RETURN;
 END IF;
 INSERT INTO public.admin_audit_log(actor_id, action, target_type, organization_id, safe_summary)
 VALUES (actor, 'organization.status_changed', 'organization', p_org, CASE WHEN p_status = 'active' THEN 'Reactivated ' ELSE 'Suspended ' END || v_name);
END $$;

-- Manual license for invoiced or pilot deals; purchases create licenses at settlement instead.
CREATE FUNCTION public.admin_grant_organization_license(p_org uuid, p_course_id uuid, p_seats integer, p_months integer, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := public.assert_active_admin(); v_note text := nullif(btrim(coalesce(p_note, '')), ''); v_slug text; v_id uuid;
BEGIN
 IF p_seats IS NULL OR p_seats NOT BETWEEN 1 AND 10000 OR p_months IS NULL OR p_months NOT BETWEEN 1 AND 36
    OR char_length(coalesce(v_note, '')) > 200 THEN
  RAISE EXCEPTION 'invalid license' USING ERRCODE = '22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organizations WHERE id = p_org) THEN RAISE EXCEPTION 'organization not found' USING ERRCODE = 'P0002'; END IF;
 SELECT c.slug INTO v_slug FROM public.courses c WHERE c.id = p_course_id AND c.status = 'published';
 IF v_slug IS NULL THEN RAISE EXCEPTION 'published course not found' USING ERRCODE = 'P0002'; END IF;
 INSERT INTO public.organization_licenses(organization_id, course_id, seats, ends_at, source, note, granted_by)
 VALUES (p_org, p_course_id, p_seats, now() + make_interval(months => p_months), 'admin', v_note, actor) RETURNING id INTO v_id;
 INSERT INTO public.admin_audit_log(actor_id, action, target_type, organization_id, safe_summary)
 VALUES (actor, 'organization.license_granted', 'organization', p_org,
  'Granted ' || p_seats || ' seats of ' || v_slug || ' for ' || p_months || ' months');
 RETURN v_id;
END $$;

-- B2B overview: one row per organization with seats, engagement and revenue.
CREATE FUNCTION public.admin_list_organizations()
RETURNS TABLE(id uuid, name text, kind text, status text, institution_name text, managers bigint, members bigint,
 pending_invitations bigint, seats_total bigint, seats_used bigint, next_expiry timestamptz, active_members_30d bigint,
 average_progress integer, completions bigint, revenue_minor bigint, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY
 SELECT o.id, o.name, o.kind, o.status, i.name_en,
  (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id AND m.status = 'active' AND m.role = 'manager'),
  (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id AND m.status = 'active'),
  (SELECT count(*) FROM public.organization_invitations v WHERE v.organization_id = o.id AND v.accepted_at IS NULL AND v.revoked_at IS NULL AND v.expires_at > now()),
  (SELECT coalesce(sum(l.seats), 0) FROM public.organization_licenses l WHERE l.organization_id = o.id AND l.status = 'active' AND now() >= l.starts_at AND now() < l.ends_at)::bigint,
  (SELECT count(*) FROM public.enrollments e JOIN public.organization_licenses l ON l.id = e.organization_license_id
   WHERE l.organization_id = o.id AND l.status = 'active' AND now() >= l.starts_at AND now() < l.ends_at AND e.status IN ('active', 'completed')),
  (SELECT min(l.ends_at) FROM public.organization_licenses l WHERE l.organization_id = o.id AND l.status = 'active' AND l.ends_at > now()),
  (SELECT count(DISTINCT m.user_id) FROM public.organization_members m JOIN public.learning_activity_days a ON a.user_id = m.user_id
   WHERE m.organization_id = o.id AND m.status = 'active' AND a.activity_date > (now() AT TIME ZONE 'Africa/Cairo')::date - 30),
  (SELECT round(avg(x.progress))::integer FROM learning_private.org_enrollments(o.id) x WHERE x.status IN ('active', 'completed')),
  (SELECT count(*) FROM learning_private.org_enrollments(o.id) x WHERE x.status = 'completed' OR x.completed_at IS NOT NULL),
  (SELECT coalesce(sum(od.total_minor), 0) FROM public.orders od WHERE od.organization_id = o.id AND od.status = 'paid')::bigint,
  o.created_at
 FROM public.organizations o LEFT JOIN public.institutions i ON i.id = o.institution_id
 ORDER BY o.status, o.name;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Organization reads (managers of the organization and platform admins)
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.org_get(p_org uuid)
RETURNS TABLE(id uuid, name text, kind text, status text, access text, seats_total bigint, seats_used bigint, members bigint, managers bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_access text := learning_private.org_access(p_org);
BEGIN
 RETURN QUERY
 SELECT o.id, o.name, o.kind, o.status, v_access,
  (SELECT coalesce(sum(l.seats), 0) FROM public.organization_licenses l WHERE l.organization_id = o.id AND l.status = 'active' AND now() >= l.starts_at AND now() < l.ends_at)::bigint,
  (SELECT count(*) FROM public.enrollments e JOIN public.organization_licenses l ON l.id = e.organization_license_id
   WHERE l.organization_id = o.id AND l.status = 'active' AND now() >= l.starts_at AND now() < l.ends_at AND e.status IN ('active', 'completed')),
  (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id AND m.status = 'active'),
  (SELECT count(*) FROM public.organization_members m WHERE m.organization_id = o.id AND m.status = 'active' AND m.role = 'manager')
 FROM public.organizations o WHERE o.id = p_org;
END $$;

CREATE FUNCTION public.org_list_licenses(p_org uuid, p_locale text)
RETURNS TABLE(license_id uuid, course_id uuid, course_slug text, course_title text, seats integer, seats_used bigint,
 starts_at timestamptz, ends_at timestamptz, source text, state text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM learning_private.org_access(p_org);
 IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
 RETURN QUERY
 SELECT l.id, c.id, c.slug, coalesce(t.title, other.title, c.slug), l.seats, learning_private.org_license_used(l.id),
  l.starts_at, l.ends_at, l.source,
  CASE WHEN l.status <> 'active' THEN l.status WHEN now() < l.starts_at THEN 'scheduled' WHEN now() >= l.ends_at THEN 'ended' ELSE 'active' END
 FROM public.organization_licenses l
 JOIN public.courses c ON c.id = l.course_id
 LEFT JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
 LEFT JOIN public.course_translations other ON other.course_id = c.id AND other.locale <> p_locale
 WHERE l.organization_id = p_org
 ORDER BY (l.status = 'active' AND now() < l.ends_at) DESC, l.ends_at DESC;
END $$;

CREATE FUNCTION public.org_list_members(p_org uuid)
RETURNS TABLE(user_id uuid, display_name text, email text, role text, joined_at timestamptz, assigned bigint, completed bigint,
 average_progress integer, streamed_minutes bigint, quiz_percent integer, certificates bigint, last_active date)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM learning_private.org_access(p_org);
 RETURN QUERY
 WITH stats AS MATERIALIZED (SELECT * FROM learning_private.org_enrollments(p_org))
 SELECT m.user_id, p.display_name, u.email::text, m.role, m.joined_at,
  (SELECT count(*) FROM stats s WHERE s.user_id = m.user_id AND s.status IN ('active', 'completed')),
  (SELECT count(*) FROM stats s WHERE s.user_id = m.user_id AND s.completed_at IS NOT NULL),
  (SELECT round(avg(s.progress))::integer FROM stats s WHERE s.user_id = m.user_id AND s.status IN ('active', 'completed')),
  (SELECT floor(coalesce(sum(s.streamed_seconds), 0) / 60)::bigint FROM stats s WHERE s.user_id = m.user_id),
  (SELECT round(avg(s.quiz_percent))::integer FROM stats s WHERE s.user_id = m.user_id),
  (SELECT count(s.certificate_number) FROM stats s WHERE s.user_id = m.user_id),
  (SELECT max(a.activity_date) FROM public.learning_activity_days a WHERE a.user_id = m.user_id)
 FROM public.organization_members m
 JOIN public.profiles p ON p.id = m.user_id
 JOIN auth.users u ON u.id = m.user_id
 WHERE m.organization_id = p_org AND m.status = 'active'
 ORDER BY m.role, lower(coalesce(p.display_name, u.email::text));
END $$;

-- A member's sponsored courses (current members and former members alike, for the record).
CREATE FUNCTION public.org_list_member_courses(p_org uuid, p_user uuid, p_locale text)
RETURNS TABLE(course_id uuid, course_slug text, course_title text, status text, granted_at timestamptz, expires_at timestamptz,
 completed_at timestamptz, progress integer, streamed_minutes bigint, quiz_percent integer, certificate_number text, last_activity timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM learning_private.org_access(p_org);
 IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id = p_org AND m.user_id = p_user) THEN
  RAISE EXCEPTION 'member not found' USING ERRCODE = 'P0002';
 END IF;
 RETURN QUERY
 SELECT s.course_id, c.slug, coalesce(t.title, other.title, c.slug), s.status, s.granted_at, s.expires_at, s.completed_at,
  s.progress, floor(s.streamed_seconds / 60)::bigint, s.quiz_percent, s.certificate_number, s.last_activity
 FROM learning_private.org_enrollments(p_org) s
 JOIN public.courses c ON c.id = s.course_id
 LEFT JOIN public.course_translations t ON t.course_id = c.id AND t.locale = p_locale
 LEFT JOIN public.course_translations other ON other.course_id = c.id AND other.locale <> p_locale
 WHERE s.user_id = p_user
 ORDER BY (s.status IN ('active', 'completed')) DESC, s.granted_at DESC;
END $$;

CREATE FUNCTION public.org_list_invitations(p_org uuid)
RETURNS TABLE(id uuid, email text, role text, created_at timestamptz, expires_at timestamptz, expired boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 PERFORM learning_private.org_access(p_org);
 RETURN QUERY
 SELECT v.id, v.email, v.role, v.created_at, v.expires_at, v.expires_at <= now()
 FROM public.organization_invitations v
 WHERE v.organization_id = p_org AND v.accepted_at IS NULL AND v.revoked_at IS NULL
 ORDER BY v.created_at DESC;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Organization writes
-- ---------------------------------------------------------------------------------------------
-- Issues one invitation per email and returns each code once. Re-inviting an email replaces its pending
-- invitation. Active members are reported, not re-invited.
CREATE FUNCTION public.org_create_invitations(p_org uuid, p_emails text[], p_role text)
RETURNS TABLE(email text, code text, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
 v_access text := learning_private.org_access(p_org);
 v_email text; v_code text; v_emails text[]; v_invited integer := 0;
BEGIN
 IF p_role IS NULL OR p_role NOT IN ('manager', 'member') THEN RAISE EXCEPTION 'invalid role' USING ERRCODE = '22023'; END IF;
 SELECT array_agg(DISTINCT lower(btrim(x))) INTO v_emails FROM unnest(p_emails) x WHERE nullif(btrim(x), '') IS NOT NULL;
 IF coalesce(cardinality(v_emails), 0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid emails' USING ERRCODE = '22023'; END IF;
 PERFORM 1 FROM public.organizations WHERE id = p_org FOR UPDATE;
 IF (SELECT count(*) FROM public.organization_invitations v WHERE v.organization_id = p_org AND v.created_at > now() - interval '1 day')
    + cardinality(v_emails) > 500 THEN
  RAISE EXCEPTION 'invitation limit' USING ERRCODE = '54000';
 END IF;
 FOREACH v_email IN ARRAY v_emails LOOP
  IF char_length(v_email) > 320 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
   email := v_email; code := NULL; result := 'invalid'; RETURN NEXT; CONTINUE;
  END IF;
  IF EXISTS(SELECT 1 FROM public.organization_members m JOIN auth.users u ON u.id = m.user_id
    WHERE m.organization_id = p_org AND m.status = 'active' AND lower(u.email) = v_email) THEN
   email := v_email; code := NULL; result := 'member'; RETURN NEXT; CONTINUE;
  END IF;
  UPDATE public.organization_invitations v SET revoked_at = now()
  WHERE v.organization_id = p_org AND v.email = v_email AND v.accepted_at IS NULL AND v.revoked_at IS NULL;
  v_code := learning_private.org_new_invitation_code();
  INSERT INTO public.organization_invitations(organization_id, email, role, token_hash, invited_by)
  VALUES (p_org, v_email, p_role, extensions.digest(v_code, 'sha256'), (SELECT auth.uid()));
  v_invited := v_invited + 1;
  email := v_email; code := v_code; result := 'invited'; RETURN NEXT;
 END LOOP;
 IF v_invited > 0 THEN
  PERFORM learning_private.org_audit(v_access, p_org, 'organization.members_changed', 'Invited ' || v_invited || ' ' || p_role || '(s)');
 END IF;
END $$;

CREATE FUNCTION public.org_revoke_invitation(p_org uuid, p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_access text := learning_private.org_access(p_org);
BEGIN
 UPDATE public.organization_invitations SET revoked_at = now()
 WHERE id = p_invitation_id AND organization_id = p_org AND accepted_at IS NULL AND revoked_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'invitation not found' USING ERRCODE = 'P0002'; END IF;
 PERFORM learning_private.org_audit(v_access, p_org, 'organization.members_changed', 'Revoked an invitation');
END $$;

-- Assigns a course to members, one seat each, from the current license with free seats that runs longest.
CREATE FUNCTION public.org_assign_course(p_org uuid, p_course_id uuid, p_user_ids uuid[])
RETURNS TABLE(user_id uuid, result text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
 v_access text := learning_private.org_access(p_org);
 actor uuid := (SELECT auth.uid());
 v_users uuid[]; v_user uuid; v_license public.organization_licenses; v_assigned integer := 0;
BEGIN
 SELECT array_agg(DISTINCT x) INTO v_users FROM unnest(p_user_ids) x WHERE x IS NOT NULL;
 IF coalesce(cardinality(v_users), 0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid members' USING ERRCODE = '22023'; END IF;
 -- Serializes seat counting for this course across concurrent assignments.
 PERFORM 1 FROM public.organization_licenses l WHERE l.organization_id = p_org AND l.course_id = p_course_id ORDER BY l.id FOR UPDATE;
 FOREACH v_user IN ARRAY v_users LOOP
  user_id := v_user;
  IF NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id = p_org AND m.user_id = v_user AND m.status = 'active') THEN
   result := 'not_member'; RETURN NEXT; CONTINUE;
  END IF;
  UPDATE public.enrollments e SET status = 'expired'
  WHERE e.user_id = v_user AND e.course_id = p_course_id AND e.status = 'active' AND e.expires_at <= now();
  IF EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id = v_user AND e.course_id = p_course_id
    AND e.status IN ('active', 'completed') AND (e.expires_at IS NULL OR e.expires_at > now())) THEN
   result := 'already'; RETURN NEXT; CONTINUE;
  END IF;
  SELECT l.* INTO v_license FROM public.organization_licenses l
  WHERE l.organization_id = p_org AND l.course_id = p_course_id AND l.status = 'active' AND now() >= l.starts_at AND now() < l.ends_at
   AND l.seats > learning_private.org_license_used(l.id)
  ORDER BY l.ends_at DESC, l.id LIMIT 1;
  IF v_license.id IS NULL THEN result := 'no_seats'; RETURN NEXT; CONTINUE; END IF;
  INSERT INTO public.enrollments(user_id, course_id, grant_source, granted_by, organization_license_id, expires_at)
  VALUES (v_user, p_course_id, 'organization', actor, v_license.id, v_license.ends_at);
  v_assigned := v_assigned + 1;
  result := 'assigned'; RETURN NEXT;
 END LOOP;
 IF v_assigned > 0 THEN
  PERFORM learning_private.org_audit(v_access, p_org, 'organization.members_changed', 'Assigned ' || v_assigned || ' seat(s)');
 END IF;
END $$;

-- Releases a member's seat on a course; the member loses access, their history stays.
CREATE FUNCTION public.org_release_seat(p_org uuid, p_course_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_access text := learning_private.org_access(p_org);
BEGIN
 UPDATE public.enrollments e SET status = 'revoked', revoked_at = now(), revoked_by = (SELECT auth.uid())
 FROM public.organization_licenses l
 WHERE l.id = e.organization_license_id AND l.organization_id = p_org
  AND e.user_id = p_user_id AND e.course_id = p_course_id AND e.status IN ('active', 'completed');
 IF NOT FOUND THEN RAISE EXCEPTION 'seat not found' USING ERRCODE = 'P0002'; END IF;
 PERFORM learning_private.org_audit(v_access, p_org, 'organization.members_changed', 'Released a seat');
END $$;

-- Removes a member and releases all their seats. The last manager cannot be removed.
CREATE FUNCTION public.org_remove_member(p_org uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_access text := learning_private.org_access(p_org); actor uuid := (SELECT auth.uid()); v_role text;
BEGIN
 PERFORM 1 FROM public.organizations WHERE id = p_org FOR UPDATE;
 SELECT m.role INTO v_role FROM public.organization_members m WHERE m.organization_id = p_org AND m.user_id = p_user_id AND m.status = 'active';
 IF v_role IS NULL THEN RAISE EXCEPTION 'member not found' USING ERRCODE = 'P0002'; END IF;
 IF v_role = 'manager' AND (SELECT count(*) FROM public.organization_members m
   WHERE m.organization_id = p_org AND m.status = 'active' AND m.role = 'manager') = 1 THEN
  RAISE EXCEPTION 'last manager' USING ERRCODE = '23514';
 END IF;
 UPDATE public.enrollments e SET status = 'revoked', revoked_at = now(), revoked_by = actor
 FROM public.organization_licenses l
 WHERE l.id = e.organization_license_id AND l.organization_id = p_org AND e.user_id = p_user_id AND e.status IN ('active', 'completed');
 UPDATE public.organization_members SET status = 'removed', removed_at = now(), removed_by = actor
 WHERE organization_id = p_org AND user_id = p_user_id AND status = 'active';
 PERFORM learning_private.org_audit(v_access, p_org, 'organization.members_changed', 'Removed a ' || v_role);
END $$;

-- Seat order for the Kashier checkout: priced on the server from the published course price times seats.
-- The order belongs to the manager who pays it; settlement turns each item into a 12-month license.
CREATE FUNCTION public.org_create_seat_order(p_org uuid, p_course_ids uuid[], p_seats integer[], p_locale text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 actor uuid := (SELECT auth.uid());
 v_count integer := coalesce(cardinality(p_course_ids), 0);
 v_total bigint := 0; v_found integer; oid uuid;
BEGIN
 IF learning_private.org_access(p_org) <> 'manager' THEN RAISE EXCEPTION 'organization manager required' USING ERRCODE = '42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') OR v_count NOT BETWEEN 1 AND 10 OR v_count <> coalesce(cardinality(p_seats), 0)
    OR EXISTS(SELECT 1 FROM unnest(p_seats) s WHERE s IS NULL OR s NOT BETWEEN 1 AND 1000)
    OR (SELECT count(DISTINCT x) FROM unnest(p_course_ids) x WHERE x IS NOT NULL) <> v_count THEN
  RAISE EXCEPTION 'invalid seat order' USING ERRCODE = '22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('org-checkout:' || actor::text));
 SELECT count(*), sum(c.price_minor * s.seats) INTO v_found, v_total
 FROM unnest(p_course_ids, p_seats) AS s(course_id, seats)
 JOIN public.courses c ON c.id = s.course_id AND c.status = 'published' AND c.price_minor > 0
 JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published';
 IF v_found <> v_count THEN RAISE EXCEPTION 'paid published course not found' USING ERRCODE = 'P0002'; END IF;
 IF v_total > 999999999 THEN RAISE EXCEPTION 'order too large' USING ERRCODE = '22023'; END IF;
 IF (SELECT count(*) FROM public.orders o WHERE o.user_id = actor AND o.created_at > now() - interval '1 hour') >= 10 THEN
  RAISE EXCEPTION 'checkout limit' USING ERRCODE = '54000';
 END IF;
 INSERT INTO public.orders(user_id, subtotal_minor, total_minor, locale, organization_id)
 VALUES (actor, v_total, v_total, p_locale, p_org) RETURNING id INTO oid;
 -- The title snapshot carries the seat count so the existing checkout page shows it unchanged.
 INSERT INTO public.order_items(order_id, course_id, title, amount_minor, seats, position)
 SELECT oid, c.id,
  ct.title || ' × ' || s.seats || ' ' || CASE
   WHEN p_locale = 'en' THEN CASE WHEN s.seats = 1 THEN 'seat' ELSE 'seats' END
   WHEN s.seats = 1 THEN 'مقعد' WHEN s.seats = 2 THEN 'مقعدان' WHEN s.seats % 100 BETWEEN 3 AND 10 THEN 'مقاعد' ELSE 'مقعدًا' END,
  c.price_minor * s.seats, s.seats, s.pos::smallint
 FROM unnest(p_course_ids, p_seats) WITH ORDINALITY AS s(course_id, seats, pos)
 JOIN public.courses c ON c.id = s.course_id
 JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale;
 INSERT INTO public.payments(order_id) VALUES (oid);
 RETURN oid;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Learners: memberships and invitations
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.learner_list_organizations()
RETURNS TABLE(id uuid, name text, kind text, status text, role text, joined_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 RETURN QUERY
 SELECT o.id, o.name, o.kind, o.status, m.role, m.joined_at
 FROM public.organization_members m JOIN public.organizations o ON o.id = m.organization_id
 WHERE m.user_id = (SELECT auth.uid()) AND m.status = 'active'
 ORDER BY o.name;
END $$;

-- Pending, unexpired invitations addressed to the caller's verified email.
CREATE FUNCTION public.learner_list_invitations()
RETURNS TABLE(id uuid, organization_name text, organization_kind text, role text, expires_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_email text;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = (SELECT auth.uid()) AND u.email_confirmed_at IS NOT NULL;
 RETURN QUERY
 SELECT v.id, o.name, o.kind, v.role, v.expires_at
 FROM public.organization_invitations v JOIN public.organizations o ON o.id = v.organization_id
 WHERE v.email = v_email AND v.accepted_at IS NULL AND v.revoked_at IS NULL AND v.expires_at > now() AND o.status = 'active'
  AND NOT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id = o.id AND m.user_id = (SELECT auth.uid()) AND m.status = 'active')
 ORDER BY v.created_at DESC;
END $$;

-- What an invitation code is for, so the join page can explain it before acceptance.
CREATE FUNCTION public.learner_preview_invitation(p_code text)
RETURNS TABLE(organization_name text, organization_kind text, role text, expires_at timestamptz, email_matches boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE v_email text;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{32}$' THEN RAISE EXCEPTION 'invalid code' USING ERRCODE = '22023'; END IF;
 SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = (SELECT auth.uid()) AND u.email_confirmed_at IS NOT NULL;
 RETURN QUERY
 SELECT o.name, o.kind, v.role, v.expires_at, coalesce(v.email = v_email, false)
 FROM public.organization_invitations v JOIN public.organizations o ON o.id = v.organization_id
 WHERE v.token_hash = extensions.digest(p_code, 'sha256') AND v.accepted_at IS NULL AND v.revoked_at IS NULL
  AND v.expires_at > now() AND o.status = 'active';
END $$;

-- Accepts an invitation by id (from the pending list) or by code. Either way it must be addressed to the
-- caller's verified email. Accepting as a manager upgrades an existing membership.
CREATE FUNCTION public.learner_accept_invitation(p_invitation_id uuid DEFAULT NULL, p_code text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := (SELECT auth.uid()); v_email text; v public.organization_invitations;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF (p_invitation_id IS NULL) = (p_code IS NULL) OR (p_code IS NOT NULL AND p_code !~ '^[A-Za-z0-9_-]{32}$') THEN
  RAISE EXCEPTION 'invalid invitation' USING ERRCODE = '22023';
 END IF;
 SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = actor AND u.email_confirmed_at IS NOT NULL;
 SELECT * INTO v FROM public.organization_invitations i
 WHERE (i.id = p_invitation_id OR i.token_hash = extensions.digest(p_code, 'sha256'))
  AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()
 FOR UPDATE;
 IF v.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id = v.organization_id AND o.status = 'active') THEN
  RAISE EXCEPTION 'invitation not found' USING ERRCODE = 'P0002';
 END IF;
 IF v_email IS NULL OR v.email <> v_email THEN RAISE EXCEPTION 'invitation is for another email' USING ERRCODE = '42501'; END IF;
 UPDATE public.organization_invitations SET accepted_at = now(), accepted_by = actor WHERE id = v.id;
 IF EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id = v.organization_id AND m.user_id = actor AND m.status = 'active') THEN
  IF v.role = 'manager' THEN
   UPDATE public.organization_members SET role = 'manager' WHERE organization_id = v.organization_id AND user_id = actor AND status = 'active';
  END IF;
 ELSE
  INSERT INTO public.organization_members(organization_id, user_id, role, invited_by) VALUES (v.organization_id, actor, v.role, v.invited_by);
 END IF;
 RETURN v.organization_id;
END $$;

REVOKE ALL ON FUNCTION
 public.admin_create_organization(text, text, uuid), public.admin_set_organization_status(uuid, text),
 public.admin_grant_organization_license(uuid, uuid, integer, integer, text), public.admin_list_organizations(),
 public.org_get(uuid), public.org_list_licenses(uuid, text), public.org_list_members(uuid),
 public.org_list_member_courses(uuid, uuid, text), public.org_list_invitations(uuid),
 public.org_create_invitations(uuid, text[], text), public.org_revoke_invitation(uuid, uuid),
 public.org_assign_course(uuid, uuid, uuid[]), public.org_release_seat(uuid, uuid, uuid), public.org_remove_member(uuid, uuid),
 public.org_create_seat_order(uuid, uuid[], integer[], text),
 public.learner_list_organizations(), public.learner_list_invitations(), public.learner_preview_invitation(text),
 public.learner_accept_invitation(uuid, text)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION
 public.admin_create_organization(text, text, uuid), public.admin_set_organization_status(uuid, text),
 public.admin_grant_organization_license(uuid, uuid, integer, integer, text), public.admin_list_organizations(),
 public.org_get(uuid), public.org_list_licenses(uuid, text), public.org_list_members(uuid),
 public.org_list_member_courses(uuid, uuid, text), public.org_list_invitations(uuid),
 public.org_create_invitations(uuid, text[], text), public.org_revoke_invitation(uuid, uuid),
 public.org_assign_course(uuid, uuid, uuid[]), public.org_release_seat(uuid, uuid, uuid), public.org_remove_member(uuid, uuid),
 public.org_create_seat_order(uuid, uuid[], integer[], text),
 public.learner_list_organizations(), public.learner_list_invitations(), public.learner_preview_invitation(text),
 public.learner_accept_invitation(uuid, text)
 TO authenticated;

-- ---------------------------------------------------------------------------------------------
-- Settlement: seat orders become licenses (same function as 20261014104103 plus the organization branches)
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commerce_confirm_order(p_id uuid,p_session_id text,p_provider_order_id text,p_amount bigint,p_currency text,p_result text,p_event_key text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; p public.payments; i public.order_items;BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_id FOR UPDATE;
 SELECT * INTO p FROM public.payments WHERE order_id=p_id FOR UPDATE;
 IF o.id IS NULL OR p.session_id IS DISTINCT FROM p_session_id OR p_session_id IS NULL OR p_amount IS DISTINCT FROM o.total_minor OR p_currency IS DISTINCT FROM o.currency OR p_result IS NULL OR p_result NOT IN('paid','refunded') OR p_provider_order_id IS NULL OR length(p_provider_order_id) NOT BETWEEN 1 AND 100 OR (p.provider_order_id IS NOT NULL AND p.provider_order_id<>p_provider_order_id) THEN RAISE EXCEPTION 'payment mismatch' USING ERRCODE='23514';END IF;
 INSERT INTO public.payment_events(order_id,event_key,result,amount_minor) VALUES(o.id,p_event_key,p_result,p_amount) ON CONFLICT(event_key) DO NOTHING;
 IF NOT FOUND THEN RETURN;END IF;
 UPDATE public.payments SET provider_order_id=p_provider_order_id,confirmed_at=coalesce(confirmed_at,now()) WHERE order_id=o.id;
 IF p_result='refunded' THEN
  UPDATE public.orders SET status='refunded' WHERE id=o.id;
  UPDATE public.payments SET refunded_at=coalesce(refunded_at,now()) WHERE order_id=o.id;
  UPDATE public.enrollments e SET status='refunded',refund_confirmed_at=now(),revoked_at=NULL,revoked_by=NULL FROM public.order_items oi WHERE e.order_item_id=oi.id AND oi.order_id=o.id AND e.status<>'refunded';
  -- Seat orders: the licenses end and their active seats are revoked (completed learners keep their record).
  UPDATE public.organization_licenses l SET status='refunded' FROM public.order_items oi WHERE l.order_item_id=oi.id AND oi.order_id=o.id AND l.status='active';
  UPDATE public.enrollments e SET status='revoked',revoked_at=now(),revoked_by=o.user_id FROM public.organization_licenses l JOIN public.order_items oi ON oi.id=l.order_item_id WHERE oi.order_id=o.id AND e.organization_license_id=l.id AND e.status='active';
  RETURN;
 END IF;
 IF o.status='refunded' THEN RETURN;END IF;
 UPDATE public.orders SET status='paid' WHERE id=o.id;
 -- Seat orders become 12-month licenses for the organization; nobody is enrolled personally.
 IF o.organization_id IS NOT NULL THEN
  INSERT INTO public.organization_licenses(organization_id,course_id,seats,ends_at,source,order_item_id,granted_by)
   SELECT o.organization_id,oi.course_id,oi.seats,now()+interval '12 months','purchase',oi.id,o.user_id FROM public.order_items oi WHERE oi.order_id=o.id
   ON CONFLICT (order_item_id) DO NOTHING;
  RETURN;
 END IF;
 FOR i IN SELECT * FROM public.order_items WHERE order_id=o.id LOOP
  PERFORM 1 FROM public.courses WHERE id=i.course_id FOR UPDATE;
  UPDATE public.enrollments SET status='expired' WHERE user_id=o.user_id AND course_id=i.course_id AND status='active' AND expires_at<=now();
  IF NOT EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=o.user_id AND e.course_id=i.course_id AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())) AND NOT EXISTS(SELECT 1 FROM public.enrollments e WHERE e.order_item_id=i.id) THEN
   INSERT INTO public.enrollments(user_id,course_id,grant_source,granted_by,order_item_id) VALUES(o.user_id,i.course_id,'paid',o.user_id,i.id);
  END IF;
 END LOOP;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Analytics: organization-sponsored learners and B2B revenue
-- ---------------------------------------------------------------------------------------------
-- Segments: paid (own purchase) > organization (sponsored seat) > free > complimentary > none.
CREATE OR REPLACE FUNCTION learning_private.analytics_learners()
RETURNS TABLE(user_id uuid, segment text)
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT p.id,
  CASE
   WHEN EXISTS(SELECT 1 FROM public.orders o WHERE o.user_id = p.id AND o.status = 'paid' AND o.organization_id IS NULL) THEN 'paid'
   WHEN EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id = p.id AND e.grant_source = 'organization') THEN 'organization'
   WHEN EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id = p.id AND e.grant_source = 'free') THEN 'free'
   WHEN EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id = p.id AND e.grant_source = 'admin') THEN 'complimentary'
   ELSE 'none'
  END
 FROM public.profiles p
 WHERE NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.revoked_at IS NULL)
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_learners(p_search text, p_segment text, p_limit integer DEFAULT 25, p_offset integer DEFAULT 0)
RETURNS TABLE(
 user_id uuid, display_name text, email text, learner_type text, institution text, segment text, joined_at timestamptz,
 enrollments bigint, completed bigint, average_progress integer, watched_minutes bigint, streamed_minutes bigint, last_active date, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
DECLARE
 v_search text := nullif(btrim(coalesce(p_search, '')), '');
 v_segment text := nullif(p_segment, '');
 v_pattern text;
BEGIN
 PERFORM public.assert_active_admin();
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000
    OR (v_segment IS NOT NULL AND v_segment NOT IN ('paid', 'organization', 'free', 'complimentary', 'none'))
    OR char_length(coalesce(v_search, '')) > 120 THEN
  RAISE EXCEPTION 'invalid analytics request' USING ERRCODE = '22023';
 END IF;
 IF v_search IS NOT NULL THEN
  v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
 END IF;

 RETURN QUERY
 WITH roster AS (
  SELECT l.user_id, p.display_name, u.email::text AS email, pr.learner_type,
   coalesce(iu.name_en, pr.university, ic.name_en, pr.company_name) AS institution, l.segment, p.created_at,
   (SELECT max(a.activity_date) FROM public.learning_activity_days a WHERE a.user_id = l.user_id) AS last_active
  FROM learning_private.analytics_learners() l
  JOIN public.profiles p ON p.id = l.user_id
  JOIN auth.users u ON u.id = l.user_id
  LEFT JOIN public.learner_profiles pr ON pr.user_id = l.user_id
  LEFT JOIN public.institutions iu ON iu.id = pr.university_id
  LEFT JOIN public.institutions ic ON ic.id = pr.company_id
  WHERE (v_segment IS NULL OR l.segment = v_segment)
   AND (v_pattern IS NULL OR u.email ILIKE v_pattern OR coalesce(p.display_name, '') ILIKE v_pattern
    OR coalesce(pr.university, pr.company_name, '') ILIKE v_pattern)
 ), page AS (
  SELECT r.*, count(*) OVER () AS total FROM roster r
  ORDER BY r.last_active DESC NULLS LAST, r.created_at DESC, r.user_id
  LIMIT p_limit OFFSET p_offset
 ), stats AS (
  SELECT e.user_id,
   count(*) FILTER (WHERE e.status NOT IN ('revoked', 'refunded')) AS enrollments,
   count(*) FILTER (WHERE e.status = 'completed') AS completed,
   round(avg(e.progress) FILTER (WHERE e.status IN ('active', 'completed')))::integer AS progress,
   floor(sum(e.watched_seconds) / 60)::bigint AS minutes
  FROM learning_private.analytics_enrollments() e WHERE e.user_id IN (SELECT pg.user_id FROM page pg)
  GROUP BY e.user_id
 ), streamed AS (
  SELECT e.user_id, floor(sum(w.seconds) / 60)::bigint AS minutes
  FROM learning_private.video_watch_daily w JOIN public.enrollments e ON e.id = w.enrollment_id
  WHERE e.user_id IN (SELECT pg.user_id FROM page pg)
  GROUP BY e.user_id
 )
 SELECT pg.user_id, pg.display_name, pg.email, pg.learner_type, pg.institution, pg.segment, pg.created_at,
  coalesce(s.enrollments, 0), coalesce(s.completed, 0), s.progress, coalesce(s.minutes, 0), coalesce(st.minutes, 0), pg.last_active, pg.total
 FROM page pg LEFT JOIN stats s ON s.user_id = pg.user_id LEFT JOIN streamed st ON st.user_id = pg.user_id
 ORDER BY pg.last_active DESC NULLS LAST, pg.created_at DESC, pg.user_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_analytics_overview(p_days integer)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 tz constant text := 'Africa/Cairo';
 v_today date := (now() AT TIME ZONE tz)::date;
 v_start date; v_prev_start date; v_from timestamptz; v_prev timestamptz; v_bucket text; v_result jsonb;
BEGIN
 PERFORM public.assert_active_admin();
 IF p_days IS NULL OR p_days NOT IN (7, 30, 90, 365) THEN RAISE EXCEPTION 'invalid range' USING ERRCODE = '22023'; END IF;
 v_start := v_today - (p_days - 1);
 v_prev_start := v_start - p_days;
 v_from := v_start::timestamp AT TIME ZONE tz;
 v_prev := v_prev_start::timestamp AT TIME ZONE tz;
 v_bucket := CASE WHEN p_days = 365 THEN 'week' ELSE 'day' END;

 WITH learners AS MATERIALIZED (
  SELECT l.user_id, l.segment, p.created_at, pr.learner_type, pr.university, pr.company_name, pr.university_id, pr.company_id
  FROM learning_private.analytics_learners() l
  JOIN public.profiles p ON p.id = l.user_id
  LEFT JOIN public.learner_profiles pr ON pr.user_id = l.user_id
 ), enrolled AS MATERIALIZED (
  SELECT e.* FROM learning_private.analytics_enrollments() e
 ), streamed AS MATERIALIZED (
  SELECT w.watch_date, w.seconds FROM learning_private.video_watch_daily w JOIN enrolled e ON e.enrollment_id = w.enrollment_id
  WHERE w.watch_date >= v_prev_start
 ), activity AS MATERIALIZED (
  SELECT a.user_id, a.activity_date FROM public.learning_activity_days a JOIN learners l ON l.user_id = a.user_id
  WHERE a.activity_date >= least(v_prev_start, v_today - 29)
 ), money AS MATERIALIZED (
  -- A refund is a negative entry on the day it was confirmed, so net revenue per period is a plain sum.
  SELECT pay.confirmed_at AS at, o.total_minor AS amount, o.discount_minor AS discount, 1 AS paid_order, o.organization_id IS NOT NULL AS b2b
  FROM public.orders o JOIN public.payments pay ON pay.order_id = o.id
  WHERE o.status IN ('paid', 'refunded') AND pay.confirmed_at >= v_prev
  UNION ALL
  SELECT pay.refunded_at, -o.total_minor, 0, 0, o.organization_id IS NOT NULL
  FROM public.orders o JOIN public.payments pay ON pay.order_id = o.id
  WHERE o.status = 'refunded' AND pay.refunded_at >= v_prev
 )
 SELECT jsonb_build_object(
  'range', jsonb_build_object('days', p_days, 'start', v_start, 'end', v_today, 'bucket', v_bucket, 'timezone', tz),
  'users', jsonb_build_object(
   'total', (SELECT count(*) FROM learners),
   'new', (SELECT count(*) FROM learners WHERE created_at >= v_from),
   'newPrev', (SELECT count(*) FROM learners WHERE created_at >= v_prev AND created_at < v_from),
   'byType', (SELECT coalesce(jsonb_object_agg(k, n), '{}') FROM (
     SELECT coalesce(learner_type, 'not_onboarded') AS k, count(*) AS n FROM learners GROUP BY 1) x),
   'bySegment', (SELECT coalesce(jsonb_object_agg(segment, n), '{}') FROM (
     SELECT segment, count(*) AS n FROM learners GROUP BY 1) x),
   -- Has had access for 14+ days, still active, and no learning activity in the last 14 days.
   'atRisk', (SELECT count(*) FROM learners l
     WHERE EXISTS(SELECT 1 FROM enrolled e WHERE e.user_id = l.user_id AND e.status = 'active' AND e.granted_at < now() - interval '14 days')
     AND NOT EXISTS(SELECT 1 FROM activity a WHERE a.user_id = l.user_id AND a.activity_date > v_today - 14))
  ),
  'activity', jsonb_build_object(
   'today', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date = v_today),
   'week', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date > v_today - 7),
   'month', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date > v_today - 30),
   'range', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date >= v_start),
   'rangePrev', (SELECT count(DISTINCT user_id) FROM activity WHERE activity_date >= v_prev_start AND activity_date < v_start)
  ),
  'learning', jsonb_build_object(
   'enrollments', (SELECT count(*) FROM enrolled WHERE granted_at >= v_from),
   'enrollmentsPrev', (SELECT count(*) FROM enrolled WHERE granted_at >= v_prev AND granted_at < v_from),
   'bySource', (SELECT coalesce(jsonb_object_agg(grant_source, n), '{}') FROM (
     SELECT grant_source, count(*) AS n FROM enrolled WHERE granted_at >= v_from GROUP BY 1) x),
   'completions', (SELECT count(*) FROM public.course_completions c JOIN enrolled e ON e.enrollment_id = c.enrollment_id WHERE c.completed_at >= v_from),
   'completionsPrev', (SELECT count(*) FROM public.course_completions c JOIN enrolled e ON e.enrollment_id = c.enrollment_id
     WHERE c.completed_at >= v_prev AND c.completed_at < v_from),
   'certificates', (SELECT count(*) FROM public.certificates c WHERE c.issued_at >= v_from AND c.revoked_at IS NULL),
   'activeEnrollments', (SELECT count(*) FROM enrolled WHERE status = 'active'),
   'organizations', (SELECT count(*) FROM public.organizations WHERE status = 'active'),
   'averageProgress', (SELECT round(avg(progress))::integer FROM enrolled WHERE status IN ('active', 'completed')),
   'watchedMinutes', (SELECT floor(coalesce(sum(watched_seconds), 0) / 60)::bigint FROM enrolled),
   'streamedMinutes', (SELECT floor(coalesce(sum(seconds), 0) / 60)::bigint FROM streamed WHERE watch_date >= v_start),
   'streamedMinutesPrev', (SELECT floor(coalesce(sum(seconds), 0) / 60)::bigint FROM streamed WHERE watch_date < v_start)
  ),
  'revenue', jsonb_build_object(
   'currency', 'EGP',
   'gross', (SELECT coalesce(sum(amount), 0) FROM money WHERE at >= v_from AND amount > 0),
   'refunds', (SELECT coalesce(-sum(amount), 0) FROM money WHERE at >= v_from AND amount < 0),
   'net', (SELECT coalesce(sum(amount), 0) FROM money WHERE at >= v_from),
   'netPrev', (SELECT coalesce(sum(amount), 0) FROM money WHERE at >= v_prev AND at < v_from),
   'organizationNet', (SELECT coalesce(sum(amount), 0) FROM money WHERE at >= v_from AND b2b),
   'paidOrders', (SELECT coalesce(sum(paid_order), 0) FROM money WHERE at >= v_from),
   'discounts', (SELECT coalesce(sum(discount), 0) FROM money WHERE at >= v_from),
   'ordersCreated', (SELECT count(*) FROM public.orders o WHERE o.created_at >= v_from),
   'ordersAbandoned', (SELECT count(*) FROM public.orders o WHERE o.created_at >= v_from AND o.status = 'pending' AND o.expires_at < now())
  ),
  -- Linked institutions group under their canonical name; unlinked free text groups by its normalized form.
  'institutions', jsonb_build_object(
   'universities', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'nameAr', name_ar, 'matched', matched, 'learners', n) ORDER BY n DESC, name), '[]') FROM (
     SELECT coalesce(min(i.name_en), min(l.university)) AS name, min(i.name_ar) AS name_ar, bool_or(i.id IS NOT NULL) AS matched, count(*) AS n
     FROM learners l LEFT JOIN public.institutions i ON i.id = l.university_id
     WHERE l.university IS NOT NULL
     GROUP BY coalesce(l.university_id::text, learning_private.normalize_institution_name(l.university))
     ORDER BY n DESC, name LIMIT 8) x),
   'universityCount', (SELECT count(DISTINCT coalesce(university_id::text, learning_private.normalize_institution_name(university))) FROM learners WHERE university IS NOT NULL),
   'universityUnmatched', (SELECT count(*) FROM learners WHERE university IS NOT NULL AND university_id IS NULL),
   'companies', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'nameAr', name_ar, 'matched', matched, 'learners', n) ORDER BY n DESC, name), '[]') FROM (
     SELECT coalesce(min(i.name_en), min(l.company_name)) AS name, min(i.name_ar) AS name_ar, bool_or(i.id IS NOT NULL) AS matched, count(*) AS n
     FROM learners l LEFT JOIN public.institutions i ON i.id = l.company_id
     WHERE l.company_name IS NOT NULL
     GROUP BY coalesce(l.company_id::text, learning_private.normalize_institution_name(l.company_name))
     ORDER BY n DESC, name LIMIT 8) x),
   'companyCount', (SELECT count(DISTINCT coalesce(company_id::text, learning_private.normalize_institution_name(company_name))) FROM learners WHERE company_name IS NOT NULL),
   'companyUnmatched', (SELECT count(*) FROM learners WHERE company_name IS NOT NULL AND company_id IS NULL)
  ),
  'series', (SELECT jsonb_agg(jsonb_build_object(
     'date', g.d, 'signups', coalesce(s.n, 0), 'active', coalesce(act.n, 0), 'enrollments', coalesce(en.n, 0), 'revenue', coalesce(m.n, 0),
     'streamed', coalesce(st.n, 0)
    ) ORDER BY g.d)
   FROM (SELECT gs::date AS d FROM generate_series(date_trunc(v_bucket, v_start::timestamp), v_today::timestamp, ('1 ' || v_bucket)::interval) gs) g
   LEFT JOIN (SELECT date_trunc(v_bucket, created_at AT TIME ZONE tz)::date AS d, count(*) AS n FROM learners WHERE created_at >= v_from GROUP BY 1) s ON s.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, activity_date::timestamp)::date AS d, count(DISTINCT user_id) AS n FROM activity WHERE activity_date >= v_start GROUP BY 1) act ON act.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, granted_at AT TIME ZONE tz)::date AS d, count(*) AS n FROM enrolled WHERE granted_at >= v_from GROUP BY 1) en ON en.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, at AT TIME ZONE tz)::date AS d, sum(amount) AS n FROM money WHERE at >= v_from GROUP BY 1) m ON m.d = g.d
   LEFT JOIN (SELECT date_trunc(v_bucket, watch_date::timestamp)::date AS d, floor(sum(seconds) / 60)::bigint AS n FROM streamed WHERE watch_date >= v_start GROUP BY 1) st ON st.d = g.d)
 ) INTO v_result;
 RETURN v_result;
END $$;
