import { ShiftAdminTabs } from "@/components/admin/ShiftAdminTabs";
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

/** SHIFT[2] curriculum for mentors: rules, refund steps, and the 7 days. */
export default function ShiftCurriculumPage() {
  return (
    <div className="space-y-8">
      <ShiftAdminTabs />
      <div>
        <h2 className="text-2xl font-semibold">SHIFT[2] curriculum</h2>
        <p className="text-muted-foreground">
          For mentors only. 7 days, sessions {SHIFT2_SESSION_TIME}. Every day
          shows which refund steps it covers and what to check in #progress.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Rules to say on Day 1</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {SHIFT2_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Refund steps</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {REFUND_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-muted-foreground">{REFUND_HOW}</p>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 text-sm">
        {SHIFT2_CURRICULUM.map((d) => (
          <a
            key={d.day}
            href={`#day${d.day}`}
            className="rounded-md border px-3 py-1.5 hover:bg-muted"
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
            <h3 className="text-xl font-semibold">
              Day {d.day} · {d.name}
            </h3>
            <span className="text-sm text-muted-foreground">{dateLabel(d.date)}</span>
            <span
              className={
                d.mentorSession
                  ? "rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600"
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
              <h4 className="font-semibold">Mission</h4>
              <p className="mt-1">{d.mission}</p>
            </div>
            <div>
              <h4 className="font-semibold">Refund steps today</h4>
              <ul className="mt-1 space-y-0.5">
                {d.refundSteps.map((n) => (
                  <li key={n}>
                    {n}. {REFUND_STEPS[n - 1]}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">Mentors check</h4>
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
