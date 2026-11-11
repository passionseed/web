/**
 * Copy for the public home page, site nav, and site footer. SHIFT is the lead
 * offer, so every section here points back at /shift. Cohort facts (dates,
 * price, seats) are never written here: they come from the cohort data so a new
 * round only edits lib/content/shift-cohort.ts.
 */

import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import { AFTERSHIFT_PROMISE } from "@/lib/content/aftershift";
import { SHIFT_COHORT, SHIFT_COHORT_0, SHIFT_PAYMENT, type ShiftShowcaseProject } from "@/lib/content/shift-cohort";

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

/**
 * Silent screen recordings from the SHIFT[1] demo day, keyed by showcase
 * title. Each file in public/shift/demo is cropped to the app itself: no
 * browser tabs, no taskbar, no Discord window, no voice. Add a project here
 * only after the student and a parent agreed to app clips (see the consent
 * note kept with the footage). An empty map leaves the hero as copy
 * only and brings back the SHIFT[0] phones.
 *
 * Thai reviewed by Codex, Antigravity and Cursor on 2026-11-11; lines two or
 * more of them flagged were rewritten.
 */
const DEMO_CLIPS: Record<string, string> = {
  "USE NEXT": "use-next",
  HabitPerk: "habitperk",
  "TCAS Command Center": "tcas-command-center",
  TAX: "tax",
};

export interface HomeDemo extends ShiftShowcaseProject {
  video: string;
  poster: string;
  /** The app's address, shown in the browser bar of the frame. */
  host: string;
}

const DEMO_PROJECTS = SHIFT_COHORT.showcase ?? [];

export const HOME_DEMOS: HomeDemo[] = DEMO_PROJECTS.filter((p) => DEMO_CLIPS[p.title]).map((p) => ({
  ...p,
  video: `/shift/demo/${DEMO_CLIPS[p.title]}.mp4`,
  poster: `/shift/demo/${DEMO_CLIPS[p.title]}.jpg`,
  host: new URL(p.url).host,
}));

export const HOME_DEMO_COPY = {
  round: SHIFT_COHORT.name,
  heading: `แอปจริงจาก demo day ของ ${SHIFT_COHORT.name}`,
  lede: `${DEMO_PROJECTS.length} โปรเจกต์ที่นักเรียน ม.ปลายสร้างเองใน 7 วัน คลิป ${HOME_DEMOS.length} แอปนี้อัดไว้ตอน demo day และตอนนี้ยังเปิดให้เข้าไปลองใช้อยู่`,
  tryIt: "ลองใช้ของจริง",
};

/** One real frame of a session: seven screens shared at once in Discord. */
export const HOME_SESSION_SHOT = {
  src: "/shift/demo/session-live.jpg",
  width: 1600,
  height: 586,
  alt: `หน้าจอ Discord ระหว่างนัดของ ${SHIFT_COHORT.name} มี 7 จอแชร์อยู่พร้อมกัน`,
  label: "ภาพตอนทำงานจริงใน Discord",
  caption: `${SHIFT_COHORT.name}: แชร์จอพร้อมกัน 7 จอ ต่างคนต่างสร้างของตัวเอง`,
};

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
    title: "ทำครบแล้วไม่คุ้ม คืนเงินเต็ม",
    body: "ถ้าทำครบทุกขั้นตอนทั้ง 7 วันแล้วยังรู้สึกว่าไม่คุ้ม คืนเงินเต็มจำนวน",
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
  {
    step: "03",
    name: "SHIFT High",
    href: "/shift/alumni",
    body: AFTERSHIFT_PROMISE,
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
