"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { ShiftViewStats } from "@/lib/shift/viewStats";
import { SHIFT_COHORTS, cohortPath } from "@/lib/content/shift-cohort";

export function ShiftViewsSummary() {
  const [stats, setStats] = useState<ShiftViewStats | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [pagePath, setPagePath] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setStats(null);
    const url = pagePath ? `/api/admin/shift/views?page=${encodeURIComponent(pagePath)}` : "/api/admin/shift/views";
    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Views unavailable");
        return response.json() as Promise<ShiftViewStats>;
      })
      .then((body) => {
        if (!controller.signal.aborted) setStats(body);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [attempt, pagePath]);

  return (
    <section className="space-y-3 rounded-lg border p-4" aria-label="SHIFT page views">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Page views by source</h3>
        <span className="text-xs text-muted-foreground">{pagePath ? `${pagePath}, all time` : "All cohorts, all time"}</span>
      </div>
      <label className="flex flex-wrap items-center gap-2 text-sm">
        Page
        <select
          className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
          value={pagePath}
          onChange={(event) => setPagePath(event.target.value)}
        >
          <option value="">All SHIFT pages</option>
          <option value="/shift">/shift</option>
          {SHIFT_COHORTS.map((cohort) => (
            <option key={cohort.round} value={cohortPath(cohort)}>{cohortPath(cohort)}</option>
          ))}
          <option value="/shift/apply">/shift/apply</option>
        </select>
      </label>
      {error ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm text-muted-foreground">Failed to load page views.</p>
          <Button variant="outline" className="min-h-11" onClick={() => setAttempt((value) => value + 1)}>
            Retry
          </Button>
        </div>
      ) : stats === null ? (
        <p role="status" className="text-sm text-muted-foreground">Loading page views…</p>
      ) : (
        <>
          <p className="text-sm">
            <span className="text-2xl font-semibold">{stats.totalViews.toLocaleString()}</span>
            <span className="text-muted-foreground"> total views</span>
          </p>
          {stats.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No page views recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.sources.map(({ source, count }) => (
                  <TableRow key={source}>
                    <TableCell className="break-all">{source}</TableCell>
                    <TableCell className="text-right tabular-nums">{count.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">
            {pagePath ? `Views for ${pagePath}.` : "Includes SHIFT landing, cohort, and application pages."} Repeat visits count as additional views.
          </p>
        </>
      )}
    </section>
  );
}
