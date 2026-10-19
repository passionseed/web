-- SHIFT rounds (beta), part 3: admin RPCs (3.4), web admin only.
-- Roles: Global = staff with round_id null in shift_round_roles, OR any web admin
-- (user_roles.role = 'admin'; decision 2026-10-13: every web admin is global SHIFT staff on
-- all rounds, without a separate grant). Staff = global or round staff; Reviewer = staff or
-- mentor of the round. Mentor scoping (a mentor only sees their own rounds) therefore applies
-- only to users who are not web admins. Every write emits shift_round_events with actor_id (X9).

create or replace function shift_round_private.round_json(r public.shift_rounds) returns jsonb
language sql stable set search_path = '' as $$
  select to_jsonb(r) || jsonb_build_object(
    'phase', shift_round_private.phase_of(r),
    'day', shift_round_private.day_of(r, shift_round_private.round_now()),
    'effective_days', shift_round_private.effective_days(r))
$$;

create or replace function shift_round_private.squad_of(p_entry_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', s.id, 'name', s.name,
           'icebreaker_question', jsonb_build_object('id', q.id, 'th', q.text_th, 'en', q.text_en),
           'icebreaker_answer', sm.icebreaker_answer)
    from public.shift_round_squad_members sm
    join public.shift_round_squads s on s.id = sm.squad_id
    join public.shift_round_icebreaker_questions q on q.id = sm.icebreaker_question
   where sm.entry_id = p_entry_id
$$;

create or replace function shift_round_private.display_name(p_uid uuid) returns text
language sql stable set search_path = '' as $$
  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.username), ''),
                  (select u.email from auth.users u where u.id = p_uid))
    from public.profiles p where p.id = p_uid
$$;

create or replace function shift_round_private.admin_evidence_json(e public.shift_round_evidence, r public.shift_rounds) returns jsonb
language sql stable set search_path = '' as $$
  select to_jsonb(e) || jsonb_build_object(
    'counted', shift_round_private.evidence_counts(e, r),
    'after_close', shift_round_private.after_close(e, r),
    'invalidated', shift_round_private.change_invalidated(e, r),
    'duplicate_label', shift_round_private.duplicate_label(e),
    'mission', shift_round_private.mission_of(r.missions, e.type),
    'media', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'path', m.path, 'bytes', m.bytes,
                                                         'duration_ms', m.duration_ms, 'purged', m.purged_at is not null,
                                                         'exif_found', m.exif_found) order by m.kind)
                         from public.shift_round_evidence_media m where m.evidence_id = e.id), '[]'::jsonb),
    'entry', (select jsonb_build_object('id', en.id, 'handle', en.handle, 'track', en.track)
                from public.shift_round_entries en where en.id = e.entry_id),
    'squad', shift_round_private.squad_of(e.entry_id),
    'source', (select jsonb_build_object('id', s.id, 'type', s.type, 'status', s.status,
                                         'who_label', s.payload->>'who_label', 'key_point', s.payload->>'key_point')
                 from public.shift_round_evidence s where s.id = e.source_evidence_id))
$$;

create or replace function public.shift_round_admin_rounds() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not exists (select 1 from public.shift_round_roles x where x.user_id = v_uid)
     and not shift_round_private.is_global_staff(v_uid) then
    -- Web admins are global staff (decision 2026-10-13); anyone else needs a round role.
    return shift_round_private.fail('forbidden', null, null, '{"rule":"no_shift_round_role"}');
  end if;
  return shift_round_private.ok(jsonb_build_object(
    'is_global_staff', shift_round_private.is_global_staff(v_uid),
    'rounds', coalesce((
      select jsonb_agg(shift_round_private.round_json(r) || jsonb_build_object(
               'my_role', case when shift_round_private.is_staff(r.id, v_uid) then 'staff' else 'mentor' end,
               'entrants', (select count(*) from public.shift_round_entries e where e.round_id = r.id),
               'pending_review', (select count(*) from public.shift_round_evidence e
                                   where e.round_id = r.id and e.status = 'submitted' and e.reviewed_at is null),
               'certificates_issued', (select count(*) from public.shift_round_certificates c
                                        where c.round_id = r.id and c.status = 'issued'))
             order by r.number desc)
        from public.shift_rounds r
       where shift_round_private.can_review(r.id, v_uid)), '[]'::jsonb)));
end $$;

-- Shared policy-column validation for create/update. Returns error envelope or null.
create or replace function shift_round_private.round_patch_problem(p jsonb, p_creating boolean) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  k text;
  allowed text[] := array['number','title_th','title_en','brief_th','brief_en','tracks_open','starts_at',
    'duration_days','review_window_hours','join_cutoff_day','nudge_local_time','rate_limit_per_hour',
    'grace_minutes','squad_size','retention_months','audio_retention_days','join_mode','mentor_led',
    'discord_url','status',
    -- v2 2.1
    'missions','session_days','session_start','session_end','curriculum_key','application_cohort'];
  v_start timestamptz;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return shift_round_private.fail('invalid_field', 'round'); end if;
  for k in select jsonb_object_keys(p) loop
    if not (k = any (allowed)) then return shift_round_private.fail('invalid_field', k, null, '{"rule":"unknown_key"}'); end if;
  end loop;
  if p_creating then
    foreach k in array array['number','title_th','title_en','brief_th','brief_en','starts_at'] loop
      if not p ? k or jsonb_typeof(p->k) = 'null' then return shift_round_private.fail('missing_field', k); end if;
    end loop;
  end if;
  if p ? 'starts_at' then
    begin
      v_start := (p->>'starts_at')::timestamptz;
    exception when others then
      return shift_round_private.fail('invalid_field', 'starts_at');
    end;
    if (v_start at time zone 'Asia/Bangkok')::time <> time '00:00' then
      return shift_round_private.fail('invalid_field', 'starts_at', null, '{"rule":"midnight_ict"}');
    end if;
  end if;
  if p ? 'discord_url' and jsonb_typeof(p->'discord_url') <> 'null'
     and (p->>'discord_url') !~ '^https://(discord\.gg|discord\.com)/' then
    return shift_round_private.fail('invalid_field', 'discord_url');
  end if;
  if p ? 'tracks_open' and (jsonb_typeof(p->'tracks_open') <> 'array' or jsonb_array_length(p->'tracks_open') = 0) then
    return shift_round_private.fail('invalid_field', 'tracks_open');
  end if;
  if p ? 'missions' and not shift_round_private.valid_missions(p->'missions') then
    return shift_round_private.fail('invalid_field', 'missions', null, '{"rule":"missions_config"}');
  end if;
  if p ? 'session_days' and (jsonb_typeof(p->'session_days') <> 'array'
       or exists (select 1 from jsonb_array_elements(p->'session_days') d
                   where jsonb_typeof(d) <> 'number' or (d #>> '{}') !~ '^[0-9]{1,2}$')) then
    return shift_round_private.fail('invalid_field', 'session_days');
  end if;
  foreach k in array array['session_start','session_end'] loop
    if p ? k then
      if jsonb_typeof(p->k) <> 'string' then return shift_round_private.fail('invalid_field', k); end if;
      begin
        perform (p->>k)::time;
      exception when others then
        return shift_round_private.fail('invalid_field', k);
      end;
    end if;
  end loop;
  foreach k in array array['curriculum_key','application_cohort'] loop
    if p ? k and jsonb_typeof(p->k) not in ('string','null') then
      return shift_round_private.fail('invalid_field', k);
    end if;
  end loop;
  return null;
end $$;

-- Final-row checks with field-specific errors (CHECK constraints stay the backstop).
create or replace function shift_round_private.round_row_problem(n public.shift_rounds) returns jsonb
language plpgsql stable set search_path = '' as $$
begin
  if n.duration_days is null or n.duration_days not between 5 and 28 then
    return shift_round_private.fail('invalid_field', 'duration_days');
  end if;
  if n.join_cutoff_day is null or n.join_cutoff_day not between 1 and n.duration_days then
    return shift_round_private.fail('invalid_field', 'join_cutoff_day');
  end if;
  if not shift_round_private.valid_session_days(n.session_days, n.duration_days) then
    return shift_round_private.fail('invalid_field', 'session_days', null, '{"rule":"range"}');
  end if;
  if n.session_start is null or n.session_end is null or n.session_end <= n.session_start then
    return shift_round_private.fail('invalid_field', 'session_end', null, '{"rule":"after_start"}');
  end if;
  return null;
end $$;

create or replace function public.shift_round_admin_create_round(p_round jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_problem jsonb;
  r public.shift_rounds;
  v_row public.shift_rounds;
  v_start timestamptz;
  v_days int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_global_staff(v_uid) then return shift_round_private.fail('forbidden'); end if;
  v_problem := shift_round_private.round_patch_problem(p_round, true);
  if v_problem is not null then return v_problem; end if;
  if exists (select 1 from public.shift_rounds x where x.number = (p_round->>'number')::int) then
    return shift_round_private.fail('round_number_taken', 'number');
  end if;
  v_start := (p_round->>'starts_at')::timestamptz;
  begin
    -- v2 D2 SHIFT template defaults: 7 days, sessions on days 1,2,4,6,7 at 19:00-21:00 ICT,
    -- join until day 2, nudge 21:15, invite join, mentor-led, SHIFT steps 1-7 as missions.
    v_days := coalesce((p_round->>'duration_days')::int, 7);
    v_row.duration_days := v_days;
    v_row.join_cutoff_day := coalesce((p_round->>'join_cutoff_day')::int, least(2, v_days));
    v_row.session_days := case when p_round ? 'session_days'
                               then array(select (x #>> '{}')::int from jsonb_array_elements(p_round->'session_days') x)
                               else array(select d from unnest('{1,2,4,6,7}'::int[]) d where d <= v_days) end;
    v_row.session_start := coalesce((p_round->>'session_start')::time, time '19:00');
    v_row.session_end := coalesce((p_round->>'session_end')::time, time '21:00');
    v_problem := shift_round_private.round_row_problem(v_row);
    if v_problem is not null then return v_problem; end if;

    insert into public.shift_rounds (number, title_th, title_en, brief_th, brief_en, tracks_open, starts_at,
      duration_days, closes_at, review_window_hours, review_ends_at, join_cutoff_day, nudge_local_time,
      rate_limit_per_hour, grace_minutes, squad_size, retention_months, audio_retention_days, join_mode,
      mentor_led, discord_url, status, missions, session_days, session_start, session_end, curriculum_key,
      application_cohort, created_by)
    values ((p_round->>'number')::int, btrim(p_round->>'title_th'), btrim(p_round->>'title_en'),
      btrim(p_round->>'brief_th'), btrim(p_round->>'brief_en'),
      case when p_round ? 'tracks_open' then array(select jsonb_array_elements_text(p_round->'tracks_open')) else array['high_school'] end,
      v_start, v_days, v_start + make_interval(days => v_days),
      coalesce((p_round->>'review_window_hours')::int, 48), v_start,   -- review_ends_at recomputed by trigger
      v_row.join_cutoff_day,
      coalesce((p_round->>'nudge_local_time')::time, time '21:15'),
      coalesce((p_round->>'rate_limit_per_hour')::int, 30), coalesce((p_round->>'grace_minutes')::int, 30),
      coalesce((p_round->>'squad_size')::int, 3), coalesce((p_round->>'retention_months')::int, 12),
      coalesce((p_round->>'audio_retention_days')::int, 30), coalesce(p_round->>'join_mode', 'invite'),
      coalesce((p_round->>'mentor_led')::boolean, true), nullif(p_round->>'discord_url', ''),
      coalesce(p_round->>'status', 'draft'),
      coalesce(case when jsonb_typeof(p_round->'missions') = 'array' then p_round->'missions' end,
               shift_round_private.default_missions()),
      v_row.session_days, v_row.session_start, v_row.session_end,
      nullif(btrim(coalesce(p_round->>'curriculum_key', '')), ''),
      nullif(btrim(coalesce(p_round->>'application_cohort', '')), ''),
      v_uid)
    returning * into r;
  exception
    when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow
         or invalid_datetime_format or numeric_value_out_of_range then
      return shift_round_private.fail('invalid_field', null, null, jsonb_build_object('reason', sqlerrm));
    when unique_violation then
      return shift_round_private.fail('round_number_taken', 'number');
  end;
  if r.status = 'published' then
    perform shift_round_private.emit('round_published', r.id, null, null, v_uid, jsonb_build_object('number', r.number));
  end if;
  return shift_round_private.ok(jsonb_build_object('round_id', r.id));
end $$;

create or replace function public.shift_round_admin_update_round(p_round_id uuid, p_patch jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  n public.shift_rounds;
  v_problem jsonb;
  k text;
  v_started boolean;
  -- Session schedule, curriculum and application cohort do not affect eligibility, so they stay
  -- editable after the start (moving a session, switching the plan). missions stays locked.
  v_unlocked text[] := array['discord_url','brief_th','brief_en','title_th','title_en','status',
    'session_days','session_start','session_end','curriculum_key','application_cohort'];
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_staff(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  select x.* into r from public.shift_rounds x where x.id = p_round_id for update;
  if not found then return shift_round_private.fail('round_not_found'); end if;
  v_problem := shift_round_private.round_patch_problem(p_patch, false);
  if v_problem is not null then return v_problem; end if;

  v_started := shift_round_private.round_now() >= r.starts_at;
  if v_started then
    for k in select jsonb_object_keys(p_patch) loop
      if k = 'join_cutoff_day' then
        -- may move only while joining is still open and never below today
        if shift_round_private.day_of(r, shift_round_private.round_now()) > r.join_cutoff_day
           or (p_patch->>'join_cutoff_day')::int < shift_round_private.day_of(r, shift_round_private.round_now()) then
          return shift_round_private.fail('policy_locked', k);
        end if;
      elsif not (k = any (v_unlocked)) then
        return shift_round_private.fail('policy_locked', k);
      end if;
    end loop;
  end if;
  if p_patch ? 'status' and not (
       (r.status = p_patch->>'status')
       or (r.status = 'draft' and p_patch->>'status' in ('published','archived'))
       or (r.status = 'published' and p_patch->>'status' = 'archived')
       or (r.status = 'archived' and p_patch->>'status' = 'published')) then
    return shift_round_private.fail('invalid_field', 'status', null, '{"rule":"transition"}');
  end if;
  if p_patch ? 'number' and exists (select 1 from public.shift_rounds x
                                     where x.number = (p_patch->>'number')::int and x.id <> r.id) then
    return shift_round_private.fail('round_number_taken', 'number');
  end if;

  begin
    n := jsonb_populate_record(r, p_patch - 'tracks_open' - 'session_days' - 'missions');
    if p_patch ? 'tracks_open' then
      n.tracks_open := array(select jsonb_array_elements_text(p_patch->'tracks_open'));
    end if;
    if p_patch ? 'session_days' then
      n.session_days := array(select (x #>> '{}')::int from jsonb_array_elements(p_patch->'session_days') x);
    end if;
    if p_patch ? 'missions' then
      n.missions := p_patch->'missions';
    end if;
    v_problem := shift_round_private.round_row_problem(n);
    if v_problem is not null then return v_problem; end if;
    n.closes_at := n.starts_at + make_interval(days => n.duration_days + n.extended_days);
    update public.shift_rounds x set
      number = n.number, title_th = btrim(n.title_th), title_en = btrim(n.title_en),
      brief_th = btrim(n.brief_th), brief_en = btrim(n.brief_en), tracks_open = n.tracks_open,
      starts_at = n.starts_at, duration_days = n.duration_days, closes_at = n.closes_at,
      review_window_hours = n.review_window_hours, join_cutoff_day = n.join_cutoff_day,
      nudge_local_time = n.nudge_local_time, rate_limit_per_hour = n.rate_limit_per_hour,
      grace_minutes = n.grace_minutes, squad_size = n.squad_size, retention_months = n.retention_months,
      audio_retention_days = n.audio_retention_days, join_mode = n.join_mode, mentor_led = n.mentor_led,
      discord_url = nullif(n.discord_url, ''), status = n.status,
      missions = n.missions, session_days = n.session_days, session_start = n.session_start,
      session_end = n.session_end, curriculum_key = nullif(btrim(n.curriculum_key), ''),
      application_cohort = nullif(btrim(n.application_cohort), '')
    where x.id = r.id
    returning * into n;
  exception
    when check_violation or not_null_violation or invalid_text_representation or datetime_field_overflow
         or invalid_datetime_format or numeric_value_out_of_range then
      return shift_round_private.fail('invalid_field', null, null, jsonb_build_object('reason', sqlerrm));
    when unique_violation then
      return shift_round_private.fail('round_number_taken', 'number');
  end;
  if r.status <> 'published' and n.status = 'published' then
    perform shift_round_private.emit('round_published', r.id, null, null, v_uid, jsonb_build_object('number', n.number));
  end if;
  return shift_round_private.ok(jsonb_build_object('round', shift_round_private.round_json(n)));
end $$;

create or replace function public.shift_round_admin_extend_round(p_round_id uuid, p_days int, p_reason text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  v_reason text := btrim(coalesce(p_reason, ''));
  v_reset int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_staff(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if p_days is null or p_days not between 1 and 7 then return shift_round_private.fail('invalid_field', 'days'); end if;
  if char_length(v_reason) not between 1 and 300 then return shift_round_private.fail('invalid_field', 'reason'); end if;
  select x.* into r from public.shift_rounds x where x.id = p_round_id for update;
  if not found then return shift_round_private.fail('round_not_found'); end if;
  if exists (select 1 from public.shift_round_certificates c where c.round_id = r.id) then
    return shift_round_private.fail('extend_after_issue');
  end if;
  update public.shift_rounds x
     set closes_at = x.closes_at + make_interval(days => p_days), extended_days = x.extended_days + p_days
   where x.id = r.id
  returning * into r;
  update public.shift_round_entries e set outcome = 'in_progress', finalized_at = null
   where e.round_id = r.id and e.outcome = 'not_eligible';
  get diagnostics v_reset = row_count;
  perform shift_round_private.emit('round_extended', r.id, null, null, v_uid,
    jsonb_build_object('days', p_days, 'reason', v_reason, 'reset_not_eligible', v_reset));
  return shift_round_private.ok(jsonb_build_object('closes_at', r.closes_at, 'review_ends_at', r.review_ends_at,
    'reset_not_eligible', v_reset));
end $$;

create or replace function public.shift_round_admin_set_role(p_email text, p_role text, p_round_id uuid, p_grant boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_global_staff(v_uid) then return shift_round_private.fail('forbidden'); end if;
  if p_role is null or p_role not in ('staff','mentor') then return shift_round_private.fail('invalid_field', 'role'); end if;
  if p_role = 'mentor' and p_round_id is null then return shift_round_private.fail('invalid_field', 'round_id'); end if;
  if p_round_id is not null and not exists (select 1 from public.shift_rounds r where r.id = p_round_id) then
    return shift_round_private.fail('invalid_field', 'round_id');
  end if;
  if p_grant is null then return shift_round_private.fail('invalid_field', 'grant'); end if;
  select u.id into v_target from auth.users u where lower(u.email) = lower(btrim(coalesce(p_email, ''))) limit 1;
  if v_target is null then return shift_round_private.fail('user_not_found', 'email'); end if;
  if p_grant then
    insert into public.shift_round_roles (user_id, round_id, role, granted_by)
    values (v_target, p_round_id, p_role, v_uid)
    on conflict do nothing;
  else
    if v_target = v_uid and p_role = 'staff' and p_round_id is null then
      return shift_round_private.fail('invalid_field', 'email', null, '{"rule":"cannot_remove_own_global_staff"}');
    end if;
    -- Web admins are global staff by decision (2026-10-13); deleting a grant row would not
    -- change their access, so say so instead of answering ok.
    if p_role = 'staff' and p_round_id is null
       and exists (select 1 from public.user_roles ur where ur.user_id = v_target and ur.role = 'admin') then
      return shift_round_private.fail('role_from_web_admin', 'email');
    end if;
    delete from public.shift_round_roles x
     where x.user_id = v_target and x.role = p_role and x.round_id is not distinct from p_round_id;
  end if;
  return shift_round_private.ok(jsonb_build_object('user_id', v_target, 'role', p_role, 'round_id', p_round_id, 'granted', p_grant));
end $$;

create or replace function public.shift_round_admin_allowlist(p_round_id uuid, p_add text[], p_remove text[]) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_count int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_staff(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if not exists (select 1 from public.shift_rounds r where r.id = p_round_id) then return shift_round_private.fail('round_not_found'); end if;
  foreach v_email in array coalesce(p_add, '{}') || coalesce(p_remove, '{}') loop
    if lower(btrim(v_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      return shift_round_private.fail('invalid_field', 'email', null, jsonb_build_object('email', v_email));
    end if;
  end loop;
  insert into public.shift_round_allowlist (round_id, email, source, added_by)
  select p_round_id, e, 'manual', v_uid from (select distinct lower(btrim(x)) as e from unnest(coalesce(p_add, '{}')) x) t
  on conflict (round_id, email) where email is not null do nothing;
  delete from public.shift_round_allowlist a
   where a.round_id = p_round_id and a.email = any (array(select lower(btrim(x)) from unnest(coalesce(p_remove, '{}')) x));
  select count(*) into v_count from public.shift_round_allowlist a where a.round_id = p_round_id;
  -- call with empty arrays to read the list
  return shift_round_private.ok(jsonb_build_object('count', v_count, 'entries', coalesce((
    select jsonb_agg(jsonb_build_object('email', coalesce(a.email, (select lower(u.email) from auth.users u where u.id = a.user_id)),
                                        'user_id', a.user_id, 'source', a.source, 'created_at', a.created_at)
                     order by a.created_at)
      from public.shift_round_allowlist a where a.round_id = p_round_id), '[]'::jsonb),
    'emails', coalesce((select jsonb_agg(a.email order by a.email) from public.shift_round_allowlist a
                         where a.round_id = p_round_id and a.email is not null), '[]'::jsonb)));
end $$;

create or replace function public.shift_round_admin_allowlist_import(p_round_id uuid, p_cohort text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_added int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_staff(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if not exists (select 1 from public.shift_rounds r where r.id = p_round_id) then return shift_round_private.fail('round_not_found'); end if;
  insert into public.shift_round_allowlist (round_id, user_id, source, added_by)
  select distinct p_round_id, a.user_id, 'applications', v_uid
    from public.shift_applications a
   where a.cohort = p_cohort and a.status = 'accepted' and a.user_id is not null
  on conflict (round_id, user_id) where user_id is not null do nothing;
  get diagnostics v_added = row_count;
  return shift_round_private.ok(jsonb_build_object('added', v_added));
end $$;

create or replace function public.shift_round_admin_entries(p_round_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.can_review(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  return shift_round_private.ok(jsonb_build_object('entries', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', e.id, 'user_id', e.user_id, 'handle', e.handle, 'track', e.track, 'beta_group', e.beta_group,
             'joined_at', e.joined_at, 'joined_day', e.joined_day, 'outcome', e.outcome,
             'guardian_required', e.guardian_required, 'has_legal_name', e.legal_name is not null,
             'summary_public', e.summary_public, 'retention_purged', e.retention_purged_at is not null,
             'missions', shift_round_private.mission_counts(e.id),
             'squad', shift_round_private.squad_of(e.id),
             'last_log_at', (select max(x.submitted_at) from public.shift_round_evidence x where x.entry_id = e.id),
             'active_days', (select count(distinct x.local_date) from public.shift_round_evidence x
                              where x.entry_id = e.id and x.status <> 'withdrawn'),
             'pending_review', (select count(*) from public.shift_round_evidence x
                                 where x.entry_id = e.id and x.status = 'submitted' and x.reviewed_at is null),
             'certificate', (select jsonb_build_object('id', c.id, 'public_id', c.public_id, 'status', c.status)
                               from public.shift_round_certificates c where c.entry_id = e.id))
           order by e.handle)
      from public.shift_round_entries e where e.round_id = p_round_id), '[]'::jsonb),
    'squads', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', s.id, 'name', s.name, 'mentor_user_id', s.mentor_user_id,
               'mentor_display_name', shift_round_private.display_name(s.mentor_user_id),
               'discord_url', s.discord_url,
               'member_entry_ids', coalesce((select jsonb_agg(sm.entry_id order by sm.added_at)
                                               from public.shift_round_squad_members sm where sm.squad_id = s.id), '[]'::jsonb))
             order by s.name)
        from public.shift_round_squads s where s.round_id = p_round_id), '[]'::jsonb),
    'squad_size', (select r.squad_size from public.shift_rounds r where r.id = p_round_id)));
end $$;

-- Lane D request: list who holds SHIFT roles (global staff + this round's staff/mentors).
-- source 'shift_round_roles' = a grant row (revocable); 'web_admin' = global staff because the
-- user is a web admin (decision 2026-10-13; not revocable here, managed on the Users page).
-- A web admin's own global-staff grant row is folded into their web_admin entry.
create or replace function public.shift_round_admin_roles(p_round_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if p_round_id is null then
    if not shift_round_private.is_global_staff(v_uid) then return shift_round_private.fail('forbidden'); end if;
  elsif not shift_round_private.is_staff(p_round_id, v_uid) then
    return shift_round_private.fail('forbidden');
  end if;
  return shift_round_private.ok(jsonb_build_object('roles', coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', t.user_id, 'email', (select u.email from auth.users u where u.id = t.user_id),
             'display_name', shift_round_private.display_name(t.user_id),
             'role', t.role, 'round_id', t.round_id, 'source', t.source)
           order by t.round_id nulls first, t.role, t.source, t.created_at)
      from (
        select x.user_id, x.role, x.round_id, 'shift_round_roles'::text as source, x.created_at
          from public.shift_round_roles x
         where (x.round_id is null or x.round_id = p_round_id)
           and not (x.round_id is null and x.role = 'staff'
                    and exists (select 1 from public.user_roles ur where ur.user_id = x.user_id and ur.role = 'admin'))
        union all
        select distinct on (ur.user_id) ur.user_id, 'staff', null::uuid, 'web_admin', null::timestamptz
          from public.user_roles ur
         where ur.role = 'admin'
      ) t), '[]'::jsonb)));
end $$;

create or replace function public.shift_round_admin_update_entry(p_entry_id uuid, p_patch jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  k text;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if not shift_round_private.is_staff(en.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then return shift_round_private.fail('invalid_field', 'patch'); end if;
  for k in select jsonb_object_keys(p_patch) loop
    if k not in ('track','beta_group') then return shift_round_private.fail('invalid_field', k); end if;
  end loop;
  if p_patch ? 'track' and (p_patch->>'track') is distinct from en.track then
    if p_patch->>'track' not in ('high_school','university') then return shift_round_private.fail('invalid_field', 'track'); end if;
    if exists (select 1 from public.shift_round_certificates c where c.entry_id = en.id) then
      return shift_round_private.fail('certificate_issued', 'track');
    end if;
  end if;
  if p_patch ? 'beta_group' and jsonb_typeof(p_patch->'beta_group') <> 'null'
     and p_patch->>'beta_group' not in ('alumni','new') then
    return shift_round_private.fail('invalid_field', 'beta_group');
  end if;
  perform 1 from public.shift_rounds r where r.id = en.round_id for share;
  en := shift_round_private.lock_entry(en.id);
  update public.shift_round_entries x
     set track = coalesce(p_patch->>'track', x.track),
         beta_group = case when p_patch ? 'beta_group' then p_patch->>'beta_group' else x.beta_group end
   where x.id = en.id
  returning * into en;
  return shift_round_private.ok(jsonb_build_object('entry', jsonb_build_object(
    'id', en.id, 'track', en.track, 'beta_group', en.beta_group)));
end $$;

create or replace function public.shift_round_admin_upsert_squad(
  p_round_id uuid, p_squad_id uuid, p_name text, p_mentor_user_id uuid, p_discord_url text
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_url text := nullif(btrim(coalesce(p_discord_url, '')), '');
  v_id uuid;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_staff(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if not exists (select 1 from public.shift_rounds r where r.id = p_round_id) then return shift_round_private.fail('round_not_found'); end if;
  if char_length(v_name) not between 1 and 40 then return shift_round_private.fail('invalid_field', 'name'); end if;
  if v_url is not null and v_url !~ '^https://(discord\.gg|discord\.com)/' then
    return shift_round_private.fail('invalid_field', 'discord_url');
  end if;
  if p_mentor_user_id is not null
     and not shift_round_private.has_round_role(p_round_id, p_mentor_user_id, array['staff','mentor']) then
    return shift_round_private.fail('mentor_not_in_round', 'mentor_user_id');
  end if;
  begin
    if p_squad_id is null then
      insert into public.shift_round_squads (round_id, name, mentor_user_id, discord_url, created_by)
      values (p_round_id, v_name, p_mentor_user_id, v_url, v_uid)
      returning id into v_id;
    else
      update public.shift_round_squads s
         set name = v_name, mentor_user_id = p_mentor_user_id, discord_url = v_url
       where s.id = p_squad_id and s.round_id = p_round_id
      returning s.id into v_id;
      if v_id is null then return shift_round_private.fail('wrong_round', 'squad_id'); end if;
    end if;
  exception when unique_violation then
    return shift_round_private.fail('invalid_field', 'name', null, '{"rule":"taken"}');
  end;
  return shift_round_private.ok(jsonb_build_object('squad_id', v_id));
end $$;

create or replace function public.shift_round_admin_assign_squad(p_entry_id uuid, p_squad_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  r public.shift_rounds;
  sq public.shift_round_squads;
  cur public.shift_round_squad_members;
  v_q smallint;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if not shift_round_private.is_staff(en.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  select x.* into r from public.shift_rounds x where x.id = en.round_id;
  if shift_round_private.phase_of(r) = 'finished' then return shift_round_private.fail('round_finished'); end if;
  select sm.* into cur from public.shift_round_squad_members sm where sm.entry_id = en.id;

  if p_squad_id is null then
    delete from public.shift_round_squad_members sm where sm.entry_id = en.id;
    return shift_round_private.ok(jsonb_build_object('squad_id', null, 'icebreaker_question', null));
  end if;

  select s.* into sq from public.shift_round_squads s where s.id = p_squad_id for update;
  if not found or sq.round_id <> en.round_id then return shift_round_private.fail('wrong_round', 'squad_id'); end if;
  if cur.squad_id = sq.id then
    return shift_round_private.ok(jsonb_build_object('squad_id', sq.id, 'icebreaker_question', cur.icebreaker_question, 'already', true));
  end if;
  if (select count(*) from public.shift_round_squad_members sm where sm.squad_id = sq.id) >= r.squad_size then
    return shift_round_private.fail('squad_full');
  end if;
  select q.id into v_q from public.shift_round_icebreaker_questions q
   where q.active and q.id not in (select sm.icebreaker_question from public.shift_round_squad_members sm where sm.squad_id = sq.id)
   order by random() limit 1;
  if v_q is null then
    select q.id into v_q from public.shift_round_icebreaker_questions q where q.active order by random() limit 1;
  end if;
  delete from public.shift_round_squad_members sm where sm.entry_id = en.id;
  insert into public.shift_round_squad_members (squad_id, entry_id, round_id, icebreaker_question, added_at)
  values (sq.id, en.id, en.round_id, v_q, shift_round_private.round_now());
  perform shift_round_private.emit('squad_assigned', en.round_id, en.id, en.user_id, v_uid,
    jsonb_build_object('squad_id', sq.id));
  return shift_round_private.ok(jsonb_build_object('squad_id', sq.id, 'icebreaker_question', v_q));
end $$;

create or replace function public.shift_round_admin_delete_squad(p_squad_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  sq public.shift_round_squads;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select s.* into sq from public.shift_round_squads s where s.id = p_squad_id;
  if not found then return shift_round_private.ok('{}'::jsonb); end if;
  if not shift_round_private.is_staff(sq.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  delete from public.shift_round_squads s where s.id = sq.id;
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_admin_review_queue(p_round_id uuid, p_filter jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  f jsonb := coalesce(p_filter, '{}'::jsonb);
  v_items jsonb;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.can_review(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  select x.* into r from public.shift_rounds x where x.id = p_round_id;
  if not found then return shift_round_private.fail('round_not_found'); end if;

  if coalesce((f->>'sample')::boolean, false) then
    -- T4 spot-check: per entry, its oldest unreviewed interview and tester.
    select coalesce(jsonb_agg(shift_round_private.admin_evidence_json(e, r) order by e.submitted_at), '[]'::jsonb)
      into v_items
      from (select distinct on (x.entry_id, x.type) x.*
              from public.shift_round_evidence x
             where x.round_id = p_round_id and x.type in ('interview','tester') and x.reviewed_at is null
               and x.status in ('submitted','accepted')
             order by x.entry_id, x.type, x.submitted_at) e;
  else
    select coalesce(jsonb_agg(shift_round_private.admin_evidence_json(e, r) order by e.submitted_at), '[]'::jsonb)
      into v_items
      from (select x.* from public.shift_round_evidence x
             where x.round_id = p_round_id
               and (f->>'status' is null or x.status = f->>'status')
               and (f->>'type' is null or x.type = f->>'type')
               and (f->>'squad_id' is null or exists (select 1 from public.shift_round_squad_members sm
                                                       where sm.entry_id = x.entry_id and sm.squad_id::text = f->>'squad_id'))
               and (not coalesce((f->>'unreviewed_only')::boolean, false) or x.reviewed_at is null)
             order by x.submitted_at
             limit least(coalesce((f->>'limit')::int, 200), 500)) e;
  end if;
  return shift_round_private.ok(jsonb_build_object('items', v_items));
end $$;

create or replace function public.shift_round_admin_entry_detail(p_entry_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  r public.shift_rounds;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if not shift_round_private.can_review(en.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  select x.* into r from public.shift_rounds x where x.id = en.round_id;
  return shift_round_private.ok(jsonb_build_object(
    'entry', to_jsonb(en) - 'birth_month' - 'birth_year' || jsonb_build_object('squad', shift_round_private.squad_of(en.id)),
    'round', shift_round_private.round_json(r),
    'missions', shift_round_private.mission_counts(en.id),
    'evidence', coalesce((select jsonb_agg(shift_round_private.admin_evidence_json(e, r) order by e.submitted_at)
                            from public.shift_round_evidence e where e.entry_id = en.id), '[]'::jsonb),
    'checkins', coalesce((select jsonb_agg(to_jsonb(c) order by c.submitted_at)
                            from public.shift_round_checkins c where c.entry_id = en.id), '[]'::jsonb),
    'summaries', coalesce((select jsonb_agg(to_jsonb(s) order by s.revision desc)
                             from public.shift_round_summary_revisions s where s.entry_id = en.id), '[]'::jsonb),
    'certificate', (select to_jsonb(c) from public.shift_round_certificates c where c.entry_id = en.id),
    'events', coalesce((select jsonb_agg(to_jsonb(ev) order by ev.id desc)
                          from (select * from public.shift_round_events x where x.entry_id = en.id
                                 order by x.id desc limit 300) ev), '[]'::jsonb)));
end $$;

-- Shared reject/accept core. p_to: 'rejected' or 'accepted'.
create or replace function shift_round_private.review_transition(
  p_uid uuid, p_evidence_id uuid, p_to text, p_reason_code text, p_note text, p_review_ms int
) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  e public.shift_round_evidence;
  r public.shift_rounds;
  v_before jsonb;
  v_after jsonb;
  v_invalidated jsonb;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select x.* into e from public.shift_round_evidence x where x.id = p_evidence_id;
  if not found then return shift_round_private.fail('evidence_not_found'); end if;
  if not shift_round_private.can_review(e.round_id, p_uid) then return shift_round_private.fail('forbidden'); end if;
  if p_to = 'rejected' and (p_reason_code is null or p_reason_code not in
       ('not_real_person','duplicate','missing_detail','wrong_mission','privacy','link_broken','other')) then
    return shift_round_private.fail('invalid_field', 'reason_code');
  end if;
  if v_note is not null and char_length(v_note) > 500 then return shift_round_private.fail('invalid_field', 'note'); end if;
  if p_review_ms is not null and p_review_ms < 0 then return shift_round_private.fail('invalid_field', 'review_ms'); end if;

  -- 2.6 lock order
  select x.* into r from public.shift_rounds x where x.id = e.round_id for share;
  perform shift_round_private.lock_entry(e.entry_id);
  select x.* into e from public.shift_round_evidence x where x.id = p_evidence_id for update;

  if shift_round_private.round_now() >= r.review_ends_at
     or exists (select 1 from public.shift_round_certificates c where c.entry_id = e.entry_id) then
    return shift_round_private.fail('review_closed');
  end if;
  if (p_to = 'rejected' and e.status <> 'submitted') or (p_to = 'accepted' and e.status <> 'rejected') then
    return shift_round_private.fail('invalid_transition', null, null, jsonb_build_object('from', e.status, 'to', p_to));
  end if;

  v_before := shift_round_private.mission_counts(e.entry_id);
  update public.shift_round_evidence x
     set status = p_to,
         status_reason_code = case when p_to = 'rejected' then p_reason_code else x.status_reason_code end,
         status_note = v_note,
         status_changed_at = shift_round_private.round_now(),
         status_changed_by = p_uid,
         reviewed_at = shift_round_private.round_now(),
         reviewed_by = p_uid
   where x.id = e.id;
  v_after := shift_round_private.mission_counts(e.entry_id);

  select coalesce(jsonb_agg(c.id), '[]'::jsonb) into v_invalidated
    from public.shift_round_evidence c
   where c.entry_id = e.entry_id and c.type = 'change' and c.source_evidence_id = e.id
     and shift_round_private.change_invalidated(c, r);

  perform shift_round_private.emit(case when p_to = 'rejected' then 'evidence_rejected' else 'evidence_accepted' end,
    e.round_id, e.entry_id, e.user_id, p_uid,
    jsonb_build_object('evidence_id', e.id, 'type', e.type, 'reason_code', p_reason_code, 'review_ms', p_review_ms,
                       'invalidated_changes', v_invalidated));
  return shift_round_private.ok(jsonb_build_object(
    'missions', v_after,
    'dropped', to_jsonb(array(select k from unnest(shift_round_private.completed_keys(v_before)) k
                               where not (k = any (shift_round_private.completed_keys(v_after))))),
    'affected', shift_round_private.mission_diff(v_before, v_after),
    'invalidated_changes', v_invalidated));
end $$;

create or replace function public.shift_round_admin_reject_evidence(p_evidence_id uuid, p_reason_code text, p_note text, p_review_ms int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  return shift_round_private.review_transition(v_uid, p_evidence_id, 'rejected', p_reason_code, p_note, p_review_ms);
end $$;

create or replace function public.shift_round_admin_accept_evidence(p_evidence_id uuid, p_note text, p_review_ms int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  return shift_round_private.review_transition(v_uid, p_evidence_id, 'accepted', null, p_note, p_review_ms);
end $$;

create or replace function public.shift_round_admin_mark_reviewed(p_evidence_id uuid, p_review_ms int) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  e public.shift_round_evidence;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into e from public.shift_round_evidence x where x.id = p_evidence_id;
  if not found then return shift_round_private.fail('evidence_not_found'); end if;
  if not shift_round_private.can_review(e.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  update public.shift_round_evidence x set reviewed_at = shift_round_private.round_now(), reviewed_by = v_uid
   where x.id = e.id;
  perform shift_round_private.emit('evidence_reviewed', e.round_id, e.entry_id, e.user_id, v_uid,
    jsonb_build_object('evidence_id', e.id, 'type', e.type, 'review_ms', p_review_ms));
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_admin_summaries(p_round_id uuid, p_status text default 'pending') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.can_review(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  return shift_round_private.ok(jsonb_build_object('revisions', coalesce((
    select jsonb_agg(to_jsonb(s) || jsonb_build_object(
             'entry', jsonb_build_object('id', en.id, 'handle', en.handle, 'summary_public', en.summary_public),
             'public_revision', (select to_jsonb(p) from public.shift_round_summary_revisions p
                                  where p.entry_id = en.id and p.status = 'approved'))
           order by s.created_at)
      from public.shift_round_summary_revisions s
      join public.shift_round_entries en on en.id = s.entry_id
     where en.round_id = p_round_id and (p_status is null or s.status = p_status)), '[]'::jsonb)));
end $$;

create or replace function public.shift_round_admin_decide_summary(p_revision_id uuid, p_decision text, p_reason text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.shift_round_summary_revisions;
  en public.shift_round_entries;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_status text;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into s from public.shift_round_summary_revisions x where x.id = p_revision_id;
  if not found then return shift_round_private.fail('invalid_field', 'revision_id'); end if;
  select x.* into en from public.shift_round_entries x where x.id = s.entry_id;
  if not shift_round_private.can_review(en.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if p_decision is null or p_decision not in ('approve','reject') then return shift_round_private.fail('invalid_field', 'decision'); end if;
  if p_decision = 'reject' and v_reason is null then return shift_round_private.fail('invalid_field', 'reason'); end if;
  if v_reason is not null and char_length(v_reason) > 300 then return shift_round_private.fail('invalid_field', 'reason'); end if;
  perform shift_round_private.lock_entry(en.id);
  select x.* into s from public.shift_round_summary_revisions x where x.id = p_revision_id for update;
  if s.status <> 'pending' then return shift_round_private.fail('invalid_transition'); end if;
  v_status := case when p_decision = 'approve' then 'approved' else 'rejected' end;
  if v_status = 'approved' then
    update public.shift_round_summary_revisions x set status = 'superseded'
     where x.entry_id = en.id and x.status = 'approved';
  end if;
  update public.shift_round_summary_revisions x
     set status = v_status, decided_by = v_uid, decided_at = shift_round_private.round_now(), decision_reason = v_reason
   where x.id = s.id;
  if v_status = 'approved' then
    update public.shift_round_certificates c set render_version = c.render_version + 1
     where c.entry_id = en.id and c.tombstoned_at is null;
  end if;
  perform shift_round_private.emit(case when v_status = 'approved' then 'summary_approved' else 'summary_rejected' end,
    en.round_id, en.id, en.user_id, v_uid, jsonb_build_object('revision_id', s.id, 'revision', s.revision));
  return shift_round_private.ok(jsonb_build_object('status', v_status));
end $$;

create or replace function public.shift_round_admin_take_down_summary(p_entry_id uuid, p_reason text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_id uuid;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if not shift_round_private.is_staff(en.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if v_reason is null or char_length(v_reason) > 300 then return shift_round_private.fail('invalid_field', 'reason'); end if;
  perform shift_round_private.lock_entry(en.id);
  update public.shift_round_summary_revisions x
     set status = 'taken_down', decided_by = v_uid, decided_at = shift_round_private.round_now(), decision_reason = v_reason
   where x.entry_id = en.id and x.status = 'approved'
  returning x.id into v_id;
  if v_id is null then return shift_round_private.fail('invalid_transition'); end if;
  update public.shift_round_certificates c set render_version = c.render_version + 1
   where c.entry_id = en.id and c.tombstoned_at is null;
  perform shift_round_private.emit('summary_taken_down', en.round_id, en.id, en.user_id, v_uid,
    jsonb_build_object('revision_id', v_id));
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_admin_certificates(p_round_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_staff(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  return shift_round_private.ok(jsonb_build_object(
    'certificates', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'public_id', c.public_id, 'entry_id', c.entry_id, 'status', c.status,
               'tombstone', c.tombstoned_at is not null, 'issued_at', c.issued_at, 'revoked_at', c.revoked_at,
               'revoke_reason', c.revoke_reason, 'revoke_note', c.revoke_note, 'render_version', c.render_version,
               'holder', c.snapshot->'holder', 'verify_url', shift_round_private.verify_url(c.public_id))
             order by c.issued_at)
        from public.shift_round_certificates c where c.round_id = p_round_id), '[]'::jsonb),
    'outcomes', coalesce((
      select jsonb_object_agg(x.outcome, x.n) from (
        select e.outcome, count(*) as n from public.shift_round_entries e where e.round_id = p_round_id group by e.outcome) x),
      '{}'::jsonb),
    'last_issue_run', (select to_jsonb(j) from public.shift_round_job_runs j where j.job = 'issue'
                        order by j.started_at desc limit 1)));
end $$;

create or replace function public.shift_round_admin_revoke_certificate(p_certificate_id uuid, p_reason text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  c public.shift_round_certificates;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into c from public.shift_round_certificates x where x.id = p_certificate_id;
  if not found then return shift_round_private.fail('certificate_not_found'); end if;
  if not shift_round_private.can_review(c.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  if v_reason is not null and char_length(v_reason) > 300 then return shift_round_private.fail('invalid_field', 'reason'); end if;
  perform 1 from public.shift_rounds r where r.id = c.round_id for share;
  if c.entry_id is not null then perform shift_round_private.lock_entry(c.entry_id); end if;
  select x.* into c from public.shift_round_certificates x where x.id = p_certificate_id for update;
  if c.status <> 'issued' then return shift_round_private.fail('invalid_transition'); end if;
  update public.shift_round_certificates x
     set status = 'revoked', revoked_at = shift_round_private.round_now(), revoked_by = v_uid,
         revoke_reason = 'staff', revoke_note = v_reason, render_version = x.render_version + 1
   where x.id = c.id
  returning * into c;
  perform shift_round_private.emit('certificate_revoked', c.round_id, c.entry_id, c.user_id, v_uid,
    jsonb_build_object('certificate_id', c.id));
  return shift_round_private.ok(jsonb_build_object('status', c.status, 'render_version', c.render_version));
end $$;

create or replace function public.shift_round_admin_reinstate_certificate(p_certificate_id uuid, p_note text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  c public.shift_round_certificates;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into c from public.shift_round_certificates x where x.id = p_certificate_id;
  if not found then return shift_round_private.fail('certificate_not_found'); end if;
  if not shift_round_private.is_staff(c.round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  perform 1 from public.shift_rounds r where r.id = c.round_id for share;
  if c.entry_id is not null then perform shift_round_private.lock_entry(c.entry_id); end if;
  select x.* into c from public.shift_round_certificates x where x.id = p_certificate_id for update;
  if c.tombstoned_at is not null then return shift_round_private.fail('certificate_tombstoned'); end if;
  if c.status <> 'revoked' then return shift_round_private.fail('invalid_transition'); end if;
  update public.shift_round_certificates x
     set status = 'issued', revoked_at = null, revoked_by = null, revoke_reason = null, revoke_note = null,
         render_version = x.render_version + 1
   where x.id = c.id
  returning * into c;
  perform shift_round_private.emit('certificate_reinstated', c.round_id, c.entry_id, c.user_id, v_uid,
    jsonb_build_object('certificate_id', c.id, 'has_note', nullif(btrim(coalesce(p_note, '')), '') is not null));
  return shift_round_private.ok(jsonb_build_object('status', c.status, 'render_version', c.render_version));
end $$;

create or replace function public.shift_round_admin_dashboard(p_round_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  v_entrants int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.can_review(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  select x.* into r from public.shift_rounds x where x.id = p_round_id;
  if not found then return shift_round_private.fail('round_not_found'); end if;
  select count(*) into v_entrants from public.shift_round_entries e where e.round_id = r.id;
  return shift_round_private.ok(jsonb_build_object(
    'round', shift_round_private.round_json(r),
    'entrants', v_entrants,
    'entrants_by_track', coalesce((select jsonb_object_agg(t, n) from (
        select e.track as t, count(*) as n from public.shift_round_entries e where e.round_id = r.id group by e.track) x), '{}'::jsonb),
    'entrants_by_group', coalesce((select jsonb_object_agg(coalesce(g, 'unset'), n) from (
        select e.beta_group as g, count(*) as n from public.shift_round_entries e where e.round_id = r.id group by e.beta_group) x), '{}'::jsonb),
    'joins_per_day', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'n', n) order by d) from (
        select shift_round_private.local_date(e.joined_at) as d, count(*) as n
          from public.shift_round_entries e where e.round_id = r.id group by 1) x), '[]'::jsonb),
    'logs_per_day', coalesce((select jsonb_agg(jsonb_build_object('date', d, 'type', t, 'n', n) order by d, t) from (
        select e.local_date as d, e.type as t, count(*) as n
          from public.shift_round_evidence e where e.round_id = r.id and e.status <> 'withdrawn' group by 1, 2) x), '[]'::jsonb),
    'pending_review', (select count(*) from public.shift_round_evidence e
                        where e.round_id = r.id and e.status = 'submitted' and e.reviewed_at is null),
    'rejection_rate', (select case when count(*) = 0 then 0
                              else round(count(*) filter (where e.status = 'rejected')::numeric / count(*), 4) end
                         from public.shift_round_evidence e where e.round_id = r.id and e.status <> 'withdrawn'),
    'mission_distribution', (select jsonb_object_agg(k::text, coalesce(n, 0))
                               from generate_series(0, jsonb_array_length(r.missions)) k
                               left join (select (shift_round_private.mission_counts(e.id)->>'missions_complete')::int as m, count(*) as n
                                            from public.shift_round_entries e where e.round_id = r.id group by 1) x on x.m = k),
    'entrants_4_active_days', (select count(*) from (
        select e.entry_id from public.shift_round_evidence e where e.round_id = r.id and e.status <> 'withdrawn'
         group by e.entry_id having count(distinct e.local_date) >= 4) x),
    'certificates_issued', (select count(*) from public.shift_round_certificates c where c.round_id = r.id and c.status = 'issued'),
    'certificates_revoked', (select count(*) from public.shift_round_certificates c where c.round_id = r.id and c.status = 'revoked'),
    'share_visits', (select count(*) from public.shift_round_events ev
                      where ev.round_id = r.id and ev.name = 'certificate_visit' and ev.props->>'ref' = 'share'),
    'review_minutes_per_entrant', (select case when v_entrants = 0 then 0
        else round(coalesce(sum((ev.props->>'review_ms')::numeric), 0) / 60000.0 / v_entrants, 2) end
        from public.shift_round_events ev
       where ev.round_id = r.id and ev.name in ('evidence_rejected','evidence_accepted','evidence_reviewed')
         and jsonb_typeof(ev.props->'review_ms') = 'number'),
    'next_round_joins', (select count(distinct e2.user_id) from public.shift_round_entries e1
                           join public.shift_round_entries e2 on e2.user_id = e1.user_id
                           join public.shift_rounds r2 on r2.id = e2.round_id
                          where e1.round_id = r.id and r2.starts_at > r.starts_at),
    'non_alumni_4_missions', (select count(*) from public.shift_round_entries e
                               where e.round_id = r.id and e.beta_group is distinct from 'alumni'
                                 and (shift_round_private.mission_counts(e.id)->>'missions_complete')::int >= 4),
    'jobs', coalesce((select jsonb_object_agg(j.job, jsonb_build_object('status', j.status, 'started_at', j.started_at,
                                                                         'finished_at', j.finished_at, 'error', j.error))
                        from (select distinct on (x.job) x.* from public.shift_round_job_runs x
                               order by x.job, x.started_at desc) j), '{}'::jsonb)));
end $$;

create or replace function public.shift_round_admin_set_config(p_key text, p_value jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v jsonb := coalesce(p_value, 'null'::jsonb);
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_global_staff(v_uid) then return shift_round_private.fail('forbidden'); end if;
  if p_key in ('shift_round.tab_enabled','shift_round.enrollment_enabled','shift_round.submissions_enabled',
               'shift_round.transcription_enabled','shift_round.issuance_enabled','shift_round.nudges_enabled') then
    if jsonb_typeof(v) <> 'boolean' then return shift_round_private.fail('invalid_field', 'value'); end if;
  elsif p_key = 'shift_round.emergency_message' then
    if jsonb_typeof(v) <> 'null' and (
         jsonb_typeof(v) <> 'object'
         or exists (select 1 from jsonb_object_keys(v) k where k not in ('th','en','url'))
         or jsonb_typeof(v->'th') is distinct from 'string' or jsonb_typeof(v->'en') is distinct from 'string'
         or char_length(v->>'th') not between 1 and 200 or char_length(v->>'en') not between 1 and 200
         or (v ? 'url' and not shift_round_private.is_https_url(v->>'url'))) then
      return shift_round_private.fail('invalid_field', 'value');
    end if;
  elsif p_key = 'shift_round.web_base_url' then
    if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^https://[^[:space:]/]+(/[^[:space:]]*)?$' then
      return shift_round_private.fail('invalid_field', 'value');
    end if;
  else
    return shift_round_private.fail('invalid_field', 'key');
  end if;
  insert into public.app_config (key, value, updated_at, updated_by) values (p_key, v, now(), v_uid)
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  return shift_round_private.ok(jsonb_build_object('key', p_key, 'value', v));
end $$;

create or replace function public.shift_round_admin_jobs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.is_global_staff(v_uid) then return shift_round_private.fail('forbidden'); end if;
  return shift_round_private.ok(jsonb_build_object(
    'last_runs', coalesce((select jsonb_agg(to_jsonb(j) order by j.job)
                             from (select distinct on (x.job) x.* from public.shift_round_job_runs x
                                    order by x.job, x.started_at desc) j), '[]'::jsonb),
    'last_ok', coalesce((select jsonb_object_agg(x.job, x.at) from (
                           select j.job, max(j.finished_at) as at from public.shift_round_job_runs j
                            where j.status = 'ok' group by j.job) x), '{}'::jsonb),
    'failures_7d', coalesce((select jsonb_agg(to_jsonb(j) order by j.started_at desc)
                               from public.shift_round_job_runs j
                              where j.status = 'failed' and j.started_at > now() - interval '7 days'), '[]'::jsonb),
    'deletion_queue', (select jsonb_build_object(
                          'queued', count(*) filter (where d.status = 'queued'),
                          'failed', count(*) filter (where d.status = 'failed'))
                         from public.shift_round_deletion_requests d)));
end $$;

-- v2 2.4: mark live-session attendance for one session day. p_marks:
-- [{"entry_id": uuid, "status": "present"|"makeup"|"absent"|null}] (null clears the mark).
-- Reviewer gate (round staff/mentors, global staff, web admins): mentors run the sessions.
-- The whole batch is validated before any write; one attendance_marked audit event per call.
create or replace function public.shift_round_admin_mark_attendance(p_round_id uuid, p_day int, p_marks jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  m jsonb;
  v_entry uuid;
  v_status text;
  v_seen uuid[] := '{}';
  v_set int := 0;
  v_cleared int := 0;
  v_log jsonb := '[]'::jsonb;
  v_now timestamptz := shift_round_private.round_now();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.can_review(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  select x.* into r from public.shift_rounds x where x.id = p_round_id;
  if not found then return shift_round_private.fail('round_not_found'); end if;
  if p_day is null or not (p_day = any (r.session_days)) then
    return shift_round_private.fail('invalid_field', 'day', null, '{"rule":"not_session_day"}');
  end if;
  -- Marks open when the session starts (mentors mark during it); never ahead of time.
  if ((shift_round_private.local_date(r.starts_at) + (p_day - 1)) + r.session_start) at time zone 'Asia/Bangkok' > v_now then
    return shift_round_private.fail('invalid_field', 'day', null, '{"rule":"not_started"}');
  end if;
  if p_marks is null or jsonb_typeof(p_marks) <> 'array' or jsonb_array_length(p_marks) not between 1 and 500 then
    return shift_round_private.fail('invalid_field', 'marks', null, '{"rule":"shape"}');
  end if;

  for m in select * from jsonb_array_elements(p_marks) loop
    if jsonb_typeof(m) <> 'object' or not (m ? 'entry_id') or not (m ? 'status')
       or exists (select 1 from jsonb_object_keys(m) k where k not in ('entry_id','status'))
       or jsonb_typeof(m->'entry_id') <> 'string' then
      return shift_round_private.fail('invalid_field', 'marks', null, '{"rule":"shape"}');
    end if;
    begin
      v_entry := (m->>'entry_id')::uuid;
    exception when others then
      return shift_round_private.fail('invalid_field', 'marks', null, '{"rule":"entry_id"}');
    end;
    if jsonb_typeof(m->'status') <> 'null'
       and (jsonb_typeof(m->'status') <> 'string' or (m->>'status') not in ('present','makeup','absent')) then
      return shift_round_private.fail('invalid_field', 'marks', null, '{"rule":"status"}');
    end if;
    if v_entry = any (v_seen) then
      return shift_round_private.fail('invalid_field', 'marks', null, jsonb_build_object('rule', 'duplicate', 'entry_id', v_entry));
    end if;
    v_seen := v_seen || v_entry;
    if not exists (select 1 from public.shift_round_entries e where e.id = v_entry and e.round_id = r.id) then
      return shift_round_private.fail('wrong_round', 'entry_id', null, jsonb_build_object('entry_id', v_entry));
    end if;
  end loop;

  for m in select * from jsonb_array_elements(p_marks) loop
    v_entry := (m->>'entry_id')::uuid;
    v_status := m->>'status';
    if v_status is null then
      delete from public.shift_round_attendance a where a.entry_id = v_entry and a.day = p_day;
      if found then v_cleared := v_cleared + 1; end if;
    else
      insert into public.shift_round_attendance (entry_id, round_id, day, status, marked_by, marked_at)
      values (v_entry, r.id, p_day, v_status, v_uid, v_now)
      on conflict (entry_id, day) do update
        set status = excluded.status, marked_by = excluded.marked_by, marked_at = excluded.marked_at;
      v_set := v_set + 1;
    end if;
    v_log := v_log || jsonb_build_array(jsonb_build_object('entry_id', v_entry, 'status', v_status));
  end loop;

  perform shift_round_private.emit('attendance_marked', r.id, null, null, v_uid,
    jsonb_build_object('day', p_day, 'set', v_set, 'cleared', v_cleared, 'marks', v_log));
  return shift_round_private.ok(jsonb_build_object(
    'day', p_day, 'set', v_set, 'cleared', v_cleared,
    'attendance', coalesce((select jsonb_agg(jsonb_build_object('entry_id', a.entry_id, 'status', a.status,
                                                                'marked_at', a.marked_at) order by a.entry_id)
                              from public.shift_round_attendance a where a.round_id = r.id and a.day = p_day),
                           '[]'::jsonb)));
end $$;

-- v2 2.8: the 9-step read model, one row per entry: {entry_id, user_id, handle, display_name,
-- squad_id, squad_name, joined_day, last_log_at, counts (mission_counts json), attendance:[{day,status}]}.
-- display_name (profiles full_name/username) only for round staff; mentors get null.
create or replace function public.shift_round_admin_steps(p_round_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  v_staff boolean;
  v_now timestamptz := shift_round_private.round_now();
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.can_review(p_round_id, v_uid) then return shift_round_private.fail('forbidden'); end if;
  select x.* into r from public.shift_rounds x where x.id = p_round_id;
  if not found then return shift_round_private.fail('round_not_found'); end if;
  v_staff := shift_round_private.is_staff(p_round_id, v_uid);
  return shift_round_private.ok(jsonb_build_object(
    'now', v_now,
    'round', jsonb_build_object(
      'id', r.id, 'number', r.number, 'phase', shift_round_private.phase_of(r),
      'day', shift_round_private.day_of(r, v_now), 'duration_days', shift_round_private.effective_days(r),
      'starts_at', r.starts_at, 'closes_at', r.closes_at,
      'session_days', to_jsonb(r.session_days),
      'session_start', to_char(r.session_start, 'HH24:MI'), 'session_end', to_char(r.session_end, 'HH24:MI'),
      'missions', r.missions, 'curriculum_key', r.curriculum_key),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'entry_id', e.id, 'user_id', e.user_id, 'handle', e.handle,
               'display_name', case when v_staff then (
                   select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.username), ''))
                     from public.profiles p where p.id = e.user_id) end,
               'squad_id', sm.squad_id, 'squad_name', s.name,
               'joined_day', e.joined_day,
               'last_log_at', (select max(x.submitted_at) from public.shift_round_evidence x where x.entry_id = e.id),
               'counts', shift_round_private.mission_counts(e.id),
               'attendance', coalesce((select jsonb_agg(jsonb_build_object('day', a.day, 'status', a.status) order by a.day)
                                         from public.shift_round_attendance a where a.entry_id = e.id), '[]'::jsonb))
             order by e.handle, e.id)
        from public.shift_round_entries e
        left join public.shift_round_squad_members sm on sm.entry_id = e.id
        left join public.shift_round_squads s on s.id = sm.squad_id
       where e.round_id = r.id), '[]'::jsonb)));
end $$;

-- Privileges
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

do $$
declare f text;
begin
  foreach f in array array[
    'public.shift_round_admin_rounds()',
    'public.shift_round_admin_roles(uuid)',
    'public.shift_round_admin_create_round(jsonb)',
    'public.shift_round_admin_update_round(uuid,jsonb)',
    'public.shift_round_admin_extend_round(uuid,int,text)',
    'public.shift_round_admin_set_role(text,text,uuid,boolean)',
    'public.shift_round_admin_allowlist(uuid,text[],text[])',
    'public.shift_round_admin_allowlist_import(uuid,text)',
    'public.shift_round_admin_entries(uuid)',
    'public.shift_round_admin_update_entry(uuid,jsonb)',
    'public.shift_round_admin_upsert_squad(uuid,uuid,text,uuid,text)',
    'public.shift_round_admin_assign_squad(uuid,uuid)',
    'public.shift_round_admin_delete_squad(uuid)',
    'public.shift_round_admin_review_queue(uuid,jsonb)',
    'public.shift_round_admin_entry_detail(uuid)',
    'public.shift_round_admin_reject_evidence(uuid,text,text,int)',
    'public.shift_round_admin_accept_evidence(uuid,text,int)',
    'public.shift_round_admin_mark_reviewed(uuid,int)',
    'public.shift_round_admin_summaries(uuid,text)',
    'public.shift_round_admin_decide_summary(uuid,text,text)',
    'public.shift_round_admin_take_down_summary(uuid,text)',
    'public.shift_round_admin_certificates(uuid)',
    'public.shift_round_admin_revoke_certificate(uuid,text)',
    'public.shift_round_admin_reinstate_certificate(uuid,text)',
    'public.shift_round_admin_dashboard(uuid)',
    'public.shift_round_admin_set_config(text,jsonb)',
    'public.shift_round_admin_jobs()',
    'public.shift_round_admin_mark_attendance(uuid,int,jsonb)',
    'public.shift_round_admin_steps(uuid)']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
