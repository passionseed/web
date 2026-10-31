"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, CircleCheck, RefreshCw } from "lucide-react";

import { useAdminLiveCounts } from "@/components/admin/console/live-counts";
import { AdminErrorState } from "@/components/admin/shared/AdminStates";
import type { AdminQueueSnapshot } from "@/lib/admin/console";

import {
  buildAttention,
  freshestSnapshot,
  listLabels,
  type AttentionModel,
  type AttentionRow,
} from "./attention";
import { formatBangkokTime, formatNumber } from "./format";

const noSubscribe = () => () => {};

/**
 * True once hydration is over. This section streams in after the shell, so
 * the live counts may already have moved; rendering them during hydration
 * would not match the server HTML.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

/** Live attention model: the shell's polled counts, or this page's render. */
export function useAttention(initial: AdminQueueSnapshot | null): AttentionModel {
  const { snapshot } = useAdminLiveCounts();
  const hydrated = useHydrated();
  return buildAttention(hydrated ? freshestSnapshot(snapshot, initial) : initial);
}

/**
 * "Needs attention": every queue with work in it, most urgent first. Starts
 * from the server-rendered snapshot and follows the shell's live counts.
 */
export function AttentionList({ initial }: { initial: AdminQueueSnapshot | null }) {
  const model = useAttention(initial);
  const { refresh } = useAdminLiveCounts();

  if (!model.loaded) {
    return (
      <AdminErrorState
        title="Work queues could not load"
        message="The tools still work. Try again in a moment."
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="overview-attention-body">
      {model.rows.length === 0 ? (
        <AllClear partial={model.failed.length > 0} />
      ) : (
        <ul className="admin-work-list">
          {model.rows.map((row) => (
            <li key={row.key}>
              <AttentionRowLink row={row} />
            </li>
          ))}
        </ul>
      )}
      <AttentionFooter model={model} onRetry={refresh} />
    </div>
  );
}

function AttentionRowLink({ row }: { row: AttentionRow }) {
  const { definition } = row;
  const urgent = definition.urgency === "now";
  return (
    <Link href={row.href} className="admin-work-link overview-queue">
      <span className="overview-queue-count">
        {row.approximate && <span className="overview-queue-upto">up to</span>}
        <span className="overview-queue-number">{formatNumber(row.count)}</span>
      </span>
      <div className="overview-queue-text">
        <div className="overview-queue-title">
          <h3>{definition.label}</h3>
          {urgent && (
            <span className="overview-urgent">
              <span className="overview-urgent-dot" aria-hidden="true" />
              Now
            </span>
          )}
        </div>
        <p>{definition.description}</p>
        {row.context && <span className="overview-queue-context">{row.context}</span>}
      </div>
      <ArrowRight size={19} className="admin-work-arrow" aria-hidden="true" />
    </Link>
  );
}

function AllClear({ partial }: { partial: boolean }) {
  return (
    <div className="overview-all-clear" role="status">
      <CircleCheck size={22} strokeWidth={1.5} aria-hidden="true" />
      <div>
        <p className="overview-all-clear-title">All clear</p>
        <p>
          {partial
            ? "Nothing is waiting in the queues that loaded."
            : "Nothing is waiting on the team right now. New work shows up here on its own."}
        </p>
      </div>
    </div>
  );
}

function AttentionFooter({
  model,
  onRetry,
}: {
  model: AttentionModel;
  onRetry: () => void;
}) {
  const readAt = model.generatedAt ? formatBangkokTime(model.generatedAt) : "";
  return (
    <div className="overview-attention-footer">
      {model.failed.length > 0 && (
        <p className="overview-failed">
          <span>Could not load: {listLabels(model.failed)}.</span>
          <button type="button" className="admin-quiet-link" onClick={onRetry}>
            <RefreshCw size={14} aria-hidden="true" /> Retry
          </button>
        </p>
      )}
      {readAt && <p>Counts update every minute. Last read at {readAt} Bangkok time.</p>}
    </div>
  );
}
