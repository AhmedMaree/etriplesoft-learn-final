-- Immutable assessments. All content/results travel through narrow authenticated RPCs.
-- No client table grants, including administrators. Answer keys never enter a safe projection.
CREATE SCHEMA assessment_private;
REVOKE ALL ON SCHEMA assessment_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.quizzes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 lesson_id uuid NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quiz_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE RESTRICT,
 version_number integer NOT NULL CHECK(version_number>0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 pass_basis_points integer NOT NULL DEFAULT 7000 CHECK(pass_basis_points BETWEEN 0 AND 10000),
 duration_seconds integer NOT NULL DEFAULT 1800 CHECK(duration_seconds BETWEEN 60 AND 14400),
 max_attempts integer NOT NULL DEFAULT 3 CHECK(max_attempts BETWEEN 1 AND 20),
 published_at timestamptz,
 UNIQUE(quiz_id,version_number), UNIQUE(quiz_id,id),
 CHECK((status='published')=(published_at IS NOT NULL))
);
CREATE TABLE public.quiz_translations (
 quiz_version_id uuid NOT NULL REFERENCES public.quiz_versions(id) ON DELETE RESTRICT,
 locale text NOT NULL CHECK(locale IN ('en','ar')),
 title text NOT NULL CHECK(char_length(btrim(title)) BETWEEN 1 AND 200),
 instructions text NOT NULL DEFAULT '' CHECK(char_length(instructions)<=2000),
 PRIMARY KEY(quiz_version_id,locale)
);
CREATE TABLE public.questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 quiz_version_id uuid NOT NULL REFERENCES public.quiz_versions(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 100),
 question_type text NOT NULL CHECK(question_type IN ('single','multiple','true_false')),
 points integer NOT NULL DEFAULT 1 CHECK(points BETWEEN 1 AND 100),
 UNIQUE(quiz_version_id,position), UNIQUE(quiz_version_id,id)
);
CREATE TABLE public.question_translations (
 question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
 locale text NOT NULL CHECK(locale IN ('en','ar')),
 prompt text NOT NULL CHECK(char_length(btrim(prompt)) BETWEEN 1 AND 4000),
 explanation text NOT NULL DEFAULT '' CHECK(char_length(explanation)<=4000),
 PRIMARY KEY(question_id,locale)
);
CREATE TABLE public.question_options (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK(position BETWEEN 1 AND 10),
 UNIQUE(question_id,position), UNIQUE(question_id,id)
);
CREATE TABLE public.option_translations (
 option_id uuid NOT NULL REFERENCES public.question_options(id) ON DELETE RESTRICT,
 locale text NOT NULL CHECK(locale IN ('en','ar')),
 label text NOT NULL CHECK(char_length(btrim(label)) BETWEEN 1 AND 1000),
 PRIMARY KEY(option_id,locale)
);
CREATE TABLE assessment_private.quiz_answer_keys (
 question_id uuid NOT NULL, option_id uuid NOT NULL,
 PRIMARY KEY(question_id,option_id),
 FOREIGN KEY(question_id,option_id) REFERENCES public.question_options(question_id,id) ON DELETE RESTRICT
);
CREATE TABLE public.quiz_attempts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE RESTRICT,
 quiz_id uuid NOT NULL, quiz_version_id uuid NOT NULL,
 FOREIGN KEY(quiz_id,quiz_version_id) REFERENCES public.quiz_versions(quiz_id,id) ON DELETE RESTRICT,
 attempt_number integer NOT NULL CHECK(attempt_number>0),
 locale text NOT NULL CHECK(locale IN ('en','ar')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','submitted','timed_out')),
 started_at timestamptz NOT NULL DEFAULT clock_timestamp(), deadline timestamptz NOT NULL,
 submitted_at timestamptz, score integer, possible_score integer, passed boolean,
 last_sequence integer NOT NULL DEFAULT 0 CHECK(last_sequence>=0),
 UNIQUE(user_id,quiz_version_id,attempt_number), UNIQUE(id,quiz_version_id),
 CHECK(deadline>started_at),
 CHECK((status='active' AND submitted_at IS NULL AND score IS NULL AND possible_score IS NULL AND passed IS NULL)
 OR (status<>'active' AND submitted_at>=started_at AND score>=0 AND possible_score>0 AND score<=possible_score AND passed IS NOT NULL))
);
CREATE UNIQUE INDEX quiz_attempts_one_active ON public.quiz_attempts(user_id,quiz_id) WHERE status='active';
CREATE INDEX quiz_attempts_enrollment_idx ON public.quiz_attempts(enrollment_id);
CREATE INDEX quiz_attempts_version_idx ON public.quiz_attempts(quiz_version_id,user_id);
CREATE TABLE public.quiz_answers (
 attempt_id uuid NOT NULL, quiz_version_id uuid NOT NULL, question_id uuid NOT NULL,
 FOREIGN KEY(attempt_id,quiz_version_id) REFERENCES public.quiz_attempts(id,quiz_version_id) ON DELETE RESTRICT,
 FOREIGN KEY(quiz_version_id,question_id) REFERENCES public.questions(quiz_version_id,id) ON DELETE RESTRICT,
 PRIMARY KEY(attempt_id,question_id)
);
CREATE INDEX quiz_answers_question_idx ON public.quiz_answers(question_id);
CREATE TABLE public.quiz_answer_selections (
 attempt_id uuid NOT NULL, question_id uuid NOT NULL, option_id uuid NOT NULL,
 PRIMARY KEY(attempt_id,question_id,option_id),
 FOREIGN KEY(attempt_id,question_id) REFERENCES public.quiz_answers(attempt_id,question_id) ON DELETE RESTRICT,
 FOREIGN KEY(question_id,option_id) REFERENCES public.question_options(question_id,id) ON DELETE RESTRICT
);
CREATE INDEX quiz_selections_option_idx ON public.quiz_answer_selections(option_id);

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['quizzes','quiz_versions','quiz_translations','questions','question_translations','question_options','option_translations','quiz_attempts','quiz_answers','quiz_answer_selections'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
 END LOOP;
END $$;
ALTER TABLE assessment_private.quiz_answer_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON assessment_private.quiz_answer_keys FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION assessment_private.freeze_version() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v uuid; BEGIN
 IF TG_TABLE_NAME='quiz_versions' THEN
  IF OLD.status='published' THEN RAISE EXCEPTION 'published assessment is immutable' USING ERRCODE='23514'; END IF;
 ELSE
  IF TG_TABLE_NAME IN ('questions','quiz_translations') THEN
   v := (CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'quiz_version_id';
  ELSIF TG_TABLE_NAME IN ('question_options','question_translations','quiz_answer_keys') THEN
   SELECT quiz_version_id INTO v FROM public.questions WHERE id=((CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'question_id')::uuid;
  ELSE
   SELECT q.quiz_version_id INTO v FROM public.question_options o JOIN public.questions q ON q.id=o.question_id
    WHERE o.id=((CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END)->>'option_id')::uuid;
  END IF;
  IF EXISTS(SELECT 1 FROM public.quiz_versions WHERE id=v AND status='published') THEN RAISE EXCEPTION 'published assessment is immutable' USING ERRCODE='23514'; END IF;
  -- Updates cannot move a row out of its published parent either.
  IF TG_OP='UPDATE' THEN
   IF TG_TABLE_NAME IN ('questions','quiz_translations') THEN
    IF OLD.quiz_version_id<>NEW.quiz_version_id THEN RAISE EXCEPTION 'assessment parent is immutable' USING ERRCODE='23514'; END IF;
   ELSIF TG_TABLE_NAME IN ('question_options','question_translations','quiz_answer_keys') THEN
    IF OLD.question_id<>NEW.question_id THEN RAISE EXCEPTION 'question parent is immutable' USING ERRCODE='23514'; END IF;
   ELSIF TG_TABLE_NAME='option_translations' THEN
    IF OLD.option_id<>NEW.option_id THEN RAISE EXCEPTION 'option parent is immutable' USING ERRCODE='23514'; END IF;
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER freeze_version BEFORE UPDATE OR DELETE ON public.quiz_versions FOR EACH ROW EXECUTE FUNCTION assessment_private.freeze_version();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['quiz_translations','questions','question_translations','question_options','option_translations'] LOOP
 EXECUTE format('CREATE TRIGGER freeze_content BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION assessment_private.freeze_version()',t);
 END LOOP;
END $$;
CREATE TRIGGER freeze_keys BEFORE INSERT OR UPDATE OR DELETE ON assessment_private.quiz_answer_keys FOR EACH ROW EXECUTE FUNCTION assessment_private.freeze_version();

-- A new draft version is created atomically from bounded author input, never from learner input.
-- Uniform one-point questions and exact-set scoring are the initial authoring contract.
CREATE FUNCTION public.admin_create_quiz_version(p_lesson_id uuid,p_locale text,p_title text,p_instructions text,p_questions jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); quiz uuid; version uuid; question uuid; option uuid; item jsonb; choice jsonb; n int:=0; j int; correct int;
BEGIN
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') OR jsonb_typeof(p_questions) IS DISTINCT FROM 'array' OR jsonb_array_length(p_questions) NOT BETWEEN 1 AND 100 OR octet_length(p_questions::text)>500000 THEN RAISE EXCEPTION 'invalid assessment input' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.lessons WHERE id=p_lesson_id AND lesson_type='assessment' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'assessment lesson required' USING ERRCODE='23514'; END IF;
 INSERT INTO public.quizzes(lesson_id) VALUES(p_lesson_id) ON CONFLICT(lesson_id) DO NOTHING;
 SELECT id INTO quiz FROM public.quizzes WHERE lesson_id=p_lesson_id FOR UPDATE;
 INSERT INTO public.quiz_versions(quiz_id,version_number) SELECT quiz,coalesce(max(version_number),0)+1 FROM public.quiz_versions WHERE quiz_id=quiz RETURNING id INTO version;
 INSERT INTO public.quiz_translations VALUES(version,p_locale,btrim(p_title),coalesce(p_instructions,''));
 FOR item IN SELECT value FROM jsonb_array_elements(p_questions) LOOP
  n:=n+1; j:=0; correct:=0;
  IF jsonb_typeof(item->'options') IS DISTINCT FROM 'array' OR jsonb_array_length(item->'options') NOT BETWEEN 2 AND 10 THEN RAISE EXCEPTION 'two to ten options required' USING ERRCODE='23514'; END IF;
  INSERT INTO public.questions(quiz_version_id,position,question_type) VALUES(version,n,item->>'type') RETURNING id INTO question;
  INSERT INTO public.question_translations VALUES(question,p_locale,item->>'prompt',coalesce(item->>'explanation',''));
  FOR choice IN SELECT value FROM jsonb_array_elements(item->'options') LOOP
   j:=j+1;
   IF jsonb_typeof(choice->'correct') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'correct flag required' USING ERRCODE='22023'; END IF;
   INSERT INTO public.question_options(question_id,position) VALUES(question,j) RETURNING id INTO option;
   INSERT INTO public.option_translations VALUES(option,p_locale,choice->>'label');
   IF (choice->>'correct')::boolean THEN INSERT INTO assessment_private.quiz_answer_keys VALUES(question,option); correct:=correct+1; END IF;
  END LOOP;
  IF correct=0 OR (item->>'type' IN ('single','true_false') AND correct<>1) OR (item->>'type'='true_false' AND j<>2) THEN RAISE EXCEPTION 'invalid answer-key cardinality' USING ERRCODE='23514'; END IF;
 END LOOP;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,lesson_id,safe_summary) VALUES(actor,'lesson.updated','lesson',p_lesson_id,'Created draft assessment version');
 RETURN version;
END $$;

CREATE FUNCTION public.admin_publish_quiz_version(p_version_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); lesson uuid; BEGIN
 SELECT q.lesson_id INTO lesson FROM public.quiz_versions v JOIN public.quizzes q ON q.id=v.quiz_id WHERE v.id=p_version_id AND v.status='draft' FOR UPDATE OF v;
 IF NOT FOUND THEN RAISE EXCEPTION 'draft assessment not found' USING ERRCODE='P0002'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.questions WHERE quiz_version_id=p_version_id)
 OR NOT EXISTS(SELECT 1 FROM public.quiz_translations WHERE quiz_version_id=p_version_id)
 OR EXISTS(SELECT 1 FROM public.questions q CROSS JOIN public.quiz_translations t WHERE q.quiz_version_id=p_version_id AND t.quiz_version_id=p_version_id AND
  (NOT EXISTS(SELECT 1 FROM public.question_translations qt WHERE qt.question_id=q.id AND qt.locale=t.locale)
  OR EXISTS(SELECT 1 FROM public.question_options o WHERE o.question_id=q.id AND NOT EXISTS(SELECT 1 FROM public.option_translations ot WHERE ot.option_id=o.id AND ot.locale=t.locale))
  OR (SELECT count(*) FROM public.question_options o WHERE o.question_id=q.id) NOT BETWEEN 2 AND 10
  OR (SELECT count(*) FROM assessment_private.quiz_answer_keys k WHERE k.question_id=q.id)=0
  OR (q.question_type IN ('single','true_false') AND (SELECT count(*) FROM assessment_private.quiz_answer_keys k WHERE k.question_id=q.id)<>1)
  OR (q.question_type='true_false' AND (SELECT count(*) FROM public.question_options o WHERE o.question_id=q.id)<>2)))
 THEN RAISE EXCEPTION 'incomplete assessment cannot publish' USING ERRCODE='23514'; END IF;
 UPDATE public.quiz_versions SET status='published',published_at=clock_timestamp() WHERE id=p_version_id;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,lesson_id,safe_summary) VALUES(actor,'lesson.updated','lesson',lesson,'Published immutable assessment version');
END $$;

-- Translate a draft using identical ordered question/option identities. Scoring stays neutral.
CREATE FUNCTION public.admin_localize_quiz_draft(p_version_id uuid,p_locale text,p_title text,p_instructions text,p_questions jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); question record; option record; item jsonb; choices jsonb; lesson uuid; BEGIN
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') OR jsonb_typeof(p_questions) IS DISTINCT FROM 'array' OR octet_length(p_questions::text)>500000 THEN RAISE EXCEPTION 'invalid assessment translation' USING ERRCODE='22023'; END IF;
 SELECT q.lesson_id INTO lesson FROM public.quiz_versions v JOIN public.quizzes q ON q.id=v.quiz_id WHERE v.id=p_version_id AND v.status='draft' FOR UPDATE OF v;
 IF NOT FOUND THEN RAISE EXCEPTION 'draft version required' USING ERRCODE='23514'; END IF;
 IF jsonb_array_length(p_questions)<>(SELECT count(*) FROM public.questions WHERE quiz_version_id=p_version_id) THEN RAISE EXCEPTION 'translation question count differs' USING ERRCODE='23514'; END IF;
 INSERT INTO public.quiz_translations VALUES(p_version_id,p_locale,btrim(p_title),coalesce(p_instructions,'')) ON CONFLICT(quiz_version_id,locale) DO UPDATE SET title=excluded.title,instructions=excluded.instructions;
 FOR question IN SELECT * FROM public.questions WHERE quiz_version_id=p_version_id ORDER BY position LOOP
  item:=p_questions->(question.position-1);choices:=item->'options';
  IF jsonb_typeof(choices) IS DISTINCT FROM 'array' OR jsonb_array_length(choices)<>(SELECT count(*) FROM public.question_options WHERE question_id=question.id) THEN RAISE EXCEPTION 'translation option count differs' USING ERRCODE='23514'; END IF;
  INSERT INTO public.question_translations VALUES(question.id,p_locale,item->>'prompt',coalesce(item->>'explanation','')) ON CONFLICT(question_id,locale) DO UPDATE SET prompt=excluded.prompt,explanation=excluded.explanation;
  FOR option IN SELECT * FROM public.question_options WHERE question_id=question.id ORDER BY position LOOP
   INSERT INTO public.option_translations VALUES(option.id,p_locale,choices->>(option.position-1)) ON CONFLICT(option_id,locale) DO UPDATE SET label=excluded.label;
  END LOOP;
 END LOOP;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,lesson_id,safe_summary) VALUES(actor,'lesson.updated','lesson',lesson,'Localized draft assessment version');
END $$;

CREATE FUNCTION assessment_private.finalize(p_id uuid,p_timeout boolean) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE a public.quiz_attempts; earned int; total int; threshold int; BEGIN
 SELECT * INTO a FROM public.quiz_attempts WHERE id=p_id FOR UPDATE;
 IF a.status<>'active' THEN RETURN; END IF;
 SELECT coalesce(sum(q.points),0),coalesce(sum(CASE WHEN
  ARRAY(SELECT k.option_id FROM assessment_private.quiz_answer_keys k WHERE k.question_id=q.id ORDER BY k.option_id)
  = ARRAY(SELECT s.option_id FROM public.quiz_answer_selections s WHERE s.attempt_id=a.id AND s.question_id=q.id ORDER BY s.option_id)
  THEN q.points ELSE 0 END),0) INTO total,earned FROM public.questions q WHERE q.quiz_version_id=a.quiz_version_id;
 SELECT pass_basis_points INTO threshold FROM public.quiz_versions WHERE id=a.quiz_version_id;
 UPDATE public.quiz_attempts SET status=CASE WHEN p_timeout THEN 'timed_out' ELSE 'submitted' END,submitted_at=clock_timestamp(),score=earned,possible_score=total,passed=earned::bigint*10000>=threshold::bigint*total WHERE id=a.id;
 IF earned::bigint*10000>=threshold::bigint*total THEN
 INSERT INTO public.lesson_progress(enrollment_id,lesson_id,status,percent,completed_at)
 SELECT a.enrollment_id,q.lesson_id,'completed',100,clock_timestamp() FROM public.quizzes q WHERE q.id=a.quiz_id
 ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET status='completed',percent=100,completed_at=coalesce(public.lesson_progress.completed_at,excluded.completed_at),updated_at=clock_timestamp();
 END IF;
END $$;

CREATE FUNCTION assessment_private.projection(p_version uuid,p_attempt uuid,p_locale text) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('versionId',v.id,'title',t.title,'instructions',t.instructions,'passPercent',v.pass_basis_points/100.0,'maxAttempts',v.max_attempts,'durationSeconds',v.duration_seconds,'serverNow',clock_timestamp(),
 'attemptsUsed',(SELECT count(*) FROM public.quiz_attempts a WHERE a.user_id=auth.uid() AND a.quiz_version_id=v.id),
 'attempt',(SELECT jsonb_build_object('id',a.id,'number',a.attempt_number,'status',a.status,'deadline',a.deadline,'score',a.score,'possibleScore',a.possible_score,'passed',a.passed,'sequence',a.last_sequence,'answers',coalesce((SELECT jsonb_object_agg(x.question_id,x.options) FROM (SELECT qa.question_id,coalesce(jsonb_agg(s.option_id) FILTER(WHERE s.option_id IS NOT NULL),'[]'::jsonb) options FROM public.quiz_answers qa LEFT JOIN public.quiz_answer_selections s ON s.attempt_id=qa.attempt_id AND s.question_id=qa.question_id WHERE qa.attempt_id=a.id GROUP BY qa.question_id) x),'{}'::jsonb)) FROM public.quiz_attempts a WHERE a.id=p_attempt AND a.user_id=auth.uid()),
 'questions',(SELECT jsonb_agg(jsonb_build_object('id',q.id,'type',q.question_type,'prompt',qt.prompt,'options',(SELECT jsonb_agg(jsonb_build_object('id',o.id,'label',ot.label) ORDER BY o.position) FROM public.question_options o JOIN public.option_translations ot ON ot.option_id=o.id AND ot.locale=p_locale WHERE o.question_id=q.id)) ORDER BY q.position) FROM public.questions q JOIN public.question_translations qt ON qt.question_id=q.id AND qt.locale=p_locale WHERE q.quiz_version_id=v.id),
 'review',CASE WHEN EXISTS(SELECT 1 FROM public.quiz_attempts a WHERE a.id=p_attempt AND a.user_id=auth.uid() AND a.status<>'active') THEN
 (SELECT jsonb_agg(jsonb_build_object('questionId',q.id,'correctOptions',ARRAY(SELECT k.option_id FROM assessment_private.quiz_answer_keys k WHERE k.question_id=q.id),'explanation',qt.explanation) ORDER BY q.position) FROM public.questions q JOIN public.question_translations qt ON qt.question_id=q.id AND qt.locale=p_locale WHERE q.quiz_version_id=v.id) ELSE NULL END)
 FROM public.quiz_versions v JOIN public.quiz_translations t ON t.quiz_version_id=v.id AND t.locale=p_locale WHERE v.id=p_version AND v.status='published';
$$;

-- All mutation paths recheck current entitlement. Locks serialize retries, autosaves and submission.
CREATE FUNCTION public.learner_quiz_action(p_lesson_id uuid,p_locale text,p_action text,p_attempt_id uuid DEFAULT NULL,p_sequence integer DEFAULT NULL,p_answers jsonb DEFAULT NULL)
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
  INSERT INTO public.quiz_attempts(user_id,enrollment_id,quiz_id,quiz_version_id,attempt_number,locale,deadline) VALUES(uid,enrollment,quiz,version,n+1,p_locale,clock_timestamp()+make_interval(secs=>seconds)) RETURNING * INTO a;
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

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA assessment_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.admin_create_quiz_version(uuid,text,text,text,jsonb),public.admin_localize_quiz_draft(uuid,text,text,text,jsonb),public.admin_publish_quiz_version(uuid),public.learner_quiz_action(uuid,text,text,uuid,integer,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_quiz_version(uuid,text,text,text,jsonb),public.admin_localize_quiz_draft(uuid,text,text,text,jsonb),public.admin_publish_quiz_version(uuid),public.learner_quiz_action(uuid,text,text,uuid,integer,jsonb) TO authenticated;
