"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  AUDIENCE_SEGMENTS,
  buildDmReply,
  getSdtNeed,
  getWorksheetForSegment,
  projectFunnelLift,
  projectPaidFromLeads,
  worksheetPath,
  type SdtNeed,
  type SegmentId,
} from "@/lib/work/audience-segments";
import type { FunnelOffer } from "@/lib/work/marketing-funnel";

import styles from "./work.module.css";

const MONTHLY_LEADS = 326;

const needAccent: Record<SdtNeed, string> = {
  autonomy: "border-orange-300/25 bg-orange-300/[0.07] text-orange-200",
  competence: "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200/85",
  relatedness: "border-sky-400/20 bg-sky-400/[0.06] text-sky-200/85",
};

const routeLabels: Record<FunnelOffer, string> = {
  techseed: "TechSeed",
  shift: "SHIFT",
  both: "TechSeed หรือ SHIFT",
};

function percent(value: number, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function useCopy() {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return { copied, copy };
}

export function AudienceSegmentWorkspace() {
  const [activeId, setActiveId] = useState<SegmentId>(AUDIENCE_SEGMENTS[0].id);
  const { copied, copy } = useCopy();

  const projection = useMemo(() => projectFunnelLift(), []);
  const segment = AUDIENCE_SEGMENTS.find((entry) => entry.id === activeId) ?? AUDIENCE_SEGMENTS[0];
  const worksheet = getWorksheetForSegment(segment.id);
  const need = getSdtNeed(segment.starvedNeed);
  const dmReply = useMemo(() => buildDmReply(segment), [segment]);

  const baselinePaid = projectPaidFromLeads(MONTHLY_LEADS, projection.baselineRate);
  const targetPaid = projectPaidFromLeads(MONTHLY_LEADS, projection.targetRate);

  return (
    <div className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Work / Marketing / Segments</p>
        <div className="mt-3 grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <h1 className="font-kodchasan text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Name the student, hand over the worksheet.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-400 sm:text-base">
              Five inbound students, five starved needs, five free worksheets. Every first reply
              gives something away and asks for one thing back, so qualification comes from
              behavior instead of opinions.
            </p>
          </div>
          <Link href="/work/mkt/funnel" className={styles.secondaryButton}>
            Content backlog
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <p className="mt-3 font-space-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
          Baseline: 326 DM threads, IG PORT campaign, 12 Aug 2026
        </p>
        <div className={styles.rule} />
      </header>

      <section className={`${styles.decisionSurface} mt-8 p-5 sm:p-7`}>
        <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className={styles.eyebrow}>Projected lift</p>
            <h2 className="mt-3 font-kodchasan text-2xl font-semibold leading-snug text-white sm:text-3xl">
              {projection.totalLift.toFixed(1)}x more paid conversations from the same reach.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-300">
              The lift is earned by answering fast and giving an asset, not by pitching harder.
              The close rate is held flat on purpose.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.07] text-center">
            {[
              ["Now", `${baselinePaid}`, percent(projection.baselineRate, 2)],
              ["Segmented", `${targetPaid}`, percent(projection.targetRate, 2)],
            ].map(([label, value, rate]) => (
              <div key={label} className="bg-[#0d0a10]/95 px-5 py-4">
                <p className="font-space-mono text-[9px] uppercase tracking-[0.16em] text-white/35">{label}</p>
                <p className="mt-2 font-space-mono text-2xl font-bold text-white">{value}</p>
                <p className="mt-1 text-[10px] text-stone-500">paid · {rate}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div><p className={styles.eyebrow}>Funnel math</p><h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">Where the multiple actually comes from</h2></div>
        <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/10">
          <div className="hidden grid-cols-[1fr_5rem_5rem_4.5rem] gap-4 border-b border-white/[0.07] px-4 py-3 font-space-mono text-[9px] uppercase tracking-[0.15em] text-white/30 lg:grid">
            <span>Step</span><span>Now</span><span>Target</span><span>Lift</span>
          </div>
          {projection.steps.map((step) => (
            <div key={step.id} className={`${styles.contentRow} grid gap-2 border-b border-white/[0.06] px-4 py-4 last:border-b-0 lg:grid-cols-[1fr_5rem_5rem_4.5rem] lg:items-center lg:gap-4`}>
              <div className="min-w-0">
                <h3 className="break-words text-sm font-semibold text-white">{step.label}</h3>
                <p className="mt-1 break-words text-xs leading-5 text-stone-500">{step.mechanism}</p>
                <p className="mt-1 break-words text-[10px] text-white/30">{step.baselineSource}</p>
              </div>
              <span className="font-space-mono text-xs text-stone-400">{percent(step.baseline, 0)}</span>
              <span className="font-space-mono text-xs text-stone-200">{percent(step.target, 0)}</span>
              <span className={`font-space-mono text-xs ${step.heldFlat ? "text-white/30" : "text-orange-200"}`}>
                {step.heldFlat ? "held flat" : `${step.lift.toFixed(1)}x`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} mt-12`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className={styles.eyebrow}>Segments</p><h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">Who is actually in the inbox</h2></div>
          <p className="text-xs text-stone-500">Share of 326 inbound threads</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {AUDIENCE_SEGMENTS.map((entry) => {
            const active = entry.id === activeId;
            const entryNeed = getSdtNeed(entry.starvedNeed);
            return (
              <button key={entry.id} type="button" aria-pressed={active} onClick={() => setActiveId(entry.id)} className={`${styles.stageButton} ${active ? styles.stageButtonActive : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-space-mono text-[10px] font-bold tracking-[0.16em] text-orange-300/80">{entry.keyword}</span>
                  <span className="text-[10px] text-white/30">{entry.share}% · {entry.grade}</span>
                </div>
                <p className="mt-5 text-sm font-semibold leading-6 text-white">{entry.thaiLabel}</p>
                <p className="mt-2 text-xs leading-5 text-stone-500">{entry.saidVerbatim}</p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-[10px]">
                  <span className={`rounded-md border px-2 py-1 ${needAccent[entry.starvedNeed]}`}>{entryNeed.label}</span>
                  <span className="text-white/30">{routeLabels[entry.route]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={segment.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className={`${styles.section} mt-12`}
        >
          <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className={styles.eyebrow}>Self-determination diagnosis</p>
              <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">{segment.thaiLabel}</h2>
              <p className="mt-3 text-sm leading-6 text-stone-400">{segment.signal}</p>

              <dl className="mt-6 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                {[
                  ["ความเชื่อตอนนี้", segment.belief],
                  [`ขาด ${need.thaiLabel}`, segment.needEvidence],
                  ["worksheet คืนอะไรให้", segment.restoreMove],
                  ["ขั้นต่อไปหลังได้งานคืน", segment.nextStep],
                ].map(([term, detail]) => (
                  <div key={term} className="grid gap-1 py-4 sm:grid-cols-[9.5rem_1fr] sm:gap-4">
                    <dt className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-orange-300/55">{term}</dt>
                    <dd className="text-sm leading-6 text-stone-300">{detail}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300/80" aria-hidden="true" />
                <div>
                  <p className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-rose-200/70">Guardrail</p>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{segment.guardrail}</p>
                  <p className="mt-2 text-xs leading-5 text-stone-500">{need.killedBy}</p>
                </div>
              </div>
            </div>

            {worksheet && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={styles.eyebrow}>Free worksheet</p>
                    <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">{worksheet.thaiTitle}</h2>
                  </div>
                  <Link href={worksheetPath(worksheet.slug)} target="_blank" className={styles.secondaryButton}>
                    เปิดหน้าที่ส่งให้เด็ก
                    <ExternalLink className="ml-2 h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-400">{worksheet.promise}</p>
                <p className="mt-2 font-space-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
                  {worksheet.timeBox} · {worksheet.prompts.length} ข้อ · ฟรี
                </p>

                <ol className="mt-5 divide-y divide-white/[0.07] border-y border-white/[0.07]">
                  {worksheet.prompts.map((prompt) => (
                    <li key={prompt.n} className="grid gap-1 py-4 sm:grid-cols-[2rem_1fr] sm:gap-4">
                      <span className="font-space-mono text-[10px] text-orange-300/55">{String(prompt.n).padStart(2, "0")}</span>
                      <div>
                        <p className="text-sm leading-6 text-stone-200">{prompt.ask}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{prompt.why}</p>
                      </div>
                    </li>
                  ))}
                </ol>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-white/30">เด็กได้อะไรกลับไป</p>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{worksheet.output}</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <p className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-white/30">เราขออะไรกลับ</p>
                    <p className="mt-2 text-sm leading-6 text-stone-300">{worksheet.sendBack}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-white/[0.07] bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-space-mono text-[10px] uppercase tracking-[0.14em] text-orange-300/55">คำตอบแรกใน DM</p>
                    <button type="button" onClick={() => void copy(dmReply)} className={styles.editButton} aria-label="Copy the first reply">
                      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap break-words font-bai-jamjuree text-xs leading-6 text-stone-300">{dmReply}</pre>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      <section className={`${styles.section} mt-12`}>
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className={styles.eyebrow}>Inbox router</p>
            <h2 className="mt-2 font-kodchasan text-xl font-semibold text-white">One keyword, one asset, no thinking</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-stone-400">
              Whoever is on the inbox reads the first message, picks the row, and sends the link.
              The 24-hour answer rate is the constraint, so the reply must already exist.
            </p>
            <p className="mt-4 flex items-center gap-2 text-xs text-stone-500">
              <Sparkles className="h-3.5 w-3.5 text-orange-300/60" aria-hidden="true" />
              เด็กได้ของฟรีที่ใช้ได้จริง ต่อให้ไม่ซื้ออะไรเลย
            </p>
          </div>
          <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            {AUDIENCE_SEGMENTS.map((entry) => {
              const entryWorksheet = getWorksheetForSegment(entry.id);
              return (
                <div key={entry.id} className="grid gap-2 py-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center sm:gap-4">
                  <span className="font-space-mono text-[10px] font-bold tracking-[0.16em] text-orange-300/70">{entry.keyword}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-stone-200">{entry.thaiLabel}</p>
                    <p className="mt-1 text-xs text-stone-500">{entryWorksheet?.thaiTitle}</p>
                  </div>
                  <Link href={worksheetPath(entry.worksheetSlug)} target="_blank" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-orange-200 hover:text-orange-100">
                    เปิด<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
