/**
 * SHIFT rounds race tests (spec 7.1): two real Postgres connections.
 *
 *   pnpm test:db:race
 *
 * Connects to SHIFT_RACE_DATABASE_URL (default: local Supabase postgres on 127.0.0.1:54322).
 * Refuses any non-local host. Creates its own fixtures in committed transactions and deletes
 * them at the end (fixtures use round numbers 990001+ and @race.test emails).
 */
import { Client } from "pg";
import { randomUUID } from "node:crypto";

const url =
  process.env.SHIFT_RACE_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost", "::1"].includes(host) && process.env.SHIFT_RACE_ALLOW_HOST !== host) {
  console.error(`Refusing to run race tests against non-local host ${host}`);
  process.exit(2);
}

const CLOCK = "2026-11-28 00:05+07"; // after review end of a round starting 2026-11-10
let failures = 0;
const results: string[] = [];

function check(ok: boolean, name: string, detail?: unknown) {
  results.push(`${ok ? "ok" : "not ok"} - ${name}${ok ? "" : ` ${JSON.stringify(detail)}`}`);
  if (!ok) failures++;
}

async function connect(): Promise<Client> {
  const c = new Client({ connectionString: url });
  await c.connect();
  return c;
}

async function asUser(c: Client, uid: string | null, clock: string) {
  await c.query(`select set_config('shift_round.allow_clock_override','on',false), set_config('shift_round.now',$1,false)`, [clock]);
  if (uid) {
    await c.query(
      `select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)`,
      [uid, JSON.stringify({ sub: uid, role: "authenticated" })],
    );
    await c.query("set role authenticated");
  } else {
    await c.query("set role service_role");
  }
}

async function resetSession(c: Client) {
  await c.query("reset role");
}

async function fixture(admin: Client, n: number) {
  const roundId = randomUUID();
  const student = randomUUID();
  const staff = randomUUID();
  await admin.query("begin");
  await admin.query(
    `insert into auth.users (id, email, email_confirmed_at) values ($1, $3, now()), ($2, $4, now())`,
    [student, staff, `s${n}@race.test`, `t${n}@race.test`],
  );
  await admin.query(
    `insert into public.profiles (id) select x from unnest($1::uuid[]) x where not exists (select 1 from public.profiles p where p.id = x)`,
    [[student, staff]],
  );
  await admin.query(
    `insert into public.shift_rounds (id, number, title_th, title_en, brief_th, brief_en, starts_at, closes_at, review_ends_at, status)
     values ($1, $2, 'race', 'race', 'race', 'race', '2026-11-10 00:00+07', '2026-11-24 00:00+07', '2026-11-24 00:00+07', 'published')`,
    [roundId, 990000 + n],
  );
  await admin.query(`insert into public.shift_round_roles (user_id, round_id, role) values ($1, null, 'staff')`, [staff]);
  const { rows } = await admin.query(
    `insert into public.shift_round_entries (round_id, user_id, track, handle, birth_month, birth_year, guardian_required,
       guardian_consent_at, joined_at, joined_day)
     values ($1, $2, 'high_school', 'racer', 1, 2008, true, '2026-11-10', '2026-11-10', 1) returning id`,
    [roundId, student],
  );
  const entryId = rows[0].id as string;
  // all six missions, with exactly 3 testers so rejecting one drops eligibility
  const ev = async (type: string, payload: object, who: string | null, source: string | null = null) => {
    const r = await admin.query(
      `insert into public.shift_round_evidence (entry_id, round_id, user_id, submission_id, type, payload, payload_hash, who_key,
         source_evidence_id, client_created_at, submitted_at, local_date)
       values ($1, $2, $3, gen_random_uuid(), $4, $5::jsonb, md5($5::jsonb::text), $6, $7, '2026-11-15 10:00+07', '2026-11-15 10:00+07', '2026-11-15')
       returning id`,
      [entryId, roundId, student, type, JSON.stringify(payload), who, source],
    );
    return r.rows[0].id as string;
  };
  await ev("contact", { who_label: "c" }, "c");
  const src = await ev("interview", { who_label: "i1" }, "i1");
  await ev("interview", { who_label: "i2" }, "i2");
  await ev("interview", { who_label: "i3" }, "i3");
  await ev("problem_statement", { text: "x" }, null);
  await ev("mvp", { link: "https://example.com/x" }, null);
  const tester = await ev("tester", { who_label: "t1" }, "t1");
  await ev("tester", { who_label: "t2" }, "t2");
  await ev("tester", { who_label: "t3" }, "t3");
  await ev("change", { kind: "changed", what: "x" }, null, src);
  await ev("demo_post", { url: "https://example.com/d", visibility: "public" }, null);
  await admin.query("commit");
  return { roundId, student, staff, entryId, tester };
}

async function main() {
  const admin = await connect();
  const a = await connect();
  const b = await connect();
  const created: Array<{ roundId: string; student: string; staff: string }> = [];
  try {
    // 1. Reject commits BEFORE issue: issue waits on the entry lock, then sees the rejection -> not_eligible.
    {
      const f = await fixture(admin, 1);
      created.push(f);
      // Review closes at review_ends_at, so the reject runs just before it and the issue just after.
      await asUser(a, f.staff, "2026-11-25 23:59+07");
      await asUser(b, null, CLOCK);
      await a.query("begin");
      const rej = await a.query(
        `select public.shift_round_admin_reject_evidence($1, 'not_real_person', null, 10) as r`,
        [f.tester],
      );
      check(rej.rows[0].r.ok === true, "reject inside open transaction", rej.rows[0].r);
      const issuing = b.query(`select public.shift_round_job_issue_entry($1) as r`, [f.entryId]);
      await new Promise((r) => setTimeout(r, 300));
      await a.query("commit");
      const issued = (await issuing).rows[0].r;
      check(issued.data?.result === "not_eligible", "issue after a committed reject sees the rejection (A50)", issued);
      await resetSession(a);
      await resetSession(b);
    }
    // 2. Issue commits BEFORE reject: reject waits, then refuses with review_closed.
    {
      const f = await fixture(admin, 2);
      created.push(f);
      await asUser(a, null, CLOCK);
      await asUser(b, f.staff, "2026-11-25 23:59+07");
      await a.query("begin");
      const iss = await a.query(`select public.shift_round_job_issue_entry($1) as r`, [f.entryId]);
      check(iss.rows[0].r.data?.result === "issued", "issue inside open transaction", iss.rows[0].r);
      const rejecting = b.query(
        `select public.shift_round_admin_reject_evidence($1, 'not_real_person', null, 10) as r`,
        [f.tester],
      );
      await new Promise((r) => setTimeout(r, 300));
      await a.query("commit");
      const rej = (await rejecting).rows[0].r;
      check(rej.error?.code === "review_closed", "reject after a committed issue is refused (E3/E4)", rej);
      await resetSession(a);
      await resetSession(b);
    }
    // 3. Withdraw vs issue: issue first, withdraw refused.
    {
      const f = await fixture(admin, 3);
      created.push(f);
      await asUser(a, null, CLOCK);
      await asUser(b, f.student, "2026-11-25 23:59+07");
      await a.query("begin");
      await a.query(`select public.shift_round_job_issue_entry($1)`, [f.entryId]);
      const withdrawing = b.query(`select public.shift_round_withdraw_evidence($1, false) as r`, [f.tester]);
      await new Promise((r) => setTimeout(r, 300));
      await a.query("commit");
      const w = (await withdrawing).rows[0].r;
      check(w.error?.code === "withdraw_after_issue", "withdraw racing an issue is refused", w);
      await resetSession(a);
      await resetSession(b);
    }
    // 4. Concurrent submits with the same submission_id: one row, the other is a replay.
    {
      const f = await fixture(admin, 4);
      created.push(f);
      await asUser(a, f.student, "2026-11-20 10:00+07");
      await asUser(b, f.student, "2026-11-20 10:00+07");
      const sid = randomUUID();
      const payload = { text: "A long enough problem statement for the race" };
      const sql = `select public.shift_round_submit_evidence($1, $2, 'problem_statement', $3::jsonb, '[]'::jsonb, now(), null) as r`;
      await a.query("begin");
      const first = await a.query(sql, [f.entryId, sid, JSON.stringify(payload)]);
      const second = b.query(sql, [f.entryId, sid, JSON.stringify(payload)]);
      await new Promise((r) => setTimeout(r, 300));
      await a.query("commit");
      const r2 = (await second).rows[0].r;
      check(first.rows[0].r.ok === true && first.rows[0].r.data.replayed === false, "first submit inserts", first.rows[0].r);
      check(r2.ok === true && r2.data.replayed === true, "concurrent duplicate is answered as a replay", r2);
      check(r2.data?.evidence_id === first.rows[0].r.data.evidence_id, "same evidence id returned");
      const count = await admin.query(
        `select count(*)::int as n from public.shift_round_evidence where entry_id = $1 and submission_id = $2`,
        [f.entryId, sid],
      );
      check(count.rows[0].n === 1, "exactly one row for the submission id", count.rows[0]);
      await resetSession(a);
      await resetSession(b);
    }
  } finally {
    for (const f of created) {
      await admin.query(`delete from public.shift_round_entries where round_id = $1`, [f.roundId]);
      await admin.query(`delete from public.shift_round_certificates where round_id = $1`, [f.roundId]);
      await admin.query(`delete from public.shift_round_events where round_id = $1`, [f.roundId]);
      await admin.query(`delete from public.shift_rounds where id = $1`, [f.roundId]);
      await admin.query(`delete from auth.users where id = any($1::uuid[])`, [[f.student, f.staff]]);
    }
    await Promise.all([admin.end(), a.end(), b.end()]);
  }
  console.log(`1..${results.length}`);
  for (const r of results) console.log(r);
  if (failures > 0) {
    console.error(`# ${failures} race test(s) failed`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
