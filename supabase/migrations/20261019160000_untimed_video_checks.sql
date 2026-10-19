-- Untimed quizzes for the two-question checks shown inside the video panel after a video ends.
-- quiz_versions.duration_seconds NULL now means "no time limit": an attempt on such a version gets an
-- infinite deadline, so it never times out, and the learner projection reports its deadline as null.
-- Timed quizzes (the default 1800 seconds, final assessments) behave exactly as before.
-- Published versions stay immutable: a check becomes untimed by publishing a new untimed version.

ALTER TABLE public.quiz_versions ALTER COLUMN duration_seconds DROP NOT NULL;

-- Marks a draft version untimed before it is published. Same authority and audit as other quiz authoring.
CREATE FUNCTION public.admin_set_quiz_draft_untimed(p_version_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); lesson uuid; BEGIN
 SELECT q.lesson_id INTO lesson FROM public.quiz_versions v JOIN public.quizzes q ON q.id=v.quiz_id WHERE v.id=p_version_id AND v.status='draft' FOR UPDATE OF v;
 IF NOT FOUND THEN RAISE EXCEPTION 'draft assessment not found' USING ERRCODE='P0002'; END IF;
 UPDATE public.quiz_versions SET duration_seconds=NULL WHERE id=p_version_id;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,lesson_id,safe_summary) VALUES(actor,'lesson.updated','lesson',lesson,'Removed draft assessment time limit');
END $$;
REVOKE ALL ON FUNCTION public.admin_set_quiz_draft_untimed(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_quiz_draft_untimed(uuid) TO authenticated;

-- Unchanged from 20261014050330 except: an infinite deadline is reported as null.
CREATE OR REPLACE FUNCTION assessment_private.projection(p_version uuid,p_attempt uuid,p_locale text) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('versionId',v.id,'title',t.title,'instructions',t.instructions,'passPercent',v.pass_basis_points/100.0,'maxAttempts',v.max_attempts,'durationSeconds',v.duration_seconds,'serverNow',clock_timestamp(),
 'attemptsUsed',(SELECT count(*) FROM public.quiz_attempts a WHERE a.user_id=auth.uid() AND a.quiz_version_id=v.id),
 'attempt',(SELECT jsonb_build_object('id',a.id,'number',a.attempt_number,'status',a.status,'deadline',CASE WHEN isfinite(a.deadline) THEN a.deadline END,'score',a.score,'possibleScore',a.possible_score,'passed',a.passed,'sequence',a.last_sequence,'answers',coalesce((SELECT jsonb_object_agg(x.question_id,x.options) FROM (SELECT qa.question_id,coalesce(jsonb_agg(s.option_id) FILTER(WHERE s.option_id IS NOT NULL),'[]'::jsonb) options FROM public.quiz_answers qa LEFT JOIN public.quiz_answer_selections s ON s.attempt_id=qa.attempt_id AND s.question_id=qa.question_id WHERE qa.attempt_id=a.id GROUP BY qa.question_id) x),'{}'::jsonb)) FROM public.quiz_attempts a WHERE a.id=p_attempt AND a.user_id=auth.uid()),
 'questions',(SELECT jsonb_agg(jsonb_build_object('id',q.id,'type',q.question_type,'prompt',qt.prompt,'options',(SELECT jsonb_agg(jsonb_build_object('id',o.id,'label',ot.label) ORDER BY o.position) FROM public.question_options o JOIN public.option_translations ot ON ot.option_id=o.id AND ot.locale=p_locale WHERE o.question_id=q.id)) ORDER BY q.position) FROM public.questions q JOIN public.question_translations qt ON qt.question_id=q.id AND qt.locale=p_locale WHERE q.quiz_version_id=v.id),
 'review',CASE WHEN EXISTS(SELECT 1 FROM public.quiz_attempts a WHERE a.id=p_attempt AND a.user_id=auth.uid() AND a.status<>'active') THEN
 (SELECT jsonb_agg(jsonb_build_object('questionId',q.id,'correctOptions',ARRAY(SELECT k.option_id FROM assessment_private.quiz_answer_keys k WHERE k.question_id=q.id),'explanation',qt.explanation) ORDER BY q.position) FROM public.questions q JOIN public.question_translations qt ON qt.question_id=q.id AND qt.locale=p_locale WHERE q.quiz_version_id=v.id) ELSE NULL END)
 FROM public.quiz_versions v JOIN public.quiz_translations t ON t.quiz_version_id=v.id AND t.locale=p_locale WHERE v.id=p_version AND v.status='published';
$$;

-- Unchanged from 20261014050330 except: an untimed version starts an attempt with an infinite deadline.
CREATE OR REPLACE FUNCTION public.learner_quiz_action(p_lesson_id uuid,p_locale text,p_action text,p_attempt_id uuid DEFAULT NULL,p_sequence integer DEFAULT NULL,p_answers jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); course uuid; enrollment uuid; quiz uuid; version uuid; a public.quiz_attempts; limit_attempts int; seconds int; n int; item record; oid uuid; qid uuid; qtype text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('get','start','save','submit') THEN RAISE EXCEPTION 'invalid operation' USING ERRCODE='22023'; END IF;
 SELECT ll.course_id INTO course FROM public.learner_get_lesson(p_lesson_id,p_locale) ll WHERE ll.lesson_type='assessment';
 IF course IS NULL THEN RAISE EXCEPTION 'assessment access denied' USING ERRCODE='42501'; END IF;
 SELECT e.id INTO enrollment FROM public.enrollments e WHERE e.user_id=uid AND e.course_id=course AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>clock_timestamp()) ORDER BY e.granted_at DESC LIMIT 1 FOR UPDATE;
 IF enrollment IS NULL THEN RAISE EXCEPTION 'enrollment required' USING ERRCODE='42501'; END IF;
 SELECT id INTO quiz FROM public.quizzes WHERE lesson_id=p_lesson_id;
 IF quiz IS NULL THEN RETURN NULL; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||quiz::text,0));
 IF p_attempt_id IS NOT NULL THEN
  SELECT * INTO a FROM public.quiz_attempts WHERE id=p_attempt_id AND quiz_id=quiz AND user_id=uid AND enrollment_id=enrollment FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'attempt access denied' USING ERRCODE='42501'; END IF;
 ELSE
  SELECT * INTO a FROM public.quiz_attempts WHERE quiz_id=quiz AND user_id=uid AND enrollment_id=enrollment ORDER BY (status='active') DESC,started_at DESC LIMIT 1 FOR UPDATE;
 END IF;
 IF a.id IS NOT NULL THEN version:=a.quiz_version_id; END IF;
 IF version IS NULL OR (p_action='start' AND a.status IS DISTINCT FROM 'active') THEN
  SELECT v.id INTO version FROM public.quiz_versions v JOIN public.quiz_translations t ON t.quiz_version_id=v.id AND t.locale=p_locale WHERE v.quiz_id=quiz AND v.status='published' ORDER BY v.version_number DESC LIMIT 1;
 END IF;
 IF version IS NULL THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.quiz_translations WHERE quiz_version_id=version AND locale=p_locale) THEN RAISE EXCEPTION 'assessment locale unavailable' USING ERRCODE='P0002'; END IF;
 IF a.id IS NOT NULL AND a.status='active' AND a.deadline<=clock_timestamp() THEN
  PERFORM assessment_private.finalize(a.id,true);
  IF p_action IN ('save','submit','get') THEN RETURN assessment_private.projection(a.quiz_version_id,a.id,p_locale); END IF;
  a.status:='timed_out';
 END IF;
 IF p_action='start' AND a.status IS DISTINCT FROM 'active' THEN
  SELECT max_attempts,duration_seconds INTO limit_attempts,seconds FROM public.quiz_versions WHERE id=version;
  SELECT count(*) INTO n FROM public.quiz_attempts WHERE user_id=uid AND quiz_version_id=version;
  IF n>=limit_attempts THEN RAISE EXCEPTION 'attempt limit reached' USING ERRCODE='23514'; END IF;
  INSERT INTO public.quiz_attempts(user_id,enrollment_id,quiz_id,quiz_version_id,attempt_number,locale,deadline) VALUES(uid,enrollment,quiz,version,n+1,p_locale,CASE WHEN seconds IS NULL THEN 'infinity'::timestamptz ELSE clock_timestamp()+make_interval(secs=>seconds) END) RETURNING * INTO a;
 END IF;
 IF p_action IN ('save','submit') THEN
  IF a.id IS NULL OR p_attempt_id IS NULL THEN RAISE EXCEPTION 'attempt required' USING ERRCODE='22023'; END IF;
  IF a.status<>'active' THEN
   IF p_action='save' THEN RAISE EXCEPTION 'submitted answers are immutable' USING ERRCODE='23514'; END IF;
   RETURN assessment_private.projection(version,a.id,p_locale);
  END IF;
  IF p_sequence IS NULL OR p_sequence<1 OR jsonb_typeof(p_answers) IS DISTINCT FROM 'object' OR octet_length(p_answers::text)>100000 OR (SELECT count(*) FROM jsonb_object_keys(p_answers))>100 THEN RAISE EXCEPTION 'invalid answer snapshot' USING ERRCODE='22023'; END IF;
  IF p_sequence>a.last_sequence THEN
   -- Validate the entire snapshot before replacing any stored choices.
   FOR item IN SELECT * FROM jsonb_each(p_answers) LOOP
    qid:=item.key::uuid;
    SELECT question_type INTO qtype FROM public.questions WHERE id=qid AND quiz_version_id=version;
    IF NOT FOUND OR jsonb_typeof(item.value)<>'array' OR jsonb_array_length(item.value)>10 THEN RAISE EXCEPTION 'invalid question selection' USING ERRCODE='22023'; END IF;
    IF qtype IN ('single','true_false') AND jsonb_array_length(item.value)>1 THEN RAISE EXCEPTION 'single choice required' USING ERRCODE='22023'; END IF;
    IF (SELECT count(*) FROM jsonb_array_elements(item.value))<>(SELECT count(DISTINCT value) FROM jsonb_array_elements(item.value)) THEN RAISE EXCEPTION 'duplicate selection' USING ERRCODE='22023'; END IF;
    FOR oid IN SELECT value::uuid FROM jsonb_array_elements_text(item.value) LOOP
     IF NOT EXISTS(SELECT 1 FROM public.question_options WHERE id=oid AND question_id=qid) THEN RAISE EXCEPTION 'option does not belong to question' USING ERRCODE='22023'; END IF;
    END LOOP;
   END LOOP;
   DELETE FROM public.quiz_answer_selections WHERE attempt_id=a.id;
   DELETE FROM public.quiz_answers WHERE attempt_id=a.id;
   FOR item IN SELECT * FROM jsonb_each(p_answers) LOOP
    INSERT INTO public.quiz_answers VALUES(a.id,version,item.key::uuid);
    INSERT INTO public.quiz_answer_selections SELECT a.id,item.key::uuid,value::uuid FROM jsonb_array_elements_text(item.value);
   END LOOP;
   UPDATE public.quiz_attempts SET last_sequence=p_sequence WHERE id=a.id;
  END IF;
  IF p_action='submit' THEN PERFORM assessment_private.finalize(a.id,false); END IF;
 END IF;
 RETURN assessment_private.projection(version,a.id,p_locale);
END $$;
