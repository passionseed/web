import {
  ADMIN_QUEUE_BY_KEY,
  openQueues,
  type AdminQueueCount,
  type AdminQueueDefinition,
  type AdminQueueSnapshot,
} from "@/lib/admin/console";

import { formatNumber } from "./format";

/**
 * The "Needs attention" model: which queues have work, which failed to load,
 * and the one-line summary in the page header. Pure, so the server render and
 * the live client update compute the same thing.
 */

export interface AttentionRow {
  key: AdminQueueCount["key"];
  definition: AdminQueueDefinition;
  count: number;
  href: string;
  approximate: boolean;
  context?: string;
}

export interface AttentionModel {
  /** False when there is no snapshot at all. */
  loaded: boolean;
  /** Queues with work, most urgent first, then largest first. */
  rows: AttentionRow[];
  /** Queues whose count could not be read. */
  failed: AdminQueueDefinition[];
  /** Items across every open queue. */
  total: number;
  /** Items in "now" queues. */
  nowTotal: number;
  /** True when any open count is an upper bound. */
  approximate: boolean;
  /** ISO time the counts were read. */
  generatedAt: string | null;
}

/**
 * The newer of the shell's live snapshot and the one this page rendered with.
 * After a client navigation the shell can still hold an older poll result.
 */
export function freshestSnapshot(
  live: AdminQueueSnapshot | null,
  initial: AdminQueueSnapshot | null,
): AdminQueueSnapshot | null {
  if (!live) return initial;
  if (!initial) return live;
  const liveAt = Date.parse(live.generatedAt) || 0;
  const initialAt = Date.parse(initial.generatedAt) || 0;
  return liveAt >= initialAt ? live : initial;
}

export function buildAttention(snapshot: AdminQueueSnapshot | null): AttentionModel {
  if (!snapshot) {
    return {
      loaded: false,
      rows: [],
      failed: [],
      total: 0,
      nowTotal: 0,
      approximate: false,
      generatedAt: null,
    };
  }

  // A key the client does not know (newer server) would break the sort.
  const known = snapshot.queues.filter((q) => q.key in ADMIN_QUEUE_BY_KEY);
  const rows: AttentionRow[] = openQueues({ ...snapshot, queues: known }).map((q) => ({
    key: q.key,
    definition: ADMIN_QUEUE_BY_KEY[q.key],
    count: q.count ?? 0,
    href: q.href || ADMIN_QUEUE_BY_KEY[q.key].href,
    approximate: Boolean(q.approximate),
    context: q.context,
  }));
  const failed = known
    .filter((q) => q.count === null)
    .map((q) => ADMIN_QUEUE_BY_KEY[q.key]);

  return {
    loaded: true,
    rows,
    failed,
    total: rows.reduce((sum, row) => sum + row.count, 0),
    nowTotal: rows
      .filter((row) => row.definition.urgency === "now")
      .reduce((sum, row) => sum + row.count, 0),
    approximate: rows.some((row) => row.approximate),
    generatedAt: snapshot.generatedAt,
  };
}

/** "5 things need you, 2 of them now." for the page header. */
export function attentionSentence(model: AttentionModel): string {
  if (!model.loaded) return "Work queues could not load.";
  if (model.total === 0) {
    return model.failed.length > 0
      ? "Nothing waiting in the queues that loaded."
      : "All clear, nothing is waiting on the team.";
  }
  const count = formatNumber(model.total);
  const subject = model.approximate ? `Up to ${count}` : count;
  const verb = model.total === 1 ? "thing needs" : "things need";
  if (model.nowTotal === model.total) return `${subject} ${verb} you now.`;
  if (model.nowTotal > 0) {
    return `${subject} ${verb} you, ${formatNumber(model.nowTotal)} of them now.`;
  }
  return `${subject} ${verb} you.`;
}

/** Sentence-joined list of queue labels, for the "could not load" line. */
export function listLabels(definitions: readonly AdminQueueDefinition[]): string {
  const labels = definitions.map((d) => d.label);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
