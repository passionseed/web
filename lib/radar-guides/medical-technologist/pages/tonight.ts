/**
 * Level 3 · tonight. One evening at the kitchen table: turn a phone into a
 * magnifier with one drop of water (f.mt-water-drop), run a blind test (a
 * family member labels salt and sugar A and B), look, photograph, and write a
 * lab note. The habits are the work level's: label every sample, write down
 * what could fool you, never taste a sample. The note never leaves the device.
 *
 * Safety: kitchen items only. No blood, saliva or anything from the body, no
 * tasting, a small drop on the lens glass only, and an adult for any knife.
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

const DROP = "f.mt-water-drop" as const;
const DROP_URL = "https://www.scientificamerican.com/blog/compound-eye/transform-your-iphone-into-a-microscope-just-add-water/" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ เปิดแล็บบนโต๊ะ",
  questionTh: "คืนนี้ทำอะไรได้บ้าง ทำจบแล้วได้ผลงานชิ้นแรกใส่แฟ้มเลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [DROP, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้เปลี่ยนมือถือเป็นกล้องส่อง แล้วจดบันทึกแบบคนแล็บ" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่เล่นแค่ในจอนะ เป็นภารกิจจริงคืนนี้เลย", { mood: "wow" }),
      host("มาเปลี่ยนมือถือเป็นกล้องส่องของจิ๋ว ใช้น้ำแค่หยดเดียวพอ")
    ),
    item(
      "tool",
      "intel",
      "หยดน้ำบนเลนส์กล้องหลังมือถือแล้วคว่ำเครื่องลง หยดน้ำจะกลายเป็นเลนส์ขยาย พอน้ำเริ่มระเหย ภาพก็จะขยายน้อยลง",
      { title: "เครื่องมือ: เลนส์หยดน้ำ", facts: [DROP] }
    ),
    {
      kind: "safety",
      id: "kitchen-only",
      lineTh:
        "ส่องแค่ของในครัว อย่างเกลือ น้ำตาล หรือเยื่อบางๆ ของหัวหอม ห้ามชิม ห้ามใช้เลือด น้ำลาย หรืออะไรจากร่างกายเด็ดขาด ใช้น้ำหยดเล็กๆ แค่บนกระจกเลนส์ แล้วเช็ดให้แห้งทุกครั้ง ถ้าต้องใช้มีด ให้ผู้ใหญ่ช่วย",
    },
    {
      kind: "game",
      id: "labnote",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "แล็บบนโต๊ะ · เลนส์หยดน้ำ",
            href: DROP_URL,
            badgeTh: "ใช้มือถือกับน้ำหยดเดียว ของในครัวเท่านั้น",
            subTh: "น้ำไม่ดีกับมือถือ ใช้หยดเล็กๆ แค่บนกระจกเลนส์ แล้ววางมือถือให้นิ่ง",
            factIds: [DROP],
          },
          checklistTh: [
            "ให้คนในบ้านตักเกลือกับน้ำตาลใส่ช้อนสองคัน ติดป้าย A กับ B โดยไม่บอกว่าอันไหนเป็นอะไร",
            "หยดน้ำเล็กๆ บนเลนส์กล้องหลัง แล้วคว่ำมือถือลงเหนือช้อน",
            "ส่องทีละช้อน ถ่ายรูปเก็บไว้ ห้ามชิมเด็ดขาด",
            "ทายว่า A กับ B อันไหนเป็นอะไร แล้วค่อยขอเฉลย",
            "จดบันทึกแล็บสั้นๆ",
          ],
          fields: [
            { id: "sample", placeholderTh: "ตัวอย่างคืออะไร ติดป้ายว่าอะไร" },
            { id: "prep", placeholderTh: "เตรียมยังไง ส่องยังไง" },
            { id: "saw", placeholderTh: "เห็นอะไร A กับ B ต่างกันตรงไหน" },
            { id: "fooled", placeholderTh: "มีอะไรหลอกตาไหม (ฟองอากาศ ฝุ่น รอยนิ้ว)" },
            { id: "better", placeholderTh: "ทายถูกไหม ถ้าจะให้แม่นขึ้นจะทำอะไรเพิ่ม" },
          ],
          fixedLinesTh: ["ใช้ของในครัวเท่านั้น ไม่ชิม ไม่ใช้อะไรจากร่างกาย"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งออกไปที่ไหนเลย",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "หยดน้ำเล็กๆ บนเลนส์กล้องหลังมือถือ แล้วคว่ำลงเหนือตัวอย่าง",
        "ให้คนในบ้านติดป้ายเกลือกับน้ำตาลเป็น A กับ B แล้วทายด้วยการส่อง ห้ามชิม",
        "ถ่ายรูป แล้วจดว่าเห็นอะไร อะไรหลอกตา ทายถูกไหม",
        "เขียนบันทึกแล็บ: ตัวอย่าง วิธีเตรียม สิ่งที่เห็น สิ่งที่หลอกตา จะทำให้แม่นขึ้นยังไง",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "labnote.check-0" },
        { at: 1200, action: "type", target: "labnote.field-sample", text: "เกลือกับน้ำตาล ติดป้าย A กับ B" },
        { at: 3200, action: "type", target: "labnote.field-fooled", text: "ฟองอากาศในหยดน้ำ ดูเหมือนผลึก" },
        { at: 5200, action: "tap", target: "labnote.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ทีเด็ดคืนนี้ไม่ใช่รูปสวยนะ แต่คือบันทึกว่าเธอทำยังไง"),
      host("ติดป้ายตัวอย่าง จดสิ่งที่หลอกตา ฟีลเดียวกับตอนคัดหลอดเลย", { mood: "wink" }),
      host("ทีมเราว่าช่องสุดท้าย: จะทำให้แม่นขึ้นยังไง สำคัญสุดเลย", { labels: ["teamView"] })
    ),
    dialogue("folio", host("บันทึกแล็บกับรูปที่ถ่าย นี่แหละชิ้นงานแรกในแฟ้มของเธอเลย", { mood: "wink" })),
    roundOneTeaser(),
    whenChoice("ทำเสร็จแล้ว พรุ่งนี้ลองยืมกล้องจุลทรรศน์ห้องแล็บโรงเรียนส่องต่อดูดิ"),
  ],
};
