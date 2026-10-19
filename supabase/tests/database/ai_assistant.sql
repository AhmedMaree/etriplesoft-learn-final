BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT plan(30);
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e3000000-0000-4000-8000-000000000001','authenticated','authenticated','ai-admin@example.test','{}',now(),now()),
('e3000000-0000-4000-8000-000000000002','authenticated','authenticated','ai-owner@example.test','{}',now(),now()),
('e3000000-0000-4000-8000-000000000003','authenticated','authenticated','ai-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e3000000-0000-4000-8000-000000000001','admin','e3000000-0000-4000-8000-000000000001');

-- A free published course the owner enrolls in, and a paid one nobody is enrolled in.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
SELECT set_config('t.free',public.admin_save_course_content('ai-free-course','en','AI free course','Fixture','',0,'','beginner',true)::text,true);
SELECT set_config('t.paid',public.admin_save_course_content('ai-paid-course','en','AI paid course','Fixture','',50000,'','beginner',true)::text,true);
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000002',true);
SELECT public.learner_grant_free_enrollment(current_setting('t.free')::uuid);

-- Owner starts a conversation with entitled course context.
SELECT set_config('t.c1',(SELECT conversation_id FROM public.learner_ai_begin_turn(NULL,current_setting('t.free')::uuid,'en','  What is   Odoo CRM? ','course'))::text,true);
SELECT is((SELECT title FROM public.ai_conversations WHERE id=current_setting('t.c1')::uuid),'What is Odoo CRM?','new conversation is titled from the normalized question');
SELECT is((SELECT course_id FROM public.ai_conversations WHERE id=current_setting('t.c1')::uuid),current_setting('t.free')::uuid,'entitled course is attached as context');
SELECT is((SELECT content FROM public.ai_messages WHERE conversation_id=current_setting('t.c1')::uuid),'What is   Odoo CRM?','question is stored trimmed');
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(NULL,current_setting('t.paid')::uuid,'en','Hi','course')$$,'42501',NULL,'course context requires enrollment');
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(NULL,NULL,'en','   ')$$,'22023',NULL,'empty question rejected');
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(NULL,NULL,'fr','Hi')$$,'22023',NULL,'unsupported locale rejected');

SELECT lives_ok($$SELECT public.learner_ai_complete_turn(current_setting('t.c1')::uuid,'**Odoo CRM** manages leads.','complete','gemini-3.8-flash',120,40)$$,'owner saves the reply');
SELECT is((SELECT preview FROM public.ai_conversations WHERE id=current_setting('t.c1')::uuid),'Odoo CRM manages leads.','preview is plain text of the reply');
SELECT is((SELECT message_count FROM public.ai_conversations WHERE id=current_setting('t.c1')::uuid),2,'message count tracks both turns');
SELECT throws_ok($$SELECT public.learner_ai_complete_turn(current_setting('t.c1')::uuid,'extra','complete',NULL,NULL,NULL)$$,'55000',NULL,'only one reply per question');
SELECT throws_ok($$SELECT public.learner_ai_complete_turn(current_setting('t.c1')::uuid,'x','bogus',NULL,NULL,NULL)$$,'22023',NULL,'invalid reply status rejected');
SELECT lives_ok($$SELECT public.learner_ai_rename_conversation(current_setting('t.c1')::uuid,' CRM basics ')$$,'owner renames conversation');
SELECT is((public.learner_ai_insights()->>'questions')::int,1,'insights count own questions');
-- PostgREST calls by name and omits null optional arguments (regression for PGRST202).
SELECT lives_ok($$SELECT * FROM public.learner_ai_begin_turn(p_conversation_id=>current_setting('t.c1')::uuid,p_course_id=>current_setting('t.free')::uuid,p_locale=>'en',p_content=>'Follow-up',p_kind=>'course')$$,'optional arguments may be omitted');

-- Direct writes and the private ledger are not exposed.
SELECT throws_ok($$INSERT INTO public.ai_messages(conversation_id,role,content) VALUES(current_setting('t.c1')::uuid,'assistant','forged')$$,'42501',NULL,'messages cannot be inserted directly');
SELECT throws_ok($$UPDATE public.ai_conversations SET title='x'$$,'42501',NULL,'conversations cannot be updated directly');
SELECT throws_ok($$SELECT * FROM public.ai_usage_events$$,'42501',NULL,'usage ledger is not readable');

-- Another learner sees and changes nothing of the owner's history.
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::int FROM public.ai_conversations),0,'other learner cannot read conversations');
SELECT is((SELECT count(*)::int FROM public.ai_messages),0,'other learner cannot read messages');
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(current_setting('t.c1')::uuid,current_setting('t.free')::uuid,'en','Hijack','course')$$,'P0002',NULL,'other learner cannot post into the conversation');
SELECT throws_ok($$SELECT public.learner_ai_rename_conversation(current_setting('t.c1')::uuid,'Mine')$$,'P0002',NULL,'other learner cannot rename');
DELETE FROM public.ai_conversations WHERE id=current_setting('t.c1')::uuid;

-- Rate limit: six questions per minute, counted from the ledger.
SELECT public.learner_ai_begin_turn(NULL,NULL,'en','q'||g) FROM generate_series(1,6) g;
SELECT throws_like($$SELECT * FROM public.learner_ai_begin_turn(NULL,NULL,'en','seventh')$$,'%ai_rate_minute%','seventh question within a minute is limited');

-- Owner deletion cascades messages; the ledger keeps counting (deleting history never resets limits).
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::int FROM public.ai_conversations WHERE id=current_setting('t.c1')::uuid),1,'other learner delete had no effect');
DELETE FROM public.ai_conversations WHERE id=current_setting('t.c1')::uuid;
SELECT is((SELECT count(*)::int FROM public.ai_conversations),0,'owner deletes the conversation');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.ai_messages WHERE conversation_id=current_setting('t.c1')::uuid),0,'messages cascade with the conversation');
SELECT is((SELECT count(*)::int FROM public.ai_usage_events WHERE user_id='e3000000-0000-4000-8000-000000000002'),2,'usage ledger survives deletion');

-- Deep thinking: at most 10 deep questions per rolling day (seeded outside the per-minute window); fast questions continue.
INSERT INTO public.ai_usage_events(user_id,mode,created_at) SELECT 'e3000000-0000-4000-8000-000000000002','deep',now()-interval '2 minutes' FROM generate_series(1,10);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000002',true);
SELECT throws_like($$SELECT * FROM public.learner_ai_begin_turn(p_locale=>'en',p_content=>'Deep again',p_mode=>'deep')$$,'%ai_rate_deep%','eleventh deep question within a day is limited');
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(p_locale=>'en',p_content=>'Hi',p_mode=>'turbo')$$,'22023',NULL,'unknown mode rejected');
SELECT lives_ok($$SELECT * FROM public.learner_ai_begin_turn(p_locale=>'en',p_content=>'Fast still works')$$,'fast questions are not affected by the deep limit');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(NULL,NULL,'en','Hi')$$,'42501',NULL,'anonymous cannot start a turn');
SELECT * FROM finish();
ROLLBACK;
