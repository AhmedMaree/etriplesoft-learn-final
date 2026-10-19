-- Sequential learning: a learner opens a lesson only after every required lesson before it is
-- completed, so each module stays locked until the previous module is finished. A required
-- assessment (the course's final assessment) waits for every required lesson in the course.
-- "Required" matches learner_evaluate_completion: published lessons flagged required inside
-- required modules. Optional lessons (practice checks, extras) and assessments never block later
-- lessons, so a required assessment placed mid-course cannot deadlock with the lessons after it.
-- Exempt: current admins (full access without enrollment), preview lessons (public samples),
-- and lessons the learner already started, so curriculum edits never strand in-flight work.
-- Every entitlement path (video playback, progress sessions, quiz actions, reading completion,
-- resource downloads) goes through learner_get_lesson, so this rule is enforced there.
CREATE FUNCTION learning_private.lesson_unlocked(p_lesson_id uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  WITH target AS (
    SELECT l.id, l.lesson_type, l.is_preview, l.is_required AND m.is_required AS required,
      m.course_id, m.position AS module_position, l.position AS lesson_position
    FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id
  ), enrollment AS (
    SELECT e.id FROM public.enrollments e JOIN target t ON t.course_id = e.course_id
    WHERE e.user_id = p_user AND e.status IN ('active', 'completed')
      AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.now())
    ORDER BY e.granted_at DESC LIMIT 1
  )
  SELECT p_user IS NOT NULL AND EXISTS (SELECT 1 FROM target) AND (
    EXISTS (SELECT 1 FROM public.user_roles r
      WHERE r.user_id = p_user AND r.role = 'admin' AND r.revoked_at IS NULL)
    OR (SELECT t.is_preview FROM target t)
    OR EXISTS (SELECT 1 FROM public.lesson_progress p JOIN enrollment e ON e.id = p.enrollment_id
      WHERE p.lesson_id = p_lesson_id)
    OR (EXISTS (SELECT 1 FROM enrollment) AND NOT EXISTS (
      SELECT 1 FROM target t
      JOIN public.course_modules m ON m.course_id = t.course_id AND m.is_required
      JOIN public.lessons l ON l.module_id = m.id AND l.is_required AND l.status = 'published'
        AND l.lesson_type <> 'assessment'
      WHERE l.id <> t.id
        AND ((m.position, l.position) < (t.module_position, t.lesson_position)
          OR (t.lesson_type = 'assessment' AND t.required))
        AND NOT EXISTS (SELECT 1 FROM public.lesson_progress p JOIN enrollment e ON e.id = p.enrollment_id
          WHERE p.lesson_id = l.id AND p.status = 'completed')))
  );
$$;
REVOKE ALL ON FUNCTION learning_private.lesson_unlocked(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

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
    AND (l.is_preview OR learning_private.lesson_unlocked(l.id, v_user_id));
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
    AND (l.is_preview OR learning_private.lesson_unlocked(l.id, v_user_id));
END;
$$;

-- Course-level resource list: same visibility as learner_get_lesson_resources, so it never lists
-- a file whose download would be refused.
CREATE OR REPLACE FUNCTION public.learner_list_course_resources(p_course_id uuid,p_locale text)
RETURNS TABLE(resource_id uuid,lesson_id uuid,lesson_title text,kind text,label text,description text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();BEGIN
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE='22023';END IF;
 RETURN QUERY
 SELECT r.id,l.id,lt.title,r.kind,rt.label,rt.description
 FROM public.lessons l
 JOIN public.course_modules m ON m.id=l.module_id
 JOIN public.courses c ON c.id=m.course_id AND c.status='published'
 JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale AND ct.publication_status='published'
 JOIN public.module_translations mt ON mt.module_id=m.id AND mt.locale=p_locale AND mt.publication_status='published'
 JOIN public.lesson_translations lt ON lt.lesson_id=l.id AND lt.locale=p_locale AND lt.publication_status='published'
 JOIN public.lesson_resources r ON r.lesson_id=l.id AND (r.locale IS NULL OR r.locale=p_locale)
 JOIN public.lesson_resource_translations rt ON rt.resource_id=r.id AND rt.locale=p_locale AND rt.publication_status='published'
 WHERE c.id=p_course_id AND l.status='published' AND (l.is_preview OR learning_private.lesson_unlocked(l.id,actor))
 ORDER BY m.position,l.position,r.position;
END $$;

-- Which of a course's published lessons the caller may open now; drives lock icons in the UI.
CREATE FUNCTION public.learner_unlocked_lessons(p_course_id uuid)
RETURNS TABLE(lesson_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 RETURN QUERY SELECT l.id FROM public.lessons l
 JOIN public.course_modules m ON m.id=l.module_id
 JOIN public.courses c ON c.id=m.course_id AND c.status='published'
 WHERE c.id=p_course_id AND l.status='published' AND learning_private.lesson_unlocked(l.id,actor);
END $$;

-- Assessment directory: administrators see every published assessment without enrolling.
CREATE OR REPLACE FUNCTION public.learner_list_assessments(p_locale text)
RETURNS TABLE(lesson_id uuid,course_slug text,course_title text,title text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023'; END IF;
 RETURN QUERY SELECT l.id,c.slug,ct.title,lt.title FROM public.lessons l
 JOIN public.course_modules m ON m.id=l.module_id
 JOIN public.courses c ON c.id=m.course_id AND c.status='published'
 JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale AND ct.publication_status='published'
 JOIN public.module_translations mt ON mt.module_id=m.id AND mt.locale=p_locale AND mt.publication_status='published'
 JOIN public.lesson_translations lt ON lt.lesson_id=l.id AND lt.locale=p_locale AND lt.publication_status='published'
 WHERE l.status='published' AND l.lesson_type='assessment' AND (
  EXISTS(SELECT 1 FROM public.enrollments e WHERE e.course_id=c.id AND e.user_id=auth.uid() AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now()))
  OR EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role='admin' AND r.revoked_at IS NULL))
 ORDER BY c.slug,m.position,l.position LIMIT 100;
END $$;

REVOKE ALL ON FUNCTION public.learner_unlocked_lessons(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_unlocked_lessons(uuid) TO authenticated;
