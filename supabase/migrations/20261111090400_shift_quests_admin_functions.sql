-- SHIFT High quests: administration, delivery worker, reminders, reporting,
-- erasure.
--
-- Prod-first apply: CREATE OR REPLACE only.

-- ---------------------------------------------------------------------------
-- Settings and pause controls
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_admin_status(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  s public.shift_quest_settings := public.shift_quest__settings();
BEGIN
  RETURN jsonb_build_object(
    'settings', jsonb_build_object(
      'student_role_ids', to_jsonb(s.student_role_ids),
      'help_channel_id', s.help_channel_id,
      'staff_channel_id', s.staff_channel_id,
      'celebrate_channel_id', s.celebrate_channel_id,
      'coworking_channel_id', s.coworking_channel_id,
      'awards_enabled', s.awards_enabled,
      'redemption_enabled', s.redemption_enabled,
      'sharing_enabled', s.sharing_enabled,
      'reminders_enabled', s.reminders_enabled,
      'reward_terms', s.reward_terms IS NOT NULL,
      'redemption_terms', s.redemption_terms IS NOT NULL,
      'fulfillment_process', s.fulfillment_process IS NOT NULL,
      'fulfillment_owner', s.fulfillment_owner,
      -- 20261111090800_shift_quests_seasons (off before it; hook in 20261111090700).
      'squads_enabled', COALESCE((public.shift_quest__feature_flags() ->> 'squads')::boolean, false)
    ),
    'live', jsonb_build_object(
      'awards', public.shift_quest__awards_live(),
      'redemption', public.shift_quest__redemption_live()
    ),
    'blockers', public.shift_quest__blockers(),
    'rules', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('key', key, 'version', version, 'amount', amount,
                                          'cap', cap_per_member, 'team_allocation', team_allocation) ORDER BY key)
      FROM public.shift_quest_reward_rules WHERE status = 'published'
    ), '[]'::jsonb),
    'staff', jsonb_build_object(
      'admin', (SELECT count(*) FROM public.shift_quest_members WHERE 'admin' = ANY (roles)),
      'reviewer', (SELECT count(*) FROM public.shift_quest_members WHERE 'reviewer' = ANY (roles)),
      'fulfillment', (SELECT count(*) FROM public.shift_quest_members WHERE 'fulfillment' = ANY (roles))
    ),
    'outbox', jsonb_build_object(
      'pending', (SELECT count(*) FROM public.shift_quest_outbox WHERE status IN ('pending', 'sending')),
      'blocked', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'blocked'),
      'failed', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'failed')
    ),
    'data_requests_open', (SELECT count(*) FROM public.shift_quest_data_requests WHERE status = 'open')
  );
END;
$$;

/**
 * One setting at a time. Switching a reward feature on is refused while
 * anything it needs is missing, so an incomplete configuration can never go
 * live by accident. Switching anything off always works.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_set(p_actor text, p_key text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_value text := public.shift_quest__trim(p_value);
  v_on boolean := lower(COALESCE(p_value, '')) IN ('on', 'true', '1');
  v_blockers jsonb;
BEGIN
  PERFORM 1 FROM public.shift_quest_settings WHERE id FOR NO KEY UPDATE;

  CASE p_key
    WHEN 'awards', 'redemption', 'sharing', 'reminders' THEN
      IF v_on THEN
        v_blockers := public.shift_quest__blockers() -> p_key;
        IF jsonb_array_length(v_blockers) > 0 THEN
          RAISE EXCEPTION 'sq:config_incomplete' USING ERRCODE = 'P0001', DETAIL = v_blockers::text;
        END IF;
      END IF;
      EXECUTE format('UPDATE public.shift_quest_settings SET %I = $1 WHERE id', p_key || '_enabled') USING v_on;
      -- Redemption depends on awards: pausing awards pauses redemption too.
      IF p_key = 'awards' AND NOT v_on THEN
        UPDATE public.shift_quest_settings SET redemption_enabled = false WHERE id;
      END IF;
    WHEN 'help_channel', 'staff_channel', 'celebrate_channel', 'coworking_channel' THEN
      IF v_value IS NOT NULL AND v_value !~ '^[0-9]{5,25}$' THEN
        PERFORM public.shift_quest__fail('bad_input');
      END IF;
      EXECUTE format('UPDATE public.shift_quest_settings SET %I = $1 WHERE id', p_key || '_id') USING v_value;
      IF p_key = 'celebrate_channel' AND v_value IS NULL THEN
        UPDATE public.shift_quest_settings SET sharing_enabled = false WHERE id;
      END IF;
      -- Messages that waited for this channel can go now.
      IF v_value IS NOT NULL THEN
        UPDATE public.shift_quest_outbox
        SET status = 'pending', next_attempt_at = now(), last_error = NULL
        WHERE status = 'blocked' AND channel_key = replace(p_key, '_channel', '');
      END IF;
    WHEN 'student_role_add', 'student_role_remove' THEN
      IF v_value IS NULL OR v_value !~ '^[0-9]{5,25}$' THEN
        PERFORM public.shift_quest__fail('bad_input');
      END IF;
      UPDATE public.shift_quest_settings
      SET student_role_ids = CASE WHEN p_key = 'student_role_add'
        THEN array_append(array_remove(student_role_ids, v_value), v_value)
        ELSE array_remove(student_role_ids, v_value) END
      WHERE id;
    WHEN 'reward_terms', 'redemption_terms', 'fulfillment_process', 'fulfillment_owner' THEN
      IF char_length(v_value) > 3000 THEN
        PERFORM public.shift_quest__fail('text_too_long');
      END IF;
      EXECUTE format('UPDATE public.shift_quest_settings SET %I = $1 WHERE id', p_key) USING v_value;
      -- Clearing what a live feature depends on switches it off.
      IF v_value IS NULL THEN
        UPDATE public.shift_quest_settings
        SET awards_enabled = awards_enabled AND p_key <> 'reward_terms',
            redemption_enabled = false
        WHERE id;
      END IF;
    ELSE
      -- Switches from later migrations ('squads', 20261111090800_shift_quests_seasons)
      -- need nothing published first; an unknown key is bad_input.
      IF NOT public.shift_quest__set_feature(p_key, v_on) THEN
        PERFORM public.shift_quest__fail('bad_input');
      END IF;
  END CASE;

  UPDATE public.shift_quest_settings SET updated_by = v_me.id, updated_at = now() WHERE id;
  PERFORM public.shift_quest__audit(v_me.id, 'settings_' || p_key, 'settings', NULL);
  RETURN public.shift_quest_admin_status(p_actor);
END;
$$;

/**
 * Grants or revokes an application role. Staff need not run /start. The last
 * admin cannot remove themselves.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_role(
  p_actor text, p_target text, p_target_name text, p_role text, p_grant boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_target uuid;
  v_roles text[];
BEGIN
  IF p_role NOT IN ('reviewer', 'admin', 'fulfillment') OR p_target !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  PERFORM 1 FROM public.shift_quest_settings WHERE id FOR NO KEY UPDATE;

  INSERT INTO public.shift_quest_members (discord_user_id, display_name)
  VALUES (p_target, left(p_target_name, 80))
  ON CONFLICT (discord_user_id) DO UPDATE SET display_name = COALESCE(EXCLUDED.display_name, shift_quest_members.display_name)
  RETURNING id INTO v_target;

  IF NOT p_grant AND p_role = 'admin' AND (
    SELECT count(*) FROM public.shift_quest_members WHERE 'admin' = ANY (roles) AND id <> v_target
  ) = 0 THEN
    PERFORM public.shift_quest__fail('last_admin');
  END IF;

  UPDATE public.shift_quest_members
  SET roles = CASE WHEN p_grant THEN array_append(array_remove(roles, p_role), p_role)
                   ELSE array_remove(roles, p_role) END,
      updated_at = now()
  WHERE id = v_target
  RETURNING roles INTO v_roles;

  -- Staff are never squad members: a new role ends any squad place (wave-2
  -- hook in 20261111090800_shift_quests_seasons; a no-op before it).
  IF p_grant THEN
    PERFORM public.shift_quest__on_role_grant(v_target);
  END IF;

  PERFORM public.shift_quest__audit(v_me.id, CASE WHEN p_grant THEN 'role_grant_' ELSE 'role_revoke_' END || p_role,
                                    'member', v_target);
  RETURN jsonb_build_object('roles', to_jsonb(v_roles));
END;
$$;

/**
 * First admin. Service role only (never granted to the bot): run once from a
 * trusted shell with `supabase db query --linked`. Refuses once any admin exists.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_bootstrap_admin(p_discord_id text, p_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.shift_quest_members WHERE 'admin' = ANY (roles)) THEN
    PERFORM public.shift_quest__fail('admin_exists');
  END IF;
  IF p_discord_id !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  INSERT INTO public.shift_quest_members (discord_user_id, display_name, roles)
  VALUES (p_discord_id, left(p_name, 80), ARRAY['admin'])
  ON CONFLICT (discord_user_id) DO UPDATE SET roles = array_append(array_remove(shift_quest_members.roles, 'admin'), 'admin')
  RETURNING id INTO v_id;
  PERFORM public.shift_quest__audit(NULL, 'bootstrap_admin', 'member', v_id);
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reward rules, templates, catalog
-- ---------------------------------------------------------------------------

/** Publishes a new version of a rule. Quests already chosen keep their version. */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_rule(
  p_actor text, p_key text, p_amount integer, p_cap integer, p_team_allocation text,
  p_eligibility text, p_review_process text, p_reversal_policy text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_version integer;
  v_id uuid;
BEGIN
  IF p_key !~ '^[a-z0-9-]{2,40}$' OR p_amount IS NULL OR p_amount < 1 OR p_amount > 100000
     OR (p_cap IS NOT NULL AND p_cap < 1)
     OR (p_team_allocation IS NOT NULL AND p_team_allocation NOT IN ('each_confirmed', 'split_confirmed')) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_rule:' || p_key));
  SELECT COALESCE(max(version), 0) + 1 INTO v_version FROM public.shift_quest_reward_rules WHERE key = p_key;
  UPDATE public.shift_quest_reward_rules SET status = 'retired' WHERE key = p_key AND status = 'published';

  INSERT INTO public.shift_quest_reward_rules (
    key, version, amount, cap_per_member, team_allocation, eligibility, review_process, reversal_policy, created_by
  )
  VALUES (
    p_key, v_version, p_amount, p_cap, p_team_allocation,
    public.shift_quest__check_len(p_eligibility, 1000, true),
    public.shift_quest__check_len(p_review_process, 1000, true),
    public.shift_quest__check_len(p_reversal_policy, 1000, true),
    v_me.id
  )
  RETURNING id INTO v_id;

  PERFORM public.shift_quest__audit(v_me.id, 'rule_publish', 'reward_rule', v_id);
  RETURN jsonb_build_object('id', v_id, 'key', p_key, 'version', v_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_rule_retire(p_actor text, p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  UPDATE public.shift_quest_reward_rules SET status = 'retired' WHERE key = p_key AND status = 'published';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('rule_not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'rule_retire', 'reward_rule', NULL);
END;
$$;

/** Which rule key a quest template earns under, for quests chosen from now on. */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_template_rule(p_actor text, p_slug text, p_rule_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_key text := public.shift_quest__trim(p_rule_key);
  v_id uuid;
BEGIN
  IF v_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_reward_rules WHERE key = v_key AND status = 'published'
  ) THEN
    PERFORM public.shift_quest__fail('rule_not_found');
  END IF;
  UPDATE public.shift_quest_templates SET reward_rule_key = v_key
  WHERE slug = p_slug AND status = 'published'
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    PERFORM public.shift_quest__fail('template_unavailable');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'template_rule', 'template', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_template_state(p_actor text, p_slug text, p_publish boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_id uuid;
BEGIN
  -- Retiring hides the template from /quest browse; quests already chosen continue.
  UPDATE public.shift_quest_templates t
  SET status = CASE WHEN p_publish THEN 'published' ELSE 'retired' END
  WHERE t.slug = p_slug
    AND t.version = (SELECT max(version) FROM public.shift_quest_templates WHERE slug = p_slug)
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    PERFORM public.shift_quest__fail('template_unavailable');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, CASE WHEN p_publish THEN 'template_publish' ELSE 'template_retire' END,
                                    'template', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_templates(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('slug', slug, 'version', version, 'title', title, 'status', status,
                                        'reward_rule_key', reward_rule_key, 'repeatable', repeatable)
                     ORDER BY sort_order, slug)
    FROM public.shift_quest_templates t
    WHERE version = (SELECT max(version) FROM public.shift_quest_templates WHERE slug = t.slug)
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_catalog(
  p_actor text, p_item uuid, p_name text, p_description text, p_cost integer, p_stock_delta integer, p_active boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_item public.shift_quest_catalog;
BEGIN
  IF p_cost IS NOT NULL AND p_cost < 1 THEN
    PERFORM public.shift_quest__fail('bad_amount');
  END IF;

  IF p_item IS NULL THEN
    IF p_cost IS NULL THEN
      PERFORM public.shift_quest__fail('bad_amount');
    END IF;
    INSERT INTO public.shift_quest_catalog (name, description, cost, stock_available, active)
    VALUES (public.shift_quest__check_len(p_name, 80, true), public.shift_quest__check_len(p_description, 1000, false),
            p_cost, GREATEST(COALESCE(p_stock_delta, 0), 0), COALESCE(p_active, false))
    RETURNING * INTO v_item;
  ELSE
    SELECT * INTO v_item FROM public.shift_quest_catalog WHERE id = p_item FOR NO KEY UPDATE;
    IF NOT FOUND THEN
      PERFORM public.shift_quest__fail('not_found');
    END IF;
    IF v_item.stock_available + COALESCE(p_stock_delta, 0) < 0 THEN
      PERFORM public.shift_quest__fail('bad_amount');
    END IF;
    -- A price change applies to new requests; reservations keep their cost.
    UPDATE public.shift_quest_catalog
    SET name = COALESCE(public.shift_quest__check_len(p_name, 80, false), name),
        description = COALESCE(public.shift_quest__check_len(p_description, 1000, false), description),
        cost = COALESCE(p_cost, cost),
        stock_available = stock_available + COALESCE(p_stock_delta, 0),
        active = COALESCE(p_active, active),
        updated_at = now()
    WHERE id = p_item
    RETURNING * INTO v_item;
  END IF;

  -- Redemption cannot stay live once nothing is left to redeem.
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_catalog WHERE active AND stock_available > 0) THEN
    UPDATE public.shift_quest_settings SET redemption_enabled = false WHERE id;
  END IF;

  PERFORM public.shift_quest__audit(v_me.id, 'catalog_upsert', 'catalog', v_item.id);
  RETURN jsonb_build_object('id', v_item.id, 'name', v_item.name, 'cost', v_item.cost,
                            'stock_available', v_item.stock_available, 'active', v_item.active);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_catalog_list(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'cost', c.cost, 'stock_available', c.stock_available, 'active', c.active,
      'reserved', (SELECT count(*) FROM public.shift_quest_redemptions r
                   WHERE r.item_id = c.id AND r.status IN ('reserved', 'processing'))
    ) ORDER BY c.created_at)
    FROM public.shift_quest_catalog c
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- Aggregate pilot report: counts only, never a person
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_admin_report(p_actor text, p_days integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_since timestamptz := now() - make_interval(days => LEAST(GREATEST(COALESCE(p_days, 14), 1), 365));
  v_students uuid[];
BEGIN
  SELECT COALESCE(array_agg(id), '{}') INTO v_students
  FROM public.shift_quest_members WHERE onboarded_at IS NOT NULL AND erased_at IS NULL;

  PERFORM public.shift_quest__audit(v_me.id, 'report_view', 'report', NULL);
  RETURN jsonb_build_object(
    'window_days', LEAST(GREATEST(COALESCE(p_days, 14), 1), 365),
    'members_onboarded', cardinality(v_students),
    'members_started', (
      SELECT count(DISTINCT member_id) FROM (
        SELECT member_id FROM public.shift_quest_instances
        UNION ALL SELECT member_id FROM public.shift_quest_progress
      ) x WHERE member_id = ANY (v_students)
    ),
    'members_with_progress_in_window', (
      SELECT count(DISTINCT member_id) FROM public.shift_quest_progress
      WHERE created_at >= v_since AND member_id = ANY (v_students)
    ),
    'members_submitting_in_window', (
      SELECT count(DISTINCT submitted_by) FROM public.shift_quest_submissions
      WHERE created_at >= v_since AND submitted_by = ANY (v_students)
    ),
    'quests_by_state', COALESCE((
      SELECT jsonb_object_agg(state, n) FROM (
        SELECT state, count(*) AS n FROM public.shift_quest_instances GROUP BY state
      ) x
    ), '{}'::jsonb),
    'reviews_in_window', COALESCE((
      SELECT jsonb_object_agg(outcome, n) FROM (
        SELECT outcome, count(*) AS n FROM public.shift_quest_reviews WHERE created_at >= v_since GROUP BY outcome
      ) x
    ), '{}'::jsonb),
    'review_backlog', (
      SELECT count(*) FROM public.shift_quest_instances WHERE state IN ('submitted', 'appealed')
    ),
    'review_median_hours', (
      SELECT round((percentile_cont(0.5) WITHIN GROUP (
        ORDER BY extract(epoch FROM (r.created_at - s.created_at)) / 3600))::numeric, 1)
      FROM public.shift_quest_reviews r JOIN public.shift_quest_submissions s ON s.id = r.submission_id
      WHERE r.created_at >= v_since
    ),
    'projects_with_feedback_decision', (
      SELECT count(DISTINCT i.project_id) FROM public.shift_quest_instances i
      JOIN public.shift_quest_templates t ON t.id = i.template_id
      WHERE i.state = 'approved' AND t.slug IN ('let-reality-surprise-you', 'give-them-a-reason-to-return')
    ),
    'ownership', jsonb_build_object(
      'projects', (SELECT count(*) FROM public.shift_quest_projects WHERE archived_at IS NULL),
      'all_checks_done', (
        SELECT count(*) FROM public.shift_quest_projects p
        WHERE p.archived_at IS NULL AND NOT EXISTS (
          SELECT 1 FROM public.shift_quest_ownership_checks o
          WHERE o.project_id = p.id AND o.state NOT IN ('demonstrated', 'not_applicable')
        )
      ),
      'with_blocker', (
        SELECT count(DISTINCT project_id) FROM public.shift_quest_ownership_checks WHERE state = 'needs_help'
      )
    ),
    'help', jsonb_build_object(
      'opened_in_window', (SELECT count(*) FROM public.shift_quest_help_requests WHERE created_at >= v_since),
      'resolved_in_window', (SELECT count(*) FROM public.shift_quest_help_requests
                             WHERE status = 'resolved' AND resolved_at >= v_since),
      'open_now', (SELECT count(*) FROM public.shift_quest_help_requests WHERE status IN ('open', 'claimed'))
    ),
    'coins', jsonb_build_object(
      'awarded_in_window', (SELECT COALESCE(sum(amount), 0) FROM public.shift_quest_ledger
                            WHERE kind = 'award' AND created_at >= v_since),
      'reversed_in_window', (SELECT COALESCE(-sum(amount), 0) FROM public.shift_quest_ledger
                             WHERE kind = 'reversal' AND created_at >= v_since),
      'members_awarded', (SELECT count(DISTINCT member_id) FROM public.shift_quest_ledger WHERE kind = 'award'),
      'awards_not_issued', (SELECT count(*) FROM public.shift_quest_instances
                            WHERE state = 'approved' AND award_status = 'not_issued')
    ),
    'redemptions', COALESCE((
      SELECT jsonb_object_agg(status, n) FROM (
        SELECT status, count(*) AS n FROM public.shift_quest_redemptions GROUP BY status
      ) x
    ), '{}'::jsonb),
    'sharing', jsonb_build_object(
      'posted', (SELECT count(*) FROM public.shift_quest_shares WHERE status = 'queued' AND updated_at >= v_since),
      'peer_declined', (SELECT count(*) FROM public.shift_quest_shares WHERE status = 'peer_declined' AND updated_at >= v_since)
    ),
    'delivery', jsonb_build_object(
      'failed', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'failed'),
      'blocked', (SELECT count(*) FROM public.shift_quest_outbox WHERE status = 'blocked')
    ),
    'access_denied_in_window', (
      SELECT count(*) FROM public.shift_quest_audit WHERE outcome LIKE 'denied%' AND created_at >= v_since
    ),
    -- Island and seasons (20261111090700_shift_quests_island): counts only.
    'island', public.shift_quest__island_report(v_since)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Data requests and erasure
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.shift_quest_admin_data_requests(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  PERFORM public.shift_quest__audit(v_me.id, 'data_requests_view', 'data_request', NULL);
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', d.id, 'kind', d.kind, 'note', d.note, 'member_id', d.member_id, 'name', m.display_name,
      'created_at', d.created_at
    ) ORDER BY d.created_at)
    FROM public.shift_quest_data_requests d JOIN public.shift_quest_members m ON m.id = d.member_id
    WHERE d.status = 'open'
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_admin_data_close(p_actor text, p_request uuid, p_done boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
BEGIN
  UPDATE public.shift_quest_data_requests
  SET status = CASE WHEN p_done THEN 'done' ELSE 'rejected' END, handled_by = v_me.id, handled_at = now()
  WHERE id = p_request AND status = 'open';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'data_request_close', 'data_request', p_request);
END;
$$;

/**
 * Erases a member's identity and free text. The ledger and quest states stay,
 * keyed by an opaque ID nobody can link back to the person, so balances and
 * audits still add up. Run only for an approved erasure request.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_erase(p_actor text, p_request uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_request public.shift_quest_data_requests;
  v_member uuid;
BEGIN
  SELECT * INTO v_request FROM public.shift_quest_data_requests
  WHERE id = p_request AND kind = 'erasure' AND status = 'open' FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  v_member := v_request.member_id;
  IF EXISTS (SELECT 1 FROM public.shift_quest_members WHERE id = v_member AND 'admin' = ANY (roles))
     AND NOT EXISTS (SELECT 1 FROM public.shift_quest_members WHERE id <> v_member AND 'admin' = ANY (roles)) THEN
    PERFORM public.shift_quest__fail('last_admin');
  END IF;
  -- Same lock order as a review: the member's quests first, then the plots of
  -- the projects they leave (an approval in progress there finishes first, as
  -- with shift_quest_project_leave), then the member.
  PERFORM 1 FROM public.shift_quest_instances WHERE member_id = v_member ORDER BY id FOR NO KEY UPDATE;
  PERFORM 1 FROM public.shift_quest_plots pl
  WHERE pl.project_id IN (
    SELECT pm.project_id FROM public.shift_quest_project_members pm
    WHERE pm.member_id = v_member AND pm.status = 'active'
  )
  ORDER BY pl.project_id
  FOR NO KEY UPDATE;
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member FOR NO KEY UPDATE;

  -- Open reservations go back first, so stock and balances stay consistent.
  PERFORM public.shift_quest__release(r.id, v_me.id, 'erased', ARRAY['reserved', 'processing'])
  FROM public.shift_quest_redemptions r
  WHERE r.member_id = v_member AND r.status IN ('reserved', 'processing');

  DELETE FROM public.shift_quest_progress WHERE member_id = v_member;
  DELETE FROM public.shift_quest_work_sessions WHERE member_id = v_member;
  DELETE FROM public.shift_quest_inbox WHERE member_id = v_member;
  UPDATE public.shift_quest_ownership_checks SET help_request_id = NULL
  WHERE help_request_id IN (SELECT id FROM public.shift_quest_help_requests WHERE member_id = v_member);
  DELETE FROM public.shift_quest_help_requests WHERE member_id = v_member;
  DELETE FROM public.shift_quest_shares WHERE member_id = v_member OR peer_member_id = v_member;
  -- Queued messages about them carry their words (titles, summaries): drop
  -- the unsent ones and strip the words from all of them, sent ones included.
  -- Messages already posted in Discord are deleted there by hand.
  UPDATE public.shift_quest_outbox
  SET params = jsonb_build_object('erased', true),
      status = CASE WHEN status IN ('pending', 'sending', 'blocked') THEN 'dropped' ELSE status END,
      last_error = CASE WHEN status IN ('pending', 'sending', 'blocked') THEN 'erased' ELSE last_error END
  WHERE member_id = v_member OR params ->> 'member_id' = v_member::text OR params ->> 'peer_member_id' = v_member::text;
  -- Notices they caused in other people's inboxes lose their name and words.
  UPDATE public.shift_quest_inbox SET params = params - 'from' - 'by' - 'body' - 'actor_id'
  WHERE params ->> 'actor_id' = v_member::text;
  -- A teammate's award must not wait forever for their confirmation.
  UPDATE public.shift_quest_contributions SET status = 'declined', responded_at = now()
  WHERE member_id = v_member AND status = 'pending';

  UPDATE public.shift_quest_submissions
  SET evidence = NULL, reflection = NULL, artifact_url = NULL, redacted_at = now()
  WHERE submitted_by = v_member;
  UPDATE public.shift_quest_contributions SET contribution = NULL WHERE member_id = v_member;
  UPDATE public.shift_quest_reviews r SET feedback = NULL
  FROM public.shift_quest_submissions s
  JOIN public.shift_quest_instances i ON i.id = s.instance_id
  WHERE r.submission_id = s.id AND i.member_id = v_member;
  UPDATE public.shift_quest_appeals
  SET reason = NULL,
      status = 'resolved',
      resolved_at = COALESCE(resolved_at, now())
  WHERE member_id = v_member;
  -- Every open quest is archived (version + 1) and any pending revision
  -- withdrawn, so each milestone they held is free for their teammates. Unlike
  -- leaving, submitted and appealed ones go too: their words are redacted
  -- above, so there is nothing left for a reviewer to decide.
  UPDATE public.shift_quest_submissions SET status = 'withdrawn', decided_at = now()
  WHERE status = 'pending' AND instance_id IN (SELECT id FROM public.shift_quest_instances WHERE member_id = v_member);
  UPDATE public.shift_quest_instances
  SET title = '[erased]', why = NULL, goal = '[erased]', next_step = '[erased]', criteria = '[erased]',
      version = version + CASE WHEN state IN ('active', 'paused', 'clarification', 'submitted', 'appealed') THEN 1 ELSE 0 END,
      state = CASE WHEN state IN ('active', 'paused', 'clarification', 'submitted', 'appealed') THEN 'archived' ELSE state END,
      updated_at = now()
  WHERE member_id = v_member;

  UPDATE public.shift_quest_project_members SET status = 'left', responded_at = now(), show_name = false
  WHERE member_id = v_member AND status IN ('active', 'invited');
  -- Seasons and squads (20261111090800_shift_quests_seasons; a no-op before
  -- it): squad places end, the squads they named lose their words, also in
  -- other people's invites. Recognitions and earned unlocks stay, keyed by
  -- the opaque ID (a recognition's reason is admin-written: never personal).
  PERFORM public.shift_quest__island_erase(v_member);
  UPDATE public.shift_quest_projects p
  SET name = '[erased]', ambition = NULL, archived_at = COALESCE(archived_at, now()), updated_at = now()
  WHERE p.created_by = v_member AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_project_members pm WHERE pm.project_id = p.id AND pm.status = 'active'
  );
  -- A project name they wrote also leaves other people's invite notices.
  UPDATE public.shift_quest_inbox SET params = params || '{"project_name": "[erased]"}'::jsonb
  WHERE kind = 'project_invite' AND ref_id IN (
    SELECT id FROM public.shift_quest_projects WHERE created_by = v_member AND name = '[erased]'
  );
  UPDATE public.shift_quest_data_requests SET note = NULL WHERE member_id = v_member;

  UPDATE public.shift_quest_members
  SET discord_user_id = NULL, display_name = NULL, roles = '{}', current_project_id = NULL,
      reminders_opt_in = false, reminder_days = '{}', reminder_hour = NULL, notify_dm = false,
      erased_at = now(), updated_at = now()
  WHERE id = v_member;

  UPDATE public.shift_quest_data_requests
  SET status = 'done', handled_by = v_me.id, handled_at = now()
  WHERE id = p_request;

  PERFORM public.shift_quest__audit(v_me.id, 'member_erase', 'member', v_member);
  RETURN jsonb_build_object('erased', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Delivery worker
-- ---------------------------------------------------------------------------

/**
 * Leases due messages to the bot. Channels and DM recipients are resolved
 * here, at send time: a message for an unconfigured channel is parked as
 * 'blocked' (released when the channel is set), and one about an erased
 * member or for someone who opted out is dropped.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_outbox_claim(p_limit integer)
RETURNS TABLE (
  id uuid, kind text, params jsonb, channel_id text, dm_user_id text,
  member_user_id text, peer_user_id text, attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_row public.shift_quest_outbox;
  v_channel text;
  v_dm text;
  v_member text;
  v_peer text;
BEGIN
  FOR v_row IN
    SELECT o.* FROM public.shift_quest_outbox o
    WHERE (o.status = 'pending' AND o.next_attempt_at <= now())
       OR (o.status = 'sending' AND o.lease_until < now())
    ORDER BY o.created_at
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50)
    FOR UPDATE SKIP LOCKED
  LOOP
    v_channel := NULL; v_dm := NULL; v_member := NULL; v_peer := NULL;

    IF v_row.params ? 'member_id' AND v_row.params ->> 'member_id' IS NOT NULL THEN
      SELECT m.discord_user_id INTO v_member FROM public.shift_quest_members m
      WHERE m.id = (v_row.params ->> 'member_id')::uuid;
      IF v_member IS NULL THEN
        UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'member_gone' WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    END IF;
    IF v_row.params ? 'peer_member_id' AND v_row.params ->> 'peer_member_id' IS NOT NULL THEN
      SELECT m.discord_user_id INTO v_peer FROM public.shift_quest_members m
      WHERE m.id = (v_row.params ->> 'peer_member_id')::uuid;
      IF v_peer IS NULL THEN
        UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'member_gone' WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    END IF;

    IF v_row.target_kind = 'dm' THEN
      SELECT m.discord_user_id INTO v_dm FROM public.shift_quest_members m
      WHERE m.id = v_row.member_id
        AND m.erased_at IS NULL
        AND CASE v_row.kind
              WHEN 'reminder' THEN m.reminders_opt_in AND s.reminders_enabled
              ELSE m.notify_dm
            END;
      IF v_dm IS NULL THEN
        UPDATE public.shift_quest_outbox SET status = 'dropped', last_error = 'opted_out' WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    ELSE
      v_channel := CASE v_row.channel_key
        WHEN 'help' THEN s.help_channel_id
        WHEN 'staff' THEN s.staff_channel_id
        WHEN 'celebrate' THEN s.celebrate_channel_id
        WHEN 'coworking' THEN s.coworking_channel_id
      END;
      -- Shared posts also stop while sharing is paused, and wait for it.
      IF v_channel IS NULL OR (v_row.channel_key IN ('celebrate', 'coworking') AND NOT s.sharing_enabled) THEN
        UPDATE public.shift_quest_outbox SET status = 'blocked',
          last_error = CASE WHEN v_channel IS NULL THEN 'channel_not_configured' ELSE 'sharing_paused' END
        WHERE shift_quest_outbox.id = v_row.id;
        CONTINUE;
      END IF;
    END IF;

    UPDATE public.shift_quest_outbox
    SET status = 'sending', lease_until = now() + interval '2 minutes', attempts = shift_quest_outbox.attempts + 1
    WHERE shift_quest_outbox.id = v_row.id;

    id := v_row.id; kind := v_row.kind; params := v_row.params; channel_id := v_channel; dm_user_id := v_dm;
    member_user_id := v_member; peer_user_id := v_peer; attempts := v_row.attempts + 1;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.shift_quest_outbox_done(
  p_id uuid, p_ok boolean, p_error text, p_message_id text, p_permanent boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_quest_outbox o
  SET status = CASE
        WHEN p_ok THEN 'sent'
        WHEN p_permanent OR o.attempts >= 8 THEN 'failed'
        ELSE 'pending' END,
      sent_at = CASE WHEN p_ok THEN now() END,
      discord_message_id = CASE WHEN p_ok THEN p_message_id END,
      last_error = CASE WHEN p_ok THEN NULL ELSE left(p_error, 300) END,
      next_attempt_at = CASE WHEN p_ok THEN o.next_attempt_at
        ELSE now() + LEAST(interval '1 minute' * power(2, o.attempts), interval '1 hour') END,
      lease_until = NULL
  WHERE o.id = p_id AND o.status = 'sending';
END;
$$;

/** Release blocked shared posts after sharing resumes (the bot calls this each tick). */
CREATE OR REPLACE FUNCTION public.shift_quest_outbox_unblock()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.shift_quest_settings := public.shift_quest__settings();
  v_count integer;
BEGIN
  UPDATE public.shift_quest_outbox
  SET status = 'pending', next_attempt_at = now(), last_error = NULL
  WHERE status = 'blocked'
    AND CASE channel_key
      WHEN 'help' THEN s.help_channel_id IS NOT NULL
      WHEN 'staff' THEN s.staff_channel_id IS NOT NULL
      WHEN 'celebrate' THEN s.celebrate_channel_id IS NOT NULL AND s.sharing_enabled
      WHEN 'coworking' THEN s.coworking_channel_id IS NOT NULL AND s.sharing_enabled
      ELSE false
    END;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

/**
 * Queues today's reminders for members who opted in, at their chosen hour
 * (Bangkok time). One per member per day, so a restart never repeats one.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_enqueue_reminders(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_local timestamp := p_now AT TIME ZONE 'Asia/Bangkok';
  v_count integer;
BEGIN
  IF NOT (public.shift_quest__settings()).reminders_enabled THEN
    RETURN 0;
  END IF;

  INSERT INTO public.shift_quest_outbox (dedupe_key, target_kind, member_id, kind, params)
  SELECT 'remind:' || m.id || ':' || v_local::date, 'dm', m.id, 'reminder',
         jsonb_build_object('open_quests', (
           SELECT count(*) FROM public.shift_quest_instances i
           WHERE i.member_id = m.id AND i.state IN ('active', 'clarification')))
  FROM public.shift_quest_members m
  WHERE m.reminders_opt_in AND m.erased_at IS NULL AND m.onboarded_at IS NOT NULL
    AND m.reminder_hour = extract(hour FROM v_local)
    AND extract(dow FROM v_local)::smallint = ANY (m.reminder_days)
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
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
