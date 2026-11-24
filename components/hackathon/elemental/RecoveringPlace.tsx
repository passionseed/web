import Image from "next/image";

import { EL } from "@/components/hackathon/poster/elemental/brand";

import { PLACES } from "./places";

/** Maya Bay, washed out on the first sign-up step; each paid ticket shows a recovered place in full colour. */
const RECOVERED_PLACE = PLACES[0];

/** `restored` runs from 0 (grey) to 1 (full colour). */
export function RecoveringPlace({ restored, className = "" }: { restored: number; className?: string }) {
  const r = Math.min(1, Math.max(0, restored));
  return (
    <figure className={className}>
      <div className="relative h-20 overflow-hidden rounded-2xl sm:h-36" style={{ backgroundColor: EL.char }}>
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
        <figcaption
          className="absolute bottom-2.5 left-3.5 right-3.5 text-xs sm:text-sm"
          style={{ color: EL.cream, textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}
        >
          {RECOVERED_PLACE.nameTh} {RECOVERED_PLACE.storyTh}
        </figcaption>
      </div>
      <a
        href={RECOVERED_PLACE.creditUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block text-right text-[10px]"
        style={{ color: EL.inkSoft }}
      >
        {RECOVERED_PLACE.credit}
      </a>
    </figure>
  );
}
