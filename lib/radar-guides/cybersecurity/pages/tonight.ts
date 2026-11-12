/**
 * Level 10 · tonight. Design: docs/radar-guide/cybersecurity-guide.md, Page 10.
 * One practice room, a checklist, and a write-up builder that never leaves
 * the device. Required safety cutscene (founder face on screen). The fixed
 * legal line carries no section number until legal review.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { CLIP, dialogue, host, item, sys } from "./_story";

const ROOM_URL = "https://tryhackme.com/room/offensivesecurityintro" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 10,
  titleTh: "คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก",
  questionTh: "คืนนี้ทำอะไรได้เลย ที่จบด้วยของจริงในพอร์ต",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-11",
  minutes: 1,
  legacyHashes: ["start"],
  showsHacking: true,
  factIds: ["f.thm-free", "f.thm-fakebank"],
  og: { headlineTh: "คืนนี้ลองแค่ห้องเดียว แล้วเธอจะมีผลงานไซเบอร์ชิ้นแรก" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นในจอ เป็นภารกิจจริงคืนนี้", { mood: "wow" }),
      host("ลองแค่ห้องเดียว แล้วเธอจะมีผลงานไซเบอร์ชิ้นแรก")
    ),
    CLIP,
    {
      kind: "safety",
      id: "legal",
      lineTh:
        "เข้าระบบของคนอื่นโดยไม่ได้รับอนุญาต ผิดกฎหมาย ต่อให้แค่ลองดูก็ตาม ฝึกได้แค่เครื่องของตัวเอง หรือห้องที่เขาเปิดให้ลอง ห้ามลองกับเว็บโรงเรียน เว็บเพื่อน หรือเว็บไหนที่ไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร",
    },
    item(
      "room-fakebank",
      "intel",
      "ห้องนี้เขาสร้างเว็บธนาคารปลอมไว้ให้ฝึกหาช่องโหว่โดยเฉพาะ เป็นห้องสำหรับมือใหม่",
      { title: "ห้องฝึก: Offensive Security Intro", facts: ["f.thm-fakebank"], badge: "pending" }
    ),
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "TryHackMe · Offensive Security Intro",
            href: ROOM_URL,
            badgeTh: "ฟรีตามคู่มือของ TryHackMe ณ 31 ส.ค. 2569 เช็กอีกครั้งก่อนสมัคร",
            subTh: "เช็กเกณฑ์อายุของเว็บก่อน ถ้าต้องมีผู้ปกครอง ให้สมัครด้วยกัน",
            factIds: ["f.thm-free"],
          },
          checklistTh: ["สมัคร", "ทำห้องให้จบ", "แคปหน้าจอผลลัพธ์ (ไม่ให้ติดอีเมลหรือชื่อจริง)", "เขียน write-up"],
          fields: [
            { id: "goal", placeholderTh: "ห้องอะไร / เป้าหมาย" },
            { id: "tried", placeholderTh: "ฉันลองอะไร" },
            { id: "failed", placeholderTh: "อะไรไม่เวิร์ก" },
            { id: "fix", placeholderTh: "ถ้าเป็นเจ้าของระบบ จะแก้ยังไง" },
            { id: "unclear", placeholderTh: "ยังไม่เข้าใจอะไร" },
          ],
          fixedLinesTh: ["ทำในแล็บฝึกที่ได้รับอนุญาตเท่านั้น"],
          includeProofFrom: "firstjob",
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: { done: "tonight:done", value: "count", milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" } },
      answersTh: [
        "เปิดห้อง Offensive Security Intro บน TryHackMe (เช็กเกณฑ์อายุของเว็บก่อน ถ้าต้องมีผู้ปกครอง ให้สมัครด้วยกัน)",
        "ทำให้จบ แคปหน้าจอโดยไม่ให้ติดอีเมลหรือชื่อจริง",
        "เขียน write-up: ห้องอะไร ลองอะไร อะไรไม่เวิร์ก ถ้าเป็นเจ้าของระบบจะแก้ยังไง ยังไม่เข้าใจอะไร",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-goal", text: "Offensive Security Intro: ลองหาจุดอ่อนของเว็บธนาคารปลอมในห้องฝึก" },
        { at: 3200, action: "type", target: "writeup.field-fix", text: "ถ้าเป็นเจ้าของ จะปิดทางที่เจอ แล้วเพิ่มการเช็กสิทธิ์" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ที่สำคัญกว่าทำจบ คือเขียนสรุปสั้นๆ ว่าลองอะไรไปบ้าง อะไรไม่เวิร์ก"),
      host("และถ้าเป็นเจ้าของระบบ จะแก้ยังไง", { mood: "serious" }),
      host("ทีมเราคิดว่าข้อสุดท้ายมีค่าที่สุด อย่าข้ามนะ", { labels: ["teamView"] })
    ),
    dialogue(
      "callback",
      host("จำประตูที่สองได้ไหม มันเปิดให้คนที่มีผลงานตรวจสอบได้", { mood: "wink" }),
      host("write-up นี้คือบรรทัดแรกของประวัตินั้น"),
      host("ถ้าสนุก ทำห้องถัดไปพรุ่งนี้ ถ้าไม่สนุก ก็รู้ก่อนเลือกคณะ ไม่เสียอะไร"),
      sys("เช็กกติกาของห้องก่อนโพสต์ write-up สาธารณะ")
    ),
  ],
  clip: {
    seconds: 22,
    hookTh: "คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก",
    scriptLinesTh: [
      "คืนนี้ลองแค่ห้องเดียว ฟรี",
      "เปิด TryHackMe ห้อง Offensive Security Intro",
      "เขาสร้างเว็บธนาคารปลอมไว้ให้ฝึกโดยเฉพาะ",
      "ย้ำอีกที ฝึกเฉพาะในห้องที่เขาเปิดให้ลองแบบนี้เท่านั้น",
      "ระบบจริงของคนอื่น ห้ามลอง ผิดกฎหมาย ต่อให้แค่ลองดูก็ตาม",
      "ทำเสร็จแล้วกลับมาหน้านี้ เขียนสั้นๆ ว่าลองอะไร อะไรไม่เวิร์ก",
      "ถ้าเป็นเจ้าของระบบจะแก้ยังไง",
      "นั่นคือผลงานไซเบอร์ชิ้นแรกของเธอ",
    ],
    // Optional: the pinned safety block carries the legal-lab rule as text.
    required: false,
    safety: true,
    factIds: ["f.thm-free", "f.thm-fakebank"],
  },
  reel: {
    format: "founder",
    hook: { th: "คืนนี้ ห้องเดียว ได้ผลงานไซเบอร์ชิ้นแรกในพอร์ต" },
    variantsTh: ["ลองเจาะเว็บธนาคารปลอม ในห้องที่สร้างไว้ให้ฝึก", "ทำห้องฝึกไซเบอร์จบแล้ว อย่าข้ามขั้นนี้"],
    sendToFriendTh: "ส่งให้เพื่อนที่อยากลองแต่ไม่รู้จะเริ่มตรงไหน",
    visual: [
      "ผู้ก่อตั้งพูดกับกล้อง หน้าอยู่ในเฟรมตอนพูดประโยคความปลอดภัย",
      "ตัดไปภาพหน้าจอเริ่มห้องฝึก บันทึกจากบัญชีฟรี และยืนยันว่ามีเว็บธนาคารปลอมจริง",
      "บล็อก write-up ประกอบขึ้นทีละบรรทัด",
    ],
  },
};
