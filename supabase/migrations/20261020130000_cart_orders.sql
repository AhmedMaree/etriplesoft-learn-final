-- Shopping cart checkout: one server-priced order for several courses. The browser cart only holds
-- course ids; price, title snapshot, publication and ownership checks all happen here, as in
-- learner_create_order. Settlement (commerce_confirm_order) already grants one enrollment per item.
CREATE FUNCTION public.learner_create_cart_order(p_course_ids uuid[],p_locale text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_ids uuid[]; v_sorted uuid[]; v_count int; v_found int; v_subtotal bigint; v_id uuid; oid uuid;BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF p_locale IS NULL OR p_locale NOT IN('en','ar') THEN RAISE EXCEPTION 'invalid locale' USING ERRCODE='22023';END IF;
 -- Distinct ids in cart order (first occurrence wins).
 SELECT array_agg(s.x ORDER BY s.pos) INTO v_ids FROM (SELECT u.x,min(u.pos) pos FROM unnest(p_course_ids) WITH ORDINALITY u(x,pos) WHERE u.x IS NOT NULL GROUP BY u.x) s;
 v_count:=coalesce(cardinality(v_ids),0);
 IF v_count NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid cart' USING ERRCODE='22023';END IF;
 SELECT array_agg(x ORDER BY x) INTO v_sorted FROM unnest(v_ids) x;
 -- Same per-course locks as learner_create_order, taken in a stable order so concurrent carts cannot deadlock.
 FOREACH v_id IN ARRAY v_sorted LOOP
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('checkout:'||actor::text||':'||v_id::text));
 END LOOP;
 PERFORM 1 FROM public.courses WHERE id=ANY(v_sorted) ORDER BY id FOR UPDATE;
 SELECT count(*),sum(c.price_minor) INTO v_found,v_subtotal FROM public.courses c
  JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale AND ct.publication_status='published'
  WHERE c.id=ANY(v_sorted) AND c.status='published' AND c.price_minor>0;
 IF v_found<>v_count THEN RAISE EXCEPTION 'paid published course not found' USING ERRCODE='P0002';END IF;
 IF EXISTS(SELECT 1 FROM public.enrollments e WHERE e.user_id=actor AND e.course_id=ANY(v_sorted) AND e.status IN('active','completed') AND (e.expires_at IS NULL OR e.expires_at>now())) THEN RAISE EXCEPTION 'already enrolled' USING ERRCODE='23514';END IF;
 -- Returning to checkout with the same cart reuses the open order instead of creating another.
 SELECT o.id INTO oid FROM public.orders o WHERE o.user_id=actor AND o.status='pending' AND o.expires_at>now()
  AND (SELECT array_agg(i.course_id ORDER BY i.course_id) FROM public.order_items i WHERE i.order_id=o.id)=v_sorted
  ORDER BY o.created_at DESC LIMIT 1;
 IF oid IS NOT NULL THEN RETURN oid;END IF;
 IF (SELECT count(*) FROM public.orders o WHERE o.user_id=actor AND o.created_at>now()-interval '1 hour')>=10 THEN RAISE EXCEPTION 'checkout limit' USING ERRCODE='54000';END IF;
 INSERT INTO public.orders(user_id,subtotal_minor,total_minor,locale) VALUES(actor,v_subtotal,v_subtotal,p_locale) RETURNING id INTO oid;
 INSERT INTO public.order_items(order_id,course_id,title,amount_minor)
  SELECT oid,c.id,ct.title,c.price_minor FROM unnest(v_ids) WITH ORDINALITY u(x,pos)
  JOIN public.courses c ON c.id=u.x JOIN public.course_translations ct ON ct.course_id=c.id AND ct.locale=p_locale
  ORDER BY u.pos;
 INSERT INTO public.payments(order_id) VALUES(oid);
 RETURN oid;
END $$;
REVOKE ALL ON FUNCTION public.learner_create_cart_order(uuid[],text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_create_cart_order(uuid[],text) TO authenticated;
