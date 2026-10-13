\set ON_ERROR_STOP on
begin;
\ir shift_round_helpers.psql
select plan(56);

-- Fixtures: exact copy of supabase/tests/fixtures/shift_round_payloads.json (keep in sync).
create temp table fx on commit drop as select $fx$
{"version": 1, "note": "Shared evidence payload fixtures (spec 2.3). Mirrored by ps_app lib/round/schema.ts (zod) and by the inline copy in supabase/tests/shift_round_submit.test.sql; keep the three in sync. Dates assume a round starting 2026-11-10 (ICT) and today = 2026-11-12. has_photo means a consented photo is attached in p_media.", "context": {"round_starts_on": "2026-11-10", "today": "2026-11-12"}, "valid": [{"name": "contact minimal", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "in_person", "occurred_on": "2026-11-12"}}, {"name": "contact with link, trimmed", "type": "contact", "payload": {"who_label": "  Khun Somchai  ", "channel": "chat", "occurred_on": "2026-11-03", "link": "https://example.com/x"}}, {"name": "interview text", "type": "interview", "payload": {"who_label": "Ploy", "occurred_on": "2026-11-11", "key_point": "She skips breakfast because the canteen queue is long", "input": "text"}}, {"name": "interview voice with transcript", "type": "interview", "payload": {"who_label": "Nok", "occurred_on": "2026-11-12", "key_point": "Queue", "transcript": "long text", "planned_change": "Try pre-orders", "input": "voice"}}, {"name": "problem statement", "type": "problem_statement", "payload": {"text": "Students skip breakfast because the queue is too long"}}, {"name": "mvp link", "type": "mvp", "payload": {"link": "https://example.com/mvp"}}, {"name": "mvp photo only", "type": "mvp", "payload": {"note": "paper prototype"}, "has_photo": true}, {"name": "tester", "type": "tester", "payload": {"who_label": "Beam", "occurred_on": "2026-11-12", "key_point": "Got stuck on step 2", "what_tried": "the order form"}}, {"name": "change changed", "type": "change", "payload": {"kind": "changed", "what": "Removed the sign-up step", "source_evidence_id": "8d0c3f8e-1b7a-4b7e-9a51-2f7b9d6f0a11"}}, {"name": "change decided not to", "type": "change", "payload": {"kind": "decided_not_to", "what": "Kept the price because testers did not mind", "source_evidence_id": "8d0c3f8e-1b7a-4b7e-9a51-2f7b9d6f0a11"}}, {"name": "demo public", "type": "demo_post", "payload": {"url": "https://www.instagram.com/p/abc", "visibility": "public"}}, {"name": "demo reviewer only", "type": "demo_post", "payload": {"url": "https://drive.google.com/file/d/abc", "visibility": "reviewer_only", "note": "private video"}}, {"name": "empty optional string dropped", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "other", "occurred_on": "2026-11-12", "link": "   "}}], "invalid": [{"name": "unknown type", "type": "selfie", "payload": {}, "code": "invalid_field", "field": "type"}, {"name": "unknown key", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "chat", "occurred_on": "2026-11-12", "phone": "1"}, "code": "invalid_field", "field": "phone"}, {"name": "missing who_label", "type": "contact", "payload": {"channel": "chat", "occurred_on": "2026-11-12"}, "code": "missing_field", "field": "who_label"}, {"name": "who_label blank", "type": "contact", "payload": {"who_label": "  ", "channel": "chat", "occurred_on": "2026-11-12"}, "code": "missing_field", "field": "who_label"}, {"name": "who_label too short", "type": "contact", "payload": {"who_label": "A", "channel": "chat", "occurred_on": "2026-11-12"}, "code": "invalid_field", "field": "who_label"}, {"name": "who_label phone", "type": "contact", "payload": {"who_label": "Ploy 081-234-5678", "channel": "chat", "occurred_on": "2026-11-12"}, "code": "invalid_field", "field": "who_label", "rule": "personal_data"}, {"name": "who_label email", "type": "interview", "payload": {"who_label": "ploy@example.com", "occurred_on": "2026-11-12", "key_point": "x"}, "code": "invalid_field", "field": "who_label", "rule": "personal_data"}, {"name": "who_label at-handle", "type": "tester", "payload": {"who_label": "@ploy.k", "occurred_on": "2026-11-12", "key_point": "x"}, "code": "invalid_field", "field": "who_label", "rule": "personal_data"}, {"name": "who_label line link", "type": "contact", "payload": {"who_label": "line.me/ti/p/abc", "channel": "chat", "occurred_on": "2026-11-12"}, "code": "invalid_field", "field": "who_label", "rule": "personal_data"}, {"name": "bad channel", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "pigeon", "occurred_on": "2026-11-12"}, "code": "invalid_field", "field": "channel"}, {"name": "occurred_on in future", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "chat", "occurred_on": "2026-11-13"}, "code": "invalid_field", "field": "occurred_on"}, {"name": "occurred_on too early", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "chat", "occurred_on": "2026-11-02"}, "code": "invalid_field", "field": "occurred_on"}, {"name": "occurred_on not a date", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "chat", "occurred_on": "yesterday"}, "code": "invalid_field", "field": "occurred_on"}, {"name": "http link", "type": "contact", "payload": {"who_label": "Aunt May", "channel": "chat", "occurred_on": "2026-11-12", "link": "http://example.com"}, "code": "link_not_https", "field": "link"}, {"name": "non-string value", "type": "problem_statement", "payload": {"text": 42}, "code": "invalid_field", "field": "text"}, {"name": "problem too short", "type": "problem_statement", "payload": {"text": "too short"}, "code": "invalid_field", "field": "text"}, {"name": "interview missing key point", "type": "interview", "payload": {"who_label": "Ploy", "occurred_on": "2026-11-12"}, "code": "missing_field", "field": "key_point"}, {"name": "key point too long", "type": "interview", "payload": {"who_label": "Ploy", "occurred_on": "2026-11-12", "key_point": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}, "code": "invalid_field", "field": "key_point"}, {"name": "bad input enum", "type": "interview", "payload": {"who_label": "Ploy", "occurred_on": "2026-11-12", "key_point": "x", "input": "telepathy"}, "code": "invalid_field", "field": "input"}, {"name": "mvp neither link nor photo", "type": "mvp", "payload": {"note": "soon"}, "code": "missing_field", "field": "link"}, {"name": "change missing source", "type": "change", "payload": {"kind": "changed", "what": "Removed a step"}, "code": "missing_field", "field": "source_evidence_id"}, {"name": "change bad kind", "type": "change", "payload": {"kind": "maybe", "what": "Removed a step", "source_evidence_id": "8d0c3f8e-1b7a-4b7e-9a51-2f7b9d6f0a11"}, "code": "invalid_field", "field": "kind"}, {"name": "change source not uuid", "type": "change", "payload": {"kind": "changed", "what": "Removed a step", "source_evidence_id": "nope"}, "code": "invalid_change_source", "field": "source_evidence_id"}, {"name": "demo missing visibility", "type": "demo_post", "payload": {"url": "https://example.com/demo"}, "code": "missing_field", "field": "visibility"}, {"name": "demo http url", "type": "demo_post", "payload": {"url": "http://example.com/demo", "visibility": "public"}, "code": "link_not_https", "field": "url"}, {"name": "payload not object", "type": "contact", "payload": ["x"], "code": "invalid_field", "field": "payload"}]}
$fx$::jsonb as j;

-- Round 2026-11-10 .. 2026-11-23 (closes 2026-11-24 00:00 ICT), review ends 2026-11-26 00:00 ICT.
select shift_test.clock('2026-11-12 10:00+07');
create temp table f on commit drop as select
  shift_test.round(9301, '2026-11-10 00:00+07') as r,
  shift_test.user() as u, shift_test.user() as other;
create temp table g on commit drop as select shift_test.entry(r, u) as e, shift_test.entry(r, other) as oe from f;
grant select on f, g to authenticated;

-- X6 fixtures through the SQL validator
select is(
  (select coalesce(array_agg(v->>'name'), '{}') from fx, jsonb_array_elements(j->'valid') v
    where not (shift_round_private.validate_payload(v->>'type', v->'payload',
                 (select x from public.shift_rounds x where x.id = (select r from f)),
                 coalesce((v->>'has_photo')::boolean, false))->>'ok')::boolean),
  '{}'::text[], 'all valid fixtures pass');
select is(
  (select coalesce(array_agg(v->>'name' || ' => ' || coalesce(res->'error_envelope'->'error'->>'code', 'ok') || '/' ||
                             coalesce(res->'error_envelope'->'error'->>'field', '-')), '{}')
     from fx, jsonb_array_elements(j->'invalid') v,
          lateral (select shift_round_private.validate_payload(v->>'type', v->'payload',
                    (select x from public.shift_rounds x where x.id = (select r from f)),
                    coalesce((v->>'has_photo')::boolean, false)) as res) t
    where res->'error_envelope'->'error'->>'code' is distinct from v->>'code'
       or res->'error_envelope'->'error'->>'field' is distinct from v->>'field'
       or (v ? 'rule' and res->'error_envelope'->'error'->'details'->>'rule' is distinct from v->>'rule')),
  '{}'::text[], 'all invalid fixtures fail with the expected code/field/rule');

create function pg_temp.sub(p_sid uuid, p_type text, p_payload jsonb, p_media jsonb default '[]',
  p_client timestamptz default null, p_entry uuid default null)
returns jsonb language sql as $$
  select public.shift_round_submit_evidence(coalesce(p_entry, (select e from g)), p_sid, p_type, p_payload, p_media,
    coalesce(p_client, current_setting('shift_round.now')::timestamptz), null) $$;

select shift_test.login((select u from f));
set local role authenticated;

-- first log: counted, mission 1 completes, events
create temp table s1 on commit drop as select pg_temp.sub('11111111-1111-4111-8111-111111111111', 'contact',
  '{"who_label":"Aunt May","channel":"chat","occurred_on":"2026-11-12"}') as res;
select is(shift_test.code((select res from s1)), 'ok', 'contact accepted');
select is((select res->'data'->>'counted' from s1), 'true', 'receipt counted');
select is((select res->'data'->'newly_completed' from s1), '["first_contact"]'::jsonb, 'mission 1 newly completed');
select is((select res->'data'->>'replayed' from s1), 'false', 'not a replay');
select is((select res->'data'->'missions'->>'missions_complete' from s1), '1', 'missions in receipt');

-- replay: same receipt, no new row (X7, E5)
create temp table s1b on commit drop as select pg_temp.sub('11111111-1111-4111-8111-111111111111', 'contact',
  '{"who_label":"Aunt May","channel":"chat","occurred_on":"2026-11-12"}') as res;
select is((select res->'data'->>'replayed' from s1b), 'true', 'replay flagged');
select is((select res->'data'->>'evidence_id' from s1b), (select res->'data'->>'evidence_id' from s1), 'replay returns original evidence');
select is((select res->'data'->'newly_completed' from s1b), '["first_contact"]'::jsonb, 'replay reconstructs newly_completed');
select is((select count(*)::int from public.shift_round_evidence where entry_id = (select e from g)), 1, 'no duplicate row');
select is(shift_test.code(pg_temp.sub('11111111-1111-4111-8111-111111111111', 'contact',
  '{"who_label":"Aunt June","channel":"chat","occurred_on":"2026-11-12"}')), 'submission_conflict', 'same id, different payload');

-- duplicate label warning
select is((pg_temp.sub(gen_random_uuid(), 'contact', '{"who_label":"aunt  may","channel":"call","occurred_on":"2026-11-12"}')->'data'->>'duplicate_label'),
  'true', 'same who_key flagged as duplicate_label');

-- validation through the RPC
select is(pg_temp.sub(gen_random_uuid(), 'contact', '{"who_label":"Ploy 0812345678","channel":"chat","occurred_on":"2026-11-12"}')->'error'->'details'->>'rule',
  'personal_data', 'personal data in label rejected (A10)');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'contact', '{"who_label":"Ploy","channel":"chat","occurred_on":"2026-11-12","link":"http://x.com/abc"}')),
  'link_not_https', 'http link rejected (E9)');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'mvp', '{"note":"x"}')), 'missing_field', 'mvp needs link or photo');

-- media: consent, existence, ownership, in-use (A10, E6)
reset role;
select shift_test.obj((select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000001/photo.jpg' from f), (select u from f));
select shift_test.obj((select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000002/photo.jpg' from f), (select other from f));
select shift_test.obj((select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000003/audio.m4a' from f), (select u from f));
set local role authenticated;
create temp table m on commit drop as select
  (select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000001/photo.jpg' from f) as mine,
  (select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000002/photo.jpg' from f) as foreign_owner,
  (select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000003/audio.m4a' from f) as audio,
  (select r::text || '/' || u::text || '/aaaaaaaa-0000-4000-8000-000000000009/photo.jpg' from f) as missing,
  (select r::text || '/' || other::text || '/aaaaaaaa-0000-4000-8000-000000000001/photo.jpg' from f) as other_folder;

select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'mvp', '{"note":"proto"}',
  jsonb_build_array(jsonb_build_object('kind','photo','path',(select mine from m),'bytes',10,'consent',false)))),
  'photo_consent_required', 'photo needs consent');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'contact', '{"who_label":"Nok","channel":"chat","occurred_on":"2026-11-12"}',
  jsonb_build_array(jsonb_build_object('kind','audio','path',(select audio from m),'bytes',10,'duration_ms',1000,'consent',true)))),
  'invalid_field', 'audio only for interview/tester');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'interview', '{"who_label":"Nok","occurred_on":"2026-11-12","key_point":"x"}',
  jsonb_build_array(jsonb_build_object('kind','audio','path',(select audio from m),'bytes',10,'duration_ms',1000,'consent',false)))),
  'audio_consent_required', 'audio needs consent');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'mvp', '{"note":"proto"}',
  jsonb_build_array(jsonb_build_object('kind','photo','path',(select missing from m),'bytes',10,'consent',true)))),
  'media_missing', 'object must exist');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'mvp', '{"note":"proto"}',
  jsonb_build_array(jsonb_build_object('kind','photo','path',(select foreign_owner from m),'bytes',10,'consent',true)))),
  'media_not_owned', 'object must be owned by caller');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'mvp', '{"note":"proto"}',
  jsonb_build_array(jsonb_build_object('kind','photo','path',(select other_folder from m),'bytes',10,'consent',true)))),
  'media_not_owned', 'path must be in caller folder');
create temp table s2 on commit drop as select pg_temp.sub(gen_random_uuid(), 'mvp', '{"note":"proto"}',
  jsonb_build_array(jsonb_build_object('kind','photo','path',(select mine from m),'bytes',10,'consent',true))) as res;
select is(shift_test.code((select res from s2)), 'ok', 'photo-only mvp accepted');
select is((select count(*)::int from public.shift_round_evidence_media where path = (select mine from m)), 1, 'media row bound');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'mvp', '{"note":"again"}',
  jsonb_build_array(jsonb_build_object('kind','photo','path',(select mine from m),'bytes',10,'consent',true)))),
  'media_in_use', 'bound object cannot be reused');
create temp table s3 on commit drop as select pg_temp.sub(gen_random_uuid(), 'interview',
  '{"who_label":"Nok","occurred_on":"2026-11-12","key_point":"queue too long","input":"voice","transcript":"..."}',
  jsonb_build_array(jsonb_build_object('kind','audio','path',(select audio from m),'bytes',10,'duration_ms',90000,'consent',true))) as res;
select is(shift_test.code((select res from s3)), 'ok', 'interview with audio accepted');

-- change source rules (E8)
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'change',
  jsonb_build_object('kind','changed','what','Changed the form','source_evidence_id',(select res->'data'->>'evidence_id' from s1)))),
  'invalid_change_source', 'change source must be interview/tester');
reset role;
create temp table oev on commit drop as select shift_test.ev((select oe from g), 'interview', 'Someone') as id;
grant select on oev to authenticated;
set local role authenticated;
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'change',
  jsonb_build_object('kind','changed','what','Changed the form','source_evidence_id',(select id from oev)))),
  'invalid_change_source', 'cross-entry source rejected');
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'change',
  jsonb_build_object('kind','decided_not_to','what','Kept it as is','source_evidence_id',(select res->'data'->>'evidence_id' from s3)))),
  'ok', 'change linked to own interview accepted (T3)');

-- events (A11)
reset role;
select is((select count(*)::int from public.shift_round_events where entry_id = (select e from g) and name = 'evidence_logged'),
  5, 'one evidence_logged per inserted log');
select is((select count(*)::int from public.shift_round_events where entry_id = (select e from g) and name = 'mission_completed'),
  3, 'mission_completed for missions 1, 3 and 5');
select is((select props->>'mission' from public.shift_round_events where entry_id = (select e from g) and name = 'mission_completed'
            order by id limit 1), 'first_contact', 'mission_completed carries the mission key');

-- kill switch (X18): new submissions paused, replay still answered
update public.app_config set value = 'false' where key = 'shift_round.submissions_enabled';
set local role authenticated;
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'contact', '{"who_label":"Beam","channel":"chat","occurred_on":"2026-11-12"}')),
  'submissions_paused', 'kill switch blocks new logs');
select is(pg_temp.sub('11111111-1111-4111-8111-111111111111', 'contact',
  '{"who_label":"Aunt May","channel":"chat","occurred_on":"2026-11-12"}')->'data'->>'replayed', 'true', 'replay works with kill switch on');
select is(pg_temp.sub('11111111-1111-4111-8111-111111111111', 'contact',
  '{"who_label":"Aunt May","channel":"chat","occurred_on":"2026-11-12"}')->'error'->>'category', null, 'replay is not an error');
reset role;
update public.app_config set value = 'true' where key = 'shift_round.submissions_enabled';

-- rate limit 30/hour counted on inserted rows (E5)
create temp table rl on commit drop as select shift_test.user() as u;
create temp table rle on commit drop as select shift_test.entry((select r from f), (select u from rl)) as e;
grant select on rl, rle to authenticated;
select shift_test.ev((select e from rle), 'problem_statement', null, 'submitted', '2026-11-12 09:20+07'::timestamptz + make_interval(secs => i))
  from generate_series(1, 30) i;
select shift_test.login((select u from rl));
set local role authenticated;
create temp table rlr on commit drop as select pg_temp.sub(gen_random_uuid(), 'problem_statement',
  '{"text":"one more problem statement here"}', '[]', null, (select e from rle)) as res;
select is(shift_test.code((select res from rlr)), 'rate_limited', '31st log in an hour is rate limited');
select is((select res->'error'->>'category' from rlr), 'retryable', 'rate_limited is retryable');
select ok((select (res->'error'->>'retry_after')::int between 1 and 3600 from rlr), 'retry_after given');
reset role;
select shift_test.clock('2026-11-12 10:21+07');
set local role authenticated;
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'problem_statement',
  '{"text":"one more problem statement here"}', '[]', null, (select e from rle))), 'ok', 'allowed once the window slides');

-- after close: stored, not counted (A7); grace 30 min both sides (E17)
reset role;
select shift_test.login((select u from f));
select shift_test.clock('2026-11-24 00:20+07');
set local role authenticated;
create temp table ac on commit drop as select
  pg_temp.sub(gen_random_uuid(), 'tester', '{"who_label":"Late One","occurred_on":"2026-11-23","key_point":"x"}', '[]', '2026-11-23 23:50+07') as in_grace,
  pg_temp.sub(gen_random_uuid(), 'tester', '{"who_label":"Late Two","occurred_on":"2026-11-23","key_point":"x"}', '[]', '2026-11-24 00:05+07') as after;
select is((select in_grace->'data'->>'counted' from ac), 'true', 'created before close, sent within grace: counted');
select is((select in_grace->'data'->>'after_close' from ac), 'false', 'grace item is not after_close');
select is((select after->'data'->>'counted' from ac), 'false', 'created after close: not counted');
select is((select after->'data'->>'after_close' from ac), 'true', 'after_close warning');
reset role;
select shift_test.clock('2026-11-24 00:31+07');
set local role authenticated;
select is((pg_temp.sub(gen_random_uuid(), 'tester', '{"who_label":"Late Three","occurred_on":"2026-11-23","key_point":"x"}', '[]',
  '2026-11-23 23:55+07')->'data'->>'counted'), 'false', 'grace expired after 30 minutes');
select is((pg_temp.sub(gen_random_uuid(), 'tester', '{"who_label":"Late Four","occurred_on":"2026-11-23","key_point":"x"}', '[]',
  '2026-11-23 23:55+07')->'data'->>'stored_check'), null, 'receipt has no unexpected keys');

-- client_created_at clamped to <= submitted_at + 5 min and >= joined_at
select ok((pg_temp.sub(gen_random_uuid(), 'problem_statement', '{"text":"clock skew problem statement"}', '[]',
  '2027-01-01 00:00+07')->>'ok')::boolean, 'future client time accepted');
reset role;
select is((select max(client_created_at) from public.shift_round_evidence where entry_id = (select e from g)),
  '2026-11-24 00:36+07'::timestamptz, 'future client time clamped to now + 5 min');
set local role authenticated;

-- after review_ends_at: round_finished, but replays still answered
reset role;
select shift_test.clock('2026-11-26 00:00+07');
set local role authenticated;
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'problem_statement', '{"text":"too late for this round now"}')),
  'round_finished', 'after review end');
select is(pg_temp.sub('11111111-1111-4111-8111-111111111111', 'contact',
  '{"who_label":"Aunt May","channel":"chat","occurred_on":"2026-11-12"}')->'data'->>'replayed', 'true', 'replay after close returns receipt');

-- ownership
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'problem_statement', '{"text":"not my entry at all, sorry"}', '[]', null,
  (select oe from g))), 'entry_not_found', 'cannot log into another entry');
select shift_test.login(null);
select is(shift_test.code(pg_temp.sub(gen_random_uuid(), 'problem_statement', '{"text":"anonymous attempt here"}')),
  'unauthenticated', 'no session');

-- direct table writes are impossible for clients
select shift_test.login((select u from f));
select throws_ok($$insert into public.shift_round_evidence (entry_id, round_id, user_id, submission_id, type, payload, payload_hash,
  client_created_at, submitted_at, local_date) select e, r, u, gen_random_uuid(), 'mvp', '{}', 'x', now(), now(), current_date from f, g$$,
  '42501', null, 'authenticated cannot insert evidence directly');
select throws_ok($$update public.shift_round_evidence set status = 'accepted'$$, '42501', null, 'authenticated cannot update evidence');
select throws_ok($$delete from public.shift_round_evidence$$, '42501', null, 'authenticated cannot delete evidence');

-- RLS: own rows visible, others not
select is((select count(*)::int from public.shift_round_evidence where entry_id = (select oe from g)), 0, 'cannot see another student''s logs');
select ok((select count(*) from public.shift_round_evidence where entry_id = (select e from g)) > 0, 'can see own logs');

select * from finish();
rollback;
