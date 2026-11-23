import Link from "next/link";

import { shortDate } from "@/lib/hackathon/elemental/bangkok-date";
import { formatRate, type PaceLine, type RegistrationTotals, type SeatPace } from "@/lib/hackathon/elemental/seats";
import { ELEMENTAL_TARGETS } from "@/lib/hackathon/elemental/targets";
import { cn } from "@/lib/utils";

import { DashSection, ProgressBar, QuietNotice, Stat } from "./ProgressMeter";

const REGISTRATIONS = "/admin/hackathon/registrations";
const perDay = (n: number) => `${n} a day`;

/** "Need 9 a day to reach 50 by 26 Nov. Last 3 days: 2 a day. At this pace: 31 by 3 Dec." */
function paceSentence(line: PaceLine): string {
  const parts: string[] = [];
  if (line.toNext) {
    parts.push(
      line.toNext.perDay > 0
        ? `Need ${perDay(line.toNext.perDay)} to reach ${line.toNext.seats} by ${shortDate(line.toNext.by)}.`
        : `${line.toNext.seats} by ${shortDate(line.toNext.by)} is reached.`,
    );
  }
  if (line.toTarget && line.toTarget.perDay > 0 && line.toTarget.seats !== line.toNext?.seats) {
    parts.push(`For ${line.toTarget.seats} by ${shortDate(line.toTarget.by)}: ${perDay(line.toTarget.perDay)}.`);
  }
  parts.push(`Last 3 days: ${formatRate(line.rate3d)} a day.`);
  if (line.toTarget) parts.push(`At this pace: ${line.forecast} by ${shortDate(ELEMENTAL_TARGETS.registrationClosesOn)}.`);
  return parts.join(" ");
}

/** Paid seats for each day of the sign-up window, as a row of small bars. */
function DayStrip({ line }: { line: PaceLine }) {
  const max = Math.max(1, ...line.days.map((d) => d.seats));
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-medium">Paid per day</h3>
      <ol className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5" aria-label="Paid seats per day">
        {line.days.map((d) => (
          <li
            key={d.date}
            className="flex min-w-0 flex-col items-center"
            aria-label={`${shortDate(d.date)}: ${d.when === "future" ? "not yet" : `${d.seats} paid`}`}
          >
            <span
              className={cn(
                "text-[11px] tabular-nums leading-tight",
                d.when === "future" ? "text-transparent" : d.seats > 0 ? "text-foreground" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {d.seats}
            </span>
            <span className="relative mt-0.5 h-8 w-full rounded-sm bg-muted/60" aria-hidden="true">
              {d.when !== "future" && d.seats > 0 && (
                <span
                  className="absolute inset-x-0 bottom-0 rounded-sm bg-primary"
                  style={{ height: `${Math.max(8, (d.seats / max) * 100)}%` }}
                />
              )}
            </span>
            <span
              className={cn(
                "mt-0.5 text-[10px] tabular-nums leading-tight",
                d.when === "today" ? "font-medium text-foreground" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {Number(d.date.slice(8))}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-muted-foreground">
        {shortDate(line.days[0]?.date ?? ELEMENTAL_TARGETS.seats.paceStart)} to{" "}
        {shortDate(ELEMENTAL_TARGETS.registrationClosesOn)}, Bangkok days
      </p>
    </div>
  );
}

/** Paid seats against the 350 target, with checkpoints and what it takes from here. Totals only. */
export function SeatsSection({
  totals,
  pace,
  line,
  today,
}: {
  totals: RegistrationTotals | null;
  pace: SeatPace | null;
  line: PaceLine | null;
  today: string;
}) {
  const { seats, registrationClosesOn } = ELEMENTAL_TARGETS;

  if (!totals || !pace || !line) {
    return (
      <DashSection id="seats" title="Seats">
        <QuietNotice>Sign-ups did not load, so this is not zero. Refresh to try again.</QuietNotice>
      </DashSection>
    );
  }

  const ticks = seats.checkpoints.map((cp) => ({ value: cp.seats, label: String(cp.seats), sub: shortDate(cp.by) }));
  const closed = today > registrationClosesOn;
  const behind = pace.status === "behind";
  const topSources = totals.sources.slice(0, 8);

  return (
    <DashSection
      id="seats"
      title="Seats"
      meta={closed ? "Sign-up closed" : `Sign-up closes ${shortDate(registrationClosesOn)}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="flex items-baseline gap-2">
          <span className="text-4xl font-medium tabular-nums tracking-tight sm:text-5xl">{pace.paid}</span>
          <span className="text-sm text-muted-foreground tabular-nums">/ {seats.target} paid seats</span>
        </p>
        <p
          className={cn(
            "rounded-md border px-2.5 py-1 text-sm tabular-nums",
            behind ? "border-destructive/40 text-destructive" : "border-emerald-400/30 text-emerald-700 dark:text-emerald-300",
          )}
        >
          {behind
            ? `${pace.behindBy} under the line`
            : pace.aheadBy > 0
              ? `On track, ${pace.aheadBy} ahead`
              : "On track"}
        </p>
      </div>

      <div className="mt-4">
        <ProgressBar
          size="lg"
          label="Paid seats"
          value={pace.paid}
          target={seats.target}
          ticks={ticks}
          marker={pace.expectedToday}
          tone={behind ? "behind" : "default"}
        />
      </div>

      <p className={cn("mt-2 text-sm tabular-nums", behind ? "text-foreground" : "text-muted-foreground")}>
        {paceSentence(line)}
      </p>

      <p className="mt-4 text-sm tabular-nums">
        <span className="font-medium">{totals.paidSeats} paid</span>
        <span className="text-muted-foreground"> + </span>
        <Link href={REGISTRATIONS} className="underline-offset-2 hover:text-primary hover:underline">
          {totals.reviewPeople} in review
        </Link>
        <span className="text-muted-foreground"> + </span>
        <Link href={REGISTRATIONS} className="underline-offset-2 hover:text-primary hover:underline">
          {totals.unpaidPeople} unpaid
        </Link>
        <span className="text-muted-foreground"> people</span>
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Unpaid sign-ups are the cheapest seats: a reminder costs nothing. Contact details stay on the sign-ups page.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Paid, last 24 hours" value={line.paidLast24h} detail={`${line.paidToday} today`} />
        <Stat
          label="Slips to check"
          value={totals.slipsToCheck}
          detail={
            totals.slipsToCheck > 0 ? (
              <Link href={REGISTRATIONS} className="underline-offset-2 hover:text-primary hover:underline">
                Check them
              </Link>
            ) : (
              "None waiting"
            )
          }
        />
        <Stat label="Unpaid, under 24h" value={totals.unpaidFreshPeople} detail="people, still warm" />
        <Stat
          label="Unpaid, over 24h"
          value={totals.unpaidStalePeople}
          detail={
            totals.unpaidStalePeople > 0 ? (
              <Link href={REGISTRATIONS} className="underline-offset-2 hover:text-primary hover:underline">
                Remind them
              </Link>
            ) : (
              "people"
            )
          }
        />
      </div>

      <div className="mt-5">
        <DayStrip line={line} />
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-medium">By link: sign-ups to paid seats</h3>
        {topSources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sign-ups yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {topSources.map((s) => (
              <li key={s.source} className="grid grid-cols-[minmax(0,1fr)_auto_3rem] items-baseline gap-3 py-1.5">
                <span className="truncate text-muted-foreground">{s.source}</span>
                <span className="tabular-nums">
                  {s.signups} {s.signups === 1 ? "sign-up" : "sign-ups"} → {s.paidSignups} paid
                  {s.paidSeats !== s.paidSignups && (
                    <span className="text-muted-foreground"> ({s.paidSeats} seats)</span>
                  )}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{Math.round(s.rate * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashSection>
  );
}
