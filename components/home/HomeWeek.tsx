import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { RisoIcon, type RisoIconName } from "@/components/shift/poster/RisoIcons";
import { HairlineColumns, INK, RisoHeading, inkFor, paper } from "@/components/shift/ShiftRiso";
import { HOME_DELIVERABLES, HOME_NOTES, HOME_WEEK } from "@/lib/content/home";
import { MarginNote } from "./MarginNote";

const DELIVERABLE_ICONS: RisoIconName[] = ["live", "metrics", "caseStudy"];

function Deliverables() {
  return (
    <ul className="mt-14 grid gap-8 sm:grid-cols-3">
      {HOME_DELIVERABLES.map((item, i) => (
        <li key={item} className="flex items-center gap-4">
          <RisoIcon name={DELIVERABLE_ICONS[i]} ink={inkFor(i)} size={44} />
          <span className="font-kodchasan text-lg font-semibold leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function HomeWeek() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="How SHIFT Works">7 วัน วันละหนึ่งงาน ทุกวันมีของต้องส่ง</RisoHeading>
      <div className="mt-10">
        <HairlineColumns>
          {HOME_WEEK.map((beat) => (
            <div key={beat.days}>
              <p
                className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: INK.orange }}
              >
                {beat.days}
              </p>
              <h3 className="mt-2 font-kodchasan text-2xl font-semibold leading-snug">{beat.title}</h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: paper("99") }}>
                {beat.body}
              </p>
            </div>
          ))}
        </HairlineColumns>
      </div>

      <p className="mt-16 font-mono text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: INK.pink }}>
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
