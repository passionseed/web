import type { ExcalidrawElementSkeleton } from "@excalidraw/excalidraw/data/transform";

import { STICKY_COLORS } from "./core";

/**
 * Board templates as Excalidraw element skeletons, laid out from (0, 0).
 * The editor turns them into real elements with convertToExcalidrawElements
 * and drops them where the viewer is looking.
 */

export type TemplateId =
  | "checkin"
  | "brainstorm"
  | "retro"
  | "kanban"
  | "swot"
  | "journey"
  | "project"
  | "week"
  | "mindmap";

export type Template = {
  id: TemplateId;
  name: string;
  description: string;
  emoji: string;
  build: () => ExcalidrawElementSkeleton[];
};

const INK = "#1e1e1e";
const FONT = 6; // Nunito
const fill = (name: (typeof STICKY_COLORS)[number]["name"]) => STICKY_COLORS.find((c) => c.name === name)!.fill;

export const STICKY_SIZE = 200;

/** A FigJam-style sticky note: a solid, borderless square with centred text. */
export function sticky(x: number, y: number, color: string, text = "", size = STICKY_SIZE): ExcalidrawElementSkeleton {
  return {
    type: "rectangle",
    x,
    y,
    width: size,
    height: size,
    backgroundColor: color,
    strokeColor: color,
    fillStyle: "solid",
    strokeWidth: 1,
    roughness: 0,
    roundness: { type: 3 },
    ...(text ? { label: { text, fontSize: 20, fontFamily: FONT, strokeColor: INK } } : {}),
  } as ExcalidrawElementSkeleton;
}

function heading(x: number, y: number, text: string, fontSize = 32): ExcalidrawElementSkeleton {
  return { type: "text", x, y, text, fontSize, fontFamily: FONT, strokeColor: INK } as ExcalidrawElementSkeleton;
}

/** A tinted, rounded area that groups stickies, with a title above it. */
function zone(x: number, y: number, width: number, height: number, title: string, tint: string): ExcalidrawElementSkeleton[] {
  return [
    {
      type: "rectangle",
      x,
      y,
      width,
      height,
      backgroundColor: tint,
      strokeColor: "transparent",
      fillStyle: "solid",
      opacity: 45,
      roughness: 0,
      roundness: { type: 3 },
    } as ExcalidrawElementSkeleton,
    heading(x + 24, y + 20, title, 28),
  ];
}

function columns(titles: string[], tints: string[], width = 520, height = 760): ExcalidrawElementSkeleton[] {
  return titles.flatMap((title, i) => {
    const x = i * (width + 40);
    return [
      ...zone(x, 80, width, height, title, tints[i % tints.length]),
      sticky(x + 32, 160, fill(i % 2 ? "Blue" : "Yellow")),
    ];
  });
}


/** "Get to know you" questions for the team check-in; one is picked per board. */
export const CHECKIN_QUESTIONS = [
  "ถ้ามีวันว่างหนึ่งวันเต็ม ๆ จะทำอะไร?",
  "เพลงที่ฟังวนอยู่ช่วงนี้คือเพลงอะไร?",
  "อะไรที่เราทำได้ดี แต่ยังไม่ค่อยมีใครรู้?",
  "ถ้าสอนอะไรให้เพื่อนได้ 10 นาที จะสอนอะไร?",
  "ช่วงนี้อะไรทำให้ยิ้มได้?",
  "เรื่องที่อยากรู้มากที่สุดตอนนี้คืออะไร?",
  "ถ้าได้ไปตามติดการทำงานของใครก็ได้หนึ่งวัน อยากไปกับใคร?",
  "ของกินที่กินได้ทุกวันไม่เบื่อ?",
];

const LANES = 6;
const LANE_HEIGHT = 240;

/**
 * Team check-in: a short stand-up the group runs by itself. Built around what
 * keeps people coming back: a personal question and a mood check to know each
 * other (relatedness), wins since last time (competence), a next step each
 * person picks (autonomy), then helping with blockers, thanking friends, and
 * choosing one thing to post on the feed.
 */
function checkin(question: string): ExcalidrawElementSkeleton[] {
  const top = 640;
  const laneTop = top + 80;
  const boardBottom = laneTop + LANES * LANE_HEIGHT;
  const cols = [
    { x: 240, title: "✅ ทำอะไรไปแล้ว", tint: "#b2f2bb" },
    { x: 760, title: "🧱 ติดอะไรอยู่", tint: "#ffc9c9" },
    { x: 1280, title: "👣 ก้าวต่อไป (เลือกเอง)", tint: "#a5d8ff" },
  ];
  return [
    heading(0, 0, "เช็คอินทีม · Team check-in", 44),
    ...zone(0, 80, 2300, 180, "วิธีเล่น 30 นาที · ผลัดกันเป็นคนคุมวง", "#e9ecef"),
    heading(
      24,
      150,
      "1 รู้จักกัน + เช็คอารมณ์ 5'  →  2 รอบวง คนละ 1 นาที 10'  →  3 ช่วยกันแก้ติด 10'  →  4 ขอบคุณเพื่อน + เลือกโพสต์ 5'",
      24,
    ),
    heading(24, 200, "แปะโน้ตของตัวเองให้ครบก่อนเริ่ม แล้วผลัดกันเล่า ใครฟังแล้วช่วยได้ แปะ 🙋 ไว้ที่ช่อง 'ติด' ของเพื่อน", 20),

    ...zone(0, 300, 760, 300, "🎲 คำถามรู้จักกันวันนี้", "#d0bfff"),
    {
      ...sticky(24, 370, fill("Purple"), "", 200),
      width: 712,
      height: 130,
      label: { text: question, fontSize: 28, fontFamily: FONT, strokeColor: INK },
    } as ExcalidrawElementSkeleton,
    heading(24, 530, "ตอบสั้น ๆ คนละประโยค แปะคำตอบไว้รอบ ๆ ได้เลย", 20),
    ...zone(800, 300, 1500, 300, "🌤️ วันนี้เป็นยังไง (แปะชื่อไว้ใกล้ ๆ)", "#ffec99"),
    ...["☀️ สดใส", "⛅ โอเค", "🌧️ เหนื่อย ๆ", "⛈️ หนักอยู่"].map((w, i) => heading(840 + i * 360, 420, w, 40)),

    heading(24, top + 10, "ชื่อ", 28),
    ...cols.flatMap((c) => zone(c.x, top, 480, boardBottom - top, c.title, c.tint)),
    ...Array.from({ length: LANES }, (_, i) => sticky(0, laneTop + i * LANE_HEIGHT, fill("Yellow"), "", 200)),

    ...zone(1800, top, 500, boardBottom - top, "🙋 ช่วยกันแก้ติด", "#ffd8a8"),
    heading(
      1824,
      top + 70,
      "ลากลูกศรจากชื่อเรา\nไปที่ 'ติด' ของเพื่อน\nที่เราช่วยได้\n\nจบวงแล้วจับคู่คุยต่อ\n5 นาที",
      22,
    ),

    ...zone(0, boardBottom + 40, 1120, 420, "💛 ขอบคุณเพื่อน", "#ffc9c9"),
    sticky(24, boardBottom + 110, fill("Pink"), "ขอบคุณ ... ที่ ...", 200),
    ...zone(1160, boardBottom + 40, 1140, 420, "📣 เลือก 1 อย่างไปโพสต์ในฟีด", "#a5d8ff"),
    heading(
      1184,
      boardBottom + 110,
      "เรื่องที่ภูมิใจจากวันนี้ เขียนสั้น ๆ\nแปะไว้ตรงนี้ แล้วโพสต์ในฟีด\npassionseed.org/shift/alumni/board/feed",
      22,
    ),
    sticky(1184, boardBottom + 230, fill("Blue"), "", 160),
  ];
}

export const TEMPLATES: Template[] = [
  {
    id: "checkin",
    name: "เช็คอินทีม · Team check-in",
    description: "รู้จักกัน รอบวง ช่วยกันแก้ติด ขอบคุณ แล้วโพสต์",
    emoji: "👋",
    build: () => checkin(CHECKIN_QUESTIONS[Math.floor(Math.random() * CHECKIN_QUESTIONS.length)]),
  },
  {
    id: "brainstorm",
    name: "ระดมไอเดีย · Brainstorm",
    description: "คำถามตรงกลาง แล้วแปะไอเดียรอบ ๆ",
    emoji: "💡",
    build: () => {
      const center: ExcalidrawElementSkeleton = {
        type: "ellipse",
        x: 380,
        y: 330,
        width: 360,
        height: 200,
        backgroundColor: "#fff3bf",
        strokeColor: INK,
        fillStyle: "solid",
        roughness: 0,
        label: { text: "เราจะ...ได้ยังไง?", fontSize: 28, fontFamily: FONT },
      } as ExcalidrawElementSkeleton;
      const spots = [
        [60, 40], [460, 0], [860, 40], [0, 340], [940, 340], [60, 640], [460, 680], [860, 640],
      ];
      const colors = ["Yellow", "Pink", "Blue", "Green", "Orange", "Purple", "Yellow", "Blue"] as const;
      return [center, ...spots.map(([x, y], i) => sticky(x, y, fill(colors[i]), "", 180))];
    },
  },
  {
    id: "retro",
    name: "ย้อนมองทีม · Retro",
    description: "อะไรดี อะไรควรปรับ ทำอะไรต่อ",
    emoji: "🔁",
    build: () => [
      heading(0, 0, "Retro", 44),
      ...columns(["ไปได้ดี 😊", "ควรปรับ 🤔", "จะลองทำ 🚀"], ["#b2f2bb", "#ffc9c9", "#a5d8ff"]),
    ],
  },
  {
    id: "kanban",
    name: "บอร์ดงาน · Kanban",
    description: "ต้องทำ กำลังทำ เสร็จแล้ว",
    emoji: "🗂️",
    build: () => [
      heading(0, 0, "Kanban", 44),
      ...columns(["ต้องทำ", "กำลังทำ", "เสร็จแล้ว"], ["#e9ecef", "#fff3bf", "#b2f2bb"], 440),
    ],
  },
  {
    id: "swot",
    name: "SWOT",
    description: "จุดแข็ง จุดอ่อน โอกาส อุปสรรค",
    emoji: "🧭",
    build: () => [
      heading(0, 0, "SWOT", 44),
      ...zone(0, 80, 560, 460, "Strengths จุดแข็ง", "#b2f2bb"),
      ...zone(600, 80, 560, 460, "Weaknesses จุดอ่อน", "#ffc9c9"),
      ...zone(0, 580, 560, 460, "Opportunities โอกาส", "#a5d8ff"),
      ...zone(600, 580, 560, 460, "Threats อุปสรรค", "#ffec99"),
    ],
  },
  {
    id: "journey",
    name: "เส้นทางผู้ใช้ · User journey",
    description: "ผู้ใช้ทำอะไร คิดอะไร รู้สึกยังไง ในแต่ละช่วง",
    emoji: "🧑‍🚀",
    build: () => {
      const stages = ["รู้จัก", "ลองใช้", "ใช้จริง", "กลับมาอีก"];
      const rows = ["ทำอะไร", "คิดอะไร", "รู้สึกยังไง", "โอกาสของเรา"];
      const tints = ["#e9ecef", "#a5d8ff", "#ffc9c9", "#b2f2bb"];
      return [
        heading(0, 0, "User journey", 44),
        ...stages.map((s, i) => heading(220 + i * 260, 90, s, 26)),
        ...rows.flatMap((r, j) => [
          heading(0, 170 + j * 260, r, 24),
          ...zone(200, 150 + j * 260, stages.length * 260, 230, "", tints[j]).slice(0, 1),
        ]),
      ];
    },
  },
  {
    id: "project",
    name: "แคนวาสโปรเจกต์ · Project canvas",
    description: "ปัญหา ใคร ไอเดีย ทดสอบ ขั้นต่อไป",
    emoji: "🌱",
    build: () => [
      heading(0, 0, "Project canvas", 44),
      ...zone(0, 80, 400, 480, "ปัญหาคืออะไร", "#ffc9c9"),
      ...zone(440, 80, 400, 480, "เจอกับใคร", "#ffec99"),
      ...zone(880, 80, 400, 480, "ไอเดียของเรา", "#a5d8ff"),
      ...zone(0, 600, 620, 400, "จะทดสอบยังไง", "#d0bfff"),
      ...zone(660, 600, 620, 400, "ก้าวต่อไป (ภายในสัปดาห์นี้)", "#b2f2bb"),
    ],
  },
  {
    id: "week",
    name: "แผนสัปดาห์ · Weekly plan",
    description: "เจ็ดวัน วันละช่อง",
    emoji: "📅",
    build: () => {
      const days = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"];
      const tints = ["#ffec99", "#ffc9c9", "#b2f2bb", "#ffd8a8", "#a5d8ff", "#d0bfff", "#ffc9c9"];
      return [heading(0, 0, "แผนสัปดาห์", 44), ...days.flatMap((d, i) => zone(i * 300, 80, 280, 640, d, tints[i]))];
    },
  },
  {
    id: "mindmap",
    name: "แผนที่ความคิด · Mind map",
    description: "หัวข้อหลัก แตกกิ่งออกไป",
    emoji: "🧠",
    build: () => {
      const center = { x: 500, y: 360, w: 260, h: 120 };
      const branches = [
        [80, 80], [920, 80], [40, 420], [960, 420], [140, 720], [860, 720],
      ];
      const els: ExcalidrawElementSkeleton[] = [
        {
          type: "rectangle",
          id: "mm-center",
          x: center.x,
          y: center.y,
          width: center.w,
          height: center.h,
          backgroundColor: "#d0bfff",
          strokeColor: INK,
          fillStyle: "solid",
          roughness: 0,
          roundness: { type: 3 },
          label: { text: "หัวข้อหลัก", fontSize: 28, fontFamily: FONT },
        } as ExcalidrawElementSkeleton,
      ];
      branches.forEach(([x, y], i) => {
        const id = `mm-${i}`;
        els.push({
          type: "rectangle",
          id,
          x,
          y,
          width: 220,
          height: 90,
          backgroundColor: "#ffffff",
          strokeColor: INK,
          fillStyle: "solid",
          roughness: 0,
          roundness: { type: 3 },
          label: { text: `กิ่ง ${i + 1}`, fontSize: 22, fontFamily: FONT },
        } as ExcalidrawElementSkeleton);
        els.push({
          type: "arrow",
          x: center.x + center.w / 2,
          y: center.y + center.h / 2,
          strokeColor: INK,
          roughness: 0,
          start: { id: "mm-center" },
          end: { id },
        } as ExcalidrawElementSkeleton);
      });
      return els;
    },
  },
];

export const templateById = (id: string | null | undefined) => TEMPLATES.find((t) => t.id === id) ?? null;
