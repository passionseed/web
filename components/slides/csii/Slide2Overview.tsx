"use client";

import React from "react";
import { ArrowRight, FileCheck2, TimerReset, UsersRound } from "lucide-react";
import { SlideFrame } from "./SlideFrame";

const stages = [
  {
    label: "The opening",
    title: "TCAS Round 1",
    body: "A rare window where a student can build something real inside the admissions process.",
    icon: TimerReset,
  },
  {
    label: "The program",
    title: "ProjectSeed",
    body: "A deadline-bound build program with group guidance and real-user contact.",
    icon: UsersRound,
  },
  {
    label: "The outcome",
    title: "Proof of work",
    body: "A functioning project, documented learning, and evidence the student can explain.",
    icon: FileCheck2,
  },
];

export function Slide2Overview() {
  return (
    <SlideFrame number={2} section="Project Overview" source="ProjectSeed Strategy, approved 26 Jul and amended 29 Jul 2026">
      <div className="flex h-full min-h-0 flex-col justify-center py-5 lg:py-7">
        <div className="max-w-5xl">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#fed95c] sm:text-xs">Project overview</p>
          <h2 className="mt-3 font-kodchasan text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-6xl">Turn the portfolio window into real work</h2>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-300 sm:text-base lg:text-xl">Parents buy lower deadline risk. Students author the project. PassionSeed supplies the structure, community, and evidence discipline.</p>
        </div>

        <div className="mt-7 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3 lg:mt-10 lg:gap-5">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <React.Fragment key={stage.title}>
                <article className="flex min-h-[190px] flex-col justify-between rounded-2xl border border-white/12 bg-white/[0.045] p-5 lg:min-h-[230px] lg:p-7">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#fed95c] sm:text-xs">{stage.label}</p>
                      <Icon aria-hidden="true" className="h-5 w-5 text-sky-300 lg:h-6 lg:w-6" />
                    </div>
                    <h3 className="mt-5 font-kodchasan text-xl font-semibold text-white sm:text-2xl lg:text-3xl">{stage.title}</h3>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-slate-300 sm:text-sm lg:text-base">{stage.body}</p>
                </article>
                {index < stages.length - 1 ? (
                  <div className="flex items-center justify-center"><ArrowRight aria-hidden="true" className="h-5 w-5 text-[#fed95c] lg:h-7 lg:w-7" /></div>
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-l-2 border-[#fed95c] bg-[linear-gradient(90deg,rgba(254,217,92,0.1),rgba(254,217,92,0.025),transparent)] px-5 py-3 text-xs sm:text-sm lg:text-base">
          <p><span className="font-semibold text-white">Promise:</span> the project ships with real users interviewed.</p>
          <p><span className="font-semibold text-white">Boundary:</span> no admission guarantee and no ghostwritten artifact.</p>
        </div>
      </div>
    </SlideFrame>
  );
}
