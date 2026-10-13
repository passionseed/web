// shift-round-jobs: scheduled SHIFT round work (spec section 4).
// Invoked by pg_cron -> shift_round_private.invoke_job(job) -> net.http_post with header
// x-shift-round-jobs-secret. The secret is checked in constant time BEFORE the body is parsed
// or any client is created (E13). All database work goes through shift_round_job_* RPCs.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { type Candidate, chunk, constantTimeEqual, renderPush, stripExif } from "./lib.ts";

export const JOBS = ["issue", "purge", "nudges", "pushes", "media_scan", "watchdog"] as const;
export type Job = (typeof JOBS)[number];
const BUCKET = "shift-round-media";
const EXPO_SEND = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS = "https://exp.host/--/api/v2/push/getReceipts";

export interface Deps {
  env: (name: string) => string | undefined;
  makeClient: (url: string, key: string) => SupabaseClient;
  fetch: typeof fetch;
}

export const defaultDeps: Deps = {
  env: (n) => Deno.env.get(n),
  makeClient: (url, key) => createClient(url, key, { auth: { persistSession: false } }),
  fetch: (...args) => fetch(...args),
};

interface Outcome {
  due: number;
  processed: number;
  details: Record<string, unknown>;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string } };

async function rpc<T>(db: SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  const env = data as Envelope<T>;
  if (!env?.ok) throw new Error(`${fn}: ${(env as { error?: { code?: string } })?.error?.code ?? "no envelope"}`);
  return env.data;
}

async function flag(db: SupabaseClient, key: string): Promise<unknown> {
  const { data, error } = await db.from("app_config").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`app_config ${key}: ${error.message}`);
  return data?.value ?? null;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export async function handle(req: Request, deps: Deps = defaultDeps): Promise<Response> {
  const expected = deps.env("SHIFT_ROUND_JOBS_SECRET") ?? "";
  const given = req.headers.get("x-shift-round-jobs-secret") ?? "";
  if (expected.length < 16 || !constantTimeEqual(given, expected)) {
    return json(401, { ok: false, error: "unauthorized" });
  }
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  let job: Job;
  try {
    const body = await req.json();
    job = body?.job;
    if (!JOBS.includes(job)) return json(400, { ok: false, error: "unknown_job" });
  } catch {
    return json(400, { ok: false, error: "invalid_body" });
  }

  const db = deps.makeClient(deps.env("SUPABASE_URL") ?? "", deps.env("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const start = await rpc<{ run_id: string; last_ok_at: string | null }>(db, "shift_round_job_start", { p_job: job });
  let outcome: Outcome = { due: 0, processed: 0, details: {} };
  try {
    outcome = await RUNNERS[job](db, deps);
    await rpc(db, "shift_round_job_finish", {
      p_run_id: start.run_id, p_status: "ok", p_due: outcome.due, p_processed: outcome.processed,
      p_error: null, p_details: outcome.details,
    });
    if (outcome.due > 0 && outcome.processed === 0) {
      await alert(deps, job, "due work but nothing processed", start.last_ok_at, outcome.due);
    }
    if (outcome.details.alert) {
      await alert(deps, job, String(outcome.details.alert), start.last_ok_at, outcome.due);
    }
    return json(200, { ok: true, job, ...outcome });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await rpc(db, "shift_round_job_finish", {
      p_run_id: start.run_id, p_status: "failed", p_due: outcome.due, p_processed: outcome.processed,
      p_error: message, p_details: outcome.details,
    }).catch(() => undefined);
    await alert(deps, job, message, start.last_ok_at, outcome.due);
    return json(500, { ok: false, job, error: message });
  }
}

export async function alert(deps: Deps, job: string, error: string, lastOk: string | null, due: number) {
  const hook = deps.env("SHIFT_ROUND_ALERT_WEBHOOK_URL");
  if (!hook) return;
  const content = `SHIFT round job **${job}**: ${error}\nlast success: ${lastOk ?? "never"} · due: ${due}`;
  await deps.fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: content.slice(0, 1900) }),
  }).catch(() => undefined);
}

// ---------------------------------------------------------------------------

async function runIssue(db: SupabaseClient, deps: Deps): Promise<Outcome> {
  if ((await flag(db, "shift_round.issuance_enabled")) === false) {
    return { due: 0, processed: 0, details: { paused: true } };
  }
  const base = String((await flag(db, "shift_round.web_base_url")) ?? "https://www.passionseed.org").replace(/\/+$/, "");
  const health = await deps.fetch(`${base}/api/shift/cert-health`).catch(() => null);
  const healthy = health?.ok && (await health.json().catch(() => null))?.ok === true;
  if (!healthy) throw new Error(`cert-health gate failed (${health?.status ?? "network"})`);

  const { entry_ids } = await rpc<{ entry_ids: string[] }>(db, "shift_round_job_due_entries", { p_limit: 200 });
  const counts = { issued: 0, not_eligible: 0, skipped: 0 };
  const errors: Array<{ entry_id: string; error: string }> = [];
  for (const id of entry_ids) {
    try {
      const r = await rpc<{ result: keyof typeof counts }>(db, "shift_round_job_issue_entry", { p_entry_id: id });
      counts[r.result] = (counts[r.result] ?? 0) + 1;
    } catch (err) {
      errors.push({ entry_id: id, error: err instanceof Error ? err.message : String(err) }); // E4: keep going
    }
  }
  return {
    due: entry_ids.length,
    processed: counts.issued + counts.not_eligible + counts.skipped,
    details: { ...counts, errors, ...(errors.length ? { alert: `${errors.length} entries failed to issue` } : {}) },
  };
}

async function listRecursive(db: SupabaseClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const folder = prefix.replace(/\/+$/, "");
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list(folder, { limit: 1000, offset });
    if (error) throw new Error(`list ${folder}: ${error.message}`);
    for (const item of data ?? []) {
      const path = `${folder}/${item.name}`;
      if (item.id === null) out.push(...(await listRecursive(db, path))); // folder
      else out.push(path);
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function runPurge(db: SupabaseClient): Promise<Outcome> {
  const retention = await rpc<Record<string, number>>(db, "shift_round_job_enqueue_retention");
  const { names } = await rpc<{ names: string[] }>(db, "shift_round_job_orphans", { p_limit: 500 });
  if (names.length) await rpc(db, "shift_round_job_enqueue_orphans", { p_names: names });

  const { requests } = await rpc<{
    requests: Array<{ id: string; storage_paths: string[]; storage_prefixes: string[]; attempts: number }>;
  }>(db, "shift_round_job_next_deletions", { p_limit: 50 });
  let done = 0;
  const failed: string[] = [];
  for (const r of requests) {
    try {
      const paths = [...r.storage_paths];
      for (const p of r.storage_prefixes) paths.push(...(await listRecursive(db, p)));
      for (const batch of chunk([...new Set(paths)], 100)) {
        const { error } = await db.storage.from(BUCKET).remove(batch);
        if (error) throw new Error(`remove: ${error.message}`);
      }
      for (const p of r.storage_prefixes) {
        if ((await listRecursive(db, p)).length) throw new Error(`prefix not empty after delete: ${p}`);
      }
      await rpc(db, "shift_round_job_finish_deletion", { p_id: r.id, p_status: "storage_done", p_error: null });
      done++;
    } catch (err) {
      await rpc(db, "shift_round_job_finish_deletion", {
        p_id: r.id, p_status: "failed", p_error: err instanceof Error ? err.message : String(err),
      });
      if (r.attempts + 1 >= 5) failed.push(r.id);
    }
  }
  return {
    due: requests.length,
    processed: done,
    details: { retention, orphans: names.length, done, ...(failed.length ? { alert: `deletion gave up after 5 attempts: ${failed.join(", ")}` } : {}) },
  };
}

export async function sendPushes(db: SupabaseClient, deps: Deps, candidates: Candidate[]) {
  let sent = 0;
  for (const batch of chunk(candidates, 100)) {
    const messages = batch.map(renderPush);
    const res = await deps.fetch(EXPO_SEND, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(messages),
    });
    const payload = await res.json().catch(() => null);
    const tickets: Array<{ status: string; id?: string; message?: string; details?: { error?: string } }> =
      payload?.data ?? [];
    if (!res.ok || tickets.length !== batch.length) {
      await rpc(db, "shift_round_job_push_result", {
        p_ledger_ids: batch.map((c) => c.ledger_id), p_status: "failed", p_ticket_ids: [], p_error: `expo ${res.status}`,
      });
      continue;
    }
    const okIds: string[] = [];
    const okTickets: string[] = [];
    for (let i = 0; i < batch.length; i++) {
      const t = tickets[i];
      if (t.status === "ok" && t.id) {
        okIds.push(batch[i].ledger_id);
        okTickets.push(t.id);
      } else if (t.details?.error === "DeviceNotRegistered") {
        await rpc(db, "shift_round_job_push_result", {
          p_ledger_ids: [batch[i].ledger_id], p_status: "skipped", p_ticket_ids: [], p_error: "DeviceNotRegistered",
        });
        await rpc(db, "shift_round_job_receipt_result", {
          p_ledger_id: batch[i].ledger_id, p_status: "DeviceNotRegistered", p_clear_token: true,
        });
      } else {
        await rpc(db, "shift_round_job_push_result", {
          p_ledger_ids: [batch[i].ledger_id], p_status: "failed", p_ticket_ids: [], p_error: t.message ?? t.details?.error ?? "error",
        });
      }
    }
    if (okIds.length) {
      await rpc(db, "shift_round_job_push_result", { p_ledger_ids: okIds, p_status: "sent", p_ticket_ids: okTickets, p_error: null });
      sent += okIds.length;
    }
  }
  return sent;
}

async function checkReceipts(db: SupabaseClient, deps: Deps) {
  const { receipts } = await rpc<{ receipts: Array<{ ledger_id: string; ticket_id: string }> }>(db, "shift_round_job_receipts_pending");
  let checked = 0;
  for (const batch of chunk(receipts, 300)) {
    const res = await deps.fetch(EXPO_RECEIPTS, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: batch.map((r) => r.ticket_id) }),
    });
    if (!res.ok) continue;
    const data: Record<string, { status: string; details?: { error?: string } }> = (await res.json())?.data ?? {};
    for (const r of batch) {
      const receipt = data[r.ticket_id];
      if (!receipt) continue;
      const code = receipt.status === "ok" ? "ok" : receipt.details?.error ?? "error";
      await rpc(db, "shift_round_job_receipt_result", {
        p_ledger_id: r.ledger_id, p_status: code, p_clear_token: code === "DeviceNotRegistered",
      });
      checked++;
    }
  }
  return checked;
}

async function runNudges(db: SupabaseClient, deps: Deps): Promise<Outcome> {
  const r = await rpc<{ candidates: Candidate[]; paused?: boolean }>(db, "shift_round_job_push_candidates", { p_job: "nudges", p_limit: 500 });
  if (r.paused) return { due: 0, processed: 0, details: { paused: true } };
  const sent = await sendPushes(db, deps, r.candidates);
  return { due: r.candidates.length, processed: sent, details: { sent } };
}

async function runPushes(db: SupabaseClient, deps: Deps): Promise<Outcome> {
  const r = await rpc<{ candidates: Candidate[] }>(db, "shift_round_job_push_candidates", { p_job: "pushes", p_limit: 500 });
  const sent = await sendPushes(db, deps, r.candidates);
  const receipts = await checkReceipts(db, deps);
  return { due: r.candidates.length, processed: sent, details: { sent, receipts } };
}

async function runMediaScan(db: SupabaseClient): Promise<Outcome> {
  const { media } = await rpc<{ media: Array<{ media_id: string; path: string; kind: string }> }>(
    db, "shift_round_job_media_to_scan", { p_limit: 100 },
  );
  let processed = 0;
  let stripped = 0;
  for (const m of media) {
    if (m.kind !== "photo") {
      await rpc(db, "shift_round_job_media_scanned", { p_media_id: m.media_id, p_exif_found: false });
      processed++;
      continue;
    }
    const { data, error } = await db.storage.from(BUCKET).download(m.path);
    if (error || !data) continue; // retried next run
    const { bytes, found } = stripExif(new Uint8Array(await data.arrayBuffer()));
    if (found) {
      const up = await db.storage.from(BUCKET).upload(m.path, bytes, { upsert: true, contentType: "image/jpeg" });
      if (up.error) continue;
      stripped++;
    }
    await rpc(db, "shift_round_job_media_scanned", { p_media_id: m.media_id, p_exif_found: found });
    processed++;
  }
  return { due: media.length, processed, details: { stripped } };
}

async function runWatchdog(db: SupabaseClient): Promise<Outcome> {
  const r = await rpc<{ stale: Array<{ job: string; last_ok_at: string | null }>; deletion_failures: number }>(
    db, "shift_round_job_watchdog",
  );
  const problems = [
    ...r.stale.map((s) => `${s.job} (last ok ${s.last_ok_at ?? "never"})`),
    ...(r.deletion_failures ? [`${r.deletion_failures} deletion requests failed 5 times`] : []),
  ];
  return {
    due: 0,
    processed: 1,
    details: { ...r, ...(problems.length ? { alert: `stale: ${problems.join("; ")}` } : {}) },
  };
}

const RUNNERS: Record<Job, (db: SupabaseClient, deps: Deps) => Promise<Outcome>> = {
  issue: runIssue,
  purge: (db) => runPurge(db),
  nudges: runNudges,
  pushes: runPushes,
  media_scan: (db) => runMediaScan(db),
  watchdog: (db) => runWatchdog(db),
};

if (import.meta.main) {
  Deno.serve((req) => handle(req));
}
