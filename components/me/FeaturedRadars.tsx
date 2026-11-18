import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { FeaturedRadar } from "@/lib/radar/featured";

export const FEATURED_RADARS_COPY = {
  title: "ลองส่องอาชีพ",
  body: "Career Radar พาไปดูว่างานจริงของแต่ละอาชีพหน้าตาเป็นยังไง",
  playable: "มีด่านให้เล่น",
  all: "ดูทุกอาชีพ",
} as const;

/** A few Radar careers to open from /me. Renders nothing when Radar can't be read. */
export function FeaturedRadars({ radars }: { radars: FeaturedRadar[] }) {
  if (radars.length === 0) return null;

  return (
    <section aria-labelledby="me-radars-heading" className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="me-radars-heading" className="text-lg font-semibold text-white">
            {FEATURED_RADARS_COPY.title}
          </h2>
          <p className="mt-1 text-sm text-white/65">{FEATURED_RADARS_COPY.body}</p>
        </div>
        <Link href="/radar" className="my-path-text-link inline-flex shrink-0 items-center gap-1">
          {FEATURED_RADARS_COPY.all}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {radars.map((radar) => (
          <li key={radar.slug}>
            <RadarTile radar={radar} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RadarTile({ radar }: { radar: FeaturedRadar }) {
  return (
    <Link
      href={radar.href}
      className="flex h-full min-h-[72px] items-start gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-4 transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring-color-dawn)] active:bg-white/[0.1]"
    >
      <span aria-hidden="true" className="text-2xl leading-none">
        {radar.emoji ?? "🧭"}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-white">{radar.nameTh}</span>
          {radar.playable ? (
            <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-xs font-medium text-amber-200">
              {FEATURED_RADARS_COPY.playable}
            </span>
          ) : null}
        </span>
        {radar.taglineTh ? (
          <span className="mt-1 line-clamp-2 block text-sm text-white/65">{radar.taglineTh}</span>
        ) : null}
      </span>
    </Link>
  );
}
