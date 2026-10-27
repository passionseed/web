import { BUCKET_ORDER, CLOSED_LEAD_STATUSES, type DmLeadBucket } from "@/lib/dm-leads/playbook";
import type { DmLeadFilters, DmLeadIntentFilter } from "@/lib/supabase/dm-leads";
import type { DmLeadStage, DmLeadStatus, DmPlatform } from "@/types/dm-leads";
import { pickOption, readParam, type ParamSource } from "@/lib/admin/queue-tools/url";

/**
 * URL state for /admin/dm-leads. Client-safe: only types come from the
 * service-role loader module.
 *
 * Queue links (lib/admin/console.ts ADMIN_QUEUES):
 *   awaiting our reply  ?turn=mine&status=open&sort=waiting
 *                       lead wrote last, not converted/lost/spam, internal
 *                       accounts always excluded, longest wait first. The
 *                       open-status rule runs in SQL (filters.openOnly), so
 *                       the list, the facets and the overview count agree.
 *   follow-up due       ?followup=due
 */

export const DM_LEADS_PATH = "/admin/dm-leads";

const STAGES = ["unknown", "exploring", "building", "job_seeking"] as const satisfies readonly DmLeadStage[];
const INTENTS = [
  "pay_ready",
  "pathlab",
  "community",
  "talent",
  "hands_on",
] as const satisfies readonly DmLeadIntentFilter[];
const PLATFORMS = ["instagram", "facebook"] as const satisfies readonly DmPlatform[];

export const DM_LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
  "spam",
] as const satisfies readonly DmLeadStatus[];

/** Statuses that need no reply: the conversation is finished. */
export const CLOSED_DM_LEAD_STATUSES: readonly DmLeadStatus[] = CLOSED_LEAD_STATUSES;

/** Status filter value for "not converted, lost, or spam". Not a column value. */
export const OPEN_STATUS_FILTER = "open";

export const DM_LEAD_SORTS = ["newest", "waiting", "propensity", "engagement"] as const;
export type DmLeadSort = (typeof DM_LEAD_SORTS)[number];

const PARAM_KEYS = [
  "bucket",
  "stage",
  "turn",
  "grade",
  "intent",
  "platform",
  "sort",
  "search",
  "link",
  "star",
  "followup",
  "status",
  "tag",
] as const;

export type DmLeadRawParams = Partial<Record<(typeof PARAM_KEYS)[number], string>>;

/** The values the filter bar shows; "all" or "" mean no filter. */
export interface DmLeadFilterBarValues {
  stage: string;
  grade: string;
  intent: string;
  platform: string;
  status: string;
  tag: string;
  sort: DmLeadSort;
  search: string;
  turn: string;
  link: string;
  star: string;
  followup: string;
}

export interface DmLeadView {
  /**
   * Passed to the service-role loaders. status=open becomes `openOnly`, which
   * hides converted, lost and spam in SQL.
   */
  filters: DmLeadFilters;
  /** Normalised values for the filter bar, so it shows what is applied. */
  bar: DmLeadFilterBarValues;
}

function readRaw(source: ParamSource): DmLeadRawParams {
  const raw: DmLeadRawParams = {};
  for (const key of PARAM_KEYS) {
    const value = readParam(source, key);
    if (value !== undefined) raw[key] = value;
  }
  return raw;
}

function optional<T extends string>(raw: string | undefined, options: readonly T[]): T | undefined {
  return options.find((option) => option === raw);
}

function parseBucket(raw: string | undefined): DmLeadBucket | undefined {
  if (!raw || raw === "all") return undefined;
  return BUCKET_ORDER.find((b) => b === raw);
}

export function parseDmLeadView(source: ParamSource): DmLeadView {
  const raw = readRaw(source);
  const sort = pickOption(raw.sort, DM_LEAD_SORTS, "newest");
  const stage = optional(raw.stage, STAGES);
  const intent = optional(raw.intent, INTENTS);
  const platform = optional(raw.platform, PLATFORMS);
  const leadStatus = optional(raw.status, DM_LEAD_STATUSES);
  const openOnly = raw.status === OPEN_STATUS_FILTER;
  const grade = raw.grade && raw.grade !== "all" ? raw.grade : undefined;
  const tag = raw.tag && raw.tag !== "all" ? raw.tag : undefined;
  const search = raw.search?.trim() || undefined;

  const filters: DmLeadFilters = {
    bucket: parseBucket(raw.bucket),
    stage,
    grade,
    intent,
    platform,
    myTurnOnly: raw.turn === "mine",
    search,
    sort,
    pathlabLinkSent: raw.link === "pathlab",
    starredOnly: raw.star === "1",
    followUpDue: raw.followup === "due",
    leadStatus,
    openOnly,
    tag,
  };

  return {
    filters,
    bar: {
      stage: stage ?? "all",
      grade: grade ?? "all",
      intent: intent ?? "all",
      platform: platform ?? "all",
      status: leadStatus ?? (openOnly ? OPEN_STATUS_FILTER : "all"),
      tag: tag ?? "all",
      sort,
      search: raw.search ?? "",
      turn: filters.myTurnOnly ? "mine" : "",
      link: filters.pathlabLinkSent ? "pathlab" : "",
      star: filters.starredOnly ? "1" : "",
      followup: filters.followUpDue ? "due" : "",
    },
  };
}

/** Sum of the open statuses, for the "Open" option in the status select. */
export function openStatusCount(counts: Partial<Record<string, number>> | undefined): number {
  if (!counts) return 0;
  return DM_LEAD_STATUSES.filter((s) => !CLOSED_DM_LEAD_STATUSES.includes(s)).reduce(
    (sum, s) => sum + (counts[s] ?? 0),
    0,
  );
}
