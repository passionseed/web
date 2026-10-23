import type { ReactNode } from "react";

import { COSMOS, starlight } from "@/components/shift/next/cosmos";
import { SHIFT_COHORT_3 } from "@/lib/content/shift-cohort";

import { shift3StoryCopy, type StoryNote } from "./copy";
import { BANGKOK, Glass, Ink, LATIN, Rocket, SlotCue, STARLIGHT_TEXT, StickerSlot, StoryFrame, StoryHead, Trail, Wordmark } from "./parts";

/**
 * SHIFT[3] Instagram Story series (8 sheets, 1080x1920) in the cosmos look:
 * clear glass over deep space, the SHIFT planet's horizon under the reply
 * bar. Each sheet is one idea and leaves an empty glass slot for a sticker
 * placed by hand. Copy and dates: ./copy.ts over SHIFT_COHORT_3.
 * Export: screenshot each id in SHIFT3_STORY_IDS (/shift/poster/3/stories).
 */

const C = SHIFT_COHORT_3;
const T = shift3StoryCopy(C);

/** Link stickers sit in a wide pill, a poll needs a tall pane. */
const LINK_SLOT = { width: 640, height: 132 };

/** Stacked Thai lines need lineHeight 1.3 or more so tone marks clear the line above. */
function Big({ children, size = 150, className = "", lineHeight = 1.2 }: { children: ReactNode; size?: number; className?: string; lineHeight?: number }) {
  return (
    <p className={`font-bold ${className}`} style={{ fontSize: size, lineHeight, letterSpacing: "-0.01em" }}>
      {children}
    </p>
  );
}

function Lead({ children, tone = COSMOS.aurora }: { children: ReactNode; tone?: string }) {
  return (
    <p className="text-[46px] font-semibold leading-[1.35]" style={{ color: tone }}>
      {children}
    </p>
  );
}

function Foot({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-center text-[26px] font-medium leading-[1.4]" style={{ color: starlight("b3") }}>
      {children}
    </p>
  );
}

/* ---------------- 1. Open ---------------- */

function OpenStory() {
  const t = T.open;
  return (
    <StoryFrame
      id="shift3-story-open"
      sky={0}
      overlay={
        <>
          <Trail d={`M${BANGKOK.x} ${BANGKOK.y} C ${BANGKOK.x - 160} 1690, 110 1620, 120 1450`} />
          <Rocket x={112} y={1390} rotate={-12} scale={0.5} />
        </>
      }
    >
      <StoryHead chip={t.chip} />
      <div className="mt-[64px]">
        <Wordmark size={190} name={C.name} />
        <Big size={150} className="mt-6">
          <span style={{ color: COSMOS.sol, textShadow: `0 0 50px ${COSMOS.sol}55` }}>{t.headline}</span>
        </Big>
        <p className="mt-4 whitespace-pre-line text-[40px] font-medium leading-[1.45]" style={{ color: starlight("e6") }}>
          <Ink text={t.sub} accent={COSMOS.aurora} />
        </p>
      </div>
      <Glass className="mt-[44px] px-10 py-7">
        <dl className="space-y-4">
          {t.facts.map((f) => (
            <div key={f.label} className={`flex gap-6 ${f.unit ? "items-center" : "items-baseline"}`}>
              <dt className="w-[110px] shrink-0 text-[19px] font-medium uppercase tracking-[0.2em]" style={{ fontFamily: LATIN, color: starlight("80") }}>
                {f.label}
              </dt>
              <dd className="text-[36px] font-semibold leading-[1.35]">
                {f.unit ? (
                  <>
                    <span className="text-[64px] font-medium leading-none tracking-[-0.03em]" style={{ fontFamily: LATIN, color: COSMOS.sol }}>
                      {f.value}
                    </span>{" "}
                    <span style={{ color: starlight("b3") }}>{f.unit}</span>
                  </>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Glass>
      <div className="mt-auto">
        <SlotCue>
          <Ink text={t.cta} />
        </SlotCue>
        <StickerSlot {...LINK_SLOT} />
        <Foot>
          <Ink text={t.foot} />
        </Foot>
      </div>
    </StoryFrame>
  );
}

/* ---------------- 2. Poll ---------------- */

function PollStory() {
  const t = T.poll;
  return (
    <StoryFrame id="shift3-story-poll" sky={1}>
      <StoryHead chip={t.chip} tone={COSMOS.aurora} />
      <div className="mt-[70px]">
        <Lead tone={starlight("cc")}>{t.lead}</Lead>
        <Big size={148} className="-mt-1">
          {t.big.map((line) => (
            <span key={line} className="block">
              <Ink text={line} accent={COSMOS.aurora} />
            </span>
          ))}
        </Big>
        <p className="mt-8 text-[38px] font-medium leading-[1.45]" style={{ color: starlight("d9") }}>
          {t.sub}
        </p>
      </div>
      <div className="mt-auto">
        <StickerSlot width={860} height={500} radius={44} />
        <p className="mt-7 flex items-center justify-center gap-3 text-[32px] font-semibold leading-[1.4]" style={{ color: starlight("e6") }}>
          {t.after}
          <span className="text-[34px]" style={{ color: COSMOS.aurora }}>
            →
          </span>
        </p>
      </div>
    </StoryFrame>
  );
}

/* ---------------- 3. Answer ---------------- */

const ROW_TONES = [COSMOS.sol, COSMOS.aurora, COSMOS.nebula];

function AnswerStory() {
  const t = T.answer;
  return (
    <StoryFrame id="shift3-story-answer" sky={2}>
      <StoryHead chip={t.chip} tone={COSMOS.aurora} />
      <div className="mt-[48px]">
        <Lead>{t.lead}</Lead>
        <Big size={128} className="-mt-1">
          {t.big.map((line) => (
            <span key={line} className="block">
              <Ink text={line} />
            </span>
          ))}
        </Big>
      </div>
      <ol className="mt-[36px] space-y-[18px]">
        {t.rows.map((row, i) => (
          <li key={row.block}>
            <Glass className="flex gap-6 px-8 py-6" radius={28}>
              <span
                className="mt-[6px] grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-[26px] font-medium"
                style={{ fontFamily: LATIN, color: ROW_TONES[i], boxShadow: `inset 0 0 0 2.5px ${ROW_TONES[i]}` }}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[27px] font-semibold leading-[1.4]" style={{ color: ROW_TONES[i] }}>
                  {row.block}
                </p>
                <p className="text-[33px] font-semibold leading-[1.4]">{row.fix}</p>
                <p className="mt-1 text-[24px] leading-[1.4]" style={{ color: starlight("99") }}>
                  {row.aside}
                </p>
              </div>
            </Glass>
          </li>
        ))}
      </ol>
      <div className="mt-auto pt-6">
        <SlotCue>
          <Ink text={t.cta} />
        </SlotCue>
        <StickerSlot {...LINK_SLOT} />
        <Foot>
          <Ink text={t.foot} />
        </Foot>
      </div>
    </StoryFrame>
  );
}

/* ---------------- 4. Pair ---------------- */

function PairStory() {
  const t = T.pair;
  return (
    <StoryFrame id="shift3-story-pair" sky={3}>
      <StoryHead chip={t.chip} tone={COSMOS.flare} />
      <div className="mt-[64px]">
        <Lead tone={COSMOS.flare}>{t.lead}</Lead>
        <Big size={150} className="-mt-1">
          {t.big}
        </Big>
        <div className="mt-2 flex items-baseline gap-6">
          <span className="text-[64px] font-bold leading-none">{t.per}</span>
          <span
            className="text-[230px] font-medium leading-[0.9] tracking-[-0.045em]"
            style={{ fontFamily: LATIN, color: COSMOS.sol, textShadow: `0 0 70px ${COSMOS.sol}55` }}
          >
            {t.pairPrice}
          </span>
        </div>
      </div>
      <Glass className="mt-[48px] grid grid-cols-2" radius={30}>
        {t.compare.map((col, i) => (
          <div key={col.label} className="px-9 py-6" style={i ? { borderLeft: `1px solid ${starlight("1f")}` } : undefined}>
            <p className="text-[26px] font-medium leading-[1.4]" style={{ color: starlight("99") }}>
              {col.label}
            </p>
            <p className="text-[40px] font-semibold leading-[1.35]" style={{ color: i ? COSMOS.sol : COSMOS.star }}>
              {col.value}
            </p>
          </div>
        ))}
      </Glass>
      <p className="mt-[34px] text-[34px] font-semibold leading-[1.4]" style={{ color: starlight("e6") }}>
        {t.team}
      </p>
      <Glass className="mt-[22px] px-9 py-7" radius={30}>
        <p className="text-[26px] font-medium leading-[1.4]" style={{ color: starlight("99") }}>
          {t.howLabel}
        </p>
        <ol className="mt-3 space-y-3">
          {t.how.map((step, i) => (
            <li key={step} className="flex items-baseline gap-5 text-[31px] font-medium leading-[1.4]" style={{ color: starlight("d9") }}>
              <span className="w-[28px] shrink-0 text-[30px] font-medium" style={{ fontFamily: LATIN, color: COSMOS.flare }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Glass>
      <div className="mt-auto">
        <SlotCue>
          <Ink text={t.cta} />
        </SlotCue>
        <StickerSlot {...LINK_SLOT} />
      </div>
    </StoryFrame>
  );
}

/* ---------------- 5. Last call (day before close) ---------------- */

function FactsColumn({ lines }: { lines: string[] }) {
  return (
    <Glass className="px-10 py-7">
      <ul className="space-y-3">
        {lines.map((line) => (
          <li key={line} className="flex items-center gap-5 text-[34px] font-semibold leading-[1.4]">
            <span className="h-[12px] w-[12px] shrink-0 rounded-full" style={{ background: COSMOS.aurora, boxShadow: `0 0 10px ${COSMOS.aurora}` }} />
            <span>
              <Ink text={line} />
            </span>
          </li>
        ))}
      </ul>
    </Glass>
  );
}

/** The launch pad: the rocket standing at Bangkok, waiting for Day 1. */
function OnThePad() {
  return <Rocket x={BANGKOK.x} y={BANGKOK.y - 52} scale={0.5} flame={false} />;
}

function LastCallStory() {
  const t = T.lastcall;
  return (
    <StoryFrame id="shift3-story-lastcall" sky={4} overlay={<OnThePad />}>
      <StoryHead chip={t.chip} tone={COSMOS.flare} />
      <div className="mt-[56px]">
        <Wordmark size={110} name={C.name} />
        <Big size={180} className="mt-6" lineHeight={1.25}>
          {t.big.map((line) => (
            <span key={line} className="block">
              <Ink text={line} accent={COSMOS.flare} />
            </span>
          ))}
        </Big>
        <p className="mt-4 text-[64px] font-semibold leading-[1.3]" style={{ color: COSMOS.sol }}>
          {t.date}
        </p>
      </div>
      <div className="mt-[44px]">
        <FactsColumn lines={t.facts} />
      </div>
      <div className="mt-auto pt-10">
        <SlotCue>
          <Ink text={t.cta} />
        </SlotCue>
        <StickerSlot {...LINK_SLOT} />
      </div>
    </StoryFrame>
  );
}

/* ---------------- 6. Tonight (close day) ---------------- */

function TonightStory() {
  const t = T.tonight;
  return (
    <StoryFrame id="shift3-story-tonight" sky={5} overlay={<OnThePad />}>
      <StoryHead chip={t.chip} tone={COSMOS.flare} />
      <div className="mt-[56px]">
        <Wordmark size={110} name={C.name} />
        <Big size={190} className="mt-6" lineHeight={1.25}>
          {t.big.map((line) => (
            <span key={line} className="block">
              <Ink text={line} accent={COSMOS.flare} />
            </span>
          ))}
        </Big>
        <p className="mt-4 text-[48px] font-semibold leading-[1.35]" style={{ color: COSMOS.sol }}>
          {t.sub}
        </p>
      </div>
      <div className="mt-[40px]">
        <FactsColumn lines={t.facts} />
      </div>
      <div className="mt-auto pt-10">
        <SlotCue>
          <Ink text={t.cta} />
        </SlotCue>
        <StickerSlot {...LINK_SLOT} />
      </div>
    </StoryFrame>
  );
}

/* ---------------- 7. Day 1 ---------------- */

/** Seven evenings as stops on an orbit: Day 1 lit, Demo Day ringed. */
function Track() {
  const t = T.day1;
  const n = t.track.length;
  return (
    <Glass className="px-9 pb-7 pt-7" radius={30}>
      <div className="relative flex items-start justify-between">
        <span className="absolute left-[26px] right-[26px] top-[25px] border-t-2 border-dashed" style={{ borderColor: `${COSMOS.orbit}88` }} />
        {t.track.map((d, i) => {
          const first = i === 0;
          const last = i === n - 1;
          return (
            <div key={d.day} className="relative flex w-[52px] flex-col items-center">
              <span
                className="grid h-[52px] w-[52px] place-items-center rounded-full text-[24px] font-medium"
                style={{
                  fontFamily: LATIN,
                  background: first ? COSMOS.sol : last ? COSMOS.sea : COSMOS.sea,
                  color: first ? COSMOS.void : last ? COSMOS.aurora : starlight("99"),
                  boxShadow: first ? `0 0 26px ${COSMOS.sol}` : `inset 0 0 0 2px ${last ? COSMOS.aurora : starlight("33")}`,
                }}
              >
                {d.day}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between text-[24px] font-semibold leading-[1.4]">
        <span style={{ color: COSMOS.sol }}>คืนนี้</span>
        <span style={{ color: COSMOS.aurora }}>{t.demo}</span>
      </div>
    </Glass>
  );
}

function Day1Story() {
  const t = T.day1;
  return (
    <StoryFrame
      id="shift3-story-day1"
      sky={6}
      overlay={
        <>
          <Trail d={`M${BANGKOK.x} ${BANGKOK.y - 10} C ${BANGKOK.x + 60} 1560, 860 1560, 960 1440`} />
          <Rocket x={985} y={1395} rotate={32} scale={0.55} />
        </>
      }
    >
      <StoryHead chip={t.chip} />
      <div className="mt-[64px]">
        <Wordmark size={130} name={C.name} />
        <Big size={140} className="mt-6">
          {t.headline}
        </Big>
        <p
          className="-mt-2 text-[190px] font-medium leading-[1] tracking-[-0.045em]"
          style={{ fontFamily: LATIN, color: COSMOS.sol, textShadow: `0 0 70px ${COSMOS.sol}55` }}
        >
          {t.time}
          <span className="font-bai-jamjuree ml-5 text-[72px] font-semibold tracking-normal">น.</span>
        </p>
        <p className="mt-4 text-[38px] font-semibold leading-[1.4]" style={{ color: starlight("e6") }}>
          {t.sub}
        </p>
      </div>
      <div className="mt-[36px]">
        <Track />
      </div>
      <p className="mt-[28px] whitespace-pre-line text-[32px] font-semibold leading-[1.45]" style={{ color: starlight("e6") }}>
        <Ink text={t.goal} accent={COSMOS.aurora} />
      </p>
      <div className="mt-auto pt-8">
        <p className="mb-4 text-center text-[30px] font-semibold leading-[1.4]" style={{ color: starlight("d9") }}>
          {t.cheer}
        </p>
        <StickerSlot width={720} height={190} radius={40} />
      </div>
    </StoryFrame>
  );
}

/* ---------------- 8. Demo Day ---------------- */

function DemoDayStory() {
  const t = T.demoday;
  return (
    <StoryFrame
      id="shift3-story-demoday"
      sky={7}
      overlay={
        <>
          <ellipse cx="540" cy="1600" rx="520" ry="120" fill="none" stroke={COSMOS.orbit} strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" opacity="0.6" />
        </>
      }
    >
      <StoryHead chip={t.chip} tone={COSMOS.aurora} />
      <div className="mt-[64px]">
        <p
          className="whitespace-nowrap text-[176px] font-medium leading-[0.95] tracking-[-0.045em]"
          style={{
            fontFamily: LATIN,
            ...STARLIGHT_TEXT,
          }}
        >
          {t.word}
        </p>
        <Big size={170} className="mt-8">
          <span style={{ color: COSMOS.sol, textShadow: `0 0 50px ${COSMOS.sol}55` }}>{t.headline}</span>
        </Big>
        <p className="mt-3 text-[40px] font-medium leading-[1.45]" style={{ color: starlight("e6") }}>
          {t.lead}
        </p>
      </div>
      <Glass className="mt-[44px] px-10 py-9" radius={30}>
        <p className="text-[26px] font-medium leading-[1.4]" style={{ color: starlight("99") }}>
          {t.itemsLabel}
        </p>
        <ul className="mt-5 space-y-6">
          {t.items.map((item, i) => (
            <li key={item} className="flex items-center gap-5 text-[38px] font-semibold leading-[1.4]">
              <span className="h-[14px] w-[14px] shrink-0 rounded-full" style={{ background: ROW_TONES[i], boxShadow: `0 0 12px ${ROW_TONES[i]}` }} />
              {item}
            </li>
          ))}
        </ul>
      </Glass>
      <div className="mt-auto">
        <p className="mb-4 text-center text-[30px] font-semibold leading-[1.4]" style={{ color: starlight("d9") }}>
          {t.next}
        </p>
        <StickerSlot width={560} height={120} />
        <Foot>{t.nextUrl}</Foot>
      </div>
    </StoryFrame>
  );
}

export interface StorySheet {
  id: string;
  title: string;
  note: StoryNote;
  Sheet: () => ReactNode;
}

export const SHIFT3_STORIES: StorySheet[] = [
  { id: "shift3-story-open", title: "Applications open", note: T.open.note, Sheet: OpenStory },
  { id: "shift3-story-poll", title: "Poll: what stops you", note: T.poll.note, Sheet: PollStory },
  { id: "shift3-story-answer", title: "Poll answer", note: T.answer.note, Sheet: AnswerStory },
  { id: "shift3-story-pair", title: "Bring a friend", note: T.pair.note, Sheet: PairStory },
  { id: "shift3-story-lastcall", title: "Closes tomorrow", note: T.lastcall.note, Sheet: LastCallStory },
  { id: "shift3-story-tonight", title: "Closes tonight", note: T.tonight.note, Sheet: TonightStory },
  { id: "shift3-story-day1", title: "Day 1 tonight", note: T.day1.note, Sheet: Day1Story },
  { id: "shift3-story-demoday", title: "Demo Day tonight", note: T.demoday.note, Sheet: DemoDayStory },
];

export const SHIFT3_STORY_IDS = SHIFT3_STORIES.map((s) => s.id);
