/**
 * Level 4 · tonight. One evening with Google's Teachable Machine (no account,
 * no log-in, trains in the browser): teach a model to tell look-alike objects
 * apart, test it on photos it has never seen (other backgrounds, light,
 * angles, a friend's hands), and write up where it failed. The write-up is the
 * eval from the work level, and it never leaves the device.
 *
 * Minors: objects only, no faces; don't save to Google Drive (that needs a
 * Google account), download instead.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item, sys } from "../../_shared/story";

const TM = "f.ai-teachable-machine" as const;
const TM_URL = "https://teachablemachine.withgoogle.com/train" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 4,
  titleTh: "คืนนี้ สอน AI แล้วสอบมัน",
  questionTh: "คืนนี้ทำอะไรได้บ้าง ที่จบแล้วได้ผลงานชิ้นแรกใส่พอร์ตเลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-18",
  minutes: 1,
  factIds: [TM],
  og: { headlineTh: "คืนนี้มาสอน AI แยกของ แล้วจับผิดให้ได้ว่ามันพลาดตรงไหน" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นในจอ เป็นภารกิจจริงคืนนี้", { mood: "wow" }),
      host("สอน AI แยกของ แล้วสอบมันแบบที่เธอเพิ่งตรวจบอทไปเลย")
    ),
    item(
      "tool",
      "intel",
      "Teachable Machine ของ Google สอน AI แยกรูป เสียง หรือท่าทางได้ในเบราว์เซอร์ ไม่ต้องเขียนโค้ด ไม่ต้องสร้างบัญชี มีหน้าภาษาไทยด้วย",
      { title: "เครื่องมือ: Teachable Machine", facts: [TM] }
    ),
    {
      kind: "safety",
      id: "objects-only",
      lineTh:
        "ถ่ายเฉพาะรูปสิ่งของนะ ไม่ถ่ายหน้าตัวเองหรือเพื่อน แล้วไม่ต้องกดเซฟลง Google Drive ถ้าอยากเก็บไว้ให้ดาวน์โหลดลงเครื่องเลย",
    },
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "Teachable Machine · Image Project",
            href: TM_URL,
            badgeTh: "ไม่ต้องสร้างบัญชี ตาม FAQ ของ Google ณ 18 พ.ย. 2569",
            subTh: "ตอนสอน รูปทั้งหมดจะอยู่แค่ในเบราว์เซอร์ของเธอ ไม่ถูกส่งขึ้นเซิร์ฟเวอร์",
            factIds: [TM],
          },
          checklistTh: [
            "ลองเลือกของที่หน้าตาคล้ายๆ กัน เช่น ขวดพลาสติกกับกระป๋อง",
            "ถ่ายรูปของแต่ละอย่างมาสอน (ถ่ายแค่ของ ไม่เอาหน้าคนนะ)",
            "กด Train แล้วเอาของชิ้นใหม่ที่มันไม่เคยเห็นมาลองทายดู",
            "ลองเปลี่ยนพื้นหลัง แสง มุม หรือให้เพื่อนถือของมาให้ทาย แล้วจดว่าถูกหรือพลาด",
            "เขียนสรุปสั้นๆ",
          ],
          fields: [
            { id: "goal", placeholderTh: "สอนให้แยกอะไรบ้าง" },
            { id: "data", placeholderTh: "เก็บรูปแบบไหนมาสอน" },
            { id: "test", placeholderTh: "สอบด้วยรูปใหม่ ถูกกี่รูป จากกี่รูป" },
            { id: "failed", placeholderTh: "พลาดตอนไหน (พื้นหลัง แสง มุม)" },
            { id: "fix", placeholderTh: "ถ้าจะทำให้ดีขึ้น จะเพิ่มรูปแบบไหน" },
          ],
          fixedLinesTh: ["ใช้รูปสิ่งของเท่านั้น ไม่มีหน้าคน"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "เปิด Teachable Machine แล้วเลือก Image Project (ไม่ต้องสร้างบัญชี)",
        "สอนให้แยกของที่หน้าตาคล้ายกัน ใช้รูปสิ่งของเท่านั้น",
        "สอบด้วยรูปใหม่ เปลี่ยนพื้นหลัง แสง มุม แล้วจดว่าถูกหรือพลาด",
        "เขียนสรุป: สอนอะไร เก็บรูปแบบไหน สอบได้เท่าไหร่ พลาดตอนไหน จะแก้ยังไง",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-goal", text: "แยกขวดพลาสติกกับกระป๋อง" },
        { at: 3200, action: "type", target: "writeup.field-failed", text: "พอวางบนโต๊ะสีเข้ม มันทายผิดเกือบหมด" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ของที่มีค่าที่สุดคืนนี้ไม่ใช่โมเดล แต่คือตารางว่ามันพลาดตรงไหน"),
      host("เพราะนั่นคืองานเดียวกับที่เธอเพิ่งลุยไปในด่านตรวจบอทเลย", { mood: "wink" }),
      host("ทีมเราว่าช่องสุดท้าย จะแก้ยังไง สำคัญสุดเลย อย่าข้ามนะ", { labels: ["teamView"] })
    ),
    dialogue(
      "callback",
      host("ถ้าเริ่มสนุก พรุ่งนี้ลองสอนให้มันแยกเสียงต่อดูสิ"),
      host("ถ้าไม่สนุก ก็แค่รู้ตัวก่อนเลือกคณะ ไม่เสียหายอะไรเลย"),
      sys("เก็บ write-up กับรูปตารางผลใส่แฟ้มผลงานได้เลย")
    ),
  ],
};
