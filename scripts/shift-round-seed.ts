/**
 * Seed a SHIFT round state on the LOCAL Supabase stack (spec 2026-10-14 section 2.9).
 *
 *   pnpm shift:seed --state=day1|day2|day3|day7|review|issued|rejected
 *
 * Every run resets the previous seed and builds:
 * - local-only logins (password `shift-local-only`): shift.student@example.test (enrolled),
 *   shift.new@example.test (not enrolled, accepted application for the main round's cohort),
 *   shift.mate1/.mate2@example.test (squadmates) and shift.mentor@example.test (squad mentor,
 *   round mentor and local web admin);
 * - SHIFT[N] (N = 3 when free): a 7-day invite round (sessions on days 1,2,4,6,7 at 19:00-21:00
 *   ICT) positioned so today is the state's round day, curriculum_key "N" with its own
 *   shift_curriculum row, application_cohort "SHIFT[N]", a squad of 3 + mentor, attendance and
 *   logs of every type (validated by the server's payload validator), with feed events;
 * - SHIFT[N+1]: an upcoming invite round two weeks out (default plan) for the landing.
 * It also turns on `shift_round.tab_enabled` locally.
 *
 * Env (all optional; read from `supabase status -o env` when unset): SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, SHIFT_SEED_DATABASE_URL. Refuses non-local hosts. Never prints keys.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { Client } from "pg";
import { SHIFT2_DEFAULT_DOC } from "../lib/content/shift2-curriculum";

const STATES = ["day1", "day2", "day3", "day7", "review", "issued", "rejected"] as const;
type State = (typeof STATES)[number];

/** Round day that "today" is in each state (8 = review window, 11 = review over, certificate issued). */
const TODAY_DAY: Record<State, number> = { day1: 1, day2: 2, day3: 3, rejected: 5, day7: 7, review: 8, issued: 11 };
const PASSWORD = "shift-local-only";
const EMAILS = {
  student: "shift.student@example.test",
  fresh: "shift.new@example.test",
  mate1: "shift.mate1@example.test",
  mate2: "shift.mate2@example.test",
  mentor: "shift.mentor@example.test",
} as const;
const NAMES: Record<keyof typeof EMAILS, string> = {
  student: "นักเรียนทดสอบ SHIFT",
  fresh: "ผู้สมัครใหม่ทดสอบ",
  mate1: "เพื่อนสควอด หนึ่ง",
  mate2: "เพื่อนสควอด สอง",
  mentor: "พี่ฟ้า (เมนเทอร์ทดสอบ)",
};
const DISCORD = "https://discord.gg/passionseed";
const MIN = 60_000;
const DAY = 86_400_000;

const state = process.argv.find((a) => a.startsWith("--state="))?.split("=")[1] as State | undefined;
if (!state || !STATES.includes(state)) {
  console.error(`usage: pnpm shift:seed --state=${STATES.join("|")}`);
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Connections (local only)
// ---------------------------------------------------------------------------

const repoRoot = resolve(__dirname, "..");
let statusCache: Record<string, string> | null = null;
function status(key: string): string | undefined {
  if (!statusCache) {
    statusCache = {};
    try {
      const out = execFileSync("supabase", ["status", "-o", "env"], {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      for (const line of out.split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
        if (m) statusCache[m[1]] = m[2];
      }
    } catch {
      // CLI missing or stack stopped: fall back to env/defaults below
    }
  }
  return statusCache[key];
}

const LOCAL_HOSTS = ["127.0.0.1", "localhost", "::1"];
function requireLocal(url: string, what: string) {
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  if (!LOCAL_HOSTS.includes(host)) {
    console.error(`Refusing to seed ${what} on non-local host ${host}`);
    process.exit(2);
  }
}

const apiUrl = process.env.SUPABASE_URL ?? status("API_URL") ?? "http://127.0.0.1:54321";
const dbUrl =
  process.env.SHIFT_SEED_DATABASE_URL ?? status("DB_URL") ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
requireLocal(apiUrl, "Supabase API");
requireLocal(dbUrl, "database");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? status("SERVICE_ROLE_KEY");
if (!serviceKey) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required (start the stack: `supabase start`, or export it from `supabase status`)");
  process.exit(2);
}
const auth = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------------------------------------------------------------------------
// Time helpers (Asia/Bangkok, UTC+7 all year)
// ---------------------------------------------------------------------------

const NOW = Date.now();
const ICT = 7 * 3600_000;
/** 00:00 ICT of (today ICT + offsetDays). */
function ictMidnight(offsetDays: number): Date {
  const local = new Date(NOW + ICT);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + offsetDays) - ICT);
}
const ictDate = (t: Date) => new Date(t.getTime() + ICT).toISOString().slice(0, 10);

let clampStep = 0;
/** ICT wall time on a round day; anything not safely in the past is moved to just before now. */
function at(start: Date, day: number, hh: number, mm = 0): Date {
  const t = start.getTime() + (day - 1) * DAY + (hh * 60 + mm) * MIN;
  if (t <= NOW - 5 * MIN) return new Date(t);
  clampStep += 1;
  const dayStart = start.getTime() + (day - 1) * DAY;
  return new Date(Math.max(dayStart + clampStep * MIN, NOW - (60 - clampStep) * MIN));
}

// ---------------------------------------------------------------------------

async function ensureUser(pg: Client, who: keyof typeof EMAILS): Promise<string> {
  const email = EMAILS[who];
  const { rows } = await pg.query(`select id from auth.users where lower(email) = lower($1)`, [email]);
  let id: string;
  if (rows[0]) {
    id = rows[0].id;
    const { error } = await auth.auth.admin.updateUserById(id, { password: PASSWORD, email_confirm: true });
    if (error) throw new Error(`update ${email}: ${error.message}`);
  } else {
    const { data, error } = await auth.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: NAMES[who] },
    });
    if (error || !data.user) throw new Error(`create ${email}: ${error?.message ?? "no user"}`);
    id = data.user.id;
  }
  await pg.query(`update public.profiles set full_name = $2 where id = $1`, [id, NAMES[who]]);
  return id;
}

type Ids = Record<keyof typeof EMAILS, string>;

/** Removes everything a previous run (or the v1 seed) created. Users are kept and reused. */
async function cleanup(pg: Client, ids: Ids) {
  const users = Object.values(ids);
  const { rows } = await pg.query(
    `select id from public.shift_rounds
      where created_by = $1
         or (title_en like 'Seed %' and brief_en = 'Find a real problem with real people')`,
    [ids.mentor],
  );
  const rounds = rows.map((r) => r.id as string);
  const entries = (
    await pg.query(`select id from public.shift_round_entries where user_id = any($1::uuid[]) or round_id = any($2::uuid[])`, [
      users,
      rounds,
    ])
  ).rows.map((r) => r.id as string);
  await pg.query(`delete from public.shift_round_certificates where round_id = any($1::uuid[]) or entry_id = any($2::uuid[])`, [
    rounds,
    entries,
  ]);
  await pg.query(`delete from public.shift_round_entries where id = any($1::uuid[])`, [entries]);
  await pg.query(
    `delete from public.shift_round_events
      where round_id = any($1::uuid[]) or entry_id = any($2::uuid[]) or user_id = any($3::uuid[]) or actor_id = any($3::uuid[])`,
    [rounds, entries, users],
  );
  await pg.query(`delete from public.shift_round_nudge_ledger where user_id = any($1::uuid[])`, [users]);
  await pg.query(`delete from public.shift_round_waitlist where user_id = any($1::uuid[])`, [users]);
  await pg.query(`delete from shift_round_private.rate_hits where user_id = any($1::uuid[])`, [users]);
  await pg.query(`delete from public.shift_round_deletion_requests where user_id = any($1::uuid[])`, [users]);
  await pg.query(`delete from public.shift_round_roles where user_id = $1 and round_id is not null`, [ids.mentor]);
  await pg.query(`delete from public.shift_rounds where id = any($1::uuid[])`, [rounds]);
  await pg.query(`delete from public.shift_applications where user_id = any($1::uuid[])`, [users]);
}

interface Ctx {
  pg: Client;
  roundId: string;
  start: Date;
  mentor: string;
}

/** Inserts one log as if submitted at `t` (validated and normalized by the server's validator), plus feed events. */
async function log(
  ctx: Ctx,
  entry: { id: string; user: string },
  type: string,
  payload: Record<string, unknown>,
  t: Date,
  opts: { source?: string; reject?: { code: string; note: string } } = {},
): Promise<string> {
  const { pg } = ctx;
  const v = await pg.query(
    `select shift_round_private.validate_payload($1, $2::jsonb, r, false) as res from public.shift_rounds r where r.id = $3`,
    [type, JSON.stringify(payload), ctx.roundId],
  );
  const res = v.rows[0].res;
  if (!res.ok) throw new Error(`seed ${type} payload rejected by the validator: ${JSON.stringify(res.error_envelope?.error)}`);
  const before = (
    await pg.query(`select shift_round_private.completed_keys(shift_round_private.mission_counts($1)) as k`, [entry.id])
  ).rows[0].k as string[];
  const ins = await pg.query(
    `insert into public.shift_round_evidence (entry_id, round_id, user_id, submission_id, type, payload, payload_hash, who_key,
       source_evidence_id, client_created_at, submitted_at, local_date)
     values ($1, $2, $3, gen_random_uuid(), $4, $5::jsonb, md5($4 || $5::jsonb::text),
       case when $4 in ('contact','interview','tester') then shift_round_private.who_key($5::jsonb->>'who_label') end,
       $6, $7, $7, shift_round_private.local_date($7))
     returning id`,
    [entry.id, ctx.roundId, entry.user, type, JSON.stringify(res.payload), opts.source ?? null, t.toISOString()],
  );
  const id = ins.rows[0].id as string;
  await pg.query(
    `insert into public.shift_round_events (round_id, entry_id, user_id, actor_id, name, props, created_at)
     values ($1, $2, $3, $3, 'evidence_logged', $4::jsonb, $5)`,
    [ctx.roundId, entry.id, entry.user, JSON.stringify({ evidence_id: id, type, counted: true, media: 0 }), t.toISOString()],
  );
  const after = (
    await pg.query(`select shift_round_private.completed_keys(shift_round_private.mission_counts($1)) as k`, [entry.id])
  ).rows[0].k as string[];
  for (const key of after.filter((k) => !before.includes(k))) {
    await pg.query(
      `insert into public.shift_round_events (round_id, entry_id, user_id, actor_id, name, props, created_at)
       values ($1, $2, $3, $3, 'mission_completed', $4::jsonb, $5)`,
      [ctx.roundId, entry.id, entry.user, JSON.stringify({ evidence_id: id, mission: key }), t.toISOString()],
    );
  }
  if (opts.reject) {
    const when = new Date(Math.min(t.getTime() + 3 * 3600_000, NOW - MIN));
    await pg.query(
      `update public.shift_round_evidence
          set status = 'rejected', status_reason_code = $2, status_note = $3, status_changed_at = $4,
              status_changed_by = $5, reviewed_at = $4, reviewed_by = $5
        where id = $1`,
      [id, opts.reject.code, opts.reject.note, when.toISOString(), ctx.mentor],
    );
    await pg.query(
      `insert into public.shift_round_events (round_id, entry_id, user_id, actor_id, name, props, created_at)
       values ($1, $2, $3, $4, 'evidence_rejected', $5::jsonb, $6)`,
      [
        ctx.roundId,
        entry.id,
        entry.user,
        ctx.mentor,
        JSON.stringify({ evidence_id: id, type, reason_code: opts.reject.code, review_ms: 42000, invalidated_changes: [] }),
        when.toISOString(),
      ],
    );
  }
  return id;
}

async function createRound(
  pg: Client,
  o: { number: number; start: Date; curriculumKey: string | null; mentor: string },
): Promise<string> {
  const { rows } = await pg.query(
    `insert into public.shift_rounds (number, title_th, title_en, brief_th, brief_en, starts_at, duration_days, closes_at,
       review_ends_at, join_cutoff_day, join_mode, application_cohort, curriculum_key, discord_url, status, created_by)
     values ($1, 'ลงมือแก้ปัญหาจริง กับเพื่อนในสควอด', 'Solve a real problem with your squad',
       '7 วัน คิดไอเดีย คุยกับคนจริง สร้างต้นแบบ ให้คนนอกลองใช้ แล้วปรับตามที่ได้ยิน',
       '7 days: pick an idea, talk to real people, build a prototype, get outsiders to try it, change what you heard',
       $2, 7, $2::timestamptz + interval '7 days', $2::timestamptz + interval '7 days', 2, 'invite', $3, $4, $5, 'published', $6)
     returning id`,
    [o.number, o.start.toISOString(), `SHIFT[${o.number}]`, o.curriculumKey, DISCORD, o.mentor],
  );
  return rows[0].id as string;
}

async function main(s: State) {
  const pg = new Client({ connectionString: dbUrl });
  await pg.connect();
  try {
    const ids = {} as Ids;
    for (const who of Object.keys(EMAILS) as (keyof typeof EMAILS)[]) ids[who] = await ensureUser(pg, who);

    await pg.query("begin");
    await cleanup(pg, ids);

    // Round numbers: SHIFT[3] and SHIFT[4] unless taken by real local rounds.
    const taken = new Set(
      (await pg.query(`select number from public.shift_rounds`)).rows.map((r) => r.number as number),
    );
    let number = 3;
    while (taken.has(number) || taken.has(number + 1)) number += 1;
    const today = TODAY_DAY[s];
    const start = ictMidnight(1 - today);
    const nextStart = ictMidnight(14);
    const curriculumKey = String(number);

    // The mentors' curriculum for this round (one source of truth for the student plan).
    const doc = {
      ...SHIFT2_DEFAULT_DOC,
      days: SHIFT2_DEFAULT_DOC.days.map((d) => ({ ...d, date: ictDate(new Date(start.getTime() + (d.day - 1) * DAY)) })),
    };
    await pg.query(
      `insert into public.shift_curriculum (round, content, updated_at, updated_by) values ($1, $2::jsonb, now(), $3)
       on conflict (round) do update set content = excluded.content, updated_at = now(), updated_by = excluded.updated_by
        where public.shift_curriculum.updated_by = excluded.updated_by`,
      [curriculumKey, JSON.stringify(doc), ids.mentor],
    );

    const roundId = await createRound(pg, { number, start, curriculumKey, mentor: ids.mentor });
    const nextId = await createRound(pg, { number: number + 1, start: nextStart, curriculumKey: null, mentor: ids.mentor });
    await pg.query(`insert into public.shift_round_roles (user_id, round_id, role) values ($1, $2, 'mentor'), ($1, $3, 'mentor')`, [
      ids.mentor,
      roundId,
      nextId,
    ]);
    await pg.query(
      `insert into public.user_roles (user_id, role) select $1, 'admin'
        where not exists (select 1 from public.user_roles where user_id = $1 and role = 'admin')`,
      [ids.mentor],
    );
    await pg.query(
      `insert into public.app_config (key, value) values ('shift_round.tab_enabled', 'true')
       on conflict (key) do update set value = 'true', updated_at = now()`,
    );

    // shift.new: accepted, account-linked application for this round's cohort (D6: joins without an allowlist row).
    await pg.query(
      `insert into public.shift_applications (cohort, full_name, nickname, grade, problem, availability, ig_handle,
         parent_contact, consent, source, status, user_id, linked_at)
       values ($1, 'ผู้สมัครใหม่ทดสอบ', 'ใหม่', 'm5', 'คิวโรงอาหารยาวมาก', 'all_days', '@seed_local_only', 'local only', true,
         'shift-seed', 'accepted', $2, now())`,
      [`SHIFT[${number}]`, ids.fresh],
    );

    // Entries: everyone joined the evening before day 1 (accepted applicants).
    const joinedAt = new Date(start.getTime() - 4 * 3600_000);
    const entry = async (user: string, handle: string) => {
      const { rows } = await pg.query(
        `insert into public.shift_round_entries (round_id, user_id, track, handle, birth_month, birth_year, guardian_required,
           guardian_consent_at, joined_at, joined_day)
         values ($1, $2, 'high_school', $3, 6, 2009, true, $4, $4, 0) returning id`,
        [roundId, user, handle, joinedAt.toISOString()],
      );
      await pg.query(
        `insert into public.shift_round_events (round_id, entry_id, user_id, actor_id, name, props, created_at)
         values ($1, $2, $3, $3, 'round_joined', '{"track":"high_school","joined_day":0,"guardian_required":true}', $4)`,
        [roundId, rows[0].id, user, joinedAt.toISOString()],
      );
      return { id: rows[0].id as string, user };
    };
    const me = await entry(ids.student, "ต้นกล้า");
    const m1 = await entry(ids.mate1, "มายด์");
    const m2 = await entry(ids.mate2, "Beam");

    // Squad of 3 + mentor, distinct ice-break questions.
    const squad = (
      await pg.query(
        `insert into public.shift_round_squads (round_id, name, mentor_user_id, discord_url, created_by)
         values ($1, 'มะม่วง', $2, $3, $2) returning id`,
        [roundId, ids.mentor, DISCORD],
      )
    ).rows[0].id as string;
    const members: [typeof me, number, string | null][] = [
      [me, 10, "ป้ายรถเมล์ที่ไม่มีหลังคา"],
      [m1, 5, "เกมกับการออกแบบเลเวล"],
      [m2, 8, null],
    ];
    for (const [en, q, answer] of members) {
      await pg.query(
        `insert into public.shift_round_squad_members (squad_id, entry_id, round_id, icebreaker_question, icebreaker_answer,
           answered_at, added_at)
         values ($1, $2, $3, $4, $5, case when $5::text is null then null else $6::timestamptz end, $6)`,
        [squad, en.id, roundId, q, answer, joinedAt.toISOString()],
      );
      await pg.query(
        `insert into public.shift_round_events (round_id, entry_id, user_id, actor_id, name, props, created_at)
         values ($1, $2, $3, $4, 'squad_assigned', $5::jsonb, $6)`,
        [roundId, en.id, en.user, ids.mentor, JSON.stringify({ squad_id: squad }), joinedAt.toISOString()],
      );
    }

    const ctx: Ctx = { pg, roundId, start, mentor: ids.mentor };
    const occurred = (day: number) => ictDate(new Date(start.getTime() + (day - 1) * DAY));
    const past = (day: number) => day < today; // a whole round day already lived through
    const reached = (day: number) => day <= today;

    // --- student logs (day 1 ideas + contact, day 2 interviews + problem, ... ) ---
    let ideasId: string | null = null;
    if (past(1)) {
      ideasId = await log(ctx, me, "ideas", {
        ideas: [
          { text: "คิวโรงอาหารตอนพักเที่ยงยาวจนกินไม่ทัน", who: "ม.4 ที่ต่อคิวโรงอาหาร" },
          { text: "ที่นั่งห้องสมุดเต็มช่วงสอบ", who: "รุ่นพี่ ม.6" },
          { text: "โปสเตอร์ชมรมหายจากบอร์ด", who: "ประธานชมรม" },
        ],
        picked: 0,
        reachable: true,
        note: "เลือกอันแรกเพราะทักเพื่อน ม.4 ได้เอง",
      }, at(start, 1, 20, 30));
      await log(ctx, me, "contact", { who_label: "เพื่อน ม.4 ห้องข้าง ๆ", channel: "chat", occurred_on: occurred(1) }, at(start, 1, 20, 50));
    }
    if (reached(2)) {
      await log(ctx, me, "interview", {
        who_label: "เพื่อน ม.4 ห้องข้าง ๆ",
        occurred_on: occurred(2),
        key_point: "ต่อคิว 15 นาทีทุกวัน เลยต้องเลือกกินขนมแทนข้าว",
        input: "text",
      }, at(start, 2, 8, 40));
      await log(ctx, me, "interview", {
        who_label: "รุ่นน้อง ม.4 ชมรมดนตรี",
        occurred_on: occurred(2),
        key_point: "อยากสั่งล่วงหน้าแล้วมารับเลย ไม่อยากต่อคิว",
        planned_change: "ลองทำฟอร์มสั่งล่วงหน้า",
        input: "text",
      }, at(start, 2, 12, 20));
      await log(ctx, me, "problem_statement", {
        text: "นักเรียน ม.4 ลำบากกับการซื้อข้าวตอนพักเที่ยง เพราะคิวยาวจนเหลือเวลากินไม่ถึง 10 นาที (จากที่คุยมา 2 คน)",
        user_group: "นักเรียน ม.4 ที่ซื้อข้าวโรงอาหาร",
      }, at(start, 2, 13, 10));
    }
    if (past(2)) {
      await log(ctx, me, "daily", { built: "ร่างฟอร์มสั่งข้าวล่วงหน้าใน Google Forms", heard: "เพื่อนบอกว่าอยากเห็นเมนูก่อนสั่ง" }, at(start, 2, 21, 30));
    }
    let tester2: string | null = null;
    if (reached(3)) {
      await log(ctx, me, "interview", {
        who_label: "แม่ค้าร้านข้าวมันไก่ในโรงอาหาร",
        occurred_on: occurred(3),
        key_point: "ถ้ารู้จำนวนล่วงหน้าจะเตรียมของได้เร็วขึ้น",
        input: "text",
      }, at(start, 3, 9, 30));
      await log(ctx, me, "mvp", { link: "https://example.com/preorder-prototype", note: "หน้าเดียว เลือกเมนูแล้วกดสั่ง" }, at(start, 3, 16, 0));
    }
    if (past(3)) {
      await log(ctx, me, "daily", { built: "หน้าเลือกเมนูบนมือถือ", broke: "ปุ่มสั่งกดไม่ได้บน iPhone" }, at(start, 3, 21, 30));
    }
    if (past(4)) {
      await log(ctx, me, "tester", {
        who_label: "เพื่อน ม.5 ที่ไม่รู้จักมาก่อน",
        occurred_on: occurred(4),
        key_point: "งง",
      }, at(start, 4, 18, 0), s === "rejected" ? { reject: { code: "missing_detail", note: "เล่าเพิ่มว่าเขากดอะไร แล้วติดตรงไหน" } } : {});
      tester2 = await log(ctx, me, "tester", {
        who_label: "รุ่นพี่ ม.6 สายวิทย์",
        occurred_on: occurred(4),
        key_point: "หาปุ่มยืนยันไม่เจอ ต้องเลื่อนลงไปล่างสุด",
        what_tried: "สั่งข้าวมันไก่ 1 จาน",
      }, at(start, 4, 18, 30));
      await log(ctx, me, "daily", { built: "ให้คนนอกรุ่นลองสั่ง 2 คน", heard: "ปุ่มยืนยันอยู่ไกลเกินไป", link: "https://example.com/preorder-prototype" }, at(start, 4, 21, 30));
    }
    if (past(5) && s !== "rejected") {
      await log(ctx, me, "tester", {
        who_label: "ครูเวรโรงอาหาร",
        occurred_on: occurred(5),
        key_point: "อยากให้ร้านเห็นยอดสั่งรวมตอน 11 โมง",
      }, at(start, 5, 15, 0));
      await log(ctx, me, "change", {
        kind: "changed",
        what: "ย้ายปุ่มยืนยันขึ้นมาบนสุด และแสดงยอดรวมให้ร้าน",
        source_evidence_id: tester2,
      }, at(start, 5, 20, 0), { source: tester2 ?? undefined });
      await log(ctx, me, "daily", { built: "ย้ายปุ่มยืนยันขึ้นบน", heard: "รุ่นพี่บอกว่าเร็วขึ้นเยอะ" }, at(start, 5, 21, 30));
    }
    if (past(6)) {
      await log(ctx, me, "daily", { built: "ส่งลิงก์กลับไปให้คนที่เคยลอง", heard: "มีคนขอให้เพิ่มเมนูร้านอื่น" }, at(start, 6, 21, 30));
    }
    if (past(7)) {
      await log(ctx, me, "demo_post", { url: "https://example.com/demo-day-post", visibility: "public", note: "เดโม 2 นาทีใน Discord" }, at(start, 7, 20, 0));
      await log(ctx, me, "daily", { built: "เดโมวัน Demo Day", heard: "พี่ถามว่าจะให้ร้านใช้จริงยังไง" }, at(start, 7, 21, 30));
    }

    // --- squadmates: lighter activity for the squad feed ---
    if (past(1)) {
      await log(ctx, m1, "ideas", {
        ideas: [
          { text: "ตารางสอบชนกันหลายวิชา", who: "เพื่อน ม.5" },
          { text: "หาที่ซ้อมดนตรีไม่ได้", who: "ชมรมดนตรี" },
          { text: "ร่มหายบ่อยตอนฝนตก", who: "เพื่อนร่วมห้อง" },
        ],
        picked: 1,
      }, at(start, 1, 20, 35));
      await log(ctx, m1, "contact", { who_label: "ประธานชมรมดนตรี", channel: "in_person", occurred_on: occurred(1) }, at(start, 1, 21, 0));
      await log(ctx, m2, "ideas", {
        ideas: [
          { text: "Bus stop has no shade", who: "kids who take the bus" },
          { text: "Lost and found is a mess", who: "ม.5 ห้อง 2" },
          { text: "Homework deadlines clash", who: "ม.5 students" },
        ],
        picked: 0,
      }, at(start, 1, 20, 40));
    }
    if (reached(2)) {
      await log(ctx, m1, "interview", {
        who_label: "สมาชิกชมรมดนตรี ม.4",
        occurred_on: occurred(2),
        key_point: "ห้องซ้อมถูกจองเต็มทุกเย็นวันพุธ",
      }, at(start, 2, 10, 0));
    }
    if (past(3)) {
      await log(ctx, m2, "daily", { built: "Sketch of a shade map" }, at(start, 3, 20, 0));
    }

    // Cheers on the student's ideas log.
    if (ideasId) {
      await pg.query(
        `insert into public.shift_round_cheers (round_id, squad_id, from_entry_id, to_entry_id, evidence_id, created_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [roundId, squad, m1.id, me.id, ideasId, at(start, 1, 21, 10).toISOString()],
      );
    }

    // Attendance for the sessions already held (2.4), marked by the mentor after each session.
    const sessionsHeld = [1, 2, 4, 6, 7].filter((d) => (s === "day2" ? d === 1 : past(d)));
    for (const d of sessionsHeld) {
      const marks = [
        { e: me, status: d === 6 ? "makeup" : "present" },
        { e: m1, status: "present" },
        { e: m2, status: d === 2 ? "absent" : "present" },
      ];
      const markedAt = at(start, d, 21, 5);
      for (const m of marks) {
        await pg.query(
          `insert into public.shift_round_attendance (entry_id, round_id, day, status, marked_by, marked_at)
           values ($1, $2, $3, $4, $5, $6)`,
          [m.e.id, roundId, d, m.status, ids.mentor, markedAt.toISOString()],
        );
      }
      await pg.query(
        `insert into public.shift_round_events (round_id, actor_id, name, props, created_at)
         values ($1, $2, 'attendance_marked', $3::jsonb, $4)`,
        [
          roundId,
          ids.mentor,
          JSON.stringify({ day: d, set: marks.length, cleared: 0, marks: marks.map((m) => ({ entry_id: m.e.id, status: m.status })) }),
          markedAt.toISOString(),
        ],
      );
    }

    // After review: issue certificates like the hourly job would.
    if (s === "issued") {
      for (const en of [me, m1, m2]) {
        const r = await pg.query(`select public.shift_round_job_issue_entry($1) as r`, [en.id]);
        if (!r.rows[0].r?.ok) throw new Error(`issue: ${JSON.stringify(r.rows[0].r)}`);
      }
    }
    await pg.query("commit");

    const counts = (await pg.query(`select shift_round_private.mission_counts($1) as m`, [me.id])).rows[0].m;
    const phase = (await pg.query(`select shift_round_private.round_phase($1) as p`, [roundId])).rows[0].p;
    console.log(`\nSHIFT seed state: ${s} (local only)`);
    console.log(
      `  SHIFT[${number}]  ${ictDate(start)} .. ${ictDate(new Date(start.getTime() + 6 * DAY))} ICT, ${phase}, today = day ${today}` +
        `, sessions 1,2,4,6,7 19:00-21:00, curriculum "${curriculumKey}", cohort SHIFT[${number}]`,
    );
    console.log(`  SHIFT[${number + 1}]  starts ${ictDate(nextStart)} ICT, upcoming, invite (default plan)`);
    console.log(
      `  student: ${counts.missions_complete}/${counts.missions_total} missions, daily ${counts.daily.days}/${counts.daily.need}` +
        `, sessions ${counts.sessions.attended}/${counts.sessions.held} held, people talked to ${counts.people_talked_to}`,
    );
    console.log(`\nLogins (password ${PASSWORD}):`);
    console.log(`  ${EMAILS.student}  enrolled as ต้นกล้า, squad มะม่วง (3 + mentor)`);
    console.log(`  ${EMAILS.fresh}      not enrolled; accepted application for SHIFT[${number}] (can join through day 2)`);
    console.log(`  ${EMAILS.mate1} / ${EMAILS.mate2}  squadmates`);
    console.log(`  ${EMAILS.mentor}   squad + round mentor, local web admin (/admin/shift/rounds)`);
    console.log(`app_config shift_round.tab_enabled = true (local)`);
  } catch (err) {
    await pg.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    await pg.end();
  }
}

main(state).catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
