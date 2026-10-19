/**
 * /shift/next: the pre-order page for the next SHIFT round. It has a number
 * (the round after the last one in SHIFT_COHORTS) but no date yet. People
 * mark when they are free, and the round opens on the first 7-day window
 * that reaches MIN_BUILDERS.
 *
 * The page is built backwards from the one ask (mark your free dates), so
 * the order is the order of doubts: why bother, is it real, what do I end
 * up with, what does it cost me, then how the pre-order works.
 *
 * Everything here is a promise to a parent-paid, mostly under-18 audience,
 * so keep it to what SHIFT actually does. Copy rules: no "pivot", no
 * talking down (no น้อง), ต้นแบบ not "finished app", no em dashes.
 */

import {
  BadgeCheck,
  Bot,
  CalendarRange,
  Clock,
  Compass,
  FileText,
  Laptop,
  Layers,
  Lightbulb,
  Link2,
  MessagesSquare,
  Mic,
  NotebookPen,
  Presentation,
  Send,
  Smartphone,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import {
  SHIFT_COHORT,
  SHIFT_COHORTS,
  SHIFT_SKILL_CARDS,
} from "@/lib/content/shift-cohort";

/** People free for the same 7 days before a round is worth opening. */
export const MIN_BUILDERS = 12;

/** The round this page pre-sells: one after the newest scheduled round. */
export const NEXT_ROUND = Math.max(...SHIFT_COHORTS.map((c) => c.round)) + 1;
export const NEXT_ROUND_NAME = `SHIFT[${NEXT_ROUND}]`;

export const SESSION_TIME = SHIFT_COHORT.sessionTime;

export interface DealItem {
  icon: LucideIcon;
  title: string;
  detail: string;
}

export interface DealColumn {
  eyebrow: string;
  title: string;
  items: DealItem[];
}

/** Hero: the reason first, the mechanics in one quiet line. */
export const PITCH = {
  headline: ["เลิกสะสมใบเซอร์", "มาสร้างของที่คนใช้จริง"],
  lede: "7 เย็น เลือกปัญหาเอง สร้างต้นแบบเอง แล้วเอาไปให้คนนอกลองใช้ กลับไปพร้อมพอร์ต 1 หน้าที่บอกได้ว่าคุณทำอะไรเป็น",
  preorder: `${NEXT_ROUND_NAME} ยังไม่มีวัน ลงชื่อช่วงที่ว่างไว้ ครบ ${MIN_BUILDERS} คนเปิดรอบ ลงชื่อฟรี`,
};

export interface WhyRow {
  icon: LucideIcon;
  label: string;
  camp: string;
  shift: string;
}

/** Why: what a sit-and-listen camp leaves you with, next to what SHIFT does. */
export const WHY_ROWS: WhyRow[] = [
  {
    icon: Lightbulb,
    label: "คุณทำอะไร",
    camp: "นั่งฟัง จดตาม ทำตามโจทย์ที่เขาเตรียมไว้",
    shift: "เลือกปัญหาเอง ตัดสินใจเองว่าจะสร้างอะไร ตัดอะไรทิ้ง",
  },
  {
    icon: Smartphone,
    label: "ได้อะไรกลับไป",
    camp: "ใบเซอร์แบบเดียวกับทุกคนในค่าย",
    shift: "ต้นแบบที่คนนอกลองใช้แล้ว กับพอร์ต 1 หน้า",
  },
  {
    icon: Link2,
    label: "ใครเช็กได้",
    camp: "ไม่มีอะไรให้กดดูต่อ",
    shift: "ลิงก์ให้กดลองของจริง และใบรับรองที่ตรวจสอบได้",
  },
  {
    icon: Mic,
    label: "ในห้องสัมภาษณ์",
    camp: "เล่าได้ว่าไปค่ายไหนมา",
    shift: "เล่าได้ว่าคุยกับใคร เจออะไร แล้วแก้อะไรเพราะอะไร",
  },
];

export const HOW_IT_WORKS: DealItem[] = [
  {
    icon: CalendarRange,
      title: "เลือกช่วงที่ว่าง",
    detail: "แตะวันบนปฏิทิน เลือกได้หลายช่วง ขอแค่มีสักช่วงที่ว่างตอนเย็นติดกัน 7 วัน",
  },
  {
    icon: Users,
      title: `ครบ ${MIN_BUILDERS} คน เปิดรอบ`,
    detail: `ช่วงไหนมีคนว่างตรงกันครบ ${MIN_BUILDERS} คน เราล็อกวันรอบนั้น แล้วทักไปทาง IG ที่ให้ไว้`,
  },
  {
    icon: Wallet,
      title: "ยืนยันแล้วค่อยจ่าย",
    detail: "เราบอกวันและราคาชัดๆ ก่อน ถ้าตอนนั้นไม่สะดวกแล้ว ไม่ต้องยืนยันก็ได้ ไม่มีค่าปรับ",
  },
];

/** What the student puts in. Said first, on purpose: it is the filter. */
export const YOU_BRING: DealColumn = {
  eyebrow: "YOU BRING",
  title: "สิ่งที่คุณต้องลงเอง",
  items: [
    {
      icon: Clock,
      title: `7 เย็นติดกัน ${SESSION_TIME}`,
      detail: "ออนไลน์บน Discord ทุกเย็น ไม่กระทบเวลาเรียน แต่ต้องมาจริงทุกวัน",
    },
    {
      icon: Lightbulb,
      title: "โจทย์ของคุณเอง",
      detail: "เลือกปัญหาที่อยากแก้เอง ตัดสินใจเองว่าจะตัดอะไรทิ้ง mentor ไม่คิดแทน",
    },
    {
      icon: MessagesSquare,
      title: "คุยกับคนจริง 3 คน",
      detail: "วันที่ 2 ต้องไปคุยกับคนที่เจอปัญหานั้นจริง ไม่ใช่เดาเอาเองว่าเขาอยากได้อะไร",
    },
    {
      icon: Send,
      title: "ทักคนนอกมาลองเอง",
      detail: "ทักตรงทีละคน ไม่ใช่โพสต์สตอรี่แล้วรอ ส่วนนี้ยากที่สุด และสำคัญที่สุด",
    },
    {
      icon: Presentation,
      title: "โชว์ทุกเย็น แม้ยังพัง",
      detail: "ทุกเย็นเปิดของให้ทั้งห้องดู ว่าอะไรใช้ได้ อะไรพัง ไม่ต้องทำสไลด์",
    },
    {
      icon: Laptop,
      title: "คอม 1 เครื่อง กับเน็ต",
      detail: "ไม่ต้องเขียนโค้ดเป็น แต่ต้องพร้อมลงมือ และทำต่อเองบ้างนอกเวลา",
    },
  ],
};

export const WE_GIVE: DealColumn = {
  eyebrow: "WE GIVE",
  title: "สิ่งที่เราให้",
  items: [
    {
      icon: UserRound,
      title: "Mentor ทุกเย็น",
      detail: "อยู่ใน session ทุกวัน ช่วยตั้งคำถามที่ทำให้คิดต่อได้ ไม่ทำงานแทน",
    },
    {
      icon: Users,
      title: "ห้องทีมบน Discord",
      detail: "ทำคนเดียวหรือเป็นทีม 1-3 คนก็ได้ อยู่กับคนที่ลงมือทำเหมือนกัน",
    },
    {
      icon: Layers,
      title: "การ์ดสกิล",
      detail: `${SHIFT_SKILL_CARDS.map((card) => card.title).join(", ")} เลือกเรียนตามที่โปรเจกต์ต้องใช้`,
    },
    {
      icon: Bot,
      title: "SeedStack",
      detail: "ผู้ช่วย AI ใน OpenCode ที่ไกด์ทีละขั้นว่าต้องทำอะไรต่อ คุณเป็นคนกดเอง AI ไม่ทำแทน",
    },
    {
      icon: Mic,
      title: "เวทีทุกเย็น",
      detail: "ได้ฟีดแบ็กจากทั้งห้องทันที และเห็นว่าคนอื่นแก้ปัญหาแบบเดียวกันยังไง",
    },
  ],
};

export const YOU_GET: DealColumn = {
  eyebrow: "YOU LEAVE WITH",
  title: "สิ่งที่ได้กลับไป",
  items: [
    {
      icon: Smartphone,
      title: "ต้นแบบที่คนนอกลองใช้แล้ว",
      detail: "ไม่ใช่แอปสำเร็จรูป แต่เป็นของจริงที่มีคนที่ไม่ใช่เพื่อนสนิทได้ลองแล้ว",
    },
    {
      icon: NotebookPen,
      title: "บันทึกจุดพังและสิ่งที่แก้",
      detail: "จดพร้อมวันที่ ว่าเจออะไร แล้วเปลี่ยนอะไร เป็นหลักฐานที่ลอกกันไม่ได้",
    },
    {
      icon: FileText,
      title: "พอร์ต 1 หน้า",
      detail: "สรุปโจทย์ สิ่งที่ลอง และผลลัพธ์ในหน้าเดียว ใส่พอร์ต TCAS และเล่าในห้องสัมภาษณ์ได้",
    },
    {
      icon: BadgeCheck,
      title: "ใบรับรองที่ตรวจสอบได้",
      detail: "มีลิงก์ให้กรรมการกดดูได้ว่าทำจริง ออกให้เฉพาะคนที่ส่งหลักฐานครบ",
    },
    {
      icon: Compass,
      title: "รู้ว่าจะเริ่มเองยังไง",
      detail: "ครั้งหน้าที่อยากสร้างอะไร ไม่ต้องรอใครสั่ง เพราะเคยทำจบมาแล้ว 1 รอบ",
    },
  ],
};

/** Honest filter: who should not sign up. */
export const NOT_FOR_YOU: string[] = [
  "อยากได้แค่ใบเซอร์ไปแปะพอร์ต โดยไม่อยากลงแรง",
  "อยากให้มีคนทำโปรเจกต์ให้ หรือบอกทุกขั้นว่าต้องทำอะไร",
  "ช่วงนั้นไม่ว่างตอนเย็นเกิน 2 วัน",
];

export const NEXT_FAQS: { q: string; a: string }[] = [
  {
    q: "ลงชื่อตอนนี้ต้องจ่ายเงินไหม?",
    a: "ไม่ต้อง การลงชื่อแค่บอกว่าช่วงไหนว่าง เราจะบอกวันและราคาให้ชัดก่อน แล้วค่อยให้ยืนยันกับจ่ายตอนนั้น",
  },
  {
    q: "ราคาเท่าไหร่?",
    a: "เราแจ้งราคาให้ชัดพร้อมวัน ก่อนให้ใครยืนยัน จ่ายครั้งเดียว ไม่มีค่าใช้จ่ายแอบแฝง",
  },
  {
    q: `ถ้าช่วงที่เลือกไม่ครบ ${MIN_BUILDERS} คนล่ะ?`,
    a: "เราจะทักไปถามว่าช่วงที่มีคนเยอะที่สุดพอไหวไหม ถ้าไม่ไหวก็รอรอบถัดไปได้ ชื่อยังอยู่ในลิสต์",
  },
  {
    q: "อยากเพิ่ม หรือเอาช่วงที่ว่างออก ทำยังไง?",
    a: "ส่งฟอร์มใหม่ด้วย IG เดิม ช่วงใหม่จะถูกเพิ่มเข้าไป ถ้าอยากเอาช่วงไหนออก หรือแก้ข้อมูลติดต่อ ทักเราทาง IG หรือ LINE @passionseed",
  },
  {
    q: "ไม่มีพื้นฐานเขียนโปรแกรม ทำได้ไหม?",
    a: "ได้ ต้นแบบจะเป็น zero-code, กระดาษ หรือใช้ AI ช่วยสร้างก็ได้ สิ่งที่วัดคือคนนอกได้ลองใช้ไหม ไม่ใช่โค้ดสวยแค่ไหน",
  },
  {
    q: "อายุต่ำกว่า 18 ปี ต้องทำอะไรเพิ่มไหม?",
    a: "ก่อนยืนยันรอบ เราจะขอช่องทางติดต่อผู้ปกครอง และทุกอย่างคุยกันในห้อง Discord ของทีมที่ทีมงานเห็นได้",
  },
];
