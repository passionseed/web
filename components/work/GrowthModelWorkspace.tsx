"use client";

import { ArrowRight, Check, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  COST_DRIVERS,
  MARKETING_LANES,
  MODEL_OPTIONS,
  MODEL_RISKS,
  NEXT_TESTS,
  NORTH_STAR,
  REGULATION_LADDER,
  SDT_MECHANISMS,
  TWO_KEY_RULES,
  breakEvenConversionRate,
  projectCampCapacity,
  projectMentorLoop,
  seatsNeededForRevenue,
  type ModelVerdict,
} from "@/lib/work/growth-model";

import styles from "./work.module.css";

const CAMP_ASSUMPTION = {
  seats: 20,
  pricePerSeat: 2000,
  cohortsPerYear: 12,
  mentorCostShare: 0.45,
};

const REVENUE_TARGET = 10_000_000;
const MENTEES_PER_MENTOR = 6;

const verdictStyles: Record<ModelVerdict, string> = {
  core: "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200/85",
  supporting: "border-white/10 bg-white/[0.02] text-stone-400",
  rejected: "border-rose-400/25 bg-rose-400/[0.06] text-rose-200/80",
};

const verdictLabels: Record<ModelVerdict, string> = {
  core: "Core",
  supporting: "Supporting",
  rejected: "Rejected",
};

const loopVerdictCopy = {
  growing: { label: "โตทบต้น", tone: "text-emerald-200", Icon: TrendingUp },
  flat: { label: "เลี้ยงตัวเองได้ ไม่โต", tone: "text-stone-300", Icon: Minus },
  shrinking: { label: "ต้องซื้อ mentor ด้วยเงิน", tone: "text-rose-200", Icon: TrendingDown },
} as const;

function baht(value: number) {
  return `${value.toLocaleString("en-US")}฿`;
}

export function GrowthModelWorkspace() {
  const [conversion, setConversion] = useState(0.17);

  const camp = useMemo(() => projectCampCapacity(CAMP_ASSUMPTION), []);
  const loop = useMemo(() => projectMentorLoop(conversion, MENTEES_PER_MENTOR), [conversion]);
  const breakEven = breakEvenConversionRate(MENTEES_PER_MENTOR);
  const seatsNeeded = seatsNeededForRevenue(REVENUE_TARGET, CAMP_ASSUMPTION.pricePerSeat);
  const cohortsNeeded = Math.ceil(seatsNeeded / CAMP_ASSUMPTION.seats);
  const loopVerdict = loopVerdictCopy[loop.verdict];

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Work / Model</p>
        <div className="mt-3 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="font-kodchasan text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              The kid has to want it. The parent only has to allow it.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400 sm:text-base">
              Camps are the ritual that produces evidence and mentors. The business underneath is
              the room and the verified record. This page holds the reasoning and the arithmetic
              behind that split.
            </p>
          </div>
          <Link href="/work/mkt/segments" className={styles.secondaryButton}>
            Segments &amp; worksheets
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className={styles.rule} />
      </header>

      <section className={`${styles.decisionSurface} mt-8 p-5 sm:p-7`}>
        <div className="relative z-10">
          <p className={styles.eyebrow}>The thesis</p>
          <h2 className="mt-3 max-w-3xl font-kodchasan text-2xl font-semibold leading-snug text-white sm:text-3xl">
            Sell the student the change. Sell the parent the permission.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-300">
            A student who was pushed enters at the bottom of the motivation ladder and spends the
            program resisting. A student who applied on their own starts one rung up and finishes
            the work. Every pricing, channel, and staffing decision below follows from that.
          </p>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className={styles.eyebrow}>Motivation ladder</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
              The product is one rung of movement
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-stone-400">
              Motivation is not intrinsic or extrinsic, it is a ladder. Students arrive because
              someone paid and a deadline exists. The job is to move them to the rung where the
              work is worth doing on its own terms.
            </p>
          </div>
          <ol className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {REGULATION_LADDER.map((rung, index) => (
              <li
                key={rung.id}
                className={`grid gap-2 py-4 sm:grid-cols-[2rem_11rem_1fr_auto] sm:items-baseline sm:gap-4 ${
                  rung.entryPoint || rung.target ? "" : "opacity-70"
                }`}
              >
                <span className="font-space-mono text-[10px] text-orange-300/55">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{rung.label}</h3>
                  <p className="mt-1 text-xs text-stone-500">{rung.thaiLabel}</p>
                </div>
                <p className="text-sm leading-6 text-stone-400">“{rung.sounds}”</p>
                {rung.entryPoint && (
                  <span className="justify-self-start rounded-md border border-white/10 px-2 py-1 text-[10px] text-stone-400 sm:justify-self-end">
                    เด็กเข้ามาตรงนี้
                  </span>
                )}
                {rung.target && (
                  <span className="justify-self-start rounded-md border border-emerald-400/25 bg-emerald-400/[0.06] px-2 py-1 text-[10px] text-emerald-200/85 sm:justify-self-end">
                    เป้าหมายของโปรแกรม
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <p className={styles.eyebrow}>Mechanisms</p>
        <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
          Four facts that decide the design
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {SDT_MECHANISMS.map((mechanism) => (
            <div key={mechanism.id} className={`${styles.surface} p-5`}>
              <h3 className="text-sm font-semibold leading-6 text-white">{mechanism.claim}</h3>
              <p className="mt-3 text-xs leading-5 text-stone-500">{mechanism.evidence}</p>
              <p className="mt-4 border-t border-white/[0.06] pt-3 text-sm leading-6 text-stone-300">
                {mechanism.designConsequence}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <p className={styles.eyebrow}>Arithmetic</p>
        <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
          Why camps cannot be the engine
        </h2>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className={`${styles.surface} p-5`}>
            <h3 className="text-sm font-semibold text-white">Camp ceiling</h3>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              {CAMP_ASSUMPTION.seats} ที่นั่ง คูณ {baht(CAMP_ASSUMPTION.pricePerSeat)} คูณ{" "}
              {CAMP_ASSUMPTION.cohortsPerYear} รุ่นต่อปี ต้นทุน mentor{" "}
              {Math.round(CAMP_ASSUMPTION.mentorCostShare * 100)}%
            </p>
            <dl className="mt-4 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {[
                ["ที่นั่งต่อปี", `${camp.seatsPerYear}`],
                ["รายได้ต่อปี", baht(camp.revenue)],
                ["เหลือหลังหัก mentor", baht(camp.contribution)],
              ].map(([term, value]) => (
                <div key={term} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-xs text-stone-500">{term}</dt>
                  <dd className="font-space-mono text-sm tabular-nums text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm leading-6 text-stone-300">
              เพื่อไปให้ถึง {baht(REVENUE_TARGET)} ต่อปีด้วยค่ายอย่างเดียว ต้องขาย{" "}
              {seatsNeeded.toLocaleString("en-US")} ที่นั่ง คือ {cohortsNeeded} รุ่น
              ซึ่งเป็นไปไม่ได้ถ้ายังอยากรักษาคุณภาพการดูแล
            </p>
          </div>

          <div className={`${styles.surface} p-5`}>
            <h3 className="text-sm font-semibold text-white">Alumni mentor loop</h3>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              รุ่นหนึ่งต้องผลิต mentor ของรุ่นถัดไปเอง โดย mentor 1 คนดูแลได้{" "}
              {MENTEES_PER_MENTOR} คน จุดคุ้มทุนจึงอยู่ที่ {Math.round(breakEven * 100)}%
            </p>

            <label className="mt-5 block">
              <span className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                อัตราศิษย์เก่าที่กลับมาเป็น mentor
              </span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.01}
                value={conversion}
                onChange={(event) => setConversion(Number(event.target.value))}
                className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-orange-400"
                aria-label="อัตราศิษย์เก่าที่กลับมาเป็น mentor"
              />
            </label>

            <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <p className="font-space-mono text-3xl font-bold tabular-nums text-white">
                {Math.round(conversion * 100)}%
              </p>
              <p className="font-space-mono text-sm tabular-nums text-stone-400">
                cohort × {loop.growthFactor.toFixed(2)} ต่อรอบ
              </p>
            </div>

            <p className={`mt-3 flex items-center gap-2 text-sm font-semibold ${loopVerdict.tone}`}>
              <loopVerdict.Icon className="h-4 w-4" aria-hidden="true" />
              {loopVerdict.label}
            </p>
            <p className="mt-3 text-xs leading-5 text-stone-500">
              ต่ำกว่า {Math.round(breakEven * 100)}% ลูปหดและต้องจ่ายเงินซื้อ mentor ที่ 33%
              รุ่นถัดไปโตเป็นสองเท่า ตอนนี้เรายังไม่วัดตัวเลขนี้เลย
            </p>
          </div>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className={styles.eyebrow}>Cost curve</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
              Which number falls every generation
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-stone-400">
              Tesla only worked because cost per kWh fell each product. Ours is cost per student who
              reaches identified regulation. Any expensive product we add has to push that number
              down, or it is just a premium price with no plan behind it.
            </p>
          </div>
          <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {COST_DRIVERS.map((driver) => (
              <li key={driver.id} className="grid gap-2 py-4 sm:grid-cols-[1.5rem_11rem_1fr] sm:items-baseline sm:gap-4">
                {driver.falls ? (
                  <Check className="h-4 w-4 text-emerald-300/80" aria-hidden="true" />
                ) : (
                  <X className="h-4 w-4 text-rose-300/80" aria-hidden="true" />
                )}
                <h3 className="text-sm font-semibold text-white">{driver.label}</h3>
                <p className="text-sm leading-6 text-stone-400">{driver.note}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <p className={styles.eyebrow}>Model options</p>
        <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
          What we scale, and what we refuse to scale
        </h2>
        <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/10">
          <div className="hidden grid-cols-[1fr_11rem_6.5rem] gap-4 border-b border-white/[0.07] px-4 py-3 font-space-mono text-[9px] uppercase tracking-[0.15em] text-white/30 lg:grid">
            <span>Model</span>
            <span>Scaling unit</span>
            <span>Verdict</span>
          </div>
          {MODEL_OPTIONS.map((option) => (
            <div
              key={option.id}
              className={`${styles.contentRow} grid gap-3 border-b border-white/[0.06] px-4 py-4 last:border-b-0 lg:grid-cols-[1fr_11rem_6.5rem] lg:items-start lg:gap-4`}
            >
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white">{option.label}</h3>
                <p className="mt-1 break-words text-xs leading-5 text-stone-500">{option.why}</p>
              </div>
              <span className="text-xs text-stone-400">{option.scalingUnit}</span>
              <span
                className={`justify-self-start rounded-md border px-2 py-1 text-[10px] ${verdictStyles[option.verdict]}`}
              >
                {verdictLabels[option.verdict]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className={styles.eyebrow}>Two keys</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
              Parent pays, student decides
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-stone-400">
              This is the answer to the rebellion problem. Adolescence is peak resistance to
              pressure, so a purchase made over the student's head produces a student who fights the
              program. Split the keys and the fight disappears.
            </p>
          </div>
          <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {TWO_KEY_RULES.map((rule) => (
              <li key={rule.id} className="grid gap-2 py-4 sm:grid-cols-[5.5rem_1fr] sm:gap-4">
                <span className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-orange-300/55">
                  {rule.actor === "student" ? "เด็ก" : rule.actor === "parent" ? "ผู้ปกครอง" : "เรา"}
                </span>
                <div>
                  <p className="text-sm font-semibold leading-6 text-white">{rule.rule}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{rule.because}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <p className={styles.eyebrow}>Marketing doctrine</p>
        <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
          Two lanes, one of them primary
        </h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {MARKETING_LANES.map((lane) => (
            <div
              key={lane.id}
              className={`${styles.surface} p-5 ${lane.id === "student" ? "border-orange-300/20" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{lane.audience}</h3>
                <span className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                  {lane.id === "student" ? "Primary" : "Enabler"}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500">{lane.channel}</p>
              <dl className="mt-4 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {[
                  ["หน้าที่", lane.job],
                  ["ฮุก", lane.hook],
                  ["ห้ามทำ", lane.antiPattern],
                ].map(([term, detail]) => (
                  <div key={term} className="grid gap-1 py-3 sm:grid-cols-[4rem_1fr] sm:gap-3">
                    <dt className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-orange-300/55">
                      {term}
                    </dt>
                    <dd className="text-sm leading-6 text-stone-300">{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.decisionSurface} mt-12 p-5 sm:p-7`}>
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className={styles.eyebrow}>North star</p>
            <h2 className="mt-3 max-w-3xl font-kodchasan text-xl font-semibold leading-snug text-white sm:text-2xl">
              {NORTH_STAR.metric}
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-300">{NORTH_STAR.measures}</p>
            <p className="mt-2 max-w-3xl text-xs leading-5 text-stone-400">{NORTH_STAR.note}</p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] text-center">
            {[
              ["Floor", `${Math.round(NORTH_STAR.floor * 100)}%`],
              ["Compounding", `${Math.round(NORTH_STAR.compounding * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#0d0a10]/95 px-5 py-4">
                <p className="font-space-mono text-[9px] uppercase tracking-[0.16em] text-white/35">
                  {label}
                </p>
                <p className="mt-2 font-space-mono text-2xl font-bold tabular-nums text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-2">
          <div>
            <p className={styles.eyebrow}>Risks</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
              What breaks this
            </h2>
            <ul className="mt-5 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {MODEL_RISKS.map((risk) => (
                <li key={risk.id} className="py-4">
                  <p className="text-sm leading-6 text-stone-200">{risk.risk}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{risk.defense}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.eyebrow}>Next tests</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">
              Cheapest credible check
            </h2>
            <ul className="mt-5 divide-y divide-white/[0.07] border-y border-white/[0.07]">
              {NEXT_TESTS.map((test) => (
                <li key={test.id} className="py-4">
                  <p className="text-sm font-semibold leading-6 text-white">{test.question}</p>
                  <p className="mt-1 text-xs leading-5 text-stone-500">{test.test}</p>
                  <p className="mt-2 font-space-mono text-[10px] uppercase tracking-[0.14em] text-orange-300/55">
                    Pass bar: {test.passBar}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
