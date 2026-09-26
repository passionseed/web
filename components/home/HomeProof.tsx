import { ShieldCheck } from "lucide-react";

import { INK, MISREG_TEXT, RisoHeading, inkFor, paper } from "@/components/shift/ShiftRiso";
import { HOME_NOTES } from "@/lib/content/home";
import { SHIFT_TESTIMONIAL_GROUPS } from "@/lib/content/shift-testimonials";
import { MarginNote } from "./MarginNote";

/** One voice per track: tech, business, engineering. */
const FEATURED = SHIFT_TESTIMONIAL_GROUPS.map((group) => group.cards[0]);

function StudentCount({ count }: { count: number }) {
  return (
    <div className="mt-10 flex items-baseline gap-4">
      <span className="font-kodchasan text-6xl font-bold sm:text-7xl" style={MISREG_TEXT}>
        {count.toLocaleString("en-US")}
      </span>
      <span className="text-base" style={{ color: paper("99") }}>
        น้องๆ ที่เคยลงมือกับ PassionSeed
      </span>
    </div>
  );
}

export function HomeProof({ studentCount }: { studentCount: number | null }) {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="Proof of Execution">เสียงจริงจากรุ่นพี่ที่ลงมือสร้าง</RisoHeading>
      {studentCount ? <StudentCount count={studentCount} /> : null}

      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {FEATURED.map((card, i) => (
          <figure key={card.name} className="flex flex-col border-l-2 pl-5" style={{ borderColor: inkFor(i) }}>
            <blockquote className="flex-1 text-sm leading-relaxed" style={{ color: paper("d9") }}>
              &ldquo;{card.quote}&rdquo;
            </blockquote>
            <p className="mt-4 text-xs font-semibold leading-relaxed" style={{ color: INK.yellow }}>
              {card.shift}
            </p>
            <figcaption className="mt-3">
              <p className="text-sm font-semibold">{card.name}</p>
              <p className="mt-0.5 text-xs" style={{ color: paper("80") }}>
                {card.meta}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <p className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: paper("80") }}>
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: INK.yellow }} />
          จากฟอร์มประเมินหลังจบ TechSeed #3, #5 และบันทึกวิเคราะห์พอร์ตรายบุคคล
        </p>
        <MarginNote>{HOME_NOTES.proof}</MarginNote>
      </div>
    </section>
  );
}
