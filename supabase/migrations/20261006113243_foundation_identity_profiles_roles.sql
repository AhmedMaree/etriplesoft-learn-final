-- Initial identity, learner preference, elevated-role, and role-audit foundation.

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  avatar_object_key text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT profiles_display_name_length CHECK (
    display_name IS NULL OR (
      display_name = pg_catalog.btrim(display_name)
      AND pg_catalog.char_length(display_name) BETWEEN 1 AND 120
    )
  ),
  CONSTRAINT profiles_avatar_object_key_length CHECK (
    avatar_object_key IS NULL OR (
      avatar_object_key = pg_catalog.btrim(avatar_object_key)
      AND pg_catalog.char_length(avatar_object_key) BETWEEN 1 AND 1024
    )
  )
);

CREATE TABLE public.learner_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  preferred_locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  email_notifications boolean NOT NULL DEFAULT false,
  course_reminders boolean NOT NULL DEFAULT false,
  assignment_deadlines boolean NOT NULL DEFAULT false,
  community_updates boolean NOT NULL DEFAULT false,
  daily_learning_reminders boolean NOT NULL DEFAULT false,
  course_recommendations boolean NOT NULL DEFAULT false,
  autoplay_next boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT learner_preferences_locale_check CHECK (preferred_locale IN ('en', 'ar')),
  CONSTRAINT learner_preferences_timezone_check CHECK (
    timezone = pg_catalog.btrim(timezone)
    AND pg_catalog.char_length(timezone) BETWEEN 1 AND 128
  )
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  role text NOT NULL,
  granted_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  revoked_by uuid REFERENCES public.profiles (id) ON DELETE RESTRICT,
  revoked_at timestamptz,
  CONSTRAINT user_roles_role_check CHECK (role IN ('admin', 'instructor')),
  CONSTRAINT user_roles_revocation_pair_check CHECK (
    (revoked_by IS NULL) = (revoked_at IS NULL)
  )
);

CREATE UNIQUE INDEX user_roles_one_active_grant_idx
  ON public.user_roles (user_id, role)
  WHERE revoked_at IS NULL;

CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX user_roles_granted_by_idx ON public.user_roles (granted_by);
CREATE INDEX user_roles_revoked_by_idx
  ON public.user_roles (revoked_by)
  WHERE revoked_by IS NOT NULL;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  action text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  user_role_id uuid NOT NULL REFERENCES public.user_roles (id) ON DELETE RESTRICT,
  accessed_user_id uuid REFERENCES public.profiles (id) ON DELETE RESTRICT,
  request_id text,
  safe_summary text NOT NULL,
  CONSTRAINT admin_audit_log_action_check CHECK (
    action IN ('user_role.granted', 'user_role.revoked')
  ),
  CONSTRAINT admin_audit_log_request_id_check CHECK (
    request_id IS NULL OR pg_catalog.char_length(request_id) BETWEEN 1 AND 128
  ),
  CONSTRAINT admin_audit_log_safe_summary_check CHECK (
    pg_catalog.char_length(safe_summary) BETWEEN 1 AND 500
  )
);

CREATE INDEX admin_audit_log_actor_occurred_at_idx
  ON public.admin_audit_log (actor_id, occurred_at DESC);
CREATE INDEX admin_audit_log_user_role_idx
  ON public.admin_audit_log (user_role_id, occurred_at DESC);
CREATE INDEX admin_audit_log_accessed_user_occurred_at_idx
  ON public.admin_audit_log (accessed_user_id, occurred_at DESC);

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER learner_preferences_set_updated_at
  BEFORE UPDATE ON public.learner_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.learner_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

CREATE FUNCTION public.guard_user_role_revocation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.role IS DISTINCT FROM OLD.role
    OR NEW.granted_by IS DISTINCT FROM OLD.granted_by
    OR NEW.granted_at IS DISTINCT FROM OLD.granted_at THEN
    RAISE EXCEPTION 'role grant identity and history are immutable';
  END IF;

  IF OLD.revoked_at IS NOT NULL OR NEW.revoked_at IS NULL OR NEW.revoked_by IS NULL THEN
    RAISE EXCEPTION 'an active role grant may only be revoked once';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_user_role_revocation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER user_roles_guard_revocation
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_role_revocation();

CREATE FUNCTION public.audit_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_audit_log (
      actor_id,
      action,
      user_role_id,
      accessed_user_id,
      safe_summary
    )
    VALUES (
      NEW.granted_by,
      'user_role.granted',
      NEW.id,
      NEW.user_id,
      'Elevated role granted'
    );
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_audit_log (
    actor_id,
    action,
    user_role_id,
    accessed_user_id,
    safe_summary
  )
  VALUES (
    NEW.revoked_by,
    'user_role.revoked',
    NEW.id,
    NEW.user_id,
    'Elevated role revoked'
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_user_role_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER user_roles_audit_insert
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_user_role_change();

CREATE TRIGGER user_roles_audit_revoke
  AFTER UPDATE OF revoked_by, revoked_at ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_user_role_change();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY learner_preferences_select_own
  ON public.learner_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY learner_preferences_insert_own
  ON public.learner_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY learner_preferences_update_own
  ON public.learner_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_roles_select_own
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE
  public.profiles,
  public.learner_preferences,
  public.user_roles,
  public.admin_audit_log
FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (display_name, avatar_object_key)
  ON TABLE public.profiles TO authenticated;

GRANT SELECT ON TABLE public.learner_preferences TO authenticated;
GRANT INSERT (
  user_id,
  preferred_locale,
  timezone,
  email_notifications,
  course_reminders,
  assignment_deadlines,
  community_updates,
  daily_learning_reminders,
  course_recommendations,
  autoplay_next
)
  ON TABLE public.learner_preferences TO authenticated;
GRANT UPDATE (
  preferred_locale,
  timezone,
  email_notifications,
  course_reminders,
  assignment_deadlines,
  community_updates,
  daily_learning_reminders,
  course_recommendations,
  autoplay_next
)
  ON TABLE public.learner_preferences TO authenticated;

GRANT SELECT ON TABLE public.user_roles TO authenticated;

GRANT SELECT ON TABLE public.profiles TO service_role;
GRANT INSERT (id, display_name, avatar_object_key)
  ON TABLE public.profiles TO service_role;
GRANT UPDATE (display_name, avatar_object_key)
  ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.learner_preferences TO service_role;
GRANT INSERT (
  user_id,
  preferred_locale,
  timezone,
  email_notifications,
  course_reminders,
  assignment_deadlines,
  community_updates,
  daily_learning_reminders,
  course_recommendations,
  autoplay_next
)
  ON TABLE public.learner_preferences TO service_role;
GRANT UPDATE (
  preferred_locale,
  timezone,
  email_notifications,
  course_reminders,
  assignment_deadlines,
  community_updates,
  daily_learning_reminders,
  course_recommendations,
  autoplay_next
)
  ON TABLE public.learner_preferences TO service_role;

GRANT SELECT ON TABLE public.user_roles TO service_role;
GRANT INSERT (user_id, role, granted_by)
  ON TABLE public.user_roles TO service_role;
GRANT UPDATE (revoked_by, revoked_at)
  ON TABLE public.user_roles TO service_role;

GRANT SELECT ON TABLE public.admin_audit_log TO service_role;

COMMENT ON TABLE public.profiles IS
  'Minimal display profile linked one-to-one to auth.users; credentials and email remain in Supabase Auth.';
COMMENT ON TABLE public.learner_preferences IS
  'Owner-scoped locale, timezone, and explicit learner preferences.';
COMMENT ON TABLE public.user_roles IS
  'Protected elevated-role grant/revoke history. Learners have no role row and cannot write grants.';
COMMENT ON TABLE public.admin_audit_log IS
  'Append-only audit of elevated role grants and revocations; later migrations add typed targets for other domains.';
COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Creates only a minimal profile and default preferences; signup metadata never grants authorization.';
