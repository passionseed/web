import { ArrowUpRight } from "lucide-react";

import { INK } from "@/components/shift/poster/riso";
import { SHIFT_COHORTS } from "@/lib/content/shift-cohort";

/**
 * Live projects alumni already shipped, from each round's public showcase.
 * Titles and pitches only: students are minors, so no names or handles.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;
const SHOWN = 6;

function showcaseProjects() {
  const all = SHIFT_COHORTS.flatMap((cohort) =>
    (cohort.showcase ?? []).map((project) => ({ ...project, cohort: cohort.name })),
  );
  // Strongest first, then the rest in round order.
  return [...all.filter((p) => p.featured), ...all.filter((p) => !p.featured)].slice(0, SHOWN);
}

export function AlumniShowcase() {
  const projects = showcaseProjects();
  if (projects.length === 0) return null;

  return (
    <section aria-labelledby="alumni-built" className="mt-16">
      <h2 id="alumni-built" className="font-kodchasan text-2xl font-bold">
        ศิษย์เก่าสร้างอะไรไปแล้ว
      </h2>
      <p className="mt-1 text-sm" style={{ color: paper("80") }}>
        ของจริงที่คนใช้ได้ กดลองเล่นได้เลย
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {projects.map((project) => (
          <li key={project.url}>
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-xl p-4 transition-colors hover:bg-white/[0.06]"
              style={{ backgroundColor: paper("0a"), boxShadow: `inset 0 0 0 1px ${paper("1f")}` }}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="font-kodchasan text-lg font-semibold leading-snug">{project.title}</span>
                <ArrowUpRight
                  className="mt-1 h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  style={{ color: INK.yellow }}
                  aria-hidden="true"
                />
              </span>
              {project.pitch && (
                <span className="mt-1 text-sm leading-relaxed" style={{ color: paper("b3") }}>
                  {project.pitch}
                </span>
              )}
              <span className="mt-auto pt-3 text-xs" style={{ color: paper("66") }}>
                {project.cohort}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
