-- SHIFT rounds (beta), part 2: student RPCs (3.2) and public RPCs (3.3).
-- Every RPC: plpgsql SECURITY DEFINER, search_path '', auth.uid() checked first (public RPCs
-- excepted), no time arguments (all time from shift_round_private.round_now()).

-- ---------------------------------------------------------------------------
-- Internal helpers (SECURITY INVOKER, execute revoked at the end of this file)
-- ---------------------------------------------------------------------------

-- v2 2.2 `ideas` payload: {ideas:[{text 3..120, who 2..60 (personal-data rule)}] (3 to 6),
-- picked int (0-based, < len), reachable boolean?, note <=280?}. Unknown keys (also inside an
-- idea) are rejected; strings are trimmed. Problems inside the list report field 'ideas'
-- (details carry rule, index and key) so the app can point at the composer field.
create or replace function shift_round_private.validate_ideas(p_payload jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  k text;
  v jsonb;
  v_items jsonb;
  v_item jsonb;
  v_out_items jsonb := '[]'::jsonb;
  v_text text;
  v_who text;
  v_picked numeric;
  v_note text;
  v_out jsonb;
  i int := 0;
begin
  for k in select jsonb_object_keys(p_payload) loop
    if k not in ('ideas','picked','reachable','note') then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', k, null, '{"rule":"unknown_key"}'));
    end if;
  end loop;

  v_items := p_payload->'ideas';
  if v_items is null or jsonb_typeof(v_items) = 'null' then
    return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('missing_field', 'ideas'));
  end if;
  if jsonb_typeof(v_items) <> 'array' then
    return jsonb_build_object('ok', false, 'error_envelope',
      shift_round_private.fail('invalid_field', 'ideas', null, '{"rule":"type"}'));
  end if;
  if jsonb_array_length(v_items) not between 3 and 6 then
    return jsonb_build_object('ok', false, 'error_envelope',
      shift_round_private.fail('invalid_field', 'ideas', null, '{"rule":"count","min":3,"max":6}'));
  end if;
  for v_item in select * from jsonb_array_elements(v_items) loop
    if jsonb_typeof(v_item) <> 'object' then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'ideas', null, jsonb_build_object('rule', 'type', 'index', i)));
    end if;
    for k in select jsonb_object_keys(v_item) loop
      if k not in ('text','who') then
        return jsonb_build_object('ok', false, 'error_envelope',
          shift_round_private.fail('invalid_field', 'ideas', null, jsonb_build_object('rule', 'unknown_key', 'index', i, 'key', k)));
      end if;
    end loop;
    foreach k in array array['text','who'] loop
      if jsonb_typeof(v_item->k) is distinct from 'string' then
        return jsonb_build_object('ok', false, 'error_envelope',
          shift_round_private.fail('invalid_field', 'ideas', null,
            jsonb_build_object('rule', case when jsonb_typeof(v_item->k) is null or jsonb_typeof(v_item->k) = 'null'
                                            then 'required' else 'type' end, 'index', i, 'key', k)));
      end if;
    end loop;
    v_text := btrim(v_item->>'text');
    v_who := btrim(v_item->>'who');
    if char_length(v_text) not between 3 and 120 then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'ideas', null,
        jsonb_build_object('rule', 'length', 'index', i, 'key', 'text', 'min', 3, 'max', 120)));
    end if;
    if char_length(v_who) not between 2 and 60 then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'ideas', null,
        jsonb_build_object('rule', 'length', 'index', i, 'key', 'who', 'min', 2, 'max', 60)));
    end if;
    if shift_round_private.has_personal_data(v_who) then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'ideas', null,
        jsonb_build_object('rule', 'personal_data', 'index', i, 'key', 'who')));
    end if;
    v_out_items := v_out_items || jsonb_build_array(jsonb_build_object('text', v_text, 'who', v_who));
    i := i + 1;
  end loop;

  v := p_payload->'picked';
  if v is null or jsonb_typeof(v) = 'null' then
    return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('missing_field', 'picked'));
  end if;
  if jsonb_typeof(v) <> 'number' then
    return jsonb_build_object('ok', false, 'error_envelope',
      shift_round_private.fail('invalid_field', 'picked', null, '{"rule":"type"}'));
  end if;
  v_picked := (v #>> '{}')::numeric;
  if v_picked <> trunc(v_picked) or v_picked < 0 or v_picked >= jsonb_array_length(v_out_items) then
    return jsonb_build_object('ok', false, 'error_envelope',
      shift_round_private.fail('invalid_field', 'picked', null, '{"rule":"range"}'));
  end if;
  v_out := jsonb_build_object('ideas', v_out_items, 'picked', v_picked::int);

  v := p_payload->'reachable';
  if v is not null and jsonb_typeof(v) <> 'null' then
    if jsonb_typeof(v) <> 'boolean' then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'reachable', null, '{"rule":"type"}'));
    end if;
    v_out := v_out || jsonb_build_object('reachable', v);
  end if;

  v := p_payload->'note';
  if v is not null and jsonb_typeof(v) <> 'null' then
    if jsonb_typeof(v) <> 'string' then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'note', null, '{"rule":"type"}'));
    end if;
    v_note := btrim(v #>> '{}');
    if char_length(v_note) > 280 then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'note', null, '{"rule":"length","min":0,"max":280}'));
    end if;
    if v_note <> '' then v_out := v_out || jsonb_build_object('note', v_note); end if;
  end if;

  return jsonb_build_object('ok', true, 'payload', v_out, 'who_label', null);
end $$;

-- 2.3 payload validation. Returns {"ok":true,"payload":{...},"who_label":text|null}
-- or {"ok":false,"error_envelope":{...}}.
create or replace function shift_round_private.validate_payload(
  p_type text, p_payload jsonb, r public.shift_rounds, p_has_photo boolean
) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  allowed text[];
  required text[];
  k text;
  v jsonb;
  s text;
  out_payload jsonb := '{}'::jsonb;
  d date;
  today date := shift_round_private.local_date(shift_round_private.round_now());
  lens jsonb := '{"who_label":[2,60],"key_point":[1,500],"transcript":[0,5000],"planned_change":[0,280],
                  "text":[20,500],"note":[0,280],"what_tried":[0,200],"what":[5,500],"user_group":[2,60],
                  "built":[1,500],"broke":[0,500],"heard":[0,500]}';
  enums jsonb := '{"channel":["in_person","chat","call","social","other"],"input":["voice","text"],
                   "kind":["changed","decided_not_to"],"visibility":["public","reviewer_only"]}';
begin
  allowed := case p_type
    when 'contact' then array['who_label','channel','occurred_on','link']
    when 'ideas' then array['ideas','picked','reachable','note']
    when 'interview' then array['who_label','occurred_on','key_point','transcript','planned_change','input','link']
    when 'problem_statement' then array['text','user_group','link']
    when 'mvp' then array['link','note']
    when 'tester' then array['who_label','occurred_on','key_point','what_tried','transcript','planned_change','input','link']
    when 'change' then array['kind','what','source_evidence_id','link']
    when 'demo_post' then array['url','visibility','note']
    when 'daily' then array['built','broke','heard','link']
    else null end;
  if allowed is null then
    return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'type'));
  end if;
  required := case p_type
    when 'contact' then array['who_label','channel','occurred_on']
    when 'interview' then array['who_label','occurred_on','key_point']
    when 'problem_statement' then array['text','user_group']   -- v2: user_group required for new logs
    when 'mvp' then array[]::text[]
    when 'tester' then array['who_label','occurred_on','key_point']
    when 'change' then array['kind','what','source_evidence_id']
    when 'demo_post' then array['url','visibility']
    when 'daily' then array['built']
    else array[]::text[] end;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'error_envelope',
      shift_round_private.fail('invalid_field', 'payload', null, '{"rule":"object"}'));
  end if;
  if octet_length(p_payload::text) > 20000 then
    return jsonb_build_object('ok', false, 'error_envelope',
      shift_round_private.fail('invalid_field', 'payload', null, '{"rule":"too_large"}'));
  end if;
  if p_type = 'ideas' then
    return shift_round_private.validate_ideas(p_payload);
  end if;

  -- unknown keys, then type + trim
  for k, v in select * from jsonb_each(p_payload) loop
    if not (k = any (allowed)) then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', k, null, '{"rule":"unknown_key"}'));
    end if;
    if jsonb_typeof(v) = 'null' then continue; end if;
    if jsonb_typeof(v) <> 'string' then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', k, null, '{"rule":"type"}'));
    end if;
    s := btrim(v #>> '{}');
    if s <> '' then out_payload := out_payload || jsonb_build_object(k, s); end if;
  end loop;

  foreach k in array required loop
    if not out_payload ? k then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('missing_field', k));
    end if;
  end loop;
  if p_type = 'mvp' and not out_payload ? 'link' and not p_has_photo then
    return jsonb_build_object('ok', false, 'error_envelope',
      shift_round_private.fail('missing_field', 'link', null, '{"rule":"link_or_photo"}'));
  end if;

  for k, v in select * from jsonb_each(out_payload) loop
    s := v #>> '{}';
    if lens ? k and char_length(s) not between (lens->k->>0)::int and (lens->k->>1)::int then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', k, null,
        jsonb_build_object('rule','length','min',(lens->k->>0)::int,'max',(lens->k->>1)::int)));
    end if;
    if enums ? k and not (enums->k) ? s then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', k, null, '{"rule":"enum"}'));
    end if;
    if k in ('link','url') and not shift_round_private.is_https_url(s) then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('link_not_https', k));
    end if;
    if k in ('who_label','user_group') and shift_round_private.has_personal_data(s) then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', k, null, '{"rule":"personal_data"}'));
    end if;
    if k = 'occurred_on' then
      begin
        if s !~ '^\d{4}-\d{2}-\d{2}$' then raise invalid_datetime_format; end if;
        d := s::date;
      exception when others then
        return jsonb_build_object('ok', false, 'error_envelope',
          shift_round_private.fail('invalid_field', 'occurred_on', null, '{"rule":"date"}'));
      end;
      if d < shift_round_private.local_date(r.starts_at) - 7 or d > today then
        return jsonb_build_object('ok', false, 'error_envelope',
          shift_round_private.fail('invalid_field', 'occurred_on', null, '{"rule":"range"}'));
      end if;
    end if;
    if k = 'source_evidence_id' then
      begin
        perform s::uuid;
      exception when others then
        return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_change_source', 'source_evidence_id'));
      end;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'payload', out_payload, 'who_label', out_payload->>'who_label');
end $$;

-- 2.3/2.5 media validation against storage. Returns {"ok":true,"items":[...]} or error envelope.
create or replace function shift_round_private.validate_media(
  p_media jsonb, p_type text, r public.shift_rounds, p_uid uuid
) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  m jsonb;
  items jsonb := '[]'::jsonb;
  kinds text[] := '{}';
  v_kind text;
  v_path text;
  v_bytes int;
  v_dur int;
  o record;
begin
  if p_media is null or jsonb_typeof(p_media) = 'null' then
    return jsonb_build_object('ok', true, 'items', '[]'::jsonb);
  end if;
  if jsonb_typeof(p_media) <> 'array' or jsonb_array_length(p_media) > 2 then
    return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'media'));
  end if;
  for m in select * from jsonb_array_elements(p_media) loop
    if jsonb_typeof(m) <> 'object' then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'media'));
    end if;
    v_kind := m->>'kind';
    if v_kind not in ('photo','audio') or v_kind = any (kinds) then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'media', null, '{"rule":"kind"}'));
    end if;
    kinds := kinds || v_kind;
    if v_kind = 'audio' and p_type not in ('interview','tester') then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'media', null, '{"rule":"audio_not_allowed"}'));
    end if;
    if coalesce(m->>'consent', 'false') <> 'true' then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail(case v_kind when 'photo' then 'photo_consent_required' else 'audio_consent_required' end, 'media'));
    end if;
    v_path := m->>'path';
    if v_path is null or not shift_round_private.media_path_ok(v_path)
       or (v_kind = 'photo' and v_path !~ '/photo\.jpg$')
       or (v_kind = 'audio' and v_path !~ '/audio\.m4a$') then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'media', null, '{"rule":"path"}'));
    end if;
    if split_part(v_path, '/', 1) <> r.id::text or split_part(v_path, '/', 2) <> p_uid::text then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('media_not_owned', 'media'));
    end if;
    begin
      v_dur := nullif(m->>'duration_ms', '')::int;
      v_bytes := nullif(m->>'bytes', '')::int;
    exception when others then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'media'));
    end;
    if v_kind = 'audio' and (v_dur is null or v_dur <= 0 or v_dur > 180000) then
      return jsonb_build_object('ok', false, 'error_envelope',
        shift_round_private.fail('invalid_field', 'media', null, '{"rule":"duration"}'));
    end if;
    select so.owner_id, so.owner, so.metadata into o
      from storage.objects so where so.bucket_id = 'shift-round-media' and so.name = v_path;
    if not found then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('media_missing', 'media'));
    end if;
    if coalesce(o.owner_id, o.owner::text) is distinct from p_uid::text then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('media_not_owned', 'media'));
    end if;
    if exists (select 1 from public.shift_round_evidence_media em where em.path = v_path) then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('media_in_use', 'media'));
    end if;
    v_bytes := coalesce(nullif(o.metadata->>'size', '')::int, v_bytes);
    if v_bytes is null or v_bytes <= 0 then
      return jsonb_build_object('ok', false, 'error_envelope', shift_round_private.fail('invalid_field', 'media'));
    end if;
    items := items || jsonb_build_array(jsonb_build_object(
      'kind', v_kind, 'path', v_path, 'bytes', v_bytes,
      'duration_ms', case when v_kind = 'audio' then v_dur end));
  end loop;
  return jsonb_build_object('ok', true, 'items', items);
end $$;

-- md5(type || payload::text || sorted media paths), computed over the payload as sent.
create or replace function shift_round_private.payload_hash(p_type text, p_payload jsonb, p_media jsonb) returns text
language sql immutable set search_path = '' as $$
  select md5(coalesce(p_type, '') || coalesce(p_payload::text, 'null') || coalesce((
    select string_agg(x->>'path', ',' order by x->>'path')
      from jsonb_array_elements(case when jsonb_typeof(p_media) = 'array' then p_media else '[]'::jsonb end) x), ''))
$$;

create or replace function shift_round_private.after_close(e public.shift_round_evidence, r public.shift_rounds) returns boolean
language sql stable set search_path = '' as $$
  select e.submitted_at >= r.closes_at and not shift_round_private.in_count_window(e, r)
$$;

create or replace function shift_round_private.duplicate_label(e public.shift_round_evidence) returns boolean
language sql stable set search_path = '' as $$
  select e.who_key is not null and exists (
    select 1 from public.shift_round_evidence x
     where x.entry_id = e.entry_id and x.type = e.type and x.who_key = e.who_key
       and x.id <> e.id and x.status <> 'withdrawn' and x.submitted_at <= e.submitted_at)
$$;

-- "Invalidated" change: own status/time would count, but its source no longer counts.
create or replace function shift_round_private.change_invalidated(e public.shift_round_evidence, r public.shift_rounds) returns boolean
language sql stable set search_path = '' as $$
  select e.type = 'change'
     and e.status in ('submitted','accepted')
     and shift_round_private.in_count_window(e, r)
     and not shift_round_private.evidence_counts(e, r)
$$;

create or replace function shift_round_private.receipt(
  e public.shift_round_evidence, r public.shift_rounds, p_replayed boolean, p_missions jsonb, p_newly text[]
) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'evidence_id', e.id,
    'submission_id', e.submission_id,
    'submitted_at', e.submitted_at,
    'replayed', p_replayed,
    'counted', shift_round_private.evidence_counts(e, r),
    'after_close', shift_round_private.after_close(e, r),
    'duplicate_label', shift_round_private.duplicate_label(e),
    'missions', p_missions,
    'newly_completed', to_jsonb(coalesce(p_newly, '{}'::text[])))
$$;

-- Parts whose counted "have" changed between two mission_counts results.
create or replace function shift_round_private.mission_diff(p_before jsonb, p_after jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('mission', b.mkey, 'type', b.ptype,
                                               'have_before', b.have, 'have_after', a.have) order by b.ord), '[]'::jsonb)
    from (select m->>'key' as mkey, p->>'type' as ptype, (p->>'have')::int as have, mi * 10 + pi as ord
            from jsonb_array_elements(p_before->'missions') with ordinality as mt(m, mi),
                 jsonb_array_elements(m->'parts') with ordinality as pt(p, pi)) b
    join (select m->>'key' as mkey, p->>'type' as ptype, (p->>'have')::int as have
            from jsonb_array_elements(p_after->'missions') as m,
                 jsonb_array_elements(m->'parts') as p) a
      on a.mkey = b.mkey and a.ptype = b.ptype
   where a.have <> b.have
$$;

-- Check-in due rules (3.2), scaled to the round length (v2: 7-day default). mid = ceil(duration/2):
-- join after the first counted log until day mid-1; midpoint from day mid to the last day if the
-- entry joined by day mid-2; close from the last day until review end. 14-day rounds keep the
-- original windows (join until day 6, midpoint from day 7 for joined_day <= 5).
create or replace function shift_round_private.checkin_due(en public.shift_round_entries, r public.shift_rounds, p_checkpoint text) returns boolean
language plpgsql stable set search_path = '' as $$
declare
  d int := shift_round_private.day_of(r, shift_round_private.round_now());
  last_day int := shift_round_private.effective_days(r);
  mid int := ceil(r.duration_days / 2.0)::int;
begin
  if exists (select 1 from public.shift_round_checkins c where c.entry_id = en.id and c.checkpoint = p_checkpoint) then
    return false;
  end if;
  if shift_round_private.round_now() >= r.review_ends_at then return false; end if;
  if p_checkpoint = 'join' then
    return d <= mid - 1 and exists (select 1 from public.shift_round_evidence e
                                     where e.entry_id = en.id and shift_round_private.evidence_counts(e, r));
  elsif p_checkpoint = 'midpoint' then
    return en.joined_day <= mid - 2 and d between mid and last_day;
  elsif p_checkpoint = 'close' then
    return d >= last_day;
  end if;
  return false;
end $$;

create or replace function shift_round_private.evidence_json(e public.shift_round_evidence, r public.shift_rounds) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', e.id, 'type', e.type, 'status', e.status,
    'counted', shift_round_private.evidence_counts(e, r),
    'after_close', shift_round_private.after_close(e, r),
    'invalidated', shift_round_private.change_invalidated(e, r),
    'mission', shift_round_private.mission_of(r.missions, e.type),
    'submitted_at', e.submitted_at, 'local_date', e.local_date,
    'payload', e.payload,
    'media', coalesce((select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.path) order by m.kind)
                         from public.shift_round_evidence_media m
                        where m.evidence_id = e.id and m.purged_at is null), '[]'::jsonb),
    'status_reason_code', e.status_reason_code, 'status_note', e.status_note,
    'replaces_evidence_id', e.replaces_evidence_id, 'source_evidence_id', e.source_evidence_id,
    'replaced_by', (select x.id from public.shift_round_evidence x
                     where x.replaces_evidence_id = e.id order by x.submitted_at desc limit 1))
$$;

-- Squad feed (2.8): generated items only, no free text. kind evidence_logged: n = how many logs of
-- that type so far (ideas and daily included; the app words them "picked an idea" / "posted
-- today's update"); kind mission_completed: n = the mission's position in the round config.
create or replace function shift_round_private.squad_feed(p_squad_id uuid, p_me uuid, p_limit int default 30) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(item order by at desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'evidence_id', e.id, 'entry_id', en.id, 'handle', en.handle,
      'kind', ev.name, 'type', e.type,
      'n', case when ev.name = 'mission_completed'
                then shift_round_private.mission_n(r.missions, ev.props->>'mission')
                else (select count(*) from public.shift_round_evidence x
                       where x.entry_id = e.entry_id and x.type = e.type
                         and x.status in ('submitted','accepted') and x.submitted_at <= e.submitted_at) end,
      'mission', coalesce(ev.props->>'mission', shift_round_private.mission_of(r.missions, e.type)),
      'at', ev.created_at,
      'cheers', (select count(*) from public.shift_round_cheers c where c.evidence_id = e.id),
      'cheered_by_me', exists (select 1 from public.shift_round_cheers c where c.evidence_id = e.id and c.from_entry_id = p_me)
    ) as item, ev.created_at as at
    from public.shift_round_squad_members sm
    join public.shift_round_entries en on en.id = sm.entry_id
    join public.shift_rounds r on r.id = en.round_id
    join public.shift_round_events ev on ev.entry_id = en.id and ev.name in ('evidence_logged','mission_completed')
    join public.shift_round_evidence e on e.id = (ev.props->>'evidence_id')::uuid and e.entry_id = en.id
    where sm.squad_id = p_squad_id
      and e.status in ('submitted','accepted')
      and shift_round_private.evidence_counts(e, r)
    order by ev.created_at desc
    limit p_limit
  ) t
$$;

-- Shared deletion core for delete_my_data and job_delete_user (E7, E10).
create or replace function shift_round_private.delete_user_round_data(p_uid uuid, p_round_id uuid, p_reason text) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  en record;
  v_entries int := 0;
  v_certs int := 0;
  v_prefixes text[] := '{}';
  v_paths text[];
  v_request uuid;
begin
  for en in
    select e.id, e.round_id from public.shift_round_entries e
     where e.user_id = p_uid and (p_round_id is null or e.round_id = p_round_id)
     order by e.round_id
  loop
    perform 1 from public.shift_rounds r where r.id = en.round_id for share;
    perform shift_round_private.lock_entry(en.id);
    select v_certs + count(*) into v_certs from public.shift_round_certificates c
     where c.entry_id = en.id and c.tombstoned_at is null;
    delete from public.shift_round_entries e where e.id = en.id;   -- cascades + tombstone trigger
    v_entries := v_entries + 1;
    v_prefixes := v_prefixes || (en.round_id::text || '/' || p_uid::text || '/');
  end loop;

  update public.shift_round_events ev set user_id = null
   where ev.user_id = p_uid and (p_round_id is null or ev.round_id = p_round_id);
  update public.shift_round_events ev set actor_id = null
   where ev.actor_id = p_uid and ev.user_id is null and (p_round_id is null or ev.round_id = p_round_id);
  delete from public.shift_round_nudge_ledger l
   where l.user_id = p_uid and (p_round_id is null or l.round_id = p_round_id);
  if p_round_id is null then
    delete from public.shift_round_waitlist w where w.user_id = p_uid;
  end if;

  select coalesce(array_agg(o.name order by o.name), '{}') into v_paths
    from storage.objects o
   where o.bucket_id = 'shift-round-media'
     and split_part(o.name, '/', 2) = p_uid::text
     and (p_round_id is null or split_part(o.name, '/', 1) = p_round_id::text);

  if v_entries > 0 or cardinality(v_paths) > 0 then
    insert into public.shift_round_deletion_requests (user_id, round_id, reason, storage_paths, storage_prefixes)
    values (p_uid, p_round_id, p_reason, v_paths, v_prefixes)
    returning id into v_request;
    perform shift_round_private.emit('data_deleted', p_round_id, null, null, null,
      jsonb_build_object('entries', v_entries, 'certificates_revoked', v_certs, 'reason', p_reason));
  end if;

  return jsonb_build_object('deleted_entries', v_entries, 'certificates_revoked', v_certs,
                            'deletion_request_id', v_request);
end $$;

-- Current entry selection for home (3.6).
create or replace function shift_round_private.current_entry(p_uid uuid) returns public.shift_round_entries
language sql stable set search_path = '' as $$
  select e.* from public.shift_round_entries e join public.shift_rounds r on r.id = e.round_id
   where e.user_id = p_uid
   order by (shift_round_private.phase_of(r) in ('upcoming','active','review')) desc, r.starts_at desc, e.created_at desc
   limit 1
$$;

create or replace function shift_round_private.join_block_reason(r public.shift_rounds, p_uid uuid) returns text
language plpgsql stable set search_path = '' as $$
declare v_email text;
begin
  if exists (select 1 from public.shift_round_entries e join public.shift_rounds x on x.id = e.round_id
              where e.user_id = p_uid and x.id <> r.id
                and shift_round_private.phase_of(x) in ('upcoming','active')) then
    return 'already_in_active_round';
  end if;
  if shift_round_private.phase_of(r) not in ('upcoming','active')
     or shift_round_private.day_of(r, shift_round_private.round_now()) > r.join_cutoff_day then
    return 'join_closed';
  end if;
  if r.join_mode = 'invite' then
    select lower(u.email) into v_email from auth.users u where u.id = p_uid;
    if not exists (select 1 from public.shift_round_allowlist a
                    where a.round_id = r.id and (a.user_id = p_uid or (v_email is not null and a.email = v_email)))
       -- v2 2.6 (D6): an accepted, account-linked application for the round's cohort admits too.
       and not (r.application_cohort is not null and exists (
                  select 1 from public.shift_applications a
                   where a.user_id = p_uid and a.status = 'accepted' and a.cohort = r.application_cohort)) then
      return 'invite_only';
    end if;
  end if;
  return null;
end $$;

-- v2 2.5: the student-safe day plan from the mentors' shift_curriculum (one source of truth).
-- Row round = r.curriculum_key, else the 'default' row, else null. Copies only rules, the
-- interview guide and per day {day, name, goal, mission, refundSteps -> steps}; never
-- schedule, mentorChecks, date, sessionTime or mentorSession (session days come from the round).
-- Strings are clamped to 2000 chars, lists to 20 items; days outside 1..duration are dropped.
create or replace function shift_round_private.clamp_text(v jsonb, p_max int default 2000) returns text
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'string' then left(v #>> '{}', p_max) else '' end
$$;

create or replace function shift_round_private.clamp_text_list(v jsonb, p_max_items int default 20, p_max int default 2000)
returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(q.s order by q.i), '[]'::jsonb)
    from (select left(t.x #>> '{}', p_max) as s, t.i
            from jsonb_array_elements(case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end)
                 with ordinality as t(x, i)
           where jsonb_typeof(t.x) = 'string'
           order by t.i
           limit p_max_items) q
$$;

create or replace function shift_round_private.student_plan(r public.shift_rounds) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_content jsonb;
  v_source text;
  v_iv jsonb;
  v_last int;
begin
  if r.id is null then return null; end if;
  v_last := shift_round_private.effective_days(r);
  if r.curriculum_key is not null then
    select c.content into v_content from public.shift_curriculum c
     where c.round = r.curriculum_key and jsonb_typeof(c.content) = 'object';
    if found then v_source := 'curriculum'; end if;
  end if;
  if v_source is null then
    select c.content into v_content from public.shift_curriculum c
     where c.round = 'default' and jsonb_typeof(c.content) = 'object';
    if found then v_source := 'default'; end if;
  end if;
  if v_source is null then return null; end if;

  v_iv := case when jsonb_typeof(v_content->'interview') = 'object' then v_content->'interview' else '{}'::jsonb end;
  return jsonb_build_object(
    'source', v_source,
    'rules', shift_round_private.clamp_text_list(v_content->'rules'),
    'interview', jsonb_build_object(
      'intro', shift_round_private.clamp_text(v_iv->'intro'),
      'dm', shift_round_private.clamp_text(v_iv->'dm'),
      'questions', shift_round_private.clamp_text_list(v_iv->'questions'),
      'dos', shift_round_private.clamp_text_list(v_iv->'dos'),
      'donts', shift_round_private.clamp_text_list(v_iv->'donts')),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'name', d.name, 'goal', d.goal,
                                          'mission', d.mission, 'steps', d.steps) order by d.day)
        from (
          select distinct on (x.day) x.day, x.name, x.goal, x.mission, x.steps
            from (
              select (t.dj->>'day')::int as day, t.i,
                     shift_round_private.clamp_text(t.dj->'name') as name,
                     shift_round_private.clamp_text(t.dj->'goal') as goal,
                     shift_round_private.clamp_text(t.dj->'mission') as mission,
                     coalesce((
                       select jsonb_agg(st.n order by st.si)
                         from (select (s.sv #>> '{}')::int as n, s.si
                                 from jsonb_array_elements(case when jsonb_typeof(t.dj->'refundSteps') = 'array'
                                                                then t.dj->'refundSteps' else '[]'::jsonb end)
                                      with ordinality as s(sv, si)
                                where jsonb_typeof(s.sv) = 'number' and (s.sv #>> '{}') ~ '^[0-9]{1,2}$'
                                  and (s.sv #>> '{}')::int between 1 and 20
                                order by s.si
                                limit 20) st), '[]'::jsonb) as steps
                from jsonb_array_elements(case when jsonb_typeof(v_content->'days') = 'array'
                                               then v_content->'days' else '[]'::jsonb end)
                     with ordinality as t(dj, i)
               where jsonb_typeof(t.dj) = 'object' and jsonb_typeof(t.dj->'day') = 'number'
                 and (t.dj->>'day') ~ '^[0-9]{1,2}$'
            ) x
           where x.day between 1 and v_last
           order by x.day, x.i
           limit 20
        ) d), '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------
-- 3.2 Student RPCs
-- ---------------------------------------------------------------------------

create or replace function public.shift_round_home(p_entry_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  r public.shift_rounds;
  v_now timestamptz := shift_round_private.round_now();
  v_flags jsonb;
  v_squad jsonb;
  v_sm public.shift_round_squad_members;
  v_cert jsonb;
  v_summary jsonb;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;

  if p_entry_id is not null then
    select e.* into en from public.shift_round_entries e where e.id = p_entry_id and e.user_id = v_uid;
    if not found then return shift_round_private.fail('entry_not_found'); end if;
  else
    en := shift_round_private.current_entry(v_uid);
  end if;

  if en.id is not null then
    select x.* into r from public.shift_rounds x where x.id = en.round_id;
  else
    select x.* into r from public.shift_rounds x
     where x.status = 'published' and shift_round_private.phase_of(x) in ('upcoming','active')
       and shift_round_private.day_of(x, v_now) <= x.join_cutoff_day
     order by x.starts_at asc, x.number asc limit 1;
  end if;

  v_flags := jsonb_build_object(
    'tab_enabled', shift_round_private.flag_on('shift_round.tab_enabled', false),
    'enrollment_enabled', shift_round_private.flag_on('shift_round.enrollment_enabled', false),
    'submissions_enabled', shift_round_private.flag_on('shift_round.submissions_enabled', false),
    'transcription_enabled', shift_round_private.flag_on('shift_round.transcription_enabled', false),
    'emergency_message', coalesce(shift_round_private.flag('shift_round.emergency_message'), 'null'::jsonb),
    'web_base_url', shift_round_private.web_base_url());

  if en.id is not null then
    select sm.* into v_sm from public.shift_round_squad_members sm where sm.entry_id = en.id;
    if found then
      select jsonb_build_object('id', s.id, 'name', s.name,
               'members', (select count(*) from public.shift_round_squad_members x where x.squad_id = s.id),
               'latest', (select jsonb_build_object('handle', f->>'handle', 'kind', f->>'kind', 'type', f->>'type',
                                                     'n', (f->>'n')::int, 'at', f->'at')
                            from jsonb_array_elements(shift_round_private.squad_feed(s.id, en.id, 1)) f limit 1))
        into v_squad from public.shift_round_squads s where s.id = v_sm.squad_id;
    end if;
    select jsonb_build_object('id', c.id, 'public_id', c.public_id, 'status', c.status, 'issued_at', c.issued_at,
             'revoked_at', c.revoked_at, 'tombstone', c.tombstoned_at is not null,
             'render_version', c.render_version, 'verify_url', shift_round_private.verify_url(c.public_id))
      into v_cert from public.shift_round_certificates c where c.entry_id = en.id;
    select jsonb_build_object(
             'latest', (select jsonb_build_object('revision', s.revision, 'status', s.status, 'title', s.title,
                                'description', s.description, 'demo_url', s.demo_url,
                                'public_counts', s.public_counts, 'decision_reason', s.decision_reason)
                          from public.shift_round_summary_revisions s where s.entry_id = en.id
                         order by s.revision desc limit 1),
             'public_revision', (select s.revision from public.shift_round_summary_revisions s
                                  where s.entry_id = en.id and s.status = 'approved'))
      into v_summary
     where exists (select 1 from public.shift_round_summary_revisions s where s.entry_id = en.id);
  end if;

  return shift_round_private.ok(jsonb_build_object(
    'now', v_now,
    'flags', v_flags,
    'entry', case when en.id is null then null else jsonb_build_object(
      'id', en.id, 'round_id', en.round_id, 'track', en.track, 'handle', en.handle,
      'joined_at', en.joined_at, 'joined_day', en.joined_day, 'outcome', en.outcome,
      'name_display', en.name_display, 'has_legal_name', en.legal_name is not null,
      'summary_public', en.summary_public) end,
    'round', case when r.id is null then null else jsonb_build_object(
      'id', r.id, 'number', r.number, 'title_th', r.title_th, 'title_en', r.title_en,
      'brief_th', r.brief_th, 'brief_en', r.brief_en, 'starts_at', r.starts_at, 'closes_at', r.closes_at,
      'review_ends_at', r.review_ends_at, 'duration_days', shift_round_private.effective_days(r),
      'join_cutoff_day', r.join_cutoff_day, 'day', shift_round_private.day_of(r, v_now),
      'phase', shift_round_private.phase_of(r), 'discord_url', r.discord_url, 'join_mode', r.join_mode,
      'mentor_led', r.mentor_led, 'grace_minutes', r.grace_minutes,
      'session_days', to_jsonb(r.session_days),
      'session_start', to_char(r.session_start, 'HH24:MI'),
      'session_end', to_char(r.session_end, 'HH24:MI'),
      'application_cohort', r.application_cohort) end,
    'plan', case when r.id is null then null else shift_round_private.student_plan(r) end,
    'joinable', coalesce((
      select jsonb_agg(jsonb_build_object(
               'round_id', x.id, 'number', x.number, 'title_th', x.title_th, 'title_en', x.title_en,
               'starts_at', x.starts_at, 'closes_at', x.closes_at,
               'join_by', x.starts_at + make_interval(days => x.join_cutoff_day),
               'join_mode', x.join_mode,
               'can_join', shift_round_private.join_block_reason(x, v_uid) is null,
               'reason', shift_round_private.join_block_reason(x, v_uid),
               'session_days', to_jsonb(x.session_days),
               'session_start', to_char(x.session_start, 'HH24:MI'),
               'session_end', to_char(x.session_end, 'HH24:MI'),
               'duration_days', shift_round_private.effective_days(x)) order by x.starts_at, x.number)
        from public.shift_rounds x
       where x.status = 'published' and shift_round_private.phase_of(x) in ('upcoming','active')
         and not exists (select 1 from public.shift_round_entries e where e.round_id = x.id and e.user_id = v_uid)),
      '[]'::jsonb),
    'next_round', (select jsonb_build_object('number', x.number, 'starts_at', x.starts_at)
                     from public.shift_rounds x
                    where x.status = 'published' and x.starts_at > v_now and x.id is distinct from r.id
                    order by x.starts_at, x.number limit 1),
    'on_waitlist', exists (select 1 from public.shift_round_waitlist w where w.user_id = v_uid),
    'missions', case when en.id is null then null else shift_round_private.mission_counts(en.id) end,
    'evidence', case when en.id is null then '[]'::jsonb else coalesce((
      select jsonb_agg(shift_round_private.evidence_json(e, r) order by e.submitted_at desc)
        from public.shift_round_evidence e where e.entry_id = en.id), '[]'::jsonb) end,
    'checkins_due', case when en.id is null then '[]'::jsonb else to_jsonb(array_remove(array[
        case when shift_round_private.checkin_due(en, r, 'join') then 'join' end,
        case when shift_round_private.checkin_due(en, r, 'midpoint') then 'midpoint' end,
        case when shift_round_private.checkin_due(en, r, 'close') then 'close' end], null)) end,
    'checkins_done', case when en.id is null then '[]'::jsonb else coalesce((
      select jsonb_agg(c.checkpoint order by c.submitted_at) from public.shift_round_checkins c
       where c.entry_id = en.id), '[]'::jsonb) end,
    'squad', v_squad,
    'certificate', v_cert,
    'summary', v_summary,
    'past_certificates', coalesce((
      select jsonb_agg(jsonb_build_object('round_number', x.number, 'public_id', c.public_id, 'status', c.status,
                                          'verify_url', shift_round_private.verify_url(c.public_id))
                       order by x.number desc)
        from public.shift_round_certificates c join public.shift_rounds x on x.id = c.round_id
       where c.user_id = v_uid and c.entry_id is distinct from en.id), '[]'::jsonb)));
end $$;

create or replace function public.shift_round_join(
  p_round_id uuid, p_track text, p_birth_month int, p_birth_year int, p_guardian_consent boolean, p_handle text
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  en public.shift_round_entries;
  v_now timestamptz := shift_round_private.round_now();
  v_handle text := btrim(coalesce(p_handle, ''));
  v_reason text;
  v_retry int;
  v_today date;
  v_guardian boolean;
  v_day int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  perform pg_advisory_xact_lock(hashtextextended('shift_round_join:' || v_uid::text, 0));

  select x.* into r from public.shift_rounds x where x.id = p_round_id;
  if not found or r.status <> 'published' then return shift_round_private.fail('round_not_found'); end if;

  select e.* into en from public.shift_round_entries e where e.round_id = r.id and e.user_id = v_uid;
  if found then
    return shift_round_private.ok(jsonb_build_object('entry_id', en.id, 'guardian_required', en.guardian_required, 'already', true));
  end if;

  v_retry := shift_round_private.rate_retry_after(v_uid, 'join', 5, interval '1 minute');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;

  if not shift_round_private.flag_on('shift_round.enrollment_enabled', false) then
    return shift_round_private.fail('enrollment_paused');
  end if;
  v_reason := shift_round_private.join_block_reason(r, v_uid);
  if v_reason = 'join_closed' then return shift_round_private.fail('join_closed'); end if;
  if v_reason = 'invite_only' then return shift_round_private.fail('invite_only'); end if;
  if p_track is null or not (p_track = any (r.tracks_open)) then
    return shift_round_private.fail('track_not_open', 'track');
  end if;
  if v_reason = 'already_in_active_round' then return shift_round_private.fail('already_in_active_round'); end if;

  if shift_round_private.handle_problem(v_handle) is not null then
    return shift_round_private.fail('invalid_field', 'handle', null,
      jsonb_build_object('rule', shift_round_private.handle_problem(v_handle)));
  end if;
  v_today := shift_round_private.local_date(v_now);
  if p_birth_month is null or p_birth_year is null or p_birth_month not between 1 and 12
     or p_birth_year not between 1950 and 2020
     or (p_birth_year * 12 + p_birth_month) > (extract(year from v_today)::int * 12 + extract(month from v_today)::int) then
    return shift_round_private.fail('invalid_field', 'birth');
  end if;
  -- DS6: conservative in the birthday month (counts as still under 20 for the whole month).
  v_guardian := (extract(year from v_today)::int * 12 + extract(month from v_today)::int)
                - (p_birth_year * 12 + p_birth_month) <= 240;
  if v_guardian and coalesce(p_guardian_consent, false) is not true then
    return shift_round_private.fail('guardian_consent_required', 'guardian_consent');
  end if;

  v_day := greatest(shift_round_private.day_of(r, v_now), 0);
  insert into public.shift_round_entries (round_id, user_id, track, handle, birth_month, birth_year,
    guardian_required, guardian_consent_at, joined_at, joined_day)
  values (r.id, v_uid, p_track, v_handle, p_birth_month, p_birth_year,
    v_guardian, case when v_guardian then v_now end, v_now, v_day)
  returning * into en;

  perform shift_round_private.rate_hit(v_uid, 'join');
  perform shift_round_private.emit('round_joined', r.id, en.id, v_uid, v_uid,
    jsonb_build_object('track', p_track, 'joined_day', v_day, 'guardian_required', v_guardian));
  return shift_round_private.ok(jsonb_build_object('entry_id', en.id, 'guardian_required', v_guardian, 'already', false));
end $$;

create or replace function public.shift_round_set_handle(p_entry_id uuid, p_handle text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  v_handle text := btrim(coalesce(p_handle, ''));
  v_retry int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select e.* into en from public.shift_round_entries e where e.id = p_entry_id and e.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if en.handle = v_handle then return shift_round_private.ok(jsonb_build_object('handle', en.handle)); end if;
  if exists (select 1 from public.shift_round_certificates c where c.entry_id = en.id) then
    return shift_round_private.fail('certificate_issued');
  end if;
  if shift_round_private.handle_problem(v_handle) is not null then
    return shift_round_private.fail('invalid_field', 'handle', null,
      jsonb_build_object('rule', shift_round_private.handle_problem(v_handle)));
  end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'set_handle', 10, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;
  update public.shift_round_entries e set handle = v_handle where e.id = en.id;
  perform shift_round_private.rate_hit(v_uid, 'set_handle');
  return shift_round_private.ok(jsonb_build_object('handle', v_handle));
end $$;

create or replace function public.shift_round_submit_evidence(
  p_entry_id uuid, p_submission_id uuid, p_type text, p_payload jsonb, p_media jsonb,
  p_client_created_at timestamptz, p_replaces_evidence_id uuid default null
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  r public.shift_rounds;
  e public.shift_round_evidence;
  v_now timestamptz := shift_round_private.round_now();
  v_hash text;
  v_valid jsonb;
  v_media jsonb;
  v_payload jsonb;
  v_source uuid;
  s public.shift_round_evidence;
  v_retry int;
  v_before jsonb;
  v_after jsonb;
  v_newly text[];
  v_client timestamptz;
  v_new_id uuid;
  m jsonb;
  k text;
  v_constraint text;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if p_submission_id is null then return shift_round_private.fail('missing_field', 'submission_id'); end if;
  select x.* into r from public.shift_rounds x where x.id = en.round_id;

  -- E5 replay, before kill switch / close / rate checks.
  v_hash := shift_round_private.payload_hash(p_type, p_payload, p_media);
  select x.* into e from public.shift_round_evidence x where x.entry_id = en.id and x.submission_id = p_submission_id;
  if found then
    if e.payload_hash <> v_hash then return shift_round_private.fail('submission_conflict'); end if;
    return shift_round_private.ok(shift_round_private.receipt(e, r, true, shift_round_private.mission_counts(en.id),
      array(select ev.props->>'mission' from public.shift_round_events ev
             where ev.entry_id = en.id and ev.name = 'mission_completed' and ev.props->>'evidence_id' = e.id::text
             order by ev.id)));
  end if;

  if not shift_round_private.flag_on('shift_round.submissions_enabled', false) then
    return shift_round_private.fail('submissions_paused');
  end if;
  if v_now >= r.review_ends_at then return shift_round_private.fail('round_finished'); end if;

  v_media := shift_round_private.validate_media(p_media, p_type, r, v_uid);
  -- payload first (spec order), but mvp needs to know whether a photo is attached
  v_valid := shift_round_private.validate_payload(p_type, p_payload, r,
    coalesce(jsonb_typeof(p_media) = 'array' and exists (select 1 from jsonb_array_elements(p_media) x where x->>'kind' = 'photo'), false));
  if not (v_valid->>'ok')::boolean then return v_valid->'error_envelope'; end if;
  if not (v_media->>'ok')::boolean then return v_media->'error_envelope'; end if;
  v_payload := v_valid->'payload';

  if p_type = 'change' then
    v_source := (v_payload->>'source_evidence_id')::uuid;
    select x.* into s from public.shift_round_evidence x
     where x.id = v_source and x.entry_id = en.id and x.type in ('interview','tester');
    if not found or not shift_round_private.evidence_counts(s, r) then
      return shift_round_private.fail('invalid_change_source', 'source_evidence_id');
    end if;
  end if;
  if p_replaces_evidence_id is not null and not exists (
       select 1 from public.shift_round_evidence x where x.id = p_replaces_evidence_id and x.entry_id = en.id) then
    return shift_round_private.fail('invalid_field', 'replaces_evidence_id');
  end if;

  select case when count(*) >= r.rate_limit_per_hour
           then greatest(1, ceil(extract(epoch from (min(t.submitted_at) + interval '1 hour' - v_now)))::int) end
    into v_retry
    from (select x.submitted_at from public.shift_round_evidence x
           where x.entry_id = en.id and x.submitted_at > v_now - interval '1 hour'
           order by x.submitted_at desc limit r.rate_limit_per_hour) t;
  if v_retry is not null then
    perform shift_round_private.emit('rate_limited', r.id, en.id, v_uid, v_uid, '{"rpc":"submit_evidence"}');
    return shift_round_private.fail('rate_limited', null, v_retry);
  end if;

  -- 2.6 lock order: round (share) -> entry (update) -> evidence rows.
  select x.* into r from public.shift_rounds x where x.id = en.round_id for share;
  en := shift_round_private.lock_entry(en.id);
  if en.id is null then return shift_round_private.fail('entry_not_found'); end if;
  if v_now >= r.review_ends_at then return shift_round_private.fail('round_finished'); end if;
  -- validate_media ran before the entry lock; a concurrent submit of the same object may
  -- have committed while we waited (same path => same user => same entry lock).
  if exists (select 1 from jsonb_array_elements(v_media->'items') i
               join public.shift_round_evidence_media em on em.path = i->>'path') then
    return shift_round_private.fail('media_in_use', 'media');
  end if;
  v_before := shift_round_private.mission_counts(en.id);

  v_client := least(coalesce(p_client_created_at, v_now), v_now + interval '5 minutes');
  v_client := greatest(v_client, en.joined_at);

  -- Subtransaction: a unique_violation on the media path (backstop for the re-check above)
  -- rolls back the evidence row too and answers with the media_in_use envelope.
  begin
  insert into public.shift_round_evidence (entry_id, round_id, user_id, submission_id, type, payload,
    payload_hash, who_key, source_evidence_id, replaces_evidence_id, client_created_at, submitted_at, local_date)
  values (en.id, r.id, v_uid, p_submission_id, p_type, v_payload, v_hash,
    case when p_type in ('contact','interview','tester') then shift_round_private.who_key(v_payload->>'who_label') end,
    v_source, p_replaces_evidence_id, v_client, v_now, shift_round_private.local_date(v_now))
  on conflict (entry_id, submission_id) do nothing
  returning id into v_new_id;

  if v_new_id is null then
    -- concurrent replay won the race
    select x.* into e from public.shift_round_evidence x where x.entry_id = en.id and x.submission_id = p_submission_id;
    if e.payload_hash <> v_hash then return shift_round_private.fail('submission_conflict'); end if;
    return shift_round_private.ok(shift_round_private.receipt(e, r, true, shift_round_private.mission_counts(en.id), '{}'));
  end if;

  for m in select * from jsonb_array_elements(v_media->'items') loop
    insert into public.shift_round_evidence_media (evidence_id, entry_id, round_id, user_id, kind, path, bytes,
      duration_ms, consent_confirmed)
    values (v_new_id, en.id, r.id, v_uid, m->>'kind', m->>'path', (m->>'bytes')::int,
      nullif(m->>'duration_ms', '')::int, true);
  end loop;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'shift_round_evidence_media_path_key' then
      return shift_round_private.fail('media_in_use', 'media');
    end if;
    raise;
  end;

  select x.* into e from public.shift_round_evidence x where x.id = v_new_id;
  v_after := shift_round_private.mission_counts(en.id);
  v_newly := array(select x from unnest(shift_round_private.completed_keys(v_after)) x
                    where not (x = any (shift_round_private.completed_keys(v_before))));

  perform shift_round_private.emit('evidence_logged', r.id, en.id, v_uid, v_uid,
    jsonb_build_object('evidence_id', e.id, 'type', e.type, 'counted', shift_round_private.evidence_counts(e, r),
                       'media', jsonb_array_length(v_media->'items')));
  foreach k in array v_newly loop
    perform shift_round_private.emit('mission_completed', r.id, en.id, v_uid, v_uid,
      jsonb_build_object('evidence_id', e.id, 'mission', k));
  end loop;

  return shift_round_private.ok(shift_round_private.receipt(e, r, false, v_after, v_newly));
end $$;

create or replace function public.shift_round_withdraw_evidence(p_evidence_id uuid, p_dry_run boolean default true) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  e public.shift_round_evidence;
  r public.shift_rounds;
  v_before jsonb;
  v_after jsonb;
  v_affected jsonb;
  v_invalidated jsonb;
  v_retry int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into e from public.shift_round_evidence x where x.id = p_evidence_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('evidence_not_found'); end if;
  select x.* into r from public.shift_rounds x where x.id = e.round_id;

  if e.status = 'withdrawn' then
    return shift_round_private.ok(jsonb_build_object('affected', '[]'::jsonb, 'invalidated_changes', '[]'::jsonb,
      'applied', not coalesce(p_dry_run, true), 'already', true, 'missions', shift_round_private.mission_counts(e.entry_id)));
  end if;
  if exists (select 1 from public.shift_round_certificates c where c.entry_id = e.entry_id) then
    return shift_round_private.fail('withdraw_after_issue');
  end if;
  if shift_round_private.round_now() >= r.review_ends_at then return shift_round_private.fail('review_closed'); end if;
  if e.status <> 'submitted' then return shift_round_private.fail('withdraw_not_allowed'); end if;

  if not coalesce(p_dry_run, true) then
    v_retry := shift_round_private.rate_retry_after(v_uid, 'withdraw', 30, interval '1 hour');
    if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;
    select x.* into r from public.shift_rounds x where x.id = e.round_id for share;
    perform shift_round_private.lock_entry(e.entry_id);
    select x.* into e from public.shift_round_evidence x where x.id = p_evidence_id for update;
    -- re-check under the locks: an issue may have committed while we waited (race test 3)
    if exists (select 1 from public.shift_round_certificates c where c.entry_id = e.entry_id) then
      return shift_round_private.fail('withdraw_after_issue');
    end if;
    if shift_round_private.round_now() >= r.review_ends_at then return shift_round_private.fail('review_closed'); end if;
    if e.status <> 'submitted' then return shift_round_private.fail('withdraw_not_allowed'); end if;
  end if;

  v_before := shift_round_private.mission_counts(e.entry_id);
  v_after := shift_round_private.mission_counts(e.entry_id, e.id);
  v_affected := shift_round_private.mission_diff(v_before, v_after);
  select coalesce(jsonb_agg(c.id), '[]'::jsonb) into v_invalidated
    from public.shift_round_evidence c
   where c.entry_id = e.entry_id and c.type = 'change'
     and shift_round_private.evidence_counts(c, r) and not shift_round_private.evidence_counts(c, r, e.id)
     and c.id <> e.id;

  if coalesce(p_dry_run, true) then
    return shift_round_private.ok(jsonb_build_object('affected', v_affected, 'invalidated_changes', v_invalidated,
      'applied', false, 'missions', v_after));
  end if;

  update public.shift_round_evidence x
     set status = 'withdrawn', status_changed_at = shift_round_private.round_now(), status_changed_by = v_uid
   where x.id = e.id;
  perform shift_round_private.rate_hit(v_uid, 'withdraw');
  perform shift_round_private.emit('evidence_withdrawn', e.round_id, e.entry_id, v_uid, v_uid,
    jsonb_build_object('evidence_id', e.id, 'type', e.type, 'invalidated_changes', v_invalidated));
  return shift_round_private.ok(jsonb_build_object('affected', v_affected, 'invalidated_changes', v_invalidated,
    'applied', true, 'missions', shift_round_private.mission_counts(e.entry_id)));
end $$;

create or replace function public.shift_round_submit_checkin(p_entry_id uuid, p_checkpoint text, p_answers jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  r public.shift_rounds;
  allowed text[];
  k text;
  v jsonb;
  clean jsonb := '{}'::jsonb;
  v_retry int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  select x.* into r from public.shift_rounds x where x.id = en.round_id;
  allowed := case p_checkpoint
    when 'join' then array['ownership','why','confidence']
    when 'midpoint' then array['ownership','squad','decided_myself']
    when 'close' then array['ownership','why','confidence','squad','satisfied','can_do_now'] end;
  if allowed is null then return shift_round_private.fail('invalid_field', 'checkpoint'); end if;
  if exists (select 1 from public.shift_round_checkins c where c.entry_id = en.id and c.checkpoint = p_checkpoint) then
    return shift_round_private.fail('checkin_already_submitted');
  end if;
  if not shift_round_private.checkin_due(en, r, p_checkpoint) then return shift_round_private.fail('checkin_not_due'); end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    return shift_round_private.fail('invalid_field', 'answers');
  end if;
  for k, v in select * from jsonb_each(p_answers) loop
    if not (k = any (allowed)) then return shift_round_private.fail('invalid_field', k, null, '{"rule":"unknown_key"}'); end if;
    if jsonb_typeof(v) = 'null' then continue; end if;
    if k in ('ownership','confidence','squad','satisfied') then
      if jsonb_typeof(v) <> 'number' or (v #>> '{}') !~ '^[1-5]$' then return shift_round_private.fail('invalid_field', k); end if;
      clean := clean || jsonb_build_object(k, (v #>> '{}')::int);
    elsif k = 'why' then
      if jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('had_to','portfolio','wanted_to','care_people') then
        return shift_round_private.fail('invalid_field', k);
      end if;
      clean := clean || jsonb_build_object(k, v #>> '{}');
    else
      if jsonb_typeof(v) <> 'string' or char_length(btrim(v #>> '{}')) > 500 then return shift_round_private.fail('invalid_field', k); end if;
      if btrim(v #>> '{}') <> '' then clean := clean || jsonb_build_object(k, btrim(v #>> '{}')); end if;
    end if;
  end loop;
  if clean = '{}'::jsonb then return shift_round_private.fail('invalid_field', 'answers', null, '{"rule":"at_least_one"}'); end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'checkin', 10, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;

  insert into public.shift_round_checkins (entry_id, checkpoint, answers, submitted_at)
  values (en.id, p_checkpoint, clean, shift_round_private.round_now())
  on conflict (entry_id, checkpoint) do nothing;
  if not found then return shift_round_private.fail('checkin_already_submitted'); end if;
  perform shift_round_private.rate_hit(v_uid, 'checkin');
  perform shift_round_private.emit('checkin_submitted', r.id, en.id, v_uid, v_uid,
    jsonb_build_object('checkpoint', p_checkpoint, 'keys', (select jsonb_agg(x) from jsonb_object_keys(clean) x)));
  return shift_round_private.ok(jsonb_build_object('checkpoint', p_checkpoint));
end $$;

create or replace function public.shift_round_squad(p_entry_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  r public.shift_rounds;
  sq public.shift_round_squads;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  select x.* into r from public.shift_rounds x where x.id = en.round_id;
  select s.* into sq from public.shift_round_squads s
    join public.shift_round_squad_members sm on sm.squad_id = s.id where sm.entry_id = en.id;
  if not found then
    -- spec: squad_not_assigned "data still returns waiting state" -> success envelope with state
    return shift_round_private.ok(jsonb_build_object(
      'state', case when shift_round_private.phase_of(r) = 'finished' then 'none' else 'waiting' end,
      'squad', null, 'members', '[]'::jsonb, 'feed', '[]'::jsonb));
  end if;
  return shift_round_private.ok(jsonb_build_object(
    'state', 'assigned',
    'squad', jsonb_build_object('id', sq.id, 'name', sq.name, 'discord_url', coalesce(sq.discord_url, r.discord_url),
      'mentor', case when sq.mentor_user_id is null then null else jsonb_build_object('display_name',
        (select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.username), ''), 'Mentor')
           from public.profiles p where p.id = sq.mentor_user_id)) end),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'entry_id', m.id, 'handle', m.handle, 'is_me', m.id = en.id,
               'question', jsonb_build_object('id', q.id, 'th', q.text_th, 'en', q.text_en),
               'answer', sm.icebreaker_answer,
               'missions_complete', (shift_round_private.mission_counts(m.id)->>'missions_complete')::int)
             order by sm.added_at, m.handle)
        from public.shift_round_squad_members sm
        join public.shift_round_entries m on m.id = sm.entry_id
        join public.shift_round_icebreaker_questions q on q.id = sm.icebreaker_question
       where sm.squad_id = sq.id), '[]'::jsonb),
    'feed', shift_round_private.squad_feed(sq.id, en.id, 30)));
end $$;

create or replace function public.shift_round_set_icebreaker(p_entry_id uuid, p_answer text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  v_answer text := btrim(coalesce(p_answer, ''));
  v_retry int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if not exists (select 1 from public.shift_round_squad_members sm where sm.entry_id = en.id) then
    return shift_round_private.fail('squad_not_assigned');
  end if;
  if char_length(v_answer) not between 1 and 140 then return shift_round_private.fail('invalid_field', 'answer'); end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'icebreaker', 20, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;
  update public.shift_round_squad_members sm
     set icebreaker_answer = v_answer, answered_at = shift_round_private.round_now()
   where sm.entry_id = en.id;
  perform shift_round_private.rate_hit(v_uid, 'icebreaker');
  perform shift_round_private.emit('icebreaker_answered', en.round_id, en.id, v_uid, v_uid, '{}');
  return shift_round_private.ok(jsonb_build_object('answer', v_answer));
end $$;

create or replace function public.shift_round_send_cheer(p_entry_id uuid, p_to_entry_id uuid, p_evidence_id uuid default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  v_from_squad uuid;
  v_to_squad uuid;
  v_existing uuid;
  v_id uuid;
  v_now timestamptz := shift_round_private.round_now();
  v_count int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if p_to_entry_id is null or p_to_entry_id = en.id then return shift_round_private.fail('invalid_field', 'to_entry_id'); end if;
  select sm.squad_id into v_from_squad from public.shift_round_squad_members sm where sm.entry_id = en.id;
  if v_from_squad is null then return shift_round_private.fail('squad_not_assigned'); end if;
  select sm.squad_id into v_to_squad from public.shift_round_squad_members sm where sm.entry_id = p_to_entry_id;
  if v_to_squad is distinct from v_from_squad then return shift_round_private.fail('not_same_squad'); end if;
  if p_evidence_id is not null then
    if not exists (select 1 from public.shift_round_evidence e where e.id = p_evidence_id and e.entry_id = p_to_entry_id
                     and e.status in ('submitted','accepted')) then
      return shift_round_private.fail('invalid_field', 'evidence_id');
    end if;
    select c.id into v_existing from public.shift_round_cheers c
     where c.from_entry_id = en.id and c.evidence_id = p_evidence_id;
    if v_existing is not null then return shift_round_private.ok(jsonb_build_object('cheer_id', v_existing, 'already', true)); end if;
  end if;
  select count(*) into v_count from public.shift_round_cheers c
   where c.from_entry_id = en.id
     and shift_round_private.local_date(c.created_at) = shift_round_private.local_date(v_now);
  if v_count >= 20 then
    return shift_round_private.fail('cheer_limit', null,
      greatest(1, ceil(extract(epoch from (((shift_round_private.local_date(v_now) + 1)::timestamp at time zone 'Asia/Bangkok') - v_now)))::int));
  end if;
  insert into public.shift_round_cheers (round_id, squad_id, from_entry_id, to_entry_id, evidence_id, created_at)
  values (en.round_id, v_from_squad, en.id, p_to_entry_id, p_evidence_id, v_now)
  on conflict do nothing
  returning id into v_id;
  if v_id is null then
    select c.id into v_id from public.shift_round_cheers c where c.from_entry_id = en.id and c.evidence_id = p_evidence_id;
    return shift_round_private.ok(jsonb_build_object('cheer_id', v_id, 'already', true));
  end if;
  perform shift_round_private.emit('cheer_sent', en.round_id, en.id, v_uid, v_uid,
    jsonb_build_object('cheer_id', v_id, 'to_entry_id', p_to_entry_id, 'evidence_id', p_evidence_id));
  return shift_round_private.ok(jsonb_build_object('cheer_id', v_id));
end $$;

create or replace function public.shift_round_submit_summary(
  p_entry_id uuid, p_title text, p_description text, p_demo_url text, p_public_counts jsonb
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  v_title text := btrim(coalesce(p_title, ''));
  v_desc text := btrim(coalesce(p_description, ''));
  v_url text := nullif(btrim(coalesce(p_demo_url, '')), '');
  v_counts jsonb := coalesce(p_public_counts, '{"people_talked_to":true,"testers":true,"missions":true}'::jsonb);
  k text;
  v jsonb;
  v_retry int;
  v_rev int;
  v_id uuid;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if char_length(v_title) not between 1 and 80 then return shift_round_private.fail('invalid_field', 'title'); end if;
  if char_length(v_desc) not between 1 and 600 then return shift_round_private.fail('invalid_field', 'description'); end if;
  if v_url is not null and not shift_round_private.is_https_url(v_url) then return shift_round_private.fail('link_not_https', 'demo_url'); end if;
  if jsonb_typeof(v_counts) <> 'object' then return shift_round_private.fail('invalid_field', 'public_counts'); end if;
  for k, v in select * from jsonb_each(v_counts) loop
    if k not in ('people_talked_to','testers','missions') or jsonb_typeof(v) <> 'boolean' then
      return shift_round_private.fail('invalid_field', 'public_counts');
    end if;
  end loop;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'summary', 10, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;

  perform shift_round_private.lock_entry(en.id);
  update public.shift_round_summary_revisions s set status = 'superseded'
   where s.entry_id = en.id and s.status = 'pending';
  select coalesce(max(s.revision), 0) + 1 into v_rev from public.shift_round_summary_revisions s where s.entry_id = en.id;
  insert into public.shift_round_summary_revisions (entry_id, revision, title, description, demo_url, public_counts, created_at)
  values (en.id, v_rev, v_title, v_desc, v_url, v_counts, shift_round_private.round_now())
  returning id into v_id;
  perform shift_round_private.rate_hit(v_uid, 'summary');
  perform shift_round_private.emit('summary_submitted', en.round_id, en.id, v_uid, v_uid,
    jsonb_build_object('revision_id', v_id, 'revision', v_rev));
  return shift_round_private.ok(jsonb_build_object('revision_id', v_id, 'revision', v_rev, 'status', 'pending'));
end $$;

create or replace function public.shift_round_set_summary_public(p_entry_id uuid, p_public boolean) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  en public.shift_round_entries;
  v_retry int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into en from public.shift_round_entries x where x.id = p_entry_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('entry_not_found'); end if;
  if p_public is null then return shift_round_private.fail('invalid_field', 'public'); end if;
  if en.summary_public = p_public then return shift_round_private.ok(jsonb_build_object('summary_public', p_public)); end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'summary_public', 20, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;
  update public.shift_round_entries x set summary_public = p_public where x.id = en.id;
  update public.shift_round_certificates c set render_version = c.render_version + 1
   where c.entry_id = en.id and c.tombstoned_at is null;
  perform shift_round_private.rate_hit(v_uid, 'summary_public');
  return shift_round_private.ok(jsonb_build_object('summary_public', p_public));
end $$;

create or replace function public.shift_round_set_certificate_name(
  p_certificate_id uuid, p_display text, p_legal_name text default null
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  c public.shift_round_certificates;
  en public.shift_round_entries;
  v_legal text := nullif(btrim(coalesce(p_legal_name, '')), '');
  v_retry int;
  v_version int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into c from public.shift_round_certificates x where x.id = p_certificate_id and x.user_id = v_uid;
  if not found or c.entry_id is null then return shift_round_private.fail('certificate_not_found'); end if;
  if c.status = 'revoked' then return shift_round_private.fail('certificate_revoked'); end if;
  if p_display not in ('handle','legal') or p_display is null then return shift_round_private.fail('invalid_field', 'display'); end if;
  select x.* into en from public.shift_round_entries x where x.id = c.entry_id;
  v_legal := coalesce(v_legal, case when p_display = 'legal' then en.legal_name end);
  if p_display = 'legal' and (v_legal is null or char_length(v_legal) not between 2 and 60
                              or shift_round_private.has_personal_data(v_legal)) then
    return shift_round_private.fail('invalid_field', 'legal_name');
  end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'certificate_name', 10, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;

  perform 1 from public.shift_rounds r where r.id = c.round_id for share;
  perform shift_round_private.lock_entry(en.id);
  update public.shift_round_entries x
     set name_display = p_display, legal_name = coalesce(v_legal, x.legal_name)
   where x.id = en.id;
  update public.shift_round_certificates x
     set snapshot = jsonb_set(x.snapshot, '{holder}', jsonb_build_object(
           'handle', en.handle,
           'legal_name', case when p_display = 'legal' then v_legal end,
           'display', p_display)),
         render_version = x.render_version + 1
   where x.id = c.id
  returning x.render_version into v_version;
  perform shift_round_private.rate_hit(v_uid, 'certificate_name');
  perform shift_round_private.emit('certificate_name_changed', c.round_id, en.id, v_uid, v_uid,
    jsonb_build_object('certificate_id', c.id, 'display', p_display));
  return shift_round_private.ok(jsonb_build_object('display', p_display, 'render_version', v_version));
end $$;

create or replace function public.shift_round_log_share(p_certificate_id uuid, p_format text, p_target text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  c public.shift_round_certificates;
  v_retry int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  select x.* into c from public.shift_round_certificates x where x.id = p_certificate_id and x.user_id = v_uid;
  if not found then return shift_round_private.fail('certificate_not_found'); end if;
  if p_format is null or p_format not in ('story','square','link') then return shift_round_private.fail('invalid_field', 'format'); end if;
  if p_target is null or p_target not in ('instagram_story','share_sheet','copy') then return shift_round_private.fail('invalid_field', 'target'); end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'share', 30, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;
  perform shift_round_private.rate_hit(v_uid, 'share');
  perform shift_round_private.emit('certificate_shared', c.round_id, c.entry_id, v_uid, v_uid,
    jsonb_build_object('certificate_id', c.id, 'format', p_format, 'target', p_target));
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_join_waitlist() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_retry int;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if exists (select 1 from public.shift_round_waitlist w where w.user_id = v_uid) then
    return shift_round_private.ok(jsonb_build_object('already', true));
  end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'waitlist', 5, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;
  insert into public.shift_round_waitlist (user_id, created_at) values (v_uid, shift_round_private.round_now())
  on conflict (user_id) do nothing;
  perform shift_round_private.rate_hit(v_uid, 'waitlist');
  perform shift_round_private.emit('waitlist_joined', null, null, v_uid, v_uid, '{}');
  return shift_round_private.ok('{}'::jsonb);
end $$;

create or replace function public.shift_round_delete_my_data(p_round_id uuid default null, p_confirm text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_retry int;
  v_result jsonb;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if p_confirm is distinct from 'DELETE' then return shift_round_private.fail('invalid_field', 'confirm'); end if;
  v_retry := shift_round_private.rate_retry_after(v_uid, 'delete_my_data', 5, interval '1 hour');
  if v_retry is not null then return shift_round_private.fail('rate_limited', null, v_retry); end if;
  v_result := shift_round_private.delete_user_round_data(v_uid, p_round_id, 'holder_request');
  perform shift_round_private.rate_hit(v_uid, 'delete_my_data');
  return shift_round_private.ok(v_result);
end $$;

create or replace function public.shift_round_transcription_check(p_path text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.shift_rounds;
  o record;
  v_round uuid;
  v_count int;
  v_oldest timestamptz;
  v_now timestamptz := shift_round_private.round_now();
  v_lang text;
  v_bytes bigint;
begin
  if v_uid is null then return shift_round_private.fail('unauthenticated'); end if;
  if not shift_round_private.flag_on('shift_round.transcription_enabled', false) then
    return shift_round_private.fail('transcription_paused');
  end if;
  if p_path is null or not shift_round_private.media_path_ok(p_path) or p_path !~ '/audio\.m4a$'
     or split_part(p_path, '/', 2) <> v_uid::text then
    return shift_round_private.fail('media_not_owned', 'path');
  end if;
  v_round := split_part(p_path, '/', 1)::uuid;
  select x.* into r from public.shift_rounds x where x.id = v_round;
  if not found or not exists (select 1 from public.shift_round_entries e where e.round_id = v_round and e.user_id = v_uid) then
    return shift_round_private.fail('media_not_owned', 'path');
  end if;
  select so.owner_id, so.owner, so.metadata into o from storage.objects so where so.bucket_id = 'shift-round-media' and so.name = p_path;
  if not found then return shift_round_private.fail('media_missing', 'path'); end if;
  if coalesce(o.owner_id, o.owner::text) is distinct from v_uid::text then
    return shift_round_private.fail('media_not_owned', 'path');
  end if;
  -- 6.3: 5 MB cap, enforced from storage metadata before the server downloads anything
  -- (and before the hourly quota is spent).
  v_bytes := case when (o.metadata->>'size') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint end;
  if v_bytes > 5242880 then return shift_round_private.fail('audio_too_long', 'path'); end if;
  if v_now >= r.review_ends_at then return shift_round_private.fail('round_finished'); end if;
  select count(*), min(ev.created_at) into v_count, v_oldest from (
    select x.created_at from public.shift_round_events x
     where x.user_id = v_uid and x.name = 'transcription_requested' and x.created_at > v_now - interval '1 hour'
     order by x.created_at desc limit 20) ev;
  if v_count >= 20 then
    return shift_round_private.fail('rate_limited', null,
      greatest(1, ceil(extract(epoch from (v_oldest + interval '1 hour' - v_now)))::int));
  end if;
  perform shift_round_private.emit('transcription_requested', r.id, null, v_uid, v_uid, '{}');
  select coalesce(p.shift_round_language, 'th') into v_lang from public.profiles p where p.id = v_uid;
  return shift_round_private.ok(jsonb_build_object('max_seconds', 180, 'language_hint', coalesce(v_lang, 'th'),
    'bytes', v_bytes));
exception when invalid_text_representation then
  return shift_round_private.fail('media_not_owned', 'path');
end $$;

-- ---------------------------------------------------------------------------
-- 3.3 Public RPCs (anon + authenticated). Never return evidence, labels, user ids,
-- entry ids, birth data or reviewer-only links.
-- ---------------------------------------------------------------------------

create or replace function public.shift_round_certificate_public(p_public_id text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_id text := upper(btrim(coalesce(p_public_id, '')));
  c public.shift_round_certificates;
  en public.shift_round_entries;
  rv public.shift_round_summary_revisions;
  v_number int;
  v_snapshot jsonb;
  v_summary jsonb;
  v_counts jsonb := '{}'::jsonb;
begin
  if v_id !~ '^[0-9A-HJKMNP-TV-Z]{16}$' then return shift_round_private.fail('certificate_not_found'); end if;
  select x.* into c from public.shift_round_certificates x where x.public_id = v_id;
  if not found then return shift_round_private.fail('certificate_not_found'); end if;
  select r.number into v_number from public.shift_rounds r where r.id = c.round_id;

  if c.tombstoned_at is not null then
    v_snapshot := null;
  elsif c.status = 'revoked' then
    -- Revoked: round facts only; holder and counts hidden (6.1).
    v_snapshot := c.snapshot - 'holder' - 'counts' - 'track';
  else
    v_snapshot := c.snapshot;
  end if;

  if c.status = 'issued' and c.entry_id is not null then
    select x.* into en from public.shift_round_entries x where x.id = c.entry_id;
    if en.summary_public then
      select s.* into rv from public.shift_round_summary_revisions s where s.entry_id = en.id and s.status = 'approved';
      if found then
        if coalesce((rv.public_counts->>'people_talked_to')::boolean, false) then
          v_counts := v_counts || jsonb_build_object('people_talked_to', c.snapshot->'counts'->'people_talked_to');
        end if;
        if coalesce((rv.public_counts->>'testers')::boolean, false) then
          v_counts := v_counts || jsonb_build_object('testers', c.snapshot->'counts'->'testers');
        end if;
        if coalesce((rv.public_counts->>'missions')::boolean, false) then
          v_counts := v_counts || jsonb_build_object('missions', jsonb_array_length(coalesce(c.snapshot->'missions', '[]'::jsonb)));
        end if;
        v_summary := jsonb_build_object('title', rv.title, 'description', rv.description,
                                        'demo_url', rv.demo_url, 'counts', v_counts);
      end if;
    end if;
  end if;

  return shift_round_private.ok(jsonb_build_object(
    'status', case when c.status = 'issued' then 'valid' else 'revoked' end,
    'tombstone', c.tombstoned_at is not null,
    'round_number', v_number,
    'snapshot', v_snapshot,
    'revoked_at', c.revoked_at,
    'render_version', c.render_version,
    'verify_url', shift_round_private.verify_url(c.public_id),
    'summary', v_summary));
end $$;

create or replace function public.shift_round_log_certificate_visit(p_public_id text, p_ref text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id text := upper(btrim(coalesce(p_public_id, '')));
  c public.shift_round_certificates;
  v_ref text := lower(btrim(coalesce(p_ref, '')));
  v_now timestamptz := shift_round_private.round_now();
  v_day_start timestamptz;
begin
  if v_id !~ '^[0-9A-HJKMNP-TV-Z]{16}$' then return shift_round_private.fail('certificate_not_found'); end if;
  select x.* into c from public.shift_round_certificates x where x.public_id = v_id;
  if not found then return shift_round_private.fail('certificate_not_found'); end if;
  v_ref := case when v_ref = '' then null when v_ref in ('share','qr','link') then v_ref else 'other' end;
  v_day_start := shift_round_private.local_date(v_now)::timestamp at time zone 'Asia/Bangkok';
  if (select count(*) from public.shift_round_events ev
       where ev.name = 'certificate_visit' and ev.round_id = c.round_id
         and ev.created_at >= v_day_start and ev.props->>'certificate_id' = c.id::text) < 500 then
    perform shift_round_private.emit('certificate_visit', c.round_id, c.entry_id, null, null,
      jsonb_build_object('certificate_id', c.id, 'ref', v_ref));
  end if;
  return shift_round_private.ok('{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

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
    'public.shift_round_home(uuid)',
    'public.shift_round_join(uuid,text,int,int,boolean,text)',
    'public.shift_round_set_handle(uuid,text)',
    'public.shift_round_submit_evidence(uuid,uuid,text,jsonb,jsonb,timestamptz,uuid)',
    'public.shift_round_withdraw_evidence(uuid,boolean)',
    'public.shift_round_submit_checkin(uuid,text,jsonb)',
    'public.shift_round_squad(uuid)',
    'public.shift_round_set_icebreaker(uuid,text)',
    'public.shift_round_send_cheer(uuid,uuid,uuid)',
    'public.shift_round_submit_summary(uuid,text,text,text,jsonb)',
    'public.shift_round_set_summary_public(uuid,boolean)',
    'public.shift_round_set_certificate_name(uuid,text,text)',
    'public.shift_round_log_share(uuid,text,text)',
    'public.shift_round_join_waitlist()',
    'public.shift_round_delete_my_data(uuid,text)',
    'public.shift_round_transcription_check(text)']
  loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  foreach f in array array[
    'public.shift_round_certificate_public(text)',
    'public.shift_round_log_certificate_visit(text,text)']
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
