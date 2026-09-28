import {
  SHIFT_COHORT,
  SHIFT_COHORT_0,
  SHIFT_SDT,
  type ShiftShowcaseProject,
} from "@/lib/content/shift-cohort";

import { PIXEL_FONT } from "../pixel/PixelRects";
import { PX } from "../pixel/pixelKit";
import { deck, sinkingCert } from "./deckCritters";
import { DeckCard, GridSlideFrame, MUTED, Plate } from "./GridSlideFrame";

/** Post A, why: certificates sink, live work floats, and the theory behind it. */

const CERT_SIDE = ["ทุกคนได้เหมือนกัน", "จ่ายเงินครบก็ได้มา", "สัมภาษณ์แล้วไม่มีอะไรให้เล่า"];
const LIVE_SIDE = ["คนนอกกดใช้ได้จริง", "มีตัวเลขจากคนที่ลองใช้", "เล่าได้ว่าอะไรพัง แล้วแก้ยังไง"];

function CompareList({ items, mark }: { items: string[]; mark: string }) {
  return (
    <ul className="mt-5 space-y-4">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span style={PIXEL_FONT}>{mark}</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** A croc swallowing the certificates, in the empty bottom half. */
const A2_CRITTERS = [
  ...deck.croc(12, 176, 3, true),
  ...sinkingCert(94, 178, 2),
  ...sinkingCert(128, 196, 2, 0.35),
  ...sinkingCert(150, 168, 1, 0.55),
  ...deck.bubbles(90, 174, 4),
  ...deck.weed(160, 14),
];

export function SlideA2() {
  return (
    <GridSlideFrame id="shift1-grid-a-2" tag="CERT VS LIVE WORK" title="กรรมการเห็นอะไรในพอร์ต" page="2/4" critters={A2_CRITTERS}>
      <p className="font-kodchasan text-[66px] font-bold leading-[1.2]" style={{ color: MUTED }}>
        <span className="line-through decoration-[6px]" style={{ textDecorationColor: PX.accent }}>
          ใบเซอร์ ใครก็มี
        </span>
      </p>
      <p className="font-kodchasan text-[66px] font-bold leading-[1.2]" style={{ color: PX.accentLight }}>
        ของที่คนใช้จริง มีแค่เรา
      </p>
      <div className="mt-10 flex items-stretch gap-5">
        <DeckCard className="w-[40%] text-[26px] leading-[1.4]">
          <p className="font-kodchasan text-[30px] font-bold" style={{ color: MUTED }}>
            ใบเซอร์ค่ายนั่งฟัง
          </p>
          <div style={{ color: MUTED }}>
            <CompareList items={CERT_SIDE} mark="×" />
          </div>
        </DeckCard>
        <DeckCard hot className="flex-1 text-[30px] font-semibold leading-[1.4]">
          <p className="font-kodchasan text-[42px] font-bold leading-tight">Live Project</p>
          <CompareList items={LIVE_SIDE} mark="+" />
        </DeckCard>
      </div>
    </GridSlideFrame>
  );
}

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** One pilot project told in depth: what it is, how it works, and the proof. */
function ProjectCard({ project, index }: { project: ShiftShowcaseProject; index: number }) {
  return (
    <DeckCard className="!py-7">
      <div className="flex items-center gap-5">
        <Plate label={String(index + 1)} size={52} hot={index === 0} />
        <div className="min-w-0">
          <p className="font-kodchasan text-[38px] font-bold leading-tight">{project.title}</p>
          <p className="truncate text-[19px]" style={{ ...PIXEL_FONT, color: MUTED }}>
            {shortUrl(project.url)}
          </p>
        </div>
      </div>
      <p className="mt-4 font-kodchasan text-[28px] font-bold leading-[1.35]" style={{ color: PX.accentLight }}>
        {project.pitch}
      </p>
      <p className="mt-2 text-[24px] leading-[1.5]" style={{ color: MUTED }}>
        {project.detail}
      </p>
      {project.proof && (
        <p className="mt-3 flex items-start gap-3 text-[23px] font-semibold leading-[1.45]" style={{ color: PX.cream }}>
          <span
            className="mt-[3px] shrink-0 px-2 py-0.5 text-[17px] tracking-[0.1em]"
            style={{ ...PIXEL_FONT, backgroundColor: PX.accent, color: PX.ink }}
          >
            PROOF
          </span>
          {project.proof}
        </p>
      )}
    </DeckCard>
  );
}

export function SlideA3() {
  const projects = (SHIFT_COHORT_0.showcase ?? []).filter((p) => p.featured).slice(0, 3);
  return (
    <GridSlideFrame id="shift1-grid-a-3" tag={`${SHIFT_COHORT_0.name} · PILOT`} title="รุ่นทดลองปล่อยของจริงแล้ว" page="3/4">
      <div className="space-y-5">
        {projects.map((project, i) => (
          <ProjectCard key={project.url} project={project} index={i} />
        ))}
      </div>
    </GridSlideFrame>
  );
}

/** A big fish and a school drifting up the free right-hand column. */
const A4_CRITTERS = [
  ...deck.bigFish(134, 84, 3),
  ...deck.school(140, 136, 5),
  ...deck.bubbles(150, 128, 5),
  ...deck.weed(156, 20),
  ...deck.weed(12, 8),
];

export function SlideA4() {
  return (
    <GridSlideFrame id="shift1-grid-a-4" tag="SDT THEORY" title="ทำไมไม่ใช่ค่ายนั่งฟัง" page="4/4" critters={A4_CRITTERS}>
      <div className="max-w-[730px] space-y-11">
        {SHIFT_SDT.map((pillar, i) => (
          <div
            key={pillar.pillar}
            className="border-l-[6px] pl-8"
            style={{ borderColor: i === 0 ? PX.accent : `${PX.cream}33` }}
          >
            <p className="text-[24px] tracking-[0.12em]" style={{ ...PIXEL_FONT, color: PX.accentLight }}>
              {pillar.pillar.toUpperCase()}
            </p>
            <p className="mt-1 font-kodchasan text-[54px] font-bold leading-[1.15]" style={{ color: PX.cream }}>
              {pillar.title}
            </p>
            <p className="mt-2 text-[27px] leading-[1.5]" style={{ color: MUTED }}>
              {pillar.detail}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-auto pb-2 font-kodchasan text-[40px] font-bold" style={{ color: PX.cream }}>
        สมัคร {SHIFT_COHORT.name} <span style={{ color: PX.accentLight }}>ลิงก์ในไบโอ</span>
      </p>
    </GridSlideFrame>
  );
}
