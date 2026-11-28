import { worstDrop, type FunnelSummary } from "@/lib/hackathon/elemental/funnel";
import { cn } from "@/lib/utils";

import { DashSection, QuietNotice } from "./ProgressMeter";

/** What each failed-field key means, for the "got stuck on" list. */
const FIELD_LABELS: Record<string, string> = {
  mode: "Alone or with friends",
  teamName: "Team name",
  fullName: "Full name",
  grade: "Grade",
  age: "Age",
  school: "School",
  parentName: "Parent name",
  parentPhone: "Parent phone",
  parentConsent: "Parent consent",
  email: "Email",
  phone: "Phone",
  noRefund: "No-refund tick",
};

const pct = (v: number | null) => (v === null ? "" : `${Math.round(v * 100)}%`);

/**
 * Where people stop between the landing page and a paid seat. One bar per
 * step, the share kept from the step before, and the worst step called out.
 */
export function FunnelSection({ summary, days }: { summary: FunnelSummary | null; days: number }) {
  if (!summary) {
    return (
      <DashSection id="funnel" title="Sign-up funnel">
        <QuietNotice>Funnel events didn&apos;t load. Check the server log.</QuietNotice>
      </DashSection>
    );
  }
  const top = Math.max(1, ...summary.stages.map((s) => s.people));
  const worst = worstDrop(summary.stages);
  const empty = summary.stages.every((s) => s.people === 0);

  return (
    <DashSection id="funnel" title="Sign-up funnel" meta={<span className="text-xs text-muted-foreground">last {days} days · people, not clicks</span>}>
      {empty ? (
        <QuietNotice>No visits yet. Steps fill in as people open the landing page and sign up.</QuietNotice>
      ) : (
        <div className="space-y-5">
          {worst && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              Biggest drop: <strong>{worst.label}</strong> keeps {pct(worst.fromPrevious)} of the people who reached the step before.
            </p>
          )}
          <ol className="space-y-1.5">
            {summary.stages.map((s) => (
              <li key={s.key} className="grid grid-cols-[minmax(0,11rem)_1fr_3.5rem] items-center gap-3 text-sm">
                <span className={cn("truncate", s.optional && "text-muted-foreground")} title={s.label}>
                  {s.label}
                  {s.optional && !s.removed && " (some)"}
                </span>
                <span className="relative h-5 rounded-sm bg-muted/60">
                  <span
                    className={cn("absolute inset-y-0 left-0 rounded-sm", s.key === worst?.key ? "bg-amber-500" : "bg-primary", s.optional && "opacity-50")}
                    style={{ width: `${(s.people / top) * 100}%` }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-xs tabular-nums text-foreground mix-blend-difference">
                    {s.people}
                  </span>
                </span>
                <span className="text-right text-xs tabular-nums text-muted-foreground">{pct(s.fromPrevious)}</span>
              </li>
            ))}
          </ol>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MiniList title="Got stuck on" rows={summary.invalidFields.map((f) => [FIELD_LABELS[f.field] ?? f.field, f.count])} empty="No field errors yet" />
            <MiniList title="Slip results" rows={summary.slipResults.map((r) => [r.result, r.count])} empty="No slips yet" />
            {/* Seven ways in all: the team card's line, share, copy and code, and the paid page's paid:line, paid:share and paid:copy. */}
            <MiniList title="Team invites sent" rows={summary.invitesShared.map((r) => [r.how, r.count])} empty="No invites sent yet" limit={8} />
            <MiniList title="Opened sign-up from" rows={summary.sources.map((s) => [s.source, s.people])} empty="No sign-ups opened yet" />
          </div>
        </div>
      )}
    </DashSection>
  );
}

function MiniList({ title, rows, empty, limit = 6 }: { title: string; rows: [string, number][]; empty: string; limit?: number }) {
  return (
    <div className="min-w-0 rounded-md border bg-background/40 px-3 py-2.5">
      <h3 className="mb-1.5 text-xs text-muted-foreground">{title}</h3>
      {rows.length ? (
        <ul className="space-y-1 text-sm">
          {rows.slice(0, limit).map(([label, n]) => (
            <li key={label} className="flex justify-between gap-3">
              <span className="truncate">{label}</span>
              <span className="tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
