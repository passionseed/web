-- The hackathon operations board for the Discord bot (bot/src/ops, BOT_MODULES
-- hackathon-ops): staff operations, each with an owner, a deadline, a status
-- line and a checklist of steps. Staff only; no student data is stored here.
--
-- Same least-privilege model as shift_voice_bot (20261109200000) and
-- shift_quest_bot (20261111090600): the bot runs on a shared host, so it
-- never holds the service role key. hackathon_ops_bot owns no tables and is
-- granted none; it can only execute the hackathon_ops_* functions below. The
-- tables have RLS on, no policies and no grants to anon or authenticated, so
-- nothing here is reachable through the Data API.
--
-- The rows come from a private source at run time (bot/scripts/hackathon-ops-seed.ts);
-- this public migration holds no operation, step, owner or date.
--
-- LOGIN and the password are set out of band, never in this public repo:
--   ALTER ROLE hackathon_ops_bot WITH LOGIN PASSWORD '<SCRAM verifier>';
-- The bot connects through the Supavisor pooler as hackathon_ops_bot.<project ref>.
--
-- Prod-first apply: additive and idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hackathon_ops_bot') THEN
    CREATE ROLE hackathon_ops_bot NOLOGIN NOINHERIT;
  END IF;
END;
$$;

ALTER ROLE hackathon_ops_bot SET statement_timeout = '10s';
ALTER ROLE hackathon_ops_bot CONNECTION LIMIT 3;

GRANT USAGE ON SCHEMA public TO hackathon_ops_bot;

CREATE TABLE IF NOT EXISTS public.hackathon_ops (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  board text NOT NULL CHECK (board ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  goal text CHECK (char_length(goal) <= 1000),
  done_when text CHECK (char_length(done_when) <= 1000),
  owner text CHECK (char_length(owner) BETWEEN 1 AND 100),
  deadline_text text CHECK (char_length(deadline_text) <= 200),
  deadline_on date,
  status text CHECK (char_length(status) <= 300),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (board, slug)
);

CREATE TABLE IF NOT EXISTS public.hackathon_ops_steps (
  operation_id bigint NOT NULL REFERENCES public.hackathon_ops (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 1),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  done_by text CHECK (char_length(done_by) <= 100),
  PRIMARY KEY (operation_id, position)
);

-- One morning post per board and Bangkok day: claimed before it is sent, so a
-- restart or two overlapping processes during a deploy never post twice.
CREATE TABLE IF NOT EXISTS public.hackathon_ops_morning (
  board text NOT NULL,
  day date NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (board, day)
);

ALTER TABLE public.hackathon_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_ops_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hackathon_ops_morning ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hackathon_ops FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.hackathon_ops_steps FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.hackathon_ops_morning FROM PUBLIC, anon, authenticated;

-- Explicit deny-all policies: RLS is on and only the SECURITY DEFINER
-- functions below (and service_role, which bypasses RLS) reach these rows.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hackathon_ops', 'hackathon_ops_steps', 'hackathon_ops_morning']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_no_client_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        t || '_no_client_access', t
      );
    END IF;
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS hackathon_ops_board_position_idx ON public.hackathon_ops (board, position, slug);

/** One operation's summary, as the board and the morning post show it. */
CREATE OR REPLACE FUNCTION public.hackathon_ops__summary(o public.hackathon_ops)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'slug', o.slug,
    'title', o.title,
    'owner', o.owner,
    'deadline_text', o.deadline_text,
    'deadline_on', to_char(o.deadline_on, 'YYYY-MM-DD'),
    'status', o.status,
    'steps_done', (SELECT count(*) FROM public.hackathon_ops_steps s WHERE s.operation_id = o.id AND s.done),
    'steps_total', (SELECT count(*) FROM public.hackathon_ops_steps s WHERE s.operation_id = o.id)
  );
$$;

CREATE OR REPLACE FUNCTION public.hackathon_ops__find(p_board text, p_slug text)
RETURNS public.hackathon_ops
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  o public.hackathon_ops;
BEGIN
  SELECT * INTO o FROM public.hackathon_ops WHERE board = p_board AND slug = p_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ops:not_found';
  END IF;
  RETURN o;
END;
$$;

/** Every operation on a board, in board order. */
CREATE OR REPLACE FUNCTION public.hackathon_ops_board(p_board text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(jsonb_agg(public.hackathon_ops__summary(o) ORDER BY o.position, o.slug), '[]'::jsonb)
  FROM public.hackathon_ops o
  WHERE o.board = p_board;
$$;

/** One operation with its goal and every step. */
CREATE OR REPLACE FUNCTION public.hackathon_ops_show(p_board text, p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  o public.hackathon_ops := public.hackathon_ops__find(p_board, p_slug);
BEGIN
  RETURN public.hackathon_ops__summary(o) || jsonb_build_object(
    'goal', o.goal,
    'done_when', o.done_when,
    'steps', coalesce((
      SELECT jsonb_agg(jsonb_build_object('position', s.position, 'text', s.text, 'done', s.done) ORDER BY s.position)
      FROM public.hackathon_ops_steps s
      WHERE s.operation_id = o.id
    ), '[]'::jsonb)
  );
END;
$$;

/** The caller becomes the owner (their display name, as the bot passes it). */
CREATE OR REPLACE FUNCTION public.hackathon_ops_claim(p_board text, p_slug text, p_owner text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  o public.hackathon_ops := public.hackathon_ops__find(p_board, p_slug);
  v_owner text := btrim(coalesce(p_owner, ''));
  v_before text := o.owner;
BEGIN
  IF char_length(v_owner) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'ops:bad_owner';
  END IF;
  UPDATE public.hackathon_ops SET owner = v_owner, updated_at = now() WHERE id = o.id RETURNING * INTO o;
  RETURN public.hackathon_ops__summary(o) || jsonb_build_object('previous_owner', v_before);
END;
$$;

/** Ticks (or unticks) one step. Ticking a ticked step changes nothing. */
CREATE OR REPLACE FUNCTION public.hackathon_ops_step_set(
  p_board text,
  p_slug text,
  p_position integer,
  p_done boolean,
  p_by text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  o public.hackathon_ops := public.hackathon_ops__find(p_board, p_slug);
  s public.hackathon_ops_steps;
  v_changed boolean;
BEGIN
  SELECT * INTO s FROM public.hackathon_ops_steps
  WHERE operation_id = o.id AND position = p_position
  FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ops:step_not_found';
  END IF;
  v_changed := s.done IS DISTINCT FROM coalesce(p_done, true);
  IF v_changed THEN
    UPDATE public.hackathon_ops_steps
    SET done = coalesce(p_done, true),
        done_at = CASE WHEN coalesce(p_done, true) THEN now() END,
        done_by = CASE WHEN coalesce(p_done, true) THEN left(btrim(p_by), 100) END
    WHERE operation_id = o.id AND position = p_position
    RETURNING * INTO s;
    UPDATE public.hackathon_ops SET updated_at = now() WHERE id = o.id;
  END IF;
  RETURN public.hackathon_ops__summary(o) || jsonb_build_object(
    'position', s.position, 'text', s.text, 'done', s.done, 'changed', v_changed
  );
END;
$$;

/** Sets the status line. */
CREATE OR REPLACE FUNCTION public.hackathon_ops_status_set(p_board text, p_slug text, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  o public.hackathon_ops := public.hackathon_ops__find(p_board, p_slug);
  v_status text := btrim(coalesce(p_status, ''));
BEGIN
  IF char_length(v_status) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'ops:bad_status';
  END IF;
  UPDATE public.hackathon_ops SET status = v_status, updated_at = now() WHERE id = o.id RETURNING * INTO o;
  RETURN public.hackathon_ops__summary(o);
END;
$$;

/**
 * Upserts operations from the seed script. p_ops is an array of
 * {slug, title, goal, done_when, owner, deadline_text, deadline_on, status,
 *  position, steps: [{text, done}]}.
 *
 * Content (title, goal, done when, deadline, order, step text) always follows
 * the source. With p_keep_live (the default), what staff changed in Discord
 * wins: an owner or status already set is kept, and a step stays ticked when
 * a step with the same text was ticked before. With p_keep_live false, owner,
 * status and ticks are taken from the source as well. Operations missing
 * from p_ops are left alone and counted.
 */
CREATE OR REPLACE FUNCTION public.hackathon_ops_seed(p_board text, p_ops jsonb, p_keep_live boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item jsonb;
  step jsonb;
  o public.hackathon_ops;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_steps integer := 0;
  v_pos integer;
  v_text text;
  v_done boolean;
  v_old_done_at timestamptz;
  v_old_done_by text;
  v_slugs text[] := ARRAY[]::text[];
  v_old jsonb;
BEGIN
  IF jsonb_typeof(p_ops) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ops:bad_seed';
  END IF;
  IF jsonb_array_length(p_ops) > 100 THEN
    RAISE EXCEPTION 'ops:too_many';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(p_ops)
  LOOP
    IF jsonb_typeof(item -> 'steps') IS DISTINCT FROM 'array' OR jsonb_array_length(item -> 'steps') > 100 THEN
      RAISE EXCEPTION 'ops:bad_seed';
    END IF;
    v_slugs := v_slugs || (item ->> 'slug');

    SELECT * INTO o FROM public.hackathon_ops WHERE board = p_board AND slug = item ->> 'slug' FOR NO KEY UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.hackathon_ops (board, slug, title, goal, done_when, owner, deadline_text, deadline_on, status, position)
      VALUES (
        p_board, item ->> 'slug', item ->> 'title', item ->> 'goal', item ->> 'done_when',
        nullif(btrim(item ->> 'owner'), ''), item ->> 'deadline_text', (item ->> 'deadline_on')::date,
        item ->> 'status', coalesce((item ->> 'position')::integer, 0)
      )
      RETURNING * INTO o;
      v_inserted := v_inserted + 1;
    ELSE
      UPDATE public.hackathon_ops SET
        title = item ->> 'title',
        goal = item ->> 'goal',
        done_when = item ->> 'done_when',
        deadline_text = item ->> 'deadline_text',
        deadline_on = (item ->> 'deadline_on')::date,
        position = coalesce((item ->> 'position')::integer, 0),
        owner = CASE WHEN p_keep_live AND o.owner IS NOT NULL THEN o.owner ELSE nullif(btrim(item ->> 'owner'), '') END,
        status = CASE WHEN p_keep_live AND o.status IS NOT NULL THEN o.status ELSE item ->> 'status' END,
        updated_at = now()
      WHERE id = o.id
      RETURNING * INTO o;
      v_updated := v_updated + 1;
    END IF;

    -- The ticked steps before this seed, by text, so a tick survives a reorder.
    v_old := coalesce((
      SELECT jsonb_object_agg(s.text, jsonb_build_object('done_at', s.done_at, 'done_by', s.done_by))
      FROM public.hackathon_ops_steps s
      WHERE s.operation_id = o.id AND s.done
    ), '{}'::jsonb);
    DELETE FROM public.hackathon_ops_steps WHERE operation_id = o.id;

    v_pos := 0;
    FOR step IN SELECT * FROM jsonb_array_elements(item -> 'steps')
    LOOP
      v_pos := v_pos + 1;
      v_text := step ->> 'text';
      v_done := coalesce((step ->> 'done')::boolean, false);
      v_old_done_at := NULL;
      v_old_done_by := NULL;
      IF p_keep_live AND v_old ? v_text THEN
        v_done := true;
        v_old_done_at := (v_old -> v_text ->> 'done_at')::timestamptz;
        v_old_done_by := v_old -> v_text ->> 'done_by';
      END IF;
      INSERT INTO public.hackathon_ops_steps (operation_id, position, text, done, done_at, done_by)
      VALUES (o.id, v_pos, v_text, v_done, CASE WHEN v_done THEN coalesce(v_old_done_at, now()) END, CASE WHEN v_done THEN v_old_done_by END);
      v_steps := v_steps + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'steps', v_steps,
    'not_in_source', (SELECT count(*) FROM public.hackathon_ops WHERE board = p_board AND NOT (slug = ANY (v_slugs)))
  );
END;
$$;

/** Claims today's morning post; true only for the first caller of the day. */
CREATE OR REPLACE FUNCTION public.hackathon_ops_morning_claim(p_board text, p_day date)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH claimed AS (
    INSERT INTO public.hackathon_ops_morning (board, day) VALUES (p_board, p_day)
    ON CONFLICT DO NOTHING
    RETURNING true
  )
  SELECT coalesce((SELECT true FROM claimed), false);
$$;

/** Gives the claim back after a failed send, so the next check may try again. */
CREATE OR REPLACE FUNCTION public.hackathon_ops_morning_release(p_board text, p_day date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.hackathon_ops_morning WHERE board = p_board AND day = p_day;
$$;

-- Nothing is open to PUBLIC, anon or authenticated. The bot executes every
-- entry point and no helper (hackathon_ops__*).
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'hackathon\_ops\_%'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn.sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    IF fn.proname NOT LIKE 'hackathon\_ops\_\_%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO hackathon_ops_bot', fn.sig);
    END IF;
  END LOOP;
END;
$$;
