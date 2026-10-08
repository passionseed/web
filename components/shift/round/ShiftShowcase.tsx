import { ArrowUpRight } from "lucide-react";

import { RisoHeading } from "@/components/shift/ShiftRiso";
import type { ShiftArtKind } from "@/components/shift/theme";
import { T, accentFor, tint } from "@/components/shift/theme/tokens";
import type { ShiftCohort, ShiftShowcaseProject } from "@/lib/content/shift-cohort";

import { ShiftIcon } from "./ShiftIcon";
import { floatClass, revealClass } from "./motion";

/** Bare host, e.g. "magnified-lens-2uoi.vercel.app", so the link reads as a real site. */
function hostOf(url: string): string {
  return new URL(url).host;
}

function FeaturedCard({ project, i, kind }: { project: ShiftShowcaseProject; i: number; kind: ShiftArtKind }) {
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`shift-tile ${revealClass(i)} group flex flex-col p-6 sm:p-7`}
      style={{ borderTop: `3px solid ${accentFor(i)}` }}
    >
      <ShiftIcon kind={kind} name="live" ink={accentFor(i)} size={44} className={floatClass(i)} />
      <h3 className="mt-5 font-kodchasan text-2xl font-semibold">{project.title}</h3>
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
      <span
        className="mt-auto inline-flex items-center gap-1.5 pt-6 font-mono text-xs underline decoration-2 underline-offset-4"
        style={{ color: tint("b3"), textDecorationColor: accentFor(i) }}
      >
        {hostOf(project.url)}
        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </span>
    </a>
  );
}

/**
 * Live projects a finished round shipped. Featured ones get the full story
 * (what, how, proof); the rest are plain links. Titles only, never names:
 * the builders are minors.
 */
export function ShiftShowcase({ cohort, kind }: { cohort: ShiftCohort; kind: ShiftArtKind }) {
  const projects = cohort.showcase ?? [];
  if (!projects.length) return null;
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <section id="showcase" className="scroll-mt-20 py-16 sm:py-24">
      <RisoHeading eyebrow="Shipped">
        {cohort.name} ปล่อยของจริง {projects.length} ชิ้น
      </RisoHeading>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed" style={{ color: tint("99") }}>
        ทุกชิ้นเปิดใช้ได้จริงตอนนี้ กดลองได้เลย
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {featured.map((project, i) => (
          <FeaturedCard key={project.url} project={project} i={i} kind={kind} />
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
