-- Instructors schedule events for their own courses.
-- Product approval: user request 2026-10-19 (extends D11: the instructor role now also covers course
-- scheduling, alongside lesson videos). A caller may schedule, cancel and list events for a course when
-- they are an MFA-verified administrator (public.assert_active_admin) OR hold an active `instructor`
-- role AND are linked to that course in course_instructors. Either condition alone is not enough for an
-- instructor: the role without the course link, or the course link (attribution) without the role,
-- grants nothing. Instructors keep no other administrative access.

CREATE FUNCTION learning_private.is_course_instructor(p_course_id uuid, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user AND r.role = 'instructor' AND r.revoked_at IS NULL)
  AND EXISTS(SELECT 1 FROM public.course_instructors ci WHERE ci.course_id = p_course_id AND ci.profile_id = p_user);
$$;

-- Returns the acting user or raises 42501. Administrators go through the shared admin check, so they
-- still need an MFA-verified session.
CREATE FUNCTION learning_private.assert_course_scheduler(p_course_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = actor AND r.role = 'admin' AND r.revoked_at IS NULL) THEN
  RETURN public.assert_active_admin();
 END IF;
 IF learning_private.is_course_instructor(p_course_id, actor) THEN RETURN actor; END IF;
 RAISE EXCEPTION 'course scheduling permission required' USING ERRCODE = '42501';
END $$;

CREATE OR REPLACE FUNCTION public.admin_create_course_event(p_course_id uuid, p_kind text, p_lesson_id uuid, p_starts_at timestamptz,
 p_ends_at timestamptz, p_meeting_url text, p_title_en text, p_title_ar text, p_description_en text, p_description_ar text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := learning_private.assert_course_scheduler(p_course_id); v_id uuid;
 v_title_en text := nullif(btrim(coalesce(p_title_en, '')), ''); v_title_ar text := nullif(btrim(coalesce(p_title_ar, '')), '');
 v_desc_en text := nullif(btrim(coalesce(p_description_en, '')), ''); v_desc_ar text := nullif(btrim(coalesce(p_description_ar, '')), '');
 v_url text := nullif(btrim(coalesce(p_meeting_url, '')), '');
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('live_session','office_hours','workshop','deadline','quiz')
  OR p_starts_at IS NULL OR p_starts_at < now() - interval '1 hour' OR p_starts_at > now() + interval '2 years'
  OR (v_title_en IS NULL AND v_title_ar IS NULL)
  OR char_length(coalesce(v_title_en, '')) > 160 OR char_length(coalesce(v_title_ar, '')) > 160
  OR char_length(coalesce(v_desc_en, '')) > 2000 OR char_length(coalesce(v_desc_ar, '')) > 2000
  OR (v_desc_en IS NOT NULL AND v_title_en IS NULL) OR (v_desc_ar IS NOT NULL AND v_title_ar IS NULL)
 THEN RAISE EXCEPTION 'invalid course event' USING ERRCODE = '22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.courses c WHERE c.id = p_course_id) THEN
  RAISE EXCEPTION 'course not found' USING ERRCODE = 'P0002'; END IF;
 IF p_lesson_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
  WHERE l.id = p_lesson_id AND m.course_id = p_course_id) THEN
  RAISE EXCEPTION 'lesson is not part of the course' USING ERRCODE = '22023'; END IF;
 INSERT INTO public.course_events(course_id, kind, lesson_id, starts_at, ends_at, meeting_url, created_by)
 VALUES (p_course_id, p_kind, p_lesson_id, p_starts_at, CASE WHEN p_kind IN ('deadline','quiz') THEN NULL ELSE p_ends_at END, v_url, actor)
 RETURNING id INTO v_id;
 INSERT INTO public.course_event_translations(event_id, locale, title, description)
 SELECT v_id, t.locale, t.title, t.description FROM (VALUES ('en', v_title_en, v_desc_en), ('ar', v_title_ar, v_desc_ar)) t(locale, title, description)
 WHERE t.title IS NOT NULL;
 PERFORM learning_private.notify_course_learners(p_course_id, v_id, 'event_scheduled', 'event-scheduled:' || v_id);
 PERFORM public.write_course_audit(actor, 'course.event_scheduled', p_course_id, 'Scheduled a ' || replace(p_kind, '_', ' '));
 RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_cancel_course_event(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid; v_course uuid; v_event public.course_events;
BEGIN
 SELECT e.course_id INTO v_course FROM public.course_events e WHERE e.id = p_id;
 -- Unknown ids and other instructors' events answer the same way, so ids cannot be probed.
 IF v_course IS NULL THEN
  IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role IN ('admin','instructor') AND r.revoked_at IS NULL)
  THEN RAISE EXCEPTION 'course scheduling permission required' USING ERRCODE = '42501'; END IF;
  RAISE EXCEPTION 'event not found' USING ERRCODE = 'P0002';
 END IF;
 actor := learning_private.assert_course_scheduler(v_course);
 UPDATE public.course_events SET status = 'cancelled', cancelled_at = clock_timestamp()
 WHERE id = p_id AND status = 'scheduled' RETURNING * INTO v_event;
 IF v_event.id IS NULL THEN RETURN; END IF;
 IF coalesce(v_event.ends_at, v_event.starts_at) > now() THEN
  PERFORM learning_private.notify_course_learners(v_event.course_id, v_event.id, 'event_cancelled', 'event-cancelled:' || v_event.id);
 END IF;
 PERFORM public.write_course_audit(actor, 'course.event_cancelled', v_event.course_id, 'Cancelled a ' || replace(v_event.kind, '_', ' '));
END $$;

-- Administrators see every course's events; instructors see only their assigned courses.
CREATE OR REPLACE FUNCTION public.admin_list_course_events(p_locale text)
RETURNS TABLE(id uuid, course_id uuid, course_slug text, course_title text, kind text, lesson_id uuid, starts_at timestamptz,
 ends_at timestamptz, meeting_url text, status text, title_en text, title_ar text, learner_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_admin boolean := false;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = actor AND r.role = 'admin' AND r.revoked_at IS NULL) THEN
  PERFORM public.assert_active_admin();
  v_admin := true;
 ELSIF NOT EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = actor AND r.role = 'instructor' AND r.revoked_at IS NULL) THEN
  RAISE EXCEPTION 'course scheduling permission required' USING ERRCODE = '42501';
 END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
 RETURN QUERY SELECT ev.id, ev.course_id, c.slug, ct.title, ev.kind, ev.lesson_id, ev.starts_at, ev.ends_at, ev.meeting_url, ev.status,
  en.title, ar.title,
  (SELECT count(DISTINCT e.user_id)::integer FROM public.enrollments e WHERE e.course_id = ev.course_id
    AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at > now()))
 FROM public.course_events ev JOIN public.courses c ON c.id = ev.course_id
 LEFT JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale
 LEFT JOIN public.course_event_translations en ON en.event_id = ev.id AND en.locale = 'en'
 LEFT JOIN public.course_event_translations ar ON ar.event_id = ev.id AND ar.locale = 'ar'
 WHERE coalesce(ev.ends_at, ev.starts_at) >= now() - interval '30 days'
  AND (v_admin OR learning_private.is_course_instructor(ev.course_id, actor))
 ORDER BY (coalesce(ev.ends_at, ev.starts_at) < now()), ev.starts_at, ev.id
 LIMIT 300;
END $$;

-- Courses the caller may schedule for, with each course's assessment lessons for linking a quiz or
-- deadline. Published courses only. Returns no rows (rather than an error) for everyone else, so the
-- learner shell can use it to decide whether to show the schedule link.
CREATE FUNCTION public.staff_list_schedulable_courses(p_locale text)
RETURNS TABLE(id uuid, slug text, title text, lessons jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
 v_admin boolean := actor IS NOT NULL AND (SELECT auth.jwt() ->> 'aal') IS NOT DISTINCT FROM 'aal2'
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = actor AND r.role = 'admin' AND r.revoked_at IS NULL);
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
 RETURN QUERY SELECT c.id, c.slug, ct.title,
  coalesce((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'title', coalesce(lt.title, '')) ORDER BY m.position, l.position)
   FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
   LEFT JOIN public.lesson_translations lt ON lt.lesson_id = l.id AND lt.locale = p_locale
   WHERE m.course_id = c.id AND l.lesson_type = 'assessment'), '[]'::jsonb)
 FROM public.courses c
 LEFT JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale
 WHERE c.status = 'published' AND (v_admin OR learning_private.is_course_instructor(c.id, actor))
 ORDER BY coalesce(ct.title, c.slug)
 LIMIT 200;
END $$;

REVOKE ALL ON FUNCTION learning_private.is_course_instructor(uuid,uuid), learning_private.assert_course_scheduler(uuid)
 FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.staff_list_schedulable_courses(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.staff_list_schedulable_courses(text) TO authenticated;
