BEGIN;

SELECT plan(39);

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'learner-a@example.test',
    '{"role":"admin","display_name":"  New Learner  "}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'learner-b@example.test',
    '{}'::jsonb,
    pg_catalog.now(),
    pg_catalog.now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'learner-c@example.test',
    pg_catalog.jsonb_build_object(
      'role', 'admin',
      'permissions', pg_catalog.jsonb_build_object('admin', true),
      'display_name', pg_catalog.repeat('X', 121)
    ),
    pg_catalog.now(),
    pg_catalog.now()
  );

INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'admin',
  '11111111-1111-1111-1111-111111111111'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.profiles'::regclass),
  'profiles has row level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.learner_preferences'::regclass),
  'learner_preferences has row level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.user_roles'::regclass),
  'user_roles has row level security enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'public.admin_audit_log'::regclass),
  'admin_audit_log has row level security enabled'
);

SELECT is(
  (SELECT count(*)::integer FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  1,
  'new Auth users receive a profile'
);
SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  'New Learner',
  'signup display name is trimmed and initialized from the expected metadata field'
);
SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
  NULL,
  'missing display-name metadata is safely handled'
);
SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '33333333-3333-3333-3333-333333333333'),
  NULL,
  'an overlong signup display name is safely ignored'
);
SELECT is(
  (SELECT preferred_locale FROM public.learner_preferences WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  'en',
  'new Auth users receive default English preferences'
);
SELECT is(
  (SELECT count(*)::integer FROM public.user_roles WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'signup metadata cannot grant elevated roles'
);
SELECT is(
  (SELECT count(*)::integer FROM public.learner_preferences WHERE user_id = '33333333-3333-3333-3333-333333333333'),
  1,
  'invalid signup metadata still initializes default learner preferences'
);
SELECT is(
  (SELECT count(*)::integer FROM public.user_roles WHERE user_id = '33333333-3333-3333-3333-333333333333'),
  0,
  'role and permission metadata never grants elevated authorization'
);
SELECT is(
  (SELECT count(*)::integer FROM public.admin_audit_log WHERE user_role_id IN (
    SELECT id FROM public.user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222'
  )),
  1,
  'elevated role grants are written to the audit log'
);
SELECT ok(
  EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars' AND public = false),
  'the avatars bucket is private'
);
SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'avatars'),
  5242880::bigint,
  'the avatars bucket enforces the 5 MB limit'
);
SELECT ok(
  (SELECT allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[] FROM storage.buckets WHERE id = 'avatars'),
  'the avatars bucket allows only JPEG, PNG, and WebP'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid = 'storage.objects'::regclass),
  'storage objects keep row level security enabled'
);
SELECT is(
  (SELECT count(*)::integer FROM pg_catalog.pg_policy WHERE polrelid = 'storage.objects'::regclass AND polname LIKE 'avatars_%_own'),
  4,
  'avatar Storage policies cover owner-scoped select, insert, update, and delete'
);

SET LOCAL ROLE anon;
SELECT throws_ok(
  $$SELECT id FROM public.profiles$$,
  '42501',
  'permission denied for table profiles',
  'anonymous users cannot read profiles'
);
SELECT throws_ok(
  $$SELECT user_id FROM public.learner_preferences$$,
  '42501',
  'permission denied for table learner_preferences',
  'anonymous users cannot read learner preferences'
);
SELECT throws_ok(
  $$SELECT id FROM public.user_roles$$,
  '42501',
  'permission denied for table user_roles',
  'anonymous users cannot read role assignments'
);
SELECT throws_ok(
  $$SELECT id FROM public.admin_audit_log$$,
  '42501',
  'permission denied for table admin_audit_log',
  'anonymous users cannot read audit records'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '11111111-1111-1111-1111-111111111111',
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  1,
  'a learner can read their own profile'
);
SELECT is(
  (SELECT count(*)::integer FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
  0,
  'a learner cannot read another profile'
);
SELECT lives_ok(
  $$UPDATE public.profiles SET display_name = 'Updated Learner A' WHERE id = '11111111-1111-1111-1111-111111111111'$$,
  'a learner can update their own display name'
);
SELECT is(
  (SELECT display_name FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  'Updated Learner A',
  'the permitted profile update is persisted'
);
SELECT is(
  (
    WITH changed AS (
      UPDATE public.profiles
      SET display_name = 'Cross-user edit'
      WHERE id = '22222222-2222-2222-2222-222222222222'
      RETURNING id
    )
    SELECT count(*)::integer FROM changed
  ),
  0,
  'a learner cannot update another profile'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ),
  'profiles has no client-editable role column'
);
SELECT is(
  (SELECT count(*)::integer FROM public.learner_preferences WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  1,
  'a learner can read their own preferences'
);
SELECT is(
  (SELECT count(*)::integer FROM public.learner_preferences WHERE user_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'a learner cannot read another user preferences'
);
SELECT lives_ok(
  $$UPDATE public.learner_preferences SET preferred_locale = 'ar', timezone = 'Africa/Cairo' WHERE user_id = '11111111-1111-1111-1111-111111111111'$$,
  'a learner can update their own preferences'
);
SELECT is(
  (SELECT preferred_locale FROM public.learner_preferences WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  'ar',
  'the permitted preference update is persisted'
);
SELECT is(
  (
    WITH changed AS (
      UPDATE public.learner_preferences
      SET preferred_locale = 'ar'
      WHERE user_id = '22222222-2222-2222-2222-222222222222'
      RETURNING user_id
    )
    SELECT count(*)::integer FROM changed
  ),
  0,
  'a learner cannot update another users preferences'
);
SELECT is(
  (SELECT count(*)::integer FROM public.user_roles WHERE user_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'learners can read only their own role grants'
);
SELECT throws_ok(
  $$INSERT INTO public.user_roles (user_id, role, granted_by) VALUES ('11111111-1111-1111-1111-111111111111', 'admin', '11111111-1111-1111-1111-111111111111')$$,
  '42501',
  'permission denied for table user_roles',
  'learners cannot assign elevated roles'
);
SELECT throws_ok(
  $$UPDATE public.user_roles SET revoked_by = '11111111-1111-1111-1111-111111111111', revoked_at = pg_catalog.now() WHERE user_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501',
  'permission denied for table user_roles',
  'learners cannot revoke role grants'
);
SELECT throws_ok(
  $$DELETE FROM public.user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501',
  'permission denied for table user_roles',
  'learners cannot delete role history'
);
SELECT throws_ok(
  $$SELECT id FROM public.admin_audit_log$$,
  '42501',
  'permission denied for table admin_audit_log',
  'learners cannot read privileged audit records'
);
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config(
  'request.jwt.claim.sub',
  '22222222-2222-2222-2222-222222222222',
  true
);
SELECT pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);
SELECT is(
  (SELECT count(*)::integer FROM public.user_roles WHERE user_id = '22222222-2222-2222-2222-222222222222' AND role = 'admin'),
  1,
  'a user can read their own elevated-role grant'
);
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
