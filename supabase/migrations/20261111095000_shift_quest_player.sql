-- SHIFT High Island: the player, the progress economy, prizes, AI island news
-- and parent consent.
--
-- Plan: docs/designs/shift-high-island-web.md, section "Player, economy,
-- prizes, AI digests, parent consent". This file adds:
--
--   * Parent consent for minors. shift_quest_consents keeps one row per
--     member: waiting (a parent link is out), granted, declined or withdrawn,
--     on one basis: parent (a parent agreed on the island's parent page),
--     adult (the student confirmed their own age, at least
--     settings.consent_adult_age, default 20), shift_parent or shift_adult
--     (imported by the website from the student's own SHIFT application).
--     settings.consent_required (default on) is the kill switch: off, every
--     member counts as consented for appearing on the island, shares and
--     the shop, but never for AI news (shift_quest__consent_ai_ok needs a
--     granted row with the island's own AI line, whatever the switch says).
--     Imports from SHIFT never carry AI news. A parent's no (declined or
--     withdrawn) stays until staff reset it (/admin island consent-reset): a
--     student can neither send a new link nor confirm their own age over it.
--   * Public appearance needs consent. shift_quest__name_visible (the one
--     place every outsider view asks: other students' island maps, the
--     weekly post, the live post's plots and approved total) now also needs
--     every active member's consent. Shares to Discord (celebrations,
--     recognitions, intentions) need the author's and the named peer's
--     consent (shift_quest__queue_share). Until then a student plays
--     privately exactly as before.
--   * The progress economy. Catalog items gain min_stage (tree stage 0..7)
--     and requires_community (an approved community quest, milestone 6 or
--     7). shift_quest_redeem refuses consent_required, stage_required and
--     community_required, in that order, after the price check and before
--     stock. Staff awards (taught at the next SHIFT, helped the most) are
--     ledger awards under fixed rule keys with a written reason
--     (shift_quest_admin_staff_award); those keys can never pay for a quest
--     or a season unlock (template rules, proposal agreements and unlocks
--     refuse them; __issue_award and __grant_unlocks pay nothing under them).
--     Pinning a rule on a template also prices that template's quests still
--     open without a rule.
--   * The player's own reads for the website: shift_quest_character (stage,
--     quest counts, community value, check-in days and a rest-tolerant run,
--     coins) and shift_quest_wallet (balance, earn rates, recent entries,
--     the shop with lock reasons). Counts only: no ids, no names, no ranking.
--   * AI island news. The website's scheduled job reads
--     shift_quest_digest_inputs (eligible teams only), writes Thai summaries
--     through shift_quest_digest_save (eligibility checked again), and the
--     island reads shift_quest_island_news. A team is eligible only while
--     every active member shows the name, has consent and AI consent (adult
--     basis, or a parent who ticked the AI line), and staff have not hidden
--     it. settings.digest_enabled (default off) gates generation, the feed
--     and the Discord post. The model reads only work by current members who
--     allow AI news; the window ends at run time. The bot claims a day before
--     posting (no double post after a restart) and re-renders the last 7
--     days' posts when a team stops being eligible (shift_quest_digest_post_current).
--     Erasing a member deletes the summaries of every project they were on. The member names in digest_inputs.redact exist
--     only so the server can scrub them before a model sees anything; news
--     output never carries a person's name, id or contact.
--   * Parent links are token-scoped: only the sha256 of the token is stored
--     (token_hash), the raw token lives only in the link the student sends.
--     The parent page sees the nickname the student typed and the state,
--     never an id. Links answer for 14 days; a new link replaces the old one;
--     3 links per member per 24 hours. Nothing here opens a private channel
--     between an adult and a student.
--   * shift_quest_schema_version() = 9. The website still needs 6 and the bot
--     2: every new read fails soft without this file, and the bot starts the
--     digest post only from 9 (DIGEST_SCHEMA in bot/src/quests/digest.ts).
--
-- This file seeds no prices, rules or catalog items: the numbers live in
-- lib/content/shift-island-economy.ts (DRAFT) and reach the database only
-- through /admin rule, /admin template-rule and /admin catalog, or the quest
-- sandbox seed (bot/scripts/economy-seed.ts).
--
-- Grants are per function, with no grant loop:
--   website only: shift_quest_character, _wallet, _consent_get,
--     _consent_adult, _consent_link, _consent_import, _consent_parent_view,
--     _consent_parent_answer, _consent_parent_withdraw, _island_news,
--     _digest_inputs, _digest_save;
--   website and bot: shift_quest_digest_hide, shift_quest_redeem,
--     shift_quest_redeem_cancel;
--   bot only: shift_quest_digest_post_next, _digest_claim, _digest_mark,
--     _digest_post_current, _admin_island_status, _admin_island_set,
--     _admin_consent_reset, _admin_catalog_gate, _admin_staff_award.
-- Mirrored in supabase/tests/shift_quests/run-local.sh (check_privileges),
-- web_board.ts, web_canvas.ts and player.ts. Any later file that repeats the
-- bot grant loop of 20261111090600_shift_quest_bot_role must exclude the
-- website-only functions above.
--
-- This file never references the whiteboard tables, auth.users or
-- shift_applications: the quest sandbox has none. The website imports SHIFT
-- consent itself and passes only the outcome (shift_quest_consent_import).
--
-- Prod-first apply: additive and idempotent (ADD COLUMN IF NOT EXISTS,
-- CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE with the same signatures, so
-- replaced functions keep their grants). Keep this file after
-- 20261111094000_shift_quest_live: it reads live_channel_id, and a second
-- pass of the earlier files' loops changes the grants this file sets last.

-- ---------------------------------------------------------------------------
-- Settings and catalog columns
-- ---------------------------------------------------------------------------

-- On: a member counts as consented only with a granted consent row. Off:
-- everyone counts as consented (the old behaviour).
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS consent_required boolean NOT NULL DEFAULT true;
-- The age at which a student confirms their own consent (PDPA: 20).
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS consent_adult_age smallint NOT NULL DEFAULT 20
  CHECK (consent_adult_age BETWEEN 13 AND 25);
-- AI island news: generation, the website's feed and the Discord post.
ALTER TABLE public.shift_quest_settings ADD COLUMN IF NOT EXISTS digest_enabled boolean NOT NULL DEFAULT false;

-- Shop gates: the tree stage the redeeming member's current project must
-- have, and whether they need an approved community quest (milestone 6 or 7).
ALTER TABLE public.shift_quest_catalog ADD COLUMN IF NOT EXISTS min_stage smallint NOT NULL DEFAULT 0
  CHECK (min_stage BETWEEN 0 AND 7);
ALTER TABLE public.shift_quest_catalog ADD COLUMN IF NOT EXISTS requires_community boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_consents (
  member_id uuid PRIMARY KEY REFERENCES public.shift_quest_members(id),
  state text NOT NULL CHECK (state IN ('waiting', 'granted', 'declined', 'withdrawn')),
  basis text NULL CHECK (basis IN ('parent', 'adult', 'shift_parent', 'shift_adult')),
  -- The parent ticked the separate AI news line (adult bases always count).
  ai_ok boolean NOT NULL DEFAULT false,
  notice_version text NULL CHECK (notice_version IS NULL OR char_length(notice_version) <= 40),
  -- Only for the adult basis: the date the student gave.
  birth_date date NULL,
  -- The nickname the student typed for the parent to recognise them.
  student_label text NULL CHECK (student_label IS NULL OR char_length(student_label) <= 40),
  -- sha256 hex of the parent link's token; the raw token is never stored.
  token_hash text NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  token_expires_at timestamptz NULL,
  parent_name text NULL CHECK (parent_name IS NULL OR char_length(parent_name) <= 120),
  parent_relationship text NULL CHECK (parent_relationship IN ('พ่อ', 'แม่', 'ผู้ปกครอง')),
  decided_at timestamptz NULL,
  ip text NULL CHECK (ip IS NULL OR char_length(ip) <= 64),
  user_agent text NULL CHECK (user_agent IS NULL OR char_length(user_agent) <= 400),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The parent link out now asks a granted student's parent for the AI news
-- line only (shift_quest_consent_link on a granted row without ai_ok).
ALTER TABLE public.shift_quest_consents ADD COLUMN IF NOT EXISTS ai_link boolean NOT NULL DEFAULT false;
-- An import from SHIFT never carries AI news (SHIFT's AI tick covers mentor
-- notes): rows an earlier draft of this file imported with it lose it.
-- Idempotent, and a no-op on a fresh database.
UPDATE public.shift_quest_consents SET ai_ok = false, updated_at = now()
WHERE basis IN ('shift_parent', 'shift_adult') AND ai_ok;

COMMENT ON TABLE public.shift_quest_consents IS
  'SHIFT High island consent, one row per member. Parent name, IP, user agent and birth date are personal data: never copy them into logs, the brain or fixtures. Deleted on erasure.';

CREATE TABLE IF NOT EXISTS public.shift_quest_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The Bangkok day the summary is for (a week recap: the Sunday it ends on).
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('day', 'week')),
  project_id uuid NOT NULL REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  summary text NULL CHECK (summary IS NULL OR char_length(summary) <= 600),
  no_update boolean NOT NULL,
  model text NULL CHECK (model IS NULL OR char_length(model) <= 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day, kind, project_id),
  CONSTRAINT shift_quest_digests_no_update CHECK (NOT no_update OR summary IS NULL)
);

COMMENT ON TABLE public.shift_quest_digests IS
  'SHIFT High island news: AI summaries in Thai of opted-in, consented teams, one per team, day and kind. Never a person''s name or contact.';

CREATE INDEX IF NOT EXISTS shift_quest_digests_project
  ON public.shift_quest_digests (project_id, kind, day DESC);

CREATE TABLE IF NOT EXISTS public.shift_quest_digest_hides (
  project_id uuid PRIMARY KEY REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  hidden_by uuid NULL REFERENCES public.shift_quest_members(id),
  reason text NULL CHECK (reason IS NULL OR char_length(reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shift_quest_digest_posts (
  -- One Discord message per Bangkok day.
  day date PRIMARY KEY,
  channel_id text NOT NULL CHECK (channel_id ~ '^[0-9]{5,25}$'),
  message_id text NULL CHECK (message_id ~ '^[0-9]{5,25}$'),
  posted_at timestamptz NULL
);
-- A bot process claims the day before it sends (shift_quest_digest_claim), so
-- a restart between send and mark never posts twice; kind is what it posted,
-- so the bot can re-render the message when a team leaves the news.
ALTER TABLE public.shift_quest_digest_posts ADD COLUMN IF NOT EXISTS claimed_at timestamptz NULL;
ALTER TABLE public.shift_quest_digest_posts ADD COLUMN IF NOT EXISTS kind text NULL CHECK (kind IN ('day', 'week'));

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shift_quest_consents', 'shift_quest_digests', 'shift_quest_digest_hides', 'shift_quest_digest_posts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: never granted to the bot or the website)
-- ---------------------------------------------------------------------------

/** True when consent is not required, or the member's consent is granted. */
CREATE OR REPLACE FUNCTION public.shift_quest__consent_ok(p_member uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT COALESCE((SELECT consent_required FROM public.shift_quest_settings WHERE id), true)
    OR EXISTS (SELECT 1 FROM public.shift_quest_consents WHERE member_id = p_member AND state = 'granted');
$$;

/**
 * AI news allowed: a granted row on the island's adult basis (the student
 * confirmed their own age, AI line included), or one whose parent ticked the
 * island's AI line. Never short-circuits on consent_required: switching
 * consent off never sends anyone's work to a model or into a Discord digest.
 * Consent imported from SHIFT never counts here (SHIFT's AI tick covers a
 * different use: progress notes to the mentor).
 */
CREATE OR REPLACE FUNCTION public.shift_quest__consent_ai_ok(p_member uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shift_quest_consents
    WHERE member_id = p_member AND state = 'granted' AND (basis = 'adult' OR ai_ok)
  );
$$;

/** A parent said no on the island (declined), or a parent's consent was withdrawn (island or SHIFT). */
CREATE OR REPLACE FUNCTION public.shift_quest__parent_said_no(p_member uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shift_quest_consents
    WHERE member_id = p_member
      AND (state = 'declined' OR (state = 'withdrawn' AND basis IN ('parent', 'shift_parent')))
  );
$$;

/** The staff award rule keys: paid only by shift_quest_admin_staff_award, never by a quest or an unlock. */
CREATE OR REPLACE FUNCTION public.shift_quest__staff_key(p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p_key IN ('taught-next-shift', 'helped-most'), false);
$$;

/** The tree stage of the member's current project (0 without one). */
CREATE OR REPLACE FUNCTION public.shift_quest__member_stage(p_member uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT cardinality(public.shift_quest__milestones(public.shift_quest__current_project(m)))
    FROM public.shift_quest_members m WHERE m.id = p_member
  ), 0);
$$;

/** The member is a confirmed contributor of an approved community quest (milestone 6 or 7). */
CREATE OR REPLACE FUNCTION public.shift_quest__community_done(p_member uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shift_quest_contributions c
    JOIN public.shift_quest_submissions s ON s.id = c.submission_id
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE c.member_id = p_member AND c.status = 'confirmed' AND s.status = 'approved' AND i.milestone IN (6, 7)
  );
$$;

/** Why the member may not redeem the item now: 'consent', 'stage', 'community' (in that order) or null. */
CREATE OR REPLACE FUNCTION public.shift_quest__item_lock(p_member uuid, p_item public.shift_quest_catalog)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.shift_quest__consent_ok(p_member) THEN 'consent'
    WHEN public.shift_quest__member_stage(p_member) < p_item.min_stage THEN 'stage'
    WHEN p_item.requires_community AND NOT public.shift_quest__community_done(p_member) THEN 'community'
  END;
$$;

/**
 * A project's name may be shown only while it is not archived, it has active
 * members, and every active member opted in (show_name) and has consent. The
 * body of 20261111090700_shift_quests_island plus the consent check: every
 * outsider view (other students' maps, the weekly and the live post) goes
 * through this one function.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__name_visible(p_project uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
      SELECT 1 FROM public.shift_quest_projects WHERE id = p_project AND archived_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.shift_quest_project_members WHERE project_id = p_project AND status = 'active'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members
      WHERE project_id = p_project AND status = 'active'
        AND (NOT show_name OR NOT public.shift_quest__consent_ok(member_id))
    );
$$;

/** The team may be summarised by AI: shown on the island, every active member AI-consented, not hidden by staff. */
CREATE OR REPLACE FUNCTION public.shift_quest__digest_eligible(p_project uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.shift_quest__name_visible(p_project)
    AND NOT EXISTS (
      SELECT 1 FROM public.shift_quest_project_members
      WHERE project_id = p_project AND status = 'active' AND NOT public.shift_quest__consent_ai_ok(member_id)
    )
    AND NOT EXISTS (SELECT 1 FROM public.shift_quest_digest_hides WHERE project_id = p_project);
$$;

/** The consent state the website shows: {required, state, basis, ai, ok, link_expires_at, adult_age}. */
CREATE OR REPLACE FUNCTION public.shift_quest__consent_json(p_member uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'required', s.consent_required,
    'state', COALESCE(c.state, 'none'),
    'basis', c.basis,
    'ai', public.shift_quest__consent_ai_ok(p_member),
    'ok', public.shift_quest__consent_ok(p_member),
    -- A waiting link, or an AI-only link out to the parent of a granted student.
    'link_expires_at', CASE WHEN c.state = 'waiting' THEN c.token_expires_at
                            WHEN c.state = 'granted' AND c.ai_link THEN c.token_expires_at END,
    'adult_age', s.consent_adult_age,
    -- A parent said no: a new link waits for staff (shift_quest_admin_consent_reset).
    'parent_said_no', public.shift_quest__parent_said_no(p_member)
  )
  FROM public.shift_quest_settings s
  LEFT JOIN public.shift_quest_consents c ON c.member_id = p_member
  WHERE s.id;
$$;

-- ---------------------------------------------------------------------------
-- Replaced functions (same signatures, so their grants stay)
-- ---------------------------------------------------------------------------

/**
 * The body of 20261111090100_shift_quests_core_functions plus consent: a
 * share reaches Discord only when its author, and the peer it names, have
 * consent ('sq:consent_required').
 */
CREATE OR REPLACE FUNCTION public.shift_quest__queue_share(p_share public.shift_quest_shares)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.shift_quest__settings()).sharing_enabled THEN
    PERFORM public.shift_quest__fail('sharing_paused');
  END IF;
  IF NOT public.shift_quest__consent_ok(p_share.member_id)
     OR (p_share.peer_member_id IS NOT NULL AND NOT public.shift_quest__consent_ok(p_share.peer_member_id)) THEN
    PERFORM public.shift_quest__fail('consent_required');
  END IF;
  UPDATE public.shift_quest_shares SET status = 'queued', updated_at = now() WHERE id = p_share.id;
  PERFORM public.shift_quest__post(
    'share:' || p_share.id,
    CASE WHEN p_share.kind = 'intention' THEN 'coworking' ELSE 'celebrate' END,
    p_share.kind,
    jsonb_build_object(
      'member_id', p_share.member_id, 'peer_member_id', p_share.peer_member_id, 'body', p_share.body,
      'title', (SELECT title FROM public.shift_quest_instances WHERE id = p_share.instance_id)
    )
  );
END;
$$;

/**
 * The body of 20261111090300_shift_quests_coin_functions plus the shop gates,
 * checked after the price and before stock: consent, then the tree stage,
 * then a community quest. A duplicate request key still returns first, so a
 * retry after a gate change finds the request it already made.
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
  v_lock text;
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
  -- 20261111095000_shift_quest_player: consent, stage, community.
  v_lock := public.shift_quest__item_lock(v_member.id, v_item);
  IF v_lock = 'consent' THEN
    PERFORM public.shift_quest__fail('consent_required');
  ELSIF v_lock = 'stage' THEN
    PERFORM public.shift_quest__fail('stage_required');
  ELSIF v_lock = 'community' THEN
    PERFORM public.shift_quest__fail('community_required');
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
 * The body of 20261111090300 plus, per item, its gates, the lock reason for
 * this member (shift_quest__item_lock) and whether the balance covers it,
 * and at the top the member's stage, community quest and consent.
 */
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
  v_balance integer := public.shift_quest__balance(v_member.id);
BEGIN
  RETURN jsonb_build_object(
    'live', v_live,
    'terms', CASE WHEN v_live THEN (public.shift_quest__settings()).redemption_terms END,
    'balance', v_balance,
    'stage', public.shift_quest__member_stage(v_member.id),
    'community_done', public.shift_quest__community_done(v_member.id),
    'consent_ok', public.shift_quest__consent_ok(v_member.id),
    'items', CASE WHEN v_live THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'description', c.description, 'cost', c.cost,
        'in_stock', c.stock_available > 0,
        'min_stage', c.min_stage, 'requires_community', c.requires_community,
        'locked', public.shift_quest__item_lock(v_member.id, c),
        'affordable', v_balance >= c.cost
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
 * The body of 20261111090300 plus, per entry, the rule key it was paid under
 * and the recognition category, so the reader can name staff awards.
 */
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
        'title', i.title, 'rule_key', rr.key, 'category', g.category
      ) ORDER BY l.created_at DESC)
      FROM (
        SELECT * FROM public.shift_quest_ledger WHERE member_id = v_member.id
        ORDER BY created_at DESC LIMIT 20
      ) l
      LEFT JOIN public.shift_quest_instances i ON i.id = l.instance_id
      LEFT JOIN public.shift_quest_reward_rules rr ON rr.id = l.reward_rule_id
      LEFT JOIN public.shift_quest_recognitions g ON g.ledger_entry_id = l.id
    ), '[]'::jsonb),
    'awards_live', public.shift_quest__awards_live()
  );
END;
$$;

/** The body of 20261111090400_shift_quests_admin_functions plus the shop gates. */
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
                   WHERE r.item_id = c.id AND r.status IN ('reserved', 'processing')),
      'min_stage', c.min_stage, 'requires_community', c.requires_community
    ) ORDER BY c.created_at)
    FROM public.shift_quest_catalog c
  ), '[]'::jsonb);
END;
$$;

/**
 * The body of 20261111090400 plus: the staff award keys (taught-next-shift,
 * helped-most) can never pay for a quest ('sq:bad_input').
 */
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
  v_rule uuid;
BEGIN
  IF public.shift_quest__staff_key(v_key) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF v_key IS NOT NULL THEN
    SELECT id INTO v_rule FROM public.shift_quest_reward_rules WHERE key = v_key AND status = 'published';
    IF v_rule IS NULL THEN
      PERFORM public.shift_quest__fail('rule_not_found');
    END IF;
  END IF;
  UPDATE public.shift_quest_templates SET reward_rule_key = v_key
  WHERE slug = p_slug AND status = 'published'
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    PERFORM public.shift_quest__fail('template_unavailable');
  END IF;
  -- Quests of this template already open without a rule (chosen before the
  -- rule was pinned, or kept open across the switch) earn under it too, so
  -- turning coins on mid-season pays the work still in progress. A quest that
  -- already has a rule keeps it; approved quests are never re-priced.
  IF v_rule IS NOT NULL THEN
    UPDATE public.shift_quest_instances
    SET reward_rule_id = v_rule, updated_at = now()
    WHERE template_id IN (SELECT id FROM public.shift_quest_templates WHERE slug = p_slug)
      AND reward_rule_id IS NULL
      AND state IN ('active', 'paused', 'clarification', 'submitted', 'appealed');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'template_rule', 'template', v_id);
END;
$$;

/**
 * The body of 20261111090200_shift_quests_review_functions plus: a quest
 * whose pinned rule is a staff award key (taught-next-shift, helped-most)
 * earns nothing ('no_reward_rule'). Those keys pay only through
 * shift_quest_admin_staff_award, with a written reason.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__issue_award(p_instance uuid, p_actor uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_instance public.shift_quest_instances;
  v_submission public.shift_quest_submissions;
  v_rule public.shift_quest_reward_rules;
  v_template public.shift_quest_templates;
  v_reason text;
  v_people uuid[];
  v_person uuid;
  v_each integer;
  v_issued integer := 0;
  v_capped integer := 0;
  v_entry uuid;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance;
  IF v_instance.state <> 'approved' THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'not_approved');
  END IF;
  SELECT * INTO v_submission FROM public.shift_quest_submissions
  WHERE instance_id = p_instance AND status = 'approved'
  ORDER BY revision DESC LIMIT 1;
  SELECT * INTO v_rule FROM public.shift_quest_reward_rules WHERE id = v_instance.reward_rule_id;
  SELECT * INTO v_template FROM public.shift_quest_templates WHERE id = v_instance.template_id;

  SELECT array_agg(c.member_id ORDER BY c.member_id) INTO v_people
  FROM public.shift_quest_contributions c
  JOIN public.shift_quest_members m ON m.id = c.member_id
  WHERE c.submission_id = v_submission.id AND c.status = 'confirmed' AND m.erased_at IS NULL;

  v_reason := CASE
    WHEN NOT public.shift_quest__awards_live() THEN 'awards_paused'
    WHEN v_instance.reward_rule_id IS NULL THEN 'no_reward_rule'
    -- 20261111095000_shift_quest_player: staff award keys never pay for a quest.
    WHEN public.shift_quest__staff_key(v_rule.key) THEN 'no_reward_rule'
    WHEN v_instance.template_id IS NULL
         AND (v_instance.reward_agreed_at IS NULL OR v_instance.reward_agreed_at > v_submission.created_at)
      THEN 'reward_not_agreed'
    WHEN v_template.repeatable AND NOT v_submission.distinct_confirmed AND EXISTS (
      SELECT 1 FROM public.shift_quest_instances i
      JOIN public.shift_quest_templates t ON t.id = i.template_id
      WHERE i.member_id = v_instance.member_id AND i.id <> v_instance.id
        AND i.state = 'approved' AND t.slug = v_template.slug
    ) THEN 'distinct_not_confirmed'
    WHEN EXISTS (
      SELECT 1 FROM public.shift_quest_contributions c
      JOIN public.shift_quest_members m ON m.id = c.member_id
      WHERE c.submission_id = v_submission.id AND c.status = 'pending' AND m.erased_at IS NULL
    ) THEN 'contributions_pending'
    WHEN COALESCE(cardinality(v_people), 0) = 0 THEN 'no_contributors'
    WHEN cardinality(v_people) > 1 AND v_rule.team_allocation IS NULL THEN 'team_allocation_missing'
  END;

  IF v_reason IS NULL THEN
    v_each := CASE
      WHEN cardinality(v_people) = 1 OR v_rule.team_allocation = 'each_confirmed' THEN v_rule.amount
      ELSE v_rule.amount / cardinality(v_people)
    END;
    IF v_each <= 0 THEN
      v_reason := 'split_too_small';
    END IF;
  END IF;

  IF v_reason IS NOT NULL THEN
    UPDATE public.shift_quest_instances SET award_status = 'not_issued', award_note = v_reason
    WHERE id = p_instance AND award_status IS DISTINCT FROM 'issued';
    RETURN jsonb_build_object('issued', false, 'reason', v_reason);
  END IF;

  FOREACH v_person IN ARRAY v_people LOOP
    -- Per-member lock so caps and balances cannot race with another award or
    -- a redemption. Re-entrant: the caller locked the whole set up front.
    PERFORM 1 FROM public.shift_quest_members WHERE id = v_person FOR NO KEY UPDATE;

    IF EXISTS (SELECT 1 FROM public.shift_quest_ledger WHERE source_key = 'award:' || p_instance || ':' || v_person) THEN
      v_issued := v_issued + 1;
      CONTINUE;
    END IF;
    -- An award reversed in full no longer counts toward the cap.
    IF v_rule.cap_per_member IS NOT NULL AND (
      SELECT count(*) FROM public.shift_quest_ledger l
      JOIN public.shift_quest_reward_rules r ON r.id = l.reward_rule_id
      WHERE l.member_id = v_person AND l.kind = 'award' AND r.key = v_rule.key
        AND l.amount + COALESCE((
          SELECT sum(x.amount) FROM public.shift_quest_ledger x WHERE x.references_entry_id = l.id
        ), 0) > 0
    ) >= v_rule.cap_per_member THEN
      v_capped := v_capped + 1;
      CONTINUE;
    END IF;

    v_entry := NULL;
    INSERT INTO public.shift_quest_ledger (
      member_id, amount, kind, source_key, reward_rule_id, instance_id, reason, actor_id
    )
    VALUES (
      v_person, v_each, 'award', 'award:' || p_instance || ':' || v_person, v_rule.id, p_instance,
      'quest_award', p_actor
    )
    ON CONFLICT (source_key) DO NOTHING
    RETURNING id INTO v_entry;

    v_issued := v_issued + 1;
    IF v_entry IS NOT NULL THEN
      PERFORM public.shift_quest__notify(
        v_person, 'award:' || v_entry, 'award_issued',
        jsonb_build_object('title', v_instance.title, 'amount', v_each), p_instance
      );
    END IF;
  END LOOP;

  UPDATE public.shift_quest_instances
  SET award_status = CASE WHEN v_issued > 0 THEN 'issued' ELSE 'not_issued' END,
      award_note = CASE WHEN v_capped > 0 THEN 'cap_reached' END
  WHERE id = p_instance;

  RETURN jsonb_build_object('issued', v_issued > 0, 'members', v_issued, 'capped', v_capped, 'amount', v_each,
                            'reason', CASE WHEN v_issued = 0 THEN 'cap_reached' END);
END;
$$;

/**
 * The body of 20261111090200 plus: the staff award keys are not offered
 * to reviewers agreeing a proposed quest.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_proposal_get(p_actor text, p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_instance public.shift_quest_instances;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance AND template_id IS NULL;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF public.shift_quest__conflicted(v_me.id, v_instance) THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'proposal_view', 'quest', p_instance);
  RETURN public.shift_quest__quest_json(v_instance)
    || jsonb_build_object('student', (SELECT display_name FROM public.shift_quest_members WHERE id = v_instance.member_id),
                          'rules', COALESCE((
                            SELECT jsonb_agg(jsonb_build_object('key', key, 'amount', amount) ORDER BY key)
                            FROM public.shift_quest_reward_rules
                            WHERE status = 'published' AND NOT public.shift_quest__staff_key(key)
                          ), '[]'::jsonb));
END;
$$;

/**
 * The body of 20261111090200 plus: a staff award key can never be agreed
 * for a proposed quest ('sq:bad_input').
 */
CREATE OR REPLACE FUNCTION public.shift_quest_proposal_agree(
  p_actor text, p_instance uuid, p_rule_key text, p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_instance public.shift_quest_instances;
  v_rule public.shift_quest_reward_rules;
BEGIN
  SELECT * INTO v_instance FROM public.shift_quest_instances WHERE id = p_instance FOR NO KEY UPDATE;
  IF NOT FOUND OR v_instance.template_id IS NOT NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF public.shift_quest__conflicted(v_me.id, v_instance) THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  IF v_instance.state NOT IN ('active', 'paused', 'clarification') THEN
    PERFORM public.shift_quest__fail('bad_state');
  END IF;
  IF public.shift_quest__staff_key(public.shift_quest__trim(p_rule_key)) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF public.shift_quest__trim(p_rule_key) IS NOT NULL THEN
    SELECT * INTO v_rule FROM public.shift_quest_reward_rules WHERE key = p_rule_key AND status = 'published';
    IF NOT FOUND THEN
      PERFORM public.shift_quest__fail('rule_not_found');
    END IF;
  END IF;

  UPDATE public.shift_quest_instances
  SET reward_rule_id = v_rule.id, reward_agreed_by = v_me.id, reward_agreed_at = now(),
      version = version + 1, updated_at = now()
  WHERE id = p_instance;

  PERFORM public.shift_quest__notify(
    v_instance.member_id, 'agreed:' || p_instance || ':' || v_instance.version, 'proposal_agreed',
    jsonb_build_object('title', v_instance.title, 'amount', v_rule.amount,
                       'note', public.shift_quest__check_len(p_note, 1000, false)),
    p_instance
  );
  PERFORM public.shift_quest__audit(v_me.id, 'proposal_agree', 'quest', p_instance);
END;
$$;

/**
 * The body of 20261111090800_shift_quests_seasons plus: a season unlock can
 * never pay under a staff award key ('sq:bad_input').
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_unlock(
  p_actor text, p_season uuid, p_label text, p_milestone_count smallint, p_deadline date, p_rule_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_label text := public.shift_quest__check_len(p_label, 80, true);
  v_key text := public.shift_quest__trim(p_rule_key);
  v_old public.shift_quest_season_unlocks;
  v_id uuid;
BEGIN
  IF public.shift_quest__staff_key(v_key) THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shift_quest_seasons WHERE id = p_season AND status IN ('draft', 'active')) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF p_milestone_count IS NULL OR p_milestone_count NOT BETWEEN 1 AND 7 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_deadline IS NULL THEN
    PERFORM public.shift_quest__fail('bad_dates');
  END IF;
  IF v_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_reward_rules WHERE key = v_key AND status = 'published'
  ) THEN
    PERFORM public.shift_quest__fail('rule_not_found');
  END IF;

  -- As shift_quest_admin_season: one edit at a time, then the whole island.
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_season'));
  PERFORM public.shift_quest__lock_island();

  SELECT * INTO v_old FROM public.shift_quest_season_unlocks WHERE season_id = p_season AND label = v_label;
  IF v_old.id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.shift_quest_season_unlock_earned WHERE unlock_id = v_old.id)
     AND (p_milestone_count > v_old.milestone_count OR p_deadline < v_old.deadline
          OR v_key IS DISTINCT FROM v_old.reward_rule_key) THEN
    PERFORM public.shift_quest__fail('unlock_has_grants');
  END IF;

  INSERT INTO public.shift_quest_season_unlocks (season_id, label, milestone_count, deadline, reward_rule_key, created_by)
  VALUES (p_season, v_label, p_milestone_count, p_deadline, v_key, v_me.id)
  ON CONFLICT (season_id, label) DO UPDATE
    SET milestone_count = EXCLUDED.milestone_count, deadline = EXCLUDED.deadline,
        reward_rule_key = EXCLUDED.reward_rule_key
  RETURNING id INTO v_id;

  -- Everyone who already qualifies earns it now (no-op unless the season is active).
  PERFORM public.shift_quest__sweep_season(p_season, v_me.id);

  PERFORM public.shift_quest__audit(v_me.id, 'season_unlock_upsert', 'season_unlock', v_id);
  RETURN v_id;
END;
$$;

/**
 * The body of 20261111090800 plus: an unlock pinned to a staff award key
 * (set before this file) is still earned, but pays no coins.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__grant_unlocks(
  p_season public.shift_quest_seasons, p_project uuid, p_actor uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from timestamptz;
  v_unlock public.shift_quest_season_unlocks;
  v_rule public.shift_quest_reward_rules;
  v_person uuid;
  v_inserted boolean;
  v_entry uuid;
  v_amount integer;
  v_earned integer := 0;
BEGIN
  IF p_season.id IS NULL OR p_project IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.shift_quest_projects WHERE id = p_project AND archived_at IS NULL
  ) THEN
    RETURN 0;
  END IF;
  v_from := public.shift_quest__bkk_start(p_season.starts_on);

  FOR v_unlock IN
    SELECT * FROM public.shift_quest_season_unlocks u
    WHERE u.season_id = p_season.id
      AND (public.shift_quest__season_tally(p_project, v_from, public.shift_quest__bkk_end(u.deadline)) ->> 'count')::integer
          >= u.milestone_count
    ORDER BY u.created_at, u.id
  LOOP
    v_rule := NULL;
    SELECT * INTO v_rule FROM public.shift_quest_reward_rules
    WHERE key = v_unlock.reward_rule_key AND status = 'published'
      AND NOT public.shift_quest__staff_key(key);

    FOR v_person IN
      SELECT pm.member_id FROM public.shift_quest_project_members pm
      JOIN public.shift_quest_members m ON m.id = pm.member_id
      WHERE pm.project_id = p_project AND pm.status = 'active' AND m.erased_at IS NULL
      ORDER BY pm.member_id
    LOOP
      -- Re-entrant: the caller locked every member up front.
      PERFORM 1 FROM public.shift_quest_members WHERE id = v_person FOR NO KEY UPDATE;
      v_inserted := NULL;
      INSERT INTO public.shift_quest_season_unlock_earned (unlock_id, member_id)
      VALUES (v_unlock.id, v_person)
      ON CONFLICT DO NOTHING
      RETURNING true INTO v_inserted;
      IF v_inserted IS NULL THEN
        CONTINUE;
      END IF;
      v_earned := v_earned + 1;

      v_amount := NULL;
      IF v_rule.id IS NOT NULL AND public.shift_quest__awards_live()
         AND public.shift_quest__under_cap(v_person, v_rule) THEN
        v_entry := NULL;
        INSERT INTO public.shift_quest_ledger (
          member_id, amount, kind, source_key, reward_rule_id, reason, actor_id
        )
        VALUES (
          v_person, v_rule.amount, 'award', 'unlock:' || v_unlock.id || ':' || v_person, v_rule.id,
          'season_unlock', p_actor
        )
        ON CONFLICT (source_key) DO NOTHING
        RETURNING id INTO v_entry;
        IF v_entry IS NOT NULL THEN
          v_amount := v_rule.amount;
        END IF;
      END IF;

      PERFORM public.shift_quest__notify(
        v_person, 'unlock:' || v_unlock.id || ':' || v_person, 'unlock_earned',
        jsonb_build_object('label', v_unlock.label, 'amount', v_amount), v_unlock.id
      );
    END LOOP;
  END LOOP;

  RETURN v_earned;
END;
$$;

/**
 * The body of 20261111091000_shift_quests_board_fixes plus consent: a
 * request to the community help room names and quotes the student in a
 * public channel, so it needs their consent ('sq:help_consent', nothing is
 * stored or posted). The mentors' queue (staff only) stays open to everyone.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_help_create(
  p_actor text, p_summary text, p_visibility text, p_source text, p_instance uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_summary text := public.shift_quest__check_len(p_summary, 1000, true);
  v_id uuid;
BEGIN
  IF p_visibility NOT IN ('community', 'mentors') OR COALESCE(p_source, 'student') NOT IN ('student', 'progress') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF p_instance IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.shift_quest_instances WHERE id = p_instance AND member_id = v_member.id
  ) THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF p_visibility = 'community' AND NOT public.shift_quest__consent_ok(v_member.id) THEN
    PERFORM public.shift_quest__fail('help_consent');
  END IF;
  PERFORM public.shift_quest__cap(v_member.id, 'help');

  INSERT INTO public.shift_quest_help_requests (member_id, project_id, instance_id, summary, visibility, source)
  VALUES (v_member.id, public.shift_quest__current_project(v_member), p_instance, v_summary, p_visibility,
          COALESCE(p_source, 'student'))
  RETURNING id INTO v_id;

  IF p_visibility = 'community' THEN
    PERFORM public.shift_quest__post('help:' || v_id, 'help', 'help_community',
      jsonb_build_object('member_id', v_member.id, 'help_id', v_id, 'summary', v_summary));
  ELSE
    PERFORM public.shift_quest__post('help:' || v_id, 'staff', 'help_mentors',
      jsonb_build_object('member_id', v_member.id, 'help_id', v_id, 'summary', v_summary, 'source', p_source));
  END IF;

  PERFORM public.shift_quest__audit(v_member.id, 'help_create', 'help', v_id);
  RETURN v_id;
END;
$$;

/** The body of 20261111090800_shift_quests_seasons plus the island consent (state, basis, when), no parent details. */
CREATE OR REPLACE FUNCTION public.shift_quest__island_export(p_member uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'recognitions', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('category', g.category, 'reason', g.reason, 'amount', g.amount,
                                          'created_at', g.created_at) ORDER BY g.created_at)
      FROM public.shift_quest_recognitions g WHERE g.member_id = p_member
    ), '[]'::jsonb),
    'season_unlocks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('label', u.label, 'earned_at', e.earned_at) ORDER BY e.earned_at)
      FROM public.shift_quest_season_unlock_earned e JOIN public.shift_quest_season_unlocks u ON u.id = e.unlock_id
      WHERE e.member_id = p_member
    ), '[]'::jsonb),
    'squads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', q.name, 'target', q.target, 'starts_on', q.starts_on,
                                          'ends_on', q.ends_on, 'status', sm.status) ORDER BY q.created_at)
      FROM public.shift_quest_squad_members sm JOIN public.shift_quest_squads q ON q.id = sm.squad_id
      WHERE sm.member_id = p_member
    ), '[]'::jsonb),
    -- 20261111095000_shift_quest_player.
    'island_consent', (
      SELECT jsonb_build_object('state', c.state, 'basis', c.basis, 'ai', c.ai_ok,
                                'notice_version', c.notice_version, 'decided_at', c.decided_at)
      FROM public.shift_quest_consents c WHERE c.member_id = p_member
    )
  );
END;
$$;

/**
 * The body of 20261111090800 plus: the member's consent row goes (the
 * parent's name, IP, user agent and the birth date with it).
 */
CREATE OR REPLACE FUNCTION public.shift_quest__island_erase(p_member uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shift_quest_squad_members SET status = 'left', responded_at = now()
  WHERE member_id = p_member AND status IN ('active', 'invited');
  UPDATE public.shift_quest_squads SET name = '[erased]', target = '[erased]'
  WHERE created_by = p_member AND (name <> '[erased]' OR target <> '[erased]');
  UPDATE public.shift_quest_inbox SET params = params || '{"name": "[erased]"}'::jsonb
  WHERE kind = 'squad_invite'
    AND ref_id IN (SELECT id FROM public.shift_quest_squads WHERE created_by = p_member);
  -- 20261111095000_shift_quest_player: the consent row, and every AI summary
  -- of a project the member was ever on or contributed to (they were written
  -- from evidence the erasure clears, and go back to the model as 'previous').
  DELETE FROM public.shift_quest_consents WHERE member_id = p_member;
  DELETE FROM public.shift_quest_digests
  WHERE project_id IN (
    SELECT project_id FROM public.shift_quest_project_members WHERE member_id = p_member
    UNION
    SELECT i.project_id
    FROM public.shift_quest_contributions c
    JOIN public.shift_quest_submissions s ON s.id = c.submission_id
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE c.member_id = p_member AND i.project_id IS NOT NULL
    UNION
    SELECT i.project_id
    FROM public.shift_quest_submissions s
    JOIN public.shift_quest_instances i ON i.id = s.instance_id
    WHERE s.submitted_by = p_member AND i.project_id IS NOT NULL
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- The player's reads (website only)
-- ---------------------------------------------------------------------------

/**
 * The character sheet: progress counts for the caller, never anyone else's,
 * no ids and no names. Same gate as shift_quest_island (a member who finished
 * /start). Counts:
 *   stage: the current project's tree stage (0..7), the level.
 *   main: team = stage; mine = distinct milestones where the caller is a
 *     confirmed contributor of an approved submission.
 *   side: team = distinct approved side quest slugs in the project plus the
 *     caller's own approved proposed quests; mine = approved side or proposed
 *     quests the caller contributed to.
 *   community: milestones = how many of 6 and 7 the project has approved;
 *     mine = the caller's approved contributions on 6 or 7 (repeats count);
 *     thanks = accepted peer recognitions received plus admin recognitions.
 *   checkins: days_active = distinct Bangkok days with a tap or a note;
 *     this_week = those since Monday (Bangkok); run = the active days in the
 *     latest run, where one empty day in between does not end it, and 0 once
 *     two days have passed with nothing (resting is never punished harder).
 *   coins: {live, shop_live, balance, reserved}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_character(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_done smallint[] := '{}';
  v_today date := public.shift_quest__bkk_today();
  v_monday date;
  v_checkins jsonb;
BEGIN
  IF v_project IS NOT NULL THEN
    v_done := public.shift_quest__milestones(v_project);
  END IF;
  v_monday := v_today - (extract(isodow FROM v_today)::integer - 1);

  WITH days AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Bangkok')::date AS d
    FROM public.shift_quest_progress
    WHERE member_id = v_member.id AND kind IN ('tap', 'note')
  ), marked AS (
    SELECT d, CASE WHEN d - lag(d) OVER (ORDER BY d) > 2 THEN 1 ELSE 0 END AS brk FROM days
  ), grouped AS (
    SELECT d, sum(brk) OVER (ORDER BY d) AS g FROM marked
  ), latest AS (
    SELECT count(*) AS n, max(d) AS last_day FROM grouped WHERE g = (SELECT max(g) FROM grouped)
  )
  SELECT jsonb_build_object(
    'days_active', (SELECT count(*) FROM days),
    'this_week', (SELECT count(*) FROM days WHERE d >= v_monday AND d <= v_today),
    -- Rest mode (every open quest paused, as shift_quest_island's 'resting')
    -- freezes the run: resting never costs anything.
    'run', (SELECT CASE WHEN last_day >= v_today - 2 OR (
                          EXISTS (SELECT 1 FROM public.shift_quest_instances
                                  WHERE member_id = v_member.id AND state = 'paused')
                          AND NOT EXISTS (SELECT 1 FROM public.shift_quest_instances
                                          WHERE member_id = v_member.id AND state IN ('active', 'clarification'))
                        ) THEN n ELSE 0 END FROM latest)
  ) INTO v_checkins;

  RETURN jsonb_build_object(
    'stage', cardinality(v_done),
    'main', jsonb_build_object(
      'team', cardinality(v_done),
      'mine', (
        SELECT count(DISTINCT i.milestone)
        FROM public.shift_quest_instances i
        JOIN public.shift_quest_submissions s ON s.instance_id = i.id AND s.status = 'approved'
        JOIN public.shift_quest_contributions c ON c.submission_id = s.id
        WHERE c.member_id = v_member.id AND c.status = 'confirmed' AND i.milestone IS NOT NULL
      )
    ),
    'side', jsonb_build_object(
      'team', (
        SELECT count(DISTINCT t.slug)
        FROM public.shift_quest_instances i JOIN public.shift_quest_templates t ON t.id = i.template_id
        WHERE v_project IS NOT NULL AND i.project_id = v_project AND i.state = 'approved' AND t.side
      ) + (
        SELECT count(*) FROM public.shift_quest_instances
        WHERE member_id = v_member.id AND template_id IS NULL AND state = 'approved'
      ),
      'mine', (
        SELECT count(DISTINCT i.id)
        FROM public.shift_quest_instances i
        LEFT JOIN public.shift_quest_templates t ON t.id = i.template_id
        JOIN public.shift_quest_submissions s ON s.instance_id = i.id AND s.status = 'approved'
        JOIN public.shift_quest_contributions c ON c.submission_id = s.id
        WHERE c.member_id = v_member.id AND c.status = 'confirmed' AND i.state = 'approved'
          AND (i.template_id IS NULL OR t.side)
      )
    ),
    'community', jsonb_build_object(
      'milestones', (SELECT count(*) FROM unnest(v_done) m WHERE m IN (6, 7)),
      'mine', (
        SELECT count(DISTINCT i.id)
        FROM public.shift_quest_instances i
        JOIN public.shift_quest_submissions s ON s.instance_id = i.id AND s.status = 'approved'
        JOIN public.shift_quest_contributions c ON c.submission_id = s.id
        WHERE c.member_id = v_member.id AND c.status = 'confirmed' AND i.milestone IN (6, 7)
      ),
      'thanks', (
        SELECT count(*) FROM public.shift_quest_shares
        WHERE peer_member_id = v_member.id AND kind = 'recognition' AND status = 'queued'
      ) + (
        SELECT count(*) FROM public.shift_quest_recognitions WHERE member_id = v_member.id
      )
    ),
    'checkins', v_checkins,
    'coins', jsonb_build_object(
      'live', public.shift_quest__awards_live(),
      'shop_live', public.shift_quest__redemption_live(),
      'balance', public.shift_quest__balance(v_member.id),
      'reserved', COALESCE((
        SELECT sum(cost) FROM public.shift_quest_redemptions
        WHERE member_id = v_member.id AND status IN ('reserved', 'processing')
      ), 0)
    )
  );
END;
$$;

/**
 * The wallet sheet: the balance, the published earn rates (main: the best
 * rule pinned on a published milestone 1..5 template; community: on 6 or 7;
 * side: on a published side template; taught and helped: the staff award
 * rules), the 10 newest ledger entries without ids, and the shop with each
 * item's lock reason for the caller. Items only while redemption is live.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_wallet(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_settings public.shift_quest_settings := public.shift_quest__settings();
  v_awards boolean := public.shift_quest__awards_live();
  v_live boolean := public.shift_quest__redemption_live();
  v_balance integer := public.shift_quest__balance(v_member.id);
BEGIN
  RETURN jsonb_build_object(
    'awards_live', v_awards,
    'redemption_live', v_live,
    'balance', v_balance,
    'reserved', COALESCE((
      SELECT sum(cost) FROM public.shift_quest_redemptions
      WHERE member_id = v_member.id AND status IN ('reserved', 'processing')
    ), 0),
    'reward_terms', CASE WHEN v_awards THEN v_settings.reward_terms END,
    'entries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'amount', l.amount, 'kind', l.kind, 'title', i.title, 'rule_key', rr.key, 'category', g.category,
        'created_at', l.created_at
      ) ORDER BY l.created_at DESC)
      FROM (
        SELECT * FROM public.shift_quest_ledger WHERE member_id = v_member.id
        ORDER BY created_at DESC LIMIT 10
      ) l
      LEFT JOIN public.shift_quest_instances i ON i.id = l.instance_id
      LEFT JOIN public.shift_quest_reward_rules rr ON rr.id = l.reward_rule_id
      LEFT JOIN public.shift_quest_recognitions g ON g.ledger_entry_id = l.id
    ), '[]'::jsonb),
    'earn', jsonb_build_object(
      'main', (
        SELECT jsonb_build_object('amount', r.amount, 'cap', r.cap_per_member)
        FROM public.shift_quest_reward_rules r
        WHERE r.status = 'published' AND r.key IN (
          SELECT t.reward_rule_key FROM public.shift_quest_templates t
          WHERE t.status = 'published' AND t.milestone BETWEEN 1 AND 5
        )
        ORDER BY r.amount DESC, r.key LIMIT 1
      ),
      'side', (
        SELECT jsonb_build_object('amount', r.amount, 'cap', r.cap_per_member)
        FROM public.shift_quest_reward_rules r
        WHERE r.status = 'published' AND r.key IN (
          SELECT t.reward_rule_key FROM public.shift_quest_templates t WHERE t.status = 'published' AND t.side
        )
        ORDER BY r.amount DESC, r.key LIMIT 1
      ),
      'community', (
        SELECT jsonb_build_object('amount', r.amount, 'cap', r.cap_per_member)
        FROM public.shift_quest_reward_rules r
        WHERE r.status = 'published' AND r.key IN (
          SELECT t.reward_rule_key FROM public.shift_quest_templates t
          WHERE t.status = 'published' AND t.milestone IN (6, 7)
        )
        ORDER BY r.amount DESC, r.key LIMIT 1
      ),
      'taught', (
        SELECT jsonb_build_object('amount', r.amount, 'cap', r.cap_per_member)
        FROM public.shift_quest_reward_rules r WHERE r.status = 'published' AND r.key = 'taught-next-shift'
      ),
      'helped', (
        SELECT jsonb_build_object('amount', r.amount, 'cap', r.cap_per_member)
        FROM public.shift_quest_reward_rules r WHERE r.status = 'published' AND r.key = 'helped-most'
      )
    ),
    'stage', public.shift_quest__member_stage(v_member.id),
    'community_done', public.shift_quest__community_done(v_member.id),
    'consent_ok', public.shift_quest__consent_ok(v_member.id),
    'shop', jsonb_build_object(
      'live', v_live,
      'terms', CASE WHEN v_live THEN v_settings.redemption_terms END,
      'items', CASE WHEN v_live THEN COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', c.id, 'name', c.name, 'description', c.description, 'cost', c.cost,
          'in_stock', c.stock_available > 0,
          'min_stage', c.min_stage, 'requires_community', c.requires_community,
          'locked', public.shift_quest__item_lock(v_member.id, c),
          'affordable', v_balance >= c.cost
        ) ORDER BY c.cost, c.name)
        FROM public.shift_quest_catalog c WHERE c.active
      ), '[]'::jsonb) ELSE '[]'::jsonb END,
      'mine', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', r.id, 'item', c.name, 'cost', r.cost, 'status', r.status, 'created_at', r.created_at
        ) ORDER BY r.created_at DESC)
        FROM public.shift_quest_redemptions r JOIN public.shift_quest_catalog c ON c.id = r.item_id
        WHERE r.member_id = v_member.id
          AND (r.status IN ('reserved', 'processing') OR r.closed_at > now() - interval '30 days')
      ), '[]'::jsonb)
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Consent (website only)
-- ---------------------------------------------------------------------------

/** The caller's consent: {required, state, basis, ai, ok, link_expires_at, adult_age}. */
CREATE OR REPLACE FUNCTION public.shift_quest_consent_get(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
BEGIN
  RETURN public.shift_quest__consent_json(v_member.id);
END;
$$;

/**
 * The student confirms their own consent at the adult age: whole years at
 * today's Bangkok date at least settings.consent_adult_age, else
 * 'sq:consent_too_young'. The date must be after 1900 and before today
 * ('sq:bad_input'). Grants with the adult basis (the confirmation includes
 * the AI news line) over an earlier waiting or imported state. Never over a
 * parent's no ('sq:consent_parent_said_no': declined, or a parent's consent
 * withdrawn on the island or in SHIFT): only staff reset that
 * (shift_quest_admin_consent_reset). The website also refuses when the
 * student's own SHIFT application gives a birth date under the adult age.
 * Any parent link stops.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_consent_adult(p_actor text, p_birth_date date, p_notice_version text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_today date := public.shift_quest__bkk_today();
  v_version text := public.shift_quest__trim(p_notice_version);
BEGIN
  IF p_birth_date IS NULL OR p_birth_date <= DATE '1900-01-01' OR p_birth_date >= v_today
     OR v_version IS NULL OR char_length(v_version) > 40 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF extract(year FROM age(v_today::timestamp, p_birth_date::timestamp))::integer
     < (public.shift_quest__settings()).consent_adult_age THEN
    PERFORM public.shift_quest__fail('consent_too_young');
  END IF;
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;
  IF public.shift_quest__parent_said_no(v_member.id) THEN
    PERFORM public.shift_quest__fail('consent_parent_said_no');
  END IF;

  INSERT INTO public.shift_quest_consents AS c (
    member_id, state, basis, ai_ok, notice_version, birth_date, decided_at
  )
  VALUES (v_member.id, 'granted', 'adult', true, v_version, p_birth_date, now())
  ON CONFLICT (member_id) DO UPDATE
  SET state = 'granted', basis = 'adult', ai_ok = true, notice_version = v_version, birth_date = p_birth_date,
      decided_at = now(), token_hash = NULL, token_expires_at = NULL, student_label = NULL, ai_link = false,
      updated_at = now();
  -- An earlier parent's answer (name, relationship, IP, user agent) stays on the row as the record of it.

  PERFORM public.shift_quest__audit(v_member.id, 'consent_adult', 'consent', v_member.id);
  RETURN public.shift_quest__consent_json(v_member.id);
END;
$$;

/**
 * A new parent link. The website makes the token and passes only its sha256
 * (p_token_hash, 64 hex characters) and the nickname the student typed for
 * the parent (1..40). The link answers for 14 days and replaces any earlier
 * one (the old link stops working). A student already granted by a parent
 * (on the island or in SHIFT) without the AI line gets an AI link: the same
 * parent page, the consent stays granted meanwhile (ai_link). Refused:
 * 'sq:consent_not_needed' when consent (and AI news) is already in place, or
 * the basis is an adult one (they confirm their own age instead);
 * 'sq:consent_parent_said_no' after a parent declined or withdrew (the
 * decision stays on record until staff reset it); 'sq:consent_rate_limited'
 * after 3 links in 24 hours (counted from the audit log under the member
 * lock). Returns {expires_at}.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_consent_link(
  p_actor text, p_token_hash text, p_student_label text, p_notice_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_label text := public.shift_quest__trim(p_student_label);
  v_version text := public.shift_quest__trim(p_notice_version);
  v_expires timestamptz := now() + interval '14 days';
  v_row public.shift_quest_consents;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$'
     OR v_label IS NULL OR char_length(v_label) > 40
     OR v_version IS NULL OR char_length(v_version) > 40 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;
  SELECT * INTO v_row FROM public.shift_quest_consents WHERE member_id = v_member.id;

  IF v_row.state = 'granted' AND (v_row.ai_ok OR v_row.basis NOT IN ('parent', 'shift_parent')) THEN
    PERFORM public.shift_quest__fail('consent_not_needed');
  END IF;
  IF public.shift_quest__parent_said_no(v_member.id) THEN
    PERFORM public.shift_quest__fail('consent_parent_said_no');
  END IF;
  IF (
    SELECT count(*) FROM public.shift_quest_audit
    WHERE resource_type = 'consent' AND resource_id = v_member.id AND action = 'consent_link'
      AND created_at > now() - interval '24 hours'
  ) >= 3 THEN
    PERFORM public.shift_quest__fail('consent_rate_limited');
  END IF;

  IF v_row.state = 'granted' THEN
    -- The AI line only: everything already granted stays as it is.
    UPDATE public.shift_quest_consents
    SET token_hash = p_token_hash, token_expires_at = v_expires, student_label = v_label, ai_link = true,
        updated_at = now()
    WHERE member_id = v_member.id;
  ELSE
    -- No row, waiting, or a withdrawn shift_adult import (never a parent's no: refused above).
    INSERT INTO public.shift_quest_consents AS c (
      member_id, state, token_hash, token_expires_at, student_label, notice_version
    )
    VALUES (v_member.id, 'waiting', p_token_hash, v_expires, v_label, v_version)
    ON CONFLICT (member_id) DO UPDATE
    SET state = 'waiting', basis = NULL, ai_ok = false, ai_link = false, token_hash = p_token_hash,
        token_expires_at = v_expires, student_label = v_label, notice_version = v_version, birth_date = NULL,
        decided_at = NULL, parent_name = NULL, parent_relationship = NULL, ip = NULL, user_agent = NULL,
        updated_at = now();
  END IF;

  PERFORM public.shift_quest__audit(v_member.id, 'consent_link', 'consent', v_member.id);
  RETURN jsonb_build_object('expires_at', v_expires);
END;
$$;

/**
 * Records consent the student already gave for SHIFT, as the website read it
 * from the student's own application: p_basis 'shift_parent' (a parent
 * agreed) or 'shift_adult' (no parent needed). Never imports AI news: SHIFT's
 * AI tick covers progress notes to the mentor, not AI summaries shown on the
 * island and in Discord, so an import always has ai_ok false (p_ai is kept
 * for the signature and ignored); the island's own AI line comes from the
 * parent page (an AI link) or the student's own age confirmation. Never
 * touches a consent given on the island (basis parent or adult) or a
 * parent's decline there. p_withdrawn withdraws only an imported consent.
 * Idempotent: the same import twice changes nothing.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_consent_import(
  p_actor text, p_basis text, p_decided_at timestamptz, p_ai boolean, p_withdrawn boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_row public.shift_quest_consents;
  v_at timestamptz := COALESCE(p_decided_at, now());
BEGIN
  IF p_basis IS NULL OR p_basis NOT IN ('shift_parent', 'shift_adult') OR p_withdrawn IS NULL THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member.id FOR NO KEY UPDATE;
  SELECT * INTO v_row FROM public.shift_quest_consents WHERE member_id = v_member.id;

  IF p_withdrawn THEN
    IF FOUND AND v_row.state = 'granted' AND v_row.basis IN ('shift_parent', 'shift_adult') THEN
      UPDATE public.shift_quest_consents
      SET state = 'withdrawn', ai_ok = false, ai_link = false, token_hash = NULL, token_expires_at = NULL,
          decided_at = now(), updated_at = now()
      WHERE member_id = v_member.id;
      PERFORM public.shift_quest__audit(v_member.id, 'consent_import_withdraw', 'consent', v_member.id);
    END IF;
  ELSIF NOT FOUND THEN
    INSERT INTO public.shift_quest_consents (member_id, state, basis, ai_ok, decided_at)
    VALUES (v_member.id, 'granted', p_basis, false, v_at);
    PERFORM public.shift_quest__audit(v_member.id, 'consent_import', 'consent', v_member.id);
  ELSIF v_row.basis IN ('parent', 'adult') OR v_row.state = 'declined' THEN
    NULL;
  ELSIF v_row.state = 'granted' AND v_row.basis = p_basis AND v_row.decided_at IS NOT DISTINCT FROM v_at THEN
    NULL;
  ELSE
    -- A newer SHIFT decision. An AI link already out to the parent of a granted row keeps working.
    UPDATE public.shift_quest_consents
    SET state = 'granted', basis = p_basis, ai_ok = false, decided_at = v_at,
        token_hash = CASE WHEN v_row.state = 'granted' AND v_row.ai_link THEN v_row.token_hash END,
        token_expires_at = CASE WHEN v_row.state = 'granted' AND v_row.ai_link THEN v_row.token_expires_at END,
        ai_link = v_row.state = 'granted' AND v_row.ai_link,
        updated_at = now()
    WHERE member_id = v_member.id;
    PERFORM public.shift_quest__audit(v_member.id, 'consent_import', 'consent', v_member.id);
  END IF;

  RETURN public.shift_quest__consent_json(v_member.id);
END;
$$;

/**
 * The parent page: {state, student_label, expires_at, answerable,
 * withdrawable, ai_only}, or null for an unknown or malformed hash.
 * answerable while not expired and waiting, declined, or granted with an AI
 * link out (ai_only: the student already has consent and the page asks for
 * the AI news line); withdrawable while granted on the parent basis (any
 * time). Never an id or a Discord name.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_consent_parent_view(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.shift_quest_consents;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_row FROM public.shift_quest_consents WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'state', v_row.state,
    'student_label', v_row.student_label,
    'expires_at', v_row.token_expires_at,
    'answerable', (v_row.state IN ('waiting', 'declined') OR (v_row.state = 'granted' AND v_row.ai_link))
                  AND v_row.token_expires_at > now(),
    'withdrawable', v_row.state = 'granted' AND v_row.basis = 'parent',
    'ai_only', v_row.state = 'granted' AND v_row.ai_link
  );
END;
$$;

/**
 * The parent answers: agree (with the separate AI line, p_ai) or decline.
 * 'sq:consent_link_dead' when the link is unknown, expired, replaced, or
 * already granted (unless an AI link is out) or withdrawn. Records the typed
 * name (2..120), the relationship, IP, user agent, notice version and the
 * time, and tells the student in their island inbox ('consent_recorded', the
 * state only). On an AI link (the student already granted), agreeing records
 * the parent basis with p_ai; not agreeing leaves the earlier consent as it
 * was, without AI news.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_consent_parent_answer(
  p_token_hash text, p_agree boolean, p_ai boolean, p_parent_name text, p_relationship text,
  p_ip text, p_user_agent text, p_notice_version text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member uuid;
  v_row public.shift_quest_consents;
  v_name text := public.shift_quest__trim(p_parent_name);
  v_version text := public.shift_quest__trim(p_notice_version);
  v_state text;
  v_key text;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    PERFORM public.shift_quest__fail('consent_link_dead');
  END IF;
  SELECT member_id INTO v_member FROM public.shift_quest_consents WHERE token_hash = p_token_hash;
  IF v_member IS NULL THEN
    PERFORM public.shift_quest__fail('consent_link_dead');
  END IF;
  -- Member first, then the consent row; a link replaced meanwhile is dead.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member FOR NO KEY UPDATE;
  SELECT * INTO v_row FROM public.shift_quest_consents WHERE member_id = v_member FOR UPDATE;
  -- Answerable: waiting, declined, or granted with an AI link out (the parent
  -- page then asks again in full; agreeing records the island's parent basis).
  IF v_row.token_hash IS DISTINCT FROM p_token_hash OR v_row.token_expires_at IS NULL
     OR v_row.token_expires_at <= now() OR v_row.state = 'withdrawn'
     OR (v_row.state = 'granted' AND NOT v_row.ai_link) THEN
    PERFORM public.shift_quest__fail('consent_link_dead');
  END IF;
  IF p_agree IS NULL OR v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 120
     OR p_relationship IS NULL OR p_relationship NOT IN ('พ่อ', 'แม่', 'ผู้ปกครอง')
     OR v_version IS NULL OR char_length(v_version) > 40 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;

  IF v_row.state = 'granted' AND NOT p_agree THEN
    -- An AI link answered "no": the consent already given stays exactly as
    -- it was, AI news stays off, and the link is spent.
    UPDATE public.shift_quest_consents
    SET ai_link = false, token_hash = CASE WHEN basis = 'parent' THEN token_hash END,
        token_expires_at = CASE WHEN basis = 'parent' THEN token_expires_at END, updated_at = now()
    WHERE member_id = v_member;
    PERFORM public.shift_quest__audit(NULL, 'consent_parent_ai_decline', 'consent', v_member);
    RETURN jsonb_build_object('state', 'granted');
  END IF;

  v_state := CASE WHEN p_agree THEN 'granted' ELSE 'declined' END;
  UPDATE public.shift_quest_consents
  SET state = v_state,
      basis = CASE WHEN p_agree THEN 'parent' END,
      ai_ok = p_agree AND COALESCE(p_ai, false),
      ai_link = false,
      parent_name = v_name,
      parent_relationship = p_relationship,
      ip = left(public.shift_quest__trim(p_ip), 64),
      user_agent = left(public.shift_quest__trim(p_user_agent), 400),
      notice_version = v_version,
      decided_at = now(),
      updated_at = now()
  WHERE member_id = v_member;

  v_key := 'consent:' || v_member || ':' || v_state || ':' || txid_current();
  PERFORM public.shift_quest__notify(v_member, v_key, 'consent_recorded', jsonb_build_object('state', v_state));
  PERFORM public.shift_quest__audit(NULL, CASE WHEN p_agree THEN 'consent_parent_agree' ELSE 'consent_parent_decline' END,
                                    'consent', v_member);
  RETURN jsonb_build_object('state', v_state);
END;
$$;

/** The parent withdraws a consent they gave on the island, any time with the same link. Else 'sq:consent_link_dead'. */
CREATE OR REPLACE FUNCTION public.shift_quest_consent_parent_withdraw(p_token_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member uuid;
  v_row public.shift_quest_consents;
  v_key text;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' THEN
    PERFORM public.shift_quest__fail('consent_link_dead');
  END IF;
  SELECT member_id INTO v_member FROM public.shift_quest_consents WHERE token_hash = p_token_hash;
  IF v_member IS NULL THEN
    PERFORM public.shift_quest__fail('consent_link_dead');
  END IF;
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_member FOR NO KEY UPDATE;
  SELECT * INTO v_row FROM public.shift_quest_consents WHERE member_id = v_member FOR UPDATE;
  IF v_row.token_hash IS DISTINCT FROM p_token_hash OR v_row.state <> 'granted' OR v_row.basis IS DISTINCT FROM 'parent' THEN
    PERFORM public.shift_quest__fail('consent_link_dead');
  END IF;

  UPDATE public.shift_quest_consents
  SET state = 'withdrawn', ai_ok = false, ai_link = false, decided_at = now(), updated_at = now()
  WHERE member_id = v_member;

  v_key := 'consent:' || v_member || ':withdrawn:' || txid_current();
  PERFORM public.shift_quest__notify(v_member, v_key, 'consent_recorded', jsonb_build_object('state', 'withdrawn'));
  PERFORM public.shift_quest__audit(NULL, 'consent_parent_withdraw', 'consent', v_member);
  RETURN jsonb_build_object('state', 'withdrawn');
END;
$$;

-- ---------------------------------------------------------------------------
-- AI island news
-- ---------------------------------------------------------------------------

/**
 * The island news for any member who may see the island (the gate of
 * shift_quest_island_map): {enabled, day, week_of, teams}, and hidden for
 * reviewers and admins. teams are the projects eligible now
 * (shift_quest__digest_eligible), by slot, each with its latest day summary
 * of the last 2 Bangkok days and its latest week recap of the last 8 days
 * (or null). week_of is the Monday of the newest recap. Nothing about
 * people: a slot, a project name and the summaries.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island_news(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__member(p_actor);
  v_enabled boolean := (public.shift_quest__settings()).digest_enabled;
  v_today date := public.shift_quest__bkk_today();
  v_teams jsonb := '[]'::jsonb;
  v_week date;
  v_result jsonb;
BEGIN
  IF v_member.onboarded_at IS NULL AND cardinality(v_member.roles) = 0 THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;

  IF v_enabled THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'slot', pl.slot,
             'name', p.name,
             -- 'day': the Bangkok day the summary is for (a week recap: the Sunday it ends on).
             'day', CASE WHEN dd.id IS NOT NULL THEN jsonb_build_object(
               'summary', dd.summary, 'no_update', dd.no_update, 'created_at', dd.created_at, 'day', dd.day::text) END,
             'week', CASE WHEN wk.id IS NOT NULL THEN jsonb_build_object(
               'summary', wk.summary, 'no_update', wk.no_update, 'created_at', wk.created_at, 'day', wk.day::text) END
           ) ORDER BY pl.slot), '[]'::jsonb),
           max(wk.day)
    INTO v_teams, v_week
    FROM public.shift_quest_projects p
    JOIN public.shift_quest_plots pl ON pl.project_id = p.id
    LEFT JOIN LATERAL (
      SELECT * FROM public.shift_quest_digests d
      WHERE d.project_id = p.id AND d.kind = 'day' AND d.day BETWEEN v_today - 1 AND v_today
      ORDER BY d.day DESC LIMIT 1
    ) dd ON true
    LEFT JOIN LATERAL (
      SELECT * FROM public.shift_quest_digests d
      WHERE d.project_id = p.id AND d.kind = 'week' AND d.day BETWEEN v_today - 7 AND v_today
      ORDER BY d.day DESC LIMIT 1
    ) wk ON true
    WHERE p.archived_at IS NULL AND public.shift_quest__digest_eligible(p.id);
  END IF;

  v_result := jsonb_build_object(
    'enabled', v_enabled,
    'day', v_today::text,
    'week_of', CASE WHEN v_week IS NOT NULL THEN (v_week - (extract(isodow FROM v_week)::integer - 1))::text END,
    'teams', v_teams
  );
  IF v_member.roles && ARRAY['reviewer', 'admin'] THEN
    v_result := v_result || jsonb_build_object('hidden', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slot', pl.slot, 'name', p.name) ORDER BY pl.slot)
      FROM public.shift_quest_digest_hides h
      JOIN public.shift_quest_projects p ON p.id = h.project_id
      JOIN public.shift_quest_plots pl ON pl.project_id = p.id
      WHERE p.archived_at IS NULL
    ), '[]'::jsonb));
  END IF;
  RETURN v_result;
END;
$$;

/**
 * What the scheduled summariser may read for one Bangkok day ('day') or the
 * 7 days ending on it ('week'), eligible projects only, nothing while the
 * digest is off. Per project: its own fields and stage, every approved quest
 * (title, milestone, side), the quest work submitted in the window (title
 * and evidence up to 600 characters, never redacted work), check-in counts
 * in the window, the previous stored summary of the same kind, redact (the
 * display names of everyone ever on the team or credited on its work) and
 * redact_teams (other team names not shown on the island), only so the
 * server can scrub them before any model sees the text. Submitted work comes
 * only from current members who allow AI news, in the 24 hours (7 days)
 * ending at run time. Server-side use only; never shown.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_inputs(p_day date, p_kind text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean := (public.shift_quest__settings()).digest_enabled;
  v_from date;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF p_day IS NULL OR p_kind IS NULL OR p_kind NOT IN ('day', 'week') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  v_from := CASE WHEN p_kind = 'day' THEN p_day ELSE p_day - 6 END;
  -- The window ends at run time (or at the end of a past day) and is a full
  -- 24 hours (7 days) long: the 20:00 job reads 20:00 yesterday to now, so
  -- evening work is in the next day's news instead of in no news at all.
  v_end := least(public.shift_quest__bkk_end(p_day), now());
  v_start := v_end - CASE WHEN p_kind = 'day' THEN interval '1 day' ELSE interval '7 days' END;

  RETURN jsonb_build_object(
    'enabled', v_enabled,
    'day', p_day::text,
    'kind', p_kind,
    'from', v_from::text,
    'to', p_day::text,
    'projects', CASE WHEN v_enabled THEN COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'project_id', p.id,
        'slot', pl.slot,
        'name', p.name,
        'route', p.route,
        'ambition', p.ambition,
        'stage', cardinality(public.shift_quest__milestones(p.id)),
        'approved', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('title', i.title, 'milestone', i.milestone,
                                              'side', COALESCE(t.side, false)) ORDER BY i.updated_at, i.id)
          FROM public.shift_quest_instances i
          LEFT JOIN public.shift_quest_templates t ON t.id = i.template_id
          WHERE i.project_id = p.id AND i.state = 'approved'
        ), '[]'::jsonb),
        'submitted', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('title', i.title, 'evidence', left(sub.evidence, 600))
                           ORDER BY sub.created_at, sub.id)
          FROM public.shift_quest_submissions sub
          JOIN public.shift_quest_instances i ON i.id = sub.instance_id
          WHERE i.project_id = p.id AND sub.status IN ('pending', 'approved', 'clarification')
            AND sub.redacted_at IS NULL AND sub.created_at >= v_start AND sub.created_at < v_end
            -- Only work by people who are on the team now and allow AI news.
            AND EXISTS (
              SELECT 1 FROM public.shift_quest_project_members pm
              WHERE pm.project_id = p.id AND pm.member_id = sub.submitted_by AND pm.status = 'active'
            )
            AND public.shift_quest__consent_ai_ok(sub.submitted_by)
        ), '[]'::jsonb),
        'checkins', (
          SELECT jsonb_build_object(
            'members_active', count(DISTINCT g.member_id),
            'days', count(DISTINCT (g.created_at AT TIME ZONE 'Asia/Bangkok')::date),
            'taps', count(*) FILTER (WHERE g.kind = 'tap')
          )
          FROM public.shift_quest_progress g
          WHERE g.project_id = p.id AND g.kind IN ('tap', 'note')
            AND g.created_at >= v_start AND g.created_at < v_end
        ),
        'previous', (
          SELECT d.summary FROM public.shift_quest_digests d
          WHERE d.project_id = p.id AND d.kind = p_kind AND d.day < p_day AND d.summary IS NOT NULL
          ORDER BY d.day DESC LIMIT 1
        ),
        -- Everyone who was ever on the team or credited on its work (each
        -- word of a name is scrubbed).
        'redact', COALESCE((
          SELECT jsonb_agg(x.n ORDER BY x.n)
          FROM (
            SELECT m.display_name AS n
            FROM public.shift_quest_project_members pm
            JOIN public.shift_quest_members m ON m.id = pm.member_id
            WHERE pm.project_id = p.id AND m.display_name IS NOT NULL
            UNION
            SELECT m.display_name
            FROM public.shift_quest_instances i
            JOIN public.shift_quest_submissions s ON s.instance_id = i.id
            JOIN public.shift_quest_contributions c ON c.submission_id = s.id
            JOIN public.shift_quest_members m ON m.id = c.member_id
            WHERE i.project_id = p.id AND m.display_name IS NOT NULL
          ) x
        ), '[]'::jsonb),
        -- Every other team name that may not be shown on the island (whole
        -- names only: a word such as "AI" in a team name stays ordinary).
        'redact_teams', COALESCE((
          SELECT jsonb_agg(o.name ORDER BY o.name)
          FROM public.shift_quest_projects o
          WHERE o.id <> p.id AND o.name IS NOT NULL AND NOT public.shift_quest__name_visible(o.id)
        ), '[]'::jsonb)
      ) ORDER BY pl.slot)
      FROM public.shift_quest_projects p
      JOIN public.shift_quest_plots pl ON pl.project_id = p.id
      WHERE p.archived_at IS NULL AND public.shift_quest__digest_eligible(p.id)
    ), '[]'::jsonb) ELSE '[]'::jsonb END
  );
END;
$$;

/**
 * Stores summaries: p_entries is [{project_id, summary, no_update, model}].
 * Each project is checked again (shift_quest__digest_eligible) and skipped
 * when it is not eligible now; nothing is stored while the digest is off.
 * Upserts on (day, kind, project). summary is trimmed and at most 600
 * characters; no_update (or an empty summary) stores no summary. Returns how
 * many were stored.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_save(p_day date, p_kind text, p_entries jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry jsonb;
  v_project uuid;
  v_summary text;
  v_no_update boolean;
  v_saved integer := 0;
BEGIN
  IF p_day IS NULL OR p_kind IS NULL OR p_kind NOT IN ('day', 'week')
     OR p_entries IS NULL OR jsonb_typeof(p_entries) <> 'array' OR jsonb_array_length(p_entries) > 500 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  IF NOT (public.shift_quest__settings()).digest_enabled THEN
    RETURN 0;
  END IF;

  FOR v_entry IN SELECT value FROM jsonb_array_elements(p_entries) LOOP
    IF jsonb_typeof(v_entry) <> 'object' THEN
      CONTINUE;
    END IF;
    IF COALESCE(v_entry ->> 'project_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      CONTINUE;
    END IF;
    v_project := (v_entry ->> 'project_id')::uuid;
    IF NOT public.shift_quest__digest_eligible(v_project) THEN
      CONTINUE;
    END IF;
    v_no_update := COALESCE((v_entry -> 'no_update') = 'true'::jsonb, false);
    v_summary := CASE WHEN v_no_update THEN NULL ELSE left(public.shift_quest__trim(v_entry ->> 'summary'), 600) END;
    IF v_summary IS NULL THEN
      v_no_update := true;
    END IF;

    INSERT INTO public.shift_quest_digests AS d (day, kind, project_id, summary, no_update, model)
    VALUES (p_day, p_kind, v_project, v_summary, v_no_update, left(public.shift_quest__trim(v_entry ->> 'model'), 60))
    ON CONFLICT (day, kind, project_id) DO UPDATE
    SET summary = EXCLUDED.summary, no_update = EXCLUDED.no_update, model = EXCLUDED.model, created_at = now();
    v_saved := v_saved + 1;
  END LOOP;
  RETURN v_saved;
END;
$$;

/** Staff (reviewer or admin) hide or show a team's summaries by plot slot: {slot, hidden}. */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_hide(p_actor text, p_slot integer, p_hidden boolean, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['reviewer', 'admin']);
  v_reason text := public.shift_quest__check_len(p_reason, 300, false);
  v_project uuid;
BEGIN
  IF p_hidden IS NULL OR p_slot IS NULL THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  SELECT project_id INTO v_project FROM public.shift_quest_plots WHERE slot = p_slot;
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF p_hidden THEN
    INSERT INTO public.shift_quest_digest_hides AS h (project_id, hidden_by, reason)
    VALUES (v_project, v_me.id, v_reason)
    ON CONFLICT (project_id) DO UPDATE SET hidden_by = v_me.id, reason = v_reason, created_at = now();
  ELSE
    DELETE FROM public.shift_quest_digest_hides WHERE project_id = v_project;
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, CASE WHEN p_hidden THEN 'digest_hide' ELSE 'digest_show' END,
                                    'project', v_project);
  RETURN jsonb_build_object('slot', p_slot, 'hidden', p_hidden);
END;
$$;

/**
 * The Discord digest the bot should post now, or null: while the digest is
 * on, a channel is set (the live channel, else the celebrate channel) and no
 * message is recorded for today (Bangkok). {day, kind, channel_id, entries}:
 * on a Bangkok Sunday the week recaps when there are any, else today's
 * summaries; entries are [{slot, name, summary}] of teams eligible now with
 * a summary. Null when there is nothing to post. No ids, no people.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_post_next()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.shift_quest_settings := public.shift_quest__settings();
  v_today date := public.shift_quest__bkk_today();
  v_channel text := COALESCE(v_settings.live_channel_id, v_settings.celebrate_channel_id);
  v_kind text := 'day';
  v_entries jsonb;
BEGIN
  IF NOT v_settings.digest_enabled OR v_channel IS NULL THEN
    RETURN NULL;
  END IF;
  -- Posted, or a bot process claimed it in the last 15 minutes (it is sending
  -- now). An older claim without a message is a process that stopped between
  -- claim and mark: offered again, and shift_quest_digest_claim says 'stale'
  -- so the bot looks for its own message before sending.
  IF EXISTS (
    SELECT 1 FROM public.shift_quest_digest_posts
    WHERE day = v_today AND (message_id IS NOT NULL OR claimed_at > now() - interval '15 minutes')
  ) THEN
    RETURN NULL;
  END IF;

  FOREACH v_kind IN ARRAY CASE WHEN extract(isodow FROM v_today) = 7 THEN ARRAY['week', 'day'] ELSE ARRAY['day'] END LOOP
    SELECT jsonb_agg(jsonb_build_object('slot', pl.slot, 'name', p.name, 'summary', d.summary) ORDER BY pl.slot)
    INTO v_entries
    FROM public.shift_quest_digests d
    JOIN public.shift_quest_projects p ON p.id = d.project_id
    JOIN public.shift_quest_plots pl ON pl.project_id = p.id
    WHERE d.day = v_today AND d.kind = v_kind AND d.summary IS NOT NULL
      AND public.shift_quest__digest_eligible(d.project_id);
    EXIT WHEN v_entries IS NOT NULL;
  END LOOP;
  IF v_entries IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('day', v_today::text, 'kind', v_kind, 'channel_id', v_channel, 'entries', v_entries);
END;
$$;

/**
 * Records the day's digest message, compare and set: stored only while no
 * message is recorded for p_day. Returns the message id stored afterwards (a
 * second bot process that posted too gets the first one's id and deletes its
 * own). 'sq:bad_input' for a channel or message id that is not a snowflake.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_mark(p_day date, p_channel text, p_message text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
BEGIN
  IF p_day IS NULL OR p_channel IS NULL OR p_channel !~ '^[0-9]{5,25}$'
     OR p_message IS NULL OR p_message !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  INSERT INTO public.shift_quest_digest_posts AS dp (day, channel_id, message_id, posted_at)
  VALUES (p_day, p_channel, p_message, now())
  ON CONFLICT (day) DO UPDATE
  SET channel_id = EXCLUDED.channel_id, message_id = EXCLUDED.message_id, posted_at = EXCLUDED.posted_at
  WHERE dp.message_id IS NULL;
  SELECT message_id INTO v_id FROM public.shift_quest_digest_posts WHERE day = p_day;
  RETURN v_id;
END;
$$;

/**
 * Claims the day's post before the bot sends it, so a process that stops
 * between send and mark never posts twice: 'new' (claimed now), 'stale'
 * (claimed over 15 minutes ago and never marked: the bot looks for that
 * day's message in the channel first and marks it, sending only when there
 * is none), or null (posted, or another process claimed it in the last 15
 * minutes: send nothing). p_kind ('day' or 'week') is what is being posted.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_claim(p_day date, p_channel text, p_kind text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.shift_quest_digest_posts;
BEGIN
  IF p_day IS NULL OR p_channel IS NULL OR p_channel !~ '^[0-9]{5,25}$'
     OR p_kind IS NULL OR p_kind NOT IN ('day', 'week') THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  INSERT INTO public.shift_quest_digest_posts (day, channel_id, kind, claimed_at)
  VALUES (p_day, p_channel, p_kind, now())
  ON CONFLICT (day) DO NOTHING;
  IF FOUND THEN
    RETURN 'new';
  END IF;
  SELECT * INTO v_row FROM public.shift_quest_digest_posts WHERE day = p_day FOR UPDATE;
  IF v_row.message_id IS NOT NULL OR v_row.claimed_at > now() - interval '15 minutes' THEN
    RETURN NULL;
  END IF;
  UPDATE public.shift_quest_digest_posts
  SET channel_id = p_channel, kind = p_kind, claimed_at = now()
  WHERE day = p_day;
  -- A row without a claim time was marked before claims existed; never offered as stale.
  RETURN CASE WHEN v_row.claimed_at IS NULL THEN 'new' ELSE 'stale' END;
END;
$$;

/**
 * The digest messages already in Discord from the last 7 Bangkok days, as
 * they should read now: [{day, kind, channel_id, message_id, entries}], with
 * entries ([{slot, name, summary}]) only for teams eligible now with a
 * summary, so the bot edits a message when staff hide a team, a parent
 * withdraws, or a member stops showing the name. Empty entries: the bot
 * replaces the message with a short removed note. No ids of people.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_digest_post_current()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := public.shift_quest__bkk_today();
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'day', dp.day::text,
      'kind', COALESCE(dp.kind, 'day'),
      'channel_id', dp.channel_id,
      'message_id', dp.message_id,
      'entries', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('slot', pl.slot, 'name', p.name, 'summary', d.summary) ORDER BY pl.slot)
        FROM public.shift_quest_digests d
        JOIN public.shift_quest_projects p ON p.id = d.project_id
        JOIN public.shift_quest_plots pl ON pl.project_id = p.id
        WHERE d.day = dp.day AND d.kind = COALESCE(dp.kind, 'day') AND d.summary IS NOT NULL
          AND (SELECT digest_enabled FROM public.shift_quest_settings WHERE id)
          AND public.shift_quest__digest_eligible(d.project_id)
      ), '[]'::jsonb)
    ) ORDER BY dp.day DESC)
    FROM public.shift_quest_digest_posts dp
    WHERE dp.message_id IS NOT NULL AND dp.day > v_today - 7
  ), '[]'::jsonb);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin (bot only)
-- ---------------------------------------------------------------------------

/**
 * /admin island status: consent counts among onboarded, non-erased members
 * (granted, waiting, none = everyone else) and the digest switch, channel,
 * last posted day and hidden teams. Counts only.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_island_status(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_settings public.shift_quest_settings := public.shift_quest__settings();
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'consent', jsonb_build_object(
        'required', v_settings.consent_required,
        'adult_age', v_settings.consent_adult_age,
        'granted', count(*) FILTER (WHERE c.state = 'granted'),
        'waiting', count(*) FILTER (WHERE c.state = 'waiting'),
        'none', count(*) FILTER (WHERE c.state IS NULL OR c.state NOT IN ('granted', 'waiting'))
      ),
      'digest', jsonb_build_object(
        'enabled', v_settings.digest_enabled,
        'channel', CASE WHEN v_settings.live_channel_id IS NOT NULL THEN 'live'
                        WHEN v_settings.celebrate_channel_id IS NOT NULL THEN 'celebrate' END,
        'last_day', (SELECT max(day)::text FROM public.shift_quest_digest_posts WHERE message_id IS NOT NULL),
        'hidden', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('slot', pl.slot, 'name', p.name) ORDER BY pl.slot)
          FROM public.shift_quest_digest_hides h
          JOIN public.shift_quest_projects p ON p.id = h.project_id
          JOIN public.shift_quest_plots pl ON pl.project_id = p.id
          WHERE p.archived_at IS NULL
        ), '[]'::jsonb)
      )
    )
    FROM public.shift_quest_members m
    LEFT JOIN public.shift_quest_consents c ON c.member_id = m.id
    WHERE m.onboarded_at IS NOT NULL AND m.erased_at IS NULL
  );
END;
$$;

/**
 * /admin island: consent_required and digest_enabled take on or off,
 * consent_adult_age a whole number 13..25. Anything else is 'sq:bad_input'.
 * Returns the island status.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_island_set(p_actor text, p_key text, p_value text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_value text := lower(COALESCE(public.shift_quest__trim(p_value), ''));
  v_on boolean := CASE WHEN v_value IN ('on', 'true', '1') THEN true
                       WHEN v_value IN ('off', 'false', '0') THEN false END;
BEGIN
  PERFORM 1 FROM public.shift_quest_settings WHERE id FOR NO KEY UPDATE;
  IF p_key IN ('consent_required', 'digest_enabled') THEN
    IF v_on IS NULL THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    EXECUTE format('UPDATE public.shift_quest_settings SET %I = $1 WHERE id', p_key) USING v_on;
  ELSIF p_key = 'consent_adult_age' THEN
    -- Two checks, not one OR: SQL does not promise to test the pattern before the cast.
    IF v_value !~ '^[0-9]{2}$' THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    IF v_value::integer NOT BETWEEN 13 AND 25 THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    UPDATE public.shift_quest_settings SET consent_adult_age = v_value::smallint WHERE id;
  ELSE
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  UPDATE public.shift_quest_settings SET updated_by = v_me.id, updated_at = now() WHERE id;
  PERFORM public.shift_quest__audit(v_me.id, 'island_' || p_key, 'settings', NULL);
  RETURN public.shift_quest_admin_island_status(p_actor);
END;
$$;

/**
 * /admin island consent-reset: after staff have talked with the family, an
 * admin clears a student's island consent row so the student can ask again
 * (a parent's no otherwise stays: shift_quest_consent_link and
 * shift_quest_consent_adult refuse 'sq:consent_parent_said_no'). The row
 * goes with the parent's details; the audit log keeps who answered what and
 * when (codes only) plus this reset. p_target is the student's Discord id.
 * Returns {state} the student now has ('none').
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_consent_reset(p_actor text, p_target text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_target uuid;
BEGIN
  SELECT id INTO v_target FROM public.shift_quest_members WHERE discord_user_id = p_target AND erased_at IS NULL;
  IF v_target IS NULL THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_target FOR NO KEY UPDATE;
  DELETE FROM public.shift_quest_consents WHERE member_id = v_target;
  PERFORM public.shift_quest__audit(v_me.id, 'consent_reset', 'consent', v_target);
  RETURN jsonb_build_object('state', 'none');
END;
$$;

/** /admin catalog gates: a null argument keeps the current value. Returns the item with its gates. */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_catalog_gate(
  p_actor text, p_item uuid, p_min_stage smallint, p_requires_community boolean
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
  IF p_min_stage IS NOT NULL AND p_min_stage NOT BETWEEN 0 AND 7 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  UPDATE public.shift_quest_catalog
  SET min_stage = COALESCE(p_min_stage, min_stage),
      requires_community = COALESCE(p_requires_community, requires_community),
      updated_at = now()
  WHERE id = p_item
  RETURNING * INTO v_item;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  PERFORM public.shift_quest__audit(v_me.id, 'catalog_gate', 'catalog', v_item.id);
  RETURN jsonb_build_object('id', v_item.id, 'name', v_item.name, 'cost', v_item.cost,
                            'stock_available', v_item.stock_available, 'active', v_item.active,
                            'min_stage', v_item.min_stage, 'requires_community', v_item.requires_community);
END;
$$;

/**
 * A staff award with a written reason the student sees: p_rule_key is
 * 'taught-next-shift' or 'helped-most', paid under that published rule as a
 * ledger award (so caps, /admin ledger and shift_quest_admin_reverse work).
 * Admin only, never to oneself ('sq:conflict_of_interest'). p_request_key
 * (8..200, the Discord interaction) makes a retry return the first award;
 * the same key for someone else is 'sq:bad_input'. Then, in order:
 * 'sq:rule_not_found', 'sq:cap_reached', 'sq:awards_paused',
 * 'sq:consent_required'. Tells the student in their inbox ('staff_award').
 */
CREATE OR REPLACE FUNCTION public.shift_quest_admin_staff_award(
  p_actor text, p_target text, p_rule_key text, p_reason text, p_request_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me public.shift_quest_members := public.shift_quest__staff(p_actor, ARRAY['admin']);
  v_reason text := public.shift_quest__check_len(p_reason, 500, true);
  v_target public.shift_quest_members;
  v_existing public.shift_quest_ledger;
  v_rule public.shift_quest_reward_rules;
  v_entry uuid;
BEGIN
  IF p_rule_key IS NULL OR p_rule_key NOT IN ('taught-next-shift', 'helped-most')
     OR p_request_key IS NULL OR char_length(p_request_key) NOT BETWEEN 8 AND 200 THEN
    PERFORM public.shift_quest__fail('bad_input');
  END IF;
  SELECT * INTO v_target FROM public.shift_quest_members WHERE discord_user_id = p_target AND erased_at IS NULL;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('not_found');
  END IF;
  IF v_target.id = v_me.id THEN
    PERFORM public.shift_quest__fail('conflict_of_interest');
  END IF;
  -- One award to this member at a time: the cap and a double click both see the first.
  PERFORM 1 FROM public.shift_quest_members WHERE id = v_target.id FOR NO KEY UPDATE;

  SELECT * INTO v_existing FROM public.shift_quest_ledger WHERE source_key = 'staff:' || p_request_key;
  IF FOUND THEN
    IF v_existing.member_id <> v_target.id THEN
      PERFORM public.shift_quest__fail('bad_input');
    END IF;
    RETURN jsonb_build_object('amount', v_existing.amount, 'duplicate', true,
                              'balance', public.shift_quest__balance(v_target.id));
  END IF;

  SELECT * INTO v_rule FROM public.shift_quest_reward_rules WHERE key = p_rule_key AND status = 'published';
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('rule_not_found');
  END IF;
  IF NOT public.shift_quest__under_cap(v_target.id, v_rule) THEN
    PERFORM public.shift_quest__fail('cap_reached');
  END IF;
  IF NOT public.shift_quest__awards_live() THEN
    PERFORM public.shift_quest__fail('awards_paused');
  END IF;
  IF NOT public.shift_quest__consent_ok(v_target.id) THEN
    PERFORM public.shift_quest__fail('consent_required');
  END IF;

  INSERT INTO public.shift_quest_ledger (member_id, amount, kind, source_key, reward_rule_id, reason, actor_id)
  VALUES (v_target.id, v_rule.amount, 'award', 'staff:' || p_request_key, v_rule.id, v_reason, v_me.id)
  RETURNING id INTO v_entry;

  PERFORM public.shift_quest__notify(
    v_target.id, 'staff_award:' || v_entry, 'staff_award',
    jsonb_build_object('amount', v_rule.amount, 'rule_key', v_rule.key, 'reason', v_reason), v_entry
  );
  PERFORM public.shift_quest__audit(v_me.id, 'staff_award', 'ledger', v_entry);
  RETURN jsonb_build_object('amount', v_rule.amount, 'duplicate', false,
                            'balance', public.shift_quest__balance(v_target.id));
END;
$$;

/** Island schema 9: the player, the progress economy, AI island news and parent consent. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 9;
$$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- Helpers: no login runs them. Supabase's default privileges grant every new
-- function to anon and authenticated, and Postgres to PUBLIC: take those back.
REVOKE ALL ON FUNCTION
  public.shift_quest__consent_ok(uuid),
  public.shift_quest__consent_ai_ok(uuid),
  public.shift_quest__member_stage(uuid),
  public.shift_quest__community_done(uuid),
  public.shift_quest__item_lock(uuid, public.shift_quest_catalog),
  public.shift_quest__digest_eligible(uuid),
  public.shift_quest__consent_json(uuid),
  public.shift_quest__parent_said_no(uuid),
  public.shift_quest__staff_key(text)
FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION
  public.shift_quest__consent_ok(uuid),
  public.shift_quest__consent_ai_ok(uuid),
  public.shift_quest__member_stage(uuid),
  public.shift_quest__community_done(uuid),
  public.shift_quest__item_lock(uuid, public.shift_quest_catalog),
  public.shift_quest__digest_eligible(uuid),
  public.shift_quest__consent_json(uuid),
  public.shift_quest__parent_said_no(uuid),
  public.shift_quest__staff_key(text)
TO service_role;

-- The website's only (a second pass of the earlier grant loops gives them to
-- the bot, so this takes them back).
REVOKE ALL ON FUNCTION
  public.shift_quest_character(text),
  public.shift_quest_wallet(text),
  public.shift_quest_consent_get(text),
  public.shift_quest_consent_adult(text, date, text),
  public.shift_quest_consent_link(text, text, text, text),
  public.shift_quest_consent_import(text, text, timestamptz, boolean, boolean),
  public.shift_quest_consent_parent_view(text),
  public.shift_quest_consent_parent_answer(text, boolean, boolean, text, text, text, text, text),
  public.shift_quest_consent_parent_withdraw(text),
  public.shift_quest_island_news(text),
  public.shift_quest_digest_inputs(date, text),
  public.shift_quest_digest_save(date, text, jsonb)
FROM PUBLIC, anon, authenticated, shift_quest_bot;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_character(text),
  public.shift_quest_wallet(text),
  public.shift_quest_consent_get(text),
  public.shift_quest_consent_adult(text, date, text),
  public.shift_quest_consent_link(text, text, text, text),
  public.shift_quest_consent_import(text, text, timestamptz, boolean, boolean),
  public.shift_quest_consent_parent_view(text),
  public.shift_quest_consent_parent_answer(text, boolean, boolean, text, text, text, text, text),
  public.shift_quest_consent_parent_withdraw(text),
  public.shift_quest_island_news(text),
  public.shift_quest_digest_inputs(date, text),
  public.shift_quest_digest_save(date, text, jsonb)
TO service_role;

-- The bot's (and the website's: digest_hide, below).
REVOKE ALL ON FUNCTION
  public.shift_quest_digest_hide(text, integer, boolean, text),
  public.shift_quest_digest_post_next(),
  public.shift_quest_digest_mark(date, text, text),
  public.shift_quest_admin_island_status(text),
  public.shift_quest_admin_island_set(text, text, text),
  public.shift_quest_admin_catalog_gate(text, uuid, smallint, boolean),
  public.shift_quest_admin_staff_award(text, text, text, text, text),
  public.shift_quest_digest_claim(date, text, text),
  public.shift_quest_digest_post_current(),
  public.shift_quest_admin_consent_reset(text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.shift_quest_digest_hide(text, integer, boolean, text),
  public.shift_quest_digest_post_next(),
  public.shift_quest_digest_mark(date, text, text),
  public.shift_quest_admin_island_status(text),
  public.shift_quest_admin_island_set(text, text, text),
  public.shift_quest_admin_catalog_gate(text, uuid, smallint, boolean),
  public.shift_quest_admin_staff_award(text, text, text, text, text),
  public.shift_quest_digest_claim(date, text, text),
  public.shift_quest_digest_post_current(),
  public.shift_quest_admin_consent_reset(text, text)
TO service_role, shift_quest_bot;

-- The replaced functions (__name_visible, __queue_share, shift_quest_redeem,
-- shift_quest_catalog_list, shift_quest_coins, shift_quest_admin_catalog_list,
-- shift_quest_admin_template_rule, __issue_award, __grant_unlocks,
-- shift_quest_proposal_get, shift_quest_proposal_agree,
-- shift_quest_admin_unlock, shift_quest_help_create, __island_export,
-- __island_erase) and the schema version keep the grants they already have:
-- CREATE OR REPLACE leaves them as they are.

-- Skipped where the web role does not exist (it is made by
-- 20261111090900_shift_quests_board). Mirrored in
-- supabase/tests/shift_quests/run-local.sh (check_privileges), web_board.ts,
-- web_canvas.ts and player.ts.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION
      public.shift_quest__consent_ok(uuid),
      public.shift_quest__consent_ai_ok(uuid),
      public.shift_quest__member_stage(uuid),
      public.shift_quest__community_done(uuid),
      public.shift_quest__item_lock(uuid, public.shift_quest_catalog),
      public.shift_quest__digest_eligible(uuid),
      public.shift_quest__consent_json(uuid),
      public.shift_quest__parent_said_no(uuid),
      public.shift_quest__staff_key(text),
      public.shift_quest_digest_post_next(),
      public.shift_quest_digest_claim(date, text, text),
      public.shift_quest_digest_post_current(),
      public.shift_quest_admin_consent_reset(text, text),
      public.shift_quest_digest_mark(date, text, text),
      public.shift_quest_admin_island_status(text),
      public.shift_quest_admin_island_set(text, text, text),
      public.shift_quest_admin_catalog_gate(text, uuid, smallint, boolean),
      public.shift_quest_admin_staff_award(text, text, text, text, text)
    FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION
      public.shift_quest_character(text),
      public.shift_quest_wallet(text),
      public.shift_quest_redeem(text, uuid, text, integer),
      public.shift_quest_redeem_cancel(text, uuid),
      public.shift_quest_consent_get(text),
      public.shift_quest_consent_adult(text, date, text),
      public.shift_quest_consent_link(text, text, text, text),
      public.shift_quest_consent_import(text, text, timestamptz, boolean, boolean),
      public.shift_quest_consent_parent_view(text),
      public.shift_quest_consent_parent_answer(text, boolean, boolean, text, text, text, text, text),
      public.shift_quest_consent_parent_withdraw(text),
      public.shift_quest_island_news(text),
      public.shift_quest_digest_inputs(date, text),
      public.shift_quest_digest_save(date, text, jsonb),
      public.shift_quest_digest_hide(text, integer, boolean, text)
    TO shift_quest_web;
  END IF;
END;
$$;
