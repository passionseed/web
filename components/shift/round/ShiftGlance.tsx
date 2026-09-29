import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import type { ShiftArtKind } from "@/components/shift/theme";
import { HEADING, accentFor, tint } from "@/components/shift/theme/tokens";
import { teamSizeLabel, type ShiftCohort } from "@/lib/content/shift-cohort";

import { ShiftIcon } from "./ShiftIcon";
import { floatClass, revealClass } from "./motion";

interface GlanceStat {
  icon: RisoIconName;
  value: string;
  label: string;
}

function glanceStats(cohort: ShiftCohort): GlanceStat[] {
  return [
    { icon: "calendar", value: "7 วัน", label: "วันละ 1-2 ชั่วโมง ไม่ต้องลาเรียน" },
    { icon: "people", value: teamSizeLabel(cohort), label: "ทำคนเดียวหรือชวนเพื่อนเป็นทีม" },
    { icon: "send", value: `${cohort.testerTarget} คน`, label: "คนนอกที่ทักตรงมาลองของ" },
    { icon: "caseStudy", value: "1 หน้า", label: "พอร์ตสรุปงานจริง ไว้ยื่น TCAS 1" },
  ];
}

/** Four numbers right under the hero so the week is legible at a glance. */
export function ShiftGlance({ cohort, kind }: { cohort: ShiftCohort; kind: ShiftArtKind }) {
  return (
    <section aria-label="สรุป SHIFT" className="pt-4 sm:pt-8">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {glanceStats(cohort).map((stat, i) => (
          <li
            key={stat.value}
            className={`shift-tile ${revealClass(i)} flex flex-col gap-3 p-4 sm:p-5`}
          >
            <ShiftIcon
              kind={kind}
              name={stat.icon}
              ink={accentFor(i)}
              size={36}
              className={floatClass(i)}
            />
            <p className="font-kodchasan text-2xl font-bold leading-none sm:text-3xl" style={HEADING}>
              {stat.value}
            </p>
            <p className="text-xs leading-relaxed sm:text-sm" style={{ color: tint("99") }}>
              {stat.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
