-- Account cart and checkout funnel.
-- cart_items mirrors the browser cart for signed-in learners so it follows them across devices.
-- The browser cart (cookie) stays the source for guests; on sign-in it is merged in here.
-- Prices are never stored: checkout still prices every course in learner_create_cart_order.
CREATE TABLE public.cart_items (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
 added_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, course_id)
);
CREATE INDEX cart_items_course_idx ON public.cart_items(course_id);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cart_items FROM PUBLIC,anon,authenticated,service_role;
-- Owners may read their cart (account export); every write goes through learner_cart_sync.
GRANT SELECT ON public.cart_items TO authenticated;
CREATE POLICY cart_items_owner_read ON public.cart_items FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));

-- Funnel source for "added to cart". At most one row per learner, course, event and day, so
-- repeated add/remove clicks cannot grow the table without bound. Read only by admin RPCs.
CREATE TABLE public.cart_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
 event text NOT NULL CHECK (event IN ('added','removed')),
 day date NOT NULL DEFAULT current_date,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id, course_id, event, day)
);
CREATE INDEX cart_events_created_idx ON public.cart_events(created_at);
CREATE INDEX cart_events_course_idx ON public.cart_events(course_id);
ALTER TABLE public.cart_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cart_events FROM PUBLIC,anon,authenticated,service_role;

-- Adds and removes courses (by slug) in the caller's account cart and returns the resulting cart,
-- oldest first. Only published courses can be added and the cart holds at most 20 courses.
CREATE FUNCTION public.learner_cart_sync(p_add text[],p_remove text[]) RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); v_room int; v_result text[];BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501';END IF;
 IF coalesce(cardinality(p_add),0)>20 OR coalesce(cardinality(p_remove),0)>20 THEN RAISE EXCEPTION 'invalid cart' USING ERRCODE='22023';END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('cart:'||actor::text));
 WITH removed AS (
  DELETE FROM public.cart_items ci USING public.courses c
  WHERE ci.user_id=actor AND c.id=ci.course_id AND c.slug=ANY(coalesce(p_remove,'{}'))
  RETURNING ci.course_id)
 INSERT INTO public.cart_events(user_id,course_id,event) SELECT actor,course_id,'removed' FROM removed ON CONFLICT DO NOTHING;
 v_room:=20-(SELECT count(*) FROM public.cart_items WHERE user_id=actor);
 IF v_room>0 THEN
  WITH wanted AS (
   SELECT c.id,min(u.pos) pos FROM unnest(coalesce(p_add,'{}')) WITH ORDINALITY u(slug,pos)
   JOIN public.courses c ON c.slug=u.slug AND c.status='published'
   WHERE NOT EXISTS(SELECT 1 FROM public.cart_items ci WHERE ci.user_id=actor AND ci.course_id=c.id)
   GROUP BY c.id ORDER BY min(u.pos) LIMIT v_room),
  added AS (
   INSERT INTO public.cart_items(user_id,course_id,added_at)
   SELECT actor,id,now()+(pos*interval '1 microsecond') FROM wanted ON CONFLICT DO NOTHING
   RETURNING course_id)
  INSERT INTO public.cart_events(user_id,course_id,event) SELECT actor,course_id,'added' FROM added ON CONFLICT DO NOTHING;
 END IF;
 SELECT coalesce(array_agg(c.slug ORDER BY ci.added_at),'{}') INTO v_result
  FROM public.cart_items ci JOIN public.courses c ON c.id=ci.course_id WHERE ci.user_id=actor;
 RETURN v_result;
END $$;

-- Checkout funnel for the admin console: distinct learners reaching each step in the window,
-- plus the courses most often left in carts. Guests appear once they sign in (their cart merges).
CREATE FUNCTION public.admin_checkout_funnel(p_days integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_since timestamptz;BEGIN
 PERFORM public.assert_active_admin();
 IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 365 THEN RAISE EXCEPTION 'invalid window' USING ERRCODE='22023';END IF;
 v_since:=now()-make_interval(days=>p_days);
 RETURN jsonb_build_object(
  'carted',(SELECT count(DISTINCT user_id) FROM public.cart_events WHERE event='added' AND created_at>=v_since),
  'started',(SELECT count(DISTINCT user_id) FROM public.orders WHERE created_at>=v_since),
  'billing',(SELECT count(DISTINCT user_id) FROM public.orders WHERE created_at>=v_since AND billing_name IS NOT NULL),
  'payment',(SELECT count(DISTINCT o.user_id) FROM public.orders o JOIN public.payments p ON p.order_id=o.id WHERE o.created_at>=v_since AND p.session_id IS NOT NULL),
  'paid',(SELECT count(DISTINCT user_id) FROM public.orders WHERE created_at>=v_since AND status IN('paid','refunded')),
  'abandoned',(SELECT coalesce(jsonb_agg(row_to_json(a) ORDER BY a.learners DESC,a.slug),'[]') FROM (
    SELECT c.slug,count(DISTINCT e.user_id) learners FROM public.cart_events e JOIN public.courses c ON c.id=e.course_id
    WHERE e.event='added' AND e.created_at>=v_since
     AND NOT EXISTS(SELECT 1 FROM public.enrollments en WHERE en.user_id=e.user_id AND en.course_id=e.course_id AND en.grant_source='paid')
    GROUP BY c.slug ORDER BY count(DISTINCT e.user_id) DESC,c.slug LIMIT 5) a));
END $$;

REVOKE ALL ON FUNCTION public.learner_cart_sync(text[],text[]),public.admin_checkout_funnel(integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.learner_cart_sync(text[],text[]),public.admin_checkout_funnel(integer) TO authenticated;
