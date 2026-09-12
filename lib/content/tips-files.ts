/**
 * The Tips PDFs handed out from Instagram DMs.
 *
 * Each entry gets a short branded URL (`passionseed.org/tips/<slug>`) that
 * renders a link preview card before handing the reader the PDF. A raw
 * `pseed-dev.s3.us-east-005.backblazeb2.com/...` link wraps onto three lines in
 * a DM, shows no preview, and reads as a phishing attempt, so it is never the
 * link we send.
 */
export interface TipsFile {
  slug: string;
  /** Card title, shown in the Instagram/LINE link preview. */
  title: string;
  description: string;
  /** The PDF itself, served through the CDN domain rather than the raw bucket. */
  fileUrl: string;
}

const CDN_BASE = "https://cdn.passionseed.org/tips";

export const TIPS_FILES: TipsFile[] = [
  {
    slug: "intro",
    title: "เริ่มต้นหาตัวเอง",
    description: "ทิปส์สำหรับคนที่เพิ่งเริ่มคิดว่าอยากเรียนอะไร ทำอะไรต่อ",
    fileUrl: `${CDN_BASE}/Intro_Tips.pdf`,
  },
  {
    slug: "find-path",
    title: "หาเส้นทางของตัวเอง",
    description: "ทิปส์สำหรับคนที่กำลังเลือกระหว่างหลายทาง ยังตัดสินใจไม่ได้",
    fileUrl: `${CDN_BASE}/FindPath_Tips.pdf`,
  },
  {
    slug: "going",
    title: "ลงมือทำจริง",
    description: "ทิปส์สำหรับคนที่รู้แล้วว่าอยากไปทางไหน และกำลังลงมือทำ",
    fileUrl: `${CDN_BASE}/Going_Tips.pdf`,
  },
  {
    slug: "last-stage",
    title: "ช่วงโค้งสุดท้าย",
    description: "ทิปส์สำหรับคนที่ใกล้ยื่นพอร์ต ใกล้สอบ ใกล้ตัดสินใจครั้งสำคัญ",
    fileUrl: `${CDN_BASE}/LastStage_Tips.pdf`,
  },
];

export function getTipsFile(slug: string): TipsFile | undefined {
  return TIPS_FILES.find((f) => f.slug === slug);
}
