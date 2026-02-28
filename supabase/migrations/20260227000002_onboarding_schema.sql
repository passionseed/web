-- 1. Extend profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_name     text null,
  ADD COLUMN IF NOT EXISTS is_onboarded   boolean not null default false,
  ADD COLUMN IF NOT EXISTS onboarded_at   timestamptz null,
  ADD COLUMN IF NOT EXISTS mobile_settings jsonb null;

-- mobile_settings JSON shape:
-- { "push_enabled": true, "reminder_time": "09:00", "theme": "light" }

-- 2. user_interests table
CREATE TABLE IF NOT EXISTS public.user_interests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_name  text not null,
  statements     text[] not null,
  selected       text[] not null default '{}',
  created_at     timestamptz not null default now()
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own interests"
  ON public.user_interests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. career_goals table
CREATE TABLE IF NOT EXISTS public.career_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  career_name  text not null,
  source       text not null check (source in ('ai_suggested', 'user_typed')),
  created_at   timestamptz not null default now()
);

ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own career goals"
  ON public.career_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. onboarding_state table (resumability)
CREATE TABLE IF NOT EXISTS public.onboarding_state (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  current_step   text not null default 'profile'
                   check (current_step in ('profile','chat','interests','careers','settings')),
  chat_history   jsonb not null default '[]',
  collected_data jsonb not null default '{}',
  updated_at     timestamptz not null default now()
);

ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own onboarding state"
  ON public.onboarding_state FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
