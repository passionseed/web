-- SHIFT rounds (beta), part 1: schema, helpers, storage, policies, seeds.
-- Contract: ps_app/docs/plans/2026-10-13-shift-build-spec.md sections 2.1-2.5, 2.7, extended by
-- ps_app/docs/plans/2026-10-14-shift-scale-spec.md section 2 (missions config, session schedule,
-- attendance, ideas/daily logs, student plan from shift_curriculum).
-- Additive only. Nothing here touches hackathon_*, user_roles (read-only bootstrap),
-- or the legacy shift_camp_* / companion objects (see 20261014090400).
-- Clients never write these tables: every write goes through a SECURITY DEFINER RPC.

create schema if not exists shift_round_private;
revoke all on schema shift_round_private from public, anon, authenticated;
grant usage on schema shift_round_private to authenticated;   -- policy helpers only
-- shift_round_private is never added to PostgREST exposed schemas.

-- ---------------------------------------------------------------------------
-- Round config validators (v2 2.1). Defined before shift_rounds because its column
-- default and CHECK constraints call them.
-- ---------------------------------------------------------------------------

-- SHIFT default missions: refund steps 1 to 7. Steps 8 (daily progress) and 9 (sessions) are
-- computed habits, not missions.
create or replace function shift_round_private.default_missions() returns jsonb
language sql immutable set search_path = '' as $$
  select '[
    {"key":"ideas","parts":[{"type":"ideas","need":1}]},
    {"key":"interviews","parts":[{"type":"interview","need":3,"distinct":true}]},
    {"key":"problem","parts":[{"type":"problem_statement","need":1}]},
    {"key":"prototype","parts":[{"type":"mvp","need":1}]},
    {"key":"testers","parts":[{"type":"tester","need":3,"distinct":true}]},
    {"key":"change","parts":[{"type":"change","need":1}]},
    {"key":"demo","parts":[{"type":"demo_post","need":1}]}
  ]'::jsonb
$$;

-- 1 to 10 missions {key, parts, title_th?, title_en?}; key ^[a-z_]{2,32}$ and unique; parts are
-- 1 to 3 {type, need, distinct?}; type is an evidence type other than contact/daily and appears
-- in at most one mission (the app maps type -> mission); need 1..20; distinct only for
-- interview/tester; titles null or 1..80 chars. Unknown keys are rejected.
create or replace function shift_round_private.valid_missions(m jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  v_mission jsonb;
  v_part jsonb;
  v_keys text[] := '{}';
  v_types text[] := '{}';
  v_title text;
  v_need numeric;
begin
  if m is null or jsonb_typeof(m) <> 'array' or jsonb_array_length(m) not between 1 and 10 then
    return false;
  end if;
  for v_mission in select * from jsonb_array_elements(m) loop
    if jsonb_typeof(v_mission) <> 'object'
       or exists (select 1 from jsonb_object_keys(v_mission) k where k not in ('key','parts','title_th','title_en')) then
      return false;
    end if;
    if jsonb_typeof(v_mission->'key') is distinct from 'string'
       or (v_mission->>'key') !~ '^[a-z_]{2,32}$' or (v_mission->>'key') = any (v_keys) then
      return false;
    end if;
    v_keys := v_keys || (v_mission->>'key');
    foreach v_title in array array['title_th','title_en'] loop
      if jsonb_typeof(v_mission->v_title) is not null and jsonb_typeof(v_mission->v_title) <> 'null'
         and (jsonb_typeof(v_mission->v_title) <> 'string' or char_length(v_mission->>v_title) not between 1 and 80) then
        return false;
      end if;
    end loop;
    if jsonb_typeof(v_mission->'parts') is distinct from 'array'
       or jsonb_array_length(v_mission->'parts') not between 1 and 3 then
      return false;
    end if;
    for v_part in select * from jsonb_array_elements(v_mission->'parts') loop
      if jsonb_typeof(v_part) <> 'object'
         or exists (select 1 from jsonb_object_keys(v_part) k where k not in ('type','need','distinct')) then
        return false;
      end if;
      if jsonb_typeof(v_part->'type') is distinct from 'string'
         or (v_part->>'type') not in ('ideas','interview','problem_statement','mvp','tester','change','demo_post')
         or (v_part->>'type') = any (v_types) then
        return false;
      end if;
      v_types := v_types || (v_part->>'type');
      -- A plain integer literal only: jsonb keeps "3.0" as text '3.0', which ::int can't read later.
      if jsonb_typeof(v_part->'need') is distinct from 'number'
         or (v_part->>'need') !~ '^[0-9]{1,2}$' then
        return false;
      end if;
      v_need := (v_part->>'need')::int;
      if v_need not between 1 and 20 then return false; end if;
      if v_part ? 'distinct' and (jsonb_typeof(v_part->'distinct') <> 'boolean'
                                 or (v_part->>'type') not in ('interview','tester')) then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end $$;

-- Session days: distinct days 1..duration_days (an empty list = no live sessions).
create or replace function shift_round_private.valid_session_days(p_days int[], p_duration int) returns boolean
language sql immutable set search_path = '' as $$
  select p_days is not null
     and coalesce(array_ndims(p_days), 1) = 1
     and cardinality(p_days) <= 28
     and array_position(p_days, null) is null
     and coalesce((select bool_and(d between 1 and p_duration) and count(distinct d) = count(*)
                     from unnest(p_days) d), true)
$$;

-- ---------------------------------------------------------------------------
-- 2.2 Tables
-- ---------------------------------------------------------------------------

create table public.app_config (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.profiles
  add column if not exists shift_round_nudges boolean not null default true;

-- SHIFT language is Thai unless the student picks English inside SHIFT (decision 2026-10-13).
-- Separate from preferred_language, which defaults to 'en' for every existing profile.
alter table public.profiles
  add column if not exists shift_round_language text check (shift_round_language in ('th','en'));

create table public.shift_rounds (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number > 0),
  title_th text not null check (char_length(title_th) between 1 and 80),
  title_en text not null check (char_length(title_en) between 1 and 80),
  brief_th text not null check (char_length(brief_th) between 1 and 400),
  brief_en text not null check (char_length(brief_en) between 1 and 400),
  tracks_open text[] not null default '{high_school}'
    check (cardinality(tracks_open) > 0 and tracks_open <@ array['high_school','university']),
  starts_at timestamptz not null,
  duration_days int not null default 7 check (duration_days between 5 and 28),
  closes_at timestamptz not null,
  review_window_hours int not null default 48 check (review_window_hours between 0 and 336),
  review_ends_at timestamptz not null,
  join_cutoff_day int not null default 2,
  nudge_local_time time not null default '21:15',     -- after the 19:00-21:00 session
  rate_limit_per_hour int not null default 30 check (rate_limit_per_hour between 1 and 120),
  grace_minutes int not null default 30 check (grace_minutes between 0 and 120),
  squad_size int not null default 3 check (squad_size between 2 and 6),
  retention_months int not null default 12 check (retention_months between 1 and 36),
  audio_retention_days int not null default 30 check (audio_retention_days between 1 and 400),
  join_mode text not null default 'invite' check (join_mode in ('open','invite')),
  mentor_led boolean not null default true,
  discord_url text check (discord_url ~ '^https://(discord\.gg|discord\.com)/'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  extended_days int not null default 0 check (extended_days >= 0),
  -- v2 2.1: per-round missions config (default = SHIFT steps 1-7) and the live session schedule
  -- (Asia/Bangkok wall clock). curriculum_key is a soft reference to shift_curriculum.round;
  -- application_cohort admits accepted shift_applications of that cohort to an invite round.
  missions jsonb not null default shift_round_private.default_missions(),
  session_days int[] not null default '{1,2,4,6,7}',
  session_start time not null default '19:00',
  session_end time not null default '21:00',
  curriculum_key text check (curriculum_key is null or char_length(curriculum_key) between 1 and 64),
  application_cohort text check (application_cohort is null or char_length(application_cohort) between 1 and 40),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_rounds_close_after_start check (closes_at > starts_at),
  constraint shift_rounds_cutoff_in_range check (join_cutoff_day between 1 and duration_days),
  constraint shift_rounds_missions_valid check (shift_round_private.valid_missions(missions)),
  constraint shift_rounds_session_days_valid check (shift_round_private.valid_session_days(session_days, duration_days)),
  constraint shift_rounds_session_window check (session_end > session_start)
);
create index shift_rounds_status_starts_idx on public.shift_rounds (status, starts_at);

create table public.shift_round_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  round_id uuid references public.shift_rounds(id) on delete cascade,
  role text not null check (role in ('staff','mentor')),
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint shift_round_roles_mentor_scoped check (role = 'staff' or round_id is not null),
  constraint shift_round_roles_unique unique nulls not distinct (user_id, round_id, role)
);
create index shift_round_roles_round_idx on public.shift_round_roles (round_id);

create table public.shift_round_allowlist (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shift_rounds(id) on delete cascade,
  email text check (email = lower(email)),
  user_id uuid references auth.users(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual','applications')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (email is not null or user_id is not null)
);
create unique index shift_round_allowlist_email_uidx on public.shift_round_allowlist (round_id, email) where email is not null;
create unique index shift_round_allowlist_user_uidx on public.shift_round_allowlist (round_id, user_id) where user_id is not null;

create table public.shift_round_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shift_rounds(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  track text not null check (track in ('high_school','university')),
  handle text not null check (char_length(handle) between 2 and 24),
  birth_month smallint check (birth_month between 1 and 12),
  birth_year smallint check (birth_year between 1950 and 2020),
  guardian_required boolean not null,
  guardian_consent_at timestamptz,
  joined_at timestamptz not null,
  joined_day int not null,
  beta_group text check (beta_group in ('alumni','new')),
  legal_name text check (legal_name is null or char_length(legal_name) between 2 and 80),
  name_display text not null default 'handle' check (name_display in ('handle','legal')),
  summary_public boolean not null default false,
  outcome text not null default 'in_progress' check (outcome in ('in_progress','certified','not_eligible')),
  finalized_at timestamptz,
  retention_purged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint shift_round_entries_round_user_key unique (round_id, user_id),
  constraint shift_round_entries_guardian check (not guardian_required or guardian_consent_at is not null or retention_purged_at is not null)
);
create index shift_round_entries_user_idx on public.shift_round_entries (user_id);

create table public.shift_round_icebreaker_questions (
  id smallint primary key check (id between 1 and 50),
  text_th text not null,
  text_en text not null,
  active boolean not null default true
);

create table public.shift_round_squads (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.shift_rounds(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  mentor_user_id uuid references auth.users(id) on delete set null,
  discord_url text check (discord_url ~ '^https://(discord\.gg|discord\.com)/'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint shift_round_squads_round_name_key unique (round_id, name)
);

create table public.shift_round_squad_members (
  squad_id uuid not null references public.shift_round_squads(id) on delete cascade,
  entry_id uuid not null unique references public.shift_round_entries(id) on delete cascade,
  round_id uuid not null,
  icebreaker_question smallint not null references public.shift_round_icebreaker_questions(id),
  icebreaker_answer text check (icebreaker_answer is null or char_length(icebreaker_answer) between 1 and 140),
  answered_at timestamptz,
  added_at timestamptz not null default now(),
  primary key (squad_id, entry_id)
);

create table public.shift_round_evidence (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  round_id uuid not null,
  user_id uuid not null,
  submission_id uuid not null,
  -- v2 2.2: ideas (step 1) and daily (step 8, the Daily Show) join the original seven types.
  type text not null check (type in ('contact','ideas','interview','problem_statement','mvp','tester','change','demo_post','daily')),
  payload jsonb not null,
  payload_version smallint not null default 1,
  payload_hash text not null,
  who_key text,
  source_evidence_id uuid references public.shift_round_evidence(id),
  replaces_evidence_id uuid references public.shift_round_evidence(id) on delete set null,
  client_created_at timestamptz not null,
  submitted_at timestamptz not null,
  local_date date not null,
  status text not null default 'submitted' check (status in ('submitted','rejected','accepted','withdrawn')),
  status_reason_code text check (status_reason_code in
    ('not_real_person','duplicate','missing_detail','wrong_mission','privacy','link_broken','other')),
  status_note text check (status_note is null or char_length(status_note) <= 500),
  status_changed_at timestamptz,
  status_changed_by uuid,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  constraint shift_round_evidence_submission_key unique (entry_id, submission_id),
  constraint shift_round_evidence_change_source check ((type = 'change') = (source_evidence_id is not null)),
  constraint shift_round_evidence_who_key check ((type in ('contact','interview','tester')) = (who_key is not null))
);
create index shift_round_evidence_entry_type_status_idx on public.shift_round_evidence (entry_id, type, status);
create index shift_round_evidence_review_idx on public.shift_round_evidence (round_id, status, submitted_at);
create index shift_round_evidence_source_idx on public.shift_round_evidence (source_evidence_id);
create index shift_round_evidence_replaces_idx on public.shift_round_evidence (replaces_evidence_id);

create table public.shift_round_evidence_media (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.shift_round_evidence(id) on delete cascade,
  entry_id uuid not null,
  round_id uuid not null,
  user_id uuid not null,
  kind text not null check (kind in ('photo','audio')),
  path text not null unique check (path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/(photo\.jpg|audio\.m4a)$'),
  bytes int not null check (bytes > 0),
  duration_ms int check (duration_ms is null or duration_ms <= 180000),
  consent_confirmed boolean not null check (consent_confirmed),
  exif_checked_at timestamptz,
  exif_found boolean,
  purged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint shift_round_evidence_media_kind_key unique (evidence_id, kind)
);
create index shift_round_evidence_media_entry_idx on public.shift_round_evidence_media (entry_id);
create index shift_round_evidence_media_scan_idx on public.shift_round_evidence_media (created_at) where exif_checked_at is null;

create table public.shift_round_cheers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null,
  squad_id uuid not null references public.shift_round_squads(id) on delete cascade,
  from_entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  to_entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  evidence_id uuid references public.shift_round_evidence(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_entry_id <> to_entry_id)
);
create unique index shift_round_cheers_from_evidence_uidx on public.shift_round_cheers (from_entry_id, evidence_id) where evidence_id is not null;
create index shift_round_cheers_from_created_idx on public.shift_round_cheers (from_entry_id, created_at);
create index shift_round_cheers_to_idx on public.shift_round_cheers (to_entry_id);
create index shift_round_cheers_evidence_idx on public.shift_round_cheers (evidence_id);

create table public.shift_round_checkins (
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  checkpoint text not null check (checkpoint in ('join','midpoint','close')),
  answers jsonb not null,
  submitted_at timestamptz not null,
  primary key (entry_id, checkpoint)
);

-- v2 2.4: live session attendance, marked by staff/mentors (step 9). No client access: students
-- see their counts through shift_round_home, staff through the admin RPCs.
create table public.shift_round_attendance (
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  round_id uuid not null references public.shift_rounds(id) on delete cascade,
  day int not null check (day between 1 and 28),
  status text not null check (status in ('present','makeup','absent')),
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz not null default now(),
  primary key (entry_id, day)
);
create index shift_round_attendance_round_day_idx on public.shift_round_attendance (round_id, day);

create table public.shift_round_summary_revisions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.shift_round_entries(id) on delete cascade,
  revision int not null,
  title text not null check (char_length(title) between 1 and 80),
  description text not null check (char_length(description) between 1 and 600),
  -- E9 rule ^https://[^[:space:]]{4,490}$ expressed without {4,490} (Postgres caps regex repeats at 255)
  demo_url text check (demo_url is null or (demo_url ~ '^https://[^[:space:]]+$' and char_length(demo_url) between 12 and 498)),
  public_counts jsonb not null default '{"people_talked_to":true,"testers":true,"missions":true}',
  status text not null default 'pending' check (status in ('pending','approved','rejected','superseded','taken_down')),
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text check (decision_reason is null or char_length(decision_reason) <= 300),
  created_at timestamptz not null default now(),
  constraint shift_round_summary_revisions_entry_revision_key unique (entry_id, revision)
);
create unique index shift_round_summary_one_pending_uidx on public.shift_round_summary_revisions (entry_id) where status = 'pending';
create unique index shift_round_summary_one_approved_uidx on public.shift_round_summary_revisions (entry_id) where status = 'approved';

create table public.shift_round_certificates (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^[0-9A-HJKMNP-TV-Z]{16}$'),
  round_id uuid not null references public.shift_rounds(id),
  entry_id uuid unique references public.shift_round_entries(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('issued','revoked')),
  snapshot jsonb,
  snapshot_version smallint not null default 1,
  review_ends_at timestamptz not null,
  issued_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text check (revoke_reason in ('staff','holder_deleted')),
  revoke_note text check (revoke_note is null or char_length(revoke_note) <= 300),
  tombstoned_at timestamptz,
  render_version int not null default 1,
  created_at timestamptz not null default now(),
  constraint shift_round_certificates_tombstone_snapshot check ((tombstoned_at is null) = (snapshot is not null)),
  constraint shift_round_certificates_tombstone_revoked check (tombstoned_at is null or status = 'revoked'),
  constraint shift_round_certificates_revoked_at check ((status = 'revoked') = (revoked_at is not null))
);
create index shift_round_certificates_round_idx on public.shift_round_certificates (round_id);
create index shift_round_certificates_user_idx on public.shift_round_certificates (user_id);

create table public.shift_round_events (
  id bigint generated always as identity primary key,
  round_id uuid, entry_id uuid, user_id uuid, actor_id uuid,
  name text not null check (name in (
    'round_published','round_joined','round_extended','waitlist_joined',
    'evidence_logged','evidence_withdrawn','evidence_rejected','evidence_accepted','evidence_reviewed',
    'mission_completed','checkin_submitted','squad_assigned','icebreaker_answered','cheer_sent',
    'summary_submitted','summary_approved','summary_rejected','summary_taken_down',
    'certificate_issued','certificate_not_eligible','certificate_revoked','certificate_reinstated',
    'certificate_name_changed','certificate_shared','certificate_visit',
    'transcription_requested','rate_limited','data_deleted','attendance_marked')),
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index shift_round_events_round_created_idx on public.shift_round_events (round_id, created_at);
create index shift_round_events_name_created_idx on public.shift_round_events (name, created_at);
create index shift_round_events_entry_idx on public.shift_round_events (entry_id);
create index shift_round_events_user_name_idx on public.shift_round_events (user_id, name, created_at);

create table public.shift_round_waitlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.shift_round_nudge_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  round_id uuid,
  -- 'session' (v2 2.7): reminder before a live session, dedupe_key '<entry_id>:<day>'.
  kind text not null check (kind in ('no_evidence','closing_tomorrow','evidence_rejected',
    'certificate_issued','summary_decided','squad_assigned','round_published','session')),
  dedupe_key text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped','abandoned')),
  attempts smallint not null default 0,
  expo_ticket_id text, expo_receipt_status text, last_error text,
  -- Lane A addition (see SHIFT_ROUNDS_LANE_A_NOTES.md): token the push was sent to, so a
  -- DeviceNotRegistered receipt clears profiles.expo_push_token only if it is unchanged.
  expo_token text,
  params jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint shift_round_nudge_ledger_dedupe_key unique (user_id, kind, dedupe_key)
);
create index shift_round_nudge_ledger_status_idx on public.shift_round_nudge_ledger (status, updated_at);

create table public.shift_round_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  round_id uuid,
  reason text not null check (reason in ('holder_request','account_deleted','retention','audio_retention','orphan')),
  storage_paths text[] not null default '{}',
  storage_prefixes text[] not null default '{}',
  status text not null default 'queued' check (status in ('queued','storage_done','failed')),
  attempts smallint not null default 0, last_error text,
  requested_at timestamptz not null default now(), completed_at timestamptz
);
create index shift_round_deletion_requests_status_idx on public.shift_round_deletion_requests (status, requested_at);

create table public.shift_round_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job in ('issue','purge','nudges','pushes','media_scan','watchdog')),
  started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null default 'running' check (status in ('running','ok','failed')),
  due_count int, processed_count int, error text, details jsonb not null default '{}'
);
create index shift_round_job_runs_job_started_idx on public.shift_round_job_runs (job, started_at desc);

-- Private rate-limit ledger for RPCs without a natural counter (not in the spec table list;
-- lives in the private schema, see SHIFT_ROUNDS_LANE_A_NOTES.md).
create table shift_round_private.rate_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  at timestamptz not null
);
create index rate_hits_user_action_at_idx on shift_round_private.rate_hits (user_id, action, at);
revoke all on shift_round_private.rate_hits from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2.1 Helpers. Internal helpers are SECURITY INVOKER with execute revoked from
-- everyone; they only ever run inside SECURITY DEFINER RPCs (as the owner).
-- Policy helpers are SECURITY DEFINER and only answer for the calling user.
-- ---------------------------------------------------------------------------

-- Test clock (X3). Honoured only on a connection opened as postgres (pgTAP, race tests,
-- operator sessions): session_user stays postgres across SET ROLE, while API traffic
-- (PostgREST connects as authenticator) can never move the clock even if the GUCs are
-- somehow set. current_user is not used: inside SECURITY DEFINER RPCs it is the owner.
create or replace function shift_round_private.round_now() returns timestamptz
language sql stable set search_path = '' as $$
  select case
    when session_user = 'postgres'
     and current_setting('shift_round.allow_clock_override', true) = 'on'
     and nullif(current_setting('shift_round.now', true), '') is not null
    then current_setting('shift_round.now', true)::timestamptz
    else now()
  end
$$;

create or replace function shift_round_private.local_date(ts timestamptz) returns date
language sql immutable set search_path = '' as $$
  select (ts at time zone 'Asia/Bangkok')::date
$$;

create or replace function shift_round_private.iso_ict(ts timestamptz) returns text
language sql immutable set search_path = '' as $$
  select case when ts is null then null
    else to_char(ts at time zone 'Asia/Bangkok', 'YYYY-MM-DD"T"HH24:MI:SS') || '+07:00' end
$$;

-- Days the round actually runs, including extensions.
create or replace function shift_round_private.effective_days(r public.shift_rounds) returns int
language sql immutable set search_path = '' as $$
  select r.duration_days + r.extended_days
$$;

create or replace function shift_round_private.day_of(r public.shift_rounds, ts timestamptz) returns int
language sql stable set search_path = '' as $$
  select shift_round_private.local_date(ts) - shift_round_private.local_date(r.starts_at) + 1
$$;

create or replace function shift_round_private.round_day(round_id uuid, ts timestamptz) returns int
language sql stable set search_path = '' as $$
  select shift_round_private.day_of(r, ts) from public.shift_rounds r where r.id = round_id
$$;

create or replace function shift_round_private.phase_of(r public.shift_rounds) returns text
language sql stable set search_path = '' as $$
  select case
    when shift_round_private.round_now() < r.starts_at then 'upcoming'
    when shift_round_private.round_now() < r.closes_at then 'active'
    when shift_round_private.round_now() < r.review_ends_at then 'review'
    else 'finished' end
$$;

create or replace function shift_round_private.round_phase(round_id uuid) returns text
language sql stable set search_path = '' as $$
  select shift_round_private.phase_of(r) from public.shift_rounds r where r.id = round_id
$$;

-- Unguarded role lookup for internal use (e.g. "may this other user mentor this round").
create or replace function shift_round_private.has_round_role(p_round_id uuid, p_uid uuid, p_roles text[]) returns boolean
language sql stable set search_path = '' as $$
  -- Decision 2026-10-13 (user): every web admin (user_roles.role = 'admin') has full SHIFT
  -- staff access on all rounds, without a separate shift_round_roles grant.
  select p_uid is not null and (
    exists (
      select 1 from public.shift_round_roles x
      where x.user_id = p_uid
        and x.role = any (p_roles)
        and (x.round_id = p_round_id or (x.round_id is null and x.role = 'staff')))
    or ('staff' = any (p_roles) or 'mentor' = any (p_roles)) and exists (
      select 1 from public.user_roles ur where ur.user_id = p_uid and ur.role = 'admin'))
$$;

-- Policy helpers: answer only for the calling user (no probing other users' roles).
create or replace function shift_round_private.is_global_staff(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid is not null and uid = auth.uid() and (
    exists (select 1 from public.shift_round_roles x where x.user_id = uid and x.role = 'staff' and x.round_id is null)
    or exists (select 1 from public.user_roles ur where ur.user_id = uid and ur.role = 'admin'))
$$;

create or replace function shift_round_private.is_staff(round_id uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid is not null and uid = auth.uid()
    and shift_round_private.has_round_role(round_id, uid, array['staff'])
$$;

create or replace function shift_round_private.can_review(round_id uuid, uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select uid is not null and uid = auth.uid()
    and shift_round_private.has_round_role(round_id, uid, array['staff','mentor'])
$$;

create or replace function shift_round_private.flag(key text) returns jsonb
language sql stable set search_path = '' as $$
  select c.value from public.app_config c where c.key = flag.key
$$;

create or replace function shift_round_private.flag_on(key text, fallback boolean default false) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(
    (select case when jsonb_typeof(c.value) = 'boolean' then (c.value)::text::boolean end
       from public.app_config c where c.key = flag_on.key),
    fallback)
$$;

create or replace function shift_round_private.web_base_url() returns text
language sql stable set search_path = '' as $$
  select rtrim(coalesce(
    (select c.value #>> '{}' from public.app_config c
      where c.key = 'shift_round.web_base_url' and jsonb_typeof(c.value) = 'string'),
    'https://www.passionseed.org'), '/')
$$;

create or replace function shift_round_private.verify_url(public_id text) returns text
language sql stable set search_path = '' as $$
  select shift_round_private.web_base_url() || '/c/' || public_id
$$;

create or replace function shift_round_private.ok(data jsonb default '{}'::jsonb) returns jsonb
language sql volatile set search_path = '' as $$
  select jsonb_build_object('ok', true, 'data', coalesce(data, '{}'::jsonb), 'request_id', gen_random_uuid())
$$;

create or replace function shift_round_private.err(
  code text, category text, field text default null, retry_after int default null, details jsonb default '{}'::jsonb
) returns jsonb
language sql volatile set search_path = '' as $$
  select jsonb_build_object(
    'ok', false,
    'error', jsonb_build_object('code', code, 'category', category, 'field', field,
                                'retry_after', retry_after, 'details', coalesce(details, '{}'::jsonb)),
    'request_id', gen_random_uuid())
$$;

-- Category from the 3.8 catalogue.
create or replace function shift_round_private.category_of(code text) returns text
language sql immutable set search_path = '' as $$
  select case
    when code = 'unauthenticated' then 'unauthenticated'
    when code in ('forbidden','invite_only','media_not_owned','not_same_squad') then 'forbidden'
    when code in ('unavailable','enrollment_paused','submissions_paused','transcription_paused') then 'unavailable'
    when code in ('retryable','rate_limited','cheer_limit','transcription_failed') then 'retryable'
    else 'validation' end
$$;

create or replace function shift_round_private.fail(
  code text, field text default null, retry_after int default null, details jsonb default '{}'::jsonb
) returns jsonb
language sql volatile set search_path = '' as $$
  select shift_round_private.err(code, shift_round_private.category_of(code), field, retry_after, details)
$$;

create or replace function shift_round_private.who_key(label text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))
$$;

-- E9: ^https://[^[:space:]]{4,490}$ (written with a length check because Postgres regex
-- repetition bounds are capped at 255).
create or replace function shift_round_private.is_https_url(t text) returns boolean
language sql immutable set search_path = '' as $$
  select t is not null and t ~ '^https://[^[:space:]]+$' and char_length(t) between 12 and 498
$$;

-- A10/A8: phone numbers, emails, @handles and social profile links are personal data.
create or replace function shift_round_private.has_personal_data(t text) returns boolean
language sql immutable set search_path = '' as $$
  select t is not null and (
    char_length(regexp_replace(t, '[^0-9]', '', 'g')) >= 9
    or t ~* '[^[:space:]@]+@[^[:space:]@]+\.[a-z]{2,}'
    or t ~ '@[A-Za-z0-9_.]'
    or t ~* '(line\.me|facebook\.com|instagram\.com|fb\.com|tiktok\.com)')
$$;

-- Handles additionally reject anything URL-like.
create or replace function shift_round_private.handle_problem(h text) returns text
language sql immutable set search_path = '' as $$
  select case
    when h is null or char_length(h) not between 2 and 24 then 'length'
    when shift_round_private.has_personal_data(h) then 'personal_data'
    when h ~* '(https?:|www\.|\.(com|net|org|co|me|io|th|ly|gg)(/|$|\s))' then 'url'
    else null end
$$;

-- Mission key of an evidence type in a round's missions config (null: contact, daily, or a type
-- the round does not use). valid_missions guarantees a type is in at most one mission.
create or replace function shift_round_private.mission_of(p_missions jsonb, p_type text) returns text
language sql immutable set search_path = '' as $$
  select m->>'key'
    from jsonb_array_elements(coalesce(p_missions, '[]'::jsonb)) m
   where exists (select 1 from jsonb_array_elements(m->'parts') p where p->>'type' = p_type)
   limit 1
$$;

-- 1-based position of a mission key in a round's config (null when absent).
create or replace function shift_round_private.mission_n(p_missions jsonb, p_key text) returns int
language sql immutable set search_path = '' as $$
  select t.n::int
    from jsonb_array_elements(coalesce(p_missions, '[]'::jsonb)) with ordinality as t(m, n)
   where t.m->>'key' = p_key
   limit 1
$$;

-- E17 time window part of the counting predicate.
create or replace function shift_round_private.in_count_window(e public.shift_round_evidence, r public.shift_rounds) returns boolean
language sql stable set search_path = '' as $$
  select e.submitted_at < r.closes_at
      or (e.client_created_at < r.closes_at
          and e.submitted_at < r.closes_at + make_interval(mins => r.grace_minutes))
$$;

-- 2.4 counting predicate. p_exclude simulates a withdrawal/rejection (dry runs, cascades).
create or replace function shift_round_private.evidence_counts(
  e public.shift_round_evidence, r public.shift_rounds, p_exclude uuid default null
) returns boolean
language plpgsql stable set search_path = '' as $$
declare s public.shift_round_evidence;
begin
  if e.id is null or e.id = p_exclude then return false; end if;
  if e.status not in ('submitted','accepted') then return false; end if;
  if not shift_round_private.in_count_window(e, r) then return false; end if;
  if e.type = 'change' then
    select x.* into s from public.shift_round_evidence x
     where x.id = e.source_evidence_id and x.entry_id = e.entry_id and x.type in ('interview','tester');
    if not found then return false; end if;
    return shift_round_private.evidence_counts(s, r, p_exclude);
  end if;
  return true;
end $$;

-- E2 derived missions (no cache table), v2 2.3: driven by the round's missions config.
-- {"missions":[{"key","n","complete","title_th","title_en","parts":[{"type","have","need"}]}],
--  "missions_complete","missions_total","people_talked_to","eligible",
--  "daily":{"days","need","today_logged"},"sessions":{"attended","held","total"}}
-- n = 1-based position in the config; distinct parts count distinct who_key, others count rows.
-- daily: distinct round days (ICT date of submitted_at -> day 1..effective days; a grace item
-- sent just after close lands on the last day) with at least one counted log of any type.
-- sessions: held = session days whose session_end (ICT) has passed; attended = present/makeup
-- attendance rows on session days. p_exclude simulates a withdrawal/rejection (dry runs, cascades).
create or replace function shift_round_private.mission_counts(entry_id uuid, p_exclude uuid default null) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  r public.shift_rounds;
  v_now timestamptz := shift_round_private.round_now();
  v_start date;
  v_last int;
  v_missions jsonb;
  v_done int;
  v_total int;
  v_people int;
  v_days int;
  v_today boolean;
  v_held int;
  v_attended int;
begin
  select ro.* into r from public.shift_round_entries en join public.shift_rounds ro on ro.id = en.round_id
   where en.id = mission_counts.entry_id;
  if not found then return null; end if;
  v_start := shift_round_private.local_date(r.starts_at);
  v_last := shift_round_private.effective_days(r);

  with ev as materialized (
    select e.type, e.who_key, e.local_date
      from public.shift_round_evidence e
     where e.entry_id = mission_counts.entry_id
       and shift_round_private.evidence_counts(e, r, p_exclude)
  ), parts as (
    select mt.n, mt.m->>'key' as key, mt.m->'title_th' as title_th, mt.m->'title_en' as title_en,
           pt.pn, pt.p->>'type' as type, (pt.p->>'need')::int as need,
           coalesce((pt.p->>'distinct')::boolean, false) as is_distinct
      from jsonb_array_elements(r.missions) with ordinality as mt(m, n),
           jsonb_array_elements(mt.m->'parts') with ordinality as pt(p, pn)
  ), have as (
    select pa.*,
           case when pa.is_distinct
                then (select count(distinct c.who_key) from ev c where c.type = pa.type)
                else (select count(*) from ev c where c.type = pa.type) end::int as have
      from parts pa
  ), ms as (
    select h.n, h.key, h.title_th, h.title_en, bool_and(h.have >= h.need) as complete,
           jsonb_agg(jsonb_build_object('type', h.type, 'have', h.have, 'need', h.need) order by h.pn) as parts
      from have h
     group by h.n, h.key, h.title_th, h.title_en
  ), agg as (
    select coalesce(jsonb_agg(jsonb_build_object('key', ms.key, 'n', ms.n::int, 'complete', ms.complete,
                                                 'title_th', ms.title_th, 'title_en', ms.title_en,
                                                 'parts', ms.parts) order by ms.n), '[]'::jsonb) as missions,
           count(*) filter (where ms.complete)::int as done,
           count(*)::int as total
      from ms
  )
  select agg.missions, agg.done, agg.total,
         (select count(distinct c.who_key)::int from ev c where c.type in ('contact','interview','tester')),
         (select count(distinct least(c.local_date - v_start + 1, v_last))::int from ev c
           where c.local_date - v_start + 1 >= 1),
         exists (select 1 from ev c where c.local_date = shift_round_private.local_date(v_now))
    into v_missions, v_done, v_total, v_people, v_days, v_today
    from agg;

  select count(*) into v_held
    from unnest(r.session_days) d
   where ((v_start + (d - 1)) + r.session_end) at time zone 'Asia/Bangkok' <= v_now;
  -- Only sessions that have ended count, the same set as v_held, so a mark made during a live
  -- session (or ahead of time) can't stand in for a missed earlier one.
  select count(*) into v_attended
    from public.shift_round_attendance a
   where a.entry_id = mission_counts.entry_id and a.status in ('present','makeup') and a.day = any (r.session_days)
     and ((v_start + (a.day - 1)) + r.session_end) at time zone 'Asia/Bangkok' <= v_now;

  return jsonb_build_object(
    'missions', v_missions,
    'missions_complete', v_done,
    'missions_total', v_total,
    'people_talked_to', v_people,
    'eligible', v_total > 0 and v_done = v_total,
    'daily', jsonb_build_object('days', v_days, 'need', v_last, 'today_logged', v_today),
    'sessions', jsonb_build_object('attended', v_attended, 'held', v_held,
                                   'total', cardinality(r.session_days)));
end $$;

-- Raw counted totals for the certificate snapshot (2.7): people, distinct interviewees/testers, changes.
create or replace function shift_round_private.snapshot_counts(entry_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
           'people_talked_to', count(distinct e.who_key) filter (where e.type in ('contact','interview','tester')),
           'interviews', count(distinct e.who_key) filter (where e.type = 'interview'),
           'testers', count(distinct e.who_key) filter (where e.type = 'tester'),
           'changes', count(*) filter (where e.type = 'change'))
    from public.shift_round_evidence e
    join public.shift_rounds r on r.id = e.round_id
   where e.entry_id = snapshot_counts.entry_id
     and shift_round_private.evidence_counts(e, r)
$$;

create or replace function shift_round_private.completed_keys(m jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(x->>'key' order by ord), '{}')
    from jsonb_array_elements(coalesce(m->'missions','[]'::jsonb)) with ordinality as t(x, ord)
   where (x->>'complete')::boolean
$$;

create or replace function shift_round_private.lock_entry(entry_id uuid) returns public.shift_round_entries
language sql volatile set search_path = '' as $$
  select e.* from public.shift_round_entries e where e.id = lock_entry.entry_id for update
$$;

create or replace function shift_round_private.emit(
  name text, round_id uuid, entry_id uuid, user_id uuid, actor_id uuid, props jsonb default '{}'::jsonb
) returns void
language sql volatile set search_path = '' as $$
  insert into public.shift_round_events (round_id, entry_id, user_id, actor_id, name, props, created_at)
  values (emit.round_id, emit.entry_id, emit.user_id, emit.actor_id, emit.name,
          coalesce(emit.props, '{}'::jsonb), shift_round_private.round_now())
$$;

-- Rate limiting for RPCs without a natural counter. Returns retry_after seconds or null.
create or replace function shift_round_private.rate_retry_after(
  p_uid uuid, p_action text, p_max int, p_window interval
) returns int
language sql stable set search_path = '' as $$
  select case when count(*) >= p_max
    then greatest(1, ceil(extract(epoch from (min(h.at) + p_window - shift_round_private.round_now())))::int)
    end
  from (
    select x.at from shift_round_private.rate_hits x
     where x.user_id = p_uid and x.action = p_action and x.at > shift_round_private.round_now() - p_window
     order by x.at desc limit p_max
  ) h
$$;

create or replace function shift_round_private.rate_hit(p_uid uuid, p_action text) returns void
language sql volatile set search_path = '' as $$
  insert into shift_round_private.rate_hits (user_id, action, at)
  values (p_uid, p_action, shift_round_private.round_now())
$$;

-- 2.5 storage helpers (SECURITY DEFINER; called from storage.objects policies).
create or replace function shift_round_private.media_path_ok(object_name text) returns boolean
language sql immutable set search_path = '' as $$
  select object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}/(photo\.jpg|audio\.m4a)$'
$$;

create or replace function shift_round_private.can_upload(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_round uuid;
  r public.shift_rounds;
begin
  if v_uid is null or not shift_round_private.media_path_ok(object_name) then return false; end if;
  v_round := split_part(object_name, '/', 1)::uuid;
  if split_part(object_name, '/', 2)::uuid <> v_uid then return false; end if;
  perform split_part(object_name, '/', 3)::uuid;
  if not shift_round_private.flag_on('shift_round.submissions_enabled', false) then return false; end if;
  select x.* into r from public.shift_rounds x where x.id = v_round;
  if not found or shift_round_private.phase_of(r) not in ('upcoming','active','review') then return false; end if;
  return exists (select 1 from public.shift_round_entries e where e.round_id = v_round and e.user_id = v_uid);
exception when invalid_text_representation then
  return false;
end $$;

create or replace function shift_round_private.can_read_media(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not shift_round_private.media_path_ok(object_name) then return false; end if;
  if split_part(object_name, '/', 2)::uuid = v_uid then return true; end if;
  return shift_round_private.can_review(split_part(object_name, '/', 1)::uuid, v_uid);
exception when invalid_text_representation then
  return false;
end $$;

-- Lane A addition: owner may delete only objects not yet bound to an evidence row (draft discard).
create or replace function shift_round_private.can_delete_media(object_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not shift_round_private.media_path_ok(object_name) then return false; end if;
  if split_part(object_name, '/', 2)::uuid <> v_uid then return false; end if;
  return not exists (select 1 from public.shift_round_evidence_media m where m.path = object_name);
exception when invalid_text_representation then
  return false;
end $$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function shift_round_private.rounds_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.review_ends_at := new.closes_at + make_interval(hours => new.review_window_hours);
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;
create trigger shift_rounds_before_write
  before insert or update on public.shift_rounds
  for each row execute function shift_round_private.rounds_before_write();

-- A24/E8: evidence content is immutable; only status/review columns may change.
create or replace function shift_round_private.evidence_before_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.entry_id is distinct from old.entry_id
     or new.round_id is distinct from old.round_id
     or new.user_id is distinct from old.user_id
     or new.submission_id is distinct from old.submission_id
     or new.type is distinct from old.type
     or new.payload is distinct from old.payload
     or new.payload_hash is distinct from old.payload_hash
     or new.who_key is distinct from old.who_key
     or new.source_evidence_id is distinct from old.source_evidence_id
     or new.client_created_at is distinct from old.client_created_at
     or new.submitted_at is distinct from old.submitted_at then
    raise exception 'shift_round_evidence content is immutable' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger shift_round_evidence_before_update
  before update on public.shift_round_evidence
  for each row execute function shift_round_private.evidence_before_update();

-- 2.7/E10: deleting an entry tombstones its certificate and anonymizes its events.
create or replace function shift_round_private.entries_before_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.shift_round_certificates c
     set status = 'revoked',
         revoke_reason = 'holder_deleted',
         revoked_at = shift_round_private.round_now(),
         snapshot = null,
         tombstoned_at = shift_round_private.round_now(),
         user_id = null,
         render_version = c.render_version + 1
   where c.entry_id = old.id and c.tombstoned_at is null;
  update public.shift_round_events ev set user_id = null where ev.entry_id = old.id;
  return old;
end $$;
create trigger shift_round_entries_before_delete
  before delete on public.shift_round_entries
  for each row execute function shift_round_private.entries_before_delete();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'app_config','shift_rounds','shift_round_roles','shift_round_allowlist','shift_round_entries',
    'shift_round_icebreaker_questions','shift_round_squads','shift_round_squad_members',
    'shift_round_evidence','shift_round_evidence_media','shift_round_cheers','shift_round_checkins',
    'shift_round_summary_revisions','shift_round_certificates','shift_round_events',
    'shift_round_waitlist','shift_round_nudge_ledger','shift_round_deletion_requests','shift_round_job_runs',
    'shift_round_attendance']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

grant select on public.app_config to anon, authenticated;
grant select on public.shift_rounds, public.shift_round_roles, public.shift_round_entries,
  public.shift_round_evidence, public.shift_round_evidence_media, public.shift_round_checkins,
  public.shift_round_summary_revisions, public.shift_round_certificates,
  public.shift_round_icebreaker_questions to authenticated;

create policy app_config_public_read on public.app_config
  for select to anon, authenticated using (is_public);

create policy shift_rounds_read on public.shift_rounds
  for select to authenticated
  using (status in ('published','archived') or shift_round_private.is_staff(id, auth.uid()));

create policy shift_round_roles_read on public.shift_round_roles
  for select to authenticated
  using (user_id = auth.uid() or shift_round_private.is_global_staff(auth.uid()));

-- Owner only: entries hold birth_month/birth_year/legal_name. Staff and mentors read
-- entrants through the admin RPCs (shift_round_admin_entries etc.), which pick columns.
create policy shift_round_entries_read on public.shift_round_entries
  for select to authenticated
  using (user_id = auth.uid());

create policy shift_round_icebreaker_read on public.shift_round_icebreaker_questions
  for select to authenticated using (true);

create policy shift_round_evidence_read on public.shift_round_evidence
  for select to authenticated
  using (user_id = auth.uid() or shift_round_private.can_review(round_id, auth.uid()));

create policy shift_round_evidence_media_read on public.shift_round_evidence_media
  for select to authenticated
  using (user_id = auth.uid() or shift_round_private.can_review(round_id, auth.uid()));

-- The entries table is owner-only under RLS, so policies on child tables resolve the
-- entry through this definer helper (answers only for the calling user).
create or replace function shift_round_private.can_read_entry(p_entry_id uuid, p_staff_only boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.shift_round_entries e
     where e.id = p_entry_id
       and (e.user_id = auth.uid()
            or (p_staff_only and shift_round_private.is_staff(e.round_id, auth.uid()))
            or (not p_staff_only and shift_round_private.can_review(e.round_id, auth.uid()))))
$$;

create policy shift_round_checkins_read on public.shift_round_checkins
  for select to authenticated
  using (shift_round_private.can_read_entry(entry_id, true));

create policy shift_round_summary_revisions_read on public.shift_round_summary_revisions
  for select to authenticated
  using (shift_round_private.can_read_entry(entry_id, false));

create policy shift_round_certificates_read on public.shift_round_certificates
  for select to authenticated
  using (user_id = auth.uid() or shift_round_private.is_staff(round_id, auth.uid()));

-- Function privileges: nothing in the private schema is callable by clients except the
-- policy helpers that RLS/storage policies evaluate as the authenticated role.
revoke all on all functions in schema shift_round_private from public, anon, authenticated;
grant execute on function
  shift_round_private.is_global_staff(uuid),
  shift_round_private.is_staff(uuid, uuid),
  shift_round_private.can_review(uuid, uuid),
  shift_round_private.can_read_entry(uuid, boolean),
  shift_round_private.can_upload(text),
  shift_round_private.can_read_media(text),
  shift_round_private.can_delete_media(text)
  to authenticated;
-- shift_rounds' column default and CHECK constraints run with the writer's privileges: keep
-- direct writes by service_role (ops scripts, local seed) working. Clients never write the table.
grant execute on function
  shift_round_private.default_missions(),
  shift_round_private.valid_missions(jsonb),
  shift_round_private.valid_session_days(int[], int)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2.5 Storage bucket and policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shift-round-media', 'shift-round-media', false, 10485760,
        array['image/jpeg','audio/mp4','audio/x-m4a','audio/m4a','audio/aac'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists shift_round_media_insert on storage.objects;
create policy shift_round_media_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shift-round-media' and shift_round_private.can_upload(name));

drop policy if exists shift_round_media_select on storage.objects;
create policy shift_round_media_select on storage.objects
  for select to authenticated
  using (bucket_id = 'shift-round-media' and shift_round_private.can_read_media(name));

drop policy if exists shift_round_media_delete on storage.objects;
create policy shift_round_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'shift-round-media' and shift_round_private.can_delete_media(name));

-- Restrictive guards so broader legacy storage policies can never expose or alter this bucket.
drop policy if exists shift_round_media_guard_select on storage.objects;
create policy shift_round_media_guard_select on storage.objects
  as restrictive for select to authenticated
  using (bucket_id <> 'shift-round-media' or shift_round_private.can_read_media(name));
drop policy if exists shift_round_media_guard_insert on storage.objects;
create policy shift_round_media_guard_insert on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id <> 'shift-round-media' or shift_round_private.can_upload(name));
drop policy if exists shift_round_media_guard_update on storage.objects;
create policy shift_round_media_guard_update on storage.objects
  as restrictive for update to authenticated
  using (bucket_id <> 'shift-round-media') with check (bucket_id <> 'shift-round-media');
drop policy if exists shift_round_media_guard_delete on storage.objects;
create policy shift_round_media_guard_delete on storage.objects
  as restrictive for delete to authenticated
  using (bucket_id <> 'shift-round-media' or shift_round_private.can_delete_media(name));
-- anon never touches this bucket (no helper call needed, so no anon grant on the private schema).
drop policy if exists shift_round_media_guard_anon on storage.objects;
create policy shift_round_media_guard_anon on storage.objects
  as restrictive for all to anon
  using (bucket_id <> 'shift-round-media') with check (bucket_id <> 'shift-round-media');

-- ---------------------------------------------------------------------------
-- Seeds
-- ---------------------------------------------------------------------------

insert into public.app_config (key, value) values
  ('shift_round.tab_enabled', 'false'),
  ('shift_round.enrollment_enabled', 'true'),
  ('shift_round.submissions_enabled', 'true'),
  -- Decision 2026-10-13: transcription ships dark (spec seeded true). Text entry works without it.
  ('shift_round.transcription_enabled', 'false'),
  ('shift_round.issuance_enabled', 'true'),
  ('shift_round.nudges_enabled', 'false'),
  ('shift_round.emergency_message', 'null'),
  ('shift_round.web_base_url', '"https://www.passionseed.org"')
on conflict (key) do nothing;

-- E13 bootstrap: every current web admin becomes global SHIFT staff (one-time; later admins,
-- e.g. beta mentors given the admin role, are NOT auto-promoted; see docs/shift-round-ops.md).
insert into public.shift_round_roles (user_id, round_id, role)
select distinct ur.user_id, null::uuid, 'staff'
  from public.user_roles ur
 where ur.role::text = 'admin'
   and exists (select 1 from auth.users u where u.id = ur.user_id)
on conflict do nothing;

insert into public.shift_round_icebreaker_questions (id, text_th, text_en) values
  (1, 'มีเรื่องอะไรที่คุณอยากให้คนอื่นถามคุณบ่อยกว่านี้?', 'What do you wish people asked you about more often?'),
  (2, 'มีเรื่องอะไรที่คุณคิดว่าคนเราควรให้ความสำคัญมากกว่านี้?', 'What do you think people should care about more?'),
  (3, 'ถ้าคุณรวยแบบไม่ต้องกังวลเรื่องเงินอีกแล้ว คุณจะยังทำงานอยู่ไหม? ถ้ายังทำ คุณอยากทำงานอะไร? ถ้าไม่ทำ คุณอยากใช้ชีวิตแบบไหน?', 'If money were never a worry again, would you still work? If yes, at what? If not, how would you live?'),
  (4, 'มีเรื่องอะไรที่คุณคิดว่าตัวเองเก่งกว่าคนทั่วไปเป็นพิเศษ?', 'What are you unusually good at?'),
  (5, 'มีหัวข้ออะไรที่คุณสามารถพูดเกี่ยวกับมันได้นานเป็นชั่วโมงโดยไม่รู้สึกเบื่อ?', 'What topic could you talk about for an hour without getting bored?'),
  (6, 'มีเรื่องอะไรเกี่ยวกับตัวคุณที่คนอื่นมักเข้าใจผิด?', 'What do people often get wrong about you?'),
  (7, 'คุณมักจะรู้สึกสนุกหรือสบายใจเวลาอยู่กับคนแบบไหน?', 'What kind of people do you feel most at ease with?'),
  (8, 'มีเรื่องเล็ก ๆ หรือเรื่องเฉพาะเจาะจงอะไรที่ทำให้คุณมีความสุขแบบแปลก ๆ?', 'What small, specific thing makes you oddly happy?'),
  (9, 'ถ้าปีหน้าคุณสามารถเก่งขึ้นอย่างมากในเรื่องหนึ่ง คุณอยากเก่งเรื่องอะไร?', 'If you could get much better at one thing next year, what would it be?'),
  (10, 'มีอะไรที่คุณรู้สึกว่า "มันถูกออกแบบมาได้แย่มาก" หรือ "มันไม่ควรจะเป็นแบบนี้" จนทุกครั้งที่เห็นแล้วรู้สึกหงุดหงิด?', 'What is so badly designed, or so "it shouldn''t be like this", that it annoys you every time you see it?')
on conflict (id) do nothing;
