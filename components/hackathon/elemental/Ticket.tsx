import type { CSSProperties } from "react";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateShort } from "@/components/hackathon/poster/elemental/facts";

import styles from "./join/join.module.css";
import type { RecoveredPlace } from "./places";

type Props = {
  who: string;
  people: string;
  place: RecoveredPlace;
  number: string;
};

/** Radius of the half-circle cut out of each side at the tear line. */
const NOTCH = 16;

/**
 * Real holes, not painted circles: each half of the ticket is masked with a
 * half-circle at both ends of the tear line, so whatever is behind the ticket
 * (the cream page, a dark screen, a screenshot's background) shows through.
 */
function cutAt(edge: "top" | "bottom"): CSSProperties {
  const y = edge === "top" ? "0" : "100%";
  const hole = (x: string) => `radial-gradient(circle ${NOTCH}px at ${x} ${y}, transparent ${NOTCH - 0.5}px, #000 ${NOTCH}px)`;
  const mask = `${hole("0")} left / 51% 100% no-repeat, ${hole("100%")} right / 51% 100% no-repeat`;
  return { WebkitMask: mask, mask };
}

function Stub({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px]" style={{ color: EL.creamSoft }}>{label}</p>
      <p className="mt-1 text-sm" style={mono ? { fontFamily: EL_FONT.mono, letterSpacing: "0.08em" } : undefined}>
        {children}
      </p>
    </div>
  );
}

/**
 * The paid seat as a ticket: a full-bleed photo of a place that recovered
 * (different for each teammate), the name like a film title, and a stub
 * below a tear line.
 */
export function Ticket({ who, people, place, number }: Props) {
  return (
    // The shadow is a drop-shadow on the wrapper, so it follows the holes (the mask would cut a box-shadow off).
    <div className={`${styles.ticketIn} max-w-md`} style={{ filter: "drop-shadow(0 18px 22px rgba(29,33,31,0.3))" }}>
      <article style={{ color: EL.cream }}>
        <div className="overflow-hidden rounded-t-[28px]" style={{ backgroundColor: EL.char, ...cutAt("bottom") }}>
      <div className="relative aspect-[4/5] overflow-hidden">
        <Image
          src={place.src}
          alt={place.altTh}
          fill
          sizes="(min-width: 480px) 448px, 100vw"
          className={`${styles.kenBurns} object-cover`}
          priority
        />
        {/* Dark at the bottom for the title and at the top for the place name, so both read on any photo. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${EL.char} 2%, rgba(29,33,31,0.55) 30%, rgba(29,33,31,0) 58%), linear-gradient(to bottom, rgba(29,33,31,0.6) 0%, rgba(29,33,31,0) 22%)`,
          }}
        />
        <p className="absolute left-5 top-5 text-xs sm:left-6" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
          {place.nameTh}
        </p>
        <div className={`${styles.titleIn} absolute inset-x-5 bottom-5 sm:inset-x-6`}>
          <p className="text-5xl sm:text-6xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300, fontStyle: "italic", lineHeight: 1 }}>
            {ELEMENTAL.edition}
          </p>
          <p className="mt-4 break-words text-2xl sm:text-3xl" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
            {who}
          </p>
          <p className="mt-1 text-sm" style={{ color: EL.creamSoft }}>{people}</p>
        </div>
      </div>

      <div className="px-5 pb-4 pt-1 sm:px-6">
        <p className="text-sm" style={{ color: EL.creamSoft }}>{place.storyTh}</p>
      </div>
        </div>

        {/* -1px: the halves overlap by a pixel, so no hairline of page shows between them at a fractional height. */}
        <div className="-mt-px rounded-b-[28px]" style={{ backgroundColor: EL.char, ...cutAt("top") }}>
      <div className="mx-6 border-t-2 border-dashed" style={{ borderColor: "rgba(243,239,230,0.22)" }} />

      <div className="grid grid-cols-3 gap-4 px-5 pb-5 pt-5 sm:px-6">
        <Stub label="วันงาน">{thaiDateShort()}</Stub>
        <Stub label="ที่ไหน">{ELEMENTAL.venueShort}</Stub>
        <Stub label="เลขที่" mono>
          {number}
        </Stub>
        {/* No price: this is the part people screenshot and share. */}
        <span className="col-span-3 inline-flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-5 w-5" style={{ color: EL.toxicGreen }} aria-hidden="true" /> ชำระแล้ว
        </span>
        <a
          href={place.creditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-3 -mt-2 text-[10px]"
          style={{ color: EL.creamSoft }}
        >
          {place.credit}
        </a>
      </div>
        </div>
      </article>
    </div>
  );
}
