/**
 * SHIFT[1] testimonial Reels (1080x1920, ~21s): one SHIFT[0] student each,
 * over the same flooded city as the IG grid. Built for cold Meta traffic:
 * the shipped app is the hook, the proof comes second, the student's own
 * words third, and every text line sits above the bottom 35% ads UI.
 *
 * Quotes are verbatim excerpts, spelling included; the student's voice is the
 * proof, so it is not polished. Students are minors: no name, no face, no
 * synthetic voice, only the project they shipped.
 *
 * Everything runs on one beat grid so the generated soundtrack
 * (scripts/shift-reel-audio.py) hits on every cut, word and price slam.
 * Captions split on "|" into chunks that pop in on consecutive beats.
 */

export const BPM = 120;
/** Seconds per beat. */
export const BEAT = 60 / BPM;

export type SceneId = "hook" | "proof" | "before" | "mentors" | "proud" | "cta";

/** Scene starts in beats; the last entry is the end of the Reel. */
const BEATS: [SceneId | "end", number][] = [
  ["hook", 0],
  ["proof", 6],
  ["before", 10],
  ["mentors", 18],
  ["proud", 26],
  ["cta", 32],
  ["end", 42],
];

export const REEL_SECONDS = BEATS.at(-1)![1] * BEAT;

export interface ReelScene {
  id: SceneId;
  /** Seconds from the start of the Reel. */
  start: number;
  end: number;
  /** Pixel tag above the headline. */
  tag: string;
  /** "\n" breaks the line. On "proud" the last line gets the marker. */
  headline: string;
  /** Verbatim quote, chunked with "|". */
  caption?: string;
}

export interface ReelProof {
  /** The stamp. With `count`, it counts up from 0 and `big` is the suffix. */
  big: string;
  count?: number;
  small: string;
}

export interface ReelProduct {
  title: string;
  /** Screens captured from the live app, crossfaded in order. */
  shots: string[];
  /** Screens are bare app pages and need a phone bezel drawn around them. */
  bezel: boolean;
}

export interface TestimonialReel {
  slug: string;
  attribution: string;
  product: ReelProduct;
  proof: ReelProof;
  scenes: ReelScene[];
}

type SceneCopy = Omit<ReelScene, "start" | "end">;

function timed(copy: SceneCopy[]): ReelScene[] {
  return copy.map((scene) => {
    const i = BEATS.findIndex(([id]) => id === scene.id);
    return { ...scene, start: BEATS[i][1] * BEAT, end: BEATS[i + 1][1] * BEAT };
  });
}

const HOOK: SceneCopy = { id: "hook", tag: "REAL PROJECT · SHIFT[0]", headline: "น้องทำเอง\nใน 7 วัน" };
const PROOF: SceneCopy = { id: "proof", tag: "NOT A SLIDE DECK", headline: "" };
const CTA: SceneCopy = { id: "cta", tag: "5-11 OCT · ONLINE", headline: "SHIFT[1]" };

const LENS: TestimonialReel = {
  slug: "lens",
  attribution: "น้อง SHIFT[0] · คนทำ Magnified Lens",
  product: {
    title: "Magnified Lens",
    shots: ["/shift/testimonial/lens-label.png", "/shift/testimonial/lens-zoom.png"],
    bezel: false,
  },
  proof: { count: 15, big: "+", small: "คนลองใช้จริง" },
  scenes: timed([
    HOOK,
    PROOF,
    {
      id: "before",
      tag: "EXPECTATION",
      headline: "คนละอย่าง\nเลยครับ",
      caption: "ตอนแรกผมคิดว่า|พวกพี่ๆ จะพาทํา|แบบบอกขั้นตอน|แต่พอเข้ามาจิงจิง|มันคนละอย่างเลยครับ",
    },
    {
      id: "mentors",
      tag: "MENTORS: HANDS OFF",
      headline: "คิดเอง\nแก้ปัญหาเอง",
      caption: "พี่ค่อยคอยดูอยู่ห่างๆ|ให้น้องคิดเอง|แก้ปัญหาเอง",
    },
    {
      id: "proud",
      tag: "OWN WORK",
      headline: "ไม่คิดว่าตัวเอง\nจะทําได้ขนาดนี้",
      caption: "รู้สึกภูมิใจ|ในตัวเองมากครับ",
    },
    CTA,
  ]),
};

const KASPT70: TestimonialReel = {
  slug: "kaspt70",
  attribution: "น้อง SHIFT[0] · คนทำปฏิทิน กสพท70",
  product: {
    title: "ปฏิทิน กสพท70",
    shots: ["/shift/testimonial/kaspt70-countdown.png", "/shift/testimonial/kaspt70-timeline.png"],
    bezel: true,
  },
  proof: { big: "เปลี่ยนโจทย์", small: "หลังคุยกับคนใช้จริง" },
  scenes: timed([
    HOOK,
    PROOF,
    {
      id: "before",
      tag: "BEFORE",
      headline: "มีไอเดียแล้ว\nแต่เริ่มไม่ถูก",
      caption: "ไม่รู้เลยว่า|ถ้าจะทำโปรเจกต์จริง|ต้องเริ่มจากตรงไหน",
    },
    {
      id: "mentors",
      tag: "MENTORS",
      headline: "ใจดีมาก\nไม่มีดุ",
      caption: "ไม่มีคนมาคอยกดดัน|พี่ๆ มาคอยช่วยดู|แบบเรียงคน|เลยใส่ใจมาก",
    },
    {
      id: "proud",
      tag: "OWN WORK",
      headline: "ทำได้โดยที่\nไม่ต้องพึ่งคนอื่น",
      caption: "ตอนที่ทำโปรเจกเสร็จ|เลยรู้สึกภูมิใจมาก",
    },
    CTA,
  ]),
};

export const TESTIMONIAL_REELS: TestimonialReel[] = [LENS, KASPT70];

export function getTestimonialReel(slug: string | undefined): TestimonialReel {
  return TESTIMONIAL_REELS.find((r) => r.slug === slug) ?? TESTIMONIAL_REELS[0];
}

/**
 * Camera per scene over the 3-tile panorama: translateX drifts from the first
 * value to the second, then hard-cuts to the next scene. The boat for the
 * product, tile A (sinking certificates) for "before", the testers' roof
 * (tile C) for the payoff and the offer.
 */
export const CAMERA: Record<SceneId, [from: number, to: number]> = {
  hook: [-980, -1080],
  proof: [-1120, -1180],
  before: [-40, -260],
  mentors: [-960, -1100],
  proud: [-1700, -1860],
  cta: [-2060, -2160],
};

/** CTA lines land on consecutive beats after the scene starts. */
export const CTA_BEATS = { wordmark: 0, line: 1, marker: 2, seats: 4, price: 5, deadline: 6, url: 7 } as const;
