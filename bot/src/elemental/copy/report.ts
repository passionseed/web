/**
 * /report copy. Functional placeholders only: every Thai line waits for a
 * native review before the event ([TH-REVIEW]). The reporter's text is never
 * part of this file and never goes anywhere but the staff-only #reports
 * channel.
 *
 * Who follows up is a decision, not copy: Angpao is the report contact
 * (company-brain decisions/log.md, 2026-11-20), together with a second staff
 * member who holds the Safety role.
 */
export const REPORT = {
  // [TH-REVIEW] /report command description (max 100 characters).
  commandDescription: "แจ้งเรื่องที่ไม่โอเคให้ทีมงานดูแลรู้ (เห็นเฉพาะทีมงานดูแล)",

  // [TH-REVIEW] modal title (max 45 characters).
  modalTitle: "แจ้งทีมงานดูแล",
  // [TH-REVIEW] note above the fields: only Safety staff see it, no names needed.
  modalNote: "เฉพาะทีมงานดูแลเท่านั้นที่เห็นเรื่องนี้ ไม่ต้องใส่ชื่อใครก็ได้",
  // [TH-REVIEW] required field label (max 45 characters).
  textLabel: "เกิดอะไรขึ้น",
  // [TH-REVIEW] required field placeholder (max 100 characters).
  textPlaceholder: "เล่าสั้น ๆ ว่าเกิดอะไรขึ้น",
  // [TH-REVIEW] optional field label (max 45 characters).
  whereLabel: "ที่ไหน (ไม่ใส่ก็ได้)",
  // [TH-REVIEW] optional field placeholder: a channel name or a message link.
  wherePlaceholder: "ชื่อช่อง หรือลิงก์ข้อความ",

  // [TH-REVIEW] ephemeral answer to the reporter: received; Angpao follows up in the group space or with the parent.
  received: "ได้รับเรื่องแล้ว ขอบคุณที่บอกเรา Angpao จะติดตามเรื่องนี้ในพื้นที่ของกลุ่ม หรือกับผู้ปกครองของคุณ",
  // [TH-REVIEW] saved in the database but the staff channel could not be reached: send the same text again soon.
  savedNotPosted: "บันทึกเรื่องแล้ว แต่ยังส่งถึงทีมงานดูแลไม่ได้ ส่งข้อความเดิมอีกครั้งในอีกสักครู่ หรือบอกทีมงานในช่องของกลุ่ม",
  // [TH-REVIEW] the "what happened" field was empty after trimming.
  emptyText: "ช่วยเล่าสั้น ๆ ว่าเกิดอะไรขึ้น แล้วส่งอีกครั้ง",
  // [TH-REVIEW] more than 10 reports in an hour from one person.
  rateLimited: "ส่งหลายเรื่องในชั่วโมงนี้แล้ว ถ้าเร่งด่วนให้บอกทีมงานในช่องของกลุ่ม",

  // --- The staff-only #reports post (Safety reads these). ---
  // [TH-REVIEW] post title.
  postTitle: "เรื่องที่แจ้งเข้ามาใหม่",
  // [TH-REVIEW] field: who sent it (a mention, never pinged).
  fieldReporter: "ผู้แจ้ง",
  // [TH-REVIEW] field: the channel where /report was used.
  fieldFrom: "ใช้ /report จาก",
  // [TH-REVIEW] field: the optional "where" the reporter typed.
  fieldWhere: "ที่ไหน",
  // [TH-REVIEW] shown when the reporter left "where" empty.
  noWhere: "ไม่ได้ระบุ",
  // [TH-REVIEW] the 'Handled' button (max 80 characters).
  handledButton: "ดูแลแล้ว",
  // [TH-REVIEW] the post line once a Safety member pressed Handled; {who} is a mention, never pinged.
  handledBy: (who: string) => `ดูแลแล้วโดย ${who}`,
  // [TH-REVIEW] ephemeral line when someone else had already pressed Handled.
  alreadyHandled: "เรื่องนี้มีคนกดดูแลแล้ว",
  // [TH-REVIEW] the button points at a report the database does not know.
  notFound: "ไม่พบเรื่องนี้",
} as const;
