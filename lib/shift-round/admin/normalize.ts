import { listFrom } from "./rpc";
import type {
  AdminCertificate,
  AdminCertificatesData,
  AdminDashboard,
  AdminEntriesData,
  AdminEntry,
  AdminEntryDetail,
  AdminEvidence,
  AdminJobsData,
  AdminSquad,
  AdminSummaryRevision,
  EvidenceMedia,
  JobHealth,
  JobRun,
  MissionCounts,
} from "./types";

/**
 * Maps the admin RPC payloads (lane A, supabase/migrations/20261014090200) onto
 * the shapes the staff UI renders. Each mapper also accepts the flat field
 * names, so either side can move without breaking the other.
 */

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | undefined =>
  typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined;

const EMPTY_MISSIONS: MissionCounts = { missions: [], missions_complete: 0, people_talked_to: 0, eligible: false };

function media(raw: unknown): EvidenceMedia[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => {
    const o = obj(m);
    return {
      kind: o.kind as EvidenceMedia["kind"],
      path: String(o.path ?? ""),
      duration_ms: num(o.duration_ms) ?? null,
      purged_at: str(o.purged_at) ?? (o.purged === true ? "purged" : null),
      purged: o.purged === true || Boolean(o.purged_at),
    };
  });
}

/** Evidence row: `entry.handle`/`squad.{id,name}` become flat `handle`/`squad_*`. */
export function normalizeEvidence(raw: unknown): AdminEvidence {
  const o = obj(raw);
  const entry = obj(o.entry);
  const squad = o.squad ? obj(o.squad) : null;
  return {
    ...(o as unknown as AdminEvidence),
    entry_id: String(o.entry_id ?? entry.id ?? ""),
    handle: str(o.handle) ?? str(entry.handle) ?? undefined,
    squad_id: str(o.squad_id) ?? (squad ? str(squad.id) : null),
    squad_name: str(o.squad_name) ?? (squad ? str(squad.name) : null),
    payload: obj(o.payload),
    media: media(o.media),
    source: o.source ? (o.source as AdminEvidence["source"]) : null,
  };
}

/** Entry row: nested `squad`, `missions` and `certificate` become flat fields. */
export function normalizeEntry(raw: unknown): AdminEntry {
  const o = obj(raw);
  const squad = o.squad ? obj(o.squad) : null;
  const question = squad ? obj(squad.icebreaker_question) : {};
  const missions = o.missions ? (o.missions as MissionCounts) : undefined;
  return {
    ...(o as unknown as AdminEntry),
    squad_id: str(o.squad_id) ?? (squad ? str(squad.id) : null),
    squad_name: str(o.squad_name) ?? (squad ? str(squad.name) : null),
    icebreaker_question: num(question.id) ?? null,
    icebreaker_text: str(question.th) ?? str(question.en),
    icebreaker_answer: squad ? str(squad.icebreaker_answer) : null,
    missions,
    missions_complete: num(o.missions_complete) ?? missions?.missions_complete ?? 0,
    last_log_at: str(o.last_log_at),
    has_certificate: typeof o.has_certificate === "boolean" ? o.has_certificate : Boolean(o.certificate),
  };
}

/** `shift_round_admin_entries`: `{entries, squads (incl. empty), squad_size}`. */
export function normalizeEntries(data: unknown): AdminEntriesData {
  return {
    entries: listFrom<unknown>(data, "entries").map(normalizeEntry),
    squads: Array.isArray(obj(data).squads) ? (obj(data).squads as AdminSquad[]) : [],
    squad_size: num(obj(data).squad_size),
  };
}

export function normalizeEntryDetail(data: unknown): AdminEntryDetail {
  const o = obj(data);
  return {
    entry: normalizeEntry(o.entry),
    missions: (o.missions as MissionCounts) ?? EMPTY_MISSIONS,
    evidence: (Array.isArray(o.evidence) ? o.evidence : []).map(normalizeEvidence),
    checkins: Array.isArray(o.checkins) ? (o.checkins as AdminEntryDetail["checkins"]) : [],
    events: Array.isArray(o.events) ? (o.events as AdminEntryDetail["events"]) : [],
  };
}

export function normalizeSummary(raw: unknown): AdminSummaryRevision {
  const o = obj(raw);
  const entry = obj(o.entry);
  return {
    ...(o as unknown as AdminSummaryRevision),
    entry_id: String(o.entry_id ?? entry.id ?? ""),
    handle: str(o.handle) ?? str(entry.handle) ?? undefined,
    public_revision: o.public_revision ? (o.public_revision as AdminSummaryRevision["public_revision"]) : null,
  };
}

export function normalizeCertificate(raw: unknown): AdminCertificate {
  const o = obj(raw);
  const holder = obj(o.holder);
  const tombstone = o.tombstone === true || Boolean(o.tombstoned_at);
  return {
    ...(o as unknown as AdminCertificate),
    handle: str(o.handle) ?? str(holder.handle),
    tombstone,
    tombstoned_at: str(o.tombstoned_at) ?? (tombstone ? "tombstoned" : null),
  };
}

export function normalizeCertificates(data: unknown): AdminCertificatesData {
  const o = obj(data);
  const counts: Record<string, number> = {};
  if (Array.isArray(o.outcomes)) {
    for (const row of o.outcomes) {
      const outcome = str(obj(row).outcome);
      if (outcome) counts[outcome] = (counts[outcome] ?? 0) + 1;
    }
  } else {
    for (const [k, v] of Object.entries(obj(o.outcomes))) counts[k] = num(v) ?? 0;
  }
  return {
    certificates: listFrom<unknown>(data, "certificates").map(normalizeCertificate),
    outcome_counts: counts,
    last_issue_run: o.last_issue_run ? (o.last_issue_run as JobRun) : null,
  };
}

/** Accepts `{job: {status,...}}` (dashboard) or `[{job, ...}]`. */
function jobHealth(raw: unknown, lastOk: Obj = {}, failures: JobRun[] = []): JobHealth[] {
  const failCount = (job: string) => failures.filter((f) => f.job === job).length;
  if (Array.isArray(raw)) {
    return raw.map((r) => {
      const run = obj(r) as unknown as JobRun & JobHealth;
      if (run.last_run !== undefined) return run;
      return { job: run.job, last_run: run, last_ok_at: str(lastOk[run.job]), failures_7d: failCount(run.job) };
    });
  }
  return Object.entries(obj(raw)).map(([job, r]) => {
    const run = { job, ...obj(r) } as JobRun;
    return {
      job,
      last_run: run,
      last_ok_at: str(lastOk[job]) ?? (run.status === "ok" ? run.finished_at ?? run.started_at : null),
      failures_7d: failCount(job),
    };
  });
}

export function normalizeJobs(data: unknown): AdminJobsData {
  const o = obj(data);
  const failures = (Array.isArray(o.failures_7d) ? o.failures_7d : Array.isArray(o.failures) ? o.failures : []) as JobRun[];
  const queue = obj(o.deletion_queue);
  return {
    jobs: jobHealth(o.last_runs ?? o.jobs ?? [], obj(o.last_ok), failures),
    failures,
    deletion_queue: o.deletion_queue ? { queued: num(queue.queued) ?? 0, failed: num(queue.failed) ?? 0 } : null,
  };
}

const perDay = <T extends Obj>(raw: unknown) =>
  (Array.isArray(raw) ? raw : []).map((r) => {
    const o = obj(r) as T & Obj;
    return { ...o, count: num(o.count) ?? num(o.n) ?? 0 };
  });

export function normalizeDashboard(data: unknown): AdminDashboard {
  const o = obj(data);
  const certs = obj(o.certificates);
  return {
    entrants_total: num(o.entrants_total) ?? num(o.entrants),
    entrants_by_track: o.entrants_by_track as Record<string, number> | undefined,
    entrants_by_group: o.entrants_by_group as Record<string, number> | undefined,
    joins_per_day: perDay(o.joins_per_day) as unknown as AdminDashboard["joins_per_day"],
    logs_per_day: perDay(o.logs_per_day) as unknown as AdminDashboard["logs_per_day"],
    pending_review: num(o.pending_review),
    rejection_rate: num(o.rejection_rate) ?? null,
    mission_distribution: o.mission_distribution as AdminDashboard["mission_distribution"],
    active4_entrants: num(o.active4_entrants) ?? num(o.entrants_4_active_days),
    certificates: {
      issued: num(certs.issued) ?? num(o.certificates_issued),
      revoked: num(certs.revoked) ?? num(o.certificates_revoked),
    },
    share_visits: num(o.share_visits),
    review_minutes_per_entrant: num(o.review_minutes_per_entrant) ?? null,
    next_round_joins: num(o.next_round_joins),
    non_alumni_4plus: num(o.non_alumni_4plus) ?? num(o.non_alumni_4_missions),
    jobs: jobHealth(o.jobs ?? {}),
  };
}
