import type { LessonCanvasStatus, LessonWatchReason } from "@/lib/elemental/web/learn-actions";

/**
 * Labels on /hackathon/island/learn. Functional placeholders: every Thai line
 * waits for a native review before the event ([TH-REVIEW]). No marketing
 * copy and no em dashes. Lesson titles, parts and prompts come from
 * lib/elemental/web/lessons.ts.
 */
export const LEARN_COPY = {
  // [TH-REVIEW] page title of the lesson list (browser tab and heading).
  listTitle: "บทเรียน Elemental",
  // [TH-REVIEW] one line under the heading: how a lesson works.
  listLede: "ดูคลิปทีละช่วง ตอบคำถามท้ายช่วง แล้วช่วงถัดไปจะเปิด",
  // [TH-REVIEW] there are no lessons yet.
  listEmpty: "ยังไม่มีบทเรียน",
  // [TH-REVIEW] a lesson card: how many parts it has.
  partsCount: (n: number) => `${n} ช่วง`,
  // [TH-REVIEW] a lesson card: the viewer finished it.
  statusFinished: "จบแล้ว",
  // [TH-REVIEW] a lesson card: parts answered so far, of all parts with a question.
  statusProgress: (done: number, total: number) => `ตอบแล้ว ${done} จาก ${total}`,
  // [TH-REVIEW] a lesson card: not started.
  statusNew: "ยังไม่เริ่ม",
  // [TH-REVIEW] link back from a lesson to the list.
  backToList: "บทเรียนทั้งหมด",
  // [TH-REVIEW] link from the lesson list to the island picture.
  toIsland: "ดูเกาะ",

  // [TH-REVIEW] "part 2 of 4" above the clip.
  partOf: (part: number, total: number) => `ช่วงที่ ${part} จาก ${total}`,
  // [TH-REVIEW] heading over the list of a lesson's parts.
  partsHeading: "ช่วงในบทเรียนนี้",
  // [TH-REVIEW] a part in the list: answered.
  partDone: "ตอบแล้ว",
  // [TH-REVIEW] a part in the list: the one to do now.
  partCurrent: "ทำอยู่",
  // [TH-REVIEW] a part in the list: locked until the part before is answered.
  partLocked: "ล็อกอยู่",
  // [TH-REVIEW] the next-part button while the stop is unanswered.
  nextLocked: "ตอบช่วงนี้ก่อน แล้วช่วงถัดไปจะเปิด",
  // [TH-REVIEW] button: go to the next part.
  nextPart: "ช่วงถัดไป",
  // [TH-REVIEW] button: go to the previous part.
  prevPart: "ช่วงก่อนหน้า",
  // [TH-REVIEW] iframe title for a clip.
  clipTitle: (title: string) => `คลิป: ${title}`,
  // [TH-REVIEW] placeholder where a clip is not picked yet.
  clipTodo: "คลิปของช่วงนี้กำลังจะมา",

  // [TH-REVIEW] a stop's label: a written question.
  stopQuestion: "ตอบคำถาม",
  // [TH-REVIEW] a stop's label: pick one.
  stopChoice: "เลือกหนึ่งข้อ",
  // [TH-REVIEW] a stop's label: try it now (the answer goes on the team canvas).
  stopDoItNow: "ลองทำตอนนี้",
  // [TH-REVIEW] under a do-it-now stop: where the answer goes.
  doItNowHint: "คำตอบนี้จะขึ้นเป็นโน้ตบนแคนวาสโปรเจกต์ของทีม",
  // [TH-REVIEW] characters used of the limit.
  charCount: (used: number, max: number) => `${used}/${max}`,
  // [TH-REVIEW] button: save the answer.
  save: "บันทึกคำตอบ",
  // [TH-REVIEW] button: save a changed answer again.
  saveAgain: "บันทึกคำตอบใหม่",
  // [TH-REVIEW] button while saving.
  saving: "กำลังบันทึก…",
  // [TH-REVIEW] button on a last part without a question: finish the lesson.
  finish: "จบบทเรียน",
  // [TH-REVIEW] after a save: the part's answer is stored.
  saved: (part: number) => `บันทึกช่วงที่ ${part} แล้ว`,

  // [TH-REVIEW] the answer is empty, too long, or not one of the choices.
  errorBadAnswer: "คำตอบนี้บันทึกไม่ได้ ลองเขียนใหม่ให้สั้นลง หรือเลือกหนึ่งข้อ",
  // [TH-REVIEW] the answer holds a contact. Never shows what matched.
  errorPii: "คำตอบมีช่องทางติดต่อ เช่น เบอร์ อีเมล ลิงก์ หรือไอดี ลบออกแล้วบันทึกใหม่",
  // [TH-REVIEW] the part cannot be saved yet (an earlier part is unanswered) or the lesson is unknown.
  errorBadPart: "ยังบันทึกช่วงนี้ไม่ได้ ตอบช่วงก่อนหน้าให้ครบก่อน",
  // [TH-REVIEW] the database is down: try again.
  errorUnavailable: "ตอนนี้บันทึกไม่ได้ ลองใหม่อีกครั้งในอีกสักครู่",

  // [TH-REVIEW] do-it-now note: on the team canvas (open boards show it after a reload).
  canvasWritten: "ขึ้นแคนวาสของทีมแล้ว ถ้าเปิดบอร์ดค้างไว้ให้รีโหลดก่อน",
  // [TH-REVIEW] do-it-now note: the team has no linked project canvas yet.
  canvasNotLinked: "บันทึกแล้ว แต่ทีมยังไม่ได้ลิงก์แคนวาสโปรเจกต์ ใช้ /canvas link ใน Discord",
  // [TH-REVIEW] do-it-now note: saved, but the note did not reach the canvas.
  canvasFailed: "บันทึกแล้ว แต่ยังส่งขึ้นแคนวาสไม่ได้ แจ้งสตาฟในห้องทีมบน Discord ได้",

  // [TH-REVIEW] finish screen heading.
  finishedTitle: "จบบทเรียนนี้แล้ว",
  // [TH-REVIEW] finish screen: this save earned the team the lesson badge.
  badgeAwarded: "ทีมได้ตราของบทเรียนนี้บนเกาะแล้ว",
  // [TH-REVIEW] finish screen: the team already had the badge.
  badgeKept: "ตราของบทเรียนนี้อยู่บนเกาะของทีมแล้ว",
  // [TH-REVIEW] banner on a lesson the viewer finished before.
  finishedBefore: "คุณจบบทเรียนนี้แล้ว ดูซ้ำหรือแก้คำตอบได้",
  // [TH-REVIEW] finish screen button: watch the lesson again.
  watchAgain: "ดูบทเรียนอีกครั้ง",

  // [TH-REVIEW] mode label: answers are not saved.
  watchOnly: "ดูอย่างเดียว",
  // [TH-REVIEW] mode label: answers are saved.
  saveMode: "บันทึกคำตอบให้ทีมได้",
  // [TH-REVIEW] watch mode: under a stop, why there is no form.
  watchStopNote: "โหมดดูอย่างเดียว คำตอบจะยังไม่ถูกบันทึก",
  // [TH-REVIEW] button: sign in with Discord.
  signIn: "เข้าสู่ระบบด้วย Discord",
  // [TH-REVIEW] button: switch to the Discord account.
  switchToDiscord: "เปลี่ยนเป็นบัญชี Discord",
  // [TH-REVIEW] button while the Discord page opens.
  signingIn: "กำลังเปิด Discord…",
  // [TH-REVIEW] Discord sign-in failed.
  signInFailed: "เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้งได้เลย",
} as const;

/** Why the viewer can only watch, one line each. [TH-REVIEW] every line. */
export const WATCH_REASON_COPY: Record<LessonWatchReason, string> = {
  // [TH-REVIEW] signed out.
  signed_out: "เข้าสู่ระบบด้วย Discord ที่ใช้ในงาน เพื่อบันทึกคำตอบให้ทีม",
  // [TH-REVIEW] signed in without Discord.
  no_discord: "บัญชีนี้ไม่ได้เชื่อม Discord เข้าสู่ระบบด้วย Discord ที่ใช้ในงาน เพื่อบันทึกคำตอบ",
  // [TH-REVIEW] Discord account has not claimed a code.
  not_claimed: "ใช้ /join กับโค้ดของคุณใน Discord ของงานก่อน แล้วกลับมาที่หน้านี้",
  // [TH-REVIEW] claimed but on no live team.
  no_team: "เข้าทีมใน Discord ก่อน แล้วคำตอบจะบันทึกให้ทีมได้",
  // [TH-REVIEW] the database is down.
  unavailable: "ตอนนี้บันทึกคำตอบไม่ได้ ดูคลิปไปก่อนได้",
};

export const CANVAS_COPY: Record<Exclude<LessonCanvasStatus, "none">, string> = {
  written: LEARN_COPY.canvasWritten,
  not_linked: LEARN_COPY.canvasNotLinked,
  failed: LEARN_COPY.canvasFailed,
};
