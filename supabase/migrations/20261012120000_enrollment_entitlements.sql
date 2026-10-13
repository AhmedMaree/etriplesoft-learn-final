-- Phase 10: individual free enrollment, immutable enrollment history, and exact-locale access.
-- Enrollment writes and protected content reads are narrow RPCs; direct table access stays denied.

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  course_id uuid NOT NULL REFERENCES public.courses (id) ON DELETE RESTRICT,
  grant_source text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  granted_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  expires_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles (id) ON DELETE RESTRICT,
  CONSTRAINT enrollments_source_check CHECK (grant_source = 'free'),
  CONSTRAINT enrollments_status_check CHECK (status IN ('active', 'completed', 'revoked', 'expired')),
  CONSTRAINT enrollments_lifecycle_check CHECK (
    (status <> 'completed' OR completed_at IS NOT NULL)
    AND (status IN ('completed', 'revoked', 'expired') OR completed_at IS NULL)
    AND (status = 'revoked') = (revoked_at IS NOT NULL AND revoked_by IS NOT NULL)
    AND (revoked_at IS NULL) = (revoked_by IS NULL)
  )
);

CREATE UNIQUE INDEX enrollments_one_active_user_course_idx
  ON public.enrollments (user_id, course_id) WHERE status = 'active';
CREATE INDEX enrollments_owner_status_idx
  ON public.enrollments (user_id, status, granted_at DESC);
CREATE INDEX enrollments_course_status_idx
  ON public.enrollments (course_id, status, granted_at DESC);
CREATE INDEX enrollments_expiry_idx
  ON public.enrollments (expires_at) WHERE status IN ('active', 'completed') AND expires_at IS NOT NULL;

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.enrollments FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.enrollments TO anon, authenticated;

CREATE POLICY enrollments_select_own
  ON public.enrollments FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT admin_audit_log_target_type_check,
  DROP CONSTRAINT admin_audit_log_target_shape_check,
  DROP CONSTRAINT admin_audit_log_action_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check CHECK (target_type IN (
    'user_role', 'user', 'course', 'course_module', 'lesson', 'lesson_resource', 'enrollment'
  )),
  ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (
    (target_type = 'user_role' AND user_role_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'user' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'course' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NOT NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'course_module' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NOT NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'lesson' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NOT NULL AND lesson_resource_id IS NULL)
    OR (target_type = 'lesson_resource' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NOT NULL)
    OR (target_type = 'enrollment' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NOT NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL)
  ),
  ADD CONSTRAINT admin_audit_log_action_check CHECK (
    action IN (
      'user_role.granted', 'user_role.revoked', 'user.looked_up',
      'course.created', 'course.updated', 'course.status_changed',
      'course.translation_saved', 'course.translation_published', 'course.translation_unpublished',
      'course.instructors_set',
      'course_module.created', 'course_module.updated', 'course_module.reordered',
      'course_module.translation_saved', 'course_module.translation_published', 'course_module.translation_unpublished',
      'lesson.created', 'lesson.updated', 'lesson.reordered', 'lesson.translation_saved',
      'lesson.translation_published', 'lesson.translation_unpublished',
      'lesson_resource.created', 'lesson_resource.translation_saved',
      'lesson_resource.translation_published', 'lesson_resource.translation_unpublished',
      'enrollment.revoked'
    )
  );

CREATE FUNCTION public.learner_grant_free_enrollment(p_course_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_enrollment_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('free_enrollment:' || v_user_id::text || ':' || p_course_id::text)
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = p_course_id AND c.status = 'published' AND c.price_minor = 0
      AND EXISTS (SELECT 1 FROM public.course_translations ct
        WHERE ct.course_id = c.id AND ct.publication_status = 'published')
  ) THEN
    RAISE EXCEPTION 'free published course not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.enrollments
  SET status = 'expired'
  WHERE user_id = v_user_id AND course_id = p_course_id
    AND status = 'active' AND expires_at <= pg_catalog.now();

  SELECT id INTO v_enrollment_id
  FROM public.enrollments
  WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'active'
  FOR UPDATE;
  IF FOUND THEN RETURN v_enrollment_id; END IF;

  INSERT INTO public.enrollments (user_id, course_id, grant_source, granted_by)
  VALUES (v_user_id, p_course_id, 'free', v_user_id)
  RETURNING id INTO v_enrollment_id;
  RETURN v_enrollment_id;
END;
$$;

CREATE FUNCTION public.admin_revoke_enrollment(p_enrollment_id uuid)
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
    (actor_id, action, target_type, course_id, accessed_user_id, safe_summary)
  VALUES
    (v_actor, 'enrollment.revoked', 'enrollment', v_course_id, v_user_id, 'Revoked course enrollment');
END;
$$;

CREATE FUNCTION public.learner_get_lesson(p_lesson_id uuid, p_locale text)
RETURNS TABLE (lesson_id uuid, course_id uuid, lesson_type text, title text, summary text, body text, is_preview boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT l.id, c.id, l.lesson_type, lt.title, lt.summary, lt.body, l.is_preview
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id AND c.status = 'published'
  JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  JOIN public.module_translations mt ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
  JOIN public.lesson_translations lt ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
  WHERE l.id = p_lesson_id AND l.status = 'published'
    AND (l.is_preview OR (v_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = v_user_id AND e.course_id = c.id
        AND e.status IN ('active', 'completed')
        AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.now())
    )));
END;
$$;

CREATE FUNCTION public.learner_get_lesson_resources(p_lesson_id uuid, p_locale text)
RETURNS TABLE (resource_id uuid, kind text, label text, description text, storage_object_key text, external_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT r.id, r.kind, rt.label, rt.description, r.storage_object_key, r.external_url
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id AND c.status = 'published'
  JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  JOIN public.module_translations mt ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
  JOIN public.lesson_translations lt ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
  JOIN public.lesson_resources r ON r.lesson_id = l.id AND (r.locale IS NULL OR r.locale = p_locale)
  JOIN public.lesson_resource_translations rt ON rt.resource_id = r.id AND rt.locale = p_locale AND rt.publication_status = 'published'
  WHERE l.id = p_lesson_id AND l.status = 'published'
    AND (l.is_preview OR (v_user_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = v_user_id AND e.course_id = c.id
        AND e.status IN ('active', 'completed')
        AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.now())
    )));
END;
$$;

REVOKE ALL ON FUNCTION public.learner_grant_free_enrollment(uuid),
  public.admin_revoke_enrollment(uuid), public.learner_get_lesson(uuid, text),
  public.learner_get_lesson_resources(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.learner_grant_free_enrollment(uuid),
  public.learner_get_lesson(uuid, text), public.learner_get_lesson_resources(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.learner_get_lesson(uuid, text),
  public.learner_get_lesson_resources(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_enrollment(uuid) TO authenticated;

