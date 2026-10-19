-- Phase 06: admin authorization, grant/revoke lifecycle and append-only audit.
-- Runs in a rolled-back transaction under `npm run db:test` (disposable local/CI Supabase).
BEGIN;
-- Test sessions are MFA-verified (aal2) unless a test clears this; admin authority requires it.
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);

SELECT plan(31);

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'learner-a@example.test',
   '{"role":"admin","permissions":{"admin":true}}'::jsonb, pg_catalog.now(), pg_catalog.now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'admin-b@example.test', '{}'::jsonb, pg_catalog.now(), pg_catalog.now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'learner-c@example.test', '{}'::jsonb, pg_catalog.now(), pg_catalog.now());

-- Bootstrap admin B (what scripts/bootstrap-admin.mjs does through service_role).
INSERT INTO public.user_roles (user_id, role, granted_by) VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
SELECT throws_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'instructor')$$,
  '42501',
  NULL,
  'a learner (even with admin metadata) cannot grant roles'
);
SELECT throws_ok(
  $$SELECT public.admin_revoke_role(gen_random_uuid())$$,
  '42501',
  NULL,
  'a learner cannot revoke roles'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_find_user_by_email('admin-b@example.test')$$,
  '42501',
  NULL,
  'a learner cannot look up users'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_role_grants()$$,
  '42501',
  NULL,
  'a learner cannot list role grants'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_audit()$$,
  '42501',
  NULL,
  'a learner cannot read the audit log'
);
RESET ROLE;

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'instructor')$$,
  '42501',
  NULL,
  'anonymous users cannot execute admin RPCs'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SELECT pg_catalog.set_config('request.jwt.claim', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","aal":"aal1"}', true);
SELECT throws_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'instructor')$$,
  '42501',
  NULL,
  'an admin with a password-only (aal1) session cannot execute admin RPCs'
);
SELECT pg_catalog.set_config('request.jwt.claim', '', true);
SELECT throws_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'instructor')$$,
  '42501',
  NULL,
  'an admin session without an aal claim cannot execute admin RPCs'
);
-- The development switch: with mfa_required off, a password-only admin session is accepted.
RESET ROLE;
UPDATE learning_private.admin_security SET mfa_required = false;
SET LOCAL ROLE authenticated;
SELECT lives_ok(
  $$SELECT public.admin_list_role_grants(1, 0)$$,
  'with the MFA requirement switched off, a password-only admin session is accepted'
);
RESET ROLE;
UPDATE learning_private.admin_security SET mfa_required = true;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim', '{"aal":"aal2"}', true);
SELECT lives_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'instructor')$$,
  'an active admin with an MFA-verified (aal2) session can grant instructor'
);
SELECT throws_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'instructor')$$,
  '23505',
  NULL,
  'a duplicate active grant is rejected'
);
SELECT throws_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'organization_manager')$$,
  '22023',
  NULL,
  'an unsupported role is rejected'
);
SELECT throws_ok(
  $$SELECT public.admin_grant_role(gen_random_uuid(), 'instructor')$$,
  'P0002',
  NULL,
  'granting to an unknown user is rejected'
);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_find_user_by_email('  Learner-C@Example.test ')),
  1,
  'email lookup is trimmed and case-insensitive'
);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_find_user_by_email('nobody@example.test')),
  0,
  'lookup of an unknown email returns nothing'
);
SELECT throws_ok(
  $$SELECT public.admin_revoke_role((SELECT id FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND role = 'admin'))$$,
  '23514',
  NULL,
  'the last active administrator cannot be revoked'
);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_list_role_grants(1, 0)),
  1,
  'role grant listing honours the page size'
);
SELECT lives_ok(
  $$SELECT public.admin_grant_role('cccccccc-cccc-cccc-cccc-cccccccccccc', 'admin')$$,
  'an admin can grant a second administrator'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.admin_audit_log WHERE action = 'user_role.granted' AND actor_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND accessed_user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  2,
  'both grants are audited with the acting admin'
);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_audit_log WHERE action = 'user.looked_up' AND target_type = 'user' AND user_role_id IS NULL AND actor_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND accessed_user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  1,
  'the successful lookup is audited as a typed user target'
);

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT public.admin_revoke_role((SELECT id FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND role = 'admin' AND revoked_at IS NULL))$$,
  'an admin can revoke their own grant while another admin remains'
);
SELECT throws_ok(
  $$SELECT * FROM public.admin_list_audit()$$,
  '42501',
  NULL,
  'a revoked admin immediately loses read access'
);
SELECT throws_ok(
  $$SELECT public.admin_grant_role('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'instructor')$$,
  '42501',
  NULL,
  'a revoked admin immediately loses grant access'
);
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.user_roles WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND role = 'admin' AND revoked_by = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AND revoked_at IS NOT NULL),
  1,
  'revocation preserves the grant row as history'
);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_audit_log WHERE action = 'user_role.revoked' AND actor_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'the revocation is audited'
);
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
SELECT pg_catalog.set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);
SELECT lives_ok(
  $$SELECT * FROM public.admin_list_audit()$$,
  'a newly granted admin can read the audit log'
);
RESET ROLE;

SELECT throws_ok(
  $$UPDATE public.admin_audit_log SET safe_summary = 'tampered'$$,
  '42501',
  NULL,
  'audit rows cannot be updated, even by the table owner'
);
SELECT throws_ok(
  $$DELETE FROM public.admin_audit_log$$,
  '42501',
  NULL,
  'audit rows cannot be deleted, even by the table owner'
);
SELECT throws_ok(
  $$TRUNCATE public.admin_audit_log$$,
  '42501',
  NULL,
  'the audit table cannot be truncated, even by the table owner'
);
SET LOCAL ROLE authenticated;
SELECT throws_ok(
  $$DELETE FROM public.admin_audit_log$$,
  '42501',
  NULL,
  'application clients cannot delete audit rows'
);
SELECT throws_ok(
  $$INSERT INTO public.admin_audit_log (actor_id, action, target_type, accessed_user_id, safe_summary) VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user.looked_up', 'user', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forged')$$,
  '42501',
  NULL,
  'application clients cannot forge audit rows'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
