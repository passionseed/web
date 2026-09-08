"use client";

import React from "react";
import { AlertTriangle, Check, Code2, LockKeyhole } from "lucide-react";
import { SlideFrame } from "./SlideFrame";

const milestones = [
  { title: "Foundation", status: "Established", detail: "18 months, 4 earlier products, about 1,300 students reached", icon: Check, tone: "text-emerald-300 border-emerald-400/35 bg-emerald-400/10" },
  { title: "Offer", status: "Defined", detail: "M6 primary, 2,990 baht, one tier, shipped-project guarantee", icon: Check, tone: "text-emerald-300 border-emerald-400/35 bg-emerald-400/10" },
  { title: "Hub MVP", status: "In code", detail: "Alumni-first onboarding and project selection, not yet production", icon: Code2, tone: "text-sky-300 border-sky-400/35 bg-sky-400/10" },
  { title: "Safety gate", status: "Gate open", detail: "Tracker snapshot: 2 of 17 done on 1 August 2026", icon: AlertTriangle, tone: "text-amber-200 border-amber-300/40 bg-amber-300/10" },
  { title: "Batch 1", status: "Sale locked", detail: "Current code still blocks sales until the gate is complete", icon: LockKeyhole, tone: "text-rose-300 border-rose-400/40 bg-rose-400/10" },
];

export function Slide4Milestones() {
  return (
    <SlideFrame number={4} section="Milestones and Progress" source="ProjectSeed Strategy; Launch Gate Tracker, 1 Aug; current sale-lock code, checked 3 Sep 2026">
      <div className="flex h-full min-h-0 flex-col justify-center py-5 lg:py-7">
        <div className="max-w-6xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#fed95c] sm:text-xs">Milestones and progress</p>
          <h2 className="mt-3 font-kodchasan text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-6xl">The foundation exists. Launch readiness does not.</h2>
        </div>

        <div className="relative mt-8 lg:mt-12">
          <div aria-hidden="true" className="absolute left-[7%] right-[7%] top-6 h-px bg-gradient-to-r from-emerald-400/70 via-sky-400/50 to-rose-400/60" />
          <div className="relative grid grid-cols-5 gap-3 lg:gap-5">
            {milestones.map((milestone) => {
              const Icon = milestone.icon;
              return (
                <article key={milestone.title} className="min-w-0">
                  <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border ${milestone.tone}`}><Icon aria-hidden="true" className="h-5 w-5" /></div>
                  <h3 className="mt-5 font-kodchasan text-base font-semibold text-white sm:text-lg lg:text-2xl">{milestone.title}</h3>
                  <p className={`mt-2 inline-flex rounded-full border px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.08em] sm:text-[9px] lg:text-[11px] ${milestone.tone}`}>{milestone.status}</p>
                  <p className="mt-3 text-[10px] leading-relaxed text-slate-300 sm:text-xs lg:text-sm">{milestone.detail}</p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-8 border-l-2 border-rose-400 bg-[linear-gradient(90deg,rgba(251,113,133,0.1),transparent)] px-5 py-3 text-xs sm:text-sm lg:text-base">
          <p><span className="font-semibold text-white">Truthful status:</span> historical reach is evidence of delivery experience, not proof that Batch 1 is ready.</p>
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-rose-300 sm:text-[10px] lg:text-xs">Pre-launch validation</span>
        </div>
      </div>
    </SlideFrame>
  );
}
