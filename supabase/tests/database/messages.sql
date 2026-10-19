BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2600000-0000-4000-8000-000000000001','authenticated','authenticated','msg-admin@example.test','{"display_name":"Support Admin"}',now(),now()),
('e2600000-0000-4000-8000-000000000002','authenticated','authenticated','msg-instructor@example.test','{"display_name":"Course Instructor"}',now(),now()),
('e2600000-0000-4000-8000-000000000003','authenticated','authenticated','msg-learner@example.test','{"display_name":"Learner One"}',now(),now()),
('e2600000-0000-4000-8000-000000000004','authenticated','authenticated','msg-other@example.test','{"display_name":"Learner Two"}',now(),now()),
('e2600000-0000-4000-8000-000000000005','authenticated','authenticated','msg-unassigned@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES
('e2600000-0000-4000-8000-000000000001','admin','e2600000-0000-4000-8000-000000000001'),
('e2600000-0000-4000-8000-000000000002','instructor','e2600000-0000-4000-8000-000000000001'),
('e2600000-0000-4000-8000-000000000005','instructor','e2600000-0000-4000-8000-000000000001');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000001',true);
SELECT set_config('m.course',public.admin_create_course('messages-test')::text,true);
SELECT set_config('m.free',public.admin_create_course('messages-no-instructor')::text,true);
SELECT public.admin_upsert_course_translation(id,'en','Course '||right(id::text,4),'Test'),public.admin_set_translation_publication(id,'en',true),public.admin_set_course_status(id,'published')
FROM unnest(ARRAY[current_setting('m.course'),current_setting('m.free')]::uuid[]) id;
RESET ROLE;
INSERT INTO public.course_instructors(course_id,position,profile_id,display_name,assigned_by) VALUES
(current_setting('m.course')::uuid,1,'e2600000-0000-4000-8000-000000000002','Course Instructor','e2600000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;

-- Learner one is enrolled in both courses; learner two in none.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000003',true);
SELECT public.learner_grant_free_enrollment(current_setting('m.course')::uuid);
SELECT public.learner_grant_free_enrollment(current_setting('m.free')::uuid);
SELECT is((SELECT count(*)::int FROM public.messages_list_course_options('en')),2,'entitled courses are offered');
SELECT is((SELECT instructors FROM public.messages_list_course_options('en') WHERE id=current_setting('m.course')::uuid),ARRAY['Course Instructor'],'course options name the instructors');
SELECT is((public.messages_inbox_summary()->>'isStaff')::boolean,false,'a learner has no staff inbox');
SELECT throws_ok($$SELECT * FROM public.messages_list_threads('staff','all',NULL,'en',30,0)$$,'42501',NULL,'a learner cannot open the staff inbox');

-- Validation.
SELECT throws_ok($$SELECT public.messages_start_thread('course',NULL,'Hi','Body')$$,'22023',NULL,'course topic needs a course');
SELECT throws_ok($$SELECT public.messages_start_thread('support',current_setting('m.course')::uuid,'Hi','Body')$$,'22023',NULL,'support topic takes no course');
SELECT throws_ok($$SELECT public.messages_start_thread('support',NULL,'  ','Body')$$,'22023',NULL,'subject is required');
SELECT throws_ok($$SELECT public.messages_start_thread('support',NULL,'Hi',repeat('x',4001))$$,'22023',NULL,'message length is bounded');

-- Start a course conversation and a support conversation.
SELECT set_config('m.course_thread',public.messages_start_thread('course',current_setting('m.course')::uuid,' Question about module 1 ',' How do I install Odoo? ')::text,true);
SELECT set_config('m.support_thread',public.messages_start_thread('support',NULL,'Invoice','I need an invoice')::text,true);
SELECT is((SELECT subject FROM public.messages_list_threads('mine','all',NULL,'en',30,0) WHERE id=current_setting('m.course_thread')::uuid),'Question about module 1','subject is trimmed');
SELECT is((SELECT last_body FROM public.messages_list_threads('mine','all',NULL,'en',30,0) WHERE id=current_setting('m.course_thread')::uuid),'How do I install Odoo?','last message preview is trimmed');
SELECT is((SELECT unread_count FROM public.messages_list_threads('mine','all',NULL,'en',30,0) WHERE id=current_setting('m.course_thread')::uuid),0,'own messages are not unread');
SELECT is((SELECT count(*)::int FROM public.messages_list_threads('mine','all','invoice','en',30,0)),1,'search matches the subject');
SELECT is((SELECT count(*)::int FROM public.messages_list_threads('mine','all','100%','en',30,0)),0,'search treats % literally');

-- Learner two cannot see, read, answer or close learner one's conversation, and cannot open a course thread without enrollment.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000004',true);
SELECT is((SELECT count(*)::int FROM public.messages_list_threads('mine','all',NULL,'en',30,0)),0,'another learner sees no conversations');
SELECT throws_ok($$SELECT public.messages_get_thread(current_setting('m.course_thread')::uuid,'en')$$,'P0002',NULL,'another learner cannot read the conversation');
SELECT throws_ok($$SELECT public.messages_send(current_setting('m.course_thread')::uuid,'Injected')$$,'P0002',NULL,'another learner cannot post');
SELECT throws_ok($$SELECT public.messages_set_thread_status(current_setting('m.course_thread')::uuid,'closed')$$,'P0002',NULL,'another learner cannot close it');
SELECT throws_ok($$SELECT public.messages_mark_thread_read(current_setting('m.course_thread')::uuid)$$,'P0002',NULL,'another learner cannot mark it read');
SELECT throws_ok($$SELECT public.messages_start_thread('course',current_setting('m.course')::uuid,'Hi','Body')$$,'42501',NULL,'course conversations require enrollment');

-- Unassigned instructor: no access to the course thread.
SELECT set_config('request.jwt.claim', '{}', true);
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000005',true);
SELECT is((public.messages_inbox_summary()->>'isStaff')::boolean,false,'an instructor role without a course link has no staff inbox');
SELECT throws_ok($$SELECT public.messages_get_thread(current_setting('m.course_thread')::uuid,'en')$$,'P0002',NULL,'unassigned instructor cannot read the thread');

-- Assigned instructor: sees the course thread (not the support one), is notified, replies as staff.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000002',true);
SELECT is((public.messages_inbox_summary()->>'isStaff')::boolean,true,'assigned instructor has a staff inbox');
SELECT is((public.messages_inbox_summary()->>'unreadStaff')::int,1,'instructor has one unread conversation');
SELECT is((SELECT array_agg(id) FROM public.messages_list_threads('staff','all',NULL,'en',30,0)),ARRAY[current_setting('m.course_thread')::uuid],'instructor sees only their course thread');
SELECT is((SELECT learner_name FROM public.messages_list_threads('staff','awaiting',NULL,'en',30,0)),'Learner One','staff see the learner display name and the thread awaits a reply');
SELECT is((SELECT count(*)::int FROM public.messages_list_threads('staff','all','learner one','en',30,0)),1,'staff search matches the learner name');
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='message_from_learner'),1,'instructor is notified of the learner message');
SELECT throws_ok($$SELECT public.messages_get_thread(current_setting('m.support_thread')::uuid,'en')$$,'P0002',NULL,'instructor cannot read support conversations');
SELECT is(public.messages_get_thread(current_setting('m.course_thread')::uuid,'en')->>'viewerRole','staff','instructor views as staff');
SELECT public.messages_mark_thread_read(current_setting('m.course_thread')::uuid);
SELECT is((public.messages_inbox_summary()->>'unreadStaff')::int,0,'marking read clears staff unread');
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='message_from_learner' AND read_at IS NULL),0,'marking read also reads the notification');
SELECT set_config('m.reply',public.messages_send(current_setting('m.course_thread')::uuid,'Run the installer, then open localhost:8069.')::text,true);
SELECT is((SELECT count(*)::int FROM public.messages_list_threads('staff','awaiting',NULL,'en',30,0)),0,'after a staff reply the thread no longer awaits a reply');

-- Learner one sees the staff reply as unread with a notification, then reads it.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000003',true);
SELECT is((public.messages_inbox_summary()->>'unreadMine')::int,1,'learner has one unread conversation');
SELECT is((SELECT unread_count FROM public.messages_list_threads('mine','unread',NULL,'en',30,0)),1,'unread filter returns the thread with one unread message');
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='message_received' AND read_at IS NULL),1,'learner is notified of the reply');
SELECT is((SELECT (e->>'isStaff')::boolean FROM jsonb_array_elements(public.messages_get_thread(current_setting('m.course_thread')::uuid,'en')->'messages') e WHERE e->>'id'=current_setting('m.reply')),true,'reply is marked as staff');
SELECT is((SELECT e->>'senderName' FROM jsonb_array_elements(public.messages_get_thread(current_setting('m.course_thread')::uuid,'en')->'messages') e WHERE e->>'id'=current_setting('m.reply')),'Course Instructor','reply shows the staff display name');
SELECT ok(public.messages_get_thread(current_setting('m.course_thread')::uuid,'en')->>'otherReadAt' IS NOT NULL,'learner sees when staff read the thread');
SELECT is(public.messages_get_thread(current_setting('m.course_thread')::uuid,'en')->>'learnerName',NULL,'learner view does not echo the learner name');
SELECT public.messages_mark_thread_read(current_setting('m.course_thread')::uuid);
SELECT is((public.messages_inbox_summary()->>'unreadMine')::int,0,'reading clears learner unread');

-- A second reply refreshes the single notification instead of adding another.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000002',true);
SELECT public.messages_send(current_setting('m.course_thread')::uuid,'Any luck?');
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='message_received'),1,'one notification per conversation');
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='message_received' AND read_at IS NULL),1,'the notification is unread again');

-- Paging returns the newest messages oldest-first and flags older ones.
SELECT is(jsonb_array_length(public.messages_get_thread(current_setting('m.course_thread')::uuid,'en',NULL,2)->'messages'),2,'page size is honoured');
SELECT is((public.messages_get_thread(current_setting('m.course_thread')::uuid,'en',NULL,2)->>'hasMore')::boolean,true,'older messages are flagged');
SELECT is(public.messages_get_thread(current_setting('m.course_thread')::uuid,'en',NULL,2)->'messages'->1->>'body','Any luck?','newest message is last');
SELECT is((public.messages_get_thread(current_setting('m.course_thread')::uuid,'en',NULL,3)->>'hasMore')::boolean,false,'no older messages past the first');

-- Closing makes the conversation read-only; reopening allows replies again.
SELECT public.messages_set_thread_status(current_setting('m.course_thread')::uuid,'closed');
SELECT is((SELECT status FROM public.messages_list_threads('mine','closed',NULL,'en',30,0)),'closed','closed filter');
SELECT throws_ok($$SELECT public.messages_send(current_setting('m.course_thread')::uuid,'Hello?')$$,'55000',NULL,'closed conversations reject messages');
SELECT public.messages_set_thread_status(current_setting('m.course_thread')::uuid,'open');
SELECT lives_ok($$SELECT public.messages_send(current_setting('m.course_thread')::uuid,'Thanks, it works.')$$,'reopened conversation accepts messages');

-- Support thread: administrators answer; a password-only admin session is not staff.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claim', '{}', true);
SELECT is((public.messages_inbox_summary()->>'isStaff')::boolean,false,'admin without MFA has no staff inbox');
SELECT throws_ok($$SELECT public.messages_get_thread(current_setting('m.support_thread')::uuid,'en')$$,'P0002',NULL,'admin without MFA cannot read support conversations');
SELECT set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT is((SELECT count(*)::int FROM public.messages_list_threads('staff','all',NULL,'en',30,0)),2,'MFA admin sees every learner conversation');
SELECT lives_ok($$SELECT public.messages_send(current_setting('m.support_thread')::uuid,'Invoice sent.')$$,'admin replies to support');

-- Learner messages on a course with no active instructor notify administrators.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000003',true);
SELECT set_config('m.free_thread',public.messages_start_thread('course',current_setting('m.free')::uuid,'No instructor','Who answers?')::text,true);
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000001',true);
SELECT is((SELECT count(*)::int FROM public.learner_list_notifications('en',20) WHERE kind='message_from_learner'),2,'admins are notified for support and instructor-less courses');

-- The learner's own data export labels staff without identifying them.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(public.messages_export_mine())),3,'export lists the learner''s own conversations');
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(public.messages_export_mine()) t, jsonb_array_elements(t->'messages') m WHERE m->>'from'='staff'),3,'export labels staff replies');
SELECT ok(public.messages_export_mine()::text NOT LIKE '%e2600000-0000-4000-8000-000000000002%','export does not reveal staff ids');

-- Rate and open-thread limits.
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000003',true);
SELECT public.messages_start_thread('support',NULL,'Extra '||g,'Body') FROM generate_series(1,2) g;
SELECT throws_ok($$SELECT public.messages_start_thread('support',NULL,'One too many','Body')$$,'54000',NULL,'at most 5 new conversations per hour');

-- Tables are not reachable through the Data API; notifications cannot be forged.
SELECT throws_ok($$SELECT * FROM public.message_threads$$,'42501',NULL,'thread table is not exposed');
SELECT throws_ok($$SELECT * FROM public.thread_messages$$,'42501',NULL,'message table is not exposed');
SELECT throws_ok($$INSERT INTO public.thread_messages(thread_id,sender_id,is_staff,body) VALUES(current_setting('m.course_thread')::uuid,'e2600000-0000-4000-8000-000000000003',true,'forged staff')$$,'42501',NULL,'messages cannot be written directly');
SELECT throws_ok($$SELECT * FROM public.message_thread_reads$$,'42501',NULL,'read state is not exposed');

-- Anonymous callers are refused.
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.messages_inbox_summary()$$,'42501',NULL,'anonymous cannot call the inbox');

-- The message rate limit (30 per 10 minutes).
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2600000-0000-4000-8000-000000000003',true);
SELECT public.messages_send(current_setting('m.course_thread')::uuid,'Ping '||g) FROM generate_series(1,24) g;
SELECT throws_ok($$SELECT public.messages_send(current_setting('m.course_thread')::uuid,'Too fast')$$,'54000',NULL,'message rate is limited');

SELECT * FROM finish();
ROLLBACK;
