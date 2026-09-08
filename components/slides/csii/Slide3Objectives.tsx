"use client";

import React from "react";
import { SlideFrame } from "./SlideFrame";

const objectives = [
  { no: "01", title: "Ship an authentic artifact", body: "The student builds a functioning project and can defend the choices behind it.", measure: "Evidence: working artifact + student explanation" },
  { no: "02", title: "Test with real users", body: "The student interviews or tests with real people, then records what changed.", measure: "Evidence: user notes + documented iteration" },
  { no: "03", title: "Protect minors by design", body: "Guidance stays in observable group channels with parent-visible safeguards.", measure: "Evidence: all launch-gate items closed" },
  { no: "04", title: "Prove the model can repeat", body: "Batch 1 measures completion, mentor load, price learning, and alumni capacity.", measure: "Evidence: cohort metrics, not anecdotes" },
];

export function Slide3Objectives() {
  return (
    <SlideFrame number={3} section="Key Objectives" source="ProjectSeed Strategy and Minimum Viable Safeguarding Policy">
      <div className="flex h-full min-h-0 flex-col justify-center py-5 lg:py-7">
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#fed95c] sm:text-xs">Key objectives</p>
            <h2 className="mt-3 font-kodchasan text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-6xl">Four objectives define success</h2>
          </div>
          <p className="hidden max-w-sm text-right text-sm leading-relaxed text-slate-400 lg:block">Each objective ends in something a reviewer can inspect.</p>
        </div>

        <div className="mt-7 grid grid-cols-2 border-y border-white/12 lg:mt-10">
          {objectives.map((objective, index) => (
            <article key={objective.no} className={`grid grid-cols-[auto_1fr] gap-4 px-3 py-5 sm:gap-5 sm:px-5 lg:gap-7 lg:px-7 lg:py-8 ${index % 2 === 0 ? "border-r border-white/12" : ""} ${index < 2 ? "border-b border-white/12" : ""}`}>
              <span className="font-mono text-xl font-bold text-[#fed95c] sm:text-2xl lg:text-4xl">{objective.no}</span>
              <div>
                <h3 className="font-kodchasan text-lg font-semibold leading-snug text-white sm:text-xl lg:text-3xl">{objective.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm lg:text-base">{objective.body}</p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.08em] text-sky-300 sm:text-[10px] lg:text-xs">{objective.measure}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}
