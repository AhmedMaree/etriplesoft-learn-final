BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT plan(12);
-- Fixtures: seeded free course c..01; a stored PDF resource on lesson 1.1 with a published translation.
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e6000000-0000-4000-8000-000000000001','authenticated','authenticated','doc-admin@example.test','{}',now(),now()),
('e6000000-0000-4000-8000-000000000002','authenticated','authenticated','doc-learner@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e6000000-0000-4000-8000-000000000001','admin','e6000000-0000-4000-8000-000000000001');
INSERT INTO public.lesson_resources(id,lesson_id,kind,storage_object_key,position,created_by)
 VALUES('e6000000-0000-4000-8000-0000000000d1','f128838d-fc02-4557-3d17-b26e15801efd','file','fixtures/guide.pdf',90,'e6000000-0000-4000-8000-000000000001');
INSERT INTO public.lesson_resource_translations(resource_id,locale,label,publication_status,published_at)
 VALUES('e6000000-0000-4000-8000-0000000000d1','en','Implementation Guide','published',now());

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e6000000-0000-4000-8000-000000000001',true);
SELECT is((SELECT extracted FROM public.admin_ai_course_resources('c0000000-0000-4000-8000-000000000001') WHERE lesson_resource_id='e6000000-0000-4000-8000-0000000000d1'),false,'stored file awaits extraction');
SELECT lives_ok($$SELECT public.admin_ai_save_resource_text('e6000000-0000-4000-8000-0000000000d1','fixtures/guide.pdf','en','Phase 1: discovery. Phase 2: configuration.','pdf-text')$$,'admin saves document text');
SELECT throws_ok($$SELECT public.admin_ai_save_resource_text('e6000000-0000-4000-8000-0000000000d1','fixtures/other.pdf','en','x','pdf-text')$$,'P0002',NULL,'text must match the current stored file');
SELECT throws_ok($$SELECT public.admin_ai_save_resource_text('e6000000-0000-4000-8000-0000000000d1','fixtures/guide.pdf','en','x','ocr')$$,'22023',NULL,'unknown extraction method rejected');
SELECT is((SELECT extracted FROM public.admin_ai_course_resources('c0000000-0000-4000-8000-000000000001') WHERE lesson_resource_id='e6000000-0000-4000-8000-0000000000d1'),true,'extraction is reported');
SELECT is((SELECT label||'|'||source_type FROM public.admin_ai_index_sources('c0000000-0000-4000-8000-000000000001','gemini-embedding-2') WHERE source_key='document:e6000000-0000-4000-8000-0000000000d1'),'Implementation Guide|document','document becomes an index source');

SELECT set_config('request.jwt.claim.sub','e6000000-0000-4000-8000-000000000002',true);
SELECT throws_ok($$SELECT * FROM public.admin_ai_course_resources('c0000000-0000-4000-8000-000000000001')$$,'42501',NULL,'learner cannot list resources for indexing');
SELECT throws_ok($$SELECT public.admin_ai_save_resource_text('e6000000-0000-4000-8000-0000000000d1','fixtures/guide.pdf','en','x','pdf-text')$$,'42501',NULL,'learner cannot write document text');
SELECT throws_ok($$SELECT * FROM ai_private.resource_texts$$,'42501',NULL,'document text table is not exposed');

-- Freshness: a replaced file or an unpublished resource is no longer a source.
RESET ROLE;
UPDATE public.lesson_resource_translations SET publication_status='draft', published_at=NULL WHERE resource_id='e6000000-0000-4000-8000-0000000000d1';
SELECT is((SELECT count(*)::int FROM ai_private.course_sources('c0000000-0000-4000-8000-000000000001') WHERE source_key='document:e6000000-0000-4000-8000-0000000000d1'),0,'unpublished resource is not a source');
UPDATE public.lesson_resource_translations SET publication_status='published', published_at=now() WHERE resource_id='e6000000-0000-4000-8000-0000000000d1';
UPDATE public.lesson_resources SET storage_object_key='fixtures/guide-v2.pdf' WHERE id='e6000000-0000-4000-8000-0000000000d1';
SELECT is((SELECT count(*)::int FROM ai_private.course_sources('c0000000-0000-4000-8000-000000000001') WHERE source_key='document:e6000000-0000-4000-8000-0000000000d1'),0,'replaced file invalidates extracted text');
SELECT is((SELECT count(*)::int FROM public.admin_audit_log WHERE action='lesson_resource.ai_extracted' AND actor_id='e6000000-0000-4000-8000-000000000001'),1,'document text writes are audited');
SELECT * FROM finish();
ROLLBACK;
