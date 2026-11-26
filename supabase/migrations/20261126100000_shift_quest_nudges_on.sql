-- SHIFT High Island, schema 24: the bot's DMs are on by default.
--
-- Season 1 showed that opt-in DMs reach nobody: no student turned them on, so
-- no personal nudge ever went out, and the island went quiet. From here a
-- student gets the bot's two DMs unless they turn them off (Discord /settings,
-- or ตั้งค่า on the island):
--
--   * The update DM (kind 'nudge', notify_dm): a mentor answered, a teammate
--     invited you, a quest passed. It now says what happened: the notice kind
--     and a few whitelisted fields (the quest title, the stage, who invited you
--     to which project) ride along, so the bot can write "X passed" instead of
--     "something new". A mentor's own words (feedback, notes, reasons) never go
--     into it: they stay on the island, where a second adult can see them
--     (safeguarding section 4: a DM may notify; the record lives in the group
--     space).
--   * The come-back DM (kind 'away', schema 23) after a stretch away. Still
--     only while /admin feature away is on, inside an active season, at
--     away_hour, at most one per stretch and per 14 days.
--
-- What this migration changes:
--
--   1. notify_dm and away_dm default to true for new members, and
--      shift_quest_start creates a student with notify_dm on when it is given
--      no choice (null). The web and the bot now pass null, so a second start
--      never changes a choice.
--   2. One backfill: every student who never chose (away_dm is null, and
--      never saved their preferences) gets both turned on. A student who
--      chose keeps their choice. Keyed on away_dm being null, so it runs once.
--   3. shift_quest__notify puts the notice kind and the whitelisted fields in
--      the 'nudge' row's params.
--   4. The come-back DM starts after 3 days away instead of 7, unless an admin
--      already changed it: a two-week season cannot wait a week.
--   5. shift_quest_schema_version answers 24.
--
-- Additive and idempotent: column defaults, a backfill that only touches
-- nulls, a settings update that only touches the old default, and CREATE OR
-- REPLACE of three functions with unchanged signatures (their grants stay).

-- Defaults (1)

ALTER TABLE public.shift_quest_members ALTER COLUMN notify_dm SET DEFAULT true;
ALTER TABLE public.shift_quest_members ALTER COLUMN away_dm SET DEFAULT true;

-- The one backfill (2)

UPDATE public.shift_quest_members m
SET notify_dm = CASE
      -- Saved preferences before: their update-DM choice stands.
      WHEN EXISTS (
        SELECT 1 FROM public.shift_quest_audit a
        WHERE a.actor_id = m.id AND a.action = 'update_prefs'
      ) THEN m.notify_dm
      ELSE true
    END,
    away_dm = true,
    updated_at = now()
WHERE m.away_dm IS NULL
  AND m.erased_at IS NULL
  AND cardinality(m.roles) = 0;

-- Three days (4)

UPDATE public.shift_quest_settings SET away_after_days = 3 WHERE away_after_days = 7;

-- Start: a new student's update DM is on unless they say otherwise (1)

/** /start: the only place a member record is created for a student. */
CREATE OR REPLACE FUNCTION public.shift_quest_start(
  p_actor text, p_display_name text, p_notify_dm boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_actor IS NULL OR p_actor !~ '^[0-9]{5,25}$' THEN
    PERFORM public.shift_quest__fail('not_started');
  END IF;

  -- 20261126100000: on unless the caller says otherwise (was false).
  INSERT INTO public.shift_quest_members (discord_user_id, display_name, onboarded_at, notify_dm)
  VALUES (p_actor, left(p_display_name, 80), now(), COALESCE(p_notify_dm, true))
  ON CONFLICT (discord_user_id) DO UPDATE
    SET onboarded_at = COALESCE(shift_quest_members.onboarded_at, now()),
        display_name = COALESCE(left(EXCLUDED.display_name, 80), shift_quest_members.display_name),
        notify_dm = COALESCE(p_notify_dm, shift_quest_members.notify_dm),
        updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.shift_quest__audit(v_id, 'start', 'member', v_id);
  RETURN public.shift_quest_session(p_actor, NULL);
END;
$$;

-- The update DM says what happened (3)

/**
 * A private notice for one member, plus a DM if they have the update DM on.
 * From 20261126100000 the DM row carries the notice kind ('notice') and a
 * whitelist of its fields, so the bot can say what happened. Never the
 * mentor's words (feedback, note, reason) and never an internal id.
 */
CREATE OR REPLACE FUNCTION public.shift_quest__notify(
  p_member uuid, p_dedupe text, p_kind text, p_params jsonb, p_ref uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted boolean;
  v_p jsonb := COALESCE(p_params, '{}');
BEGIN
  INSERT INTO public.shift_quest_inbox (member_id, dedupe_key, kind, params, ref_id)
  VALUES (p_member, p_dedupe, p_kind, v_p, p_ref)
  ON CONFLICT (dedupe_key) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted AND EXISTS (
    SELECT 1 FROM public.shift_quest_members
    WHERE id = p_member AND notify_dm AND erased_at IS NULL
  ) THEN
    INSERT INTO public.shift_quest_outbox (dedupe_key, target_kind, member_id, kind, params)
    VALUES (
      'nudge:' || p_dedupe, 'dm', p_member, 'nudge',
      jsonb_strip_nulls(jsonb_build_object(
        'notice', p_kind,
        'title', left(v_p ->> 'title', 80),
        'stage', CASE WHEN jsonb_typeof(v_p -> 'stage') = 'number' THEN v_p -> 'stage' END,
        'milestone', CASE WHEN jsonb_typeof(v_p -> 'milestone') = 'number' THEN v_p -> 'milestone' END,
        'from', left(v_p ->> 'from', 60),
        'project_name', left(v_p ->> 'project_name', 80),
        'item', left(v_p ->> 'item', 80)
      ))
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;
END;
$$;

-- Schema version (5)

CREATE OR REPLACE FUNCTION public.shift_quest_schema_version()
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 24; $$;
