import {
  SHIFT_COHORT,
  SHIFT_COHORT_0,
  cohortPath,
  formatThaiDate,
  pairPriceBaht,
  priceLabel,
  teamSizeLabel,
  type ShiftShowcaseProject,
} from "@/lib/content/shift-cohort";

/**
 * Copy for the SHIFT Meta ad carousel: what goes on each card, and what goes
 * in Ads Manager around it (primary text, card headlines, links).
 *
 * The cards are written for cold traffic. Nobody in the feed knows SHIFT, so
 * the order is proof first, offer last: three real projects from SHIFT[0],
 * how the week works, then the selected cohort's offer. Every card also has
 * to make sense alone, because Meta shows each one with its own headline.
 */

// October 2 review: round 1 closes October 3; round 2 posters are separate.
export const AD_COHORT = SHIFT_COHORT;

/** Card 1 runs in two versions so the hook can be tested, not guessed. */
export type AdHook = "student" | "parent";
export const AD_HOOKS: AdHook[] = ["student", "parent"];

const EN_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "12-18 OCT", the pixel tag on the offer card. */
export function enDateRange(startIso: string, endIso: string): string {
  const [, m1, d1] = startIso.split("-").map(Number);
  const [, m2, d2] = endIso.split("-").map(Number);
  return m1 === m2
    ? `${d1}-${d2} ${EN_MONTHS[m1 - 1]}`
    : `${d1} ${EN_MONTHS[m1 - 1]}-${d2} ${EN_MONTHS[m2 - 1]}`;
}

/**
 * Per-card landing link. utm_source is what /shift attribution reads;
 * utm_content tells the cards apart in Meta and GA reports.
 */
export function adUrl(card: number, hook: AdHook = "student"): string {
  const params = new URLSearchParams({
    utm_source: "meta_ads",
    utm_medium: "paid_social",
    utm_campaign: `shift${AD_COHORT.round}_carousel`,
    utm_content: `card${card}${card === 1 ? `_${hook}` : ""}`,
  });
  return `https://passionseed.org${cohortPath(AD_COHORT)}?${params}`;
}

export interface AdProof {
  project: ShiftShowcaseProject;
  /** Live link shown on the card when it differs from the showcase entry. */
  url?: string;
  /** Real phone screenshot of the live project. */
  shot: string;
  tag: string;
  headline: string;
  sub: string;
}

function showcase(title: string): ShiftShowcaseProject {
  const project = SHIFT_COHORT_0.showcase?.find((p) => p.title === title);
  if (!project) throw new Error(`SHIFT[0] showcase is missing "${title}"`);
  return project;
}

/** Card 1's headline per hook. The project under it stays the same. */
export const HOOK_COPY: Record<AdHook, { tag: string; headline: string; sub: string }> = {
  student: {
    tag: "TCAS1 · PORTFOLIO",
    headline: "คุยกับคนใช้\nแล้วเปลี่ยนโจทย์",
    sub: "ปฏิทิน กสพท70 · ผลงาน SHIFT[0]",
  },
  parent: {
    tag: "FOR PARENTS · TCAS1",
    headline: "เห็นวิธีคิดลูก\nผ่านงานที่เขาสร้าง",
    sub: "ปฏิทิน กสพท70 · ผลงาน SHIFT[0]",
  },
};

/** Cards 1-3: one SHIFT[0] project each, strongest TCAS link first. */
export const AD_PROOFS: AdProof[] = [
  {
    project: showcase("ปฏิทิน กสพท70"),
    shot: "/shift/testimonial/kaspt70-countdown.png",
    ...HOOK_COPY.student,
  },
  {
    project: showcase("Magnified Lens"),
    shot: "/shift/testimonial/lens-zoom.png",
    tag: `${SHIFT_COHORT_0.name} · PROJECT 2`,
    headline: "มากกว่า 15 คน\nให้ฟีดแบ็กจริง",
    sub: "Magnified Lens · ผลงาน SHIFT[0]",
  },
  {
    project: showcase("TradBid"),
    url: "https://trad-bid.vercel.app/sim",
    shot: "/shift/testimonial/tradbid-sim.png",
    tag: `${SHIFT_COHORT_0.name} · PROJECT 3`,
    headline: "ปล่อย v1 แล้ว\nอัปเป็น v2 ในรุ่นเดียว",
    sub: "TradBid: มังงะ + เกมหุ้น ใช้เงินจำลอง",
  },
];

/** Card 4: the week in four beats, no jargon. */
export const AD_WEEK = [
  { days: "1", title: "เลือกโจทย์เดียว", detail: "เราเลือกเอง พี่เลี้ยงช่วยถามให้ชัด" },
  { days: "2-3", title: "คุยกับคนจริง แล้วสร้างต้นแบบ", detail: "ไม่ต้องเขียนโค้ดเป็น ไม่ต้องสวย" },
  { days: "4-6", title: "ปล่อยให้คนนอกใช้ แล้ววัดผล", detail: "จดทุกจุดที่พัง และแก้ยังไง" },
  { days: "7", title: "Demo Day + พอร์ต 1 หน้า", detail: "สรุปสิ่งที่ทำ หลักฐาน และสิ่งที่เปลี่ยน" },
];

/** Card 5: current offer, capacity and absolute dates. */
const pairPrice = pairPriceBaht(AD_COHORT);

/**
 * The questions people keep DMing, answered before they ask. The full lines
 * go in the primary text; card 5 carries the short versions.
 */
export const AD_FAQ = [
  { full: "ไม่ต้องมีพื้นฐาน ม.4-ม.6 สมัครได้ ใช้ AI ช่วยสร้าง", short: "ม.4-ม.6 ไม่ต้องมีพื้นฐาน" },
  { full: "ทำคนเดียว 2 คน หรือ 3 คนก็ได้ ไม่ต้องหาทีมเพิ่ม", short: `ทำคนเดียวหรือทีม ${teamSizeLabel(AD_COHORT)}` },
  { full: "ยังไม่มีไอเดียก็สมัครได้ มีแค่ปัญหาที่เจอเองก็พอ", short: "ยังไม่มีไอเดียก็สมัครได้" },
  ...(pairPrice !== null
    ? [{ full: `มากับเพื่อน 2 คน จ่ายคนละ ฿${pairPrice}`, short: `มากับเพื่อน จ่ายคนละ ฿${pairPrice}` }]
    : []),
];

export const AD_OFFER_POINTS = AD_FAQ.filter((_, i) => i !== 2).map((item) => item.short);

const price = priceLabel(AD_COHORT);
const deadline = `${formatThaiDate(AD_COHORT.applyDeadline, false)} ${Number(AD_COHORT.applyDeadline.slice(0, 4)) + 543}`;
const dates = `${formatThaiDate(AD_COHORT.startDate, false)} ถึง ${formatThaiDate(AD_COHORT.endDate, false)} ${Number(AD_COHORT.endDate.slice(0, 4)) + 543}`;
const offer = `${AD_COHORT.name} · ${dates} · ออนไลน์ Discord ${AD_COHORT.sessionTime} น.\n${price} ต่อคน · ความจุรุ่น ${AD_COHORT.seats} คน · ปิดรับ ${deadline}`;
const closing = `กดดูรายละเอียดและสมัคร ${AD_COHORT.name} ที่ลิงก์`;

/** Reviewable Ads Manager fields, no publishing or messaging action. */
export const META_COPY = {
  cta: "Learn more (ดูเพิ่มเติม)",
  primaryText: {
    student: [
      "คุยกับคนใช้ แล้วเปลี่ยนโจทย์ได้",
      "ปฏิทิน กสพท70 ใน SHIFT[0] เริ่มจากเว็บเกณฑ์พอร์ต หลังคุยกับคนใช้จึงเปลี่ยนมาช่วยดูวันสอบ นี่คือหลักฐานของการตัดสินใจจากข้อมูล",
      `${AD_COHORT.name} เป็นพื้นที่ 7 วันให้เลือกปัญหา สร้างต้นแบบ ลองกับคนนอก แล้วสรุปเป็นพอร์ต 1 หน้า มีทีมและพี่เลี้ยงช่วยดูในห้อง Discord ของทีม`,
      offer,
      ...AD_FAQ.map((item) => item.full),
      "เงื่อนไขบนหน้าโครงการ: ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเงินเต็มจำนวน",
      closing,
    ].join("\n\n"),
    parent: [
      "เห็นวิธีคิดลูก ผ่านงานที่เขาสร้าง",
      "ปฏิทิน กสพท70 เป็นผลงาน SHIFT[0] ที่เปลี่ยนจากเว็บเกณฑ์พอร์ต หลังคุยกับคนใช้แล้วพบว่าเขาอยากรู้วันสอบมากกว่า ชิ้นงานช่วยให้เห็นทั้งปัญหาที่เลือกและเหตุผลที่เปลี่ยน",
      `${AD_COHORT.name} ให้ลูกฝึกเลือกโจทย์ สร้าง ทดลอง และอธิบายการตัดสินใจของตัวเอง มีพี่เลี้ยงและเพื่อนร่วมเรียนในห้อง Discord ของทีม เป้าหมายปลายสัปดาห์คือพอร์ต 1 หน้า`,
      offer,
      ...AD_FAQ.map((item) => item.full),
      "เงื่อนไขบนหน้าโครงการ: ถ้าจบวันที่ 7 แล้วไม่มีชิ้นงานในมือ คืนเงินเต็มจำนวน",
      closing,
    ].join("\n\n"),
  },
  cards: [
    { headline: "คุยแล้วเปลี่ยนโจทย์", description: "งาน SHIFT[0]" },
    { headline: "Lens: ฟีดแบ็ก 15+ คน", description: "เฉพาะโปรเจกต์นี้" },
    { headline: "TradBid: v1 สู่ v2", description: "ใช้เงินจำลอง" },
    { headline: "SHIFT: ลงมือ 7 วัน", description: "เพื่อนและพี่เลี้ยง" },
    { headline: `${AD_COHORT.name} · ${price}`, description: `ปิดรับ ${deadline}` },
  ],
  parentCard: { headline: "เห็นวิธีคิดลูก", description: "ผ่านงาน SHIFT[0]" },
} as const;
