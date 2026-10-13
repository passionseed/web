"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { dashboardAction } from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { Button } from "@/components/ui/button";
import {
  EVIDENCE_TYPES,
  PHASE_LABEL,
  TYPE_LABEL,
  formatClose,
  formatIct,
  roundDay,
  roundPhase,
} from "@/lib/shift-round/admin/format";
import type { AdminDashboard, JobHealth } from "@/lib/shift-round/admin/types";

import { LoadError, Pill, Section, statusTone } from "./shared";
import { useAdminQuery } from "./useAdminData";
import { useRound } from "./useRound";

const fmt = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", { maximumFractionDigits: digits });

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-medium tabular-nums">{value}</dd>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function KeyCounts({ title, counts, labels }: { title: string; counts?: Record<string, number>; labels?: Record<string, string> }) {
  const entries = Object.entries(counts ?? {});
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {entries.map(([key, n]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{labels?.[key] ?? key}</dt>
              <dd className="text-right tabular-nums">{fmt(n)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function distribution(d: AdminDashboard["mission_distribution"]): number[] {
  if (Array.isArray(d)) return Array.from({ length: 7 }, (_, i) => d[i] ?? 0);
  return Array.from({ length: 7 }, (_, i) => d?.[String(i)] ?? 0);
}

/** Job health strip (A53): last success per job and recent failures. */
export function JobStrip({ jobs }: { jobs: JobHealth[] }) {
  if (jobs.length === 0) return <p className="text-sm text-muted-foreground">No job runs recorded yet.</p>;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Job health">
      {jobs.map((j) => {
        const status = j.last_run?.status ?? "none";
        return (
          <li key={j.job} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{j.job}</span>
              <Pill tone={statusTone(status)}>{status}</Pill>
            </div>
            <div className="text-xs text-muted-foreground">Last ok: {formatIct(j.last_ok_at)}</div>
            {!!j.failures_7d && <div className="text-xs text-red-300">{j.failures_7d} failures in 7 days</div>}
          </li>
        );
      })}
    </ul>
  );
}

export function RoundDashboard({ roundId }: { roundId: string }) {
  const round = useRound(roundId);
  const { data, error, loading, reload } = useAdminQuery(() => dashboardAction(roundId), [roundId]);

  const r = round.data;
  const phase = r ? r.phase ?? roundPhase(r) : null;

  const logsByDate = new Map<string, Record<string, number>>();
  for (const row of data?.logs_per_day ?? []) {
    const day = logsByDate.get(row.date) ?? {};
    day[row.type] = (day[row.type] ?? 0) + row.count;
    logsByDate.set(row.date, day);
  }
  const joinsByDate = new Map((data?.joins_per_day ?? []).map((d) => [d.date, d.count]));
  const dates = [...new Set([...logsByDate.keys(), ...joinsByDate.keys()])].sort();

  return (
    <div className="space-y-4">
      {r && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Pill tone={statusTone(r.status)}>{r.status}</Pill>
          {phase && <Pill tone={statusTone(phase)}>{PHASE_LABEL[phase]}</Pill>}
          {phase === "active" && (
            <span>
              Day {r.day ?? roundDay(r)} of {r.effective_days ?? r.duration_days + (r.extended_days ?? 0)}
            </span>
          )}
          <span>· Closes {formatClose(r.closes_at)}</span>
          <span>· Review ends {formatIct(r.review_ends_at)}</span>
        </div>
      )}

      {error ? (
        <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load the dashboard" />
      ) : loading && !data ? (
        <AdminLoading rows={3} rowClassName="h-20" label="Loading dashboard" />
      ) : !data ? null : (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Entrants" value={fmt(data.entrants_total)} />
            <Stat
              label="Pending review"
              value={
                data.pending_review ? (
                  <Link href={`/admin/shift/rounds/${roundId}/review`} className="hover:underline">
                    {fmt(data.pending_review)}
                  </Link>
                ) : (
                  fmt(data.pending_review)
                )
              }
              hint="Submitted and not yet reviewed"
            />
            <Stat
              label="Rejection rate"
              value={data.rejection_rate == null ? "—" : `${fmt(data.rejection_rate * 100, 1)}%`}
            />
            <Stat label="Active 4+ days" value={fmt(data.active4_entrants)} hint="Beta success metric" />
            <Stat label="Certificates issued" value={fmt(data.certificates?.issued)} />
            <Stat label="Certificates revoked" value={fmt(data.certificates?.revoked)} />
            <Stat label="Share visits" value={fmt(data.share_visits)} hint="Verify page visits with ref=share" />
            <Stat
              label="Review minutes per entrant"
              value={fmt(data.review_minutes_per_entrant, 1)}
              hint="Staff time, from review_ms"
            />
            <Stat label="Next-round joins" value={fmt(data.next_round_joins)} />
            <Stat label="Non-alumni with 4+ Missions" value={fmt(data.non_alumni_4plus)} />
          </dl>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Entrants">
              <div className="space-y-4">
                <KeyCounts
                  title="By track"
                  counts={data.entrants_by_track}
                  labels={{ high_school: "High school", university: "University" }}
                />
                <KeyCounts
                  title="By beta group"
                  counts={data.entrants_by_group}
                  labels={{ alumni: "Alumni", new: "New", unset: "Not set" }}
                />
              </div>
            </Section>
            <Section title="Missions completed">
              <table className="w-full text-sm">
                <caption className="sr-only">Entrants by number of Missions completed</caption>
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="font-normal">Missions</th>
                    <th className="text-right font-normal">Entrants</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution(data.mission_distribution).map((n, i) => (
                    <tr key={i}>
                      <td>{i} of 6</td>
                      <td className="text-right tabular-nums">{fmt(n)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
            <Section title="Job health">
              <JobStrip jobs={data.jobs ?? []} />
            </Section>
          </div>

          <Section title="Joins and logs per day (ICT)">
            {dates.length === 0 ? (
              <AdminEmptyState title="No activity yet" description="Joins and logs appear here once the round opens." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1 font-normal">Date</th>
                      <th className="py-1 text-right font-normal">Joins</th>
                      {EVIDENCE_TYPES.map((t) => (
                        <th key={t} className="py-1 text-right font-normal">
                          {TYPE_LABEL[t]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date) => (
                      <tr key={date} className="border-t">
                        <td className="py-1">{date}</td>
                        <td className="py-1 text-right tabular-nums">{fmt(joinsByDate.get(date) ?? 0)}</td>
                        {EVIDENCE_TYPES.map((t) => (
                          <td key={t} className="py-1 text-right tabular-nums">
                            {fmt(logsByDate.get(date)?.[t] ?? 0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
              Refresh
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
