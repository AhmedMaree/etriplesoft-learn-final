-- Deep thinking daily limit. Deep replies use the most expensive model and a high thinking level, so a
-- learner may ask at most 10 Deep thinking questions in any rolling 24 hours, on top of the existing
-- 6/minute and 150/day limits. The mode is recorded in the private usage ledger, so deleting
-- conversations never resets it, and it is enforced here rather than in the browser or route handler.
ALTER TABLE public.ai_usage_events ADD COLUMN mode text NOT NULL DEFAULT 'fast' CHECK (mode IN ('fast','deep'));
CREATE INDEX ai_usage_events_owner_deep_idx ON public.ai_usage_events(user_id,created_at DESC) WHERE mode='deep';

-- Same as 20261018200000_ai_course_rag.sql plus p_mode (a new argument changes the signature, so drop first).
DROP FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text,text);
CREATE FUNCTION public.learner_ai_begin_turn(p_conversation_id uuid DEFAULT NULL,p_course_id uuid DEFAULT NULL,p_locale text DEFAULT NULL,p_content text DEFAULT NULL,p_kind text DEFAULT 'general',p_mode text DEFAULT 'fast')
RETURNS TABLE(conversation_id uuid,message_id uuid,created boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_content text:=btrim(coalesce(p_content,'')); v_conversation uuid; v_message uuid; v_count integer; v_kind text; v_course uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 IF p_kind IS NULL OR p_kind NOT IN('general','course') THEN RAISE EXCEPTION 'invalid kind' USING ERRCODE='22023';END IF;
 IF p_mode IS NULL OR p_mode NOT IN('fast','deep') THEN RAISE EXCEPTION 'invalid mode' USING ERRCODE='22023';END IF;
 IF char_length(v_content) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid message' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('ai:'||actor::text));
 IF (SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at>now()-interval '1 minute')>=6 THEN RAISE EXCEPTION 'ai_rate_minute' USING ERRCODE='54000';END IF;
 IF (SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at>now()-interval '1 day')>=150 THEN RAISE EXCEPTION 'ai_rate_daily' USING ERRCODE='54000';END IF;
 IF p_mode='deep' AND (SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND mode='deep' AND created_at>now()-interval '1 day')>=10 THEN RAISE EXCEPTION 'ai_rate_deep' USING ERRCODE='54000';END IF;
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
 INSERT INTO public.ai_usage_events(user_id,course_id,mode) VALUES(actor,v_course,p_mode);
 conversation_id:=v_conversation; message_id:=v_message;
 RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text,text,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
