-- Add questions to workshops table
alter table public.workshops
add column if not exists question_1 text,
add column if not exists question_2 text,
add column if not exists question_3 text,
add column if not exists question_4 text,
add column if not exists question_5 text;

-- Update user_workshops table with status and answers
alter table public.user_workshops
add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
add column if not exists answer_1 text,
add column if not exists answer_2 text,
add column if not exists answer_3 text,
add column if not exists answer_4 text,
add column if not exists answer_5 text;

-- Add RLS policies for user_workshops
drop policy if exists "Users can view their own workshop registrations" on public.user_workshops;
create policy "Users can view their own workshop registrations"
on public.user_workshops
for select
using (auth.uid() = user_id);

-- Allow users to insert their own registrations
drop policy if exists "Users can register for workshops" on public.user_workshops;
create policy "Users can register for workshops"
on public.user_workshops
for insert
with check (auth.uid() = user_id);

-- Allow users to update their own registration answers
drop policy if exists "Users can update their own registration" on public.user_workshops;
create policy "Users can update their own registration"
on public.user_workshops
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Allow admins to update status
create policy "Admins can update registration status"
on public.user_workshops
for update
using (exists (
  select 1 from auth.users
  where id = auth.uid() and (raw_user_meta_data->>'role')::text = 'admin'
));

-- Create indexes for better performance
create index if not exists idx_user_workshops_user_id on public.user_workshops(user_id);
create index if not exists idx_user_workshops_workshop_id on public.user_workshops(workshop_id);
create index if not exists idx_user_workshops_status on public.user_workshops(status);
