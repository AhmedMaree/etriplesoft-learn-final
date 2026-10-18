-- Confirm the linked project is ets-learn Development before execution.
-- Creates disposable Auth identities, an administrator role and coupons inside a rolled-back transaction.
BEGIN;
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2740000-0000-4000-8000-000000000001','authenticated','authenticated','hosted-coupon-admin@example.test','{}',now(),now()),
('e2740000-0000-4000-8000-000000000002','authenticated','authenticated','hosted-coupon-owner@example.test','{}',now(),now()),
('e2740000-0000-4000-8000-000000000003','authenticated','authenticated','hosted-coupon-other@example.test','{}',now(),now());
INSERT INTO public.user_roles(user_id,role,granted_by) VALUES('e2740000-0000-4000-8000-000000000001','admin','e2740000-0000-4000-8000-000000000001');
SELECT set_config('h.course',(SELECT id::text FROM public.courses WHERE slug='odoo-development' AND status='published'),true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2740000-0000-4000-8000-000000000001',true);
SELECT public.admin_create_coupon('hostedsave20',20,NULL,NULL,NULL,NULL);
SELECT public.admin_create_coupon('HOSTEDFLAT',NULL,10000,'odoo-development',1,NULL);
SELECT public.admin_create_coupon('HOSTEDBIG',NULL,999999,NULL,NULL,NULL);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.admin_list_coupons() WHERE code='HOSTEDSAVE20') THEN RAISE EXCEPTION 'code not normalized or not listed';END IF;
 BEGIN PERFORM public.admin_create_coupon('HOSTEDSAVE20',5,NULL,NULL,NULL,NULL);RAISE EXCEPTION 'duplicate accepted';EXCEPTION WHEN unique_violation THEN NULL;END;
 BEGIN PERFORM public.admin_create_coupon('HOSTEDFREE',100,NULL,NULL,NULL,NULL);RAISE EXCEPTION 'free coupon accepted';EXCEPTION WHEN check_violation THEN NULL;END;
END $$;
SELECT set_config('request.jwt.claim.sub','e2740000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 BEGIN PERFORM public.admin_create_coupon('LEARNER',10,NULL,NULL,NULL,NULL);RAISE EXCEPTION 'learner created coupon';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM * FROM public.coupons;RAISE EXCEPTION 'coupon table readable';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
SELECT set_config('h.order',public.learner_create_order(current_setting('h.course')::uuid,'en')::text,true);
DO $$ DECLARE o uuid:=current_setting('h.order')::uuid; BEGIN
 IF public.learner_apply_coupon(o,'NOPE')->>'reason'<>'invalid' THEN RAISE EXCEPTION 'unknown code accepted';END IF;
 IF public.learner_apply_coupon(o,'HOSTEDBIG')->>'reason'<>'notApplicable' THEN RAISE EXCEPTION 'coupon made order free';END IF;
 IF (public.learner_apply_coupon(o,' hostedsave20 ')->>'ok')<>'true' THEN RAISE EXCEPTION 'percentage coupon rejected';END IF;
 IF (SELECT total_minor FROM public.orders WHERE id=o)<>39920 THEN RAISE EXCEPTION 'percentage discount wrong';END IF;
 IF (public.learner_apply_coupon(o,'HOSTEDFLAT')->>'ok')<>'true' THEN RAISE EXCEPTION 'course coupon rejected';END IF;
 IF (SELECT subtotal_minor||':'||discount_minor||':'||total_minor||':'||coupon_code FROM public.orders WHERE id=o)<>'49900:10000:39900:HOSTEDFLAT' THEN RAISE EXCEPTION 'fixed discount snapshot wrong';END IF;
 IF (SELECT coupon_attempts FROM public.orders WHERE id=o)<>4 THEN RAISE EXCEPTION 'attempts not counted';END IF;
 BEGIN UPDATE public.orders SET total_minor=1 WHERE id=o;RAISE EXCEPTION 'learner wrote order total';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 BEGIN PERFORM public.learner_set_order_billing(o,'A','EG','+201000000000');RAISE EXCEPTION 'invalid billing accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM public.learner_set_order_billing(o,'Hosted Learner','EG','+201000000000');
END $$;
SELECT set_config('request.jwt.claim.sub','e2740000-0000-4000-8000-000000000003',true);
SELECT set_config('h.other',public.learner_create_order(current_setting('h.course')::uuid,'en')::text,true);
DO $$ BEGIN
 BEGIN PERFORM public.learner_apply_coupon(current_setting('h.order')::uuid,'HOSTEDSAVE20');RAISE EXCEPTION 'cross-user coupon change';EXCEPTION WHEN no_data_found THEN NULL;END;
 BEGIN PERFORM public.learner_set_order_billing(current_setting('h.order')::uuid,'Other','EG','+201000000001');RAISE EXCEPTION 'cross-user billing change';EXCEPTION WHEN no_data_found THEN NULL;END;
 IF public.learner_apply_coupon(current_setting('h.other')::uuid,'HOSTEDFLAT')->>'reason'<>'exhausted' THEN RAISE EXCEPTION 'redemption limit not reserved';END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN PERFORM public.commerce_bind_session(current_setting('h.order')::uuid,'0123456789abcdef01234568','https://payments.kashier.io/session/0123456789abcdef01234568?mode=test',49900);RAISE EXCEPTION 'stale amount bound';EXCEPTION WHEN check_violation THEN NULL;END;
END $$;
SELECT public.commerce_bind_session(current_setting('h.order')::uuid,'0123456789abcdef01234568','https://payments.kashier.io/session/0123456789abcdef01234568?mode=test',39900);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2740000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF public.learner_apply_coupon(current_setting('h.order')::uuid,'HOSTEDSAVE20')->>'reason'<>'locked' THEN RAISE EXCEPTION 'coupon changed after session bound';END IF;
 BEGIN PERFORM public.learner_remove_coupon(current_setting('h.order')::uuid);RAISE EXCEPTION 'coupon removed after session bound';EXCEPTION WHEN object_not_in_prerequisite_state THEN NULL;END;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.commerce_confirm_order(current_setting('h.order')::uuid,'0123456789abcdef01234568','provider-coupon',39900,'EGP','paid','provider-coupon:paid');
RESET ROLE;
DO $$ BEGIN
 IF (SELECT status FROM public.orders WHERE id=current_setting('h.order')::uuid)<>'paid' THEN RAISE EXCEPTION 'discounted order did not settle';END IF;
 IF (SELECT count(*) FROM public.enrollments WHERE order_item_id IN(SELECT id FROM public.order_items WHERE order_id=current_setting('h.order')::uuid))<>1 THEN RAISE EXCEPTION 'discounted payment did not grant one enrollment';END IF;
 IF (SELECT count(*) FROM public.admin_audit_log WHERE actor_id='e2740000-0000-4000-8000-000000000001' AND target_type='coupon')<>3 THEN RAISE EXCEPTION 'coupon creation not audited';END IF;
 IF has_function_privilege('anon','public.learner_apply_coupon(uuid,text)','EXECUTE') OR has_function_privilege('authenticated','public.checkout_lock_editable_order(uuid)','EXECUTE') OR has_table_privilege('authenticated','public.coupons','SELECT') THEN RAISE EXCEPTION 'coupon privileges too broad';END IF;
END $$;
ROLLBACK;
SELECT 'PASS: hosted coupon administration, server discounts, limits, billing ownership and session amount pinning; fixtures rolled back' AS result;
