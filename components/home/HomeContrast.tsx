import { Check, X } from "lucide-react";

import type { ReactNode } from "react";

import { HomeHeading, T, tint } from "./homeTheme";
import { floatClass, revealClass } from "@/components/shift/round/motion";
import { CertStackArt, LiveWindowArt } from "@/components/shift/round/ShiftArt";
import { HOME_CONTRAST, HOME_NOTES } from "@/lib/content/home";
import { MarginNote } from "./MarginNote";

/**
 * One side of the comparison. The camp side is grey and dashed, the SHIFT
 * side is lit glass, so the eye lands on the right-hand panel before a
 * word is read.
 */
function ContrastPanel({
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
  const ink = positive ? T.accent1 : tint("80");
  return (
    <div
      className={`${revealClass(positive ? 1 : 0)} rounded-3xl p-6 sm:p-8`}
      style={
        positive
          ? {
              border: `1px solid ${T.accent1}`,
              boxShadow: `0 40px 100px -55px ${T.accent1}, inset 0 1px 0 ${tint("1f")}`,
              background: `linear-gradient(180deg, ${tint("14")}, ${tint("08")})`,
            }
          : { border: `1px dashed ${tint("33")}` }
      }
    >
      <h3 className="flex items-center gap-3 font-kodchasan text-2xl font-bold" style={{ color: positive ? T.text : tint("b3") }}>
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
          style={{ backgroundColor: positive ? T.accent1 : tint("26"), color: positive ? T.bg : T.text }}
        >
          <Icon className="h-4 w-4" strokeWidth={3} />
        </span>
        {label}
      </h3>
      <div
        className={`my-5 flex h-32 items-center justify-center sm:my-7 sm:h-40 ${floatClass(positive ? 1 : 0)}`}
        style={positive ? undefined : { filter: "grayscale(1)", opacity: 0.8 }}
      >
        {art}
      </div>
      <ul className="space-y-3.5" style={{ color: positive ? T.text : tint("b8") }}>
        {items.map((item) => (
          <li key={item} className="grid grid-cols-[20px_1fr] gap-3 leading-relaxed">
            <Icon className="mt-1 h-4 w-4" strokeWidth={2.5} style={{ color: ink }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HomeContrast() {
  return (
    <section className="py-10 sm:py-20">
      <HomeHeading>
        กรรมการเห็นใบเซอร์แบบเดียวกันเป็นพันใบ
      </HomeHeading>
      <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-8">
        <ContrastPanel label="ค่ายนั่งฟังทั่วไป" items={HOME_CONTRAST.camp} positive={false} art={<CertStackArt />} />
        <ContrastPanel label="SHIFT" items={HOME_CONTRAST.shift} positive art={<LiveWindowArt />} />
      </div>
      <MarginNote className="mt-10">{HOME_NOTES.contrast}</MarginNote>
    </section>
  );
}
