-- DEV-only operator validation, transactional and rolled back. No real learner data.
-- Run only after confirming the ets-learn Development target. Auth identities are fixtures.
BEGIN;
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e1410000-0000-4000-8000-000000000001','authenticated','authenticated','hosted-quiz-admin@example.test','{}',now(),now()),
('e1410000-0000-4000-8000-000000000002','authenticated','authenticated','hosted-quiz-owner@example.test','{}',now(),now()),
('e1410000-0000-4000-8000-000000000003','authenticated','authenticated','hosted-quiz-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e1410000-0000-4000-8000-000000000001','admin','e1410000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e1410000-0000-4000-8000-000000000001',true);
SELECT set_config('h.course',public.admin_create_course('hosted-assessment-validation')::text,true);
SELECT public.admin_upsert_course_translation(current_setting('h.course')::uuid,'en','Hosted assessment verification','Temporary transactional fixture');
SELECT public.admin_set_translation_publication(current_setting('h.course')::uuid,'en',true);
SELECT public.admin_set_course_status(current_setting('h.course')::uuid,'published');
SELECT set_config('h.module',public.admin_create_course_module(current_setting('h.course')::uuid)::text,true);
SELECT public.admin_save_module_translation(current_setting('h.module')::uuid,'en','Verification');
SELECT public.admin_set_module_translation_publication(current_setting('h.module')::uuid,'en',true);
SELECT set_config('h.lesson',public.admin_create_lesson(current_setting('h.module')::uuid,'assessment')::text,true);
SELECT public.admin_save_lesson_translation(current_setting('h.lesson')::uuid,'en','Assessment');
SELECT public.admin_set_lesson_translation_publication(current_setting('h.lesson')::uuid,'en',true);
SELECT public.admin_set_lesson_status(current_setting('h.lesson')::uuid,'published');
SELECT set_config('h.version',public.admin_create_quiz_version(current_setting('h.lesson')::uuid,'en','Quiz','', '[{"type":"single","prompt":"Fixture question","options":[{"label":"A","correct":true},{"label":"B","correct":false}]}]')::text,true);
SELECT public.admin_publish_quiz_version(current_setting('h.version')::uuid);
RESET ROLE;
SELECT set_config('h.answers',(SELECT jsonb_object_agg(q.id,(SELECT jsonb_agg(k.option_id) FROM assessment_private.quiz_answer_keys k WHERE k.question_id=q.id))::text FROM public.questions q WHERE q.quiz_version_id=current_setting('h.version')::uuid),true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e1410000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 BEGIN PERFORM public.learner_quiz_action(current_setting('h.lesson')::uuid,'en','start');RAISE EXCEPTION 'unenrolled access accepted';EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT public.learner_grant_free_enrollment(current_setting('h.course')::uuid);
SELECT set_config('h.start',public.learner_quiz_action(current_setting('h.lesson')::uuid,'en','start')::text,true);
SELECT set_config('h.attempt',current_setting('h.start')::jsonb#>>'{attempt,id}',true);
DO $$ DECLARE r jsonb;BEGIN
 IF current_setting('h.start')::jsonb->'review'<>'null'::jsonb THEN RAISE EXCEPTION 'answer key revealed early';END IF;
 r:=public.learner_quiz_action(current_setting('h.lesson')::uuid,'en','save',current_setting('h.attempt')::uuid,1,current_setting('h.answers')::jsonb);
 IF r#>>'{attempt,sequence}'<>'1' THEN RAISE EXCEPTION 'autosave failed';END IF;
 r:=public.learner_quiz_action(current_setting('h.lesson')::uuid,'en','submit',current_setting('h.attempt')::uuid,2,current_setting('h.answers')::jsonb);
 IF r#>>'{attempt,passed}'<>'true' OR r#>>'{attempt,score}'<>'1' THEN RAISE EXCEPTION 'grading failed';END IF;
 IF jsonb_array_length(r->'review')<>1 THEN RAISE EXCEPTION 'post-submit review failed';END IF;
 BEGIN PERFORM public.learner_quiz_action(current_setting('h.lesson')::uuid,'en','save',current_setting('h.attempt')::uuid,3,'{}');RAISE EXCEPTION 'submitted answers mutable';EXCEPTION WHEN check_violation THEN NULL;END;
 r:=public.learner_evaluate_completion(current_setting('h.course')::uuid,'en');
 IF r->>'completed'<>'true' THEN RAISE EXCEPTION 'completion failed';END IF;
 PERFORM set_config('h.completion',r->>'completionId',true);
 PERFORM set_config('h.certificate',public.learner_issue_certificate((r->>'completionId')::uuid,'en')::text,true);
 IF public.learner_issue_certificate((r->>'completionId')::uuid,'ar')::text<>current_setting('h.certificate') THEN RAISE EXCEPTION 'duplicate certificate created';END IF;
 IF public.learner_learning_summary('en')->>'completedCourses'<>'1' THEN RAISE EXCEPTION 'dashboard completion mismatch';END IF;
END $$;
SELECT set_config('h.token',(SELECT verification_token::text FROM public.learner_list_certificates()),true);
SELECT set_config('request.jwt.claim.sub','e1410000-0000-4000-8000-000000000003',true);
SELECT public.learner_grant_free_enrollment(current_setting('h.course')::uuid);
DO $$ BEGIN
 BEGIN PERFORM public.learner_quiz_action(current_setting('h.lesson')::uuid,'en','get',current_setting('h.attempt')::uuid);RAISE EXCEPTION 'cross-owner attempt leaked';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 IF EXISTS(SELECT 1 FROM public.learner_list_certificates()) THEN RAISE EXCEPTION 'cross-owner certificate leaked';END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT status FROM public.verify_certificate(current_setting('h.token')::uuid))<>'valid' THEN RAISE EXCEPTION 'public verification failed';END IF;
 IF EXISTS(SELECT 1 FROM public.verify_certificate(gen_random_uuid())) THEN RAISE EXCEPTION 'invalid token leaked a record';END IF;
END $$;
RESET ROLE;
SELECT jsonb_build_object('validated',true,'checks',14,'environment','DEV','retained_fixture_data',false) AS evidence;
ROLLBACK;
