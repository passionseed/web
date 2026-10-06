"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { useCompanionStaff } from "./useCompanionStaff";

type Props = Pick<
  ReturnType<typeof useCompanionStaff>,
  "cohorts" | "selected" | "busy" | "loading" | "setSelected" | "refresh" | "act"
> & { canCreate: boolean };

export function CompanionCohortPicker({
  cohorts, selected, busy, loading, setSelected, refresh, act, canCreate,
}: Props) {
  const [creating, setCreating] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await act({
      action: "create_cohort",
      name: String(form.get("name")),
      starts_on: String(form.get("starts_on")),
    });
    if (created) setCreating(false);
  }
  return (
        <section className="space-y-4" aria-label="Cohort selection">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2"><Label htmlFor="companion-cohort">Cohort</Label>
              <select id="companion-cohort" value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)} className="ei-select min-h-11 text-base">
                {!cohorts.length && <option value="">Create a cohort to get started</option>}
                {cohorts.map((c) => <option className="bg-[var(--dusk-space-900)]" key={c.id} value={c.id}>{c.name} · {c.starts_on}</option>)}
              </select>
            </div>
            <Button variant="secondary" className="min-h-11" disabled={busy || loading || !selected} onClick={() => void refresh()}>Refresh</Button>
            {canCreate && <Button variant="secondary" className="min-h-11" disabled={busy} onClick={() => setCreating(!creating)}>{creating ? "Cancel" : "New cohort"}</Button>}
          </div>
          {creating && <form onSubmit={(e) => void create(e)} className="space-y-4 border-b border-white/10 py-4">
            <div className="space-y-2"><Label htmlFor="companion-name">Cohort name</Label><Input id="companion-name" name="name" required maxLength={120} className="ei-input min-h-11 text-base" placeholder="SHIFT cohort 2" disabled={busy} /></div>
            <div className="space-y-2"><Label htmlFor="companion-start">Starts on</Label><Input id="companion-start" name="starts_on" type="date" required className="ei-input min-h-11 text-base [color-scheme:dark]" disabled={busy} /></div>
            <Button type="submit" disabled={busy} className="min-h-11">{busy ? "Creating…" : "Create cohort"}</Button>
          </form>}
        </section>
  );
}
