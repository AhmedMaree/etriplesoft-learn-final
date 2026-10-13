-- Preview lessons: issue signed playback to any authenticated user, matching learner_get_lesson,
-- which already returns a published preview lesson without an enrollment. Every other rule is
-- unchanged: published exact-locale ancestry, ready neutral asset, reviewed required captions,
-- and an active, unexpired enrollment for non-preview lessons.

CREATE OR REPLACE FUNCTION public.mux_get_lesson_playback(p_lesson_id uuid, p_locale text)
RETURNS TABLE (mux_playback_id text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  SELECT v.mux_playback_id
  FROM public.lesson_videos v
  JOIN public.lessons l ON l.id = v.lesson_id AND l.lesson_type = 'video' AND l.status = 'published'
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id AND c.status = 'published'
  JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  JOIN public.module_translations mt ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
  JOIN public.lesson_translations lt ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
  WHERE v.lesson_id = p_lesson_id AND v.locale IS NULL AND v.status = 'ready'
    AND v.mux_playback_id IS NOT NULL
    AND (l.is_preview OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = v_user_id AND e.course_id = c.id
        AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.now())
    ))
    AND v.required_caption_locales <@ ARRAY(
      SELECT DISTINCT caption.locale FROM public.lesson_video_captions caption
      WHERE caption.video_id = v.id AND caption.review_status = 'reviewed'
    )
  ORDER BY v.created_at DESC
  LIMIT 1;
END;
$$;
