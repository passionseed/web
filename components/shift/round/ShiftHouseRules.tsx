import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import { RisoHeading } from "@/components/shift/ShiftRiso";
import type { ShiftArtKind } from "@/components/shift/theme";
import { HEADING, T, accentFor, tint } from "@/components/shift/theme/tokens";
import { SHIFT_HOUSE_RULES as RULES } from "@/lib/content/shift-cohort";

import { ShiftIcon } from "./ShiftIcon";
import { revealClass } from "./motion";

const SCORE_ICONS: RisoIconName[] = ["chat", "people", "metrics"];

function Card({ index, title, children }: { index: number; title: string; children: ReactNode }) {
  return (
    <div className={`shift-tile ${revealClass(index)} flex flex-col p-6 sm:p-7`}>
      <h3 className="font-kodchasan text-xl font-bold leading-[1.4] sm:text-2xl" style={HEADING}>
        {title}
      </h3>
      <div className="mt-5 flex-1">{children}</div>
    </div>
  );
}

/** A chat bubble, the student's on the left and the mentor's on the right. */
function Bubble({ who, children, mentor }: { who: string; children: ReactNode; mentor?: boolean }) {
  return (
    <p
      className={`max-w-[88%] px-4 py-3 text-sm font-semibold leading-relaxed sm:text-base ${mentor ? "ml-auto" : ""}`}
      style={
        mentor
          ? { backgroundColor: T.accent1, color: T.bg }
          : { border: `2px solid ${tint("4d")}`, color: T.text }
      }
    >
      {who}: “{children}”
    </p>
  );
}

/**
 * How the room talks for 7 days, from SHIFT[1]'s Day 1 boards: no grades,
 * users are the judges, school words swapped for builder words, and
 * progress counted as evidence. Shared by every round page.
 */
export function ShiftHouseRules({ kind }: { kind: ShiftArtKind }) {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="House Rules">กติกาตลอด 7 วัน</RisoHeading>
      <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: tint("99") }}>
        บอร์ดแรกที่ทุกคนเห็นตั้งแต่ Day 1 ทั้งรุ่นใช้ภาษาเดียวกัน ทั้งเราและพี่ๆ
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Card index={0} title="SHIFT ไม่ใช่ห้องเรียน">
          <ol className="space-y-4">
            {RULES.rules.map((rule, i) => (
              <li key={rule.title} className="flex gap-4">
                <span
                  className="font-kodchasan text-2xl font-bold leading-none"
                  style={{ color: accentFor(i) }}
                >
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold leading-relaxed">{rule.title}</span>
                  {rule.detail && (
                    <span className="mt-0.5 block text-sm leading-relaxed" style={{ color: tint("99") }}>
                      {rule.detail}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card index={1} title="เปลี่ยนคำ เปลี่ยนวิธีคิด">
          <dl className="divide-y divide-[color:var(--shift-hair,rgba(242,234,217,0.12))]">
            {RULES.words.map(([before, after]) => (
              <div key={before} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.3fr)] items-center gap-3 py-3">
                <dt className="text-sm line-through decoration-2" style={{ color: tint("99") }}>
                  {before}
                </dt>
                <ArrowRight className="h-4 w-4" style={{ color: T.accent1 }} aria-label="เปลี่ยนเป็น" />
                <dd className="font-semibold">{after}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card index={2} title="ถามพี่ทีไร ได้คำตอบเดิม">
          <div className="space-y-3">
            <Bubble who="เรา">{RULES.ask.student}</Bubble>
            <Bubble who="พี่" mentor>
              {RULES.ask.mentor}
            </Bubble>
          </div>
          <p className="mt-6 font-kodchasan text-lg font-bold leading-[1.5]" style={{ color: T.accent3 }}>
            {RULES.ask.moral}
          </p>
        </Card>

        <Card index={0} title={RULES.score.title}>
          <ul className="space-y-4">
            {RULES.score.items.map((item, i) => (
              <li key={item} className="flex items-center gap-4">
                <ShiftIcon kind={kind} name={SCORE_ICONS[i]} ink={accentFor(i)} size={32} />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: tint("80") }}>
            {RULES.score.note}
          </p>
        </Card>
      </div>
    </section>
  );
}
