/**
 * Copy for /shift/school: the proposal a teacher or school admin reads to
 * run a SHIFT cohort with their students, and the same link they forward
 * to parents. Every SHIFT round doubles as product R&D (not academic
 * research), so the data section is framed as consent to use data to
 * improve the program, never as joining a study.
 *
 * Rules for this file:
 * - Every line must read well for both audiences: the teacher deciding to
 *   open a cohort, and the parent deciding to consent and pay.
 * - Public numbers only: the school-cohort price, the cohort size and the
 *   minimum to open. Internal costs, margins and mentor pay never appear.
 * - Quotes come from shift-testimonials.ts / shift-voices.ts by reference,
 *   never retyped or invented here.
 * - Margin-note copy lives in NOTES (lib/content/pathlab-page.ts), like
 *   every other marketing page.
 * - No em dashes in user-facing copy.
 */

import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { SHIFT_TESTIMONIAL_GROUPS, type ShiftTestimonial } from "@/lib/content/shift-testimonials";
import { SHIFT_VOICES } from "@/lib/content/shift-voices";

/* ------------------------------------------------------------------ */
/* Offer facts: the only numbers on the page                           */
/* ------------------------------------------------------------------ */

export const SCHOOL_OFFER = {
  priceBaht: 590,
  regularPriceBaht: 690,
  maxStudents: 30,
  minStudents: 23,
  minOutsideUsers: 5,
  extraHelpDays: 3,
} as const;

export const baht = (amount: number) => `฿${amount.toLocaleString("en-US")}`;

/* ------------------------------------------------------------------ */
/* Contact doors                                                       */
/* ------------------------------------------------------------------ */

/**
 * Same doors as the rest of the site: an Instagram DM thread (the partner
 * page's lead funnel) for schools, and the SHIFT LINE OA for parents'
 * questions.
 */
export const SCHOOL_CONTACT_LINKS = {
  igDm: "https://ig.me/m/passion_seed.th",
  line: SHIFT_PAYMENT.lineUrl,
  lineId: SHIFT_PAYMENT.lineId,
  /** Public inbox for data requests. Swap for a named person's address once assigned. */
  dataEmail: "hi@passionseed.org",
} as const;

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export const SCHOOL_HERO = {
  eyebrow: "PASSIONSEED / SHIFT FOR SCHOOLS",
  badge: "SCHOOL COHORT",
  headline: "7 วัน สร้างของจริง แล้วเอาไปให้คนจริงใช้อย่างน้อย 5 คน",
  promise:
    "โปรแกรม SHIFT สำหรับนักเรียนทั้งรุ่นของโรงเรียน ทุกคนจบด้วยโปรเจกต์ที่คนนอกได้ลองจริง พร้อม Pivot Log และ Case Study 1 หน้า ใช้ในพอร์ต TCAS ได้",
  priceLabel: "ราคารุ่นโรงเรียน",
  priceUnit: "ต่อนักเรียน 1 คน",
  facts: [
    { term: "ใครจ่าย", value: "ผู้ปกครองจ่ายเองรายคน" },
    { term: "รุ่นละ", value: `ไม่เกิน ${SCHOOL_OFFER.maxStudents} คน` },
    { term: "เปิดรุ่นเมื่อ", value: `ครบ ${SCHOOL_OFFER.minStudents} คนขึ้นไป` },
    { term: "เรียนที่ไหน", value: "ออนไลน์ทาง Discord" },
  ],
  primaryCta: "ทักคุยเรื่องเปิดรุ่นที่โรงเรียน",
  readAs: {
    label: "อ่านในฐานะ",
    teacher: { label: "คุณครู", href: "#school" },
    parent: { label: "ผู้ปกครอง", href: "#data" },
  },
} as const;

/* ------------------------------------------------------------------ */
/* The 7-day arc                                                       */
/* ------------------------------------------------------------------ */

export interface SchoolArcStep {
  day: string;
  title: string;
  body: string;
  /** Who is in the room for this step. */
  with: string;
}

export const SCHOOL_ARC = {
  eyebrow: "THE 7-DAY ARC",
  heading: "7 วัน จากโจทย์เดียว ถึงงานที่มีคนใช้จริง",
  aside: "ออนไลน์ช่วงเย็นและเสาร์อาทิตย์\nไม่กระทบเวลาเรียนปกติ",
  steps: [
    {
      day: "DAY 1",
      title: "ล็อกโจทย์",
      body: "เลือกปัญหาเดียวที่อยากแก้ แล้วตัดให้เหลือ 1 หน้า 1 สิ่งที่คนใช้ต้องทำ",
      with: "AI mentor ช่วยถามให้โจทย์คมขึ้น และเซสชันกลุ่มกับ mentor",
    },
    {
      day: "DAY 2-4",
      title: "ลงมือสร้าง",
      body: "สร้างด้วย OpenCode และ skill ของ PassionSeed ที่พาไปทีละขั้น",
      with: "ถาม AI ก่อน ติดจริงค่อยเรียก mentor",
    },
    {
      day: "DAY 3-5",
      title: "เอาไปให้คนจริงลอง",
      body: "ส่งงานให้คนนอกลองใช้ แล้วจดทุกจุดที่เขางง ติด หรือเลิกกลางทาง",
      with: "ข้อมูลตอนพังคือของมีค่า ไม่ใช่ความล้มเหลว",
    },
    {
      day: "DAY 5-6",
      title: "Pivot จากสิ่งที่คนทำจริง",
      body: "ดูว่าผู้ใช้ทำอะไรจริง ไม่ใช่แค่พูดว่าอะไร แล้วตัดสินใจเองว่าจะปรับตรงไหน",
      with: "วงคุยกับเพื่อนในรุ่นและ mentor",
    },
    {
      day: "DAY 7",
      title: "Demo Day",
      body: "เล่าเรื่องการ Pivot ของตัวเอง พร้อม Case Study 1 หน้าและ Pivot Log ที่ใช้ในพอร์ต TCAS ได้",
      with: "ผู้ปกครองดูออนไลน์ได้",
    },
  ] satisfies SchoolArcStep[],
} as const;

/* ------------------------------------------------------------------ */
/* How students learn                                                  */
/* ------------------------------------------------------------------ */

export type SchoolLearningIcon = "ai" | "mentorBot" | "peers" | "circle";

export interface SchoolLearningMode {
  icon: SchoolLearningIcon;
  title: string;
  body: string;
}

export const SCHOOL_LEARNING = {
  eyebrow: "HOW STUDENTS LEARN",
  heading: "เรียนแบบคนสร้างของ ไม่ใช่แบบนั่งฟัง",
  aside: "AI ช่วยลงมือ\nคนตัดสินใจคือนักเรียน",
  modes: [
    {
      icon: "ai",
      title: "สร้างคู่กับ AI",
      body: "ใช้ OpenCode ร่วมกับ skill ของ PassionSeed ซึ่งทำหน้าที่เป็นหลักสูตร พาไปทีละขั้นตั้งแต่ร่างแรกจนเอาขึ้นเว็บจริง",
    },
    {
      icon: "mentorBot",
      title: "เรียนเองกับ AI mentor",
      body: "ถามได้ทุกเวลาไม่ต้องรอคาบ AI mentor ถามกลับให้คิดต่อ ไม่ได้ตอบแทนหรือทำการบ้านให้",
    },
    {
      icon: "peers",
      title: "รุ่นพี่ mentor",
      body: "รุ่นพี่ศิษย์เก่าที่เคยผ่านโปรแกรมของ PassionSeed มาก่อน เข้าใจว่าติดตรงไหนเพราะเคยติดมาเอง",
    },
    {
      icon: "circle",
      title: "วงคุยและวงเล่าเรื่อง",
      body: "ทั้งรุ่นช่วยกันดูงาน ถามคำถามยาก ๆ และเล่าเรื่องที่ทำพัง ให้รู้ว่าการลงมือสร้างเองเป็นเรื่องปกติ",
    },
  ] satisfies SchoolLearningMode[],
  principle: {
    title: "นักเรียนเป็นคนตัดสินใจทุกเรื่อง",
    body: "เลือกโจทย์เอง ตั้งสมมติฐานเอง และตัดสินใจเองว่าจะ Pivot ไหม mentor ช่วยถามและชี้ทาง แต่ไม่ทำแทน ไม่เขียนแทน",
  },
} as const;

/* ------------------------------------------------------------------ */
/* The 5-outside-users promise                                         */
/* ------------------------------------------------------------------ */

export const SCHOOL_PROMISE = {
  eyebrow: "OUR PROMISE",
  heading: "ทุกคนได้เอางานไปให้คนนอกจริงลองใช้",
  numeral: String(SCHOOL_OFFER.minOutsideUsers),
  numeralCaption: "คนนอกขั้นต่ำต่อนักเรียน 1 คน",
  body: "ไม่ใช่แค่ทำเสร็จแล้วส่งครู นักเรียนทุกคนต้องเอางานไปให้คนจริงนอกรุ่นลองใช้อย่างน้อย 5 คน เพราะสิ่งที่คนทำจริงกับงานของเรา สอนได้มากกว่าคำชมทุกคำ",
  guarantee: `ถ้าถึงวันที่ 7 แล้วยังไม่ครบ mentor ช่วยต่ออีก ${SCHOOL_OFFER.extraHelpDays} วัน ไม่มีค่าใช้จ่ายเพิ่ม`,
} as const;

/* ------------------------------------------------------------------ */
/* Data & consent (product R&D, not academic research)                 */
/* ------------------------------------------------------------------ */

export interface SchoolConsentLayer {
  tag: string;
  required: boolean;
  title: string;
  body: string;
  /** Optional choices inside this layer (e.g. media levels). */
  options?: string[];
}

export const SCHOOL_DATA = {
  eyebrow: "DATA & CONSENT",
  heading: "เราเรียนรู้จากทุกรุ่น และอยากบอกให้ชัดตั้งแต่แรก",
  aside: "อ่านก่อนตัดสินใจ\nไม่มีอะไรซ่อนไว้",
  why: {
    title: "ทำไมเราเก็บข้อมูล",
    body: "SHIFT ทุกรุ่นคือการพัฒนาโปรแกรมไปพร้อมกัน เพราะเราอยากให้นักเรียนไทยเข้าถึงการศึกษาระดับท็อปที่สนุก และมีค่ากับชีวิตไปตลอด เราจึงอยากรู้ว่าทำยังไงให้โปรแกรมแบบนี้ราคาถูกลง และไปถึงนักเรียนได้ทั่วประเทศ โดยให้รุ่นพี่ศิษย์เก่าดูแลรุ่นน้องร่วมกับ AI และคอมมูนิตี้ สิ่งที่เราเรียนรู้จากรุ่นนี้ ช่วยให้รุ่นต่อไปดีขึ้นและถูกลง",
  },
  joinLine:
    "ก่อนชำระเงิน ผู้ปกครองเซ็นยินยอมให้เราใช้ข้อมูลจากการเรียน และนักเรียนยินยอมด้วยตัวเอง",
  layers: [
    {
      tag: "จำเป็นสำหรับรุ่นนี้",
      required: true,
      title: "ยินยอมให้ใช้ข้อมูลเพื่อพัฒนาโปรแกรม",
      body: "ผู้ปกครองเซ็นใบยินยอม และนักเรียนเซ็นใบยินยอมของตัวเอง ทั้งสองคนต้องตกลงจึงเข้ารุ่นได้",
    },
    {
      tag: "เลือกได้",
      required: false,
      title: "ติดตามผลหลังจบโปรแกรม",
      body: "แบบสอบถามสั้น ๆ ที่ 3, 6 และ 12 เดือน เป็นช่องติ๊กแยก ไม่ติ๊กก็เข้ารุ่นได้ตามปกติ",
    },
    {
      tag: "เลือกได้",
      required: false,
      title: "รีวิว รูป หรือวิดีโอ เพื่อการประชาสัมพันธ์",
      body: "ไม่บังคับเลย และเลือกระดับเองได้ ถอนได้ทุกเมื่อ",
      options: ["ชื่อเล่นอย่างเดียว", "ชื่อเล่นและใบหน้า", "วิดีโอ"],
    },
  ] satisfies SchoolConsentLayer[],
  collect: {
    title: "ข้อมูลที่เราเก็บ",
    items: [
      "Pivot Log และชิ้นงานต้นแบบ",
      "บทสนทนากับ AI mentor",
      "แบบสอบถามสั้น ๆ ก่อนและหลังโปรแกรม",
      "จำนวนคนนอกที่ได้ลองใช้งาน",
    ],
  },
  promises: {
    title: "สิ่งที่เราสัญญา",
    items: [
      "รายงานผลแบบไม่ระบุตัวตนเสมอ",
      "เก็บเท่าที่จำเป็น ตามกฎหมาย PDPA",
      "ถอนความยินยอมได้ทุกเมื่อ และยังเรียนต่อจนจบโปรแกรมได้ตามปกติ",
      "ขอให้ลบข้อมูลได้ทุกเมื่อ",
    ],
  },
  contactLabel: "คำถามเรื่องข้อมูลของนักเรียน ติดต่อ",
} as const;

/* ------------------------------------------------------------------ */
/* What the school gets / does + safeguarding                          */
/* ------------------------------------------------------------------ */

export interface SchoolColumn {
  title: string;
  items: string[];
}

export const SCHOOL_PARTNERSHIP = {
  eyebrow: "FOR SCHOOLS",
  heading: "โรงเรียนได้อะไร และต้องทำอะไรบ้าง",
  aside: "งานของครูมีแค่ส่งต่อ\nและเป็นผู้ใหญ่ที่ดูแล",
  gets: {
    title: "โรงเรียนได้",
    items: [
      "โปรแกรมลงมือทำ 7 วันให้นักเรียนทั้งรุ่น",
      "Case Study ของรุ่น สรุปผลแบบไม่ระบุตัวตน",
      "แกลเลอรีผลงานของนักเรียน",
      "สรุปสิ่งที่เราเรียนรู้จากรุ่นนี้ เมื่อจบรุ่น",
    ],
  } satisfies SchoolColumn,
  does: {
    title: "โรงเรียนทำ",
    items: [
      "ส่งข้อมูลและลิงก์หน้านี้ให้นักเรียนและผู้ปกครอง",
      "แต่งตั้งคุณครู 1 ท่าน เป็นผู้ใหญ่ที่ดูแลและเป็นผู้ติดต่อหลัก",
    ],
  } satisfies SchoolColumn,
  doesNot: {
    title: "โรงเรียนไม่ต้องทำ",
    body: "ไม่ต้องเก็บเงิน ไม่ต้องเก็บใบยินยอม ครอบครัวเซ็นและจ่ายกับ PassionSeed โดยตรง นักเรียนจะได้ไม่รู้สึกถูกกดดันให้เข้าร่วม",
  },
  safeguarding: {
    title: "ความปลอดภัยของนักเรียน",
    items: [
      "ไม่มีการแชทส่วนตัว 1 ต่อ 1 ระหว่าง mentor กับนักเรียน",
      "ทุกงานคุยกันในห้องกลุ่มที่ทุกคนมองเห็น",
      "มีคุณครูของโรงเรียนเป็นผู้ใหญ่ดูแลตลอดรุ่น",
      "mentor ทุกคนรับทราบและปฏิบัติตามจรรยาบรรณของ PassionSeed",
    ],
  } satisfies SchoolColumn,
  never: "เราไม่ขายจดหมายรับรอง และไม่สัญญาผล TCAS สิ่งที่เราให้ได้คือหลักฐานว่านักเรียนลงมือทำเองจริง",
} as const;

/* ------------------------------------------------------------------ */
/* Real voices (by reference, never retyped)                           */
/* ------------------------------------------------------------------ */

const KK_SHIFT = SHIFT_TESTIMONIAL_GROUPS.flatMap((group) => group.cards).find(
  (card) => card.name === "KK",
);

const SCHOOL_VOICE_CARDS: ShiftTestimonial[] = [
  ...(KK_SHIFT ? [KK_SHIFT] : []),
  SHIFT_VOICES.potterSelfTaught,
  SHIFT_VOICES.potterIntrovert,
  SHIFT_VOICES.kkGrandpa,
];

export const SCHOOL_VOICES = {
  eyebrow: "REAL VOICES",
  heading: "เสียงจริงจากนักเรียนที่ลงมือสร้าง",
  source: "จากคำบอกเล่าของนักเรียนหลังจบ SHIFT ใช้ชื่อเล่นเท่านั้น",
  cards: SCHOOL_VOICE_CARDS,
} as const;

/* ------------------------------------------------------------------ */
/* Who runs SHIFT                                                      */
/* ------------------------------------------------------------------ */

export const SCHOOL_WHO = {
  eyebrow: "WHO WE ARE",
  heading: "ใครทำ SHIFT",
  body: "PassionSeed เป็นโปรเจกต์ของนักศึกษาปี 4 หลักสูตร BAScii จุฬาลงกรณ์มหาวิทยาลัย",
  why: "เราอยากให้นักเรียนไทยได้เข้าถึงการศึกษาระดับท็อป ที่ทั้งสนุก และมีค่ากับชีวิตไปตลอด ไม่ใช่แค่ใช้สอบแล้วลืม",
} as const;

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/* ------------------------------------------------------------------ */

export interface SchoolFaq {
  q: string;
  a: string;
}

export const SCHOOL_FAQ = {
  eyebrow: "FAQ",
  heading: "คำถามที่ครูและผู้ปกครองถามบ่อย",
  items: [
    {
      q: "ค่าใช้จ่ายเท่าไหร่ ใครเป็นคนจ่าย?",
      a: `ราคารุ่นโรงเรียน ${baht(SCHOOL_OFFER.priceBaht)} ต่อนักเรียน 1 คน (ราคาปกติ ${baht(SCHOOL_OFFER.regularPriceBaht)}) ผู้ปกครองจ่ายกับ PassionSeed โดยตรง โรงเรียนไม่ต้องจ่ายและไม่ต้องเก็บเงิน ไม่มีค่าใช้จ่ายเพิ่มระหว่างทาง`,
    },
    {
      q: `ทำไมต้องมีนักเรียนอย่างน้อย ${SCHOOL_OFFER.minStudents} คน?`,
      a: `รุ่นนี้ต้องมีนักเรียนอย่างน้อย ${SCHOOL_OFFER.minStudents} คนถึงจะเปิดได้ เพื่อให้จัดทีม mentor และวงคุยได้เต็มรูปแบบ รับสูงสุด ${SCHOOL_OFFER.maxStudents} คนต่อรุ่น`,
    },
    {
      q: `ถ้าไม่ครบ ${SCHOOL_OFFER.minStudents} คน จะเป็นยังไง?`,
      a: "เราไม่เปิดรุ่น และคืนเงินเต็มจำนวนให้ทุกครอบครัวที่จ่ายแล้ว",
    },
    {
      q: "ถ้าเข้าแล้วอยากถอนความยินยอมเรื่องข้อมูลล่ะ?",
      a: "ถอนได้ทุกเมื่อ ไม่ต้องให้เหตุผล นักเรียนยังเรียนต่อจนจบโปรแกรมได้ตามปกติ และขอให้ลบข้อมูลที่เก็บไปแล้วได้",
    },
    {
      q: "ข้อมูลของนักเรียนไปอยู่ที่ไหน ใครเห็นบ้าง?",
      a: "เราเก็บเท่าที่จำเป็นตาม PDPA และรายงานผลแบบไม่ระบุตัวตน โรงเรียนได้เห็นภาพรวมของรุ่น ไม่ได้เห็นข้อมูลรายคน รูปหรือวิดีโอจะถูกใช้เผยแพร่ก็ต่อเมื่อเลือกยินยอมแยกไว้เท่านั้น",
    },
    {
      q: "ต้องเขียนโค้ดเป็นไหม?",
      a: "ไม่ต้อง นักเรียนสร้างงานร่วมกับ AI ผ่าน OpenCode และ skill ของ PassionSeed ที่พาไปทีละขั้น สิ่งที่ต้องฝึกคือการตัดสินใจ ไม่ใช่การจำคำสั่ง",
    },
    {
      q: "กระทบเวลาเรียนไหม?",
      a: "เรียนออนไลน์ทาง Discord ช่วงเย็นและเสาร์อาทิตย์ ไม่ชนกับเวลาเรียนปกติ",
    },
    {
      q: "รับรองผล TCAS หรือออกจดหมายรับรองให้ไหม?",
      a: "ไม่ เราไม่ขายจดหมายรับรองและไม่สัญญาผลสอบ สิ่งที่นักเรียนได้คือชิ้นงานจริง Pivot Log และ Case Study 1 หน้า ซึ่งเป็นหลักฐานที่นักเรียนเล่าได้เองในพอร์ต",
    },
  ] satisfies SchoolFaq[],
} as const;

/* ------------------------------------------------------------------ */
/* Closing contact                                                     */
/* ------------------------------------------------------------------ */

export const SCHOOL_CONTACT = {
  eyebrow: "START A COHORT",
  heading: "อยากเปิด SHIFT ให้นักเรียนที่โรงเรียนของคุณ?",
  body: "ทักมาเล่าสั้น ๆ ว่าโรงเรียนอะไร นักเรียนประมาณกี่คน แล้วเราจะต่อเรื่องให้ในแชท",
  steps: [
    "ทักเรามา แล้วคุยกันเรื่องช่วงเวลาที่เหมาะกับโรงเรียน",
    "คุณครูส่งลิงก์หน้านี้ให้นักเรียนและผู้ปกครอง",
    "แต่ละครอบครัวเซ็นยินยอม แล้วจ่ายกับ PassionSeed โดยตรง",
    `ครบ ${SCHOOL_OFFER.minStudents} คน เปิดรุ่นได้เลย ไม่ครบคืนเงินเต็มจำนวน`,
  ],
  primaryCta: "ทัก DM ใน Instagram",
  secondaryCta: `แอด LINE ${SCHOOL_CONTACT_LINKS.lineId}`,
  parentLine: "ผู้ปกครองที่มีคำถาม ทัก LINE มาถามก่อนได้เลย ยังไม่ต้องตัดสินใจ",
  fab: "ทักคุยเรื่องเปิดรุ่น",
  footer: "SHIFT by PassionSeed",
  backToTop: "กลับขึ้นด้านบน",
} as const;

/* ------------------------------------------------------------------ */
/* Metadata                                                            */
/* ------------------------------------------------------------------ */

export const SCHOOL_META = {
  title: "SHIFT สำหรับโรงเรียน | 7 วัน สร้างของจริงให้คนจริงใช้",
  description: `เปิด SHIFT ที่โรงเรียน: นักเรียนสร้างโปรเจกต์จริงและเอาไปให้คนนอกลองใช้อย่างน้อย 5 คนใน 7 วัน พร้อม Pivot Log และ Case Study 1 หน้า ราคารุ่นโรงเรียน ${baht(SCHOOL_OFFER.priceBaht)} ผู้ปกครองจ่ายเองรายคน`,
  ogTitle: "SHIFT สำหรับโรงเรียน | 7 วัน สร้างของจริง",
  ogDescription: "นักเรียนสร้างของจริง แล้วเอาไปให้คนจริงใช้อย่างน้อย 5 คน ใน 7 วัน",
} as const;
