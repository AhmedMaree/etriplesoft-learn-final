-- PostgREST resolves RPCs by the argument names a request sends. The app omits null optional arguments
-- (a new conversation has no id; a question without course context has no course), so those calls
-- found no matching function (PGRST202). Optional arguments now default to NULL. Postgres requires every
-- argument after a defaulted one to have a default, so locale/content default too; the bodies still
-- reject a NULL locale or empty content with 22023. Bodies, grants and security are otherwise unchanged.
CREATE OR REPLACE FUNCTION public.learner_ai_begin_turn(p_conversation_id uuid DEFAULT NULL,p_course_id uuid DEFAULT NULL,p_locale text DEFAULT NULL,p_content text DEFAULT NULL)
RETURNS TABLE(conversation_id uuid,message_id uuid,created boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_content text:=btrim(coalesce(p_content,'')); v_conversation uuid; v_message uuid; v_count integer;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 IF char_length(v_content) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid message' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai:'||actor::text));
 IF (SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at>now()-interval '1 minute')>=6 THEN RAISE EXCEPTION 'ai_rate_minute' USING ERRCODE='54000';END IF;
 IF (SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at>now()-interval '1 day')>=150 THEN RAISE EXCEPTION 'ai_rate_daily' USING ERRCODE='54000';END IF;
 IF p_course_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id=e.course_id AND c.status='published'
  WHERE e.user_id=actor AND e.course_id=p_course_id AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())
 ) THEN RAISE EXCEPTION 'course context requires enrollment' USING ERRCODE='42501';END IF;
 IF p_conversation_id IS NULL THEN
  INSERT INTO public.ai_conversations(user_id,course_id,title,locale)
   VALUES(actor,p_course_id,btrim(left(regexp_replace(v_content,'\s+',' ','g'),80)),p_locale) RETURNING id INTO v_conversation;
  created:=true;
 ELSE
  SELECT c.id,c.message_count INTO v_conversation,v_count FROM public.ai_conversations c WHERE c.id=p_conversation_id AND c.user_id=actor FOR UPDATE;
  IF v_conversation IS NULL THEN RAISE EXCEPTION 'conversation not found' USING ERRCODE='P0002';END IF;
  IF v_count>=200 THEN RAISE EXCEPTION 'ai_conversation_full' USING ERRCODE='54000';END IF;
  created:=false;
 END IF;
 INSERT INTO public.ai_messages(conversation_id,role,content) VALUES(v_conversation,'user',v_content) RETURNING id INTO v_message;
 UPDATE public.ai_conversations SET message_count=message_count+1,updated_at=now(),course_id=coalesce(p_course_id,course_id),locale=p_locale WHERE id=v_conversation;
 INSERT INTO public.ai_usage_events(user_id,course_id) VALUES(actor,p_course_id);
 conversation_id:=v_conversation; message_id:=v_message;
 RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.learner_ai_complete_turn(p_conversation_id uuid,p_content text,p_status text,p_model text DEFAULT NULL,p_input_tokens integer DEFAULT NULL,p_output_tokens integer DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_conversation uuid; v_last text; v_id uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_status IS NULL OR p_status NOT IN('complete','stopped') OR char_length(coalesce(p_content,'')) NOT BETWEEN 1 AND 32000 THEN RAISE EXCEPTION 'invalid reply' USING ERRCODE='22023';END IF;
 SELECT c.id INTO v_conversation FROM public.ai_conversations c WHERE c.id=p_conversation_id AND c.user_id=actor FOR UPDATE;
 IF v_conversation IS NULL THEN RAISE EXCEPTION 'conversation not found' USING ERRCODE='P0002';END IF;
 SELECT m.role INTO v_last FROM public.ai_messages m WHERE m.conversation_id=v_conversation ORDER BY m.created_at DESC,m.id DESC LIMIT 1;
 IF v_last IS DISTINCT FROM 'user' THEN RAISE EXCEPTION 'no pending question' USING ERRCODE='55000';END IF;
 INSERT INTO public.ai_messages(conversation_id,role,content,status,model,input_tokens,output_tokens)
  VALUES(v_conversation,'assistant',p_content,p_status,p_model,greatest(p_input_tokens,0),greatest(p_output_tokens,0)) RETURNING id INTO v_id;
 UPDATE public.ai_conversations SET message_count=message_count+1,updated_at=now(),
  preview=btrim(left(regexp_replace(regexp_replace(p_content,'[#*`>_|~]+','','g'),'\s+',' ','g'),140)) WHERE id=v_conversation;
 RETURN v_id;
END $$;

-- CREATE OR REPLACE keeps existing privileges; restate them so the grant surface is explicit here too.
REVOKE ALL ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text),public.learner_ai_complete_turn(uuid,text,text,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text),public.learner_ai_complete_turn(uuid,text,text,text,integer,integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
