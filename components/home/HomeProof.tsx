import { ShieldCheck } from "lucide-react";

import { INK, MISREG_TEXT, RisoHeading, inkFor, paper } from "@/components/shift/ShiftRiso";
import { HOME_NOTES } from "@/lib/content/home";
import { SHIFT_FEATURED_TESTIMONIALS, SHIFT_TESTIMONIAL_REELS } from "@/lib/content/shift-testimonials";
import { TestimonialQuote } from "@/components/shift/TestimonialQuote";
import { TestimonialReels } from "@/components/shift/TestimonialReels";
import { MarginNote } from "./MarginNote";

function StudentCount({ count }: { count: number }) {
  return (
    <div className="mt-10 flex items-baseline gap-4">
      <span className="font-kodchasan text-6xl font-bold sm:text-7xl" style={MISREG_TEXT}>
        {count.toLocaleString("en-US")}
      </span>
      <span className="text-base" style={{ color: paper("99") }}>
        คนที่เคยมาลุยกับ PassionSeed
      </span>
    </div>
  );
}

export function HomeProof({ studentCount }: { studentCount: number | null }) {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>เสียงจริงจากรุ่นพี่ที่ลงมือสร้าง</RisoHeading>
      {studentCount ? <StudentCount count={studentCount} /> : null}

      <TestimonialReels
        reels={SHIFT_TESTIMONIAL_REELS}
        colors={{ inks: [inkFor(0), inkFor(1)], caption: INK.yellow }}
        className="mt-14"
      />

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        {SHIFT_FEATURED_TESTIMONIALS.map((card, i) => (
          <figure key={card.id ?? card.name} className="flex flex-col border-l-2 pl-5" style={{ borderColor: inkFor(i) }}>
            <TestimonialQuote card={card} style={{ color: paper("d9") }} />
            {card.shift && (
              <p className="mt-4 text-xs font-semibold leading-relaxed" style={{ color: INK.yellow }}>
                {card.shift}
              </p>
            )}
            <figcaption className="mt-3">
              <p className="text-sm font-semibold">{card.name}</p>
              <p className="mt-0.5 text-xs" style={{ color: paper("80") }}>
                {card.meta}
              </p>
              {card.project && (
                <a href={card.project.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block py-3 text-sm underline underline-offset-4" style={{ color: INK.yellow }}>
                  {card.project.title}
                </a>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-6">
        <p className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: paper("80") }}>
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: INK.yellow }} />
          จากคำบอกเล่าหลังจบ SHIFT
        </p>
        <MarginNote>{HOME_NOTES.proof}</MarginNote>
      </div>
    </section>
  );
}
