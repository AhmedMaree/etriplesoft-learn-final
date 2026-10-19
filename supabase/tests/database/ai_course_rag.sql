BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT plan(30);
-- Fixtures: seeded free course c..01 (published, en). One lesson gets body text and one a ready video.
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e4000000-0000-4000-8000-000000000001','authenticated','authenticated','rag-admin@example.test','{}',now(),now()),
('e4000000-0000-4000-8000-000000000002','authenticated','authenticated','rag-learner@example.test','{}',now(),now()),
('e4000000-0000-4000-8000-000000000003','authenticated','authenticated','rag-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e4000000-0000-4000-8000-000000000001','admin','e4000000-0000-4000-8000-000000000001');
UPDATE public.lesson_translations SET body='To back up an Odoo database open Settings and choose Backups.' WHERE lesson_id='f128838d-fc02-4557-3d17-b26e15801efd' AND locale='en';
INSERT INTO public.lesson_videos(id,lesson_id,provider,bunny_video_id,status,duration_seconds,created_by)
 VALUES('e4000000-0000-4000-8000-0000000000f1','477c5960-7b23-317c-11b7-a4cd2d5a8056','bunny','0f000000-0000-4000-8000-000000000001','ready',60,'e4000000-0000-4000-8000-000000000001');
INSERT INTO public.lessons(id,module_id,lesson_type,position,status,is_required,published_at)
 SELECT 'e4000000-0000-4000-8000-0000000000a1',module_id,'assessment',99,'published',false,now() FROM public.lessons WHERE id='f128838d-fc02-4557-3d17-b26e15801efd';
INSERT INTO public.lesson_translations(lesson_id,locale,title,body,publication_status,published_at)
 VALUES('e4000000-0000-4000-8000-0000000000a1','en','Final exam','Secret exam instructions','published',now());
-- Unit vectors: chunks point along axis 1, an unrelated query along axis 2.
SELECT set_config('t.vec1',(SELECT jsonb_agg(CASE WHEN g=1 THEN 1 ELSE 0 END)::text FROM generate_series(1,768) g),true);
SELECT set_config('t.q1','['||array_to_string(ARRAY(SELECT CASE WHEN g=1 THEN 1 ELSE 0 END FROM generate_series(1,768) g),',')||']',true);
SELECT set_config('t.q2','['||array_to_string(ARRAY(SELECT CASE WHEN g=2 THEN 1 ELSE 0 END FROM generate_series(1,768) g),',')||']',true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e4000000-0000-4000-8000-000000000001',true);
SELECT ok((SELECT count(*) FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2') WHERE source_type='lesson')>=10,'admin lists published lesson sources');
SELECT is((SELECT count(*)::int FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2') WHERE lesson_id='e4000000-0000-4000-8000-0000000000a1'),0,'assessment lessons are never indexed');
SELECT is((SELECT count(*)::int FROM public.admin_ai_course_videos('c0000000-0000-4000-8000-000000000001') WHERE NOT transcribed),1,'ready video awaits a transcript');
SELECT lives_ok($$SELECT public.admin_ai_save_transcript('e4000000-0000-4000-8000-0000000000f1','0f000000-0000-4000-8000-000000000001','ar','في الفيديو ده هنشرح ازاي نعمل backup','gemini-3.5-flash-lite')$$,'admin saves a transcript');
SELECT throws_ok($$SELECT public.admin_ai_save_transcript('e4000000-0000-4000-8000-0000000000f1','0f000000-0000-4000-8000-0000000000ff','ar','x','gemini-3.5-flash-lite')$$,'P0002',NULL,'transcript must match the current video');
SELECT is((SELECT count(*)::int FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2') WHERE source_type='transcript'),1,'transcript becomes a source');

SELECT set_config('t.lkey','lesson:f128838d-fc02-4557-3d17-b26e15801efd:en',true);
SELECT set_config('t.lhash',(SELECT source_hash FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2') WHERE source_key=current_setting('t.lkey')),true);
SELECT set_config('t.tkey','transcript:e4000000-0000-4000-8000-0000000000f1',true);
SELECT set_config('t.thash',(SELECT source_hash FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2') WHERE source_key=current_setting('t.tkey')),true);
SELECT is(public.admin_ai_replace_source_chunks('c0000000-0000-4000-8000-000000000001',current_setting('t.lkey'),current_setting('t.lhash'),'gemini-embedding-2',
 jsonb_build_array(jsonb_build_object('content','Lesson: back up via Settings > Backups','embedding',current_setting('t.vec1')::jsonb))),1,'admin stores chunks for a current source');
SELECT is(public.admin_ai_replace_source_chunks('c0000000-0000-4000-8000-000000000001',current_setting('t.tkey'),current_setting('t.thash'),'gemini-embedding-2',
 jsonb_build_array(jsonb_build_object('content','Transcript chunk','embedding',current_setting('t.vec1')::jsonb))),1,'transcript chunks stored');
SELECT ok((SELECT indexed FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2') WHERE source_key=current_setting('t.lkey')),'source reports as indexed');
SELECT throws_ok($$SELECT public.admin_ai_replace_source_chunks('c0000000-0000-4000-8000-000000000001',current_setting('t.lkey'),md5('injected'),'gemini-embedding-2',jsonb_build_array(jsonb_build_object('content','Injected text','embedding',current_setting('t.vec1')::jsonb)))$$,'P0002',NULL,'only current published text can be indexed');
SELECT throws_ok($$SELECT public.admin_ai_replace_source_chunks('c0000000-0000-4000-8000-000000000001',current_setting('t.lkey'),current_setting('t.lhash'),'gemini-embedding-2','[{"content":"x","embedding":[1,2]}]'::jsonb)$$,'22000',NULL,'wrong embedding dimension rejected');
SELECT is(public.admin_ai_finish_course_index('c0000000-0000-4000-8000-000000000001','gemini-embedding-2'),2,'finish keeps current chunks');
SELECT is((SELECT chunk_count FROM public.admin_ai_index_overview() WHERE course_id='c0000000-0000-4000-8000-000000000001'),2,'overview reports chunk count');
SELECT is((SELECT transcribed_videos FROM public.admin_ai_index_overview() WHERE course_id='c0000000-0000-4000-8000-000000000001'),1,'overview reports transcribed videos');

-- A learner without enrollment can neither search nor open a course chat; admin APIs are denied.
SELECT set_config('request.jwt.claim.sub','e4000000-0000-4000-8000-000000000003',true);
SELECT throws_ok($$SELECT * FROM public.learner_ai_search_course('c0000000-0000-4000-8000-000000000001','gemini-embedding-2',current_setting('t.q1'))$$,'42501',NULL,'search requires enrollment');
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(NULL,'c0000000-0000-4000-8000-000000000001','en','Hi','course')$$,'42501',NULL,'course chat requires enrollment');
SELECT throws_ok($$SELECT * FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2')$$,'42501',NULL,'learner cannot read index sources');
SELECT throws_ok($$SELECT public.admin_ai_save_transcript('e4000000-0000-4000-8000-0000000000f1','0f000000-0000-4000-8000-000000000001','ar','x','m1')$$,'42501',NULL,'learner cannot write transcripts');
SELECT throws_ok($$SELECT * FROM ai_private.course_chunks$$,'42501',NULL,'index tables are not exposed');

-- Enrolled learner: retrieval, course chat binding and citations.
SELECT set_config('request.jwt.claim.sub','e4000000-0000-4000-8000-000000000002',true);
SELECT public.learner_grant_free_enrollment('c0000000-0000-4000-8000-000000000001');
SELECT is((SELECT count(*)::int FROM public.learner_ai_search_course('c0000000-0000-4000-8000-000000000001','gemini-embedding-2',current_setting('t.q1'),5)),2,'enrolled learner retrieves chunks');
SELECT ok((SELECT min(similarity) FROM public.learner_ai_search_course('c0000000-0000-4000-8000-000000000001','gemini-embedding-2',current_setting('t.q1'),5))>0.99,'similarity is cosine');
SELECT ok((SELECT max(similarity) FROM public.learner_ai_search_course('c0000000-0000-4000-8000-000000000001','gemini-embedding-2',current_setting('t.q2'),5))<0.01,'unrelated query scores low');
SELECT is((SELECT count(*)::int FROM public.learner_ai_search_course('c0000000-0000-4000-8000-000000000001','other-model',current_setting('t.q1'),5)),0,'chunks from another embedding model are ignored');
SELECT throws_ok($$SELECT * FROM public.learner_ai_search_course('c0000000-0000-4000-8000-000000000001','gemini-embedding-2','[1,2,3]')$$,'22023',NULL,'malformed embedding rejected');
SELECT set_config('t.conv',(SELECT conversation_id FROM public.learner_ai_begin_turn(NULL,'c0000000-0000-4000-8000-000000000001','en','How do I back up?','course'))::text,true);
SELECT is((SELECT kind||':'||course_id FROM public.ai_conversations WHERE id=current_setting('t.conv')::uuid),'course:c0000000-0000-4000-8000-000000000001','course conversation is bound to its course');
SELECT throws_ok($$SELECT * FROM public.learner_ai_begin_turn(current_setting('t.conv')::uuid,NULL,'en','Switch','general')$$,'22023',NULL,'conversation kind cannot change');
SELECT lives_ok($$SELECT public.learner_ai_complete_turn(current_setting('t.conv')::uuid,'Open Settings > Backups [1].','complete','gemini-3.8-flash',10,5,'[{"n":1,"lessonId":"f128838d-fc02-4557-3d17-b26e15801efd","label":"Course Agenda","sourceType":"lesson"}]'::jsonb)$$,'reply saves citations');
SELECT set_config('t.gen',(SELECT conversation_id FROM public.learner_ai_begin_turn(NULL,'c0000000-0000-4000-8000-000000000001','en','General question','general'))::text,true);
SELECT is((SELECT kind||':'||coalesce(course_id::text,'none') FROM public.ai_conversations WHERE id=current_setting('t.gen')::uuid),'general:none','general chat ignores course context');

-- Freshness: edited or unpublished content disappears from search before any re-index.
RESET ROLE;
UPDATE public.lesson_translations SET body='Changed text' WHERE lesson_id='f128838d-fc02-4557-3d17-b26e15801efd' AND locale='en';
UPDATE public.lesson_videos SET bunny_video_id='0f000000-0000-4000-8000-000000000002' WHERE id='e4000000-0000-4000-8000-0000000000f1';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e4000000-0000-4000-8000-000000000002',true);
SELECT is((SELECT count(*)::int FROM public.learner_ai_search_course('c0000000-0000-4000-8000-000000000001','gemini-embedding-2',current_setting('t.q1'),5)),0,'stale chunks are never returned');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.admin_audit_log WHERE action IN ('course.ai_indexed','lesson_video.ai_transcribed') AND actor_id='e4000000-0000-4000-8000-000000000001'),2,'index and transcript writes are audited');
SELECT * FROM finish();
ROLLBACK;
