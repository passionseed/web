import type { DueItem } from "./linear-progress";
import {
  ELEMENT_LABEL,
  isNextStepDue,
  isNextStepOverdue,
  KIND_LABEL,
  type PipelineElement,
  type PipelineItem,
} from "./pipeline";
import { OWNERS, type Owner } from "./targets";

/**
 * The "Today" strip: everything that needs a person today, from every
 * source, in one short list. Pure, so it is tested.
 *
 * Rows for the whole team (slips to check, missing voices) show under every
 * owner. Rows with no owner show only under "All".
 */

export type OwnerFilter = Owner | "all";

/** Links from the Today strip into the pipeline: open one card, or the Speakers tab. */
export const PIPELINE_ITEM_HASH = "#pipeline-item-";
export const PIPELINE_SPEAKERS_HREF = "#pipeline-kind-speaker";
export const pipelineItemHref = (id: string) => `${PIPELINE_ITEM_HASH}${id}`;

export type TodayRow = {
  key: string;
  source: "slips" | "followup" | "task" | "voice";
  title: string;
  detail: string;
  href: string;
  external: boolean;
  /** One of OWNERS, null when nobody owns it, "team" when it is everyone's. Used by the owner chips. */
  owner: Owner | null | "team";
  /**
   * The assignee's name as Linear shows it, when it does not map to one of
   * OWNERS (HACKATHON_OWNER_NAMES). Shown instead of "No owner"; such a row
   * shows only under All.
   */
  ownerLabel?: string;
  overdue: boolean;
  /** For sorting: the date it is due, or null for team rows. */
  due: string | null;
};

/** "big", " Big " -> "Big"; a name that is not one of the owners -> null. */
export function asOwner(name: string | null | undefined): Owner | null {
  const v = (name ?? "").trim().toLowerCase();
  return OWNERS.find((o) => o.toLowerCase() === v) ?? null;
}

export function buildTodayRows({
  today,
  slipsToCheck,
  items,
  tasks,
  elementsMissing,
}: {
  today: string;
  /** Null when sign-ups did not load. */
  slipsToCheck: number | null;
  /** Null when the pipeline did not load. */
  items: readonly PipelineItem[] | null;
  /** Null when Linear did not load. */
  tasks: readonly DueItem[] | null;
  elementsMissing: readonly PipelineElement[] | null;
}): TodayRow[] {
  const rows: TodayRow[] = [];

  if (slipsToCheck && slipsToCheck > 0) {
    rows.push({
      key: "slips",
      source: "slips",
      title: `${slipsToCheck} ${slipsToCheck === 1 ? "slip" : "slips"} to check`,
      detail: "Paid seats waiting on a person",
      href: "/admin/hackathon/registrations",
      external: false,
      owner: "team",
      overdue: false,
      due: null,
    });
  }

  for (const it of items ?? []) {
    if (!isNextStepDue(it, today)) continue;
    const overdue = isNextStepOverdue(it, today);
    rows.push({
      key: `p-${it.id}`,
      source: "followup",
      title: it.next_step ? `${it.name}: ${it.next_step}` : it.name,
      detail: `${KIND_LABEL[it.kind].replace(/s$/, "")} follow-up`,
      href: pipelineItemHref(it.id),
      external: false,
      owner: asOwner(it.owner),
      overdue,
      due: it.next_step_due ?? today,
    });
  }

  for (const t of tasks ?? []) {
    const owner = asOwner(t.owner);
    rows.push({
      key: `t-${t.identifier}`,
      source: "task",
      title: t.title,
      detail: t.identifier,
      href: t.url,
      external: true,
      owner,
      ...(owner === null && t.owner ? { ownerLabel: t.owner } : {}),
      overdue: t.overdue,
      due: t.dueDate,
    });
  }

  if (elementsMissing && elementsMissing.length > 0) {
    rows.push({
      key: "voices",
      source: "voice",
      title: `No speaker yet: ${elementsMissing.map((e) => ELEMENT_LABEL[e]).join(", ")}`,
      detail: "One voice per element",
      href: PIPELINE_SPEAKERS_HREF,
      external: false,
      owner: "team",
      overdue: false,
      due: null,
    });
  }

  // Slips first (money waiting), then by due date (overdue sorts first), voices last.
  const rank = (r: TodayRow) => (r.source === "slips" ? 0 : r.source === "voice" ? 2 : 1);
  return rows.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.due ?? "").localeCompare(b.due ?? "") ||
      Number(b.overdue) - Number(a.overdue),
  );
}

export function filterTodayRows(rows: readonly TodayRow[], owner: OwnerFilter): TodayRow[] {
  if (owner === "all") return [...rows];
  return rows.filter((r) => r.owner === "team" || r.owner === owner);
}

/** Rows assigned to someone whose name matches no owner chip: hidden under every chip but All. */
export function unmappedOwnerCount(rows: readonly TodayRow[]): number {
  return rows.filter((r) => r.owner === null && r.ownerLabel).length;
}
