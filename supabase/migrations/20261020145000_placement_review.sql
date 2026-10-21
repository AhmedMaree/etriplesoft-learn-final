-- Level check follow-ups after review (user request 2026-10-20).
--
-- 1. Skill check v2: v1 said confirming a quotation creates a delivery "for storable products". Odoo
--    creates deliveries for physical goods in general (consumables too; Odoo 18 has no "storable"
--    type), so v2 corrects that answer. Everything else is copied unchanged. v1 stays as history.
--    v2 is still DRAFT content pending instructor and native Arabic review
--    (docs/PLACEMENT-QUESTIONS-REVIEW.md).
-- 2. placement_status reports 'enrolled' (an active or completed enrollment) so the overview only
--    redirects learners who have not started a course yet; enrolled learners get the overview prompt.

-- ---------------------------------------------------------------------------------------------
-- 1. Skill check v2 (copy of v1 with new ids: a73.../a74... for questions/options)
-- ---------------------------------------------------------------------------------------------
INSERT INTO public.placement_versions(id, version_number, status)
VALUES ('a7000000-0000-4000-8000-000000000002', 2, 'draft');

INSERT INTO public.placement_questions(id, version_id, area, position)
SELECT overlay(q.id::text PLACING 'a73' FROM 1 FOR 3)::uuid, 'a7000000-0000-4000-8000-000000000002', q.area, q.position
FROM public.placement_questions q WHERE q.version_id = 'a7000000-0000-4000-8000-000000000001';

INSERT INTO public.placement_question_translations(question_id, locale, prompt)
SELECT overlay(t.question_id::text PLACING 'a73' FROM 1 FOR 3)::uuid, t.locale, t.prompt
FROM public.placement_question_translations t JOIN public.placement_questions q ON q.id = t.question_id
WHERE q.version_id = 'a7000000-0000-4000-8000-000000000001';

INSERT INTO public.placement_options(id, question_id, position)
SELECT overlay(o.id::text PLACING 'a74' FROM 1 FOR 3)::uuid, overlay(o.question_id::text PLACING 'a73' FROM 1 FOR 3)::uuid, o.position
FROM public.placement_options o JOIN public.placement_questions q ON q.id = o.question_id
WHERE q.version_id = 'a7000000-0000-4000-8000-000000000001';

INSERT INTO public.placement_option_translations(option_id, locale, label)
SELECT overlay(t.option_id::text PLACING 'a74' FROM 1 FOR 3)::uuid, t.locale,
 CASE
  WHEN t.option_id = 'a7200000-0000-4000-8000-000000000023' AND t.locale = 'en'
   THEN 'It becomes a sales order, and a delivery order is created for its physical products'
  WHEN t.option_id = 'a7200000-0000-4000-8000-000000000023' AND t.locale = 'ar'
   THEN 'يتحول إلى أمر بيع، ويُنشأ أمر تسليم لمنتجاته المادية'
  ELSE t.label END
FROM public.placement_option_translations t
JOIN public.placement_options o ON o.id = t.option_id
JOIN public.placement_questions q ON q.id = o.question_id
WHERE q.version_id = 'a7000000-0000-4000-8000-000000000001';

INSERT INTO learning_private.placement_answer_keys(question_id, option_id)
SELECT overlay(k.question_id::text PLACING 'a73' FROM 1 FOR 3)::uuid, overlay(k.option_id::text PLACING 'a74' FROM 1 FOR 3)::uuid
FROM learning_private.placement_answer_keys k JOIN public.placement_questions q ON q.id = k.question_id
WHERE q.version_id = 'a7000000-0000-4000-8000-000000000001';

-- Publishing makes v2 the current check (highest published version) and locks it.
UPDATE public.placement_versions SET status = 'published', published_at = now()
WHERE id = 'a7000000-0000-4000-8000-000000000002';

-- ---------------------------------------------------------------------------------------------
-- 2. 'enrolled' in the status projection. Unchanged from 20261020120000 except the new key.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION learning_private.placement_status(p_user uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object(
  'learnerType', (SELECT lp.learner_type FROM public.learner_profiles lp WHERE lp.user_id = p_user),
  'skipped', EXISTS (SELECT 1 FROM public.learner_placement_skips s WHERE s.user_id = p_user),
  'enrolled', EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = p_user AND e.status IN ('active','completed')),
  'areas', to_jsonb(learning_private.placement_areas()),
  'goals', (SELECT jsonb_build_object('role', g.role, 'interests', to_jsonb(g.interest_areas), 'experience', g.experience, 'updatedAt', g.updated_at)
            FROM public.learner_placement_goals g WHERE g.user_id = p_user),
  'result', (SELECT jsonb_build_object('id', r.id, 'method', r.method, 'createdAt', r.created_at,
              'areas', coalesce((SELECT jsonb_agg(jsonb_build_object('area', ra.area, 'correct', ra.correct, 'total', ra.total, 'level', ra.level) ORDER BY ra.area)
                                 FROM public.placement_result_areas ra WHERE ra.result_id = r.id), '[]'::jsonb))
             FROM public.placement_results r WHERE r.user_id = p_user ORDER BY r.created_at DESC, r.id DESC LIMIT 1),
  -- Highest level of a completed course per area; the overview uses it to show progress since the check.
  'completed', coalesce((SELECT jsonb_agg(jsonb_build_object('area', x.category, 'level', x.level) ORDER BY x.category) FROM (
     SELECT c.category, (array_agg(c.level ORDER BY CASE c.level WHEN 'advanced' THEN 3 WHEN 'intermediate' THEN 2 ELSE 1 END DESC))[1] AS level
     FROM public.course_completions cc
     JOIN public.enrollments e ON e.id = cc.enrollment_id
     JOIN public.courses c ON c.id = e.course_id
     WHERE e.user_id = p_user AND c.category IS NOT NULL AND c.level IS NOT NULL
     GROUP BY c.category) x), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION learning_private.placement_status(uuid) FROM PUBLIC, anon, authenticated, service_role;
