/**
 * SHIFT[2] curriculum for mentors (internal, shown at /shift/curriculum).
 * These are the defaults. Admins edit the page and saves go to the
 * shift_curriculum table, which wins over these values.
 * Built from the SHIFT[1] run plan, the SHIFT[1] results and the decisions of
 * 2026-10-13 (refund steps, testers from day 2). Source of truth for the
 * reasoning: company-brain shift2.md. Contains no student data.
 */

/** [time, topic, detail] */
export type CurriculumRow = [string, string, string];

export interface CurriculumDay {
  day: number;
  /** ISO date */
  date: string;
  name: string;
  /** false = no live mentor session; students work on their own on Discord */
  mentorSession: boolean;
  goal: string;
  schedule?: CurriculumRow[];
  mission: string;
  /** 1-based indexes into REFUND_STEPS that this day moves forward */
  refundSteps: number[];
  /** What mentors check in #progress, and when to step in */
  mentorChecks: string[];
}

export const SHIFT2_SESSION_TIME = "19:00–21:00";

export const SHIFT2_RULES = [
  "Discord อย่างเดียว ทุกงานโพสต์ใน #progress งานที่ทำในคอลหรือ DM ก็ต้องโพสต์ด้วย ไม่งั้นไม่นับ",
  "ใช้งานจริงสำคัญกว่าสวย บอกตั้งแต่ Day 1 ไม่ใช่ตอน Demo Day",
  "เลือกกลุ่มคนใช้ที่น้องทักได้เอง ไม่ต้องรอครูหรือผู้ใหญ่อนุญาต",
  "พี่เลี้ยงถาม น้องตัดสินใจเอง ไม่เสนอฟีเจอร์ให้",
  "ขาดเซสชันได้ เข้าคลาสชดเชยแทน",
];

export interface InterviewGuide {
  intro: string;
  /** DM to book a short talk */
  dm: string;
  questions: string[];
  dos: string[];
  donts: string[];
}

/** How to talk to users. Taught on Day 1 before First contact. */
export const SHIFT2_INTERVIEW: InterviewGuide = {
  intro:
    "คุยสั้น ๆ 10 นาที เป้าหมายคือรู้ว่าเขาเจอปัญหานี้จริงไหม และตอนนี้แก้ยังไง ไม่ใช่ขายไอเดีย",
  dm: "สวัสดีครับ/ค่ะ เราเป็นนักเรียน กำลังทำโปรเจกต์เรื่อง [ปัญหา] ขอคุยสั้น ๆ 10 นาทีพรุ่งนี้ได้ไหม อยากฟังว่าตอนนี้คุณจัดการเรื่องนี้ยังไง ไม่ได้ขายอะไร",
  questions: [
    "ครั้งล่าสุดที่เจอเรื่องนี้คือเมื่อไหร่ เล่าให้ฟังหน่อย",
    "ตอนนั้นทำยังไง ใช้อะไรช่วย",
    "ตรงไหนยากหรือเสียเวลาที่สุด",
    "เคยลองวิธีอื่นไหม ทำไมไม่ใช้ต่อ",
    "มีใครอีกที่เจอแบบนี้ แนะนำให้หน่อยได้ไหม",
  ],
  dos: [
    "ถามเรื่องที่เกิดขึ้นแล้ว ไม่ใช่เรื่องสมมติ",
    "ฟังมากกว่าพูด ถาม \"ทำไม\" ต่ออีกชั้น",
    "จดคำพูดของเขาตรง ๆ ไม่สรุปเอง",
    "จบด้วยขอบคุณ และขอคนต่อไป",
  ],
  donts: [
    "อย่าเล่าไอเดียหรือแอปของเราก่อน",
    "อย่าถาม \"ถ้ามีแอปแบบนี้จะใช้ไหม\" คนส่วนใหญ่ตอบว่าใช้ แต่ไม่ใช้จริง",
    "อย่าถามนำ หรือเถียงเมื่อเขาไม่เห็นด้วย",
  ],
};

/** Everything mentors can edit on /shift/curriculum. Saved as JSON in shift_curriculum. */
export interface CurriculumDoc {
  sessionTime: string;
  rules: string[];
  interview: InterviewGuide;
  days: CurriculumDay[];
}

export const SHIFT2_CURRICULUM: CurriculumDay[] = [
  {
    day: 1,
    date: "2026-10-14",
    name: "3 ไอเดีย → เลือก 1",
    mentorSession: true,
    goal: "รู้จักกัน คิดอย่างน้อย 3 ไอเดีย แล้วเลือกอันที่ดีที่สุดกับกลุ่มคนที่ทักได้เอง",
    schedule: [
      ["19:00", "Park", "SHIFT คืออะไร + กติกา + ขั้นตอนคืนเงิน"],
      ["19:15", "Ice break", "กลุ่มละ 3 คน รอบละ 8 นาที หมุน 3 รอบ + วาดรูปใน Excalidraw"],
      ["19:45", "3 ไอเดีย", "เขียนปัญหาที่เห็นเองอย่างน้อย 3 ข้อ + ใครเจอบ้าง"],
      ["20:05", "Access check", "ทักคนกลุ่มนี้เองได้ไหม โดยไม่ต้องขอผู้ใหญ่"],
      ["20:15", "เลือก 1", "พี่เลี้ยงถาม น้องตัดเอง"],
      ["20:30", "วิธีคุยกับคน", "ถามเรื่องที่เกิดขึ้นจริง ไม่ขายไอเดีย ซ้อมกับเพื่อน 1 รอบ (ดูวิธีคุยด้านบน)"],
      ["20:45", "First contact", "DM คนจริง 1 คน นัดคุย 10 นาทีพรุ่งนี้ ใช้ข้อความตัวอย่าง แคปลง #first-contact (เบลอชื่อและรูป)"],
      ["20:50", "Mission ก่อน Day 2", ""],
    ],
    mission: "คุยกับคนที่เจอปัญหาจริงอย่างน้อย 3 คน จดเป็นคำพูดของเขา แล้วโพสต์ใน #progress",
    refundSteps: [1, 8, 9],
    mentorChecks: [
      "ทุกคนโพสต์ 3 ไอเดียใน #progress",
      "ใครยังเลือกไม่ได้ DM คืนนี้ (SHIFT[1] มีคนเลือกหัวข้อช้าสุดแล้วตามไม่ทัน)",
      "ไอเดียที่ต้องรอครูหรือผู้ใหญ่ ถามว่ามีกลุ่มอื่นที่ทักได้เองไหม",
    ],
  },
  {
    day: 2,
    date: "2026-10-15",
    name: "ปัญหาจริงไหม + เริ่มหาคนลอง",
    mentorSession: true,
    goal: "เช็กว่าปัญหามีจริง ล็อก 1 ปัญหา 1 กลุ่มคนใช้ แล้วเริ่มหาคนลอง 2 ทาง",
    schedule: [
      ["19:00", "Park", "วันนี้: ปัญหาจริงไหม → ล็อก → เริ่มหาคนลอง"],
      ["19:05", "เขาพูดอะไร?", "เล่าในกลุ่ม 10 นาที แยก ทำ / เล่า / ความเห็น"],
      ["19:20", "ล็อกสโคป", "1 ปัญหา 1 กลุ่มคนใช้ (/seedstack-scope)"],
      ["19:35", "ติดตั้ง OpenCode + gstack", "บอกว่าตอบภาษาไทยได้"],
      ["19:55", "หาคนลอง", "ร่างข้อความทักตรง + โพสต์กลุ่ม Facebook เพื่อนในทีมอ่านก่อนโพสต์"],
      ["20:15", "AI Studio", "ต้นแบบทิ้งได้ 1 จอ 1 ฟีเจอร์"],
      ["20:45", "Daily Show", "คนละ 30 วิ"],
      ["20:55", "Mission ก่อน Day 3", ""],
    ],
    mission: "ทักคนตรงทีละคน + โพสต์ในกลุ่ม Facebook อย่างน้อย 10 กลุ่ม ใครยังคุยไม่ครบ 3 คนให้ครบ",
    refundSteps: [2, 3, 8, 9],
    mentorChecks: [
      "ทุกคนมีโน้ตคุยกับคนจริง 3 คนใน #progress",
      "โพสต์กลุ่ม Facebook ต้องบอกปัญหาด้วยคำของผู้ใช้ และขอสิ่งเล็ก ๆ พร้อมเวลา",
    ],
  },
  {
    day: 3,
    date: "2026-10-16",
    name: "Build Fast",
    mentorSession: false,
    goal: "สร้างต้นแบบที่คนอื่นเปิดลองได้ ไม่ต้องสวย",
    mission: "ต้นแบบที่เปิดได้บนมือถือคนอื่น + นัดคนลองอย่างน้อย 3 คน โพสต์ใน #progress",
    refundSteps: [4, 8],
    mentorChecks: [
      "เช็ก Day 3: ใครยังไม่มีหลักฐานคุยกับคนหรือหาคนลองใน #progress ได้ DM จากพี่เลี้ยงวันนี้",
      "ใครเงียบตั้งแต่ Day 2 ทักไปถามว่าติดอะไร",
    ],
  },
  {
    day: 4,
    date: "2026-10-17",
    name: "Ship to Strangers",
    mentorSession: true,
    goal: "คนนอกรุ่นอย่างน้อย 3 คนได้ลองของ แยกหลักฐาน (เขาทำ) ออกจากความเห็น (เขาพูด)",
    schedule: [
      ["19:00", "Park", "วันนี้: เทสต์กับคนจริง"],
      ["19:05", "เช็กอิน", "ตัวเลข: ทักไป / ตอบ / นัด / ลองแล้ว"],
      ["19:15", "เขาทำ หรือเขาพูด?", "คุยในกลุ่ม 10 นาที → แชร์ 5 นาที"],
      ["19:30", "Swap test", "ลองของกลุ่มข้าง ๆ ห้ามอธิบาย"],
      ["19:45", "ทัก + เทสต์", "เทสต์สดในเวลา (/seedstack-test)"],
      ["20:35", "Daily Show", "คนละ 30 วิ"],
      ["20:55", "Mission ก่อน Day 5", ""],
    ],
    mission: "ให้คนนอกรุ่นลองครบ 3 คน จดว่าเขาพูดอะไร แล้วเลือก 1 อย่างที่จะเปลี่ยน",
    refundSteps: [5, 8, 9],
    mentorChecks: [
      "ใครยังไม่มีคนลองเลย DM วันนี้",
      "โปรเจกต์ที่ต้องรอครูหรือผู้ใหญ่ ช่วยหากลุ่มที่เข้าถึงได้เอง เช่น สภานักเรียน หรือเพื่อนที่จะใช้จริง",
      "สายเทคแนะนำ Next.js + Supabase + Vercel สายธุรกิจแนะนำ Business Model Canvas",
    ],
  },
  {
    day: 5,
    date: "2026-10-18",
    name: "Fix",
    mentorSession: false,
    goal: "เปลี่ยนอย่างน้อย 1 อย่างจากสิ่งที่คนลองบอก แล้วขึ้นลิงก์จริง",
    mission: "โพสต์ก่อน → หลังของสิ่งที่เปลี่ยนใน #progress (/seedstack-build, /seedstack-live)",
    refundSteps: [6, 8],
    mentorChecks: [
      "ใครเงียบ DM",
      "ใครทำครบแล้ว ให้กลับไปบอกคนที่ช่วยเทสต์ว่าเปลี่ยนอะไร",
    ],
  },
  {
    day: 6,
    date: "2026-10-19",
    name: "ปล่อยสู่โลก + ซ้อมเดโม",
    mentorSession: true,
    goal: "ปล่อยให้คนเห็น เพิ่ม 1 อย่างที่ว้าวถ้า core flow เวิร์กแล้ว และซ้อมเดโม 2 นาที",
    schedule: [
      ["19:00", "Park", "วันนี้: ปล่อยสู่โลก"],
      ["19:05", "อะไรเปลี่ยน?", "ก่อน → หลัง เล่าในกลุ่ม"],
      ["19:20", "One wow", "แอนิเมชันหรือความสวย 1 อย่าง หลัง core flow เวิร์กแล้วเท่านั้น"],
      ["19:45", "ปล่อยสู่โลก", "โพสต์ลิงก์กลับไปในกลุ่มเดิม ให้คนที่เคยช่วยได้ลอง"],
      ["20:05", "ซ้อมเดโม 2 นาที", "ใคร → หลักฐานว่าปัญหาจริง → เขาพูดอะไร → เปลี่ยนอะไร → เทสต์ต่อไป"],
      ["20:40", "พอร์ต 1 หน้า", "ร่าง"],
      ["20:55", "Mission ก่อน Day 7", ""],
    ],
    mission: "เตรียมเดโม 2 นาทีตามโครง พอร์ต 1 หน้าให้เสร็จ",
    refundSteps: [8, 9],
    mentorChecks: [
      "นับขั้นตอนคืนเงินของทุกคน ใครยังขาด บอกวันนี้ และนัดคลาสชดเชยถ้าขาดเซสชัน",
    ],
  },
  {
    day: 7,
    date: "2026-10-20",
    name: "Demo Day",
    mentorSession: true,
    goal: "เดโมของจริง เล่าว่าใครใช้ เขาพูดอะไร เราเปลี่ยนอะไร เหมือนซ้อมสัมภาษณ์ TCAS",
    schedule: [
      ["19:00", "Park", "Demo Day"],
      ["19:05", "เดโม", "คนละ 2 นาที + 1 คำถามแบบสัมภาษณ์ TCAS"],
      ["20:00", "โหวต", "ใครเรียนรู้จากผู้ใช้จริงมากที่สุด ไม่ใช่แค่สวยสุด"],
      ["20:15", "เราเปลี่ยนไปยังไง?", "คุยในกลุ่ม + คำถาม SDT สั้น ๆ"],
      ["20:35", "ต่อจากนี้", "Discord ไม่ปิด"],
      ["20:55", "ปิดค่าย", "แคปจอรูปหมู่"],
    ],
    mission: "โปรเจกต์ต่อหลังค่าย: ให้คนใช้จริงต่อ",
    refundSteps: [7, 9],
    mentorChecks: [
      "เช็กลิสต์คืนเงิน: ทำครบ 9 ขั้นไหม ดูจาก #progress",
      "นับ: มีลิงก์ / มีคนลองจริง / นำเสนอ เพื่อเทียบกับ SHIFT[1]",
    ],
  },
];

export const SHIFT2_DEFAULT_DOC: CurriculumDoc = {
  sessionTime: SHIFT2_SESSION_TIME,
  rules: SHIFT2_RULES,
  interview: SHIFT2_INTERVIEW,
  days: SHIFT2_CURRICULUM,
};

const isStr = (v: unknown, max = 2000): v is string =>
  typeof v === "string" && v.length <= max;
const isStrList = (v: unknown, max = 50): v is string[] =>
  Array.isArray(v) && v.length <= max && v.every((x) => isStr(x));

/** Checks a saved or submitted doc. Returns null if the shape is wrong. */
export function parseCurriculumDoc(raw: unknown): CurriculumDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const iv = d.interview as Record<string, unknown> | undefined;
  if (!isStr(d.sessionTime, 100) || !isStrList(d.rules)) return null;
  if (
    !iv ||
    !isStr(iv.intro) ||
    !isStr(iv.dm) ||
    !isStrList(iv.questions) ||
    !isStrList(iv.dos) ||
    !isStrList(iv.donts)
  )
    return null;
  if (!Array.isArray(d.days) || d.days.length > 14) return null;
  const daysOk = d.days.every((day: Record<string, unknown>) => {
    const sched = day?.schedule;
    return (
      typeof day?.day === "number" &&
      isStr(day.date, 10) &&
      /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
      isStr(day.name, 200) &&
      typeof day.mentorSession === "boolean" &&
      isStr(day.goal) &&
      isStr(day.mission) &&
      Array.isArray(day.refundSteps) &&
      day.refundSteps.every((n) => Number.isInteger(n) && n >= 1 && n <= 20) &&
      isStrList(day.mentorChecks) &&
      (sched === undefined ||
        (Array.isArray(sched) &&
          sched.length <= 30 &&
          sched.every((r) => Array.isArray(r) && r.length === 3 && r.every((c) => isStr(c)))))
    );
  });
  if (!daysOk) return null;
  return {
    sessionTime: d.sessionTime,
    rules: d.rules,
    interview: {
      intro: iv.intro,
      dm: iv.dm,
      questions: iv.questions,
      dos: iv.dos,
      donts: iv.donts,
    },
    days: d.days as CurriculumDay[],
  };
}
