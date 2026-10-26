/**
 * Shared contract for the admin console: work queues, KPIs, the activity feed,
 * the SHIFT snapshot, and omnisearch. Client-safe (no server imports), so the
 * shell, the overview, and the command palette all read the same shapes that
 * the server loaders in lib/admin/overview/* produce.
 */

// ---------------------------------------------------------------------------
// Work queues: "someone on the team has to act"
// ---------------------------------------------------------------------------

export type AdminQueueKey =
  | "dm_awaiting_reply"
  | "dm_followup_due"
  | "line_unanswered"
  | "ig_missed"
  | "shift_new_applications"
  | "shift_awaiting_payment"
  | "shift_paid_not_in_discord"
  | "round_evidence_review"
  | "round_summaries_pending"
  | "experts_pending"
  | "trials_pending"
  | "talent_unverified"
  | "meta_webhook_failures"
  | "messages_failed"
  | "round_jobs_failed";

/** How soon the queue goes stale: money or a closing reply window is "now". */
export type AdminQueueUrgency = "now" | "today" | "soon";

export interface AdminQueueDefinition {
  key: AdminQueueKey;
  /** Short action label, e.g. "DMs waiting for a reply". No em dashes. */
  label: string;
  /** One line on why it matters, shown under the label. */
  description: string;
  /** Default deep link; the loader may return a more specific one. */
  href: string;
  /** Sidebar item (ADMIN_NAV_GROUPS href) whose badge this queue adds to. */
  navHref: string | null;
  urgency: AdminQueueUrgency;
  /** Counts toward the sidebar badge. Off for low-signal or system queues. */
  badge: boolean;
}

export const ADMIN_QUEUES: readonly AdminQueueDefinition[] = [
  {
    key: "trials_pending",
    label: "Payment slips to verify",
    description: "A parent paid for a PathLab trial and the student waits on us.",
    href: "/admin/trials",
    navHref: "/admin/trials",
    urgency: "now",
    badge: true,
  },
  {
    key: "dm_awaiting_reply",
    label: "DMs waiting for a reply",
    description: "Live sales conversations. After 24 hours Meta limits how we can reply.",
    href: "/admin/dm-leads?turn=mine&status=open&sort=waiting",
    navHref: "/admin/dm-leads",
    urgency: "now",
    badge: true,
  },
  {
    key: "line_unanswered",
    label: "LINE chats to answer",
    description: "Parents send SHIFT payment slips and questions here.",
    href: "/admin/line?filter=unanswered",
    navHref: "/admin/line",
    urgency: "now",
    badge: true,
  },
  {
    key: "shift_new_applications",
    label: "SHIFT applications to review",
    description: "New applicants for the open round, waiting for accept or waitlist.",
    href: "/admin/shift/applications?status=new",
    navHref: "/admin/shift/applications",
    urgency: "today",
    badge: true,
  },
  {
    key: "shift_awaiting_payment",
    label: "Accepted, not paid yet",
    description: "Accepted applicants who still need to send a payment slip.",
    href: "/admin/shift/applications?status=accepted&paid=unpaid",
    navHref: "/admin/shift/applications",
    urgency: "today",
    badge: false,
  },
  {
    key: "shift_paid_not_in_discord",
    label: "Paid, not in Discord",
    description: "Paid seats that have not joined the round's Discord yet.",
    href: "/admin/shift/applications?paid=not_in_discord",
    navHref: "/admin/shift/applications",
    urgency: "soon",
    badge: false,
  },
  {
    key: "ig_missed",
    label: "IG comments to answer",
    description: "Commented the keyword and never got a DM. Private replies close after 7 days.",
    href: "/admin/ig-comments?filter=missed",
    navHref: "/admin/ig-comments",
    urgency: "today",
    badge: true,
  },
  {
    key: "dm_followup_due",
    label: "Follow-ups due",
    description: "Leads you asked to be reminded about.",
    href: "/admin/dm-leads?followup=due",
    navHref: "/admin/dm-leads",
    urgency: "today",
    badge: false,
  },
  {
    key: "round_evidence_review",
    label: "Round evidence to review",
    description: "Certificates and feedback wait on evidence review before the window closes.",
    href: "/admin/shift/rounds",
    navHref: "/admin/shift/rounds",
    urgency: "today",
    badge: true,
  },
  {
    key: "round_summaries_pending",
    label: "Round summaries to decide",
    description: "Students asked to change their round summary.",
    href: "/admin/shift/rounds",
    navHref: "/admin/shift/rounds",
    urgency: "soon",
    badge: false,
  },
  {
    key: "experts_pending",
    label: "Expert interviews to review",
    description: "Approving an interview turns it into a PathLab.",
    href: "/admin/experts?status=pending",
    navHref: "/admin/experts",
    urgency: "soon",
    badge: true,
  },
  {
    key: "talent_unverified",
    label: "Talent profiles to verify",
    description: "Students stay hidden from hirers until someone verifies them.",
    href: "/admin/talent?filter=unverified",
    navHref: "/admin/talent",
    urgency: "soon",
    badge: false,
  },
  {
    key: "messages_failed",
    label: "Messages that failed to send",
    description: "Outbound DM or LINE messages the platform rejected.",
    href: "/admin/dm-leads",
    navHref: null,
    urgency: "today",
    badge: false,
  },
  {
    key: "meta_webhook_failures",
    label: "Webhook failures, last 24 hours",
    description: "Instagram or Facebook events we could not process.",
    href: "/admin/meta-webhooks?status=failed&since=24h",
    navHref: "/admin/meta-webhooks",
    urgency: "soon",
    badge: false,
  },
  {
    key: "round_jobs_failed",
    label: "Round jobs that failed",
    description: "Background jobs for SHIFT rounds, last 7 days.",
    href: "/admin/shift/rounds/ops",
    navHref: "/admin/shift/rounds",
    urgency: "soon",
    badge: false,
  },
] as const;

export const ADMIN_QUEUE_BY_KEY: Record<AdminQueueKey, AdminQueueDefinition> =
  Object.fromEntries(ADMIN_QUEUES.map((q) => [q.key, q])) as Record<
    AdminQueueKey,
    AdminQueueDefinition
  >;

export interface AdminQueueCount {
  key: AdminQueueKey;
  /** null when this queue could not be loaded; the rest still render. */
  count: number | null;
  /** Deep link that opens the tool already filtered to this queue. */
  href: string;
  /** True when the count is an upper bound (filtering happens after SQL). */
  approximate?: boolean;
  /** Short context, e.g. "SHIFT[3]" or "4 inside the 24h window". */
  context?: string;
}

export interface AdminQueueSnapshot {
  /** ISO timestamp of when the counts were read. */
  generatedAt: string;
  queues: AdminQueueCount[];
}

const URGENCY_RANK: Record<AdminQueueUrgency, number> = { now: 0, today: 1, soon: 2 };

/** Queues with work in them, most urgent first, then largest first. */
export function openQueues(snapshot: AdminQueueSnapshot | null): AdminQueueCount[] {
  if (!snapshot) return [];
  return snapshot.queues
    // Unknown keys (an older or newer server) are dropped, never crash the UI.
    .filter((q) => Object.prototype.hasOwnProperty.call(ADMIN_QUEUE_BY_KEY, q.key) && (q.count ?? 0) > 0)
    .sort((a, b) => {
      const ua = URGENCY_RANK[ADMIN_QUEUE_BY_KEY[a.key].urgency];
      const ub = URGENCY_RANK[ADMIN_QUEUE_BY_KEY[b.key].urgency];
      return ua - ub || (b.count ?? 0) - (a.count ?? 0);
    });
}

/** Sidebar badge per nav href: the sum of that tool's badge queues. */
export function navBadgeCounts(snapshot: AdminQueueSnapshot | null): Record<string, number> {
  const out: Record<string, number> = {};
  if (!snapshot) return out;
  for (const q of snapshot.queues) {
    const def = ADMIN_QUEUE_BY_KEY[q.key];
    if (!def?.badge || !def.navHref || !q.count) continue;
    out[def.navHref] = (out[def.navHref] ?? 0) + q.count;
  }
  return out;
}

/** Total of every badge queue: the "needs you" number in the shell. */
export function totalAttention(snapshot: AdminQueueSnapshot | null): number {
  return Object.values(navBadgeCounts(snapshot)).reduce((sum, n) => sum + n, 0);
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export type AdminKpiKey =
  | "revenue_30d"
  | "shift_seats"
  | "signups_7d"
  | "active_learners_7d"
  | "new_leads_7d"
  | "pathlab_enrollments_7d";

export interface AdminKpi {
  key: AdminKpiKey;
  label: string;
  /** null when the source could not be read. */
  value: number | null;
  format: "number" | "baht" | "ratio";
  /** Denominator for "ratio" (e.g. seats). */
  total?: number;
  /** Same metric over the previous window, for the delta. */
  previous?: number | null;
  /** Daily values, oldest to newest, bucketed by Bangkok day. */
  series?: number[];
  /** How the number is computed, shown as a tooltip. */
  hint?: string;
  href?: string;
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

export type AdminActivityKind =
  | "application"
  | "payment"
  | "lead"
  | "signup"
  | "expert"
  | "trial"
  | "program"
  | "admin";

export interface AdminActivityItem {
  /** Stable across reloads, e.g. "application:<uuid>". */
  id: string;
  kind: AdminActivityKind;
  /** ISO timestamp. */
  at: string;
  title: string;
  detail?: string;
  href?: string;
}

// ---------------------------------------------------------------------------
// SHIFT snapshot
// ---------------------------------------------------------------------------

export interface AdminShiftSnapshot {
  cohort: {
    name: string;
    round: number;
    status: "open" | "closed" | "running" | "done";
    applyDeadline: string;
    startDate: string;
    endDate: string;
    seats: number;
    priceBaht: number;
    /** Whole Bangkok days until applications close; null once closed. */
    daysToDeadline: number | null;
  };
  /** null when shift_applications could not be read. */
  funnel: {
    applied: number;
    newCount: number;
    accepted: number;
    waitlist: number;
    declined: number;
    paid: number;
    inDiscord: number;
  } | null;
  /** The shift_rounds row running or in review now, if any. */
  liveRound: {
    id: string;
    title: string;
    entrants: number;
    pendingReview: number;
    certificatesIssued: number;
    href: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Omnisearch
// ---------------------------------------------------------------------------

export type AdminSearchType =
  | "user"
  | "dm_lead"
  | "line_contact"
  | "shift_application"
  | "shift_round"
  | "expert"
  | "map"
  | "talent"
  | "hackathon_participant";

export interface AdminSearchHit {
  type: AdminSearchType;
  id: string;
  /** Name, @handle, or map title. */
  title: string;
  /** Masked contact plus status, e.g. "SHIFT[3] · new · b***@gmail.com". */
  subtitle?: string;
  badges?: string[];
  /** Admin URL for this record. IDs only in URLs, never names or emails. */
  href: string;
  score: number;
}

export interface AdminSearchGroup {
  type: AdminSearchType;
  label: string;
  hits: AdminSearchHit[];
}

/** Shortest query the search runs, counted after normalizeAdminSearchQuery. */
export const ADMIN_SEARCH_MIN_LENGTH = 2;
export const ADMIN_SEARCH_MAX_LENGTH = 64;

/**
 * Trim, NFC, drop control characters and leading @, collapse spaces, cap
 * length. The server searches this string, so the palette should check
 * ADMIN_SEARCH_MIN_LENGTH against it too: "@b" is one character, not two.
 */
export function normalizeAdminSearchQuery(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFC")
    .replace(/\p{Cc}/gu, " ")
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ADMIN_SEARCH_MAX_LENGTH)
    .trim();
}

export interface AdminSearchResponse {
  q: string;
  tookMs: number;
  /** True when one or more entity queries failed or timed out. */
  partial: boolean;
  groups: AdminSearchGroup[];
}

/** Cross-component event: fire after a mutation to refresh live counts now. */
export const ADMIN_COUNTS_REFRESH_EVENT = "admin:refresh-counts";
