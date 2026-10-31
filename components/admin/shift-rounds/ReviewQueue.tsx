"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Keyboard, X } from "lucide-react";
import { toast } from "sonner";

import {
  acceptEvidenceAction,
  listEntriesAction,
  markReviewedAction,
  rejectEvidenceAction,
  reviewQueueAction,
} from "@/app/admin/shift/rounds/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { Kbd } from "@/components/admin/shared/Kbd";
import { pageShortcutsPaused } from "@/components/admin/shared/page-shortcuts";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { isEditable } from "@/lib/dom/is-editable";
import {
  EVIDENCE_TYPES,
  REASON_CODES,
  REASON_LABEL,
  TYPE_LABEL,
  formatIct,
  missionLabel,
} from "@/lib/shift-round/admin/format";
import type {
  AdminEvidence,
  EvidenceStatus,
  EvidenceType,
  MissionCounts,
  RejectReasonCode,
} from "@/lib/shift-round/admin/types";
import { cn } from "@/lib/utils";

import { EvidenceView } from "./EvidenceView";
import { ActionError, EmptyValue, LoadError, NativeSelect, Pill, SearchBox, statusTone } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";

type StatusFilter = "all" | EvidenceStatus;

function missingMissions(missions: MissionCounts | undefined, dropped?: string[]): string {
  if (dropped?.length) {
    const byKey = new Map((missions?.missions ?? []).map((m) => [m.key, m]));
    return `Missions no longer complete: ${dropped.map((k) => missionLabel(byKey.get(k) ?? { key: k })).join(", ")}`;
  }
  if (!missions?.missions) return "";
  const open = missions.missions.filter((m) => !m.complete).map((m) => missionLabel(m));
  return open.length ? `Incomplete now: ${open.join(", ")}` : "All Missions still complete";
}

export function ReviewQueue({ roundId }: { roundId: string }) {
  const [status, setStatus] = useState<StatusFilter>("submitted");
  const [type, setType] = useState<"all" | EvidenceType>("all");
  const [squadId, setSquadId] = useState("all");
  const [unreviewedOnly, setUnreviewedOnly] = useState(true);
  const [sample, setSample] = useState(false);
  const [search, setSearch] = useState("");

  const squads = useAdminQuery(() => listEntriesAction(roundId), [roundId]);
  const queue = useAdminQuery(
    () =>
      reviewQueueAction(roundId, {
        status: status === "all" ? null : status,
        type: type === "all" ? null : type,
        squad_id: squadId === "all" ? null : squadId,
        unreviewed_only: unreviewedOnly,
        sample,
      }),
    [roundId, status, type, squadId, unreviewedOnly, sample],
  );
  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const all = queue.data ?? [];
    if (!needle) return all;
    return all.filter((e) =>
      [e.handle ?? "", e.squad_name ?? "", String(e.payload?.who_label ?? ""), String(e.payload?.key_point ?? "")].some(
        (v) => v.toLowerCase().includes(needle),
      ),
    );
  }, [queue.data, search]);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const current = items.find((e) => e.id === currentId) ?? items[0] ?? null;
  const openedAt = useRef<number>(Date.now());
  useEffect(() => {
    openedAt.current = Date.now();
  }, [current?.id]);

  const [reason, setReason] = useState<RejectReasonCode | "">("");
  const [note, setNote] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [lastCascade, setLastCascade] = useState<string | null>(null);
  const reasonRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    setReason("");
    setNote("");
    setReasonError(null);
  }, [current?.id]);

  const { run, busy, message, clearError } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();

  const move = useCallback(
    (delta: number) => {
      if (!current) return;
      const index = items.findIndex((e) => e.id === current.id);
      const next = items[Math.min(items.length - 1, Math.max(0, index + delta))];
      if (next) {
        setCurrentId(next.id);
        clearError();
      }
    },
    [current, items, clearError],
  );

  const replaceItem = (id: string, patch: Partial<AdminEvidence>) => {
    queue.setData((prev) => (prev ? prev.map((e) => (e.id === id ? { ...e, ...patch } : e)) : prev));
  };
  const elapsed = () => Date.now() - openedAt.current;

  const accept = async () => {
    if (!current || current.status !== "rejected" || busy) return;
    const ok = await confirm({
      title: `Accept this ${TYPE_LABEL[current.type].toLowerCase()} log?`,
      description: "It counts again for the student's Missions. Accepted is final for review.",
      confirmLabel: "Accept",
    });
    if (!ok) return;
    const ms = elapsed();
    const result = await run(() => acceptEvidenceAction(current.id, note.trim() || null, ms));
    if (result?.ok) {
      replaceItem(current.id, { status: "accepted" });
      refreshAdminCounts();
      setLastCascade(missingMissions(result.data.missions));
      toast.success(`Accepted ${current.handle ?? "log"}`);
      move(1);
    }
  };

  const reject = async () => {
    if (!current || current.status !== "submitted" || busy) return;
    if (!reason) {
      setReasonError("Pick a reason before rejecting.");
      reasonRef.current?.focus();
      return;
    }
    if (reason === "other" && !note.trim()) {
      setReasonError("Add a note: the student sees it as the reason.");
      return;
    }
    const ok = await confirm({
      title: `Reject this ${TYPE_LABEL[current.type].toLowerCase()} log?`,
      description: `${REASON_LABEL[reason]}. The student gets a push and the log stops counting; linked changes may stop counting too.`,
      confirmLabel: "Reject",
      destructive: true,
    });
    if (!ok) return;
    const ms = elapsed();
    const result = await run(() => rejectEvidenceAction(current.id, reason, note.trim() || null, ms));
    if (result?.ok) {
      replaceItem(current.id, { status: "rejected", status_reason_code: reason, status_note: note.trim() || null });
      refreshAdminCounts();
      const invalidated = result.data.invalidated_changes?.length ?? 0;
      setLastCascade(
        [missingMissions(result.data.missions, result.data.dropped), invalidated ? `${invalidated} linked change log(s) no longer count` : ""]
          .filter(Boolean)
          .join(". "),
      );
      toast.success(`Rejected ${current.handle ?? "log"}`);
      move(1);
    }
  };

  const markReviewed = async () => {
    if (!current || current.reviewed_at || busy) return;
    const ms = elapsed();
    const result = await run(() => markReviewedAction(current.id, ms));
    if (result?.ok) {
      replaceItem(current.id, { reviewed_at: new Date().toISOString() });
      refreshAdminCounts();
      move(1);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
      if (pageShortcutsPaused(event)) return;
      switch (event.key) {
        case "j":
          move(1);
          break;
        case "k":
          move(-1);
          break;
        case "m":
          void markReviewed();
          break;
        case "a":
          void accept();
          break;
        case "r":
          event.preventDefault();
          reasonRef.current?.focus();
          break;
        default:
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-3">
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} label="Search the queue" placeholder="Search handle, squad, who" />
        <NativeSelect aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="submitted">Submitted</option>
          <option value="rejected">Rejected</option>
          <option value="accepted">Accepted</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="all">All statuses</option>
        </NativeSelect>
        <NativeSelect aria-label="Type" value={type} onChange={(e) => setType(e.target.value as "all" | EvidenceType)}>
          <option value="all">All types</option>
          {EVIDENCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Squad" value={squadId} onChange={(e) => setSquadId(e.target.value)}>
          <option value="all">All squads</option>
          {(squads.data?.squads ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={unreviewedOnly} onCheckedChange={(v) => setUnreviewedOnly(v === true)} />
          Unreviewed only
        </label>
        <label className="flex items-center gap-2 text-sm" title="Per entrant: oldest unreviewed interview and tester first">
          <Checkbox checked={sample} onCheckedChange={(v) => setSample(v === true)} />
          Sample mode
        </label>
      </div>

      {queue.error ? (
        <LoadError error={queue.error} onRetry={queue.reload} retrying={queue.loading} title="Could not load the review queue" />
      ) : queue.loading && !queue.data ? (
        <AdminLoading rows={5} rowClassName="h-16" label="Loading review queue" />
      ) : (queue.data ?? []).length === 0 ? (
        <AdminEmptyState
          title="Nothing to review"
          description={unreviewedOnly ? "Every log matching these filters has been reviewed." : "No logs match these filters."}
          icon={<CheckCheck className="h-6 w-6" />}
        />
      ) : items.length === 0 ? (
        <AdminEmptyState title="No logs match your search" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
          <ol className="max-h-[70vh] space-y-1 overflow-y-auto rounded-lg border p-1" aria-label="Review queue">
            {items.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentId(e.id);
                    clearError();
                  }}
                  aria-current={current?.id === e.id ? "true" : undefined}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                    current?.id === e.id ? "bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{e.handle ?? <EmptyValue />}</span>
                    <Pill tone={statusTone(e.status)}>{e.status}</Pill>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {TYPE_LABEL[e.type]} · {e.squad_name ?? "no squad"} · {formatIct(e.submitted_at)}
                    {e.reviewed_at ? " · reviewed" : ""}
                  </div>
                </button>
              </li>
            ))}
          </ol>

          {current && (
            <article className="space-y-4 rounded-lg border bg-card/40 p-4" aria-label={`Log by ${current.handle ?? "student"}`}>
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-medium">{current.handle ?? "No handle"}</h2>
                  <p className="text-xs text-muted-foreground">
                    {current.squad_name ?? "No squad"} ·{" "}
                    <Link className="underline" href={`/admin/shift/rounds/${roundId}/entrants/${current.entry_id}`}>
                      Entry timeline
                    </Link>
                  </p>
                </div>
                <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
                  <Kbd>j</Kbd>/<Kbd>k</Kbd> move · <Kbd>r</Kbd> reason · <Kbd>a</Kbd> accept · <Kbd>m</Kbd> reviewed
                </p>
              </header>

              <EvidenceView item={current} />

              {lastCascade && <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground" role="status">{lastCascade}</p>}
              <ActionError message={message} />

              <div className="space-y-3 border-t pt-4">
                {current.status === "submitted" && (
                  <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
                    <div className="space-y-1">
                      <label htmlFor="reject-reason" className="text-sm font-medium">
                        Reject reason
                      </label>
                      <NativeSelect
                        id="reject-reason"
                        ref={reasonRef}
                        className="w-full"
                        value={reason}
                        aria-invalid={reasonError ? true : undefined}
                        onChange={(e) => {
                          setReason(e.target.value as RejectReasonCode | "");
                          setReasonError(null);
                        }}
                      >
                        <option value="">Choose a reason…</option>
                        {REASON_CODES.map((code) => (
                          <option key={code} value={code}>
                            {REASON_LABEL[code]}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="review-note" className="text-sm font-medium">
                        Note to student {reason === "other" ? "(required)" : "(optional)"}
                      </label>
                      <Textarea id="review-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                    </div>
                    {reasonError && (
                      <p role="alert" className="text-sm text-red-300 sm:col-span-2">
                        {reasonError}
                      </p>
                    )}
                  </div>
                )}
                {current.status === "rejected" && (
                  <div className="space-y-1">
                    <label htmlFor="review-note" className="text-sm font-medium">
                      Note (optional)
                    </label>
                    <Textarea id="review-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {current.status === "submitted" && (
                    <Button variant="destructive" onClick={reject} disabled={busy}>
                      <X className="mr-1 h-4 w-4" aria-hidden="true" /> Reject
                    </Button>
                  )}
                  {current.status === "rejected" && (
                    <Button onClick={accept} disabled={busy}>
                      <Check className="mr-1 h-4 w-4" aria-hidden="true" /> Accept
                    </Button>
                  )}
                  <Button variant="outline" onClick={markReviewed} disabled={busy || Boolean(current.reviewed_at)}>
                    <CheckCheck className="mr-1 h-4 w-4" aria-hidden="true" />
                    {current.reviewed_at ? "Reviewed" : "Mark reviewed"}
                  </Button>
                  <Button variant="ghost" onClick={() => move(1)} disabled={busy}>
                    Next
                  </Button>
                </div>
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
