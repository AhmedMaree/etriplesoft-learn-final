-- Sandbox preparation: server-priced orders, private provider records and settlement authority.
CREATE TABLE public.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','paid','refunded')),
 currency text NOT NULL DEFAULT 'EGP' CHECK(currency='EGP'), total_minor bigint NOT NULL CHECK(total_minor>0 AND total_minor<=999999999),
 locale text NOT NULL CHECK(locale IN('en','ar')), created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '30 minutes'
);
CREATE INDEX orders_owner_created_idx ON public.orders(user_id,created_at DESC);
CREATE TABLE public.order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT, title text NOT NULL,
 amount_minor bigint NOT NULL CHECK(amount_minor>0), UNIQUE(order_id,course_id)
);
CREATE INDEX order_items_course_idx ON public.order_items(course_id);
CREATE TABLE public.payments (
 order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE RESTRICT,
 session_id text UNIQUE, session_url text, provider_order_id text UNIQUE,
 confirmed_at timestamptz, refunded_at timestamptz,
 CHECK((session_id IS NULL)=(session_url IS NULL))
);
CREATE TABLE public.payment_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
 event_key text NOT NULL UNIQUE CHECK(length(event_key) BETWEEN 1 AND 200), result text NOT NULL CHECK(result IN('paid','refunded')),
 amount_minor bigint NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.orders,public.order_items,public.payments,public.payment_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.orders,public.order_items TO authenticated;
CREATE POLICY orders_owner_read ON public.orders FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY order_items_owner_read ON public.order_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=(SELECT auth.uid())));
ALTER TABLE public.enrollments ADD COLUMN order_item_id uuid UNIQUE REFERENCES public.order_items(id) ON DELETE RESTRICT;
ALTER TABLE public.enrollments ADD COLUMN refund_confirmed_at timestamptz;
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_source_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_source_check CHECK(grant_source IN('free','admin','paid'));
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_payment_source_check CHECK((grant_source='paid')=(order_item_id IS NOT NULL));
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_status_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_status_check CHECK(status IN('active','completed','revoked','expired','refunded'));
ALTER TABLE public.enrollments DROP CONSTRAINT enrollments_lifecycle_check;
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_lifecycle_check CHECK(
 (status<>'completed' OR completed_at IS NOT NULL) AND (status IN('completed','revoked','expired','refunded') OR completed_at IS NULL)
 AND (status='revoked')=(revoked_at IS NOT NULL AND revoked_by IS NOT NULL) AND (revoked_at IS NULL)=(revoked_by IS NULL)
 AND (status='refunded')=(refund_confirmed_at IS NOT NULL) AND (refund_confirmed_at IS NULL OR grant_source='paid')
);
CREATE FUNCTION public.learner_create_order(p_course_id uuid,p_locale text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); c public.courses; title text; oid uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('checkout:'||actor::text||':'||p_course_id::text));
 SELECT * INTO c FROM public.courses WHERE id=p_course_id AND status='published' AND price_minor>0 FOR UPDATE;
 SELECT ct.title INTO title FROM public.course_translations ct WHERE ct.course_id=p_course_id AND ct.locale=p_locale AND ct.publication_status='published';
 IF c.id IS NULL OR title IS NULL THEN RAISE EXCEPTION 'paid published course not found' USING ERRCODE='P0002';END IF;
 IF EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=actor AND e.course_id=p_course_id AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())) THEN RAISE EXCEPTION 'already enrolled' USING ERRCODE='23514';END IF;
 SELECT o.id INTO oid FROM public.orders o JOIN public.order_items i ON i.order_id=o.id WHERE o.user_id=actor AND i.course_id=p_course_id AND o.status='pending' AND o.expires_at>now() ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NOT NULL THEN RETURN oid;END IF;
 IF (SELECT count(*) FROM public.orders o WHERE o.user_id=actor AND o.created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'checkout limit' USING ERRCODE='54000';END IF;
 INSERT INTO public.orders(user_id,total_minor,locale) VALUES(actor,c.price_minor,p_locale) RETURNING id INTO oid;
 INSERT INTO public.order_items(order_id,course_id,title,amount_minor) VALUES(oid,c.id,title,c.price_minor);
 INSERT INTO public.payments(order_id) VALUES(oid);
 RETURN oid;
END $$;
CREATE FUNCTION public.commerce_get_order(p_id uuid) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',o.id,'userId',o.user_id,'status',o.status,'total',o.total_minor,'currency',o.currency,'locale',o.locale,'expires',o.expires_at,'sessionId',p.session_id,'sessionUrl',p.session_url,'providerOrderId',p.provider_order_id)
 FROM public.orders o JOIN public.payments p ON p.order_id=o.id WHERE o.id=p_id
$$;
CREATE FUNCTION public.commerce_bind_session(p_id uuid,p_session_id text,p_url text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.orders WHERE id=p_id AND status='pending' AND expires_at>now() FOR UPDATE;
 IF NOT FOUND OR p_session_id IS NULL OR p_url IS NULL OR p_session_id !~ '^[a-f0-9]{24}$' OR p_url <> 'https://payments.kashier.io/session/'||p_session_id||'?mode=test' THEN RAISE EXCEPTION 'invalid session' USING ERRCODE='23514';END IF;
 UPDATE public.payments SET session_id=p_session_id,session_url=p_url WHERE order_id=p_id AND (session_id IS NULL OR session_id=p_session_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'session already bound' USING ERRCODE='23514';END IF;
END $$;
-- Only the trusted provider adapter can call this, after independently fetching provider order state.
CREATE FUNCTION public.commerce_confirm_order(p_id uuid,p_session_id text,p_provider_order_id text,p_amount bigint,p_currency text,p_result text,p_event_key text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; p public.payments; i public.order_items;BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_id FOR UPDATE;
 SELECT * INTO p FROM public.payments WHERE order_id=p_id FOR UPDATE;
 IF o.id IS NULL OR p.session_id IS DISTINCT FROM p_session_id OR p_session_id IS NULL OR p_amount IS DISTINCT FROM o.total_minor OR p_currency IS DISTINCT FROM o.currency OR p_result IS NULL OR p_result NOT IN('paid','refunded') OR p_provider_order_id IS NULL OR length(p_provider_order_id) NOT BETWEEN 1 AND 100 OR (p.provider_order_id IS NOT NULL AND p.provider_order_id<>p_provider_order_id) THEN RAISE EXCEPTION 'payment mismatch' USING ERRCODE='23514';END IF;
 INSERT INTO public.payment_events(order_id,event_key,result,amount_minor) VALUES(o.id,p_event_key,p_result,p_amount) ON CONFLICT(event_key) DO NOTHING;
 IF NOT FOUND THEN RETURN;END IF;
 UPDATE public.payments SET provider_order_id=p_provider_order_id,confirmed_at=coalesce(confirmed_at,now()) WHERE order_id=o.id;
 IF p_result='refunded' THEN
  UPDATE public.orders SET status='refunded' WHERE id=o.id;
  UPDATE public.payments SET refunded_at=coalesce(refunded_at,now()) WHERE order_id=o.id;
  UPDATE public.enrollments e SET status='refunded',refund_confirmed_at=now(),revoked_at=NULL,revoked_by=NULL FROM public.order_items oi WHERE e.order_item_id=oi.id AND oi.order_id=o.id AND e.status<>'refunded';
  RETURN;
 END IF;
 IF o.status='refunded' THEN RETURN;END IF;
 UPDATE public.orders SET status='paid' WHERE id=o.id;
 FOR i IN SELECT * FROM public.order_items WHERE order_id=o.id LOOP
  PERFORM 1 FROM public.courses WHERE id=i.course_id FOR UPDATE;
  UPDATE public.enrollments SET status='expired' WHERE user_id=o.user_id AND course_id=i.course_id AND status='active' AND expires_at<=now();
  IF NOT EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=o.user_id AND e.course_id=i.course_id AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())) AND NOT EXISTS(SELECT 1 FROM public.enrollments e WHERE e.order_item_id=i.id) THEN
   INSERT INTO public.enrollments(user_id,course_id,grant_source,granted_by,order_item_id) VALUES(o.user_id,i.course_id,'paid',o.user_id,i.id);
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.learner_create_order(uuid,text),public.commerce_get_order(uuid),public.commerce_bind_session(uuid,text,text),public.commerce_confirm_order(uuid,text,text,bigint,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_create_order(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commerce_get_order(uuid),public.commerce_bind_session(uuid,text,text),public.commerce_confirm_order(uuid,text,text,bigint,text,text,text) TO service_role;
