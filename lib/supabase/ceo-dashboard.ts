import { createClient } from "@/utils/supabase/client";
import type {
  DashboardAlert,
  AIAgentStatus,
  ContentSuggestion,
  WeeklyRetro,
  NorthStarMetrics,
  FunnelStage,
  CohortData
} from "@/components/admin/ceo/types";

/*
 * Browser-side reads for the CEO dashboard (RLS limits them to admins). The
 * client is created on first use, not at import, so importing this module on
 * the server never builds a session-less browser client. Server pages use
 * lib/supabase/ceo-payments.ts instead.
 */
let browserClient: ReturnType<typeof createClient> | null = null;

function db() {
  browserClient ??= createClient();
  return browserClient;
}

// ---------------------------------------------------------------------------
// Recorded payments (manual entries in funnel_events, event 'payment_convert')
// ---------------------------------------------------------------------------

export type PaymentCurrency = "THB" | "USD";

export interface PaymentEventRow {
  event_timestamp: string | null;
  metadata: unknown;
}

export interface RecordedPayment {
  at: string;
  amount: number;
  currency: PaymentCurrency;
  productName: string | null;
  paymentMethod: string | null;
}

export interface RecordedPaymentSummary {
  last30: Record<PaymentCurrency, number>;
  previous30: Record<PaymentCurrency, number>;
  allTime: Record<PaymentCurrency, number>;
  count30: number;
  countAll: number;
  /** Newest first. No user IDs or notes: amounts and products only. */
  recent: RecordedPayment[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The role allowed to record a manual payment (POST /api/admin/track-payment).
 *
 * funnel_events accepts inserts from any signed-in user (its INSERT policy is
 * WITH CHECK (true), 20260414000000_create_ceo_dashboard_tables.sql), so a
 * payment_convert row only counts as revenue when metadata.recorded_by is a
 * current admin. This keeps a forged row out of the totals until a migration
 * closes the insert policy.
 */
export const PAYMENT_RECORDER_ROLE = "admin";

/** Lower-cased user ids from user_roles rows, for parsePaymentEvent. */
export function paymentRecorderIds(rows: readonly { user_id: string | null }[] | null): Set<string> {
  return new Set((rows ?? []).flatMap((r) => (r.user_id ? [r.user_id.toLowerCase()] : [])));
}

/** True when an admin recorded this payment through the track-payment route. */
export function isRecordedByAdmin(metadata: unknown, recorders: ReadonlySet<string>): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  const recordedBy = (metadata as Record<string, unknown>).recorded_by;
  return typeof recordedBy === "string" && recorders.has(recordedBy.toLowerCase());
}

export function parsePaymentEvent(
  row: PaymentEventRow,
  recorders: ReadonlySet<string>,
): RecordedPayment | null {
  if (!row.event_timestamp || !row.metadata || typeof row.metadata !== "object") return null;
  if (!isRecordedByAdmin(row.metadata, recorders)) return null;
  const meta = row.metadata as Record<string, unknown>;
  const amount = typeof meta.amount === "number" ? meta.amount : Number(meta.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const currency: PaymentCurrency = meta.currency === "USD" ? "USD" : "THB";
  return {
    at: row.event_timestamp,
    amount,
    currency,
    productName: typeof meta.product_name === "string" && meta.product_name ? meta.product_name : null,
    paymentMethod: typeof meta.payment_method === "string" && meta.payment_method ? meta.payment_method : null,
  };
}

/**
 * Sum recorded payments per currency for the last 30 days, the 30 before, and
 * all time. Rows not recorded by one of `recorders` (admin user ids) are skipped.
 */
export function summarizeRecordedPayments(
  rows: readonly PaymentEventRow[],
  recorders: ReadonlySet<string>,
  now: Date = new Date(),
  recentLimit = 5,
): RecordedPaymentSummary {
  const zero = (): Record<PaymentCurrency, number> => ({ THB: 0, USD: 0 });
  const summary: RecordedPaymentSummary = {
    last30: zero(),
    previous30: zero(),
    allTime: zero(),
    count30: 0,
    countAll: 0,
    recent: [],
  };
  const nowMs = now.getTime();
  const payments = rows
    .map((row) => parsePaymentEvent(row, recorders))
    .filter((p): p is RecordedPayment => p !== null)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  for (const payment of payments) {
    const age = nowMs - Date.parse(payment.at);
    summary.allTime[payment.currency] += payment.amount;
    summary.countAll += 1;
    if (age >= 0 && age < 30 * DAY_MS) {
      summary.last30[payment.currency] += payment.amount;
      summary.count30 += 1;
    } else if (age >= 30 * DAY_MS && age < 60 * DAY_MS) {
      summary.previous30[payment.currency] += payment.amount;
    }
  }
  summary.recent = payments.slice(0, recentLimit);
  return summary;
}

/** Percent change, or 0 when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function getPaymentSummary(): Promise<RecordedPaymentSummary> {
  // Admins can read every user_roles row (users_read_own_roles allows is_admin).
  const [payments, recorders] = await Promise.all([
    db()
      .from("funnel_events")
      .select("event_timestamp, metadata")
      .eq("event_name", "payment_convert")
      .order("event_timestamp", { ascending: false })
      .limit(2000),
    db().from("user_roles").select("user_id").eq("role", PAYMENT_RECORDER_ROLE),
  ]);
  if (payments.error) throw new Error(`Failed to load payments: ${payments.error.message}`);
  if (recorders.error) throw new Error(`Failed to load payment recorders: ${recorders.error.message}`);
  return summarizeRecordedPayments(
    (payments.data ?? []) as PaymentEventRow[],
    paymentRecorderIds(recorders.data),
  );
}

export async function getNorthStarMetrics(): Promise<NorthStarMetrics> {
  const [{ data: allEvents }, payments] = await Promise.all([
    db().from('funnel_events').select('event_name, user_id, event_timestamp'),
    // Revenue is optional here: a failed read shows 0 instead of hiding every metric.
    getPaymentSummary().catch(() => summarizeRecordedPayments([], new Set())),
  ]);

  const events = allEvents || [];
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  const currentEvents = events.filter(e => new Date(e.event_timestamp) >= thirtyDaysAgo);
  const previousEvents = events.filter(e => {
    const date = new Date(e.event_timestamp);
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  });
  
  const allTimeHackathon = new Set(events.filter(e => e.event_name === 'hackathon_signup').map(e => e.user_id));
  const allTimeApp = new Set(events.filter(e => e.event_name === 'app_register').map(e => e.user_id));
  const allTimePortfolio = new Set(events.filter(e => e.event_name === 'portfolio_complete').map(e => e.user_id));
  const allTimePaid = new Set(events.filter(e => e.event_name === 'payment_convert').map(e => e.user_id));
  
  return {
    // Manually recorded THB payments in the last 30 days (not true recurring revenue).
    mrr: payments.last30.THB,
    mrr_change: percentChange(payments.last30.THB, payments.previous30.THB),
    paying_customers: allTimePaid.size,
    customers_change: 0,
    week4_retention: calculateRetention(currentEvents, previousEvents),
    retention_change: 0,
    cac: 0,
    cac_change: 0,
    hackathon_signups: allTimeHackathon.size,
    app_adoption: allTimeApp.size,
    portfolio_completions: allTimePortfolio.size,
  };
}

type FunnelEventLite = { event_name: string; user_id: string | null; event_timestamp: string };

function calculateRetention(currentEvents: FunnelEventLite[], _previousEvents: FunnelEventLite[]): number {
  // Simplified retention calculation
  const currentActive = new Set(currentEvents.filter(e => e.event_name === 'weekly_active').map(e => e.user_id));
  const totalUsers = new Set(currentEvents.map(e => e.user_id));
  
  if (totalUsers.size === 0) return 0;
  return Math.round((currentActive.size / totalUsers.size) * 100);
}

export async function getFunnelMetrics(): Promise<FunnelStage[]> {
  const { data: events } = await db()
    .from('funnel_events')
    .select('event_name, user_id')
    .order('event_timestamp', { ascending: true });

  if (!events) return [];

  const funnelOrder = [
    'hackathon_signup',
    'app_register',
    'portfolio_complete',
    'grading_request',
    'payment_convert'
  ];

  const stages: FunnelStage[] = [];
  let previousCount = 0;

  for (let i = 0; i < funnelOrder.length; i++) {
    const eventName = funnelOrder[i];
    const users = new Set(events.filter(e => e.event_name === eventName).map(e => e.user_id));
    const count = users.size;
    
    let conversionRate = 100;
    if (i > 0 && previousCount > 0) {
      conversionRate = Math.round((count / previousCount) * 100);
    }

    const targets = [100, 50, 51, 44, 65];
    
    stages.push({
      name: eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count,
      previous_count: previousCount,
      conversion_rate: conversionRate,
      is_target_met: conversionRate >= targets[i]
    });
    
    previousCount = count;
  }

  return stages;
}

export async function getCohortRetention(): Promise<CohortData[]> {
  const { data: cohorts } = await db()
    .from('cohort_assignments')
    .select('*')
    .order('cohort_date', { ascending: false })
    .limit(8);

  if (!cohorts) return [];

  const cohortData: CohortData[] = [];

  for (const cohort of cohorts) {
    const { data: users } = await db()
      .from('cohort_assignments')
      .select('user_id')
      .eq('cohort_date', cohort.cohort_date);

    if (!users) continue;

    const userIds = users.map(u => u.user_id);
    const totalUsers = userIds.length;

    const { data: activity } = await db()
      .from('funnel_events')
      .select('user_id, event_timestamp')
      .in('user_id', userIds)
      .eq('event_name', 'weekly_active')
      .gte('event_timestamp', cohort.cohort_date);

    const retention: { week: number; users: number; rate: number }[] = [];
    
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(cohort.cohort_date);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const activeUsers = new Set(
        activity?.filter(a => {
          const date = new Date(a.event_timestamp);
          return date >= weekStart && date < weekEnd;
        }).map(a => a.user_id) || []
      );

      retention.push({
        week,
        users: activeUsers.size,
        rate: Math.round((activeUsers.size / totalUsers) * 100)
      });
    }

    cohortData.push({
      cohort_date: cohort.cohort_date,
      total_users: totalUsers,
      retention
    });
  }

  return cohortData;
}

export async function getActiveAlerts(): Promise<DashboardAlert[]> {
  const { data: alerts } = await db()
    .from('dashboard_alerts')
    .select('*')
    .eq('is_resolved', false)
    .order('created_at', { ascending: false })
    .limit(10);

  return alerts || [];
}

export async function resolveAlert(alertId: string): Promise<void> {
  const { error } = await db()
    .from('dashboard_alerts')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString()
    })
    .eq('id', alertId);
  if (error) throw new Error(`Could not resolve the alert: ${error.message}`);
}

export async function getAIAgentStatuses(): Promise<AIAgentStatus[]> {
  const agents = ['funnel_guardian', 'content_strategist', 'churn_predictor', 'retro_bot'];
  
  const statuses: AIAgentStatus[] = [];
  
  for (const agent of agents) {
    const { data: runs } = await db()
      .from('ai_agent_runs')
      .select('*')
      .eq('agent_name', agent)
      .order('run_timestamp', { ascending: false })
      .limit(1);
    
    const lastRun = runs?.[0];
    
    statuses.push({
      agent_name: agent.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      status: lastRun?.status || 'completed',
      last_run: lastRun?.run_timestamp || new Date().toISOString(),
      alerts_generated: lastRun?.alerts_generated || 0,
      is_healthy: !lastRun?.error_message && (lastRun?.status === 'completed' || lastRun?.status === 'alert_triggered')
    });
  }
  
  return statuses;
}

export async function getContentSuggestions(): Promise<ContentSuggestion[]> {
  const { data: suggestions } = await db()
    .from('content_suggestions')
    .select('*')
    .eq('is_approved', false)
    .eq('is_posted', false)
    .gte('suggested_date', new Date().toISOString().split('T')[0])
    .order('suggested_date', { ascending: true })
    .limit(7);

  return suggestions || [];
}

export async function approveContent(suggestionId: string): Promise<void> {
  const { error } = await db()
    .from('content_suggestions')
    .update({ is_approved: true })
    .eq('id', suggestionId);
  if (error) throw new Error(`Could not approve the suggestion: ${error.message}`);
}

export async function getLatestRetro(): Promise<WeeklyRetro | null> {
  const { data: retros } = await db()
    .from('weekly_retro')
    .select('*')
    .order('week_ending', { ascending: false })
    .limit(1);

  return retros?.[0] || null;
}

export async function generateRetro(): Promise<WeeklyRetro> {
  const endOfWeek = new Date();
  endOfWeek.setDate(endOfWeek.getDate() - endOfWeek.getDay());
  
  const metrics = await getNorthStarMetrics();
  
  const funnel = await getFunnelMetrics();
  
  const wins = [
    `${metrics.paying_customers} paying customers`,
    metrics.mrr > 0 ? `฿${metrics.mrr.toLocaleString()} recorded in the last 30 days` : null,
    funnel[0]?.count ? `${funnel[0].count} hackathon signups` : null,
  ].filter((win): win is string => Boolean(win));

  const blockers: string[] = [];
  if (funnel[1]?.conversion_rate < 50) {
    blockers.push(`App conversion at ${funnel[1].conversion_rate}% (target: 50%)`);
  }
  if (metrics.week4_retention < 40) {
    blockers.push(`Week-4 retention at ${metrics.week4_retention}% (target: 40%)`);
  }
  
  // Owners are left blank on purpose: the team assigns them in the meeting.
  const actionItems = [
    { task: 'Review stuck users and fix UX blockers', owner: '', due_date: '' },
    { task: 'Follow up with at-risk customers', owner: '', due_date: '' }
  ];

  const draft: Omit<WeeklyRetro, 'id'> = {
    week_ending: endOfWeek.toISOString().split('T')[0],
    wins,
    blockers,
    action_items: actionItems,
    metrics_snapshot: {
      mrr: metrics.mrr,
      paying_customers: metrics.paying_customers,
      retention: metrics.week4_retention,
      cac: metrics.cac
    }
  };

  const { data } = await db()
    .from('weekly_retro')
    .insert(draft)
    .select()
    .single();

  return (data as WeeklyRetro | null) ?? { id: '', ...draft };
}
