-- SHIFT rounds (beta), part 4: job RPCs (3.5), invoke_job and pg_cron schedules (4.1).
-- Job RPCs are executable by service_role only (the shift-round-jobs edge function).
-- They take no time arguments; all time comes from round_now().

create or replace function public.shift_round_job_start(p_job text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_job is null or p_job not in ('issue','purge','nudges','pushes','media_scan','watchdog') then
    return shift_round_private.fail('invalid_field', 'job');
  end if;
  insert into public.shift_round_job_runs (job) values (p_job) returning id into v_id;
  return shift_round_private.ok(jsonb_build_object('run_id', v_id,
    'last_ok_at', (select max(j.finished_at) from public.shift_round_job_runs j where j.job = p_job and j.status = 'ok')));
end $$;

create or replace function public.shift_round_job_finish(
  p_run_id uuid, p_status text, p_due int, p_processed int, p_error text, p_details jsonb
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_status is null or p_status not in ('ok','failed') then return shift_round_private.fail('invalid_field', 'status'); end if;
  update public.shift_round_job_runs j
     set status = p_status, finished_at = now(), due_count = p_due, processed_count = p_processed,
         error = left(p_error, 2000), details = coalesce(p_details, '{}'::jsonb)
   where j.id = p_run_id;
  if not found then return shift_round_private.fail('invalid_field', 'run_id'); end if;
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_job_due_entries(p_limit int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return shift_round_private.ok(jsonb_build_object('entry_ids', coalesce((
    select jsonb_agg(x.id) from (
      select e.id from public.shift_round_entries e join public.shift_rounds r on r.id = e.round_id
       where e.outcome = 'in_progress' and r.status = 'published'
         and shift_round_private.round_now() >= r.review_ends_at
         and not exists (select 1 from public.shift_round_certificates c where c.entry_id = e.id)
       order by r.review_ends_at, e.id
       limit greatest(1, least(coalesce(p_limit, 200), 1000))) x), '[]'::jsonb)));
end $$;

-- 80-bit Crockford base32 public id (16 chars, no I L O U).
create or replace function shift_round_private.new_public_id() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  bits bit(80) := ('x' || encode(extensions.gen_random_bytes(10), 'hex'))::bit(80);
  out_id text := '';
  i int;
begin
  for i in 0..15 loop
    out_id := out_id || substr(alphabet, substring(bits from i * 5 + 1 for 5)::int + 1, 1);
  end loop;
  return out_id;
end $$;

create or replace function public.shift_round_job_issue_entry(p_entry_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  en public.shift_round_entries;
  r public.shift_rounds;
  m jsonb;
  v_now timestamptz := shift_round_private.round_now();
  v_public text;
  v_cert uuid;
  v_snapshot jsonb;
  i int;
begin
  select e.round_id into r.id from public.shift_round_entries e where e.id = p_entry_id;
  if r.id is null then return shift_round_private.ok(jsonb_build_object('result', 'skipped', 'reason', 'entry_not_found')); end if;
  -- 2.6 lock order: round share -> entry update
  select x.* into r from public.shift_rounds x where x.id = r.id for share;
  en := shift_round_private.lock_entry(p_entry_id);
  if en.id is null then return shift_round_private.ok(jsonb_build_object('result', 'skipped', 'reason', 'entry_not_found')); end if;
  if en.outcome <> 'in_progress' or exists (select 1 from public.shift_round_certificates c where c.entry_id = en.id) then
    return shift_round_private.ok(jsonb_build_object('result', 'skipped', 'reason', 'final'));
  end if;
  if r.status <> 'published' or v_now < r.review_ends_at then
    return shift_round_private.ok(jsonb_build_object('result', 'skipped', 'reason', 'not_due'));
  end if;

  m := shift_round_private.mission_counts(en.id);
  if not (m->>'eligible')::boolean then
    update public.shift_round_entries e set outcome = 'not_eligible', finalized_at = v_now where e.id = en.id;
    perform shift_round_private.emit('certificate_not_eligible', r.id, en.id, en.user_id, null,
      jsonb_build_object('missions_complete', (m->>'missions_complete')::int));
    return shift_round_private.ok(jsonb_build_object('result', 'not_eligible'));
  end if;

  for i in 1..5 loop
    v_public := shift_round_private.new_public_id();
    exit when not exists (select 1 from public.shift_round_certificates c where c.public_id = v_public);
  end loop;
  v_snapshot := jsonb_build_object(
    'v', 1,
    'issuer', 'Passion Seed',
    'public_id', v_public,
    'round', jsonb_build_object('number', r.number, 'title_th', r.title_th, 'title_en', r.title_en,
      'starts_on', shift_round_private.local_date(r.starts_at),
      'closes_on', shift_round_private.local_date(r.closes_at) - 1),
    'track', en.track,
    'holder', jsonb_build_object('handle', en.handle,
      'legal_name', case when en.name_display = 'legal' then en.legal_name end,
      'display', case when en.name_display = 'legal' and en.legal_name is not null then 'legal' else 'handle' end),
    'missions', jsonb_build_array('first_contact','interviews_problem','mvp','testers','change','demo_post'),
    'counts', jsonb_build_object('people_talked_to', (m->>'people_talked_to')::int,
      'interviews', (m->'counts'->>'interviews')::int, 'testers', (m->'counts'->>'testers')::int,
      'changes', (m->'counts'->>'changes')::int),
    'issued_at', shift_round_private.iso_ict(v_now));

  insert into public.shift_round_certificates (public_id, round_id, entry_id, user_id, status, snapshot,
    review_ends_at, issued_at)
  values (v_public, r.id, en.id, en.user_id, 'issued', v_snapshot, r.review_ends_at, v_now)
  on conflict (entry_id) do nothing
  returning id into v_cert;
  if v_cert is null then
    return shift_round_private.ok(jsonb_build_object('result', 'skipped', 'reason', 'final'));
  end if;
  update public.shift_round_entries e set outcome = 'certified', finalized_at = v_now where e.id = en.id;
  perform shift_round_private.emit('certificate_issued', r.id, en.id, en.user_id, null,
    jsonb_build_object('certificate_id', v_cert));
  return shift_round_private.ok(jsonb_build_object('result', 'issued', 'certificate_id', v_cert, 'public_id', v_public));
end $$;

-- Push copy params helper.
create or replace function shift_round_private.push_target(p_uid uuid, p_require_nudges boolean)
returns table (token text, lang text)
language sql stable set search_path = '' as $$
  select p.expo_push_token, coalesce(p.shift_round_language, 'th')
    from public.profiles p
   where p.id = p_uid
     and p.expo_push_token is not null and btrim(p.expo_push_token) <> ''
     and coalesce(p.mobile_settings->>'push_enabled', 'false') = 'true'
     and (not p_require_nudges or p.shift_round_nudges)
$$;

create or replace function public.shift_round_job_push_candidates(p_job text, p_limit int default 500) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_now timestamptz := shift_round_private.round_now();
  v_today date := shift_round_private.local_date(shift_round_private.round_now());
  v_hour int := extract(hour from (shift_round_private.round_now() at time zone 'Asia/Bangkok'))::int;
  v_limit int := greatest(1, least(coalesce(p_limit, 500), 1000));
  v_out jsonb := '[]'::jsonb;
  c record;
  t record;
  v_id uuid;
  v_kind text;
  v_params jsonb;
  v_remaining int;
  v_day int;
begin
  if p_job not in ('nudges','pushes') then return shift_round_private.fail('invalid_field', 'job'); end if;

  if p_job = 'nudges' then
    if not shift_round_private.flag_on('shift_round.nudges_enabled', false) then
      return shift_round_private.ok(jsonb_build_object('candidates', '[]'::jsonb, 'paused', true));
    end if;
    update public.shift_round_nudge_ledger l set status = 'abandoned', updated_at = now()
     where l.status = 'failed' and l.kind in ('no_evidence','closing_tomorrow')
       and (l.attempts >= 3 or l.dedupe_key <> v_today::text);
    for c in
      select e.id as entry_id, e.user_id, r.id as round_id, r.number, r.closes_at,
             shift_round_private.day_of(r, v_now) as d, shift_round_private.effective_days(r) as last_day
        from public.shift_round_entries e join public.shift_rounds r on r.id = e.round_id
       where r.status = 'published' and shift_round_private.phase_of(r) = 'active'
         and extract(hour from r.nudge_local_time)::int = v_hour
       order by e.id
    loop
      exit when jsonb_array_length(v_out) >= v_limit;
      v_remaining := 6 - (shift_round_private.mission_counts(c.entry_id)->>'missions_complete')::int;
      continue when v_remaining = 0;
      select * into t from shift_round_private.push_target(c.user_id, true);
      continue when t.token is null;
      if c.d = c.last_day - 1 then
        v_kind := 'closing_tomorrow';
      elsif not exists (select 1 from public.shift_round_evidence x where x.entry_id = c.entry_id and x.local_date = v_today) then
        v_kind := 'no_evidence';
      else
        continue;
      end if;
      v_params := jsonb_build_object('n', v_remaining, 'round_number', c.number,
        'last_day', c.d = c.last_day, 'url', 'passion-seed://round',
        'copy_key', case when v_kind = 'closing_tomorrow' then 'push.closing_tomorrow'
                         when c.d = c.last_day then 'push.no_evidence_last_day' else 'push.no_evidence' end);
      v_id := null;
      insert into public.shift_round_nudge_ledger (user_id, round_id, kind, dedupe_key, expo_token, params)
      values (c.user_id, c.round_id, v_kind, v_today::text, t.token, v_params)
      on conflict (user_id, kind, dedupe_key) do nothing
      returning id into v_id;
      if v_id is not null then
        v_out := v_out || jsonb_build_array(jsonb_build_object('ledger_id', v_id, 'user_id', c.user_id, 'token', t.token,
          'lang', t.lang, 'kind', v_kind, 'params', v_params));
      end if;
    end loop;
    -- same-day retries of failed nudges (max 3 attempts)
    for c in
      update public.shift_round_nudge_ledger l set status = 'pending', updated_at = now()
       where l.status = 'failed' and l.kind in ('no_evidence','closing_tomorrow') and l.attempts < 3
         and l.dedupe_key = v_today::text
      returning l.*
    loop
      select * into t from shift_round_private.push_target(c.user_id, true);
      if t.token is null then
        update public.shift_round_nudge_ledger l set status = 'skipped', updated_at = now() where l.id = c.id;
      else
        update public.shift_round_nudge_ledger l set expo_token = t.token where l.id = c.id;
        v_out := v_out || jsonb_build_array(jsonb_build_object('ledger_id', c.id, 'user_id', c.user_id, 'token', t.token,
          'lang', t.lang, 'kind', c.kind, 'params', c.params));
      end if;
    end loop;
    return shift_round_private.ok(jsonb_build_object('candidates', v_out));
  end if;

  -- pushes: event-driven (no nudge opt-out, still requires token + push_enabled)
  update public.shift_round_nudge_ledger l set status = 'abandoned', updated_at = now()
   where l.status = 'failed' and l.kind not in ('no_evidence','closing_tomorrow')
     and (l.attempts >= 3 or l.created_at < now() - interval '24 hours');

  for c in
    select ev.id, ev.name, ev.user_id, ev.round_id, ev.entry_id, ev.props
      from public.shift_round_events ev
     where ev.name in ('evidence_rejected','certificate_issued','summary_approved','summary_rejected','squad_assigned')
       and ev.created_at > v_now - interval '48 hours' and ev.user_id is not null
     order by ev.id
  loop
    exit when jsonb_array_length(v_out) >= v_limit;
    select * into t from shift_round_private.push_target(c.user_id, false);
    continue when t.token is null;
    v_kind := case c.name when 'summary_approved' then 'summary_decided' when 'summary_rejected' then 'summary_decided'
                          else c.name end;
    v_params := case c.name
      when 'evidence_rejected' then jsonb_build_object('copy_key', 'push.rejected', 'type', c.props->>'type',
        'url', 'passion-seed://round/evidence/' || (c.props->>'evidence_id'))
      when 'certificate_issued' then jsonb_build_object('copy_key', 'push.certificate', 'url', 'passion-seed://round/certificate',
        'round_number', (select r.number from public.shift_rounds r where r.id = c.round_id))
      when 'summary_approved' then jsonb_build_object('copy_key', 'push.summary_approved', 'url', 'passion-seed://round/summary')
      when 'summary_rejected' then jsonb_build_object('copy_key', 'push.summary_rejected', 'url', 'passion-seed://round/summary')
      else jsonb_build_object('copy_key', 'push.squad_assigned', 'url', 'passion-seed://round/squad') end;
    v_id := null;
    insert into public.shift_round_nudge_ledger (user_id, round_id, kind, dedupe_key, expo_token, params)
    values (c.user_id, c.round_id, v_kind,
            coalesce(c.props->>'evidence_id', c.props->>'certificate_id', c.props->>'revision_id', 'event:' || c.id::text),
            t.token, v_params)
    on conflict (user_id, kind, dedupe_key) do nothing
    returning id into v_id;
    if v_id is not null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('ledger_id', v_id, 'user_id', c.user_id, 'token', t.token,
        'lang', t.lang, 'kind', v_kind, 'params', v_params));
    end if;
  end loop;

  -- round_published -> waitlist, then waitlist rows are cleared
  for c in
    select ev.round_id, (select r.number from public.shift_rounds r where r.id = ev.round_id) as number
      from public.shift_round_events ev
     where ev.name = 'round_published' and ev.created_at > v_now - interval '48 hours'
     order by ev.id
  loop
    for t in
      select w.user_id, pt.token, pt.lang
        from public.shift_round_waitlist w
        left join lateral shift_round_private.push_target(w.user_id, false) pt on true
    loop
      exit when jsonb_array_length(v_out) >= v_limit;
      if t.token is not null then
        v_params := jsonb_build_object('copy_key', 'push.round_published', 'round_number', c.number, 'url', 'passion-seed://round');
        v_id := null;
        insert into public.shift_round_nudge_ledger (user_id, round_id, kind, dedupe_key, expo_token, params)
        values (t.user_id, c.round_id, 'round_published', c.round_id::text, t.token, v_params)
        on conflict (user_id, kind, dedupe_key) do nothing
        returning id into v_id;
        if v_id is not null then
          v_out := v_out || jsonb_build_array(jsonb_build_object('ledger_id', v_id, 'user_id', t.user_id, 'token', t.token,
            'lang', t.lang, 'kind', 'round_published', 'params', v_params));
        end if;
      end if;
      -- notified (or already notified, or unreachable by push): leave the waitlist
      delete from public.shift_round_waitlist w where w.user_id = t.user_id;
    end loop;
  end loop;

  for c in
    update public.shift_round_nudge_ledger l set status = 'pending', updated_at = now()
     where l.status = 'failed' and l.kind not in ('no_evidence','closing_tomorrow') and l.attempts < 3
       and l.created_at >= now() - interval '24 hours'
    returning l.*
  loop
    select * into t from shift_round_private.push_target(c.user_id, false);
    if t.token is null then
      update public.shift_round_nudge_ledger l set status = 'skipped', updated_at = now() where l.id = c.id;
    else
      update public.shift_round_nudge_ledger l set expo_token = t.token where l.id = c.id;
      v_out := v_out || jsonb_build_array(jsonb_build_object('ledger_id', c.id, 'user_id', c.user_id, 'token', t.token,
        'lang', t.lang, 'kind', c.kind, 'params', c.params));
    end if;
  end loop;
  return shift_round_private.ok(jsonb_build_object('candidates', v_out));
end $$;

create or replace function public.shift_round_job_push_result(
  p_ledger_ids uuid[], p_status text, p_ticket_ids text[], p_error text
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare v_n int;
begin
  if p_status is null or p_status not in ('sent','failed','skipped') then return shift_round_private.fail('invalid_field', 'status'); end if;
  update public.shift_round_nudge_ledger l
     set status = p_status,
         attempts = l.attempts + 1,
         expo_ticket_id = coalesce(x.ticket, l.expo_ticket_id),
         last_error = left(p_error, 1000),
         updated_at = now()
    from (select u.id, t.ticket
            from unnest(coalesce(p_ledger_ids, '{}')) with ordinality u(id, i)
            left join unnest(coalesce(p_ticket_ids, '{}')) with ordinality t(ticket, i) on t.i = u.i) x
   where l.id = x.id;
  get diagnostics v_n = row_count;
  return shift_round_private.ok(jsonb_build_object('updated', v_n));
end $$;

create or replace function public.shift_round_job_receipts_pending() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return shift_round_private.ok(jsonb_build_object('receipts', coalesce((
    select jsonb_agg(jsonb_build_object('ledger_id', x.id, 'ticket_id', x.expo_ticket_id, 'user_id', x.user_id))
      from (select l.id, l.expo_ticket_id, l.user_id from public.shift_round_nudge_ledger l
             where l.status = 'sent' and l.expo_ticket_id is not null and l.expo_receipt_status is null
               and l.updated_at < now() - interval '15 minutes' and l.updated_at > now() - interval '24 hours'
             order by l.updated_at limit 1000) x), '[]'::jsonb)));
end $$;

create or replace function public.shift_round_job_receipt_result(p_ledger_id uuid, p_status text, p_clear_token boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare l public.shift_round_nudge_ledger;
begin
  update public.shift_round_nudge_ledger x
     set expo_receipt_status = left(coalesce(p_status, 'unknown'), 100), updated_at = now()
   where x.id = p_ledger_id
  returning * into l;
  if not found then return shift_round_private.fail('invalid_field', 'ledger_id'); end if;
  if coalesce(p_clear_token, false) and l.expo_token is not null then
    update public.profiles p set expo_push_token = null
     where p.id = l.user_id and p.expo_push_token = l.expo_token;
  end if;
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_job_enqueue_retention() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_now timestamptz := shift_round_private.round_now();
  en record;
  rr record;
  v_entries int := 0;
  v_audio int := 0;
  v_requests int := 0;
  v_paths text[];
begin
  for en in
    select e.id, e.user_id, e.round_id
      from public.shift_round_entries e join public.shift_rounds r on r.id = e.round_id
     where e.retention_purged_at is null
       and r.closes_at + make_interval(months => r.retention_months) < v_now
     order by e.id
  loop
    delete from public.shift_round_cheers c where c.from_entry_id = en.id or c.to_entry_id = en.id;
    delete from public.shift_round_evidence x where x.entry_id = en.id;      -- cascades media rows
    delete from public.shift_round_checkins x where x.entry_id = en.id;
    delete from public.shift_round_squad_members x where x.entry_id = en.id;
    delete from public.shift_round_summary_revisions x where x.entry_id = en.id and x.status <> 'approved';
    update public.shift_round_entries x
       set birth_month = null, birth_year = null, guardian_consent_at = null, retention_purged_at = v_now
     where x.id = en.id;
    insert into public.shift_round_deletion_requests (user_id, round_id, reason, storage_prefixes)
    values (en.user_id, en.round_id, 'retention', array[en.round_id::text || '/' || en.user_id::text || '/']);
    v_entries := v_entries + 1;
    v_requests := v_requests + 1;
  end loop;

  for rr in
    select m.round_id, m.user_id, array_agg(m.path order by m.path) as paths, array_agg(m.id) as ids
      from public.shift_round_evidence_media m join public.shift_rounds r on r.id = m.round_id
     where m.kind = 'audio' and m.purged_at is null
       and r.review_ends_at + make_interval(days => r.audio_retention_days) < v_now
     group by m.round_id, m.user_id
  loop
    insert into public.shift_round_deletion_requests (user_id, round_id, reason, storage_paths)
    values (rr.user_id, rr.round_id, 'audio_retention', rr.paths);
    update public.shift_round_evidence_media m set purged_at = v_now where m.id = any (rr.ids);
    v_audio := v_audio + cardinality(rr.ids);
    v_requests := v_requests + 1;
  end loop;

  return shift_round_private.ok(jsonb_build_object('entries_purged', v_entries, 'audio_purged', v_audio,
                                                   'requests', v_requests));
end $$;

create or replace function public.shift_round_job_next_deletions(p_limit int default 50) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return shift_round_private.ok(jsonb_build_object('requests', coalesce((
    select jsonb_agg(jsonb_build_object('id', d.id, 'reason', d.reason, 'storage_paths', to_jsonb(d.storage_paths),
                                        'storage_prefixes', to_jsonb(d.storage_prefixes), 'attempts', d.attempts))
      from (select x.* from public.shift_round_deletion_requests x
             where x.status = 'queued' or (x.status = 'failed' and x.attempts < 5)
             order by x.requested_at limit greatest(1, least(coalesce(p_limit, 50), 500))) d), '[]'::jsonb)));
end $$;

create or replace function public.shift_round_job_finish_deletion(p_id uuid, p_status text, p_error text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare d public.shift_round_deletion_requests;
begin
  if p_status is null or p_status not in ('storage_done','failed') then return shift_round_private.fail('invalid_field', 'status'); end if;
  update public.shift_round_deletion_requests x
     set status = p_status,
         attempts = x.attempts + case when p_status = 'failed' then 1 else 0 end,
         last_error = case when p_status = 'failed' then left(p_error, 1000) else null end,
         completed_at = case when p_status = 'storage_done' then now() else null end
   where x.id = p_id
  returning * into d;
  if not found then return shift_round_private.fail('invalid_field', 'id'); end if;
  return shift_round_private.ok(jsonb_build_object('status', d.status, 'attempts', d.attempts));
end $$;

create or replace function public.shift_round_job_media_to_scan(p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return shift_round_private.ok(jsonb_build_object('media', coalesce((
    select jsonb_agg(jsonb_build_object('media_id', m.id, 'path', m.path, 'kind', m.kind))
      from (select x.* from public.shift_round_evidence_media x
             where x.exif_checked_at is null and x.purged_at is null
             order by x.created_at limit greatest(1, least(coalesce(p_limit, 100), 1000))) m), '[]'::jsonb)));
end $$;

create or replace function public.shift_round_job_media_scanned(p_media_id uuid, p_exif_found boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.shift_round_evidence_media m set exif_checked_at = now(), exif_found = p_exif_found where m.id = p_media_id;
  if not found then return shift_round_private.fail('invalid_field', 'media_id'); end if;
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_job_orphans(p_limit int default 500) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return shift_round_private.ok(jsonb_build_object('names', coalesce((
    select jsonb_agg(o.name)
      from (select so.name from storage.objects so
             where so.bucket_id = 'shift-round-media'
               and so.created_at < now() - interval '24 hours'
               and not exists (select 1 from public.shift_round_evidence_media m where m.path = so.name)
               and not exists (select 1 from public.shift_round_deletion_requests d
                                where d.status <> 'storage_done'
                                  and (so.name = any (d.storage_paths)
                                       or exists (select 1 from unnest(d.storage_prefixes) p where so.name like p || '%')))
             order by so.created_at limit greatest(1, least(coalesce(p_limit, 500), 1000))) o), '[]'::jsonb)));
end $$;

-- Lane A addition: lets the purge job queue orphan names in one call (reason 'orphan').
create or replace function public.shift_round_job_enqueue_orphans(p_names text[]) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_names text[];
  v_id uuid;
begin
  select coalesce(array_agg(n order by n), '{}') into v_names
    from unnest(coalesce(p_names, '{}')) n
   where shift_round_private.media_path_ok(n)
     and not exists (select 1 from public.shift_round_evidence_media m where m.path = n);
  if cardinality(v_names) = 0 then return shift_round_private.ok(jsonb_build_object('request_id', null, 'count', 0)); end if;
  insert into public.shift_round_deletion_requests (user_id, reason, storage_paths)
  values ('00000000-0000-0000-0000-000000000000', 'orphan', v_names)
  returning id into v_id;
  return shift_round_private.ok(jsonb_build_object('request_id', v_id, 'count', cardinality(v_names)));
end $$;

create or replace function public.shift_round_job_delete_user(p_user_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_user_id is null then return shift_round_private.fail('invalid_field', 'user_id'); end if;
  return shift_round_private.ok(shift_round_private.delete_user_round_data(p_user_id, null, 'account_deleted'));
end $$;

create or replace function public.shift_round_job_watchdog() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  return shift_round_private.ok(jsonb_build_object('stale', coalesce((
    select jsonb_agg(jsonb_build_object('job', w.job, 'max_age_minutes', w.mins, 'last_ok_at', w.last_ok))
      from (select x.job, x.mins,
                   (select max(j.finished_at) from public.shift_round_job_runs j where j.job = x.job and j.status = 'ok') as last_ok
              from (values ('issue', 120), ('pushes', 30), ('nudges', 120), ('media_scan', 60), ('purge', 1560)) x(job, mins)) w
     where w.last_ok is null or w.last_ok < now() - make_interval(mins => w.mins)), '[]'::jsonb),
    'deletion_failures', (select count(*) from public.shift_round_deletion_requests d where d.status = 'failed' and d.attempts >= 5)));
end $$;

-- 4.1 pg_cron -> pg_net -> edge function. Reads Vault secrets; never stores them in SQL.
create or replace function shift_round_private.invoke_job(job text) returns bigint
language plpgsql volatile set search_path = '' as $$
declare
  v_url text;
  v_secret text;
  v_request bigint;
begin
  if job not in ('issue','purge','nudges','pushes','media_scan','watchdog') then
    raise exception 'unknown shift round job %', job;
  end if;
  if to_regclass('vault.decrypted_secrets') is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    raise warning 'shift_round invoke_job(%): vault or pg_net unavailable', job;
    return null;
  end if;
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v_url using 'shift_round_jobs_url';
  execute 'select decrypted_secret from vault.decrypted_secrets where name = $1' into v_secret using 'shift_round_jobs_secret';
  if v_url is null or v_secret is null then
    raise warning 'shift_round invoke_job(%): vault secrets shift_round_jobs_url/secret missing', job;
    return null;
  end if;
  execute 'select net.http_post(url := $1, body := $2, params := ''{}''::jsonb, headers := $3, timeout_milliseconds := 55000)'
    into v_request
    using v_url, jsonb_build_object('job', job),
          jsonb_build_object('Content-Type', 'application/json', 'x-shift-round-jobs-secret', v_secret);
  return v_request;
end $$;

-- Privileges: job RPCs are service_role only.
revoke all on all functions in schema shift_round_private from public, anon, authenticated;
grant execute on function
  shift_round_private.is_global_staff(uuid),
  shift_round_private.is_staff(uuid, uuid),
  shift_round_private.can_review(uuid, uuid),
  shift_round_private.can_upload(text),
  shift_round_private.can_read_media(text),
  shift_round_private.can_delete_media(text)
  to authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.shift_round_job_start(text)',
    'public.shift_round_job_finish(uuid,text,int,int,text,jsonb)',
    'public.shift_round_job_due_entries(int)',
    'public.shift_round_job_issue_entry(uuid)',
    'public.shift_round_job_push_candidates(text,int)',
    'public.shift_round_job_push_result(uuid[],text,text[],text)',
    'public.shift_round_job_receipts_pending()',
    'public.shift_round_job_receipt_result(uuid,text,boolean)',
    'public.shift_round_job_enqueue_retention()',
    'public.shift_round_job_next_deletions(int)',
    'public.shift_round_job_finish_deletion(uuid,text,text)',
    'public.shift_round_job_media_to_scan(int)',
    'public.shift_round_job_media_scanned(uuid,boolean)',
    'public.shift_round_job_orphans(int)',
    'public.shift_round_job_enqueue_orphans(text[])',
    'public.shift_round_job_delete_user(uuid)',
    'public.shift_round_job_watchdog()']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- Schedules (idempotent; skipped where pg_cron is not installed, e.g. plain test databases).
do $$
declare
  j record;
  v_exists boolean;
begin
  if to_regprocedure('cron.schedule(text,text,text)') is null or to_regclass('cron.job') is null then
    raise notice 'pg_cron not installed; shift round schedules not created';
    return;
  end if;
  for j in select * from (values
    ('shift-round-issue', '5 * * * *', 'issue'),
    ('shift-round-pushes', '*/5 * * * *', 'pushes'),
    ('shift-round-nudges', '0 * * * *', 'nudges'),
    ('shift-round-media-scan', '*/10 * * * *', 'media_scan'),
    ('shift-round-purge', '30 20 * * *', 'purge'),
    ('shift-round-watchdog', '15 1 * * *', 'watchdog')) x(name, schedule, job)
  loop
    execute 'select exists (select 1 from cron.job where jobname = $1)' into v_exists using j.name;
    if not v_exists then
      perform cron.schedule(j.name, j.schedule, format('select shift_round_private.invoke_job(%L)', j.job));
    end if;
  end loop;
end $$;
