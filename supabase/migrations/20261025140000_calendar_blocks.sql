-- Community calendar: time blocks (meetups, work sessions, deadlines) that
-- anyone signed in can add and join, shown at /calendar and in the calendar
-- window on whiteboards. Everyone signed in sees every block and who joined,
-- so it is a group space, never a private 1:1 channel. Admin-only under RLS;
-- the app reads and writes through the service role after its own checks.
-- Additive and idempotent.

CREATE TABLE IF NOT EXISTS public.calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  kind TEXT NOT NULL DEFAULT 'meetup' CHECK (kind IN ('meetup', 'work', 'deadline', 'other')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  place TEXT NULL CHECK (place IS NULL OR char_length(place) <= 200),
  note TEXT NULL CHECK (note IS NULL OR char_length(note) <= 1000),
  -- The board the block was made on; its share link is shown on the block.
  whiteboard_id UUID NULL REFERENCES public.whiteboards(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at AND ends_at <= starts_at + INTERVAL '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_starts ON public.calendar_blocks (starts_at);

-- Who said they are in.
CREATE TABLE IF NOT EXISTS public.calendar_block_people (
  block_id UUID NOT NULL REFERENCES public.calendar_blocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (block_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_calendar_block_people_user ON public.calendar_block_people (user_id);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['calendar_blocks', 'calendar_block_people'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins manage %s" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %s" ON public.%I FOR ALL TO authenticated
         USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))
         WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = ''admin''))',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;
