-- Private messages between a learner and the people who teach or support them.
-- Product approval: user request 2026-10-19 (activates Phase 26 / D22 for messages; community stays deferred).
--
-- * message_threads: every conversation belongs to exactly one learner and has a topic:
--   - 'course'  : about one course the learner is entitled to. Answered by that course's instructors
--                 (active `instructor` role AND a course_instructors link) and by administrators.
--   - 'support' : the ETripleSoft team. Answered by administrators.
--   Learners cannot message other learners, and staff cannot start a thread with a learner, so no
--   roster, email address or user id is ever exposed. Participants see display names only.
-- * thread_messages: append-only bodies (no edit or delete in V1; the history is the support record).
--   is_staff is a server snapshot of whether the sender answered as staff.
-- * message_thread_reads: per-participant read position, so every staff member has their own unread state.
-- * Administrators count as staff only with an MFA-satisfied session (public.admin_mfa_satisfied), the
--   same rule as every other administrator action.
-- * No table grants: every read is a narrow projection and every write goes through a messages_* function
--   that checks the caller. A new message notifies the other side through the existing notifications inbox
--   (one row per thread and recipient, refreshed while unread), so there is still no client insert path.
-- * Abuse limits: 5 new conversations per hour and 30 open conversations per learner; 30 messages per
--   10 minutes per sender.

-- ---------------------------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------------------------
CREATE TABLE public.message_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 learner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 topic text NOT NULL CHECK (topic IN ('course','support')),
 course_id uuid REFERENCES public.courses(id) ON DELETE RESTRICT,
 subject text NOT NULL CHECK (subject = btrim(subject) AND char_length(subject) BETWEEN 1 AND 160),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 last_message_at timestamptz NOT NULL DEFAULT now(),
 closed_at timestamptz,
 closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 CHECK ((topic = 'course') = (course_id IS NOT NULL)),
 CHECK ((status = 'closed') = (closed_at IS NOT NULL))
);
CREATE INDEX message_threads_learner_recent_idx ON public.message_threads(learner_id, last_message_at DESC);
CREATE INDEX message_threads_course_recent_idx ON public.message_threads(course_id, last_message_at DESC) WHERE course_id IS NOT NULL;
CREATE INDEX message_threads_recent_idx ON public.message_threads(last_message_at DESC);
CREATE INDEX message_threads_closed_by_idx ON public.message_threads(closed_by) WHERE closed_by IS NOT NULL;

CREATE TABLE public.thread_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
 sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 is_staff boolean NOT NULL,
 body text NOT NULL CHECK (body = btrim(body) AND char_length(body) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX thread_messages_thread_time_idx ON public.thread_messages(thread_id, created_at DESC, id DESC);
CREATE INDEX thread_messages_sender_time_idx ON public.thread_messages(sender_id, created_at DESC) WHERE sender_id IS NOT NULL;

CREATE TABLE public.message_thread_reads (
 thread_id uuid NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 last_read_at timestamptz NOT NULL,
 PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX message_thread_reads_user_idx ON public.message_thread_reads(user_id);

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_thread_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_threads, public.thread_messages, public.message_thread_reads
 FROM PUBLIC, anon, authenticated, service_role;

-- Message notifications: one row per thread and recipient, linked so it disappears with the thread.
ALTER TABLE public.notifications ADD COLUMN message_thread_id uuid REFERENCES public.message_threads(id) ON DELETE CASCADE;
CREATE INDEX notifications_message_thread_idx ON public.notifications(message_thread_id) WHERE message_thread_id IS NOT NULL;
ALTER TABLE public.notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_kind_check CHECK (kind IN ('enrollment_started','course_completed',
 'certificate_issued','quiz_passed','quiz_failed','event_scheduled','event_cancelled','event_reminder','deadline_reminder',
 'streak_reminder','streak_milestone','message_received','message_from_learner'));

-- ---------------------------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION learning_private.messages_is_admin(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL AND public.admin_mfa_satisfied()
  AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user AND r.role = 'admin' AND r.revoked_at IS NULL);
$$;

-- Whether p_user answers this thread as staff. The thread's own learner is never staff on it.
CREATE FUNCTION learning_private.messages_is_staff_for(p_thread public.message_threads, p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL AND p_thread.learner_id <> p_user
  AND (learning_private.messages_is_admin(p_user)
   OR (p_thread.topic = 'course' AND learning_private.is_course_instructor(p_thread.course_id, p_user)));
$$;

-- Loads a thread the caller may see, locking it when p_lock. Unknown ids and other people's threads
-- answer the same way, so ids cannot be probed.
CREATE FUNCTION learning_private.messages_thread_for(p_thread_id uuid, p_lock boolean) RETURNS public.message_threads
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_thread public.message_threads;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_lock THEN
  SELECT * INTO v_thread FROM public.message_threads t WHERE t.id = p_thread_id FOR UPDATE;
 ELSE
  SELECT * INTO v_thread FROM public.message_threads t WHERE t.id = p_thread_id;
 END IF;
 IF v_thread.id IS NULL OR NOT (v_thread.learner_id = actor OR learning_private.messages_is_staff_for(v_thread, actor)) THEN
  RAISE EXCEPTION 'conversation not found' USING ERRCODE = 'P0002';
 END IF;
 RETURN v_thread;
END $$;

-- 30 messages per 10 minutes per sender, serialized per sender.
CREATE FUNCTION learning_private.messages_assert_rate(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('messages:' || p_user::text));
 IF (SELECT count(*) FROM public.thread_messages m WHERE m.sender_id = p_user AND m.created_at > now() - interval '10 minutes') >= 30 THEN
  RAISE EXCEPTION 'message_rate' USING ERRCODE = '54000';
 END IF;
END $$;

-- Staff who are told about a learner's message: the course's instructors, or administrators for support
-- threads and for courses with no active instructor.
CREATE FUNCTION learning_private.messages_staff_recipients(p_thread public.message_threads) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH instructors AS (
  SELECT DISTINCT ci.profile_id AS user_id FROM public.course_instructors ci
  JOIN public.user_roles r ON r.user_id = ci.profile_id AND r.role = 'instructor' AND r.revoked_at IS NULL
  WHERE p_thread.topic = 'course' AND ci.course_id = p_thread.course_id
 )
 SELECT i.user_id FROM instructors i
 UNION
 SELECT DISTINCT r.user_id FROM public.user_roles r
 WHERE r.role = 'admin' AND r.revoked_at IS NULL AND NOT EXISTS(SELECT 1 FROM instructors);
$$;

CREATE FUNCTION learning_private.messages_notify(p_thread public.message_threads, p_sender uuid, p_from_staff boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.notifications AS n(user_id, kind, course_id, message_thread_id, data, dedupe_key)
 SELECT x.user_id, CASE WHEN p_from_staff THEN 'message_received' ELSE 'message_from_learner' END, p_thread.course_id, p_thread.id,
  jsonb_build_object('threadId', p_thread.id), 'message-thread:' || p_thread.id
 FROM (
  SELECT p_thread.learner_id AS user_id WHERE p_from_staff
  UNION
  SELECT s FROM learning_private.messages_staff_recipients(p_thread) s WHERE NOT p_from_staff
 ) x
 WHERE x.user_id <> p_sender
 ON CONFLICT (user_id, dedupe_key) DO UPDATE SET created_at = clock_timestamp(), read_at = NULL, kind = excluded.kind;
END $$;

CREATE FUNCTION learning_private.messages_mark_read(p_thread_id uuid, p_user uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 INSERT INTO public.message_thread_reads AS r(thread_id, user_id, last_read_at) VALUES (p_thread_id, p_user, clock_timestamp())
 ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_at = greatest(r.last_read_at, excluded.last_read_at);
 UPDATE public.notifications n SET read_at = clock_timestamp()
 WHERE n.user_id = p_user AND n.message_thread_id = p_thread_id AND n.read_at IS NULL;
$$;

-- Unread messages in one thread for one participant (their own messages never count).
CREATE FUNCTION learning_private.messages_unread(p_thread_id uuid, p_user uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT count(*)::integer FROM public.thread_messages m
 WHERE m.thread_id = p_thread_id AND m.sender_id IS DISTINCT FROM p_user
  AND m.created_at > coalesce((SELECT r.last_read_at FROM public.message_thread_reads r WHERE r.thread_id = p_thread_id AND r.user_id = p_user), '-infinity');
$$;

-- Threads p_user answers as staff (not their own).
CREATE FUNCTION learning_private.messages_staff_threads(p_user uuid) RETURNS SETOF public.message_threads
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF learning_private.messages_is_admin(p_user) THEN
  RETURN QUERY SELECT t.* FROM public.message_threads t WHERE t.learner_id <> p_user;
 ELSE
  RETURN QUERY SELECT t.* FROM public.message_threads t
  WHERE t.topic = 'course' AND t.learner_id <> p_user AND learning_private.is_course_instructor(t.course_id, p_user);
 END IF;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Inbox
-- ---------------------------------------------------------------------------------------------
-- Whether the caller has a staff inbox, and how many conversations have unread messages in each box.
CREATE FUNCTION public.messages_inbox_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_staff boolean;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 v_staff := learning_private.messages_is_admin(actor) OR EXISTS(SELECT 1 FROM public.course_instructors ci
  WHERE ci.profile_id = actor AND learning_private.is_course_instructor(ci.course_id, actor));
 RETURN jsonb_build_object(
  'isStaff', v_staff,
  'unreadMine', (SELECT count(*)::integer FROM public.message_threads t
    WHERE t.learner_id = actor AND learning_private.messages_unread(t.id, actor) > 0),
  'unreadStaff', CASE WHEN v_staff THEN (SELECT count(*)::integer FROM learning_private.messages_staff_threads(actor) t
    WHERE learning_private.messages_unread(t.id, actor) > 0) ELSE 0 END);
END $$;

-- p_box: 'mine' (the caller's own conversations) or 'staff' (conversations the caller answers).
-- p_filter: 'all' | 'unread' | 'open' | 'closed' | 'awaiting' (open, and the learner spoke last).
-- p_search matches the subject, the course title and (staff box) the learner's display name.
CREATE FUNCTION public.messages_list_threads(p_box text, p_filter text, p_search text, p_locale text, p_limit integer DEFAULT 30, p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid, topic text, course_slug text, course_title text, subject text, status text, learner_name text,
 created_at timestamptz, last_message_at timestamptz, last_body text, last_from_me boolean, last_is_staff boolean, unread_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_search text := nullif(btrim(coalesce(p_search, '')), ''); v_pattern text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_box IS NULL OR p_box NOT IN ('mine','staff') OR p_filter IS NULL OR p_filter NOT IN ('all','unread','open','closed','awaiting')
  OR p_locale IS NULL OR p_locale NOT IN ('en','ar') OR char_length(coalesce(v_search, '')) > 100
  OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 10000
 THEN RAISE EXCEPTION 'invalid conversation request' USING ERRCODE = '22023'; END IF;
 IF p_box = 'staff' AND NOT (learning_private.messages_is_admin(actor) OR EXISTS(SELECT 1 FROM public.course_instructors ci
  WHERE ci.profile_id = actor AND learning_private.is_course_instructor(ci.course_id, actor))) THEN
  RAISE EXCEPTION 'staff inbox requires a staff role' USING ERRCODE = '42501';
 END IF;
 v_pattern := '%' || replace(replace(replace(v_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
 RETURN QUERY
 SELECT t.id, t.topic, c.slug, ct.title, t.subject, t.status,
  CASE WHEN p_box = 'staff' THEN lp.display_name END,
  t.created_at, t.last_message_at, last.body, last.sender_id IS NOT DISTINCT FROM actor, last.is_staff, u.n
 FROM (
  SELECT x.* FROM public.message_threads x WHERE p_box = 'mine' AND x.learner_id = actor
  UNION ALL
  SELECT y.* FROM learning_private.messages_staff_threads(actor) y WHERE p_box = 'staff'
 ) t
 LEFT JOIN public.courses c ON c.id = t.course_id
 LEFT JOIN public.course_translations ct ON ct.course_id = t.course_id AND ct.locale = p_locale AND ct.publication_status = 'published'
 LEFT JOIN public.profiles lp ON lp.id = t.learner_id
 CROSS JOIN LATERAL (SELECT left(m.body, 160) AS body, m.sender_id, m.is_staff FROM public.thread_messages m
  WHERE m.thread_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) last
 CROSS JOIN LATERAL (SELECT learning_private.messages_unread(t.id, actor) AS n) u
 WHERE (p_filter = 'all' OR (p_filter = 'unread' AND u.n > 0) OR (p_filter = 'open' AND t.status = 'open')
   OR (p_filter = 'closed' AND t.status = 'closed') OR (p_filter = 'awaiting' AND t.status = 'open' AND NOT last.is_staff))
  AND (v_search IS NULL OR t.subject ILIKE v_pattern OR coalesce(ct.title, '') ILIKE v_pattern
   OR (p_box = 'staff' AND coalesce(lp.display_name, '') ILIKE v_pattern))
 ORDER BY t.last_message_at DESC, t.id
 LIMIT p_limit OFFSET p_offset;
END $$;

-- One conversation with up to p_limit messages before p_before (newest page first, returned oldest first).
CREATE FUNCTION public.messages_get_thread(p_thread_id uuid, p_locale text, p_before timestamptz DEFAULT NULL, p_limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_thread public.message_threads; v_staff boolean; v_rows jsonb; v_more boolean;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
  RAISE EXCEPTION 'invalid conversation request' USING ERRCODE = '22023'; END IF;
 SELECT * INTO v_thread FROM public.message_threads t WHERE t.id = p_thread_id;
 v_staff := v_thread.id IS NOT NULL AND learning_private.messages_is_staff_for(v_thread, actor);
 IF v_thread.id IS NULL OR NOT (v_thread.learner_id = actor OR v_staff) THEN
  RAISE EXCEPTION 'conversation not found' USING ERRCODE = 'P0002'; END IF;
 -- One row past the page tells whether older messages exist.
 SELECT coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'body', p.body, 'createdAt', p.created_at,
   'mine', p.sender_id IS NOT DISTINCT FROM actor, 'isStaff', p.is_staff, 'senderName', p.sender_name) ORDER BY p.created_at, p.id)
   FILTER (WHERE p.n <= p_limit), '[]'::jsonb),
  count(*) > p_limit
 INTO v_rows, v_more
 FROM (
  SELECT m.id, m.body, m.created_at, m.sender_id, m.is_staff, sp.display_name AS sender_name,
   row_number() OVER (ORDER BY m.created_at DESC, m.id DESC) AS n
  FROM public.thread_messages m LEFT JOIN public.profiles sp ON sp.id = m.sender_id
  WHERE m.thread_id = v_thread.id AND (p_before IS NULL OR m.created_at < p_before)
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT p_limit + 1
 ) p;
 RETURN jsonb_build_object(
  'id', v_thread.id, 'topic', v_thread.topic, 'subject', v_thread.subject, 'status', v_thread.status,
  'createdAt', v_thread.created_at, 'closedAt', v_thread.closed_at,
  'courseSlug', (SELECT c.slug FROM public.courses c WHERE c.id = v_thread.course_id),
  'courseTitle', (SELECT ct.title FROM public.course_translations ct WHERE ct.course_id = v_thread.course_id AND ct.locale = p_locale AND ct.publication_status = 'published'),
  'learnerName', CASE WHEN v_staff THEN (SELECT p.display_name FROM public.profiles p WHERE p.id = v_thread.learner_id) END,
  'viewerRole', CASE WHEN v_staff THEN 'staff' ELSE 'learner' END,
  -- When the other side last read the thread (the latest of any staff member for the learner's view).
  'otherReadAt', (SELECT max(r.last_read_at) FROM public.message_thread_reads r WHERE r.thread_id = v_thread.id AND r.user_id <> actor
    AND (v_staff = (r.user_id = v_thread.learner_id))),
  'hasMore', v_more,
  'messages', v_rows);
END $$;

-- Courses the caller can start a course conversation about: published and currently entitled.
CREATE FUNCTION public.messages_list_course_options(p_locale text)
RETURNS TABLE(id uuid, slug text, title text, instructors text[])
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE = '22023'; END IF;
 RETURN QUERY SELECT c.id, c.slug, ct.title,
  coalesce((SELECT array_agg(i.display_name ORDER BY i.position) FROM public.course_instructors i WHERE i.course_id = c.id), '{}'::text[])
 FROM public.courses c
 JOIN public.course_translations ct ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
 WHERE c.status = 'published' AND learning_private.is_entitled(c.id, actor)
 ORDER BY ct.title
 LIMIT 200;
END $$;

-- ---------------------------------------------------------------------------------------------
-- Writes
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION public.messages_start_thread(p_topic text, p_course_id uuid, p_subject text, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_subject text := btrim(coalesce(p_subject, '')); v_body text := btrim(coalesce(p_body, ''));
 v_thread public.message_threads;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF p_topic IS NULL OR p_topic NOT IN ('course','support') OR (p_topic = 'course') <> (p_course_id IS NOT NULL)
  OR char_length(v_subject) NOT BETWEEN 1 AND 160 OR char_length(v_body) NOT BETWEEN 1 AND 4000
 THEN RAISE EXCEPTION 'invalid conversation' USING ERRCODE = '22023'; END IF;
 IF p_topic = 'course' AND NOT (EXISTS(SELECT 1 FROM public.courses c WHERE c.id = p_course_id AND c.status = 'published')
  AND learning_private.is_entitled(p_course_id, actor)) THEN
  RAISE EXCEPTION 'course conversations require enrollment' USING ERRCODE = '42501'; END IF;
 PERFORM learning_private.messages_assert_rate(actor);
 IF (SELECT count(*) FROM public.message_threads t WHERE t.learner_id = actor AND t.created_at > now() - interval '1 hour') >= 5
  OR (SELECT count(*) FROM public.message_threads t WHERE t.learner_id = actor AND t.status = 'open') >= 30 THEN
  RAISE EXCEPTION 'thread_limit' USING ERRCODE = '54000'; END IF;
 INSERT INTO public.message_threads(learner_id, topic, course_id, subject, last_message_at)
 VALUES (actor, p_topic, p_course_id, v_subject, clock_timestamp()) RETURNING * INTO v_thread;
 INSERT INTO public.thread_messages(thread_id, sender_id, is_staff, body, created_at) VALUES (v_thread.id, actor, false, v_body, v_thread.last_message_at);
 PERFORM learning_private.messages_mark_read(v_thread.id, actor);
 PERFORM learning_private.messages_notify(v_thread, actor, false);
 RETURN v_thread.id;
END $$;

-- Sends a message to an open conversation and returns its id.
CREATE FUNCTION public.messages_send(p_thread_id uuid, p_body text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_body text := btrim(coalesce(p_body, '')); v_thread public.message_threads; v_staff boolean;
 v_at timestamptz := clock_timestamp(); v_id uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 IF char_length(v_body) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid message' USING ERRCODE = '22023'; END IF;
 v_thread := learning_private.messages_thread_for(p_thread_id, true);
 IF v_thread.status <> 'open' THEN RAISE EXCEPTION 'conversation is closed' USING ERRCODE = '55000'; END IF;
 v_staff := learning_private.messages_is_staff_for(v_thread, actor);
 PERFORM learning_private.messages_assert_rate(actor);
 INSERT INTO public.thread_messages(thread_id, sender_id, is_staff, body, created_at) VALUES (v_thread.id, actor, v_staff, v_body, v_at) RETURNING id INTO v_id;
 UPDATE public.message_threads SET last_message_at = v_at WHERE id = v_thread.id;
 PERFORM learning_private.messages_mark_read(v_thread.id, actor);
 PERFORM learning_private.messages_notify(v_thread, actor, v_staff);
 RETURN v_id;
END $$;

-- Either side may close a conversation (it becomes read-only) or reopen it.
CREATE FUNCTION public.messages_set_thread_status(p_thread_id uuid, p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid(); v_thread public.message_threads;
BEGIN
 IF p_status IS NULL OR p_status NOT IN ('open','closed') THEN RAISE EXCEPTION 'invalid status' USING ERRCODE = '22023'; END IF;
 v_thread := learning_private.messages_thread_for(p_thread_id, true);
 IF v_thread.status = p_status THEN RETURN; END IF;
 IF p_status = 'open' AND v_thread.learner_id = actor
  AND (SELECT count(*) FROM public.message_threads t WHERE t.learner_id = actor AND t.status = 'open') >= 30 THEN
  RAISE EXCEPTION 'thread_limit' USING ERRCODE = '54000'; END IF;
 UPDATE public.message_threads SET status = p_status,
  closed_at = CASE WHEN p_status = 'closed' THEN clock_timestamp() END,
  closed_by = CASE WHEN p_status = 'closed' THEN actor END
 WHERE id = v_thread.id;
END $$;

-- The caller's own conversations for the personal data export. Staff are labelled, never identified.
CREATE FUNCTION public.messages_export_mine() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('topic', t.topic, 'course', c.slug, 'subject', t.subject, 'status', t.status,
   'created_at', t.created_at, 'closed_at', t.closed_at,
   'messages', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'from', CASE WHEN m.sender_id = actor THEN 'me' WHEN m.is_staff THEN 'staff' ELSE 'former_account' END,
      'body', m.body, 'created_at', m.created_at) ORDER BY m.created_at, m.id), '[]'::jsonb)
    FROM public.thread_messages m WHERE m.thread_id = t.id)) ORDER BY t.created_at, t.id)
  FROM public.message_threads t LEFT JOIN public.courses c ON c.id = t.course_id
  WHERE t.learner_id = actor), '[]'::jsonb);
END $$;

CREATE FUNCTION public.messages_mark_thread_read(p_thread_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_thread public.message_threads;
BEGIN
 v_thread := learning_private.messages_thread_for(p_thread_id, false);
 PERFORM learning_private.messages_mark_read(v_thread.id, auth.uid());
END $$;

-- ---------------------------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION learning_private.messages_is_admin(uuid), learning_private.messages_is_staff_for(public.message_threads,uuid),
 learning_private.messages_thread_for(uuid,boolean), learning_private.messages_assert_rate(uuid),
 learning_private.messages_staff_recipients(public.message_threads), learning_private.messages_notify(public.message_threads,uuid,boolean),
 learning_private.messages_mark_read(uuid,uuid), learning_private.messages_unread(uuid,uuid), learning_private.messages_staff_threads(uuid)
 FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.messages_inbox_summary(), public.messages_list_threads(text,text,text,text,integer,integer),
 public.messages_get_thread(uuid,text,timestamptz,integer), public.messages_list_course_options(text),
 public.messages_start_thread(text,uuid,text,text), public.messages_send(uuid,text), public.messages_set_thread_status(uuid,text),
 public.messages_mark_thread_read(uuid), public.messages_export_mine() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.messages_inbox_summary(), public.messages_list_threads(text,text,text,text,integer,integer),
 public.messages_get_thread(uuid,text,timestamptz,integer), public.messages_list_course_options(text),
 public.messages_start_thread(text,uuid,text,text), public.messages_send(uuid,text), public.messages_set_thread_status(uuid,text),
 public.messages_mark_thread_read(uuid), public.messages_export_mine() TO authenticated;
