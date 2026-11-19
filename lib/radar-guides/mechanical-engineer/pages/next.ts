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
  questionTh: "สายเครื่องกลใช่เธอไหม แล้วจะไปต่อทางไหน",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-20",
  minutes: 1,
  factIds: [],
  og: { headlineTh: "สายเครื่องกลใช่เธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
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
            dream: "เดาระยะทดสอบรถไฟไทยทำไว้ {testrun} กม. || รู้จักรถไฟที่ทีมในไทยออกแบบเองแล้ว",
            work: "ทำพัดลมห้องเรียน ตอบถูก {score}/{total} || ทดสอบพัดลมห้องเรียนจนพร้อมผลิต",
            tonight: "มีแผนแกะของชิ้นแรกแล้ว",
          },
          favourites: {
            dream: "สายที่เธอเลือกเอง: สายยานยนต์และราง งานจริงคือออกแบบของใหญ่ที่คนขึ้นนั่ง แล้วทดสอบจนมั่นใจ",
            work: "สายที่เธอเลือกเอง: สายออกแบบเครื่องใช้ งานจริงคือทดสอบของที่คนใช้ทุกวัน แล้วแก้จนมันไม่พัง",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกด่านที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "สายยานยนต์และราง หรือสายออกแบบเครื่องใช้",
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
      host("คือพรุ่งนี้รื้อของดูอีกชิ้น แล้ววาดเวอร์ชันอัปเกรดอีกแบบ", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบทดสอบซ้ำแล้วจดตัวเลขละเอียด ไม่สนุกกับฟิสิกส์และคณิต หรือไม่อยากไปยืนในโรงงานที่ร้อนและเสียงดัง เพราะงานจริงคือคำนวณ ทดสอบ แล้วแก้ วนไปเรื่อยๆ",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
