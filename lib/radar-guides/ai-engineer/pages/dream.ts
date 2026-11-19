/**
 * Level 1 · dream. The hook: AI that understands Thai is built by teams in
 * Thailand, and students already use it. Guess how many students used RISA
 * (a Typhoon chatbot for PISA practice), then flip four real Thai-built AI
 * projects to see who made each one.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { answer, beat, choice, dialogue, host, item, me, sys } from "../../_shared/story";

const RISA = "f.ai-risa" as const;
const PATHUMMA = "f.ai-pathumma" as const;
const INSPECTRA = "f.ai-inspectra" as const;
const OCR = "f.ai-typhoon-ocr" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "AI ภาษาไทย ฝีมือคนไทย",
  questionTh: "AI ที่คนไทยใช้กัน ใครเป็นคนสร้าง",
  navLabelTh: "AI ฝีมือคนไทย",
  asOf: "2026-11-18",
  minutes: 2,
  factIds: [RISA, PATHUMMA, INSPECTRA, OCR],
  og: {
    headlineTh: "AI ที่อ่านไทยออก คนไทยนี่แหละที่สร้าง",
    stat: { th: "นักเรียนกว่า 9,700 คน 74 จังหวัด ใช้แชตบอตติวสอบที่ทีมในไทยสร้าง", factIds: [RISA] },
  },
  blocks: [
    dialogue(
      "intro",
      host("เปิดรันสาย AI กัน ขอถามข้อเดียวก่อน", { mood: "wow" })
    ),
    choice(
      "who-built",
      host("AI ที่ฟังภาษาไทยรู้เรื่อง เธอว่าฝีมือใคร"),
      answer("abroad", "บริษัทใหญ่เมืองนอกชัวร์", host("บางตัวก็ใช่ แต่หลายตัวสร้างในไทยนี่แหละ", { mood: "wink" })),
      answer("thai", "คนไทยก็ทำได้อยู่มั้ง", host("เซนส์ดีนะ หลายตัวสร้างในไทยนี่แหละ", { mood: "wow" })),
      answer(
        "never",
        "ไม่เคยนึกเลยว่ามีคนสร้าง",
        host("ไม่แปลกหรอก ใช้กันทุกวัน แต่ไม่ค่อยมีใครเห็นคนทำ"),
        host("หลายตัวสร้างในไทยนี่แหละ ไปดูกัน", { mood: "wink" })
      )
    ),
    item(
      "intel-typhoon",
      "intel",
      "Typhoon คือโมเดลภาษาไทยที่ทีม SCB 10X พัฒนาในไทย แล้วเอาไปทำ RISA แชตบอตช่วยนักเรียนติวสอบ PISA",
      { title: "แฟ้ม: Typhoon", facts: [RISA] }
    ),
    beat(
      "beat-guess",
      "ลองทายดู",
      dialogue(
        "guess-intro",
        host("RISA ให้ฝึกทำข้อสอบ แล้วตรวจให้ทันทีเลย", { facts: [RISA] }),
        host("ลองทายดู ส.ค. 2568 มีนักเรียนใช้ไปแล้วกี่คน", { facts: [RISA], mood: "wink" })
      ),
      {
        kind: "game",
        id: "risa",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "ส.ค. 2568 นักเรียนใช้ RISA ไปแล้วกี่คน",
            min: 0,
            max: 20000,
            step: 500,
            unit: "count",
            answer: 9700,
            answerFactId: RISA,
            buckets: [2000, 5000, 9000, 12000, 20001],
            chart: {
              kind: "bars",
              bars: [{ labelTh: "นักเรียนที่ใช้ RISA (ส.ค. 2568)", value: null }],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอเดาสูงไป {d} คน",
            underTh: "เธอเดาต่ำไป {d} คน",
            nearWithin: 1000,
            revealTh: "เธอเดา {g} แต่ของจริงคือกว่า 9,700 คน",
          },
        },
        track: { done: "dream:risa-guess", value: "bucket" },
        answersTh: [
          "ส.ค. 2568 มีนักเรียนใช้ RISA แล้วกว่า 9,700 คน",
          "จากกว่า 300 โรงเรียน ใน 74 จังหวัด (ตัวเลขจาก SCB)",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "risa.plus" },
          { at: 900, action: "tap", target: "risa.plus" },
          { at: 1200, action: "tap", target: "risa.plus" },
          { at: 2000, action: "tap", target: "risa.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-risa", "stat", "นักเรียนกว่า 9,700 คน จากกว่า 300 โรงเรียน ใน 74 จังหวัด", {
        title: "ตัวเลขจาก SCB",
        facts: [RISA],
        badge: "vendor",
      }),
      dialogue(
        "who",
        host("คนสร้างอยู่ใกล้แค่นี้ เป็นทีมวิศวกร AI ในไทย"),
        me("งั้นคนแบบฉัน ก็สร้างของแบบนี้ได้เหรอ"),
        host("นั่นแหละโจทย์ของรันนี้", { mood: "wink" })
      )
    ),
    beat(
      "beat-flip",
      "ยังมีอีก",
      dialogue("flip-intro", host("ไม่ได้มีแค่ตัวเดียวนะ พลิกดูเลยว่าแต่ละอันใครสร้าง")),
      {
        kind: "game",
        id: "made-in-th",
        game: {
          engine: "FlipCards",
          data: {
            highlightTh: "ทีมในไทยสร้าง",
            cards: [
              {
                id: "risa",
                frontTh: "แชตบอตช่วยติวสอบ PISA ที่นักเรียนไทยใช้",
                backTh: "RISA ใช้ Typhoon โมเดลภาษาไทยจาก SCB 10X ทีมในไทยสร้าง",
                dateTh: "ส.ค. 2568",
                factIds: [RISA],
              },
              {
                id: "pathumma",
                frontTh: "AI ภาษาไทยที่รัฐสภาไทยเอาไปใช้",
                backTh: "Pathumma LLM จาก NECTEC ทีมในไทยสร้าง อ่าน ฟัง และดูรูปภาษาไทยได้",
                dateTh: "มี.ค. 2568",
                factIds: [PATHUMMA],
              },
              {
                id: "inspectra",
                frontTh: "AI อ่านฟิล์มเอกซเรย์ปอด จบในราว 2 วินาที",
                backTh: "Inspectra CXR ผลงานนักวิจัย FIBO มจธ. กับ Perceptra ทีมในไทยสร้าง มาช่วยหมอ ไม่ได้มาแทนหมอ",
                dateTh: "มี.ค. 2567",
                factIds: [INSPECTRA],
              },
              {
                id: "ocr",
                frontTh: "AI อ่านเอกสารไทย ทั้งแบบฟอร์มราชการและลายมือ",
                backTh: "Typhoon OCR ทีมในไทยสร้าง แถมเปิดโค้ดให้เอาไปใช้ต่อได้ด้วย",
                dateTh: "ม.ค. 2569",
                factIds: [OCR],
              },
            ],
          },
        },
        track: { done: "dream:flipped", value: "count", milestones: { flip: "dream:flip" } },
        answersTh: [
          "แชตบอตติวสอบ PISA: RISA ใช้ Typhoon ของ SCB 10X",
          "AI ที่รัฐสภาใช้: Pathumma LLM ของ NECTEC",
          "AI อ่านเอกซเรย์ปอด: Inspectra CXR ของ FIBO มจธ. กับ Perceptra",
          "AI อ่านเอกสารไทย: Typhoon OCR",
          "ทุกอันมีทีมในไทยเป็นคนสร้าง",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "made-in-th.card-risa" },
          { at: 2000, action: "tap", target: "made-in-th.card-inspectra" },
          { at: 4000, action: "wait" },
        ],
      },
      item(
        "honesty",
        "intel",
        "ตัวเลขผู้ใช้กับความเร็วในด่านนี้ ทีมที่สร้างแจ้งมาเอง ยังไม่มีคนนอกตรวจซ้ำ",
        { title: "พูดตรงๆ", facts: [RISA, INSPECTRA] }
      ),
      dialogue(
        "exit",
        host("แต่ของพวกนี้ไม่ได้เก่งมาตั้งแต่วันแรกนะ", { mood: "serious" }),
        sys("คำถามต่อไป: รู้ได้ไงว่า AI ใช้ได้จริง")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "AI ที่อ่านไทยออก คนไทยนี่แหละที่สร้าง" },
    variantsTh: ["นักเรียนกว่า 9,700 คน ติวสอบกับ AI ฝีมือทีมในไทย", "AI อ่านเอกซเรย์ปอดในราว 2 วินาที ฝีมือทีมในไทย"],
    sendToFriendTh: "ส่งให้เพื่อนที่คิดว่า AI มีแต่ของเมืองนอกดูเลย",
    visual: [
      "ฟองแชตภาษาไทยเด้งขึ้น แล้วป้าย สร้างในไทย ประทับลงมา",
      "ตัวนับวิ่งถึง 9,700 แล้วหมุดกระจายเต็มแผนที่ไทย",
      "การ์ดสี่ใบพลิกทีละใบ คำว่า ทีมในไทยสร้าง สว่างขึ้นทุกใบ",
    ],
  },
};
