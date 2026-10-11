-- Keep learner classification and onboarding details separate from core identity
-- and elevated application roles.

CREATE TABLE public.learner_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  learner_type text NOT NULL,
  birth_year smallint,
  university text,
  faculty text,
  graduation_year smallint,
  job_title text,
  company_name text,
  years_experience smallint,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT learner_profiles_type_check CHECK (
    learner_type IN ('student', 'professional', 'company_invited')
  ),
  CONSTRAINT learner_profiles_years_check CHECK (
    (birth_year IS NULL OR birth_year BETWEEN 1900 AND 2100)
    AND (graduation_year IS NULL OR graduation_year BETWEEN 1900 AND 2100)
  ),
  CONSTRAINT learner_profiles_experience_check CHECK (
    years_experience IS NULL OR years_experience BETWEEN 0 AND 60
  ),
  CONSTRAINT learner_profiles_text_lengths_check CHECK (
    (university IS NULL OR (university = pg_catalog.btrim(university) AND pg_catalog.char_length(university) BETWEEN 1 AND 120))
    AND (faculty IS NULL OR (faculty = pg_catalog.btrim(faculty) AND pg_catalog.char_length(faculty) BETWEEN 1 AND 120))
    AND (job_title IS NULL OR (job_title = pg_catalog.btrim(job_title) AND pg_catalog.char_length(job_title) BETWEEN 1 AND 120))
    AND (company_name IS NULL OR (company_name = pg_catalog.btrim(company_name) AND pg_catalog.char_length(company_name) BETWEEN 1 AND 120))
  ),
  CONSTRAINT learner_profiles_type_fields_check CHECK (
    (
      learner_type = 'student'
      AND university IS NOT NULL
      AND faculty IS NOT NULL
      AND job_title IS NULL
      AND company_name IS NULL
      AND years_experience IS NULL
    )
    OR (
      learner_type = 'professional'
      AND birth_year IS NULL
      AND university IS NULL
      AND faculty IS NULL
      AND graduation_year IS NULL
    )
    OR (
      learner_type = 'company_invited'
      AND birth_year IS NULL
      AND university IS NULL
      AND faculty IS NULL
      AND graduation_year IS NULL
      AND job_title IS NULL
      AND company_name IS NULL
      AND years_experience IS NULL
    )
  )
);

CREATE TRIGGER learner_profiles_set_updated_at
  BEFORE UPDATE ON public.learner_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY learner_profiles_select_own
  ON public.learner_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY learner_profiles_update_own
  ON public.learner_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.learner_profiles FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.learner_profiles TO authenticated;
GRANT UPDATE (
  learner_type,
  birth_year,
  university,
  faculty,
  graduation_year,
  job_title,
  company_name,
  years_experience
) ON TABLE public.learner_profiles TO authenticated;
GRANT ALL ON TABLE public.learner_profiles TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  candidate_display_name text;
  learner_payload jsonb;
  selected_type text;
  candidate_birth_year smallint;
  candidate_graduation_year smallint;
  candidate_years_experience smallint;
  candidate_university text;
  candidate_faculty text;
  candidate_job_title text;
  candidate_company_name text;
  raw_value text;
BEGIN
  candidate_display_name := NULLIF(
    pg_catalog.btrim(NEW.raw_user_meta_data ->> 'display_name'),
    ''
  );

  IF candidate_display_name IS NOT NULL
    AND pg_catalog.char_length(candidate_display_name) > 120 THEN
    candidate_display_name := NULL;
  END IF;

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, candidate_display_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.learner_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  learner_payload := NEW.raw_user_meta_data -> 'learner_profile';
  IF learner_payload IS NULL THEN
    RETURN NEW;
  END IF;

  selected_type := learner_payload ->> 'learner_type';
  IF selected_type NOT IN ('student', 'professional', 'company_invited') THEN
    RAISE EXCEPTION 'Invalid learner type';
  END IF;

  IF selected_type = 'student' THEN
    candidate_university := NULLIF(pg_catalog.btrim(learner_payload ->> 'university'), '');
    candidate_faculty := NULLIF(pg_catalog.btrim(learner_payload ->> 'faculty'), '');
    IF candidate_university IS NULL OR candidate_faculty IS NULL
      OR pg_catalog.char_length(candidate_university) > 120
      OR pg_catalog.char_length(candidate_faculty) > 120 THEN
      RAISE EXCEPTION 'Invalid student profile';
    END IF;

    raw_value := NULLIF(learner_payload ->> 'birth_year', '');
    IF raw_value IS NOT NULL THEN
      IF raw_value !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Invalid birth year'; END IF;
      candidate_birth_year := raw_value::smallint;
      IF candidate_birth_year NOT BETWEEN 1900 AND EXTRACT(YEAR FROM CURRENT_DATE) THEN
        RAISE EXCEPTION 'Invalid birth year';
      END IF;
    END IF;

    raw_value := NULLIF(learner_payload ->> 'graduation_year', '');
    IF raw_value IS NOT NULL THEN
      IF raw_value !~ '^[0-9]{4}$' THEN RAISE EXCEPTION 'Invalid graduation year'; END IF;
      candidate_graduation_year := raw_value::smallint;
      IF candidate_graduation_year NOT BETWEEN 1900 AND 2100 THEN
        RAISE EXCEPTION 'Invalid graduation year';
      END IF;
    END IF;
  ELSIF selected_type = 'professional' THEN
    candidate_job_title := NULLIF(pg_catalog.btrim(learner_payload ->> 'job_title'), '');
    candidate_company_name := NULLIF(pg_catalog.btrim(learner_payload ->> 'company_name'), '');
    IF pg_catalog.char_length(candidate_job_title) > 120
      OR pg_catalog.char_length(candidate_company_name) > 120 THEN
      RAISE EXCEPTION 'Invalid professional profile';
    END IF;

    raw_value := NULLIF(learner_payload ->> 'years_experience', '');
    IF raw_value IS NOT NULL THEN
      IF raw_value !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'Invalid experience'; END IF;
      candidate_years_experience := raw_value::smallint;
      IF candidate_years_experience NOT BETWEEN 0 AND 60 THEN
        RAISE EXCEPTION 'Invalid experience';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.learner_profiles (
    user_id,
    learner_type,
    birth_year,
    university,
    faculty,
    graduation_year,
    job_title,
    company_name,
    years_experience
  ) VALUES (
    NEW.id,
    selected_type,
    candidate_birth_year,
    candidate_university,
    candidate_faculty,
    candidate_graduation_year,
    candidate_job_title,
    candidate_company_name,
    candidate_years_experience
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
COMMENT ON TABLE public.learner_profiles IS
  'Owner-scoped, non-authorizing learner classification and onboarding details. Company invitation validation and membership are deferred.';
COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Initializes minimal profiles/preferences and validates non-privileged signup learner details. It never reads role or permission fields.';
