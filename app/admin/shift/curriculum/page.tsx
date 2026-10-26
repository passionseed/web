import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { REFUND_HOW, REFUND_STEPS } from "@/lib/content/shift-refund";
import {
  SHIFT2_CURRICULUM,
  SHIFT2_RULES,
  SHIFT2_SESSION_TIME,
} from "@/lib/content/shift2-curriculum";

export const dynamic = "force-dynamic";

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });

/** Each round edits its own copy of this plan on /shift/curriculum, outside the admin shell. */
const LIVE_CURRICULUM_HREF = "/shift/curriculum";

/** Default mentor curriculum: rules, refund steps, and the 7 days. */
export default function ShiftCurriculumPage() {
  return (
    <div className="space-y-8">
      <ShiftAdminTabs />
      <AdminPageHeader
        eyebrow="SHIFT"
        title="Mentor curriculum"
        description={`For mentors only. The default 7-day plan, sessions ${SHIFT2_SESSION_TIME}: every day shows which refund steps it covers and what to check in #progress. Dates are the defaults; each round sets its own on the live plan.`}
        actions={
          <Button asChild variant="outline" className="min-h-11">
            <Link href={LIVE_CURRICULUM_HREF}>
              Live plan
              <span className="sr-only"> (leaves the admin workspace)</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Rules to say on Day 1</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {SHIFT2_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Refund steps</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {REFUND_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-muted-foreground">{REFUND_HOW}</p>
        </div>
      </section>

      <nav aria-label="Days" className="flex flex-wrap gap-2 text-sm">
        {SHIFT2_CURRICULUM.map((d) => (
          <a
            key={d.day}
            href={`#day${d.day}`}
            className="inline-flex min-h-11 items-center rounded-md border px-3 hover:bg-muted active:bg-muted"
          >
            Day {d.day} · {dateLabel(d.date)}
          </a>
        ))}
      </nav>

      {SHIFT2_CURRICULUM.map((d) => (
        <section
          key={d.day}
          id={`day${d.day}`}
          className="scroll-mt-6 space-y-3 rounded-lg border p-4"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-xl font-semibold">
              Day {d.day} · {d.name}
            </h2>
            <span className="text-sm text-muted-foreground">{dateLabel(d.date)}</span>
            <span
              className={
                d.mentorSession
                  ? "rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300"
                  : "rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              }
            >
              {d.mentorSession ? "Mentor session" : "No session · Discord only"}
            </span>
          </div>
          <p>{d.goal}</p>

          {d.schedule && (
            <table className="w-full text-left text-sm">
              <tbody>
                {d.schedule.map(([time, topic, detail]) => (
                  <tr key={time} className="border-b align-top last:border-0">
                    <td className="whitespace-nowrap py-1.5 pr-4 font-mono text-muted-foreground">
                      {time}
                    </td>
                    <td className="py-1.5 pr-4 font-medium">{topic}</td>
                    <td className="py-1.5 text-muted-foreground">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div>
              <h3 className="font-semibold">Mission</h3>
              <p className="mt-1">{d.mission}</p>
            </div>
            <div>
              <h3 className="font-semibold">Refund steps today</h3>
              <ul className="mt-1 space-y-0.5">
                {d.refundSteps.map((n) => (
                  <li key={n}>
                    {n}. {REFUND_STEPS[n - 1]}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Mentors check</h3>
              <ul className="mt-1 list-disc space-y-0.5 pl-5">
                {d.mentorChecks.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
