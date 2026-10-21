BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2700000-0000-4000-8000-000000000001','authenticated','authenticated','placement-admin@example.test','{}',now(),now()),
('e2700000-0000-4000-8000-000000000002','authenticated','authenticated','placement-one@example.test','{}',now(),now()),
('e2700000-0000-4000-8000-000000000003','authenticated','authenticated','placement-two@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES
('e2700000-0000-4000-8000-000000000001','admin','e2700000-0000-4000-8000-000000000001');

-- Two published courses give the areas 'functional' and 'technical' regardless of other data.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000001',true);
SELECT set_config('p.functional',public.admin_create_course('placement-functional')::text,true);
SELECT set_config('p.technical',public.admin_create_course('placement-technical')::text,true);
SELECT public.admin_upsert_course_translation(id,'en','Course '||right(id::text,4),'Test'),public.admin_set_translation_publication(id,'en',true)
FROM unnest(ARRAY[current_setting('p.functional'),current_setting('p.technical')]::uuid[]) id;
RESET ROLE;
UPDATE public.courses SET category='functional', level='beginner' WHERE id=current_setting('p.functional')::uuid;
UPDATE public.courses SET category='technical', level='intermediate' WHERE id=current_setting('p.technical')::uuid;
SET LOCAL ROLE authenticated;
SELECT public.admin_set_course_status(id,'published') FROM unnest(ARRAY[current_setting('p.functional'),current_setting('p.technical')]::uuid[]) id;

-- Learner one: a fresh status, then the questions without keys.
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000002',true);
SELECT is(public.learner_placement_status()->'result','null'::jsonb,'a new learner has no result');
SELECT is((public.learner_placement_status()->>'skipped')::boolean,false,'a new learner has not skipped');
SELECT ok(public.learner_placement_status()->'areas' @> '["functional","technical"]','areas come from published course categories');
SELECT is(jsonb_array_length(public.learner_placement_questions('en')->'questions'),8,'eight questions are offered in English');
SELECT is(jsonb_array_length(public.learner_placement_questions('ar')->'questions'),8,'eight questions are offered in Arabic');
SELECT ok(public.learner_placement_questions('en')::text NOT LIKE '%correct%','the projection carries no correctness data');
SELECT is(public.learner_placement_questions('en')->>'versionId','a7000000-0000-4000-8000-000000000002','the newest published version is offered');
SELECT ok(public.learner_placement_questions('en')::text LIKE '%delivery order is created for its physical products%','version 2 carries the corrected answer');
SELECT ok(public.learner_placement_questions('en')::text NOT LIKE '%storable%','the superseded answer is no longer offered');
SELECT throws_ok($$SELECT public.learner_placement_questions('fr')$$,'22023',NULL,'unknown locale is refused');

-- Answer keys and tables are not reachable.
SELECT throws_ok($$SELECT * FROM learning_private.placement_answer_keys$$,'42501',NULL,'answer keys are private');
SELECT throws_ok($$SELECT * FROM public.placement_results$$,'42501',NULL,'results table is not exposed');
SELECT throws_ok($$SELECT * FROM public.placement_questions$$,'42501',NULL,'questions table is not exposed');
SELECT throws_ok($$INSERT INTO public.placement_results(user_id,method) VALUES('e2700000-0000-4000-8000-000000000002','self_reported')$$,'42501',NULL,'results cannot be written directly');
SELECT throws_ok($$INSERT INTO public.learner_placement_goals(user_id,role,interest_areas,experience) VALUES('e2700000-0000-4000-8000-000000000003','developer','{technical}','some')$$,'42501',NULL,'goals cannot be written directly');

-- Validation.
SELECT throws_ok($$SELECT public.learner_placement_submit('pilot','{functional}','some','a7000000-0000-4000-8000-000000000002','{}')$$,'22023',NULL,'unknown role is refused');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{}','some','a7000000-0000-4000-8000-000000000002','{}')$$,'22023',NULL,'at least one area is required');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{cooking}','some','a7000000-0000-4000-8000-000000000002','{}')$$,'22023',NULL,'unknown area is refused');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{technical}','sometimes','a7000000-0000-4000-8000-000000000002','{}')$$,'22023',NULL,'unknown experience is refused');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{technical}','some',gen_random_uuid(),'{}')$$,'40001',NULL,'a stale version is refused');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{technical}','some','a7000000-0000-4000-8000-000000000002','{"a7300000-0000-4000-8000-000000000001":"a7400000-0000-4000-8000-000000000012"}')$$,'22023',NULL,'questions outside the chosen areas are refused');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{technical}','some','a7000000-0000-4000-8000-000000000002','{"a7300000-0000-4000-8000-000000000005":"a7400000-0000-4000-8000-000000000012"}')$$,'22023',NULL,'an option from another question is refused');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{technical}','some','a7000000-0000-4000-8000-000000000002','{"not-a-uuid":null}')$$,'22023',NULL,'malformed question ids are refused');
SELECT throws_ok($$SELECT public.learner_placement_submit('developer','{technical}','some','a7000000-0000-4000-8000-000000000002','[]')$$,'22023',NULL,'answers must be an object');
SELECT is(public.learner_placement_status()->'result','null'::jsonb,'failed submissions record nothing');

-- Skip, then a scored submission: technical 3/4 (one wrong) -> intermediate; functional 4/4 -> advanced.
SELECT public.learner_placement_skip();
SELECT is((public.learner_placement_status()->>'skipped')::boolean,true,'skip is recorded');
SELECT set_config('p.status',public.learner_placement_submit('developer','{technical,functional,technical}','regular','a7000000-0000-4000-8000-000000000002',
 '{"a7300000-0000-4000-8000-000000000005":"a7400000-0000-4000-8000-000000000051",
   "a7300000-0000-4000-8000-000000000006":"a7400000-0000-4000-8000-000000000062",
   "a7300000-0000-4000-8000-000000000007":"a7400000-0000-4000-8000-000000000071",
   "a7300000-0000-4000-8000-000000000008":"a7400000-0000-4000-8000-000000000084",
   "a7300000-0000-4000-8000-000000000001":"a7400000-0000-4000-8000-000000000012",
   "a7300000-0000-4000-8000-000000000002":"a7400000-0000-4000-8000-000000000023",
   "a7300000-0000-4000-8000-000000000003":"a7400000-0000-4000-8000-000000000034",
   "a7300000-0000-4000-8000-000000000004":"a7400000-0000-4000-8000-000000000041"}')::text,true);
SELECT is(current_setting('p.status')::jsonb->'goals'->'interests','["technical","functional"]'::jsonb,'areas are de-duplicated in order');
SELECT is(current_setting('p.status')::jsonb->'result'->>'method','quiz','a scored result is recorded');
SELECT is((SELECT a->>'level' FROM jsonb_array_elements(current_setting('p.status')::jsonb->'result'->'areas') a WHERE a->>'area'='technical'),'intermediate','3 of 4 is intermediate');
SELECT is((SELECT (a->>'correct')::int FROM jsonb_array_elements(current_setting('p.status')::jsonb->'result'->'areas') a WHERE a->>'area'='technical'),3,'technical score is counted on the server');
SELECT is((SELECT a->>'level' FROM jsonb_array_elements(current_setting('p.status')::jsonb->'result'->'areas') a WHERE a->>'area'='functional'),'advanced','4 of 4 is advanced');
SELECT is((public.learner_placement_status()->>'skipped')::boolean,false,'a result clears the skip');

-- Unanswered and "not sure" answers count as incorrect.
SELECT set_config('p.status',public.learner_placement_submit('developer','{technical}','some','a7000000-0000-4000-8000-000000000002',
 '{"a7300000-0000-4000-8000-000000000005":"a7400000-0000-4000-8000-000000000051","a7300000-0000-4000-8000-000000000006":null}')::text,true);
SELECT is((SELECT a->>'level' FROM jsonb_array_elements(current_setting('p.status')::jsonb->'result'->'areas') a WHERE a->>'area'='technical'),'beginner','1 of 4 is beginner');
SELECT is((SELECT (a->>'total')::int FROM jsonb_array_elements(current_setting('p.status')::jsonb->'result'->'areas') a WHERE a->>'area'='technical'),4,'unanswered questions still count toward the total');

-- Goals change without a new result.
SELECT set_config('p.result',public.learner_placement_status()->'result'->>'id',true);
SELECT is(public.learner_placement_update_goals('functional_consultant','{functional}','some')->'goals'->>'role','functional_consultant','goals can be updated');
SELECT is(public.learner_placement_status()->'result'->>'id',current_setting('p.result'),'updating goals keeps the latest result');
SELECT public.learner_placement_skip();
SELECT is((public.learner_placement_status()->>'skipped')::boolean,false,'skip has no effect after a result');

-- Learner two: no Odoo experience skips the questions; cannot see learner one's data.
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000003',true);
SELECT is(public.learner_placement_status()->'result','null'::jsonb,'another learner sees no result');
SELECT is((public.learner_placement_status()->>'enrolled')::boolean,false,'a learner without courses is not enrolled');
SELECT public.learner_grant_free_enrollment(current_setting('p.functional')::uuid);
SELECT is((public.learner_placement_status()->>'enrolled')::boolean,true,'an enrollment is reported so the overview does not redirect');
SELECT set_config('p.status',public.learner_placement_submit('exploring','{functional,technical}','none')::text,true);
SELECT is(current_setting('p.status')::jsonb->'result'->>'method','self_reported','no experience records a self-reported result');
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(current_setting('p.status')::jsonb->'result'->'areas') a WHERE a->>'level'='beginner'),2,'every chosen area starts at beginner');

-- Recommendation events: idempotent per day; unpublished or unknown courses are ignored.
SELECT public.learner_record_recommendation_events('shown',ARRAY[current_setting('p.functional')::uuid,current_setting('p.technical')::uuid,gen_random_uuid()]);
SELECT public.learner_record_recommendation_events('shown',ARRAY[current_setting('p.functional')::uuid]);
SELECT public.learner_record_recommendation_events('clicked',ARRAY[current_setting('p.functional')::uuid]);
SELECT throws_ok($$SELECT public.learner_record_recommendation_events('liked',ARRAY[]::uuid[])$$,'22023',NULL,'unknown event is refused');
SELECT throws_ok($$SELECT * FROM public.course_recommendation_events$$,'42501',NULL,'events table is not exposed');
SELECT throws_ok($$SELECT * FROM public.admin_recommendation_stats()$$,'42501',NULL,'learners cannot read recommendation stats');

-- Admin sees aggregate counts only.
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000001',true);
SELECT is((SELECT learners_shown FROM public.admin_recommendation_stats() WHERE course_id=current_setting('p.functional')::uuid),1::bigint,'shown is counted once per learner');
SELECT is((SELECT learners_clicked FROM public.admin_recommendation_stats() WHERE course_id=current_setting('p.functional')::uuid),1::bigint,'clicks are counted');

-- Rate limit: 10 results per day.
SELECT set_config('request.jwt.claim.sub','e2700000-0000-4000-8000-000000000003',true);
SELECT public.learner_placement_submit('exploring','{functional}','none') FROM generate_series(1,9);
SELECT throws_ok($$SELECT public.learner_placement_submit('exploring','{functional}','none')$$,'54000',NULL,'at most 10 level checks per day');

-- Published content is immutable.
RESET ROLE;
SELECT throws_ok($$UPDATE public.placement_question_translations SET prompt='Changed' WHERE question_id='a7300000-0000-4000-8000-000000000001' AND locale='en'$$,'23514',NULL,'published questions cannot be edited');
SELECT throws_ok($$DELETE FROM learning_private.placement_answer_keys WHERE question_id='a7300000-0000-4000-8000-000000000001'$$,'23514',NULL,'published answer keys cannot be removed');
SELECT throws_ok($$UPDATE public.placement_versions SET status='draft',published_at=NULL WHERE version_number=2$$,'23514',NULL,'a published version cannot be unpublished');

-- Anonymous callers are refused.
SET LOCAL ROLE anon;
SELECT throws_ok($$SELECT public.learner_placement_status()$$,'42501',NULL,'anonymous cannot read placement');

SELECT * FROM finish();
ROLLBACK;
