import "server-only";

import { unstable_cache } from "next/cache";

import type { AdminKpi, AdminKpiKey } from "@/lib/admin/console";
import { getShiftCohortByName, type ShiftCohort } from "@/lib/content/shift-cohort";
import {
  PAYMENT_RECORDER_ROLE,
  isRecordedByAdmin,
  paymentRecorderIds,
} from "@/lib/supabase/ceo-dashboard";

import { ADMIN_OVERVIEW_TAG } from "./cache";
import { applicationsHref, focusCohort } from "./cohort";
import { headCount, lazyServiceDb, type ServiceDb } from "./db";
import { embedded, readAllPages, readCount, ROW_CAP, timeoutSignal, type PagedRows } from "./query";
import {
  bangkokDayKey,
  bucketByBangkokDay,
  distinctByBangkokDay,
  kpiWindows,
  windowDistinct,
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
  cohort: ShiftCohort;
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

function createdAtSource(
  db: ServiceDb,
  table: string,
  column: string,
  since: string,
  name = table,
): Source<DayPoint> {
  return {
    name,
    read: async () => {
      const paged = await readAllPages<Record<string, string | null>>((from, to) =>
        db
          .from(table)
          .select(column)
          .gte(column, since)
          .order(column)
          .order("id")
          .range(from, to)
          .abortSignal(timeoutSignal()) as unknown as PromiseLike<{
          data: Record<string, string | null>[] | null;
          error: unknown;
        }>,
      );
      return { ...paged, rows: paged.rows.map((row) => ({ at: row[column] })) };
    },
  };
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
  ];
}

interface ActivityPoint {
  id: string | null | undefined;
  at: string | null | undefined;
}

function activitySources(db: ServiceDb, since: string): Source<ActivityPoint>[] {
  return [
    {
      name: "map progress",
      read: async () => {
        const paged = await readAllPages<{
          user_id: string;
          arrived_at: string | null;
          started_at: string | null;
          submitted_at: string | null;
        }>((from, to) =>
          db
            .from("student_node_progress")
            .select("user_id, arrived_at, started_at, submitted_at")
            .or(`arrived_at.gte.${since},started_at.gte.${since},submitted_at.gte.${since}`)
            .order("id")
            .range(from, to)
            .abortSignal(timeoutSignal()),
        );
        return {
          ...paged,
          rows: paged.rows.flatMap((r) =>
            [r.arrived_at, r.started_at, r.submitted_at]
              .filter((at): at is string => !!at && at >= since)
              .map((at) => ({ id: r.user_id, at })),
          ),
        };
      },
    },
    {
      name: "SHIFT round evidence",
      read: async () => {
        const paged = await readAllPages<{ user_id: string; submitted_at: string }>((from, to) =>
          db
            .from("shift_round_evidence")
            .select("user_id, submitted_at")
            .gte("submitted_at", since)
            .order("submitted_at")
            .order("id")
            .range(from, to)
            .abortSignal(timeoutSignal()),
        );
        return { ...paged, rows: paged.rows.map((r) => ({ id: r.user_id, at: r.submitted_at })) };
      },
    },
    {
      name: "SHIFT round check-ins",
      read: async () => {
        // No user_id on check-ins: it lives on the entry.
        const paged = await readAllPages<{ submitted_at: string; shift_round_entries: unknown }>(
          (from, to) =>
            db
              .from("shift_round_checkins")
              .select("submitted_at, shift_round_entries!inner(user_id)")
              .gte("submitted_at", since)
              .order("submitted_at")
              .order("entry_id")
              .range(from, to)
              .abortSignal(timeoutSignal()),
        );
        return {
          ...paged,
          rows: paged.rows.map((r) => ({
            id: embedded(r.shift_round_entries as { user_id?: string } | null)?.user_id,
            at: r.submitted_at,
          })),
        };
      },
    },
    {
      name: "PathLab activities",
      read: async () => {
        // No user_id on activity progress: it lives on the path enrollment.
        const paged = await readAllPages<{ updated_at: string; path_enrollments: unknown }>(
          (from, to) =>
            db
              .from("path_activity_progress")
              .select("updated_at, path_enrollments!inner(user_id)")
              .gte("updated_at", since)
              .order("updated_at")
              .order("id")
              .range(from, to)
              .abortSignal(timeoutSignal()),
        );
        return {
          ...paged,
          rows: paged.rows.map((r) => ({
            id: embedded(r.path_enrollments as { user_id?: string } | null)?.user_id,
            at: r.updated_at,
          })),
        };
      },
    },
  ];
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

export const KPI_DEFINITIONS: readonly KpiDefinition[] = [
  {
    key: "revenue_30d",
    format: "baht",
    label: () => "Revenue, last 30 days",
    hint: () =>
      "PathLab trial payments, manual payments in THB recorded by an admin, and SHIFT paid seats at list price. " +
      "SHIFT is an estimate: the pair discount is not recorded.",
    href: () => "/admin/ceo/payments",
    load: (ctx) => dailyKpi((since) => revenueSources(ctx.db(), since), kpiWindows(30, SERIES_DAYS, ctx.now)),
  },
  {
    key: "shift_seats",
    format: "ratio",
    label: (ctx) => `${ctx.cohort.name} paid seats`,
    hint: (ctx) =>
      `Applications marked paid in ${ctx.cohort.name}, out of ${ctx.cohort.seats} seats. ` +
      "The sparkline is seats paid per day.",
    href: (ctx) => applicationsHref(ctx.cohort.name, { status: "all", paid: "paid" }),
    load: async (ctx) => {
      const db = ctx.db();
      const windows = kpiWindows(SERIES_DAYS, SERIES_DAYS, ctx.now);
      const [paid, daily] = await Promise.all([
        readCount(
          headCount(db, "shift_applications")
            .eq("cohort", ctx.cohort.name)
            .not("paid_at", "is", null)
            .abortSignal(timeoutSignal()),
        ),
        readAllPages<{ paid_at: string | null }>((from, to) =>
          db
            .from("shift_applications")
            .select("paid_at")
            .eq("cohort", ctx.cohort.name)
            .gte("paid_at", windows.since)
            .order("paid_at")
            .order("id")
            .range(from, to)
            .abortSignal(timeoutSignal()),
        ).catch(() => null),
      ]);
      const series = daily
        ? windowTotals(
            bucketByBangkokDay(daily.rows.map((r) => r.paid_at), windows.days),
            windows,
          ).series
        : undefined;
      return { value: paid, total: ctx.cohort.seats, previous: null, series };
    },
  },
  {
    key: "signups_7d",
    format: "number",
    label: () => "New signups, 7 days",
    hint: () => "New accounts (profiles created) by Bangkok day, against the 7 days before.",
    href: () => "/admin/users",
    load: (ctx) =>
      dailyKpi(
        (since) => [createdAtSource(ctx.db(), "profiles", "created_at", since, "profiles")],
        kpiWindows(7, SERIES_DAYS, ctx.now),
      ),
  },
  {
    key: "active_learners_7d",
    format: "number",
    label: () => "Active learners, 7 days (web)",
    hint: () =>
      "Distinct people with learning map, PathLab or SHIFT round activity on the web. " +
      "The mobile app is not counted.",
    href: () => "/admin/analytics",
    load: async (ctx) => {
      const windows = kpiWindows(7, SERIES_DAYS, ctx.now);
      const { rows, notes } = await readSources(activitySources(ctx.db(), windows.since));
      const totals = windowDistinct(distinctByBangkokDay(rows, windows.days), windows);
      return { ...totals, notes };
    },
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
  {
    key: "pathlab_enrollments_7d",
    format: "number",
    label: () => "PathLab enrollments, 7 days",
    hint: () => "Learning map enrollments plus PathLab path enrollments.",
    href: () => "/admin/maps",
    load: (ctx) =>
      dailyKpi(
        (since) => [
          createdAtSource(ctx.db(), "user_map_enrollments", "enrolled_at", since, "map enrollments"),
          createdAtSource(ctx.db(), "path_enrollments", "enrolled_at", since, "path enrollments"),
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
    cohort: focusCohort(bangkokDayKey(now) ?? undefined),
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
    if (def.key === "shift_seats") base.total = ctx.cohort.seats;
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

/** The six overview KPIs with trends. Never throws. */
export async function getAdminKpis(): Promise<AdminKpi[]> {
  try {
    return await cachedAdminKpis();
  } catch {
    return computeAdminKpis(new Date());
  }
}
