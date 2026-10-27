"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  decideSummaryAction,
  listSummariesAction,
  takeDownSummaryAction,
} from "@/app/admin/shift/rounds/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatIct } from "@/lib/shift-round/admin/format";
import type { AdminSummaryRevision, SummaryContent, SummaryStatus } from "@/lib/shift-round/admin/types";
import { cn } from "@/lib/utils";

import { ActionError, EMPTY_VALUE, LoadError, NativeSelect, Pill, SearchBox, statusTone } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";

type Filter = "pending" | "approved" | "rejected" | "taken_down" | "all";

const FIELDS: { key: keyof SummaryContent; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "demo_url", label: "Demo link" },
  { key: "public_counts", label: "Numbers shown" },
];

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return EMPTY_VALUE;
  if (typeof value === "object") {
    return Object.entries(value as Record<string, boolean>)
      .filter(([, on]) => on)
      .map(([k]) => k.replaceAll("_", " "))
      .join(", ") || "none";
  }
  return String(value);
}

/** Side-by-side diff of a revision against the currently public one. */
function SummaryDiff({ revision }: { revision: AdminSummaryRevision }) {
  const before = revision.public_revision;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="w-32 py-1 font-normal">Field</th>
            <th className="py-1 font-normal">Public now{before?.revision ? ` (rev ${before.revision})` : ""}</th>
            <th className="py-1 font-normal">This revision (rev {revision.revision})</th>
          </tr>
        </thead>
        <tbody>
          {FIELDS.map(({ key, label }) => {
            const a = show(before?.[key]);
            const b = show(revision[key]);
            const changed = !before || a !== b;
            return (
              <tr key={key} className="border-t align-top">
                <td className="py-2 text-muted-foreground">{label}</td>
                <td className={cn("py-2 pr-3 whitespace-pre-wrap", changed && before && "text-red-300 line-through decoration-red-300/50")} lang="th">
                  {before ? a : <span className="text-muted-foreground">Nothing public yet</span>}
                </td>
                <td className={cn("py-2 whitespace-pre-wrap", changed && "text-emerald-300")} lang="th">
                  {key === "demo_url" && revision.demo_url ? (
                    <a href={revision.demo_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all underline">
                      {revision.demo_url}
                    </a>
                  ) : (
                    b
                  )}
                  {changed && <span className="sr-only"> (changed)</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RevisionCard({
  revision,
  busy,
  onApprove,
  onReject,
  onTakeDown,
}: {
  revision: AdminSummaryRevision;
  busy: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onTakeDown: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const needReason = (fn: (r: string) => void) => () => {
    if (!reason.trim()) {
      setReasonError("Add a reason. The student sees it.");
      return;
    }
    setReasonError(null);
    fn(reason.trim());
  };
  const reasonId = `reason-${revision.id}`;

  return (
    <article className="space-y-3 rounded-lg border bg-card/40 p-4" aria-label={`Summary by ${revision.handle ?? "student"}`}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">{revision.handle ?? "No handle"}</h3>
          <p className="text-xs text-muted-foreground">
            Revision {revision.revision} · sent {formatIct(revision.created_at)}
          </p>
        </div>
        <Pill tone={statusTone(revision.status)}>{revision.status.replace("_", " ")}</Pill>
      </header>
      <SummaryDiff revision={revision} />
      {revision.decision_reason && <p className="text-sm text-muted-foreground">Decision note: {revision.decision_reason}</p>}
      {(revision.status === "pending" || revision.status === "approved") && (
        <div className="space-y-2 border-t pt-3">
          <label htmlFor={reasonId} className="text-sm font-medium">
            Reason (required to reject or take down)
          </label>
          <Input id={reasonId} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
          {reasonError && (
            <p role="alert" className="text-sm text-red-300">
              {reasonError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {revision.status === "pending" && (
              <>
                <Button onClick={onApprove} disabled={busy}>
                  Approve
                </Button>
                <Button variant="outline" onClick={needReason(onReject)} disabled={busy}>
                  Reject
                </Button>
              </>
            )}
            {revision.status === "approved" && (
              <Button variant="destructive" onClick={needReason(onTakeDown)} disabled={busy}>
                Take down
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function SummariesQueue({ roundId }: { roundId: string }) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const { data, error, loading, reload } = useAdminQuery(
    () => listSummariesAction(roundId, filter === "all" ? null : (filter as SummaryStatus)),
    [roundId, filter],
  );
  const { run, busy, message } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data ?? []).filter(
      (r) => !needle || [r.handle ?? "", r.title, r.description].some((v) => v.toLowerCase().includes(needle)),
    );
  }, [data, search]);

  const approve = async (r: AdminSummaryRevision) => {
    const ok = await confirm({
      title: `Make ${r.handle ?? "this"} summary public?`,
      description: "It appears on the certificate verification page if the student has it switched on.",
      confirmLabel: "Approve",
    });
    if (!ok) return;
    const result = await run(() => decideSummaryAction(r.id, "approve", null));
    if (result?.ok) {
      toast.success("Summary approved");
      refreshAdminCounts();
      await reload();
    }
  };
  const reject = async (r: AdminSummaryRevision, reason: string) => {
    const result = await run(() => decideSummaryAction(r.id, "reject", reason));
    if (result?.ok) {
      toast.success("Summary rejected");
      refreshAdminCounts();
      await reload();
    }
  };
  const takeDown = async (r: AdminSummaryRevision, reason: string) => {
    const ok = await confirm({
      title: "Take this summary down?",
      description: "It disappears from the public verification page now. The student can send a new revision.",
      confirmLabel: "Take down",
      destructive: true,
    });
    if (!ok) return;
    const result = await run(() => takeDownSummaryAction(r.entry_id, reason));
    if (result?.ok) {
      toast.success("Summary taken down");
      await reload();
    }
  };

  return (
    <div className="space-y-3">
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} label="Search summaries" placeholder="Search handle or text" />
        <NativeSelect aria-label="Status" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved (public)</option>
          <option value="rejected">Rejected</option>
          <option value="taken_down">Taken down</option>
          <option value="all">All</option>
        </NativeSelect>
      </div>
      <ActionError message={message} />
      {error ? (
        <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load summaries" />
      ) : loading && !data ? (
        <AdminLoading rows={3} rowClassName="h-40" label="Loading summaries" />
      ) : (data ?? []).length === 0 ? (
        <AdminEmptyState
          title={filter === "pending" ? "No summaries waiting" : "No summaries here"}
          description="Students send project summaries from the app after they finish. They are optional."
        />
      ) : items.length === 0 ? (
        <AdminEmptyState title="No summaries match your search" />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <RevisionCard
              key={r.id}
              revision={r}
              busy={busy}
              onApprove={() => approve(r)}
              onReject={(reason) => reject(r, reason)}
              onTakeDown={(reason) => takeDown(r, reason)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
