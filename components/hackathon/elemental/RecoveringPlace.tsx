import Image from "next/image";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import { PLACES } from "./places";

/** Maya Bay, washed out on the first sign-up step; each paid ticket shows a recovered place in full colour. */
const RECOVERED_PLACE = PLACES[0];

/**
 * `restored` runs from 0 (grey) to 1 (full colour). Square, with the caption
 * under the photo rather than on it (the brand keeps labels off the image).
 * Colours come from the page's surface (share/ui.tsx), so use it inside <Page>.
 */
export function RecoveringPlace({ restored, className = "" }: { restored: number; className?: string }) {
  const r = Math.min(1, Math.max(0, restored));
  return (
    <figure className={className}>
      <div className="relative h-24 overflow-hidden rounded-[2px] sm:h-36" style={{ backgroundColor: EL.char }}>
        <Image
          src={RECOVERED_PLACE.src}
          alt={RECOVERED_PLACE.altTh}
          fill
          sizes="(min-width: 640px) 576px, 100vw"
          className="object-cover"
          style={{
            objectPosition: "50% 58%",
            filter: `grayscale(${1 - r}) saturate(${0.6 + 0.5 * r}) brightness(${0.85 + 0.15 * r})`,
          }}
          priority
        />
      </div>
      <figcaption className="mt-2 text-pretty" style={{ fontFamily: EL_FONT.body, fontSize: 13, lineHeight: "20px", color: "var(--el-fine)" }}>
        {RECOVERED_PLACE.nameTh} {RECOVERED_PLACE.storyTh} ·{" "}
        <a href={RECOVERED_PLACE.creditUrl} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap underline-offset-4 hover:underline">
          {RECOVERED_PLACE.credit}
        </a>
      </figcaption>
    </figure>
  );
}
