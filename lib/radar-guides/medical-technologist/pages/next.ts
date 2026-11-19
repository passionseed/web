/**
 * Level 4 · next (ending). Recap from local progress, the favourite-game pick
 * (the pick decides the line, not the scores), then the outro: intent, career
 * request, share, follow, the SHIFT open-round line and other careers. Ends
 * with an honest "this may not suit you if". No 1:1 channel anywhere.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

export const next: GuidePage = {
  key: "next",
  order: 4,
  titleTh: "แล้วเธอล่ะ",
  questionTh: "สายแล็บใช่เธอไหม แล้วจะไปต่อทางไหน",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สายแล็บใช่เธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
  blocks: [
    dialogue(
      "intro",
      host("มาถึงด่านสุดท้ายของ Level 1 แล้ว", { mood: "wow" }),
      host("เล่นมาทั้งหมด เธอชอบส่วนไหนที่สุด")
    ),
    {
      kind: "game",
      id: "recap",
      game: {
        engine: "RecapCard",
        data: {
          lines: {
            dream: "เดาเวลารู้ผลนิปาห์ไว้ {nipah} ชั่วโมง || รู้แล้วว่าคำตอบแรกมาจากแล็บ",
            work: "เวรแรกในแล็บ ทำถูก {score}/{total} || ผ่านเวรแรกในแล็บแล้ว",
            tonight: "เตรียมบันทึกแล็บชิ้นแรกแล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: สายล่าเชื้อโรค งานจริงคือหาคำตอบให้ไว ตอนมีโรคใหม่มา",
            work: "สายที่เธอเลือกเอง: สายแล็บโรงพยาบาล งานจริงคือทำให้ผลทุกหลอดเชื่อได้ ก่อนถึงมือหมอ",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "สายล่าเชื้อโรค หรือสายแล็บโรงพยาบาล",
        "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
      ],
      demoScript: [
        { at: 800, action: "tap", target: "recap.fav-work" },
        { at: 3000, action: "wait" },
      ],
    },
    dialogue(
      "intent",
      host("กดบอกเราหน่อยว่าสายนี้ใช่เธอไหม เราจะได้รู้ว่าควรเจาะลึกต่อหรือเปล่า"),
      host("ไม่ว่าจะกดอันไหน ถือว่าได้ข้อมูล"),
      host("ลองแล้วรู้ว่าไม่ใช่ ก็ยังได้คำตอบไวกว่าคนที่ไม่เคยลอง", { mood: "wink" })
    ),
    { kind: "outro", id: "outro" },
    dialogue(
      "if-yes",
      host("ถ้าสนใจสายนี้ สิ่งเดียวที่ต้องทำต่อ"),
      host("คือพรุ่งนี้ลองส่องตัวอย่างใหม่อีกอย่าง แล้วจดบันทึกแล็บอีกหน้า", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบงานละเอียดที่ต้องเช็กซ้ำทุกขั้น ไม่โอเคกับการจับตัวอย่างเลือดทุกวัน หรือไม่อยากเข้าเวรดึก เพราะแล็บโรงพยาบาลหลายที่เปิดทั้งวันทั้งคืน",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
