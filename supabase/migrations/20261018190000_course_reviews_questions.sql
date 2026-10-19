-- Course reviews, course Q&A and a course-level resource list for the learner course detail tabs.
-- No table is readable or writable through the Data API: every read is a narrow projection that
-- returns a display name (never a user id) and every write goes through a learner_* function that
-- checks the caller and their entitlement. Reviews require a real active/completed enrollment;
-- Q&A is limited to entitled learners plus administrators, who may also remove any review,
-- question or answer (audited). Product approval: user request 2026-10-18 (overrides F03 for reviews).
CREATE TABLE public.course_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
 body text CHECK (body IS NULL OR (body=btrim(body) AND char_length(body) BETWEEN 1 AND 2000)),
 locale text NOT NULL CHECK (locale IN ('en','ar')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT course_reviews_one_per_learner UNIQUE (course_id,user_id)
);
CREATE INDEX course_reviews_course_recent_idx ON public.course_reviews(course_id,created_at DESC);
CREATE INDEX course_reviews_user_idx ON public.course_reviews(user_id);

CREATE TABLE public.course_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (body=btrim(body) AND char_length(body) BETWEEN 1 AND 2000),
 locale text NOT NULL CHECK (locale IN ('en','ar')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX course_questions_course_recent_idx ON public.course_questions(course_id,created_at DESC);
CREATE INDEX course_questions_user_time_idx ON public.course_questions(user_id,created_at DESC);

CREATE TABLE public.course_answers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 question_id uuid NOT NULL REFERENCES public.course_questions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (body=btrim(body) AND char_length(body) BETWEEN 1 AND 2000),
 -- Snapshot set by the server: the author was an administrator or an assigned course instructor.
 is_staff boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX course_answers_question_idx ON public.course_answers(question_id,created_at);
CREATE INDEX course_answers_user_time_idx ON public.course_answers(user_id,created_at DESC);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_reviews,public.course_questions,public.course_answers FROM PUBLIC,anon,authenticated,service_role;

CREATE TRIGGER course_reviews_set_updated_at BEFORE UPDATE ON public.course_reviews
 FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Moderation removals are audited against the course.
DO $$ DECLARE expr text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR action IN (''course.feedback_removed''))';
END $$;

-- Internal helpers (not exposed): published course, real entitlement, active administrator.
CREATE FUNCTION public.course_feedback_is_published(p_course_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.courses c WHERE c.id=p_course_id AND c.status='published');
$$;
CREATE FUNCTION public.course_feedback_is_enrolled(p_course_id uuid,p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL AND EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=p_user AND e.course_id=p_course_id
  AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now()));
$$;
CREATE FUNCTION public.course_feedback_is_admin(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT p_user IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_user AND r.role='admin' AND r.revoked_at IS NULL);
$$;
-- Shared write limit for questions and answers: 20 posts per hour per learner.
CREATE FUNCTION public.course_feedback_assert_rate(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('course-qa:'||p_user::text));
 IF (SELECT count(*) FROM public.course_questions WHERE user_id=p_user AND created_at>now()-interval '1 hour')
  +(SELECT count(*) FROM public.course_answers WHERE user_id=p_user AND created_at>now()-interval '1 hour')>=20
 THEN RAISE EXCEPTION 'course_qa_rate' USING ERRCODE='54000';END IF;
END $$;
REVOKE ALL ON FUNCTION public.course_feedback_is_published(uuid),public.course_feedback_is_enrolled(uuid,uuid),
 public.course_feedback_is_admin(uuid),public.course_feedback_assert_rate(uuid) FROM PUBLIC,anon,authenticated,service_role;

-- Public rating summary plus the Q&A count, for published courses only.
CREATE FUNCTION public.catalog_course_feedback_summary(p_course_id uuid)
RETURNS TABLE(review_count integer,average_rating numeric,rating_counts integer[],question_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT public.course_feedback_is_published(p_course_id) THEN RETURN;END IF;
 RETURN QUERY SELECT
  (SELECT count(*)::integer FROM public.course_reviews r WHERE r.course_id=p_course_id),
  (SELECT round(avg(r.rating),1) FROM public.course_reviews r WHERE r.course_id=p_course_id),
  ARRAY(SELECT (SELECT count(*)::integer FROM public.course_reviews r WHERE r.course_id=p_course_id AND r.rating=s) FROM generate_series(1,5) s ORDER BY s),
  (SELECT count(*)::integer FROM public.course_questions q WHERE q.course_id=p_course_id);
END $$;

-- Public review list; the caller's own review comes first.
CREATE FUNCTION public.catalog_list_course_reviews(p_course_id uuid,p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid,rating smallint,body text,author_name text,created_at timestamptz,updated_at timestamptz,is_mine boolean,can_remove boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_admin boolean:=public.course_feedback_is_admin(auth.uid());BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'invalid page' USING ERRCODE='22023';END IF;
 IF NOT public.course_feedback_is_published(p_course_id) THEN RETURN;END IF;
 RETURN QUERY SELECT r.id,r.rating,r.body,p.display_name,r.created_at,r.updated_at,
  coalesce(r.user_id=actor,false),coalesce(r.user_id=actor,false) OR v_admin
 FROM public.course_reviews r JOIN public.profiles p ON p.id=r.user_id
 WHERE r.course_id=p_course_id
 ORDER BY coalesce(r.user_id=actor,false) DESC,r.created_at DESC,r.id
 LIMIT p_limit OFFSET p_offset;
END $$;

CREATE FUNCTION public.learner_save_course_review(p_course_id uuid,p_rating integer,p_body text,p_locale text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_body text:=nullif(btrim(coalesce(p_body,'')),''); v_id uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR char_length(coalesce(v_body,''))>2000 THEN RAISE EXCEPTION 'invalid review' USING ERRCODE='22023';END IF;
 IF NOT public.course_feedback_is_published(p_course_id) OR NOT public.course_feedback_is_enrolled(p_course_id,actor) THEN
  RAISE EXCEPTION 'review requires enrollment' USING ERRCODE='42501';END IF;
 INSERT INTO public.course_reviews(course_id,user_id,rating,body,locale) VALUES(p_course_id,actor,p_rating,v_body,p_locale)
 ON CONFLICT (course_id,user_id) DO UPDATE SET rating=excluded.rating,body=excluded.body,locale=excluded.locale
 RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.learner_delete_course_review(p_review_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_owner uuid; v_course uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 SELECT r.user_id,r.course_id INTO v_owner,v_course FROM public.course_reviews r WHERE r.id=p_review_id FOR UPDATE;
 IF v_owner IS NULL OR (v_owner<>actor AND NOT public.course_feedback_is_admin(actor)) THEN RAISE EXCEPTION 'review not found' USING ERRCODE='P0002';END IF;
 DELETE FROM public.course_reviews WHERE id=p_review_id;
 IF v_owner<>actor THEN PERFORM public.write_course_audit(actor,'course.feedback_removed',v_course,'Removed a learner review');END IF;
END $$;

-- Q&A thread for entitled learners and administrators (newest questions first, answers oldest first).
CREATE FUNCTION public.learner_list_course_questions(p_course_id uuid,p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid,body text,author_name text,created_at timestamptz,is_mine boolean,can_remove boolean,answers jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_admin boolean:=public.course_feedback_is_admin(auth.uid());BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 50 OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'invalid page' USING ERRCODE='22023';END IF;
 IF NOT public.course_feedback_is_published(p_course_id) OR NOT (v_admin OR public.course_feedback_is_enrolled(p_course_id,actor)) THEN
  RAISE EXCEPTION 'course questions require enrollment' USING ERRCODE='42501';END IF;
 RETURN QUERY SELECT q.id,q.body,p.display_name,q.created_at,q.user_id=actor,q.user_id=actor OR v_admin,
  coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'body',a.body,'authorName',ap.display_name,'isStaff',a.is_staff,
    'createdAt',a.created_at,'isMine',a.user_id=actor,'canRemove',a.user_id=actor OR v_admin) ORDER BY a.created_at,a.id)
   FROM public.course_answers a JOIN public.profiles ap ON ap.id=a.user_id WHERE a.question_id=q.id),'[]'::jsonb)
 FROM public.course_questions q JOIN public.profiles p ON p.id=q.user_id
 WHERE q.course_id=p_course_id
 ORDER BY q.created_at DESC,q.id
 LIMIT p_limit OFFSET p_offset;
END $$;

CREATE FUNCTION public.learner_ask_course_question(p_course_id uuid,p_body text,p_locale text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_body text:=btrim(coalesce(p_body,'')); v_id uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 IF char_length(v_body) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'invalid question' USING ERRCODE='22023';END IF;
 IF NOT public.course_feedback_is_published(p_course_id) OR NOT (public.course_feedback_is_admin(actor) OR public.course_feedback_is_enrolled(p_course_id,actor)) THEN
  RAISE EXCEPTION 'course questions require enrollment' USING ERRCODE='42501';END IF;
 PERFORM public.course_feedback_assert_rate(actor);
 INSERT INTO public.course_questions(course_id,user_id,body,locale) VALUES(p_course_id,actor,v_body,p_locale) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.learner_answer_course_question(p_question_id uuid,p_body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_body text:=btrim(coalesce(p_body,'')); v_course uuid; v_admin boolean; v_id uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF char_length(v_body) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'invalid answer' USING ERRCODE='22023';END IF;
 SELECT q.course_id INTO v_course FROM public.course_questions q WHERE q.id=p_question_id;
 v_admin:=public.course_feedback_is_admin(actor);
 IF v_course IS NULL OR NOT public.course_feedback_is_published(v_course) OR NOT (v_admin OR public.course_feedback_is_enrolled(v_course,actor)) THEN
  RAISE EXCEPTION 'question not found' USING ERRCODE='P0002';END IF;
 PERFORM public.course_feedback_assert_rate(actor);
 INSERT INTO public.course_answers(question_id,user_id,body,is_staff)
  VALUES(p_question_id,actor,v_body,v_admin OR EXISTS(SELECT 1 FROM public.course_instructors i WHERE i.course_id=v_course AND i.profile_id=actor))
  RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION public.learner_delete_course_question(p_question_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_owner uuid; v_course uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 SELECT q.user_id,q.course_id INTO v_owner,v_course FROM public.course_questions q WHERE q.id=p_question_id FOR UPDATE;
 IF v_owner IS NULL OR (v_owner<>actor AND NOT public.course_feedback_is_admin(actor)) THEN RAISE EXCEPTION 'question not found' USING ERRCODE='P0002';END IF;
 DELETE FROM public.course_questions WHERE id=p_question_id;
 IF v_owner<>actor THEN PERFORM public.write_course_audit(actor,'course.feedback_removed',v_course,'Removed a course question');END IF;
END $$;

CREATE FUNCTION public.learner_delete_course_answer(p_answer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_owner uuid; v_course uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 SELECT a.user_id,q.course_id INTO v_owner,v_course FROM public.course_answers a JOIN public.course_questions q ON q.id=a.question_id WHERE a.id=p_answer_id FOR UPDATE OF a;
 IF v_owner IS NULL OR (v_owner<>actor AND NOT public.course_feedback_is_admin(actor)) THEN RAISE EXCEPTION 'answer not found' USING ERRCODE='P0002';END IF;
 DELETE FROM public.course_answers WHERE id=p_answer_id;
 IF v_owner<>actor THEN PERFORM public.write_course_audit(actor,'course.feedback_removed',v_course,'Removed a course answer');END IF;
END $$;

-- Course-level resource list with the same visibility as learner_get_lesson_resources: resources of
-- preview lessons for everyone, all published resources for entitled learners and administrators.
-- Storage keys and URLs are not returned; downloads go through the existing checked resource route.
CREATE FUNCTION public.learner_list_course_resources(p_course_id uuid,p_locale text)
RETURNS TABLE(resource_id uuid,lesson_id uuid,lesson_title text,kind text,label text,description text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_full boolean;BEGIN
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'unsupported locale' USING ERRCODE='22023';END IF;
 v_full:=public.course_feedback_is_enrolled(p_course_id,actor) OR public.course_feedback_is_admin(actor);
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
 WHERE c.id=p_course_id AND l.status='published' AND (l.is_preview OR v_full)
 ORDER BY m.position,l.position,r.position;
END $$;

REVOKE ALL ON FUNCTION public.catalog_course_feedback_summary(uuid),public.catalog_list_course_reviews(uuid,integer,integer),
 public.learner_save_course_review(uuid,integer,text,text),public.learner_delete_course_review(uuid),
 public.learner_list_course_questions(uuid,integer,integer),public.learner_ask_course_question(uuid,text,text),
 public.learner_answer_course_question(uuid,text),public.learner_delete_course_question(uuid),public.learner_delete_course_answer(uuid),
 public.learner_list_course_resources(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.catalog_course_feedback_summary(uuid),public.catalog_list_course_reviews(uuid,integer,integer),
 public.learner_list_course_resources(uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.learner_save_course_review(uuid,integer,text,text),public.learner_delete_course_review(uuid),
 public.learner_list_course_questions(uuid,integer,integer),public.learner_ask_course_question(uuid,text,text),
 public.learner_answer_course_question(uuid,text),public.learner_delete_course_question(uuid),public.learner_delete_course_answer(uuid) TO authenticated;
