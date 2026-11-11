/**
 * Every user-facing string on /shift/island, in one place.
 *
 * DRAFT COPY for the founder's Thai review (AGENTS.md: a multi-model Thai
 * review before shipping). Most lines come from the plan doc
 * (docs/designs/shift-high-island-web.md, "Screens").
 *
 * House rules, checked by __tests__/copy.test.ts: Thai first, no em dashes,
 * no emoji, no markdown, never น้อง or ลูก, never talk down, no streaks or
 * day counts.
 */
import type { ProjectRoute, SeasonUnlock, TileStatus } from "@/lib/supabase/shift-quests/types";
import type { ShiftDiscordAuthError } from "@/lib/shift/discordAuth";

/** Tree stages 0..7, same names as the bot (bot/src/quests/island/copy.ts). */
export const STAGE_NAMES = ["ที่ดินว่าง", "เมล็ด", "ต้นกล้า", "ต้นอ่อน", "ต้นไม้", "ต้นใหญ่", "ออกผล", "ผลิดอก"] as const;

export function stageName(stage: number): string {
  const n = Number.isFinite(stage) ? Math.trunc(stage) : 0;
  return STAGE_NAMES[Math.min(Math.max(n, 0), STAGE_NAMES.length - 1)];
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
  rules: [
    "1 โปรเจกต์ = ต้นไม้ 1 ต้น โตได้ 7 ขั้น ทำขั้นไหนก่อนก็ได้",
    "ถึงขั้นไหนแล้ว ส่งหลักฐานสั้นๆ กับคำตอบหนึ่งข้อ พี่เลี้ยงจะดูแล้วยืนยัน",
    "ต้นไม้โตจากงานที่พี่เลี้ยงยืนยันเท่านั้น ไม่ได้โตจากจำนวนครั้งที่กด",
    "พักนานแค่ไหนก็ได้ ต้นไม้ไม่เหี่ยว ไม่มีการนับวันต่อเนื่อง",
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
  ambitionLabel: "อยากให้มันไปถึงไหน (ไม่บังคับ)",
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
  joinFriend: "อยากทำกับเพื่อน ให้เพื่อนกดชวนคุณจากการ์ดเกาะใน Discord แล้วคำชวนจะขึ้นที่หน้านี้",
  switchAccount: "สลับบัญชี Discord",
};

export const ISLAND = {
  title: "เกาะ SHIFT",
  viewWhole: "ดูทั้งเกาะ",
  viewClose: "ขยายดูใกล้ๆ",
  myPlot: (slot: number, stage: string) => `แปลงของคุณ #${slot}, ${stage}`,
  plot: (slot: number) => `แปลง #${slot}`,
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
export const HUD = {
  /** The top-left chip's accessible name: the project, its tree, and what the tap opens. */
  chip: (name: string, stage: string) => `${name}, ${stage}, ดูวันนี้ของโปรเจกต์`,
  /** Read after the chip's name while today's check-in is still open. */
  chipTodayOpen: "วันนี้ยังไม่ได้เช็กอิน",
  /** The chip before a plot is claimed. */
  noPlot: "ยังไม่มีที่ดิน",
  meter: (stage: number) => `ต้นไม้ขั้น ${stage} จาก 7`,
  board: "กระดานเควสต์",
  menu: "เมนู",
  inbox: (count: number) => `ข้อความใหม่ ${count} ข้อความ`,
  inboxHeading: "ข้อความใหม่",
  /** The claim button, with pending team invites. */
  invites: (count: number) => `คำชวนเข้าทีม ${count}`,
  myTree: (stage: string) => `ต้นไม้ของคุณตอนนี้เป็น${stage}`,
  viewHeading: "มุมมองเกาะ",
  /** The roving group of plot buttons over the island. */
  plots: "แปลงบนเกาะ",
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
  /** DRAFT: the daily check-in; never "ทำต่อ", which belongs to the keynote card. */
  tap: "เช็กอินวันนี้",
  tapped: "วันนี้คุณลงมือแล้ว",
  addNote: "เพิ่มโน้ตสั้นๆ",
  noteHint: "เห็นแค่คุณ",
  noteLabel: "โน้ตของวันนี้ (เห็นแค่คุณ)",
  saveNote: "บันทึกโน้ต",
  noteSaved: "บันทึกโน้ตแล้ว",
  noteRequired: "เขียนโน้ตสั้นๆ ก่อนบันทึก",
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

export const BOARD = {
  mainHeading: "เควสต์หลัก",
  mainSub: "7 ขั้นของต้นไม้ ทำขั้นไหนก่อนก็ได้",
  sideHeading: "เควสต์เสริม",
  sideSub: "แตกกิ่งจากเควสต์หลัก",
  /** DRAFT: the list of main quest names under the ring. */
  legend: "ชื่อเควสต์หลัก",
  branchOf: (title: string) => `ต่อจาก ${title}`,
  branchFree: "เควสต์เสริมอื่นๆ",
  routeFilter: "เลือกเส้นทางของเควสต์เสริม",
  sideEmpty: "ยังไม่มีเควสต์เสริมในเส้นทางนี้ ลองดูทุกเส้นทาง",
  sideNone: "ยังไม่มีเควสต์เสริมเปิดให้ทำ",
  unlockWhen: (titles: string[]) => `ปลดล็อกเมื่อผ่าน ${titles.join(", ")}`,
  proposedHeading: "เควสต์ที่ฉันเสนอ",
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
  kind: { main: "เควสต์หลัก", side: "เควสต์เสริม", proposed: "เควสต์ที่ฉันเสนอ" },
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
  proofLabel: "หลักฐาน (ลิงก์หรือเล่าสั้นๆ)",
  proofHint: "ไม่ต้องใส่ชื่อจริง เบอร์โทร หรือข้อมูลส่วนตัวของใคร",
  urlLabel: "ลิงก์งาน (ไม่บังคับ, ขึ้นต้นด้วย https://)",
  submit: "ส่งให้พี่เลี้ยงดู",
  resubmit: "ส่งฉบับใหม่",
  sent: "ส่งแล้ว พี่เลี้ยงจะดูใน Discord แล้วแจ้งผลในกล่องข้อความของบอท",
  /** DRAFT */
  submittedWaiting: "ส่งแล้ว รอพี่เลี้ยงดูอยู่ ถ้าแก้งานแล้วส่งฉบับใหม่ได้",
  stuck: "ติด",
  start: "เริ่มเควสต์นี้",
  started: "เริ่มแล้ว เควสต์นี้จะขึ้นในการ์ดทำต่อ",
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
      // The button is the one "เชื่อมแคนวาส"; the heading stays the box's own.
      heading: "สำหรับโปรเจกต์คุณ",
      body: "เลือกแคนวาสโปรเจกต์ของคุณบนไวท์บอร์ด แล้วเควสต์จะดึงโน้ตของคุณมาให้",
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
  details: "รายละเอียดทั้งหมด",
  /** A long purpose in full, under the details. */
  why: "ทำไมเควสต์นี้",
  send: "ส่งเควสต์",
  resend: "ส่งฉบับใหม่",
  stuck: "ติด",
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
  showNameFine: "ชื่อจะขึ้นบนเกาะเมื่อทุกคนในทีมเปิด",
  showNameWaiting: "เปิดแล้ว ชื่อจะขึ้นเมื่อเพื่อนในทีมเปิดครบ",
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
