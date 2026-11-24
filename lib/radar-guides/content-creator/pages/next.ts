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
  questionTh: "สายคอนเทนต์ใช่เธอไหม แล้วจะไปต่อทางไหน",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สายคอนเทนต์ใช่ทางเธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
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
            dream: "เดาคนมาสวนสัตว์ไว้ {visitors} คน || รู้แล้วว่าหมูเด้งไม่ได้ดังแค่เพราะดวง",
            work: "ทำคลิปร้านโรตี เลือกถูก {score}/{total} || ทำคลิปร้านโรตีจนโพสต์ได้",
            tonight: "วางแผนคลิปแรกของตัวเองแล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: สายทำช่องของตัวเอง งานจริงคือหยิบเรื่องที่รู้ดี มาเล่าจนคนอยากดูต่อ",
            work: "สายที่เธอเลือกเอง: สายดูแลเพจแบรนด์ งานจริงคือวางแผน ตัด แล้วอ่านผลจนคลิปดีขึ้นเรื่อยๆ",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "สายทำช่องของตัวเอง หรือสายดูแลเพจแบรนด์",
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
      host("ถ้าเริ่มอินกับสายนี้ สิ่งเดียวที่ต้องทำต่อ"),
      host("คือพรุ่งนี้ถ่ายอีกคลิป แล้วจดไว้เลยว่าคนดูหลุดตรงไหน", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบแก้คลิปเดิมซ้ำๆ หรือไม่อยากดูตัวเลขกับอ่านคอมเมนต์ทุกวัน แม้วันที่คลิปแป้ก เพราะงานจริงคือวางแผน ถ่าย อ่านผล แก้ แล้ววนใหม่",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
