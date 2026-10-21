BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2800000-0000-4000-8000-000000000001','authenticated','authenticated','admin@streaming-test.example','{}',now(),now()),
('e2800000-0000-4000-8000-000000000002','authenticated','authenticated','viewer@streaming-test.example','{}',now(),now()),
('e2800000-0000-4000-8000-000000000003','authenticated','authenticated','arabic@streaming-test.example','{}',now(),now()),
('e2800000-0000-4000-8000-000000000004','authenticated','authenticated','acronym@streaming-test.example','{}',now(),now()),
('e2800000-0000-4000-8000-000000000005','authenticated','authenticated','worker@streaming-test.example','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e2800000-0000-4000-8000-000000000001','admin','e2800000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------------------------
-- Streaming minutes
-- ---------------------------------------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000001',true);
SELECT set_config('s.course',public.admin_create_course('streaming-test-course')::text,true);
SELECT public.admin_upsert_course_translation(current_setting('s.course')::uuid,'en','Streaming test','Test');
SELECT public.admin_set_translation_publication(current_setting('s.course')::uuid,'en',true);
SELECT public.admin_set_course_status(current_setting('s.course')::uuid,'published');
SELECT set_config('s.module',public.admin_create_course_module(current_setting('s.course')::uuid)::text,true);
SELECT public.admin_save_module_translation(current_setting('s.module')::uuid,'en','Module');
SELECT public.admin_set_module_translation_publication(current_setting('s.module')::uuid,'en',true);
SELECT set_config('s.lesson',public.admin_create_lesson(current_setting('s.module')::uuid,'video')::text,true);
SELECT public.admin_save_lesson_translation(current_setting('s.lesson')::uuid,'en','Video');
SELECT public.admin_set_lesson_translation_publication(current_setting('s.lesson')::uuid,'en',true);
SELECT public.admin_set_lesson_status(current_setting('s.lesson')::uuid,'published');
SELECT set_config('s.video',public.mux_begin_lesson_upload(current_setting('s.lesson')::uuid)::text,true);
SELECT public.mux_attach_upload(current_setting('s.video')::uuid,'upload_streaming_test');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.mux_process_webhook('evt_streaming_ready','video.asset.ready',jsonb_build_object('id','asset_streaming_test','upload_id','upload_streaming_test','passthrough',current_setting('s.video'),'playback_ids',jsonb_build_array(jsonb_build_object('id','playback_streaming_test','policy','signed')),'duration',100));
RESET ROLE;
SELECT ok(NOT has_table_privilege('authenticated','learning_private.video_watch_daily','SELECT'),'learners cannot read the streaming log');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000002',true);
SELECT set_config('s.enrollment',public.learner_grant_free_enrollment(current_setting('s.course')::uuid)::text,true);
SELECT set_config('s.session',(SELECT session_id::text FROM public.learner_start_video_session(current_setting('s.lesson')::uuid,'en')),true);
SELECT public.learner_checkpoint_video(current_setting('s.session')::uuid,'en',1,0,true);
RESET ROLE;

-- Each step backdates the session by 5 seconds, as if that much wall-clock time had passed.
CREATE FUNCTION pg_temp.step(p_seq integer, p_pos numeric) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 UPDATE learning_private.video_sessions SET last_at=clock_timestamp()-interval '5 seconds' WHERE id=current_setting('s.session')::uuid;
 SET LOCAL ROLE authenticated;
 PERFORM set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000002',true);
 PERFORM public.learner_checkpoint_video(current_setting('s.session')::uuid,'en',p_seq,p_pos,true);
 RESET ROLE;
END $$;
CREATE FUNCTION pg_temp.streamed() RETURNS numeric LANGUAGE sql AS $$
 SELECT coalesce(sum(seconds),0) FROM learning_private.video_watch_daily WHERE enrollment_id=current_setting('s.enrollment')::uuid
$$;
CREATE FUNCTION pg_temp.unique_watched() RETURNS integer LANGUAGE sql AS $$
 SELECT watched_seconds FROM public.video_progress WHERE enrollment_id=current_setting('s.enrollment')::uuid
$$;

SELECT pg_temp.step(2,5);
SELECT is(pg_temp.streamed(),5::numeric,'continuous play is streamed');
SELECT pg_temp.step(3,0);
SELECT is(pg_temp.streamed(),5::numeric,'seeking back streams nothing');
SELECT pg_temp.step(4,5);
SELECT is(pg_temp.streamed(),10::numeric,'a rewatch counts again');
SELECT is(pg_temp.unique_watched(),5,'a rewatch adds no unique coverage');
SELECT pg_temp.step(5,15);
SELECT is(pg_temp.streamed(),20::numeric,'2x playback counts the content covered');
SELECT pg_temp.step(6,90);
SELECT is(pg_temp.streamed(),20::numeric,'a seek ahead streams nothing');
SELECT is((SELECT watch_date FROM learning_private.video_watch_daily WHERE enrollment_id=current_setting('s.enrollment')::uuid),(now() AT TIME ZONE 'Africa/Cairo')::date,'logged on the Cairo day');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000001',true);
SELECT ok((public.admin_analytics_overview(7)->'learning'->>'streamedMinutes')::int >= 0,'overview reports streaming minutes');
SELECT ok((SELECT sum((p->>'streamed')::int) FROM jsonb_array_elements(public.admin_analytics_overview(7)->'series') p) >= 0,'series carries streaming minutes');
SELECT is((SELECT streamed_minutes FROM public.admin_analytics_courses(7,'en') WHERE slug='streaming-test-course'),0::bigint,'20 seconds round down to 0 minutes');
RESET ROLE;
UPDATE learning_private.video_watch_daily SET seconds=150 WHERE enrollment_id=current_setting('s.enrollment')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000001',true);
SELECT is((SELECT streamed_minutes FROM public.admin_analytics_courses(7,'en') WHERE slug='streaming-test-course'),2::bigint,'course streaming minutes');
SELECT is((SELECT streamed_minutes FROM public.admin_analytics_course_lessons(current_setting('s.course')::uuid,'en')),2::bigint,'lesson streaming minutes');
SELECT is((SELECT streamed_minutes FROM public.admin_analytics_learners('viewer@streaming-test',NULL,25,0)),2::bigint,'learner streaming minutes');
RESET ROLE;

-- ---------------------------------------------------------------------------------------------
-- Institutions
-- ---------------------------------------------------------------------------------------------
SELECT ok(NOT has_table_privilege('authenticated','public.institutions','SELECT'),'institutions are not readable directly');
SELECT ok(NOT has_column_privilege('authenticated','public.learner_profiles','university_id','UPDATE'),'learners cannot set the institution link');

INSERT INTO public.learner_profiles(user_id,learner_type,university,faculty) VALUES
('e2800000-0000-4000-8000-000000000002','student','cairo   UNIVERSITY','Engineering'),
('e2800000-0000-4000-8000-000000000003','student','جامعه القاهره','Commerce'),
('e2800000-0000-4000-8000-000000000004','student','AUC','Engineering'),
('e2800000-0000-4000-8000-000000000005','professional',NULL,NULL);
UPDATE public.learner_profiles SET company_name='Streaming Test Co' WHERE user_id='e2800000-0000-4000-8000-000000000005';
SELECT set_config('s.cairo',(SELECT id::text FROM public.institutions WHERE kind='university' AND name_en='Cairo University'),true);
SELECT is((SELECT university_id FROM public.learner_profiles WHERE user_id='e2800000-0000-4000-8000-000000000002'),current_setting('s.cairo')::uuid,'case and spacing are folded');
SELECT is((SELECT university_id FROM public.learner_profiles WHERE user_id='e2800000-0000-4000-8000-000000000003'),current_setting('s.cairo')::uuid,'Arabic letter variants are folded');
SELECT is((SELECT i.name_en FROM public.learner_profiles pr JOIN public.institutions i ON i.id=pr.university_id WHERE pr.user_id='e2800000-0000-4000-8000-000000000004'),'The American University in Cairo','acronyms are seeded');
SELECT is((SELECT company_id FROM public.learner_profiles WHERE user_id='e2800000-0000-4000-8000-000000000005'),NULL,'unknown names stay unlinked');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT * FROM public.admin_list_institutions('university')$$,'42501',NULL,'a learner cannot list institutions');
SELECT throws_ok($$SELECT public.admin_create_institution('company','X Co',NULL,NULL)$$,'42501',NULL,'a learner cannot add institutions');
-- A learner editing their own typed name relinks it; a learner cannot write the link itself.
UPDATE public.learner_profiles SET university='Ain Shams University' WHERE user_id='e2800000-0000-4000-8000-000000000002';
SELECT throws_ok($$UPDATE public.learner_profiles SET university_id=NULL WHERE user_id='e2800000-0000-4000-8000-000000000002'$$,'42501',NULL,'the link column is not writable');
RESET ROLE;
SELECT is((SELECT i.name_en FROM public.learner_profiles pr JOIN public.institutions i ON i.id=pr.university_id WHERE pr.user_id='e2800000-0000-4000-8000-000000000002'),'Ain Shams University','editing the typed name relinks');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000001',true);
SELECT ok(EXISTS(SELECT 1 FROM public.admin_list_unmatched_institution_names('company') WHERE name='Streaming Test Co' AND learners=1),'unmatched names are listed');
SELECT throws_ok($$SELECT public.admin_list_unmatched_institution_names('school')$$,'22023',NULL,'kind is validated');
SELECT set_config('s.company',public.admin_create_institution('company','Streaming Test Company','شركة اختبار البث','Streaming Test Co')::text,true);
RESET ROLE;
SELECT is((SELECT company_id FROM public.learner_profiles WHERE user_id='e2800000-0000-4000-8000-000000000005'),current_setting('s.company')::uuid,'creating an institution links the folded-in name');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2800000-0000-4000-8000-000000000001',true);
SELECT throws_ok($$SELECT public.admin_create_institution('company','Another Co',NULL,'streaming test co')$$,'23505',NULL,'a linked spelling is never silently moved');
SELECT throws_ok($$SELECT public.admin_link_institution_name('company','Typo Co',current_setting('s.cairo')::uuid)$$,'P0002',NULL,'a university cannot take a company name');
SELECT is(public.admin_link_institution_name('university','Cairo Uni',current_setting('s.cairo')::uuid),0,'linking a new spelling reports linked profiles');
SELECT throws_ok($$SELECT public.admin_link_institution_name('university','cairo uni',current_setting('s.cairo')::uuid)$$,'23505',NULL,'a spelling maps to one institution');
SELECT set_config('s.cairo_learners',(SELECT learners FROM public.admin_list_institutions('university') WHERE id=current_setting('s.cairo')::uuid)::text,true);
SELECT ok(EXISTS(SELECT 1 FROM jsonb_array_elements(public.admin_analytics_overview(30)->'institutions'->'universities') u
 WHERE u->>'name'='Cairo University' AND u->>'nameAr'='جامعة القاهرة' AND (u->>'matched')::boolean),'overview groups by the linked institution');
SELECT is((SELECT institution FROM public.admin_analytics_learners('arabic@streaming-test',NULL,25,0)),'Cairo University','roster shows the canonical name');
RESET ROLE;
SELECT is(current_setting('s.cairo_learners')::bigint,(SELECT count(*) FROM public.learner_profiles WHERE university_id=current_setting('s.cairo')::uuid),'institution learner counts');

SELECT * FROM finish();
ROLLBACK;
