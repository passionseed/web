import {
  pickOption,
  readPageParam,
  readParam,
  withQuery,
  type ParamSource,
} from "@/lib/admin/queue-tools/url";

/**
 * URL state for /admin/ig-comments. Client-safe.
 *   ?filter=unreplied  comments nobody has replied to yet (replied_at is null,
 *                      filtered in SQL by getCommentsForAdmin)
 *   ?filter=missed     keyword comments from the last 7 days that never got a
 *                      DM (getCommentsMissedByDm). The overview's ig_missed
 *                      queue counts exactly this list.
 *   ?stage=<stage>     auto-labelled stage
 *   ?page=<n>          page of the all and unreplied lists, newest first
 */

export const IG_COMMENTS_PATH = "/admin/ig-comments";

export const IG_STAGE_FILTERS = ["all", "unknown", "exploring", "building", "job_seeking"] as const;
export type IgStageFilter = (typeof IG_STAGE_FILTERS)[number];

export const IG_REPLY_FILTERS = ["all", "unreplied", "missed"] as const;
export type IgReplyFilter = (typeof IG_REPLY_FILTERS)[number];

/** Instagram only allows a private (DM) reply this many days after the comment. */
export const IG_PRIVATE_REPLY_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The comments from a wider missed-by-DM list that are still inside the
 * private-reply window: the same rows getCommentsMissedByDm(7) returns.
 */
export function insidePrivateReplyWindow<T extends { commented_at: string }>(
  comments: readonly T[],
  now: number = Date.now(),
): T[] {
  const cutoff = now - IG_PRIVATE_REPLY_DAYS * DAY_MS;
  return comments.filter((c) => Date.parse(c.commented_at) >= cutoff);
}

export interface IgCommentsView {
  stage: IgStageFilter;
  filter: IgReplyFilter;
  /** 1-based page of the all and unreplied lists (the missed list is never paged). */
  page: number;
}

export function parseIgCommentsView(source: ParamSource): IgCommentsView {
  return {
    stage: pickOption(readParam(source, "stage"), IG_STAGE_FILTERS, "all"),
    filter: pickOption(readParam(source, "filter"), IG_REPLY_FILTERS, "all"),
    page: readPageParam(source),
  };
}

export function igCommentsHref(view: Partial<IgCommentsView>): string {
  return withQuery(IG_COMMENTS_PATH, {
    filter: view.filter === "all" ? null : view.filter,
    stage: view.stage === "all" ? null : view.stage,
    page: view.page && view.page > 1 ? view.page : null,
  });
}

export type IgDmWindow =
  | { state: "replied" }
  | { state: "open"; daysLeft: number }
  | { state: "closed" };

/** Where a comment stands against the 7-day private-reply window. */
export function igDmWindow(repliedAt: string | null, ageDays: number): IgDmWindow {
  if (repliedAt) return { state: "replied" };
  if (ageDays <= IG_PRIVATE_REPLY_DAYS) {
    return { state: "open", daysLeft: Math.max(0, IG_PRIVATE_REPLY_DAYS - ageDays) };
  }
  return { state: "closed" };
}
