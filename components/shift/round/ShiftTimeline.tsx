import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import type { ShiftArtKind } from "@/components/shift/theme";
import { RisoHeading } from "@/components/shift/ShiftRiso";
import { T, THEME_HAIR as HAIR, accentFor, tint } from "@/components/shift/theme/tokens";
import { formatThaiDate, type ShiftCohort } from "@/lib/content/shift-cohort";

import { ShiftIcon } from "./ShiftIcon";
import { floatClass, revealClass } from "./motion";

const PHASES: { icon: RisoIconName; day: string; title: string; body: string }[] = [
  {
    icon: "lock",
    day: "Day 1–2 (Mon–Tue)",
    title: "Lock One Problem",
    body: "ตัดฟีเจอร์ที่ไม่จำเป็นออก 80% แล้วล็อกสโคปโปรเจกต์ระดับอะตอมให้จบใน 1 หน้า",
  },
  {
    icon: "send",
    day: "Day 3–5 (Wed–Fri)",
    title: "Ship to Strangers",
    body: "ปล่อย MVP แบบ zero-code หรือ hardware ให้คนภายนอกใช้จริง ถ้าพังหรือไม่มีคนใช้ ดีแล้ว! นั่นคือ failure data ที่ต้องบันทึก",
  },
  {
    icon: "mic",
    day: "Day 6–7 (Sat–Sun)",
    title: "Demo Day",
    body: "โชว์ของจริงต่อหน้าทั้งรุ่น เล่าว่าอะไรพัง เปลี่ยนอะไร และได้เรียนรู้อะไร แล้วเรียบเรียงเป็น 1-Page Case Study ไว้ใช้ในพอร์ต",
  },
];

/** One icon per sprint day, in schedule order. */
const DAY_ICONS: RisoIconName[] = ["lock", "chat", "hammer", "send", "bug", "gauge", "mic"];

function IconBadge({
  kind,
  icon,
  index,
  size = 64,
}: {
  kind: ShiftArtKind;
  icon: RisoIconName;
  index: number;
  size?: number;
}) {
  return (
    <span
      className="shift-badge relative flex shrink-0 items-center justify-center rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: accentFor(index),
        backgroundColor: T.bg,
      }}
    >
      <ShiftIcon
        kind={kind}
        name={icon}
        ink={accentFor(index)}
        size={Math.round(size * 0.56)}
        className={floatClass(index)}
      />
    </span>
  );
}

/** The week in three phases, strung on one line that draws as it scrolls in. */
export function ShiftCadence({ kind }: { kind: ShiftArtKind }) {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="How It Works">จังหวะ 7 วัน ไม่กระทบเวลาเรียน</RisoHeading>
      <div className="relative mt-12">
        <div
          aria-hidden="true"
          className="shift-draw-x absolute left-8 right-8 top-8 hidden origin-left border-t-2 border-dashed md:block"
          style={{ borderColor: `color-mix(in srgb, ${T.text} 30%, transparent)` }}
        />
        <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {PHASES.map((phase, i) => (
            <li key={phase.day} className={revealClass(i)}>
              <IconBadge kind={kind} icon={phase.icon} index={i} />
              <p
                className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ color: accentFor(i) }}
              >
                {phase.day}
              </p>
              <h3 className="mt-2 font-kodchasan text-2xl font-semibold leading-snug">
                {phase.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: tint("99") }}>
                {phase.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Day-by-day plan for this round on a vertical rail, one icon per day. */
export function ShiftSchedule({
  cohort,
  dates,
  kind,
}: {
  cohort: ShiftCohort;
  dates: string;
  kind: ShiftArtKind;
}) {
  return (
    <section className="py-16 sm:py-24">
      <RisoHeading eyebrow="ตารางรอบนี้">7 วัน วันละหนึ่งงาน</RisoHeading>
      <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: tint("99") }}>
        {dates} ทำวันละ 1 ถึง 2 ชั่วโมง ไม่ต้องลาเรียน ทุกวันมีของต้องส่ง ถ้าวันไหนหาย
        ทีมกับพี่เลี้ยงรู้ทันทีตั้งแต่วันนั้น ไม่ใช่ตอนจบ
      </p>

      <div className="relative mt-12">
        <div
          aria-hidden="true"
          className="shift-draw-y absolute bottom-6 left-6 top-6 origin-top border-l-2 border-dashed"
          style={{ borderColor: `color-mix(in srgb, ${T.text} 25%, transparent)` }}
        />
        <ol className="relative space-y-4">
          {cohort.schedule.map((step, i) => (
            <li key={step.date} className={`${revealClass(i)} flex gap-4 sm:gap-6`}>
              <IconBadge kind={kind} icon={DAY_ICONS[i % DAY_ICONS.length]} index={i} size={48} />
              <div
                className={`shift-tile grid flex-1 gap-2 p-4 sm:grid-cols-[8.5rem_1fr] sm:gap-6 sm:p-5 ${HAIR}`}
              >
                <div>
                  <p
                    className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: accentFor(i) }}
                  >
                    Day {step.day} · {step.label}
                  </p>
                  <p className="mt-1 font-kodchasan text-base font-semibold">
                    {formatThaiDate(step.date)}
                  </p>
                </div>
                <div>
                  <h3 className="font-kodchasan text-lg font-semibold leading-snug">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: tint("99") }}>
                    {step.detail}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
