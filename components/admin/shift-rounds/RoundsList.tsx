"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Settings2, X } from "lucide-react";
import { toast } from "sonner";

import { createRoundAction, listRoundsAction } from "@/app/admin/shift/rounds/actions";
import { AdminEmptyState, AdminLoading } from "@/components/admin/shared/AdminStates";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_POLICY,
  PHASE_LABEL,
  formatClose,
  formatIct,
  roundPhase,
  validatePolicy,
} from "@/lib/shift-round/admin/format";
import type { AdminRoundListItem, RoundPolicy } from "@/lib/shift-round/admin/types";

import { PolicyFields, draftToPolicy, type PolicyDraft } from "./PolicyFields";
import { ActionError, LoadError, Pill, SearchBox, Section, statusTone } from "./shared";
import { useAdminMutation, useAdminQuery } from "./useAdminData";

function nextMonday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function NewRoundForm({
  nextNumber,
  onCancel,
  onCreated,
}: {
  nextNumber: number;
  onCancel: () => void;
  onCreated: (roundId: string) => void;
}) {
  const [draft, setDraft] = useState<PolicyDraft>({
    ...DEFAULT_POLICY,
    number: nextNumber,
    starts_on: nextMonday(),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RoundPolicy | "starts_on", string>>>({});
  const { run, busy, message } = useAdminMutation();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = validatePolicy({ ...draft });
    if (!draft.starts_on) nextErrors.starts_on = "Pick day 1";
    if (!draft.title_th.trim()) nextErrors.title_th = "Required";
    if (!draft.title_en.trim()) nextErrors.title_en = "Required";
    if (!draft.brief_th.trim()) nextErrors.brief_th = "Required";
    if (!draft.brief_en.trim()) nextErrors.brief_en = "Required";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const result = await run(() => createRoundAction(draftToPolicy(draft)));
    if (result?.ok) {
      toast.success(`Round ${draft.number} created as a draft`);
      onCreated(result.data.round_id);
    } else if (result && !result.ok && result.error.field) {
      setErrors({ [result.error.field]: "Rejected by the server" });
    }
  };

  return (
    <Section
      title="New round"
      aside={
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="mr-1 h-4 w-4" aria-hidden="true" /> Cancel
        </Button>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <PolicyFields idPrefix="new-round" value={draft} onChange={setDraft} errors={errors} />
        <ActionError message={message} />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create draft round"}
          </Button>
          <p className="text-xs text-muted-foreground">
            New rounds start as drafts. Publish from the round&apos;s Settings once the allowlist and squads are ready.
          </p>
        </div>
      </form>
    </Section>
  );
}

export function RoundsList() {
  const router = useRouter();
  const { data, error, loading, reload } = useAdminQuery(() => listRoundsAction(), []);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const rounds = useMemo(() => [...(data ?? [])].sort((a, b) => b.number - a.number), [data]);
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rounds;
    return rounds.filter((r) =>
      [String(r.number), r.title_th, r.title_en, r.status, r.phase ?? ""].some((v) =>
        v.toLowerCase().includes(needle),
      ),
    );
  }, [rounds, search]);
  const nextNumber = rounds.reduce((max, r) => Math.max(max, r.number), 0) + 1;

  const phaseOf = (r: AdminRoundListItem) => r.phase ?? roundPhase(r);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SearchBox value={search} onChange={setSearch} label="Search rounds" placeholder="Search by number or title" />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/shift/rounds/ops">
              <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" /> Flags and jobs
            </Link>
          </Button>
          {!creating && (
            <Button onClick={() => setCreating(true)} disabled={loading && !data}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> New round
            </Button>
          )}
        </div>
      </div>

      {creating && (
        <NewRoundForm
          nextNumber={nextNumber}
          onCancel={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            router.push(`/admin/shift/rounds/${id}/settings`);
          }}
        />
      )}

      {error ? (
        <LoadError error={error} onRetry={reload} retrying={loading} title="Could not load rounds" />
      ) : loading && !data ? (
        <AdminLoading rows={4} label="Loading rounds" />
      ) : rounds.length === 0 ? (
        <AdminEmptyState
          title="No SHIFT rounds yet"
          description="Create the first round. Beta rounds default to 14 days, invite only, high school track."
          action={!creating && <Button onClick={() => setCreating(true)}>New round</Button>}
        />
      ) : filtered.length === 0 ? (
        <AdminEmptyState title="No rounds match your search" description={`Nothing matches “${search}”.`} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Phase</TableHead>
                <TableHead>Day 1</TableHead>
                <TableHead>Closes</TableHead>
                <TableHead className="text-right">Entrants</TableHead>
                <TableHead className="text-right">Pending review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium tabular-nums">{r.number}</TableCell>
                  <TableCell>
                    <Link href={`/admin/shift/rounds/${r.id}`} className="font-medium hover:underline">
                      {r.title_en}
                    </Link>
                    <div className="text-xs text-muted-foreground" lang="th">
                      {r.title_th}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Pill tone={statusTone(r.status)}>{r.status}</Pill>
                      {r.status !== "draft" && <Pill tone={statusTone(phaseOf(r))}>{PHASE_LABEL[phaseOf(r)]}</Pill>}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatIct(r.starts_at, false)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatClose(r.closes_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.entrants ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.pending_review ? (
                      <Link href={`/admin/shift/rounds/${r.id}/review`} className="hover:underline">
                        {r.pending_review}
                      </Link>
                    ) : (
                      r.pending_review ?? "—"
                    )}
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
