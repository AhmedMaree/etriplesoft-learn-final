-- Deterministic DEV seed for LOCAL / CI databases only (runs on `supabase start` / `db reset`).
-- It is not applied to hosted DEV or production by any migration.
--
-- Phase 07 catalog seed (decision D12): the six demo courses from the original UI, as clearly marked
-- placeholder data. Prices, levels and the Arabic text are DEV placeholders pending launch content
-- approval and native Arabic review (Phases 09 and 36). No ratings or review counts exist anywhere.
-- Instructor names are display-name attribution only; they grant no permissions.
--
-- One course (odoo-system-admin) is deliberately English-only, with an unpublished Arabic draft,
-- so exact-locale behaviour (no fallback between en and ar) is exercised by real data.
--
-- RLS test users are still created transactionally in supabase/tests/database/.

INSERT INTO auth.users (id, aud, role, email, raw_user_meta_data, banned_until, created_at, updated_at)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'seed-author@etriplesoft.invalid',
  '{"display_name":"ETripleSoft Seed Author"}'::jsonb,
  'infinity',
  '2026-09-01 00:00:00+00',
  '2026-09-01 00:00:00+00'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, slug, status, level, category, price_minor, currency, created_by, updated_by, published_at, created_at, updated_at)
VALUES
  ('c0000000-0000-4000-8000-000000000001', 'crash-course-odoo-erp',  'published', 'beginner',     'functional', 0,     'EGP', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-06 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-06 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'python-fundamentals',    'published', 'beginner',     'technical',  0,     'EGP', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-05 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-05 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'odoo-development',       'published', 'advanced',     'technical',  49900, 'EGP', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-04 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-04 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'odoo-implementation',    'published', 'intermediate', 'functional', 0,     'EGP', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-03 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-03 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000005', 'odoo-user-guide',        'published', 'beginner',     'functional', 0,     'EGP', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-02 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-02 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000006', 'odoo-system-admin',      'published', 'intermediate', 'technical',  0,     'EGP', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '2026-09-01 12:00:00+00', '2026-09-01 00:00:00+00', '2026-09-01 12:00:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.course_translations (course_id, locale, title, summary, publication_status, published_at, created_at, updated_at)
VALUES
  ('c0000000-0000-4000-8000-000000000001', 'en', 'Crash Course Odoo ERP', 'A practical, hands-on introduction to Odoo ERP and how it integrates business functions.', 'published', '2026-09-06 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-06 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'ar', 'دورة مكثفة في Odoo ERP', 'مقدمة عملية وتطبيقية إلى Odoo ERP وكيفية تكامله مع وظائف الأعمال.', 'published', '2026-09-06 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-06 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'en', 'Python Fundamentals', 'Learn Python from scratch and build the skills for Odoo development with real-world examples.', 'published', '2026-09-05 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-05 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'ar', 'أساسيات Python', 'تعلّم Python من الصفر وابنِ المهارات اللازمة لتطوير Odoo بأمثلة واقعية.', 'published', '2026-09-05 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-05 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'en', 'Odoo Development', 'Build custom modules, extend functionalities, and become an Odoo developer.', 'published', '2026-09-04 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-04 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'ar', 'تطوير Odoo', 'ابنِ وحدات مخصصة ووسّع الوظائف وكن مطوّر Odoo.', 'published', '2026-09-04 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-04 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'en', 'Odoo Implementation', 'Learn the complete implementation process from planning to go-live with best practices.', 'published', '2026-09-03 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-03 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'ar', 'تنفيذ Odoo', 'تعلّم عملية التنفيذ الكاملة من التخطيط حتى التشغيل الفعلي وفق أفضل الممارسات.', 'published', '2026-09-03 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-03 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000005', 'en', 'Odoo User Guide', 'A step-by-step guide to using Odoo for everyday business operations across all modules.', 'published', '2026-09-02 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-02 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000005', 'ar', 'دليل مستخدم Odoo', 'دليل خطوة بخطوة لاستخدام Odoo في العمليات التجارية اليومية عبر جميع الوحدات.', 'published', '2026-09-02 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-02 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000006', 'en', 'Odoo System Admin', 'Learn how to install, configure, secure, and maintain your Odoo instance.', 'published', '2026-09-01 12:00:00+00', '2026-09-01 00:00:00+00', '2026-09-01 12:00:00+00'),
  ('c0000000-0000-4000-8000-000000000006', 'ar', 'إدارة نظام Odoo', 'تعلّم كيفية تثبيت نسخة Odoo وإعدادها وتأمينها وصيانتها.', 'draft', NULL, '2026-09-01 00:00:00+00', '2026-09-01 00:00:00+00')
ON CONFLICT (course_id, locale) DO NOTHING;

INSERT INTO public.course_instructors (id, course_id, position, display_name, assigned_by, assigned_at)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 1, 'Khaled Ahmed',  '00000000-0000-4000-8000-000000000001', '2026-09-01 00:00:00+00'),
  ('c1000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 1, 'Emad',          '00000000-0000-4000-8000-000000000001', '2026-09-01 00:00:00+00'),
  ('c1000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 1, 'Ibrahim',       '00000000-0000-4000-8000-000000000001', '2026-09-01 00:00:00+00'),
  ('c1000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 1, 'Maram',         '00000000-0000-4000-8000-000000000001', '2026-09-01 00:00:00+00'),
  ('c1000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 1, 'Ahmed Emad',    '00000000-0000-4000-8000-000000000001', '2026-09-01 00:00:00+00'),
  ('c1000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', 1, 'Mahmoud Elfeky', '00000000-0000-4000-8000-000000000001', '2026-09-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;
