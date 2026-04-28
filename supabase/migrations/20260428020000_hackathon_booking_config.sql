-- Single-row config table for hackathon booking settings.
-- Quota is the max number of mentor bookings a team can make.
create table if not exists hackathon_booking_config (
  id int primary key default 1 check (id = 1),
  max_bookings_per_team int not null default 1 check (max_bookings_per_team >= 1),
  updated_at timestamptz not null default now()
);

-- Seed the default row so it always exists
insert into hackathon_booking_config (id, max_bookings_per_team)
values (1, 1)
on conflict (id) do nothing;

-- Only service role can update; everyone can read
alter table hackathon_booking_config enable row level security;

create policy "Anyone can read booking config"
  on hackathon_booking_config for select
  using (true);
