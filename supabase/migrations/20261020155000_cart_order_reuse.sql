-- Cart checkout refinements.
-- 1. A learner who edits the cart and checks out again reuses their open, not-yet-paid cart order
--    (items replaced, coupon cleared) instead of creating a new order each time and hitting the
--    10-orders-per-hour limit.
-- 2. Order items keep the cart order for display.
-- 3. "Buy now" (learner_create_order) only reuses a one-course order, never a multi-course cart order.
ALTER TABLE public.orders ADD COLUMN kind text NOT NULL DEFAULT 'course' CHECK (kind IN ('course','cart'));
ALTER TABLE public.order_items ADD COLUMN position smallint NOT NULL DEFAULT 0 CHECK (position BETWEEN 0 AND 99);
-- Pending multi-item orders created before this migration came from the cart.
UPDATE public.orders o SET kind='cart' WHERE (SELECT count(*) FROM public.order_items i WHERE i.order_id=o.id)>1;

-- Same as 20261018150000 except the reuse lookup requires a single-item order.
CREATE OR REPLACE FUNCTION public.learner_create_order(p_course_id uuid,p_locale text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); c public.courses; title text; oid uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('checkout:'||actor::text||':'||p_course_id::text));
 SELECT * INTO c FROM public.courses WHERE id=p_course_id AND status='published' AND price_minor>0 FOR UPDATE;
 SELECT ct.title INTO title FROM public.course_translations ct WHERE ct.course_id=p_course_id AND ct.locale=p_locale AND ct.publication_status='published';
 IF c.id IS NULL OR title IS NULL THEN RAISE EXCEPTION 'paid published course not found' USING ERRCODE='P0002';END IF;
 IF EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=actor AND e.course_id=p_course_id AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())) THEN RAISE EXCEPTION 'already enrolled' USING ERRCODE='23514';END IF;
 SELECT o.id INTO oid FROM public.orders o JOIN public.order_items i ON i.order_id=o.id
  WHERE o.user_id=actor AND o.kind='course' AND i.course_id=p_course_id AND o.status='pending' AND o.expires_at>now()
  ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NOT NULL THEN RETURN oid;END IF;
 IF (SELECT count(*) FROM public.orders o WHERE o.user_id=actor AND o.created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'checkout limit' USING ERRCODE='54000';END IF;
 INSERT INTO public.orders(user_id,subtotal_minor,total_minor,locale) VALUES(actor,c.price_minor,c.price_minor,p_locale) RETURNING id INTO oid;
 INSERT INTO public.order_items(order_id,course_id,title,amount_minor) VALUES(oid,c.id,title,c.price_minor);
 INSERT INTO public.payments(order_id) VALUES(oid);
 RETURN oid;
END $$;

CREATE OR REPLACE FUNCTION public.learner_create_cart_order(p_course_ids uuid[],p_locale text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_ids uuid[]; v_sorted uuid[]; v_count int; v_found int; v_subtotal bigint; v_id uuid; oid uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 SELECT array_agg(s.x ORDER BY s.pos) INTO v_ids FROM (SELECT u.x,min(u.pos) pos FROM unnest(p_course_ids) WITH ORDINALITY u(x,pos) WHERE u.x IS NOT NULL GROUP BY u.x) s;
 v_count:=coalesce(cardinality(v_ids),0);
 IF v_count NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid cart' USING ERRCODE='22023';END IF;
 SELECT array_agg(x ORDER BY x) INTO v_sorted FROM unnest(v_ids) x;
 FOREACH v_id IN ARRAY v_sorted LOOP
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('checkout:'||actor::text||':'||v_id::text));
 END LOOP;
 PERFORM 1 FROM public.courses WHERE id=ANY(v_sorted) ORDER BY id FOR UPDATE;
 SELECT count(*),sum(c.price_minor) INTO v_found,v_subtotal FROM public.courses c
  JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale AND ct.publication_status='published'
  WHERE c.id=ANY(v_sorted) AND c.status='published' AND c.price_minor>0;
 IF v_found<>v_count THEN RAISE EXCEPTION 'paid published course not found' USING ERRCODE='P0002';END IF;
 IF EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=actor AND e.course_id=ANY(v_sorted) AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())) THEN RAISE EXCEPTION 'already enrolled' USING ERRCODE='23514';END IF;
 -- Same courses: reuse the open order as it is (it may already carry a coupon or a payment session).
 SELECT o.id INTO oid FROM public.orders o WHERE o.user_id=actor AND o.kind='cart' AND o.status='pending' AND o.expires_at>now()
  AND (SELECT array_agg(i.course_id ORDER BY i.course_id) FROM public.order_items i WHERE i.order_id=o.id)=v_sorted
  ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NOT NULL THEN RETURN oid;END IF;
 -- Different courses: rewrite the latest open cart order that has no payment session yet. A bound
 -- session has a fixed amount, so such an order is left alone and a new one is created instead.
 SELECT o.id INTO oid FROM public.orders o JOIN public.payments p ON p.order_id=o.id
  WHERE o.user_id=actor AND o.kind='cart' AND o.status='pending' AND o.expires_at>now() AND p.session_id IS NULL
  ORDER BY o.created_at DESC LIMIT 1 FOR UPDATE OF o;
 IF oid IS NOT NULL THEN
  DELETE FROM public.order_items WHERE order_id=oid;
  -- Coupon eligibility depends on the items, so it is cleared; the per-order attempt counter is kept.
  UPDATE public.orders SET subtotal_minor=v_subtotal,discount_minor=0,coupon_id=NULL,coupon_code=NULL,total_minor=v_subtotal,expires_at=now()+interval '30 minutes' WHERE id=oid;
 ELSE
  IF (SELECT count(*) FROM public.orders o WHERE o.user_id=actor AND o.created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'checkout limit' USING ERRCODE='54000';END IF;
  INSERT INTO public.orders(user_id,subtotal_minor,total_minor,locale,kind) VALUES(actor,v_subtotal,v_subtotal,p_locale,'cart') RETURNING id INTO oid;
  INSERT INTO public.payments(order_id) VALUES(oid);
 END IF;
 UPDATE public.orders SET locale=p_locale WHERE id=oid AND locale<>p_locale;
 INSERT INTO public.order_items(order_id,course_id,title,amount_minor,position)
  SELECT oid,c.id,ct.title,c.price_minor,(u.pos-1)::smallint FROM unnest(v_ids) WITH ORDINALITY u(x,pos)
  JOIN public.courses c ON c.id=u.x JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale
  ORDER BY u.pos;
 RETURN oid;
END $$;
