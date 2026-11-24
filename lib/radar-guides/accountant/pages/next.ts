/**
 * Level 1 · next (ending). Recap from local progress, the favourite-game pick
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
  questionTh: "สายบัญชีใช่เธอไหม แล้วจะไปต่อทางไหน",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สายบัญชีใช่เธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
  blocks: [
    dialogue(
      "intro",
      host("มาถึงด่านสุดท้ายของ Level 1 แล้วนะ", { mood: "wow" }),
      host("เล่นมาทั้งหมด เธอชอบช่วงไหนที่สุดอะ")
    ),
    {
      kind: "game",
      id: "recap",
      game: {
        engine: "RecapCard",
        data: {
          lines: {
            dream: "ทายรายการขายผิดปกติไว้ {sales} รายการ || รู้แล้วว่าทีมตรวจจับได้ยังไง",
            work: "เช็กบัญชีร้านชานม ถูก {score}/{total} || เช็กบัญชีร้านชานมจนครบ",
            tonight: "เตรียมบัญชีเงินตัวเองไว้แล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: นักสืบบัญชี งานจริงคือตามรอยเงินที่ผิดปกติ จนรู้ว่าความจริงคืออะไร",
            work: "สายที่เธอเลือกเอง: บัญชีธุรกิจ งานจริงคือเช็กตัวเลขที่ AI ลงให้ แล้วบอกเจ้าของว่าเงินไปไหน",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "นักสืบบัญชี หรือ บัญชีธุรกิจ",
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
      host("ถ้าเริ่มสนใจ สิ่งเดียวที่ต้องทำต่อ"),
      host("คือลองทำบัญชีอีกหนึ่งอาทิตย์ แล้วเขียนสรุปอีกหนึ่งชิ้นนะ", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบงานละเอียด ไม่ชอบเช็กซ้ำ หรือไม่อยากเป็นคนบอกความจริงที่คนอื่นไม่อยากฟัง เพราะงานจริงคือไล่หาที่มาของเงินทุกก้อน แล้วพูดตรงๆ",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
