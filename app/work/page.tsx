import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FlaskConical,
  Megaphone,
  Repeat2,
} from "lucide-react";

import styles from "@/components/work/work.module.css";

export const metadata: Metadata = {
  title: "Work OS | PassionSeed",
  description: "The internal operating workspace for PassionSeed.",
};

const workAreas = [
  {
    title: "Demand",
    description: "Find and convert the students and parents who feel the problem now.",
    output: "Attention → qualified → paid",
    href: "/work/mkt/funnel",
    icon: Megaphone,
  },
  {
    title: "Validation",
    description: "Disprove the riskiest assumption before spending more time or money.",
    output: "Evidence → test → decision",
    href: "/work/product",
    icon: FlaskConical,
  },
  {
    title: "PMF",
    description: "Prove that paid demand, student value, and compounding pull repeat.",
    output: "Pull → value → repeatability",
    href: "/work/product#pmf",
    icon: Repeat2,
  },
] as const;

const growthModelLink = {
  title: "Growth model",
  description: "Why the student has to want it, and which scaling unit that leaves us.",
  href: "/work/model",
} as const;

const operatingLoop = [
  ["01", "Observe", "Capture behavior, payment, and student outcomes"],
  ["02", "Test", "Run the cheapest credible test of the riskiest belief"],
  ["03", "Deliver", "Put the offer into reality with the right customer"],
  ["04", "Decide", "Persevere, pivot, or stop from the evidence"],
] as const;

const principles = [
  ["01", "Constraint first", "Work on the bottleneck limiting the company now."],
  ["02", "Behavior over opinions", "Payment, usage, and continuation outweigh compliments."],
  ["03", "Pass bar before test", "Define the result that changes the decision before running it."],
  ["04", "Demand and value together", "A sale without a student outcome is not product-market fit."],
  ["05", "Patterns over anecdotes", "Require the signal to repeat across three consecutive cohorts."],
] as const;

export default function WorkOverviewPage() {
  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Work / Overview</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-kodchasan text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The minimum system for finding PMF.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">
              Focus on demand, validation, and repeated student value. Everything else supports these three loops.
            </p>
          </div>
          <p className="font-space-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
            Cycle 01 · September 2026
          </p>
        </div>
        <div className={styles.rule} />
      </header>

      <section className={`${styles.decisionSurface} mt-8 p-5 sm:p-7`}>
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className={styles.eyebrow}>Current company decision</p>
            <h2 className="mt-3 max-w-3xl font-kodchasan text-2xl font-semibold leading-snug text-white sm:text-3xl">
              Make TechSeed → SHIFT a ladder students and parents can understand in ten seconds.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-300">
              Resolve price, readiness, and deliverables before sending more bottom-of-funnel traffic. The offer architecture is the constraint, not the amount of content.
            </p>
          </div>
          <Link
            href="/work/product"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-orange-400 via-orange-500 to-rose-700 px-5 text-sm font-semibold text-white shadow-lg shadow-orange-950/20 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            Open decision
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className={styles.eyebrow}>Pareto operating system</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">Three loops only</h2>
          </div>
          <Link href={growthModelLink.href} className="text-xs text-stone-500 hover:text-white">
            Read the growth model
          </Link>
        </div>

        <div className="mt-5 divide-y divide-white/[0.07] border-y border-white/[0.07]">
          {workAreas.map((area) => {
            const Icon = area.icon;
            return (
              <Link key={area.title} href={area.href} className={`${styles.contentRow} grid gap-4 px-2 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-3`}>
                <div className="flex min-w-0 items-start gap-4">
                  <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-orange-200/80"><Icon className="h-4 w-4" aria-hidden="true" /></div>
                  <div className="min-w-0"><h3 className="font-kodchasan text-base font-semibold text-white">{area.title}</h3><p className="mt-1 text-sm leading-6 text-stone-400">{area.description}</p></div>
                </div>
                <div className="flex items-center gap-3 pl-[3.25rem] text-xs text-stone-500 sm:pl-0"><span>{area.output}</span><ArrowRight className="h-4 w-4 text-orange-300/60" aria-hidden="true" /></div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className={styles.eyebrow}>Operating loop</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">One evidence chain</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-stone-400">
              Research is not a separate archive. It must enter a test, change a decision, or stay out of the system.
            </p>
          </div>
          <ol className="grid gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-2 xl:grid-cols-4">
            {operatingLoop.map(([number, title, detail]) => (
              <li key={number} className="bg-[#0d0a10]/95 p-4">
                <span className="font-space-mono text-[10px] text-orange-300/55">{number}</span>
                <h3 className="mt-5 text-sm font-semibold text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-stone-500">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div><p className={styles.eyebrow}>Principles</p><h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">Rules that delete weak work</h2></div>
          <ol className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {principles.map(([number, title, detail]) => (
              <li key={number} className="grid gap-2 py-4 sm:grid-cols-[2rem_10rem_1fr] sm:items-baseline"><span className="font-space-mono text-[10px] text-orange-300/55">{number}</span><h3 className="text-sm font-semibold text-white">{title}</h3><p className="text-sm leading-6 text-stone-400">{detail}</p></li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
