/**
 * Level 8 · tcas. Design: docs/radar-guide/cybersecurity-guide.md, Page 8.
 * Grade gate (only ม.6 sees live countdowns), then the programme cards.
 * Programme names and links come from the committed mytcas snapshot
 * (tcas.json, `pnpm radar:tcas cybersecurity`), never typed by hand; the four
 * featured programmes add hand-checked round details on top. No cutscene.
 */
import type { FactId, GuidePage, ProgrammeCard } from "@/lib/radar-guide/guide-types";
import snapshot from "../tcas.json";
import { dialogue, host, item } from "./_story";

const NINE = "f.mytcas-9" as const;
const FOUR = "f.mytcas-four" as const;
const KMITL = "f.kmitl-portfolio" as const;

type SnapshotProgramme = (typeof snapshot.programmes)[number];

/** Hand-checked extras for the featured programmes, keyed by mytcas id. */
const FEATURED: Readonly<Record<string, Partial<ProgrammeCard> & { factIds: readonly FactId[] }>> = {
  "10160101300504A": {
    rounds: ["portfolio"],
    seats: 40,
    minGpax: 3,
    deadline: { at: "2027-01-28T16:30:00+07:00", labelTh: "รอบ 1 Portfolio ปิด 28 ม.ค. 2570 เวลา 16:30" },
    badge: "pending",
    factIds: [KMITL, FOUR],
    noteTh: "ยังรอตรวจสอบ: แหล่งรอง เช็กประกาศทางการ",
  },
  "10030138220204A": {
    rounds: ["portfolio"],
    badge: "confirmed",
    factIds: [FOUR],
    noteTh: "มีโครงการรอบ 1 ใน TCAS70 ดูจำนวนรับใน mytcas",
  },
  "10040106300502E": { badge: "confirmed", factIds: [FOUR], noteTh: "หลักสูตรนานาชาติ" },
  "10050209220202B": {
    badge: "confirmed",
    factIds: [FOUR],
    noteTh: "โครงการพิเศษ ค่าเรียนสูงกว่าภาคปกติ เช็กใน mytcas",
  },
};
const FEATURED_ORDER = Object.keys(FEATURED);

function card(p: SnapshotProgramme): ProgrammeCard {
  const extra = FEATURED[p.id];
  return {
    id: p.id,
    uniTh: p.uniTh,
    degreeTh: `${p.programTh} หลักสูตร${p.typeTh}`,
    track: p.track as ProgrammeCard["track"],
    rounds: extra?.rounds ?? [],
    ...(extra?.seats !== undefined ? { seats: extra.seats } : {}),
    ...(extra?.minGpax !== undefined ? { minGpax: extra.minGpax } : {}),
    ...(extra?.deadline ? { deadline: extra.deadline } : {}),
    badge: extra?.badge ?? "confirmed",
    factIds: extra?.factIds ?? [NINE],
    href: p.href as ProgrammeCard["href"],
    noteTh: extra?.noteTh ?? "ดูรอบและจำนวนรับใน mytcas",
    cyberInName: true,
  };
}

/** Featured programmes first (in design order), then the rest of the snapshot. */
export const TCAS_PROGRAMMES: readonly ProgrammeCard[] = [
  ...FEATURED_ORDER.map((id) => snapshot.programmes.find((p) => p.id === id)).filter(
    (p): p is SnapshotProgramme => Boolean(p)
  ),
  ...snapshot.programmes.filter((p) => !FEATURED_ORDER.includes(p.id)),
].map(card);

const FEATURED_COUNT = TCAS_PROGRAMMES.filter((p) => FEATURED_ORDER.includes(p.id)).length;

export const tcas: GuidePage = {
  key: "tcas",
  order: 8,
  titleTh: "สมัครที่ไหน เมื่อไหร่",
  questionTh: "ถ้าจะไปทางนี้ ต้องยื่นที่ไหน รอบไหน ภายในวันไหน",
  navLabelTh: "สมัครที่ไหน",
  asOf: "2026-11-11",
  minutes: 1,
  legacyHashes: ["study"],
  factIds: [NINE, FOUR, KMITL, "f.tctt", "f.tctt-kmitl-caveat", "f.secai"],
  og: {
    headlineTh: "ไซเบอร์ตรงๆ มีแล้วใน TCAS70",
    stat: { th: "9 หลักสูตรที่มีคำว่าไซเบอร์ในชื่อ", factIds: [NINE] },
  },
  blocks: [
    dialogue(
      "intro",
      host("ถ้าจะไปทางนี้ ต้องยื่นที่ไหน รอบไหน ภายในวันไหน"),
      host("บอกก่อนว่าตอนนี้เธออยู่ ม.อะไร แผนจะต่างกันเลย", { mood: "wink" })
    ),
    {
      kind: "game",
      id: "programmes",
      game: {
        engine: "ProgrammeFilter",
        data: {
          gradeQuestionTh: "ตอนนี้เธออยู่ ม.อะไร",
          gradeBannersTh: {
            m6: "เธอคือ TCAS70 รอบนี้เลย ดูวันปิดรับให้ดี",
            m5: "ปีหน้าเธอคือ TCAS71 ดู TCAS70 เป็นตัวอย่างว่าเขาขออะไร แล้วเริ่มเก็บผลงานตั้งแต่ตอนนี้",
            m4: "เธอคือ TCAS72 ดู TCAS70 เป็นตัวอย่าง แล้วค่อยๆ เก็บผลงานตามลิสต์นี้",
          },
          extraChecklistTh: {
            m4: ["พื้นฐานเครือข่าย", "ห้องฝึกเดือนละห้อง", "write-up ทุกห้องที่ทำ", "แข่ง CTF รุ่นมัธยม"],
          },
          programmes: TCAS_PROGRAMMES.slice(0, FEATURED_COUNT),
          snapshotProgrammes: TCAS_PROGRAMMES.slice(FEATURED_COUNT),
          snapshot: "tcas.json",
          broadRoutes: [
            { labelTh: "ประตูกว้าง: วิศวะคอม วิทย์คอม ไอที หลายมหาวิทยาลัย ดูใน mytcas", href: "https://course.mytcas.com" },
          ],
          fitOrder: { A: "cyberFirst", B: "broadFirst", C: "both" },
        },
      },
      track: { done: "tcas:done", value: "index", milestones: { grade: "tcas:grade", save: "tcas:save" } },
      answersTh: [
        "TCAS70 มีหลักสูตรที่มีคำว่าไซเบอร์ในชื่อ 9 หลักสูตร",
        ...TCAS_PROGRAMMES.map((p) => `${p.uniTh}: ${p.degreeTh}`),
        "ม.6 ดูวันปิดรับรอบนี้ ม.5 คือ TCAS71 ม.4 คือ TCAS72 ใช้ TCAS70 เป็นตัวอย่างว่าเขาขออะไร",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "programmes.grade-m6" },
        { at: 2200, action: "scroll", target: "programmes.save-10160101300504A" },
        { at: 3400, action: "tap", target: "programmes.save-10160101300504A" },
        { at: 5000, action: "wait" },
      ],
    },
    item(
      "stat-count",
      "stat",
      "ใน mytcas TCAS70 มีหลักสูตรที่มีคำว่าไซเบอร์ในชื่อ 9 หลักสูตร",
      { title: "นับจาก mytcas", facts: [NINE] }
    ),
    dialogue(
      "broad",
      host("ไม่ต้องเรียนหลักสูตรชื่อไซเบอร์ก็เข้าสายนี้ได้"),
      host("วิศวะคอม วิทย์คอม และไอที คือทางหลัก", { mood: "wink" })
    ),
    item(
      "intel-cost",
      "intel",
      "ค่าเรียนต่างกันมาก โครงการพิเศษกับนานาชาติแพงกว่าภาคปกติ เช็กใน mytcas ก่อนยื่น",
      { title: "ค่าเรียน", facts: [FOUR] }
    ),
    item(
      "intel-tctt",
      "intel",
      "Thailand Cyber Top Talent มีรุ่น Junior สำหรับนักเรียนมัธยม ปี 2569 มีผู้แข่งรุ่นนี้ 484 คน จากทั้งหมด 1,399 คน ทีมชนะได้ 80,000 บาทพร้อมถ้วยพระราชทาน",
      { title: "ตัวช่วยพอร์ต: แข่งแฮกแบบถูกกติกา", facts: ["f.tctt"] }
    ),
    item(
      "notif-tctt-next",
      "notification",
      "รอบชิงปีนี้จัดวันที่ 5 ก.ย. 2569 รอบหน้ายังไม่ประกาศวัน ติดตามที่ thnca.or.th",
      { title: "Thailand Cyber Top Talent", facts: ["f.tctt"] }
    ),
    item(
      "intel-tctt-caveat",
      "intel",
      "สจล. ยกการแข่งนี้เป็นตัวอย่างในโครงการ Top Talents แต่ไม่ใช่ทุกรางวัลที่ใช้ยื่นได้ อ่านเงื่อนไขเต็มก่อน",
      { title: "เช็กเงื่อนไขก่อนหวัง", facts: ["f.tctt-kmitl-caveat"], badge: "pending" }
    ),
    item(
      "cert-ladder",
      "intel",
      "ตอนนี้ลุยห้องฝึกกับ CTF แล้วค่อยเก็บ Security+ ช่วงมหาวิทยาลัย ส่วน SecAI+ ไว้ทีหลัง ใบเซอร์ด้าน AI security มีจริง แต่เขาแนะนำให้มีประสบการณ์ไอที 3 ถึง 4 ปี และงานด้านความปลอดภัยมาก่อน ตอนนี้เก็บผลงานดีกว่า",
      { title: "บันไดใบเซอร์", facts: ["f.secai"] }
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "อยากเรียนไซเบอร์ตรงๆ TCAS70 มีที่ไหนบ้าง" },
    variantsTh: ["ม.5 ตอนนี้ ปีหน้าคือ TCAS71 เริ่มเก็บอะไรได้เลย", "เด็ก ม.ปลาย แข่งแฮกถูกกติกา ได้ถ้วยพระราชทาน"],
    sendToFriendTh: "ส่งให้เพื่อนที่กำลังเลือกคณะสายคอม",
    visual: [
      "ชิปชื่อมหาวิทยาลัยมารวมกันเป็นตาราง",
      "ตัวเลขนับถอยหลังแบบพลิก",
      "สวิตช์ระดับชั้นที่ปิดการนับถอยหลังเมื่อเลือก ม.5",
    ],
  },
};
