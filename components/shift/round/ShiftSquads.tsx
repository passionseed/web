import { SKILL_CARD_ART } from "@/components/shift/poster/grid/skillIcons";
import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import type { ShiftArtKind } from "@/components/shift/theme";
import { RisoHeading } from "@/components/shift/ShiftRiso";
import { T, accentFor, tint } from "@/components/shift/theme/tokens";
import {
  SHIFT_DAILY_SHOW,
  SHIFT_SKILL_CARDS,
  teamSizeLabel,
  type ShiftCohort,
} from "@/lib/content/shift-cohort";

import { ShiftIcon } from "./ShiftIcon";
import { floatClass, revealClass } from "./motion";

const SKILL_ICONS: Record<string, RisoIconName> = {
  "Customer Discovery": "chat",
  "Tester Hunt": "search",
  "AI Tools (OpenCode)": "sparkle",
  "Anti Meat Proxy": "judge",
  "Zero-Code Stack": "blocks",
  "Measure 1 Number": "target",
};

const SHOW_ICONS: RisoIconName[] = ["rocket", "bug", "bulb"];

function SubHeading({ children }: { children: string }) {
  return (
    <h3 className="font-kodchasan text-xl font-semibold" style={{ color: T.accent3 }}>
      {children}
    </h3>
  );
}

/** Skill menu as a grid of picks, then the nightly show as three beats. */
export function ShiftSquads({ cohort, kind }: { cohort: ShiftCohort; kind: ShiftArtKind }) {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="Squads & Daily Show">
        โปรเจกต์ของคุณ ทีมของคุณ สกิลที่คุณเลือก
      </RisoHeading>
      <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: tint("99") }}>
        ทำคนเดียวก็ได้ หรือชวนเพื่อนมาเป็นทีม {teamSizeLabel(cohort)}{" "}
        แต่ไม่มีใครสร้างอยู่คนเดียว เลือกสกิลจากเมนูตามที่โปรเจกต์ต้องใช้วันนั้น เรียนด้วยกัน
        แล้วใช้กับงานจริงในวันเดียวกัน คุยกับพี่เลี้ยงได้ทั้งวันในห้อง Discord ของทีม
      </p>

      <div className="mt-10">
        <SubHeading>เมนูสกิล</SubHeading>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SHIFT_SKILL_CARDS.map((card, i) => (
            <li key={card.title} className={`shift-tile ${revealClass(i)} flex gap-4 p-5`}>
              <ShiftIcon
                kind={kind}
                name={SKILL_ICONS[card.title] ?? "bulb"}
                ink={accentFor(i)}
                size={40}
                className={floatClass(i)}
              />
              <div>
                <p className="font-semibold">{SKILL_CARD_ART[card.title]?.label ?? card.title}</p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: tint("99") }}>
                  {card.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-14">
        <SubHeading>Daily Show ทุกเย็น</SubHeading>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {SHIFT_DAILY_SHOW.map((beat, i) => (
            <li
              key={beat.label}
              className={`shift-tile ${revealClass(i)} relative overflow-hidden p-6`}
              style={{ borderTop: `3px solid ${accentFor(i)}` }}
            >
              <span
                aria-hidden="true"
                className="absolute -right-2 -top-4 font-kodchasan text-8xl font-bold leading-none"
                style={{ color: `color-mix(in srgb, ${accentFor(i)} 14%, transparent)` }}
              >
                {i + 1}
              </span>
              <ShiftIcon
                kind={kind}
                name={SHOW_ICONS[i % SHOW_ICONS.length]}
                ink={accentFor(i)}
                size={44}
                className={floatClass(i)}
              />
              <p className="mt-4 font-kodchasan text-xl font-semibold">{beat.label}</p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: tint("99") }}>
                {beat.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
