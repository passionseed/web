import { OFFER_BEATS, type CameraShot, type GradeStop, type Mood, type ReelCues } from "./reelEngine";
import storyVoice from "./storyVoice.json";

/**
 * SHIFT[1] MOFU Reel: why PassionSeed exists, told by the founder in voiceover
 * over the flooded city. The picture is cut to the voice: every line has a
 * start time, and scenes, camera, colour and sound all hang off those times.
 *
 * Until the voiceover is recorded, starts come from `est` (seconds per line,
 * pause included). Once it is, `scripts/shift-story-timing.mjs` measures the
 * pauses and writes the starts to storyVoice.json.
 *
 * Copy rules: no "SDT" on screen (say the three things plainly), no em dashes.
 */

export const LINES = [
  { id: "hate", est: 2.0, vo: "ทีมเราเกลียดสิ่งเดียวกัน" },
  { id: "cram", est: 3.6, vo: "ติวเพื่อสอบ สอบเสร็จก็ลืม ไร้ความหมาย" },
  { id: "love", est: 3.4, vo: "สิ่งที่เราชอบคือคอม เกม และอยากสร้างแอปเอง" },
  { id: "idol", est: 2.2, vo: "ไอดอลผมคือสตีฟ จ็อบส์" },
  { id: "access", est: 3.2, vo: "เพราะเขาเอาเทคโนโลยีไปอยู่ในมือทุกคน" },
  { id: "change", est: 4.2, vo: "ผมเลยอยากสร้างอะไรที่เปลี่ยนโลก และจุดเริ่มคือการศึกษา" },
  { id: "safe", est: 3.4, vo: "ผมเห็นเพื่อนๆ เลือกคณะที่สังคมบอกว่าเซฟ" },
  { id: "cramming", est: 2.0, vo: "อ่านสอบแทบตาย" },
  { id: "stuck", est: 4.2, vo: "พอเข้าไปเรียน ไม่สนุก แต่ก็ไม่กล้าซิ่ว ต้องทนเรียนต่อ" },
  { id: "future", est: 2.8, vo: "ไม่ชอบงานที่จะได้ อนาคตไม่รู้" },
  { id: "hopeless", est: 3.4, vo: "หมดหวัง" },
  { id: "mission", est: 4.4, vo: "เราอยากให้เด็กเลือกชีวิตตัวเองด้วยความมั่นใจ ไม่ใช่ความกังวล" },
  { id: "journey", est: 2.8, vo: "เราจัดค่าย จัดงานแข่งมาเรื่อยๆ" },
  { id: "antidote", est: 3.0, vo: "จนเจอยาแก้ความหมดหวังของยุคนี้" },
  { id: "choose", est: 1.6, vo: "เลือกด้วยตัวเองได้" },
  { id: "able", est: 1.6, vo: "มีความสามารถจริง" },
  { id: "friends", est: 1.9, vo: "เจอเพื่อนที่เข้าใจกัน" },
  { id: "shift", est: 4.6, vo: "SHIFT คือ 7 วัน ที่น้องเลือกโจทย์เอง สร้างเอง และมีคนใช้จริง" },
  { id: "cta", est: 3.2, vo: "SHIFT[1] รับแค่ 15 คน ลิงก์อยู่ในโปรไฟล์" },
] as const;

export type LineId = (typeof LINES)[number]["id"];

/** Measured line starts from the recorded voiceover, in LINES order. */
export const VOICE_STARTS: number[] | null = storyVoice.starts;

/** Music tempo. The picture follows the voice; the score keeps its own time. */
export const STORY_BEAT = 0.5;
/** Seconds the offer holds after the last line starts. */
const OFFER_HOLD = 5;

export interface StoryTimeline {
  seconds: number;
  /** Start of each line. */
  t: Record<LineId, number>;
  /** End of each line: the next line's start. */
  end: Record<LineId, number>;
}

export function storyTimeline(starts: number[] | null = VOICE_STARTS): StoryTimeline {
  const t = {} as Record<LineId, number>;
  const end = {} as Record<LineId, number>;
  let clock = 0.3;
  LINES.forEach((line, i) => {
    t[line.id] = starts ? starts[i] : clock;
    clock += line.est;
  });
  const seconds = t.cta + OFFER_HOLD;
  LINES.forEach((line, i) => {
    const next = LINES[i + 1];
    end[line.id] = next ? t[next.id] : seconds;
  });
  return { seconds, t, end };
}

/** Where a line's words land, as a fraction of the line (0..1). */
export const within = (tl: StoryTimeline, id: LineId, f: number) => tl.t[id] + (tl.end[id] - tl.t[id]) * f;

/* ---------- Scenes: which lines share a shot ---------- */

const SHOTS: { from: LineId; pan: [number, number] }[] = [
  { from: "hate", pan: [0, -160] },
  { from: "love", pan: [-980, -1060] },
  { from: "idol", pan: [-560, -700] },
  { from: "change", pan: [-700, -1000] },
  { from: "safe", pan: [-40, -320] },
  { from: "hopeless", pan: [-320, -340] },
  { from: "mission", pan: [-1000, -1080] },
  { from: "journey", pan: [-1080, -1300] },
  { from: "antidote", pan: [-1500, -1860] },
  { from: "shift", pan: [-1860, -2000] },
  { from: "cta", pan: [-2060, -2160] },
];

export function storyShots(tl: StoryTimeline): CameraShot[] {
  return SHOTS.map((shot, i) => ({
    start: i === 0 ? 0 : tl.t[shot.from],
    end: SHOTS[i + 1] ? tl.t[SHOTS[i + 1].from] : tl.seconds,
    pan: shot.pan,
  }));
}

/* ---------- Colour: grey rain for the problem, black for "หมดหวัง", sun for the answer ---------- */

type Look = Omit<GradeStop, "t">;
const CLEAR: Look = { saturate: 1, brightness: 1, rain: 0, night: 0, sun: 0 };
const DRIZZLE: Look = { saturate: 0.75, brightness: 1, rain: 0.5, night: 0, sun: 0 };

export function storyGrade(tl: StoryTimeline): GradeStop[] {
  const stops: GradeStop[] = [];
  let last: Look = DRIZZLE;
  const ease = (t: number, look: Look) => {
    stops.push({ t, ...look });
    last = look;
  };
  const cut = (t: number, look: Look) => {
    stops.push({ t, ...last });
    ease(t, look);
  };
  ease(0, DRIZZLE);
  cut(tl.t.love, CLEAR);
  cut(tl.t.safe, { saturate: 0.7, brightness: 1, rain: 0.5, night: 0, sun: 0 });
  ease(tl.t.cramming, { saturate: 0.55, brightness: 0.9, rain: 0.5, night: 0.55, sun: 0 });
  ease(tl.t.stuck, { saturate: 0.35, brightness: 0.9, rain: 0.9, night: 0.25, sun: 0 });
  ease(tl.t.future, { saturate: 0.2, brightness: 0.75, rain: 0.9, night: 0.3, sun: 0 });
  cut(tl.t.hopeless, { saturate: 0, brightness: 0.12, rain: 0.35, night: 0.6, sun: 0 });
  ease(tl.end.hopeless - 0.01, { saturate: 0, brightness: 0.12, rain: 0.35, night: 0.6, sun: 0 });
  cut(tl.t.mission, CLEAR);
  ease(tl.t.antidote, CLEAR);
  ease(tl.t.antidote + 1.5, { saturate: 1.15, brightness: 1.05, rain: 0, night: 0, sun: 0.9 });
  ease(tl.seconds, { saturate: 1.1, brightness: 1.03, rain: 0, night: 0, sun: 0.7 });
  return stops;
}

/* ---------- Sound cues ---------- */

/** When each cram stamp and each shipped phone lands, as line fractions. */
export const CRAM_STAMPS = [0.05, 0.38, 0.68] as const;
export const PHONE_LANDINGS = [0.3, 0.45, 0.6] as const;
export const HAMMER = { throwAt: 0.0, flight: 0.45 } as const;

export function storyCues(tl: StoryTimeline): ReelCues {
  const { t } = tl;
  const moods: [number, Mood][] = [
    [0, "light"],
    [t.safe, "dark"],
    [t.hopeless, "silent"],
    [t.mission, "build"],
    [t.antidote, "full"],
    [t.cta, "offer"],
  ];
  const offerPrice = t.cta + OFFER_BEATS.price * STORY_BEAT;
  return {
    seconds: tl.seconds,
    beat: STORY_BEAT,
    cuts: storyShots(tl).map((s) => s.start),
    slams: [
      ...CRAM_STAMPS.map((f) => within(tl, "cram", f)),
      t.access + HAMMER.flight,
      t.mission,
      t.antidote,
      t.cta,
      offerPrice,
    ],
    pops: [
      ...[0.2, 0.5, 0.8].map((f) => within(tl, "love", f)),
      within(tl, "change", 0.55),
      ...[0.1, 0.4, 0.7].map((f) => within(tl, "stuck", f)),
      within(tl, "journey", 0.5),
      t.choose,
      t.able,
      t.friends,
      ...PHONE_LANDINGS.map((f) => within(tl, "shift", f)),
      ...OFFER_BEATS.pops.map((b) => t.cta + b * STORY_BEAT),
    ].sort((a, b) => a - b),
    count: [t.journey + 0.2, t.journey + 1.4],
    coin: offerPrice,
    moods,
  };
}
