/**
 * Copy for the public home page, site nav, and site footer. SHIFT is the lead
 * offer, so every section here points back at /shift. Cohort facts (dates,
 * price, seats) are never written here: they come from the cohort data so a new
 * round only edits lib/content/shift-cohort.ts.
 */

import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import { SHIFT_COHORT_0, SHIFT_PAYMENT, type ShiftShowcaseProject } from "@/lib/content/shift-cohort";

export interface HomeLink {
  href: string;
  label: string;
}

export const SITE_NAV_LINKS: HomeLink[] = [
  { href: "/shift", label: "SHIFT" },
  { href: "/techseed", label: "TechSeed" },
  { href: "/radar", label: "Career Radar" },
  { href: "/about", label: "เกี่ยวกับเรา" },
];

export interface FooterColumn {
  title: string;
  links: HomeLink[];
}

export const SITE_FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Programs",
    links: [
      { href: "/shift", label: "SHIFT 7-Day Sandbox" },
      { href: "/shift/apply", label: "สมัคร SHIFT" },
      { href: "/techseed", label: "TechSeed Gallery" },
      { href: "/hackathon", label: "Hackathon" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/radar", label: "Career Radar" },
      { href: "/map", label: "PathLab" },
      { href: "/tcas", label: "TCAS" },
    ],
  },
  {
    title: "PassionSeed",
    links: [
      { href: "/about", label: "เกี่ยวกับเรา" },
      { href: "/contact", label: "ติดต่อเรา" },
      { href: SHIFT_PAYMENT.lineUrl, label: `LINE OA: ${SHIFT_PAYMENT.lineId}` },
      { href: "/support", label: "ช่วยเหลือ" },
    ],
  },
];

export const SITE_LEGAL_LINKS: HomeLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
];

export const SITE_SOCIAL_LINKS: HomeLink[] = [
  { href: "https://www.instagram.com/passionseed", label: "Instagram" },
  { href: "https://github.com/passionseed", label: "GitHub" },
];

/** Certificate camp vs SHIFT, row by row. */
export const HOME_CONTRAST = {
  camp: [
    "นั่งฟังบรรยายทั้งวัน แล้วรับใบเซอร์",
    "ใบเซอร์ที่เด็กอีก 1,000 คนก็มีเหมือนกัน",
    "พอร์ตสวยเพอร์เฟกต์ ที่อาจารย์มองว่าเมค",
  ],
  shift: [
    "ลงมือสร้างตั้งแต่วันแรก ไม่มีสไลด์บรรยาย",
    "ของจริงที่คนนอกได้ลองใช้ พร้อมตัวเลขจริง",
    "บันทึกจุดพัง ว่าอะไรพัง และเราแก้ยังไง",
  ],
};

/** Real screens from the apps SHIFT[0] shipped, two per app, keyed by title. */
const SHOWCASE_SHOTS: Record<string, [string, string]> = {
  "Magnified Lens": ["/shift/testimonial/lens-zoom.png", "/shift/testimonial/lens-label.png"],
  TradBid: ["/shift/testimonial/tradbid.png", "/shift/testimonial/tradbid-sim.png"],
  "ปฏิทิน กสพท70": ["/shift/testimonial/kaspt70-countdown.png", "/shift/testimonial/kaspt70-timeline.png"],
};

export interface HomeShowcaseProject extends ShiftShowcaseProject {
  shots: [string, string];
}

/** The pilot's featured apps that have screens to show. */
export const HOME_SHOWCASE: HomeShowcaseProject[] = (SHIFT_COHORT_0.showcase ?? [])
  .filter((p) => p.featured && SHOWCASE_SHOTS[p.title])
  .map((p) => ({ ...p, shots: SHOWCASE_SHOTS[p.title] }));

/** One icon per sprint day, in schedule order. */
export const HOME_DAY_ICONS: RisoIconName[] = ["lock", "chat", "hammer", "send", "bug", "gauge", "mic"];

/** What a parent's three worries get answered with, in HOME_PARENT_POINTS order. */
export const HOME_PARENT_ICONS: RisoIconName[] = ["search", "lock", "target"];

export const HOME_DELIVERABLES = [
  "ผลงานที่คนนอกใช้ได้จริง",
  "บันทึกการทดลองและจุดพัง",
  "พอร์ต TCAS 1 หน้า",
];

export interface HomeParentPoint {
  title: string;
  body: string;
}

/** What the buyer needs: evidence, safety, and a way out if it fails. */
export const HOME_PARENT_POINTS: HomeParentPoint[] = [
  {
    title: "หลักฐานที่ลอกกันไม่ได้",
    body: "ลิงก์ผลงานจริง ตัวเลขผู้ใช้ และบันทึกจุดพังที่มีวันที่กำกับ กรรมการถามต่อได้ทุกบรรทัด",
  },
  {
    title: "ปลอดภัยทุกช่องทาง",
    body: "ทุกการคุยกับพี่เลี้ยงเกิดในห้องกลุ่มหรือเธรดที่ทีมงานเห็น ไม่มีแชทส่วนตัว 1:1 กับน้อง",
  },
  {
    title: "ไม่ได้ของ คืนเงินเต็ม",
    body: "ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานกับพอร์ต 1 หน้าในมือ คืนเงินเต็มจำนวน",
  },
];

export interface HomeLadderStep {
  step: string;
  name: string;
  href: string;
  body: string;
}

/** The product ladder, spark first, then the sandbox. */
export const HOME_LADDER: HomeLadderStep[] = [
  {
    step: "01",
    name: "TechSeed",
    href: "/techseed",
    body: "ลองลงมือสร้างครั้งแรก จากคนใช้เป็นคนทำ รุ่นพี่ที่จบไปกลับมาเป็นพี่เลี้ยงรุ่นถัดไป",
  },
  {
    step: "02",
    name: "SHIFT",
    href: "/shift",
    body: "7 วัน 1 โปรเจกต์จริง ปล่อยให้คนนอกใช้ เก็บ failure data แล้วเล่าเป็นพอร์ต 1 หน้า",
  },
];

export const HOME_EXPLORE: (HomeLink & { body: string })[] = [
  {
    href: "/radar",
    label: "Career Radar",
    body: "ดูว่าอาชีพที่สนใจกำลังจะเปลี่ยนไปทางไหน ก่อนเลือกคณะ",
  },
  {
    href: "/map",
    label: "PathLab",
    body: "ลองทำงานจริงของสายอาชีพแบบสั้นๆ ก่อนตัดสินใจ",
  },
  {
    href: "/hackathon",
    label: "Hackathon",
    body: "แข่งสร้างของจริงเป็นทีม กับโจทย์จากคนทำงานจริง",
  },
];

/** Basecamp-style margin notes, one per section. */
export const HOME_NOTES = {
  hero: "เขียนโค้ดไม่เป็นก็มาได้",
  contrast: "ของพังก็ใส่พอร์ตได้นะ",
  showcase: "กดลองใช้ได้จริงนะ ไม่ใช่ภาพม็อก",
  week: "วันละ 1-2 ชั่วโมง ไม่ต้องลาเรียน",
  proof: "รุ่นพี่เขียนเองทุกคน",
  parents: "พี่เลี้ยงไม่ทำงานแทนน้อง",
};
