import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StageSprite } from "@/components/shift/island/StageSprite";
import { ISLAND_STAGES, SHIFT_ISLAND } from "@/lib/content/shift-island";
import { SEAL } from "@/lib/content/shift-island-invite";
import type { IslandViewer } from "@/lib/shift/islandInvite";

const ISLAND_HREF = "/shift/island";

interface IslandLink {
  href: string;
  label: string;
}

export interface IslandCta {
  primary: IslandLink;
  /** A quieter second door, e.g. alumni who haven't confirmed yet. */
  secondary: IslandLink | null;
  note: string | null;
}

/**
 * What the hero's button promises, by where the visitor stands with the
 * island (lib/shift/islandInvite.ts). /shift/island itself decides between the
 * invitation and the game, so every island link goes there; only the words
 * change, and someone who never did SHIFT is sent to SHIFT first.
 * `null` (the viewer couldn't be read) falls back to the island's own gate.
 */
export function islandCta(viewer: IslandViewer["kind"] | null): IslandCta {
  switch (viewer) {
    case "notAlumni":
      return {
        primary: { href: "/shift", label: SEAL.applyCta },
        secondary: { href: "/shift/island/verify", label: `เคยผ่าน SHIFT แล้ว? ${SEAL.alumniCta}` },
        note: SHIFT_ISLAND.entry,
      };
    case "canRsvp":
      return { primary: { href: ISLAND_HREF, label: "เปิดจดหมายเชิญ" }, secondary: null, note: null };
    case "closed":
      return { primary: { href: ISLAND_HREF, label: "ดูเกาะ" }, secondary: null, note: SEAL.closed };
    default:
      return { primary: { href: ISLAND_HREF, label: "เข้าเกาะ" }, secondary: null, note: null };
  }
}

/** /me's hero: the SHIFT High Island is the one thing we push. */
export function IslandLinkCard({ viewer }: { viewer: IslandViewer["kind"] | null }) {
  const cta = islandCta(viewer);
  return (
    <section aria-labelledby="me-island-heading" className="ei-card ei-card--static overflow-hidden p-0">
      <Link href={ISLAND_HREF} tabIndex={-1} aria-hidden="true" className="block border-b border-white/10 bg-[#3f87a6]">
        <Image
          src={SHIFT_ISLAND.sample.src}
          width={SHIFT_ISLAND.sample.width}
          height={SHIFT_ISLAND.sample.height}
          alt=""
          loading="eager"
          fetchPriority="high"
          unoptimized
          className="h-auto w-full"
          style={{ imageRendering: "pixelated" }}
        />
      </Link>

      <div className="p-5 sm:p-9">
        <p className="dawn-eyebrow">{SHIFT_ISLAND.eyebrow}</p>
        <h1 id="me-island-heading" className="mt-2 text-2xl font-bold leading-snug text-white sm:text-4xl">
          {SHIFT_ISLAND.heading}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-white/75">{SHIFT_ISLAND.lede}</p>

        <div className="mt-5 flex flex-wrap items-end gap-0.5" aria-hidden="true">
          {ISLAND_STAGES.map((stage, index) => (
            <StageSprite key={stage} stage={index} scale={1} />
          ))}
        </div>
        <p className="mt-2 text-sm text-white/55">{SHIFT_ISLAND.stages}</p>

        <Link href={cta.primary.href} className="ei-button-dawn mt-7 inline-flex min-h-12 items-center gap-2">
          <span>{cta.primary.label}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {cta.note ? <p className="mt-3 text-sm text-white/55">{cta.note}</p> : null}
        {cta.secondary ? (
          <div className="mt-4">
            <Link href={cta.secondary.href} className="my-path-text-link inline-flex items-center gap-1 text-sm">
              {cta.secondary.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
