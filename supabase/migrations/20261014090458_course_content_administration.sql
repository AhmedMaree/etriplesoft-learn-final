-- Current-admin authoring projections and atomic draft/edit operations. No table grants.
CREATE FUNCTION public.admin_save_course_content(p_slug text,p_locale text,p_title text,p_summary text,p_description text,p_price_minor bigint,p_category text,p_level text,p_publish boolean,p_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid:=p_id; existing public.courses;BEGIN
 PERFORM public.assert_active_admin();
 IF v_id IS NULL THEN v_id:=public.admin_create_course(p_slug,p_category,p_level,p_price_minor,null);
 ELSE
 SELECT * INTO existing FROM public.courses WHERE public.courses.id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'course not found' USING ERRCODE='P0002';END IF;
 IF p_slug<>existing.slug THEN RAISE EXCEPTION 'course URL name cannot change in this editor' USING ERRCODE='23514';END IF;
 PERFORM public.admin_update_course(v_id,p_slug,p_category,p_level,p_price_minor,existing.thumbnail_object_key);
 END IF;
 PERFORM public.admin_upsert_course_translation(v_id,p_locale,p_title,p_summary,p_description);
 IF NOT p_publish AND EXISTS(SELECT 1 FROM public.courses c WHERE c.id=v_id AND c.status='published') AND NOT EXISTS(SELECT 1 FROM public.course_translations t WHERE t.course_id=v_id AND t.locale<>p_locale AND t.publication_status='published') THEN
 PERFORM public.admin_set_course_status(v_id,'draft');
 END IF;
 PERFORM public.admin_set_translation_publication(v_id,p_locale,p_publish);
 IF p_publish THEN PERFORM public.admin_set_course_status(v_id,'published');END IF;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_save_course_content(text,text,text,text,text,bigint,text,text,boolean,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_save_course_content(text,text,text,text,text,bigint,text,text,boolean,uuid) TO authenticated;
CREATE FUNCTION public.admin_get_curriculum(p_course_id uuid,p_locale text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 IF p_locale IS NULL OR p_locale NOT IN ('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 RETURN coalesce((SELECT jsonb_agg(x.value ORDER BY x.position) FROM (
 SELECT m.position,jsonb_build_object('id',m.id,'position',m.position,'required',m.is_required,'title',coalesce(mt.title,''),'description',coalesce(mt.description,''),'published',coalesce(mt.publication_status='published',false),
 'lessons',coalesce((SELECT jsonb_agg(y.value ORDER BY y.position) FROM (
 SELECT l.position,jsonb_build_object('id',l.id,'position',l.position,'type',l.lesson_type,'status',l.status,'required',l.is_required,'preview',l.is_preview,'duration',l.duration_seconds,'title',coalesce(lt.title,''),'summary',coalesce(lt.summary,''),'body',coalesce(lt.body,''),'published',coalesce(lt.publication_status='published',false),
 'resources',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'label',coalesce(rt.label,''),'published',coalesce(rt.publication_status='published',false)) ORDER BY r.position) FROM public.lesson_resources r LEFT JOIN public.lesson_resource_translations rt ON rt.resource_id=r.id AND rt.locale=p_locale WHERE r.lesson_id=l.id AND (r.locale IS NULL OR r.locale=p_locale)),'[]'::jsonb)) value
 FROM public.lessons l LEFT JOIN public.lesson_translations lt ON lt.lesson_id=l.id AND lt.locale=p_locale WHERE l.module_id=m.id ORDER BY l.position LIMIT 200
 )y),'[]'::jsonb)) value
 FROM public.course_modules m LEFT JOIN public.module_translations mt ON mt.module_id=m.id AND mt.locale=p_locale WHERE m.course_id=p_course_id ORDER BY m.position LIMIT 100
 )x),'[]'::jsonb);
END $$;

CREATE FUNCTION public.admin_create_module_draft(p_course_id uuid,p_locale text,p_title text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE id uuid;BEGIN
 PERFORM public.assert_active_admin();
 id:=public.admin_create_course_module(p_course_id,true);
 PERFORM public.admin_save_module_translation(id,p_locale,p_title,null);
 RETURN id;
END $$;
CREATE FUNCTION public.admin_create_lesson_draft(p_module_id uuid,p_locale text,p_title text,p_type text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE id uuid;BEGIN
 PERFORM public.assert_active_admin();
 id:=public.admin_create_lesson(p_module_id,p_type,true,false,null);
 PERFORM public.admin_save_lesson_translation(id,p_locale,p_title,null,null);
 RETURN id;
END $$;
CREATE FUNCTION public.admin_edit_module(p_id uuid,p_locale text,p_title text,p_description text,p_required boolean,p_publish boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 PERFORM 1 FROM public.course_modules WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'module not found' USING ERRCODE='P0002';END IF;
 UPDATE public.course_modules SET is_required=p_required WHERE id=p_id;
 PERFORM public.admin_save_module_translation(p_id,p_locale,p_title,p_description);
 PERFORM public.admin_set_module_translation_publication(p_id,p_locale,p_publish);
END $$;
CREATE FUNCTION public.admin_edit_lesson(p_id uuid,p_locale text,p_title text,p_summary text,p_body text,p_required boolean,p_preview boolean,p_publish boolean,p_duration integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 PERFORM 1 FROM public.lessons WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'lesson not found' USING ERRCODE='P0002';END IF;
 PERFORM public.admin_update_lesson(p_id,p_required,p_preview,p_duration);
 PERFORM public.admin_save_lesson_translation(p_id,p_locale,p_title,p_summary,p_body);
 PERFORM public.admin_set_lesson_translation_publication(p_id,p_locale,p_publish);
 IF p_publish THEN PERFORM public.admin_set_lesson_status(p_id,'published');END IF;
END $$;
CREATE FUNCTION public.admin_prepare_resource_upload(p_lesson_id uuid,p_locale text,p_label text) RETURNS TABLE(resource_id uuid,storage_object_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE id uuid; key text;BEGIN
 PERFORM public.assert_active_admin();
 SELECT r.resource_id,r.storage_object_key INTO id,key FROM public.admin_create_lesson_resource(p_lesson_id,'file',p_locale,null) r;
 PERFORM public.admin_save_resource_translation(id,p_locale,p_label,null);
 RETURN QUERY SELECT id,key;
END $$;
CREATE FUNCTION public.admin_get_resource_upload(p_id uuid,p_locale text) RETURNS TABLE(storage_object_key text,lesson_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY SELECT r.storage_object_key,r.lesson_id FROM public.lesson_resources r JOIN public.lesson_resource_translations rt ON rt.resource_id=r.id AND rt.locale=p_locale
 WHERE r.id=p_id AND r.kind='file' AND r.locale=p_locale AND r.created_by=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.admin_get_curriculum(uuid,text),public.admin_create_module_draft(uuid,text,text),public.admin_create_lesson_draft(uuid,text,text,text),public.admin_edit_module(uuid,text,text,text,boolean,boolean),public.admin_edit_lesson(uuid,text,text,text,text,boolean,boolean,boolean,integer),public.admin_prepare_resource_upload(uuid,text,text),public.admin_get_resource_upload(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_curriculum(uuid,text),public.admin_create_module_draft(uuid,text,text),public.admin_create_lesson_draft(uuid,text,text,text),public.admin_edit_module(uuid,text,text,text,boolean,boolean),public.admin_edit_lesson(uuid,text,text,text,text,boolean,boolean,boolean,integer),public.admin_prepare_resource_upload(uuid,text,text),public.admin_get_resource_upload(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.catalog_get_course_outline(
  p_course_slug text, p_locale text, p_limit integer DEFAULT 200, p_offset integer DEFAULT 0
)
RETURNS TABLE (
  course_id uuid,
  course_slug text,
  module_id uuid,
  module_position integer,
  module_title text,
  module_description text,
  lesson_id uuid,
  lesson_position integer,
  lesson_type text,
  lesson_title text,
  lesson_summary text,
  is_required boolean,
  is_preview boolean,
  duration_seconds integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_locale IS NULL OR p_locale NOT IN ('en', 'ar') THEN
    RAISE EXCEPTION 'unsupported locale' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT c.id, c.slug, m.id, m.position, mt.title, mt.description,
         l.id, l.position, l.lesson_type, lt.title, lt.summary,
         (l.is_required AND m.is_required), l.is_preview, l.duration_seconds
  FROM public.courses c
  JOIN public.course_translations ct
    ON ct.course_id = c.id AND ct.locale = p_locale AND ct.publication_status = 'published'
  JOIN public.course_modules m ON m.course_id = c.id
  JOIN public.module_translations mt
    ON mt.module_id = m.id AND mt.locale = p_locale AND mt.publication_status = 'published'
  JOIN public.lessons l ON l.module_id = m.id AND l.status = 'published'
  JOIN public.lesson_translations lt
    ON lt.lesson_id = l.id AND lt.locale = p_locale AND lt.publication_status = 'published'
  WHERE c.slug = p_course_slug AND c.status = 'published'
  ORDER BY m.position, l.position
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 200)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;
