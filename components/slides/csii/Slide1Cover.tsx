"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { CAPSTONE_META } from "@/lib/slide/csii-data";

export function Slide1Cover() {
  return (
    <section className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#000006_0%,#05091d_62%,#17204d_100%)] px-10 py-8 text-white sm:px-12 sm:py-10 lg:px-16 lg:py-12">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "linear-gradient(to bottom, black, transparent 78%)",
        }}
      />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[42%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(254,217,92,0.22)_0%,rgba(59,130,246,0.09)_34%,transparent_72%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#fed95c] to-transparent shadow-[0_0_30px_rgba(254,217,92,0.65)]" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 sm:text-xs">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#fed95c] shadow-[0_0_10px_rgba(254,217,92,0.65)]" />
            <span>CSII / BAScii 2026-2027</span>
          </div>
          <span>Project slide deck</span>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-12 items-center gap-8 py-6 lg:gap-12">
          <div className="col-span-8">
            <p className="mb-5 font-mono text-xs font-bold uppercase tracking-[0.24em] text-[#fed95c] sm:text-sm">PassionSeed presents</p>
            <h1 className="max-w-5xl font-kodchasan text-5xl font-bold leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-8xl">ProjectSeed</h1>
            <p className="mt-6 max-w-3xl text-xl font-medium leading-snug text-slate-200 sm:text-2xl lg:text-4xl">Real projects. Real users. Evidence students can defend.</p>
            <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-white/75 sm:text-base">
              <span>TCAS portfolio pressure</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 text-[#fed95c]" />
              <span>student-authored proof of work</span>
            </div>
          </div>

          <aside className="col-span-4 border-l border-[#fed95c]/35 pl-6 lg:pl-10">
            <p className="font-kodchasan text-2xl font-semibold leading-snug text-[#fed95c] sm:text-3xl lg:text-4xl">Build the artifact,<br />not the certificate.</p>
            <dl className="mt-8 space-y-4 text-sm sm:text-base">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 sm:text-xs">Stage</dt>
                <dd className="mt-1 font-semibold text-white">{CAPSTONE_META.stage}</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 sm:text-xs">Presenter</dt>
                <dd className="mt-1 font-semibold text-white">{CAPSTONE_META.presenter}</dd>
              </div>
            </dl>
          </aside>
        </div>

        <footer className="flex items-end justify-between border-t border-white/10 pt-3 text-[10px] text-white/45 sm:text-xs">
          <span>{CAPSTONE_META.institution}</span>
          <span className="font-mono text-[#fed95c]">Submitted {CAPSTONE_META.submissionDeadline}</span>
        </footer>
      </div>
    </section>
  );
}
