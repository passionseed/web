import "server-only";

import {
  ADMIN_QUEUES,
  ADMIN_QUEUE_BY_KEY,
  type AdminQueueCount,
  type AdminQueueKey,
  type AdminQueueSnapshot,
} from "@/lib/admin/console";
import type { ShiftCohort } from "@/lib/content/shift-cohort";
import { CLOSED_LEAD_STATUSES } from "@/lib/dm-leads/playbook";
import { IG_PRIVATE_REPLY_DAYS } from "@/lib/admin/queue-tools/ig-comments";
import { getCommentsMissedByDm } from "@/lib/supabase/ig-comments";

import { applicationsHref, focusCohort } from "./cohort";
import { headCount, lazyServiceDb, type ServiceDb } from "./db";
import { embedded, readCount, timeoutSignal, withTimeout } from "./query";
import { loadOverviewRounds, roundTitle, type OverviewRound } from "./rounds";
import { bangkokDayKey, hoursAgoIso } from "./time";

/** Matches the value written by scripts/tag-internal-lead.ts (lib/supabase/dm-leads.ts). */
const INTERNAL_TAG = "{internal}";
/** Lead statuses that no longer need a reply, as a PostgREST list. Same list as the DM leads page. */
const CLOSED_LEAD_STATUS_LIST = `(${CLOSED_LEAD_STATUSES.join(",")})`;
/** Meta's standard reply window. */
const REPLY_WINDOW_HOURS = 24;

export interface QueueContext {
  db: () => ServiceDb;
  rounds: () => Promise<OverviewRound[]>;
  cohort: ShiftCohort;
  now: Date;
}

type QueueResult = Omit<AdminQueueCount, "key">;
type QueueLoader = (ctx: QueueContext) => Promise<QueueResult>;

/** Hrefs that depend on the moment (the open cohort), used on success and failure. */
const DYNAMIC_HREFS: Partial<Record<AdminQueueKey, (ctx: QueueContext) => string>> = {
  shift_new_applications: (ctx) => applicationsHref(ctx.cohort.name, { status: "new" }),
  shift_awaiting_payment: (ctx) =>
    applicationsHref(ctx.cohort.name, { status: "accepted", paid: "unpaid" }),
  shift_paid_not_in_discord: (ctx) =>
    applicationsHref(ctx.cohort.name, { status: "all", paid: "not_in_discord" }),
};

function hrefFor(key: AdminQueueKey, ctx: QueueContext): string {
  return DYNAMIC_HREFS[key]?.(ctx) ?? ADMIN_QUEUE_BY_KEY[key].href;
}

function shiftApplications(ctx: QueueContext) {
  return headCount(ctx.db(), "shift_applications").eq("cohort", ctx.cohort.name);
}

/** Href for a per-round queue: the round's own page when exactly one round has work. */
function roundQueueHref(
  key: AdminQueueKey,
  perRound: Map<string, number>,
  page: "review" | "summaries",
): string {
  const withWork = [...perRound].filter(([, n]) => n > 0);
  return withWork.length === 1
    ? `/admin/shift/rounds/${withWork[0][0]}/${page}`
    : ADMIN_QUEUE_BY_KEY[key].href;
}

function roundContext(perRound: Map<string, number>, rounds: OverviewRound[] = []): string | undefined {
  const ids = [...perRound].filter(([, n]) => n > 0).map(([id]) => id);
  if (ids.length === 0) return undefined;
  if (ids.length > 1) return `${ids.length} rounds`;
  const round = rounds.find((r) => r.id === ids[0]);
  return round ? roundTitle(round) : undefined;
}

const LOADERS: Record<AdminQueueKey, QueueLoader> = {
  async trials_pending(ctx) {
    const count = await readCount(
      headCount(ctx.db(), "trial_accesses").eq("status", "pending").abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("trials_pending", ctx) };
  },

  async dm_awaiting_reply(ctx) {
    const waiting = () =>
      headCount(ctx.db(), "dm_conversations")
        .eq("last_message_direction", "inbound")
        .not("admin_tags", "cs", INTERNAL_TAG)
        .not("lead_status", "in", CLOSED_LEAD_STATUS_LIST);
    const [total, inWindow] = await Promise.allSettled([
      readCount(waiting().abortSignal(timeoutSignal())),
      readCount(
        waiting()
          .gte("last_message_at", hoursAgoIso(REPLY_WINDOW_HOURS, ctx.now))
          .abortSignal(timeoutSignal()),
      ),
    ]);
    if (total.status === "rejected") throw total.reason;
    const fresh = inWindow.status === "fulfilled" ? inWindow.value : null;
    return {
      count: total.value,
      href: hrefFor("dm_awaiting_reply", ctx),
      ...(fresh ? { context: `${fresh} inside the 24h window` } : {}),
    };
  },

  async line_unanswered(ctx) {
    const count = await readCount(
      headCount(ctx.db(), "line_contacts")
        .eq("last_message_direction", "inbound")
        .eq("is_following", true)
        .abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("line_unanswered", ctx) };
  },

  async shift_new_applications(ctx) {
    const count = await readCount(
      shiftApplications(ctx).eq("status", "new").abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("shift_new_applications", ctx), context: ctx.cohort.name };
  },

  async shift_awaiting_payment(ctx) {
    const count = await readCount(
      shiftApplications(ctx)
        .eq("status", "accepted")
        .is("paid_at", null)
        .abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("shift_awaiting_payment", ctx), context: ctx.cohort.name };
  },

  async shift_paid_not_in_discord(ctx) {
    const count = await readCount(
      shiftApplications(ctx)
        .not("paid_at", "is", null)
        .is("discord_joined_at", null)
        .abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("shift_paid_not_in_discord", ctx), context: ctx.cohort.name };
  },

  async ig_missed(ctx) {
    // The page's own rule (keyword, self-authored, skip list, no inbound DM)
    // runs in TypeScript, so a head count would only be an upper bound.
    // Over the 7-day private-reply window this is two small reads, and
    // /admin/ig-comments?filter=missed lists exactly these rows.
    const missed = await withTimeout(
      getCommentsMissedByDm(IG_PRIVATE_REPLY_DAYS),
      undefined,
      "ig_missed",
    );
    return { count: missed.length, href: hrefFor("ig_missed", ctx), context: "Last 7 days" };
  },

  async dm_followup_due(ctx) {
    const count = await readCount(
      headCount(ctx.db(), "dm_conversations")
        .lte("follow_up_at", ctx.now.toISOString())
        .not("admin_tags", "cs", INTERNAL_TAG)
        .abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("dm_followup_due", ctx) };
  },

  async round_evidence_review(ctx) {
    const rounds = await ctx.rounds();
    const perRound = new Map<string, number>(
      rounds.map((r): [string, number] => [r.id, r.pending_review ?? 0]),
    );
    const count = [...perRound.values()].reduce((sum, n) => sum + n, 0);
    const context = roundContext(perRound, rounds);
    return {
      count,
      href: roundQueueHref("round_evidence_review", perRound, "review"),
      ...(context ? { context } : {}),
    };
  },

  async round_summaries_pending(ctx) {
    // Summary revisions are owner-only under RLS, so this needs the service
    // role, joined to entries for the round. At most one pending per entry.
    const { data, count, error } = await ctx
      .db()
      .from("shift_round_summary_revisions")
      .select("id, shift_round_entries!inner(round_id)", { count: "exact" })
      .eq("status", "pending")
      .limit(1000)
      .abortSignal(timeoutSignal());
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { shift_round_entries: unknown }[];
    const perRound = new Map<string, number>();
    for (const row of rows) {
      const entry = embedded(row.shift_round_entries as { round_id?: string } | null);
      if (entry?.round_id) perRound.set(entry.round_id, (perRound.get(entry.round_id) ?? 0) + 1);
    }
    const rounds = await ctx.rounds().catch(() => [] as OverviewRound[]);
    const context = roundContext(perRound, rounds);
    return {
      count: count ?? rows.length,
      href: roundQueueHref("round_summaries_pending", perRound, "summaries"),
      ...(context ? { context } : {}),
    };
  },

  async experts_pending(ctx) {
    const count = await readCount(
      headCount(ctx.db(), "expert_profiles").eq("status", "pending").abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("experts_pending", ctx) };
  },

  async talent_unverified(ctx) {
    // `verified` is nullable (DEFAULT false), so null counts as unverified.
    const count = await readCount(
      headCount(ctx.db(), "talent_profiles")
        .or("verified.is.null,verified.eq.false")
        .abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("talent_unverified", ctx) };
  },

  async messages_failed(ctx) {
    const since = hoursAgoIso(7 * 24, ctx.now);
    const failed = (table: "dm_messages" | "line_messages") =>
      readCount(
        headCount(ctx.db(), table)
          .eq("direction", "outbound")
          .eq("send_status", "failed")
          .gte("sent_at", since)
          .abortSignal(timeoutSignal()),
      );
    const [dm, line] = await Promise.all([failed("dm_messages"), failed("line_messages")]);
    const parts = [dm ? `${dm} DM` : null, line ? `${line} LINE` : null].filter(Boolean);
    return {
      count: dm + line,
      href: dm === 0 && line > 0 ? "/admin/line" : hrefFor("messages_failed", ctx),
      ...(parts.length ? { context: parts.join(", ") } : {}),
    };
  },

  async meta_webhook_failures(ctx) {
    // meta_webhook_receipts.status is received | processed | partial | failed
    // (20260813220000_meta_webhook_event_integration.sql).
    const count = await readCount(
      headCount(ctx.db(), "meta_webhook_receipts")
        .in("status", ["failed", "partial"])
        .gte("received_at", hoursAgoIso(24, ctx.now))
        .abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("meta_webhook_failures", ctx) };
  },

  async round_jobs_failed(ctx) {
    const count = await readCount(
      headCount(ctx.db(), "shift_round_job_runs")
        .eq("status", "failed")
        .gte("started_at", hoursAgoIso(7 * 24, ctx.now))
        .abortSignal(timeoutSignal()),
    );
    return { count, href: hrefFor("round_jobs_failed", ctx) };
  },
};

/** One loader per queue key, exported for tests. */
export const QUEUE_LOADERS = LOADERS;

export function createQueueContext(now: Date = new Date()): QueueContext {
  let rounds: Promise<OverviewRound[]> | null = null;
  return {
    db: lazyServiceDb(),
    rounds: () => (rounds ??= loadOverviewRounds()),
    cohort: focusCohort(bangkokDayKey(now) ?? undefined),
    now,
  };
}

/** Runs every queue loader; a failed or slow queue becomes count: null. */
export async function buildQueueSnapshot(ctx: QueueContext): Promise<AdminQueueSnapshot> {
  const settled = await Promise.allSettled(ADMIN_QUEUES.map((def) => LOADERS[def.key](ctx)));
  return {
    generatedAt: ctx.now.toISOString(),
    queues: ADMIN_QUEUES.map((def, i) => {
      const result = settled[i];
      return result.status === "fulfilled"
        ? { key: def.key, ...result.value }
        : { key: def.key, count: null, href: hrefFor(def.key, ctx) };
    }),
  };
}

/**
 * Live work-queue counts for the shell badges and the overview. Head counts
 * only, each with its own timeout. Never throws: an unreadable queue is
 * count: null and the rest still render.
 */
export async function getAdminQueueSnapshot(): Promise<AdminQueueSnapshot> {
  const now = new Date();
  try {
    return await buildQueueSnapshot(createQueueContext(now));
  } catch {
    return {
      generatedAt: now.toISOString(),
      queues: ADMIN_QUEUES.map((def) => ({ key: def.key, count: null, href: def.href })),
    };
  }
}
