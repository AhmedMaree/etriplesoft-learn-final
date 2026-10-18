-- Allow Kashier live-mode session URLs in addition to test mode.
-- The application selects the mode (KASHIER_MODE); the database still pins the exact
-- host and path, so only a hosted Kashier session for the bound session id is accepted.
CREATE OR REPLACE FUNCTION public.commerce_bind_session(p_id uuid,p_session_id text,p_url text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.orders WHERE id=p_id AND status='pending' AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR p_session_id IS NULL OR p_url IS NULL OR p_session_id !~ '^[a-f0-9]{24}$'
    OR p_url NOT IN ('https://payments.kashier.io/session/'||p_session_id||'?mode=test',
                     'https://payments.kashier.io/session/'||p_session_id||'?mode=live') THEN
  RAISE EXCEPTION 'invalid session' USING ERRCODE='23514';
 END IF;
 UPDATE public.payments SET session_id=p_session_id,session_url=p_url WHERE order_id=p_id AND (session_id IS NULL OR session_id=p_session_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'session already bound' USING ERRCODE='23514';END IF;
END $$;
