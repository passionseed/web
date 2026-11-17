/**
 * Level 5 · next (ending). Recap from local progress, the favourite-game pick
 * (the pick decides the line, not the scores), then the outro: intent, career
 * request, share, follow, the SHIFT open-round line and other careers. Ends
 * with an honest "this may not suit you if". No 1:1 channel anywhere.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "../../_shared/story";

export const next: GuidePage = {
  key: "next",
  order: 5,
  titleTh: "แล้วเธอล่ะ",
  questionTh: "สาย AI ใช่เธอไหม แล้วจะไปต่อทางไหน",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-18",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สาย AI ใช่เธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
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
            dream: "เดาจำนวนนักเรียนที่ใช้ RISA ไว้ {risa} คน || รู้จัก AI ฝีมือทีมในไทยแล้ว",
            work: "ตรวจคำตอบบอทถูก {score}/{total}",
            round1: "จัดแฟ้มผลงานถูก {score}/{total}",
            tonight: "เตรียม write-up ชิ้นแรกแล้ว",
          },
          favourites: {
            dream:
              "สายที่เธอเลือกเอง: วิศวกรโมเดลภาษา งานจริงคือสอน AI ให้เก่งภาษาไทย แล้วเอาไปให้คนใช้ได้จริง",
            work: "สายที่เธอเลือกเอง: วิศวกรวัดผล AI งานจริงคือสร้างชุดสอบ แล้วจับให้ได้ว่า AI พลาดตรงไหนก่อนปล่อย",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "วิศวกรโมเดลภาษา หรือวิศวกรวัดผล AI",
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
      host("ถ้าสนใจ สิ่งเดียวที่ต้องทำต่อ"),
      host("คือสอนโมเดลอีกตัวพรุ่งนี้ กับเขียน write-up อีกหนึ่งชิ้น", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบลองซ้ำแล้วจดผลละเอียด ไม่ชอบตามเครื่องมือใหม่ที่เปลี่ยนไวมาก หรือไม่อยากอ่านคู่มือภาษาอังกฤษ เพราะงานจริงคือทดสอบ แก้ แล้วทดสอบใหม่ วนไปเรื่อยๆ",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
