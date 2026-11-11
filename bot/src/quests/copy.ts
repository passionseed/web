/**
 * Every word the SHIFT High quest bot says, in one place for review.
 *
 * Thai first (students are Thai high schoolers). House rules from AGENTS.md:
 * no em dashes, never talk down, no ed-tech jargon, no unconfirmed promises
 * about rewards. Have the Thai checked by several reviewers before a pilot.
 */
import { escapeMarkdown } from "discord.js";

/**
 * Escapes a student's text for display and caps its length. Mention syntax is
 * broken up too: allowedMentions already stops pings, this stops look-alikes.
 */
export function safe(text: string | null | undefined, max = 300): string {
  if (!text) return "";
  const clipped = text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return escapeMarkdown(clipped)
    .replace(/@(everyone|here)/g, "@\u200b$1")
    .replace(/<([@#&])/g, "<\u200b$1");
}

export function clip(text: string, max = 1900): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function bkkDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" });
}

export const STATE: Record<string, string> = {
  active: "กำลังทำ",
  paused: "พักไว้",
  submitted: "รอรีวิว",
  clarification: "ขอข้อมูลเพิ่ม",
  approved: "ผ่านแล้ว",
  declined: "ยังไม่ผ่าน",
  appealed: "อุทธรณ์อยู่",
  archived: "เก็บแล้ว",
};

export const ROUTE: Record<string, string> = {
  software: "ซอฟต์แวร์",
  creative: "งานสร้างสรรค์",
  service: "บริการ",
  other: "อื่นๆ",
};

export const OWNERSHIP_ITEM: Record<string, { label: string; hint: string }> = {
  access: {
    label: "เข้าถึงงานได้เอง",
    hint: "คุณเข้าบัญชีหรือที่เก็บงานได้เอง และกู้คืนได้โดยไม่ต้องพึ่งพี่เลี้ยงคนเดียว",
  },
  export: { label: "สำรองหรือส่งออกได้", hint: "มีสำเนางาน และรู้ว่าจะทำต่อหลังจบแคมป์ยังไง" },
  team: { label: "ทีมตกลงกันแล้ว", hint: "ใครทำอะไร ตัดสินใจกันยังไง และถ้ามีคนออกจะเป็นยังไง" },
  costs: { label: "ค่าใช้จ่ายและสิทธิ์", hint: "รู้ค่าใช้จ่าย ข้อจำกัด และสิทธิ์ใช้โค้ด ภาพ เพลง หรือของอื่นๆ ที่ใช้" },
  portability: { label: "ย้ายไปทำที่อื่นได้", hint: "ลองย้ายจริง และรู้ว่ามีส่วนไหนที่ยังย้ายไม่ได้" },
};

export const OWNERSHIP_STATE: Record<string, string> = {
  not_checked: "ยังไม่ได้เช็ก",
  demonstrated: "ทำได้แล้ว",
  needs_help: "ต้องการความช่วยเหลือ",
  not_applicable: "ไม่เกี่ยว (มีเหตุผล)",
};

export const T = {
  generic: "มีบางอย่างผิดพลาด ลองใหม่อีกครั้งได้ ถ้ายังไม่ได้ บอกทีมพี่เลี้ยงในห้อง help ได้เลย",
  notEligible:
    "ตอนนี้ SHIFT High quests เปิดให้เฉพาะกลุ่มนำร่อง ถ้าคิดว่าควรได้ใช้ ถามทีมพี่เลี้ยงในห้อง help ได้เลย",
  pilotClosed: "ตอนนี้ SHIFT High quests ยังไม่เปิดให้ใช้",
  notStarted: "เริ่มด้วย /start ก่อนนะ ใช้เวลาไม่ถึงนาที",
  staffOnly: "คำสั่งนี้สำหรับทีมพี่เลี้ยงที่ได้รับสิทธิ์เท่านั้น",
  done: "เรียบร้อย",
  cancelled: "ยกเลิกแล้ว ไม่มีอะไรถูกบันทึกหรือโพสต์",

  intro: (coins: boolean) =>
    [
      "## SHIFT High quests",
      "คุณสร้างของที่มีคุณค่าได้ตั้งแต่ตอนนี้ เลือกเรื่องที่คุณใส่ใจ ทำกับคนที่พร้อมช่วย แล้วส่งให้คนจริงได้ลองใช้ จะเป็นเครื่องมือที่มีประโยชน์ เกมที่คนอยากกลับมาเล่น เรื่องที่เชื่อมคน หรือบริการที่แก้ปัญหาจริงก็ได้",
      "",
      "**ตกลงกันก่อน**",
      "• ทุกอย่างสมัครใจ พัก ปรับ หรือเปลี่ยนเควสต์ได้ทุกเมื่อ ไม่มีการหักอะไร",
      "• บันทึกความคืบหน้าเป็นส่วนตัวเป็นค่าเริ่มต้น จะโพสต์อะไร ต้องให้คุณดูตัวอย่างและกดยืนยันก่อนเสมอ",
      "• เควสต์ไม่นับเวลาในห้องเสียงหรือการแชร์จอ และไม่บันทึกเสียงหรือภาพหน้าจอ",
      "• ติดตรงไหน ใช้ /help ได้ตลอด ไม่ต้องใช้เหรียญ",
      coins
        ? "• Passioncoin ได้จากงานที่ผ่านการรีวิวตามกติกาที่ประกาศไว้ ดูกติกาและยอดของคุณได้ที่ /coins"
        : "• ระบบ Passioncoin ยังไม่เปิด ตอนนี้ยังไม่มีการให้เหรียญ",
      "• ดู ส่งออก หรือขอลบข้อมูลของคุณได้ที่ /data",
    ].join("\n"),
  startButton: "เริ่มเลย",
  started: [
    "เริ่มแล้ว ยินดีต้อนรับสู่เกาะ SHIFT 🏝️",
    "• ทุกโปรเจกต์คือต้นไม้หนึ่งต้นบนเกาะ โตได้ 7 ขั้นจากงานจริงที่พี่เลี้ยงยืนยัน",
    "• จับจองที่ดิน (สร้างโปรเจกต์) หรือรอเพื่อนชวนเข้าทีมก็ได้",
    "• ทุกอย่างอยู่ที่ /island ที่เดียว",
    "ยังไม่มีไอเดียที่ขัดเกลามาแล้วก็ไม่เป็นไร ขั้นแรกคือเลือกเรื่องที่คุณใส่ใจ",
  ].join("\n"),
  btnIsland: "🏝️ ไปที่เกาะ",
  btnNewProject: "🌱 จับจองที่ดิน",
  btnBrowse: "ดูเควสต์",
  btnPropose: "เสนอเควสต์เอง",

  // Projects
  projectNewTitle: "สร้างโปรเจกต์",
  projectName: "ชื่อโปรเจกต์",
  projectRoute: "เส้นทาง",
  projectAmbition: "อยากให้มันทำอะไรให้ใคร (ไม่บังคับ)",
  projectCreated: (name: string) => `สร้าง **${safe(name, 80)}** แล้ว และตั้งเป็นโปรเจกต์ปัจจุบัน ชวนเพื่อนร่วมทีมด้วย /project invite`,
  projectNone: "ยังไม่มีโปรเจกต์ สร้างได้ด้วย /project new",
  projectPick: "เลือกโปรเจกต์ที่จะทำตอนนี้",
  projectSwitched: "เปลี่ยนโปรเจกต์ปัจจุบันแล้ว",
  projectInvited: (who: string) => `ส่งคำชวนให้ ${who} แล้ว เขาจะเห็นใน /inbox และต้องกดตอบรับเอง`,
  projectJoined: "เข้าร่วมโปรเจกต์แล้ว",
  projectDeclined: "ปฏิเสธคำชวนแล้ว",
  projectLeft: "ออกจากโปรเจกต์แล้ว",
  projectLeaveConfirm: (name: string) => `ออกจาก **${safe(name, 80)}** ใช่ไหม บันทึกส่วนตัวของคุณยังอยู่`,
  btnLeave: "ออกจากโปรเจกต์",
  btnAccept: "ตอบรับ",
  btnDecline: "ปฏิเสธ",
  btnCancel: "ยกเลิก",
  ownershipIntro:
    "เช็กลิสต์ความเป็นเจ้าของ: ช่วยให้คุณทำงานนี้ต่อได้เองหลังจบแคมป์ ข้อไหนติด เลือก \"ต้องการความช่วยเหลือ\" แล้วทีมพี่เลี้ยงจะเห็นในคิว ห้ามส่งรหัสผ่าน โทเคน หรือภาพหน้าจอบัญชีส่วนตัว",
  ownershipPick: "เลือกข้อที่จะอัปเดต",
  ownershipNote: "เล่าสั้นๆ (ไม่ต้องใส่รหัสผ่านหรือข้อมูลบัญชี)",
  ownershipMentorHeld: "งานอยู่ในบัญชีที่พี่เลี้ยงถือ",
  ownershipContinuation: "ถ้าใช่ จะทำต่อเองได้ยังไง",
  ownershipSaved: "บันทึกแล้ว",
  ownershipHelp: "บันทึกแล้ว และส่งเรื่องไปที่คิวของทีมพี่เลี้ยงแล้ว ดูสถานะได้ที่ /help",
  ownershipUpdateTitle: "อัปเดตเช็กลิสต์",

  // Quests
  browseIntro: "เควสต์เหล่านี้เป็นตัวอย่าง ไม่ต้องทำตามลำดับ เลือกที่เข้ากับคุณ",
  browsePick: "เลือกเควสต์เพื่อดูรายละเอียด",
  rewardNone: "ยังไม่มีเหรียญสำหรับเควสต์นี้",
  rewardLine: (amount: number, cap: number | null) =>
    `รีวิวผ่านได้ ${amount} Passioncoin${cap ? ` (สูงสุด ${cap} ครั้งต่อคน)` : ""}`,
  btnChoose: "เลือกเควสต์นี้",
  alreadyTaken: "คุณมีงานนี้อยู่แล้ว ดูได้ใน /island กด 📋 งานที่ส่งไว้",
  chooseTitle: "ตั้งเป้าของคุณ",
  goal: "เป้าหมายของคุณ",
  nextStep: "ก้าวถัดไปที่ทำได้เลย",
  criteria: "จะรู้ได้ยังไงว่าเสร็จ (หลักฐานที่ตกลงกัน)",
  reviewDate: "วันที่อยากให้รีวิว (ไม่บังคับ เช่น 2026-12-01)",
  chosen: (title: string) =>
    `เริ่ม **${safe(title, 80)}** แล้ว จะพัก ปรับเป้า หรือเปลี่ยนเมื่อไหร่ก็ได้ ใน /island กด 📋 งานที่ส่งไว้`,
  proposeTitle: "เสนอเควสต์ของคุณ",
  proposeName: "ชื่อเควสต์",
  proposeWhy: "ทำไมเรื่องนี้สำคัญกับคุณ",
  proposed:
    "บันทึกเควสต์แล้ว เริ่มทำได้เลย ถ้าอยากให้เควสต์นี้ได้เหรียญ ทีมพี่เลี้ยงจะตกลงขอบเขตและหลักฐานกับคุณก่อนส่งงาน",
  statusEmpty: "ยังไม่มีงานที่เปิดอยู่ ถึงขั้นไหนแล้ว กด 🌟 ถึงขั้นต่อไปแล้ว ใน /island ได้เลย",
  statusPick: "เลือกเควสต์",
  overdue: "เลยวันที่ตั้งไว้แล้ว ไม่เป็นไร ปรับวัน ลดขนาด ขอความช่วยเหลือ หรือพักไว้ก่อนก็ได้",
  btnSubmit: "ส่งงาน",
  btnResize: "ปรับเป้า",
  btnPause: "พักไว้",
  btnResume: "ทำต่อ",
  btnWithdraw: "ถอนการส่ง",
  btnAppeal: "ขออุทธรณ์",
  btnArchive: "เก็บเควสต์",
  btnHelp: "ขอความช่วยเหลือ",
  btnCelebrate: "แชร์ความสำเร็จ",
  resizeTitle: "ปรับเป้า",
  clearDate: "ล้างวันที่ (พิมพ์ - เพื่อล้าง)",
  updated: "อัปเดตแล้ว",
  paused: "พักเควสต์ไว้แล้ว กลับมาทำต่อเมื่อไหร่ก็ได้",
  resumed: "กลับมาทำต่อแล้ว",
  archived: "เก็บเควสต์แล้ว",
  withdrawn: "ถอนการส่งแล้ว แก้ไขแล้วส่งใหม่ได้",
  submitTitle: "ส่งงาน",
  submitPreview: "ตัวอย่างงานที่จะส่ง (ยังไม่ได้ส่ง):",
  evidence: "ทำอะไรไปแล้ว (หลักฐานตามที่ตกลง)",
  evidenceHint: "สรุปแบบไม่ระบุตัวตนคนที่ทดสอบ ห้ามแนบข้อมูลลูกค้า รหัสผ่าน หรือโทเคน",
  reflection: "สะท้อนคิด",
  artifact: "ลิงก์งาน (ไม่บังคับ, https://)",
  myPart: "ส่วนที่คุณทำ (ถ้าทำเป็นทีม)",
  teammates: "เพื่อนร่วมทีมที่ร่วมทำ (เขาจะยืนยันส่วนของตัวเอง)",
  visibility: "ใครเห็นงานนี้",
  visReviewers: "ทีมรีวิวเท่านั้น",
  visTeam: "ทีมรีวิวและเพื่อนร่วมทีม",
  submitted: (rev: number) =>
    `ส่งงานแล้ว (ครั้งที่ ${rev}) ระหว่างรอรีวิว ถ้าแก้ไขแล้วส่งใหม่ ครั้งเก่าจะถูกแทนที่ ผลรีวิวจะแจ้งใน /inbox`,
  appealTitle: "ขออุทธรณ์",
  appealReason: "อยากให้พิจารณาอะไรใหม่",
  appealed: "ส่งอุทธรณ์แล้ว ผู้รีวิวคนอื่นจะเป็นคนพิจารณา",
  contributionTitle: "ยืนยันส่วนที่คุณทำ",
  contributionText: "คุณทำส่วนไหน",
  contributionDone: "ยืนยันแล้ว ขอบคุณ",
  contributionDeclined: "แจ้งแล้วว่าคุณไม่ได้มีส่วนในงานนี้",

  // Journal, coworking, help
  progressTitle: "บันทึกความคืบหน้า",
  changed: "อะไรเปลี่ยนไป",
  learned: "ได้เรียนรู้อะไร",
  nextStepShort: "ก้าวถัดไป",
  blocker: "ติดตรงไหน (ไม่บังคับ)",
  progressSaved: "บันทึกแล้ว (ส่วนตัว เห็นแค่คุณ)",
  btnShareTeam: "แชร์ให้ทีมเห็น",
  btnMakePrivate: "เปลี่ยนเป็นส่วนตัว",
  btnSendBlocker: "ส่งเรื่องที่ติดไปขอความช่วยเหลือ",
  progressShared: "แชร์ให้เพื่อนร่วมทีมเห็นแล้ว",
  progressPrivate: "เปลี่ยนเป็นส่วนตัวแล้ว",
  progressEmpty: "ยังไม่มีบันทึก เพิ่มโน้ตสั้นๆ ได้ใน /island กด 🔨 วันนี้ทำต่อ",
  progressTeamEmpty: "ยังไม่มีใครในทีมแชร์บันทึก",
  progressPick: "เลือกบันทึกที่จะแก้",
  workStarted: "เริ่มแล้ว ทำในห้องเสียงหรือทำที่ไหนก็ได้ เสร็จแล้วใช้ /work end เพื่อสะท้อนสั้นๆ",
  workEnded: (intention: string) =>
    `จบเซสชัน "${safe(intention, 120)}" แล้ว อยากเก็บสิ่งที่ได้ไว้ ใน /island กด 🔨 วันนี้ทำต่อ แล้วเพิ่มโน้ตสั้นๆ ได้`,
  sharePreview: "ตัวอย่างโพสต์ (ยังไม่ได้โพสต์):",
  btnPost: "โพสต์",
  sharePosted: "ส่งโพสต์แล้ว จะขึ้นในห้องภายในไม่กี่วินาที",
  shareAwaitingPeer: "ส่งให้เพื่อนดูก่อนแล้ว จะโพสต์เมื่อเขากดตอบรับเท่านั้น",
  sharePaused: "การแชร์สาธารณะปิดอยู่ตอนนี้ ไม่มีอะไรถูกโพสต์",
  helpTitle: "ขอความช่วยเหลือ",
  helpSummary: "ติดอะไร อยากได้ความช่วยเหลือแบบไหน",
  helpVisibility: "ส่งไปที่ไหน",
  helpCommunity: "ห้อง help ของชุมชน (ทุกคนช่วยได้)",
  helpMentors: "ทีมพี่เลี้ยงเท่านั้น",
  helpSent: (community: boolean) =>
    community
      ? "ส่งไปที่ห้อง help แล้ว เพื่อนในชุมชนและพี่เลี้ยงจะเห็น"
      : "ส่งให้ทีมพี่เลี้ยงแล้ว เขาจะตอบในห้องกลุ่ม ไม่ใช่ทางแชทส่วนตัว",
  helpMine: "คำขอของคุณ",
  helpNone: "ไม่มีคำขอที่เปิดอยู่",
  btnNewHelp: "ขอความช่วยเหลือใหม่",
  btnWithdrawHelp: "ปิดคำขอ",
  celebrateTitle: "แชร์ความสำเร็จ",
  celebrateBody: "อยากบอกอะไร (เล่าสิ่งที่เกิดขึ้นจริง)",
  recognizeBody: "เพื่อนช่วยอะไร หรือทำอะไรที่น่าชื่นชม",

  // Inbox
  inboxEmpty: "ไม่มีอะไรใหม่",
  inboxTitle: "กล่องข้อความของคุณ (เห็นแค่คุณ)",
  recognitionAsk: (from: string, body: string) =>
    `${safe(from, 60)} อยากชื่นชมคุณในห้องสาธารณะ: "${safe(body, 300)}" จะให้โพสต์ไหม`,
  contributionAsk: (owner: string, title: string) =>
    `${safe(owner, 60)} ใส่ชื่อคุณในงาน **${safe(title, 80)}** ยืนยันส่วนที่คุณทำ หรือบอกว่าไม่ได้มีส่วนก็ได้`,
  inviteAsk: (from: string, name: string) => `${safe(from, 60)} ชวนคุณเข้าโปรเจกต์ **${safe(name, 80)}**`,
  btnConfirmPart: "ยืนยันส่วนของฉัน",
  btnNotMine: "ฉันไม่ได้มีส่วน",

  // Coins and rewards
  coinsBalance: (balance: number, reserved: number) =>
    `ยอด Passioncoin: **${balance}**${reserved ? ` (จองแลกของอยู่ ${reserved})` : ""}`,
  coinsRules: "เหรียญไม่ได้วัดความสามารถหรือคุณค่าของคุณ ได้จากงานที่รีวิวผ่านตามกติกาที่ประกาศไว้เท่านั้น",
  coinsOff: "ระบบเหรียญยังไม่เปิดหรือพักอยู่ ยอดเดิมของคุณยังอยู่ครบ",
  coinsEmpty: "ยังไม่มีรายการ",
  rewardsOff: "ยังแลกของไม่ได้ตอนนี้ เมื่อเปิด จะประกาศกติกาและของที่มีจริงให้ทราบก่อน",
  rewardsPick: "เลือกของที่อยากแลก",
  rewardsPreview: (name: string, cost: number, balance: number) =>
    `แลก **${safe(name, 80)}** ใช้ ${cost} เหรียญ ยอดตอนนี้ ${balance} หลังแลกเหลือ ${balance - cost}\nข้อมูลการจัดส่ง (ถ้ามี) ให้ผู้ปกครองเป็นคนกรอก ตามขั้นตอนที่ทีมประกาศในห้องกลุ่ม อย่าพิมพ์ที่อยู่ในแชท ทีมจะไม่ขอทาง DM ถ้ามีใครทักมาขอ อย่าให้ แล้วบอกทีมในห้องกลุ่ม`,
  btnRedeem: "ยืนยันแลก",
  redeemed: "จองแล้ว ทีมจะดำเนินการต่อ ดูสถานะได้ที่ /rewards ยกเลิกได้ระหว่างที่ยังไม่เริ่มดำเนินการ",
  redeemDuplicate: "คำขอนี้ส่งไปแล้ว",
  redeemCancelled: "ยกเลิกแล้ว คืนเหรียญเรียบร้อย",
  btnCancelRedeem: "ยกเลิกคำขอ",
  redemptionStatus: {
    reserved: "จองแล้ว",
    processing: "กำลังดำเนินการ",
    completed: "เสร็จแล้ว",
    cancelled: "ยกเลิกแล้ว",
  } as Record<string, string>,

  // Settings and data
  settingsTitle: "การตั้งค่า (เห็นแค่คุณ)",
  remindersOn: (days: string, hour: number) => `การเตือน: เปิด ทุก${days} เวลา ${hour}:00 น.`,
  remindersOff: "การเตือน: ปิด",
  dmOn: "แจ้งทาง DM เมื่อมีอัปเดต: เปิด (ข้อความสั้นๆ ไม่มีรายละเอียด)",
  dmOff: "แจ้งทาง DM เมื่อมีอัปเดต: ปิด",
  btnRemindersOn: "ตั้งการเตือน",
  btnRemindersOff: "ปิดการเตือน",
  btnDmOn: "เปิดแจ้งทาง DM",
  btnDmOff: "ปิดแจ้งทาง DM",
  remindersTitle: "ตั้งการเตือน",
  remindersDays: "วัน",
  remindersHour: "เวลา (เวลาไทย)",
  remindersPaused: "หมายเหตุ: ทีมปิดการเตือนทั้งระบบไว้ชั่วคราว",
  dataTitle: "ข้อมูลของคุณ",
  dataBody:
    "เราเก็บเฉพาะสิ่งที่คุณบันทึกในบอทนี้ ไม่เก็บข้อความแชท เสียง หรือหน้าจอ คุณส่งออกข้อมูลได้ทันที และขอแก้ไขหรือลบได้ ทีมจะดำเนินการตามนโยบายที่ประกาศไว้",
  btnExport: "ส่งออกข้อมูลของฉัน",
  btnCorrection: "ขอแก้ไขข้อมูล",
  btnErasure: "ขอลบข้อมูล",
  exportReady: "ไฟล์ข้อมูลของคุณ (เห็นแค่คุณ)",
  correctionTitle: "ขอแก้ไขข้อมูล",
  correctionNote: "อยากแก้อะไร",
  erasureConfirm:
    "ขอลบข้อมูลใช่ไหม ทีมจะลบบันทึกและข้อความของคุณ และตัดการเชื่อมกับบัญชี Discord ยอดเหรียญที่ผูกกับรหัสไม่ระบุตัวตนจะคงไว้เพื่อให้บัญชีรวมถูกต้อง",
  btnConfirmErasure: "ยืนยันขอลบ",
  requestSent: "ส่งคำขอแล้ว ทีมจะติดต่อกลับผ่าน /inbox",

  // Reminders and nudges (DM: broadcast only, never a conversation)
  dmNudge:
    "มีอัปเดตใหม่ใน SHIFT High quests ดูได้ด้วย /inbox ในเซิร์ฟเวอร์ (บอทนี้ไม่อ่านหรือตอบข้อความส่วนตัว)",
  dmReminder: (open: number) =>
    `ถึงเวลาที่คุณตั้งไว้แล้ว${open ? ` มีเควสต์เปิดอยู่ ${open} อัน` : ""} เริ่มด้วย /work start ในเซิร์ฟเวอร์ได้เลย ปิดการเตือนได้ที่ /settings (บอทนี้ไม่อ่านหรือตอบข้อความส่วนตัว)`,
};

export const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const ERRORS: Record<string, string> = {
  not_started: T.notStarted,
  not_authorized: T.staffOnly,
  bad_input: "ข้อมูลไม่ถูกต้อง ลองใหม่อีกครั้ง",
  bad_route: "เลือกเส้นทางจากตัวเลือกที่มี",
  missing_text: "ยังขาดข้อความที่จำเป็น",
  text_too_long: "ข้อความยาวเกินไป ลองตัดให้สั้นลง",
  bad_url: "ลิงก์ต้องขึ้นต้นด้วย https://",
  not_found: "ไม่พบรายการนี้ หรือคุณไม่มีสิทธิ์ดู",
  stale_version: "มีการเปลี่ยนแปลงระหว่างนี้ เปิดใหม่อีกครั้งแล้วลองอีกที",
  stale_revision: "งานชิ้นนี้ถูกแก้ ถอน หรือรีวิวไปแล้ว เปิดคิวใหม่แล้วดูฉบับล่าสุด",
  bad_state: "ทำแบบนี้กับเควสต์ในสถานะนี้ไม่ได้",
  date_in_past: "วันที่ต้องเป็นวันนี้หรือหลังจากนี้",
  bad_date: "ใส่วันที่แบบ 2026-12-01",
  not_repeatable: T.alreadyTaken,
  template_unavailable: "เควสต์นี้ปิดไปแล้ว",
  no_project: "ต้องมีโปรเจกต์ปัจจุบันก่อน สร้างหรือเลือกได้ที่ /project",
  not_project_member: "คุณไม่ได้อยู่ในโปรเจกต์นี้",
  invitee_not_started: "คนนี้ยังไม่ได้เริ่มใช้บอท ให้เขาใช้ /start ก่อน",
  already_member: "คนนี้อยู่ในโปรเจกต์หรือได้รับคำชวนแล้ว",
  no_invite: "ไม่มีคำชวนที่รออยู่",
  contributor_not_teammate: "ใส่ได้เฉพาะเพื่อนร่วมทีมในโปรเจกต์นี้ที่เริ่มใช้บอทแล้ว",
  reason_required: "ขอเหตุผลสั้นๆ ว่าทำไมข้อนี้ไม่เกี่ยว",
  continuation_required: "ถ้างานอยู่ในบัญชีของพี่เลี้ยง บอกด้วยว่าจะทำต่อเองได้ยังไง",
  session_open: "มีเซสชันเปิดอยู่แล้ว จบด้วย /work end ก่อน",
  no_session: "ไม่มีเซสชันที่เปิดอยู่",
  sharing_paused: T.sharePaused,
  feedback_required: "ขอข้อความบอกนักเรียนว่าควรทำอะไรต่อ",
  conflict_of_interest: "คุณรีวิวงานนี้ไม่ได้ เพราะเป็นงานของคุณเอง ของทีมคุณ หรือคุณมีส่วนร่วม",
  appeal_needs_other_reviewer: "อุทธรณ์นี้ต้องให้ผู้รีวิวคนอื่นพิจารณา",
  rule_not_found: "ไม่พบกติกาเหรียญนี้",
  redemption_paused: T.rewardsOff,
  item_unavailable: "ของชิ้นนี้ไม่มีให้แลกแล้ว",
  out_of_stock: "ของหมดพอดี ยังไม่ได้หักเหรียญ",
  insufficient_balance: "เหรียญยังไม่พอ ยังไม่ได้หักเหรียญ",
  bad_amount: "จำนวนไม่ถูกต้อง",
  config_incomplete: "ยังเปิดไม่ได้ ตั้งค่ายังไม่ครบ",
  last_admin: "ต้องมีแอดมินอย่างน้อยหนึ่งคน",
  admin_exists: "มีแอดมินแล้ว",
  reminder_time_required: "เลือกวันและเวลาก่อน",
  appeal_used: "งานฉบับนี้อุทธรณ์ไปแล้ว ปรับแล้วส่งฉบับใหม่ หรือเริ่มเควสต์ต่อยอดได้",
  price_changed: "ราคาเปลี่ยนระหว่างนี้ ยังไม่ได้หักเหรียญ เปิด /rewards ใหม่แล้วดูราคาล่าสุด",
  busy: "มีคนทำรายการเดียวกันพร้อมกันพอดี ลองกดอีกครั้งได้เลย",
  // Island and seasons
  milestone_done: "โปรเจกต์นี้ผ่านขั้นนี้ไปแล้ว เลือกขั้นอื่นได้เลย",
  // Also raised by shift_quest_choose and shift_quest_appeal, where the open quest may be the caller's own.
  milestone_open:
    "โปรเจกต์นี้มีงานของขั้นนี้เปิดอยู่แล้ว (มีได้ทีละหนึ่งงานต่อขั้น) ดูใน /island ว่าใครถืองานนี้อยู่ แล้วทำต่อหรือช่วยกันในงานนั้นได้เลย",
  milestone_appealed: "ขั้นนี้มีอุทธรณ์รอผลอยู่ ส่งใหม่ได้หลังรู้ผล ระหว่างนี้งานเดิมยังอยู่ครบ",
  awards_paused: "ระบบเหรียญปิดอยู่ตอนนี้ ชื่นชมแบบไม่มีเหรียญ (0) ได้",
  bad_dates:
    "วันที่ของซีซันไม่ถูกต้อง: ซีซันใหม่ต้องมีวันเริ่ม วันจบ และ Demo Day ครบ วันจบต้องไม่ก่อนวันเริ่ม และ Demo Day ต้องอยู่ในช่วงซีซัน",
  unlock_has_grants:
    "มีคนได้ของปลดล็อกนี้ไปแล้ว จึงแก้ได้แค่ให้ง่ายขึ้น (ลดจำนวนขั้นหรือเลื่อนวันออกไป) และเปลี่ยนกติกาเหรียญไม่ได้ ถ้าอยากได้ของแบบใหม่ ตั้งเป็นของปลดล็อกอีกชิ้น",
  recognition_cap:
    "ยังไม่ได้บันทึกอะไร: คำชมแบบเซอร์ไพรส์ (ไม่ใส่หมวด) ของคนนี้ในซีซันนี้ครบเพดานที่ตั้งไว้แล้ว หรือเหรียญจากคำชมทั้งหมดในซีซันนี้จะเกิน 200 รางวัลตามหมวดไม่นับในเพดานจำนวนครั้ง ถ้าติดที่เหรียญ ลองลดเหรียญลง ปรับเพดานคำชมเซอร์ไพรส์ได้ที่ /admin season surprise_cap",
  not_squad_member: "คุณไม่ได้อยู่ในสควอดนี้",
  squad_full: "สควอดนี้ครบ 4 คนแล้ว (นับคำชวนที่ยังไม่หมดอายุด้วย)",
  squad_limit: "คุณมีสควอดที่ยังไม่จบอยู่แล้ว ออกจากสควอดนั้นหรือรอให้จบก่อน",
  squad_closed: "สควอดนี้จบรอบไปแล้ว",
  staff_no_squad: "สควอดเป็นของนักเรียนเท่านั้น ทีมพี่เลี้ยงตั้ง เข้าร่วม หรือถูกชวนเข้าสควอดไม่ได้",
  squads_off: "สควอดยังไม่เปิดให้ใช้ตอนนี้ ระหว่างนี้ลงมือกับโปรเจกต์ของคุณบน /island ได้ตามปกติ",
};

export function errorText(code: string): string {
  return ERRORS[code] ?? T.generic;
}

/** False for a code with no Thai words yet: the error reply then shows the code itself. */
export function hasErrorText(code: string): boolean {
  return Object.hasOwn(ERRORS, code);
}

/** Blocker keys from shift_quest__blockers(), for admins. */
export const BLOCKER: Record<string, string> = {
  reward_terms: "ยังไม่ได้ประกาศกติกาเหรียญ (/admin terms reward_terms)",
  reward_rule: "ยังไม่มีกติกาเหรียญที่เผยแพร่ (/admin rule)",
  awards_enabled: "ต้องเปิดการให้เหรียญก่อน",
  redemption_terms: "ยังไม่มีเงื่อนไขการแลก (/admin terms redemption_terms)",
  fulfillment_process: "ยังไม่มีขั้นตอนจัดส่งที่ผู้ปกครองเป็นคนกรอกข้อมูล (/admin terms fulfillment_process)",
  fulfillment_owner: "ยังไม่ได้ระบุผู้รับผิดชอบจัดส่ง (/admin terms fulfillment_owner)",
  fulfillment_role: "ยังไม่มีใครมีบทบาท fulfillment (/admin role)",
  catalog_item: "ยังไม่มีของที่เปิดให้แลกและมีสต็อก (/admin catalog-add)",
  celebrate_channel: "ยังไม่ได้ตั้งห้องสำหรับโพสต์ (/admin channel celebrate)",
};

// ---------------------------------------------------------------------------
// Outbox (channel posts and DMs) and inbox (private notices)
// ---------------------------------------------------------------------------

export interface OutboxRender {
  content: string;
  mentionUserIds: string[];
}

const mention = (id: string | null | undefined) => (id ? `<@${id}>` : "ใครบางคน");

/** Renders a queued message. Returns null for an unknown kind (it fails permanently). */
export function renderOutbox(
  kind: string,
  params: Record<string, any>,
  memberUserId: string | null,
  peerUserId: string | null
): OutboxRender | null {
  const m = mention(memberUserId);
  const users = [memberUserId, peerUserId].filter((x): x is string => Boolean(x));
  switch (kind) {
    case "review_needed":
      return {
        content: `📝 ${params.appeal ? "อุทธรณ์ใหม่" : "งานรอรีวิว"}: **${safe(params.title, 80)}** (ครั้งที่ ${params.revision}) เปิดด้วย /review queue`,
        mentionUserIds: [],
      };
    case "proposal_needs_agreement":
      return {
        content: `🧭 มีเควสต์ที่นักเรียนเสนอ: **${safe(params.title, 80)}** ตกลงขอบเขตและเหรียญได้ที่ /review queue`,
        mentionUserIds: [],
      };
    case "help_mentors":
      return {
        content: clip(
          params.source === "ownership"
            ? `🔑 ${m} ติดเรื่องความเป็นเจ้าของงาน (${OWNERSHIP_ITEM[params.item]?.label ?? "เช็กลิสต์"}) ดูที่ /review help`
            : `🙋 ${m} ขอความช่วยเหลือจากทีมพี่เลี้ยง: ${safe(params.summary, 600)}\nรับเรื่องได้ที่ /review help`
        ),
        mentionUserIds: users,
      };
    case "help_community":
      return {
        content: clip(`🙋 ${m} ขอความช่วยเหลือ: ${safe(params.summary, 900)}\nใครช่วยได้ ตอบในห้องนี้ได้เลย`),
        mentionUserIds: users,
      };
    case "celebration":
      return {
        content: clip(`🎉 ${m}${params.title ? ` ผ่านเควสต์ **${safe(params.title, 80)}**` : ""}\n${safe(params.body, 900)}`),
        mentionUserIds: users,
      };
    case "recognition":
      return {
        content: clip(`🙌 ${m} ขอบคุณ ${mention(peerUserId)}\n${safe(params.body, 900)}`),
        mentionUserIds: users,
      };
    case "intention":
      return { content: clip(`🔨 ${m} กำลังทำ: ${safe(params.body, 300)}`), mentionUserIds: users };
    case "redemption_requested":
      return {
        content: `🎁 มีคำขอแลก **${safe(params.item, 80)}** ดำเนินการได้ที่ /fulfill`,
        mentionUserIds: [],
      };
    case "data_request":
      return {
        content: `🔒 มีคำขอ${params.kind === "erasure" ? "ลบ" : "แก้ไข"}ข้อมูลใหม่ ดูที่ /admin data`,
        mentionUserIds: [],
      };
    case "nudge":
      return { content: T.dmNudge, mentionUserIds: [] };
    case "reminder":
      return { content: T.dmReminder(Number(params.open_quests ?? 0)), mentionUserIds: [] };
    case "island_weekly":
      // The image and any opt-in names come from shift_quest_island_post_map() at send time.
      return {
        content:
          `🏝️ เกาะ SHIFT High สัปดาห์นี้` +
          (params.goal_target ? `\nเป้าหมายของเกาะ: ${Number(params.goal_count ?? 0)} จาก ${Number(params.goal_target)} โปรเจกต์` : ""),
        mentionUserIds: [],
      };
    default:
      return null;
  }
}

const AWARD_REASON: Record<string, string> = {
  awards_paused: "ระบบเหรียญพักอยู่ตอนรีวิว จึงยังไม่มีเหรียญสำหรับงานนี้",
  no_reward_rule: "เควสต์นี้ไม่มีเหรียญตอนที่คุณเลือก",
  reward_not_agreed: "เควสต์ที่เสนอเองนี้ยังไม่ได้ตกลงเรื่องเหรียญก่อนส่งงาน",
  distinct_not_confirmed: "เป็นเควสต์ซ้ำ ผู้รีวิวยังไม่ได้ยืนยันว่าเรียนรู้ต่างจากครั้งก่อน",
  contributions_pending: "รอเพื่อนร่วมทีมยืนยันส่วนที่ทำก่อน",
  team_allocation_missing: "ยังไม่มีกติกาแบ่งเหรียญสำหรับงานทีม ทีมกำลังตัดสินใจ",
  cap_reached: "ครบจำนวนครั้งสูงสุดของกติกานี้แล้ว",
  split_too_small: "แบ่งแล้วได้น้อยกว่า 1 เหรียญ",
};

export function awardReason(code: string | null | undefined): string {
  return code ? AWARD_REASON[code] ?? code : "";
}

export function renderInbox(kind: string, p: Record<string, any>): string {
  switch (kind) {
    case "review_approved": {
      const award = p.award as { issued?: boolean; amount?: number; reason?: string } | null;
      const coins = award?.issued
        ? ` ได้ ${award.amount} Passioncoin`
        : award?.reason
          ? ` (${awardReason(award.reason)})`
          : "";
      return `✅ **${safe(p.title, 80)}** ผ่านแล้ว${coins}${p.feedback ? `\nความเห็น: ${safe(p.feedback, 500)}` : ""}\nอยากแชร์ให้คนอื่นเห็นไหม ใช้ /celebrate ได้ (ไม่บังคับ ดูตัวอย่างก่อนโพสต์เสมอ)`;
    }
    case "review_clarification":
      return `💬 **${safe(p.title, 80)}** ขอข้อมูลเพิ่ม: ${safe(p.feedback, 600)}\nแก้แล้วส่งใหม่ได้ใน /island กด 🌟 แล้วเลือกขั้นเดิม (งานอื่นอยู่ใน 📋 งานที่ส่งไว้)`;
    case "review_declined":
      return `↩️ **${safe(p.title, 80)}** ยังไม่ผ่าน: ${safe(p.feedback, 600)}\nขออุทธรณ์ ปรับใหม่ หรือเก็บงานไว้ได้ใน /island กด 📋 งานที่ส่งไว้ ไม่มีการหักอะไร`;
    case "award_issued":
      return `🪙 ได้ ${p.amount} Passioncoin จาก **${safe(p.title, 80)}**`;
    case "reversal":
      return `🪙 มีการปรับคืน ${p.amount} Passioncoin เหตุผล: ${safe(p.reason, 300)} ถ้าไม่เห็นด้วย ใช้ /help ส่งถึงทีมพี่เลี้ยงได้`;
    case "project_invite":
      return `👋 ${safe(p.from, 60)} ชวนคุณเข้าโปรเจกต์ **${safe(p.project_name, 80)}**`;
    case "contribution_requested":
      return `🤝 ${safe(p.from, 60)} ใส่ชื่อคุณในงาน **${safe(p.title, 80)}** ยืนยันส่วนที่คุณทำด้านล่าง`;
    case "recognition_request":
      return `🙌 ${safe(p.from, 60)} อยากชื่นชมคุณในห้องสาธารณะ ตอบด้านล่าง`;
    case "proposal_agreed":
      return `🧭 ทีมพี่เลี้ยงตกลงขอบเขตเควสต์ **${safe(p.title, 80)}** แล้ว${p.amount ? ` ผ่านรีวิวได้ ${p.amount} Passioncoin` : " (ไม่มีเหรียญ)"}${p.note ? `\nหมายเหตุ: ${safe(p.note, 400)}` : ""}`;
    case "help_claim":
      return `🙋 ${safe(p.by, 60)} รับเรื่อง "${safe(p.summary, 120)}" แล้ว จะตอบในห้องกลุ่ม`;
    case "help_resolve":
      return `✅ ปิดเรื่อง "${safe(p.summary, 120)}" แล้ว${p.note ? `: ${safe(p.note, 400)}` : ""}`;
    case "redemption_start":
      return `🎁 กำลังดำเนินการ **${safe(p.item, 80)}**`;
    case "redemption_complete":
      return `🎁 **${safe(p.item, 80)}** เสร็จเรียบร้อย`;
    case "redemption_cancel":
      return `🎁 ยกเลิกคำขอ **${safe(p.item, 80)}** และคืนเหรียญแล้ว${p.note ? ` (${safe(p.note, 200)})` : ""}`;
    case "unlock_earned":
      return `🎁 โปรเจกต์ของคุณถึงเป้าแล้ว ได้ **${safe(p.label, 80)}**${p.amount ? ` และ ${p.amount} Passioncoin` : ""}`;
    case "recognized":
      // The reason is what the admin was told the student sees (stored up to 500 characters).
      return `🌟 ทีมพี่เลี้ยงชื่นชมงานของคุณ${p.category ? ` (${safe(p.category, 80)})` : ""}${p.reason ? `: ${safe(p.reason, 500)}` : ""}${p.amount ? ` พร้อม ${p.amount} Passioncoin` : ""}`;
    case "squad_invite":
      return `🤝 ${p.from ? safe(p.from, 60) : "เพื่อน"} ชวนคุณเข้าสควอด **${safe(p.name, 80)}** ตอบรับหรือปฏิเสธได้`;
    default:
      return "มีอัปเดตใหม่";
  }
}
