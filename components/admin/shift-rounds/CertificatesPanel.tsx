"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import {
  listCertificatesAction,
  listEntriesAction,
  reinstateCertificateAction,
  revokeCertificateAction,
} from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { useConfirm } from "@/components/admin/shared/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatIct, missionsTotal } from "@/lib/shift-round/admin/format";
import type { AdminCertificate } from "@/lib/shift-round/admin/types";

import { ActionError, LoadError, NativeSelect, Pill, SearchBox, Section, statusTone } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";

type Filter = "all" | "issued" | "revoked";

export function CertificatesPanel({ roundId }: { roundId: string }) {
  const { data, error, loading, reload } = useAdminQuery(() => listCertificatesAction(roundId), [roundId]);
  const entrants = useAdminQuery(() => listEntriesAction(roundId), [roundId]);
  const { run, busy, message } = useAdminMutation();
  const { confirm, confirmDialog } = useConfirm();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteError, setNoteError] = useState<string | null>(null);
  const [outcomeSearch, setOutcomeSearch] = useState("");

  const certificates = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.certificates ?? [])
      .filter((c) => filter === "all" || c.status === filter)
      .filter((c) => !needle || [c.handle ?? "", c.public_id].some((v) => v.toLowerCase().includes(needle)));
  }, [data, search, filter]);
  const outcomes = useMemo(() => {
    const needle = outcomeSearch.trim().toLowerCase();
    return (entrants.data?.entries ?? [])
      .filter((o) => !needle || o.handle.toLowerCase().includes(needle) || o.outcome.includes(needle))
      .sort((a, b) => a.handle.localeCompare(b.handle, "th"));
  }, [entrants.data, outcomeSearch]);

  const noteFor = (c: AdminCertificate) => (notes[c.id] ?? "").trim();

  const revoke = async (c: AdminCertificate) => {
    if (!noteFor(c)) return setNoteError(`Add a reason before revoking ${c.handle ?? c.public_id}.`);
    setNoteError(null);
    const ok = await confirm({
      title: `Revoke certificate ${c.public_id}?`,
      description: "The verification page shows it as revoked straight away, and the student can no longer share it. Images already shared may take up to a few minutes to update. You can reinstate it later.",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
    const result = await run(() => revokeCertificateAction(c.id, noteFor(c)));
    if (result?.ok) {
      toast.success("Certificate revoked");
      await reload();
    }
  };

  const reinstate = async (c: AdminCertificate) => {
    if (!noteFor(c)) return setNoteError(`Add a note before reinstating ${c.handle ?? c.public_id}.`);
    setNoteError(null);
    const ok = await confirm({
      title: `Reinstate certificate ${c.public_id}?`,
      description: "It shows as valid again on the verification page.",
      confirmLabel: "Reinstate",
    });
    if (!ok) return;
    const result = await run(() => reinstateCertificateAction(c.id, noteFor(c)));
    if (result?.ok) {
      toast.success("Certificate reinstated");
      await reload();
    }
  };

  if (error) return <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load certificates" />;
  if (loading && !data) return <AdminLoading rows={4} rowClassName="h-12" label="Loading certificates" />;

  const run_ = data?.last_issue_run;

  return (
    <div className="space-y-4">
      {confirmDialog}
      <Section title="Issue job">
        {run_ ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Pill tone={statusTone(run_.status)}>{run_.status}</Pill>
            Last run {formatIct(run_.started_at)} · processed {run_.processed_count ?? 0} of {run_.due_count ?? 0} due
            {run_.error && <span className="text-red-300">· {run_.error}</span>}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No issue run yet. Certificates issue automatically after the review window ends.
          </p>
        )}
      </Section>

      <Section
        title="Certificates"
        aside={
          <div className="flex flex-wrap gap-2">
            <SearchBox value={search} onChange={setSearch} label="Search certificates" placeholder="Search handle or ID" />
            <NativeSelect aria-label="Status" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All</option>
              <option value="issued">Issued</option>
              <option value="revoked">Revoked</option>
            </NativeSelect>
          </div>
        }
      >
        <ActionError message={message ?? noteError} />
        {(data?.certificates ?? []).length === 0 ? (
          <AdminEmptyState title="No certificates yet" description="They appear after the issue job runs at the end of review." />
        ) : certificates.length === 0 ? (
          <AdminEmptyState title="No certificates match" />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holder</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Reason / note</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((c) => {
                  const tombstoned = Boolean(c.tombstone || c.tombstoned_at);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{tombstoned ? <span className="text-muted-foreground">Deleted by holder</span> : c.handle ?? "—"}</TableCell>
                      <TableCell>
                        <a href={c.verify_url ?? `/c/${c.public_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs hover:underline">
                          {c.public_id} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          <span className="sr-only">(opens the verification page)</span>
                        </a>
                      </TableCell>
                      <TableCell>
                        <Pill tone={statusTone(c.status)}>{tombstoned ? "tombstoned" : c.status}</Pill>
                        {c.revoked_at && <div className="text-xs text-muted-foreground">{formatIct(c.revoked_at)}</div>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatIct(c.issued_at)}</TableCell>
                      <TableCell className="min-w-48">
                        {tombstoned ? (
                          <span className="text-xs text-muted-foreground">Can&apos;t be reinstated</span>
                        ) : (
                          <>
                            {c.revoke_note && <p className="mb-1 text-xs text-muted-foreground">{c.revoke_note}</p>}
                            <Input
                              aria-label={`${c.status === "issued" ? "Revoke reason" : "Reinstate note"} for ${c.public_id}`}
                              placeholder={c.status === "issued" ? "Reason to revoke" : "Note to reinstate"}
                              maxLength={300}
                              value={notes[c.id] ?? ""}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                            />
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!tombstoned &&
                          (c.status === "issued" ? (
                            <Button size="sm" variant="destructive" disabled={busy} onClick={() => revoke(c)}>
                              Revoke
                            </Button>
                          ) : (
                            <Button size="sm" disabled={busy} onClick={() => reinstate(c)}>
                              Reinstate
                            </Button>
                          ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section
        title="Outcomes per entrant"
        aside={<SearchBox value={outcomeSearch} onChange={setOutcomeSearch} label="Search outcomes" />}
      >
        {Object.keys(data?.outcome_counts ?? {}).length > 0 && (
          <p className="flex flex-wrap gap-2 text-sm" aria-label="Outcome totals">
            {Object.entries(data?.outcome_counts ?? {}).map(([outcome, n]) => (
              <Pill key={outcome} tone={statusTone(outcome)}>
                {outcome.replace("_", " ")}: {n}
              </Pill>
            ))}
          </p>
        )}
        {entrants.error ? (
          <LoadError error={entrants.error} onRetry={entrants.reload} retrying={entrants.loading} title="Could not load entrants" />
        ) : entrants.loading && !entrants.data ? (
          <AdminLoading rows={2} rowClassName="h-8" label="Loading outcomes" />
        ) : (entrants.data?.entries ?? []).length === 0 ? (
          <AdminEmptyState title="No entrants yet" />
        ) : outcomes.length === 0 ? (
          <AdminEmptyState title="No entrants match" />
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {outcomes.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-md border px-3 py-1.5">
                <span>{o.handle}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">{o.missions_complete}/{missionsTotal(o.missions)}</span>
                  <Pill tone={statusTone(o.outcome)}>{o.outcome.replace("_", " ")}</Pill>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
