create extension if not exists moddatetime schema extensions;

create table if not exists direction_finder_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  answers jsonb not null,
  result jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table direction_finder_results enable row level security;

create policy "Users can view their own results"
  on direction_finder_results for select
  using (auth.uid() = user_id);

create policy "Users can insert their own results"
  on direction_finder_results for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own results"
  on direction_finder_results for update
  using (auth.uid() = user_id);

-- Trigger for updated_at
create trigger handle_updated_at before update on direction_finder_results
  for each row execute procedure extensions.moddatetime (updated_at);
