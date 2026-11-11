import "server-only";

/**
 * Thai words for every refusal the quest database raises ('sq:<code>'), plus
 * the web island's own gate codes. Adapted from the bot's ERRORS
 * (bot/src/quests/copy.ts) for the web: no emoji, no markdown, no slash
 * commands. DRAFT COPY for the founder's Thai review.
 */

const GENERIC =
  "มีบางอย่างผิดพลาด ลองใหม่อีกครั้งได้ ถ้ายังไม่ได้ บอกทีมพี่เลี้ยงในห้องช่วยเหลือของเซิร์ฟเวอร์ SHIFT ได้เลย";
const UNAVAILABLE = "เกาะปิดปรับปรุงชั่วคราว งานและต้นไม้ของคุณยังอยู่ครบ ลองใหม่อีกครั้งในอีกสักครู่";

const ERRORS: Record<string, string> = {
  // Web gates (app/shift/island/actions.ts)
  invalid_input: "ข้อมูลยังไม่ครบหรือยาวเกินไป ตรวจอีกครั้งแล้วส่งใหม่ได้เลย",
  signed_out: "เข้าสู่ระบบด้วย Discord ที่ใช้ในเซิร์ฟเวอร์ SHIFT ก่อน แล้วลองอีกครั้ง",
  not_eligible:
    "บัญชี Discord นี้ยังเข้าเกาะไม่ได้ ถ้าคุณเป็นนักเรียน SHIFT High ทักทีมงานในห้องช่วยเหลือของเซิร์ฟเวอร์ได้เลย",
  discord_unavailable: "เช็กสิทธิ์กับ Discord ไม่ได้ตอนนี้ ลองใหม่อีกครั้งในอีกสักครู่",
  unavailable: UNAVAILABLE,
  not_configured: UNAVAILABLE,
  schema_outdated: UNAVAILABLE,
  db_error: UNAVAILABLE,
  unknown: GENERIC,

  // Students
  not_started: "กดเริ่มบนหน้าเกาะก่อน ใช้เวลาไม่ถึงนาที",
  not_authorized: "ส่วนนี้สำหรับทีมพี่เลี้ยงที่ได้รับสิทธิ์เท่านั้น",
  bad_input: "ข้อมูลไม่ถูกต้อง ลองใหม่อีกครั้ง",
  // Raised only by the bot's voice presence writers (migration 093000).
  invalid: "ข้อมูลไม่ถูกต้อง ลองใหม่อีกครั้ง",
  bad_route: "เลือกเส้นทางจากตัวเลือกที่มี",
  missing_text: "ยังขาดข้อความที่จำเป็น",
  text_too_long: "ข้อความยาวเกินไป ลองตัดให้สั้นลง",
  bad_url: "ลิงก์ต้องขึ้นต้นด้วย https://",
  not_found: "ไม่พบรายการนี้ หรือคุณไม่มีสิทธิ์ดู",
  stale_version: "มีการเปลี่ยนแปลงระหว่างนี้ รีเฟรชหน้าแล้วลองอีกที",
  stale_revision: "งานชิ้นนี้ถูกแก้ ถอน หรือรีวิวไปแล้ว รีเฟรชหน้าแล้วดูฉบับล่าสุด",
  bad_state: "ทำแบบนี้กับเควสต์ในสถานะนี้ไม่ได้",
  date_in_past: "วันที่ต้องเป็นวันนี้หรือหลังจากนี้",
  bad_date: "ใส่วันที่แบบ 2026-12-01",
  not_repeatable: "คุณมีงานนี้อยู่แล้ว ดูได้บนกระดานเควสต์",
  template_unavailable: "เควสต์นี้ปิดไปแล้ว",
  no_project: "ต้องมีโปรเจกต์ก่อน สร้างโปรเจกต์หรือรับคำชวนของเพื่อนได้บนหน้าเกาะ",
  not_project_member: "คุณไม่ได้อยู่ในโปรเจกต์นี้",
  invitee_not_started: "คนนี้ยังไม่ได้เริ่มเล่นบนเกาะ ให้เขากดเริ่มก่อน",
  already_member: "คนนี้อยู่ในโปรเจกต์หรือได้รับคำชวนแล้ว",
  no_invite: "ไม่มีคำชวนที่รออยู่แล้ว",
  contributor_not_teammate: "ใส่ได้เฉพาะเพื่อนร่วมทีมในโปรเจกต์นี้ที่เริ่มเล่นแล้ว",
  reason_required: "ขอเหตุผลสั้นๆ ว่าทำไมข้อนี้ไม่เกี่ยว",
  continuation_required: "ถ้างานอยู่ในบัญชีของพี่เลี้ยง บอกด้วยว่าจะทำต่อเองได้ยังไง",
  session_open: "มีเซสชันเปิดอยู่แล้ว จบเซสชันนั้นใน Discord ก่อน",
  no_session: "ไม่มีเซสชันที่เปิดอยู่",
  sharing_paused: "การแชร์สาธารณะปิดอยู่ตอนนี้ ไม่มีอะไรถูกโพสต์",
  appeal_used: "งานฉบับนี้อุทธรณ์ไปแล้ว ปรับแล้วส่งฉบับใหม่ หรือเริ่มเควสต์ต่อยอดได้",
  busy: "มีคนทำรายการเดียวกันพร้อมกันพอดี ลองกดอีกครั้งได้เลย",
  too_many_open: "ตอนนี้มีเรื่องที่รอคำตอบอยู่หลายเรื่องแล้ว รอให้เรื่องเดิมได้คำตอบก่อน แล้วค่อยส่งเรื่องใหม่",

  // Island and the quest board
  milestone_done: "โปรเจกต์นี้ผ่านขั้นนี้ไปแล้ว เลือกขั้นอื่นได้เลย",
  milestone_open:
    "โปรเจกต์นี้มีงานของขั้นนี้เปิดอยู่แล้ว (มีได้ทีละหนึ่งงานต่อขั้น) ดูบนกระดานเควสต์ว่าใครถืองานนี้อยู่ แล้วทำต่อหรือช่วยกันในงานนั้นได้เลย",
  milestone_appealed: "ขั้นนี้มีอุทธรณ์รอผลอยู่ ส่งใหม่ได้หลังรู้ผล ระหว่างนี้งานเดิมยังอยู่ครบ",
  quest_locked: "เควสต์นี้ยังล็อกอยู่ ทำเควสต์ที่ปลดล็อกมันให้ผ่านก่อน",
  quest_done: "โปรเจกต์นี้ผ่านเควสต์นี้แล้ว เลือกเควสต์อื่นได้เลย",
  quest_appealed: "เควสต์นี้มีอุทธรณ์รอผลอยู่ ส่งใหม่ได้หลังรู้ผล",

  // The SHIFT canvas link and quest cards (app/shift/island/actions.ts)
  canvas_unlinked: "ยังไม่ได้เชื่อมแคนวาส",
  canvas_gone: "หาแคนวาสที่เชื่อมไว้ไม่เจอ ลองเลือกใหม่",
  canvas_not_yours: "คุณยังไม่ได้อยู่ในทีมของแคนวาสนี้",
  notes_changed: "โน้ตในแคนวาสเพิ่งเปลี่ยน ดูการ์ดอีกครั้งแล้วค่อยส่ง",
  note_not_allowed: "โน้ตนี้ใช้กับเควสต์นี้ไม่ได้",
  canvas_unavailable: "โหลดโน้ตจากแคนวาสไม่ได้ตอนนี้ ลองอีกครั้งในอีกสักครู่",

  // Squads (off in Season 1)
  not_squad_member: "คุณไม่ได้อยู่ในสควอดนี้",
  squad_full: "สควอดนี้ครบ 4 คนแล้ว (นับคำชวนที่ยังไม่หมดอายุด้วย)",
  squad_limit: "คุณมีสควอดที่ยังไม่จบอยู่แล้ว ออกจากสควอดนั้นหรือรอให้จบก่อน",
  squad_closed: "สควอดนี้จบรอบไปแล้ว",
  staff_no_squad: "สควอดเป็นของนักเรียนเท่านั้น ทีมพี่เลี้ยงตั้ง เข้าร่วม หรือถูกชวนเข้าสควอดไม่ได้",
  squads_off: "สควอดยังไม่เปิดให้ใช้ตอนนี้ ระหว่างนี้ลงมือกับโปรเจกต์ของคุณบนเกาะได้ตามปกติ",

  // Coins and rewards (off in Season 1)
  rule_not_found: "ไม่พบกติกาเหรียญนี้",
  redemption_paused: "ยังแลกของไม่ได้ตอนนี้ เมื่อเปิด จะประกาศกติกาและของที่มีจริงให้ทราบก่อน",
  item_unavailable: "ของชิ้นนี้ไม่มีให้แลกแล้ว",
  out_of_stock: "ของหมดพอดี ยังไม่ได้หักเหรียญ",
  insufficient_balance: "เหรียญยังไม่พอ ยังไม่ได้หักเหรียญ",
  bad_amount: "จำนวนไม่ถูกต้อง",
  price_changed: "ราคาเปลี่ยนระหว่างนี้ ยังไม่ได้หักเหรียญ ดูราคาล่าสุดแล้วลองอีกครั้ง",
  awards_paused: "ระบบเหรียญปิดอยู่ตอนนี้",
  ledger_append_only: "บันทึกเหรียญแก้ย้อนหลังไม่ได้",

  // Staff (reviews and admin happen in Discord; kept so no refusal falls back to the generic line)
  feedback_required: "ขอข้อความบอกนักเรียนว่าควรทำอะไรต่อ",
  conflict_of_interest: "คุณรีวิวงานนี้ไม่ได้ เพราะเป็นงานของคุณเอง ของทีมคุณ หรือคุณมีส่วนร่วม",
  appeal_needs_other_reviewer: "อุทธรณ์นี้ต้องให้ผู้รีวิวคนอื่นพิจารณา",
  config_incomplete: "ยังเปิดไม่ได้ ตั้งค่ายังไม่ครบ",
  last_admin: "ต้องมีแอดมินอย่างน้อยหนึ่งคน",
  admin_exists: "มีแอดมินแล้ว",
  reminder_time_required: "เลือกวันและเวลาก่อน",
  bad_dates:
    "วันที่ของซีซันไม่ถูกต้อง: ซีซันใหม่ต้องมีวันเริ่ม วันจบ และ Demo Day ครบ วันจบต้องไม่ก่อนวันเริ่ม และ Demo Day ต้องอยู่ในช่วงซีซัน",
  unlock_has_grants:
    "มีคนได้ของปลดล็อกนี้ไปแล้ว จึงแก้ได้แค่ให้ง่ายขึ้น (ลดจำนวนขั้นหรือเลื่อนวันออกไป) และเปลี่ยนกติกาเหรียญไม่ได้",
  recognition_cap: "คำชมของคนนี้ในซีซันนี้ครบเพดานที่ตั้งไว้แล้ว ยังไม่ได้บันทึกอะไร",
};

/** Thai, user-facing words for a refusal code; an unknown code gets the generic line. */
export function questErrorText(code: string): string {
  return Object.hasOwn(ERRORS, code) ? ERRORS[code] : GENERIC;
}

/** False for a code with no words of its own (it would show the generic line). */
export function hasQuestErrorText(code: string): boolean {
  return Object.hasOwn(ERRORS, code);
}
