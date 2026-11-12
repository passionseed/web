-- SHIFT voice participation: what the Discord bot saw students do in voice.
--
-- One row is one stretch of unchanged voice state for one student: in which
-- channel, mic open or not, screen sharing or not, camera on or not. Any change
-- closes the open row and opens the next, so summing durations by flag gives
-- minutes in voice, mic-on minutes, screen-share minutes and camera minutes.
-- No audio is received or stored; Discord voice state carries only these flags.
--
-- `seen_at` is how far the bot can vouch for a row. It equals `ended_at` once a
-- row is closed, and the bot's heartbeat moves it forward on open rows once a
-- minute. Readers use `seen_at` as the end of every row, so a bot that crashed
-- never banks time nobody was watching.
--
-- Students are minors: admin-only reads, service-role-only writes through the
-- functions below. Rows go with the application when it is deleted.
--
-- Prod-first apply: additive and idempotent.

CREATE TABLE IF NOT EXISTS public.shift_voice_spans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Round name, "SHIFT[3]": from the linked application, or from the
  -- student's Discord role when they never linked.
  cohort text NOT NULL,
  application_id uuid NULL REFERENCES public.shift_applications(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  -- Server display name at the time, for students without a linked application.
  display_name text NULL,
  discord_channel_id text NOT NULL,
  channel_name text NULL,
  started_at timestamptz NOT NULL,
  seen_at timestamptz NOT NULL,
  ended_at timestamptz NULL,
  mic_open boolean NOT NULL,
  streaming boolean NOT NULL,
  camera boolean NOT NULL,
  -- First row after entering voice. A move between channels or a mute toggle
  -- is not a join, so counting these counts drop-outs and rejoins.
  is_join boolean NOT NULL,
  CONSTRAINT shift_voice_spans_order CHECK (
    seen_at >= started_at AND (ended_at IS NULL OR ended_at = seen_at)
  )
);

COMMENT ON TABLE public.shift_voice_spans IS
  'SHIFT students'' Discord voice state over time (presence, mic open, screen share, camera). Written by bot/ only. Minors: admin-only.';

-- One open row per Discord account, enforced, so a dropped leave event can
-- never leave two rows accruing time at once.
CREATE UNIQUE INDEX IF NOT EXISTS shift_voice_spans_open
  ON public.shift_voice_spans (discord_user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS shift_voice_spans_cohort_time
  ON public.shift_voice_spans (cohort, started_at);
CREATE INDEX IF NOT EXISTS shift_voice_spans_application
  ON public.shift_voice_spans (application_id) WHERE application_id IS NOT NULL;

ALTER TABLE public.shift_voice_spans ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.shift_voice_spans FROM anon, authenticated;
GRANT SELECT ON public.shift_voice_spans TO authenticated;
GRANT ALL ON public.shift_voice_spans TO service_role;

DROP POLICY IF EXISTS "Admins read shift_voice_spans" ON public.shift_voice_spans;
CREATE POLICY "Admins read shift_voice_spans" ON public.shift_voice_spans
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ---------------------------------------------------------------------------
-- Bot entry points. Service role only.
-- ---------------------------------------------------------------------------

/**
 * Closes the student's open row (if any) and, when they are still in voice,
 * opens the next one. Atomic per student: gateway events for one person can
 * arrive close together, and the advisory lock keeps two calls from both
 * closing and both inserting.
 */
CREATE OR REPLACE FUNCTION public.shift_voice_transition(
  p_discord_user_id text,
  p_cohort text,
  p_application_id uuid,
  p_display_name text,
  p_channel_id text,
  p_channel_name text,
  p_mic_open boolean,
  p_streaming boolean,
  p_camera boolean,
  p_is_join boolean,
  p_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('shift_voice:' || p_discord_user_id));

  UPDATE public.shift_voice_spans
  SET ended_at = GREATEST(p_at, started_at),
      seen_at = GREATEST(p_at, started_at)
  WHERE discord_user_id = p_discord_user_id
    AND ended_at IS NULL;

  -- Left voice, or no longer a student of a running round: close only.
  IF p_channel_id IS NULL OR p_cohort IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.shift_voice_spans (
    cohort, application_id, discord_user_id, display_name,
    discord_channel_id, channel_name,
    started_at, seen_at, mic_open, streaming, camera, is_join
  )
  VALUES (
    p_cohort, p_application_id, p_discord_user_id, p_display_name,
    p_channel_id, p_channel_name,
    p_at, p_at, p_mic_open, p_streaming, p_camera, p_is_join
  );
END;
$$;

/** Heartbeat: the bot is connected and still sees every open row. */
CREATE OR REPLACE FUNCTION public.shift_voice_beat(p_at timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.shift_voice_spans
  SET seen_at = p_at
  WHERE ended_at IS NULL
    AND seen_at < p_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

/**
 * Closes every open row at its last heartbeat. The bot calls it on startup,
 * on a fresh gateway session and on shutdown, then re-opens rows for whoever
 * is in voice right now. Time between the last heartbeat and now was not
 * observed, so it is not counted.
 */
CREATE OR REPLACE FUNCTION public.shift_voice_close_all()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.shift_voice_spans
  SET ended_at = seen_at
  WHERE ended_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.shift_voice_transition(text, text, uuid, text, text, text, boolean, boolean, boolean, boolean, timestamptz)',
    'public.shift_voice_beat(timestamptz)',
    'public.shift_voice_close_all()'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END;
$$;
