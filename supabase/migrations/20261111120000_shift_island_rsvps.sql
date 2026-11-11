CREATE TABLE IF NOT EXISTS public.shift_island_rsvps (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  season text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shift_island_rsvps ENABLE ROW LEVEL SECURITY;
-- No client policies: admin-only like the other alumni tables (minors).
