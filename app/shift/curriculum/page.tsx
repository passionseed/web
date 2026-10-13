import type { Metadata } from "next";

import { REFUND_HOW, REFUND_STEPS } from "@/lib/content/shift-refund";
import {
  SHIFT2_CURRICULUM,
  SHIFT2_RULES,
  SHIFT2_SESSION_TIME,
} from "@/lib/content/shift2-curriculum";

/**
 * SHIFT[2] curriculum for mentors: rules, refund steps, and the 7 days, on one
 * page. Internal: not indexed, not linked from the site. Contains no student data.
 */

export const metadata: Metadata = {
  title: "SHIFT[2] Curriculum",
  robots: { index: false, follow: false },
};

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });

export default function Shift2CurriculumPage() {
  return (
    <div className="min-h-screen bg-neutral-950 font-bai-jamjuree text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">SHIFT[2] · Curriculum (internal)</h1>
        <nav className="mt-2 flex flex-wrap gap-2 text-sm">
          <a href="#rules" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
            Rules
          </a>
          {SHIFT2_CURRICULUM.map((d) => (
            <a
              key={d.day}
              href={`#day${d.day}`}
              className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
            >
              Day {d.day} · {dateLabel(d.date)}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-4 py-8">
        <section id="rules" className="grid scroll-mt-28 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white/5 p-4">
            <h2 className="text-lg font-bold">กติกาที่บอกใน Day 1</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
              {SHIFT2_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-white/50">
              เซสชัน {SHIFT2_SESSION_TIME} · ไม่มีเซสชัน Day 3 และ Day 5
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <h2 className="text-lg font-bold">ขั้นตอนคืนเงิน</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/80">
              {REFUND_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-white/50">{REFUND_HOW}</p>
          </div>
        </section>

        {SHIFT2_CURRICULUM.map((d) => (
          <section key={d.day} id={`day${d.day}`} className="scroll-mt-28">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-2xl font-bold">
                Day {d.day} · {d.name}
              </h2>
              <span className="text-white/50">{dateLabel(d.date)}</span>
              <span
                className={
                  d.mentorSession
                    ? "rounded bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300"
                    : "rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60"
                }
              >
                {d.mentorSession ? "เซสชันกับพี่เลี้ยง" : "ไม่มีเซสชัน · ทำเองใน Discord"}
              </span>
            </div>
            <p className="mt-1 text-white/70">{d.goal}</p>

            {d.schedule && (
              <div className="mt-4 rounded-lg bg-white/5 p-4">
                <table className="w-full text-left text-sm sm:text-base">
                  <tbody>
                    {d.schedule.map(([time, topic, detail]) => (
                      <tr key={time} className="border-b border-white/10 align-top last:border-0">
                        <td className="whitespace-nowrap py-2 pr-4 font-mono text-amber-300">{time}</td>
                        <td className="py-2 pr-4 font-semibold">{topic}</td>
                        <td className="py-2 text-white/60">{detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-white/10 p-3">
                <h3 className="font-semibold text-amber-300">Mission</h3>
                <p className="mt-1 text-white/80">{d.mission}</p>
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <h3 className="font-semibold text-amber-300">ขั้นตอนคืนเงินวันนี้</h3>
                <ul className="mt-1 space-y-0.5 text-white/80">
                  {d.refundSteps.map((n) => (
                    <li key={n}>
                      {n}. {REFUND_STEPS[n - 1]}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <h3 className="font-semibold text-amber-300">พี่เลี้ยงเช็ก</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-white/80">
                  {d.mentorChecks.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
