import { ArrowUpRight } from "lucide-react";

import { RisoHeading } from "@/components/shift/ShiftRiso";
import type { ShiftArtKind } from "@/components/shift/theme";
import { T, accentFor, tint } from "@/components/shift/theme/tokens";
import {
  previousShowcaseCohort,
  type ShiftCohort,
  type ShiftShowcaseProject,
} from "@/lib/content/shift-cohort";

import { ShiftIcon } from "./ShiftIcon";
import { ShowcaseLoop } from "./ShowcaseLoop";
import { floatClass, revealClass } from "./motion";

/** Bare host, e.g. "magnified-lens-2uoi.vercel.app", so the link reads as a real site. */
function hostOf(url: string): string {
  return new URL(url).host;
}

/**
 * One shipped project. The host link stretches over the whole card, so the
 * card is one click target while the loop's pause button stays its own.
 */
export function ShowcaseCard({ project, i, kind }: { project: ShiftShowcaseProject; i: number; kind: ShiftArtKind }) {
  return (
    <article
      className={`shift-tile ${revealClass(i)} group relative flex flex-col overflow-hidden`}
      style={{ borderTop: `3px solid ${accentFor(i)}` }}
    >
      {project.loop && <ShowcaseLoop {...project.loop} title={project.title} />}
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {!project.loop && (
          <ShiftIcon kind={kind} name="live" ink={accentFor(i)} size={44} className={`${floatClass(i)} mb-5`} />
        )}
        <h3 className="font-kodchasan text-2xl font-semibold">{project.title}</h3>
        {project.pitch && (
          <p className="mt-2 text-sm font-semibold leading-relaxed" style={{ color: tint("d9") }}>
            {project.pitch}
          </p>
        )}
        {project.detail && (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: tint("99") }}>
            {project.detail}
          </p>
        )}
        {project.proof && (
          <p className="mt-4 border-l-2 pl-3 text-xs font-semibold leading-relaxed" style={{ borderColor: accentFor(i), color: T.accent3 }}>
            {project.proof}
          </p>
        )}
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`ลองใช้ ${project.title}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-6 font-mono text-xs underline decoration-2 underline-offset-4 after:absolute after:inset-0"
          style={{ color: tint("b3"), textDecorationColor: accentFor(i) }}
        >
          {hostOf(project.url)}
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>
    </article>
  );
}

/**
 * Live projects a round shipped. Featured ones get the full story (what,
 * how, proof, and a screen loop when there is one); the rest are plain
 * links. A round that has not shipped yet shows the round before it, so a
 * visitor sees real work before they apply. Titles only, never names: the
 * builders are minors.
 */
export function ShiftShowcase({ cohort, kind }: { cohort: ShiftCohort; kind: ShiftArtKind }) {
  const source = cohort.showcase?.length ? cohort : previousShowcaseCohort(cohort);
  const projects = source?.showcase ?? [];
  if (!source || !projects.length) return null;
  const own = source === cohort;
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <section id="showcase" className="scroll-mt-20 py-16 sm:py-24">
      <RisoHeading eyebrow={own ? "Shipped" : `Shipped by ${source.name}`}>
        {own ? `${cohort.name} ปล่อยของจริง ${projects.length} ชิ้น` : `รุ่นก่อนปล่อยของจริง ${projects.length} ชิ้นใน 7 วัน`}
      </RisoHeading>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: tint("99") }}>
        {own
          ? "ทุกชิ้นเปิดใช้ได้จริงตอนนี้ กดลองได้เลย"
          : `จาก Demo Day ของ ${source.name} ทุกชิ้นยังเปิดให้ใช้จริง กดลองได้เลย`}
      </p>

      <div className={`mt-10 grid gap-4 ${featured.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {featured.map((project, i) => (
          <ShowcaseCard key={project.url} project={project} i={i} kind={kind} />
        ))}
      </div>

      {rest.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {rest.map((project, i) => (
            <li key={project.url}>
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`shift-tile ${revealClass(i)} flex items-center justify-between gap-4 px-5 py-4`}
              >
                <span className="font-kodchasan text-lg font-semibold">{project.title}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-xs" style={{ color: tint("80") }}>
                  {hostOf(project.url)}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
