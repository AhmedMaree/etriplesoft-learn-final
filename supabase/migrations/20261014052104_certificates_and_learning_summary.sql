CREATE TABLE public.certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 course_completion_id uuid NOT NULL REFERENCES public.course_completions(id) ON DELETE RESTRICT,
 certificate_number text NOT NULL UNIQUE,
 verification_hash bytea NOT NULL UNIQUE,
 locale text NOT NULL CHECK(locale IN ('en','ar')),
 learner_name text NOT NULL, course_title text NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 revoked_at timestamptz, revoked_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
 CHECK((revoked_at IS NULL)=(revoked_by IS NULL))
);
CREATE UNIQUE INDEX one_active_certificate ON public.certificates(course_completion_id) WHERE revoked_at IS NULL;
CREATE INDEX certificates_completion_idx ON public.certificates(course_completion_id);
CREATE TABLE assessment_private.certificate_tokens (
 certificate_id uuid PRIMARY KEY REFERENCES public.certificates(id) ON DELETE RESTRICT,
 token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()
);
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_private.certificate_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.certificates,assessment_private.certificate_tokens FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE public.admin_audit_log ADD COLUMN certificate_id uuid REFERENCES public.certificates(id) ON DELETE RESTRICT;
CREATE INDEX admin_audit_certificate_idx ON public.admin_audit_log(certificate_id) WHERE certificate_id IS NOT NULL;
DO $$ DECLARE expr text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR action IN (''certificate.revoked''))';
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_target_type_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_target_type_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_type_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR target_type=''certificate'')';
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_target_shape_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_target_shape_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (('||substring(expr FROM 8 FOR length(expr)-8)||') AND certificate_id IS NULL OR (target_type=''certificate'' AND certificate_id IS NOT NULL AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL))';
END $$;

CREATE FUNCTION public.learner_issue_certificate(p_completion_id uuid,p_locale text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.course_completions; certificate uuid; token uuid:=gen_random_uuid(); BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023'; END IF;
 SELECT cc.* INTO c FROM public.course_completions cc JOIN public.enrollments e ON e.id=cc.enrollment_id WHERE cc.id=p_completion_id AND e.user_id=auth.uid() AND e.status='completed' AND (e.expires_at IS NULL OR e.expires_at>clock_timestamp()) FOR UPDATE OF cc;
 IF NOT FOUND THEN RAISE EXCEPTION 'eligible completion required' USING ERRCODE='42501'; END IF;
 SELECT id INTO certificate FROM public.certificates WHERE course_completion_id=c.id AND revoked_at IS NULL;
 IF certificate IS NOT NULL THEN RETURN certificate; END IF;
 -- Reissue is an explicit administrator workflow; a learner cannot reverse revocation.
 IF EXISTS(SELECT 1 FROM public.certificates WHERE course_completion_id=c.id) THEN RAISE EXCEPTION 'certificate reissue requires review' USING ERRCODE='23514'; END IF;
 certificate:=gen_random_uuid();
 INSERT INTO public.certificates(id,course_completion_id,certificate_number,verification_hash,locale,learner_name,course_title)
 VALUES(certificate,c.id,'ETSL-'||upper(substr(replace(certificate::text,'-',''),1,12)),extensions.digest(token::text,'sha256'),p_locale,c.learner_name,c.course_title);
 INSERT INTO assessment_private.certificate_tokens(certificate_id,token) VALUES(certificate,token);
 RETURN certificate;
END $$;
CREATE FUNCTION public.learner_list_certificates() RETURNS TABLE(id uuid,course_completion_id uuid,certificate_number text,learner_name text,course_title text,issued_at timestamptz,revoked_at timestamptz,verification_token uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT c.id,c.course_completion_id,c.certificate_number,c.learner_name,c.course_title,c.issued_at,c.revoked_at,t.token FROM public.certificates c
 JOIN public.course_completions cc ON cc.id=c.course_completion_id JOIN public.enrollments e ON e.id=cc.enrollment_id JOIN assessment_private.certificate_tokens t ON t.certificate_id=c.id WHERE e.user_id=auth.uid() ORDER BY c.issued_at DESC LIMIT 100;
$$;
CREATE FUNCTION public.verify_certificate(p_token uuid) RETURNS TABLE(certificate_number text,learner_name text,course_title text,issued_at timestamptz,status text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT c.certificate_number,c.learner_name,c.course_title,c.issued_at,CASE WHEN c.revoked_at IS NULL THEN 'valid' ELSE 'revoked' END FROM public.certificates c WHERE c.verification_hash=extensions.digest(p_token::text,'sha256') LIMIT 1;
$$;
CREATE FUNCTION public.admin_revoke_certificate(p_certificate_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); BEGIN
 UPDATE public.certificates SET revoked_at=clock_timestamp(),revoked_by=actor WHERE id=p_certificate_id AND revoked_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'active certificate not found' USING ERRCODE='P0002'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,certificate_id,safe_summary) VALUES(actor,'certificate.revoked','certificate',p_certificate_id,'Revoked certificate');
END $$;

CREATE FUNCTION public.learner_learning_summary(p_locale text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('enrolledCourses',(SELECT count(DISTINCT course_id) FROM public.enrollments WHERE user_id=auth.uid() AND status IN ('active','completed') AND (expires_at IS NULL OR expires_at>now())),
 'completedCourses',(SELECT count(DISTINCT e.course_id) FROM public.course_completions cc JOIN public.enrollments e ON e.id=cc.enrollment_id WHERE e.user_id=auth.uid()),
 'passedAssessments',(SELECT count(DISTINCT quiz_id) FROM public.quiz_attempts WHERE user_id=auth.uid() AND passed),
 'certificates',(SELECT count(*) FROM public.certificates c JOIN public.course_completions cc ON cc.id=c.course_completion_id JOIN public.enrollments e ON e.id=cc.enrollment_id WHERE e.user_id=auth.uid() AND c.revoked_at IS NULL),
 'courses',coalesce((SELECT jsonb_agg(jsonb_build_object('slug',x.slug,'title',x.title,'status',x.status,'required',x.required,'finished',x.finished,'resumeLessonId',x.resume_id)) FROM (
 SELECT c.slug,ct.title,e.status,
 (SELECT count(*) FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id WHERE m.course_id=c.id AND m.is_required AND l.is_required AND l.status='published') required,
 (SELECT count(*) FROM public.lesson_progress p JOIN public.lessons l ON l.id=p.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE p.enrollment_id=e.id AND p.status='completed' AND m.course_id=c.id AND m.is_required AND l.is_required AND l.status='published') finished,
 (SELECT l.id FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.lesson_translations lt ON lt.lesson_id=l.id AND lt.locale=p_locale AND lt.publication_status='published' JOIN public.module_translations mt ON mt.module_id=m.id AND mt.locale=p_locale AND mt.publication_status='published' LEFT JOIN public.lesson_progress p ON p.lesson_id=l.id AND p.enrollment_id=e.id WHERE m.course_id=c.id AND l.status='published' ORDER BY (p.status='started') DESC NULLS LAST,p.updated_at DESC NULLS LAST,m.position,l.position LIMIT 1) resume_id
 FROM public.enrollments e JOIN public.courses c ON c.id=e.course_id AND c.status='published' JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale AND ct.publication_status='published'
 WHERE e.user_id=auth.uid() AND e.status IN ('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now()) AND NOT EXISTS(SELECT 1 FROM public.enrollments newer WHERE newer.user_id=e.user_id AND newer.course_id=e.course_id AND newer.status IN ('active','completed') AND (newer.expires_at IS NULL OR newer.expires_at>now()) AND (newer.granted_at,newer.id)>(e.granted_at,e.id)) ORDER BY e.granted_at DESC LIMIT 50
 ) x),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.learner_issue_certificate(uuid,text),public.learner_list_certificates(),public.verify_certificate(uuid),public.admin_revoke_certificate(uuid),public.learner_learning_summary(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_issue_certificate(uuid,text),public.learner_list_certificates(),public.admin_revoke_certificate(uuid),public.learner_learning_summary(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_certificate(uuid) TO anon,authenticated;
