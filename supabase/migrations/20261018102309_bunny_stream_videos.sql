-- Bunny Stream as a second lesson video provider. Bunny videos are encoded outside this app and attached
-- by an administrator. Playback and progress still go through the same entitlement and caption checks;
-- the browser only ever receives a short-lived signed embed URL issued after those checks pass.
ALTER TABLE public.lesson_videos
  ADD COLUMN provider text NOT NULL DEFAULT 'mux',
  ADD COLUMN bunny_video_id text UNIQUE;
ALTER TABLE public.lesson_videos
  ADD CONSTRAINT lesson_videos_provider_check CHECK (provider IN ('mux', 'bunny')),
  ADD CONSTRAINT lesson_videos_provider_shape_check CHECK (
    (provider = 'mux' AND bunny_video_id IS NULL)
    OR (provider = 'bunny'
      AND bunny_video_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND mux_upload_id IS NULL AND mux_asset_id IS NULL AND mux_playback_id IS NULL)
  );
ALTER TABLE public.lesson_videos DROP CONSTRAINT lesson_videos_ready_metadata_check;
ALTER TABLE public.lesson_videos ADD CONSTRAINT lesson_videos_ready_metadata_check CHECK (
  status <> 'ready' OR mux_playback_id IS NOT NULL OR (provider = 'bunny' AND duration_seconds IS NOT NULL)
);

-- Provider-neutral authorized lookup. Same rules as mux_get_lesson_playback (which keeps serving Mux-only callers).
CREATE FUNCTION public.learner_get_lesson_video(p_lesson_id uuid, p_locale text)
RETURNS TABLE (video_id uuid, provider text, mux_playback_id text, bunny_video_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
  RETURN QUERY SELECT v.id, v.provider, v.mux_playback_id, v.bunny_video_id
  FROM public.learner_get_lesson(p_lesson_id, p_locale) authorized
  JOIN public.lesson_videos v ON v.lesson_id = authorized.lesson_id
  WHERE authorized.lesson_type = 'video' AND v.locale IS NULL AND v.status = 'ready'
    AND (v.mux_playback_id IS NOT NULL OR v.bunny_video_id IS NOT NULL)
    AND v.required_caption_locales <@ ARRAY(SELECT DISTINCT cc.locale FROM public.lesson_video_captions cc
      WHERE cc.video_id = v.id AND cc.review_status = 'reviewed')
  ORDER BY v.created_at DESC LIMIT 1;
END;
$$;
REVOKE ALL ON FUNCTION public.learner_get_lesson_video(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.learner_get_lesson_video(uuid, text) TO authenticated;

-- Progress sessions follow the authorized video row instead of a Mux playback ID. Bodies are otherwise unchanged.
CREATE OR REPLACE FUNCTION public.learner_start_video_session(p_lesson_id uuid,p_locale text)
RETURNS TABLE(session_id uuid,position_seconds numeric,watched_seconds integer,duration_seconds integer,percent integer,completed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_video public.lesson_videos; v_enrollment uuid; v_course uuid; v_session uuid; v_progress public.video_progress;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT a.course_id INTO v_course FROM public.learner_get_lesson(p_lesson_id,p_locale) a;
  IF v_course IS NULL THEN RAISE EXCEPTION 'lesson access denied' USING ERRCODE='42501'; END IF;
  SELECT e.id INTO v_enrollment FROM public.enrollments e WHERE e.course_id=v_course AND e.user_id=(SELECT auth.uid())
    AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())
    ORDER BY e.granted_at DESC LIMIT 1 FOR UPDATE;
  IF v_enrollment IS NULL THEN RAISE EXCEPTION 'enrollment required for progress' USING ERRCODE='42501'; END IF;
  SELECT v.* INTO v_video FROM public.lesson_videos v JOIN public.learner_get_lesson_video(p_lesson_id,p_locale) access
    ON access.video_id=v.id WHERE v.duration_seconds>0;
  IF v_video.id IS NULL THEN RAISE EXCEPTION 'ready video required' USING ERRCODE='42501'; END IF;
  INSERT INTO public.lesson_progress(enrollment_id,lesson_id) VALUES(v_enrollment,p_lesson_id) ON CONFLICT DO NOTHING;
  INSERT INTO public.video_progress(enrollment_id,lesson_video_id,duration_seconds)
    VALUES(v_enrollment,v_video.id,v_video.duration_seconds) ON CONFLICT DO NOTHING;
  SELECT * INTO v_progress FROM public.video_progress vp WHERE vp.enrollment_id=v_enrollment AND vp.lesson_video_id=v_video.id FOR UPDATE;
  -- Starting a new tab supersedes older sessions for this video. No two tabs can multiply credit.
  UPDATE learning_private.video_sessions s SET expires_at=clock_timestamp() WHERE s.enrollment_id=v_enrollment AND s.lesson_video_id=v_video.id;
  INSERT INTO learning_private.video_sessions(enrollment_id,lesson_video_id,last_position)
    VALUES(v_enrollment,v_video.id,v_progress.position_seconds) RETURNING id INTO v_session;
  INSERT INTO learning_private.watched_intervals(enrollment_id,lesson_video_id) VALUES(v_enrollment,v_video.id) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT v_session,v_progress.position_seconds,v_progress.watched_seconds,v_progress.duration_seconds,
    LEAST(100,(100::bigint*v_progress.watched_seconds/v_progress.duration_seconds)::integer),v_progress.completed_at IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.learner_checkpoint_video(p_session_id uuid,p_locale text,p_sequence integer,p_position numeric,p_playing boolean)
RETURNS TABLE(position_seconds numeric,watched_seconds integer,duration_seconds integer,percent integer,completed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE s learning_private.video_sessions; v_progress public.video_progress; v_video public.lesson_videos;
  v_now timestamptz:=clock_timestamp(); v_elapsed numeric; v_delta numeric; v_intervals int4multirange; v_watched integer; v_completed boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
  SELECT * INTO s FROM learning_private.video_sessions vs WHERE vs.id=p_session_id FOR UPDATE;
  IF s.id IS NULL OR s.expires_at<=v_now OR NOT EXISTS(SELECT 1 FROM public.enrollments e
    WHERE e.id=s.enrollment_id AND e.user_id=(SELECT auth.uid()) AND e.status IN ('active','completed')
      AND (e.expires_at IS NULL OR e.expires_at>v_now)) THEN RAISE EXCEPTION 'session access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_video FROM public.lesson_videos v WHERE v.id=s.lesson_video_id;
  IF NOT EXISTS(SELECT 1 FROM public.learner_get_lesson_video(v_video.lesson_id,p_locale) a WHERE a.video_id=v_video.id)
    THEN RAISE EXCEPTION 'video access revoked' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_progress FROM public.video_progress vp WHERE vp.enrollment_id=s.enrollment_id AND vp.lesson_video_id=s.lesson_video_id FOR UPDATE;
  IF p_sequence IS NULL OR p_sequence<=0 OR p_position IS NULL OR p_position='NaN'::numeric
    OR p_position<0 OR p_position>v_progress.duration_seconds OR p_playing IS NULL
    THEN RAISE EXCEPTION 'invalid checkpoint' USING ERRCODE='22023'; END IF;
  IF p_sequence>s.last_sequence THEN
    v_elapsed:=EXTRACT(epoch FROM v_now-s.last_at); v_delta:=p_position-s.last_position;
    SELECT wi.intervals INTO v_intervals FROM learning_private.watched_intervals wi
      WHERE wi.enrollment_id=s.enrollment_id AND wi.lesson_video_id=s.lesson_video_id FOR UPDATE;
    -- Support up to 2x speed. Pauses/seeks reset the baseline. Long gaps earn no credit.
    IF s.was_playing AND p_playing AND v_elapsed BETWEEN 0.5 AND 30 AND v_delta>0 AND v_delta<=v_elapsed*2+0.5 THEN
      v_intervals:=v_intervals+int4multirange(int4range(floor(s.last_position)::integer,floor(p_position)::integer,'[)'));
    END IF;
    SELECT COALESCE(sum(upper(r)-lower(r)),0)::integer INTO v_watched FROM unnest(v_intervals) r;
    v_completed:=v_watched::numeric/v_progress.duration_seconds>=0.9;
    UPDATE learning_private.watched_intervals wi SET intervals=v_intervals WHERE wi.enrollment_id=s.enrollment_id AND wi.lesson_video_id=s.lesson_video_id;
    UPDATE learning_private.video_sessions vs SET last_position=p_position,last_at=v_now,last_sequence=p_sequence,was_playing=p_playing WHERE vs.id=s.id;
    UPDATE public.video_progress vp SET position_seconds=p_position,watched_seconds=v_watched,
      completed_at=CASE WHEN v_completed THEN COALESCE(vp.completed_at,v_now) ELSE vp.completed_at END,updated_at=v_now
      WHERE vp.enrollment_id=s.enrollment_id AND vp.lesson_video_id=s.lesson_video_id RETURNING * INTO v_progress;
    UPDATE public.lesson_progress lp SET percent=LEAST(100,(100::bigint*v_watched/v_progress.duration_seconds)::integer),
      status=CASE WHEN v_completed OR lp.status='completed' THEN 'completed' ELSE 'started' END,
      completed_at=CASE WHEN v_completed THEN COALESCE(lp.completed_at,v_now) ELSE lp.completed_at END,updated_at=v_now
      WHERE lp.enrollment_id=s.enrollment_id AND lp.lesson_id=v_video.lesson_id;
  END IF;
  RETURN QUERY SELECT v_progress.position_seconds,v_progress.watched_seconds,v_progress.duration_seconds,
    LEAST(100,(100::bigint*v_progress.watched_seconds/v_progress.duration_seconds)::integer),v_progress.completed_at IS NOT NULL;
END;
$$;

-- Administrators attach an already-encoded Bunny video (GUID + duration read from the Bunny API) to a video
-- lesson. Idempotent per Bunny video; one Bunny video can never serve two lessons.
CREATE FUNCTION public.admin_attach_bunny_video(p_lesson_id uuid, p_bunny_video_id text, p_duration_seconds integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := public.assert_active_admin(); v_id uuid; v_lesson uuid;
BEGIN
  IF p_bunny_video_id IS NULL OR p_bunny_video_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'invalid Bunny video' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.lessons WHERE id = p_lesson_id AND lesson_type = 'video' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'video lesson required' USING ERRCODE = '23514'; END IF;
  SELECT v.id, v.lesson_id INTO v_id, v_lesson FROM public.lesson_videos v WHERE v.bunny_video_id = p_bunny_video_id;
  IF v_id IS NOT NULL THEN
    IF v_lesson <> p_lesson_id THEN RAISE EXCEPTION 'Bunny video already attached to another lesson' USING ERRCODE = '23505'; END IF;
    RETURN v_id;
  END IF;
  INSERT INTO public.lesson_videos (lesson_id, provider, bunny_video_id, status, duration_seconds, created_by)
    VALUES (p_lesson_id, 'bunny', p_bunny_video_id, 'ready', p_duration_seconds, actor) RETURNING id INTO v_id;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_id, safe_summary)
    VALUES (actor, 'lesson.updated', 'lesson', p_lesson_id, 'Attached Bunny Stream video');
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_attach_bunny_video(uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_attach_bunny_video(uuid, text, integer) TO authenticated;
