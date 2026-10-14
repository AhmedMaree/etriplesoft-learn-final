-- Narrow management projections; existing upload/caption mutations remain authoritative.
CREATE SCHEMA IF NOT EXISTS learning_private;
REVOKE ALL ON SCHEMA learning_private FROM PUBLIC, anon, authenticated;
CREATE FUNCTION learning_private.can_manage_video(p_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = (SELECT auth.uid()) AND r.role = 'admin' AND r.revoked_at IS NULL)
    OR EXISTS (SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
      JOIN public.course_instructors ci ON ci.course_id = m.course_id
      JOIN public.user_roles r ON r.user_id = ci.profile_id
      WHERE l.id = p_lesson_id AND r.user_id = (SELECT auth.uid()) AND r.role = 'instructor' AND r.revoked_at IS NULL)
  );
$$;
REVOKE ALL ON FUNCTION learning_private.can_manage_video(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.mux_list_manageable_lessons(p_locale text)
RETURNS TABLE (lesson_id uuid, course_slug text, course_title text, lesson_title text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
  RETURN QUERY SELECT l.id, c.slug, COALESCE(ct.title, c.slug), COALESCE(lt.title, l.id::text)
  FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  LEFT JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale
  LEFT JOIN public.lesson_translations lt ON lt.lesson_id = l.id AND lt.locale = p_locale
  WHERE l.lesson_type = 'video' AND c.status <> 'archived' AND learning_private.can_manage_video(l.id)
  ORDER BY c.slug, m.position, l.position LIMIT 500;
END;
$$;

CREATE FUNCTION public.mux_get_video_management(p_lesson_id uuid)
RETURNS TABLE (video_id uuid, status text, mux_asset_id text, duration_seconds integer,
  required_caption_locales text[], captions jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT learning_private.can_manage_video(p_lesson_id) THEN RAISE EXCEPTION 'video management denied' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT v.id, v.status, v.mux_asset_id, v.duration_seconds, v.required_caption_locales,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('locale', cc.locale, 'trackId', cc.mux_track_id, 'reviewStatus', cc.review_status))
      FROM public.lesson_video_captions cc WHERE cc.video_id = v.id), '[]'::jsonb)
  FROM public.lesson_videos v WHERE v.lesson_id = p_lesson_id ORDER BY v.created_at DESC LIMIT 10;
END;
$$;
REVOKE ALL ON FUNCTION public.mux_list_manageable_lessons(text), public.mux_get_video_management(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mux_list_manageable_lessons(text), public.mux_get_video_management(uuid) TO authenticated;

-- Completed learners retain their approved entitlement. Preview access still requires login.
CREATE OR REPLACE FUNCTION public.mux_get_lesson_playback(p_lesson_id uuid, p_locale text)
RETURNS TABLE (mux_playback_id text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
  RETURN QUERY SELECT v.mux_playback_id FROM public.learner_get_lesson(p_lesson_id, p_locale) authorized
  JOIN public.lesson_videos v ON v.lesson_id = authorized.lesson_id
  WHERE authorized.lesson_type = 'video' AND v.locale IS NULL AND v.status = 'ready'
    AND v.mux_playback_id IS NOT NULL
    AND v.required_caption_locales <@ ARRAY(SELECT DISTINCT cc.locale FROM public.lesson_video_captions cc
      WHERE cc.video_id = v.id AND cc.review_status = 'reviewed')
  ORDER BY v.created_at DESC LIMIT 1;
END;
$$;
CREATE OR REPLACE FUNCTION public.mux_process_webhook(p_event_id text, p_event_type text, p_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_asset_id text;
  v_upload_id text;
  v_playback_id text;
  v_status text;
  v_duration integer;
  v_aspect text;
  v_resolution text;
BEGIN
  IF p_event_id IS NULL OR p_event_id !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_event_type IS NULL OR pg_catalog.char_length(p_event_type) > 160
    OR p_data IS NULL OR pg_catalog.jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'invalid Mux event' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.mux_webhook_events (id, event_type)
  VALUES (p_event_id, p_event_type) ON CONFLICT (id) DO NOTHING;
  IF NOT FOUND THEN RETURN false; END IF;

  IF p_event_type = 'video.upload.created' THEN
    v_upload_id := p_data->>'id';
    UPDATE public.lesson_videos SET mux_upload_id = v_upload_id, status = 'waiting_for_upload'
    WHERE (mux_upload_id = v_upload_id OR id::text = COALESCE(p_data->>'passthrough', p_data->'new_asset_settings'->>'passthrough'))
      AND status IN ('creating_upload', 'waiting_for_upload');
  ELSIF p_event_type = 'video.upload.asset_created' THEN
    v_upload_id := p_data->>'id';
    v_asset_id := p_data->>'asset_id';
    UPDATE public.lesson_videos SET mux_upload_id = COALESCE(mux_upload_id, v_upload_id),
      mux_asset_id = v_asset_id, status = 'asset_created'
    WHERE (mux_upload_id = v_upload_id OR id::text = COALESCE(p_data->>'passthrough', p_data->'new_asset_settings'->>'passthrough'))
      AND status IN ('creating_upload', 'waiting_for_upload', 'asset_created');
  ELSIF p_event_type IN ('video.upload.cancelled', 'video.upload.timed_out', 'video.upload.errored') THEN
    v_upload_id := p_data->>'id';
    v_status := CASE p_event_type
      WHEN 'video.upload.cancelled' THEN 'cancelled'
      WHEN 'video.upload.timed_out' THEN 'timed_out'
      ELSE 'upload_failed'
    END;
    UPDATE public.lesson_videos SET mux_upload_id = COALESCE(mux_upload_id, v_upload_id), status = v_status
    WHERE (mux_upload_id = v_upload_id OR id::text = COALESCE(p_data->>'passthrough', p_data->'new_asset_settings'->>'passthrough'))
      AND status IN ('creating_upload', 'waiting_for_upload');
  ELSIF p_event_type IN ('video.asset.created', 'video.asset.preparing') THEN
    v_asset_id := p_data->>'id';
    UPDATE public.lesson_videos SET mux_asset_id = v_asset_id, status = 'preparing'
    WHERE (mux_asset_id = v_asset_id OR mux_upload_id = p_data->>'upload_id'
      OR id::text = p_data->>'passthrough') AND status IN ('waiting_for_upload', 'asset_created', 'preparing');
  ELSIF p_event_type = 'video.asset.ready' THEN
    v_asset_id := p_data->>'id';
    SELECT playback->>'id' INTO v_playback_id
    FROM pg_catalog.jsonb_array_elements(COALESCE(p_data->'playback_ids', '[]'::jsonb)) playback
    WHERE playback->>'policy' = 'signed'
    LIMIT 1;
    v_duration := CASE WHEN p_data->>'duration' ~ '^[0-9]+(\.[0-9]+)?$'
      AND (p_data->>'duration')::numeric <= 2147483647
      THEN GREATEST(1, pg_catalog.ceil((p_data->>'duration')::numeric)::integer) ELSE NULL END;
    v_aspect := CASE WHEN p_data->>'aspect_ratio' ~ '^[0-9]+:[0-9]+$' THEN p_data->>'aspect_ratio' ELSE NULL END;
    v_resolution := CASE WHEN p_data->>'resolution_tier' IN ('audio_only', '720p', '1080p', '1440p', '2160p')
      THEN p_data->>'resolution_tier' ELSE NULL END;
    UPDATE public.lesson_videos SET status = 'ready', mux_asset_id = v_asset_id, mux_playback_id = v_playback_id,
      duration_seconds = v_duration, aspect_ratio = v_aspect, resolution_tier = v_resolution
    WHERE (mux_asset_id = v_asset_id OR mux_upload_id = p_data->>'upload_id'
      OR id::text = p_data->>'passthrough') AND v_playback_id IS NOT NULL
      AND status IN ('waiting_for_upload', 'asset_created', 'preparing', 'ready');
    IF FOUND AND pg_catalog.jsonb_typeof(p_data->'tracks') = 'array' THEN
      INSERT INTO public.lesson_video_captions (video_id, locale, mux_track_id)
      SELECT v.id, pg_catalog.left(track->>'language_code', 2), track->>'id'
      FROM public.lesson_videos v
      CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(p_data->'tracks') track
      WHERE v.mux_asset_id = v_asset_id AND track->>'type' = 'text'
        AND pg_catalog.left(track->>'language_code', 2) IN ('en', 'ar')
        AND track->>'id' IS NOT NULL
      ON CONFLICT DO NOTHING;
    END IF;
  ELSIF p_event_type = 'video.asset.track.ready' THEN
    IF p_data->>'type' = 'text' AND pg_catalog.left(p_data->>'language_code', 2) IN ('en', 'ar') THEN
      INSERT INTO public.lesson_video_captions (video_id, locale, mux_track_id)
      SELECT v.id, pg_catalog.left(p_data->>'language_code', 2), p_data->>'id'
      FROM public.lesson_videos v WHERE v.mux_asset_id = p_data->>'asset_id'
        AND p_data->>'id' IS NOT NULL
      ON CONFLICT DO NOTHING;
    END IF;
  ELSIF p_event_type = 'video.asset.track.errored' THEN
    UPDATE public.lesson_video_captions SET review_status = 'errored', reviewed_at = NULL, reviewed_by = NULL
    WHERE mux_track_id = p_data->>'id';
  ELSIF p_event_type = 'video.asset.track.deleted' THEN
    DELETE FROM public.lesson_video_captions WHERE mux_track_id = p_data->>'id';
  ELSIF p_event_type = 'video.asset.errored' THEN
    v_asset_id := p_data->>'id';
    UPDATE public.lesson_videos SET status = 'errored', mux_playback_id = NULL
    WHERE (mux_asset_id = v_asset_id OR mux_upload_id = p_data->>'upload_id'
      OR id::text = p_data->>'passthrough') AND status IN ('asset_created', 'preparing', 'ready');
  END IF;
  RETURN true;
END;
$$;


