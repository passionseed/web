/**
 * Choices shared by every career's Level 1.
 */
import type { GuideBlock } from "@/lib/radar-guide/guide-types";
import { answer, choice, host } from "./story";

/**
 * Tonight's closer: "when will you try it?". Every answer is fine; the reply
 * meets the student where they are. Saved as the choice `tonight:when`.
 * `nextTh`: what to try after tonight's step, for the student who goes tonight.
 */
export function whenChoice(nextTh: string): GuideBlock {
  return choice(
    "when",
    host("ว่าแต่เธอจะลองเมื่อไหร่ดี", { mood: "wink" }),
    answer("tonight", "คืนนี้เลยดิ", host("ชอบความไวนี้แฮะ", { mood: "wow" }), host(nextTh)),
    answer("weekend", "ขอเป็นวันหยุดละกัน", host("ดีลเลย ปักลงปฏิทินไว้เลย จะได้ไม่ลืม")),
    answer(
      "unsure",
      "ยังไม่ชัวร์เลยว่าจะชอบไหม",
      host("ไม่ชัวร์ก็ลองดูก่อนได้นะ"),
      host("ลองแล้วไม่สนุก ก็รู้ตัวก่อนเลือกคณะ ไม่เสียอะไรเลย", { mood: "wink" })
    )
  );
}
