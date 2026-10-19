BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT plan(23);
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e3000000-0000-4000-8000-000000000001','authenticated','authenticated','feedback-admin@example.test','{}',now(),now()),
('e3000000-0000-4000-8000-000000000002','authenticated','authenticated','feedback-learner@example.test','{"display_name":"Enrolled Learner"}',now(),now()),
('e3000000-0000-4000-8000-000000000003','authenticated','authenticated','feedback-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e3000000-0000-4000-8000-000000000001','admin','e3000000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
SELECT set_config('c.course',public.admin_save_course_content('feedback-check','en','Feedback course','Fixture','',0,'','beginner',true)::text,true);

-- Enrolled learner: one review per course (upsert), questions and answers.
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000002',true);
SELECT public.learner_grant_free_enrollment(current_setting('c.course')::uuid);
SELECT throws_ok($$SELECT public.learner_save_course_review(current_setting('c.course')::uuid,6,'',  'en')$$,'22023',NULL,'rating must be 1 to 5');
SELECT lives_ok($$SELECT public.learner_save_course_review(current_setting('c.course')::uuid,4,' Good ','en')$$,'enrolled learner can review');
SELECT lives_ok($$SELECT public.learner_save_course_review(current_setting('c.course')::uuid,5,'Great','en')$$,'second save updates the review');
SELECT is((SELECT count(*)::int FROM public.catalog_list_course_reviews(current_setting('c.course')::uuid,20,0)),1,'one review per learner');
SELECT is((SELECT rating||':'||body||':'||author_name||':'||is_mine FROM public.catalog_list_course_reviews(current_setting('c.course')::uuid,20,0)),'5:Great:Enrolled Learner:true','review projection with display name');
SELECT set_config('c.question',public.learner_ask_course_question(current_setting('c.course')::uuid,'How do I start?','en')::text,true);
SELECT throws_ok($$SELECT public.learner_ask_course_question(current_setting('c.course')::uuid,'   ','en')$$,'22023',NULL,'empty question rejected');
SELECT set_config('c.answer',public.learner_answer_course_question(current_setting('c.question')::uuid,'Open lesson one.')::text,true);
SELECT is((SELECT jsonb_array_length(answers) FROM public.learner_list_course_questions(current_setting('c.course')::uuid,20,0)),1,'answers are nested under the question');
SELECT is((SELECT (answers->0->>'isStaff')::boolean FROM public.learner_list_course_questions(current_setting('c.course')::uuid,20,0)),false,'learner answer is not staff');

-- Signed-in learner without enrollment.
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000003',true);
SELECT throws_ok($$SELECT public.learner_save_course_review(current_setting('c.course')::uuid,1,'','en')$$,'42501',NULL,'unenrolled learner cannot review');
SELECT throws_ok($$SELECT * FROM public.learner_list_course_questions(current_setting('c.course')::uuid,20,0)$$,'42501',NULL,'unenrolled learner cannot read Q&A');
SELECT throws_ok($$SELECT public.learner_ask_course_question(current_setting('c.course')::uuid,'Hi','en')$$,'42501',NULL,'unenrolled learner cannot ask');
SELECT throws_ok($$SELECT public.learner_answer_course_question(current_setting('c.question')::uuid,'Hi')$$,'P0002',NULL,'unenrolled learner cannot answer');
SELECT throws_ok($$SELECT public.learner_delete_course_review((SELECT id FROM public.catalog_list_course_reviews(current_setting('c.course')::uuid,20,0)))$$,'P0002',NULL,'another learner cannot delete a review');
SELECT throws_ok($$SELECT public.learner_delete_course_question(current_setting('c.question')::uuid)$$,'P0002',NULL,'another learner cannot delete a question');
SELECT is((SELECT can_remove FROM public.catalog_list_course_reviews(current_setting('c.course')::uuid,20,0)),false,'other learners see no remove right');
SELECT throws_ok($$SELECT * FROM public.course_reviews$$,'42501',NULL,'review table is not exposed');
SELECT throws_ok($$INSERT INTO public.course_questions(course_id,user_id,body,locale) VALUES(current_setting('c.course')::uuid,'e3000000-0000-4000-8000-000000000003','x','en')$$,'42501',NULL,'question table cannot be written directly');

-- Administrator: staff answers and audited moderation.
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
SELECT public.learner_answer_course_question(current_setting('c.question')::uuid,'Welcome!');
SELECT is((SELECT (answers->1->>'isStaff')::boolean FROM public.learner_list_course_questions(current_setting('c.course')::uuid,20,0)),true,'admin answer is marked staff');
SELECT lives_ok($$SELECT public.learner_delete_course_answer(current_setting('c.answer')::uuid)$$,'admin removes a learner answer');
SELECT lives_ok($$SELECT public.learner_delete_course_review((SELECT id FROM public.catalog_list_course_reviews(current_setting('c.course')::uuid,20,0)))$$,'admin removes a review');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.admin_audit_log WHERE action='course.feedback_removed' AND course_id=current_setting('c.course')::uuid),2,'moderation removals are audited');

-- Anonymous visitors: summary, reviews and resources only.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT is((SELECT review_count||':'||question_count FROM public.catalog_course_feedback_summary(current_setting('c.course')::uuid)),'0:1','public summary counts');
SELECT is((SELECT count(*)::int FROM public.learner_list_course_resources(current_setting('c.course')::uuid,'en')),0,'anonymous resource list is callable');
RESET ROLE;
SELECT ok(NOT has_function_privilege('anon','public.learner_list_course_questions(uuid,integer,integer)','EXECUTE')
 AND NOT has_function_privilege('anon','public.learner_save_course_review(uuid,integer,text,text)','EXECUTE')
 AND NOT has_function_privilege('authenticated','public.course_feedback_assert_rate(uuid)','EXECUTE'),'learner writes and helpers are not exposed to anonymous callers');
SELECT * FROM finish();ROLLBACK;
