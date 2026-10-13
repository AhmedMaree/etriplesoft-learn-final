BEGIN;
SELECT no_plan();

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
  ('e1100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase11-admin@example.test', '{}'::jsonb, now(), now()),
  ('e1100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase11-instructor@example.test', '{}'::jsonb, now(), now()),
  ('e1100000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'phase11-learner@example.test', '{}'::jsonb, now(), now());
INSERT INTO public.user_roles (user_id, role, granted_by) VALUES
  ('e1100000-0000-4000-8000-000000000001', 'admin', 'e1100000-0000-4000-8000-000000000001'),
  ('e1100000-0000-4000-8000-000000000002', 'instructor', 'e1100000-0000-4000-8000-000000000001');

SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.lesson_videos'::regclass), 'lesson video metadata has RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.lesson_video_captions'::regclass), 'caption metadata has RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.mux_webhook_events'::regclass), 'webhook event IDs have RLS enabled');
SELECT ok(NOT has_table_privilege('authenticated', 'public.lesson_videos', 'SELECT'), 'learners have no direct lesson video table access');
SELECT ok(NOT has_table_privilege('service_role', 'public.lesson_videos', 'SELECT'), 'service role has no direct lesson video table access');
SELECT ok(NOT has_table_privilege('service_role', 'public.mux_webhook_events', 'INSERT'), 'service role cannot write event IDs except through its RPC');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT set_config('pgtap.course', public.admin_create_course('phase11-video')::text, true);
SELECT lives_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.course')::uuid, 'en', 'Video Test', 'Video test summary')$$, 'admin creates English course translation');
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.course')::uuid, 'en', true)$$, 'English course translation is published');
SELECT lives_ok($$SELECT public.admin_upsert_course_translation(current_setting('pgtap.course')::uuid, 'ar', 'اختبار الفيديو', 'ملخص اختبار الفيديو')$$, 'admin creates Arabic course translation');
SELECT lives_ok($$SELECT public.admin_set_translation_publication(current_setting('pgtap.course')::uuid, 'ar', true)$$, 'Arabic course translation is published');
SELECT lives_ok($$SELECT public.admin_set_course_status(current_setting('pgtap.course')::uuid, 'published')$$, 'course is published');
SELECT set_config('pgtap.module', public.admin_create_course_module(current_setting('pgtap.course')::uuid)::text, true);
SELECT lives_ok($$SELECT public.admin_save_module_translation(current_setting('pgtap.module')::uuid, 'en', 'Video Module')$$, 'English module translation is saved');
SELECT lives_ok($$SELECT public.admin_set_module_translation_publication(current_setting('pgtap.module')::uuid, 'en', true)$$, 'English module translation is published');
SELECT lives_ok($$SELECT public.admin_save_module_translation(current_setting('pgtap.module')::uuid, 'ar', 'وحدة الفيديو')$$, 'Arabic module translation is saved');
SELECT lives_ok($$SELECT public.admin_set_module_translation_publication(current_setting('pgtap.module')::uuid, 'ar', true)$$, 'Arabic module translation is published');
SELECT set_config('pgtap.lesson', public.admin_create_lesson(current_setting('pgtap.module')::uuid, 'video')::text, true);
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.lesson')::uuid, 'en', 'Video Lesson')$$, 'English lesson translation is saved');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.lesson')::uuid, 'en', true)$$, 'English lesson translation is published');
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.lesson')::uuid, 'ar', 'درس الفيديو')$$, 'Arabic lesson translation is saved');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.lesson')::uuid, 'ar', true)$$, 'Arabic lesson translation is published');
SELECT lives_ok($$SELECT public.admin_set_lesson_status(current_setting('pgtap.lesson')::uuid, 'published')$$, 'video lesson is published');
SELECT set_config('pgtap.error_lesson', public.admin_create_lesson(current_setting('pgtap.module')::uuid, 'video')::text, true);
SELECT lives_ok($$SELECT public.admin_save_lesson_translation(current_setting('pgtap.error_lesson')::uuid, 'en', 'Video Error Lesson')$$, 'second video lesson is saved for error lifecycle coverage');
SELECT lives_ok($$SELECT public.admin_set_lesson_translation_publication(current_setting('pgtap.error_lesson')::uuid, 'en', true)$$, 'second video lesson translation is published');
SELECT lives_ok($$SELECT public.admin_set_lesson_status(current_setting('pgtap.error_lesson')::uuid, 'published')$$, 'second video lesson is published');

SELECT lives_ok($$SELECT public.admin_set_course_instructors(current_setting('pgtap.course')::uuid, '[{"profile_id":"e1100000-0000-4000-8000-000000000002","display_name":"Phase 11 Instructor"}]'::jsonb)$$, 'admin assigns the course instructor');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT set_config('pgtap.video_id', public.mux_begin_lesson_upload(current_setting('pgtap.lesson')::uuid)::text, true);
SELECT lives_ok($$SELECT public.mux_attach_upload(current_setting('pgtap.video_id')::uuid, 'upload_phase11_001')$$, 'assigned instructor attaches the Mux direct upload');
SELECT set_config('pgtap.error_video_id', public.mux_begin_lesson_upload(current_setting('pgtap.error_lesson')::uuid)::text, true);
SELECT lives_ok($$SELECT public.mux_attach_upload(current_setting('pgtap.error_video_id')::uuid, 'upload_phase11_err')$$, 'assigned instructor attaches the second Mux direct upload');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT throws_ok($$SELECT public.mux_begin_lesson_upload(current_setting('pgtap.lesson')::uuid)$$, '42501', NULL, 'learner cannot request direct uploads');
SELECT is((SELECT count(*)::integer FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'authenticated learner without an active enrollment receives no playback ID');
SELECT lives_ok($$SELECT public.learner_grant_free_enrollment(current_setting('pgtap.course')::uuid)$$, 'learner receives an active free enrollment');
SELECT throws_ok($$SELECT * FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'fr')$$, '22023', NULL, 'unsupported locale is rejected');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT ok(public.mux_process_webhook('evt_phase11_upload_created', 'video.upload.created', '{"id":"upload_phase11_001"}'::jsonb), 'upload-created event is accepted');
SELECT ok(public.mux_process_webhook('evt_phase11_asset_created', 'video.upload.asset_created', '{"id":"upload_phase11_001","asset_id":"asset_phase11_001"}'::jsonb), 'upload asset-created event is accepted');
SELECT ok(public.mux_process_webhook('evt_phase11_ready', 'video.asset.ready',
  '{"id":"asset_phase11_001","playback_ids":[{"id":"playback_phase11_001","policy":"signed"}],"duration":60.5,"aspect_ratio":"16:9","resolution_tier":"1080p","tracks":[{"id":"track_en_001","type":"text","language_code":"en-US"},{"id":"track_ar_001","type":"text","language_code":"ar-EG"}]}'::jsonb), 'ready event records signed playback and caption tracks');
SELECT ok(NOT public.mux_process_webhook('evt_phase11_ready', 'video.asset.ready', '{"id":"asset_phase11_001"}'::jsonb), 'duplicate provider event is idempotently ignored');
SELECT ok(public.mux_process_webhook('evt_phase11_upload_error', 'video.upload.errored', '{"id":"upload_phase11_err"}'::jsonb), 'upload error event is accepted');
RESET ROLE;

SELECT is((SELECT status FROM public.lesson_videos WHERE id = current_setting('pgtap.video_id')::uuid), 'ready', 'video metadata reaches ready state');
SELECT is((SELECT mux_playback_id FROM public.lesson_videos WHERE id = current_setting('pgtap.video_id')::uuid), 'playback_phase11_001', 'only the signed playback ID is stored');
SELECT is((SELECT duration_seconds FROM public.lesson_videos WHERE id = current_setting('pgtap.video_id')::uuid), 61, 'fractional duration rounds up to whole seconds');
SELECT is((SELECT status FROM public.lesson_videos WHERE id = current_setting('pgtap.error_video_id')::uuid), 'upload_failed', 'upload error transitions its video metadata to failed');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT set_config('pgtap.error_retry_id', public.mux_begin_lesson_upload(current_setting('pgtap.error_lesson')::uuid)::text, true);
SELECT isnt(current_setting('pgtap.error_retry_id')::uuid, current_setting('pgtap.error_video_id')::uuid, 'failed upload history is retained while a retry creates a new metadata row');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.mux_set_caption_requirements(current_setting('pgtap.video_id')::uuid, ARRAY['en','ar'])$$, 'assigned instructor can require reviewed English and Arabic captions');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'required unreviewed captions block playback');
SELECT throws_ok($$SELECT public.mux_set_caption_requirements(current_setting('pgtap.video_id')::uuid, ARRAY['fr'])$$, '22023', NULL, 'unsupported required caption locale is rejected');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.mux_review_caption(current_setting('pgtap.video_id')::uuid, 'en', 'track_en_001')$$, 'assigned instructor reviews English captions');
SELECT lives_ok($$SELECT public.mux_review_caption(current_setting('pgtap.video_id')::uuid, 'ar', 'track_ar_001')$$, 'assigned instructor reviews Arabic captions');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT is((SELECT mux_playback_id FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'ar')), 'playback_phase11_001', 'active enrolled learner receives signed playback after required localized captions are reviewed');
SELECT is((SELECT count(*)::integer FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'en')), 1, 'shared neutral video metadata supports the published English lesson locale');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000002', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT set_config('pgtap.replacement_video_id', public.mux_begin_lesson_upload(current_setting('pgtap.lesson')::uuid)::text, true);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SELECT is((SELECT mux_playback_id FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'en')), 'playback_phase11_001', 'previous ready video remains available while replacement upload is processing');
RESET ROLE;

-- Preview lessons play for any signed-in user; turning preview off restores the enrollment gate.
INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at) VALUES
  ('e1100000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'phase11-visitor@example.test', '{}'::jsonb, now(), now());
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000004', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT count(*)::integer FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'en')), 0, 'unenrolled user receives no playback for a non-preview lesson');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT lives_ok($$SELECT public.admin_update_lesson(current_setting('pgtap.lesson')::uuid, true, true, NULL)$$, 'admin marks the video lesson as a preview');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'e1100000-0000-4000-8000-000000000004', true);
SELECT set_config('request.jwt.claims', '{"sub":"e1100000-0000-4000-8000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT mux_playback_id FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'en')), 'playback_phase11_001', 'unenrolled signed-in user receives playback for a published preview lesson');
RESET ROLE;
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT * FROM public.mux_get_lesson_playback(current_setting('pgtap.lesson')::uuid, 'en')$$, '42501', NULL, 'anonymous callers cannot request preview playback');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
