"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { listEntriesAction, updateEntryAction } from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIct, missionsTotal } from "@/lib/shift-round/admin/format";
import type { AdminEntry, BetaGroup, EntryOutcome, Track } from "@/lib/shift-round/admin/types";

import { ActionError, LoadError, NativeSelect, Pill, SearchBox, statusTone } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";

type OutcomeFilter = "all" | EntryOutcome;

export function EntrantsTable({ roundId }: { roundId: string }) {
  const { data, setData, error, loading, reload } = useAdminQuery(() => listEntriesAction(roundId), [roundId]);
  const { run, busy, message } = useAdminMutation();
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [squad, setSquad] = useState("all");

  const entries = useMemo(() => data?.entries ?? [], [data]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries
      .filter((e) => outcome === "all" || e.outcome === outcome)
      .filter((e) => squad === "all" || (squad === "none" ? !e.squad_id : e.squad_id === squad))
      .filter(
        (e) =>
          !needle ||
          [e.handle, e.email ?? "", e.squad_name ?? ""].some((v) => v.toLowerCase().includes(needle)),
      )
      .sort((a, b) => a.handle.localeCompare(b.handle, "th"));
  }, [entries, search, outcome, squad]);

  const patchEntry = async (entry: AdminEntry, patch: { track?: Track; beta_group?: BetaGroup | null }) => {
    const result = await run(() => updateEntryAction(entry.id, patch));
    if (result?.ok) {
      setData((prev) =>
        prev ? { ...prev, entries: prev.entries.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)) } : prev,
      );
      toast.success(`Updated ${entry.handle}`);
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load entrants" />;
  if (loading && !data) return <AdminLoading rows={6} rowClassName="h-12" label="Loading entrants" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} label="Search entrants" placeholder="Search handle, email or squad" />
        <NativeSelect aria-label="Filter by outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as OutcomeFilter)}>
          <option value="all">All outcomes</option>
          <option value="in_progress">In progress</option>
          <option value="certified">Certified</option>
          <option value="not_eligible">Not eligible</option>
        </NativeSelect>
        <NativeSelect aria-label="Filter by squad" value={squad} onChange={(e) => setSquad(e.target.value)}>
          <option value="all">All squads</option>
          <option value="none">No squad</option>
          {(data?.squads ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {entries.length}
        </span>
      </div>
      <ActionError message={message} />

      {entries.length === 0 ? (
        <AdminEmptyState title="No entrants yet" description="Students appear here after they join the round in the app." />
      ) : filtered.length === 0 ? (
        <AdminEmptyState title="No entrants match these filters" />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Handle</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Squad</TableHead>
                <TableHead className="text-right">Missions</TableHead>
                <TableHead>Last log</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link href={`/admin/shift/rounds/${roundId}/entrants/${e.id}`} className="font-medium hover:underline">
                      {e.handle}
                    </Link>
                    {e.email && <div className="text-xs text-muted-foreground">{e.email}</div>}
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={`Track for ${e.handle}`}
                      value={e.track}
                      disabled={busy || e.has_certificate}
                      title={e.has_certificate ? "Track is locked after the certificate is issued" : undefined}
                      onChange={(ev) => patchEntry(e, { track: ev.target.value as Track })}
                    >
                      <option value="high_school">High school</option>
                      <option value="university">University</option>
                    </NativeSelect>
                  </TableCell>
                  <TableCell>
                    <NativeSelect
                      aria-label={`Beta group for ${e.handle}`}
                      value={e.beta_group ?? ""}
                      disabled={busy}
                      onChange={(ev) => patchEntry(e, { beta_group: (ev.target.value || null) as BetaGroup | null })}
                    >
                      <option value="">Not set</option>
                      <option value="alumni">Alumni</option>
                      <option value="new">New</option>
                    </NativeSelect>
                  </TableCell>
                  <TableCell className="text-sm">{e.squad_name ?? <span className="text-muted-foreground">None</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {e.missions_complete}/{missionsTotal(e.missions)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatIct(e.last_log_at)}</TableCell>
                  <TableCell>
                    <Pill tone={statusTone(e.outcome)}>{e.outcome.replace("_", " ")}</Pill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
