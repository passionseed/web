/**
 * Copy for /about, in the home page's voice: Thai first, short, and only
 * what we can show. The page is built to be played with: a portfolio
 * machine, three belief toys, a "where are you now" picker and our own
 * pivot trail.
 *
 * Sources are passionseed/company-brain: company.md (what we do),
 * history.md (the trail, updated 2026-11-20), events.md, and PRODUCT.md (the
 * three things we hold to). No counts on purpose: the old page's 2,000+
 * students, 50+ organizations, 89% and 95% had no source, and the brain has
 * no student total yet (numbers.md). The machine's failure log is a labelled
 * example, never a real student's record.
 *
 * Copy rules: no em dashes, no น้อง, no ed-tech jargon. "|" inside a heading
 * marks a safe line break for phones (see Phrases in AboutSections).
 */

import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { HOME_EXPLORE } from "@/lib/content/home";
import { SHIFT_COHORT_0, cohortPath } from "@/lib/content/shift-cohort";

export const ABOUT_META = {
  title: "เกี่ยวกับเรา",
  description:
    "PassionSeed ทำโปรแกรมสั้นๆ ให้นักเรียนไทยลงมือสร้างของจริงด้วยตัวเอง เลือกโจทย์เอง ให้คนจริงลองใช้ แล้วบันทึกว่าอะไรพังและแก้ยังไง",
};

export const ABOUT_HERO = {
  title: ["เราเชื่อว่าคนรุ่นใหม่", "ควรได้เลือกทาง|ของตัวเอง"],
  lede: "PassionSeed ทำโปรแกรมสั้นๆ ให้นักเรียนไทยลงมือสร้างของจริงด้วยตัวเอง",
  note: "ลองกดเล่นไปด้วยได้เลย",
};

/** The portfolio machine: an AI-polished portfolio, then the real thing. */
export const ABOUT_MACHINE = {
  heading: "พอร์ตสวยหาง่าย ของจริงหายาก",
  intro: "ลองดูเองว่ากรรมการจะเห็นอะไร",
  /** The name tag's printed band, and the input's label. */
  nameLabel: "สวัสดี เราชื่อ",
  namePlaceholder: "ชื่อเล่น",
  /** Used when the name box is empty. */
  defaultName: "คุณ",
  makeButton: "ให้ AI ทำพอร์ตให้",
  realButton: "ดูว่าของจริงหน้าตาเป็นยังไง",
  againButton: "เริ่มใหม่",
  /** The machine's nameplate and its little screen, per phase. "|" marks a safe wrap. */
  brand: "เครื่องปั๊มพอร์ต",
  model: "AI-1000",
  lcd: {
    idle: { code: "READY", line: "ใส่ชื่อ|แล้วกดปุ่ม" },
    polished: { code: "DONE 3.0s", line: "ปั๊มซ้ำได้|อีกพันใบ" },
    real: { code: "ERROR", line: "ของจริง|เครื่องทำแทนไม่ได้" },
  },
  polished: {
    title: "พอร์ตโฟลิโอ",
    lines: [
      "เป็นผู้นำที่มีความคิดสร้างสรรค์",
      "ทำงานเป็นทีมได้ดีเยี่ยม",
      "มุ่งมั่นพัฒนาตัวเองอยู่เสมอ",
      "ใบเซอร์ค่ายที่เข้าร่วม 12 ใบ",
    ],
    footer: "Template #0417 · สร้างด้วย AI",
    caption: "เสร็จใน 3 วิ สวยเป๊ะ แต่กรรมการอ่านประโยคแบบนี้มาเป็นรอบที่พันแล้ว",
  },
  real: {
    title: "บันทึกจุดพัง",
    tag: "ตัวอย่าง",
    stamp: "ของจริง",
    lines: [
      { day: "วันที่ 1", text: "เลือกโจทย์เอง: แอปเตือนคุณยายกินยา" },
      { day: "วันที่ 4", text: "ส่งให้คนจริง 5 คนลองใช้" },
      { day: "วันที่ 5", text: "มี 3 ใน 5 คนหาปุ่มเริ่มไม่เจอ" },
      /** `tried` is the idea that came first, crossed out on the page. */
      { day: "วันที่ 6", tried: "ขยายปุ่มให้ใหญ่ขึ้น", text: "ย้ายปุ่มขึ้นบนสุด ลองใหม่ 4 ใน 5 คนหาเจอ" },
    ],
    caption: "ไม่สวยเท่า แต่ไม่ซ้ำใคร และกรรมการถามต่อได้ว่าเจออะไร แก้ยังไง",
  },
  aiLine: "นักเรียนของเราก็ใช้ AI ช่วยสร้างงาน แต่ AI ลองใช้แทนคนจริงไม่ได้",
  note: "ของพังก็เป็นหลักฐานได้",
};

export const ABOUT_BELIEFS_HEADING = "สามอย่างที่เรายึดไว้";

/** Belief 1, as a toy: ask the mentor for the answer, get a question back. */
export const ABOUT_CHOOSE = {
  title: "เลือกเอง",
  askButton: "ขอคำตอบจากพี่เลี้ยง",
  askAgain: "ขออีกที",
  mentor: "พี่เลี้ยง",
  /** What the answer ball shows before anyone asks. */
  idle: "ถามมาเลย",
  /** "|" marks where a question may wrap inside the ball's small window. */
  questions: [
    "จะให้ใคร|ลองเป็น|คนแรก?",
    "พรุ่งนี้|จะทำส่วนไหน|ให้คนลอง|ได้ก่อน?",
    "จะดูยังไงว่า|คนลองแล้ว|ติดตรงไหน?",
    "ทำไมถึง|เลือก|โจทย์นี้?",
    "ถ้าต้องตัด|ออกครึ่งหนึ่ง|จะเก็บอะไรไว้?",
  ],
  /** {n} is how many questions they have collected. */
  tally: "ได้คำถามกลับมา {n} ข้อ แต่คำตอบยังต้องคิดเองอยู่ดี",
  rule: "พี่เลี้ยงถามให้คิดต่อ ไม่ทำแทน",
};

/** Belief 2, as a toy: send a slide and a rough prototype to real people. */
export const ABOUT_REALITY = {
  title: "ชนกับของจริง",
  body: "ของหน้าตาไม่สวยที่คนจริงได้ลอง ดีกว่าสไลด์สวยที่ไม่มีใครแตะ",
  options: { slide: "สไลด์สวย", proto: "ต้นแบบ|หน้าตาไม่สวย" },
  /** What is on the laptop's slide and the paper prototype. */
  slide: { title: ["นวัตกรรม", "เพื่อสังคม", "ยั่งยืน"], page: "1 / 24" },
  proto: { title: "เตือนกินยา", button: "เริ่ม" },
  sendButton: "ส่งให้คนจริงลอง",
  slideResult: "คนดูสไลด์ได้ แต่ไม่มีอะไรให้ลองใช้",
  protoFeedback: ["หาปุ่มเริ่มไม่เจอ", "อันนี้ใช้ได้จริงนะ", "ตัวหนังสือเล็กไป", "ขอใช้ต่อได้ไหม"],
  protoResult: "เจอ 2 จุดให้แก้ นี่แหละข้อมูลจริง",
};

/** Belief 3, as a toy: open the group room and watch builders join. */
export const ABOUT_ROOM = {
  title: "มีเพื่อนลงมือทำไปด้วยกัน",
  joinButton: "ดูตัวอย่างห้องแชทกลุ่ม",
  roomName: "แชทกลุ่ม",
  example: "ตัวอย่าง",
  today: "วันนี้",
  typing: "กำลังพิมพ์",
  /** The message box placeholder; the room name follows it. */
  composer: "พิมพ์ข้อความใน",
  /** What builders in the room are up to. Made-up nicknames, not real people. */
  messages: [
    { name: "แพร", time: "19:02", text: "สัมภาษณ์คนแรกอยู่" },
    { name: "ภูมิ", time: "19:05", text: "แก้บั๊กอยู่ ใครว่างช่วยดูหน่อย" },
    { name: "โอ๊ต", time: "19:11", text: "ปล่อยให้คนลองแล้ว!", link: { title: "แอปเตือนกินยา", meta: "ต้นแบบ · กดลองได้เลย" } },
    { name: "พี่ฟ้า", role: "พี่เลี้ยง", time: "19:12", text: "ลองตัดบางฟีเจอร์ออกดูไหม" },
  ],
  visible: "ทีมงานเข้าดูได้",
  rule: "คุยกับพี่เลี้ยงในห้องแชทกลุ่มที่ทีมงานเข้าดูได้ ไม่มีแชทส่วนตัวกับพี่เลี้ยง",
};

export const ABOUT_BELIEFS_NOTE = "เลือกผิดก็เปลี่ยนได้";

export interface AboutDoor {
  /** Where the visitor is, in their words. */
  you: string;
  icon: RisoIconName;
  label: string;
  /** The label as the departures board's dot letters show it. */
  board: string;
  href: string;
  body: string;
}

const exploreBody = (href: string) => HOME_EXPLORE.find((item) => item.href === href)?.body ?? "";

/** "Where are you now?": pick your spot, get the program that fits. */
export const ABOUT_DOORS = {
  heading: "ตอนนี้คุณอยู่ตรงไหน",
  go: "ไปต่อ",
  /** The departures board's column heads and the ticket it prints. */
  board: { you: "ต้นทาง", to: "ปลายทาง" },
  ticket: { from: "จาก", to: "ถึง", change: "เลือกใหม่ได้" },
  note: "ไม่ต้องรู้ตั้งแต่วันแรกว่าอยากเป็นอะไร",
  doors: [
    {
      you: "มีอาชีพในใจ แต่ยังไม่ชัวร์",
      icon: "compass",
      label: "Career Radar",
      board: "CAREER RADAR",
      href: "/radar",
      body: exploreBody("/radar"),
    },
    {
      you: "อยากลองทำงานจริงดูสักอาชีพ",
      icon: "flask",
      label: "PathLab",
      board: "PATHLAB",
      href: "/map",
      body: exploreBody("/map"),
    },
    {
      you: "อยากแข่งทำโปรเจกต์กับเพื่อน",
      icon: "trophy",
      label: "Hackathon",
      board: "HACKATHON",
      href: "/hackathon",
      body: `งานแข่ง ${ELEMENTAL.series} สร้างของจริงเป็นทีมจากโจทย์ปัญหาจริง ล่าสุดคือ ${ELEMENTAL.edition} Hackathon เรื่องสิ่งแวดล้อม สำหรับ ${ELEMENTAL.gradesTh}`,
    },
    {
      you: "อยากได้โปรเจกต์จริงไว้ใส่พอร์ต",
      icon: "rocket",
      label: "SHIFT",
      board: "SHIFT",
      href: "/shift",
      body: "7 วัน 1 โปรเจกต์จริง สำหรับ ม.4–ม.6 ให้คนจริงลองใช้ เก็บบันทึกจุดพัง แล้วสรุปเป็นพอร์ต 1 หน้าไว้เตรียมยื่น TCAS",
    },
  ] satisfies AboutDoor[],
};

export interface AboutMilestone {
  when: string;
  title: string;
  /** Only stops with no page of their own carry a line; the rest link out. */
  body?: string;
  href?: string;
  /** The turn in the road: gets the stamp. */
  pivot?: boolean;
}

/** company-brain history.md and events.md, oldest first. Years are Buddhist era. */
export const ABOUT_TRAIL = {
  heading: "เส้นทางของเรา",
  /** The transfer sign at the interchange, as Bangkok metro signs say it. */
  stamp: "เปลี่ยนสาย",
  /** The trail is drawn as two metro lines: the one we left, and the one we took. */
  lines: { before: "สายสอน", after: "สายลงมือทำ" },
  note: "เราเองก็เปลี่ยนทางมาแล้วเหมือนกัน",
  steps: [
    {
      when: "2568",
      title: "TechSeed",
      href: "/techseed",
    },
    {
      when: "2568",
      title: "งานกับพาร์ตเนอร์",
      body: "เวิร์กช็อปและ Mini Hackathon ในงานเปิดบ้านวิศวะคอม ม.อ. หาดใหญ่ และงานทอล์ก BizSeed กับ CSII",
    },
    {
      when: "หลัง TechSeed #5",
      title: "เปลี่ยนทางมาเป็น SHIFT",
      body: "เราเห็นชัดขึ้นว่าอยากให้นักเรียนเลือกทางเองได้ เลยลดการสอนลง ไม่ป้อนไอเดีย ให้นักเรียนเลือกโจทย์และลงมือทำเอง",
      pivot: true,
    },
    {
      when: "ก.พ.–มิ.ย. 2569",
      title: "The Next Decade Hackathon",
      href: "/hackathon/past/healthcare",
    },
    {
      when: "ก.ย. 2569",
      title: SHIFT_COHORT_0.name,
      href: cohortPath(SHIFT_COHORT_0),
    },
    {
      when: "ต.ค.–พ.ย. 2569",
      title: "SHIFT รุ่นออนไลน์ และ SHIFT High",
      href: "/shift",
    },
    {
      when: "ธ.ค. 2569",
      title: `${ELEMENTAL.edition} Hackathon`,
      href: "/hackathon/elemental?src=about",
    },
  ] satisfies AboutMilestone[],
};

/** For schools, partners and sponsors who read English. */
export const ABOUT_ENGLISH = {
  heading: "In English",
  body: "PassionSeed runs short, hands-on programs where Thai students build real projects and test them with real people. Our main programs are SHIFT, a 7-day project sprint for upper secondary students, and The Next Decade hackathons.",
  contact: "Schools, partners and sponsors: talk to us.",
};
