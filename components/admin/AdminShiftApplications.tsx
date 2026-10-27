"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, CheckCheck, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { refreshAdminCounts } from "@/components/admin/console/live-counts";
import { useShallowUrl } from "@/components/admin/queue-tools/useShallowUrl";
import { usePendingQuery } from "@/components/admin/shared/usePendingQuery";
import { useUrlSearchDraft } from "@/components/admin/shared/useUrlSearchDraft";
import {
  applicationRowId,
  ShiftApplicationRow,
  type ApplicationPatch,
} from "@/components/admin/ShiftApplicationRow";
import {
  ShiftSeatBar,
  ShiftSeatBarSkeleton,
  ShiftSourceChips,
} from "@/components/admin/ShiftApplicationsSummary";
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
import {
  BULK_APPLICATION_LIMIT,
  bulkTargets,
  hasActiveFilters,
  parseShiftApplicationsView,
  shiftApplicationsQuery,
  visibleApplications,
  type AdminShiftApplication as Application,
  type ApplicationPaidFilter,
  type ApplicationSort,
  type ApplicationStatusFilter,
  type BulkApplicationAction,
  type ShiftApplicationsView,
} from "@/lib/admin/queue-tools/shift-applications";
import { SHIFT_COHORTS } from "@/lib/content/shift-cohort";
import { seatStats, sourceBreakdown } from "@/lib/shift/applicationStats";
import type { ShiftStudentsResponse } from "@/types/shift";

const COHORT_NAMES = SHIFT_COHORTS.map((c) => c.name);
const SEARCH_DEBOUNCE_MS = 250;
/** Touch targets stay 44px below the desktop breakpoint. */
const CONTROL_HEIGHT = "h-11 lg:[@media(pointer:fine)]:h-9";

const normalizeHandle = (handle: string | null | undefined) =>
  (handle ?? "").trim().replace(/^@/, "").toLowerCase();

const BULK_COPY: Record<BulkApplicationAction, { verb: string; done: string; already: string }> = {
  accept: { verb: "Accept", done: "Accepted", already: "accepted" },
  paid: { verb: "Mark paid", done: "Marked paid", already: "paid" },
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ---------------------------------------------------------------------------
// Data hooks
// ---------------------------------------------------------------------------

/** Applications for one cohort, fetched whenever the cohort tab changes. */
function useCohortApplications(cohortName: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  /** A silent reload keeps the current rows on screen while it fetches. */
  const silent = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const isSilent = silent.current;
    silent.current = false;
    if (!isSilent) {
      setLoading(true);
      setError(false);
    }
    fetch(`/api/admin/shift/applications?cohort=${encodeURIComponent(cohortName)}`, {
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ applications: Application[] }>;
      })
      .then((body) => {
        if (cancelled) return;
        setApplications(body.applications);
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (isSilent) {
          toast.error("Could not refresh the list. It may be out of date.");
        } else {
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

  const replaceMany = useCallback((updated: Application[]) => {
    if (updated.length === 0) return;
    const byId = new Map(updated.map((row) => [row.id, row]));
    setApplications((rows) => rows.map((r) => byId.get(r.id) ?? r));
  }, []);

  const reload = useCallback((quiet = false) => {
    silent.current = quiet;
    setAttempt((n) => n + 1);
  }, []);

  return { applications, loading, error, reload, replaceMany };
}

/**
 * Where a deep-linked application (?id=) lives. When it is not in the loaded
 * cohort it is looked up by id, so a link without ?cohort= still lands on it.
 * `elsewhere` is undefined while unknown and null when no such application exists.
 */
function useLinkedApplication(id: string | null, applications: Application[], ready: boolean) {
  const [lookup, setLookup] = useState<{ id: string; app: Application | null } | null>(null);
  const inList = id ? (applications.find((a) => a.id === id) ?? null) : null;
  const lookedUp = lookup !== null && lookup.id === id;

  useEffect(() => {
    if (!id || !ready || inList || lookedUp) return;
    let cancelled = false;
    fetch(`/api/admin/shift/applications?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ applications: Application[] }>) : null))
      .then((body) => {
        if (!cancelled) setLookup({ id, app: body?.applications[0] ?? null });
      })
      .catch(() => {
        if (!cancelled) setLookup({ id, app: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id, ready, inList, lookedUp]);

  return { inList, elsewhere: lookedUp ? lookup.app : undefined };
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

async function sendPatch(id: string, body: ApplicationPatch): Promise<Application> {
  const res = await fetch(`/api/admin/shift/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error();
  const { application } = (await res.json()) as { application: Application };
  return application;
}

/** One request per BULK_APPLICATION_LIMIT ids; returns the rows that changed. */
async function sendBulk(ids: string[], action: BulkApplicationAction): Promise<Application[]> {
  const changed: Application[] = [];
  for (let i = 0; i < ids.length; i += BULK_APPLICATION_LIMIT) {
    const res = await fetch("/api/admin/shift/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ids.slice(i, i + BULK_APPLICATION_LIMIT), action }),
    });
    if (!res.ok) throw new Error();
    const body = (await res.json()) as { applications: Application[] };
    changed.push(...body.applications);
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AdminShiftApplications({ defaultCohort }: { defaultCohort: string }) {
  const { searchParams, write } = useShallowUrl();
  const view = useMemo(
    () => parseShiftApplicationsView(searchParams, { defaultCohort, cohorts: COHORT_NAMES }),
    [searchParams, defaultCohort],
  );
  // History writes land in a transition: build on the latest write, so a
  // filter clicked right after the search commits keeps that search.
  const mergeView = usePendingQuery(view, searchParams.toString());
  const setView = useCallback(
    (patch: Partial<ShiftApplicationsView>) =>
      write(shiftApplicationsQuery(mergeView(patch), defaultCohort)),
    [mergeView, write, defaultCohort],
  );

  const cohort = SHIFT_COHORTS.find((c) => c.name === view.cohort) ?? SHIFT_COHORTS[0];
  const { applications, loading, error, reload, replaceMany } = useCohortApplications(view.cohort);
  const { handles: trackerHandles, add: addTrackerHandle } = useTrackerHandles();
  const linked = useLinkedApplication(view.id, applications, !loading && !error);
  const { confirm, confirmDialog } = useConfirm();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Typing filters at once; the URL catches up after a pause. A letter typed
  // while the last write is still landing is kept.
  const [draft, setDraft] = useUrlSearchDraft(view.q, (q) => setView({ q }), {
    delayMs: SEARCH_DEBOUNCE_MS,
  });

  // Selection belongs to one cohort's list.
  useEffect(() => setSelected(new Set()), [view.cohort]);

  // A deep link to an application in another cohort switches to that cohort.
  const linkedElsewhere = linked.elsewhere;
  useEffect(() => {
    if (!linkedElsewhere || linkedElsewhere.cohort === view.cohort) return;
    if (COHORT_NAMES.includes(linkedElsewhere.cohort)) setView({ cohort: linkedElsewhere.cohort });
  }, [linkedElsewhere, view.cohort, setView]);

  const stats = useMemo(() => seatStats(applications, cohort.seats), [applications, cohort.seats]);
  const sources = useMemo(() => sourceBreakdown(applications), [applications]);

  const visible = useMemo(
    () => visibleApplications(applications, { ...view, q: draft }),
    [applications, view, draft],
  );
  const filtersActive = hasActiveFilters({ ...view, q: draft.trim() });
  const clearFilters = () => {
    setDraft("");
    setView({ status: "all", paid: "all", q: "" });
  };

  // Scroll to a deep-linked row once it is on screen.
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    const id = view.id;
    if (!id || scrolledTo.current === id || !visible.some((a) => a.id === id)) return;
    scrolledTo.current = id;
    window.requestAnimationFrame(() =>
      document.getElementById(applicationRowId(id))?.scrollIntoView({ block: "center" }),
    );
  }, [view.id, visible]);

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

  const patch = useCallback(
    async (id: string, body: ApplicationPatch): Promise<boolean> => {
      try {
        replaceMany([await sendPatch(id, body)]);
        if (body.status !== undefined || body.paid !== undefined) refreshAdminCounts();
        return true;
      } catch {
        toast.error("Could not update the application. Try again.");
        return false;
      }
    },
    [replaceMany],
  );

  async function runBulk(action: BulkApplicationAction) {
    const copy = BULK_COPY[action];
    const targets = bulkTargets(selectedVisible, action);
    const skipped = selectedVisible.length - targets.length;
    if (targets.length === 0) {
      toast.info(`Every selected application is already ${copy.already}.`);
      return;
    }
    const ok = await confirm({
      title: `${copy.verb}: ${plural(targets.length, "application")}?`,
      description: (
        <>
          {targets
            .slice(0, 8)
            .map((a) => a.nickname)
            .join(", ")}
          {targets.length > 8 && ` and ${targets.length - 8} more`}.
          {skipped > 0 &&
            ` ${skipped} selected row${skipped === 1 ? " is" : "s are"} already ${copy.already} and will be left as is.`}
        </>
      ),
      confirmLabel: copy.verb,
    });
    if (!ok) return;

    setBulkBusy(true);
    try {
      const changed = await sendBulk(
        targets.map((a) => a.id),
        action,
      );
      replaceMany(changed);
      if (changed.length > 0) refreshAdminCounts();

      const changedIds = new Set(changed.map((a) => a.id));
      const untouched = targets.filter((a) => !changedIds.has(a.id));
      if (untouched.length === 0) {
        toast.success(`${copy.done}: ${plural(changed.length, "application")}.`);
        setSelected(new Set());
      } else {
        toast.warning(
          `${copy.done}: ${changed.length}. ${untouched.length} changed somewhere else first (${untouched
            .map((a) => a.nickname)
            .join(", ")}) and stay selected.`,
        );
        setSelected(new Set(untouched.map((a) => a.id)));
        reload(true);
      }
    } catch {
      toast.error(`${copy.verb} did not finish. The list is reloading to show what was saved.`);
      reload(true);
    } finally {
      setBulkBusy(false);
    }
  }

  const createJoinLink = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/admin/shift/applications/${id}/join-link`, { method: "POST" });
        const body = (await res.json()) as { url?: string; application?: Application; error?: string };
        if (!res.ok || !body.url || !body.application) throw new Error(body.error);
        replaceMany([body.application]);
        return body.url;
      } catch (error) {
        toast.error(error instanceof Error && error.message ? error.message : "Could not create the join link");
        return null;
      }
    },
    [replaceMany],
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
        toast.success(`Added ${app.nickname} to the tracker`);
      } catch {
        toast.error("Could not add to the tracker");
      }
    },
    [addTrackerHandle],
  );

  const linkedHidden = linked.inList !== null && !visible.some((a) => a.id === linked.inList?.id);

  return (
    <div className="space-y-5">
      {confirmDialog}
      <Tabs value={view.cohort} onValueChange={(cohortName) => setView({ cohort: cohortName, id: null })}>
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
          {loading ? (
            <ShiftSeatBarSkeleton />
          ) : (
            <>
              <ShiftSeatBar stats={stats} total={applications.length} />
              <ShiftSourceChips sources={sources} />
            </>
          )}
        </div>
      )}

      {view.id && !loading && !error && (
        <LinkedApplicationNotice
          cohortName={view.cohort}
          hidden={linkedHidden}
          missing={!linked.inList && linked.elsewhere === null}
          otherCohort={
            linked.elsewhere && !COHORT_NAMES.includes(linked.elsewhere.cohort)
              ? linked.elsewhere.cohort
              : null
          }
          onShow={clearFilters}
          onDismiss={() => setView({ id: null })}
        />
      )}

      {loading ? (
        <AdminLoading rows={6} rowClassName="h-12" label="Loading applications" />
      ) : error ? (
        <AdminErrorState
          title="Could not load applications"
          message={`The ${view.cohort} applications did not load. This is not an empty list.`}
          onRetry={() => reload()}
        />
      ) : applications.length === 0 ? (
        <AdminEmptyState title={`No applications for ${view.cohort} yet`} />
      ) : (
        <div className="space-y-3">
          <ApplicationsToolbar
            draft={draft}
            onDraftChange={setDraft}
            status={view.status}
            paid={view.paid}
            sort={view.sort}
            onChange={setView}
            filtersActive={filtersActive}
            onClear={clearFilters}
          />

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
              <BulkActions
                busy={bulkBusy}
                onRun={(action) => void runBulk(action)}
                onClear={() => setSelected(new Set())}
              />
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
                      highlighted={app.id === view.id}
                      selected={selected.has(app.id)}
                      onSelectedChange={toggleOne}
                      inTracker={trackerHandles.has(normalizeHandle(app.ig_handle))}
                      onPatch={patch}
                      onAddToTracker={addToTracker}
                      onCreateJoinLink={createJoinLink}
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

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function ApplicationsToolbar({
  draft,
  onDraftChange,
  status,
  paid,
  sort,
  onChange,
  filtersActive,
  onClear,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  status: ApplicationStatusFilter;
  paid: ApplicationPaidFilter;
  sort: ApplicationSort;
  onChange: (patch: Partial<ShiftApplicationsView>) => void;
  filtersActive: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder="Search name, nickname, IG, Discord, parent contact"
          aria-label="Search applications"
          className={`${CONTROL_HEIGHT} pl-8`}
        />
      </div>
      <Select value={status} onValueChange={(v) => onChange({ status: v as ApplicationStatusFilter })}>
        <SelectTrigger className={`${CONTROL_HEIGHT} w-[140px]`} aria-label="Filter by status">
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
      <Select value={paid} onValueChange={(v) => onChange({ paid: v as ApplicationPaidFilter })}>
        <SelectTrigger className={`${CONTROL_HEIGHT} w-[130px]`} aria-label="Filter by payment">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Paid or not</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="unpaid">Unpaid</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => onChange({ sort: v as ApplicationSort })}>
        <SelectTrigger className={`${CONTROL_HEIGHT} w-[150px]`} aria-label="Sort applications">
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
        <Button size="sm" variant="ghost" className={CONTROL_HEIGHT} onClick={onClear}>
          <X className="mr-1 h-4 w-4" aria-hidden="true" /> Clear
        </Button>
      )}
    </div>
  );
}

function BulkActions({
  busy,
  onRun,
  onClear,
}: {
  busy: boolean;
  onRun: (action: BulkApplicationAction) => void;
  onClear: () => void;
}) {
  const Spinner = <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" className={CONTROL_HEIGHT} disabled={busy} onClick={() => onRun("accept")}>
        {busy ? Spinner : <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
        Accept selected
      </Button>
      <Button size="sm" variant="outline" className={CONTROL_HEIGHT} disabled={busy} onClick={() => onRun("paid")}>
        {busy ? Spinner : <BadgeCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
        Mark selected paid
      </Button>
      <Button size="sm" variant="ghost" className={CONTROL_HEIGHT} disabled={busy} onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}

/** Explains why a deep-linked application is not highlighted on screen. */
function LinkedApplicationNotice({
  cohortName,
  hidden,
  missing,
  otherCohort,
  onShow,
  onDismiss,
}: {
  cohortName: string;
  hidden: boolean;
  missing: boolean;
  otherCohort: string | null;
  onShow: () => void;
  onDismiss: () => void;
}) {
  let message: string | null = null;
  if (hidden) message = "The linked application is hidden by the current filters.";
  else if (otherCohort) message = `The linked application is in ${otherCohort}, which has no tab here.`;
  else if (missing) message = `The linked application is not in ${cohortName} and could not be found.`;
  if (!message) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm"
    >
      <span>{message}</span>
      <div className="flex gap-2">
        {hidden && (
          <Button size="sm" variant="outline" className={CONTROL_HEIGHT} onClick={onShow}>
            Show it
          </Button>
        )}
        <Button size="sm" variant="ghost" className={CONTROL_HEIGHT} onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
