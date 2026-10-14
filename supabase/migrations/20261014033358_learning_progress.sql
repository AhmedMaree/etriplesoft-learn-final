-- Progress is enrollment-scoped. Public callers can read their own history, but only
-- constrained RPCs mutate it. Sessions/intervals are private and use database time.
CREATE TABLE public.lesson_progress (
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started','completed')),
  percent integer NOT NULL DEFAULT 0 CHECK (percent BETWEEN 0 AND 100),
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (enrollment_id,lesson_id),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE TABLE public.video_progress (
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
  lesson_video_id uuid NOT NULL REFERENCES public.lesson_videos(id) ON DELETE RESTRICT,
  position_seconds numeric NOT NULL DEFAULT 0 CHECK (position_seconds >= 0 AND position_seconds <> 'NaN'::numeric),
  watched_seconds integer NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),
  completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (enrollment_id,lesson_video_id),
  CHECK (position_seconds <= duration_seconds AND watched_seconds <= duration_seconds)
);
CREATE INDEX lesson_progress_recent_idx ON public.lesson_progress(enrollment_id,updated_at DESC);
CREATE INDEX lesson_progress_lesson_idx ON public.lesson_progress(lesson_id,enrollment_id);
CREATE INDEX video_progress_recent_idx ON public.video_progress(enrollment_id,updated_at DESC);
CREATE INDEX video_progress_video_idx ON public.video_progress(lesson_video_id,enrollment_id);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lesson_progress,public.video_progress FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.lesson_progress,public.video_progress TO authenticated;
CREATE POLICY lesson_progress_owner ON public.lesson_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id=enrollment_id AND e.user_id=(SELECT auth.uid())));
CREATE POLICY video_progress_owner ON public.video_progress FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id=enrollment_id AND e.user_id=(SELECT auth.uid())));

CREATE TABLE learning_private.video_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL, lesson_video_id uuid NOT NULL,
  last_position numeric NOT NULL, last_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_sequence integer NOT NULL DEFAULT 0, was_playing boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '2 hours'),
  FOREIGN KEY (enrollment_id,lesson_video_id) REFERENCES public.video_progress(enrollment_id,lesson_video_id) ON DELETE RESTRICT
);
CREATE INDEX video_sessions_progress_idx ON learning_private.video_sessions(enrollment_id,lesson_video_id);
CREATE TABLE learning_private.watched_intervals (
  enrollment_id uuid NOT NULL, lesson_video_id uuid NOT NULL,
  intervals int4multirange NOT NULL DEFAULT '{}'::int4multirange,
  PRIMARY KEY(enrollment_id,lesson_video_id),
  FOREIGN KEY(enrollment_id,lesson_video_id) REFERENCES public.video_progress(enrollment_id,lesson_video_id) ON DELETE RESTRICT
);
ALTER TABLE learning_private.video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_private.watched_intervals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON learning_private.video_sessions,learning_private.watched_intervals FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.learner_start_video_session(p_lesson_id uuid,p_locale text)
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
  SELECT v.* INTO v_video FROM public.lesson_videos v JOIN public.mux_get_lesson_playback(p_lesson_id,p_locale) access
    ON access.mux_playback_id=v.mux_playback_id WHERE v.duration_seconds>0;
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

CREATE FUNCTION public.learner_checkpoint_video(p_session_id uuid,p_locale text,p_sequence integer,p_position numeric,p_playing boolean)
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
  IF NOT EXISTS(SELECT 1 FROM public.mux_get_lesson_playback(v_video.lesson_id,p_locale) a WHERE a.mux_playback_id=v_video.mux_playback_id)
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
REVOKE ALL ON FUNCTION public.learner_start_video_session(uuid,text),public.learner_checkpoint_video(uuid,text,integer,numeric,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_start_video_session(uuid,text),public.learner_checkpoint_video(uuid,text,integer,numeric,boolean) TO authenticated;
