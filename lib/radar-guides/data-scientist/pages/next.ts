/**
 * Level 1 · next (ending). Recap from local progress, the favourite-game pick
 * (the pick decides the line, not the scores), the intent dialogue, then the
 * outro: intent, career request, share, follow, the SHIFT open-round line and
 * other careers. The shell adds the profile card. No 1:1 channel anywhere.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

export const next: GuidePage = {
  key: "next",
  order: 4,
  titleTh: "แล้วเธอล่ะ",
  questionTh: "สายข้อมูลใช่ทางเธอไหม แล้วจะไปต่อทางไหนดี",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-18",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สายข้อมูลใช่ทางเธอไหม ลองเล่นให้จบก่อนค่อยตัดสินใจ" },
  blocks: [
    dialogue(
      "intro",
      host("มาถึงด่านสุดท้ายของ Level 1 แล้ว", { mood: "wow" }),
      host("ที่เล่นมาทั้งหมด เธอชอบส่วนไหนที่สุด")
    ),
    {
      kind: "game",
      id: "recap",
      game: {
        engine: "RecapCard",
        data: {
          lines: {
            dream: "ทายไว้ว่าโรงเรียนปิดเพราะฝุ่น {schools} แห่ง || รู้แล้วว่าตัวเลขฝุ่นเริ่มจากคำถาม",
            work: "จัดการข้อมูลถูก {score}/{total}",
            tonight: "เตรียม write-up งานข้อมูลชิ้นแรกไว้แล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: ข้อมูลเพื่อส่วนรวม งานจริงคือแปลงข้อมูลดิบเป็นตัวเลขที่คนทั้งเมืองใช้ตัดสินใจ",
            work: "สายที่เธอเลือกเอง: นักวิเคราะห์ข้อมูล งานจริงคือตั้งคำถามให้ตรงจุด เคลียร์ข้อมูล แล้วเล่าผลให้คนอื่นฟังรู้เรื่อง",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย แค่จุดเริ่มต้น เธอตัดสินใจเองได้",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "ข้อมูลเพื่อส่วนรวม หรือ นักวิเคราะห์ข้อมูล",
        "นี่ไม่ใช่คำทำนาย แค่จุดเริ่มต้น เธอตัดสินใจเองได้",
      ],
      demoScript: [
        { at: 800, action: "tap", target: "recap.fav-work" },
        { at: 3000, action: "wait" },
      ],
    },
    dialogue(
      "intent",
      host("กดบอกหน่อยว่าสายนี้ใช่เธอไหม"),
      host("เราจะได้รู้ว่าควรทำสายนี้ให้ลึกกว่านี้ไหม"),
      host("กดอันไหนก็ได้ ถือเป็นข้อมูลหมดเลย"),
      host("ลองแล้วรู้ว่าไม่ใช่ ก็ยังได้คำตอบไวกว่าคนที่ไม่เคยลอง", { mood: "wink" })
    ),
    { kind: "outro", id: "outro" },
    dialogue(
      "if-yes",
      host("ถ้าสนใจ มีแค่อย่างเดียวที่ต้องทำต่อ"),
      host("คือพรุ่งนี้ลองถามคำถามที่สองกับไฟล์เดิม แล้วเขียนเพิ่มอีกชิ้น", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบงานจุกจิก เบื่อเวลาต้องไล่ดูตารางทีละแถว หรือไม่ถนัดอธิบายให้คนอื่นฟัง เพราะงานจริงส่วนหนึ่งคือเคลียร์ข้อมูล แล้วเล่าให้คนไม่ได้เรียนสถิติเข้าใจ",
      { title: "สายนี้อาจไม่เหมาะกับเธอ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
