BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e1500000-0000-4000-8000-000000000001','authenticated','authenticated','sequence-admin@example.test','{}',now(),now()),
('e1500000-0000-4000-8000-000000000002','authenticated','authenticated','sequence-learner@example.test','{}',now(),now()),
('e1500000-0000-4000-8000-000000000003','authenticated','authenticated','sequence-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e1500000-0000-4000-8000-000000000001','admin','e1500000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e1500000-0000-4000-8000-000000000001',true);
SELECT set_config('s.course',public.admin_create_course('sequence-unlock-test')::text,true);
SELECT public.admin_upsert_course_translation(current_setting('s.course')::uuid,'en','Sequence test','Test');
SELECT public.admin_set_translation_publication(current_setting('s.course')::uuid,'en',true);
SELECT public.admin_set_course_status(current_setting('s.course')::uuid,'published');
SELECT set_config('s.m1',public.admin_create_course_module(current_setting('s.course')::uuid)::text,true);
SELECT set_config('s.m2',public.admin_create_course_module(current_setting('s.course')::uuid)::text,true);
SELECT public.admin_save_module_translation(current_setting('s.m1')::uuid,'en','Module 1');
SELECT public.admin_set_module_translation_publication(current_setting('s.m1')::uuid,'en',true);
SELECT public.admin_save_module_translation(current_setting('s.m2')::uuid,'en','Module 2');
SELECT public.admin_set_module_translation_publication(current_setting('s.m2')::uuid,'en',true);
-- Module 1: L1, final assessment F (placed mid-module on purpose), L2, optional P. Module 2: L3.
SELECT set_config('s.l1',public.admin_create_lesson(current_setting('s.m1')::uuid,'article')::text,true);
SELECT set_config('s.f',public.admin_create_lesson(current_setting('s.m1')::uuid,'assessment')::text,true);
SELECT set_config('s.l2',public.admin_create_lesson(current_setting('s.m1')::uuid,'article')::text,true);
SELECT set_config('s.p',public.admin_create_lesson(current_setting('s.m1')::uuid,'article',false)::text,true);
SELECT set_config('s.l3',public.admin_create_lesson(current_setting('s.m2')::uuid,'article')::text,true);
SELECT public.admin_save_lesson_translation(id,'en','Lesson',NULL,'Body'),
  public.admin_set_lesson_translation_publication(id,'en',true),
  public.admin_set_lesson_status(id,'published')
FROM unnest(ARRAY[current_setting('s.l1'),current_setting('s.f'),current_setting('s.l2'),current_setting('s.p'),current_setting('s.l3')]::uuid[]) id;

-- Administrators reach every lesson without enrolling.
SELECT is((SELECT count(*)::int FROM public.learner_unlocked_lessons(current_setting('s.course')::uuid)),5,'admin has every lesson unlocked without enrollment');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l3')::uuid,'en')),1,'admin opens a later-module lesson directly');
SELECT is((SELECT count(*)::int FROM public.learner_list_assessments('en') WHERE lesson_id=current_setting('s.f')::uuid),1,'admin assessment directory lists unenrolled course');

SELECT set_config('request.jwt.claim.sub','e1500000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l1')::uuid,'en')),0,'unenrolled learner still denied');

SELECT set_config('request.jwt.claim.sub','e1500000-0000-4000-8000-000000000002',true);
SELECT public.learner_grant_free_enrollment(current_setting('s.course')::uuid);
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l1')::uuid,'en')),1,'first lesson open');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l2')::uuid,'en')),0,'second lesson locked until first is finished');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l3')::uuid,'en')),0,'next module locked');
SELECT throws_ok($$SELECT public.learner_complete_reading(current_setting('s.l3')::uuid,'en')$$,'42501',NULL,'locked lesson cannot be completed out of order');

SELECT public.learner_complete_reading(current_setting('s.l1')::uuid,'en');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l2')::uuid,'en')),1,'finishing a lesson unlocks the next');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.f')::uuid,'en')),0,'assessment locked while lessons remain');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l3')::uuid,'en')),0,'next module locked until the module is finished');

SELECT public.learner_complete_reading(current_setting('s.l2')::uuid,'en');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.l3')::uuid,'en')),1,'finishing a module unlocks the next module');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.p')::uuid,'en')),1,'optional lesson opens after the required lessons before it');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.f')::uuid,'en')),0,'assessment waits for lessons in later modules too');

SELECT public.learner_complete_reading(current_setting('s.l3')::uuid,'en');
SELECT is((SELECT count(*)::int FROM public.learner_get_lesson(current_setting('s.f')::uuid,'en')),1,'assessment opens once every required lesson is finished');
SELECT is((SELECT count(*)::int FROM public.learner_unlocked_lessons(current_setting('s.course')::uuid)),5,'unlock list matches lesson access');
RESET ROLE;
SELECT ok(NOT has_function_privilege('authenticated','learning_private.lesson_unlocked(uuid,uuid)','EXECUTE'),'unlock rule is not directly callable');
SELECT ok(NOT has_function_privilege('anon','public.learner_unlocked_lessons(uuid)','EXECUTE'),'anonymous cannot list unlocked lessons');
SELECT * FROM finish();
ROLLBACK;
