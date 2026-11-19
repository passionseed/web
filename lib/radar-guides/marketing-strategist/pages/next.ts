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
  questionTh: "สายการตลาดใช่เธอไหม แล้วจะไปต่อทางไหน",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สายการตลาดใช่เธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
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
            dream: "ทายเอนเกจเมนต์หมีเนยไว้ {buzz} ครั้ง || แกะแล้วว่าหมีเนยปังเพราะอะไร",
            work: "วางแผนให้ร้านปังปิ้ง ทำถูก {score}/{total} || วางแผนให้ร้านปังปิ้งจนนับผลได้",
            tonight: "เตรียมแผนหน้าเดียวให้ร้านจริงแล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: สายแบรนด์กับอินไซต์ งานจริงคืออ่านใจคน แล้วทำให้แบรนด์เป็นที่รัก",
            work: "สายที่เธอเลือกเอง: สายวางแคมเปญ งานจริงคือเลือกไอเดียให้ตรงคน ลองจริง แล้วนับผล",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "สายแบรนด์กับอินไซต์ หรือสายวางแคมเปญ",
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
      host("ถ้าเธอสนใจสายนี้ สิ่งเดียวที่ต้องทำต่อ"),
      host("คือไปนับหน้าร้านอีกรอบ แล้วจดไว้ว่าแผนเวิร์กแค่ไหน", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบสังเกตคน ไม่ชอบนับผลแล้วจดตัวเลข หรือเสียดายนานเวลาไอเดียที่ชอบไม่เวิร์ก เพราะงานจริงคือลอง นับ แล้วเลิกไอเดียที่ไม่ได้ผลบ่อยมาก",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
