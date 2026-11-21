import { EL } from "@/components/hackathon/poster/elemental/brand";

export type ElementKey = "earth" | "water" | "air" | "fire" | "aether";

export const ELEMENT_SCRUB_FRAME_COUNT = 36;

export function elementFrameUrl(key: ElementKey, frameIndex: number): string {
  const clamped = Math.min(ELEMENT_SCRUB_FRAME_COUNT, Math.max(1, frameIndex));
  return `/hackathon/elemental/media/frames/${key}/${String(clamped).padStart(2, "0")}.webp`;
}

export const KEY_VISUAL_MEDIA = {
  poster: "/hackathon/elemental/media/key-visual.webp",
  posterVertical: "/hackathon/elemental/media/key-visual-9x16.webp",
  loop: "/hackathon/elemental/media/key-visual-loop.mp4",
  sceneLoop: "/hackathon/elemental/media/key-visual-scene-loop.mp4",
  scenePoster: "/hackathon/elemental/media/elements/water-before.webp",
} as const;

export const TEASER_MEDIA = {
  video4x5: "/hackathon/elemental/media/teaser.mp4",
  poster4x5: "/hackathon/elemental/media/teaser.webp",
  video9x16: "/hackathon/elemental/media/teaser-reels.mp4",
  poster9x16: "/hackathon/elemental/media/teaser-reels.webp",
} as const;

export interface ElementChapter {
  key: ElementKey;
  en: string;
  th: string;
  subtitleTh: string;
  whatHappensTh: string;
  examplesTh: string;
  color: string;
  video: string;
  before: string;
  after: string;
  credit: string;
}

export const ELEMENT_CHAPTERS: readonly ElementChapter[] = [
  {
    key: "earth",
    en: "Earth",
    th: "ดิน",
    subtitleTh: "ขยะและดินที่ปนเปื้อน",
    whatHappensTh: "ภูเขาขยะอิเล็กทรอนิกส์ผุดขึ้นกลางหุบเขา แล้วค่อยๆ กัดกินผืนดินจนแห้งตาย",
    examplesTh: "ขยะอิเล็กทรอนิกส์ · ขยะล้นเมือง · ดินปนเปื้อนสารพิษ · แหล่งฝังกลบที่รั่วซึม",
    color: EL.toxicRust,
    video: "/hackathon/elemental/media/elements/earth.mp4",
    before: "/hackathon/elemental/media/elements/earth-before.webp",
    after: "/hackathon/elemental/media/elements/earth-after.webp",
    credit: "Rice terraces: rawpixel 3288128 (CC0)",
  },
  {
    key: "water",
    en: "Water",
    th: "น้ำ",
    subtitleTh: "น้ำเสียที่ไหลลงแม่น้ำ",
    whatHappensTh: "ท่อระบายผุดขึ้นริมตลิ่ง ปล่อยน้ำเสียจนแม่น้ำเปลี่ยนเป็นสีเขียวพิษพร้อมถังเคมีรั่ว",
    examplesTh: "น้ำเสียจากโรงงาน · สารเคมีในแหล่งน้ำดื่ม · ไมโครพลาสติก · น้ำเพื่อการเกษตร",
    color: EL.toxicCyan,
    video: "/hackathon/elemental/media/elements/water.mp4",
    before: "/hackathon/elemental/media/elements/water-before.webp",
    after: "/hackathon/elemental/media/elements/water-after.webp",
    credit: "River valley: Joana Abreu on Unsplash",
  },
  {
    key: "air",
    en: "Air",
    th: "ลม",
    subtitleTh: "ฝุ่นและควันพิษในอากาศ",
    whatHappensTh: "โรงงานตั้งตระหง่านขึ้นกลางทุ่ง แล้วพ่นหมอกควันสีหม่นกลืนฟ้าทั้งหุบเขา",
    examplesTh: "ฝุ่น PM2.5 · ควันจากการเผาในที่โล่ง · ไอเสียโรงงานใกล้ชุมชน · การปล่อยคาร์บอน",
    color: EL.toxicYellow,
    video: "/hackathon/elemental/media/elements/air.mp4",
    before: "/hackathon/elemental/media/elements/air-before.webp",
    after: "/hackathon/elemental/media/elements/air-after.webp",
    credit: "Lamar Valley: NPS / Jacob W. Frank (Public domain)",
  },
  {
    key: "fire",
    en: "Fire",
    th: "ไฟ",
    subtitleTh: "ไฟและความร้อนที่ลุกลาม",
    whatHappensTh: "ประกายไฟจุดติดขึ้นในพงหญ้า ลามเผาทุ่งโล่งจนเหลือเพียงเถ้าถ่านและเปลวไฟสีส้มเดือด",
    examplesTh: "อัคคีภัยในโรงงานและอาคาร · โกดังสารเคมี · การเผาไร่และไฟป่าที่คุมไม่อยู่",
    color: EL.flame,
    video: "/hackathon/elemental/media/elements/fire.mp4",
    before: "/hackathon/elemental/media/elements/fire-before.webp",
    after: "/hackathon/elemental/media/elements/fire-after.webp",
    credit: "Meadow: Coconino National Forest (CC0)",
  },
  {
    key: "aether",
    en: "Aether",
    th: "อีเธอร์",
    subtitleTh: "ภัยที่มองไม่เห็น",
    whatHappensTh: "ดาต้าเซ็นเตอร์ขนาดยักษ์ผุดขึ้น ดึงไฟจากสายส่งจนแสงสีม่วงแล่นผ่านและทุ่งนาแห้งเหือด",
    examplesTh: "พลังงานที่แอปและ AI ใช้ · การฟอกเขียว · ข่าวปลอม · ขยะที่ไร้ปลายทาง",
    color: EL.aetherViolet,
    video: "/hackathon/elemental/media/elements/aether.mp4",
    before: "/hackathon/elemental/media/elements/aether-before.webp",
    after: "/hackathon/elemental/media/elements/aether-after.webp",
    credit: "Rice field with pylons: rawpixel 3340500 (CC0)",
  },
] as const;
