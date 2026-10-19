-- AI course index: lesson documents (PDF attachments) as a Course chat source.
-- Text is extracted by the operator command `npm run ai:documents` (local PDF text extraction, Gemini only for
-- image-only pages) and saved through an audited admin RPC. Like transcripts, extracted text is tied to the
-- exact stored file (storage object key): a replaced file is no longer used, and a document counts only while
-- its lesson and at least one of its translations are published.
CREATE TABLE ai_private.resource_texts (
 lesson_resource_id uuid PRIMARY KEY REFERENCES public.lesson_resources(id) ON DELETE CASCADE,
 storage_object_key text NOT NULL CHECK (char_length(storage_object_key) BETWEEN 1 AND 1024),
 language text NOT NULL CHECK (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
 content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 400000),
 method text NOT NULL CHECK (method IN ('pdf-text','gemini')),
 model text CHECK (model IS NULL OR model ~ '^[a-z0-9][a-z0-9.-]{1,63}$'),
 created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_resource_texts_creator_idx ON ai_private.resource_texts(created_by);
ALTER TABLE ai_private.resource_texts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_private.resource_texts FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION ai_private.course_sources(p_course_id uuid)
RETURNS TABLE(source_key text, source_hash text, source_type text, source_locale text, module_position integer, lesson_position integer, lesson_id uuid, label text, content text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH src AS (
  SELECT 'course:'||ct.locale AS source_key, 'course' AS source_type, ct.locale AS source_locale, NULL::integer AS module_position, NULL::integer AS lesson_position, NULL::uuid AS lesson_id, ct.title AS label,
   concat_ws(E'\n\n', ct.title, nullif(btrim(ct.summary),''), nullif(btrim(ct.description),'')) AS content
  FROM public.courses c JOIN public.course_translations ct ON ct.course_id=c.id AND ct.publication_status='published'
  WHERE c.id=p_course_id AND c.status='published'
 UNION ALL
  SELECT 'module:'||m.id||':'||mt.locale, 'module', mt.locale, m.position, NULL, NULL, mt.title,
   concat_ws(E'\n\n', mt.title, nullif(btrim(mt.description),''))
  FROM public.course_modules m JOIN public.courses c ON c.id=m.course_id AND c.status='published'
  JOIN public.module_translations mt ON mt.module_id=m.id AND mt.publication_status='published'
  WHERE m.course_id=p_course_id
 UNION ALL
  SELECT 'lesson:'||l.id||':'||lt.locale, 'lesson', lt.locale, m.position, l.position, l.id, lt.title,
   concat_ws(E'\n\n', lt.title, nullif(btrim(lt.summary),''), nullif(btrim(lt.body),''))
  FROM public.lessons l JOIN public.course_modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id AND c.status='published'
  JOIN public.lesson_translations lt ON lt.lesson_id=l.id AND lt.publication_status='published'
  JOIN public.module_translations mt ON mt.module_id=m.id AND mt.locale=lt.locale AND mt.publication_status='published'
  WHERE m.course_id=p_course_id AND l.status='published' AND l.lesson_type<>'assessment'
 UNION ALL
  SELECT 'resource:'||r.id||':'||rt.locale, 'resource', rt.locale, m.position, l.position, l.id, rt.label,
   concat_ws(E'\n\n', rt.label, nullif(btrim(rt.description),''))
  FROM public.lesson_resources r JOIN public.lessons l ON l.id=r.lesson_id AND l.status='published' AND l.lesson_type<>'assessment'
  JOIN public.course_modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id AND c.status='published'
  JOIN public.lesson_resource_translations rt ON rt.resource_id=r.id AND rt.publication_status='published'
  WHERE m.course_id=p_course_id
 UNION ALL
  SELECT 'transcript:'||v.id, 'transcript', t.language, m.position, l.position, l.id,
   coalesce((SELECT lt.title FROM public.lesson_translations lt WHERE lt.lesson_id=l.id AND lt.publication_status='published' ORDER BY (lt.locale='en') DESC LIMIT 1), 'Video'),
   t.content
  FROM ai_private.video_transcripts t JOIN public.lesson_videos v ON v.id=t.lesson_video_id AND v.status='ready' AND coalesce(v.bunny_video_id, v.mux_asset_id)=t.provider_video_id
  JOIN public.lessons l ON l.id=v.lesson_id AND l.status='published' AND l.lesson_type<>'assessment'
  JOIN public.course_modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id AND c.status='published'
  WHERE m.course_id=p_course_id
 UNION ALL
  SELECT 'document:'||r.id, 'document', d.language, m.position, l.position, l.id,
   coalesce((SELECT rt.label FROM public.lesson_resource_translations rt WHERE rt.resource_id=r.id AND rt.publication_status='published' ORDER BY (rt.locale='en') DESC LIMIT 1), 'Document'),
   d.content
  FROM ai_private.resource_texts d JOIN public.lesson_resources r ON r.id=d.lesson_resource_id AND r.storage_object_key=d.storage_object_key
  JOIN public.lessons l ON l.id=r.lesson_id AND l.status='published' AND l.lesson_type<>'assessment'
  JOIN public.course_modules m ON m.id=l.module_id JOIN public.courses c ON c.id=m.course_id AND c.status='published'
  WHERE m.course_id=p_course_id AND EXISTS(SELECT 1 FROM public.lesson_resource_translations rt WHERE rt.resource_id=r.id AND rt.publication_status='published')
 )
 SELECT s.source_key, md5(s.content), s.source_type, s.source_locale, s.module_position, s.lesson_position, s.lesson_id, s.label, s.content
 FROM src s WHERE btrim(s.content)<>'';
$$;
REVOKE ALL ON FUNCTION ai_private.course_sources(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- Stored-file resources of a course's published lessons, and whether text exists for the current file.
CREATE FUNCTION public.admin_ai_course_resources(p_course_id uuid)
RETURNS TABLE(lesson_resource_id uuid,lesson_id uuid,storage_object_key text,mime_type text,size_bytes bigint,label text,extracted boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY
  SELECT r.id,l.id,r.storage_object_key,o.metadata->>'mimetype',(o.metadata->>'size')::bigint,
   coalesce((SELECT rt.label FROM public.lesson_resource_translations rt WHERE rt.resource_id=r.id ORDER BY (rt.locale='en') DESC LIMIT 1),'Document'),
   EXISTS(SELECT 1 FROM ai_private.resource_texts d WHERE d.lesson_resource_id=r.id AND d.storage_object_key=r.storage_object_key)
  FROM public.lesson_resources r JOIN public.lessons l ON l.id=r.lesson_id JOIN public.course_modules m ON m.id=l.module_id
  LEFT JOIN storage.objects o ON o.bucket_id='course-resources' AND o.name=r.storage_object_key
  WHERE m.course_id=p_course_id AND l.status='published' AND l.lesson_type<>'assessment' AND r.storage_object_key IS NOT NULL
  ORDER BY m.position,l.position,r.position;
END $$;

CREATE FUNCTION public.admin_ai_save_resource_text(p_lesson_resource_id uuid,p_storage_object_key text,p_language text,p_content text,p_method text,p_model text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); v_text text:=btrim(coalesce(p_content,''));BEGIN
 IF char_length(v_text) NOT BETWEEN 1 AND 400000 OR coalesce(p_language,'') !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$' OR p_method IS NULL OR p_method NOT IN ('pdf-text','gemini')
  OR (p_model IS NOT NULL AND p_model !~ '^[a-z0-9][a-z0-9.-]{1,63}$') THEN RAISE EXCEPTION 'invalid document text' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lesson_resources r WHERE r.id=p_lesson_resource_id AND r.storage_object_key=p_storage_object_key) THEN RAISE EXCEPTION 'resource not found' USING ERRCODE='P0002';END IF;
 INSERT INTO ai_private.resource_texts(lesson_resource_id,storage_object_key,language,content,method,model,created_by)
  VALUES(p_lesson_resource_id,p_storage_object_key,p_language,v_text,p_method,p_model,actor)
  ON CONFLICT (lesson_resource_id) DO UPDATE SET storage_object_key=excluded.storage_object_key,language=excluded.language,content=excluded.content,method=excluded.method,model=excluded.model,created_by=excluded.created_by,updated_at=now();
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,lesson_resource_id,safe_summary)
  VALUES(actor,'lesson_resource.ai_extracted','lesson_resource',p_lesson_resource_id,'Saved AI document text ('||char_length(v_text)||' characters, '||p_method||')');
END $$;

DO $$ DECLARE expr text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR action = ''lesson_resource.ai_extracted'')';
END $$;

REVOKE ALL ON FUNCTION public.admin_ai_course_resources(uuid),public.admin_ai_save_resource_text(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_ai_course_resources(uuid),public.admin_ai_save_resource_text(uuid,text,text,text,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
