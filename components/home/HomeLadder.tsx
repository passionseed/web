import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { HAIR, INK, RisoHeading, inkFor, paper } from "@/components/shift/ShiftRiso";
import { HOME_EXPLORE, HOME_LADDER } from "@/lib/content/home";

function LadderStep({ step, index }: { step: (typeof HOME_LADDER)[number]; index: number }) {
  return (
    <Link href={step.href} className={`group grid gap-3 border-b py-8 sm:grid-cols-[6rem_12rem_1fr] sm:items-baseline ${HAIR}`}>
      <span className="font-mono text-sm font-bold" style={{ color: inkFor(index) }}>
        {step.step}
      </span>
      <span className="flex items-center gap-2 font-kodchasan text-3xl font-bold transition-colors group-hover:text-[#ffe800]">
        {step.name}
        <ArrowUpRight className="h-5 w-5 opacity-50 transition-opacity group-hover:opacity-100" />
      </span>
      <span className="text-sm leading-relaxed" style={{ color: paper("99") }}>
        {step.body}
      </span>
    </Link>
  );
}

function ExploreLinks() {
  return (
    <div className="mt-16">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: INK.pink }}>
        More from PassionSeed
      </p>
      <ul className="mt-6 grid gap-8 md:grid-cols-3">
        {HOME_EXPLORE.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="group block">
              <span className="flex items-center gap-1.5 font-kodchasan text-lg font-semibold transition-colors group-hover:text-[#ffe800]">
                {item.label}
                <ArrowUpRight className="h-4 w-4 opacity-50 group-hover:opacity-100" />
              </span>
              <span className="mt-1.5 block text-sm leading-relaxed" style={{ color: paper("99") }}>
                {item.body}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeLadder() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="The Ladder">จากคนใช้ สู่คนสร้าง</RisoHeading>
      <div className={`mt-10 border-t ${HAIR}`}>
        {HOME_LADDER.map((step, i) => (
          <LadderStep key={step.name} step={step} index={i} />
        ))}
      </div>
      <ExploreLinks />
    </section>
  );
}
