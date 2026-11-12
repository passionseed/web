import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RisoIcon, type RisoIconName } from "@/components/shift/poster/RisoIcons";
import { INK, RisoHeading, inkFor } from "@/components/shift/ShiftRiso";
import { floatClass } from "@/components/shift/round/motion";
import { HOME_DELIVERABLES, HOME_NOTES } from "@/lib/content/home";
import { getEffectiveCohort } from "@/lib/content/shift-cohort";
import { MarginNote } from "./MarginNote";
import { WeekStepper } from "./WeekStepper";

const DELIVERABLE_ICONS: RisoIconName[] = ["live", "metrics", "caseStudy"];

function Deliverables() {
  return (
    <ul className="mt-14 grid gap-8 sm:grid-cols-3">
      {HOME_DELIVERABLES.map((item, i) => (
        <li key={item} className="flex items-center gap-4">
          <RisoIcon name={DELIVERABLE_ICONS[i]} ink={inkFor(i)} size={44} className={floatClass(i)} />
          <span className="font-kodchasan text-lg font-semibold leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function HomeWeek() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>7 วัน วันละหนึ่งงาน ทุกวันมีของต้องส่ง</RisoHeading>
      <div className="mt-10">
        <WeekStepper schedule={getEffectiveCohort().schedule} />
      </div>

      <p className="mt-16 font-kodchasan text-lg font-semibold" style={{ color: INK.pink }}>
        ครบ 7 วัน ถือของ 3 ชิ้นนี้ออกไป
      </p>
      <Deliverables />

      <div className="mt-12 flex flex-wrap items-center gap-6">
        <Link
          href="/shift"
          className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] underline decoration-[rgba(255,72,176,0.6)] decoration-2 underline-offset-8 transition hover:decoration-[rgba(255,72,176,1)]"
          style={{ color: INK.yellow }}
        >
          ดูตารางเต็มทั้ง 7 วัน <ArrowRight className="h-4 w-4" />
        </Link>
        <MarginNote>{HOME_NOTES.week}</MarginNote>
      </div>
    </section>
  );
}
