CREATE FUNCTION public.learner_list_assessments(p_locale text)
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
 WHERE l.status='published' AND l.lesson_type='assessment' AND EXISTS(SELECT 1 FROM public.enrollments e WHERE e.course_id=c.id AND e.user_id=auth.uid() AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())) ORDER BY c.slug,m.position,l.position LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.learner_list_assessments(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_list_assessments(text) TO authenticated;
