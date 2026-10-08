import { SHIFT_SDT } from "@/lib/content/shift-cohort";
import { SHIFT_CHANGES, type ShiftChange } from "@/lib/content/shift-voices";

import { INK } from "../riso";
import { COVER_TOTALS } from "./RisoGridCovers";
import { CommentCta, DIM, InkCard, Label, RisoSlide, Stamp } from "./RisoSlide";

/**
 * Post A, why it works: the theory in plain Thai, then what students told us
 * after a round and what the next round does about it. Owning what broke is
 * the trust signal a parent can't get from a polished camp ad.
 */

const sheet = (n: number) => ({ id: `shift2-grid-a-${n}`, page: n, total: COVER_TOTALS.a });

const PILLAR_INKS = [INK.orange, INK.pink, INK.yellow];

export function WhyNotLecture() {
  return (
    <RisoSlide {...sheet(2)} tag="SDT Theory" title="ทำไมนั่งฟังแล้วไม่เปลี่ยน แต่ลงมือแล้วเปลี่ยน">
      <div className="space-y-10">
        {SHIFT_SDT.map((pillar, i) => (
          <div key={pillar.pillar} className="flex items-start gap-7">
            <Stamp n={i + 1} hot={i === 0} size={64} />
            <div>
              <p className="font-kodchasan text-[50px] font-bold leading-tight" style={{ color: PILLAR_INKS[i] }}>
                {pillar.title}
              </p>
              <p className="mt-2 text-[32px] leading-[1.5]" style={{ color: DIM }}>
                {pillar.detail}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-auto text-[26px]" style={{ color: DIM }}>
        Self-Determination Theory · Deci &amp; Ryan · ทฤษฎีแรงจูงใจที่มีงานวิจัยรองรับหลายสิบปี
      </p>
    </RisoSlide>
  );
}

/** One "students said, so we changed" pair. */
function ChangeRow({ change, n }: { change: ShiftChange; n: number }) {
  return (
    <div>
      <div className="flex items-start gap-6">
        <Stamp n={n} size={56} />
        <div>
          <Label color={INK.orange}>{`${change.who} บอกเรา`}</Label>
          <p className="mt-2 font-kodchasan text-[40px] font-bold leading-[1.3]" style={{ color: INK.paper }}>
            “{change.heard}”
          </p>
        </div>
      </div>
      <InkCard className="ml-[82px] mt-5 !py-6">
        <Label color={INK.yellow}>SHIFT[1] ปรับแล้ว</Label>
        <p className="mt-2 text-[31px] font-semibold leading-[1.5]">{change.changed}</p>
      </InkCard>
    </div>
  );
}

export function WhyChanges1() {
  return (
    <RisoSlide {...sheet(3)} tag="SHIFT[0] → SHIFT[1]" title="รุ่นแรกบอกอะไร เราแก้อะไร">
      <div className="space-y-12">
        {SHIFT_CHANGES.slice(0, 2).map((change, i) => (
          <ChangeRow key={change.heard} change={change} n={i + 1} />
        ))}
      </div>
    </RisoSlide>
  );
}

export function WhyChanges2() {
  return (
    <RisoSlide {...sheet(4)} tag="SHIFT[0] → SHIFT[1]" title="รุ่นแรกบอกอะไร เราแก้อะไร (ต่อ)">
      <div className="space-y-12">
        {SHIFT_CHANGES.slice(2, 4).map((change, i) => (
          <ChangeRow key={change.heard} change={change} n={i + 3} />
        ))}
      </div>
    </RisoSlide>
  );
}

const NIGHT_BEATS = [
  { title: "วันนี้ทำอะไรได้", detail: "เปิดของจริงให้ดู ไม่ต้องทำสไลด์" },
  { title: "ติดตรงไหน", detail: "อะไรพัง จดไว้ แล้วทั้งห้องช่วยคิด" },
  { title: "เรียนรู้อะไร", detail: "สอนเพื่อนอีกทีมใน 1 นาที" },
];

export function WhyNights() {
  return (
    <RisoSlide {...sheet(5)} tag="Every night" title={`ทุกเย็นใน ${"SHIFT[2]"}`}>
      <div className="space-y-7">
        {NIGHT_BEATS.map((beat, i) => (
          <div key={beat.title} className="flex items-center gap-6">
            <Stamp n={i + 1} hot={i === 1} size={56} />
            <p className="font-kodchasan text-[42px] font-bold" style={{ color: INK.paper }}>
              {beat.title}
            </p>
            <p className="text-[28px]" style={{ color: DIM }}>
              {beat.detail}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-auto">
        <CommentCta />
      </div>
    </RisoSlide>
  );
}

export const WHY_SLIDES = [WhyNotLecture, WhyChanges1, WhyChanges2, WhyNights];
