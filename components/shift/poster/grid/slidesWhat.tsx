import {
  SHIFT_COHORT,
  SHIFT_DAILY_SHOW,
  SHIFT_SKILL_CARDS,
  formatThaiDate,
} from "@/lib/content/shift-cohort";

import { MarkerHighlight, REFUND_PROMISE } from "../riso";
import { PIXEL_FONT, PixelIcon } from "../pixel/PixelRects";
import { CHART, ICON_PALETTE, PORTFOLIO, ROCKET } from "../pixel/pixelIcons";
import { PX } from "../pixel/pixelKit";
import { deck } from "./deckCritters";
import { DeckCard, DeckLabel, GridSlideFrame, MUTED, Plate } from "./GridSlideFrame";
import { SKILL_CARD_ART } from "./skillIcons";

/** Post B, what: the seven days, how each evening runs, what you leave with. */

const COHORT = SHIFT_COHORT;

const B2_CRITTERS = [
  ...deck.school(142, 70, 5),
  ...deck.bigFish(138, 150, 2, true),
  ...deck.bubbles(160, 140, 4),
  ...deck.weed(158, 16),
];

export function SlideB2() {
  return (
    <GridSlideFrame id="shift1-grid-b-2" tag="THE WEEK" title="7 วัน ทำอะไรบ้าง" page="2/4" critters={B2_CRITTERS}>
      <ol className="relative max-w-[780px]">
        <span
          className="absolute bottom-8 left-[27px] top-8 w-[4px]"
          style={{ backgroundColor: `${PX.cream}26` }}
          aria-hidden="true"
        />
        {COHORT.schedule.map((day) => {
          const last = day.day === COHORT.schedule.length;
          return (
            <li key={day.day} className="relative flex items-center gap-7 py-[13px]">
              <Plate label={String(day.day)} size={58} hot={last} />
              <div>
                <p className="text-[20px] tracking-[0.12em]" style={{ ...PIXEL_FONT, color: `${PX.accentLight}cc` }}>
                  {day.label.toUpperCase()} · {formatThaiDate(day.date, false)}
                </p>
                <p
                  className="font-kodchasan text-[34px] font-bold leading-tight"
                  style={{ color: last ? PX.accentLight : PX.cream }}
                >
                  {day.title}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-auto pb-2 text-[28px]" style={{ color: MUTED }}>
        ออนไลน์ทาง Discord ทุกเย็น {COHORT.sessionTime} น.
      </p>
    </GridSlideFrame>
  );
}

/** The skill cards fill the deck, so only a little life along the floor. */
const B3_CRITTERS = [...deck.weed(8, 6), ...deck.weed(168, 8)];

function SkillCard({ title, detail }: { title: string; detail: string }) {
  const art = SKILL_CARD_ART[title];
  return (
    <DeckCard className="flex items-start gap-5 !px-6 !py-7">
      {art && <PixelIcon grid={art.icon} palette={ICON_PALETTE} scale={7} className="mt-1 shrink-0" />}
      <div className="min-w-0">
        <p className="text-[31px] leading-tight tracking-[0.03em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
          {art?.label ?? title}
        </p>
        <p className="mt-2 text-[23px] leading-[1.45]" style={{ color: MUTED }}>
          {detail}
        </p>
      </div>
    </DeckCard>
  );
}

export function SlideB3() {
  return (
    <GridSlideFrame id="shift1-grid-b-3" tag="HOW THE ROOM RUNS" title="โปรเจกต์ของเรา ทีมละ 3 คน" page="3/4" critters={B3_CRITTERS}>
      <DeckLabel>ทุกเย็น ทุกทีมโชว์ 3 เรื่อง</DeckLabel>
      <div className="mt-6 space-y-4">
        {SHIFT_DAILY_SHOW.map((beat, i) => (
          <div key={beat.label} className="flex items-baseline gap-8">
            <p
              className="w-[270px] shrink-0 text-[52px] leading-none tracking-[0.04em]"
              style={{ ...PIXEL_FONT, color: i === 1 ? PX.accent : PX.cream }}
            >
              {beat.label.toUpperCase()}
            </p>
            <p className="text-[27px] leading-[1.45]" style={{ color: MUTED }}>
              {beat.detail}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <DeckLabel>การ์ดสกิล ทีมเลือกเองวันละใบ</DeckLabel>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {SHIFT_SKILL_CARDS.map((card) => (
            <SkillCard key={card.title} title={card.title} detail={card.detail} />
          ))}
        </div>
      </div>
    </GridSlideFrame>
  );
}

const OUTCOMES = [
  { title: "Live Project", icon: ROCKET, body: "ชิ้นงานจริงที่คนนอกกดใช้ได้ ใช้ AI ช่วยสร้าง ไม่ต้องมีพื้นฐาน" },
  { title: "Proof", icon: CHART, body: "ตัวเลขจากคนที่ลองใช้ และทุกจุดที่พังแล้วเราแก้ยังไง" },
  { title: "พอร์ต 1 หน้า", icon: PORTFOLIO, body: "สรุปทั้งหมดใน 1 หน้า ใส่พอร์ตและใช้เล่าตอนสัมภาษณ์ TCAS1" },
];

const B4_CRITTERS = [
  ...deck.school(112, 188, 6, true),
  ...deck.bubbles(104, 184, 4),
  ...deck.weed(12, 14),
  ...deck.weed(164, 20),
];

export function SlideB4() {
  return (
    <GridSlideFrame id="shift1-grid-b-4" tag="WHAT YOU SHIP" title="จบ 7 วัน ได้อะไรกลับไป" page="4/4" critters={B4_CRITTERS}>
      <div className="space-y-5">
        {OUTCOMES.map((o) => (
          <DeckCard key={o.title} className="flex items-center gap-7">
            <PixelIcon grid={o.icon} palette={ICON_PALETTE} scale={8} className="shrink-0" />
            <div>
              <p className="font-kodchasan text-[42px] font-bold leading-tight">{o.title}</p>
              <p className="mt-1 text-[27px] leading-[1.45]" style={{ opacity: 0.8 }}>
                {o.body}
              </p>
            </div>
          </DeckCard>
        ))}
      </div>
      <p className="mt-10 text-[38px]">
        <MarkerHighlight>{REFUND_PROMISE}</MarkerHighlight>
      </p>
    </GridSlideFrame>
  );
}
