BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2700000-0000-4000-8000-000000000001','authenticated','authenticated','admin@analytics-test.example','{"display_name":"Analytics Admin"}',now(),now()),
('e2700000-0000-4000-8000-000000000002','authenticated','authenticated','free@analytics-test.example','{"display_name":"Free Learner"}',now(),now()),
('e2700000-0000-4000-8000-000000000003','authenticated','authenticated','comp@analytics-test.example','{"display_name":"Comp Learner"}',now(),now()),
('e2700000-0000-4000-8000-000000000004','authenticated','authenticated','idle@analytics-test.example','{"display_name":"Idle 100%_Learner"}',now(),now()),
('e2700000-0000-4000-8000-000000000005','authenticated','authenticated','teacher@analytics-test.example','{"display_name":"Instructor"}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES
('e2700000-0000-4000-8000-000000000001','admin','e2700000-0000-4000-8000-000000000001'),
('e2700000-0000-4000-8000-000000000005','instructor','e2700000-0000-4000-8000-000000000001');
INSERT INTO public.learner_profiles(user_id,learner_type,university,faculty) VALUES
('e2700000-0000-4000-8000-000000000002','student','Analytics Test University','Engineering'),
('e2700000-0000-4000-8000-000000000003','student','analytics TEST university','Commerce');

-- A published course with two required lessons.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000001',true);
SELECT set_config('a.course',public.admin_create_course('analytics-test-course')::text,true);
SELECT public.admin_upsert_course_translation(current_setting('a.course')::uuid,'en','Analytics course','Test');
SELECT public.admin_set_translation_publication(current_setting('a.course')::uuid,'en',true);
SELECT public.admin_set_course_status(current_setting('a.course')::uuid,'published');
SELECT set_config('a.module',public.admin_create_course_module(current_setting('a.course')::uuid)::text,true);
SELECT public.admin_save_module_translation(current_setting('a.module')::uuid,'en','Module');
SELECT public.admin_set_module_translation_publication(current_setting('a.module')::uuid,'en',true);
SELECT set_config('a.l1',public.admin_create_lesson(current_setting('a.module')::uuid,'article')::text,true);
SELECT set_config('a.l2',public.admin_create_lesson(current_setting('a.module')::uuid,'article')::text,true);
SELECT public.admin_save_lesson_translation(id,'en','Lesson '||right(id::text,4)),public.admin_set_lesson_translation_publication(id,'en',true),public.admin_set_lesson_status(id,'published')
FROM unnest(ARRAY[current_setting('a.l1'),current_setting('a.l2')]::uuid[]) id;
SELECT public.admin_grant_course_access('comp@analytics-test.example','analytics-test-course','complimentary');

-- The free learner and the instructor enroll themselves; the instructor is staff and must not be counted.
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000002',true);
SELECT set_config('a.free',public.learner_grant_free_enrollment(current_setting('a.course')::uuid)::text,true);
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000005',true);
SELECT public.learner_grant_free_enrollment(current_setting('a.course')::uuid);
RESET ROLE;
INSERT INTO public.lesson_progress(enrollment_id,lesson_id,status,percent,completed_at)
VALUES(current_setting('a.free')::uuid,current_setting('a.l1')::uuid,'completed',100,now());

-- Authorization: learners, instructors and admins without MFA get nothing.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT public.admin_analytics_overview(30)$$,'42501',NULL,'a learner cannot read the overview');
SELECT throws_ok($$SELECT * FROM public.admin_analytics_courses(30,'en')$$,'42501',NULL,'a learner cannot read course analytics');
SELECT throws_ok($$SELECT * FROM public.admin_analytics_course_lessons(current_setting('a.course')::uuid,'en')$$,'42501',NULL,'a learner cannot read lesson analytics');
SELECT throws_ok($$SELECT * FROM public.admin_analytics_learners(NULL,NULL,25,0)$$,'42501',NULL,'a learner cannot read the roster');
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000005',true);
SELECT throws_ok($$SELECT * FROM public.admin_analytics_learners(NULL,NULL,25,0)$$,'42501',NULL,'an instructor cannot read the roster');
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000001',true);
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal1"}', true);
SELECT throws_ok($$SELECT public.admin_analytics_overview(30)$$,'42501',NULL,'an admin without MFA is denied');
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.admin_analytics_overview(30)$$,'42501',NULL,'anonymous callers cannot execute analytics');
RESET ROLE;
SELECT ok(NOT has_function_privilege('authenticated','learning_private.analytics_learners()','EXECUTE'),'private helpers are not callable by clients');

-- Validation.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT public.admin_analytics_overview(14)$$,'22023',NULL,'only the offered ranges are accepted');
SELECT throws_ok($$SELECT * FROM public.admin_analytics_courses(30,'fr')$$,'22023',NULL,'locale is validated');
SELECT throws_ok($$SELECT * FROM public.admin_analytics_learners(NULL,'vip',25,0)$$,'22023',NULL,'segment is validated');
SELECT throws_ok($$SELECT * FROM public.admin_analytics_learners(NULL,NULL,500,0)$$,'22023',NULL,'page size is bounded');
SELECT throws_ok($$SELECT * FROM public.admin_analytics_course_lessons(gen_random_uuid(),'en')$$,'P0002',NULL,'unknown course is reported');

-- Overview shape and series length.
SELECT is(jsonb_array_length(public.admin_analytics_overview(7)->'series'),7,'a 7-day range has 7 daily buckets');
SELECT ok(jsonb_array_length(public.admin_analytics_overview(365)->'series') BETWEEN 53 AND 54,'a year is bucketed weekly');
SELECT ok((public.admin_analytics_overview(30)->'users'->>'total')::int >= 3,'learners are counted');
SELECT ok((public.admin_analytics_overview(30)->'activity'->>'today')::int >= 1,'today''s activity is counted');
SELECT ok(EXISTS(SELECT 1 FROM jsonb_array_elements(public.admin_analytics_overview(30)->'institutions'->'universities') u
 WHERE u->>'name' ILIKE 'analytics test university' AND (u->>'learners')::int = 2),'institution names group case-insensitively');

-- Course figures: staff enrollment excluded; progress is completed required lessons over all of them.
SELECT is((SELECT enrollments FROM public.admin_analytics_courses(30,'en') WHERE slug='analytics-test-course'),2::bigint,'staff enrollments are excluded');
SELECT is((SELECT free_enrollments FROM public.admin_analytics_courses(30,'en') WHERE slug='analytics-test-course'),1::bigint,'free enrollments are split out');
SELECT is((SELECT admin_enrollments FROM public.admin_analytics_courses(30,'en') WHERE slug='analytics-test-course'),1::bigint,'admin grants are split out');
SELECT is((SELECT average_progress FROM public.admin_analytics_courses(30,'en') WHERE slug='analytics-test-course'),25,'average progress across learners');
SELECT is((SELECT title FROM public.admin_analytics_courses(30,'ar') WHERE slug='analytics-test-course'),'Analytics course','title falls back to the other locale');

-- Lesson funnel.
SELECT is((SELECT count(*)::int FROM public.admin_analytics_course_lessons(current_setting('a.course')::uuid,'en')),2,'one row per published lesson');
SELECT is((SELECT completed FROM public.admin_analytics_course_lessons(current_setting('a.course')::uuid,'en') WHERE lesson_id=current_setting('a.l1')::uuid),1::bigint,'lesson completions are counted');
SELECT is((SELECT learners FROM public.admin_analytics_course_lessons(current_setting('a.course')::uuid,'en') LIMIT 1),2::bigint,'funnel denominator is the course''s learners');

-- Roster: segments, staff exclusion, literal search.
SELECT is((SELECT count(*)::int FROM public.admin_analytics_learners('analytics-test.example',NULL,25,0)),3,'roster lists learners and excludes staff');
SELECT is((SELECT segment FROM public.admin_analytics_learners('free@analytics-test',NULL,25,0)),'free','free segment');
SELECT is((SELECT segment FROM public.admin_analytics_learners('comp@analytics-test',NULL,25,0)),'complimentary','complimentary segment');
SELECT is((SELECT segment FROM public.admin_analytics_learners('idle@analytics-test',NULL,25,0)),'none','learner without access');
SELECT is((SELECT count(*)::int FROM public.admin_analytics_learners('analytics-test.example','free',25,0)),1,'segment filter applies');
SELECT is((SELECT count(*)::int FROM public.admin_analytics_learners('analytics-test.example','',25,0)),3,'an empty segment means all learners');
SELECT is((SELECT count(*)::int FROM public.admin_analytics_learners('100%_',NULL,25,0)),1,'search treats % and _ literally');
SELECT is((SELECT count(*)::int FROM public.admin_analytics_learners('10%',NULL,25,0)),0,'a literal % does not act as a wildcard');
SELECT is((SELECT average_progress FROM public.admin_analytics_learners('free@analytics-test',NULL,25,0)),50,'learner progress');
SELECT is((SELECT last_active FROM public.admin_analytics_learners('free@analytics-test',NULL,25,0)),(now() AT TIME ZONE 'Africa/Cairo')::date,'last active date');
SELECT is((SELECT total_count FROM public.admin_analytics_learners('analytics-test.example',NULL,1,0)),3::bigint,'total count survives pagination');
SELECT ok((public.admin_analytics_overview(30)->'learning'->>'watchedMinutes') ~ '^[0-9]+$','watched minutes are whole minutes');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
