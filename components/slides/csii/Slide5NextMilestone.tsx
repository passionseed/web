"use client";

import React from "react";
import { ArrowRight, BarChart3, RadioTower, ShieldCheck, UserCheck } from "lucide-react";
import { SlideFrame } from "./SlideFrame";

const actions = [
  { title: "Screen people", body: "Appoint and clear the deputy lead and every mentor.", icon: UserCheck },
  { title: "Configure controls", body: "Set reporting, records, group channels, and bot boundaries.", icon: ShieldCheck },
  { title: "Brief and verify", body: "Collect mentor sign-off and parent acknowledgement.", icon: RadioTower },
  { title: "Run and measure", body: "Open a bounded cohort only after the gate closes.", icon: BarChart3 },
];

export function Slide5NextMilestone() {
  return (
    <SlideFrame number={5} section="Next Milestone" source="Batch 1 Launch Gate Tracker and ProjectSeed Strategy risk register">
      <div className="flex h-full min-h-0 flex-col justify-center py-5 lg:py-7">
        <div className="grid grid-cols-12 items-end gap-8">
          <div className="col-span-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#fed95c] sm:text-xs">Next milestone</p>
            <h2 className="mt-3 font-kodchasan text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-6xl">Earn permission to launch Batch 1</h2>
          </div>
          <p className="col-span-4 text-right text-xs leading-relaxed text-slate-400 sm:text-sm lg:text-base">Safety is the critical path. Growth starts after the gate closes.</p>
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-2 lg:mt-10 lg:gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <React.Fragment key={action.title}>
                <article className="rounded-2xl border border-white/12 bg-white/[0.045] p-4 lg:p-6">
                  <Icon aria-hidden="true" className="h-5 w-5 text-[#fed95c] lg:h-7 lg:w-7" />
                  <p className="mt-5 font-mono text-[9px] text-white/40 sm:text-[10px] lg:text-xs">0{index + 1}</p>
                  <h3 className="mt-1 font-kodchasan text-base font-semibold text-white sm:text-lg lg:text-2xl">{action.title}</h3>
                  <p className="mt-3 text-[10px] leading-relaxed text-slate-300 sm:text-xs lg:text-sm">{action.body}</p>
                </article>
                {index < actions.length - 1 ? <div className="flex items-center justify-center"><ArrowRight aria-hidden="true" className="h-4 w-4 text-sky-300 lg:h-6 lg:w-6" /></div> : null}
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-7 grid grid-cols-12 gap-5 lg:mt-9">
          <div className="col-span-7 border-l-2 border-[#fed95c] bg-[linear-gradient(90deg,rgba(254,217,92,0.12),rgba(254,217,92,0.025),transparent)] px-5 py-4">
            <p className="font-kodchasan text-lg font-semibold text-[#fed95c] sm:text-xl lg:text-2xl">Do not open Batch 1 until every gate item is closed.</p>
          </div>
          <div className="col-span-5 grid grid-cols-3 gap-3 text-center">
            {[["Ship rate", "Did projects finish?"], ["User evidence", "Did reality change the work?"], ["Mentor hours", "Can delivery repeat?"]].map(([label, question]) => (
              <div key={label} className="border-t border-sky-300/40 pt-3">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-sky-300 sm:text-[10px] lg:text-xs">{label}</p>
                <p className="mt-2 text-[9px] leading-relaxed text-white/55 sm:text-[10px] lg:text-xs">{question}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideFrame>
  );
}
