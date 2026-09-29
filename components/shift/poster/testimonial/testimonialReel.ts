/**
 * SHIFT[1] testimonial Reels (1080x1920): one SHIFT[0] student each, in their
 * own words, over the same flooded city as the IG grid. Quotes are verbatim
 * excerpts, spelling included; the student's voice is the proof, so it is not
 * polished. Students are minors: no name, only the project they shipped.
 *
 * Every Reel runs the same six beats on the same clock, so the camera pan,
 * the render length and the layout are shared and a new kid is a data edit.
 * Captions split on "|" into chunks that pop in one after another.
 */

/** Total length in seconds. */
export const REEL_SECONDS = 33;

export type SceneId = "before" | "turn" | "mentors" | "product" | "proud" | "cta";

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
  /** Our line, not the student's: drawn without quote marks. */
  narrator?: boolean;
}

export interface ReelProduct {
  /** One short line of evidence, from the SHIFT[0] showcase. */
  proof: string;
  /** Screens captured from the live app, crossfaded in order. */
  shots: string[];
  /** Screens are bare app pages and need a phone bezel drawn around them. */
  bezel: boolean;
}

export interface TestimonialReel {
  slug: string;
  attribution: string;
  product: ReelProduct;
  scenes: ReelScene[];
}

type SceneCopy = Omit<ReelScene, "start" | "end">;

/** The shared clock: when each beat starts. */
const BEATS: [SceneId, number][] = [
  ["before", 0],
  ["turn", 5.5],
  ["mentors", 10.5],
  ["product", 16.5],
  ["proud", 22.5],
  ["cta", 27.5],
];

function timed(copy: SceneCopy[]): ReelScene[] {
  return copy.map((scene) => {
    const i = BEATS.findIndex(([id]) => id === scene.id);
    const next = BEATS[i + 1];
    return { ...scene, start: BEATS[i][1], end: next ? next[1] : REEL_SECONDS };
  });
}

const CTA: SceneCopy = { id: "cta", tag: "5-11 OCT · ONLINE", headline: "SHIFT[1]" };

const LENS: TestimonialReel = {
  slug: "lens",
  attribution: "น้อง SHIFT[0] · คนทำ Magnified Lens",
  product: {
    proof: "คนลองใช้จริง 15+ คน",
    shots: ["/shift/testimonial/lens-label.png", "/shift/testimonial/lens-zoom.png"],
    bezel: false,
  },
  scenes: timed([
    {
      id: "before",
      tag: "REAL FEEDBACK · SHIFT[0]",
      headline: "ตอนแรกผมคิดว่า...",
      caption: "เข้ามาแล้วพวกพี่ๆ|น่าจะสอนทําโครงงาน|ทําportอะไรงี้ครับ|แบบบอกขั้นตอนวิธีทํา",
    },
    {
      id: "turn",
      tag: "REALITY",
      headline: "คนละอย่าง\nเลยครับ",
      caption: "แต่พอเข้ามาจิงจิงแล้ว|เลยรู้ว่ามัน|คนละอย่างเลยครับ",
    },
    {
      id: "mentors",
      tag: "MENTORS: HANDS OFF",
      headline: "คิดเอง\nแก้ปัญหาเอง",
      caption: "พี่ค่อยคอยดูอยู่ห่างๆ|ให้น้องคิดเอง|แก้ปัญหาเอง|ยกเว้นบางอย่างที่สําคัญจิงจิง|พี่เขาถึงจะสอนครับ",
    },
    {
      id: "product",
      tag: "WHAT THEY SHIPPED",
      headline: "Magnified Lens",
      caption: "แว่นขยายบนมือถือ|สำหรับคนที่อ่านตัวหนังสือเล็กไม่ถนัด",
      narrator: true,
    },
    {
      id: "proud",
      tag: "OWN WORK",
      headline: "ไม่คิดว่าตัวเอง\nจะทําได้ขนาดนี้",
      caption: "พอผลงานออกมาสุดท้ายแล้ว|ก็รู้สึกภูมิใจในตัวเองมากครับ|อันนี้คืองานที่เราได้ทําเอง|คิดเองจิงจิง",
    },
    CTA,
  ]),
};

const KASPT70: TestimonialReel = {
  slug: "kaspt70",
  attribution: "น้อง SHIFT[0] · คนทำปฏิทิน กสพท70",
  product: {
    proof: "คุยกับคนใช้จริง แล้วเปลี่ยนโจทย์",
    shots: ["/shift/testimonial/kaspt70-countdown.png", "/shift/testimonial/kaspt70-timeline.png"],
    bezel: true,
  },
  scenes: timed([
    {
      id: "before",
      tag: "REAL FEEDBACK · SHIFT[0]",
      headline: "มีไอเดียแล้ว\nแต่เริ่มไม่ถูก",
      caption: "ก่อนเข้า ผมมีไอเดีย|ที่อยากทำใส่พอตอยู่แล้ว|แต่ปัญหาคือ|ไม่รู้เลยว่าถ้าจะทำโปรเจกต์จริง|ต้องเริ่มจากตรงไหน",
    },
    {
      id: "turn",
      tag: "SCOPE LOCK",
      headline: "ให้เหลือ\n1 ฟังชั่น",
      caption: "โปรเจกที่คิดไว้มันทำได้ยาก|ให้เหลือ 1 ฟังชั่น|ที่อยากให้มี",
    },
    {
      id: "mentors",
      tag: "MENTORS",
      headline: "ใจดีมาก\nไม่มีดุ",
      caption: "ไม่มีคนมาคอยกดดัน|แต่ถ้าติดขัดอะไร|ถามพี่ในค่ายได้ตลอด|พี่ๆ มาคอยช่วยดูเป็นช่วงๆ|แบบเรียงคนเลยใส่ใจมาก",
    },
    {
      id: "product",
      tag: "WHAT THEY SHIPPED",
      headline: "ปฏิทิน กสพท70",
      caption: "ปฏิทินนับถอยหลัง|สำหรับเด็กสายหมอ",
      narrator: true,
    },
    {
      id: "proud",
      tag: "OWN WORK",
      headline: "ทำได้โดยที่\nไม่ต้องพึ่งคนอื่น",
      caption: "พี่ๆ จะให้แก้ปัญหาด้วยตัวเองก่อน|ตอนที่ทำโปรเจกเสร็จ|เลยรู้สึกภูมิใจมาก",
    },
    CTA,
  ]),
};

export const TESTIMONIAL_REELS: TestimonialReel[] = [LENS, KASPT70];

export function getTestimonialReel(slug: string | undefined): TestimonialReel {
  return TESTIMONIAL_REELS.find((r) => r.slug === slug) ?? TESTIMONIAL_REELS[0];
}

/**
 * Camera pan over the 3-tile panorama, in px of translateX. Tile A (sinking
 * certificates) while they talk about what they expected, the boat while
 * they talk about doing it alone, tile C (the testers' roof) for the payoff.
 */
export const PAN_STOPS: [seconds: number, x: number][] = [
  [0, 0],
  [5.5, -280],
  [10.5, -1032],
  [16.5, -1032],
  [22.5, -1180],
  [27.5, -2160],
];
