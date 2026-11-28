/**
 * Remind Elemental sign-ups that never paid: one email to each address, with
 * its own pay link and "send it to your parent" (lib/hackathon/elemental/unpaid-reminder.ts).
 *
 *   pnpm elemental:unpaid-reminder [--hours 12] [--since <ISO time>] [--html <file>]
 *     A dry run (the default). Reads the sign-ups and prints only how many
 *     would get a reminder, then one sample built from made-up demo data
 *     (--html also writes the sample as a page, to look at in a browser).
 *     Sends nothing and writes nothing.
 *
 *   pnpm elemental:unpaid-reminder --send [--hours 12] [--since <ISO time>]
 *     Sends. Only with Big's go. Prints counts only, never an address.
 *
 * Who: pending elemental-2026 sign-ups made more than --hours ago (default
 * 12), each address's newest one, leaving out addresses that already have a
 * paid sign-up or a slip being checked.
 *
 * Duplicates: nothing in the database records a reminder (no column, no
 * migration), so run it once. Each run prints its cutoff; a later run with
 * --since <that cutoff> reaches only sign-ups made after the first run's.
 *
 * .env.local points at the production database, so the dry run reads real
 * rows. It prints totals only.
 */
import { writeFileSync } from "fs";
import { Resend } from "resend";

import { ELEMENTAL } from "../components/hackathon/poster/elemental/facts";
import { pickUnpaidReminders, unpaidReminderContent, type ReminderRow } from "../lib/hackathon/elemental/unpaid-reminder";
import { createAdminClient } from "../utils/supabase/admin";

const SITE = "https://passionseed.org";
/** Made up, for the sample only: no sign-up has this token. */
const DEMO = { payToken: "0123456789abcdef0123456789abcdef", amountBaht: ELEMENTAL.priceBaht };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function readSignUps(): Promise<ReminderRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("hackathon_event_registrations")
    .select("pay_token, status, amount_baht, contact_email, created_at")
    .eq("event_slug", ELEMENTAL.slug)
    .in("status", ["pending", "review", "paid"])
    .range(0, 4999);
  if (error) fail(`Could not read sign-ups: ${error.message}`);
  return (data ?? []) as ReminderRow[];
}

async function main() {
  const send = process.argv.includes("--send");
  const hours = Number(arg("hours") ?? 12);
  if (!Number.isFinite(hours) || hours < 0) fail("--hours takes a number of hours, like 12.");
  const sinceArg = arg("since");
  const since = sinceArg ? new Date(sinceArg) : null;
  if (since && Number.isNaN(since.getTime())) fail("--since takes an ISO time, like 2026-11-28T00:00:00Z.");

  const now = new Date();
  const cutoff = new Date(now.getTime() - hours * 3_600_000);
  const rows = await readSignUps();
  const reminders = pickUnpaidReminders(rows, { now, olderThanHours: hours, since });
  const unpaid = rows.filter((r) => r.status === "pending" && Date.parse(r.created_at) <= cutoff.getTime()).length;

  console.log(`${ELEMENTAL.edition} unpaid reminder${send ? "" : " (dry run: nothing is sent)"}`);
  console.log(`Unpaid sign-ups made more than ${hours} h ago: ${unpaid}`);
  console.log(`Reminders (one per address, none to an address that already paid): ${reminders.length}`);
  console.log(`Cutoff: ${cutoff.toISOString()}  (a later run: --since ${cutoff.toISOString()})`);

  if (!send) {
    const sample = unpaidReminderContent({ ...DEMO, base: SITE });
    console.log("\n--- Sample, made-up demo data ---");
    console.log(`Subject: ${sample.subject}\n`);
    console.log(sample.text);
    const htmlPath = arg("html");
    if (htmlPath) {
      writeFileSync(htmlPath, sample.html);
      console.log(`\nSample page written to ${htmlPath}`);
    }
    console.log(`\nTo send (needs Big's go): pnpm elemental:unpaid-reminder --send --hours ${hours}${sinceArg ? ` --since ${sinceArg}` : ""}`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) fail("RESEND_API_KEY is not set.");
  const from = process.env.RESEND_FROM_EMAIL || "hi@noreply.passionseed.org";
  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;
  for (const r of reminders) {
    const { subject, html, text } = unpaidReminderContent({ payToken: r.payToken, amountBaht: r.amountBaht, base: SITE });
    try {
      const { error } = await resend.emails.send({ from: `PassionSeed <${from}>`, to: [r.to], subject, html, text });
      if (error) failed++;
      else sent++;
    } catch {
      failed++;
    }
    // Resend allows a few requests a second.
    await new Promise((done) => setTimeout(done, 600));
  }
  console.log(`Sent ${sent}, failed ${failed}.`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
