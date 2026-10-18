-- Checkout: administrator-managed coupons, an order price breakdown and a billing-contact snapshot.
-- Discounts are computed only here from the stored price snapshot; the browser submits a code, never an amount.
CREATE TABLE public.coupons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
 percent_off smallint CHECK (percent_off BETWEEN 1 AND 99),
 amount_off_minor bigint CHECK (amount_off_minor BETWEEN 1 AND 999999999),
 course_id uuid REFERENCES public.courses(id) ON DELETE RESTRICT,
 max_redemptions integer CHECK (max_redemptions BETWEEN 1 AND 100000),
 expires_at timestamptz,
 is_active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT coupons_one_discount_check CHECK ((percent_off IS NULL) <> (amount_off_minor IS NULL))
);
CREATE INDEX coupons_course_idx ON public.coupons(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX coupons_creator_idx ON public.coupons(created_by);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coupons FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE public.orders
 ADD COLUMN subtotal_minor bigint,
 ADD COLUMN discount_minor bigint NOT NULL DEFAULT 0 CHECK (discount_minor>=0),
 ADD COLUMN coupon_id uuid REFERENCES public.coupons(id) ON DELETE RESTRICT,
 ADD COLUMN coupon_code text,
 ADD COLUMN coupon_attempts smallint NOT NULL DEFAULT 0 CHECK (coupon_attempts BETWEEN 0 AND 10),
 ADD COLUMN billing_name text CHECK (billing_name IS NULL OR (billing_name=btrim(billing_name) AND char_length(billing_name) BETWEEN 2 AND 120)),
 ADD COLUMN billing_country text CHECK (billing_country IS NULL OR billing_country ~ '^[A-Z]{2}$'),
 ADD COLUMN billing_phone text CHECK (billing_phone IS NULL OR billing_phone ~ '^\+[1-9][0-9]{6,14}$');
UPDATE public.orders SET subtotal_minor=total_minor;
ALTER TABLE public.orders
 ALTER COLUMN subtotal_minor SET NOT NULL,
 ADD CONSTRAINT orders_amounts_check CHECK (total_minor=subtotal_minor-discount_minor),
 ADD CONSTRAINT orders_coupon_shape_check CHECK ((coupon_id IS NULL)=(coupon_code IS NULL) AND (coupon_id IS NOT NULL OR discount_minor=0));
CREATE INDEX orders_coupon_idx ON public.orders(coupon_id,status) WHERE coupon_id IS NOT NULL;

-- Typed audit target for coupon administration (same extension pattern as certificates).
ALTER TABLE public.admin_audit_log ADD COLUMN coupon_id uuid REFERENCES public.coupons(id) ON DELETE RESTRICT;
CREATE INDEX admin_audit_coupon_idx ON public.admin_audit_log(coupon_id) WHERE coupon_id IS NOT NULL;
DO $$ DECLARE expr text; BEGIN
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_action_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_action_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_action_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR action IN (''coupon.created'',''coupon.activated'',''coupon.deactivated''))';
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_target_type_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_target_type_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_type_check CHECK ('||substring(expr FROM 8 FOR length(expr)-8)||' OR target_type=''coupon'')';
 SELECT pg_get_constraintdef(oid) INTO expr FROM pg_constraint WHERE conrelid='public.admin_audit_log'::regclass AND conname='admin_audit_log_target_shape_check';
 ALTER TABLE public.admin_audit_log DROP CONSTRAINT admin_audit_log_target_shape_check;
 EXECUTE 'ALTER TABLE public.admin_audit_log ADD CONSTRAINT admin_audit_log_target_shape_check CHECK (('||substring(expr FROM 8 FOR length(expr)-8)||') AND coupon_id IS NULL OR (target_type=''coupon'' AND coupon_id IS NOT NULL AND user_role_id IS NULL AND accessed_user_id IS NULL AND course_id IS NULL AND module_id IS NULL AND lesson_id IS NULL AND lesson_resource_id IS NULL AND enrollment_id IS NULL AND lesson_video_id IS NULL AND certificate_id IS NULL))';
END $$;

-- Unchanged behavior; the subtotal snapshot is now stored alongside the total.
CREATE OR REPLACE FUNCTION public.learner_create_order(p_course_id uuid,p_locale text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
 INSERT INTO public.orders(user_id,subtotal_minor,total_minor,locale) VALUES(actor,c.price_minor,c.price_minor,p_locale) RETURNING id INTO oid;
 INSERT INTO public.order_items(order_id,course_id,title,amount_minor) VALUES(oid,c.id,title,c.price_minor);
 INSERT INTO public.payments(order_id) VALUES(oid);
 RETURN oid;
END $$;

-- Locks the caller's own editable order: pending, unexpired and not yet bound to a provider session
-- (a bound Kashier session has a fixed amount, so the price can no longer change).
CREATE FUNCTION public.checkout_lock_editable_order(p_order_id uuid) RETURNS public.orders LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders;BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND user_id=auth.uid() FOR UPDATE;
 IF o.id IS NULL THEN RAISE EXCEPTION 'order not found' USING ERRCODE='P0002';END IF;
 IF o.status<>'pending' OR o.expires_at<=now() THEN RAISE EXCEPTION 'order closed' USING ERRCODE='55000';END IF;
 RETURN o;
END $$;

-- Returns an outcome instead of raising for a rejected code so the attempt counter persists.
CREATE FUNCTION public.learner_apply_coupon(p_order_id uuid,p_code text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders:=public.checkout_lock_editable_order(p_order_id); c public.coupons; v_code text:=upper(btrim(coalesce(p_code,''))); v_base bigint; v_discount bigint;BEGIN
 IF EXISTS(SELECT 1 FROM public.payments WHERE order_id=o.id AND session_id IS NOT NULL) THEN RETURN jsonb_build_object('ok',false,'reason','locked');END IF;
 IF o.coupon_attempts>=10 THEN RETURN jsonb_build_object('ok',false,'reason','limit');END IF;
 UPDATE public.orders SET coupon_attempts=coupon_attempts+1 WHERE id=o.id;
 IF v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' THEN RETURN jsonb_build_object('ok',false,'reason','invalid');END IF;
 SELECT * INTO c FROM public.coupons WHERE code=v_code FOR UPDATE;
 IF c.id IS NULL OR NOT c.is_active OR (c.expires_at IS NOT NULL AND c.expires_at<=now()) THEN RETURN jsonb_build_object('ok',false,'reason','invalid');END IF;
 IF c.course_id IS NULL THEN v_base:=o.subtotal_minor;
 ELSE SELECT amount_minor INTO v_base FROM public.order_items WHERE order_id=o.id AND course_id=c.course_id;END IF;
 IF v_base IS NULL THEN RETURN jsonb_build_object('ok',false,'reason','notApplicable');END IF;
 IF EXISTS(SELECT 1 FROM public.orders x WHERE x.user_id=o.user_id AND x.coupon_id=c.id AND x.status IN('paid','refunded')) THEN RETURN jsonb_build_object('ok',false,'reason','used');END IF;
 -- Pending unexpired orders reserve a redemption so concurrent checkouts cannot exceed the limit.
 IF c.max_redemptions IS NOT NULL AND (SELECT count(*) FROM public.orders x WHERE x.coupon_id=c.id AND x.id<>o.id AND (x.status='paid' OR (x.status='pending' AND x.expires_at>now())))>=c.max_redemptions THEN RETURN jsonb_build_object('ok',false,'reason','exhausted');END IF;
 v_discount:=CASE WHEN c.percent_off IS NOT NULL THEN (v_base*c.percent_off)/100 ELSE least(c.amount_off_minor,v_base) END;
 -- A paid checkout must still charge something; free access remains a separate, audited grant.
 IF v_discount<1 OR o.subtotal_minor-v_discount<1 THEN RETURN jsonb_build_object('ok',false,'reason','notApplicable');END IF;
 UPDATE public.orders SET coupon_id=c.id,coupon_code=c.code,discount_minor=v_discount,total_minor=subtotal_minor-v_discount WHERE id=o.id;
 RETURN jsonb_build_object('ok',true,'code',c.code,'discount',v_discount,'total',o.subtotal_minor-v_discount);
END $$;

CREATE FUNCTION public.learner_remove_coupon(p_order_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders:=public.checkout_lock_editable_order(p_order_id);BEGIN
 IF EXISTS(SELECT 1 FROM public.payments WHERE order_id=o.id AND session_id IS NOT NULL) THEN RAISE EXCEPTION 'payment already started' USING ERRCODE='55000';END IF;
 UPDATE public.orders SET coupon_id=NULL,coupon_code=NULL,discount_minor=0,total_minor=subtotal_minor WHERE id=o.id;
END $$;

-- Billing contact snapshot for the receipt; it never affects price or entitlement.
CREATE FUNCTION public.learner_set_order_billing(p_order_id uuid,p_name text,p_country text,p_phone text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders:=public.checkout_lock_editable_order(p_order_id); v_name text:=btrim(coalesce(p_name,''));BEGIN
 IF char_length(v_name) NOT BETWEEN 2 AND 120 OR coalesce(p_country,'') !~ '^[A-Z]{2}$' OR coalesce(p_phone,'') !~ '^\+[1-9][0-9]{6,14}$' THEN RAISE EXCEPTION 'invalid billing details' USING ERRCODE='22023';END IF;
 UPDATE public.orders SET billing_name=v_name,billing_country=p_country,billing_phone=p_phone WHERE id=o.id;
END $$;

CREATE FUNCTION public.admin_list_coupons() RETURNS TABLE(id uuid,code text,percent_off smallint,amount_off_minor bigint,course_slug text,max_redemptions integer,redemptions bigint,expires_at timestamptz,is_active boolean,created_at timestamptz) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.assert_active_admin();
 RETURN QUERY SELECT c.id,c.code,c.percent_off,c.amount_off_minor,co.slug,c.max_redemptions,
  (SELECT count(*) FROM public.orders o WHERE o.coupon_id=c.id AND o.status='paid'),c.expires_at,c.is_active,c.created_at
 FROM public.coupons c LEFT JOIN public.courses co ON co.id=c.course_id ORDER BY c.created_at DESC LIMIT 200;
END $$;

CREATE FUNCTION public.admin_create_coupon(p_code text,p_percent_off integer,p_amount_off_minor bigint,p_course_slug text,p_max_redemptions integer,p_expires_at timestamptz) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); v_code text:=upper(btrim(coalesce(p_code,''))); v_course uuid; v_id uuid;BEGIN
 IF v_code !~ '^[A-Z0-9][A-Z0-9_-]{2,31}$' OR ((p_percent_off IS NULL)=(p_amount_off_minor IS NULL)) OR (p_expires_at IS NOT NULL AND p_expires_at<=now()) THEN RAISE EXCEPTION 'invalid coupon' USING ERRCODE='22023';END IF;
 IF nullif(btrim(coalesce(p_course_slug,'')),'') IS NOT NULL THEN
  SELECT c.id INTO v_course FROM public.courses c WHERE c.slug=btrim(p_course_slug);
  IF v_course IS NULL THEN RAISE EXCEPTION 'course not found' USING ERRCODE='P0002';END IF;
 END IF;
 INSERT INTO public.coupons(code,percent_off,amount_off_minor,course_id,max_redemptions,expires_at,created_by)
  VALUES(v_code,p_percent_off,p_amount_off_minor,v_course,p_max_redemptions,p_expires_at,actor) RETURNING id INTO v_id;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,coupon_id,safe_summary) VALUES(actor,'coupon.created','coupon',v_id,'Created coupon '||v_code);
 RETURN v_id;
END $$;

CREATE FUNCTION public.admin_set_coupon_active(p_id uuid,p_active boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=public.assert_active_admin(); v_code text;BEGIN
 IF p_active IS NULL THEN RAISE EXCEPTION 'invalid coupon state' USING ERRCODE='22023';END IF;
 UPDATE public.coupons SET is_active=p_active WHERE id=p_id AND is_active<>p_active RETURNING code INTO v_code;
 IF v_code IS NULL THEN
  IF NOT EXISTS(SELECT 1 FROM public.coupons WHERE id=p_id) THEN RAISE EXCEPTION 'coupon not found' USING ERRCODE='P0002';END IF;
  RETURN;
 END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target_type,coupon_id,safe_summary)
  VALUES(actor,CASE WHEN p_active THEN 'coupon.activated' ELSE 'coupon.deactivated' END,'coupon',p_id,CASE WHEN p_active THEN 'Activated' ELSE 'Deactivated' END||' coupon '||v_code);
END $$;

REVOKE ALL ON FUNCTION public.checkout_lock_editable_order(uuid),public.learner_apply_coupon(uuid,text),public.learner_remove_coupon(uuid),public.learner_set_order_billing(uuid,text,text,text),public.admin_list_coupons(),public.admin_create_coupon(text,integer,bigint,text,integer,timestamptz),public.admin_set_coupon_active(uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_apply_coupon(uuid,text),public.learner_remove_coupon(uuid),public.learner_set_order_billing(uuid,text,text,text),public.admin_list_coupons(),public.admin_create_coupon(text,integer,bigint,text,integer,timestamptz),public.admin_set_coupon_active(uuid,boolean) TO authenticated;

-- Binding now also pins the amount the provider session was created for. Coupon changes lock the same
-- order row, so a coupon applied or removed while a session is being created makes the bind fail
-- instead of leaving a provider session whose amount no longer matches the order.
DROP FUNCTION public.commerce_bind_session(uuid,text,text);
CREATE FUNCTION public.commerce_bind_session(p_id uuid,p_session_id text,p_url text,p_amount bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.orders WHERE id=p_id AND status='pending' AND expires_at>now() AND total_minor=p_amount FOR UPDATE;
 IF NOT FOUND OR p_session_id IS NULL OR p_url IS NULL OR p_session_id !~ '^[a-f0-9]{24}$'
    OR p_url NOT IN ('https://payments.kashier.io/session/'||p_session_id||'?mode=test',
                     'https://payments.kashier.io/session/'||p_session_id||'?mode=live') THEN
  RAISE EXCEPTION 'invalid session' USING ERRCODE='23514';
 END IF;
 UPDATE public.payments SET session_id=p_session_id,session_url=p_url WHERE order_id=p_id AND (session_id IS NULL OR session_id=p_session_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'session already bound' USING ERRCODE='23514';END IF;
END $$;
REVOKE ALL ON FUNCTION public.commerce_bind_session(uuid,text,text,bigint) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.commerce_bind_session(uuid,text,text,bigint) TO service_role;
