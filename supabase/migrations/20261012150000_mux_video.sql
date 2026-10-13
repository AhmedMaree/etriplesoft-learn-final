-- Phase 11: protected Mux video metadata, upload authorization and lifecycle processing.
-- Video files stay in Mux. Browser clients receive only short-lived upload URLs or playback JWTs.

CREATE TABLE public.lesson_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons (id) ON DELETE RESTRICT,
  locale text,
  mux_upload_id text UNIQUE,
  mux_asset_id text UNIQUE,
  mux_playback_id text UNIQUE,
  status text NOT NULL DEFAULT 'creating_upload',
  required_caption_locales text[] NOT NULL DEFAULT '{}',
  duration_seconds integer,
  aspect_ratio text,
  resolution_tier text,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT lesson_videos_locale_check CHECK (locale IS NULL OR locale IN ('en', 'ar')),
  CONSTRAINT lesson_videos_status_check CHECK (status IN (
    'creating_upload', 'waiting_for_upload', 'asset_created', 'preparing', 'ready',
    'errored', 'cancelled', 'timed_out', 'upload_failed'
  )),
  CONSTRAINT lesson_videos_caption_locales_check CHECK (
    required_caption_locales <@ ARRAY['en', 'ar']::text[]
    AND pg_catalog.cardinality(pg_catalog.array_positions(required_caption_locales, 'en')) <= 1
    AND pg_catalog.cardinality(pg_catalog.array_positions(required_caption_locales, 'ar')) <= 1
  ),
  CONSTRAINT lesson_videos_duration_check CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT lesson_videos_aspect_ratio_check CHECK (aspect_ratio IS NULL OR aspect_ratio ~ '^[0-9]+:[0-9]+$'),
  CONSTRAINT lesson_videos_ready_metadata_check CHECK (status <> 'ready' OR mux_playback_id IS NOT NULL)
);

-- Assets are shared by English/Arabic. Keep the previous ready asset available while a replacement
-- upload is processing; permit only one unfinished upload for a lesson/locale at a time.
CREATE UNIQUE INDEX lesson_videos_one_incomplete_upload_idx
  ON public.lesson_videos (lesson_id, (COALESCE(locale, '')))
  WHERE status IN ('creating_upload', 'waiting_for_upload', 'asset_created', 'preparing');
CREATE INDEX lesson_videos_lesson_id_idx ON public.lesson_videos (lesson_id);
CREATE INDEX lesson_videos_created_by_idx ON public.lesson_videos (created_by);
CREATE INDEX lesson_videos_status_updated_idx
  ON public.lesson_videos (status, updated_at DESC);
CREATE TRIGGER lesson_videos_set_updated_at BEFORE UPDATE ON public.lesson_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lesson_videos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lesson_videos FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.lesson_video_captions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.lesson_videos (id) ON DELETE RESTRICT,
  locale text NOT NULL,
  mux_track_id text NOT NULL UNIQUE,
  review_status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT lesson_video_captions_locale_check CHECK (locale IN ('en', 'ar')),
  CONSTRAINT lesson_video_captions_status_check CHECK (review_status IN ('pending', 'reviewed', 'errored')),
  CONSTRAINT lesson_video_captions_review_pair_check CHECK (
    (review_status = 'reviewed' AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    OR (review_status IN ('pending', 'errored') AND reviewed_at IS NULL AND reviewed_by IS NULL)
  )
);
ALTER TABLE public.lesson_video_captions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.lesson_video_captions FROM PUBLIC, anon, authenticated, service_role;
CREATE INDEX lesson_video_captions_video_review_locale_idx
  ON public.lesson_video_captions (video_id, review_status, locale);
CREATE INDEX lesson_video_captions_reviewed_by_idx
  ON public.lesson_video_captions (reviewed_by) WHERE reviewed_by IS NOT NULL;
CREATE TRIGGER lesson_video_captions_set_updated_at BEFORE UPDATE ON public.lesson_video_captions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.mux_webhook_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT pg_catalog.now()
);
ALTER TABLE public.mux_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.mux_webhook_events FROM PUBLIC, anon, authenticated, service_role;

-- Add a typed target to the append-only audit record for authorized uploads.
ALTER TABLE public.admin_audit_log
  ADD COLUMN lesson_video_id uuid REFERENCES public.lesson_videos (id) ON DELETE RESTRICT;
CREATE INDEX admin_audit_log_video_occurred_at_idx
  ON public.admin_audit_log (lesson_video_id, occurred_at DESC) WHERE lesson_video_id IS NOT NULL;
ALTER TABLE public.admin_audit_log
  DROP CONSTRAINT admin_audit_log_target_type_check,
  DROP CONSTRAINT admin_audit_log_target_shape_check,
  DROP CONSTRAINT admin_audit_log_action_check;
ALTER TABLE public.admin_audit_log
  ADD CONSTRAINT admin_audit_log_target_type_check CHECK (target_type IN (
    'user_role', 'user', 'course', 'course_module', 'lesson', 'lesson_resource', 'enrollment', 'lesson_video'
  )),
  ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (
    (target_type = 'user_role' AND user_role_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL)
    OR (target_type = 'user' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL)
    OR (target_type = 'course' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NOT NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL)
    OR (target_type = 'course_module' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NOT NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL)
    OR (target_type = 'lesson' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NOT NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL)
    OR (target_type = 'lesson_resource' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NOT NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL)
    OR (target_type = 'enrollment' AND user_role_id IS NULL AND accessed_user_id IS NOT NULL AND course_id IS NOT NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NOT NULL AND lesson_video_id IS NULL)
    OR (target_type = 'lesson_video' AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NOT NULL)
  ),
  ADD CONSTRAINT admin_audit_log_action_check CHECK (
    action IN (
      'user_role.granted', 'user_role.revoked', 'user.looked_up',
      'course.created', 'course.updated', 'course.status_changed', 'course.translation_saved',
      'course.translation_published', 'course.translation_unpublished', 'course.instructors_set',
      'course_module.created', 'course_module.updated', 'course_module.reordered',
      'course_module.translation_saved', 'course_module.translation_published', 'course_module.translation_unpublished',
      'lesson.created', 'lesson.updated', 'lesson.reordered', 'lesson.translation_saved',
      'lesson.translation_published', 'lesson.translation_unpublished', 'lesson_resource.created',
      'lesson_resource.translation_saved', 'lesson_resource.translation_published',
      'lesson_resource.translation_unpublished', 'enrollment.revoked', 'lesson_video.upload_started'
    )
  );

CREATE FUNCTION public.mux_begin_lesson_upload(p_lesson_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_video_id uuid;
  v_course_id uuid;
  v_is_admin boolean;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
  SELECT m.course_id INTO v_course_id
  FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id AND l.lesson_type = 'video';
  IF NOT FOUND THEN RAISE EXCEPTION 'video lesson not found' USING ERRCODE = 'P0002'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = v_user_id AND r.role = 'admin' AND r.revoked_at IS NULL
  ) INTO v_is_admin;
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM public.user_roles r
    JOIN public.course_instructors ci ON ci.profile_id = r.user_id AND ci.course_id = v_course_id
    WHERE r.user_id = v_user_id AND r.role = 'instructor' AND r.revoked_at IS NULL
  ) THEN RAISE EXCEPTION 'course upload permission required' USING ERRCODE = '42501'; END IF;

  INSERT INTO public.lesson_videos (lesson_id, created_by)
  VALUES (p_lesson_id, v_user_id)
  RETURNING id INTO v_video_id;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, lesson_video_id, safe_summary)
  VALUES (v_user_id, 'lesson_video.upload_started', 'lesson_video', v_video_id, 'Started authorized lesson video upload');
  RETURN v_video_id;
END;
$$;

CREATE FUNCTION public.mux_attach_upload(p_video_id uuid, p_upload_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL OR p_upload_id IS NULL OR p_upload_id !~ '^[A-Za-z0-9_-]{8,128}$' THEN
    RAISE EXCEPTION 'invalid upload attachment' USING ERRCODE = '22023';
  END IF;
  UPDATE public.lesson_videos v SET mux_upload_id = p_upload_id,
    status = CASE WHEN v.status = 'creating_upload' THEN 'waiting_for_upload' ELSE v.status END
  FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  WHERE v.id = p_video_id AND v.lesson_id = l.id AND v.created_by = v_user_id
    AND ((v.status = 'creating_upload' AND v.mux_upload_id IS NULL)
      OR (v.status IN ('waiting_for_upload', 'asset_created', 'preparing', 'ready') AND v.mux_upload_id = p_upload_id)) AND (
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_user_id AND r.role = 'admin' AND r.revoked_at IS NULL)
      OR EXISTS (
        SELECT 1 FROM public.user_roles r JOIN public.course_instructors ci
          ON ci.profile_id = r.user_id AND ci.course_id = m.course_id
        WHERE r.user_id = v_user_id AND r.role = 'instructor' AND r.revoked_at IS NULL
      )
    );
  IF NOT FOUND THEN RAISE EXCEPTION 'upload intent unavailable' USING ERRCODE = '42501'; END IF;
END;
$$;

CREATE FUNCTION public.mux_fail_lesson_upload(p_video_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
BEGIN
  UPDATE public.lesson_videos SET status = 'upload_failed'
  WHERE id = p_video_id AND created_by = v_user_id AND status = 'creating_upload';
END;
$$;

CREATE FUNCTION public.mux_get_lesson_playback(p_lesson_id uuid, p_locale text)
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
  JOIN public.enrollments e ON e.user_id = v_user_id AND e.course_id = c.id
    AND e.status = 'active' AND (e.expires_at IS NULL OR e.expires_at > pg_catalog.now())
  WHERE v.lesson_id = p_lesson_id AND v.locale IS NULL AND v.status = 'ready'
    AND v.mux_playback_id IS NOT NULL
    AND v.required_caption_locales <@ ARRAY(
      SELECT DISTINCT caption.locale FROM public.lesson_video_captions caption
      WHERE caption.video_id = v.id AND caption.review_status = 'reviewed'
    )
  ORDER BY v.created_at DESC
  LIMIT 1;
END;
$$;

CREATE FUNCTION public.mux_set_caption_requirements(p_video_id uuid, p_locales text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF p_locales IS NULL OR NOT (p_locales <@ ARRAY['en', 'ar']::text[])
    OR pg_catalog.cardinality(pg_catalog.array_positions(p_locales, 'en')) > 1
    OR pg_catalog.cardinality(pg_catalog.array_positions(p_locales, 'ar')) > 1 THEN
    RAISE EXCEPTION 'invalid caption locale requirements' USING ERRCODE = '22023';
  END IF;
  UPDATE public.lesson_videos v SET required_caption_locales = p_locales
  FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  WHERE v.id = p_video_id AND v.lesson_id = l.id AND (
    EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_user_id AND r.role = 'admin' AND r.revoked_at IS NULL)
    OR EXISTS (
      SELECT 1 FROM public.user_roles r JOIN public.course_instructors ci
        ON ci.profile_id = r.user_id AND ci.course_id = m.course_id
      WHERE r.user_id = v_user_id AND r.role = 'instructor' AND r.revoked_at IS NULL
    )
  );
  IF NOT FOUND THEN RAISE EXCEPTION 'video management permission required' USING ERRCODE = '42501'; END IF;
END;
$$;

CREATE FUNCTION public.mux_review_caption(p_video_id uuid, p_locale text, p_track_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') OR p_track_id IS NULL THEN
    RAISE EXCEPTION 'invalid caption review request' USING ERRCODE = '22023';
  END IF;
  UPDATE public.lesson_video_captions caption SET review_status = 'reviewed',
    reviewed_at = pg_catalog.now(), reviewed_by = v_user_id
  FROM public.lesson_videos v JOIN public.lessons l ON l.id = v.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
  WHERE caption.video_id = v.id AND v.id = p_video_id AND caption.locale = p_locale
    AND caption.mux_track_id = p_track_id AND (
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = v_user_id AND r.role = 'admin' AND r.revoked_at IS NULL)
      OR EXISTS (
        SELECT 1 FROM public.user_roles r JOIN public.course_instructors ci
          ON ci.profile_id = r.user_id AND ci.course_id = m.course_id
        WHERE r.user_id = v_user_id AND r.role = 'instructor' AND r.revoked_at IS NULL
      )
    );
  IF NOT FOUND THEN RAISE EXCEPTION 'caption review permission or track unavailable' USING ERRCODE = '42501'; END IF;
END;
$$;

CREATE FUNCTION public.mux_process_webhook(p_event_id text, p_event_type text, p_data jsonb)
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
    UPDATE public.lesson_videos SET status = 'ready', mux_playback_id = v_playback_id,
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

REVOKE ALL ON FUNCTION public.mux_begin_lesson_upload(uuid), public.mux_attach_upload(uuid, text),
  public.mux_fail_lesson_upload(uuid), public.mux_get_lesson_playback(uuid, text), public.mux_set_caption_requirements(uuid, text[]),
  public.mux_review_caption(uuid, text, text), public.mux_process_webhook(text, text, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mux_begin_lesson_upload(uuid), public.mux_attach_upload(uuid, text),
  public.mux_fail_lesson_upload(uuid), public.mux_get_lesson_playback(uuid, text), public.mux_set_caption_requirements(uuid, text[]),
  public.mux_review_caption(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mux_process_webhook(text, text, jsonb) TO service_role;

COMMENT ON TABLE public.lesson_videos IS
  'Mux asset metadata only. Source video bytes remain in Mux; playback IDs are server-only and use signed policy.';
COMMENT ON TABLE public.mux_webhook_events IS
  'Minimal event IDs for idempotent processing; raw webhook payloads and secrets are never persisted.';
