-- SHIFT alumni board: goal cards, teams, standups, help on stuck, a progress
-- feed and real-user tests, for confirmed alumni (shift_alumni_members) and
-- admins as mentors. Ported from the alumni-board Worker.
-- Students are minors: every table is admin-only under RLS and the app reads
-- and writes through the service role after its own checks. Work happens in
-- team or community spaces, never 1:1. Additive and idempotent: safe to apply
-- straight to production.

-- Teams, and which team each alumni account is in.
CREATE TABLE IF NOT EXISTS public.shift_alumni_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_alumni_members
  ADD COLUMN IF NOT EXISTS team_id UUID NULL REFERENCES public.shift_alumni_teams(id) ON DELETE SET NULL;
ALTER TABLE public.shift_alumni_members
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_shift_alumni_members_team ON public.shift_alumni_members (team_id);

-- A round runs from one alumni session to the next; an admin starts a new one at each session.
CREATE TABLE IF NOT EXISTS public.shift_alumni_rounds (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.shift_alumni_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL REFERENCES public.shift_alumni_rounds(id) ON DELETE CASCADE,
  long_term TEXT NOT NULL DEFAULT '',
  month_goal TEXT NOT NULL DEFAULT '',
  week_goal TEXT NOT NULL DEFAULT '',
  done_when TEXT NOT NULL DEFAULT '',
  first_step TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'not_done')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, round_id)
);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_goals_round ON public.shift_alumni_goals (round_id);

-- Team work meetings (about three a week) and one standup per member per meeting.
CREATE TABLE IF NOT EXISTS public.shift_alumni_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.shift_alumni_teams(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  held BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_meetings_team ON public.shift_alumni_meetings (team_id, starts_at);

CREATE TABLE IF NOT EXISTS public.shift_alumni_standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES public.shift_alumni_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  done TEXT NOT NULL DEFAULT '',
  next TEXT NOT NULL DEFAULT '',
  stuck TEXT NOT NULL DEFAULT '',
  unstuck_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_standups_updated ON public.shift_alumni_standups (updated_at);

-- Help on stuck: teammates and mentors reply under a stuck standup, in the team space.
CREATE TABLE IF NOT EXISTS public.shift_alumni_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  standup_id UUID NOT NULL REFERENCES public.shift_alumni_standups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_replies_standup ON public.shift_alumni_replies (standup_id, created_at);

-- "Start 10 minutes" on the first step.
CREATE TABLE IF NOT EXISTS public.shift_alumni_starts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL REFERENCES public.shift_alumni_rounds(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_starts_user ON public.shift_alumni_starts (user_id, started_at DESC);

-- Progress feed for the whole alumni community, with a fixed set of reactions.
CREATE TABLE IF NOT EXISTS public.shift_alumni_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  link TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_posts_created ON public.shift_alumni_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_posts_user ON public.shift_alumni_posts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shift_alumni_reactions (
  post_id UUID NOT NULL REFERENCES public.shift_alumni_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥', '👏', '💡')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id, emoji)
);

-- Real-user tests. "who" is a role like "ครูประถม", never a person's name.
CREATE TABLE IF NOT EXISTS public.shift_alumni_user_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id BIGINT NOT NULL REFERENCES public.shift_alumni_rounds(id) ON DELETE CASCADE,
  who TEXT NOT NULL CHECK (char_length(who) BETWEEN 1 AND 80),
  learned TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shift_alumni_user_tests_user ON public.shift_alumni_user_tests (user_id, created_at DESC);

-- RLS: admins only. Students go through the app's server, which checks team
-- membership and ownership before using the service role.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'shift_alumni_teams', 'shift_alumni_rounds', 'shift_alumni_goals', 'shift_alumni_meetings',
    'shift_alumni_standups', 'shift_alumni_replies', 'shift_alumni_starts', 'shift_alumni_posts',
    'shift_alumni_reactions', 'shift_alumni_user_tests'
  ] LOOP
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
