import "server-only";

import { unstable_cache } from "next/cache";

import type { AdminKpi, AdminKpiKey } from "@/lib/admin/console";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { getShiftCohortByName } from "@/lib/content/shift-cohort";
import { bangkokDate, shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import { pipelineProgress, type PipelineItem } from "@/lib/hackathon/elemental/pipeline";
import {
  neededPerDay,
  seatPace,
  summarizeRegistrations,
  type RegistrationTotalsRow,
} from "@/lib/hackathon/elemental/seats";
import { ELEMENTAL_TARGETS } from "@/lib/hackathon/elemental/targets";
import { listRegistrationTotals } from "@/lib/supabase/hackathon-event-registrations";
import { listPipeline } from "@/lib/supabase/hackathon-pipeline";
import {
  PAYMENT_RECORDER_ROLE,
  isRecordedByAdmin,
  paymentRecorderIds,
} from "@/lib/supabase/ceo-dashboard";

import { ADMIN_OVERVIEW_TAG } from "./cache";
import { lazyServiceDb, type ServiceDb } from "./db";
import { readAllPages, ROW_CAP, timeoutSignal, type PagedRows } from "./query";
import {
  bucketByBangkokDay,
  kpiWindows,
  windowTotals,
  type DayPoint,
  type KpiWindows,
} from "./time";

/** Sparkline length for every KPI. */
export const SERIES_DAYS = 30;

const TRUNCATED_HINT = `Read capped at ${ROW_CAP.toLocaleString("en-US")} rows, so this may be low.`;

export interface KpiContext {
  db: () => ServiceDb;
  now: Date;
  /** Elemental sign-ups, read once and shared by the seat KPIs. */
  registrations: () => Promise<RegistrationTotalsRow[]>;
  /** The Elemental sponsor, voice and partner board, read once. */
  pipeline: () => Promise<PipelineItem[]>;
}

/** Runs `load` on the first call only; later calls share the same promise. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => (promise ??= load());
}

interface KpiResult {
  value: number;
  previous?: number | null;
  series?: number[];
  total?: number;
  /** Extra notes appended to the definition's hint (missing sources, caps). */
  notes?: string[];
}

interface KpiDefinition {
  key: AdminKpiKey;
  format: AdminKpi["format"];
  label: (ctx: KpiContext) => string;
  hint: (ctx: KpiContext) => string;
  href: (ctx: KpiContext) => string;
  load: (ctx: KpiContext) => Promise<KpiResult>;
}

// ---------------------------------------------------------------------------
// Sources: timestamp-only selects, paged, capped
// ---------------------------------------------------------------------------

type Source<T> = { name: string; read: () => Promise<PagedRows<T>> };

/** Reads several sources; fails only when every one fails. */
async function readSources<T>(sources: Source<T>[]): Promise<{ rows: T[]; notes: string[] }> {
  const settled = await Promise.allSettled(sources.map((s) => s.read()));
  const rows: T[] = [];
  const missing: string[] = [];
  let truncated = false;
  settled.forEach((result, i) => {
    if (result.status === "fulfilled") {
      rows.push(...result.value.rows);
      truncated ||= result.value.truncated;
    } else {
      missing.push(sources[i].name);
    }
  });
  if (missing.length === sources.length) throw new Error(`no source readable: ${missing.join(", ")}`);
  const notes = [
    ...(missing.length ? [`Not counted (could not read): ${missing.join(", ")}.`] : []),
    ...(truncated ? [TRUNCATED_HINT] : []),
  ];
  return { rows, notes };
}

function toAmount(value: unknown): number {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : 0;
}

/** Payment amounts only ever add revenue: a zero, negative or unreadable amount counts as 0. */
function toPaymentAmount(value: unknown): number {
  return Math.max(0, toAmount(value));
}

function revenueSources(db: ServiceDb, since: string): Source<DayPoint>[] {
  return [
    {
      name: "PathLab trials",
      read: async () => {
        const paged = await readAllPages<{
          price_amount: number | null;
          paid_at: string | null;
          verified_at: string | null;
        }>((from, to) =>
          db
            .from("trial_accesses")
            .select("price_amount, paid_at, verified_at")
            .eq("status", "paid")
            .or(`paid_at.gte.${since},and(paid_at.is.null,verified_at.gte.${since})`)
            .order("id")
            .range(from, to)
            .abortSignal(timeoutSignal()),
        );
        return {
          ...paged,
          rows: paged.rows.map((r) => ({
            at: r.paid_at ?? r.verified_at,
            amount: toPaymentAmount(r.price_amount),
          })),
        };
      },
    },
    {
      name: "manual payments",
      read: async () => {
        type PaymentRow = {
          event_timestamp: string | null;
          amount: unknown;
          currency: string | null;
          recorded_by: string | null;
        };
        // Any signed-in user can insert a funnel_events row, so only rows an
        // admin recorded through /api/admin/track-payment count as revenue.
        const recorders = await db
          .from("user_roles")
          .select("user_id")
          .eq("role", PAYMENT_RECORDER_ROLE)
          .abortSignal(timeoutSignal());
        if (recorders.error) throw new Error(recorders.error.message);
        const adminIds = paymentRecorderIds(recorders.data as { user_id: string | null }[] | null);
        const paged = await readAllPages<PaymentRow>((from, to) =>
          db
            .from("funnel_events")
            .select(
              "event_timestamp, amount:metadata->>amount, currency:metadata->>currency, recorded_by:metadata->>recorded_by",
            )
            .eq("event_name", "payment_convert")
            .gte("event_timestamp", since)
            .order("event_timestamp")
            .order("id")
            .range(from, to)
            .abortSignal(timeoutSignal()) as unknown as PromiseLike<{
            data: PaymentRow[] | null;
            error: unknown;
          }>,
        );
        return {
          ...paged,
          rows: paged.rows
            .filter((r) => isRecordedByAdmin({ recorded_by: r.recorded_by }, adminIds))
            // track-payment defaults currency to THB; anything else is skipped, not converted.
            .filter((r) => (r.currency ?? "THB").toUpperCase() === "THB")
            .map((r) => ({ at: r.event_timestamp, amount: toPaymentAmount(r.amount) })),
        };
      },
    },
    {
      name: "SHIFT seats",
      read: async () => {
        const paged = await readAllPages<{ cohort: string; paid_at: string | null }>((from, to) =>
          db
            .from("shift_applications")
            .select("cohort, paid_at")
            .gte("paid_at", since)
            .order("paid_at")
            .order("id")
            .range(from, to)
            .abortSignal(timeoutSignal()),
        );
        return {
          ...paged,
          rows: paged.rows.map((r) => ({
            at: r.paid_at,
            amount: getShiftCohortByName(r.cohort)?.priceBaht ?? 0,
          })),
        };
      },
    },
    {
      name: "hackathon sign-ups",
      read: async () => {
        const paged = await readAllPages<{
          amount_baht: number | null;
          paid_at: string | null;
          created_at: string | null;
        }>((from, to) =>
          db
            .from("hackathon_event_registrations")
            .select("amount_baht, paid_at, created_at")
            .eq("status", "paid")
            .or(`paid_at.gte.${since},and(paid_at.is.null,created_at.gte.${since})`)
            .order("id")
            .range(from, to)
            .abortSignal(timeoutSignal()),
        );
        return {
          ...paged,
          rows: paged.rows.map((r) => ({
            at: r.paid_at ?? r.created_at,
            amount: toPaymentAmount(r.amount_baht),
          })),
        };
      },
    },
  ];
}

/** Paid Elemental seats per Bangkok day: a team sign-up counts every member. */
function seatPoints(rows: readonly RegistrationTotalsRow[]): DayPoint[] {
  return rows
    .filter((r) => r.status === "paid")
    .map((r) => ({ at: r.paidAt ?? r.createdAt, amount: r.memberCount }));
}

/** "50 by 26 Nov": the seat checkpoint we are heading for, or the full target at the close. */
function seatGoal(today: string): { seats: number; by: string } {
  const next = ELEMENTAL_TARGETS.seats.checkpoints.find((cp) => today <= cp.by);
  return next ?? { seats: ELEMENTAL_TARGETS.seats.target, by: ELEMENTAL_TARGETS.registrationClosesOn };
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

async function dailyKpi(
  sources: (since: string) => Source<DayPoint>[],
  windows: KpiWindows,
): Promise<KpiResult> {
  const { rows, notes } = await readSources(sources(windows.since));
  const totals = windowTotals(bucketByBangkokDay(rows, windows.days), windows);
  return {
    value: Math.round(totals.value),
    previous: Math.round(totals.previous),
    series: totals.series.map(Math.round),
    notes,
  };
}

const ELEMENTAL_HREF = "/admin/hackathon/elemental";

export const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  {
    key: "elemental_seats",
    format: "ratio",
    label: () => "Elemental paid seats",
    hint: (ctx) => {
      const goal = seatGoal(bangkokDate(ctx.now));
      return (
        `Paid hackathon seats out of ${ELEMENTAL_TARGETS.seats.target}; a team counts every member. ` +
        `Next checkpoint: ${goal.seats} by ${shortDate(goal.by)}. The sparkline is seats paid per day.`
      );
    },
    href: () => ELEMENTAL_HREF,
    load: async (ctx) => {
      const rows = await ctx.registrations();
      const paid = summarizeRegistrations(rows, ctx.now).paidSeats;
      const pace = seatPace(paid, bangkokDate(ctx.now));
      const windows = kpiWindows(SERIES_DAYS, SERIES_DAYS, ctx.now);
      const { series } = windowTotals(bucketByBangkokDay(seatPoints(rows), windows.days), windows);
      return {
        value: paid,
        total: ELEMENTAL_TARGETS.seats.target,
        previous: null,
        series,
        notes: [
          pace.status === "behind"
            ? `Behind the pace line by ${pace.behindBy}.`
            : `On the pace line (${pace.aheadBy} ahead).`,
        ],
      };
    },
  },
  {
    key: "elemental_seats_per_day",
    format: "number",
    label: (ctx) => {
      const goal = seatGoal(bangkokDate(ctx.now));
      return `Seats a day needed for ${goal.seats} by ${shortDate(goal.by)}`;
    },
    hint: () =>
      "Paid seats still missing for the next checkpoint, spread over the selling days left, today included. " +
      "The sparkline is seats paid per day, to compare.",
    href: () => ELEMENTAL_HREF,
    load: async (ctx) => {
      const rows = await ctx.registrations();
      const today = bangkokDate(ctx.now);
      const paid = summarizeRegistrations(rows, ctx.now).paidSeats;
      const goal = seatGoal(today);
      const perDay = neededPerDay(paid, goal.seats, today, goal.by);
      if (perDay === null) throw new Error("sign-up has closed");
      const windows = kpiWindows(SERIES_DAYS, SERIES_DAYS, ctx.now);
      const { series } = windowTotals(bucketByBangkokDay(seatPoints(rows), windows.days), windows);
      return { value: perDay, previous: null, series };
    },
  },
  {
    key: "elemental_sponsors",
    format: "ratio",
    label: () => "Elemental sponsors signed",
    hint: () =>
      `Sponsors at "signed" on the pipeline board, out of ${ELEMENTAL_TARGETS.sponsors.signed} ` +
      `by ${shortDate(ELEMENTAL_TARGETS.sponsors.by)}.`,
    href: () => ELEMENTAL_HREF,
    load: async (ctx) => {
      const progress = pipelineProgress(await ctx.pipeline());
      return {
        value: progress.sponsorsSigned,
        total: progress.sponsorsTarget,
        previous: null,
        notes: [`${progress.sponsorsYes} said yes, ${progress.sponsorsTalking} talking.`],
      };
    },
  },
  {
    key: "elemental_voices",
    format: "ratio",
    label: () => "Elements with a voice",
    hint: () =>
      `Elements with a speaker who said yes, out of ${ELEMENTAL_TARGETS.voices.elements} ` +
      `by ${shortDate(ELEMENTAL_TARGETS.voices.by)}.`,
    href: () => ELEMENTAL_HREF,
    load: async (ctx) => {
      const progress = pipelineProgress(await ctx.pipeline());
      return {
        value: progress.elementsCovered.length,
        total: progress.voicesTarget,
        previous: null,
        notes: progress.elementsMissing.length ? [`Missing: ${progress.elementsMissing.join(", ")}.`] : [],
      };
    },
  },
  {
    key: "revenue_30d",
    format: "baht",
    label: () => "Revenue, last 30 days",
    hint: () =>
      "Hackathon sign-ups paid, PathLab trial payments, manual payments in THB recorded by an admin, " +
      "and SHIFT paid seats at list price. SHIFT is an estimate: the pair discount is not recorded.",
    href: () => "/admin/ceo/payments",
    load: (ctx) => dailyKpi((since) => revenueSources(ctx.db(), since), kpiWindows(30, SERIES_DAYS, ctx.now)),
  },
  {
    key: "new_leads_7d",
    format: "number",
    label: () => "New DM leads, 7 days",
    hint: () => "New Instagram and Facebook DM threads, internal accounts excluded.",
    href: () => "/admin/dm-leads",
    load: (ctx) =>
      dailyKpi(
        (since) => [
          {
            name: "DM threads",
            read: async () => {
              const db = ctx.db();
              const paged = await readAllPages<{ created_at: string }>((from, to) =>
                db
                  .from("dm_conversations")
                  .select("created_at")
                  .gte("created_at", since)
                  .not("admin_tags", "cs", "{internal}")
                  .order("created_at")
                  .order("id")
                  .range(from, to)
                  .abortSignal(timeoutSignal()),
              );
              return { ...paged, rows: paged.rows.map((r) => ({ at: r.created_at })) };
            },
          },
        ],
        kpiWindows(7, SERIES_DAYS, ctx.now),
      ),
  },
];

function hintWith(base: string, notes: string[] = []): string {
  return [base, ...notes].join(" ");
}

/** Every KPI, computed now. Never throws; an unreadable KPI has value: null. */
export async function computeAdminKpis(now: Date = new Date()): Promise<AdminKpi[]> {
  const ctx: KpiContext = {
    db: lazyServiceDb(),
    now,
    registrations: once(() => listRegistrationTotals(ELEMENTAL.slug)),
    pipeline: once(() => listPipeline(ELEMENTAL.slug)),
  };
  const settled = await Promise.allSettled(KPI_DEFINITIONS.map((def) => def.load(ctx)));
  return KPI_DEFINITIONS.map((def, i) => {
    const result = settled[i];
    const base: AdminKpi = {
      key: def.key,
      label: def.label(ctx),
      format: def.format,
      value: null,
      hint: def.hint(ctx),
      href: def.href(ctx),
    };
    if (result.status === "rejected") return base;
    const { value, previous, series, total, notes } = result.value;
    return {
      ...base,
      value,
      ...(previous !== undefined ? { previous } : {}),
      ...(series ? { series } : {}),
      ...(total !== undefined ? { total } : {}),
      hint: hintWith(base.hint as string, notes),
    };
  });
}

/**
 * Shared across admins for 5 minutes (tag "admin-overview"). Uses the service
 * role only, never cookies, so it is safe inside unstable_cache. A run where
 * every KPI failed throws so the outage is not cached.
 */
const cachedAdminKpis = unstable_cache(
  async () => {
    const kpis = await computeAdminKpis(new Date());
    if (kpis.every((k) => k.value === null)) throw new Error("no KPI readable");
    return kpis;
  },
  ["admin-overview-kpis"],
  { revalidate: 300, tags: [ADMIN_OVERVIEW_TAG] },
);

/** The overview KPIs, led by the current focus (the Elemental hackathon). Never throws. */
export async function getAdminKpis(): Promise<AdminKpi[]> {
  try {
    return await cachedAdminKpis();
  } catch {
    return computeAdminKpis(new Date());
  }
}
