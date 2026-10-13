-- Anonymous course detail requests the same typed enrollment projection as learner detail.
-- The owner-only RLS policy ensures this grant exposes zero enrollment rows to anon.
GRANT SELECT ON TABLE public.enrollments TO anon;
