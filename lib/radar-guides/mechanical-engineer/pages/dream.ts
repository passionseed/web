/**
 * Level 1 · dream. The hook: in July 2026 a KMITL research team, with public
 * and private partners, handed the State Railway a passenger car whose body
 * it designed itself ("รถไฟไทยทำ").
 * Guess how far it ran in tests before anyone rode it, then flip three things
 * built in Thailand: a technical-college team's eco-car, the country's car
 * output, and its air-conditioner exports. No salaries, no market data.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { answer, beat, choice, dialogue, host, item, me, sys } from "../../_shared/story";

const TRAIN = "f.me-thai-train" as const;
const ECO = "f.me-ecomarathon" as const;
const CARS = "f.me-car-output" as const;
const AIRCON = "f.me-aircon-export" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "รถไฟที่วิศวกรไทยออกแบบเอง",
  questionTh: "เครื่องจักรที่เธอใช้ทุกวัน ใครเป็นคนออกแบบ",
  navLabelTh: "รถไฟไทยทำ",
  asOf: "2026-11-20",
  minutes: 2,
  factIds: [TRAIN, ECO, CARS, AIRCON],
  og: {
    headlineTh: "รถไฟที่ทีมวิศวะไทยออกแบบเอง ต้องวิ่งทดสอบจนมั่นใจก่อนส่งมอบ",
    stat: { th: "รถไฟไทยทำ วิ่งทดสอบกว่า 10,000 กม. ก่อนส่งมอบให้การรถไฟ", factIds: [TRAIN], badge: "vendor" },
  },
  blocks: [
    dialogue("intro", host("เปิดรันสายเครื่องกลกัน ขอถามข้อเดียวก่อนนะ", { mood: "wow" })),
    choice(
      "who-built",
      host("รถไฟ รถยนต์ แอร์ ที่เธอใช้ทุกวัน เธอว่าใครออกแบบ"),
      answer("abroad", "ญี่ปุ่นกับจีนชัวร์", host("ถูกส่วนนึง แต่รถกับแอร์ผลิตในไทยเพียบเลย บางอย่างทีมไทยก็ออกแบบเองด้วยนะ", { mood: "wink" })),
      answer("thai", "คนไทยก็ทำได้อยู่มั้ง", host("เซนส์ไม่ธรรมดาเลยนะ มาดูหลักฐานของจริงกัน", { mood: "wow" })),
      answer(
        "never",
        "ไม่เคยคิดเลยว่ามีคนออกแบบ",
        host("ไม่แปลกเลย ของที่ใช้ทุกวัน เรามักไม่เห็นคนเบื้องหลังหรอก"),
        host("งั้นไปดูกันว่าใครทำ", { mood: "wink" })
      )
    ),
    item(
      "intel-train",
      "intel",
      "ก.ค. 2569 ทีมวิจัยจาก สจล. กับพันธมิตรรัฐและเอกชน ส่งมอบ รถไฟไทยทำ ตู้โดยสารต้นแบบที่ทีมวิจัยออกแบบตัวรถเอง ให้การรถไฟแห่งประเทศไทย",
      { title: "แฟ้ม: รถไฟไทยทำ", facts: [TRAIN] }
    ),
    beat(
      "beat-guess",
      "ลองทายดู",
      dialogue(
        "guess-intro",
        host("ก่อนรับผู้โดยสาร ทีมต้องมั่นใจสุดๆ ว่าวิ่งจริงแล้วจะไม่พัง", { facts: [TRAIN] }),
        host("ลองทายดู ก่อนส่งมอบ ตู้นี้วิ่งทดสอบไปทั้งหมดกี่กิโล", { facts: [TRAIN], mood: "wink" })
      ),
      {
        kind: "game",
        id: "testrun",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "ก่อนส่งมอบ รถไฟไทยทำวิ่งทดสอบไปกี่กิโลเมตร",
            min: 0,
            max: 30000,
            step: 500,
            unit: "count",
            answer: 10000,
            answerFactId: TRAIN,
            buckets: [2000, 5000, 9000, 15000, 30001],
            chart: {
              kind: "bars",
              bars: [{ labelTh: "ระยะวิ่งทดสอบ รถไฟไทยทำ (กม.)", value: null }],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เกินตัวเลขที่ทีมแจ้งไว้ {d} กม.",
            underTh: "เธอเดาต่ำไป {d} กม.",
            nearWithin: 1500,
            revealTh: "เธอเดา {g} กม. ทีมแจ้งว่าวิ่งทดสอบไปกว่า 10,000 กม.",
          },
        },
        track: { done: "dream:testrun-guess", value: "bucket" },
        answersTh: [
          "ก่อนส่งมอบเมื่อ ก.ค. 2569 รถไฟไทยทำวิ่งทดสอบไปกว่า 10,000 กม.",
          "ตู้ยาว 24 เมตร มี 25 ที่นั่ง ชิ้นส่วนทำในไทย 44.1% (ตัวเลขจากทีมที่สร้าง)",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "testrun.plus" },
          { at: 900, action: "tap", target: "testrun.plus" },
          { at: 1200, action: "tap", target: "testrun.plus" },
          { at: 2000, action: "tap", target: "testrun.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-train", "stat", "วิ่งทดสอบกว่า 10,000 กม. วิ่งได้เร็วสุด 120 กม./ชม. ชิ้นส่วนทำในไทย 44.1%", {
        title: "ตัวเลขจากทีมที่สร้าง",
        facts: [TRAIN],
        badge: "vendor",
      }),
      dialogue(
        "who",
        host("ตู้นี้ ทีมวิจัยในไทยออกแบบตัวรถเองเลยนะ", { facts: [TRAIN] }),
        me("แปลว่าคนอย่างเรา ก็ทำของแบบนี้ได้เหรอ"),
        host("นั่นแหละโจทย์ของรันนี้", { mood: "wink" })
      )
    ),
    beat(
      "beat-flip",
      "ยังมีอีก",
      dialogue("flip-intro", host("ไม่ได้มีแค่รถไฟนะ พลิกดูว่ามีอะไรสร้างในไทยอีก")),
      {
        kind: "game",
        id: "made-in-th",
        game: {
          engine: "FlipCards",
          data: {
            highlightTh: "ในไทย",
            cards: [
              {
                id: "eco",
                frontTh: "รถที่เด็กวิทยาลัยเทคนิคสร้างเอง ประหยัดเชื้อเพลิงได้ขนาดไหน",
                backTh: "ทีม Virgin วิทยาลัยเทคนิคสกลนคร สร้างรถเองในไทย คว้าที่ 1 ประเภทรถต้นแบบ ใช้เอทานอล 1 ลิตร วิ่งได้เทียบเท่า 1,867.8 กม.",
                dateTh: "ก.ค. 2566",
                factIds: [ECO],
              },
              {
                id: "cars",
                frontTh: "รถยนต์ที่วิ่งอยู่บนถนน มาจากไหน",
                backTh: "ปี 2568 โรงงานในไทยผลิตรถยนต์ได้ 1,455,569 คัน ทั้งขายในประเทศและส่งออก",
                dateTh: "ปี 2568",
                factIds: [CARS],
              },
              {
                id: "aircon",
                frontTh: "แอร์ติดผนังในห้องนอน มาจากไหน",
                backTh: "ปี 2567 แอร์ติดผนังที่ผลิตในไทย ส่งออกไปกว่า 21 ล้านเครื่อง ไทยเป็นผู้ส่งออกแอร์อันดับ 3 ของโลก รองจากจีนกับเม็กซิโก",
                dateTh: "ปี 2567",
                factIds: [AIRCON],
              },
            ],
          },
        },
        track: { done: "dream:flipped", value: "count", milestones: { flip: "dream:flip" } },
        answersTh: [
          "รถประหยัดพลังงาน: ทีม Virgin วิทยาลัยเทคนิคสกลนคร เอทานอล 1 ลิตร วิ่งได้เทียบเท่า 1,867.8 กม.",
          "รถยนต์: ปี 2568 ไทยผลิตได้ 1,455,569 คัน",
          "แอร์ติดผนัง: ปี 2567 ไทยส่งออกกว่า 21 ล้านเครื่อง เป็นผู้ส่งออกแอร์อันดับ 3 ของโลก",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "made-in-th.card-eco" },
          { at: 2000, action: "tap", target: "made-in-th.card-aircon" },
          { at: 4000, action: "wait" },
        ],
      },
      item(
        "honesty",
        "intel",
        "ตัวเลขรถไฟไทยทำ ทีมที่สร้างแจ้งเองตอนส่งมอบ ส่วนรถประหยัดพลังงานเป็นรถต้นแบบที่สร้างมาแข่งในสนาม ไม่ใช่รถที่ขับบนถนนทุกวัน และ 1,867.8 กม. เป็นระยะที่คำนวณเทียบ ไม่ใช่ระยะที่ขับจริง",
        { title: "พูดตรงๆ", facts: [TRAIN, ECO] }
      ),
      dialogue(
        "exit",
        host("แต่ของแบบนี้ไม่มีอันไหนดีตั้งแต่วันแรกนะ ต้องทดสอบแล้วแก้มาหลายรอบ", { mood: "serious" }),
        sys("ด่านต่อไป: ลองทำงานจริง ทำยังไงให้เครื่องไม่พัง")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "รถไฟที่ทีมวิศวะไทยออกแบบเอง วิ่งทดสอบกว่า 10,000 กม. ก่อนส่งมอบ", factIds: [TRAIN, ECO] },
    variantsTh: [
      "นักศึกษาเทคนิคไทยสร้างรถ ใช้เอทานอล 1 ลิตร วิ่งได้เทียบเท่า 1,867.8 กม.",
      "รถไฟ รถยนต์ แอร์ ที่เธอใช้ทุกวัน หลายอย่างผลิตในไทยนี่เอง",
    ],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบรถไฟ หรือชอบแกะของดูข้างใน",
    visual: [
      "ตู้รถไฟสีครีมแล่นออกจากสถานีตอนกลางคืน ป้าย สร้างในไทย ประทับลงมา",
      "ตัวนับระยะทางวิ่งถึง 10,000 กม. รางรถไฟคดเคี้ยวทั่วแผนที่ไทย",
      "การ์ดสามใบพลิกทีละใบ รถแข่งคันเล็ก รถยนต์ แอร์ คำว่า ในไทย สว่างขึ้นทุกใบ",
    ],
  },
};
