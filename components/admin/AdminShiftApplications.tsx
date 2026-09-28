"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  ShiftApplicationRow,
  type ApplicationPatch,
} from "@/components/admin/ShiftApplicationRow";
import { ShiftSeatBar, ShiftSourceChips } from "@/components/admin/ShiftApplicationsSummary";
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
import type { ShiftApplicationRow as Application, ShiftStudentsResponse } from "@/types/shift";

const normalizeHandle = (handle: string | null | undefined) =>
  (handle ?? "").trim().replace(/^@/, "").toLowerCase();

/** Applications for one cohort, fetched whenever the cohort tab changes. */
function useCohortApplications(cohortName: string) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/shift/applications?cohort=${encodeURIComponent(cohortName)}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ applications: Application[] }>;
      })
      .then((body) => {
        if (!cancelled) setApplications(body.applications);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load applications");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cohortName]);

  const replace = useCallback((updated: Application) => {
    setApplications((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  return { applications, loading, replace };
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
  const { applications, loading, replace } = useCohortApplications(cohortName);
  const { handles: trackerHandles, add: addTrackerHandle } = useTrackerHandles();

  const stats = useMemo(() => seatStats(applications, cohort.seats), [applications, cohort.seats]);
  const sources = useMemo(() => sourceBreakdown(applications), [applications]);

  const patch = useCallback(
    async (id: string, body: ApplicationPatch): Promise<boolean> => {
      try {
        const res = await fetch(`/api/admin/shift/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const { application } = (await res.json()) as { application: Application };
        replace(application);
        return true;
      } catch {
        toast.error("Failed to update application");
        return false;
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
      <Tabs value={cohortName} onValueChange={setCohortName}>
        <TabsList>
          {SHIFT_COHORTS.map((c) => (
            <TabsTrigger key={c.name} value={c.name}>
              {c.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3 rounded-lg border p-4">
        <ShiftSeatBar stats={stats} total={applications.length} />
        <ShiftSourceChips sources={sources} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No applications for {cohortName} yet.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
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
              {applications.map((app) => (
                <ShiftApplicationRow
                  key={app.id}
                  application={app}
                  inTracker={trackerHandles.has(normalizeHandle(app.ig_handle))}
                  onPatch={patch}
                  onAddToTracker={addToTracker}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
