"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanionCohortPicker } from "./CompanionCohortPicker";
import { InViewAnimator } from "@/components/ui/in-view-animator";
import type { CompanionCohorts } from "@/lib/shift/companion-contract";
import { useCompanionStaff } from "./useCompanionStaff";
import { CompanionInviteDialog } from "./CompanionInviteDialog";
import { CompanionRoster } from "./CompanionRoster";
import { CompanionUpdates } from "./CompanionUpdates";

export function ShiftCompanionStaff({ initial }: { initial: CompanionCohorts }) {
  const s = useCompanionStaff(initial);
  return (
    <main className="dusk-theme dark min-h-screen bg-[var(--dusk-space-950)] px-5 py-8 font-bai-jamjuree text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm text-amber-200">Staff workspace</p><h1 className="mt-2 text-3xl font-semibold">SHIFT Companion</h1></div>
          {initial.is_admin && <Link href="/admin/shift/camp" className="inline-flex min-h-11 items-center text-sm text-slate-300 underline underline-offset-4">Camp management</Link>}
        </header>
        <CompanionCohortPicker
          cohorts={s.cohorts}
          selected={s.selected}
          busy={s.busy}
          loading={s.loading}
          setSelected={s.setSelected}
          refresh={s.refresh}
          act={s.act}
          canCreate={initial.is_admin}
        />
        <Tabs value={s.view} onValueChange={(value) => s.setView(value as "roster" | "updates")}>
          <TabsList aria-label="Companion views" className="h-auto w-full border-b border-white/10 bg-transparent p-0">
            <TabsTrigger value="roster" disabled={s.busy} className="min-h-12 flex-1 whitespace-normal">
              Invites & participants
            </TabsTrigger>
            <TabsTrigger value="updates" disabled={s.busy} className="min-h-12 flex-1 whitespace-normal">
              Today’s updates
            </TabsTrigger>
          </TabsList>
        {s.error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-red-200">{s.error}</p>}
        <TabsContent value={s.view} aria-busy={s.loading} className="space-y-6 pt-6">
          {s.view === "roster" && s.selected && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <InViewAnimator selector="#companion-issue-code" />
            <p className="max-w-sm text-sm text-slate-300">Issue one code per person. Each code can connect one account and expires in 30 days.</p>
            <button id="companion-issue-code" type="button" className="ei-button-dusk min-h-11 shrink-0 disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200" disabled={s.busy || s.loading || !!s.invite} onClick={() => void s.act({ action: "issue_code", cohort_id: s.selected })}><span>{s.busy ? "Issuing…" : "Issue one code"}</span></button>
          </div>}
          {s.loading ? <p role="status" className="py-8 text-slate-300">Loading {s.view === "roster" ? "participants" : "updates"}…</p>
            : s.selected && !s.error && (s.view === "roster"
              ? <CompanionRoster roster={s.roster} busy={s.busy} reissue={(id) => void s.act({ action: "reissue_code", roster_id: id })} />
              : s.today && <CompanionUpdates today={s.today} />)}
        </TabsContent>
        </Tabs>
        {s.invite && s.view === "roster" && <CompanionInviteDialog key={s.invite.code} invite={s.invite} cohortName={s.cohorts.find((c) => c.id === s.selected)?.name ?? "SHIFT"} onClose={() => s.setInvite(null)} />}
      </div>
    </main>
  );
}
