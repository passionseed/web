-- Career Radar story reel voice-over studio: private audio bucket and takes table.
--
-- Additive and idempotent: safe to re-run against production Postgres.
-- Bucket `radar-voice` is PRIVATE: no public URLs, no anonymous access,
-- admin-only read/write (matching public.user_roles role = 'admin').

CREATE TABLE IF NOT EXISTS public.radar_voice_takes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  beat_index integer NOT NULL CHECK (beat_index >= 0),
  line_hash text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  duration_ms integer NOT NULL CHECK (duration_ms > 0),
  peak_dbfs double precision,
  noise_floor_dbfs double precision,
  picked boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_radar_voice_takes_story_beat
  ON public.radar_voice_takes (story_id, beat_index, created_at DESC);

-- Guarantee at most one picked take per (story_id, beat_index).
CREATE UNIQUE INDEX IF NOT EXISTS idx_radar_voice_takes_one_picked_per_line
  ON public.radar_voice_takes (story_id, beat_index)
  WHERE picked = true;

-- Atomic pick switch: clears any previous picked take on the same line and
-- stars p_take_id inside a single transaction.
CREATE OR REPLACE FUNCTION public.pick_radar_voice_take(p_take_id uuid)
RETURNS SETOF public.radar_voice_takes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_story_id text;
  v_beat_index integer;
BEGIN
  SELECT story_id, beat_index
    INTO v_story_id, v_beat_index
    FROM public.radar_voice_takes
   WHERE id = p_take_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.radar_voice_takes
     SET picked = false
   WHERE story_id = v_story_id
     AND beat_index = v_beat_index
     AND picked = true
     AND id <> p_take_id;

  RETURN QUERY
  UPDATE public.radar_voice_takes
     SET picked = true
   WHERE id = p_take_id
   RETURNING *;
END;
$$;

ALTER TABLE public.radar_voice_takes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read radar voice takes" ON public.radar_voice_takes;
CREATE POLICY "Admins can read radar voice takes" ON public.radar_voice_takes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert radar voice takes" ON public.radar_voice_takes;
CREATE POLICY "Admins can insert radar voice takes" ON public.radar_voice_takes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update radar voice takes" ON public.radar_voice_takes;
CREATE POLICY "Admins can update radar voice takes" ON public.radar_voice_takes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete radar voice takes" ON public.radar_voice_takes;
CREATE POLICY "Admins can delete radar voice takes" ON public.radar_voice_takes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Private Storage bucket `radar-voice` (15 MB max per WAV take).
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'radar-voice',
      'radar-voice',
      false,
      15728640,
      ARRAY['audio/wav', 'audio/x-wav', 'audio/wave']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = false,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    -- Restrictive guard: anonymous callers can never access radar-voice objects.
    DROP POLICY IF EXISTS "radar_voice_block_anon" ON storage.objects;
    CREATE POLICY "radar_voice_block_anon" ON storage.objects
      AS RESTRICTIVE FOR ALL TO anon
      USING (bucket_id <> 'radar-voice')
      WITH CHECK (bucket_id <> 'radar-voice');

    -- Restrictive guard: non-admin authenticated callers can never access radar-voice objects.
    DROP POLICY IF EXISTS "radar_voice_require_admin" ON storage.objects;
    CREATE POLICY "radar_voice_require_admin" ON storage.objects
      AS RESTRICTIVE FOR ALL TO authenticated
      USING (
        bucket_id <> 'radar-voice'
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        bucket_id <> 'radar-voice'
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    DROP POLICY IF EXISTS "Admins can read radar-voice objects" ON storage.objects;
    CREATE POLICY "Admins can read radar-voice objects" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'radar-voice'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    DROP POLICY IF EXISTS "Admins can upload radar-voice objects" ON storage.objects;
    CREATE POLICY "Admins can upload radar-voice objects" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'radar-voice'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    DROP POLICY IF EXISTS "Admins can update radar-voice objects" ON storage.objects;
    CREATE POLICY "Admins can update radar-voice objects" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'radar-voice'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        bucket_id = 'radar-voice'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );

    DROP POLICY IF EXISTS "Admins can delete radar-voice objects" ON storage.objects;
    CREATE POLICY "Admins can delete radar-voice objects" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'radar-voice'
        AND EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
END;
$$;
