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
  questionTh: "สาย UX/UI ใช่เธอไหม แล้วจะไปต่อทางไหน",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สาย UX/UI ใช่เธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
  blocks: [
    dialogue(
      "intro",
      host("มาถึงด่านสุดท้ายของ Level 1 แล้วนะ", { mood: "wow" }),
      host("เล่นมาทั้งหมด เธออินกับส่วนไหนที่สุด")
    ),
    {
      kind: "game",
      id: "recap",
      game: {
        engine: "RecapCard",
        data: {
          lines: {
            dream: "เดาไว้ว่า กทม. อัปเกรดป้ายรถเมล์ {signs} ป้าย || รู้แล้วว่าป้ายกับแอปที่ใช้ง่าย มีคนตั้งใจออกแบบ",
            work: "แก้แอปโรงอาหาร ทำถูก {score}/{total} || นั่งดูเพื่อนใช้แอป แล้วแก้จุดที่ติด",
            tonight: "เตรียมรีดีไซน์หน้าจอแรกแล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: สายออกแบบบริการ งานจริงคือออกแบบของที่คนใช้ทุกวัน ทั้งในจอและนอกจอ",
            work: "สายที่เธอเลือกเอง: สายออกแบบแอป งานจริงคือนั่งดูคนใช้ แล้วแก้หน้าจอจนใช้ง่าย",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "สายออกแบบบริการ หรือสายออกแบบแอป",
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
      host("ไม่ว่าจะกดอันไหน ก็ไม่มีคำตอบผิดนะ"),
      host("ลองแล้วรู้ว่าไม่ใช่ ก็ยังได้คำตอบไวกว่าคนที่ไม่เคยลอง", { mood: "wink" })
    ),
    { kind: "outro", id: "outro" },
    dialogue(
      "if-yes",
      host("ถ้าสนใจ ก้าวต่อไปง่ายมาก"),
      host("รีดีไซน์อีกสักหน้า แล้วชวนอีกคนมาลองใช้", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบให้ใครมาวิจารณ์งาน ไม่ชอบคุยกับคนอื่น หรืออยากวาดตามใจตัวเองอย่างเดียว เพราะงานจริงคือฟังคนใช้ คุยกับทีมและคนเขียนโค้ด แล้วแก้งานซ้ำหลายรอบ",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
