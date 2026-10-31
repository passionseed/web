import type { ShiftApplicationRow, ShiftApplicationStatus } from "@/types/shift";
import {
  pickOption,
  readParam,
  readTextParam,
  readUuidParam,
  withQuery,
  type ParamSource,
} from "@/lib/admin/queue-tools/url";

/**
 * URL state and the browser-safe row shape for /admin/shift/applications.
 * Client-safe: no server imports.
 */

export const SHIFT_APPLICATIONS_PATH = "/admin/shift/applications";

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

/**
 * Every column the admin list reads. `join_token` is left out on purpose: it is
 * the secret in a student's /shift/join link, and the console only needs the
 * link at the moment someone copies it (POST .../join-link mints and returns it).
 */
export const ADMIN_SHIFT_APPLICATION_COLUMNS = [
  "id",
  "cohort",
  "full_name",
  "nickname",
  "grade",
  "target_track",
  "problem",
  "availability",
  "ig_handle",
  "discord_handle",
  "parent_contact",
  "parent_email",
  "consent",
  // PDPA parent consent: the "mark paid" lock and the consent record admins
  // review. parent_token_hash is left out: it guards the parent's link.
  "birth_date",
  "consent_notice_version",
  "parent_email_sent_at",
  "parent_name",
  "parent_relationship",
  "parent_consented_at",
  "parent_declined_at",
  "parent_withdrawn_at",
  "parent_consent_ip",
  "parent_ai_consented_at",
  "source",
  "found_via",
  "status",
  "paid_at",
  "admin_note",
  "discord_username",
  "linked_at",
  "discord_joined_at",
  "discord_error",
  "created_at",
] as const satisfies readonly (keyof ShiftApplicationRow)[];

export type AdminShiftApplicationColumn = (typeof ADMIN_SHIFT_APPLICATION_COLUMNS)[number];

/** A SHIFT application as the admin browser sees it: no join token. */
export type AdminShiftApplication = Pick<ShiftApplicationRow, AdminShiftApplicationColumn>;

export const ADMIN_SHIFT_APPLICATION_SELECT = ADMIN_SHIFT_APPLICATION_COLUMNS.join(", ");

/** Copies only the allowed columns, so a wider row can never leak a secret. */
export function toAdminShiftApplication(
  row: Partial<ShiftApplicationRow> & Pick<ShiftApplicationRow, AdminShiftApplicationColumn>,
): AdminShiftApplication {
  const out = {} as Record<AdminShiftApplicationColumn, unknown>;
  for (const column of ADMIN_SHIFT_APPLICATION_COLUMNS) out[column] = row[column];
  return out as AdminShiftApplication;
}

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

export const APPLICATION_STATUS_FILTERS = ["all", "new", "accepted", "waitlist", "declined"] as const;
export type ApplicationStatusFilter = (typeof APPLICATION_STATUS_FILTERS)[number];

/**
 * `not_in_discord` is paid seats that have not joined the round's Discord yet:
 * the overview's "Paid, not in Discord" queue opens this filter.
 */
export const APPLICATION_PAID_FILTERS = ["all", "paid", "unpaid", "not_in_discord"] as const;
export type ApplicationPaidFilter = (typeof APPLICATION_PAID_FILTERS)[number];

export const APPLICATION_PAID_LABEL: Record<ApplicationPaidFilter, string> = {
  all: "Paid or not",
  paid: "Paid",
  unpaid: "Unpaid",
  not_in_discord: "Paid, not in Discord",
};

/** Whether an application matches a payment filter. */
export function matchesPaidFilter(
  app: Pick<AdminShiftApplication, "paid_at" | "discord_joined_at">,
  filter: ApplicationPaidFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "paid":
      return app.paid_at !== null;
    case "unpaid":
      return app.paid_at === null;
    case "not_in_discord":
      return app.paid_at !== null && app.discord_joined_at === null;
  }
}

export const APPLICATION_SORTS = ["newest", "oldest", "name", "status"] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

export interface ShiftApplicationsView {
  cohort: string;
  status: ApplicationStatusFilter;
  paid: ApplicationPaidFilter;
  /** Free-text search over names, handles, and parent contact. */
  q: string;
  sort: ApplicationSort;
  /** Application to scroll to and highlight. */
  id: string | null;
}

export interface ShiftApplicationsDefaults {
  /** The cohort the page opens on: the one taking applications now. */
  defaultCohort: string;
  /** Cohort names the tabs offer; anything else falls back to the default. */
  cohorts: readonly string[];
}

export function parseShiftApplicationsView(
  source: ParamSource,
  { defaultCohort, cohorts }: ShiftApplicationsDefaults,
): ShiftApplicationsView {
  const cohort = readParam(source, "cohort");
  return {
    cohort: cohort && cohorts.includes(cohort) ? cohort : defaultCohort,
    status: pickOption(readParam(source, "status"), APPLICATION_STATUS_FILTERS, "all"),
    paid: pickOption(readParam(source, "paid"), APPLICATION_PAID_FILTERS, "all"),
    q: readTextParam(source, "q"),
    sort: pickOption(readParam(source, "sort"), APPLICATION_SORTS, "newest"),
    id: readUuidParam(source, "id"),
  };
}

/** Query string for a view (no leading "?"). Defaults are left out. */
export function shiftApplicationsQuery(view: ShiftApplicationsView, defaultCohort: string): string {
  const href = shiftApplicationsHref({
    ...view,
    cohort: view.cohort === defaultCohort ? undefined : view.cohort,
  });
  const at = href.indexOf("?");
  return at === -1 ? "" : href.slice(at + 1);
}

/**
 * Deep link into the applications list, for the overview and the palette.
 * Leave `cohort` out to open whichever cohort is taking applications.
 */
export function shiftApplicationsHref(view: Partial<ShiftApplicationsView> = {}): string {
  return withQuery(SHIFT_APPLICATIONS_PATH, {
    cohort: view.cohort,
    status: view.status === "all" ? null : view.status,
    paid: view.paid === "all" ? null : view.paid,
    q: view.q?.trim(),
    sort: view.sort === "newest" ? null : view.sort,
    id: view.id,
  });
}

export function hasActiveFilters(view: ShiftApplicationsView): boolean {
  return view.q !== "" || view.status !== "all" || view.paid !== "all";
}

// ---------------------------------------------------------------------------
// Filtering and bulk actions
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<ShiftApplicationStatus, number> = {
  new: 0,
  accepted: 1,
  waitlist: 2,
  declined: 3,
};

type SortableApplication = Pick<AdminShiftApplication, "created_at" | "nickname" | "status">;

const SORTERS: Record<ApplicationSort, (a: SortableApplication, b: SortableApplication) => number> = {
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  oldest: (a, b) => a.created_at.localeCompare(b.created_at),
  name: (a, b) => a.nickname.localeCompare(b.nickname, "th"),
  status: (a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.created_at.localeCompare(a.created_at),
};

const SEARCH_FIELDS = [
  "full_name",
  "nickname",
  "ig_handle",
  "discord_handle",
  "discord_username",
  "parent_contact",
  "parent_email",
  "target_track",
] as const satisfies readonly AdminShiftApplicationColumn[];

export function matchesApplicationSearch(
  app: Pick<AdminShiftApplication, (typeof SEARCH_FIELDS)[number]>,
  q: string,
): boolean {
  const needle = q.trim().toLowerCase().replace(/^@/, "");
  if (!needle) return true;
  return SEARCH_FIELDS.some((field) => app[field]?.toLowerCase().includes(needle));
}

/** The rows a view shows, filtered and sorted. */
export function visibleApplications<T extends AdminShiftApplication>(
  applications: readonly T[],
  view: Pick<ShiftApplicationsView, "status" | "paid" | "q" | "sort">,
): T[] {
  return applications
    .filter((a) => view.status === "all" || a.status === view.status)
    .filter((a) => matchesPaidFilter(a, view.paid))
    .filter((a) => matchesApplicationSearch(a, view.q))
    .sort(SORTERS[view.sort]);
}

export type BulkApplicationAction = "accept" | "paid";

/** Selected rows the action would change; the rest are already done. */
export function bulkTargets<T extends Pick<AdminShiftApplication, "status" | "paid_at">>(
  selected: readonly T[],
  action: BulkApplicationAction,
): T[] {
  return action === "accept"
    ? selected.filter((a) => a.status !== "accepted")
    : selected.filter((a) => a.paid_at === null);
}

/** Most ids one bulk request may touch; the UI never selects more than a cohort. */
export const BULK_APPLICATION_LIMIT = 200;
