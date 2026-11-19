/**
 * Level 1 · dream. The hook: when a new disease is in the news, the first
 * "yes or no" comes from a lab. Guess how fast the Department of Medical
 * Sciences said it could report a Nipah test (Jan 2026: within 8 hours), then
 * flip three everyday places where a lab sits behind the answer (newborn
 * screening, donated blood, the community lab clinic).
 *
 * No medical advice and no diagnosis: the level shows what labs do, never what
 * a result means for anyone's health.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { answer, beat, choice, dialogue, host, item, me, sys } from "../../_shared/story";

const LICENCE = "f.mt-licence" as const;
const NIPAH = "f.mt-nipah" as const;
const NEWBORN = "f.mt-newborn" as const;
const BLOOD = "f.mt-blood" as const;
const BENCH = "f.mt-lab-benchmark" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "คำตอบแรก มาจากแล็บ",
  questionTh: "ผลเลือดที่หมอใช้ตัดสินใจ ใครเป็นคนตรวจ",
  navLabelTh: "คำตอบจากแล็บ",
  asOf: "2026-11-20",
  minutes: 2,
  factIds: [LICENCE, NIPAH, NEWBORN, BLOOD, BENCH],
  og: {
    headlineTh: "ก่อนหมอตัดสินใจ คำตอบแรกมาจากแล็บ",
    stat: { th: "ม.ค. 2569 แล็บกรมวิทย์ฯ พร้อมรายงานผลนิปาห์ภายใน 8 ชั่วโมงหลังได้ตัวอย่าง", factIds: [NIPAH] },
  },
  blocks: [
    dialogue("intro", host("เปิดรันสายแล็บกัน ขอถามเธอข้อเดียวก่อน", { mood: "wow" })),
    choice(
      "who-tests",
      host("ตอนหมอบอกผลเลือด เธอว่าใครเป็นคนตรวจ"),
      answer("doctor", "หมอตรวจเองแหละ", host("หมอเป็นคนเอาผลไปใช้ แต่คนตรวจตัวจริงอยู่ในแล็บ", { mood: "wink" })),
      answer(
        "machine",
        "เครื่องมันออกผลเองปะ",
        host("เครื่องช่วยเยอะจริง แต่ต้องมีคนเช็กก่อนว่าผลเชื่อได้ไหม"),
        host("คนนั้นแหละ ที่รันนี้จะพาเธอไปรู้จัก", { mood: "wink" })
      ),
      answer(
        "never",
        "ไม่เคยคิดเลยว่าใครตรวจ",
        host("ไม่แปลกเลย เพราะเขาทำงานอยู่หลังประตูแล็บตลอด"),
        host("งั้นไปเปิดประตูดูกันเลย", { mood: "wow" })
      )
    ),
    item(
      "intel-mt",
      "intel",
      "นักเทคนิคการแพทย์คือคนตรวจเลือด ปัสสาวะ และสิ่งส่งตรวจจากร่างกาย แล้วรายงานผลให้หมอ จบแล้วต้องสอบใบอนุญาตที่สภาเทคนิคการแพทย์คุม",
      { title: "แฟ้ม: นักเทคนิคการแพทย์", facts: [LICENCE] }
    ),
    beat(
      "beat-guess",
      "ลองทายดู",
      dialogue(
        "guess-intro",
        host("ม.ค. 2569 ไวรัสนิปาห์ระบาดที่อินเดีย ไทยต้องคุมเข้มที่สนามบินเลย", { facts: [NIPAH] }),
        host("ถ้ามีคนป่วยต้องสงสัย จะรู้ว่าติดหรือไม่ติด ต้องรอผลแล็บ", { facts: [NIPAH] }),
        host("ลองทายดิ แล็บใช้เวลากี่ชั่วโมงถึงรู้ผล", { mood: "wink" })
      ),
      {
        kind: "game",
        id: "nipah",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "แล็บกรมวิทย์ฯ รายงานผลนิปาห์ได้ภายในกี่ชั่วโมง หลังได้ตัวอย่าง",
            min: 0,
            max: 72,
            step: 1,
            unit: "count",
            answer: 8,
            answerFactId: NIPAH,
            buckets: [4, 12, 24, 48, 73],
            chart: {
              kind: "bars",
              bars: [{ labelTh: "ชั่วโมงจนรู้ผลนิปาห์ (ม.ค. 2569)", value: null }],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอเดาช้าไป {d} ชั่วโมง",
            underTh: "เธอเดาเร็วไป {d} ชั่วโมง",
            nearWithin: 2,
            revealTh: "เธอเดา {g} ชั่วโมง ของจริงคือภายใน 8 ชั่วโมง",
          },
        },
        track: { done: "dream:nipah-guess", value: "bucket" },
        answersTh: [
          "ม.ค. 2569 แล็บของกรมวิทยาศาสตร์การแพทย์ รายงานผลนิปาห์ได้ภายใน 8 ชั่วโมงหลังได้ตัวอย่าง",
          "ตรวจหาสารพันธุกรรมของไวรัส ด้วยวิธี real-time RT-PCR",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "nipah.plus" },
          { at: 900, action: "tap", target: "nipah.plus" },
          { at: 1200, action: "tap", target: "nipah.plus" },
          { at: 2000, action: "tap", target: "nipah.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-nipah", "stat", "รายงานผลได้ภายใน 8 ชั่วโมง หลังแล็บได้ตัวอย่าง", {
        title: "กรมวิทยาศาสตร์การแพทย์",
        facts: [NIPAH],
      }),
      dialogue(
        "who",
        host("คนที่รับมือตัวอย่างแบบนี้ ก็คือคนสายแล็บการแพทย์นี่แหละ"),
        me("ฉันจะเป็นคนให้คำตอบแบบนั้นได้จริงเหรอ"),
        host("นั่นแหละ โจทย์ของรันนี้เลย", { mood: "wink" })
      ),
      item(
        "honesty",
        "intel",
        "ตอนนั้นไทยยังไม่พบผู้ติดเชื้อนิปาห์นะ 8 ชั่วโมงคือความพร้อมที่กรมวิทยาศาสตร์การแพทย์แจ้งไว้",
        { title: "พูดตรงๆ", facts: [NIPAH] }
      )
    ),
    beat(
      "beat-flip",
      "ยังมีอีก",
      dialogue("flip-intro", host("ไม่ได้มีแค่ตอนโรคระบาดนะ ลองพลิกดูว่าแล็บอยู่เบื้องหลังอะไรอีก")),
      {
        kind: "game",
        id: "behind",
        game: {
          engine: "FlipCards",
          data: {
            highlightTh: "ผ่านมือคนแล็บ",
            cards: [
              {
                id: "newborn",
                frontTh: "เด็กแรกเกิดในไทย",
                backTh: "เลือดหยดเล็กๆ บนกระดาษซับ ผ่านมือคนแล็บ คัดกรองโรคหายาก 24 โรค ฟรีทั่วประเทศ",
                dateTh: "ส.ค. 2566",
                factIds: [NEWBORN],
              },
              {
                id: "blood",
                frontTh: "เลือดที่คนบริจาค",
                backTh: "ทุกถุงต้องผ่านมือคนแล็บ ตรวจหาเชื้อ HIV ไวรัสตับอักเสบบี ซี และซิฟิลิส ก่อนถึงคนไข้",
                dateTh: "พ.ค. 2562",
                factIds: [BLOOD],
              },
              {
                id: "clinic",
                frontTh: "คลินิกตรวจแล็บใกล้บ้าน",
                backTh: "นโยบาย Lab Anywhere ยกการตรวจไปถึงคลินิกเทคนิคการแพทย์ชุมชน ผ่านมือคนแล็บแล้วส่งข้อมูลเข้าส่วนกลางแบบเรียลไทม์",
                dateTh: "พ.ย. 2569",
                factIds: [BENCH],
              },
            ],
          },
        },
        track: { done: "dream:flipped", value: "count", milestones: { flip: "dream:flip" } },
        answersTh: [
          "เด็กแรกเกิด: เลือดบนกระดาษซับ ส่งแล็บคัดกรองโรคหายาก 24 โรค",
          "เลือดบริจาค: ทุกถุงตรวจหาเชื้อ HIV ตับอักเสบบี ซี และซิฟิลิส",
          "คลินิกใกล้บ้าน: Lab Anywhere พาการตรวจไปถึงคลินิกเทคนิคการแพทย์ชุมชน",
          "ทุกอันผ่านมือคนแล็บ",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "behind.card-newborn" },
          { at: 2000, action: "tap", target: "behind.card-blood" },
          { at: 4000, action: "wait" },
        ],
      },
      dialogue(
        "you",
        host("ตอนเธอเกิด เลือดหยดเล็กๆ ของเธอ ก็น่าจะเคยผ่านแล็บแบบนี้มาแล้วนะ", { facts: [NEWBORN], mood: "wink" })
      ),
      dialogue(
        "exit",
        host("แต่กว่าผลจะเชื่อได้ ต้องมีคนคอยจับผิดทุกขั้นเลยนะ", { mood: "serious" }),
        sys("คำถามต่อไป: ทั้งวันในแล็บ เขาทำอะไรกันบ้าง")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "ก่อนหมอตัดสินใจ คำตอบแรกมาจากแล็บ" },
    variantsTh: ["ข่าวโรคใหม่มา แล็บไทยพร้อมบอกผลใน 8 ชั่วโมง", "ตอนเธอเกิด เลือดหยดแรกๆ ก็น่าจะเคยผ่านแล็บมาแล้ว"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบชีวะ แต่ไม่ได้อยากเป็นหมอ",
    visual: [
      "หลอดเลือดหลอดเดียวเลื่อนผ่านประตูแล็บ ไฟเขียวมิ้นต์ติดขึ้น",
      "นาฬิกานับชั่วโมงวิ่ง แล้วหยุดที่ 8 พร้อมป้ายผลออกแล้ว",
      "การ์ดสามใบพลิกทีละใบ คำว่า ผ่านมือคนแล็บ สว่างขึ้นทุกใบ",
    ],
  },
};
