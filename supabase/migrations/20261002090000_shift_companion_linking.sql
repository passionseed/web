-- SHIFT companion: per-participant linking codes and personal daily updates.
-- Codes are hashed. Contact details stay in shift_private.
-- Daily update text is readable by the same cohort and staff.
-- One update per person per Bangkok date, editable until 19:00 (session 19:00–21:00).
-- Mobile is stored and is not treated as verified.

alter table public.shift_camp_cohorts add column if not exists ends_on date;
alter table public.shift_camp_enrollments
  add column if not exists companion boolean not null default false;

do $$ begin
  alter table public.shift_camp_cohorts
    add constraint shift_cohort_ends check (ends_on is null or ends_on >= starts_on);
exception when duplicate_object then null;
end $$;

create table if not exists shift_private.roster (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  user_id uuid references auth.users(id),
  email text,
  mobile text,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists shift_roster_user_cohort
  on shift_private.roster (cohort_id, user_id) where user_id is not null;

create table if not exists shift_private.link_codes (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references shift_private.roster(id),
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  issued_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists shift_link_one_active
  on shift_private.link_codes (roster_id)
  where consumed_at is null and revoked_at is null;
create index if not exists shift_link_roster on shift_private.link_codes (roster_id);

create table if not exists shift_private.link_attempts (
  id bigint generated always as identity primary key,
  actor_key text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists shift_link_attempts_actor
  on shift_private.link_attempts (actor_key, attempted_at);

create table if not exists public.shift_daily_updates (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.shift_camp_cohorts(id),
  author_id uuid not null references auth.users(id),
  update_date date not null,
  tried text not null check (length(btrim(tried)) between 1 and 2000),
  learned text check (learned is null or length(learned) <= 1000),
  help text check (help is null or length(help) <= 1000),
  link text check (link is null or link ~ '^https?://[^[:space:]]+$'),
  image_path text,
  revision integer not null default 1 check (revision >= 1),
  idempotency_key text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, author_id, update_date)
);
create unique index if not exists shift_daily_idem
  on public.shift_daily_updates (cohort_id, author_id, idempotency_key)
  where idempotency_key is not null;
create index if not exists shift_daily_cohort_date
  on public.shift_daily_updates (cohort_id, update_date, updated_at desc);

create table if not exists public.shift_daily_revisions (
  update_id uuid not null references public.shift_daily_updates(id),
  cohort_id uuid not null,
  author_id uuid not null,
  revision integer not null,
  tried text not null,
  learned text,
  help text,
  link text,
  image_path text,
  saved_at timestamptz not null default now(),
  primary key (update_id, revision)
);

revoke all on shift_private.roster from public, anon, authenticated;
revoke all on shift_private.link_codes from public, anon, authenticated;
revoke all on shift_private.link_attempts from public, anon, authenticated;

alter table public.shift_daily_updates enable row level security;
alter table public.shift_daily_revisions enable row level security;
revoke all on public.shift_daily_updates from anon, authenticated;
revoke all on public.shift_daily_revisions from anon, authenticated;
grant select on public.shift_daily_updates to authenticated;
grant select on public.shift_daily_revisions to authenticated;

drop policy if exists shift_daily_read on public.shift_daily_updates;
create policy shift_daily_read on public.shift_daily_updates
  for select to authenticated
  using (shift_private.can_read(cohort_id));

drop policy if exists shift_daily_revision_read on public.shift_daily_revisions;
create policy shift_daily_revision_read on public.shift_daily_revisions
  for select to authenticated
  using (author_id = auth.uid() or shift_private.is_staff(cohort_id));

create or replace function shift_private.companion_action(p_action text, p_payload jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
  raw_headers text;
  ip text := '';
  actor text;
  attempts integer;
  first_at timestamptz;
  wait_minutes integer;
  canonical text;
  code_hash text;
  link_row shift_private.link_codes;
  person shift_private.roster;
  other_person shift_private.roster;
  cohort public.shift_camp_cohorts;
  v_email text;
  v_confirmed timestamptz;
  cc text;
  nn text;
  mobile text;
  cid uuid;
  v_today date;
  local_time time;
  reason text;
  existing public.shift_daily_updates;
  by_key public.shift_daily_updates;
  expected integer;
  v_tried text;
  v_learned text;
  v_help text;
  v_link text;
  v_image text;
  v_name text;
  v_starts date;
  v_ends date;
  v_roster uuid;
  fresh_code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
  rnd integer;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text) > 20000 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if p_action = 'status' then
    if uid is null then return jsonb_build_object('ok', true, 'linked', false, 'email', null, 'mobile', null, 'cohorts', '[]'::jsonb); end if;
    return jsonb_build_object(
      'ok', true,
      'linked', exists(select 1 from shift_private.roster r where r.user_id = uid),
      'email', (select r.email from shift_private.roster r where r.user_id = uid order by r.claimed_at desc nulls last limit 1),
      'mobile', (select r.mobile from shift_private.roster r where r.user_id = uid order by r.claimed_at desc nulls last limit 1),
      'cohorts', coalesce((
        select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'starts_on', c.starts_on, 'ends_on', c.ends_on) order by r.claimed_at desc)
        from shift_private.roster r
        join public.shift_camp_cohorts c on c.id = r.cohort_id
        where r.user_id = uid
      ), '[]'::jsonb)
    );
  end if;

  if p_action in ('preview_code', 'claim') then
    begin
      raw_headers := current_setting('request.headers', true);
      ip := btrim(split_part(coalesce(raw_headers::json->>'x-forwarded-for', ''), ',', 1));
    exception when others then
      ip := '';
    end;
    canonical := upper(regexp_replace(coalesce(p_payload->>'code', ''), '[^A-Za-z0-9]', '', 'g'));
    if canonical = '' then
      return jsonb_build_object('ok', false, 'error', 'empty');
    end if;
    if length(canonical) <> 12 or canonical !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$' then
      actor := coalesce(uid::text, nullif(ip, ''), 'anon') || ':code';
      insert into shift_private.link_attempts(actor_key) values (actor);
      delete from shift_private.link_attempts where actor_key = actor and attempted_at < now() - interval '1 day';
      select count(*), min(attempted_at) into attempts, first_at
        from shift_private.link_attempts
        where actor_key = actor and attempted_at > now() - interval '15 minutes';
      if attempts > 30 then
        wait_minutes := greatest(1, ceil(extract(epoch from (first_at + interval '15 minutes' - now())) / 60.0)::integer);
        return jsonb_build_object('ok', false, 'error', 'rate_limit', 'wait_minutes', wait_minutes);
      end if;
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    code_hash := encode(extensions.digest(convert_to(canonical, 'UTF8'), 'sha256'), 'hex');
  end if;

  if p_action = 'preview_code' then
    select c.name, c.starts_on, c.ends_on
      into v_name, v_starts, v_ends
    from shift_private.link_codes lc
    join shift_private.roster r on r.id = lc.roster_id
    join public.shift_camp_cohorts c on c.id = r.cohort_id
    where lc.code_hash = code_hash
      and lc.consumed_at is null
      and lc.revoked_at is null
      and lc.expires_at > now()
      and r.user_id is null;
    if v_name is null then
      actor := coalesce(uid::text, nullif(ip, ''), 'anon') || ':code';
      insert into shift_private.link_attempts(actor_key) values (actor);
      delete from shift_private.link_attempts where actor_key = actor and attempted_at < now() - interval '1 day';
      select count(*), min(attempted_at) into attempts, first_at
        from shift_private.link_attempts
        where actor_key = actor and attempted_at > now() - interval '15 minutes';
      if attempts > 30 then
        wait_minutes := greatest(1, ceil(extract(epoch from (first_at + interval '15 minutes' - now())) / 60.0)::integer);
        return jsonb_build_object('ok', false, 'error', 'rate_limit', 'wait_minutes', wait_minutes);
      end if;
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    return jsonb_build_object('ok', true, 'cohort_name', v_name, 'starts_on', v_starts, 'ends_on', v_ends);
  end if;

  if p_action = 'claim' then
    if uid is null then return jsonb_build_object('ok', false, 'error', 'verify_email'); end if;
    select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = uid;
    if v_confirmed is null or v_email is null then
      return jsonb_build_object('ok', false, 'error', 'verify_email');
    end if;
    if lower(btrim(coalesce(p_payload->>'email', ''))) <> lower(btrim(v_email)) then
      return jsonb_build_object('ok', false, 'error', 'email_mismatch');
    end if;

    select lc.* into link_row
    from shift_private.link_codes lc
    where lc.code_hash = code_hash
    for update;
    if not found then
      actor := coalesce(uid::text, nullif(ip, ''), 'anon') || ':code';
      insert into shift_private.link_attempts(actor_key) values (actor);
      delete from shift_private.link_attempts where actor_key = actor and attempted_at < now() - interval '1 day';
      select count(*), min(attempted_at) into attempts, first_at
        from shift_private.link_attempts
        where actor_key = actor and attempted_at > now() - interval '15 minutes';
      if attempts > 30 then
        wait_minutes := greatest(1, ceil(extract(epoch from (first_at + interval '15 minutes' - now())) / 60.0)::integer);
        return jsonb_build_object('ok', false, 'error', 'rate_limit', 'wait_minutes', wait_minutes);
      end if;
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    select r.* into person from shift_private.roster r where r.id = link_row.roster_id for update;
    select c.* into cohort from public.shift_camp_cohorts c where c.id = person.cohort_id;

    if person.user_id = uid then
      return jsonb_build_object('ok', true, 'already', true, 'cohort', jsonb_build_object('id', cohort.id, 'name', cohort.name, 'starts_on', cohort.starts_on, 'ends_on', cohort.ends_on));
    end if;
    if person.user_id is not null or link_row.consumed_at is not null or link_row.revoked_at is not null or link_row.expires_at <= now() then
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;

    select r.* into other_person
    from shift_private.roster r
    where r.cohort_id = person.cohort_id and r.user_id = uid and r.id <> person.id
    limit 1;
    if found then
      return jsonb_build_object('ok', true, 'already', true, 'cohort', jsonb_build_object('id', cohort.id, 'name', cohort.name, 'starts_on', cohort.starts_on, 'ends_on', cohort.ends_on));
    end if;

    cc := regexp_replace(coalesce(p_payload->>'country_code', ''), '\D', '', 'g');
    cc := regexp_replace(cc, '^0+', '');
    nn := regexp_replace(coalesce(p_payload->>'mobile', ''), '\D', '', 'g');
    if left(nn, 1) = '0' then nn := substr(nn, 2); end if;
    if cc is null or length(cc) < 1 or length(cc) > 3 or nn is null or length(nn) < 6 or length(nn) > 12
       or length(cc || nn) < 8 or length(cc || nn) > 15 then
      return jsonb_build_object('ok', false, 'error', 'mobile');
    end if;
    mobile := '+' || cc || nn;

    update shift_private.roster
      set user_id = uid, email = lower(btrim(v_email)), mobile = mobile, claimed_at = now()
      where id = person.id and user_id is null;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'unavailable');
    end if;
    update shift_private.link_codes set consumed_at = now() where id = link_row.id and consumed_at is null;
    insert into public.shift_camp_enrollments(cohort_id, user_id, role, companion)
      values (person.cohort_id, uid, 'participant', true)
      on conflict (cohort_id, user_id) do update set companion = true;
    return jsonb_build_object('ok', true, 'already', false, 'cohort', jsonb_build_object('id', cohort.id, 'name', cohort.name, 'starts_on', cohort.starts_on, 'ends_on', cohort.ends_on));
  end if;

  if uid is null then return jsonb_build_object('ok', false, 'error', 'verify_email'); end if;

  if p_action in ('issue_code', 'reissue_code') then
    if p_action = 'issue_code' then
      cid := nullif(p_payload->>'cohort_id', '')::uuid;
      if cid is null or not shift_private.is_staff(cid) then
        return jsonb_build_object('ok', false, 'error', 'forbidden');
      end if;
      insert into shift_private.roster(cohort_id) values (cid) returning id into v_roster;
    else
      v_roster := nullif(p_payload->>'roster_id', '')::uuid;
      select r.* into person from shift_private.roster r where r.id = v_roster for update;
      if not found or person.user_id is not null or not shift_private.is_staff(person.cohort_id) then
        return jsonb_build_object('ok', false, 'error', 'forbidden');
      end if;
      v_roster := person.id;
      update shift_private.link_codes
        set revoked_at = now()
        where roster_id = v_roster and consumed_at is null and revoked_at is null;
    end if;
    fresh_code := '';
    for i in 1..12 loop
      rnd := get_byte(extensions.gen_random_bytes(1), 0) % 32;
      fresh_code := fresh_code || substr(alphabet, rnd + 1, 1);
    end loop;
    insert into shift_private.link_codes(roster_id, code_hash, expires_at, issued_by)
      values (
        v_roster,
        encode(extensions.digest(convert_to(fresh_code, 'UTF8'), 'sha256'), 'hex'),
        now() + interval '30 days',
        uid
      );
    -- Raw code is returned once to the staff caller. Do not log this response.
    return jsonb_build_object(
      'ok', true,
      'roster_id', v_roster,
      'code', substr(fresh_code, 1, 4) || '-' || substr(fresh_code, 5, 4) || '-' || substr(fresh_code, 9, 4),
      'expires_at', now() + interval '30 days'
    );
  end if;

  cid := nullif(p_payload->>'cohort_id', '')::uuid;
  if cid is null or not exists(select 1 from shift_private.roster r where r.cohort_id = cid and r.user_id = uid) then
    if not shift_private.can_read(cid) then
      return jsonb_build_object('ok', false, 'error', 'not_linked');
    end if;
  end if;
  if not shift_private.can_read(cid) then
    return jsonb_build_object('ok', false, 'error', 'not_linked');
  end if;
  select c.* into cohort from public.shift_camp_cohorts c where c.id = cid;
  v_today := (now() at time zone 'Asia/Bangkok')::date;
  local_time := (now() at time zone 'Asia/Bangkok')::time;
  reason := case
    when v_today < cohort.starts_on then 'before_cohort'
    when cohort.ends_on is not null and v_today > cohort.ends_on then 'after_cohort'
    when local_time >= time '19:00' then 'after_deadline'
    else null
  end;

  if p_action = 'update_contact' then
    cc := regexp_replace(coalesce(p_payload->>'country_code', ''), '\D', '', 'g');
    cc := regexp_replace(cc, '^0+', '');
    nn := regexp_replace(coalesce(p_payload->>'mobile', ''), '\D', '', 'g');
    if left(nn, 1) = '0' then nn := substr(nn, 2); end if;
    if length(cc) < 1 or length(cc) > 3 or length(nn) < 6 or length(nn) > 12 or length(cc || nn) < 8 or length(cc || nn) > 15 then
      return jsonb_build_object('ok', false, 'error', 'mobile');
    end if;
    mobile := '+' || cc || nn;
    update shift_private.roster set mobile = mobile where cohort_id = cid and user_id = uid;
    return jsonb_build_object('ok', true, 'mobile', mobile);
  end if;

  if p_action = 'today' then
    return jsonb_build_object(
      'ok', true,
      'cohort', jsonb_build_object('id', cohort.id, 'name', cohort.name, 'starts_on', cohort.starts_on, 'ends_on', cohort.ends_on),
      'today', v_today,
      'deadline', '19:00',
      'session', '19:00–21:00',
      'window_open', reason is null,
      'window_reason', reason,
      'mine', (
        select jsonb_build_object(
          'id', u.id, 'author_id', u.author_id,
          'author_name', coalesce(nullif(p.full_name, ''), 'Participant'),
          'mine', true, 'update_date', u.update_date, 'tried', u.tried, 'learned', u.learned, 'help', u.help,
          'link', u.link, 'image_path', u.image_path, 'revision', u.revision, 'edited', u.revision > 1,
          'submitted_at', u.submitted_at, 'updated_at', u.updated_at
        )
        from public.shift_daily_updates u
        left join public.profiles p on p.id = u.author_id
        where u.cohort_id = cid and u.author_id = uid and u.update_date = v_today
      ),
      'cohort_updates', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', u.id, 'author_id', u.author_id,
          'author_name', coalesce(nullif(p.full_name, ''), 'Participant'),
          'mine', u.author_id = uid, 'update_date', u.update_date, 'tried', u.tried, 'learned', u.learned, 'help', u.help,
          'link', u.link, 'image_path', u.image_path, 'revision', u.revision, 'edited', u.revision > 1,
          'submitted_at', u.submitted_at, 'updated_at', u.updated_at
        ) order by u.updated_at desc)
        from public.shift_daily_updates u
        left join public.profiles p on p.id = u.author_id
        where u.cohort_id = cid and u.update_date = v_today
      ), '[]'::jsonb),
      'history', coalesce((
        select jsonb_agg(to_jsonb(h)) from (
          select u.id, u.author_id, coalesce(nullif(p.full_name, ''), 'Participant') as author_name,
            true as mine, u.update_date, u.tried, u.learned, u.help, u.link, u.image_path,
            u.revision, (u.revision > 1) as edited, u.submitted_at, u.updated_at
          from public.shift_daily_updates u
          left join public.profiles p on p.id = u.author_id
          where u.cohort_id = cid and u.author_id = uid and u.update_date < v_today
          order by u.update_date desc
          limit 5
        ) h
      ), '[]'::jsonb)
    );
  end if;

  if p_action = 'history' then
    return jsonb_build_object('ok', true, 'updates', coalesce((
      select jsonb_agg(to_jsonb(h)) from (
        select u.id, u.author_id, coalesce(nullif(p.full_name, ''), 'Participant') as author_name,
          true as mine, u.update_date, u.tried, u.learned, u.help, u.link, u.image_path,
          u.revision, (u.revision > 1) as edited, u.submitted_at, u.updated_at
        from public.shift_daily_updates u
        left join public.profiles p on p.id = u.author_id
        where u.cohort_id = cid and u.author_id = uid
        order by u.update_date desc
        limit 30
      ) h
    ), '[]'::jsonb));
  end if;

  if p_action = 'save_daily' then
    if nullif(p_payload->>'update_date', '') is not null and (p_payload->>'update_date')::date <> v_today then
      return jsonb_build_object('ok', false, 'error', 'date_mismatch', 'update_date', v_today);
    end if;
    if reason is not null then
      return jsonb_build_object('ok', false, 'error', reason, 'update_date', v_today);
    end if;
    v_tried := btrim(coalesce(p_payload->>'tried', ''));
    v_learned := nullif(btrim(coalesce(p_payload->>'learned', '')), '');
    v_help := nullif(btrim(coalesce(p_payload->>'help', '')), '');
    v_link := nullif(btrim(coalesce(p_payload->>'link', '')), '');
    v_image := nullif(btrim(coalesce(p_payload->>'image_path', '')), '');
    if v_tried = '' then return jsonb_build_object('ok', false, 'error', 'tried'); end if;
    if length(v_tried) > 2000 or coalesce(length(v_learned), 0) > 1000 or coalesce(length(v_help), 0) > 1000 then
      return jsonb_build_object('ok', false, 'error', 'length');
    end if;
    if v_link is not null and v_link !~ '^https?://[^[:space:]]+$' then
      return jsonb_build_object('ok', false, 'error', 'link');
    end if;
    if v_image is not null and v_image !~ ('^daily/' || cid::text || '/' || uid::text || '/[^/]+$') then
      return jsonb_build_object('ok', false, 'error', 'image');
    end if;
    if nullif(p_payload->>'idempotency_key', '') is null or length(p_payload->>'idempotency_key') > 80 then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
    expected := coalesce((p_payload->>'expected_revision')::integer, 0);

    select u.* into by_key
    from public.shift_daily_updates u
    where u.cohort_id = cid and u.author_id = uid and u.idempotency_key = p_payload->>'idempotency_key';
    if found then
      return jsonb_build_object('ok', true, 'update', jsonb_build_object(
        'id', by_key.id, 'author_id', by_key.author_id, 'author_name', 'You', 'mine', true,
        'update_date', by_key.update_date, 'tried', by_key.tried, 'learned', by_key.learned, 'help', by_key.help,
        'link', by_key.link, 'image_path', by_key.image_path, 'revision', by_key.revision,
        'edited', by_key.revision > 1, 'submitted_at', by_key.submitted_at, 'updated_at', by_key.updated_at
      ));
    end if;

    select u.* into existing
    from public.shift_daily_updates u
    where u.cohort_id = cid and u.author_id = uid and u.update_date = v_today
    for update;
    if found and existing.revision <> expected then
      return jsonb_build_object('ok', false, 'error', 'conflict', 'server', jsonb_build_object(
        'id', existing.id, 'author_id', existing.author_id, 'author_name', 'You', 'mine', true,
        'update_date', existing.update_date, 'tried', existing.tried, 'learned', existing.learned, 'help', existing.help,
        'link', existing.link, 'image_path', existing.image_path, 'revision', existing.revision,
        'edited', existing.revision > 1, 'submitted_at', existing.submitted_at, 'updated_at', existing.updated_at
      ));
    end if;
    if not found and expected <> 0 then
      return jsonb_build_object('ok', false, 'error', 'conflict');
    end if;

    if not found then
      insert into public.shift_daily_updates(
        cohort_id, author_id, update_date, tried, learned, help, link, image_path, revision, idempotency_key
      ) values (
        cid, uid, v_today, v_tried, v_learned, v_help, v_link, v_image, 1, p_payload->>'idempotency_key'
      ) returning * into existing;
    else
      update public.shift_daily_updates u
        set tried = v_tried, learned = v_learned, help = v_help, link = v_link, image_path = v_image,
            revision = u.revision + 1, idempotency_key = p_payload->>'idempotency_key', updated_at = now()
        where u.id = existing.id
        returning * into existing;
    end if;
    insert into public.shift_daily_revisions(
      update_id, cohort_id, author_id, revision, tried, learned, help, link, image_path
    ) values (
      existing.id, cid, uid, existing.revision, existing.tried, existing.learned, existing.help, existing.link, existing.image_path
    );
    return jsonb_build_object('ok', true, 'update', jsonb_build_object(
      'id', existing.id, 'author_id', existing.author_id, 'author_name', 'You', 'mine', true,
      'update_date', existing.update_date, 'tried', existing.tried, 'learned', existing.learned, 'help', existing.help,
      'link', existing.link, 'image_path', existing.image_path, 'revision', existing.revision,
      'edited', existing.revision > 1, 'submitted_at', existing.submitted_at, 'updated_at', existing.updated_at
    ));
  end if;

  return jsonb_build_object('ok', false, 'error', 'invalid');
exception
  when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', 'invalid');
end $$;

revoke all on function shift_private.companion_action(text, jsonb) from public;
grant execute on function shift_private.companion_action(text, jsonb) to anon, authenticated;

create or replace function public.shift_companion_action(p_action text, p_payload jsonb default '{}')
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select shift_private.companion_action(p_action, coalesce(p_payload, '{}'::jsonb))
$$;
revoke all on function public.shift_companion_action(text, jsonb) from public;
grant execute on function public.shift_companion_action(text, jsonb) to anon, authenticated;

-- Personal photos live under daily/{cohort}/{user}/file.
-- Cohort members can read a photo only after it is saved on an update.
create or replace function shift_private.can_access_image(path text, writing boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare cid uuid; pid uuid; owner uuid; begin
  if split_part(path, '/', 1) = 'daily' then
    cid := split_part(path, '/', 2)::uuid;
    owner := split_part(path, '/', 3)::uuid;
    if writing then
      return auth.uid() = owner and shift_private.can_read(cid);
    end if;
    return shift_private.can_read(cid) and (
      shift_private.is_staff(cid) or auth.uid() = owner or exists(
        select 1 from public.shift_daily_updates u
        where u.cohort_id = cid and u.image_path = path
      )
    );
  end if;
  cid := split_part(path, '/', 1)::uuid;
  pid := split_part(path, '/', 2)::uuid;
  return shift_private.project_cohort(pid) = cid and shift_private.can_read(cid) and
    (case when writing then shift_private.my_project(cid, auth.uid()) = pid
      else shift_private.is_staff(cid) or shift_private.my_project(cid, auth.uid()) = pid
        or exists(select 1 from public.shift_camp_updates where project_id = pid and published_at is not null and not hidden and (body->'screenshots') ? path)
    end);
exception when invalid_text_representation then return false; end $$;
revoke all on function shift_private.can_access_image(text, boolean) from public;
grant execute on function shift_private.can_access_image(text, boolean) to anon, authenticated;
