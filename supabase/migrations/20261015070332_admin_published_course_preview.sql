-- Current admins may preview published exact-locale course content without creating
-- learner enrollment, progress, assessment attempts, or payment records.
CREATE OR REPLACE FUNCTION public.learner_get_lesson(p_lesson_id uuid, p_locale text)
RETURNS TABLE (lesson_id uuid, course_id uuid, lesson_type text, title text, summary text, body text, is_preview boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
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
    AND (l.is_preview
      OR (v_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = v_user_id AND e.course_id = c.id
          AND e.status IN ('active', 'completed')
          AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.now())
      ))
      OR (v_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_roles r
        WHERE r.user_id = v_user_id AND r.role = 'admin' AND r.revoked_at IS NULL
      )));
END;
$$;

CREATE OR REPLACE FUNCTION public.learner_get_lesson_resources(p_lesson_id uuid, p_locale text)
RETURNS TABLE (resource_id uuid, kind text, label text, description text, storage_object_key text, external_url text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
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
    AND (l.is_preview
      OR (v_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = v_user_id AND e.course_id = c.id
          AND e.status IN ('active', 'completed')
          AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.now())
      ))
      OR (v_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_roles r
        WHERE r.user_id = v_user_id AND r.role = 'admin' AND r.revoked_at IS NULL
      )));
END;
$$;

-- Separate read-only question projection; learner_quiz_action remains enrollment-bound.
CREATE FUNCTION public.admin_preview_published_quiz(p_lesson_id uuid, p_locale text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_admin uuid := public.assert_active_admin(); v_version uuid; v_enrollment uuid;
BEGIN
  IF p_lesson_id IS NULL OR p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'invalid preview request' USING ERRCODE = '22023';
  END IF;
  SELECT e.id INTO v_enrollment
  FROM public.enrollments e
  WHERE e.user_id = v_admin AND e.course_id = (
    SELECT m.course_id FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id AND l.lesson_type = 'assessment'
  ) AND e.status IN ('active', 'completed')
    AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.clock_timestamp())
  ORDER BY e.granted_at DESC LIMIT 1;
  IF v_enrollment IS NOT NULL THEN RETURN NULL; END IF;

  SELECT v.id INTO v_version
  FROM public.quizzes q
  JOIN public.lessons l ON l.id = q.lesson_id AND l.status = 'published' AND l.lesson_type = 'assessment'
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id AND c.status = 'published'
  JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  JOIN public.module_translations mt ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
  JOIN public.lesson_translations lt ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
  JOIN public.quiz_versions v ON v.quiz_id = q.id AND v.status = 'published'
  JOIN public.quiz_translations qt ON qt.quiz_version_id = v.id AND qt.locale = p_locale
  WHERE l.id = p_lesson_id
  ORDER BY v.version_number DESC LIMIT 1;
  IF v_version IS NULL THEN RETURN NULL; END IF;
  RETURN pg_catalog.jsonb_set(
    assessment_private.projection(v_version, NULL, p_locale),
    '{adminPreview}', 'true'::jsonb, true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_preview_published_quiz(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_preview_published_quiz(uuid, text) TO authenticated;
