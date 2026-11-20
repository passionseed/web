/**
 * กองไฟโฟกัส (the deep fire): every string the bot shows for it. All DRAFT,
 * waiting for the three-model Thai review in the root AGENTS.md. No em or en
 * dashes, never น้องๆ or เด็กๆ, never พรุ่งนี้, never talk down.
 *
 * The bot posts nothing in the rooms themselves: no rounds, chimes, music or
 * messages. What lives here is the room's name, the audit log reasons staff
 * read in Server Settings, and /admin channel kind:deepfire.
 */
export const DEEPFIRE = {
  /**
   * The name of every room the bot builds. Generic on purpose, never a
   * person's name: shift-voice stores channel names in cohort weeks, and
   * Discord's audit log keeps them. DRAFT.
   */
  roomName: "🔥 กองไฟโฟกัส",
  /** Audit log reasons, read by staff only. No names, no ids. DRAFT. */
  reason: {
    build: "กองไฟโฟกัส: ห้องใหม่ของคนที่เพิ่งเข้าห้องรอ",
    move: "กองไฟโฟกัส: พาเข้าห้องของตัวเอง",
    remove: "กองไฟโฟกัส: ห้องนี้เข้าได้แค่เจ้าของห้อง",
    close: "กองไฟโฟกัส: ไม่มีใครอยู่แล้ว ปิดห้อง",
  },
} as const;

/** /admin channel kind:deepfire and its line on /admin status. Staff only. DRAFT. */
export const DEEPFIRE_ADMIN = {
  /** The kind's choice in /admin channel (100 characters at most). DRAFT. */
  choice: "deepfire (กองไฟโฟกัส: ห้องรอที่สร้างห้องให้คนละห้อง)",
  /** The /admin status line. DRAFT. */
  label: "กองไฟโฟกัส",
  hint: "ห้องเสียงในหมวด เข้าแล้วบอทสร้างห้องล็อกให้คนละห้อง",
  // Refusals, each before anything is saved. DRAFT.
  needsSchema: "ฐานข้อมูลยังไม่มีกองไฟโฟกัส (ต้องใช้ schema 22) ให้ทีมเทคนิคอัปเดตฐานข้อมูลก่อน",
  notVoice: "กองไฟโฟกัสต้องเป็นห้องเสียงธรรมดา (ไม่ใช่ห้องเวที ห้องข้อความ หรือฟอรัม)",
  noCategory: "ห้องเสียงนี้ยังไม่อยู่ในหมวด ย้ายเข้าหมวดก่อน บอทจะสร้างห้องของแต่ละคนไว้ในหมวดเดียวกัน",
  unknown: "บอทยังมองไม่เห็นห้องนี้หรือหมวดของห้อง เปิดสิทธิ์ View Channel ให้บอททั้งสองที่ แล้วลองใหม่",
  /** Students cannot see or join the lobby: its rooms would be hidden from them, and the island's button a dead link. DRAFT. */
  lobbyPrivate: "นักเรียนยังมองไม่เห็นหรือเข้าห้องเสียงนี้ไม่ได้ เปิด View Channel และ Connect ให้นักเรียนก่อน แล้วลองใหม่",
  /** The lobby and the campfire's coworking channel are the same channel (refused either way round). DRAFT. */
  notCampfire: "ห้องรอของกองไฟโฟกัสกับห้อง coworking ของกองไฟต้องเป็นห้องเสียงคนละห้อง เลือกห้องเสียงอีกห้องแล้วลองใหม่",
  botPerms:
    "บอทยังสร้างห้องที่นี่ไม่ได้ ให้บอทมี View Channel, Connect, Manage Channels และ Move Members ทั้งที่ห้องนี้และที่หมวด " +
    "และในหมวดต้องมี Speak, Video, Use Voice Activity, Send Messages, Send Messages in Threads, Create Public Threads, " +
    "Create Private Threads, Send Voice Messages, Create Polls และ Add Reactions ด้วย เพราะบอทตั้งสิทธิ์พวกนี้ให้ห้องใหม่",
} as const;
