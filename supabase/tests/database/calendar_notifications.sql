BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2300000-0000-4000-8000-000000000001','authenticated','authenticated','calendar-admin@example.test','{}',now(),now()),
('e2300000-0000-4000-8000-000000000002','authenticated','authenticated','calendar-learner@example.test','{}',now(),now()),
('e2300000-0000-4000-8000-000000000003','authenticated','authenticated','calendar-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e2300000-0000-4000-8000-000000000001','admin','e2300000-0000-4000-8000-000000000001');
-- New learners get in-app reminders by default.
SELECT is((SELECT course_reminders AND assignment_deadlines AND daily_learning_reminders FROM public.learner_preferences
 WHERE user_id='e2300000-0000-4000-8000-000000000002'),true,'reminder preferences default on for new learners');
UPDATE public.learner_preferences SET timezone='Not/AZone' WHERE user_id='e2300000-0000-4000-8000-000000000002';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2300000-0000-4000-8000-000000000001',true);
SELECT set_config('c.course',public.admin_create_course('calendar-test')::text,true);
SELECT public.admin_upsert_course_translation(current_setting('c.course')::uuid,'en','Calendar course','Test');
SELECT public.admin_set_translation_publication(current_setting('c.course')::uuid,'en',true);
SELECT public.admin_set_course_status(current_setting('c.course')::uuid,'published');
SELECT set_config('c.m1',public.admin_create_course_module(current_setting('c.course')::uuid)::text,true);
SELECT public.admin_save_module_translation(current_setting('c.m1')::uuid,'en','Module 1');
SELECT public.admin_set_module_translation_publication(current_setting('c.m1')::uuid,'en',true);
SELECT set_config('c.l1',public.admin_create_lesson(current_setting('c.m1')::uuid,'article')::text,true);
SELECT public.admin_save_lesson_translation(current_setting('c.l1')::uuid,'en','Reading',NULL,'Body'),
 public.admin_set_lesson_translation_publication(current_setting('c.l1')::uuid,'en',true),
 public.admin_set_lesson_status(current_setting('c.l1')::uuid,'published');

-- Enrollment is a trusted notification source.
SELECT set_config('request.jwt.claim.sub','e2300000-0000-4000-8000-000000000002',true);
SELECT public.learner_grant_free_enrollment(current_setting('c.course')::uuid);
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='enrollment_started' AND course_title='Calendar course'),1,'enrollment creates a localized notification');

-- Administrator scheduling: validation, fan-out and audit.
SELECT set_config('request.jwt.claim.sub','e2300000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('c.course')::uuid,'party',NULL,now()+interval '1 day',NULL,NULL,'X',NULL,NULL,NULL)$$,'22023',NULL,'unknown kind rejected');
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('c.course')::uuid,'live_session',NULL,now()+interval '1 day',NULL,NULL,'',' ',NULL,NULL)$$,'22023',NULL,'a title is required');
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('c.course')::uuid,'live_session',NULL,now()+interval '1 day',NULL,'javascript:alert(1)','Live',NULL,NULL,NULL)$$,'23514',NULL,'non-https meeting link rejected');
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('c.course')::uuid,'live_session',NULL,now()+interval '1 day',now()+interval '1 day 13 hours','https://meet.example.test/a','Live',NULL,NULL,NULL)$$,'23514',NULL,'sessions longer than 12 hours rejected');
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('c.course')::uuid,'quiz',gen_random_uuid(),now()+interval '1 day',NULL,NULL,'Quiz',NULL,NULL,NULL)$$,'22023',NULL,'lesson must belong to the course');
SELECT set_config('c.live',public.admin_create_course_event(current_setting('c.course')::uuid,'live_session',NULL,now()+interval '3 hours',now()+interval '4 hours','https://meet.example.test/live','Live session','جلسة مباشرة','Bring questions',NULL)::text,true);
SELECT set_config('c.due',public.admin_create_course_event(current_setting('c.course')::uuid,'deadline',current_setting('c.l1')::uuid,now()+interval '30 hours',now()+interval '31 hours',NULL,'Project due',NULL,NULL,NULL)::text,true);
SELECT is((SELECT ends_at FROM public.admin_list_course_events('en') WHERE id=current_setting('c.due')::uuid),NULL,'deadlines store a single due moment');
SELECT is((SELECT count(*)::int FROM public.admin_list_course_events('en') WHERE course_id=current_setting('c.course')::uuid),2,'admin lists scheduled events');
SELECT is((SELECT learner_count FROM public.admin_list_course_events('en') WHERE id=current_setting('c.live')::uuid),1,'admin sees audience size');

-- Entitled learner: calendar, meeting link, scheduling notifications and reminders.
SELECT set_config('request.jwt.claim.sub','e2300000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::int FROM public.learner_calendar_events(now(),now()+interval '7 days','en') WHERE source='course'),2,'entitled learner sees course events');
SELECT is((SELECT meeting_url FROM public.learner_calendar_events(now(),now()+interval '7 days','en') WHERE id=current_setting('c.live')::uuid),'https://meet.example.test/live','entitled learner receives the meeting link');
SELECT is((SELECT title FROM public.learner_calendar_events(now(),now()+interval '7 days','ar') WHERE id=current_setting('c.live')::uuid),'جلسة مباشرة','event title uses the exact locale');
SELECT is((SELECT title FROM public.learner_calendar_events(now(),now()+interval '7 days','ar') WHERE id=current_setting('c.due')::uuid),NULL,'missing locale title is not silently replaced');
SELECT throws_ok($$SELECT * FROM public.learner_calendar_events(now(),now()+interval '500 days','en')$$,'22023',NULL,'calendar range is bounded');
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='event_scheduled'),2,'scheduling notifies entitled learners');
SELECT public.learner_sync_notifications();
SELECT public.learner_sync_notifications();
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='event_reminder' AND event_id=current_setting('c.live')::uuid),1,'session reminder created once within 24 hours');
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='deadline_reminder' AND event_id=current_setting('c.due')::uuid),1,'deadline reminder created once within 48 hours');
SELECT throws_ok($$SELECT * FROM public.course_events$$,'42501',NULL,'course event table is not exposed');
SELECT throws_ok($$INSERT INTO public.notifications(user_id,kind,dedupe_key) VALUES('e2300000-0000-4000-8000-000000000003','streak_reminder','forged')$$,'42501',NULL,'notifications cannot be written directly');

-- Personal study sessions.
SELECT throws_ok($$SELECT public.learner_create_study_session('Study',now()+interval '1 day',now()+interval '1 day 9 hours')$$,'22023',NULL,'study sessions are at most 8 hours');
SELECT set_config('c.study',public.learner_create_study_session(' Revise module 1 ',now()+interval '2 days',now()+interval '2 days 1 hour')::text,true);
SELECT is((SELECT title FROM public.learner_calendar_events(now(),now()+interval '7 days','en') WHERE source='personal'),'Revise module 1','own study session appears trimmed');

-- Streak: a completed lesson counts (invalid saved time zone falls back to UTC).
SELECT is((public.learner_learning_streak()->>'current')::int,0,'no streak before learning');
SELECT lives_ok($$SELECT public.learner_complete_reading(current_setting('c.l1')::uuid,'en')$$,'reading completion still works with an invalid saved time zone');
SELECT is((public.learner_learning_streak()->>'current')::int,1,'completed lesson starts a streak');
SELECT is((public.learner_learning_streak()->>'activeToday')::boolean,true,'today is active');
SELECT is(jsonb_array_length(public.learner_learning_streak()->'week'),7,'streak returns a seven-day week');
RESET ROLE;
INSERT INTO public.learning_activity_days(user_id,activity_date,first_at,last_at) SELECT 'e2300000-0000-4000-8000-000000000002',(now() AT TIME ZONE 'UTC')::date-g,now(),now() FROM generate_series(1,3) g;
INSERT INTO public.learning_activity_days(user_id,activity_date,first_at,last_at) VALUES('e2300000-0000-4000-8000-000000000002',(now() AT TIME ZONE 'UTC')::date-10,now(),now());
SET LOCAL ROLE authenticated;
SELECT is((public.learner_learning_streak()->>'current')::int,4,'consecutive days form the current streak');
SELECT is((public.learner_learning_streak()->>'longest')::int,4,'longest streak');
SELECT is((public.learner_learning_streak()->>'totalDays')::int,5,'total active days');

-- Read state.
SELECT ok(public.learner_unread_notification_count()>=5,'unread count reflects inbox');
SELECT is(public.learner_mark_notifications_read(ARRAY[(SELECT id FROM public.learner_list_notifications('en',1))]),1,'mark one read');
SELECT lives_ok($$SELECT public.learner_mark_notifications_read(NULL)$$,'mark all read');
SELECT is(public.learner_unread_notification_count(),0,'all read');

-- Another learner without an entitlement.
SELECT set_config('request.jwt.claim.sub','e2300000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::int FROM public.learner_calendar_events(now()-interval '1 day',now()+interval '30 days','en')),0,'unentitled learner sees no course events or other study sessions');
SELECT is((SELECT count(*)::int FROM public.notifications),0,'another learner cannot read notifications');
SELECT is((SELECT count(*)::int FROM public.learning_activity_days),0,'another learner cannot read activity');
SELECT is((SELECT count(*)::int FROM public.learner_study_sessions),0,'another learner cannot read study sessions');
SELECT is(public.learner_mark_notifications_read(NULL),0,'another learner cannot mark notifications read');
SELECT throws_ok($$SELECT public.learner_delete_study_session(current_setting('c.study')::uuid)$$,'P0002',NULL,'another learner cannot delete a study session');
SELECT throws_ok($$SELECT public.admin_create_course_event(current_setting('c.course')::uuid,'live_session',NULL,now()+interval '1 day',NULL,NULL,'Live',NULL,NULL,NULL)$$,'42501',NULL,'learners cannot schedule course events');
SELECT throws_ok($$SELECT public.admin_cancel_course_event(current_setting('c.live')::uuid)$$,'42501',NULL,'learners cannot cancel course events');

-- Cancellation: notifies, hides the link, audited.
SELECT set_config('request.jwt.claim.sub','e2300000-0000-4000-8000-000000000001',true);
SELECT lives_ok($$SELECT public.admin_cancel_course_event(current_setting('c.live')::uuid)$$,'admin cancels an event');
SELECT lives_ok($$SELECT public.admin_cancel_course_event(current_setting('c.live')::uuid)$$,'cancelling twice is a no-op');
SELECT set_config('request.jwt.claim.sub','e2300000-0000-4000-8000-000000000002',true);
SELECT is((SELECT status||':'||coalesce(meeting_url,'none') FROM public.learner_calendar_events(now(),now()+interval '7 days','en') WHERE id=current_setting('c.live')::uuid),'cancelled:none','cancelled event shows without its link');
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='event_cancelled'),1,'cancellation notifies learners once');
SELECT lives_ok($$SELECT public.learner_delete_study_session(current_setting('c.study')::uuid)$$,'owner deletes a study session');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.admin_audit_log WHERE course_id=current_setting('c.course')::uuid AND action IN ('course.event_scheduled','course.event_cancelled')),3,'scheduling changes are audited');

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT throws_ok($$SELECT * FROM public.learner_calendar_events(now(),now()+interval '1 day','en')$$,'42501',NULL,'anonymous callers cannot read the calendar');
RESET ROLE;
SELECT ok(NOT has_function_privilege('anon','public.learner_list_notifications(text,integer)','EXECUTE')
 AND NOT has_function_privilege('authenticated','learning_private.record_activity(uuid,timestamptz)','EXECUTE')
 AND NOT has_function_privilege('authenticated','learning_private.notify_course_learners(uuid,uuid,text,text)','EXECUTE'),'helpers and learner functions are not exposed to anonymous callers');
SELECT * FROM finish();ROLLBACK;
