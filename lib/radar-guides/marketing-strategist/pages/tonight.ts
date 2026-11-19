/**
 * Level 3 · tonight. One evening, free, no account: pick a real shop near
 * school, count the students who stop by after school, ask 3 friends why they
 * do or don't, and write a one-page plan to bring in 10 more with ideas that
 * cost nothing, including how to count whether it worked. The plan is the
 * work level's loop (who, feel, where, then measure) on a real shop.
 *
 * Minors: no messaging the shop or strangers; the plan uses only what the
 * student sees and what friends say. Taking it to the shop means going with a
 * teacher or parent. The write-up never leaves the device.
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

const PLAN = "f.mkt-plan" as const;
const GOAL = "sim.mkt-tonight" as const;
const PLAN_URL = "https://marketeeronline.co/archives/371763" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ วางแผนให้ร้านหน้าโรงเรียน",
  questionTh: "คืนนี้ทำอะไรได้บ้าง ที่จบแล้วได้ผลงานการตลาดชิ้นแรกใส่พอร์ตเลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [PLAN, GOAL, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้เขียนแผนหน้าเดียว พานักเรียนแวะร้านหน้าโรงเรียนเพิ่ม 10 คน โดยไม่ใช้เงินเลย" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นแค่ในจอนะ เป็นภารกิจจริงคืนนี้", { mood: "wow" }),
      host("เลือกร้านจริงแถวโรงเรียน แล้ววางแผนดึงนักเรียนมาแวะเพิ่ม 10 คน", { facts: [GOAL] }),
      host("กติกามีข้อเดียว: ไอเดียต้องไม่ใช้เงินเลย", { mood: "wink" })
    ),
    item(
      "plan-parts",
      "intel",
      "แผนการตลาดบอกว่า เป้าคืออะไร ลูกค้าคือใคร จะทำยังไง ใช้งบเท่าไหร่ และหวังผลแค่ไหน ส่วนวัดผลคือเอาผลจริงมาเทียบกับเป้า",
      { title: "แผนการตลาดมีอะไรบ้าง", facts: [PLAN] }
    ),
    {
      kind: "safety",
      id: "no-dm",
      lineTh:
        "ไม่ต้องทักแชตร้าน หรือคุยกับคนที่ไม่รู้จักนะ แผนนี้ใช้แค่สิ่งที่เธอเห็นเองกับที่เพื่อนเล่า ถ้าอยากเอาแผนไปให้ร้านดูจริง ชวนครูหรือผู้ปกครองไปด้วย",
    },
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "Marketeer · แผนการตลาดต่างจากกลยุทธ์ยังไง",
            href: PLAN_URL,
            badgeTh: "อ่านฟรี ไม่ต้องสมัคร ณ 20 พ.ย. 2569",
            subTh: "บทความภาษาไทยสั้นๆ อ่านก่อนเขียนแผน แล้วค่อยลงมือ",
            factIds: [PLAN],
          },
          checklistTh: [
            "เลือกร้านจริงแถวโรงเรียน ที่เธอเดินผ่านทุกวัน",
            "ช่วงเลิกเรียน ยืนดูจากข้างนอก นับว่ามีนักเรียนแวะกี่คน",
            "ถามเพื่อน 3 คน ว่าทำไมแวะ หรือทำไมไม่แวะ",
            "เขียนแผนหน้าเดียวจากช่องข้างล่าง",
            "ใส่วิธีนับผลด้วย ว่าได้เพิ่ม 10 คนจริงไหม",
          ],
          fields: [
            { id: "shop", placeholderTh: "ร้านแบบไหน ขายอะไร" },
            { id: "who", placeholderTh: "อยากให้ใครแวะ" },
            { id: "feel", placeholderTh: "ตอนนั้นเขารู้สึกอะไร อยากได้อะไร" },
            { id: "where", placeholderTh: "เขาจะเห็นไอเดียนี้ที่ไหน ตอนไหน" },
            { id: "idea", placeholderTh: "ไอเดียที่ไม่ต้องใช้เงิน" },
            { id: "measure", placeholderTh: "จะนับยังไงว่าได้เพิ่ม 10 คน" },
          ],
          fixedLinesTh: ["ทุกไอเดียในแผนนี้ไม่ต้องใช้เงิน"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "เลือกร้านจริงแถวโรงเรียน แล้วนับว่าช่วงเลิกเรียนมีนักเรียนแวะกี่คน",
        "ถามเพื่อน 3 คน ว่าทำไมแวะหรือไม่แวะ",
        "เขียนแผนหน้าเดียว: ใคร รู้สึกอะไร เห็นที่ไหน ไอเดียที่ไม่ใช้เงิน และจะนับยังไงว่าได้เพิ่ม 10 คน",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-who", text: "เด็ก ม.ปลาย ที่รอรถตู้หลังเลิกเรียน" },
        { at: 3200, action: "type", target: "writeup.field-idea", text: "ป้ายเล็กๆ ตรงที่รอรถ บอกว่าร้านมีที่นั่งรอ" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ช่องที่สำคัญสุดคือช่องสุดท้าย: จะนับผลยังไง", { mood: "serious" }),
      host("แผนที่วัดผลไม่ได้ ก็ไม่รู้ว่าเวิร์กจริงไหม แบบตอนนับผลให้ร้านปังเลย"),
      host("ทีมเราว่าไม่ถึง 10 คนก็ไม่เป็นไร จดไว้ว่าทำไม นั่นแหละของมีค่า", { labels: ["teamView"] })
    ),
    dialogue(
      "folio",
      host("แผนหน้าเดียวกับผลที่นับได้ นี่แหละผลงานชิ้นแรกในแฟ้มของเธอ", { mood: "wink" })
    ),
    roundOneTeaser(),
    whenChoice("ทำเสร็จแล้ว พรุ่งนี้ไปนับหน้าร้านอีกรอบ เทียบกับวันนี้ดู"),
  ],
};
