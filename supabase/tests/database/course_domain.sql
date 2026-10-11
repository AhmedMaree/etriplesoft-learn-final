-- Phase 07: course identity, lifecycle, exact-locale publication, instructor attribution, RLS and audit.
-- Runs in a rolled-back transaction under `npm run db:test` (disposable local/CI Supabase).
-- Own fixtures use the 'pgtap-' slug prefix; the seeded demo courses are only read, never changed.
BEGIN;

SELECT plan(72);

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'course-admin@example.test', '{}'::jsonb, pg_catalog.now(), pg_catalog.now()),
  ('d1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'course-learner@example.test', '{"role":"admin","permissions":{"admin":true}}'::jsonb, pg_catalog.now(), pg_catalog.now()),
  ('d1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'course-instructor@example.test', '{}'::jsonb, pg_catalog.now(), pg_catalog.now());

INSERT INTO public.user_roles (user_id, role, granted_by) VALUES
  ('d1000000-0000-4000-8000-000000000001', 'admin', 'd1000000-0000-4000-8000-000000000001'),
  ('d1000000-0000-4000-8000-000000000003', 'instructor', 'd1000000-0000-4000-8000-000000000001');

-- ===== Structure =========================================================================
SELECT has_table('public', 'courses', 'courses exists');
SELECT has_table('public', 'course_translations', 'course_translations exists');
SELECT has_table('public', 'course_instructors', 'course_instructors exists');
SELECT ok(
  (SELECT bool_and(relrowsecurity) FROM pg_catalog.pg_class WHERE oid IN ('public.courses'::regclass, 'public.course_translations'::regclass, 'public.course_instructors'::regclass)),
  'row level security is enabled on all three course tables'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name IN ('courses', 'course_translations') AND column_name ~ 'rating|review'),
  'no rating or review columns exist (decision D12)'
);
SELECT throws_ok(
  $$INSERT INTO public.courses (slug, currency, created_by, updated_by) VALUES ('pgtap-usd', 'USD', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$$,
  '23514', NULL, 'only EGP is accepted as the launch currency (decision D01)'
);

-- ===== Seed (exact-locale reality check) =================================================
SELECT is((SELECT count(*)::integer FROM public.courses WHERE id::text LIKE 'c0000000-%'), 6, 'the six demo courses are seeded');
SELECT is(
  (SELECT count(*)::integer FROM public.catalog_list_courses('ar') WHERE slug = 'odoo-system-admin'), 0,
  'seed: a course with only an unpublished Arabic draft is absent from the Arabic catalog'
);

-- ===== Authority: learner (even with admin metadata), instructor and anonymous ==========
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-learner')$$, '42501', NULL, 'a learner cannot create a course');
SELECT throws_ok($$SELECT * FROM public.admin_list_courses()$$, '42501', NULL, 'a learner cannot list admin courses');
SELECT throws_ok($$SELECT public.admin_get_course(gen_random_uuid())$$, '42501', NULL, 'a learner cannot read admin course detail');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-instructor')$$, '42501', NULL, 'an instructor-role user cannot create a course');
SELECT throws_ok($$SELECT public.admin_set_course_status(gen_random_uuid(), 'published')$$, '42501', NULL, 'an instructor-role user cannot publish');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-anon')$$, '42501', NULL, 'anonymous users cannot execute admin course functions');
RESET ROLE;

-- ===== Admin creates and validates =======================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

SELECT set_config('pgtap.c1', public.admin_create_course('pgtap-course-one', 'functional', 'beginner', 12500)::text, true);
SELECT set_config('pgtap.c2', public.admin_create_course('pgtap-course-two', 'technical', 'advanced', 0)::text, true);

SELECT is((public.admin_get_course(current_setting('pgtap.c1')::uuid) ->> 'status'), 'draft', 'a new course starts as a draft');
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-course-one')$$, '23505', NULL, 'duplicate slug is rejected');
SELECT throws_ok($$SELECT public.admin_create_course('Bad Slug')$$, '23514', NULL, 'a slug with uppercase or spaces is rejected');
SELECT throws_ok($$SELECT public.admin_create_course('ab')$$, '23514', NULL, 'a too-short slug is rejected');
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-negative', NULL, NULL, -1)$$, '23514', NULL, 'a negative price is rejected');
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-bad-level', NULL, 'expert')$$, '23514', NULL, 'an unknown level is rejected');
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-bad-category', 'Not Valid')$$, '23514', NULL, 'a category that is not a lowercase key is rejected');

-- Clients (even admins) have no direct table writes.
SELECT throws_ok($$INSERT INTO public.courses (slug, created_by, updated_by) VALUES ('pgtap-direct', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001')$$, '42501', NULL, 'direct insert into courses is denied');
SELECT throws_ok($$UPDATE public.courses SET status = 'published'$$, '42501', NULL, 'direct update of courses is denied');
SELECT throws_ok($$DELETE FROM public.course_translations$$, '42501', NULL, 'direct delete from course_translations is denied');
SELECT throws_ok($$INSERT INTO public.course_instructors (course_id, position, display_name, assigned_by) VALUES (gen_random_uuid(), 1, 'x', 'd1000000-0000-4000-8000-000000000001')$$, '42501', NULL, 'direct insert into course_instructors is denied');

-- ===== Translations and publication ======================================================
SELECT lives_ok(
  $$SELECT public.admin_upsert_course_translation(current_setting('pgtap.c1')::uuid, 'en', '  English Title  ', 'English summary', 'English description')$$,
  'an English draft translation can be saved (input is trimmed)'
);
SELECT throws_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.c1')::uuid, 'fr', 'Titre', 'Resume')$$, '23514', NULL, 'only en and ar locales are accepted');
SELECT throws_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.c1')::uuid, 'en', '', 'Summary')$$, '23514', NULL, 'an empty title is rejected');
SELECT throws_ok($$SELECT public.admin_set_course_status(current_setting('pgtap.c1')::uuid, 'published')$$, '23514', NULL, 'a course cannot be published without a published translation');
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.c1')::uuid, 'en', true)$$, 'the English translation can be published');
SELECT lives_ok($$SELECT public.admin_set_course_status(current_setting('pgtap.c1')::uuid, 'published')$$, 'the course can be published once a translation is published');
SELECT lives_ok($$SELECT public.admin_set_course_instructors(current_setting('pgtap.c1')::uuid, '[{"display_name":"First Person"},{"display_name":"Second Person","profile_id":"d1000000-0000-4000-8000-000000000003"}]'::jsonb)$$, 'ordered instructors can be set');
RESET ROLE;

SELECT is((SELECT title FROM public.course_translations WHERE course_id = current_setting('pgtap.c1')::uuid AND locale = 'en'), 'English Title', 'the stored title is trimmed');
SELECT isnt((SELECT published_at FROM public.courses WHERE id = current_setting('pgtap.c1')::uuid), NULL, 'published_at is set on first publish');

-- ===== Anonymous reads: published, exact locale, safe columns ============================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::integer FROM public.courses WHERE slug = 'pgtap-course-two'), 0, 'anonymous cannot read a draft course');
SELECT is((SELECT count(*)::integer FROM public.courses WHERE slug = 'pgtap-course-one'), 1, 'anonymous can read a published course');
SELECT throws_ok($$SELECT created_by FROM public.courses$$, '42501', NULL, 'anonymous cannot read creator columns');
SELECT throws_ok($$SELECT profile_id FROM public.course_instructors$$, '42501', NULL, 'anonymous cannot read instructor profile links');
SELECT throws_ok($$SELECT updated_at FROM public.course_translations$$, '42501', NULL, 'anonymous cannot read internal timestamp columns');
SELECT is((SELECT count(*)::integer FROM public.catalog_list_courses('en') WHERE slug = 'pgtap-course-one'), 1, 'the English catalog lists the course');
SELECT is((SELECT count(*)::integer FROM public.catalog_list_courses('ar') WHERE slug = 'pgtap-course-one'), 0, 'the Arabic catalog does not fall back to English');
SELECT is((SELECT count(*)::integer FROM public.catalog_get_course('pgtap-course-one', 'ar')), 0, 'the Arabic detail does not fall back to English');
SELECT is((SELECT title FROM public.catalog_get_course('pgtap-course-one', 'en')), 'English Title', 'the English detail returns the English text');
SELECT is((SELECT instructors FROM public.catalog_get_course('pgtap-course-one', 'en')), ARRAY['First Person', 'Second Person']::text[], 'instructors are display names in attribution order and nothing else');
SELECT throws_ok($$SELECT * FROM public.catalog_list_courses('fr')$$, '22023', NULL, 'an unsupported locale is rejected, not defaulted');
SELECT throws_ok($$SELECT * FROM public.catalog_list_courses(NULL)$$, '22023', NULL, 'a missing locale is rejected, not defaulted');
SELECT ok((SELECT count(*) FROM public.catalog_list_courses('en', NULL, NULL, 1000, 0)) <= 50, 'catalog page size is bounded to 50');
RESET ROLE;

-- ===== Arabic publication is independent ================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.c1')::uuid, 'ar', 'عنوان عربي', 'ملخص عربي')$$, 'an Arabic draft can be saved');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::integer FROM public.catalog_list_courses('ar') WHERE slug = 'pgtap-course-one'), 0, 'an unpublished Arabic draft is invisible');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.c1')::uuid, 'ar', true)$$, 'the Arabic translation can be published');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT title FROM public.catalog_get_course('pgtap-course-one', 'ar')), 'عنوان عربي', 'the Arabic catalog now shows the Arabic text');
RESET ROLE;

-- ===== Lifecycle guards ==================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.admin_update_course(current_setting('pgtap.c1')::uuid, 'pgtap-renamed', 'functional', 'beginner', 12500)$$,
  '23514', NULL, 'the slug of a published course cannot change'
);
SELECT lives_ok(
  $$SELECT public.admin_update_course(current_setting('pgtap.c1')::uuid, 'pgtap-course-one', 'technical', 'intermediate', 15000)$$,
  'other fields of a published course can change'
);
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.c1')::uuid, 'ar', false)$$, 'one translation can be unpublished while another stays published');
SELECT throws_ok(
  $$SELECT public.admin_set_translation_publication(current_setting('pgtap.c1')::uuid, 'en', false)$$,
  '23514', NULL, 'the last published translation of a published course cannot be unpublished'
);
SELECT throws_ok($$SELECT public.admin_set_course_instructors(current_setting('pgtap.c1')::uuid, '[{"display_name":"A"},{"display_name":"B","profile_id":"d1000000-0000-4000-8000-000000000003"},{"display_name":"C","profile_id":"d1000000-0000-4000-8000-000000000003"}]'::jsonb)$$, '23505', NULL, 'the same profile cannot be attributed twice on one course');
SELECT throws_ok($$SELECT public.admin_set_course_instructors(current_setting('pgtap.c1')::uuid, '[{"display_name":"A","profile_id":"ffffffff-ffff-4fff-8fff-ffffffffffff"}]'::jsonb)$$, '23503', NULL, 'an unknown profile link is rejected');
SELECT throws_ok($$SELECT public.admin_set_course_instructors(current_setting('pgtap.c1')::uuid, '[{"nope":1}]'::jsonb)$$, '22023', NULL, 'an instructor entry without a display name is rejected');
SELECT throws_ok($$SELECT public.admin_set_course_instructors(current_setting('pgtap.c1')::uuid, '{"a":1}'::jsonb)$$, '22023', NULL, 'instructors must be a JSON array');
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.course_instructors WHERE course_id = current_setting('pgtap.c1')::uuid),
  2,
  'failed instructor updates roll back and leave the previous ordered list intact'
);
SELECT is(
  (SELECT array_agg(position ORDER BY position) FROM public.course_instructors WHERE course_id = current_setting('pgtap.c1')::uuid),
  ARRAY[1, 2],
  'instructor positions are contiguous from 1'
);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.admin_set_course_status(current_setting('pgtap.c1')::uuid, 'archived')$$, 'a course can be archived');
SELECT throws_ok($$SELECT public.admin_set_course_status(current_setting('pgtap.c1')::uuid, 'published')$$, '23514', NULL, 'an archived course cannot jump back to published');
SELECT throws_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.c1')::uuid, 'en', 'Edit', 'Edit')$$, '23514', NULL, 'an archived course cannot be edited');
SELECT is((SELECT count(*)::integer FROM public.admin_list_courses('archived') WHERE slug = 'pgtap-course-one'), 1, 'admins can list archived courses');
SELECT is((SELECT count(*)::integer FROM public.admin_list_courses('draft') WHERE slug = 'pgtap-course-two'), 1, 'admins can list draft courses');
RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::integer FROM public.catalog_list_courses('en') WHERE slug = 'pgtap-course-one'), 0, 'an archived course leaves the public catalog');
RESET ROLE;

-- ===== History, audit and revocation =====================================================
SELECT throws_ok($$DELETE FROM public.courses WHERE id = current_setting('pgtap.c1')::uuid$$, '23503', NULL, 'a course with translations cannot be hard-deleted');
SELECT ok(
  (SELECT count(*) FROM public.admin_audit_log WHERE target_type = 'course' AND course_id = current_setting('pgtap.c1')::uuid) >= 8,
  'every administrative course change wrote an audit row'
);
SELECT throws_ok($$UPDATE public.admin_audit_log SET safe_summary = 'tampered' WHERE target_type = 'course'$$, '42501', NULL, 'course audit rows are append-only');

SELECT set_config('pgtap.audit_n', (SELECT count(*)::text FROM public.admin_audit_log WHERE target_type = 'course'), true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_list_audit(100, 0) WHERE target_type = 'course'),
  current_setting('pgtap.audit_n')::integer,
  'the Phase 06 audit viewer lists every course audit row'
);
RESET ROLE;

UPDATE public.user_roles SET revoked_by = 'd1000000-0000-4000-8000-000000000001', revoked_at = pg_catalog.now()
WHERE user_id = 'd1000000-0000-4000-8000-000000000003';
INSERT INTO public.user_roles (user_id, role, granted_by) VALUES ('d1000000-0000-4000-8000-000000000002', 'admin', 'd1000000-0000-4000-8000-000000000001');
UPDATE public.user_roles SET revoked_by = 'd1000000-0000-4000-8000-000000000001', revoked_at = pg_catalog.now()
WHERE user_id = 'd1000000-0000-4000-8000-000000000002' AND role = 'admin';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"d1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.admin_create_course('pgtap-revoked')$$, '42501', NULL, 'a revoked admin loses course authority immediately');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
