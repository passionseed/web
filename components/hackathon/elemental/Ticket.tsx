import Image from "next/image";
import type { CSSProperties } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, thaiDateShort } from "@/components/hackathon/poster/elemental/facts";

import styles from "./join/join.module.css";
import type { RecoveredPlace } from "./places";
import { Fine, PixelIcon, surfaceVars } from "./share/ui";

type Props = {
  who: string;
  people: string;
  place: RecoveredPlace;
  number: string;
};

/** The cut-outs on either side of the tear line. */
function Notch({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full ${side === "left" ? "-left-4" : "-right-4"}`}
      style={{ backgroundColor: EL.cream }}
    />
  );
}

function Stub({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <Fine>{label}</Fine>
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
    <article
      className={`${styles.ticketIn} relative max-w-md overflow-hidden rounded-[28px]`}
      // A dark object on the cream page: its small text takes the ground's colours (Fine reads --el-fine).
      style={{ ...surfaceVars("ground"), backgroundColor: EL.char, color: EL.cream, boxShadow: "0 30px 60px -30px rgba(29,33,31,0.55)" }}
    >
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
        <span className="absolute left-5 top-5 sm:left-6" style={{ "--el-fine": EL.cream, textShadow: "0 1px 6px rgba(0,0,0,0.6)" } as CSSProperties}>
          <Fine as="span">{place.nameTh}</Fine>
        </span>
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

      <div className="relative">
        <Notch side="left" />
        <Notch side="right" />
        <div className="mx-6 border-t-2 border-dashed" style={{ borderColor: "rgba(243,239,230,0.22)" }} />
      </div>

      <div className="grid grid-cols-3 gap-4 px-5 pb-5 pt-5 sm:px-6">
        <Stub label="วันงาน">{thaiDateShort()}</Stub>
        <Stub label="ที่ไหน">{ELEMENTAL.venueShort}</Stub>
        <Stub label="เลขที่" mono>
          {number}
        </Stub>
        {/* No price: this is the part people screenshot and share. */}
        <span className="col-span-3 inline-flex items-center gap-2 text-sm">
          <PixelIcon name="check" color={EL.toxicGreen} /> ชำระแล้ว
        </span>
        <a href={place.creditUrl} target="_blank" rel="noopener noreferrer" className="col-span-3 -mt-2">
          <Fine as="span">{place.credit}</Fine>
        </a>
      </div>
    </article>
  );
}
