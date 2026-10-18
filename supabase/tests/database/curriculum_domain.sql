-- Phase 08: curriculum ordering, exact-locale publication, safe outlines and private resources.
-- Runs in a rolled-back transaction; fixtures are local/CI only.
BEGIN;

SELECT plan(40);

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES ('d8000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'curriculum-admin@example.test', '{}'::jsonb, pg_catalog.now(), pg_catalog.now());
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES ('d8000000-0000-4000-8000-000000000001', 'admin', 'd8000000-0000-4000-8000-000000000001');

SELECT has_table('public', 'course_modules', 'course modules table exists');
SELECT has_table('public', 'module_translations', 'module translations table exists');
SELECT has_table('public', 'lessons', 'lessons table exists');
SELECT has_table('public', 'lesson_translations', 'lesson translations table exists');
SELECT has_table('public', 'lesson_resources', 'lesson resources table exists');
SELECT has_table('public', 'lesson_resource_translations', 'resource translations table exists');
SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_catalog.pg_class WHERE oid IN (
    'public.course_modules'::regclass, 'public.module_translations'::regclass,
    'public.lessons'::regclass, 'public.lesson_translations'::regclass,
    'public.lesson_resources'::regclass, 'public.lesson_resource_translations'::regclass
  )), 'RLS is enabled on every curriculum table'
);
SELECT is((SELECT public FROM storage.buckets WHERE id = 'course-resources'), false, 'course resources bucket is private');
SELECT is((SELECT file_size_limit::bigint FROM storage.buckets WHERE id = 'course-resources'), 52428800::bigint, 'resource uploads are capped at 50 MiB');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd8000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"d8000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

SELECT set_config('pgtap.course', public.admin_create_course('pgtap-curriculum')::text, true);
SELECT lives_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.course')::uuid, 'en', 'Curriculum Test', 'Test summary')$$, 'admin can save English course translation');
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.course')::uuid, 'en', true)$$, 'admin can publish English course translation');
SELECT lives_ok($$SELECT public.admin_set_course_status(current_setting('pgtap.course')::uuid, 'published')$$, 'admin can publish course');
SELECT set_config('pgtap.module_one', public.admin_create_course_module(current_setting('pgtap.course')::uuid)::text, true);
SELECT set_config('pgtap.module_two', public.admin_create_course_module(current_setting('pgtap.course')::uuid)::text, true);
SELECT lives_ok($$SELECT public.admin_save_module_translation(current_setting('pgtap.module_one')::uuid, 'en', 'Module One')$$, 'admin can save module translation');
SELECT lives_ok($$SELECT public.admin_set_module_translation_publication(current_setting('pgtap.module_one')::uuid, 'en', true)$$, 'module publication requires and accepts published course locale');
SELECT set_config('pgtap.lesson_one', public.admin_create_lesson(current_setting('pgtap.module_one')::uuid, 'video', true, true, 120)::text, true);
SELECT set_config('pgtap.lesson_two', public.admin_create_lesson(current_setting('pgtap.module_one')::uuid, 'article')::text, true);
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.lesson_one')::uuid, 'en', 'Preview Lesson', 'Summary', 'Protected body')$$, 'admin can save lesson translation');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.lesson_one')::uuid, 'en', true)$$, 'lesson translation can publish under published ancestors');
SELECT lives_ok($$SELECT public.admin_set_lesson_status(current_setting('pgtap.lesson_one')::uuid, 'published')$$, 'lesson publication requires a published exact-locale translation');
SELECT throws_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.lesson_one')::uuid, 'fr', 'French')$$, '22023', NULL, 'unsupported lesson locale is rejected');

SELECT lives_ok($$SELECT public.admin_reorder_course_modules(current_setting('pgtap.course')::uuid, ARRAY[current_setting('pgtap.module_two')::uuid, current_setting('pgtap.module_one')::uuid])$$, 'module reorder accepts the complete sibling set');
RESET ROLE;
SELECT is((SELECT position FROM public.course_modules WHERE id = current_setting('pgtap.module_two')::uuid), 1, 'module order changes atomically');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT public.admin_reorder_course_modules(current_setting('pgtap.course')::uuid, ARRAY[current_setting('pgtap.module_one')::uuid])$$, '22023', NULL, 'partial module reorder is rejected');
SELECT lives_ok($$SELECT public.admin_reorder_module_lessons(current_setting('pgtap.module_one')::uuid, ARRAY[current_setting('pgtap.lesson_two')::uuid, current_setting('pgtap.lesson_one')::uuid])$$, 'lesson reorder accepts the complete sibling set');
SELECT lives_ok($$SELECT public.admin_update_lesson(current_setting('pgtap.lesson_one')::uuid, true, false, 120)$$, 'admin can turn preview off');
SELECT lives_ok($$SELECT public.admin_update_lesson(current_setting('pgtap.lesson_one')::uuid, true, true, 120)$$, 'admin can explicitly restore preview');
SELECT set_config('pgtap.resource', resource_id::text, true)
FROM public.admin_create_lesson_resource(current_setting('pgtap.lesson_one')::uuid, 'file', 'en');
SELECT set_config('pgtap.resource_key', storage_object_key, true)
FROM public.admin_create_lesson_resource(current_setting('pgtap.lesson_one')::uuid, 'file', 'ar');
SELECT ok(current_setting('pgtap.resource_key') LIKE 'courses/%/lessons/%/resources/%', 'file locator is generated under the course and lesson path');
SELECT lives_ok($$SELECT public.admin_save_resource_translation(current_setting('pgtap.resource')::uuid, 'en', 'Workbook')$$, 'admin can save resource translation');
SELECT lives_ok($$SELECT public.admin_set_resource_translation_publication(current_setting('pgtap.resource')::uuid, 'en', true)$$, 'resource translation publication checks exact-locale ancestors');
SELECT throws_ok($$SELECT * FROM public.admin_create_lesson_resource(current_setting('pgtap.lesson_one')::uuid, 'external_url', 'en', 'javascript:alert(1)')$$, '23514', NULL, 'unsafe resource URL scheme is rejected');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::integer FROM public.catalog_get_course_outline('pgtap-curriculum', 'en')), 1, 'public outline includes published exact-locale preview lesson only');
SELECT is((SELECT is_preview FROM public.catalog_get_course_outline('pgtap-curriculum', 'en')), true, 'outline exposes the preview marker');
SELECT is((SELECT count(*)::integer FROM public.catalog_get_course_outline('pgtap-curriculum', 'ar')), 0, 'missing Arabic lesson translation never falls back to English');
SELECT throws_ok($$SELECT * FROM public.catalog_get_course_outline('pgtap-curriculum', 'fr')$$, '22023', NULL, 'unsupported outline locale is rejected');
SELECT is((SELECT duration_seconds FROM public.catalog_course_durations(ARRAY[current_setting('pgtap.course')::uuid], 'en')), 120::bigint, 'catalog runtime sums published exact-locale lesson durations');
SELECT is((SELECT count(*)::integer FROM public.catalog_course_durations(ARRAY[current_setting('pgtap.course')::uuid], 'ar')), 0, 'catalog runtime does not fall back to another locale');
SELECT throws_ok($$SELECT * FROM public.catalog_course_durations(ARRAY[]::uuid[], 'fr')$$, '22023', NULL, 'unsupported catalog runtime locale is rejected');
SELECT ok(has_function_privilege('anon', 'public.catalog_course_durations(uuid[],text)', 'EXECUTE'), 'anonymous catalog can read the narrow runtime projection');
SELECT throws_ok($$SELECT * FROM public.lesson_translations$$, '42501', NULL, 'anonymous direct lesson-body reads are denied');
SELECT throws_ok($$SELECT * FROM public.lesson_resources$$, '42501', NULL, 'anonymous direct resource reads are denied');
SELECT throws_ok($$SELECT * FROM public.lesson_resource_translations$$, '42501', NULL, 'anonymous direct resource metadata reads are denied');
SELECT throws_ok($$INSERT INTO storage.objects (bucket_id, name) VALUES ('course-resources', 'unauthorized.pdf')$$, '42501', NULL, 'anonymous direct storage uploads are denied');

RESET ROLE;
ROLLBACK;
