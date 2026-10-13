-- Phase 10 enrollment / entitlement security and lifecycle regression suite.
BEGIN;
SELECT plan(69);

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
  ('e1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase10-admin@example.test', '{}'::jsonb, now(), now()),
  ('e1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase10-learner-a@example.test', '{}'::jsonb, now(), now()),
  ('e1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'phase10-learner-b@example.test', '{}'::jsonb, now(), now());
INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES ('e1000000-0000-4000-8000-000000000001', 'admin', 'e1000000-0000-4000-8000-000000000001');

SELECT has_table('public', 'enrollments', 'enrollment history table exists');
SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.enrollments'::regclass), 'enrollments have RLS enabled');
SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'SELECT'), 'service role has no direct enrollment SELECT grant');
SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'INSERT'), 'service role has no direct enrollment INSERT grant');
SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'UPDATE'), 'service role has no direct enrollment UPDATE grant');
SELECT ok(NOT has_table_privilege('service_role', 'public.enrollments', 'DELETE'), 'service role has no direct enrollment DELETE grant');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT set_config('pgtap.course', public.admin_create_course('pgtap-entitlement')::text, true);
SELECT lives_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.course')::uuid, 'en', 'Entitlement Test', 'Test summary')$$, 'admin publishes English test course translation');
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.course')::uuid, 'en', true)$$, 'admin publishes test course translation');
SELECT lives_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.course')::uuid, 'ar', 'دورة الاختبار', 'ملخص الاختبار')$$, 'admin creates Arabic test course translation');
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.course')::uuid, 'ar', true)$$, 'admin publishes Arabic test course translation');
SELECT lives_ok($$SELECT public.admin_set_course_status(current_setting('pgtap.course')::uuid, 'published')$$, 'admin publishes free test course');
SELECT set_config('pgtap.draft_course', public.admin_create_course('pgtap-draft-entitlement')::text, true);
SELECT lives_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.draft_course')::uuid, 'en', 'Draft Test', 'Unpublished course')$$, 'admin creates an unpublished course translation');
SELECT set_config('pgtap.module', public.admin_create_course_module(current_setting('pgtap.course')::uuid)::text, true);
SELECT lives_ok($$SELECT public.admin_save_module_translation(current_setting('pgtap.module')::uuid, 'en', 'Test Module')$$, 'admin translates module');
SELECT lives_ok($$SELECT public.admin_set_module_translation_publication(current_setting('pgtap.module')::uuid, 'en', true)$$, 'admin publishes module translation');
SELECT lives_ok($$SELECT public.admin_save_module_translation(current_setting('pgtap.module')::uuid, 'ar', 'وحدة الاختبار')$$, 'admin translates module to Arabic');
SELECT lives_ok($$SELECT public.admin_set_module_translation_publication(current_setting('pgtap.module')::uuid, 'ar', true)$$, 'admin publishes Arabic module translation');
SELECT set_config('pgtap.lesson', public.admin_create_lesson(current_setting('pgtap.module')::uuid, 'article')::text, true);
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.lesson')::uuid, 'en', 'Private Lesson', 'Summary', 'Protected body')$$, 'admin saves protected lesson body');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.lesson')::uuid, 'en', true)$$, 'admin publishes lesson translation');
SELECT lives_ok($$SELECT public.admin_set_lesson_status(current_setting('pgtap.lesson')::uuid, 'published')$$, 'admin publishes lesson');
SELECT set_config('pgtap.resource', resource_id::text, true)
FROM public.admin_create_lesson_resource(current_setting('pgtap.lesson')::uuid, 'external_url', 'en', 'https://example.test/resource');
SELECT lives_ok($$SELECT public.admin_save_resource_translation(current_setting('pgtap.resource')::uuid, 'en', 'Workbook')$$, 'admin saves exact-locale resource label');
SELECT lives_ok($$SELECT public.admin_set_resource_translation_publication(current_setting('pgtap.resource')::uuid, 'en', true)$$, 'admin publishes resource translation');
SELECT set_config('pgtap.draft_lesson', public.admin_create_lesson(current_setting('pgtap.module')::uuid, 'article')::text, true);
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.draft_lesson')::uuid, 'en', 'Draft Preview', 'Draft', 'Must remain private')$$, 'admin creates draft preview lesson translation');
SELECT lives_ok($$SELECT public.admin_update_lesson(current_setting('pgtap.draft_lesson')::uuid, true, true, NULL)$$, 'admin marks draft lesson as preview without publishing it');
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.draft_lesson')::uuid, 'ar', 'معاينة', 'مسودة', 'يجب أن يبقى المحتوى خاصًا')$$, 'admin creates second locale translation for preview test');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.draft_lesson')::uuid, 'en', true)$$, 'admin publishes first preview locale');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.draft_lesson')::uuid, 'ar', true)$$, 'admin publishes second preview locale');
SELECT lives_ok($$SELECT public.admin_set_lesson_status(current_setting('pgtap.draft_lesson')::uuid, 'published')$$, 'admin publishes lesson while both exact-locale translations are published');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.draft_lesson')::uuid, 'en', false)$$, 'admin unpublishes one preview locale while keeping the lesson published');
SELECT set_config('pgtap.unpublished_lesson', public.admin_create_lesson(current_setting('pgtap.module')::uuid, 'article')::text, true);
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.unpublished_lesson')::uuid, 'en', 'Unpublished Preview', 'Draft lesson', 'Must remain private')$$, 'admin saves a translation for unpublished preview lesson');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.unpublished_lesson')::uuid, 'en', true)$$, 'admin publishes translation while lesson remains unpublished');
SELECT lives_ok($$SELECT public.admin_update_lesson(current_setting('pgtap.unpublished_lesson')::uuid, true, true, NULL)$$, 'admin marks unpublished lesson as preview');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'anonymous caller cannot read a non-preview lesson');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson_resources(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'anonymous caller cannot read non-preview resources');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.draft_lesson')::uuid, 'en')), 0, 'preview does not expose an unpublished exact-locale translation');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.draft_lesson')::uuid, 'ar')), 1, 'published preview translation remains available in its exact locale');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.unpublished_lesson')::uuid, 'en')), 0, 'preview flag does not expose an unpublished lesson');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.learner_grant_free_enrollment(current_setting('pgtap.draft_course')::uuid)$$, 'P0002', NULL, 'learner cannot enroll in a course without a published locale');
SELECT set_config('pgtap.enrollment', public.learner_grant_free_enrollment(current_setting('pgtap.course')::uuid)::text, true);
SELECT is((SELECT count(*)::integer FROM public.enrollments WHERE user_id = auth.uid() AND course_id = current_setting('pgtap.course')::uuid AND status = 'active'), 1, 'free enrollment creates one active learner-owned grant');
SELECT is(public.learner_grant_free_enrollment(current_setting('pgtap.course')::uuid), current_setting('pgtap.enrollment')::uuid, 'repeated grant is idempotent while active');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 1, 'active enrollment authorizes exact-locale published lesson');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'ar')), 0, 'missing locale translation never falls back');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson_resources(current_setting('pgtap.lesson')::uuid, 'en')), 1, 'active enrollment authorizes exact-locale published resource');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson_resources(current_setting('pgtap.lesson')::uuid, 'ar')), 0, 'resource locale does not fall back');
SELECT throws_ok($$INSERT INTO public.enrollments (user_id, course_id, granted_by) VALUES (auth.uid(), current_setting('pgtap.course')::uuid, auth.uid())$$, '42501', NULL, 'learner cannot directly grant an enrollment');
SELECT throws_ok($$UPDATE public.enrollments SET status = 'revoked' WHERE id = current_setting('pgtap.enrollment')::uuid$$, '42501', NULL, 'learner cannot directly mutate enrollment status');
SELECT throws_ok($$DELETE FROM public.enrollments WHERE id = current_setting('pgtap.enrollment')::uuid$$, '42501', NULL, 'learner cannot delete enrollment history');
SELECT throws_ok($$SELECT public.admin_revoke_enrollment(current_setting('pgtap.enrollment')::uuid)$$, '42501', NULL, 'non-admin cannot revoke an enrollment through the admin RPC');
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"role":"admin"},"user_metadata":{"role":"admin"}}', true);
SELECT throws_ok($$SELECT public.admin_revoke_enrollment(current_setting('pgtap.enrollment')::uuid)$$, '42501', NULL, 'forged user-controlled admin claims do not authorize revocation');
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

RESET ROLE;
UPDATE public.enrollments
SET status = 'completed', completed_at = now()
WHERE id = current_setting('pgtap.enrollment')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 1, 'completed enrollment retains protected content access');
SELECT set_config('pgtap.active_enrollment', public.learner_grant_free_enrollment(current_setting('pgtap.course')::uuid)::text, true);
SELECT isnt(current_setting('pgtap.active_enrollment')::uuid, current_setting('pgtap.enrollment')::uuid, 're-enrollment after completion creates a new history row');
SELECT is((SELECT count(*)::integer FROM public.enrollments WHERE user_id = auth.uid() AND course_id = current_setting('pgtap.course')::uuid), 2, 'completed enrollment history is retained');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.enrollments WHERE id = current_setting('pgtap.enrollment')::uuid), 0, 'learner B cannot read learner A enrollment');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'learner B cannot access learner A course content');

RESET ROLE;
UPDATE public.enrollments SET granted_at = now() - interval '10 minutes', expires_at = now() - interval '1 second'
WHERE id = current_setting('pgtap.enrollment')::uuid;
UPDATE public.enrollments SET granted_at = now() - interval '10 minutes', expires_at = now() - interval '1 second'
WHERE id = current_setting('pgtap.active_enrollment')::uuid;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'expired completed and active grants deny protected content');
SELECT set_config('pgtap.renewed_enrollment', public.learner_grant_free_enrollment(current_setting('pgtap.course')::uuid)::text, true);
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 1, 'new enrollment restores access after expired history');
SELECT is((SELECT status FROM public.enrollments WHERE id = current_setting('pgtap.active_enrollment')::uuid), 'expired', 'expired active grant is retained and transitioned before re-enrollment');
SELECT is((SELECT count(*)::integer FROM public.enrollments WHERE user_id = auth.uid() AND course_id = current_setting('pgtap.course')::uuid), 3, 'expiration renewal preserves all previous rows');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.admin_revoke_enrollment(current_setting('pgtap.renewed_enrollment')::uuid)$$, 'admin revokes enrollment through trusted operation');
RESET ROLE;
SELECT is((SELECT status FROM public.enrollments WHERE id = current_setting('pgtap.renewed_enrollment')::uuid), 'revoked', 'revocation preserves the enrollment history row');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.admin_revoke_enrollment(current_setting('pgtap.enrollment')::uuid)$$, 'completed enrollment can be revoked explicitly');
RESET ROLE;
SELECT is((SELECT count(*)::integer FROM public.admin_audit_log WHERE action = 'enrollment.revoked' AND accessed_user_id = 'e1000000-0000-4000-8000-000000000002' AND enrollment_id IN (current_setting('pgtap.renewed_enrollment')::uuid, current_setting('pgtap.enrollment')::uuid)), 2, 'each revocation is audited against its exact enrollment row');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'revoked learner loses non-preview lesson access');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson_resources(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'revoked learner loses resource access');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.admin_update_lesson(current_setting('pgtap.lesson')::uuid, true, true, NULL)$$, 'admin marks an explicitly published lesson as preview');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claims', '', true);
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'en')), 1, 'explicit preview permits anonymous exact-locale access');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson_resources(current_setting('pgtap.lesson')::uuid, 'en')), 1, 'explicit preview permits its published resource');
SELECT is((SELECT count(*)::integer FROM public.learner_get_lesson(current_setting('pgtap.lesson')::uuid, 'ar')), 0, 'preview does not bypass exact-locale publication');
SELECT is((SELECT count(*)::integer FROM public.enrollments), 0, 'anonymous direct enrollment reads return no rows');
SELECT throws_ok($$SELECT public.learner_grant_free_enrollment(current_setting('pgtap.course')::uuid)$$, '42501', NULL, 'anonymous callers cannot grant enrollments');
SELECT finish();
ROLLBACK;
