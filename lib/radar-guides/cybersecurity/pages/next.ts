/**
 * Level 11 · next (ending). Design: docs/radar-guide/cybersecurity-guide.md,
 * Page 11. Recap from local progress, the favourite-game pick (autonomy: the
 * pick decides the line, not the scores), then the outro: intent, career
 * request, share, follow, the SHIFT open-round line and other careers. The
 * shell adds the profile card. No 1:1 channel anywhere.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "./_story";

export const next: GuidePage = {
  key: "next",
  order: 11,
  titleTh: "แล้วเธอล่ะ",
  questionTh: "สายนี้ใช่เธอไหม แล้วจะดูอะไรต่อ",
  navLabelTh: "แล้วเธอล่ะ",
  asOf: "2026-11-11",
  minutes: 1,
  legacyHashes: ["outro"],
  factIds: [],
  og: { headlineTh: "สายไซเบอร์ใช่เธอไหม เล่นจนจบแล้วค่อยตัดสินใจ" },
  blocks: [
    dialogue(
      "intro",
      host("มาถึงด่านสุดท้ายแล้ว", { mood: "wow" }),
      host("เล่นมาทั้งหมด เธอชอบส่วนไหนที่สุด")
    ),
    {
      kind: "game",
      id: "recap",
      game: {
        engine: "RecapCard",
        data: {
          lines: {
            mythos: "หาบรรทัดอันตรายเจอใน {attempts} ครั้ง",
            doors: "แจกกุญแจถูก {score}/{total}",
            triage: "จับข้อที่ AI พลาดได้ {x} ข้อ || ตัดสินสัญญาณเตือนถูก {score}/{total}",
            scam: "แยกข้อความถูก {score}/{total}",
            firstjob: "ขั้นแรกที่เธอเลือก: {proof}",
            fit: "ทางที่เธอเอนไป: {title}",
            tcas: "ติดดาวไว้ {shortlist} หลักสูตร",
            terminal:
              "ภารกิจ log {score}/{total} · ลองสแกนนอกขอบเขต {scopeTries} ครั้ง || ภารกิจ log {score}/{total} · ไม่หลุดขอบเขต ✓",
            tonight: "เตรียม write-up ชิ้นแรกแล้ว",
          },
          favourites: {
            mythos: "สายที่เธอเลือกเอง: นักล่าช่องโหว่ งานจริงคือหาจุดพังในโค้ดก่อนคนร้าย",
            doors: "สายที่เธอเลือกเอง: ทีมทดสอบเจาะระบบ งานจริงคือเจาะแบบมีสัญญา แล้วเขียนรายงานให้เจ้าของแก้",
            triage: "สายที่เธอเลือกเอง: นักวิเคราะห์ SOC งานจริงคือคัดว่าสัญญาณไหนโดนจริง และตรวจงาน AI",
            scam: "สายที่เธอเลือกเอง: ทีมกันโกง งานจริงคือจับรูปแบบมิจฉาชีพก่อนเงินหลุด",
            terminal: "สายที่เธอเลือกเอง: ทีมรับมือเหตุ งานจริงคือสืบจาก log แล้วปิดทางให้ทัน",
          },
          cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
        },
      },
      track: { done: "next:favourite", value: "index" },
      answersTh: [
        "เลือกเกมที่สนุกที่สุด แล้วดูว่ามันตรงกับงานจริงสายไหน",
        "นักล่าช่องโหว่ ทีมทดสอบเจาะระบบ นักวิเคราะห์ SOC ทีมกันโกง หรือทีมรับมือเหตุ",
        "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม เธอตัดสินใจเอง",
      ],
      demoScript: [
        { at: 800, action: "tap", target: "recap.fav-triage" },
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
      host("ถ้าสนใจ สิ่งเดียวที่ต้องทำต่อ"),
      host("คือห้องที่สองพรุ่งนี้ กับ write-up อีกหนึ่งชิ้น", { mood: "wink" })
    ),
    item(
      "honesty",
      "intel",
      "ไม่ชอบเรียนของใหม่ตลอด รับแรงกดดันตอนเหตุด่วนไม่ไหว หรือไม่ชอบงานเอกสาร เพราะงานส่วนหนึ่งคือเขียนรายงานและหลักฐานตามมาตรฐาน",
      { title: "สายนี้อาจไม่เหมาะ ถ้า...", labels: ["teamView"] }
    ),
  ],
};
