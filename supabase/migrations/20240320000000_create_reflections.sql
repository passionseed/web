create table if not exists reflections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table reflections enable row level security;

create policy "Users can view their own reflections"
  on reflections for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reflections"
  on reflections for insert
  with check (auth.uid() = user_id);

-- Create index for faster queries
create index reflections_user_id_created_at_idx on reflections(user_id, created_at); 