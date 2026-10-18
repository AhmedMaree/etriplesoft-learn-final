-- Confirm the linked project is ets-learn Development before execution.
-- Creates disposable Auth identities and performs all checks in a rolled-back transaction.
BEGIN;
INSERT INTO auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at) VALUES
('e2730000-0000-4000-8000-000000000001','authenticated','authenticated','hosted-commerce-owner@example.test','{}',now(),now()),
('e2730000-0000-4000-8000-000000000002','authenticated','authenticated','hosted-commerce-other@example.test','{}',now(),now());
SELECT set_config('h.course',(SELECT id::text FROM public.courses WHERE slug='odoo-development' AND status='published'),true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2730000-0000-4000-8000-000000000001',true);
SELECT set_config('h.order',public.learner_create_order(current_setting('h.course')::uuid,'en')::text,true);
DO $$ BEGIN
 IF (SELECT total_minor FROM public.orders WHERE id=current_setting('h.order')::uuid)<>49900 THEN RAISE EXCEPTION 'server price was not snapshotted';END IF;
 IF (SELECT count(*) FROM public.order_items WHERE order_id=current_setting('h.order')::uuid)<>1 THEN RAISE EXCEPTION 'order item count mismatch';END IF;
 IF EXISTS(SELECT 1 FROM public.enrollments WHERE order_item_id IN(SELECT id FROM public.order_items WHERE order_id=current_setting('h.order')::uuid)) THEN RAISE EXCEPTION 'pending order granted access';END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e2730000-0000-4000-8000-000000000002',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.orders WHERE id=current_setting('h.order')::uuid)<>0 THEN RAISE EXCEPTION 'cross-user order read';END IF;
 IF (SELECT count(*) FROM public.order_items WHERE order_id=current_setting('h.order')::uuid)<>0 THEN RAISE EXCEPTION 'cross-user item read';END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT public.commerce_bind_session(current_setting('h.order')::uuid,'0123456789abcdef01234567','https://payments.kashier.io/session/0123456789abcdef01234567?mode=test',49900);
DO $$ BEGIN
 BEGIN PERFORM public.commerce_confirm_order(current_setting('h.order')::uuid,'0123456789abcdef01234567','provider-order',1,'EGP','paid','bad-amount');RAISE EXCEPTION 'wrong amount accepted';EXCEPTION WHEN check_violation THEN NULL;END;
 BEGIN PERFORM public.commerce_confirm_order(current_setting('h.order')::uuid,'0123456789abcdef01234567','provider-order',49900,'USD','paid','bad-currency');RAISE EXCEPTION 'wrong currency accepted';EXCEPTION WHEN check_violation THEN NULL;END;
END $$;
SELECT public.commerce_confirm_order(current_setting('h.order')::uuid,'0123456789abcdef01234567','provider-order',49900,'EGP','paid','provider-order:paid');
SELECT public.commerce_confirm_order(current_setting('h.order')::uuid,'0123456789abcdef01234567','provider-order',49900,'EGP','paid','provider-order:paid');
RESET ROLE;
DO $$ BEGIN
 IF (SELECT status FROM public.orders WHERE id=current_setting('h.order')::uuid)<>'paid' THEN RAISE EXCEPTION 'verified payment did not update order';END IF;
 IF (SELECT count(*) FROM public.enrollments WHERE order_item_id IN(SELECT id FROM public.order_items WHERE order_id=current_setting('h.order')::uuid))<>1 THEN RAISE EXCEPTION 'payment did not grant exactly one enrollment';END IF;
 IF (SELECT count(*) FROM public.payment_events WHERE order_id=current_setting('h.order')::uuid)<>1 THEN RAISE EXCEPTION 'duplicate event was not idempotent';END IF;
END $$;
SET LOCAL ROLE service_role;
SELECT public.commerce_confirm_order(current_setting('h.order')::uuid,'0123456789abcdef01234567','provider-order',49900,'EGP','refunded','provider-order:refunded');
SELECT public.commerce_confirm_order(current_setting('h.order')::uuid,'0123456789abcdef01234567','provider-order',49900,'EGP','paid','provider-order:late-paid');
RESET ROLE;
DO $$ BEGIN
 IF (SELECT status FROM public.orders WHERE id=current_setting('h.order')::uuid)<>'refunded' THEN RAISE EXCEPTION 'late payment restored refunded order';END IF;
 IF (SELECT status FROM public.enrollments WHERE order_item_id IN(SELECT id FROM public.order_items WHERE order_id=current_setting('h.order')::uuid))<>'refunded' THEN RAISE EXCEPTION 'full refund retained paid access';END IF;
 IF has_function_privilege('anon','public.learner_create_order(uuid,text)','EXECUTE') OR has_table_privilege('authenticated','public.payments','SELECT') OR has_table_privilege('authenticated','public.payment_events','SELECT') THEN RAISE EXCEPTION 'payment privileges are too broad';END IF;
 IF has_function_privilege('authenticated','public.commerce_get_order(uuid)','EXECUTE') OR has_function_privilege('authenticated','public.commerce_bind_session(uuid,text,text,bigint)','EXECUTE') OR has_function_privilege('authenticated','public.commerce_confirm_order(uuid,text,text,bigint,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'privileged commerce function is client-executable';END IF;
 IF NOT has_function_privilege('service_role','public.commerce_confirm_order(uuid,text,text,bigint,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'trusted server role cannot settle orders';END IF;
END $$;
ROLLBACK;
SELECT 'PASS: hosted checkout ownership, pricing, settlement, idempotency and refund checks; fixtures rolled back' AS result;
