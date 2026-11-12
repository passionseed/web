"use client";

import type { AdminQueueSnapshot } from "@/lib/admin/console";

import { attentionSentence } from "./attention";
import { useAttention } from "./AttentionList";

/**
 * The header's one-line read of the day, e.g. "5 things need you, 2 of them
 * now. SHIFT[3] applications close in 12 days." The queue half follows the
 * live counts; the SHIFT half comes from the server render.
 */
export function OverviewSummary({
  initial,
  shiftLine,
}: {
  initial: AdminQueueSnapshot | null;
  shiftLine: string | null;
}) {
  const model = useAttention(initial);
  return (
    <p className="overview-summary">
      {attentionSentence(model)}
      {shiftLine && <> {shiftLine}</>}
    </p>
  );
}

export function OverviewSummarySkeleton() {
  return (
    <span className="overview-summary-loading" aria-busy="true">
      <span className="sr-only" role="status">
        Reading the work queues
      </span>
      <span className="overview-skeleton" style={{ width: 280, height: 14 }} aria-hidden="true" />
    </span>
  );
}
