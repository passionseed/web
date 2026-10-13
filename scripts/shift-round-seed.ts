/**
 * Seed a SHIFT round state on the LOCAL Supabase stack (spec X2/R23).
 *
 *   pnpm shift:seed --state=day1|day7|review|issued|rejected
 *
 * Env: SUPABASE_URL (default http://127.0.0.1:54321) and SUPABASE_SERVICE_ROLE_KEY
 * (from `supabase status`). Refuses any non-local URL. Does not read .env files.
 * Creates a fresh student login (printed at the end), a published open round positioned
 * relative to "now" in Asia/Bangkok, an entry, and logs for the chosen state.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const STATES = ["day1", "day7", "review", "issued", "rejected"] as const;
type State = (typeof STATES)[number];

const arg = process.argv.find((a) => a.startsWith("--state="))?.split("=")[1] as State | undefined;
if (!arg || !STATES.includes(arg)) {
  console.error(`usage: pnpm shift:seed --state=${STATES.join("|")}`);
  process.exit(2);
}

const url = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error(`Refusing to seed non-local Supabase at ${host}`);
  process.exit(2);
}
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("SUPABASE_SERVICE_ROLE_KEY is required (see `supabase status`)");
  process.exit(2);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** 00:00 ICT of (today ICT + offsetDays), as an ISO string. */
function ictMidnight(offsetDays: number): string {
  const ictNow = new Date(Date.now() + 7 * 3600_000);
  const d = new Date(Date.UTC(ictNow.getUTCFullYear(), ictNow.getUTCMonth(), ictNow.getUTCDate() + offsetDays));
  return new Date(d.getTime() - 7 * 3600_000).toISOString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function must(p: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<any> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  if (data === null || data === undefined) throw new Error(`${what}: no data`);
  return data;
}

async function main(state: State) {
  // Round position relative to today (14-day round, 48h review).
  const startOffset = { day1: 0, day7: -6, rejected: -6, review: -14, issued: -17 }[state];
  const startsAt = ictMidnight(startOffset);
  const closesAt = new Date(new Date(startsAt).getTime() + 14 * 86400_000).toISOString();

  const email = `shift-${state}-${Date.now()}@seed.local`;
  const password = "shift-seed-password";
  const created = await must(
    db.auth.admin.createUser({ email, password, email_confirm: true }).then((r) => ({ data: r.data, error: r.error })),
    "create user",
  );
  const userId = created.user!.id;

  const { data: maxRound } = await db.from("shift_rounds").select("number").order("number", { ascending: false }).limit(1);
  const number = Math.max(900, (maxRound?.[0]?.number ?? 0) + 1);
  const round = await must(
    db.from("shift_rounds").insert({
      number, title_th: `ทดสอบ ${state}`, title_en: `Seed ${state}`, brief_th: "หาปัญหาจริงจากคนจริง",
      brief_en: "Find a real problem with real people", starts_at: startsAt, closes_at: closesAt,
      review_ends_at: closesAt, join_mode: "open", status: "published", discord_url: "https://discord.gg/passionseed",
    }).select("id").single(),
    "create round",
  );
  const entry = await must(
    db.from("shift_round_entries").insert({
      round_id: round.id, user_id: userId, track: "high_school", handle: "seed", birth_month: 6, birth_year: 2009,
      guardian_required: true, guardian_consent_at: startsAt, joined_at: startsAt, joined_day: 1,
    }).select("id").single(),
    "create entry",
  );

  const at = (dayOffset: number) => new Date(new Date(startsAt).getTime() + dayOffset * 86400_000 + 10 * 3600_000).toISOString();
  const localDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  const ev = async (type: string, payload: Record<string, unknown>, day: number, who?: string, source?: string) => {
    const ts = at(day);
    const row = await must(
      db.from("shift_round_evidence").insert({
        entry_id: entry.id, round_id: round.id, user_id: userId, submission_id: randomUUID(), type, payload,
        payload_hash: randomUUID().replaceAll("-", ""), who_key: who ? who.toLowerCase() : null,
        source_evidence_id: source ?? null, client_created_at: ts, submitted_at: ts, local_date: localDate(ts),
      }).select("id").single(),
      `log ${type}`,
    );
    return row.id as string;
  };
  const occurred = (day: number) => localDate(at(day));

  if (state !== "day1") {
    await ev("contact", { who_label: "Aunt May", channel: "in_person", occurred_on: occurred(0) }, 0, "Aunt May");
    const src = await ev("interview", { who_label: "Ploy", occurred_on: occurred(1), key_point: "Queues are too long", input: "text" }, 1, "Ploy");
    await ev("interview", { who_label: "Nok", occurred_on: occurred(2), key_point: "Skips breakfast", input: "text" }, 2, "Nok");
    await ev("interview", { who_label: "Beam", occurred_on: occurred(3), key_point: "Wants pre-orders", input: "text" }, 3, "Beam");
    await ev("problem_statement", { text: "Students skip breakfast because the canteen queue is too long" }, 3);
    await ev("mvp", { link: "https://example.com/mvp" }, 4);
    const t1 = await ev("tester", { who_label: "Tester One", occurred_on: occurred(5), key_point: "Got stuck on step 2" }, 5, "Tester One");
    if (state === "rejected") {
      const { error } = await db.from("shift_round_evidence").update({
        status: "rejected", status_reason_code: "missing_detail", status_note: "Say what they actually did",
        status_changed_at: new Date().toISOString(),
      }).eq("id", t1);
      if (error) throw new Error(`reject tester: ${error.message}`);
    }
    if (state === "review" || state === "issued") {
      await ev("tester", { who_label: "Tester Two", occurred_on: occurred(6), key_point: "Loved it" }, 6, "Tester Two");
      await ev("tester", { who_label: "Tester Three", occurred_on: occurred(7), key_point: "Wanted dark mode" }, 7, "Tester Three");
      await ev("change", { kind: "changed", what: "Removed the sign-up step", source_evidence_id: src }, 8, undefined, src);
      await ev("demo_post", { url: "https://example.com/demo", visibility: "public" }, 12);
    }
  }
  if (state === "issued") {
    const res = await must(db.rpc("shift_round_job_issue_entry", { p_entry_id: entry.id }), "issue");
    console.log("issue:", JSON.stringify((res as { data?: unknown }).data));
  }

  console.log(`\nSHIFT seed state: ${state}`);
  console.log(`round ${number} starts ${startsAt}`);
  console.log(`login: ${email} / ${password}`);
}

main(arg).catch((e) => {
  console.error(e);
  process.exit(1);
});
