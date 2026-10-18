-- Confirm ets-learn DEV before running. Every fixture and audit row is rolled back.
BEGIN;
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2710000-0000-4000-8000-000000000001','authenticated','authenticated','hosted-content-admin@example.test','{}',now(),now()),
('e2710000-0000-4000-8000-000000000002','authenticated','authenticated','hosted-content-learner@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e2710000-0000-4000-8000-000000000001','admin','e2710000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2710000-0000-4000-8000-000000000001',true);
SELECT set_config('h.course',public.admin_save_course_content('hosted-content-check','en','Content check','Fixture','',0,'','beginner',false)::text,true);
SELECT set_config('h.module',public.admin_create_module_draft(current_setting('h.course')::uuid,'en','Module')::text,true);
SELECT set_config('h.lesson',public.admin_create_lesson_draft(current_setting('h.module')::uuid,'en','PDF','resource')::text,true);
DO $$ BEGIN
 BEGIN PERFORM public.admin_edit_lesson(current_setting('h.lesson')::uuid,'en','Changed','','',false,true,true); RAISE EXCEPTION 'ancestor gate accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN PERFORM public.admin_save_course_content('changed-url','en','Course','Summary','',0,'','beginner',false,current_setting('h.course')::uuid); RAISE EXCEPTION 'URL changed'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT title FROM public.lesson_translations WHERE lesson_id=current_setting('h.lesson')::uuid AND locale='en')<>'PDF' THEN RAISE EXCEPTION 'non-atomic lesson edit';END IF;
 IF NOT (SELECT is_required FROM public.lessons WHERE id=current_setting('h.lesson')::uuid) THEN RAISE EXCEPTION 'non-atomic requirement edit';END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT public.admin_save_course_content('hosted-content-check','en','Content check','Fixture','',0,'','beginner',true,current_setting('h.course')::uuid);
SELECT public.admin_edit_module(current_setting('h.module')::uuid,'en','Module','',false,true);
SELECT public.admin_edit_lesson(current_setting('h.lesson')::uuid,'en','PDF','','',true,false,true);
SELECT set_config('h.resource',(SELECT resource_id::text FROM public.admin_prepare_resource_upload(current_setting('h.lesson')::uuid,'en','Document')),true);
DO $$ BEGIN
 IF (SELECT is_required FROM public.catalog_get_course_outline('hosted-content-check','en') WHERE lesson_id=current_setting('h.lesson')::uuid) IS DISTINCT FROM false THEN RAISE EXCEPTION 'optional module mismatch';END IF;
 IF (SELECT lesson_id FROM public.admin_get_resource_upload(current_setting('h.resource')::uuid,'en')) IS DISTINCT FROM current_setting('h.lesson')::uuid THEN RAISE EXCEPTION 'upload lesson mismatch';END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT publication_status FROM public.lesson_resource_translations WHERE resource_id=current_setting('h.resource')::uuid AND locale='en')<>'draft' THEN RAISE EXCEPTION 'upload published prematurely';END IF;
 IF has_table_privilege('authenticated','public.lessons','UPDATE') OR has_function_privilege('anon','public.admin_prepare_resource_upload(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'privilege widened';END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2710000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 BEGIN PERFORM public.admin_get_curriculum(current_setting('h.course')::uuid,'en');RAISE EXCEPTION 'learner authoring access';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.admin_prepare_resource_upload(current_setting('h.lesson')::uuid,'en','Spoof');RAISE EXCEPTION 'learner upload access';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: 10 content-administration assertions; fixtures rolled back' AS result;
