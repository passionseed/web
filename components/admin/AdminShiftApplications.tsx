"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CheckCheck, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import {
  ShiftApplicationRow,
  type ApplicationPatch,
} from "@/components/admin/ShiftApplicationRow";
import { ShiftSeatBar, ShiftSourceChips } from "@/components/admin/ShiftApplicationsSummary";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoading,
} from "@/components/admin/shared/AdminStates";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SHIFT_COHORT, SHIFT_COHORTS } from "@/lib/content/shift-cohort";
import { seatStats, sourceBreakdown } from "@/lib/shift/applicationStats";
import type {
  ShiftApplicationRow as Application,
  ShiftApplicationStatus,
  ShiftStudentsResponse,
} from "@/types/shift";

const normalizeHandle = (handle: string | null | undefined) =>
  (handle ?? "").trim().replace(/^@/, "").toLowerCase();

type StatusFilter = "all" | ShiftApplicationStatus;
type PaidFilter = "all" | "paid" | "unpaid";
type SortKey = "newest" | "oldest" | "name" | "status";

const STATUS_ORDER: Record<ShiftApplicationStatus, number> = {
  new: 0,
  accepted: 1,
  waitlist: 2,
  declined: 3,
};

const SORTERS: Record<SortKey, (a: Application, b: Application) => number> = {
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  oldest: (a, b) => a.created_at.localeCompare(b.created_at),
  name: (a, b) => a.nickname.localeCompare(b.nickname, "th"),
  status: (a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.created_at.localeCompare(a.created_at),
};

function matchesSearch(app: Application, search: string): boolean {
  if (!search) return true;
  const needle = search.replace(/^@/, "");
  return [
    app.full_name,
    app.nickname,
    app.ig_handle,
    app.discord_handle,
    app.discord_username,
    app.parent_contact,
    app.parent_email,
    app.target_track,
  ].some((v) => v?.toLowerCase().includes(needle));
}

/** Applications for one cohort, fetched whenever the cohort tab changes. */
function useCohortApplications(cohortName: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/admin/shift/applications?cohort=${encodeURIComponent(cohortName)}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ applications: Application[] }>;
      })
      .then((body) => {
        if (!cancelled) setApplications(body.applications);
      })
      .catch(() => {
        if (!cancelled) {
          setApplications([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cohortName, attempt]);

  const replace = useCallback((updated: Application) => {
    setApplications((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { applications, loading, error, retry, replace };
}

/** IG handles already in the SHIFT tracker, so "Add to tracker" is not doubled. */
function useTrackerHandles() {
  const [handles, setHandles] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/admin/shift/students")
      .then((res) => (res.ok ? (res.json() as Promise<ShiftStudentsResponse>) : null))
      .then((body) => {
        if (body) setHandles(new Set(body.students.map((s) => normalizeHandle(s.ig_handle))));
      })
      .catch(() => {
        /* Non-critical: the button just stays enabled. */
      });
  }, []);

  const add = useCallback((handle: string) => {
    setHandles((prev) => new Set(prev).add(normalizeHandle(handle)));
  }, []);

  return { handles, add };
}

export function AdminShiftApplications() {
  const [cohortName, setCohortName] = useState(SHIFT_COHORT.name);
  const cohort = SHIFT_COHORTS.find((c) => c.name === cohortName) ?? SHIFT_COHORT;
  const { applications, loading, error, retry, replace } = useCohortApplications(cohortName);
  const { handles: trackerHandles, add: addTrackerHandle } = useTrackerHandles();
  const { confirm, confirmDialog } = useConfirm();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paidFilter, setPaidFilter] = useState<PaidFilter>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Selection belongs to one cohort's list.
  useEffect(() => setSelected(new Set()), [cohortName]);

  const stats = useMemo(() => seatStats(applications, cohort.seats), [applications, cohort.seats]);
  const sources = useMemo(() => sourceBreakdown(applications), [applications]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return applications
      .filter((a) => statusFilter === "all" || a.status === statusFilter)
      .filter((a) => paidFilter === "all" || (paidFilter === "paid") === (a.paid_at !== null))
      .filter((a) => matchesSearch(a, search))
      .sort(SORTERS[sort]);
  }, [applications, query, statusFilter, paidFilter, sort]);

  const filtersActive = query.trim() !== "" || statusFilter !== "all" || paidFilter !== "all";
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPaidFilter("all");
  };

  // Only count selected rows that are still visible, so bulk actions match what is on screen.
  const selectedVisible = visible.filter((a) => selected.has(a.id));
  const allVisibleSelected = visible.length > 0 && selectedVisible.length === visible.length;
  const headerChecked: boolean | "indeterminate" = allVisibleSelected
    ? true
    : selectedVisible.length > 0
      ? "indeterminate"
      : false;

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllVisible = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const a of visible) {
        if (checked) next.add(a.id);
        else next.delete(a.id);
      }
      return next;
    });
  };

  const sendPatch = useCallback(
    async (id: string, body: ApplicationPatch): Promise<Application> => {
      const res = await fetch(`/api/admin/shift/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await res.json().catch(() => ({}))) as { application?: Application; error?: string };
      if (!res.ok || !result.application) throw new Error(result.error);
      return result.application;
    },
    [],
  );

  const patch = useCallback(
    async (id: string, body: ApplicationPatch): Promise<boolean> => {
      try {
        replace(await sendPatch(id, body));
        return true;
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : "Failed to update application");
        return false;
      }
    },
    [replace, sendPatch],
  );

  /** Runs one PATCH per row through the existing per-application endpoint. */
  async function runBulk(kind: "accept" | "paid") {
    const targets =
      kind === "accept"
        ? selectedVisible.filter((a) => a.status !== "accepted")
        : selectedVisible.filter((a) => a.paid_at === null);
    const skipped = selectedVisible.length - targets.length;
    const verb = kind === "accept" ? "Accept" : "Mark paid";
    if (targets.length === 0) {
      toast.info(
        kind === "accept"
          ? "Every selected application is already accepted."
          : "Every selected application is already paid.",
      );
      return;
    }
    const ok = await confirm({
      title: `${verb}: ${targets.length} application${targets.length === 1 ? "" : "s"}?`,
      description: (
        <>
          {targets
            .slice(0, 8)
            .map((a) => a.nickname)
            .join(", ")}
          {targets.length > 8 && ` and ${targets.length - 8} more`}.
          {skipped > 0 &&
            ` ${skipped} selected row${skipped === 1 ? " is" : "s are"} already ${
              kind === "accept" ? "accepted" : "paid"
            } and will be left as is.`}
        </>
      ),
      confirmLabel: verb,
    });
    if (!ok) return;

    setBulkBusy(true);
    const body: ApplicationPatch = kind === "accept" ? { status: "accepted" } : { paid: true };
    let done = 0;
    const failed: Application[] = [];
    for (const app of targets) {
      try {
        replace(await sendPatch(app.id, body));
        done++;
      } catch {
        failed.push(app);
      }
    }
    setBulkBusy(false);
    if (failed.length === 0) {
      toast.success(`${verb}: ${done} updated`);
      setSelected(new Set());
    } else {
      toast.error(
        `${verb}: ${done} updated, ${failed.length} failed (${failed
          .map((a) => a.nickname)
          .join(", ")}). Failed rows stay selected.`,
      );
      setSelected(new Set(failed.map((a) => a.id)));
    }
  }

  /** Resends (email) or returns (copy) a fresh parent consent link. "" on an emailed success, null on failure. */
  const sendParentLink = useCallback(
    async (id: string, send: "email" | "copy"): Promise<string | null> => {
      try {
        const res = await fetch(`/api/admin/shift/applications/${id}/parent-link`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ send }),
        });
        const body = (await res.json()) as { url?: string; application?: Application; error?: string };
        if (!res.ok || !body.application) throw new Error(body.error);
        replace(body.application);
        return body.url ?? "";
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : "Failed to send parent link");
        return null;
      }
    },
    [replace],
  );

  const createJoinLink = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/admin/shift/applications/${id}/join-link`, { method: "POST" });
        const body = (await res.json()) as { url?: string; application?: Application; error?: string };
        if (!res.ok || !body.url || !body.application) throw new Error(body.error);
        replace(body.application);
        return body.url;
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : "Failed to create join link");
        return null;
      }
    },
    [replace],
  );

  const addToTracker = useCallback(
    async (app: Application) => {
      try {
        const res = await fetch("/api/admin/shift/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: app.full_name,
            ig_handle: app.ig_handle,
            discord_handle: app.discord_handle,
          }),
        });
        if (!res.ok) throw new Error();
        addTrackerHandle(app.ig_handle);
        toast.success(`Added ${app.nickname} to tracker`);
      } catch {
        toast.error("Failed to add to tracker");
      }
    },
    [addTrackerHandle],
  );

  return (
    <div className="space-y-5">
      {confirmDialog}
      <Tabs value={cohortName} onValueChange={setCohortName}>
        <TabsList>
          {SHIFT_COHORTS.map((c) => (
            <TabsTrigger key={c.name} value={c.name}>
              {c.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!error && (
        <div className="space-y-3 rounded-lg border p-4">
          <ShiftSeatBar stats={stats} total={applications.length} />
          <ShiftSourceChips sources={sources} />
        </div>
      )}

      {loading ? (
        <AdminLoading rows={6} rowClassName="h-12" label="Loading applications" />
      ) : error ? (
        <AdminErrorState
          title="Could not load applications"
          message={`The ${cohortName} applications did not load. This is not an empty list.`}
          onRetry={retry}
        />
      ) : applications.length === 0 ? (
        <AdminEmptyState title={`No applications for ${cohortName} yet`} />
      ) : (
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
                placeholder="Search name, nickname, IG, Discord, parent contact"
                aria-label="Search applications"
                className="h-9 pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="waitlist">Waitlist</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paidFilter} onValueChange={(v) => setPaidFilter(v as PaidFilter)}>
              <SelectTrigger className="h-9 w-[130px]" aria-label="Filter by payment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Paid or not</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 w-[150px]" aria-label="Sort applications">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Nickname A-Z</SelectItem>
                <SelectItem value="status">By status</SelectItem>
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" /> Clear
              </Button>
            )}
          </div>

          <div
            className="flex min-h-[40px] flex-wrap items-center justify-between gap-2 text-sm"
            aria-live="polite"
          >
            <span className="text-muted-foreground">
              Showing {visible.length} of {applications.length}
              {selectedVisible.length > 0 && (
                <span className="text-foreground"> · {selectedVisible.length} selected</span>
              )}
            </span>
            {selectedVisible.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void runBulk("accept")}>
                  {bulkBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="mr-2 h-4 w-4" />
                  )}
                  Accept selected
                </Button>
                <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => void runBulk("paid")}>
                  {bulkBusy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="mr-2 h-4 w-4" />
                  )}
                  Mark selected paid
                </Button>
                <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
                  Clear selection
                </Button>
              </div>
            )}
          </div>

          {visible.length === 0 ? (
            <AdminEmptyState
              title="No applications match these filters"
              action={
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 pr-0">
                  <Checkbox
                    checked={headerChecked}
                    onCheckedChange={(v) => toggleAllVisible(v === true)}
                    aria-label="Select all shown applications"
                  />
                </TableHead>
                <TableHead className="w-6" />
                <TableHead>Created</TableHead>
                <TableHead>Nickname</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((app) => (
                <ShiftApplicationRow
                  key={app.id}
                  application={app}
                  selected={selected.has(app.id)}
                  onSelectedChange={toggleOne}
                  inTracker={trackerHandles.has(normalizeHandle(app.ig_handle))}
                  onPatch={patch}
                  onAddToTracker={addToTracker}
                  onCreateJoinLink={createJoinLink}
                  onSendParentLink={sendParentLink}
                />
              ))}
            </TableBody>
          </Table>
        </div>
          )}
        </div>
      )}
    </div>
  );
}
