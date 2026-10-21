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
  ('c0000000-0000-4000-8000-000000000001', 'en', 'Crash Course Odoo ERP', 'Your first look at Odoo ERP: see how a business runs end to end, from CRM and sales to purchasing, inventory and accounting, then follow a complete business case in Odoo.', 'published', '2026-09-06 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-06 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000001', 'ar', 'دورة مكثفة في Odoo ERP', 'مدخلك الأول إلى Odoo ERP: تعرّف على سير عمل الشركة من البداية إلى النهاية، من إدارة علاقات العملاء والمبيعات إلى المشتريات والمخزون والمحاسبة، ثم تابع دراسة حالة كاملة في Odoo.', 'published', '2026-09-06 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-06 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'en', 'Python Fundamentals', 'Learn Python from zero: variables, operators, conditions, loops, lists, tuples, dictionaries, functions and an introduction to object-oriented programming, then practise with three small projects. The foundation for Odoo development.', 'published', '2026-09-05 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-05 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000002', 'ar', 'أساسيات Python', 'تعلّم Python من الصفر: المتغيرات والعوامل والشروط والحلقات والقوائم والصفوف والقواميس والدوال ومقدمة في البرمجة كائنية التوجه، ثم تدرّب بثلاثة مشاريع صغيرة. الأساس الذي تحتاجه لتطوير Odoo.', 'published', '2026-09-05 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-05 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'en', 'Odoo Development', 'Build your first Odoo modules. Set up a development environment, scaffold an addon, write the manifest, add models and fields, and create menus and form, list, kanban and search views, then plan a service-billing addon in a business case.', 'published', '2026-09-04 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-04 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000003', 'ar', 'تطوير Odoo', 'ابنِ أولى وحداتك في Odoo: أعِدّ بيئة التطوير، وأنشئ هيكل إضافة، واكتب ملف التعريف، وأضف النماذج والحقول، وأنشئ القوائم وطرق عرض النموذج والقائمة وكانبان والبحث، ثم خطّط إضافة لفوترة الخدمات في دراسة حالة.', 'published', '2026-09-04 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-04 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'en', 'Odoo Implementation', 'Configure Odoo for a real business, app by app. Set up Accounting, CRM and Sales, Purchase, Inventory, Human Resources and Manufacturing, from the core flows to advanced options such as routes, landed costs, approvals, payroll and MRP planning.', 'published', '2026-09-03 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-03 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000004', 'ar', 'تنفيذ Odoo', 'أعِدّ Odoo لشركة حقيقية تطبيقًا تلو الآخر: المحاسبة، وإدارة علاقات العملاء والمبيعات، والمشتريات، والمخزون، والموارد البشرية، والتصنيع، من المسارات الأساسية إلى الخيارات المتقدمة مثل المسارات والتكاليف الإضافية والاعتمادات والرواتب وتخطيط الإنتاج.', 'published', '2026-09-03 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-03 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000005', 'en', 'Odoo User Guide', 'Use Odoo with confidence in your daily work. Learn the everyday tasks in Accounting, CRM, Sales and Purchase through short, practical lessons and a downloadable user guide.', 'published', '2026-09-02 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-02 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000005', 'ar', 'دليل مستخدم Odoo', 'استخدم Odoo بثقة في عملك اليومي. تعلّم المهام اليومية في المحاسبة وإدارة علاقات العملاء والمبيعات والمشتريات من خلال دروس عملية قصيرة ودليل مستخدم قابل للتنزيل.', 'published', '2026-09-02 00:00:00+00', '2026-09-01 00:00:00+00', '2026-09-02 00:00:00+00'),
  ('c0000000-0000-4000-8000-000000000006', 'en', 'Odoo System Admin', 'Run Odoo safely for your whole company. Manage users, access rights and security groups, set up companies and languages, customize screens with Odoo Studio, and protect your data with backups.', 'published', '2026-09-01 12:00:00+00', '2026-09-01 00:00:00+00', '2026-09-01 12:00:00+00'),
  ('c0000000-0000-4000-8000-000000000006', 'ar', 'إدارة نظام Odoo', 'أدِر Odoo بأمان لشركتك كلها. أدِر المستخدمين وحقوق الوصول ومجموعات الأمان، وأعِدّ الشركات واللغات، وخصّص الشاشات باستخدام Odoo Studio، واحمِ بياناتك بالنسخ الاحتياطي.', 'draft', NULL, '2026-09-01 00:00:00+00', '2026-09-01 00:00:00+00')
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
