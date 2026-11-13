/**
 * SHIFT Island words. Thai first, one place, same house rules as ../copy.ts:
 * no em dashes, never talk down, never promise rewards that are not live.
 */
import { FOCUS_MINUTES, REFLECTIONS_PER_DAY, REST_MINUTES } from "@/lib/shift-island/rounds-rules";

import { bkkDate, meter, safe } from "../copy";

/** Tree stage = number of milestones a mentor has confirmed (0..7). */
export const STAGE_NAMES = ["ที่ดินว่าง", "เมล็ด", "ต้นกล้า", "ต้นอ่อน", "ต้นไม้", "ต้นใหญ่", "ออกผล", "ผลิดอก"];

/** A stage as a bar: ▰▰▱▱▱▱▱ for 2 of 7. */
export function stageBar(stage: number, total = 7): string {
  const done = Math.max(0, Math.min(total, Math.floor(stage)));
  return `${"▰".repeat(done)}${"▱".repeat(total - done)}`;
}

export const I = {
  /** The card title (rendered as a ### heading). */
  header: "🏝️ เกาะ SHIFT",
  noPlot:
    "🌱 **คุณยังไม่มีที่ดินบนเกาะ**\nสร้างโปรเจกต์เรื่องที่คุณใส่ใจเพื่อจับจองที่ดิน หรือให้เพื่อนชวนเข้าโปรเจกต์ของเขาก็ได้ ต้นไม้จะเริ่มจากเมล็ด",
  plot: (n: number | undefined, stage: number, name: string) =>
    `🌳 **${safe(name, 60)}**${n ? ` · แปลง #${n}` : ""}\n${stageBar(stage)} ${STAGE_NAMES[stage] ?? STAGE_NAMES[7]} **${stage}**/7`,
  next: (title: string) => `➡️ ขั้นต่อไป: **${safe(title, 80)}** (ทำขั้นไหนก่อนก็ได้)`,
  allDone: "ครบ 7 ขั้นแล้ว ต้นไม้ผลิดอกเต็มต้น ทำขั้นไหนซ้ำเพื่อเรียนรู้ต่อก็ได้",
  inFlight: (title: string, state: string) => `⏳ ${safe(title, 80)}: ${state}`,
  /** A teammate holds the project's one open quest for this milestone. */
  inFlightHeld: (title: string, state: string, owner: string | null) =>
    `⏳ ${safe(title, 80)}: ${state} (${owner ? safe(owner, 40) : "เพื่อนร่วมทีม"} ถืองานนี้อยู่ ช่วยกันได้)`,
  heldBy: (owner: string | null) => `${owner ? owner : "เพื่อนร่วมทีม"} ถืองานขั้นนี้อยู่`,
  /** Every milestone that could be picked is held by a teammate or waits for an appeal. */
  nothingToPick: "ตอนนี้ทุกขั้นมีงานเปิดอยู่แล้ว รอผลรีวิวหรือช่วยเพื่อนร่วมทีมในงานที่เขาถืออยู่ได้เลย",
  resting: "🌙 กำลังพัก ต้นไม้ไม่ตาย ไม่มีอะไรหาย กด ☀️ เมื่อพร้อมกลับมา",
  tappedToday: "🔨 วันนี้คุณลงมือแล้ว",
  growthRule: "ต้นไม้โตเมื่อพี่เลี้ยงยืนยันขั้นที่ทำได้จริง ไม่ได้โตจากจำนวนครั้งที่กดหรือเวลาออนไลน์",
  signs: "🪧 ป้ายชื่อบนเกาะ:",
  /** The rest of a list that is cut short. */
  more: (n: number) => `และอีก ${n}`,
  /** The picture failed; the text view still works. The reference matches one log line. */
  pictureFailed: (ref: string) => `🖼️ รูปเกาะโหลดไม่ขึ้นรอบนี้ งานและต้นไม้ของคุณยังอยู่ครบ (อ้างอิง ${ref})`,

  // Thai reviewed (agy, Codex, Cursor), 2026-11-14
  btnReflect: "✍️ ได้เรียนรู้อะไร",
  // Thai reviewed (agy, Codex, Cursor), 2026-11-14
  reflectionChanged: "บันทึกจากเกาะ",
  btnTap: "🔨 วันนี้ทำต่อ",
  btnMilestone: "🌟 ถึงขั้นต่อไปแล้ว",
  btnStuck: "🧱 ติด",
  btnRest: "🌙 ขอพัก",
  btnWake: "☀️ กลับมาแล้ว",
  btnWork: "📋 งานที่ส่งไว้",
  /** The quest card (handlers/board.ts): the island's quest board in Discord. Thai reviewed (agy, Codex, Cursor), 2026-11-14. */
  btnBoard: "📜 กระดานเควสต์",
  btnClaim: "🌱 จับจองที่ดิน",
  btnHow: "📖 เกาะนี้ทำงานยังไง",
  btnBack: "🏝️ กลับเกาะ",
  btnShowName: "🪧 โชว์ชื่อบนเกาะ",
  btnHideName: "🪧 ซ่อนชื่อ",
  btnNote: "✏️ เพิ่มโน้ตสั้นๆ",
  /** Opens the season details from the season line on the island card. */
  btnSeason: "ℹ️ ดูเพิ่ม",

  /** How the island works: four short rules, then the fine print. The title is btnHow. */
  how: [
    "- **1 โปรเจกต์ = ต้นไม้ 1 ต้น** โตได้ 7 ขั้น ทำขั้นไหนก่อนก็ได้",
    "- **ถึงขั้นไหนแล้ว กด 🌟** ส่งหลักฐานสั้นๆ กับคำตอบหนึ่งข้อ พี่เลี้ยงจะมาดูแล้วยืนยัน",
    "- **โตจากงานที่พี่เลี้ยงยืนยันเท่านั้น** ไม่ได้โตจากจำนวนครั้งที่กดหรือความเร็ว",
    // DRAFT (lore: กติกาของเกาะ): a missed day never resets or takes anything away.
    "- **พักนานแค่ไหนก็ได้** ต้นไม้ไม่เหี่ยว ไม่หดเล็กลง วันที่ไม่ได้มาไม่ทำให้อะไรหายหรือเริ่มนับใหม่",
  ].join("\n"),
  /**
   * The season, after the rules: the festival night and what comes after.
   * Moved here from the old started card. DRAFT (lore: festival night, ทางที่เดินต่อ).
   * No date: the island card shows the season's own. Voluntary, no promise of
   * admissions, money or a role.
   */
  // Thai reviewed 2026-11-14: the quest board, the campfire rounds (with their encounters) and the roots, one line each.
  howRounds:
    "📜 **กระดานเควสต์** เควสต์หลัก เควสต์ชุมชน และเควสต์เสริม ดูและส่งงานได้จากปุ่ม 📜\n" +
    `🔥 **รอบกองไฟ** เข้าห้องเสียงกองไฟ โฟกัส ${FOCUS_MINUTES} นาที พัก ${REST_MINUTES} นาที เริ่มพร้อมกันทุก :00 และ :30 บางรอบพักมีโน้ตเควสต์เสริมแวะมาที่กองไฟ\n` +
    `🌱 **ราก** กด ✍️ ปิดรอบ แล้วเขียนว่าได้เรียนรู้อะไร รากต้นไม้จะหยั่งลึกขึ้น (นับได้คนละไม่เกิน ${REFLECTIONS_PER_DAY} บันทึกต่อวัน ส่วนขั้นของต้นไม้ยังมาจากงานที่พี่เลี้ยงยืนยัน)`,
  howSeason: [
    "🏮 ปลายซีซันมีคืนเทศกาล Demo Day ทั้งเกาะมาโชว์งานด้วยกัน",
    "🌅 ซีซันจบ ต้นไม้ยังอยู่ วันหนึ่งคุณกลับมาช่วยคนที่เพิ่งขึ้นเกาะได้",
  ].join("\n"),
  howFine: [
    "ไม่มีการจัดอันดับ ของปลดล็อกทุกคนที่ถึงเกณฑ์ได้เท่ากัน",
    "เริ่มได้สองทาง: จับจองที่ดินด้วยการสร้างโปรเจกต์ หรือให้เพื่อนชวนเข้าโปรเจกต์ของเขา",
  ].join("\n"),

  tappedTitle: "🔨 บันทึกแล้ว",
  tapped: "ขอให้สนุกกับการสร้าง",
  tapAgainTitle: "🔨 วันนี้บันทึกไว้แล้ว",
  tapAgain: "อยากเล่าเพิ่ม เพิ่มโน้ตสั้นๆ ได้",
  noteTitle: "โน้ตสั้นๆ",
  noteLabel: "วันนี้ทำอะไรไป (สั้นๆ)",
  noteSavedTitle: "✅ เก็บโน้ตแล้ว",
  noteSaved: "ส่วนตัว เห็นแค่คุณ",

  pickMilestone: "ถึงขั้นไหนแล้ว",
  /** What the marks in the milestone list mean. */
  msLegend: "✅ ผ่านแล้ว · ⏳ มีงานเปิดอยู่ · ▫️ ยังไม่ได้ทำ",
  doneRepeat: "ผ่านแล้ว ส่งซ้ำได้ถ้าได้เรียนรู้อะไรใหม่ (ต้นไม้นับขั้นนี้แล้ว)",
  criteria: (text: string) => `**พี่เลี้ยงดูอะไร**\n${safe(text, 600)}`,
  proof: "หลักฐาน: ลิงก์ หรือเล่าสั้นๆ",
  proofHint: "ห้ามระบุชื่อคนที่คุยด้วยหรือคนที่ทดสอบ ห้ามใส่รหัสผ่าน โทเคน หรือข้อมูลลูกค้า",
  portfolio: "โน้ตพอร์ต",
  portfolioHint: "ตอบสั้นๆ ข้อเดียว เก็บไว้ใช้ในพอร์ตได้",
  sentTitle: "📨 ส่งแล้ว",
  sent: "พี่เลี้ยงจะมาดูงานนี้ ถ้าผ่าน ต้นไม้โตขึ้นหนึ่งขั้น",
  /** A repeat never grows the tree: the stage is already counted. */
  sentRepeat: "ขั้นนี้นับให้ต้นไม้ไปแล้ว ครั้งนี้พี่เลี้ยงจะดูว่าคุณได้เรียนรู้อะไรใหม่ต่างจากครั้งก่อน",
  resultIn: "ผลแจ้งใน /inbox",

  restedTitle: "🌙 พักแล้ว",
  rested: (n: number) => `พักงาน **${n}** อย่าง ต้นไม้ไม่ตาย ไม่มีอะไรหาย`,
  /** Rest with nothing open: there is nothing to pause, and no resting state is shown. */
  nothingToRestTitle: "🌙 ไม่มีงานให้พัก",
  nothingToRest: "ไม่ต้องทำอะไรเพิ่ม ต้นไม้ไม่เหี่ยวและไม่มีอะไรหาย กลับมาเมื่อไหร่ก็ได้",
  wokeTitle: "☀️ กลับมาแล้ว",
  woke: (n: number) => (n ? `เปิดงาน **${n}** อย่างต่อ` : ""),
  /** The project name on the island's sign: shown, waiting for every teammate, or hidden. */
  nameShown: "🪧 ชื่อโปรเจกต์ขึ้นป้ายบนเกาะแล้ว",
  nameWaitingTitle: "🪧 บันทึกแล้ว",
  nameWaiting: "ชื่อจะขึ้นป้ายเมื่อเพื่อนร่วมทีมทุกคนยินยอม",
  nameHiddenTitle: "🪧 ซ่อนชื่อแล้ว",
  nameHidden: "บนเกาะจะเห็นเป็นต้นไม้ไม่มีป้าย",

  workTitle: "📋 งานที่ส่งไว้",
  workEmpty: "ยังไม่มีงานที่เปิดอยู่ ถึงขั้นไหนแล้วส่งได้เลย",

  /** The season details card: the island card shows only the season's headline. */
  noSeason: "ตอนนี้ไม่มีซีซันที่เปิดอยู่",
  seasonFine: "ไม่มีการจัดอันดับ ทุกคนที่ถึงเกณฑ์ได้เท่ากัน",
};

/**
 * The quest card (handlers/board.ts): the web quest board in Discord, one line
 * per quest. Thai reviewed (agy, Codex, Cursor), 2026-11-14. Never a coin number: rewards come
 * from mentor-approved quests only, and the board reads none.
 */
export const QB = {
  title: I.btnBoard,
  main: "**🌳 เควสต์หลัก**",
  community: "**🤝 เควสต์ชุมชน**",
  side: "**🧭 เควสต์เสริม**",
  /** One quest on the card: its state's mark, the milestone when it has one, the title, the state. */
  line: (mark: string, title: string, state: string, milestone?: number | null) =>
    `${mark} ${milestone ? `ขั้น ${milestone} · ` : ""}**${safe(title, 80)}** · ${state}`,
  /** Every main quest outside the community ones has passed. */
  coreDone: "✅ ผ่านครบทุกใบแล้ว ส่งซ้ำได้ถ้าเรียนรู้อะไรใหม่",
  noSide: "ตอนนี้ยังไม่มีเควสต์เสริมเปิดให้รับ",
  locked: (n: number) => `🔒 อีก ${n} ใบยังล็อก ผ่านเควสต์ก่อนหน้าแล้วจะเปิด`,
  legend: "▫️ เปิดให้ทำ · 🔨 กำลังทำ · ⏳ รอรีวิว · ✅ ผ่านแล้ว · 👥 เพื่อนในทีมรับอยู่ · 🔒 ยังล็อก",
  growth: "ต้นไม้โตจากเควสต์หลักและเควสต์ชุมชนที่พี่เลี้ยงยืนยันว่าผ่าน เควสต์เสริมไม่ทำให้ต้นไม้โต แต่งานที่ทำใช้เป็นผลงานในพอร์ตได้",
  noPlot: "🌱 **ยังไม่มีที่ดิน** เควสต์ทุกใบผูกกับโปรเจกต์ จับจองที่ดินก่อน แล้วกระดานจะเปิด",
  pickSide: "เปิดดูเควสต์เสริม",

  /** A tile's state, as the web board names them (lib/supabase/shift-quests/board.ts). */
  status: {
    available: "เปิดให้ทำ",
    active: "กำลังทำ",
    paused: "พักไว้",
    submitted: "รอรีวิว",
    clarification: "ขอข้อมูลเพิ่ม",
    appealed: "อุทธรณ์อยู่",
    declined: "ยังไม่ผ่าน ลองใหม่ได้",
    held: "เพื่อนในทีมรับอยู่",
    done: "ผ่านแล้ว",
    locked: "ยังล็อก",
  },
  mark: {
    available: "▫️",
    active: "🔨",
    paused: "⏸️",
    submitted: "⏳",
    clarification: "💬",
    appealed: "⚖️",
    declined: "↩️",
    held: "👥",
    done: "✅",
    locked: "🔒",
  },

  /** One side quest (also the note an encounter at the campfire leaves). */
  sideTitle: (title: string) => `🧭 ${safe(title, 80)}`,
  offRoute: "นอกเส้นทางหลักของโปรเจกต์คุณ",
  doneWhen: "เสร็จเมื่อ",
  examples: "ตัวอย่าง",
  needs: (titles: string) => `🔒 ต้องผ่านก่อน: ${titles}`,
  needsPlot: "🔒 จับจองที่ดินก่อน เควสต์เสริมเป็นของโปรเจกต์",
  sideFine: "เควสต์เสริมไม่ทำให้ต้นไม้โต · ผ่านเมื่อพี่เลี้ยงยืนยันแล้ว",
  btnTake: "🧭 รับเควสต์นี้",
  btnSend: "🌟 ส่งงานเลย",
  btnSendAgain: "🌟 ส่งอีกครั้ง",
  taken: "รับเควสต์แล้ว ลุยเลย",
  sent: "ส่งแล้ว พี่เลี้ยงจะมาดูงานนี้",
  /** The side quest is no longer on the board (unpublished since the card was drawn). */
  gone: "เควสต์นี้ไม่ได้อยู่บนกระดานแล้ว",
};

/**
 * The live island post (../live.ts): one message in the live channel that the
 * bot keeps editing. Counts only: the campfire is a number, never who sits
 * there, and the only names are the signs every teammate opted in to show.
 */
export const LIVE = {
  title: "🏝️ เกาะ SHIFT High ตอนนี้",
  /**
   * Trees on the island, plus the milestones mentors confirmed on the trees
   * shown by name (quiet projects never count; left out while none is shown).
   * DRAFT copy.
   */
  trees: (n: number, approved: number | null) =>
    `🌳 ต้นไม้บนเกาะ **${n}** ต้น${approved ? ` · ต้นที่โชว์บนเกาะผ่านแล้วรวม **${approved}** ขั้น` : ""}`,
  goal: (count: number, target: number, reached: boolean) =>
    `🎯 เป้าของเกาะ ${meter(count, target)} **${count}**/${target} โปรเจกต์${reached ? " ถึงเป้าแล้ว!" : ""}`,
  /** The database's own day count (Bangkok); only called while Demo Day is today or ahead. */
  demo: (day: string, days: number) => `🎤 Demo Day ${bkkDate(day)} · ${days > 0 ? `อีก **${days}** วัน` : "วันนี้!"}`,
  campfire: (n: number) => (n > 0 ? `🔥 กองไฟตอนนี้ **${n}** คน` : "🔥 กองไฟยังว่าง มานั่งเป็นคนแรกได้"),
  /**
   * The panel under the post. Each button answers only the person who
   * pressed it, in a private reply, with the card its own command shows.
   * quests opens the quest card (📜, with 📋 งานที่ส่งไว้ inside), so it
   * carries that card's own name.
   */
  panel: {
    me: "🏝️ ของฉัน",
    quests: I.btnBoard,
    checkin: "✍️ เช็กอิน",
    help: "🆘 ขอช่วย",
    rewards: "🎁 รางวัล",
    how: "📖 วิธีเล่น",
  },
  /** Links: the coworking voice channel, and the suggestions channel when the post's data names one. */
  join: "🔥 เข้ากองไฟ",
  suggest: "💡 เสนอไอเดีย",
  updated: (unix: number) => `อัปเดตล่าสุด <t:${unix}:R>`,
  /** Also how the bot finds its own pinned post again: keep it unique to this post. */
  marker: "🏝️ โพสต์นี้อัปเดตเองทุก 10 นาที",
  pictureFailed: "🖼️ รูปเกาะวาดไม่ขึ้นรอบนี้ ตัวเลขด้านบนยังเป็นปัจจุบัน",
};

/**
 * Squads: opt-in, a short sprint, celebrated together, never ranked. Always
 * "สควอด", never "ทีม": students already say ทีม for their project team.
 */
export const SQ = {
  /** /admin feature squads is off (the default until founder decision 5). */
  notOpen: "สควอดยังไม่เปิดให้ใช้ตอนนี้ ระหว่างนี้ลงมือกับโปรเจกต์ของคุณบน /island ได้ตามปกติ เปิดเมื่อไหร่ใช้ /squad ได้เลย",
  createdTitle: "✅ ตั้งสควอดแล้ว",
  created: "ชวนเพื่อนอีก 2 ถึง 3 คนด้วย /squad invite",
  createdFine: "เพื่อนต้องกดตอบรับเอง ครบ 3 คนเมื่อไหร่ สควอดเริ่มนับขั้นด้วยกัน",
  /** The card title when there is no squad yet. */
  none: "👥 ยังไม่มีสควอด",
  noneHint: "ตั้งสควอดเล็กๆ กับเพื่อนได้ด้วย /squad new ไม่บังคับ",
  invited: (who: string) => `${who} จะเห็นคำชวนใน /inbox หรือ /squad view คำชวนอยู่ได้ 3 วัน`,
  /** One invite in /inbox. */
  inviteLine: (name: string, expiresAt?: string | null) =>
    `👥 มีคนชวนคุณเข้าสควอด **${safe(name, 60)}**${expiresAt ? ` (ตอบได้ถึง ${bkkDate(expiresAt)})` : ""}`,
  /** One invite on the /squad view invites card, under invitesTitle. */
  invitesTitle: "📨 คำชวนเข้าสควอด",
  inviteItem: (name: string, expiresAt?: string | null) =>
    `👥 **${safe(name, 60)}**${expiresAt ? ` · ตอบได้ถึง ${bkkDate(expiresAt)}` : ""}`,
  moreInvites: "ตอบ 2 คำชวนแรกก่อน คำชวนที่เหลือจะขึ้นมาให้ตอบต่อ",
  /** The squad's window: dates, then the days left while it is open. */
  window: (startsOn: string, endsOn: string, daysLeft?: number | null) =>
    `📅 ${bkkDate(startsOn)} ถึง ${bkkDate(endsOn)}${daysLeft ? ` · อีก **${daysLeft}** วัน` : ""}`,
  target: (target: string) => `🎯 เป้าที่ตั้งกันเอง: ${safe(target, 200)}`,
  /** Names only, already escaped and joined. */
  members: (names: string) => `👤 ${names}`,
  you: "คุณ",
  /** Fewer than 3 active members: no progress number yet, only who is in. */
  forming: (n: number) => `🌱 กำลังรวมคน ${stageBar(Math.min(n, 3), 3)} **${n}**/3 ครบ 3 คนเริ่มนับขั้นด้วยกัน`,
  inviteHint: "ชวนเพื่อนเพิ่มได้ด้วย /squad invite",
  together: (total: number) => `🌱 ทั้งสควอดโตไปแล้ว **${total}** ขั้นในรอบนี้`,
  ended: (total: number) => `🌳 รอบนี้จบแล้ว ทั้งสควอดโตไป **${total}** ขั้นด้วยกัน ขอบคุณที่ลงมือด้วยกัน`,
  /** A squad that ends below three members shows no number: it would be someone's own count. */
  endedQuiet: "🌳 รอบนี้จบแล้ว ขอบคุณที่ลงมือด้วยกัน",
  private: "เห็นเฉพาะคนในสควอด ไม่มีการจัดอันดับ",
  withdrawHint: "ถอนคำชวนที่ยังไม่ตอบได้ด้วย /squad withdraw",
  withdrawnTitle: "↩️ ถอนคำชวนแล้ว",
  withdrawn: (who: string) => `ไม่มีคำชวนค้างในกล่องข้อความของ ${who} แล้ว`,
  declined: "ปฏิเสธคำชวนเข้าสควอดแล้ว",
  btnView: "👥 ดูสควอด",
  btnLeave: "ออกจากสควอด",
  left: "🚪 ออกจากสควอดแล้ว",
  leftKeeps: "โปรเจกต์และต้นไม้ของคุณยังอยู่ครบ",
};

export interface SeasonUnlock {
  id: string;
  label: string;
  milestone_count: number;
  deadline: string;
  earned: boolean;
  /** Its deadline (Bangkok) has passed: the database's own clock. Wins over the date check below. */
  expired?: boolean;
  /** Still earnable today (Bangkok). When the database sends it, it wins over the date check below. */
  live?: boolean;
}

export interface SeasonView {
  name: string;
  demo_day: string;
  days_to_demo: number;
  table_bar: number;
  stage_bar: number;
  /** Counted milestones this season (submitted from the start to the end of demo day, approved). */
  stage_at_cutoff: number;
  /** Which milestones were counted: a table needs 2 among them, a stage slot needs 3. */
  season_milestones?: number[];
  qualifies: "stage" | "table" | null;
  /** Also counting work sent in the season that a mentor has not decided yet (never grants anything). */
  stage_with_pending?: number;
  qualifies_with_pending?: "stage" | "table" | null;
  goal: {
    milestone: number;
    target: number;
    count: number;
    deadline: string;
    unlock: string | null;
    reached: boolean;
    reached_at?: string | null;
  } | null;
  unlocks: SeasonUnlock[];
}

/** The milestone a gallery table needs among the counted ones, and the one a stage slot needs. */
export const TABLE_MILESTONE = 2;
export const STAGE_MILESTONE = 3;

/**
 * The student qualifies only with work a mentor has not decided yet. It was
 * sent in time, so review time never costs the slot; a decline would.
 */
export const PENDING_SLOT = {
  table: "⏳ รอพี่เลี้ยงยืนยันงานที่ส่งไว้ ถ้าผ่าน ได้โต๊ะโชว์งานใน Demo Day (ส่งทันกำหนดแล้ว ตรวจทีหลังก็ยังนับ)",
  stage: "⏳ รอพี่เลี้ยงยืนยันงานที่ส่งไว้ ถ้าผ่าน ได้ขึ้นเวทีใน Demo Day (ส่งทันกำหนดแล้ว ตรวจทีหลังก็ยังนับ)",
};

const SLOT_RANK = { stage: 2, table: 1 } as const;

/** The better slot that pending work would give, or null when it gives nothing more than the confirmed one. */
export function pendingSlot(season: Pick<SeasonView, "qualifies" | "qualifies_with_pending">): "stage" | "table" | null {
  const pending = season.qualifies_with_pending ?? null;
  if (!pending) return null;
  return SLOT_RANK[pending] > (season.qualifies ? SLOT_RANK[season.qualifies] : 0) ? pending : null;
}

/** Open to every builder below the bars; the bars decide only gallery tables and stage slots. */
export const WIP_CORNER = "🛠️ Demo Day มีมุมงานที่ยังทำอยู่ เปิดให้ทุกคน เอางานมาให้คนลองและรับฟีดแบ็กได้ ไม่ต้องรอถึงเกณฑ์";
/** The same corner in one small line, for the island card; the season details show WIP_CORNER. */
export const WIP_CORNER_SHORT = "🛠️ มุมงานที่ยังทำอยู่ใน Demo Day เปิดให้ทุกคน ไม่ต้องรอถึงเกณฑ์";

/**
 * Today in Bangkok as YYYY-MM-DD, taken from the database's own count
 * (demo day minus days to demo), so the bot never guesses the day boundary.
 */
export function seasonToday(season: Pick<SeasonView, "demo_day" | "days_to_demo">): string {
  const [y, m, d] = season.demo_day.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - season.days_to_demo)).toISOString().slice(0, 10);
}

/** Still earnable: the database's expired/live flag when it sends one, else the date against today. */
function stillOpen(u: SeasonUnlock, today: string): boolean {
  if (u.live !== undefined) return u.live;
  if (u.expired !== undefined) return !u.expired;
  return u.deadline.slice(0, 10) >= today;
}

/** The next unlock to aim for: the earliest one not yet earned whose deadline has not passed. */
export function nextUnlock(season: SeasonView): SeasonUnlock | undefined {
  const today = seasonToday(season);
  return season.unlocks
    .filter((u) => !u.earned && stillOpen(u, today))
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.milestone_count - b.milestone_count)[0];
}

/**
 * Steps still needed for a bar that also needs one particular milestone among
 * the counted ones: the bar's shortfall, or at least one step while that
 * milestone is missing (doing it counts toward the bar too).
 */
function stepsTo(season: SeasonView, bar: number, needed: number): { steps: number; missing: boolean } {
  const missing = Array.isArray(season.season_milestones) && !season.season_milestones.includes(needed);
  return { steps: Math.max(bar - season.stage_at_cutoff, missing ? 1 : 0), missing };
}

/** "Demo Day 15 พ.ค. (อีก 30 วัน)": the database's own day count, Bangkok dates. */
function seasonWhen(season: SeasonView): string {
  const days = season.days_to_demo;
  return `Demo Day ${bkkDate(season.demo_day)}${days > 0 ? ` (อีก ${days} วัน)` : days === 0 ? " (วันนี้!)" : ""}`;
}

/** The season's pieces, so the island card can show the headline and the details card the rest. */
export interface SeasonParts {
  /** "🎪 Season 1": the details card's title. */
  title: string;
  /** "Demo Day 15 พ.ค. (อีก 30 วัน)" */
  when: string;
  /** Where the student stands for Demo Day: a slot, one waiting for a mentor, or the steps still needed. */
  status: string[];
  /** Below the bars before Demo Day: the open work-in-progress corner (WIP_CORNER) applies. */
  wip: boolean;
  /** Unlocks earned and the next one to aim for, then the island's shared goal. */
  extras: string[];
}

/**
 * The season: a date, an audience, a shared goal. No ranking.
 * titleOf names a milestone for the "needs milestone 2 / 3" hint.
 */
export function seasonParts(
  season: SeasonView,
  goalTitle: string | null,
  titleOf: (milestone: number) => string | null = () => null
): SeasonParts {
  const status: string[] = [];
  const extras: string[] = [];
  let wip = false;
  const days = season.days_to_demo;
  const needs = (milestone: number) => ` (ต้องมีขั้น "${safe(titleOf(milestone) ?? String(milestone), 60)}" ด้วย)`;
  const pending = pendingSlot(season);
  if (season.qualifies === "stage") status.push("✅ ได้ขึ้นเวทีใน Demo Day แล้ว");
  else if (season.qualifies === "table") {
    const stage = stepsTo(season, season.stage_bar, STAGE_MILESTONE);
    if (pending === "stage") {
      status.push("✅ ได้โต๊ะโชว์งานใน Demo Day แล้ว", PENDING_SLOT.stage);
    } else if (days >= 0) {
      status.push(`✅ ได้โต๊ะโชว์งานแล้ว อีก ${stage.steps} ขั้นได้ขึ้นเวที${stage.missing ? needs(STAGE_MILESTONE) : ""}`);
    } else {
      status.push("✅ ได้โต๊ะโชว์งานใน Demo Day");
    }
  } else if (pending) {
    // Below the bars on approved work alone, at a bar once the work already sent is confirmed.
    status.push(PENDING_SLOT[pending]);
  } else if (days >= 0) {
    const table = stepsTo(season, season.table_bar, TABLE_MILESTONE);
    status.push(`อีก ${table.steps} ขั้น ได้โต๊ะโชว์งานใน Demo Day${table.missing ? needs(TABLE_MILESTONE) : ""}`);
    wip = true;
  }
  // Earned unlocks stay listed whatever their date; missed ones simply drop out.
  for (const u of season.unlocks.filter((x) => x.earned)) extras.push(`🎁 ปลดล็อกแล้ว: ${safe(u.label, 80)}`);
  const next = nextUnlock(season);
  if (next) extras.push(`🎁 ครบ ${next.milestone_count} ขั้นก่อน ${bkkDate(next.deadline)}: ${safe(next.label, 80)}`);
  if (season.goal) {
    const g = season.goal;
    extras.push(
      `🎯 ทั้งเกาะ: ${g.count}/${g.target} ต้นผ่านขั้น "${safe(goalTitle ?? String(g.milestone), 60)}"${
        g.reached ? " ถึงเป้าแล้ว!" : ` ก่อน ${bkkDate(g.deadline)}`
      }${g.unlock ? ` → ${safe(g.unlock, 80)}` : ""}`
    );
  }
  return { title: `🎪 ${safe(season.name, 60)}`, when: seasonWhen(season), status, wip, extras };
}

/** The season's one-line headline: "🎪 **Season 1**: Demo Day 15 พ.ค. (อีก 30 วัน)". */
export function seasonHead(season: SeasonView): string {
  return `🎪 **${safe(season.name, 60)}**: ${seasonWhen(season)}`;
}

/** Every season line in order: headline, status, work-in-progress corner, unlocks, goal. */
export function seasonLines(
  season: SeasonView,
  goalTitle: string | null,
  titleOf: (milestone: number) => string | null = () => null
): string[] {
  const p = seasonParts(season, goalTitle, titleOf);
  return [seasonHead(season), ...p.status, ...(p.wip ? [WIP_CORNER] : []), ...p.extras];
}
