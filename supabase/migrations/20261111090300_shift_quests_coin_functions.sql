-- SHIFT High quests: Passioncoin balance, redemption, fulfillment, reversals.
--
-- The ledger is append-only. A redemption debits the cost when it is
-- reserved (redeem:<id>) and a cancellation credits it back exactly once
-- (release:<id>), so the balance is always SUM(amount) and the spendable
-- balance can never include coins already reserved. Every balance check runs
-- under the member's row lock, every stock check under the item's.
--
-- Prod-first apply: CREATE OR REPLACE only.

CREATE OR REPLACE FUNCTION public.shift_quest_coins(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN jsonb_build_object(
    'balance', public.shift_quest__balance(v_member.id),
    'reserved', COALESCE((
      SELECT sum(cost) FROM public.shift_quest_redemptions
      WHERE member_id = v_member.id AND status IN ('reserved', 'processing')
    ), 0),
    'entries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'amount', l.amount, 'kind', l.kind, 'reason', l.reason, 'created_at', l.created_at,
        'title', i.title
      ) ORDER BY l.created_at DESC)
      FROM (
        SELECT * FROM public.shift_quest_ledger WHERE member_id = v_member.id
        ORDER BY created_at DESC LIMIT 20
      ) l
      LEFT JOIN public.shift_quest_instances i ON i.id = l.instance_id
    ), '[]'::jsonb),
    'awards_live', public.shift_quest__awards_live()
  );
END;
$$;

/** Nothing is listed unless redemption is live: no unconfirmed availability. */
CREATE OR REPLACE FUNCTION public.shift_quest_catalog_list(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_live boolean := public.shift_quest__redemption_live();
BEGIN
  RETURN jsonb_build_object(
    'live', v_live,
    'terms', CASE WHEN v_live THEN (public.shift_quest__settings()).redemption_terms END,
    'balance', public.shift_quest__balance(v_member.id),
    'items', CASE WHEN v_live THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description, 'cost', c.cost,
        'in_stock', c.stock_available > 0
      ) ORDER BY c.cost, c.name)
      FROM public.shift_quest_catalog c WHERE c.active
    ), '[]'::jsonb) ELSE '[]'::jsonb END,
    'mine', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'item', c.name, 'cost', r.cost, 'status', r.status, 'created_at', r.created_at
      ) ORDER BY r.created_at DESC)
      FROM public.shift_quest_redemptions r JOIN public.shift_quest_catalog c ON c.id = r.item_id
      WHERE r.member_id = v_member.id AND (r.status IN ('reserved', 'processing') OR r.closed_at > now() - interval '30 days')
    ), '[]'::jsonb)
  );
END;
$$;

/**
 * Reserve one unit and its cost atomically. p_request_key comes from the
 * confirm button, so a double click or a retry returns the first request.
 * p_expected_cost is the price the student saw: a price change in between
 * is refused rather than charged.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_redeem(
  p_actor text, p_item uuid, p_request_key text, p_expected_cost integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_existing public.shift_quest_redemptions;
  v_item public.shift_quest_catalog;
  v_balance integer;
  v_id uuid;
BEGIN
  -- Member lock first, then the item: the same order everywhere.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;

  SELECT * INTO v_existing FROM public.shift_quest_redemptions WHERE request_key = p_request_key;
  IF FOUND THEN
    IF v_existing.member_id <> v_member.id THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    RETURN jsonb_build_object('redemption_id', v_existing.id, 'status', v_existing.status, 'duplicate', true,
                              'balance', public.shift_quest__balance(v_member.id));
  END IF;

  IF NOT public.shift_quest__redemption_live() THEN
    PERFORM public.shift_quest__fail('redemption_paused');
  END IF;

  SELECT * INTO v_item FROM public.shift_quest_catalog WHERE id = p_item FOR NO KEY UPDATE;
  IF NOT FOUND OR NOT v_item.active THEN
    PERFORM public.shift_quest__fail('item_unavailable');
  END IF;
  IF v_item.cost IS DISTINCT FROM p_expected_cost THEN
    PERFORM public.shift_quest__fail('price_changed');
  END IF;
  IF v_item.stock_available < 1 THEN
    PERFORM public.shift_quest__fail('out_of_stock');
  END IF;
  v_balance := public.shift_quest__balance(v_member.id);
  IF v_balance < v_item.cost THEN
    PERFORM public.shift_quest__fail('insufficient_balance');
  END IF;

  INSERT INTO public.shift_quest_redemptions (member_id, item_id, cost, request_key)
  VALUES (v_member.id, v_item.id, v_item.cost, p_request_key)
  RETURNING id INTO v_id;

  UPDATE public.shift_quest_catalog SET stock_available = stock_available - 1, updated_at = now()
  WHERE id = v_item.id;

  INSERT INTO public.shift_quest_ledger (member_id, amount, kind, source_key, redemption_id, reason, actor_id)
  VALUES (v_member.id, -v_item.cost, 'redemption_hold', 'redeem:' || v_id, v_id,
          left('redeem:' || v_item.name, 500), v_member.id);

  PERFORM public.shift_quest__post('redeem:' || v_id, 'staff', 'redemption_requested',
    jsonb_build_object('redemption_id', v_id, 'item', v_item.name));
  PERFORM public.shift_quest__audit(v_member.id, 'redeem', 'redemption', v_id);
  RETURN jsonb_build_object('redemption_id', v_id, 'status', 'reserved', 'duplicate', false,
                            'balance', v_balance - v_item.cost);
END;
$$;

/**
 * Cancel a reservation: stock and coins come back exactly once. p_allowed is
 * the statuses the caller may cancel from, checked under the lock (a student
 * may cancel only before an operator has started).
 */
CREATE OR REPLACE FUNCTION public.shift_quest__release(
  p_redemption uuid, p_actor uuid, p_reason text, p_allowed text[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_redemption public.shift_quest_redemptions;
BEGIN
  SELECT * INTO v_redemption FROM public.shift_quest_redemptions WHERE id = p_redemption;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  -- Same order as redeem: member, item, then the redemption itself.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_redemption.member_id FOR NO KEY UPDATE;
  PERFORM 1 FROM public.shift_quest_catalog WHERE id = v_redemption.item_id FOR NO KEY UPDATE;
  SELECT * INTO v_redemption FROM public.shift_quest_redemptions WHERE id = p_redemption FOR NO KEY UPDATE;

  IF NOT (v_redemption.status = ANY (p_allowed)) OR v_redemption.status NOT IN ('reserved', 'processing') THEN
    RETURN false;
  END IF;

  UPDATE public.shift_quest_redemptions
  SET status = 'cancelled', operator_note = COALESCE(left(p_reason, 500), operator_note),
      updated_at = now(), closed_at = now()
  WHERE id = p_redemption;
  UPDATE public.shift_quest_catalog SET stock_available = stock_available + 1, updated_at = now()
  WHERE id = v_redemption.item_id;
  INSERT INTO public.shift_quest_ledger (member_id, amount, kind, source_key, redemption_id, reason, actor_id)
  VALUES (v_redemption.member_id, v_redemption.cost, 'redemption_release', 'release:' || p_redemption,
          p_redemption, 'redeem_cancelled', p_actor)
  ON CONFLICT (source_key) DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_redeem_cancel(p_actor text, p_redemption uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_status text;
  v_released boolean;
BEGIN
  SELECT status INTO v_status FROM public.shift_quest_redemptions
  WHERE id = p_redemption AND member_id = v_member.id;
  IF v_status IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  -- Once an operator has started, cancelling goes through them.
  IF v_status = 'processing' THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  v_released := public.shift_quest__release(p_redemption, v_member.id, NULL, ARRAY['reserved']);
  IF v_released THEN
    PERFORM public.shift_quest__audit(v_member.id, 'redeem_cancel', 'redemption', p_redemption);
  END IF;
  RETURN v_released;
END;
$$;

-- ---------------------------------------------------------------------------
-- Fulfillment operators
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_fulfill_queue(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['fulfillment']);
BEGIN
  PERFORM public.shift_quest__audit(v_me.id, 'fulfill_queue_view', 'redemption', NULL);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', r.id, 'item', c.name, 'cost', r.cost, 'status', r.status,
      'student', m.display_name, 'created_at', r.created_at, 'own', r.member_id = v_me.id
    ) ORDER BY r.created_at)
    FROM public.shift_quest_redemptions r
    JOIN public.shift_quest_catalog c ON c.id = r.item_id
    JOIN public.shift_quest_members m ON m.id = r.member_id
    WHERE r.status IN ('reserved', 'processing')
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_fulfill_update(
  p_actor text, p_redemption uuid, p_action text, p_note text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['fulfillment']);
  v_redemption public.shift_quest_redemptions;
  v_item text;
BEGIN
  SELECT * INTO v_redemption FROM public.shift_quest_redemptions WHERE id = p_redemption;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF v_redemption.member_id = v_me.id THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  SELECT name INTO v_item FROM public.shift_quest_catalog WHERE id = v_redemption.item_id;

  IF p_action = 'cancel' THEN
    IF NOT public.shift_quest__release(p_redemption, v_me.id, public.shift_quest__check_len(p_note, 500, true),
                                       ARRAY['reserved', 'processing']) THEN
      RETURN 'unchanged';
    END IF;
  ELSIF p_action IN ('start', 'complete') THEN
    -- Same lock order as a cancellation: the member first, then the redemption.
    PERFORM 1 FROM public.shift_quest_members WHERE id = v_redemption.member_id FOR NO KEY UPDATE;
    SELECT * INTO v_redemption FROM public.shift_quest_redemptions WHERE id = p_redemption FOR NO KEY UPDATE;
    IF (p_action = 'start' AND v_redemption.status <> 'reserved')
       OR (p_action = 'complete' AND v_redemption.status NOT IN ('reserved', 'processing')) THEN
      RETURN 'unchanged';
    END IF;
    UPDATE public.shift_quest_redemptions
    SET status = CASE p_action WHEN 'start' THEN 'processing' ELSE 'completed' END,
        operator_id = v_me.id,
        operator_note = COALESCE(public.shift_quest__check_len(p_note, 500, false), operator_note),
        updated_at = now(),
        closed_at = CASE WHEN p_action = 'complete' THEN now() END
    WHERE id = p_redemption;
  ELSE
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  PERFORM public.shift_quest__notify(
    v_redemption.member_id, 'redemption:' || p_redemption || ':' || p_action, 'redemption_' || p_action,
    jsonb_build_object('item', v_item, 'note', CASE WHEN p_action = 'cancel' THEN p_note END), p_redemption
  );
  PERFORM public.shift_quest__audit(v_me.id, 'fulfill_' || p_action, 'redemption', p_redemption);
  RETURN p_action;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reversals: never a silent edit
-- ---------------------------------------------------------------------------

/**
 * Takes back some or all of one award, with a reason the student sees. The
 * reversal references the original entry; nothing is edited or deleted.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_reverse(
  p_actor text, p_entry uuid, p_amount integer, p_reason text, p_request_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_reason text := public.shift_quest__check_len(p_reason, 500, true);
  v_entry public.shift_quest_ledger;
  v_reversed integer;
  v_id uuid;
  v_ref uuid;
BEGIN
  IF p_request_key IS NULL OR char_length(p_request_key) NOT BETWEEN 8 AND 200 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  SELECT * INTO v_entry FROM public.shift_quest_ledger WHERE id = p_entry;
  IF NOT FOUND OR v_entry.kind <> 'award' THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF v_entry.member_id = v_me.id THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_entry.member_id FOR NO KEY UPDATE;

  SELECT id, references_entry_id INTO v_id, v_ref
  FROM public.shift_quest_ledger WHERE source_key = 'reversal:' || p_request_key;
  IF v_id IS NOT NULL THEN
    -- The same key for a different entry is a mistake, not a retry.
    IF v_ref IS DISTINCT FROM p_entry THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    RETURN jsonb_build_object('entry_id', v_id, 'duplicate', true);
  END IF;

  SELECT COALESCE(-sum(amount), 0) INTO v_reversed FROM public.shift_quest_ledger
  WHERE references_entry_id = p_entry AND kind = 'reversal';
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > v_entry.amount - v_reversed THEN
    PERFORM public.shift_quest__fail('bad_amount');
  END IF;

  INSERT INTO public.shift_quest_ledger (
    member_id, amount, kind, source_key, reward_rule_id, instance_id, references_entry_id, reason, actor_id
  )
  VALUES (v_entry.member_id, -p_amount, 'reversal', 'reversal:' || p_request_key, v_entry.reward_rule_id,
          v_entry.instance_id, p_entry, v_reason, v_me.id)
  RETURNING id INTO v_id;

  PERFORM public.shift_quest__notify(
    v_entry.member_id, 'reversal:' || v_id, 'reversal',
    jsonb_build_object('amount', p_amount, 'reason', v_reason), v_id
  );
  PERFORM public.shift_quest__audit(v_me.id, 'ledger_reverse', 'ledger', v_id);
  RETURN jsonb_build_object('entry_id', v_id, 'duplicate', false,
                            'balance', public.shift_quest__balance(v_entry.member_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_ledger(p_actor text, p_target text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_target public.shift_quest_members;
BEGIN
  SELECT * INTO v_target FROM public.shift_quest_members WHERE discord_user_id = p_target;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'ledger_view', 'member', v_target.id);
  RETURN jsonb_build_object(
    'name', v_target.display_name,
    'balance', public.shift_quest__balance(v_target.id),
    'entries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id, 'amount', l.amount, 'kind', l.kind, 'reason', l.reason, 'created_at', l.created_at,
        'title', i.title,
        'reversed', (SELECT COALESCE(-sum(r.amount), 0) FROM public.shift_quest_ledger r
                     WHERE r.references_entry_id = l.id)
      ) ORDER BY l.created_at DESC)
      FROM (SELECT * FROM public.shift_quest_ledger WHERE member_id = v_target.id
            ORDER BY created_at DESC LIMIT 25) l
      LEFT JOIN public.shift_quest_instances i ON i.id = l.instance_id
    ), '[]'::jsonb)
  );
END;
$$;

-- Never callable through the Data API: these trust the Discord ID they get.
-- (Supabase grants new functions to anon and authenticated by default.)
DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'shift\_quest\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END;
$$;
