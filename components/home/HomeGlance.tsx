import { RisoIcon, type RisoIconName } from "@/components/shift/poster/RisoIcons";
import { accentFor, tint } from "./homeTheme";
import { floatClass, revealClass } from "@/components/shift/round/motion";
import { getEffectiveCohort, teamSizeLabel } from "@/lib/content/shift-cohort";

interface GlanceFact {
  icon: RisoIconName;
  value: string;
  label: string;
}

/** How long, with whom, where, and what you leave with. */
function glanceFacts(): GlanceFact[] {
  return [
    { icon: "calendar", value: "7 วัน", label: "วันละ 1-2 ชั่วโมง ไม่ต้องลาเรียน" },
    { icon: "people", value: teamSizeLabel(getEffectiveCohort()), label: "ทำคนเดียวหรือชวนเพื่อนเป็นทีม" },
    { icon: "chat", value: "ออนไลน์", label: "เจอกันใน Discord" },
    { icon: "caseStudy", value: "1 หน้า", label: "พอร์ตสรุปงานจริง ไว้ยื่น TCAS 1" },
  ];
}

/** Four facts right under the hero, before any argument is made. */
export function HomeGlance() {
  return (
    <section aria-label="สรุป SHIFT" className="pt-2 sm:pt-6">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {glanceFacts().map((fact, i) => (
          <li key={fact.value} className={`home-card ${revealClass(i)} flex flex-col gap-3 p-4 sm:p-5`}>
            <RisoIcon flat name={fact.icon} ink={accentFor(i)} size={36} className={floatClass(i)} />
            <p className="font-kodchasan text-2xl font-bold leading-none sm:text-3xl">
              {fact.value}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: tint("b8") }}>
              {fact.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
