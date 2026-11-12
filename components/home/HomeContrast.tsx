import { Check, X } from "lucide-react";

import type { ReactNode } from "react";

import { HairlineColumns, INK, RisoHeading, paper } from "@/components/shift/ShiftRiso";
import { floatClass, revealClass } from "@/components/shift/round/motion";
import { CertStackArt, LiveWindowArt } from "@/components/shift/round/ShiftArt";
import { HOME_CONTRAST, HOME_NOTES } from "@/lib/content/home";
import { MarginNote } from "./MarginNote";

function ContrastColumn({
  label,
  items,
  positive,
  art,
}: {
  label: string;
  items: string[];
  positive: boolean;
  art: ReactNode;
}) {
  const Icon = positive ? Check : X;
  return (
    <div className={revealClass(positive ? 1 : 0)}>
      <div
        className={`mb-8 flex h-44 items-center justify-center ${floatClass(positive ? 1 : 0)}`}
        style={positive ? undefined : { filter: "grayscale(1)" }}
      >
        {art}
      </div>
      <p
        className="mb-5 flex items-center gap-2 text-sm font-semibold"
        style={{ color: positive ? INK.yellow : paper("73") }}
      >
        <Icon className="h-4 w-4" /> {label}
      </p>
      <ul className="space-y-4" style={{ color: positive ? INK.paper : paper("80") }}>
        {items.map((item) => (
          <li key={item} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeContrast() {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading>
        กรรมการเห็นใบเซอร์แบบเดียวกันเป็นพันใบ
      </RisoHeading>
      <div className="mt-10">
        <HairlineColumns cols={2}>
          <ContrastColumn label="ค่ายนั่งฟังทั่วไป" items={HOME_CONTRAST.camp} positive={false} art={<CertStackArt />} />
          <ContrastColumn label="SHIFT" items={HOME_CONTRAST.shift} positive art={<LiveWindowArt />} />
        </HairlineColumns>
      </div>
      <MarginNote className="mt-10">{HOME_NOTES.contrast}</MarginNote>
    </section>
  );
}
