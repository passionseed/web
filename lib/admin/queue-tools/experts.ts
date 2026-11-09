import {
  pickOption,
  readParam,
  readUuidParam,
  withQuery,
  type ParamSource,
} from "@/lib/admin/queue-tools/url";

/**
 * URL state for /admin/experts. Client-safe.
 *   ?status=pending|approved|rejected|claimed|all  (default pending)
 *   ?page=<n>                                      (default 1)
 *   ?id=<uuid>                                     the open submission
 */

export const EXPERTS_PATH = "/admin/experts";
export const EXPERTS_PAGE_SIZE = 20;

/** Matches the expert_profiles.status CHECK constraint, plus "all". */
export const EXPERT_STATUS_FILTERS = ["pending", "approved", "rejected", "claimed", "all"] as const;
export type ExpertStatusFilter = (typeof EXPERT_STATUS_FILTERS)[number];

export const EXPERT_STATUS_LABEL: Record<ExpertStatusFilter, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  claimed: "Claimed",
  all: "All",
};

const MAX_PAGE = 10_000;

export interface ExpertsView {
  status: ExpertStatusFilter;
  page: number;
  id: string | null;
}

export function parsePage(raw: string | null | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}

export function parseExpertsView(source: ParamSource): ExpertsView {
  return {
    status: pickOption(readParam(source, "status"), EXPERT_STATUS_FILTERS, "pending"),
    page: parsePage(readParam(source, "page")),
    id: readUuidParam(source, "id"),
  };
}

/** Link to the queue or one submission. Defaults are left out. */
export function expertsHref(view: Partial<ExpertsView>): string {
  return withQuery(EXPERTS_PATH, {
    status: view.status === "pending" ? null : view.status,
    page: view.page && view.page > 1 ? view.page : null,
    id: view.id,
  });
}

/** Query string for a view (no leading "?"). */
export function expertsQuery(view: Partial<ExpertsView>): string {
  const href = expertsHref(view);
  const at = href.indexOf("?");
  return at === -1 ? "" : href.slice(at + 1);
}

export function pageCount(total: number, pageSize: number = EXPERTS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}
