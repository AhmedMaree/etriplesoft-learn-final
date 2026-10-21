BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT no_plan();
INSERT INTO auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,created_at,updated_at) VALUES
('e2900000-0000-4000-8000-000000000001','authenticated','authenticated','admin@org-test.example',now(),'{}',now(),now()),
('e2900000-0000-4000-8000-000000000002','authenticated','authenticated','manager@org-test.example',now(),'{"display_name":"Org Manager"}',now(),now()),
('e2900000-0000-4000-8000-000000000003','authenticated','authenticated','one@org-test.example',now(),'{"display_name":"Member One"}',now(),now()),
('e2900000-0000-4000-8000-000000000004','authenticated','authenticated','two@org-test.example',now(),'{"display_name":"Member Two"}',now(),now()),
('e2900000-0000-4000-8000-000000000005','authenticated','authenticated','outsider@org-test.example',now(),'{}',now(),now()),
('e2900000-0000-4000-8000-000000000006','authenticated','authenticated','unverified@org-test.example',NULL,'{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e2900000-0000-4000-8000-000000000001','admin','e2900000-0000-4000-8000-000000000001');

CREATE FUNCTION pg_temp.as_user(p_user text) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub',p_user,true) $$;

SELECT ok(NOT has_table_privilege('authenticated','public.organizations','SELECT'),'organizations are not readable directly');
SELECT ok(NOT has_table_privilege('authenticated','public.organization_invitations','SELECT'),'invitations are not readable directly');
SELECT ok(NOT has_table_privilege('authenticated','public.organization_licenses','SELECT'),'licenses are not readable directly');

-- A paid published course.
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000001');
SELECT set_config('o.course',public.admin_create_course('org-test-course',p_price_minor=>50000)::text,true);
SELECT public.admin_upsert_course_translation(current_setting('o.course')::uuid,'en','Org course','Test');
SELECT public.admin_set_translation_publication(current_setting('o.course')::uuid,'en',true);
SELECT public.admin_set_course_status(current_setting('o.course')::uuid,'published');

-- Organizations are created by admins only.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT throws_ok($$SELECT public.admin_create_organization('Acme','company')$$,'42501',NULL,'a learner cannot create an organization');
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000001');
SELECT throws_ok($$SELECT public.admin_create_organization('A','company')$$,'22023',NULL,'names are validated');
SELECT set_config('o.org',public.admin_create_organization('Acme Test Org','company')::text,true);
SELECT is((SELECT access FROM public.org_get(current_setting('o.org')::uuid)),'admin','an admin can view any organization');

-- The admin invites the first manager; the code is shown once and only its hash is stored.
SELECT set_config('o.mcode',(SELECT code FROM public.org_create_invitations(current_setting('o.org')::uuid,ARRAY['  Manager@Org-Test.example '],'manager')),true);
SELECT ok(current_setting('o.mcode') ~ '^[A-Za-z0-9_-]{32}$','an invitation code is issued');
RESET ROLE;
SELECT is((SELECT count(*)::int FROM public.organization_invitations WHERE token_hash=extensions.digest(current_setting('o.mcode'),'sha256') AND email='manager@org-test.example'),1,'the email is normalized and the code hashed');
SELECT is((SELECT count(*)::int FROM public.admin_audit_log WHERE organization_id=current_setting('o.org')::uuid),2,'admin organization writes are audited');
SET LOCAL ROLE authenticated;

-- Outsiders can neither view the organization nor use someone else's invitation.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000005');
SELECT throws_ok($$SELECT * FROM public.org_get(current_setting('o.org')::uuid)$$,'42501',NULL,'an outsider cannot view the organization');
SELECT is((SELECT email_matches FROM public.learner_preview_invitation(current_setting('o.mcode'))),false,'the preview says the invitation is for another email');
SELECT throws_ok($$SELECT public.learner_accept_invitation(NULL,current_setting('o.mcode'))$$,'42501',NULL,'a forwarded code cannot be accepted');
SELECT is((SELECT count(*)::int FROM public.learner_list_invitations()),0,'others do not see the invitation');
SELECT throws_ok($$SELECT public.learner_accept_invitation(NULL,'short')$$,'22023',NULL,'code format is validated');

SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT is((SELECT organization_name FROM public.learner_list_invitations()),'Acme Test Org','the invitee sees the pending invitation');
SELECT is((SELECT email_matches FROM public.learner_preview_invitation(current_setting('o.mcode'))),true,'the preview matches the invitee');
SELECT is(public.learner_accept_invitation(NULL,current_setting('o.mcode')),current_setting('o.org')::uuid,'the invitee accepts by code');
SELECT throws_ok($$SELECT public.learner_accept_invitation(NULL,current_setting('o.mcode'))$$,'P0002',NULL,'a code works once');
SELECT is((SELECT access FROM public.org_get(current_setting('o.org')::uuid)),'manager','the manager can view the organization');

-- The manager invites members; existing members and invalid emails are reported.
CREATE TEMP TABLE invites ON COMMIT DROP AS
 SELECT * FROM public.org_create_invitations(current_setting('o.org')::uuid,ARRAY['one@org-test.example','two@org-test.example','not-an-email','manager@org-test.example','unverified@org-test.example'],'member');
GRANT SELECT ON invites TO authenticated;
SELECT is((SELECT result FROM invites WHERE email='one@org-test.example'),'invited','members are invited');
SELECT is((SELECT result FROM invites WHERE email='not-an-email'),'invalid','invalid emails are reported');
SELECT is((SELECT result FROM invites WHERE email='manager@org-test.example'),'member','existing members are not re-invited');
SELECT is((SELECT count(*)::int FROM public.org_list_invitations(current_setting('o.org')::uuid)),3,'pending invitations are listed');

-- An unverified account cannot accept, even with the right code.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000006');
SELECT throws_ok($$SELECT public.learner_accept_invitation(NULL,(SELECT code FROM invites WHERE email='unverified@org-test.example'))$$,'42501',NULL,'an unverified email cannot accept');

-- Member one accepts from the pending list (no code); member two by code.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000003');
SELECT is(public.learner_accept_invitation((SELECT id FROM public.learner_list_invitations()),NULL),current_setting('o.org')::uuid,'accept from the pending list');
SELECT is((SELECT role FROM public.learner_list_organizations()),'member','membership is listed for the learner');
SELECT throws_ok($$SELECT * FROM public.org_list_members(current_setting('o.org')::uuid)$$,'42501',NULL,'members cannot see the roster');
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000004');
SELECT public.learner_accept_invitation(NULL,(SELECT code FROM invites WHERE email='two@org-test.example'));

-- Seats: none until a license exists; one seat goes to one member at a time and can be reassigned.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT is((SELECT result FROM public.org_assign_course(current_setting('o.org')::uuid,current_setting('o.course')::uuid,ARRAY['e2900000-0000-4000-8000-000000000003'::uuid])),'no_seats','no seats before a license');
SELECT throws_ok($$SELECT public.admin_grant_organization_license(current_setting('o.org')::uuid,current_setting('o.course')::uuid,1,12)$$,'42501',NULL,'managers cannot grant licenses');
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000001');
SELECT throws_ok($$SELECT public.admin_grant_organization_license(current_setting('o.org')::uuid,current_setting('o.course')::uuid,0,12)$$,'22023',NULL,'seat counts are validated');
SELECT set_config('o.license',public.admin_grant_organization_license(current_setting('o.org')::uuid,current_setting('o.course')::uuid,1,6,'Pilot')::text,true);
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT is((SELECT result FROM public.org_assign_course(current_setting('o.org')::uuid,current_setting('o.course')::uuid,ARRAY['e2900000-0000-4000-8000-000000000003'::uuid])),'assigned','a seat is assigned');
SELECT is((SELECT result FROM public.org_assign_course(current_setting('o.org')::uuid,current_setting('o.course')::uuid,ARRAY['e2900000-0000-4000-8000-000000000005'::uuid])),'not_member','only members get seats');
SELECT is((SELECT result FROM public.org_assign_course(current_setting('o.org')::uuid,current_setting('o.course')::uuid,ARRAY['e2900000-0000-4000-8000-000000000004'::uuid])),'no_seats','seats are limited');
RESET ROLE;
SELECT is((SELECT grant_source||':'||(expires_at=(SELECT ends_at FROM public.organization_licenses WHERE id=current_setting('o.license')::uuid))::text FROM public.enrollments
 WHERE user_id='e2900000-0000-4000-8000-000000000003' AND course_id=current_setting('o.course')::uuid),'organization:true','the enrollment is sponsored and ends with the license');
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT lives_ok($$SELECT public.org_release_seat(current_setting('o.org')::uuid,current_setting('o.course')::uuid,'e2900000-0000-4000-8000-000000000003')$$,'a seat is released');
SELECT is((SELECT result FROM public.org_assign_course(current_setting('o.org')::uuid,current_setting('o.course')::uuid,ARRAY['e2900000-0000-4000-8000-000000000004'::uuid])),'assigned','a released seat is reassigned');
SELECT is((SELECT result FROM public.org_assign_course(current_setting('o.org')::uuid,current_setting('o.course')::uuid,ARRAY['e2900000-0000-4000-8000-000000000004'::uuid])),'already','an assigned member is reported');
RESET ROLE;
SELECT is((SELECT status FROM public.enrollments WHERE user_id='e2900000-0000-4000-8000-000000000003' AND course_id=current_setting('o.course')::uuid),'revoked','releasing revokes access');
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT is((SELECT seats_used FROM public.org_list_licenses(current_setting('o.org')::uuid,'en')),1::bigint,'seat usage is counted');
SELECT is((SELECT assigned FROM public.org_list_members(current_setting('o.org')::uuid) WHERE user_id='e2900000-0000-4000-8000-000000000004'),1::bigint,'the roster shows assigned courses');
SELECT is((SELECT count(*)::int FROM public.org_list_member_courses(current_setting('o.org')::uuid,'e2900000-0000-4000-8000-000000000003','en')),1,'released courses stay on the member record');
SELECT throws_ok($$SELECT * FROM public.org_list_member_courses(current_setting('o.org')::uuid,'e2900000-0000-4000-8000-000000000005','en')$$,'P0002',NULL,'non-members have no record');

-- Seat purchase through the regular checkout: priced on the server, settled into a license.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000003');
SELECT throws_ok($$SELECT public.org_create_seat_order(current_setting('o.org')::uuid,ARRAY[current_setting('o.course')::uuid],ARRAY[5],'en')$$,'42501',NULL,'members cannot buy seats');
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT throws_ok($$SELECT public.org_create_seat_order(current_setting('o.org')::uuid,ARRAY[current_setting('o.course')::uuid],ARRAY[0],'en')$$,'22023',NULL,'seat counts are validated');
SELECT set_config('o.order',public.org_create_seat_order(current_setting('o.org')::uuid,ARRAY[current_setting('o.course')::uuid],ARRAY[5],'en')::text,true);
RESET ROLE;
SELECT is((SELECT total_minor FROM public.orders WHERE id=current_setting('o.order')::uuid),250000::bigint,'the price is seats times the course price');
SELECT is((SELECT title FROM public.order_items WHERE order_id=current_setting('o.order')::uuid),'Org course × 5 seats','the item title carries the seats');
SELECT is((SELECT organization_id FROM public.orders WHERE id=current_setting('o.order')::uuid),current_setting('o.org')::uuid,'the order is tagged with the organization');
SET LOCAL ROLE service_role;
SELECT public.commerce_bind_session(current_setting('o.order')::uuid,'aaaaaaaaaaaaaaaaaaaaaaaa','https://payments.kashier.io/session/aaaaaaaaaaaaaaaaaaaaaaaa?mode=test',250000);
SELECT public.commerce_confirm_order(current_setting('o.order')::uuid,'aaaaaaaaaaaaaaaaaaaaaaaa','prov-org-1',250000,'EGP','paid','prov-org-1:paid');
SELECT public.commerce_confirm_order(current_setting('o.order')::uuid,'aaaaaaaaaaaaaaaaaaaaaaaa','prov-org-1',250000,'EGP','paid','prov-org-1:paid');
RESET ROLE;
SELECT is((SELECT seats FROM public.organization_licenses WHERE order_item_id=(SELECT id FROM public.order_items WHERE order_id=current_setting('o.order')::uuid)),5,'settlement creates the license once');
SELECT ok((SELECT ends_at BETWEEN now()+interval '12 months'-interval '1 minute' AND now()+interval '12 months'+interval '1 minute' FROM public.organization_licenses WHERE source='purchase' AND organization_id=current_setting('o.org')::uuid),'purchased licenses run 12 months');
SELECT is((SELECT count(*)::int FROM public.enrollments WHERE user_id='e2900000-0000-4000-8000-000000000002' AND course_id=current_setting('o.course')::uuid),0,'the paying manager is not enrolled personally');
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT is((SELECT seats_total FROM public.org_get(current_setting('o.org')::uuid)),6::bigint,'purchased seats add up');
SELECT is((SELECT result FROM public.org_assign_course(current_setting('o.org')::uuid,current_setting('o.course')::uuid,ARRAY['e2900000-0000-4000-8000-000000000003'::uuid])),'assigned','purchased seats can be assigned');
RESET ROLE;
SELECT is((SELECT l.source FROM public.enrollments e JOIN public.organization_licenses l ON l.id=e.organization_license_id
 WHERE e.user_id='e2900000-0000-4000-8000-000000000003' AND e.status='active'),'purchase','the longest-running license is used first');

-- A confirmed refund ends the purchased license and revokes its active seats.
SET LOCAL ROLE service_role;
SELECT public.commerce_confirm_order(current_setting('o.order')::uuid,'aaaaaaaaaaaaaaaaaaaaaaaa','prov-org-1',250000,'EGP','refunded','prov-org-1:refunded');
RESET ROLE;
SELECT is((SELECT status FROM public.organization_licenses WHERE source='purchase' AND organization_id=current_setting('o.org')::uuid),'refunded','the license is refunded');
SELECT is((SELECT count(*)::int FROM public.enrollments WHERE user_id='e2900000-0000-4000-8000-000000000003' AND course_id=current_setting('o.course')::uuid AND status='active'),0,'its seats are revoked');
SELECT is((SELECT status FROM public.enrollments WHERE user_id='e2900000-0000-4000-8000-000000000004' AND course_id=current_setting('o.course')::uuid),'active','seats on other licenses are untouched');

-- Analytics see sponsored learners and B2B revenue.
SET LOCAL ROLE authenticated;
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000001');
SELECT is((SELECT segment FROM public.admin_analytics_learners('two@org-test',NULL,25,0)),'organization','sponsored learners have their own segment');
SELECT is((SELECT count(*)::int FROM public.admin_analytics_learners('org-test.example','organization',25,0)),2,'the organization segment filter applies');
SELECT ok((public.admin_analytics_overview(30)->'revenue'->>'organizationNet') IS NOT NULL,'overview reports B2B revenue');
SELECT is((SELECT members FROM public.admin_list_organizations() WHERE id=current_setting('o.org')::uuid),3::bigint,'the B2B list counts members');
SELECT is((SELECT seats_total FROM public.admin_list_organizations() WHERE id=current_setting('o.org')::uuid),1::bigint,'the B2B list counts current seats');

-- Membership changes: the last manager stays; removing a member releases their seats.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT throws_ok($$SELECT public.org_remove_member(current_setting('o.org')::uuid,'e2900000-0000-4000-8000-000000000002')$$,'23514',NULL,'the last manager cannot be removed');
SELECT lives_ok($$SELECT public.org_remove_member(current_setting('o.org')::uuid,'e2900000-0000-4000-8000-000000000004')$$,'a member is removed');
RESET ROLE;
SELECT is((SELECT status FROM public.enrollments WHERE user_id='e2900000-0000-4000-8000-000000000004' AND course_id=current_setting('o.course')::uuid),'revoked','removal releases seats');
SET LOCAL ROLE authenticated;

-- Suspension stops managers; admins keep access.
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000001');
SELECT public.admin_set_organization_status(current_setting('o.org')::uuid,'suspended');
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000002');
SELECT throws_ok($$SELECT * FROM public.org_get(current_setting('o.org')::uuid)$$,'42501',NULL,'a suspended organization cannot be managed');
SELECT pg_temp.as_user('e2900000-0000-4000-8000-000000000001');
SELECT is((SELECT status FROM public.org_get(current_setting('o.org')::uuid)),'suspended','admins still see a suspended organization');
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal1"}', true);
SELECT throws_ok($$SELECT * FROM public.org_get(current_setting('o.org')::uuid)$$,'42501',NULL,'an admin without MFA has no organization access');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
