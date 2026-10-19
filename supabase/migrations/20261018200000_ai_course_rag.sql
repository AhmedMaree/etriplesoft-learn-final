-- AI assistant: General and Course (RAG) chats.
--
-- Course chat answers from a course's own published content. Sources are the published exact-locale
-- course, module, lesson and resource text plus AI transcripts of the lesson videos (most lessons are
-- video-only). Sources are chunked and embedded server-side (Gemini) and stored here with pgvector.
--
-- Security model
-- * Index data lives in ai_private (not exposed by the Data API); no client role has table access.
-- * Admins build the index through admin_ai_* RPCs that re-check the current admin role, accept chunks
--   only for sources that currently exist and are published, and write audit rows.
-- * Learners search only through learner_ai_search_course, which requires an active enrollment (or a
--   current admin preview) and returns only chunks whose source is still published and unchanged
--   (matching content hash). Unpublished or edited content therefore never reaches the model, even
--   before the index is rebuilt. Assessment lessons are never indexed.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS ai_private;
REVOKE ALL ON SCHEMA ai_private FROM PUBLIC, anon, authenticated;

CREATE TABLE ai_private.video_transcripts (
 lesson_video_id uuid PRIMARY KEY REFERENCES public.lesson_videos(id) ON DELETE CASCADE,
 -- The Bunny GUID or Mux asset the transcript was made from; a replaced video invalidates it.
 provider_video_id text NOT NULL CHECK (char_length(provider_video_id) BETWEEN 1 AND 128),
 language text NOT NULL CHECK (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$'),
 content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 400000),
 model text NOT NULL CHECK (model ~ '^[a-z0-9][a-z0-9.-]{1,63}$'),
 created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_video_transcripts_creator_idx ON ai_private.video_transcripts(created_by);

CREATE TABLE ai_private.course_chunks (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
 source_key text NOT NULL CHECK (char_length(source_key) BETWEEN 1 AND 200),
 source_hash text NOT NULL CHECK (source_hash ~ '^[0-9a-f]{32}$'),
 chunk_index integer NOT NULL CHECK (chunk_index BETWEEN 0 AND 999),
 content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
 embedding extensions.vector(768) NOT NULL,
 embedding_model text NOT NULL CHECK (embedding_model ~ '^[a-z0-9][a-z0-9.-]{1,63}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT ai_course_chunks_unique UNIQUE (course_id, source_key, chunk_index)
);
-- Search is always filtered to one course; an exact scan within a course is small and has full recall.
CREATE INDEX ai_course_chunks_course_model_idx ON ai_private.course_chunks(course_id, embedding_model);

CREATE TABLE ai_private.course_index_state (
 course_id uuid PRIMARY KEY REFERENCES public.courses(id) ON DELETE CASCADE,
 embedding_model text NOT NULL,
 source_count integer NOT NULL CHECK (source_count >= 0),
 chunk_count integer NOT NULL CHECK (chunk_count >= 0),
 indexed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 indexed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_course_index_state_indexer_idx ON ai_private.course_index_state(indexed_by);

ALTER TABLE ai_private.video_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_private.course_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_private.course_index_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_private.video_transcripts, ai_private.course_chunks, ai_private.course_index_state FROM PUBLIC, anon, authenticated, service_role;

-- Current published sources of one course, with a content hash. Single source of truth for both
-- indexing and the freshness check at search time.
CREATE FUNCTION ai_private.course_sources(p_course_id uuid)
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
 )
 SELECT s.source_key, md5(s.content), s.source_type, s.source_locale, s.module_position, s.lesson_position, s.lesson_id, s.label, s.content
 FROM src s WHERE btrim(s.content)<>'';
$$;
REVOKE ALL ON FUNCTION ai_private.course_sources(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------
-- Conversations: a fixed kind per conversation. Course conversations are bound to one course.
ALTER TABLE public.ai_conversations ADD COLUMN kind text NOT NULL DEFAULT 'general' CHECK (kind IN ('general','course'));
CREATE INDEX ai_conversations_owner_kind_recent_idx ON public.ai_conversations(user_id, kind, updated_at DESC);
-- Citations shown under a course reply: [{n, lessonId, label, sourceType}], at most 12.
ALTER TABLE public.ai_messages ADD COLUMN sources jsonb CHECK (sources IS NULL OR (jsonb_typeof(sources)='array' AND jsonb_array_length(sources)<=12));

CREATE FUNCTION ai_private.can_use_course(p_actor uuid, p_course_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.courses c WHERE c.id=p_course_id AND c.status='published') AND (
  EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=p_actor AND e.course_id=p_course_id AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now()))
  OR EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=p_actor AND r.role='admin' AND r.revoked_at IS NULL));
$$;
REVOKE ALL ON FUNCTION ai_private.can_use_course(uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text);
CREATE FUNCTION public.learner_ai_begin_turn(p_conversation_id uuid DEFAULT NULL,p_course_id uuid DEFAULT NULL,p_locale text DEFAULT NULL,p_content text DEFAULT NULL,p_kind text DEFAULT 'general')
RETURNS TABLE(conversation_id uuid,message_id uuid,created boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_content text:=btrim(coalesce(p_content,'')); v_conversation uuid; v_message uuid; v_count integer; v_kind text; v_course uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 IF p_kind IS NULL OR p_kind NOT IN('general','course') THEN RAISE EXCEPTION 'invalid kind' USING ERRCODE='22023';END IF;
 IF char_length(v_content) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid message' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai:'||actor::text));
 IF (SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at>now()-interval '1 minute')>=6 THEN RAISE EXCEPTION 'ai_rate_minute' USING ERRCODE='54000';END IF;
 IF (SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at>now()-interval '1 day')>=150 THEN RAISE EXCEPTION 'ai_rate_daily' USING ERRCODE='54000';END IF;
 IF p_conversation_id IS NULL THEN
  v_kind:=p_kind; v_course:=CASE WHEN p_kind='course' THEN p_course_id END;
  IF v_kind='course' AND v_course IS NULL THEN RAISE EXCEPTION 'course chat requires a course' USING ERRCODE='22023';END IF;
  IF v_kind='course' AND NOT ai_private.can_use_course(actor,v_course) THEN RAISE EXCEPTION 'course chat requires enrollment' USING ERRCODE='42501';END IF;
  INSERT INTO public.ai_conversations(user_id,course_id,title,locale,kind)
   VALUES(actor,v_course,btrim(left(regexp_replace(v_content,'\s+',' ','g'),80)),p_locale,v_kind) RETURNING id INTO v_conversation;
  created:=true;
 ELSE
  SELECT c.id,c.message_count,c.kind,c.course_id INTO v_conversation,v_count,v_kind,v_course FROM public.ai_conversations c WHERE c.id=p_conversation_id AND c.user_id=actor FOR UPDATE;
  IF v_conversation IS NULL THEN RAISE EXCEPTION 'conversation not found' USING ERRCODE='P0002';END IF;
  IF v_kind<>p_kind OR (v_kind='course' AND v_course IS DISTINCT FROM p_course_id) THEN RAISE EXCEPTION 'conversation kind or course mismatch' USING ERRCODE='22023';END IF;
  IF v_kind='course' AND NOT ai_private.can_use_course(actor,v_course) THEN RAISE EXCEPTION 'course chat requires enrollment' USING ERRCODE='42501';END IF;
  IF v_count>=200 THEN RAISE EXCEPTION 'ai_conversation_full' USING ERRCODE='54000';END IF;
  created:=false;
 END IF;
 INSERT INTO public.ai_messages(conversation_id,role,content) VALUES(v_conversation,'user',v_content) RETURNING id INTO v_message;
 UPDATE public.ai_conversations SET message_count=message_count+1,updated_at=now(),locale=p_locale WHERE id=v_conversation;
 INSERT INTO public.ai_usage_events(user_id,course_id) VALUES(actor,v_course);
 conversation_id:=v_conversation; message_id:=v_message;
 RETURN NEXT;
END $$;

DROP FUNCTION public.learner_ai_complete_turn(uuid,text,text,text,integer,integer);
CREATE FUNCTION public.learner_ai_complete_turn(p_conversation_id uuid,p_content text,p_status text,p_model text DEFAULT NULL,p_input_tokens integer DEFAULT NULL,p_output_tokens integer DEFAULT NULL,p_sources jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_conversation uuid; v_last text; v_id uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_status IS NULL OR p_status NOT IN('complete','stopped') OR char_length(coalesce(p_content,'')) NOT BETWEEN 1 AND 32000 THEN RAISE EXCEPTION 'invalid reply' USING ERRCODE='22023';END IF;
 IF p_sources IS NOT NULL AND (jsonb_typeof(p_sources)<>'array' OR jsonb_array_length(p_sources)>12 OR octet_length(p_sources::text)>8000) THEN RAISE EXCEPTION 'invalid sources' USING ERRCODE='22023';END IF;
 SELECT c.id INTO v_conversation FROM public.ai_conversations c WHERE c.id=p_conversation_id AND c.user_id=actor FOR UPDATE;
 IF v_conversation IS NULL THEN RAISE EXCEPTION 'conversation not found' USING ERRCODE='P0002';END IF;
 SELECT m.role INTO v_last FROM public.ai_messages m WHERE m.conversation_id=v_conversation ORDER BY m.created_at DESC,m.id DESC LIMIT 1;
 IF v_last IS DISTINCT FROM 'user' THEN RAISE EXCEPTION 'no pending question' USING ERRCODE='55000';END IF;
 INSERT INTO public.ai_messages(conversation_id,role,content,status,model,input_tokens,output_tokens,sources)
  VALUES(v_conversation,'assistant',p_content,p_status,p_model,greatest(p_input_tokens,0),greatest(p_output_tokens,0),p_sources) RETURNING id INTO v_id;
 UPDATE public.ai_conversations SET message_count=message_count+1,updated_at=now(),
  preview=btrim(left(regexp_replace(regexp_replace(p_content,'[#*`>_|~]+','','g'),'\s+',' ','g'),140)) WHERE id=v_conversation;
 RETURN v_id;
END $$;

-- Retrieval for Course chat: top chunks of one course, fresh and published only.
CREATE FUNCTION public.learner_ai_search_course(p_course_id uuid,p_model text,p_embedding text,p_limit integer DEFAULT 8)
RETURNS TABLE(lesson_id uuid,source_type text,source_locale text,module_position integer,lesson_position integer,label text,content text,similarity real)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_query extensions.vector(768);BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 12 OR p_model IS NULL OR p_model !~ '^[a-z0-9][a-z0-9.-]{1,63}$' THEN RAISE EXCEPTION 'invalid search' USING ERRCODE='22023';END IF;
 IF NOT ai_private.can_use_course(actor,p_course_id) THEN RAISE EXCEPTION 'course search requires enrollment' USING ERRCODE='42501';END IF;
 BEGIN v_query:=p_embedding::extensions.vector(768);
 EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'invalid embedding' USING ERRCODE='22023';END;
 RETURN QUERY
  SELECT s.lesson_id,s.source_type,s.source_locale,s.module_position,s.lesson_position,s.label,ch.content,
   (1-(ch.embedding OPERATOR(extensions.<=>) v_query))::real
  FROM ai_private.course_chunks ch
  JOIN ai_private.course_sources(p_course_id) s ON s.source_key=ch.source_key AND s.source_hash=ch.source_hash
  WHERE ch.course_id=p_course_id AND ch.embedding_model=p_model
  ORDER BY ch.embedding OPERATOR(extensions.<=>) v_query
  LIMIT p_limit;
END $$;

-- ---------------------------------------------------------------------------------------------------
-- Administration: sources, transcripts and the index. Every function re-checks the current admin role.
CREATE FUNCTION public.admin_ai_index_overview()
RETURNS TABLE(course_id uuid,slug text,title text,status text,videos integer,transcribed_videos integer,chunk_count integer,source_count integer,embedding_model text,indexed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY
  SELECT c.id,c.slug,
   coalesce((SELECT ct.title FROM public.course_translations ct WHERE ct.course_id=c.id ORDER BY (ct.locale='en') DESC LIMIT 1),c.slug),
   c.status,
   (SELECT count(*)::integer FROM public.lesson_videos v JOIN public.lessons l ON l.id=v.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE m.course_id=c.id AND v.status='ready' AND l.status='published' AND l.lesson_type<>'assessment'),
   (SELECT count(*)::integer FROM ai_private.video_transcripts t JOIN public.lesson_videos v ON v.id=t.lesson_video_id AND coalesce(v.bunny_video_id,v.mux_asset_id)=t.provider_video_id JOIN public.lessons l ON l.id=v.lesson_id JOIN public.course_modules m ON m.id=l.module_id WHERE m.course_id=c.id AND v.status='ready' AND l.status='published' AND l.lesson_type<>'assessment'),
   (SELECT count(*)::integer FROM ai_private.course_chunks ch WHERE ch.course_id=c.id),
   s.source_count,s.embedding_model,s.indexed_at
  FROM public.courses c LEFT JOIN ai_private.course_index_state s ON s.course_id=c.id
  WHERE c.status='published' ORDER BY c.slug LIMIT 200;
END $$;

-- Sources to (re)index, with whether chunks already exist for exactly this content and model.
CREATE FUNCTION public.admin_ai_index_sources(p_course_id uuid,p_model text)
RETURNS TABLE(source_key text,source_hash text,source_type text,source_locale text,module_position integer,lesson_position integer,lesson_id uuid,label text,content text,indexed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY
  SELECT s.source_key,s.source_hash,s.source_type,s.source_locale,s.module_position,s.lesson_position,s.lesson_id,s.label,s.content,
   EXISTS(SELECT 1 FROM ai_private.course_chunks ch WHERE ch.course_id=p_course_id AND ch.source_key=s.source_key AND ch.source_hash=s.source_hash AND ch.embedding_model=p_model)
  FROM ai_private.course_sources(p_course_id) s ORDER BY s.module_position NULLS FIRST,s.lesson_position NULLS FIRST,s.source_key;
END $$;

-- Replaces the chunks of one current source. p_chunks: [{"content": text, "embedding": [768 numbers]}].
CREATE FUNCTION public.admin_ai_replace_source_chunks(p_course_id uuid,p_source_key text,p_source_hash text,p_model text,p_chunks jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_count integer;BEGIN
 PERFORM public.assert_active_admin();
 IF p_model IS NULL OR p_model !~ '^[a-z0-9][a-z0-9.-]{1,63}$' OR jsonb_typeof(p_chunks)<>'array' OR jsonb_array_length(p_chunks) NOT BETWEEN 1 AND 400 THEN RAISE EXCEPTION 'invalid chunks' USING ERRCODE='22023';END IF;
 -- Only text that is currently published in this course can be indexed.
 IF NOT EXISTS(SELECT 1 FROM ai_private.course_sources(p_course_id) s WHERE s.source_key=p_source_key AND s.source_hash=p_source_hash) THEN RAISE EXCEPTION 'source not current' USING ERRCODE='P0002';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai-index:'||p_course_id::text||':'||p_source_key));
 DELETE FROM ai_private.course_chunks WHERE course_id=p_course_id AND source_key=p_source_key;
 INSERT INTO ai_private.course_chunks(course_id,source_key,source_hash,chunk_index,content,embedding,embedding_model)
  SELECT p_course_id,p_source_key,p_source_hash,(x.ordinality-1)::integer,x.value->>'content',(x.value->'embedding')::text::extensions.vector(768),p_model
  FROM jsonb_array_elements(p_chunks) WITH ORDINALITY x;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END $$;

-- Drops chunks of sources that are gone, changed or from another model; records the index state; audits.
CREATE FUNCTION public.admin_ai_finish_course_index(p_course_id uuid,p_model text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); v_chunks integer; v_sources integer;BEGIN
 IF p_model IS NULL OR p_model !~ '^[a-z0-9][a-z0-9.-]{1,63}$' THEN RAISE EXCEPTION 'invalid model' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.courses WHERE id=p_course_id) THEN RAISE EXCEPTION 'course not found' USING ERRCODE='P0002';END IF;
 DELETE FROM ai_private.course_chunks ch WHERE ch.course_id=p_course_id AND (ch.embedding_model<>p_model OR NOT EXISTS(
  SELECT 1 FROM ai_private.course_sources(p_course_id) s WHERE s.source_key=ch.source_key AND s.source_hash=ch.source_hash));
 SELECT count(*),count(DISTINCT source_key) INTO v_chunks,v_sources FROM ai_private.course_chunks WHERE course_id=p_course_id;
 INSERT INTO ai_private.course_index_state(course_id,embedding_model,source_count,chunk_count,indexed_by,indexed_at)
  VALUES(p_course_id,p_model,v_sources,v_chunks,actor,now())
  ON CONFLICT (course_id) DO UPDATE SET embedding_model=excluded.embedding_model,source_count=excluded.source_count,chunk_count=excluded.chunk_count,indexed_by=excluded.indexed_by,indexed_at=excluded.indexed_at;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,course_id,safe_summary)
  VALUES(actor,'course.ai_indexed','course',p_course_id,'Rebuilt AI course index: '||v_sources||' sources, '||v_chunks||' chunks');
 RETURN v_chunks;
END $$;

-- Published lesson videos of a course and whether a transcript exists for the current video.
CREATE FUNCTION public.admin_ai_course_videos(p_course_id uuid)
RETURNS TABLE(lesson_video_id uuid,lesson_id uuid,provider text,provider_video_id text,duration_seconds integer,label text,transcribed boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY
  SELECT v.id,l.id,v.provider,coalesce(v.bunny_video_id,v.mux_asset_id),v.duration_seconds,
   coalesce((SELECT lt.title FROM public.lesson_translations lt WHERE lt.lesson_id=l.id ORDER BY (lt.locale='en') DESC LIMIT 1),'Video'),
   EXISTS(SELECT 1 FROM ai_private.video_transcripts t WHERE t.lesson_video_id=v.id AND t.provider_video_id=coalesce(v.bunny_video_id,v.mux_asset_id))
  FROM public.lesson_videos v JOIN public.lessons l ON l.id=v.lesson_id JOIN public.course_modules m ON m.id=l.module_id
  WHERE m.course_id=p_course_id AND v.status='ready' AND l.status='published' AND l.lesson_type<>'assessment'
  ORDER BY m.position,l.position;
END $$;

CREATE FUNCTION public.admin_ai_save_transcript(p_lesson_video_id uuid,p_provider_video_id text,p_language text,p_content text,p_model text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); v_text text:=btrim(coalesce(p_content,''));BEGIN
 IF char_length(v_text) NOT BETWEEN 1 AND 400000 OR coalesce(p_language,'') !~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$' OR coalesce(p_model,'') !~ '^[a-z0-9][a-z0-9.-]{1,63}$' THEN RAISE EXCEPTION 'invalid transcript' USING ERRCODE='22023';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.lesson_videos v WHERE v.id=p_lesson_video_id AND coalesce(v.bunny_video_id,v.mux_asset_id)=p_provider_video_id) THEN RAISE EXCEPTION 'video not found' USING ERRCODE='P0002';END IF;
 INSERT INTO ai_private.video_transcripts(lesson_video_id,provider_video_id,language,content,model,created_by)
  VALUES(p_lesson_video_id,p_provider_video_id,p_language,v_text,p_model,actor)
  ON CONFLICT (lesson_video_id) DO UPDATE SET provider_video_id=excluded.provider_video_id,language=excluded.language,content=excluded.content,model=excluded.model,created_by=excluded.created_by,updated_at=now();
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,lesson_video_id,safe_summary)
  VALUES(actor,'lesson_video.ai_transcribed','lesson_video',p_lesson_video_id,'Saved AI transcript ('||char_length(v_text)||' characters)');
END $$;

-- Audit actions for the two new administrative writes (same extension pattern as earlier migrations).
DO $$ DECLARE expr text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR action IN (''course.ai_indexed'',''lesson_video.ai_transcribed''))';
END $$;

REVOKE ALL ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text,text),public.learner_ai_complete_turn(uuid,text,text,text,integer,integer,jsonb),public.learner_ai_search_course(uuid,text,text,integer),
 public.admin_ai_index_overview(),public.admin_ai_index_sources(uuid,text),public.admin_ai_replace_source_chunks(uuid,text,text,text,jsonb),public.admin_ai_finish_course_index(uuid,text),
 public.admin_ai_course_videos(uuid),public.admin_ai_save_transcript(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text,text),public.learner_ai_complete_turn(uuid,text,text,text,integer,integer,jsonb),public.learner_ai_search_course(uuid,text,text,integer),
 public.admin_ai_index_overview(),public.admin_ai_index_sources(uuid,text),public.admin_ai_replace_source_chunks(uuid,text,text,text,jsonb),public.admin_ai_finish_course_index(uuid,text),
 public.admin_ai_course_videos(uuid),public.admin_ai_save_transcript(uuid,text,text,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
