-- AI learning assistant: owner-scoped saved conversations plus a private usage ledger for rate limits.
-- Learners read and delete their own conversations directly (RLS). Every write goes through the
-- learner_ai_* functions below, which check the caller, enforce limits server-side and verify course
-- entitlement before a course is attached as context. The ledger survives conversation deletion, so
-- deleting history never resets a rate limit. Provider keys and model calls stay in the Next.js server.
CREATE TABLE public.ai_conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
 title text NOT NULL CHECK (title=btrim(title) AND char_length(title) BETWEEN 1 AND 120),
 locale text NOT NULL CHECK (locale IN ('en','ar')),
 -- Plain-text start of the latest reply for the history list (avoids loading messages per row).
 preview text NOT NULL DEFAULT '' CHECK (char_length(preview)<=160),
 message_count integer NOT NULL DEFAULT 0 CHECK (message_count BETWEEN 0 AND 400),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_conversations_owner_recent_idx ON public.ai_conversations(user_id,updated_at DESC);
CREATE INDEX ai_conversations_course_idx ON public.ai_conversations(course_id) WHERE course_id IS NOT NULL;

CREATE TABLE public.ai_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('user','assistant')),
 content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 32000),
 -- 'stopped': the learner cancelled or the output limit was reached, so the reply is partial.
 status text NOT NULL DEFAULT 'complete' CHECK (status IN ('complete','stopped')),
 model text CHECK (model IS NULL OR model ~ '^[a-z0-9][a-z0-9.-]{1,63}$'),
 input_tokens integer CHECK (input_tokens IS NULL OR input_tokens>=0),
 output_tokens integer CHECK (output_tokens IS NULL OR output_tokens>=0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT ai_messages_role_shape_check CHECK (role='assistant' OR (model IS NULL AND status='complete'))
);
CREATE INDEX ai_messages_conversation_idx ON public.ai_messages(conversation_id,created_at);

CREATE TABLE public.ai_usage_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_events_owner_time_idx ON public.ai_usage_events(user_id,created_at DESC);
CREATE INDEX ai_usage_events_course_idx ON public.ai_usage_events(course_id) WHERE course_id IS NOT NULL;

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_conversations,public.ai_messages,public.ai_usage_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT ON public.ai_messages TO authenticated;
CREATE POLICY ai_conversations_owner_read ON public.ai_conversations FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY ai_conversations_owner_delete ON public.ai_conversations FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY ai_messages_owner_read ON public.ai_messages FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.ai_conversations c WHERE c.id=conversation_id AND c.user_id=(SELECT auth.uid())));

-- Starts one learner turn atomically: limits, optional entitled course context, conversation and user message.
-- Limits: 6 questions per minute, 150 per day, 200 messages per conversation (54000 with a stable message).
CREATE FUNCTION public.learner_ai_begin_turn(p_conversation_id uuid,p_course_id uuid,p_locale text,p_content text)
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

-- Saves the assistant reply for the caller's own conversation. Exactly one reply may follow a learner
-- message, so a caller cannot append replies freely; the text only ever lands in their own history.
CREATE FUNCTION public.learner_ai_complete_turn(p_conversation_id uuid,p_content text,p_status text,p_model text,p_input_tokens integer,p_output_tokens integer)
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

CREATE FUNCTION public.learner_ai_rename_conversation(p_conversation_id uuid,p_title text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_title text:=btrim(regexp_replace(coalesce(p_title,''),'\s+',' ','g'));BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF char_length(v_title) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid title' USING ERRCODE='22023';END IF;
 UPDATE public.ai_conversations SET title=v_title WHERE id=p_conversation_id AND user_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'conversation not found' USING ERRCODE='P0002';END IF;
END $$;

-- The caller's own assistant activity: questions in the last 7 days versus the 7 before, plus totals.
CREATE FUNCTION public.learner_ai_insights() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object(
  'questions',(SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor),
  'questionsThisWeek',(SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at>now()-interval '7 days'),
  'questionsLastWeek',(SELECT count(*) FROM public.ai_usage_events WHERE user_id=actor AND created_at<=now()-interval '7 days' AND created_at>now()-interval '14 days'),
  'conversations',(SELECT count(*) FROM public.ai_conversations WHERE user_id=actor),
  'sessions',(SELECT count(DISTINCT (created_at AT TIME ZONE 'UTC')::date) FROM public.ai_usage_events WHERE user_id=actor));
END $$;

REVOKE ALL ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text),public.learner_ai_complete_turn(uuid,text,text,text,integer,integer),public.learner_ai_rename_conversation(uuid,text),public.learner_ai_insights() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_ai_begin_turn(uuid,uuid,text,text),public.learner_ai_complete_turn(uuid,text,text,text,integer,integer),public.learner_ai_rename_conversation(uuid,text),public.learner_ai_insights() TO authenticated;
