BEGIN;
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT plan(13);
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e1b00000-0000-4000-8000-000000000001','authenticated','authenticated','acart-admin@example.test','{}',now(),now()),
('e1b00000-0000-4000-8000-000000000002','authenticated','authenticated','acart-owner@example.test','{}',now(),now()),
('e1b00000-0000-4000-8000-000000000003','authenticated','authenticated','acart-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e1b00000-0000-4000-8000-000000000001','admin','e1b00000-0000-4000-8000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e1b00000-0000-4000-8000-000000000001',true);
SELECT public.admin_save_course_content('acart-a','en','Account cart A','Fixture','',30000,'','beginner',true);
SELECT public.admin_save_course_content('acart-b','en','Account cart B','Fixture','',20000,'','beginner',true);
SELECT set_config('request.jwt.claim.sub','e1b00000-0000-4000-8000-000000000002',true);
SELECT is(public.learner_cart_sync(ARRAY['acart-b','acart-a','acart-b','no-such-course'],NULL),ARRAY['acart-b','acart-a'],'adds published courses once, in cart order');
SELECT is(public.learner_cart_sync(ARRAY['acart-a'],NULL),ARRAY['acart-b','acart-a'],'merging a course already in the cart changes nothing');
SELECT is(public.learner_cart_sync(NULL,ARRAY['acart-b']),ARRAY['acart-a'],'removes by slug');
SELECT is((SELECT count(*)::int FROM public.cart_items),1,'owner can read their cart');
SELECT throws_ok($$INSERT INTO public.cart_items(user_id,course_id) SELECT 'e1b00000-0000-4000-8000-000000000002',id FROM public.courses WHERE slug='acart-b'$$,'42501',NULL,'direct writes are denied');
SELECT throws_ok($$SELECT public.learner_cart_sync((SELECT array_agg('c'||g) FROM generate_series(1,21) g),NULL)$$,'22023',NULL,'oversized sync rejected');
SELECT throws_ok($$SELECT public.admin_checkout_funnel(30)$$,'42501',NULL,'learners cannot read the funnel');
SELECT set_config('request.jwt.claim.sub','e1b00000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::int FROM public.cart_items),0,'another account cannot read the cart');
SELECT is(public.learner_cart_sync(NULL,NULL),'{}'::text[],'another account has its own empty cart');
SELECT set_config('request.jwt.claim.sub','e1b00000-0000-4000-8000-000000000001',true);
SELECT is((public.admin_checkout_funnel(30)->>'carted')::int,1,'funnel counts learners who added to cart');
SELECT is((public.admin_checkout_funnel(30)->'abandoned'->0->>'slug'),'acart-a','funnel lists carted courses not bought');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.cart_events WHERE user_id='e1b00000-0000-4000-8000-000000000002' AND event='added'),2,'adds are recorded once per course per day');
SELECT ok(NOT has_function_privilege('anon','public.learner_cart_sync(text[],text[])','EXECUTE'),'guests cannot write account carts');
SELECT * FROM finish();ROLLBACK;
