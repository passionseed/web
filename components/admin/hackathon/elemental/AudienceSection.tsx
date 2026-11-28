import type { AudienceSummary, Slice } from "@/lib/hackathon/elemental/audience";

import { DashSection, QuietNotice } from "./ProgressMeter";

/** Slice colours, in order. The last grey is for "Other" and "before the question". */
const COLORS = ["#f59e0b", "#38bdf8", "#34d399", "#f472b6", "#a78bfa", "#fb7185", "#2dd4bf"];
const GREY = "#64748b";

const pct = (v: number) => `${Math.round(v * 100)}%`;

function colorFor(slice: Slice, index: number): string {
  return slice.label === "Other" || slice.label.startsWith("Signed up before") ? GREY : COLORS[index % COLORS.length];
}

/** A pie as a conic gradient: no chart library, no client code. The legend carries the numbers. */
function Pie({ title, slices, note }: { title: string; slices: Slice[]; note?: string }) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  let at = 0;
  const stops = slices.map((s, i) => {
    const from = at;
    at += s.share * 100;
    return `${colorFor(s, i)} ${from}% ${at}%`;
  });
  return (
    <div className="min-w-0 rounded-md border p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div
            role="img"
            aria-label={`${title}: ${slices.map((s) => `${s.label} ${pct(s.share)}`).join(", ")}`}
            className="h-28 w-28 shrink-0 rounded-full"
            style={{ background: `conic-gradient(${stops.join(", ")})` }}
          />
          <ul className="min-w-0 flex-1 space-y-1 text-sm">
            {slices.map((s, i) => (
              <li key={s.label} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(s, i) }} />
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                <span className="tabular-nums">{s.value}</span>
                <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{pct(s.share)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Who signed up: age, where they say they saw the post, and which link they came through. */
export function AudienceSection({ summary }: { summary: AudienceSummary | null }) {
  if (!summary) {
    return (
      <DashSection id="audience" title="Who signed up">
        <QuietNotice>Sign-ups didn&apos;t load. Check the server log.</QuietNotice>
      </DashSection>
    );
  }
  return (
    <DashSection
      id="audience"
      title="Who signed up"
      meta={
        <span className="text-xs text-muted-foreground">
          {summary.people} {summary.people === 1 ? "person" : "people"} · {summary.signups} sign-ups · cancelled left out
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Pie title="Age" slices={summary.ages} note="Each person on a sign-up" />
        <Pie title="Where they saw the post" slices={summary.heardFrom} note="Their own answer, one per sign-up" />
        <Pie title="Which link they came from" slices={summary.sources} note="Tracked link, direct if none" />
      </div>
    </DashSection>
  );
}
