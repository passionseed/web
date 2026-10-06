import { Button } from "@/components/ui/button";
import type { CompanionRosterEntry } from "@/lib/shift/companion-contract";

export function bangkokTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
}

export function CompanionRoster({ roster, busy, reissue }: {
  roster: CompanionRosterEntry[]; busy: boolean; reissue: (id: string) => void;
}) {
  const claimed = roster.filter((r) => r.claimed).length;
  return (
    <section aria-labelledby="roster-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4">
        <h2 id="roster-heading" className="text-xl font-semibold">Participants</h2>
        <p className="text-sm text-slate-300">{claimed} connected · {roster.length - claimed} awaiting claim</p>
      </div>
      {roster.length === 0 && <p className="py-8 text-slate-300">No invites yet. Issue a code for your first participant.</p>}
      <ul className="divide-y divide-white/10">
        {roster.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="break-all font-medium">{r.email ?? `Invite ${r.id.slice(-6).toUpperCase()}`}</p>
              {r.claimed ? <>
                <p className="text-sm text-slate-300">{r.mobile ?? "No mobile recorded"}</p>
                <p className="text-sm text-slate-300">Connected {r.claimed_at ? bangkokTime(r.claimed_at) : ""} · Bangkok</p>
              </> : <>
                <p className="text-sm text-slate-300">Awaiting claim · Issued {bangkokTime(r.created_at)}</p>
                <p className="text-sm text-slate-300">{r.expires_at ? `Expires ${bangkokTime(r.expires_at)}` : "No active code"}</p>
              </>}
            </div>
            {r.claimed ? <span className="text-sm text-amber-200">Connected</span> : (
              <Button variant="secondary" className="min-h-11 shrink-0" disabled={busy} onClick={() => reissue(r.id)}>Replace code</Button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-slate-300">Replacing an unclaimed code revokes the previous one. Mobile numbers are participant-provided.</p>
    </section>
  );
}
