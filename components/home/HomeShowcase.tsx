import { ArrowUpRight } from "lucide-react";

import { INK, RisoHeading, inkFor, paper } from "@/components/shift/ShiftRiso";
import { revealClass } from "@/components/shift/round/motion";
import { HOME_NOTES, HOME_SHOWCASE, type HomeShowcaseProject } from "@/lib/content/home";
import { MarginNote } from "./MarginNote";
import { ShowcasePhone } from "./ShowcasePhone";

function ShowcaseCard({ project, index }: { project: HomeShowcaseProject; index: number }) {
  return (
    <article className={`${revealClass(index)} flex w-[74%] shrink-0 snap-center flex-col sm:w-auto`}>
      <ShowcasePhone title={project.title} shots={project.shots} index={index} />
      <h3 className="mt-8 font-kodchasan text-xl font-semibold">{project.title}</h3>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: paper("b3") }}>
        {project.pitch}
      </p>
      {project.proof && (
        <p
          className="mt-4 border-l-2 pl-3 text-xs font-semibold leading-relaxed"
          style={{ borderColor: inkFor(index), color: INK.yellow }}
        >
          {project.proof}
        </p>
      )}
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex w-fit items-center gap-1.5 text-sm font-semibold underline decoration-[rgba(255,72,176,0.6)] decoration-2 underline-offset-[6px] transition hover:decoration-[rgba(255,72,176,1)]"
      >
        ลองใช้ของจริง <ArrowUpRight className="h-4 w-4" />
      </a>
    </article>
  );
}

/** What a week actually produces: the pilot's apps, live, on real screens. */
export function HomeShowcase() {
  if (HOME_SHOWCASE.length === 0) return null;
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>ของจริงที่รุ่นแรกปล่อยใน 7 วัน</RisoHeading>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: paper("99") }}>
        ทั้งหมดนี้น้องม.ปลายสร้างเองใน SHIFT[0] และยังเปิดให้คนใช้อยู่ตอนนี้ แตะที่จอเพื่อดูอีกหน้า
      </p>
      {/* Phones swipe sideways on mobile instead of stacking three screens tall. */}
      <div className="-mx-5 mt-14 flex snap-x snap-mandatory gap-8 overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-14 sm:overflow-visible sm:px-0 lg:grid-cols-3 lg:gap-10">
        {HOME_SHOWCASE.map((project, i) => (
          <ShowcaseCard key={project.url} project={project} index={i} />
        ))}
      </div>
      <MarginNote className="mt-12">{HOME_NOTES.showcase}</MarginNote>
    </section>
  );
}
