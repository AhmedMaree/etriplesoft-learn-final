BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2310000-0000-4000-8000-000000000001','authenticated','authenticated','sched-admin@example.test','{}',now(),now()),
('e2310000-0000-4000-8000-000000000002','authenticated','authenticated','sched-instructor@example.test','{}',now(),now()),
('e2310000-0000-4000-8000-000000000003','authenticated','authenticated','sched-unassigned@example.test','{}',now(),now()),
('e2310000-0000-4000-8000-000000000004','authenticated','authenticated','sched-attributed@example.test','{}',now(),now()),
('e2310000-0000-4000-8000-000000000005','authenticated','authenticated','sched-learner@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES
('e2310000-0000-4000-8000-000000000001','admin','e2310000-0000-4000-8000-000000000001'),
('e2310000-0000-4000-8000-000000000002','instructor','e2310000-0000-4000-8000-000000000001'),
('e2310000-0000-4000-8000-000000000003','instructor','e2310000-0000-4000-8000-000000000001');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2310000-0000-4000-8000-000000000001',true);
SELECT set_config('s.mine',public.admin_create_course('sched-mine')::text,true);
SELECT set_config('s.other',public.admin_create_course('sched-other')::text,true);
SELECT public.admin_upsert_course_translation(id,'en','Course '||id::text,'Test'),public.admin_set_translation_publication(id,'en',true),public.admin_set_course_status(id,'published')
FROM unnest(ARRAY[current_setting('s.mine'),current_setting('s.other')]::uuid[]) id;
SELECT set_config('s.other_event',public.admin_create_course_event(current_setting('s.other')::uuid,'live_session',NULL,now()+interval '2 days',NULL,NULL,'Other course session',NULL,NULL,NULL)::text,true);
RESET ROLE;
-- Instructor 2 has the role and is linked to "mine"; 3 has the role only; 4 is linked but has no role.
INSERT INTO public.course_instructors(course_id,position,profile_id,display_name,assigned_by) VALUES
(current_setting('s.mine')::uuid,1,'e2310000-0000-4000-8000-000000000002','Assigned Instructor','e2310000-0000-4000-8000-000000000001'),
(current_setting('s.mine')::uuid,2,'e2310000-0000-4000-8000-000000000004','Attributed Only','e2310000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;

-- A learner enrolled in "mine" receives the instructor's scheduling notification.
SELECT set_config('request.jwt.claim.sub','e2310000-0000-4000-8000-000000000005',true);
SELECT public.learner_grant_free_enrollment(current_setting('s.mine')::uuid);

-- Assigned instructor: schedule, list and cancel on their own course only (no MFA flow for instructors).
SELECT set_config('request.jwt.claim', '{}', true);
SELECT set_config('request.jwt.claim.sub','e2310000-0000-4000-8000-000000000002',true);
SELECT is((SELECT array_agg(slug) FROM public.staff_list_schedulable_courses('en')),ARRAY['sched-mine'],'instructor lists only assigned courses');
SELECT set_config('s.event',public.admin_create_course_event(current_setting('s.mine')::uuid,'office_hours',NULL,now()+interval '1 day',now()+interval '1 day 1 hour','https://meet.example.test/oh','Office hours',NULL,NULL,NULL)::text,true);
SELECT ok(current_setting('s.event') <> '','assigned instructor schedules on their course');
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('s.other')::uuid,'office_hours',NULL,now()+interval '1 day',NULL,NULL,'X',NULL,NULL,NULL)$$,'42501',NULL,'instructor cannot schedule on another course');
SELECT is((SELECT array_agg(course_slug) FROM public.admin_list_course_events('en')),ARRAY['sched-mine'],'instructor lists only their course events');
SELECT throws_ok($$SELECT public.admin_cancel_course_event(current_setting('s.other_event')::uuid)$$,'42501',NULL,'instructor cannot cancel another course event');
SELECT throws_ok($$SELECT public.admin_cancel_course_event(gen_random_uuid())$$,'P0002',NULL,'unknown event is reported as missing to staff');
SELECT lives_ok($$SELECT public.admin_cancel_course_event(current_setting('s.event')::uuid)$$,'instructor cancels their own event');

-- Role without the course link, and course link without the role.
SELECT set_config('request.jwt.claim.sub','e2310000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::int FROM public.staff_list_schedulable_courses('en')),0,'unassigned instructor has no schedulable courses');
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('s.mine')::uuid,'quiz',NULL,now()+interval '1 day',NULL,NULL,'X',NULL,NULL,NULL)$$,'42501',NULL,'instructor role alone grants nothing');
SELECT is((SELECT count(*)::int FROM public.admin_list_course_events('en')),0,'unassigned instructor lists no events');
SELECT set_config('request.jwt.claim.sub','e2310000-0000-4000-8000-000000000004',true);
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('s.mine')::uuid,'quiz',NULL,now()+interval '1 day',NULL,NULL,'X',NULL,NULL,NULL)$$,'42501',NULL,'attribution alone grants nothing');
SELECT throws_ok($$SELECT * FROM public.admin_list_course_events('en')$$,'42501',NULL,'non-staff cannot list course events');
SELECT throws_ok($$SELECT public.admin_cancel_course_event(gen_random_uuid())$$,'42501',NULL,'non-staff cannot probe event ids');
SELECT is((SELECT count(*)::int FROM public.staff_list_schedulable_courses('en')),0,'non-staff has no schedulable courses');

-- The learner was notified of both the scheduling and the cancellation.
SELECT set_config('request.jwt.claim.sub','e2310000-0000-4000-8000-000000000005',true);
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE event_id=current_setting('s.event')::uuid),2,'learner notified of instructor scheduling and cancellation');

-- Administrators still need MFA; with it they see every course.
SELECT set_config('request.jwt.claim.sub','e2310000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('s.mine')::uuid,'quiz',NULL,now()+interval '1 day',NULL,NULL,'X',NULL,NULL,NULL)$$,'42501',NULL,'admin without MFA cannot schedule');
SELECT is((SELECT count(*)::int FROM public.staff_list_schedulable_courses('en')),0,'admin without MFA lists no schedulable courses');
SELECT set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT is((SELECT count(*)::int FROM public.staff_list_schedulable_courses('en') WHERE slug IN ('sched-mine','sched-other')),2,'MFA admin lists every published course');
SELECT is((SELECT count(*)::int FROM public.admin_list_course_events('en') WHERE course_slug IN ('sched-mine','sched-other')),2,'MFA admin lists every course event');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.admin_audit_log WHERE course_id=current_setting('s.mine')::uuid AND actor_id='e2310000-0000-4000-8000-000000000002'
 AND action IN ('course.event_scheduled','course.event_cancelled')),2,'instructor scheduling changes are audited under the instructor');
SELECT ok(NOT has_function_privilege('authenticated','learning_private.assert_course_scheduler(uuid)','EXECUTE')
 AND NOT has_function_privilege('anon','public.staff_list_schedulable_courses(text)','EXECUTE'),'helpers are not exposed');
SELECT * FROM finish();ROLLBACK;
