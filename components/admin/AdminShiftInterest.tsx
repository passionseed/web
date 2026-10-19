"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatThaiDateRange } from "@/lib/content/shift-cohort";
import { MIN_BUILDERS } from "@/lib/content/shift-next";
import { SHIFT_INTEREST_STAGES, type WindowDemand } from "@/lib/shift/interest";
import type { ShiftInterestRow } from "@/lib/shift/interestStore";

/**
 * Staff view of SHIFT pre-orders. The windows card answers "which week do we
 * open?"; the table holds contacts for the follow-up DMs.
 */

type Load =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; interest: ShiftInterestRow[]; windows: WindowDemand[] };

const stageLabel = (value: string) => SHIFT_INTEREST_STAGES.find((s) => s.value === value)?.label ?? value;

function WindowsCard({ windows }: { windows: WindowDemand[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Busiest 7-day windows (not overlapping)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {windows.length === 0 && <p className="text-sm text-muted-foreground">No sign-ups with a full 7-day window yet.</p>}
        {windows.map((w) => {
          const pct = Math.min(100, Math.round((w.count / MIN_BUILDERS) * 100));
          return (
            <div key={w.start}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{formatThaiDateRange(w.start, w.end)}</span>
                <span className={w.count >= MIN_BUILDERS ? "font-semibold text-emerald-600" : "text-muted-foreground"}>
                  {w.count}/{MIN_BUILDERS}
                  {w.count >= MIN_BUILDERS && " · ready to open"}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={w.count >= MIN_BUILDERS ? "h-full bg-emerald-500" : "h-full bg-primary"}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function AdminShiftInterest() {
  const [load, setLoad] = useState<Load>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/shift/interest")
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        if (!cancelled) setLoad({ state: "ready", interest: body.interest, windows: body.windows });
      })
      .catch((error: Error) => {
        if (!cancelled) setLoad({ state: "error", message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (load.state === "loading") return <p className="text-sm text-muted-foreground">Loading pre-orders…</p>;
  if (load.state === "error") {
    return <p className="text-sm text-destructive">Could not load pre-orders: {load.message}</p>;
  }

  return (
    <div className="space-y-4">
      <WindowsCard windows={load.windows} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{load.interest.length} sign-ups</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nickname</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Free</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {load.interest.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.nickname}</TableCell>
                  <TableCell>{stageLabel(row.stage)}</TableCell>
                  <TableCell className="text-sm">
                    <a
                      href={`https://instagram.com/${row.ig_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      @{row.ig_handle}
                    </a>
                    {row.email && <div className="text-muted-foreground">{row.email}</div>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {row.free_ranges.map((r) => (
                      <div key={r.start}>{formatThaiDateRange(r.start, r.end)}</div>
                    ))}
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">{row.problem ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.status}</Badge>
                    {row.submissions > 1 && (
                      <div className="mt-1 text-xs text-muted-foreground">edited {row.submissions - 1}×</div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
