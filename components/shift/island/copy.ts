/**
 * Every user-facing string on /shift/island, in one place.
 *
 * DRAFT COPY for the founder's Thai review (AGENTS.md: a multi-model Thai
 * review before shipping). Most lines come from the plan doc
 * (docs/designs/shift-high-island-web.md, "Screens").
 *
 * House rules, checked by __tests__/copy.test.ts: Thai first, no em dashes,
 * no emoji except the reflection entry/help cues, no markdown, never น้อง or ลูก, never talk down, no streaks. The
 * one day count is the character sheet's days shown up (player/copy.ts
 * CHARACTER.days), which only goes up: a missed day never takes anything
 * away or starts a count over (lore bible, "กติกาของเกาะ", rule 3).
 */
import {
  TREE_CLOSEUP,
  TREE_GIFT,
  TREE_IDEA_PREFILLED,
  TREE_PLANTED,
  TREE_SEED_PICK,
  TREE_SEEDS,
  TREE_SLOTS,
  TREE_WARDROBE,
} from "@/lib/shift-island/tree-copy";
import { REFLECTION_MIN_CHARS, REFLECTIONS_PER_DAY } from "@/lib/shift-island/rounds-rules";
import type { ProjectRoute, SeasonUnlock, TileStatus } from "@/lib/supabase/shift-quests/types";

import type { IconKey } from "./sprites";
import type { ShiftDiscordAuthError } from "@/lib/shift/discordAuth";

/**
 * DRAFT: the island's place names, from the lore bible
 * (docs/designs/shift-high-island-lore.md, "ชื่อสถานที่"). Short words students
 * already use; the labels below read them from here. กระดานเควสต์ is shared
 * with the bot, so it changes in both or neither.
 */
export const PLACES = {
  island: "เกาะ SHIFT",
  plaza: "ลานกลางเกาะ",
  board: "กระดานเควสต์",
  campfire: "กองไฟ",
  /** DRAFT (2026-11-20): the small one-person fire; the bot builds a locked voice room for whoever lights it. */
  deepfire: "กองไฟโฟกัส",
  stage: "เวที Demo Day",
};

/** Tree stages 0..7, same names as the bot (bot/src/quests/island/copy.ts). */
/** Before stage 1: the team has a seed but no confirmed quest yet. */
export const PRE_STAGE = "เมล็ด";

export const STAGE_NAMES = ["ที่ดินว่าง", "เมล็ดงอก", "ต้นกล้า", "ต้นอ่อน", "ต้นไม้", "ต้นใหญ่", "ออกผล", "ผลิดอก"] as const;

export function stageName(stage: number): string {
  const n = Number.isFinite(stage) ? Math.trunc(stage) : 0;
  return STAGE_NAMES[Math.min(Math.max(n, 0), STAGE_NAMES.length - 1)];
}

/** The stage's name, with a planted seed at stage 0 called the seed (เมล็ด) rather than an empty plot. */
export function treeStageName(stage: number, seeded: boolean): string {
  return (Number.isFinite(stage) ? Math.trunc(stage) : 0) <= 0 && seeded ? PRE_STAGE : stageName(stage);
}

export const ROUTE_NAMES: Record<ProjectRoute, string> = {
  software: "ซอฟต์แวร์",
  creative: "งานสร้างสรรค์",
  service: "บริการ",
  other: "อื่นๆ",
};
export const ALL_ROUTES = "ทุกเส้นทาง";

/** State chip per tile status (plan: "Tile states"). `held` without a name. */
export const TILE_CHIP: Record<TileStatus, string> = {
  locked: "ล็อกอยู่",
  available: "ทำได้เลย",
  active: "กำลังทำ",
  paused: "พักไว้",
  submitted: "รอพี่เลี้ยงดู",
  clarification: "ขอข้อมูลเพิ่ม",
  appealed: "อุทธรณ์อยู่",
  declined: "ลองส่งใหม่ได้",
  held: "เพื่อนร่วมทีมทำอยู่",
  done: "ผ่านแล้ว",
};

export function tileChip(status: TileStatus, owner?: string | null): string {
  if (status === "held" && owner && owner.trim()) return `${owner.trim()} ทำอยู่`;
  return TILE_CHIP[status];
}

/** "15 พ.ค." in Bangkok time. Empty for a missing or broken date. */
export function thaiShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
}

export const COMMON = {
  close: "ปิด",
  retry: "ลองอีกครั้ง",
  sending: "กำลังส่ง",
  saving: "กำลังบันทึก",
  failed: "มีบางอย่างไม่สำเร็จ ลองอีกครั้ง",
  counter: (length: number, max: number) => `${length}/${max}`,
  optional: "ไม่บังคับ",
  loading: "กำลังโหลดเกาะ",
};

export const GATE = {
  signedOut: {
    heading: "เกาะ SHIFT",
    body: "ต้นไม้ของคุณบนเกาะโตทุกครั้งที่พี่เลี้ยงยืนยันงานที่คุณทำได้จริง",
    action: "เข้าสู่ระบบด้วย Discord",
    fine: "ใช้บัญชี Discord เดียวกับที่อยู่ในเซิร์ฟเวอร์ SHIFT",
  },
  authError: {
    heading: "เข้าสู่ระบบไม่สำเร็จ",
    body: {
      discord_identity_exists: "บัญชี Discord นี้ผูกกับอีกบัญชีหนึ่งอยู่แล้ว ออกจากระบบแล้วเข้าด้วย Discord อีกครั้ง",
      discord_email: "Discord ยังไม่ได้ยืนยันอีเมลของบัญชีนี้ ยืนยันอีเมลใน Discord ก่อนแล้วลองใหม่",
      discord_auth: "ลองอีกครั้งได้เลย",
    } satisfies Record<ShiftDiscordAuthError, string>,
    action: "เข้าสู่ระบบด้วย Discord",
  },
  noDiscord: {
    heading: "ใช้ Discord ที่อยู่ใน SHIFT",
    body: (label: string) => `ตอนนี้คุณเข้าสู่ระบบด้วย ${label} ซึ่งยังไม่ได้ผูก Discord`,
    bodyUnknown: "บัญชีที่คุณใช้อยู่ตอนนี้ยังไม่ได้ผูก Discord",
    action: "เข้าด้วย Discord ที่ใช้ใน SHIFT",
  },
  notEligible: {
    no_role: {
      heading: "ยังเข้าเกาะไม่ได้",
      body: "บัญชี Discord นี้ยังไม่มีสิทธิ์เข้าเกาะ ถ้าคุณเป็นนักเรียน SHIFT High ทักทีมงานในห้องช่วยเหลือของเซิร์ฟเวอร์ได้เลย",
      action: "สลับบัญชี Discord",
      link: "ไปที่เซิร์ฟเวอร์ SHIFT",
    },
    not_in_guild: {
      heading: "ยังเข้าเกาะไม่ได้",
      body: "บัญชี Discord นี้ยังไม่ได้อยู่ในเซิร์ฟเวอร์ SHIFT เข้าเซิร์ฟเวอร์ก่อนแล้วกลับมาที่นี่",
      action: "สลับบัญชี Discord",
      link: "เข้าเซิร์ฟเวอร์ SHIFT",
    },
    pilot_closed: {
      heading: "เกาะยังไม่เปิด",
      body: "ทีมงานจะประกาศในเซิร์ฟเวอร์ SHIFT เมื่อเปิดให้เข้า",
      action: null,
    },
    discord_unavailable: {
      heading: "เช็กสิทธิ์ไม่ได้ตอนนี้",
      body: "Discord ไม่ตอบกลับ ลองรีเฟรชอีกครั้งในอีกสักครู่",
      action: "ลองอีกครั้ง",
    },
  },
  unavailable: {
    heading: "เกาะปิดปรับปรุงชั่วคราว",
    body: "งานและต้นไม้ของคุณยังอยู่ครบ ลองใหม่อีกครั้งในอีกสักครู่",
    action: "ลองอีกครั้ง",
  },
  signedInAs: (name: string) => `เข้าสู่ระบบเป็น ${name}`,
  signInFailed: "เข้าสู่ระบบด้วย Discord ไม่สำเร็จ ลองอีกครั้ง",
};

export const START = {
  heading: "ยินดีต้อนรับสู่เกาะ SHIFT",
  /**
   * DRAFT: กติกาของเกาะ, the card folded under STORY.rules. Six lines at most,
   * from the lore bible ("กติกาของเกาะ"); lines 3 and 5 keep the invite
   * letter's own words (its chapter "กติกาบนเกาะ").
   */
  rules: [
    "1 โปรเจกต์ = ต้นไม้ 1 ต้น โตได้ 7 ขั้น ทำขั้นไหนก่อนก็ได้",
    "ถึงขั้นไหนแล้ว ส่งหลักฐานสั้นๆ พี่เลี้ยงดูงานจริงแล้วยืนยัน ไม่ได้นับจากการกดหรือชั่วโมง",
    "พักได้ ต้นไม้ไม่เหี่ยว เกาะนับวันที่คุณมา แต่วันที่ไม่ได้มาไม่ทำให้อะไรหายหรือเริ่มนับใหม่",
    "ไม่มีอันดับ ไม่มีกระดานคะแนน",
    "ทุกอย่างคุยกันในห้องที่ทุกคนเห็น ไม่มีห้องลับ",
    "ชื่อโปรเจกต์ขึ้นป้ายบนเกาะเมื่อทุกคนในทีมมีความยินยอมจากผู้ปกครองแล้ว ทีมซ่อนป้ายได้ทุกเมื่อ",
  ],
  action: "เริ่มเลย",
  pending: "กำลังเปิดเกาะ",
  switchAccount: "ไม่ใช่บัญชีนี้? สลับบัญชี Discord",
};

export const NO_PROJECT = {
  heading: "จับจองที่ดินบนเกาะ",
  body: "สร้างโปรเจกต์เรื่องที่คุณใส่ใจ แล้วต้นไม้ของคุณจะเริ่มจากเมล็ด หรือรอเพื่อนชวนเข้าโปรเจกต์ของเขาก็ได้",
  nameLabel: "ชื่อโปรเจกต์",
  routeLabel: "เส้นทาง",
  ambitionLabel: "อยากแก้ปัญหาอะไร ให้ใคร (ไม่บังคับ)",
  action: "จับจองที่ดิน",
  created: "จับจองที่ดินแล้ว ต้นไม้ของคุณเริ่มจากเมล็ด",
  nameRequired: "ตั้งชื่อโปรเจกต์ก่อน",
  routeRequired: "เลือกเส้นทางหนึ่งอย่าง",
  invitesHeading: "คำชวนเข้าทีม",
  invite: (project: string) => `${project} ชวนคุณเข้าทีม`,
  invitedBy: (inviter: string) => `ชวนโดย ${inviter}`,
  accept: "เข้าร่วม",
  decline: "ไม่ใช่ตอนนี้",
  joined: "เข้าทีมแล้ว ต้นไม้ของทีมรอคุณอยู่",
  passed: "ตอบคำชวนแล้ว",
  islandCaption: "เกาะตอนนี้",
  /** DRAFT: how joining a friend's team works (the invite comes from the island card in Discord). */
  joinFriend: "อยากทำกับเพื่อน ให้เพื่อนเปิดโปรเจกต์บนเกาะแล้วกดชวนคุณ คำชวนจะขึ้นที่หน้านี้",
  switchAccount: "สลับบัญชี Discord",
};

export const ISLAND = {
  title: PLACES.island,
  viewWhole: "ดูทั้งเกาะ",
  viewClose: "ขยายดูใกล้ๆ",
  myPlot: (slot: number, stage: string) => `แปลงของคุณ #${slot}, ${stage}`,
  plot: (slot: number) => `แปลง #${slot}`,
  /** A plot's tap target when its sign shows the project name: "แปลง #4, สวนผักดาดฟ้า". */
  signed: (plot: string, name: string) => `${plot}, ${name}`,
  pictureAlt: "ภาพเกาะ SHIFT ที่มีต้นไม้ของแต่ละโปรเจกต์",
  pictureFailed: "ตอนนี้วาดภาพเกาะไม่ได้ งานของคุณยังอยู่ครบ",
  /** DRAFT */
  tapHint: "เลือกต้นไม้เพื่อดูแปลง",
  unread: (count: number) => `บอทส่งข้อความใหม่ถึงคุณ ${count} ข้อความ เปิดอ่านใน Discord`,
  openDiscord: "เปิด Discord",
  avatar: (name: string) => `รูปของ ${name}`,
};

/**
 * DRAFT: the HUD over the full-screen island (a chip, round buttons, one
 * bottom action and the sheets they open).
 */
/**
 * The admin's own reset, in the menu (admins only; the database checks the
 * role again). For testing: it wipes the admin's own island so onboarding
 * and the quests can be played again from the start. DRAFT copy.
 */
export const ADMIN_RESET = {
  heading: "ทดสอบ (แอดมิน)",
  open: "รีเซ็ตความคืบหน้าของฉัน",
  hint: "สำหรับทดสอบเท่านั้น ลบความคืบหน้าบนเกาะของคุณเอง แล้วเริ่มเล่นใหม่ตั้งแต่ต้น",
  confirmTitle: "จะลบสิ่งเหล่านี้ของคุณ",
  removes: [
    "เควสต์ทั้งหมดของคุณ พร้อมงานที่ส่ง ผลรีวิว และคำอุทธรณ์",
    "บันทึก เช็กอิน รากของต้นไม้ และรอบทำงานของคุณ",
    "คำขอความช่วยเหลือและการแชร์ของคุณ",
    "ถ้าคุณอยู่ในโปรเจกต์คนเดียว: ออกจากโปรเจกต์ ปิดโปรเจกต์ คืนแปลง และล้างเมล็ด ของขวัญ แคนวาสที่ลิงก์ไว้ และเช็กลิสต์ความเป็นเจ้าของ",
  ],
  keeps: "ถ้ามีเพื่อนอยู่ในโปรเจกต์ด้วย โปรเจกต์ ต้นไม้ และเควสต์ที่ผ่านแล้วยังอยู่ เหรียญ ความยินยอม และข้อมูลของคนอื่นไม่ถูกแตะ",
  confirm: "รีเซ็ตเลย",
  pending: "กำลังรีเซ็ต",
  cancel: "ยกเลิก",
  done: "รีเซ็ตแล้ว กำลังโหลดเกาะใหม่",
};

/**
 * DRAFT: the admin overview of the whole island (admins only; Postgres checks
 * the role again): every team's name, members and progress, from the HUD and
 * the ⋯ menu.
 */
export const ADMIN_OVERVIEW = {
  /** The sheet's title and the HUD / menu button that opens it. */
  title: "ภาพรวมเกาะ · Admin",
  intro: "ข้อมูลสำหรับแอดมิน: ชื่อทีม สมาชิก และความคืบหน้าของทุกแปลง",
  summary: (teams: number, waiting: number, help: number) =>
    `${teams} ทีม · ${waiting} งานรอตรวจ · ${help} คำขอความช่วยเหลือ`,
  search: "ค้นหาทีม สมาชิก หรือเลขแปลง",
  plot: (slot: number, name: string) => `แปลง ${slot} · ${name}`,
  members: "สมาชิก:",
  noMembers: "ยังไม่มีสมาชิก",
  milestones: "ผ่านหมุดหมาย",
  milestonesOf: (done: number) => `${done}/7`,
  waitingReview: "รอตรวจงาน",
  openHelp: "รอความช่วยเหลือ",
  checkinsWeek: "เช็กอิน 7 วัน",
  updated: "อัปเดตล่าสุด:",
  noMatch: "ไม่พบทีมที่ค้นหา",
  empty: "ยังไม่มีทีมบนเกาะ",
  failed: "ยังโหลดข้อมูลแอดมินไม่ได้ ลองรีเฟรชหน้าอีกครั้ง",
};

export const HUD = {
  /** The top-left chip's accessible name: the project, its tree, and what the tap opens. */
  chip: (name: string, stage: string) => `${name}, ${stage}, ดูวันนี้ของโปรเจกต์`,
  /** The chip before a plot is claimed. */
  noPlot: "ยังไม่มีที่ดิน",
  meter: (stage: number) => `ต้นไม้ขั้น ${stage} จาก 7`,
  board: PLACES.board,
  menu: "เมนู",
  /** The menu button's name while a consent step waits in the menu. */
  menuConsent: "เมนู, มีขั้นตอนความยินยอมรออยู่",
  inbox: (count: number) => `ข้อความใหม่ ${count} ข้อความ`,
  inboxHeading: "ข้อความใหม่",
  /** The claim button, with pending team invites. */
  invites: (count: number) => `คำชวนเข้าทีม ${count}`,
  myTree: (stage: string) => `ต้นไม้ของคุณตอนนี้เป็น${stage}`,
  viewHeading: "มุมมองเกาะ",
  /** The roving group of plot buttons over the island. */
  plots: "แปลงบนเกาะ",
  /** DRAFT: the ⋯ menu's link to the guide page (/shift/island/guide; the 📖 is drawn beside it, aria-hidden). */
  guide: "คู่มือเกาะ: ต้นไม้ ราก รอบกองไฟ",
  /** DRAFT: the ⋯ menu's link to the suggestions channel on Discord (the 💡 is drawn beside it, aria-hidden). */
  suggest: "เสนอไอเดีย / แจ้งบั๊ก",
  /** DRAFT: a group space, so say who sees the post. */
  suggestHint: "เปิดห้องใน Discord ทีมงานและเพื่อนเห็นทุกโพสต์",
};

export const PLOT = {
  heading: (slot: number) => `แปลง #${slot}`,
  mine: (slot: number) => `แปลงของคุณ #${slot}`,
  stage: (stage: string) => `ตอนนี้เป็น${stage}`,
  sign: (name: string) => `ป้าย: ${name}`,
  noSign: "แปลงนี้ไม่ได้โชว์ชื่อ",
  /** DRAFT */
  toBoard: "ไปที่กระดานเควสต์",
};

export const TODAY = {
  heading: "วันนี้",
  /** DRAFT: above the question, the quest the student is on (KEYNOTE.waiting while it is with a mentor). */
  about: (title: string) => `เควสต์ที่ทำอยู่: ${title}`,
  /** DRAFT: the check-in comes before the work: what the student means to do today (optional, private). */
  ask: "วันนี้จะลงมือทำอะไร",
  askHint: "ไม่บังคับ · เห็นแค่คุณ",
  tapped: "วันนี้เช็กอินแล้ว",
  intended: (text: string) => `เป้าวันนี้: ${text}`,
  /** DRAFT: after the work, one private line filed under the quest; long enough, it counts toward the roots. */
  lineLabel: "ทำแล้วเป็นยังไง ได้เรียนรู้อะไร (ไม่บังคับ)",
  lineHint: `อย่างน้อย ${REFLECTION_MIN_CHARS} ตัวอักษร ช่วยให้รากต้นไม้งอก · เห็นแค่คุณ`,
  lineTooShort: `เขียนอีกนิด อย่างน้อย ${REFLECTION_MIN_CHARS} ตัวอักษร`,
  lineSave: "เก็บไว้",
  lineSaved: "เก็บไว้แล้ว",
  lineAgain: "เขียนเพิ่ม",
  stuck: "ติด",
  rest: "ขอพัก",
  resting: "กำลังพัก ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย",
  wake: "กลับมาแล้ว",
  rested: (paused: number) => `พักแล้ว เควสต์ที่ทำอยู่ ${paused} อย่างพักไว้ให้ก่อน`,
  /** DRAFT: rest with nothing in progress pauses nothing, so the card stays as it is. */
  nothingToPause: "ตอนนี้ยังไม่มีเควสต์ที่กำลังทำ เลยไม่มีอะไรต้องพัก",
  woke: "กลับมาแล้ว เควสต์ที่พักไว้ทำต่อได้เลย",
};

export const KEYNOTE = {
  next: (title: string) => `ทำต่อ: ${title}`,
  /** DRAFT: the only open quest is with a mentor. */
  waiting: (title: string) => `รอพี่เลี้ยงดู: ${title}`,
  /** DRAFT: nothing started yet; the first main quest that is free. */
  start: (title: string) => `เริ่มที่: ${title}`,
};

/**
 * The next-step card, the island's one gold element (NextStepCard).
 * The headline says what to do next; the line under it says why or where the
 * quest stands, and its one button says what the tap does. The day's first
 * tap that leads to work counts as the day's check-in.
 */
export const NEXT_STEP = {
  start: KEYNOTE.start,
  retry: (title: string) => `ลองอีกครั้ง: ${title}`,
  go: KEYNOTE.next,
  answer: (title: string) => `ตอบพี่เลี้ยง: ${title}`,
  /** DRAFT: waiting on a mentor, with a main quest the student can start meanwhile. Its wording waits on the open waiting-state change. */
  meanwhile: (title: string) => `ระหว่างรอ เริ่มที่: ${title}`,
  waiting: KEYNOTE.waiting,
  resting: "กำลังพัก",
  /** The line under the headline. */
  main: (milestone: number) => `เควสต์หลัก ${milestone} จาก 7`,
  side: "เควสต์เสริม",
  proposed: "เควสต์ที่คุณเสนอ",
  said: (text: string) => `พี่เลี้ยงบอกว่า: ${text}`,
  sent: (title: string) => `ส่ง ${title} แล้ว รอพี่เลี้ยงดู`,
  sentOnly: "ส่งแล้ว รอดูผลตรงนี้ได้เลย",
  intended: (text: string) => `เป้าวันนี้: ${text}`,
  restingLine: "ต้นไม้ไม่เหี่ยว ไม่มีอะไรหาย",
  /** A mentor passed the student's work since they last looked. */
  reviewed: (title: string) => `ผ่านแล้ว: ${title}`,
  /** Only a mentor's approval of a main quest grows the tree, one stage. */
  grew: "พี่เลี้ยงให้ผ่านแล้ว ต้นไม้ของทีมโตขึ้นอีก 1 ขั้น",
  passed: "พี่เลี้ยงให้ผ่านแล้ว",
  /** The card's one button, per state. */
  action: {
    start: "เริ่มเลย",
    go: "ทำต่อ",
    answer: "ดูคอมเมนต์พี่เลี้ยง",
    retry: "ลองอีกครั้ง",
    reviewed: "ดูผล",
    wake: "กลับมาทำต่อ",
  },
};

/**
 * ผลจากพี่เลี้ยง (ResultsList, in the chip's sheet): what mentors said about the student's
 * own work, read from the board, newest first. Never a teammate's feedback.
 */
export const RESULTS = {
  title: "ผลตรวจจากพี่เลี้ยง",
  hud: (fresh: number) => (fresh > 0 ? `ผลตรวจจากพี่เลี้ยง (ใหม่ ${fresh} รายการ)` : "ผลตรวจจากพี่เลี้ยง"),
  approved: "ผ่านแล้ว",
  clarification: "พี่เลี้ยงขอข้อมูลเพิ่ม",
  declined: "ยังไม่ผ่าน ลองใหม่ได้",
  fresh: "ใหม่",
  /** The bot's own inbox (invites, coins, help replies) still lives in Discord. */
  discord: (count: number) => `ข้อความอื่นจากบอทอีก ${count} รายการ อ่านต่อใน Discord`,
};

/** The menu's short list (MenuFoot, at the foot of the chip's sheet): only what has no place on the island itself. */
export const MENU = {
  /**
   * The whole quest board, first in the chip sheet's short list: the place's
   * one name, as in the notice board's button, the sheet it opens and the bot.
   */
  board: PLACES.board,
  story: "เรื่องเล่า",
  guide: "คู่มือ",
  /** The sound switch's line, and its state at the end of the line. */
  sound: "เสียงกองไฟ",
  on: "เปิดอยู่",
  off: "ปิดอยู่",
  rest: "ขอพัก",
  /** Before a plot is claimed only; with a plot, coins live in the team sheet. */
  coins: "เหรียญ",
  consent: "ความยินยอม",
  admin: "ภาพรวม (แอดมิน)",
  /** The admin's reset, folded under this line. */
  adminTools: "เครื่องมือแอดมิน",
  /** The sound, the island view, suggestions and the account, folded under this line at the foot of the chip's sheet. */
  settings: "ตั้งค่า",
};

export const BOARD = {
  mainHeading: "เควสต์หลัก",
  mainSub: "7 ขั้นของต้นไม้ ทำขั้นไหนก่อนก็ได้",
  sideHeading: "เควสต์เสริม",
  sideSub: "แตกกิ่งจากเควสต์หลัก",
  /** DRAFT: the board's lane buttons (a group of toggles, not tabs) and their short labels. */
  lanes: "หมวดบนกระดานเควสต์",
  laneMine: "ของฉัน",
  /** DRAFT: under เควสต์หลัก in the lane buttons: main quests the team has passed. */
  passed: (done: number) => `ผ่าน ${done}/7`,
  /** DRAFT: the tree cell after the seven main quest cards. */
  tree: (stage: number) => `ต้นไม้ขั้น ${stage} จาก 7`,
  /** DRAFT: read as the description of main quests 6 and 7 (a small heart on the card). */
  community: "เควสต์ชุมชน: ช่วยเพื่อน หรือพัฒนาชุมชน",
  /** DRAFT: from the empty side lane back to the main quests. */
  toMain: "ไปที่เควสต์หลัก",
  branchOf: (title: string) => `ต่อจาก ${title}`,
  branchFree: "เควสต์เสริมอื่นๆ",
  routeFilter: "เลือกเส้นทางของเควสต์เสริม",
  sideEmpty: "ยังไม่มีเควสต์เสริมในเส้นทางนี้ ลองดูทุกเส้นทาง",
  /** DRAFT: side quests may not be published yet. */
  sideNone: "เควสต์เสริมยังไม่เปิด ระหว่างนี้ทำเควสต์หลักต่อได้เลย",
  unlockWhen: (titles: string[]) => `ปลดล็อกเมื่อผ่าน ${titles.join(", ")}`,
  proposedHeading: "เควสต์ที่คุณเสนอ",
  proposedEmpty: "มีเรื่องที่อยากทำเองไหม เสนอเป็นเควสต์ของคุณได้",
  propose: "เสนอเควสต์ของฉัน",
  islandHeading: "ทั้งเกาะ",
  goal: (title: string, count: number, target: number, deadline: string) =>
    `ทั้งเกาะช่วยกัน: ${title} ${count}/${target} ภายใน ${deadline}`,
  goalReached: (title: string, count: number, target: number) =>
    `ทั้งเกาะช่วยกัน: ${title} ${count}/${target} ถึงเป้าแล้ว`,
  goalUnlock: (unlock: string) => `ถึงเป้าแล้วได้: ${unlock}`,
  goalUnlocked: (unlock: string) => `ปลดล็อกแล้ว: ${unlock}`,
  islandEmpty: "ตอนนี้ยังไม่มีเป้าหมายร่วมของทั้งเกาะ",
  help: "ขอความช่วยเหลือแล้ว",
  tileLabel: (title: string, chip: string) => `${title}, ${chip}`,
  mainFallback: (milestone: number) => `เควสต์หลักขั้นที่ ${milestone}`,
};

export const DETAIL = {
  kind: { main: "เควสต์หลัก", side: "เควสต์เสริม", proposed: "เควสต์ที่คุณเสนอ" },
  evidence: "ส่งอะไร",
  reflection: "คำถามหนึ่งข้อ",
  /** The reflection label for a quest with no prompt of its own (a proposed quest). */
  reflectionFallback: "เควสต์นี้สอนอะไรคุณบ้าง",
  examples: "ตัวอย่าง",
  goal: "อยากให้เกิดอะไร",
  feedback: (text: string) => `พี่เลี้ยงบอกว่า: ${text}`,
  locked: (titles: string[]) => `ปลดล็อกเมื่อผ่าน ${titles.join(", ")}`,
  held: (owner: string | null) => `${owner && owner.trim() ? owner.trim() : "เพื่อนร่วมทีม"} ถืองานขั้นนี้อยู่ ช่วยกันในงานนั้นได้`,
  appealed: "งานนี้อยู่ระหว่างอุทธรณ์ รอทีมงานตัดสินก่อน",
  done: "ผ่านแล้ว",
  doneRepeat: "ผ่านแล้ว ส่งซ้ำเพื่อเรียนรู้ต่อได้",
  declinedProposed: "เควสต์นี้ปิดไปแล้ว เสนอเควสต์ใหม่ได้เสมอ",
  /** DRAFT: the link has its own field now, so the label is just the noun; the placeholder still says a link works here too. */
  proofLabel: "หลักฐาน",
  proofHint: "ไม่ต้องใส่ชื่อจริง เบอร์โทร หรือข้อมูลส่วนตัวของใคร",
  /** Thai reviewed (Cursor, Codex), 2026-11-14. */
  proofPlaceholder: "วางลิงก์ หรือเล่าสั้นๆ ว่าทำอะไรไป แล้วเจออะไร",
  /** DRAFT: the send form's optional group (link and photos), under the two required answers. */
  optional: "แนบเพิ่ม (ไม่บังคับ)",
  /** DRAFT: the link's label once opened; "ไม่บังคับ" lives in the group heading, the https rule stays in the label. */
  urlShort: "ลิงก์งาน (ขึ้นต้นด้วย https://)",
  /** DRAFT: the text button that opens the link field. */
  addLink: "เพิ่มลิงก์",
  /** The bot's reviewed portfolio hint (bot/src/quests/island/copy.ts portfolioHint), word for word. */
  reflectionPlaceholder: "ตอบสั้นๆ ข้อเดียว เก็บไว้ใช้ในพอร์ตได้",
  submit: "ส่งให้พี่เลี้ยงดู",
  resubmit: "ส่งฉบับใหม่",
  start: "เริ่มเควสต์นี้",
  /** Under an untouched quest, for work already done before starting it here. */
  sendDone: "ทำเสร็จแล้ว? ส่งงานได้เลย",
  /** Where the quest stands, as five dots under its title. */
  stepper: ["เริ่ม", "ทำ", "ส่ง", "พี่เลี้ยงดู", "ผ่าน"] as const,
  stepperLabel: (step: string) => `สถานะเควสต์นี้: ${step}`,
  /** The one fold for everything that helps but is not the task (steps, examples, words, lore). */
  helpers: "รายละเอียดและตัวช่วย",
  /** The bar's one button once this quest needs nothing more from the student. */
  next: "ไปเควสต์ถัดไป",
  toOpen: "ไปเควสต์ที่ทำได้ตอนนี้",
  home: "กลับไปที่เกาะ",
  /** The bar while the work is with a mentor: words, no button. */
  waiting: "ส่งแล้ว รอพี่เลี้ยงดู",
  /** A quiet line under the checklist, opens the stuck sheet (friends or mentors, in group spaces). */
  stuckLine: "ติดตรงไหน? ขอความช่วยเหลือ",
  /** The day's intention, optional, inside the quest (the card's tap is the check-in). */
  intention: "วันนี้จะลงมือทำอะไร (ไม่บังคับ)",
  intentionSave: "จดไว้",
  intentionSaved: "จดไว้แล้ว เห็นแค่คุณ",
  /** DRAFT */
  paused: "เควสต์นี้พักไว้อยู่ ทำต่อเมื่อพร้อม",
  resume: "ทำต่อเควสต์นี้",
  resumed: "กลับมาทำต่อแล้ว",
  errors: {
    proofRequired: "เล่าหลักฐานสั้นๆ ก่อนส่ง",
    reflectionRequired: "ตอบคำถามหนึ่งข้อก่อนส่ง",
    tooLong: (max: number) => `ยาวเกิน ${max} ตัวอักษร`,
    url: "ลิงก์ต้องขึ้นต้นด้วย https://",
  },
};

/**
 * DRAFT: the quest sheet without a wall of text (plan: "Quest page (sheet)").
 * Zone emoji never live here: they come from SHIFT_CARDS, so they match the
 * whiteboard. Buttons use pixel icons.
 */
export const QUEST = {
  badge: {
    main: (n: number, total: number) => `เควสต์หลัก ${n}/${total}`,
    side: "เควสต์เสริม",
    proposed: "เควสต์ที่คุณเสนอ",
  },
  context: {
    heading: "สำหรับโปรเจกต์คุณ",
    from: (title: string) => `จากแคนวาส ${title}`,
    change: "เปลี่ยน",
    loading: "กำลังดึงโน้ตจากแคนวาส",
    empty: "ยังไม่มีโน้ต",
    count: (count: number) => `${count} ใบ`,
    version: (version: number) => `v${version}`,
    unlinked: {
      // The canvas is a reference, never a gate: one quiet row under the quest.
      heading: "แคนวาสของทีม",
      body: "ไม่บังคับ เชื่อมไว้แล้วโน้ตของทีมจะขึ้นตรงนี้ให้ดูประกอบ",
      action: "เชื่อมแคนวาส",
    },
    notYours: "คุณยังไม่ได้อยู่ในทีมของแคนวาสนี้ ขอให้เจ้าของแคนวาสเพิ่มคุณในทีมก่อน",
    gone: "หาแคนวาสที่เชื่อมไว้ไม่เจอ อาจถูกลบหรือย้ายไปแล้ว",
    pickAgain: "เลือกใหม่",
    error: "โหลดโน้ตจากแคนวาสไม่ได้ตอนนี้ ส่งแบบเขียนเองได้เลย",
  },
  doneWhen: {
    heading: "เสร็จเมื่อ",
    /** Ticks are hints from the canvas; a mentor still decides. */
    hint: "ติ๊กให้จากโน้ตในแคนวาส พี่เลี้ยงเป็นคนดูและตัดสิน",
    /** Screen readers: the item already has a matching note. */
    hinted: "มีโน้ตในแคนวาสแล้ว",
  },
  /** Quest 5: the ownership checklist from Discord, read-only (DRAFT copy). */
  ownership: {
    loading: "กำลังดึงเช็กลิสต์",
    where: "อัปเดตใน Discord: พิมพ์ /project ownership",
    fallback: "เช็กลิสต์อยู่ใน Discord: พิมพ์ /project ownership แล้วเช็กทีละข้อ",
    mentorHeld: "บัญชีพี่เลี้ยง",
    attached: "ตอนกดส่ง เช็กลิสต์ /project ownership จะแนบไปกับงานนี้ให้เอง",
  },
  examples: "ตัวอย่างที่ผ่าน",
  /** A long purpose in full, under the details. */
  why: "ทำไมเควสต์นี้",
  /** The main action on every quest: write or show the work right here (the canvas card is optional). */
  send: "เขียนหรือแนบงาน",
  resend: "ส่งฉบับใหม่",
  writeInstead: "เขียนเองแทน",
  useCanvas: "ใช้โน้ตจากแคนวาส",
  back: "กลับ",
};

export const STUCK = {
  heading: "ติดตรงไหน",
  label: "เล่าสั้นๆ ว่าติดอะไร และลองอะไรไปแล้ว",
  about: (title: string) => `เรื่อง: ${title}`,
  choice: "อยากให้ใครช่วย",
  community: "ถามเพื่อนในห้องช่วยเหลือ",
  mentors: "ถามทีมพี่เลี้ยง",
  /** DRAFT: who reads the request, before it is sent. Group spaces only. */
  fine: {
    community: "เพื่อนทุกคนในห้องช่วยเหลือจะเห็นข้อความนี้ ไม่มีแชตส่วนตัว",
    mentors: "ทีมพี่เลี้ยงจะเห็นในห้องของทีมงาน ไม่มีแชตส่วนตัว",
  },
  send: "ส่งคำขอ",
  /** DRAFT: mentor replies arrive as a bot inbox message (help_resolve). */
  sent: {
    community: "ส่งแล้ว เพื่อนๆ จะตอบในห้องช่วยเหลือ",
    mentors: "ส่งแล้ว ทีมพี่เลี้ยงจะตอบกลับในกล่องข้อความของบอท",
  },
  required: "เล่าสั้นๆ ก่อนส่ง",
};

export const PROPOSE = {
  heading: "เสนอเควสต์ของฉัน",
  title: "ชื่อเควสต์",
  goal: "อยากให้เกิดอะไร",
  criteria: "ทำเสร็จแล้วดูจากอะไร",
  nextStep: "ก้าวแรก",
  why: "ทำไมสำคัญ (ไม่บังคับ)",
  send: "บันทึกเควสต์",
  sent: "บันทึกเควสต์แล้ว เริ่มทำได้เลย",
  required: "กรอกช่องนี้ก่อน",
};

export const FOOTER = {
  showName: "โชว์ชื่อโปรเจกต์บนเกาะ",
  showNameFine: "ชื่อขึ้นบนเกาะเมื่อทุกคนในทีมยินยอมครบและไม่มีใครซ่อน ปิดสวิตช์เมื่อไหร่ก็ได้",
  showNameWaiting: "เปิดแล้ว ชื่อจะขึ้นเมื่อไม่มีใครในทีมซ่อน และทุกคนยินยอมครบ",
  growth: "ต้นไม้โตเมื่อพี่เลี้ยงยืนยันงาน ไม่ได้โตจากจำนวนครั้งที่กดหรือเวลาออนไลน์",
  signedInAs: (name: string) => `เข้าสู่ระบบเป็น ${name}`,
  switchAccount: "สลับบัญชี",
};

export const SEASON = {
  demoDay: (date: string) => `Demo Day ${date}`,
  daysLeft: (days: number) => (days > 0 ? `อีก ${days} วัน` : days === 0 ? "วันนี้" : "ผ่านไปแล้ว"),
  meter: (count: number) => `นับได้ ${count} จาก 7 ขั้น`,
  table: (bar: number) => `โต๊ะโชว์งานเมื่อนับได้ ${bar} ขั้น`,
  stage: (bar: number) => `ขึ้นเวทีเมื่อนับได้ ${bar} ขั้น`,
  qualifies: { stage: "ได้ขึ้นเวทีใน Demo Day แล้ว", table: "ได้โต๊ะโชว์งานใน Demo Day แล้ว" },
  wip: "Demo Day มีมุมงานที่ยังทำอยู่ เปิดให้ทุกคน ไม่ต้องรอถึงเกณฑ์",
  goal: (count: number, target: number) => `เป้าหมายของทั้งเกาะ ${count}/${target}`,
  unlocksHeading: "ของปลดล็อก",
  unlockEarned: (label: string) => `${label}: ได้แล้ว`,
  unlockNext: (label: string, count: number, date: string) => `${label}: ครบ ${count} ขั้นก่อน ${date}`,
  unlockMissed: (label: string) => `${label}: หมดเวลาแล้ว`,
  noUnlocks: "ซีซันนี้ยังไม่มีของปลดล็อก",
};

/** One unlock line: earned, still open, or missed. */
export function unlockLine(unlock: SeasonUnlock): string {
  if (unlock.earned) return SEASON.unlockEarned(unlock.label);
  if (unlock.expired) return SEASON.unlockMissed(unlock.label);
  return SEASON.unlockNext(unlock.label, unlock.milestone_count, thaiShortDate(unlock.deadline));
}

/**
 * DRAFT: the student's linked SHIFT canvas on the whiteboard, from the HUD
 * (the note button), a quest page, or one note on it.
 */
export const CANVAS = {
  open: "เปิดแคนวาส",
  link: "เชื่อมแคนวาส",
  note: "ดูบนแคนวาส",
};

/** DRAFT: the notice board in the plaza, with the student's next quests pinned on it. */
export const NOTICE = {
  board: HUD.board,
  pinned: (titles: string[]) => `${HUD.board}: ${titles.join(" · ")}`,
};

/**
 * DRAFT: Demo Day in the plaza: the countdown board, the stage that builds up, the
 * lanterns for the island goal, and the flags by the trees. No names, no
 * ranking; other teams' flags are read from the tree they already show.
 */
export const FESTIVAL = {
  /**
   * The date and the days, two lines: "Demo Day 28 พ.ย." and "อีก 17 วัน". The festival sheet's header
   * (on one line); over the stage the pixel countdown board reads D-17 instead, with no words.
   */
  sign: (date: string, days: number, separator = "\n") => `${SEASON.demoDay(date)}${separator}${SEASON.daysLeft(days)}`,
  /** The stage's accessible name, with the sign on one line. */
  stage: (sign: string) => `${PLACES.stage}: ${sign}`,
  title: PLACES.stage,
  legendHeading: `ที่${PLACES.plaza}`,
  table: (bar: number) => `โต๊ะโชว์งาน: นับได้ ${bar} ขั้น และผ่านเควสต์ 2`,
  stageRule: (bar: number) => `ขึ้นเวที: นับได้ ${bar} ขั้น และผ่านเควสต์ 3`,
  /** DRAFT (lore: the lantern string lights for everyone together). */
  lanterns: (count: number, target: number) => `โคมที่ลานสว่างขึ้นทีละดวง ตามเป้าหมายของทั้งเกาะ ${count}/${target}`,
  /** Appended to the table and stage legend lines: other teams' flags show only when they show their name. */
  shownOnly: "เห็นเฉพาะทีมที่โชว์ชื่อบนเกาะ",
};

/**
 * DRAFT: the campfire, one figure per person in the SHIFT coworking voice
 * channel right now. Names only in the sheet, never on the island.
 */
export const CAMPFIRE = {
  /** The campfire's accessible name on the island. */
  spot: (count: number) =>
    count > 0 ? `${PLACES.campfire}: ห้อง coworking มี ${count} คน` : `${PLACES.campfire}: ห้อง coworking`,
  /** The sheet's count line: the island prints no count over the fire. */
  count: (count: number) => `${count} คนกำลังทำงานอยู่`,
  /** DRAFT (lore: the campfire is where builders keep each other company). */
  title: PLACES.campfire,
  /** DRAFT */
  body: "ห้องเสียง coworking ของ SHIFT มานั่งทำงานเป็นเพื่อนกันได้",
  soundOn: "เปิดเสียงกองไฟ",
  soundOff: "ปิดเสียงกองไฟ",
  soundError: "เปิดเสียงไม่ได้ ลองอีกครั้ง",
  listLabel: "คนที่อยู่ในห้องตอนนี้",
  loading: "กำลังโหลดรายชื่อ",
  empty: "ตอนนี้ยังไม่มีใครในห้อง เข้าไปเริ่มก่อนได้",
  error: "ตอนนี้โหลดรายชื่อไม่ได้",
  join: "เข้าห้อง",
  /**
   * What the campfire keeps (20261118150000): the evening guest keeps
   * which teams had someone at the fire during its rest and each team's roll
   * (no member, no time, deleted the next day), which for a team of one is
   * that student's; a won look is the team's gift, kept with its date. "ใคร
   * ในทีม": on a night the founder or a mentor is the guest, their display
   * name is kept until the next day (staff, never a team member). Thai
   * reviewed (Gemini, Codex, Claude), 2026-11-18.
   */
  fine: "กองไฟบนเกาะเก็บแค่ว่าใครอยู่ในห้องตอนนี้ และลบทันทีเมื่อออก ส่วนตอนแขกแวะมาที่กองไฟ ระบบจะเก็บว่าทีมไหนมีคนนั่งช่วงพักนั้นและผลลุ้นของทีม แล้วลบในวันถัดไป ไม่เก็บว่าใครในทีมนั่งหรือนั่งตอนไหน (ถ้าทีมมีคุณคนเดียว ข้อมูลของทีมก็คือของคุณ) ลุคที่ทีมได้จะเป็นของขวัญของทีม เก็บไว้พร้อมวันที่ได้",
};

/**
 * DRAFT (2026-11-20, needs the three-model Thai review): the deep fire, a
 * small one-person fire on the plaza (docs/designs/shift-island-deep-fire.md).
 * Its button opens the Discord lobby; joining it builds a voice room for that
 * person alone, locked, visible to everyone who can see the lobby, deleted
 * when they leave. No count and no names anywhere. Never "nobody counts your
 * time": in a SHIFT cohort week shift-voice records voice time in every
 * voice channel, so the sheet says so then (cohortWeek).
 */
export const DEEPFIRE = {
  /** DRAFT: the fire's accessible name on the island while its keeper (the bot) is there. */
  spot: `${PLACES.deepfire}: ห้องเงียบของคุณคนเดียว`,
  /** DRAFT: the same while the bot is away (the fire drawn cold). */
  spotAsleep: `${PLACES.deepfire}: ตอนนี้ไฟยังไม่ติด`,
  title: PLACES.deepfire,
  /** DRAFT: what happens, in one line. */
  body: "กดจุดไฟ แล้วเข้าห้องเสียงใน Discord บอทจะสร้างห้องให้คุณคนเดียว ล็อกไว้ ไม่มีใครเข้ามาได้",
  /** DRAFT: the one button. */
  join: "จุดไฟ",
  /** DRAFT: the bot is not beating ready; the button is greyed. Never a promise of when. */
  asleep: "ตอนนี้คนดูแลไฟไม่อยู่ ลองใหม่อีกสักพัก",
  /** DRAFT: who sees what, and what is kept (nothing). */
  fine: "คนอื่นในเซิร์ฟเวอร์เห็นห้องนี้และเห็นว่าใครอยู่ข้างใน แต่ไม่มีใครเข้ามาได้ ห้องหายไปเมื่อคุณออก และเกาะไม่เก็บอะไรเกี่ยวกับห้องนี้เลย",
  /** DRAFT: only in a SHIFT cohort week (lib/shift/voiceWindow.ts roundsInSession). */
  cohort: "สัปดาห์นี้มีรอบ SHIFT ระบบของ SHIFT บันทึกเวลาในห้องเสียงทุกห้องของผู้เรียนรอบนี้ ห้องนี้ด้วย",
};

/**
 * Today's visitors in the plaza (docs/designs/shift-island-plaza-visitors.md).
 * The figures carry no names; the team line goes only to the viewer's own
 * team, and the tag only over the viewer's own figure, on their own screen.
 * No count is printed on the island: a tap on a person says it (FIGURES),
 * and the people button carries it in its name.
 */
export const VISITORS = {
  /** How many checked in on the Bangkok day (the viewer included): what the viewer and everyone else say after their line. */
  count: (count: number) => `วันนี้มีคนเช็กอินบนเกาะแล้ว ${count} คน`,
  /** The same for the viewer's own team only: what a teammate says after their line. */
  team: (count: number) => `วันนี้เพื่อนร่วมทีมเช็กอินแล้ว ${count} คน`,
  /** The small tag over the viewer's own figure: the only word over a person that stays. */
  me: "คุณ",
};

/**
 * What a person on the island says when tapped, in a small bubble over
 * them (live/FigureBubble.tsx). One short, true line each: never a name, and
 * nothing that points to a student. A figure is only a kind and a number
 * (lib/shift-island/live/figures.ts) and its line is picked from those, so
 * the same figure always says the same thing. Today's visitors add the day's
 * count under their line (VISITORS.count, a teammate VISITORS.team): the
 * island prints no count of its own. That count line owns "วันนี้" and
 * "เช็กอิน", so the lines of the viewer, a teammate and anyone else say
 * neither (read together, they would say it twice). A new kind (the
 * campfire's evening guest) adds its lines here. Thai reviewed (Gemini,
 * Codex, Claude), 2026-11-19.
 */
export const FIGURES = {
  /** The viewer's own figure, drawn only once they checked in today. */
  me: ["นี่คุณเอง มาถึงเกาะแล้ว"],
  /** A teammate who checked in today (the viewer's own team only, in the team's colour). */
  team: [
    "สวัสดี เพื่อนร่วมทีมของคุณเอง",
    "อยู่ทีมเดียวกับคุณ แวะมาที่เกาะแล้ว",
    "เพื่อนร่วมทีมของคุณ มาที่เกาะแล้วนะ",
  ],
  /** Anyone else who checked in today: all the page knows is that they came. */
  crowd: [
    "สวัสดี แวะมาที่เกาะแล้ว",
    "มาถึงแล้ว ขอให้เป็นวันที่ดีนะ",
    "อีกหนึ่งคนที่มาถึงเกาะแล้ว",
    "ทักทายกันหน่อยนะ",
    "ดีใจที่ได้เจอกันบนเกาะนะ",
  ],
  /** Beside another team's tree: the team passed main quest 3, its first partner (ได้พันธมิตรคนแรก). */
  partner: [
    "ตัวแทนพันธมิตรคนแรก ที่ร่วมมือกับทีมนี้",
    "ทีมนี้ได้พันธมิตรคนแรกแล้ว",
  ],
  /** The same, beside the viewer's own team's tree. */
  partnerMine: [
    "ตัวแทนพันธมิตรคนแรก ที่ร่วมมือกับทีมคุณ",
    "ยินดีด้วย ทีมคุณได้พันธมิตรคนแรกแล้ว",
  ],
  /** The story's builder, hammer in hand beside the young tree. */
  builder: ["คนที่ลงมือสร้างงานจริง ทีละชิ้น"],
  /** The story's tester, phone in hand beside the grown tree. */
  tester: ["คนนอกทีม มาลองใช้ของที่ทีมทำจริง"],
  /** The plaza's people button (out of sight until a keyboard focuses it): each press greets the next of today's visitors. */
  turn: "ทักทายทีละคน",
  /** Its name without a day's count. */
  people: "คนบนเกาะ",
  /**
   * Read before a line reached by that button. No total: some of the day's
   * count sit at the campfire or are not drawn at all, so a total would never
   * match the count the button names. Back at 1 means round again.
   */
  nth: (n: number) => `คนที่ ${n}`,
  /** After a plot's name where its team's first partner stands by the tree: the keyboard's way to what a tap on that figure says. */
  plotPartner: "มีพันธมิตรคนแรกแล้ว",
};

/**
 * DRAFT: one quiet line per quest above its purpose on the quest page, by
 * template slug (lore bible, "หนึ่งบรรทัดต่อเควสต์"). Why the quest matters on
 * the island, never how to do it. A proposed quest has none: its goal is the
 * student's own words. Unknown slugs show nothing.
 */
export const QUEST_FLAVOR: Readonly<Record<string, string>> = {
  // Main quests 1 to 7: the pitfall quest map (supabase/migrations/20261115090000_shift_quests_pitfall_map.sql).
  "meet-one-real-person": "ทุกต้นเริ่มจากคนหนึ่งคนที่เจอปัญหาจริง",
  "real-stories-not-compliments": "คำชมฟังแล้วชื่นใจ แต่เรื่องจริงพาไปถูกทาง",
  "first-partner": "มีพันธมิตรหนึ่งคน งานของคุณก็มีที่ยืนในโลกจริง",
  "in-their-hands": "จากเรื่องที่เขาเล่า เป็นของที่เขาจับได้",
  "run-the-loop": "แก้ทีละอย่าง แล้วให้ความจริงตัดสินอีกรอบ",
  "what-we-learned": "รากที่ลึก มาจากการหยุดคิดว่าได้เรียนรู้อะไร",
  "beyond-the-first": "ต้นไม้ที่โตแล้ว ให้ร่มกับคนที่ไม่เคยรู้จักคุณ",
  // Side quests (20261111090900, and 20261115090000 for the first-conversation and old main ones).
  "side-stakeholder-map": "รู้ว่าใครอยู่รอบปัญหา ก็รู้ว่าควรเริ่มคุยกับใคร",
  "side-practice-talk": "ซ้อมกับเพื่อนก่อน ครั้งจริงจะไม่น่ากลัวเท่าที่คิด",
  "side-question-check": "คำถามที่ดี พาไปถึงเรื่องจริง",
  "side-warm-intro": "คนแรกที่คุยด้วย ไม่ต้องหาเองคนเดียว",
  "side-take-the-keys": "กุญแจอยู่ในมือคุณ งานจึงเดินต่อได้หลัง SHIFT จบ",
  "side-help-a-builder": "บนเกาะนี้ ไม่มีใครต้องติดอยู่คนเดียว",
  "side-improve-community": "ทิ้งของดีๆ ไว้ให้คนที่มาทีหลัง",
  "side-five-voices": "ห้าเสียงจริง ชัดกว่าการเดาคนเดียว",
  "side-open-on-phone": "งานที่เปิดได้จากลิงก์เดียว ไปถึงคนได้ไกลกว่า",
  "side-readme": "คู่มือที่ดี ทำให้งานเดินต่อได้แม้คุณไม่อยู่",
  "side-thirty-second-cut": "ถ้าคนเข้าใจใน 30 วินาที เขาจะอยากดูต่อ",
  "side-clear-offer": "คนจะเริ่มใช้ เมื่อเข้าใจว่าคุณช่วยอะไรเขา",
  "side-outside-circle": "คนนอกวงจะบอกสิ่งที่เพื่อนเกรงใจไม่พูด",
  "side-demo-three-minutes": "คืนเทศกาล มีคนอยากฟังเรื่องงานของคุณ",
  "side-handoff-page": "งานที่ส่งต่อได้ คืองานที่อยู่ได้นาน",
  "side-review-a-friend": "คำติชมที่ดี ช่วยให้ต้นของเพื่อนโตต่อได้",
  "side-share-a-lesson": "สิ่งที่คุณเพิ่งเรียนรู้ อาจเป็นทางลัดของคนถัดไป",
};

/** The quest's flavor line, or null for a proposed quest or a slug without one. */
export function questFlavor(kind: "main" | "side" | "proposed", slug: string | null | undefined): string | null {
  if (kind === "proposed" || !slug) return null;
  return Object.hasOwn(QUEST_FLAVOR, slug) ? QUEST_FLAVOR[slug] : null;
}

/** One pitfall on a quest page: its name, the warning sign a student can check alone, and how to avoid it. */
export interface QuestPitfall {
  /** The pixel picture of the pitfall itself (sprites.ts), so the copy and its art stay together. */
  icon: IconKey;
  name: string;
  sign: string;
  avoid: string;
}

/**
 * DRAFT: the pitfall each main quest is built around, by template slug
 * (docs/designs/shift-high-quest-pitfalls.md), and the ones the first act's
 * ตัวช่วย side quests guard against. Shown on the quest page as หลุมพราง;
 * unknown slugs show nothing.
 */
export const QUEST_PITFALLS: Readonly<Record<string, readonly QuestPitfall[]>> = {
  "meet-one-real-person": [
    {
      icon: "fog",
      name: "เป้าหมายคือทุกคน",
      sign: "คุณเรียกผู้ใช้ว่า \"นักเรียน\" หรือ \"คนทั่วไป\" และบอกไม่ได้ว่าจะเจอเขาที่ไหนในสัปดาห์นี้",
      avoid: "บอกให้ได้ว่าเขาเป็นใคร อยู่ที่ไหน เจอได้เมื่อไหร่ เช่น \"แม่ค้าข้าวมันไก่หน้าโรงเรียนที่ขายถึงสองทุ่ม\"",
    },
    {
      icon: "lockdoor",
      name: "กลัวเจอคนจริง",
      sign: "ส่งแบบฟอร์มไปแล้วแต่ยังไม่ได้คุยกับใคร หรือคิดว่า \"ทำเสร็จก่อนค่อยไปให้ดู\"",
      avoid: "เริ่มจากคนที่อยู่ห่างคุณแค่ก้าวเดียว เช่น ครู ร้านของญาติ รุ่นพี่ ชวนเพื่อนไปด้วย เตรียม 3 คำถาม แล้วคุยแค่ 10 นาที",
    },
  ],
  "real-stories-not-compliments": [
    {
      icon: "praise",
      name: "กับดักคำชม",
      sign: "ได้ยินแค่ \"ดีนะ\" \"น่าสนใจ\" \"ใช้แน่นอน\" คุณพูดมากกว่าเขา หรือยังไม่มีใครเล่าว่าครั้งล่าสุดที่เจอปัญหานี้เกิดอะไรขึ้น",
      avoid: "ถามถึงครั้งล่าสุดที่มันเกิดขึ้นจริง เขาทำยังไง เสียอะไรไปบ้าง เก็บไอเดียของคุณไว้เล่าตอนท้าย",
    },
  ],
  "first-partner": [
    {
      icon: "nodate",
      name: "เยสแบบสุภาพ",
      sign: "เขาบอกว่า \"ดีนะ ส่งมาดูได้\" แต่ไม่มีวันนัดถัดไป หรือคุณยังไม่ได้ทักเขาอีกเลยหลังคุยครั้งแรก",
      avoid: "ขอสิ่งเล็กแต่ชัด เช่น นัดลองชิ้นแรกสัปดาห์หน้า ขอดูข้อมูลหรือตัวอย่างจริง ขอให้แนะนำคนอีก 2 คน หรือขอลองในร้าน ชมรม หรือห้องเรียนของเขา แล้วทักกลับภายใน 2 วัน",
    },
  ],
  "in-their-hands": [
    {
      icon: "cave",
      name: "สร้างในถ้ำ",
      sign: "ผ่านไปเกิน 7 วันแล้วยังไม่มีใครได้ลอง หรือรายการฟีเจอร์ยาวขึ้นเรื่อยๆ ทั้งที่ยังไม่มีใครขอ",
      avoid: "ตัดให้เหลือเรื่องเดียวที่เขาเล่า ให้เขาลองเองต่อหน้าคุณ แล้วดูโดยไม่ช่วยอธิบาย",
    },
  ],
  "run-the-loop": [
    {
      icon: "shield",
      name: "ปกป้องงาน หรือแก้ทุกอย่าง",
      sign: "คุณเถียงกับคำติ หรืองานรอบใหม่เปลี่ยนไปสิบอย่าง แต่ไม่มีข้อไหนที่เขาเจอจริง",
      avoid: "แก้ทีละเรื่อง เริ่มจากเรื่องที่เห็นซ้ำที่สุด แล้วดูก่อนกับหลัง ผลที่ไม่ดีขึ้นก็นับ",
    },
  ],
  "what-we-learned": [
    {
      icon: "loop",
      name: "ทำไปเรื่อยๆ โดยไม่หยุดคิด",
      sign: "ตอบไม่ได้ว่าสัปดาห์นี้รู้อะไรเพิ่ม หรือแผนยังเหมือนวันแรกทุกอย่าง",
      avoid: "หยุด 20 นาที เขียน 3 บรรทัด: เคยเชื่อ เจอจริง จะทำต่อ แล้วเล่าให้คนหนึ่งคนฟัง",
    },
  ],
  "beyond-the-first": [
    {
      icon: "anchor",
      name: "ใช้ได้แค่ตอนคุณอยู่",
      sign: "ทุกคนที่ใช้รู้จักคุณ หรือต้องให้คุณอธิบายก่อนทุกครั้ง",
      avoid: "ส่งลิงก์หรือของให้คนกลุ่มใหม่ที่ไม่เคยคุยกับคุณ แล้วดูว่าเขาเริ่มเองได้ไหม และมีใครกลับมาเองไหม",
    },
  ],
  // The first act's ตัวช่วย side quests (20261115090000).
  "side-stakeholder-map": [
    {
      icon: "peers",
      name: "มีแต่คนใช้",
      sign: "แผนที่มีแค่คนที่ใช้ ไม่มีใครจ่าย ใครตัดสินใจ หรือใครอาจขวาง",
      avoid: "ถามต่อว่า ถ้าเขาอยากใช้ ใครต้องอนุญาต ใครต้องจ่าย และใครจะเดือดร้อนถ้ามีของนี้",
    },
    {
      icon: "mail",
      name: "วาดเสร็จแต่ไม่ได้คุย",
      sign: "แผนที่สวยแล้ว แต่ยังไม่ได้ทักคนที่วงไว้เลย",
      avoid: "ทักคนที่วงไว้ภายในวันนี้ ถ้ายังไม่รู้จักใครแบบนั้น ใช้เควสต์ ขอให้พี่ช่วยแนะนำ",
    },
  ],
  "side-practice-talk": [
    {
      icon: "heart",
      name: "ซ้อมแล้วชมกัน",
      sign: "เพื่อนตอบว่า \"ดีนะ\" \"ใช้แน่นอน\" ทุกข้อ เพราะเกรงใจ",
      avoid: "ให้เพื่อนเล่นเป็นคนที่ไม่ค่อยว่าง และตอบแค่เรื่องที่เคยเกิดขึ้นจริง ห้ามชม",
    },
  ],
  "side-question-check": [
    {
      icon: "moon",
      name: "ถามถึงอนาคต",
      sign: "คำถามขึ้นต้นด้วย \"ถ้ามี...จะใช้ไหม\" หรือ \"คิดว่า...ดีไหม\"",
      avoid: "ถามถึงครั้งล่าสุดที่เกิดขึ้นจริง: เกิดอะไร ทำยังไง เสียอะไรไป",
    },
  ],
};

/**
 * DRAFT: an English word a quest uses, kept in English because it is the
 * word students will meet in startup talks, courses and job posts, with its
 * Thai meaning one tap away. Unknown slugs show nothing.
 */
export interface QuestTerm {
  term: string;
  thai: string;
  meaning: string;
}

export const QUEST_TERMS: Readonly<Record<string, readonly QuestTerm[]>> = {
  "meet-one-real-person": [
    { term: "Target user", thai: "ผู้ใช้เป้าหมาย", meaning: "คนที่เจอปัญหานี้จริงและชี้ตัวได้ ไม่ใช่ \"ทุกคน\"" },
  ],
  "real-stories-not-compliments": [
    { term: "User interview", thai: "การคุยกับผู้ใช้", meaning: "ฟังเรื่องที่เกิดขึ้นจริงกับเขา ไม่ใช่ขอให้เขาชมไอเดีย" },
  ],
  "first-partner": [
    { term: "Partner", thai: "พันธมิตร", meaning: "คนที่ยอมลงมือทำกับคุณ เช่น ให้ลองในร้าน ให้ข้อมูล หรือแนะนำคนต่อ" },
  ],
  "in-their-hands": [
    { term: "Prototype", thai: "ต้นแบบ", meaning: "ชิ้นแรกที่หยาบแต่ลองได้จริง ทำมาเพื่อเรียนรู้ ไม่ใช่เพื่อให้สมบูรณ์" },
    { term: "User test", thai: "ให้ผู้ใช้ลอง", meaning: "ให้เขาใช้เองต่อหน้าคุณ แล้วคุณดูเงียบๆ ไม่ช่วยอธิบาย" },
  ],
  "run-the-loop": [
    { term: "Feedback loop", thai: "วงจรฟังแล้วแก้", meaning: "ให้ลอง ฟัง แก้ทีละเรื่อง แล้วให้ลองใหม่ วนไปเรื่อยๆ" },
    { term: "Iteration", thai: "รอบการแก้", meaning: "งานหนึ่งรอบที่แก้จากสิ่งที่ได้ยินมา" },
  ],
  "what-we-learned": [
    { term: "Assumption", thai: "สิ่งที่เราเดาไว้", meaning: "เรื่องที่เชื่อว่าจริงแต่ยังไม่เคยเช็กกับคนจริง" },
  ],
  "beyond-the-first": [
    { term: "Scale", thai: "ขยายให้ไปถึงคนมากขึ้น", meaning: "ให้คนที่ไม่รู้จักคุณเริ่มใช้เองได้ โดยไม่ต้องให้คุณอยู่ด้วยทุกครั้ง" },
  ],
  "side-stakeholder-map": [
    { term: "Stakeholder", thai: "ผู้มีส่วนได้ส่วนเสีย", meaning: "ทุกคนที่ได้หรือเสียอะไรจากปัญหานี้ หรือจากสิ่งที่คุณจะทำ" },
    { term: "Stakeholder map", thai: "แผนที่คนรอบปัญหา", meaning: "ภาพเดียวที่บอกว่าใครเกี่ยวกับปัญหานี้ แต่ละคนมีบทบาทอะไร และควรคุยกับใครก่อน" },
    { term: "User", thai: "คนใช้", meaning: "คนที่เจอปัญหานี้เองและจะใช้ของที่คุณทำ" },
    { term: "Payer", thai: "คนจ่าย", meaning: "คนที่จ่ายเงินหรือเวลา อาจไม่ใช่คนเดียวกับคนใช้" },
    { term: "Decision maker", thai: "คนตัดสินใจ", meaning: "คนที่บอกได้ว่า \"ลองได้\" หรือ \"ไม่เอา\"" },
    { term: "Blocker", thai: "คนที่อาจขวาง", meaning: "คนที่ไม่ได้ใช้ แต่หยุดเรื่องนี้ได้ เช่น ฝ่ายอาคาร หรือกฎของโรงเรียน" },
  ],
  "side-practice-talk": [
    { term: "Role-play", thai: "ซ้อมแบบสวมบทบาท", meaning: "เพื่อนเล่นเป็นคนที่คุณจะไปคุยด้วย แล้วคุณซ้อมถามจริง" },
  ],
  "side-question-check": [
    { term: "Open question", thai: "คำถามปลายเปิด", meaning: "คำถามที่ตอบแค่ \"ใช่\" หรือ \"ไม่\" ไม่ได้ ต้องเล่า" },
    { term: "Leading question", thai: "คำถามชี้นำ", meaning: "คำถามที่ใส่คำตอบที่อยากได้ไว้แล้ว เช่น \"แอปนี้ช่วยได้ใช่ไหม\"" },
  ],
  "side-warm-intro": [
    { term: "Warm intro", thai: "การแนะนำผ่านคนรู้จัก", meaning: "มีคนกลางที่ทั้งสองฝั่งรู้จักช่วยแนะนำให้ อีกฝ่ายจึงเปิดใจคุยง่ายกว่าทักไปเอง" },
  ],
};

/** The quest's English terms, or none for a proposed quest or a slug without any. */
export function questTerms(kind: "main" | "side" | "proposed", slug: string | null | undefined): readonly QuestTerm[] {
  if (kind === "proposed" || !slug) return [];
  return Object.hasOwn(QUEST_TERMS, slug) ? QUEST_TERMS[slug] : [];
}

/** DRAFT: one step of a quest's how-to, with its pixel picture. */
export interface QuestStep {
  icon: IconKey;
  text: string;
}

/** DRAFT: ทำยังไง on the side quests that are a skill to learn, step by step. Unknown slugs show nothing. */
export const QUEST_STEPS: Readonly<Record<string, readonly QuestStep[]>> = {
  "side-stakeholder-map": [
    { icon: "seed", text: "เขียนปัญหาของทีมไว้ตรงกลาง" },
    { icon: "peers", text: "รอบๆ เขียนคนสี่แบบ: ใครใช้ ใครจ่าย ใครตัดสินใจ ใครอาจขวาง คนเดียวเป็นได้หลายแบบ" },
    { icon: "eye", text: "บอกแค่บทบาทให้ชัด เช่น \"แม่ค้าร้านข้าวหน้าโรงเรียน\" ไม่ต้องใส่ชื่อจริง" },
    { icon: "compass", text: "วงคนที่ควรคุยก่อน แล้วเขียนเหตุผลหนึ่งบรรทัด" },
  ],
  "side-practice-talk": [
    { icon: "peers", text: "หาเพื่อนหนึ่งคนที่กองไฟหรือในห้อง help" },
    { icon: "bubble", text: "บอกเพื่อนว่าให้เล่นเป็นใคร เช่น \"แม่ค้าที่ยุ่งตอนเที่ยง\"" },
    { icon: "calendar", text: "ถาม 10 นาที แล้วสลับกันเป็นคนตอบ" },
    { icon: "note", text: "จดว่าคำถามไหนได้เรื่องจริง คำถามไหนได้แต่คำชม" },
  ],
  "side-question-check": [
    { icon: "note", text: "เขียน 3 คำถามที่จะใช้คุยจริง" },
    { icon: "eye", text: "เช็กทีละข้อ: ถามถึงเรื่องที่เกิดขึ้นแล้ว หรือถามถึงอนาคต" },
    { icon: "send", text: "โพสต์ในห้อง help ให้พี่เลี้ยงช่วยดู" },
    { icon: "check", text: "แก้ตามที่ได้ แล้วเก็บไว้ทั้งก่อนและหลังแก้" },
  ],
  "side-warm-intro": [
    { icon: "eye", text: "เขียนว่าอยากคุยกับคนแบบไหน บอกแค่บทบาท" },
    { icon: "bulb", text: "บอกเหตุผลหนึ่งบรรทัดว่าทำไมอยากคุยกับเขา" },
    { icon: "send", text: "โพสต์ในห้อง help แล้วพี่จะแนะนำในห้องรวม" },
    { icon: "handshake", text: "ก่อนเจอ บอกพ่อแม่หรือครู และนัดในที่ที่มีคนอื่นอยู่ด้วย" },
  ],
};

/** The quest's how-to steps, or none for a proposed quest or a slug without any. */
export function questSteps(kind: "main" | "side" | "proposed", slug: string | null | undefined): readonly QuestStep[] {
  if (kind === "proposed" || !slug) return [];
  return Object.hasOwn(QUEST_STEPS, slug) ? QUEST_STEPS[slug] : [];
}

/**
 * DRAFT: the picture on แผนที่คนรอบปัญหา, from the quest's own example (the
 * pre-order lunch). The four roles sit around the problem; the one to talk to
 * first is ringed.
 */
export const STAKEHOLDER_MAP = {
  slug: "side-stakeholder-map",
  heading: "ภาพตัวอย่าง",
  label: "ตัวอย่างแผนที่คนรอบปัญหา: ระบบสั่งข้าวล่วงหน้า",
  center: "ระบบสั่งข้าวล่วงหน้า",
  first: "คุยก่อน",
  roles: [
    { key: "user", icon: "peers", term: "User", role: "ใครใช้", who: "นักเรียน", first: false },
    { key: "payer", icon: "coin", term: "Payer", role: "ใครจ่าย", who: "ผู้ปกครอง", first: false },
    { key: "decider", icon: "check", term: "Decision maker", role: "ใครตัดสินใจ", who: "แม่ค้า", first: true },
    { key: "blocker", icon: "lockdoor", term: "Blocker", role: "ใครอาจขวาง", who: "ฝ่ายอาคาร", first: false },
  ],
} as const satisfies {
  slug: string;
  heading: string;
  label: string;
  center: string;
  first: string;
  roles: readonly { key: string; icon: IconKey; term: string; role: string; who: string; first: boolean }[];
};

/** DRAFT: the section headings for the how-to and the words. */
export const QUEST_GUIDE_COPY = {
  steps: "ทำยังไง",
  terms: "คำศัพท์",
  termsNote: "แตะคำเพื่อดูความหมาย",
};

/** The quest's pitfalls, or none for a proposed quest or a slug without any. */
export function questPitfalls(kind: "main" | "side" | "proposed", slug: string | null | undefined): readonly QuestPitfall[] {
  if (kind === "proposed" || !slug) return [];
  return Object.hasOwn(QUEST_PITFALLS, slug) ? QUEST_PITFALLS[slug] : [];
}

/** DRAFT: the หลุมพราง block on a quest page. Each row has its own icon: warn (heading), eye (sign), signpost (avoid). */
export const PITFALL = {
  heading: "หลุมพราง",
  sign: "สัญญาณเตือน",
  avoid: "เลี่ยงยังไง",
};

/**
 * DRAFT: the team's problem on the first act's quests, from planting (the
 * project's ambition). A starting point, not an answer: talking to real
 * people sharpens it.
 */
export const TEAM_PROBLEM = {
  heading: "ปัญหาที่ทีมเลือก",
  note: "เป็นจุดตั้งต้น คุยกับคนจริงแล้วจะชัดขึ้นเอง",
  empty: "ทีมยังไม่ได้เลือกว่าอยากแก้ปัญหาอะไร ให้ใคร",
  plant: "ไปเลือกที่ต้นไม้ของทีม",
  /** Changing the line later (schema 14): any teammate, any time. */
  change: "เปลี่ยน",
  editLabel: "ทีมอยากแก้ปัญหาอะไร ให้ใคร",
  editHint: "เปลี่ยนได้เสมอ คุยกับคนจริงแล้วปัญหาเปลี่ยนไป เป็นเรื่องปกติ",
  save: "บันทึก",
  saving: "กำลังบันทึก",
  cancel: "ยกเลิก",
  saved: "เปลี่ยนปัญหาของทีมแล้ว",
  required: "เขียนปัญหาที่ทีมอยากแก้ก่อน",
};

/**
 * DRAFT: the web review page (/shift/island/review/<submission>), reviewers
 * and admins only. Mentors decide in Discord; this page shows what Discord
 * cannot: the photos (and from schema 15, peer checks).
 */
export const REVIEW_PAGE = {
  title: "งานที่ส่งมาให้ดู",
  staffOnly: "หน้านี้สำหรับพี่เลี้ยงและแอดมินเท่านั้น",
  /** DRAFT: the reviewer is the student, a teammate (now or before) or a contributor (20261116080000). */
  conflict:
    "คุณเปิดงานนี้ไม่ได้ เพราะเป็นงานของคุณเอง ของคนที่อยู่หรือเคยอยู่ทีมเดียวกับคุณ หรืองานที่คุณมีส่วนร่วม ให้พี่เลี้ยงคนอื่นดูแทน",
  signIn: "เข้าสู่ระบบด้วยบัญชี Discord ที่ใช้บนเกาะก่อน",
  notFound: "ไม่พบงานนี้",
  unavailable: "หน้านี้ยังไม่เปิด ลองใหม่อีกครั้งภายหลัง",
  revision: (n: number) => `ครั้งที่ ${n}`,
  older: "ไม่ใช่ฉบับล่าสุด มีฉบับใหม่กว่านี้แล้ว",
  goal: "เป้าหมาย",
  criteria: "เสร็จเมื่อ",
  evidence: "สิ่งที่ทำ",
  reflection: "สะท้อนคิด",
  link: "ลิงก์",
  photos: "รูปที่แนบ",
  noPhotos: "ไม่มีรูปแนบ",
  redacted: "เนื้อหาถูกลบตามคำขอของนักเรียน",
  decideInDiscord: "ตัดสินใจในการ์ดรีวิวบน Discord ตามเดิม",
  status: {
    pending: "รอพี่เลี้ยงดู",
    clarification: "ขอให้เพิ่มเติม",
    approved: "ผ่านแล้ว",
    declined: "ยังไม่ผ่าน",
    withdrawn: "ถอนแล้ว",
    superseded: "มีฉบับใหม่แทน",
  } as Record<string, string>,
};

/**
 * DRAFT: photos on a quest (schema 14). Up to 3 per send, shrunk in the
 * browser and re-encoded on the server with no location or camera data.
 * Students meet real people: the rules come before the button.
 */
export const PHOTOS = {
  label: "แนบรูปหรือภาพหน้าจอ (ไม่บังคับ)",
  /** DRAFT: the photos' label inside the send form's optional group. */
  formLabel: "รูปหรือภาพหน้าจอ",
  rulesLead: "ก่อนแนบ เช็กว่าในรูป",
  rules: ["ไม่มีหน้าคน", "ไม่มีชื่อจริง", "ไม่มีเบอร์โทรหรือที่อยู่"],
  crop: "ภาพหน้าจอ: ครอปให้เหลือแค่ส่วนที่เกี่ยวกับงาน",
  add: "เพิ่มรูป",
  count: (n: number, max: number) => `${n}/${max} รูป`,
  full: (max: number) => `แนบได้สูงสุด ${max} รูป`,
  remove: (n: number) => `เอารูปที่ ${n} ออก`,
  alt: (n: number) => `รูปที่ ${n} ที่แนบกับงาน`,
  shrinking: "กำลังเตรียมรูป",
  uploading: (done: number, total: number) => `กำลังอัปโหลดรูป ${done}/${total}`,
  tooBig: "รูปนี้ใหญ่เกิน 8 MB ลองแคปหน้าจอหรือครอปให้เล็กลง",
  unreadable: "เปิดรูปนี้ไม่ได้ ลองแคปหน้าจอแล้วแนบใหม่",
  someFailed: (n: number) => `ส่งงานแล้ว แต่รูป ${n} รูปยังอัปโหลดไม่ขึ้น แนบใหม่ได้จากหน้าเควสต์`,
  heading: "รูปที่แนบ",
  addMore: "แนบรูปเพิ่ม",
  loading: "กำลังโหลดรูป",
  loadFailed: "โหลดรูปไม่ได้ตอนนี้",
  waiting: "แนบเพิ่มหรือเอาออกได้จนกว่าพี่เลี้ยงจะดู",
  open: (n: number) => `เปิดรูปที่ ${n}`,
};

/**
 * DRAFT: ตัวช่วย on a quest page: the side quests that branch off it, and on
 * the first act (meeting people) the safety line from the quest map.
 */
export const HELPERS = {
  heading: "ตัวช่วย",
  safety: "ก่อนไปเจอใคร บอกพ่อแม่หรือครูว่าจะไปคุยกับใคร และนัดในที่ที่มีคนอื่นอยู่ด้วย",
  locked: "ยังล็อกอยู่",
  done: "ผ่านแล้ว",
};

/**
 * DRAFT: who checks a quest. One line in the layout, kept apart on purpose:
 * how a peer check and a mentor check work is still being decided, and will
 * come as its own change. Today every quest is checked by a mentor.
 */
export const WHO_CHECKS = {
  label: "ใครตรวจ",
  mentor: "พี่เลี้ยงตรวจ",
  /** Schema 15: peers give feedback, a mentor decides. */
  peer: "เพื่อนช่วยเช็ก พี่เลี้ยงตัดสิน",
};

/**
 * DRAFT: the peer check (schema 15). Feedback only: a peer ticks what they
 * think is done and leaves one line; a mentor still decides. Peers never see
 * the submitter's name or team.
 */
export const PEER = {
  entry: "ช่วยเพื่อนเช็ก",
  entrySub: "ดูงานที่เพื่อนบนเกาะส่ง ติ๊กข้อที่เห็นว่าทำได้แล้ว แล้วฝากหนึ่งบรรทัด",
  title: "ช่วยเพื่อนเช็กงาน",
  loading: "กำลังโหลดงานที่รอเช็ก",
  empty: "ตอนนี้ยังไม่มีงานรอให้เช็ก แวะมาใหม่ได้",
  loadFailed: "โหลดงานไม่ได้ตอนนี้",
  queueCount: (n: number) => `${n} งานรอเช็ก`,
  revision: (n: number) => `ครั้งที่ ${n}`,
  photos: (n: number) => `รูป ${n}`,
  checks: (n: number) => (n > 0 ? `เพื่อนเช็กแล้ว ${n}` : "ยังไม่มีใครเช็ก"),
  back: "กลับไปที่รายการ",
  anonymous: "งานของเพื่อนบนเกาะ ไม่บอกชื่อและทีม",
  goal: "เป้าหมาย",
  criteria: "เสร็จเมื่อ",
  evidence: "สิ่งที่ทำ",
  reflection: "สะท้อนคิด",
  link: "ลิงก์",
  tickHeading: "ข้อไหนที่คุณเห็นว่าทำได้แล้ว",
  lineLabel: "ฝากหนึ่งบรรทัดถึงเพื่อน",
  lineHint: "บอกสิ่งที่เห็นว่าดี และคำถามหนึ่งข้อที่อาจช่วยให้ไปต่อ ใจดี เจาะจง และไม่ทำแทน",
  linePlaceholder: "เช่น คุยกับคนจริงแล้วดีมาก ลองถามเขาเพิ่มว่าครั้งล่าสุดเสียเวลาไปเท่าไหร่",
  mentorDecides: "พี่เลี้ยงเป็นคนตัดสินสุดท้าย คุณช่วยดูและให้กำลังใจ",
  send: "ส่งให้เพื่อน",
  sending: "กำลังส่ง",
  sent: "ส่งแล้ว ขอบคุณที่ช่วยเพื่อน",
  yours: "คุณเช็กงานนี้แล้ว",
  yoursHidden: "พี่เลี้ยงซ่อนข้อความนี้ไว้",
  lineRequired: "เขียนหนึ่งบรรทัดถึงเพื่อนก่อน",
  heading: "เพื่อนเช็กแล้ว",
  someone: "เพื่อนบนเกาะ",
  ticked: (n: number) => `ติ๊กว่าทำได้แล้ว ${n} ข้อ`,
  noneYet: "ยังไม่มีเพื่อนเช็ก",
  openLabel: "ให้เพื่อนบนเกาะช่วยเช็กงานนี้",
  openHint: "เพื่อนจะเห็นงานและรูปที่แนบ แต่ไม่เห็นชื่อคุณและทีม พี่เลี้ยงยังเป็นคนตัดสิน",
  reviewHeading: "เพื่อนเช็ก",
  reviewNone: "ยังไม่มีเพื่อนเช็ก",
  reviewClosed: "นักเรียนไม่ได้เปิดงานนี้ให้เพื่อนเช็ก",
  hide: "ซ่อน",
  show: "แสดงอีกครั้ง",
  hiddenTag: "ซ่อนอยู่",
};

/**
 * DRAFT: the pitfall quest map's three acts on the main lane, by milestone.
 * The order is a suggestion, never a gate: Act 2 and 3 cards say
 * partnerFirst until the project has main quest 3 (its first partner).
 */
export const QUEST_ACTS: readonly { title: string; milestones: readonly number[] }[] = [
  { title: "หาคนที่ใช่", milestones: [1, 2, 3] },
  { title: "สร้างสิ่งที่สำคัญ", milestones: [4, 5, 6] },
  { title: "ขยาย", milestones: [7] },
];
/** The main quest that finds the first partner: Act 2 and 3 are suggested after it. */
export const PARTNER_MILESTONE = 3;
export const PARTNER_FIRST = "แนะนำหลังได้พันธมิตร";

// Thai reviewed (agy, Codex, Cursor), 2026-11-14. The day's line itself is TODAY.line*.
export const REFLECT = {
  /** The journal row's required "what changed", for a line written on the island. */
  changed: "บันทึกจากเกาะ",
  private: `รากนับได้คนละไม่เกิน ${REFLECTIONS_PER_DAY} บันทึกต่อวัน · บันทึกนี้เป็นส่วนตัว`,
};

/** Island and canvas reads, on return or by request. */
export const SYNC = {
  refresh: "รีเฟรชเควสต์และแคนวาส",
  refreshing: "กำลังรีเฟรช",
};

/**
 * The team's tree. A seed on day one, a close-up with roots (the team's
 * reflections), a gift to pick 1 of up to 3 after a closed round and after
 * the first submit of a quest, and a wardrobe. Gifts belong to the team,
 * never one student; nothing here names a student. Thai reviewed (agy, Codex,
 * Cursor), then the remaining lines (Cursor, Codex), 2026-11-14.
 */
export const TREE = {
  seed: {
    title: "เลือกเมล็ดของทีม",
    ask: "ทีมอยากแก้ปัญหาอะไร ให้ใคร",
    askHint: "เขียนจากที่รู้ตอนนี้ ยังไม่ต้องถูกเป๊ะ คุยกับคนจริงแล้วจะชัดขึ้น",
    /** The hint when the line starts from the project's ambition (the planted line replaces it). */
    askHintPrefilled: TREE_IDEA_PREFILLED,
    askPlaceholder: "เช่น แม่ค้าหน้าโรงเรียนขายไม่ทันตอนเที่ยง",
    pick: TREE_SEED_PICK,
    action: "เริ่มจากเมล็ดนี้",
    planted: TREE_PLANTED,
    needIdea: "เขียนก่อนว่าทีมอยากแก้ปัญหาอะไร ให้ใคร",
    needSeed: "เลือกเมล็ดก่อน",
  },
  seeds: TREE_SEEDS,
  slots: TREE_SLOTS,
  gift: {
    ...TREE_GIFT,
    pick: "เลือกลุคนี้",
    kept: "เก็บไว้แล้ว เพื่อนในทีมคนไหนก็เปิดได้ทีหลัง",
    waiting: (n: number) => `มีของขวัญรออยู่ ${n} ชิ้น`,
    open: "เปิดของขวัญ",
    gone: "ของขวัญชิ้นนี้ถูกเลือกไปแล้ว",
  },
  wardrobe: {
    ...TREE_WARDROBE,
    using: "ใช้อยู่",
    use: "ใช้ลุคนี้",
    empty: "รับลุคใหม่ได้จากของขวัญหลังจบรอบ หรือหลังส่งเควสต์ครั้งแรก",
  },
  closeup: {
    ...TREE_CLOSEUP,
    /** The close-up sheet's title. */
    title: "ต้นไม้ของทีม",
    open: "ดูต้นไม้ใกล้ๆ",
    close: "กลับไปที่เกาะ",
  },
};

export const INVITE_FRIEND = {
  title: "ชวนเพื่อน",
  hint: "ค้นหาชื่อที่เพื่อนใช้บนเกาะ แล้วชวนมาทำโปรเจกต์ด้วยกัน เพื่อนต้องตอบรับก่อนเข้าทีม",
  label: "ชื่อเพื่อนบนเกาะ",
  search: "ค้นหา",
  minimum: "พิมพ์ชื่ออย่างน้อย 2 ตัวอักษร",
  empty: "ยังไม่พบเพื่อน ลองค้นหาด้วยชื่อบนเกาะ หรือให้เพื่อนเข้าเกาะและกดเริ่มก่อน",
  limit: "แสดงสูงสุด 20 คน ถ้ายังไม่เจอ ลองพิมพ์ชื่อเพิ่ม",
  invite: "ส่งคำชวน",
  sent: "ส่งคำชวนแล้ว",
  next: "ให้เพื่อนเปิดหน้าเกาะแล้วกดเข้าร่วมในคำชวนเข้าทีม",
} as const;
