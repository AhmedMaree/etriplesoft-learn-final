-- Honest lesson types and approved explicit nonvideo completion. Snapshot evaluation
-- requires every current required lesson (inside a required module) in the requested locale.
CREATE FUNCTION public.admin_set_lesson_type(p_lesson_id uuid,p_type text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); BEGIN
 IF p_type IS NULL OR p_type NOT IN ('video','resource','article','assessment') THEN RAISE EXCEPTION 'invalid lesson type' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.lessons WHERE id=p_lesson_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE='P0002'; END IF;
 IF EXISTS(SELECT 1 FROM public.lesson_progress WHERE lesson_id=p_lesson_id)
 OR EXISTS(SELECT 1 FROM public.quizzes WHERE lesson_id=p_lesson_id)
 OR EXISTS(SELECT 1 FROM public.lesson_videos WHERE lesson_id=p_lesson_id)
 THEN RAISE EXCEPTION 'lesson with activity or video/quiz history cannot change type' USING ERRCODE='23514'; END IF;
 UPDATE public.lessons SET lesson_type=p_type WHERE id=p_lesson_id;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,lesson_id,safe_summary) VALUES(actor,'lesson.updated','lesson',p_lesson_id,'Corrected lesson content type');
END $$;
CREATE FUNCTION public.admin_list_assessment_lessons(p_locale text) RETURNS TABLE(lesson_id uuid,course_slug text,title text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023'; END IF;
 RETURN QUERY SELECT l.id,c.slug,lt.title FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id JOIN public.lesson_translations lt ON lt.lesson_id=l.id AND lt.locale=p_locale WHERE l.lesson_type='assessment' AND l.status<>'archived' AND c.status<>'archived' ORDER BY c.slug,m.position,l.position LIMIT 500;
END $$;

CREATE TABLE public.course_completions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enrollment_id uuid NOT NULL UNIQUE REFERENCES public.enrollments(id) ON DELETE RESTRICT,
 rule_version integer NOT NULL DEFAULT 1 CHECK(rule_version=1),
 locale text NOT NULL CHECK(locale IN ('en','ar')),
 required_lessons integer NOT NULL CHECK(required_lessons>0),
 required_assessments integer NOT NULL CHECK(required_assessments>=0 AND required_assessments<=required_lessons),
 course_title text NOT NULL,
 learner_name text NOT NULL,
 completed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.completion_lessons (
 completion_id uuid NOT NULL REFERENCES public.course_completions(id) ON DELETE RESTRICT,
 lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE RESTRICT,
 quiz_attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE RESTRICT,
 PRIMARY KEY(completion_id,lesson_id)
);
CREATE INDEX completion_lessons_lesson_idx ON public.completion_lessons(lesson_id);
CREATE INDEX completion_lessons_attempt_idx ON public.completion_lessons(quiz_attempt_id);
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completion_lessons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_completions,public.completion_lessons FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.course_completions TO authenticated;
CREATE POLICY completions_owner ON public.course_completions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.enrollments e WHERE e.id=enrollment_id AND e.user_id=auth.uid()));
CREATE FUNCTION learning_private.freeze_completion() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RAISE EXCEPTION 'completion snapshot is immutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER freeze_completion BEFORE UPDATE OR DELETE ON public.course_completions FOR EACH ROW EXECUTE FUNCTION learning_private.freeze_completion();
CREATE TRIGGER freeze_completion_lessons BEFORE UPDATE OR DELETE ON public.completion_lessons FOR EACH ROW EXECUTE FUNCTION learning_private.freeze_completion();

CREATE FUNCTION public.learner_complete_reading(p_lesson_id uuid,p_locale text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE course uuid; enrollment uuid; content record; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO content FROM public.learner_get_lesson(p_lesson_id,p_locale);
 IF NOT FOUND OR content.lesson_type NOT IN ('article','resource') THEN RAISE EXCEPTION 'reading lesson access denied' USING ERRCODE='42501'; END IF;
 course:=content.course_id;
 SELECT e.id INTO enrollment FROM public.enrollments e WHERE e.user_id=auth.uid() AND e.course_id=course AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>clock_timestamp()) ORDER BY e.granted_at DESC LIMIT 1 FOR UPDATE;
 IF enrollment IS NULL THEN RAISE EXCEPTION 'enrollment required' USING ERRCODE='42501'; END IF;
 IF (content.lesson_type='article' AND nullif(btrim(content.body),'') IS NULL)
 OR (content.lesson_type='resource' AND NOT EXISTS(SELECT 1 FROM public.learner_get_lesson_resources(p_lesson_id,p_locale) r WHERE r.kind='external_url' OR EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='course-resources' AND o.name=r.storage_object_key))) THEN RAISE EXCEPTION 'lesson content is not ready' USING ERRCODE='23514'; END IF;
 INSERT INTO public.lesson_progress(enrollment_id,lesson_id,status,percent,completed_at) VALUES(enrollment,p_lesson_id,'completed',100,clock_timestamp())
 ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET status='completed',percent=100,completed_at=coalesce(public.lesson_progress.completed_at,excluded.completed_at),updated_at=clock_timestamp();
END $$;

CREATE FUNCTION public.learner_evaluate_completion(p_course_id uuid,p_locale text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE e public.enrollments; snapshot uuid; n int; assessments int; ready int; name text; title text; required_ids uuid[]; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023'; END IF;
 SELECT * INTO e FROM public.enrollments WHERE user_id=auth.uid() AND course_id=p_course_id AND status IN ('active','completed') AND (expires_at IS NULL OR expires_at>clock_timestamp()) ORDER BY granted_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'course access denied' USING ERRCODE='42501'; END IF;
 SELECT id INTO snapshot FROM public.course_completions WHERE enrollment_id=e.id;
 IF snapshot IS NOT NULL THEN RETURN jsonb_build_object('completed',true,'completionId',snapshot); END IF;
 SELECT ct.title INTO title FROM public.courses c JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale AND ct.publication_status='published' WHERE c.id=p_course_id AND c.status='published' FOR SHARE OF c;
 IF NOT FOUND THEN RAISE EXCEPTION 'course unavailable in this locale' USING ERRCODE='42501'; END IF;
 -- Count all published required identities, including missing locale content, so partial
 -- translations never make a smaller curriculum appear complete.
 SELECT array_agg(l.id),count(*),count(*) FILTER(WHERE l.lesson_type='assessment'),count(*) FILTER(WHERE
  EXISTS(SELECT 1 FROM public.module_translations mt WHERE mt.module_id=m.id AND mt.locale=p_locale AND mt.publication_status='published')
  AND EXISTS(SELECT 1 FROM public.lesson_translations lt WHERE lt.lesson_id=l.id AND lt.locale=p_locale AND lt.publication_status='published')
  AND EXISTS(SELECT 1 FROM public.lesson_progress p WHERE p.enrollment_id=e.id AND p.lesson_id=l.id AND p.status='completed')
  AND (l.lesson_type<>'assessment' OR EXISTS(SELECT 1 FROM public.quizzes q JOIN public.quiz_attempts a ON a.quiz_id=q.id WHERE q.lesson_id=l.id AND a.enrollment_id=e.id AND a.user_id=auth.uid() AND a.passed AND a.status<>'active')))
 INTO required_ids,n,assessments,ready FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id WHERE m.course_id=p_course_id AND m.is_required AND l.is_required AND l.status='published';
 IF n=0 OR ready<>n THEN RETURN jsonb_build_object('completed',false,'required',n,'finished',ready); END IF;
 SELECT coalesce(nullif(display_name,''),'Learner') INTO name FROM public.profiles WHERE id=auth.uid();
 INSERT INTO public.course_completions(enrollment_id,locale,required_lessons,required_assessments,course_title,learner_name) VALUES(e.id,p_locale,n,assessments,title,name) RETURNING id INTO snapshot;
 INSERT INTO public.completion_lessons(completion_id,lesson_id,quiz_attempt_id)
 SELECT snapshot,l.id,(SELECT a.id FROM public.quizzes q JOIN public.quiz_attempts a ON a.quiz_id=q.id WHERE q.lesson_id=l.id AND a.enrollment_id=e.id AND a.passed ORDER BY a.submitted_at DESC LIMIT 1)
 FROM public.lessons l WHERE l.id=ANY(required_ids);
 UPDATE public.enrollments SET status='completed',completed_at=clock_timestamp() WHERE id=e.id;
 RETURN jsonb_build_object('completed',true,'completionId',snapshot);
END $$;
REVOKE ALL ON FUNCTION learning_private.freeze_completion() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.admin_set_lesson_type(uuid,text),public.admin_list_assessment_lessons(text),public.learner_complete_reading(uuid,text),public.learner_evaluate_completion(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_lesson_type(uuid,text),public.admin_list_assessment_lessons(text),public.learner_complete_reading(uuid,text),public.learner_evaluate_completion(uuid,text) TO authenticated;
