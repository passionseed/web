/**
 * Level 3 · tonight. One evening, free, under an hour: take apart something
 * at home that moves (a click pen, a clothes peg, a soap-pump head, a toy car
 * with no battery),
 * draw how it works, pick the part most likely to break or annoy, and draw
 * one fix (shape or material, as in the work level) plus how to test it. The
 * drawing and the write-up are a first engineering notebook page.
 *
 * Minors: only things with no plug, no battery and nothing sharp; stop if it
 * has to be forced or pried; watch for springs; a fan is looked at from
 * outside, unplugged, never opened; ask the owner first. Excalidraw is
 * optional (paper works); the write-up never leaves the device.
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

const DRAW = "f.me-excalidraw" as const;
const DRAW_URL = "https://excalidraw.com" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ แกะของในบ้าน แล้วออกแบบให้ดีขึ้น",
  questionTh: "คืนนี้ทำอะไรได้บ้าง ที่จบแล้วได้ผลงานชิ้นแรกใส่พอร์ตเลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [DRAW, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้แกะปากกากดสักด้าม วาดว่ามันทำงานยังไง แล้วออกแบบให้ดีกว่าเดิม" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นในจอ เป็นภารกิจจริงคืนนี้", { mood: "wow" }),
      host("แกะของในบ้านที่ขยับได้ วาดว่ามันทำงานยังไง แล้วออกแบบให้ดีขึ้นสักจุด")
    ),
    item(
      "ideas",
      "intel",
      "ปากกากด ไม้หนีบผ้า หัวปั๊มขวดสบู่ รถของเล่นที่ไม่ใส่ถ่าน ข้างในมีสปริง คาน หรือเฟืองซ่อนอยู่",
      { title: "ของที่แกะได้" }
    ),
    {
      kind: "safety",
      id: "no-plug",
      lineTh:
        "แกะเฉพาะของที่ไม่มีปลั๊ก ไม่มีถ่าน ไม่มีของมีคม ถ้าต้องงัดหรือฝืนแรงๆ ให้หยุด ห้ามแกะพัดลมหรือเครื่องใช้ไฟฟ้า ดูจากข้างนอกตอนถอดปลั๊กแล้วได้อย่างเดียว ของที่ไม่ใช่ของเธอ ขอเจ้าของก่อนนะ",
    },
    item(
      "tool",
      "intel",
      "Excalidraw กระดานวาดรูปบนเว็บ ฟรีและเปิดโค้ด เซฟงานไว้ในเบราว์เซอร์ โหลดเป็นรูปเก็บได้ หรือจะวาดบนกระดาษก็ได้เหมือนกัน",
      { title: "ที่วาดรูป: Excalidraw", facts: [DRAW] }
    ),
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "Excalidraw · กระดานวาดรูป",
            href: DRAW_URL,
            badgeTh: "ฟรีและเปิดโค้ด ตามหน้า GitHub ของโปรแกรม ณ 19 พ.ย. 2569",
            subTh: "ไม่ใช้โปรแกรมก็ได้ วาดบนกระดาษแล้วถ่ายรูปเก็บไว้ ได้ผลงานเหมือนกัน",
            factIds: [DRAW],
          },
          checklistTh: [
            "เลือกของที่ขยับได้ ไม่มีปลั๊ก ไม่มีถ่าน ไม่มีของมีคม",
            "ถ่ายรูปก่อนแกะ จะได้ประกอบกลับได้",
            "แกะทีละชิ้นบนถาด ระวังสปริงดีด วางเรียงตามลำดับที่ถอดออกมา",
            "วาดรูปแยกชิ้นส่วน ใส่ลูกศรว่าชิ้นไหนดันชิ้นไหน",
            "เลือกจุดเดียวที่อยากแก้ วาดแบบใหม่ แล้วประกอบของเดิมกลับ",
          ],
          fields: [
            { id: "what", placeholderTh: "แกะอะไร มันมีไว้ทำอะไร" },
            { id: "how", placeholderTh: "มันขยับยังไง ชิ้นไหนดันชิ้นไหน" },
            { id: "weak", placeholderTh: "จุดไหนน่าจะพังก่อน หรือใช้แล้วหงุดหงิด" },
            { id: "fix", placeholderTh: "จะแก้รูปทรงหรือเปลี่ยนวัสดุ เพราะอะไร" },
            { id: "test", placeholderTh: "จะทดสอบยังไง ให้รู้ว่าแบบใหม่ดีกว่าจริง" },
          ],
          fixedLinesTh: ["แกะเฉพาะของที่ไม่มีปลั๊ก ไม่มีถ่าน ไม่มีของมีคม"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "เลือกของในบ้านที่ขยับได้ ไม่มีปลั๊ก ไม่มีถ่าน ไม่มีของมีคม เช่น ปากกากด",
        "ถ่ายรูปก่อนแกะ แกะทีละชิ้น แล้ววาดรูปแยกชิ้นส่วนพร้อมลูกศร",
        "หาจุดที่น่าจะพังก่อน วาดแบบที่แก้แล้ว (รูปทรงหรือวัสดุ) แล้วประกอบของเดิมกลับ",
        "เขียนสรุป: แกะอะไร มันขยับยังไง จุดอ่อนคืออะไร จะแก้ยังไง จะทดสอบยังไง",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-what", text: "ปากกากด กดทีปากกาโผล่ กดอีกทีหดกลับ" },
        { at: 3200, action: "type", target: "writeup.field-weak", text: "เดือยพลาสติกที่ล็อกปลายปากกา สึกจนกดแล้วไม่ล็อก" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ของที่มีค่าสุดคืนนี้ไม่ใช่รูปสวย แต่คือเหตุผลที่เธอเลือกแก้จุดนั้น"),
      host("เหมือนตอนทดสอบพัดลมแล้วจับจุดพังมาแก้เมื่อกี้เป๊ะ", { mood: "wink" }),
      host("ช่องสุดท้าย จะทดสอบยังไง ทีมเราว่าสำคัญสุดเลย อย่าข้ามนะ", { labels: ["teamView"] })
    ),
    dialogue("folio", host("เก็บไว้เลย รูปวาดกับบันทึกนี่แหละ ผลงานชิ้นแรกในแฟ้มของเธอ", { mood: "wink" })),
    roundOneTeaser(),
    whenChoice("ทำเสร็จแล้ว พรุ่งนี้ลองแกะอีกชิ้น แล้วเทียบกันดูว่ากลไกต่างกันยังไง"),
  ],
};
