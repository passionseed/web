import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { INK, RisoHeading, inkFor, paper } from "@/components/shift/ShiftRiso";
import { ShowcaseCard } from "@/components/shift/round/ShiftShowcase";
import { revealClass } from "@/components/shift/round/motion";
import {
  HOME_LATEST_SHOWCASE,
  HOME_NOTES,
  HOME_SHOWCASE,
  type HomeShowcaseProject,
} from "@/lib/content/home";
import { cohortPath, formatThaiDate, type ShiftCohort } from "@/lib/content/shift-cohort";
import { MarginNote } from "./MarginNote";
import { ShowcasePhone } from "./ShowcasePhone";

/** Swipe sideways on phones instead of stacking three tall items. */
const SWIPE_ROW =
  "-mx-5 flex snap-x snap-mandatory overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-14 text-sm font-semibold" style={{ color: INK.pink }}>
      {children}
    </p>
  );
}

function PhoneCard({ project, index }: { project: HomeShowcaseProject; index: number }) {
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

/** The newest round's Demo Day: screen loops of the apps, then a link to all of them. */
function LatestRound({ cohort }: { cohort: ShiftCohort }) {
  const projects = cohort.showcase ?? [];
  const featured = projects.filter((p) => p.featured);
  return (
    <>
      <GroupLabel>
        {cohort.name} · Demo Day {formatThaiDate(cohort.endDate, false)}
      </GroupLabel>
      <div className={`${SWIPE_ROW} mt-6 gap-4 sm:grid-cols-2 ${featured.length > 2 ? "lg:grid-cols-3" : ""}`}>
        {featured.map((project, i) => (
          <div key={project.url} className="grid w-[82%] shrink-0 snap-center sm:w-auto">
            <ShowcaseCard project={project} i={i} kind="riso" />
          </div>
        ))}
      </div>
      {projects.length > featured.length && (
        <Link
          href={`${cohortPath(cohort)}#showcase`}
          className="mt-6 inline-flex items-center gap-2 py-2 text-sm font-semibold underline decoration-[rgba(255,72,176,0.6)] decoration-2 underline-offset-8 transition hover:decoration-[rgba(255,72,176,1)]"
          style={{ color: INK.yellow }}
        >
          ดูครบทั้ง {projects.length} ชิ้นของ {cohort.name} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </>
  );
}

/** What a week actually produces: real apps from the pilot and the newest round, live now. */
export function HomeShowcase() {
  if (HOME_SHOWCASE.length === 0 && !HOME_LATEST_SHOWCASE) return null;
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>ของจริงที่ ม.ปลาย ปล่อยใน 7 วัน</RisoHeading>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: paper("99") }}>
        ทุกชิ้นสร้างเองใน SHIFT และยังเปิดให้คนใช้อยู่ตอนนี้ กดลองได้เลย
      </p>

      {HOME_SHOWCASE.length > 0 && (
        <>
          <GroupLabel>SHIFT[0] · รุ่นแรก · แตะที่จอเพื่อดูอีกหน้า</GroupLabel>
          <div className={`${SWIPE_ROW} mt-10 gap-8 sm:grid-cols-2 sm:gap-14 lg:grid-cols-3 lg:gap-10`}>
            {HOME_SHOWCASE.map((project, i) => (
              <PhoneCard key={project.url} project={project} index={i} />
            ))}
          </div>
        </>
      )}

      {HOME_LATEST_SHOWCASE && <LatestRound cohort={HOME_LATEST_SHOWCASE} />}

      <MarginNote className="mt-12">{HOME_NOTES.showcase}</MarginNote>
    </section>
  );
}
