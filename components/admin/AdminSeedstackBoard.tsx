"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/shared/AdminStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SeedstackConsentState } from "@/lib/seedstack/consent";
import type { BoardRow, StepStatus } from "@/lib/seedstack/board";
import { SEEDSTACK_STEPS } from "@/lib/seedstack/events";

export interface SeedstackBoardStudent {
  userId: string;
  nickname: string | null;
  cohort: string | null;
  consent: SeedstackConsentState;
  row: BoardRow | null;
}

/**
 * No SeedStack event for this many days, with steps still open, counts as
 * stalled. Camp days are short, so three quiet days is worth a nudge.
 */
const STALLED_DAYS = 3;
const DAY_MS = 86_400_000;

type BoardFilter = "all" | "stalled" | "reported_stuck" | "not_started" | "finished";

const STATUS_LABEL: Record<StepStatus, string> = {
  not_started: "-",
  in_progress: "working",
  stuck: "stuck",
  done: "done",
};

const STATUS_VARIANT: Record<StepStatus, "outline" | "secondary" | "destructive" | "default"> = {
  not_started: "outline",
  in_progress: "secondary",
  stuck: "destructive",
  done: "default",
};

const CONSENT_LABEL: Record<SeedstackConsentState, string> = {
  none: "no consent",
  awaiting_parent: "waiting for parent",
  parent_declined: "parent declined",
  active: "active",
  withdrawn: "withdrawn",
};

function timeAgo(iso: string, now: number): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

/** Only http(s) links are rendered; anything else (or a malformed URL) shows as text. */
function safeLiveUrl(raw: string): { href: string; host: string } | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return { href: url.href, host: url.hostname };
  } catch {
    return null;
  }
}

function isFinished(row: BoardRow | null): boolean {
  return row !== null && SEEDSTACK_STEPS.every((step) => row.steps[step].status === "done");
}

function isStalled(row: BoardRow | null, now: number): boolean {
  return row !== null && !isFinished(row) && now - Date.parse(row.lastSeen) >= STALLED_DAYS * DAY_MS;
}

function hasReportedStuck(row: BoardRow | null): boolean {
  return row !== null && SEEDSTACK_STEPS.some((step) => row.steps[step].status === "stuck");
}

function matchesFilter(s: SeedstackBoardStudent, filter: BoardFilter, now: number): boolean {
  switch (filter) {
    case "stalled":
      return isStalled(s.row, now);
    case "reported_stuck":
      return hasReportedStuck(s.row);
    case "not_started":
      return s.row === null;
    case "finished":
      return isFinished(s.row);
    default:
      return true;
  }
}

export function AdminSeedstackBoard({
  students,
  now,
}: {
  students: SeedstackBoardStudent[];
  /** Server load time, so server and client render the same "ago" labels. */
  now: number;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BoardFilter>("all");

  const counts = useMemo(
    () => ({
      stalled: students.filter((s) => isStalled(s.row, now)).length,
      reported_stuck: students.filter((s) => hasReportedStuck(s.row)).length,
      not_started: students.filter((s) => s.row === null).length,
      finished: students.filter((s) => isFinished(s.row)).length,
    }),
    [students, now],
  );

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return students.filter(
      (s) =>
        matchesFilter(s, filter, now) &&
        (!search ||
          [s.nickname, s.cohort, s.userId].some((v) => v?.toLowerCase().includes(search))),
    );
  }, [students, query, filter, now]);

  if (students.length === 0) {
    return (
      <AdminEmptyState
        title="No SeedStack students yet"
        description="No student has opened /shift/seedstack and agreed to share progress."
      />
    );
  }

  const filtersActive = query.trim() !== "" || filter !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search nickname or cohort"
            aria-label="Search SeedStack students"
            className="h-9 pl-8"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as BoardFilter)}>
          <SelectTrigger className="h-9 w-[240px]" aria-label="Filter SeedStack students">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone ({students.length})</SelectItem>
            <SelectItem value="stalled">
              No progress in {STALLED_DAYS}+ days ({counts.stalled})
            </SelectItem>
            <SelectItem value="reported_stuck">Reported stuck ({counts.reported_stuck})</SelectItem>
            <SelectItem value="not_started">No events yet ({counts.not_started})</SelectItem>
            <SelectItem value="finished">Finished all steps ({counts.finished})</SelectItem>
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            <X className="mr-1 h-4 w-4" /> Clear
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Showing {visible.length} of {students.length}. Stalled means steps still open and no
        SeedStack event for {STALLED_DAYS} days or more.
      </p>

      {visible.length === 0 ? (
        <AdminEmptyState title="No students match these filters" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Consent</th>
                {SEEDSTACK_STEPS.map((s) => (
                  <th key={s} className="p-3 capitalize">
                    {s}
                  </th>
                ))}
                <th className="p-3">Next</th>
                <th className="p-3">Live</th>
                <th className="p-3">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => {
                const live = s.row?.liveUrl ? safeLiveUrl(s.row.liveUrl) : null;
                const stalled = isStalled(s.row, now);
                return (
                  <tr key={s.userId} className="border-t align-top">
                    <td className="p-3">
                      <div className="font-medium">{s.nickname ?? s.userId.slice(0, 8)}</div>
                      {s.cohort && <div className="text-xs text-muted-foreground">{s.cohort}</div>}
                    </td>
                    <td className="p-3">{CONSENT_LABEL[s.consent]}</td>
                    {SEEDSTACK_STEPS.map((step) => {
                      const summary = s.row?.steps[step];
                      const status = summary?.status ?? "not_started";
                      return (
                        <td key={step} className="p-3">
                          <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
                          {summary?.minutes != null && (
                            <div className="mt-1 text-xs text-muted-foreground">{summary.minutes} min</div>
                          )}
                          {summary?.detail && (
                            <div className="mt-1 max-w-[16rem] text-xs text-destructive">{summary.detail}</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="max-w-[16rem] p-3">{s.row?.next ?? "-"}</td>
                    <td className="p-3">
                      {live ? (
                        <a href={live.href} target="_blank" rel="noreferrer" className="underline">
                          {live.host}
                        </a>
                      ) : s.row?.liveUrl ? (
                        <span className="break-all text-xs text-muted-foreground" title="Not a valid web link">
                          {s.row.liveUrl}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 text-muted-foreground">
                      {s.row ? timeAgo(s.row.lastSeen, now) : "-"}
                      {stalled && (
                        <Badge variant="outline" className="ml-2 border-amber-500/50 text-amber-400">
                          stalled
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
