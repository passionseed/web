import { addDays } from "./bangkok-date";

/**
 * Turns Linear issues of the hackathon team into progress: by operation
 * (top-level issue and everything under it), the promotion posts as day
 * cells, and the due lists. Pure: no network, no env.
 *
 * Owner names never show an email address. Some Linear users have their
 * email as a name, so the page only uses displayName, through ownerName().
 */

export type LinearIssue = {
  identifier: string;
  title: string;
  url: string;
  state: { name: string; type: string };
  dueDate: string | null;
  priority: number | null;
  assignee: { id: string; name?: string | null; displayName?: string | null } | null;
  parent: { identifier: string } | null;
  completedAt: string | null;
};

export type Progress = { done: number; total: number };

export type OperationProgress = Progress & {
  identifier: string;
  title: string;
  url: string;
  dueDate: string | null;
  owner: string | null;
  /** True when the operation has no sub-issues and counts itself. */
  single: boolean;
  /** Its due date has passed and it is not finished. */
  pastDue: boolean;
};

export type PostCell = {
  identifier: string;
  title: string;
  url: string;
  dueDate: string;
  state: "done" | "today" | "missed" | "upcoming";
};

export type DueItem = {
  identifier: string;
  title: string;
  url: string;
  dueDate: string;
  owner: string | null;
  overdue: boolean;
};

export type TaskProgress = {
  overall: Progress;
  operations: OperationProgress[];
  /** Sub-issues of the promotion operation with a due date, one cell each. Empty when there is none. */
  promotionPosts: PostCell[];
  todayAndOverdue: DueItem[];
  next48h: DueItem[];
  /** Open issues with no due date: they never show up in the due lists. */
  noDueDate: number;
};

/** A top-level issue whose title matches this is the promotion operation. */
export const PROMOTION_TITLE = /promo|โปรโมท|โปรโมต/i;

/**
 * The team's issue list in Linear, built from any issue URL
 * (https://linear.app/<workspace>/issue/HAC-1/...). Null when it can't tell.
 */
export function linearTeamUrl(issueUrl: string | undefined, teamKey: string): string | null {
  const m = issueUrl?.match(/^https:\/\/linear\.app\/([^/]+)\//);
  return m ? `https://linear.app/${m[1]}/team/${teamKey}/all` : null;
}

export type OwnerNames = Record<string, string>;

/** Removes anything from the first "@" on, so an email can never be shown. */
function stripEmail(raw: string): string {
  return raw.split("@")[0].trim();
}

/**
 * Parse HACKATHON_OWNER_NAMES (JSON: Linear displayName -> short name).
 * Anything that isn't a flat string map is ignored.
 */
export function parseOwnerNames(raw: string | undefined | null): OwnerNames {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: OwnerNames = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * The name shown for a Linear user: the short name from HACKATHON_OWNER_NAMES
 * when there is one, else displayName cut at "@". Never an email.
 */
export function ownerName(displayName: string | null | undefined, names: OwnerNames = {}): string {
  const raw = (displayName ?? "").trim();
  const mapped = raw ? names[raw] : undefined;
  const shown = stripEmail(mapped ?? raw);
  return shown || "Someone";
}

export function isDone(issue: Pick<LinearIssue, "state">): boolean {
  return issue.state.type === "completed";
}

function isCanceled(issue: Pick<LinearIssue, "state">): boolean {
  return issue.state.type === "canceled";
}

function priorityRank(p: number | null): number {
  // Linear: 0 = none, 1 = urgent ... 4 = low. None sorts last.
  return !p ? 5 : p;
}

function byDueThenPriority(a: DueItem & { priority: number | null }, b: DueItem & { priority: number | null }) {
  return a.dueDate.localeCompare(b.dueDate) || priorityRank(a.priority) - priorityRank(b.priority);
}

export function aggregateTasks(
  rawIssues: readonly LinearIssue[],
  today: string,
  names: OwnerNames = {},
): TaskProgress {
  const issues = rawIssues.filter((i) => !isCanceled(i));
  const owner = (i: LinearIssue) => (i.assignee ? ownerName(i.assignee.displayName, names) : null);

  const overall: Progress = { done: issues.filter(isDone).length, total: issues.length };

  // By operation: every issue rolls up to its top-level ancestor among the
  // issues we have. A parent we don't have (canceled or archived) makes the
  // issue its own top level.
  const byId = new Map(issues.map((i) => [i.identifier, i]));
  const rootOf = (i: LinearIssue): LinearIssue => {
    let cur = i;
    const seen = new Set<string>();
    while (cur.parent && byId.has(cur.parent.identifier) && !seen.has(cur.identifier)) {
      seen.add(cur.identifier);
      cur = byId.get(cur.parent.identifier)!;
    }
    return cur;
  };
  const ops = new Map<string, OperationProgress>();
  for (const i of issues) {
    const root = rootOf(i);
    if (!ops.has(root.identifier)) {
      ops.set(root.identifier, {
        identifier: root.identifier,
        title: root.title,
        url: root.url,
        dueDate: root.dueDate,
        owner: owner(root),
        done: 0,
        total: 0,
        single: true,
        pastDue: false,
      });
    }
    if (root.identifier !== i.identifier) {
      const op = ops.get(root.identifier)!;
      op.single = false;
      op.total += 1;
      if (isDone(i)) op.done += 1;
    }
  }
  for (const op of ops.values()) {
    if (op.single) {
      op.total = 1;
      op.done = isDone(byId.get(op.identifier)!) ? 1 : 0;
    }
    op.pastDue = Boolean(op.dueDate && op.dueDate < today && op.done < op.total);
  }
  const operations = [...ops.values()].sort(
    (a, b) =>
      (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.identifier.localeCompare(b.identifier, "en", { numeric: true }),
  );

  // Due lists (Bangkok dates; Linear due dates are plain calendar dates).
  const horizon = addDays(today, 2);
  const open = issues.filter((i) => !isDone(i) && i.dueDate);
  const toItem = (i: LinearIssue) => ({
    identifier: i.identifier,
    title: i.title,
    url: i.url,
    dueDate: i.dueDate!,
    owner: owner(i),
    overdue: i.dueDate! < today,
    priority: i.priority,
  });
  const strip = ({ priority: _priority, ...rest }: DueItem & { priority: number | null }): DueItem => rest;
  const todayAndOverdue = open
    .filter((i) => i.dueDate! <= today)
    .map(toItem)
    .sort(byDueThenPriority)
    .map(strip);
  const next48h = open
    .filter((i) => i.dueDate! > today && i.dueDate! <= horizon)
    .map(toItem)
    .sort(byDueThenPriority)
    .map(strip);

  const noDueDate = issues.filter((i) => !isDone(i) && !i.dueDate).length;

  // Promotion posts: everything under the promotion operation, as day cells.
  const promo = operations.find((op) => !op.single && PROMOTION_TITLE.test(op.title));
  const promotionPosts: PostCell[] = promo
    ? issues
        .filter((i) => i.identifier !== promo.identifier && i.dueDate && rootOf(i).identifier === promo.identifier)
        .map((i) => ({
          identifier: i.identifier,
          title: i.title,
          url: i.url,
          dueDate: i.dueDate!,
          state: isDone(i)
            ? ("done" as const)
            : i.dueDate! < today
              ? ("missed" as const)
              : i.dueDate === today
                ? ("today" as const)
                : ("upcoming" as const),
        }))
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.identifier.localeCompare(b.identifier, "en", { numeric: true }))
    : [];

  return { overall, operations, promotionPosts, todayAndOverdue, next48h, noDueDate };
}
