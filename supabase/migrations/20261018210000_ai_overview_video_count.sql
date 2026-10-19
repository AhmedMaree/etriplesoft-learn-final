-- Admin AI index overview: count only the videos that are transcribed. A lesson that has both a Bunny
-- video and an older Mux copy is transcribed once (from Bunny), so the Mux copy is not counted.
CREATE OR REPLACE FUNCTION public.admin_ai_index_overview()
RETURNS TABLE(course_id uuid,slug text,title text,status text,videos integer,transcribed_videos integer,chunk_count integer,source_count integer,embedding_model text,indexed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY
  WITH counted AS (
   SELECT m.course_id AS course, v.id AS video_id, coalesce(v.bunny_video_id,v.mux_asset_id) AS provider_video_id
   FROM public.lesson_videos v JOIN public.lessons l ON l.id=v.lesson_id JOIN public.course_modules m ON m.id=l.module_id
   WHERE v.status='ready' AND l.status='published' AND l.lesson_type<>'assessment'
    AND NOT (v.provider='mux' AND EXISTS(SELECT 1 FROM public.lesson_videos b WHERE b.lesson_id=v.lesson_id AND b.provider='bunny' AND b.status='ready'))
  )
  SELECT c.id,c.slug,
   coalesce((SELECT ct.title FROM public.course_translations ct WHERE ct.course_id=c.id ORDER BY (ct.locale='en') DESC LIMIT 1),c.slug),
   c.status,
   (SELECT count(*)::integer FROM counted k WHERE k.course=c.id),
   (SELECT count(*)::integer FROM counted k JOIN ai_private.video_transcripts t ON t.lesson_video_id=k.video_id AND t.provider_video_id=k.provider_video_id WHERE k.course=c.id),
   (SELECT count(*)::integer FROM ai_private.course_chunks ch WHERE ch.course_id=c.id),
   s.source_count,s.embedding_model,s.indexed_at
  FROM public.courses c LEFT JOIN ai_private.course_index_state s ON s.course_id=c.id
  WHERE c.status='published' ORDER BY c.slug LIMIT 200;
END $$;
REVOKE ALL ON FUNCTION public.admin_ai_index_overview() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_ai_index_overview() TO authenticated;
