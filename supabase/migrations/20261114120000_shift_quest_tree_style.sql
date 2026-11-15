-- SHIFT High Island schema 13: seeds, tree style and gifts.
--
-- Design: docs/superpowers/specs/2026-11-14-shift-tree-style-design.md
-- (goals 2, 3, 4, 7 and 9). A team plants one of four seeds once, owns tree
-- items in four slots (shape, leaf, bark, bloom), earns gifts (pick 1 of up to
-- 3 items it does not own yet) after a closed campfire round and after the
-- first submit of each quest, and switches its tree between owned items. The
-- item ids and colours live in code (lib/shift-island/tree-style.ts); the
-- database stores ids only. Nothing here changes a stage, a coin or a gate.
--
-- Tables (RLS on, no policies, no grant but service_role's; access only
-- through the functions below):
--   * shift_quest_tree_items: the catalog's ids, slots and defaults, in the
--     code's order (sort), so SQL can choose gift options.
--   * shift_quest_tree_style: one row per project: seed, equipped items,
--     owned items. No row reads as no seed, the default look, the defaults.
--   * shift_quest_tree_gifts: one per (project, source), where source is
--     round:<session_id>, quest:main:<milestone>, quest:side:<template_id> or
--     quest:proposed:<instance_id>. member_id is who earned it; it never
--     leaves the database.
--
-- Functions (actor = Discord id text, resolved with shift_quest__student and
-- shift_quest__current_project; refusals are 'sq:<code>'):
--   * shift_quest_tree_get(actor): the caller's team tree, {seed, equipped,
--     owned, gifts, roots: {count, recent}, stage, ambition}.
--   * shift_quest_seed_plant(actor, seed, idea): once per project; the idea
--     becomes the project's ambition (the pickers prefill the current one).
--   * shift_quest_round_close_gift(actor, session, learned, stuck): calls
--     shift_quest_round_close (unchanged, so a schema-12 bot behaves exactly
--     as before) and adds at most one gift, {id, gift}. Bot-only, like
--     shift_quest_round_close (20261114090000): never granted to the website.
--     A failure while making the gift never rolls the round back.
--   * shift_quest_quest_gift(actor, instance): after a submit, {gift}.
--   * shift_quest_tree_pick(actor, gift, item), shift_quest_tree_equip(actor, item).
--   * shift_quest_island_styles(): [{slot, seed, equipped}] for shown plots
--     only (shift_quest__name_visible). Never a name, a member or a count.
--   * shift_quest__project_root_notes(project, since): the roots counter of
--     20261113173515, extracted; shift_quest__project_roots now uses it.
--   * shift_quest_schema_version() = 13.
--
-- Grants are per function: every entry point is the bot's, service_role's
-- and (where the role exists) shift_quest_web's, except
-- shift_quest_round_close_gift, which is the bot's and service_role's only;
-- the helpers are nobody's.
-- Mirrored in supabase/tests/shift_quests/run-local.sh (check_privileges),
-- web_board.ts, web_canvas.ts and tree.ts.
--
-- Prod-first: production is the first Postgres to parse this file. Additive
-- and idempotent (CREATE TABLE / INDEX IF NOT EXISTS, CREATE OR REPLACE,
-- ON CONFLICT DO NOTHING), safe to run twice; Postgres 15. The maintainer
-- applies it. Keep it after 20261114100000_shift_quest_web_reflect.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_quest_tree_items (
  id text PRIMARY KEY,
  slot text NOT NULL CHECK (slot IN ('shape', 'leaf', 'bark', 'bloom')),
  is_default boolean NOT NULL DEFAULT false,
  sort integer NOT NULL
);

COMMENT ON TABLE public.shift_quest_tree_items IS
  'SHIFT Island tree items: ids and slots of lib/shift-island/tree-style.ts TREE_ITEMS, in its order. Colours stay in code.';

-- TREE_ITEMS, in catalog order. New items are new rows; ids never change.
INSERT INTO public.shift_quest_tree_items (id, slot, is_default, sort)
VALUES
  ('shape:round', 'shape', true, 1),
  ('shape:maple', 'shape', false, 2),
  ('shape:heart', 'shape', false, 3),
  ('shape:pine', 'shape', false, 4),
  ('shape:willow', 'shape', false, 5),
  ('shape:star', 'shape', false, 6),
  ('leaf:forest', 'leaf', true, 7),
  ('leaf:autumn', 'leaf', false, 8),
  ('leaf:mint', 'leaf', false, 9),
  ('leaf:gold', 'leaf', false, 10),
  ('leaf:dusk', 'leaf', false, 11),
  ('leaf:sky', 'leaf', false, 12),
  ('bark:oak', 'bark', true, 13),
  ('bark:birch', 'bark', false, 14),
  ('bark:ebony', 'bark', false, 15),
  ('bark:cedar', 'bark', false, 16),
  ('bark:ash', 'bark', false, 17),
  ('bloom:cream', 'bloom', true, 18),
  ('bloom:sakura', 'bloom', false, 19),
  ('bloom:lantern', 'bloom', false, 20),
  ('bloom:frost', 'bloom', false, 21),
  ('bloom:peach', 'bloom', false, 22)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.shift_quest_tree_style (
  project_id uuid PRIMARY KEY REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  -- One of SEEDS in tree-style.ts (shift_quest__tree_seed); null until planted.
  seed text NULL,
  -- {slot: item id}; a missing or unknown slot reads as its default.
  equipped jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Items the team owns beyond the defaults (defaults are always owned).
  owned text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.shift_quest_tree_style IS
  'SHIFT Island team tree style: seed, equipped and owned item ids per project. No personal data.';

CREATE TABLE IF NOT EXISTS public.shift_quest_tree_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.shift_quest_projects(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.shift_quest_members(id),
  source text NOT NULL,
  options text[] NOT NULL CHECK (cardinality(options) BETWEEN 1 AND 3),
  picked text NULL CHECK (picked IS NULL OR picked = ANY (options)),
  created_at timestamptz NOT NULL DEFAULT now(),
  picked_at timestamptz NULL,
  UNIQUE (project_id, source)
);

-- The round gift cap: a member's gifts by day.
CREATE INDEX IF NOT EXISTS shift_quest_tree_gifts_member
  ON public.shift_quest_tree_gifts (member_id, created_at);

COMMENT ON TABLE public.shift_quest_tree_gifts IS
  'SHIFT Island tree gifts: pick 1 of up to 3 items, one per project and source (a campfire round or a quest). member_id never leaves the database.';

-- No Data API access, as every other quest table (20261111090000_shift_quests_schema.sql).
ALTER TABLE public.shift_quest_tree_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_quest_tree_style ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_quest_tree_gifts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shift_quest_tree_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.shift_quest_tree_style FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.shift_quest_tree_gifts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.shift_quest_tree_items TO service_role;
GRANT ALL ON public.shift_quest_tree_style TO service_role;
GRANT ALL ON public.shift_quest_tree_gifts TO service_role;

-- ---------------------------------------------------------------------------
-- Roots: the counter of 20261113173515, extracted
-- ---------------------------------------------------------------------------

/**
 * Qualifying notes of a project: journal notes (kind 'note') with at least
 * 10 characters of learned, written for the project by a current active
 * member, at most the earliest 3 per member per Bangkok day, on a project
 * that is not archived. With p_since, only the counted notes written at or
 * after that instant (the day cap is still applied over the whole journal,
 * so a recent count never exceeds the total). Null p_since: all time.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__project_root_notes(p_project uuid, p_since timestamptz)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH notes AS (
    SELECT e.created_at,
           row_number() OVER (
             PARTITION BY e.member_id, (e.created_at AT TIME ZONE 'Asia/Bangkok')::date
             ORDER BY e.created_at, e.id
           ) AS nth
    FROM public.shift_quest_progress e
    JOIN public.shift_quest_project_members pm
      ON pm.project_id = e.project_id AND pm.member_id = e.member_id AND pm.status = 'active'
    JOIN public.shift_quest_projects p ON p.id = e.project_id AND p.archived_at IS NULL
    WHERE e.project_id = p_project AND e.kind = 'note'
      AND char_length(COALESCE(e.learned, '')) >= 10
  )
  SELECT count(*)::integer
  FROM notes
  WHERE nth <= 3 AND (p_since IS NULL OR created_at >= p_since);
$$;

/** The roots level (0 to 3) from the shared counter: 1 to 4 notes is 1, 5 to 14 is 2, 15 or more is 3. */
CREATE OR REPLACE FUNCTION public.shift_quest__project_roots(p_project uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN n >= 15 THEN 3 WHEN n >= 5 THEN 2 WHEN n >= 1 THEN 1 ELSE 0 END
  FROM (SELECT public.shift_quest__project_root_notes(p_project, NULL) AS n) c;
$$;

-- ---------------------------------------------------------------------------
-- Helpers (double underscore: never granted)
-- ---------------------------------------------------------------------------

/** A seed's look, {shape, leaf, bark, bloom}, or null for an unknown seed. Mirrors SEEDS in tree-style.ts. */
CREATE OR REPLACE FUNCTION public.shift_quest__tree_seed(p_seed text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT s.style
  FROM (VALUES
    ('oak', '{"shape": "shape:round", "leaf": "leaf:forest", "bark": "bark:oak", "bloom": "bloom:cream"}'::jsonb),
    ('sakura', '{"shape": "shape:heart", "leaf": "leaf:forest", "bark": "bark:cedar", "bloom": "bloom:sakura"}'::jsonb),
    ('pine', '{"shape": "shape:pine", "leaf": "leaf:mint", "bark": "bark:ebony", "bloom": "bloom:frost"}'::jsonb),
    ('maple', '{"shape": "shape:maple", "leaf": "leaf:autumn", "bark": "bark:birch", "bloom": "bloom:lantern"}'::jsonb)
  ) AS s (id, style)
  WHERE s.id = p_seed;
$$;

/** A stored equipped object as all four slots: a missing or unknown id (or one of another slot) reads as the default. */
CREATE OR REPLACE FUNCTION public.shift_quest__tree_equipped(p_equipped jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_object_agg(d.slot, COALESCE(e.id, d.id))
  FROM public.shift_quest_tree_items d
  LEFT JOIN public.shift_quest_tree_items e ON e.slot = d.slot AND e.id = p_equipped ->> d.slot
  WHERE d.is_default;
$$;

/**
 * A project's tree, as its own team sees it: {seed, equipped, owned, gifts,
 * roots: {count, recent}, stage, ambition}. owned lists catalog ids in
 * catalog order and always includes the defaults; gifts are the unpicked
 * ones, oldest first, as {id, options}; roots.count is the qualifying notes
 * (the roots counter) up to 15, the top roots level, and roots.recent those
 * of the last 7 days, up to the same 15; stage is the number of milestones
 * approved; ambition is the project's current ambition text or null, so the
 * seed pickers can prefill it. Only ever returned to the team itself (the
 * shift_quest_tree_* entry points), never to shift_quest_island_styles().
 */
CREATE OR REPLACE FUNCTION public.shift_quest__tree_json(p_project uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'seed', s.seed,
    'equipped', public.shift_quest__tree_equipped(s.equipped),
    'owned', (
      SELECT COALESCE(jsonb_agg(i.id ORDER BY i.sort), '[]'::jsonb)
      FROM public.shift_quest_tree_items i
      WHERE i.is_default OR i.id = ANY (COALESCE(s.owned, '{}'::text[]))
    ),
    'gifts', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', g.id, 'options', to_jsonb(g.options))
                                ORDER BY g.created_at, g.id), '[]'::jsonb)
      FROM public.shift_quest_tree_gifts g
      WHERE g.project_id = p_project AND g.picked IS NULL
    ),
    'roots', jsonb_build_object(
      'count', least(public.shift_quest__project_root_notes(p_project, NULL), 15),
      'recent', least(public.shift_quest__project_root_notes(p_project, now() - interval '7 days'), 15)
    ),
    'stage', cardinality(public.shift_quest__milestones(p_project)),
    'ambition', (SELECT p.ambition FROM public.shift_quest_projects p WHERE p.id = p_project)
  )
  FROM (SELECT 1) AS one
  LEFT JOIN public.shift_quest_tree_style s ON s.project_id = p_project;
$$;

/** The project's style row, created empty when missing, locked FOR UPDATE for the caller's transaction. */
CREATE OR REPLACE FUNCTION public.shift_quest__tree_lock(p_project uuid)
RETURNS public.shift_quest_tree_style
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.shift_quest_tree_style;
BEGIN
  INSERT INTO public.shift_quest_tree_style (project_id) VALUES (p_project)
  ON CONFLICT (project_id) DO NOTHING;
  SELECT * INTO v_row FROM public.shift_quest_tree_style WHERE project_id = p_project FOR UPDATE;
  RETURN v_row;
END;
$$;

/**
 * Creates a project's gift for one source, at most once ever: null when the
 * source already has a gift or the team owns every item, else {id, options}.
 * Options are up to 3 catalog items the team does not own (defaults are
 * always owned). An item that one of the project's waiting (unpicked) gifts
 * already offers is held back: it comes only after every fresh item, so two
 * waiting gifts never share an option while 3 fresh items are left, and a
 * gift still offers 3 until the team owns all but 2 items.
 *   1. Fresh items first. The slot with the most fresh items gives them, in
 *      catalog order.
 *   2. Ties between slots: the slots in catalog order (shape, leaf, bark,
 *      bloom: each slot by its first item's sort) rotated by the number of
 *      gifts the project already has, so gift 0 prefers shape, gift 1 leaf,
 *      gift 2 bark, gift 3 bloom, gift 4 shape again; the first tied slot in
 *      that rotated order wins.
 *   3. When the winning slot has fewer than 3 fresh items, the rest come from
 *      the other slots in the same order (most fresh first, ties by the
 *      rotation), each in catalog order.
 *   4. Then, only when fewer than 3 fresh items are left, the held-back items
 *      fill the gift, ranked the same way among themselves.
 * So a gift offers 3 until the team owns all but 2 items, then 2, then 1,
 * then none. Options are what was unowned when the gift was made; a later
 * pick of an item owned since adds nothing twice (shift_quest_tree_pick), and
 * the pickers hide options the team owns by then.
 * Gift decisions of one project take turns (a transaction advisory lock), so
 * two at once cannot both choose the same fresh items.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__gift_create(p_project uuid, p_member uuid, p_source text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owned text[];
  v_offered text[];
  v_turn integer;
  v_options text[];
  v_id uuid;
BEGIN
  -- Read the project's items and gifts only once the lock is held (each
  -- statement below sees what a gift decision before this one committed).
  PERFORM pg_advisory_xact_lock(hashtext('shift_quest_tree_gift_project:' || p_project));
  v_owned := COALESCE(
    (SELECT owned FROM public.shift_quest_tree_style WHERE project_id = p_project), '{}'::text[]
  );
  v_offered := COALESCE(
    (SELECT array_agg(DISTINCT o.item)
     FROM public.shift_quest_tree_gifts g, unnest(g.options) AS o (item)
     WHERE g.project_id = p_project AND g.picked IS NULL),
    '{}'::text[]
  );
  v_turn := (SELECT count(*) FROM public.shift_quest_tree_gifts WHERE project_id = p_project);

  WITH unowned AS (
    SELECT i.id, i.slot, i.sort, i.id = ANY (v_offered) AS held
    FROM public.shift_quest_tree_items i
    WHERE NOT i.is_default AND NOT (i.id = ANY (v_owned))
  ),
  counted AS (
    -- left_n: the slot's fresh items for a fresh item, its held-back ones for a held-back item.
    SELECT u.*, count(*) OVER (PARTITION BY u.slot, u.held) AS left_n
    FROM unowned u
  ),
  slots AS (
    SELECT i.slot,
           row_number() OVER (ORDER BY min(i.sort)) - 1 AS pos,
           count(*) OVER () AS n
    FROM public.shift_quest_tree_items i
    GROUP BY i.slot
  ),
  ranked AS (
    SELECT s.slot, ((s.pos - v_turn) % s.n + s.n) % s.n AS turn_pos
    FROM slots s
  )
  SELECT array_agg(x.id ORDER BY x.rn) INTO v_options
  FROM (
    SELECT c.id, row_number() OVER (ORDER BY c.held, c.left_n DESC, r.turn_pos, c.sort) AS rn
    FROM counted c JOIN ranked r ON r.slot = c.slot
  ) x
  WHERE x.rn <= 3;

  IF v_options IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.shift_quest_tree_gifts (project_id, member_id, source, options)
  VALUES (p_project, p_member, p_source, v_options)
  ON CONFLICT (project_id, source) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object('id', v_id, 'options', to_jsonb(v_options));
END;
$$;

-- ---------------------------------------------------------------------------
-- The team's tree (bot and website)
-- ---------------------------------------------------------------------------

/** The caller's team tree (shift_quest__tree_json). 'sq:no_project' without a current project. */
CREATE OR REPLACE FUNCTION public.shift_quest_tree_get(p_actor text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  RETURN public.shift_quest__tree_json(v_project);
END;
$$;

/**
 * Plant the team's seed, once per project, by any member: sets the seed,
 * owns and wears its four items, and makes the idea (trimmed, 1 to 500
 * characters) the project's ambition. Both pickers prefill the field with the
 * current ambition (tree_json's ambition), so an untouched line keeps it, an
 * empty ambition is filled, and a line the team edited replaces it: what the
 * student sees in the field is what the team's ambition becomes.
 * Refuses 'sq:no_project', 'sq:seed_unknown', 'sq:missing_text',
 * 'sq:text_too_long' and 'sq:seed_planted'. Returns the tree.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_seed_plant(p_actor text, p_seed text, p_idea text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_style jsonb;
  v_idea text;
  v_row public.shift_quest_tree_style;
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  v_style := public.shift_quest__tree_seed(p_seed);
  IF v_style IS NULL THEN
    PERFORM public.shift_quest__fail('seed_unknown');
  END IF;
  v_idea := public.shift_quest__check_len(p_idea, 500, true);

  v_row := public.shift_quest__tree_lock(v_project);
  IF v_row.seed IS NOT NULL THEN
    PERFORM public.shift_quest__fail('seed_planted');
  END IF;

  UPDATE public.shift_quest_tree_style
  SET seed = p_seed,
      owned = v_row.owned || ARRAY(
        SELECT e.value FROM jsonb_each_text(v_style) AS e
        WHERE NOT (e.value = ANY (v_row.owned))
        ORDER BY e.value
      ),
      equipped = v_style,
      updated_at = now()
  WHERE project_id = v_project;

  UPDATE public.shift_quest_projects
  SET ambition = v_idea, updated_at = now()
  WHERE id = v_project AND ambition IS DISTINCT FROM v_idea;

  PERFORM public.shift_quest__audit(v_member.id, 'seed_plant', 'project', v_project);
  RETURN public.shift_quest__tree_json(v_project);
END;
$$;

/**
 * Close a campfire round (shift_quest_round_close, unchanged: same checks,
 * same journal note, same failures) and give the caller's team at most one
 * gift for it, sourced round:<session>. No gift when the session is not the
 * caller's own (or none was captured), the caller has no current project,
 * the round already gave one (a retry), the caller already earned 2 round
 * gifts this Bangkok day (quest gifts never count), or the team owns
 * everything. Returns {id: <journal note id>, gift: null | {id, options}}.
 * The gift never fails the save it follows: any error while making it is
 * caught (its subtransaction rolls back), raised as a WARNING with its
 * SQLSTATE only, and gift is null, while the round's close and journal note
 * stay saved.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_round_close_gift(
  p_actor text, p_session uuid, p_learned text, p_stuck text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_note uuid;
  v_project uuid;
  v_gift jsonb;
BEGIN
  v_note := public.shift_quest_round_close(p_actor, p_session, p_learned, p_stuck);

  -- The gift is extra: its own subtransaction, so an error here leaves the
  -- round closed and its note saved, with no gift.
  BEGIN
    v_project := public.shift_quest__current_project(v_member);
    IF v_project IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.shift_quest_work_sessions
      WHERE id = p_session AND member_id = v_member.id AND ended_at IS NOT NULL
    ) THEN
      -- One round gift decision per member at a time, so two closes at once
      -- cannot both pass the daily count. Nothing else takes this lock.
      PERFORM pg_advisory_xact_lock(hashtext('shift_quest_tree_gift:' || v_member.id));
      IF (SELECT count(*) FROM public.shift_quest_tree_gifts
          WHERE member_id = v_member.id AND source LIKE 'round:%'
            AND (created_at AT TIME ZONE 'Asia/Bangkok')::date = (now() AT TIME ZONE 'Asia/Bangkok')::date) < 2 THEN
        v_gift := public.shift_quest__gift_create(v_project, v_member.id, 'round:' || p_session);
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- The code only: an error message can carry student text, which never goes to logs.
    RAISE WARNING 'shift_quest_round_close_gift: gift skipped (SQLSTATE %)', SQLSTATE;
    v_gift := NULL;
  END;

  RETURN jsonb_build_object('id', v_note, 'gift', v_gift);
END;
$$;

/**
 * After a quest submit: the team's gift for the quest's first submit, at most
 * one per source ever: a main quest per milestone (quest:main:<milestone>), a
 * side or other template quest per template (quest:side:<template_id>), a
 * proposed quest per quest (quest:proposed:<instance_id>). Never counted
 * against the round cap. Returns {gift: null | {id, options}}, and never
 * raises for a miss: gift is null when the quest is unknown or not on the
 * caller's current project, has no submission yet, its source already gave a
 * gift (a resubmit, a teammate's quest of the same milestone or template), or
 * the team owns everything. Raises only 'sq:not_started' and 'sq:no_project'.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_quest_gift(p_actor text, p_instance uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_instance public.shift_quest_instances;
  v_source text;
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;

  SELECT * INTO v_instance FROM public.shift_quest_instances
  WHERE id = p_instance AND project_id = v_project;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.shift_quest_submissions WHERE instance_id = v_instance.id
  ) THEN
    RETURN jsonb_build_object('gift', NULL);
  END IF;

  v_source := CASE
    WHEN v_instance.milestone IS NOT NULL THEN 'quest:main:' || v_instance.milestone
    WHEN v_instance.template_id IS NOT NULL THEN 'quest:side:' || v_instance.template_id
    ELSE 'quest:proposed:' || v_instance.id
  END;
  RETURN jsonb_build_object('gift', public.shift_quest__gift_create(v_project, v_member.id, v_source));
END;
$$;

/**
 * Pick one of a waiting gift's options: the team owns it (once) and wears it
 * in its slot at once. The gift row is locked FOR UPDATE first, so of two
 * teammates picking at once exactly one wins. Refuses 'sq:gift_gone' (no such
 * gift on the caller's current project, or already picked) and
 * 'sq:item_not_offered'. Returns the tree.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_tree_pick(p_actor text, p_gift uuid, p_item text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_gift public.shift_quest_tree_gifts;
  v_slot text;
BEGIN
  SELECT * INTO v_gift FROM public.shift_quest_tree_gifts
  WHERE id = p_gift AND project_id = v_project
  FOR UPDATE;
  IF NOT FOUND OR v_gift.picked IS NOT NULL THEN
    PERFORM public.shift_quest__fail('gift_gone');
  END IF;
  IF p_item IS NULL OR NOT (p_item = ANY (v_gift.options)) THEN
    PERFORM public.shift_quest__fail('item_not_offered');
  END IF;
  SELECT slot INTO v_slot FROM public.shift_quest_tree_items WHERE id = p_item;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('item_not_offered');
  END IF;

  UPDATE public.shift_quest_tree_gifts SET picked = p_item, picked_at = now() WHERE id = v_gift.id;

  PERFORM public.shift_quest__tree_lock(v_project);
  UPDATE public.shift_quest_tree_style
  SET owned = CASE WHEN p_item = ANY (owned) THEN owned ELSE array_append(owned, p_item) END,
      equipped = equipped || jsonb_build_object(v_slot, p_item),
      updated_at = now()
  WHERE project_id = v_project;

  PERFORM public.shift_quest__audit(v_member.id, 'tree_pick', 'tree_gift', v_gift.id);
  RETURN public.shift_quest__tree_json(v_project);
END;
$$;

/**
 * Wear an item the team owns (any default, or one it owns) in its slot.
 * Refuses 'sq:no_project' and 'sq:item_not_owned' (unknown items included).
 * Returns the tree.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_tree_equip(p_actor text, p_item text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.shift_quest_members := public.shift_quest__student(p_actor);
  v_project uuid := public.shift_quest__current_project(v_member);
  v_item public.shift_quest_tree_items;
  v_row public.shift_quest_tree_style;
BEGIN
  IF v_project IS NULL THEN
    PERFORM public.shift_quest__fail('no_project');
  END IF;
  SELECT * INTO v_item FROM public.shift_quest_tree_items WHERE id = p_item;
  IF NOT FOUND THEN
    PERFORM public.shift_quest__fail('item_not_owned');
  END IF;

  v_row := public.shift_quest__tree_lock(v_project);
  IF NOT v_item.is_default AND NOT (v_item.id = ANY (v_row.owned)) THEN
    PERFORM public.shift_quest__fail('item_not_owned');
  END IF;

  UPDATE public.shift_quest_tree_style
  SET equipped = equipped || jsonb_build_object(v_item.slot, v_item.id), updated_at = now()
  WHERE project_id = v_project;
  RETURN public.shift_quest__tree_json(v_project);
END;
$$;

-- ---------------------------------------------------------------------------
-- Other teams' trees (bot and website)
-- ---------------------------------------------------------------------------

/**
 * The look of every shown tree that has a style row: [{slot, seed, equipped}]
 * by slot. Shown means shift_quest__name_visible (not archived, every active
 * member agreed and has consent), the same outsider rule as the stage and
 * the roots; a plain plot draws as the default. No caller: the same for
 * everyone. Never a name, a member, a project id, a count or roots.
 */
CREATE OR REPLACE FUNCTION public.shift_quest_island_styles()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('slot', pl.slot, 'seed', s.seed, 'equipped', public.shift_quest__tree_equipped(s.equipped))
      ORDER BY pl.slot
    ),
    '[]'::jsonb
  )
  FROM public.shift_quest_plots pl
  JOIN public.shift_quest_tree_style s ON s.project_id = pl.project_id
  WHERE public.shift_quest__name_visible(pl.project_id);
$$;

/** Island schema 13: seeds, tree style and gifts. */
CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 13; $$;

-- ---------------------------------------------------------------------------
-- Privileges, per function (no grant loop here)
-- ---------------------------------------------------------------------------

-- Helpers: only the definer functions above call them. Supabase's default
-- privileges grant every new function to anon, authenticated and
-- service_role, and Postgres to PUBLIC: take all of that back.
REVOKE ALL ON FUNCTION public.shift_quest__project_root_notes(uuid, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__tree_seed(text) FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__tree_equipped(jsonb) FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__tree_json(uuid) FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__tree_lock(uuid) FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
REVOKE ALL ON FUNCTION public.shift_quest__gift_create(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated, service_role, shift_quest_bot;
-- shift_quest__project_roots keeps its grants (none): CREATE OR REPLACE leaves them.

-- Entry points: the bot's and service_role's. shift_quest_round_close_gift
-- stays bot-only (no website grant below), as shift_quest_round_close is.
REVOKE ALL ON FUNCTION public.shift_quest_tree_get(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_quest_seed_plant(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_quest_round_close_gift(text, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_quest_quest_gift(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_quest_tree_pick(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_quest_tree_equip(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shift_quest_island_styles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shift_quest_tree_get(text) TO shift_quest_bot, service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_seed_plant(text, text, text) TO shift_quest_bot, service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_round_close_gift(text, uuid, text, text) TO shift_quest_bot, service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_quest_gift(text, uuid) TO shift_quest_bot, service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_tree_pick(text, uuid, text) TO shift_quest_bot, service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_tree_equip(text, text) TO shift_quest_bot, service_role;
GRANT EXECUTE ON FUNCTION public.shift_quest_island_styles() TO shift_quest_bot, service_role;
-- The schema version keeps the grants it already has.

-- And the website's, where its role exists (made by 20261111090900_shift_quests_board).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shift_quest_web') THEN
    REVOKE ALL ON FUNCTION public.shift_quest__project_root_notes(uuid, timestamptz) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__tree_seed(text) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__tree_equipped(jsonb) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__tree_json(uuid) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__tree_lock(uuid) FROM shift_quest_web;
    REVOKE ALL ON FUNCTION public.shift_quest__gift_create(uuid, uuid, text) FROM shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_tree_get(text) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_seed_plant(text, text, text) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_quest_gift(text, uuid) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_tree_pick(text, uuid, text) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_tree_equip(text, text) TO shift_quest_web;
    GRANT EXECUTE ON FUNCTION public.shift_quest_island_styles() TO shift_quest_web;
  END IF;
END;
$$;
