/**
 * Level 5 · next (ending). Recap from local progress, the favourite-game pick
 * (the pick decides the line, not the scores), then the outro: intent, career
 * request, share, follow, the SHIFT open-round line and other careers. The
 * shell adds the profile card. No 1:1 channel anywhere.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

export const next: GuidePage = {
  key: "next",
  order: 5,
  titleTh: "แล้วเธอล่ะ",
  questionTh: "สายนี้ใช่ทางเธอไหม แล้วจะดูอะไรต่อดี",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-18",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สายโค้ดใช่ทางเธอไหม เล่นให้จบแล้วค่อยตัดสินใจ" },
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
            dream: "เห็นแล้วนะว่าแอปที่คนใช้ทั้งเมือง เริ่มจากคนตกรถแค่คนเดียว",
            work: "จัดลำดับแจ้งปัญหาถูก {score}/{total}",
            round1: "จัดแฟ้มรอบ 1 ถูก {score}/{total}",
            tonight: "เตรียม write-up ชิ้นแรกไว้แล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: นักพัฒนาแอป งานจริงคือเจอปัญหาของคน แล้วสร้างของมาแก้มัน",
            work: "สายที่เธอเลือกเอง: วิศวกรทดสอบซอฟต์แวร์ (QA) งานจริงคือจับจุดพังให้เจอก่อนคนใช้ รวมถึงโค้ดที่ AI เขียน",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกเกมที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "นักพัฒนาแอป หรือวิศวกรทดสอบซอฟต์แวร์ (QA)",
        "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
      ],
      demoScript: [
        { at: 800, action: "tap", target: "recap.fav-work" },
        { at: 3000, action: "wait" },
      ],
    },
    dialogue(
      "intent",
      host("กดบอกเราหน่อยว่าสายนี้ใช่ไหม เราจะได้รู้ว่าควรทำสายนี้ให้ลึกขึ้นไหม"),
      host("ไม่ว่าจะกดอันไหน ถือว่าได้ข้อมูล"),
      host("ลองแล้วรู้ว่าไม่ใช่ ก็ได้คำตอบเร็วกว่าคนที่ไม่เคยลอง", { mood: "wink" })
    ),
    { kind: "outro", id: "outro" },
    dialogue(
      "if-yes",
      host("ถ้าสนใจ มีแค่อย่างเดียวที่ต้องทำต่อ"),
      host("คือแก้เว็บตามที่เพื่อนบอก แล้วเอาไปให้เขาลองอีกรอบ", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบนั่งไล่หาว่าของพังเพราะอะไร ไม่ชอบเรียนเครื่องมือใหม่เรื่อยๆ หรือไม่อยากคุยกับคนใช้ เพราะงานส่วนใหญ่คือฟังเขาแล้วแก้ซ้ำหลายรอบ",
      { title: "สายนี้อาจไม่ใช่ทาง ถ้า...", labels: ["teamView"] }
    ),
  ],
};
