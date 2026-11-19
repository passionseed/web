/**
 * Level 1 · dream. The hook: a dancing mascot most students have scrolled
 * past (Butterbear's หมีเนย, 2024), and the thinking behind it. Guess how much
 * people talked about it in 12 days (a social-listening count, which is itself
 * marketing work), then sort real clues into the three questions a marketer
 * asks: who is it for, what do they feel, where do they see it. Honest about
 * luck. A public case from the news: no tie to the brand, no endorsement.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { answer, beat, choice, dialogue, host, item, me, sys } from "../../_shared/story";

const FANS = "f.mkt-butterbear-fans" as const;
const CHINA = "f.mkt-butterbear-china" as const;
const BUZZ = "f.mkt-butterbear-buzz" as const;
const LUCK = "f.mkt-mascot-luck" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "หมีเนยปัง เพราะมีคนคิด",
  questionTh: "แบรนด์ที่ใครๆ ก็พูดถึง มันดังเอง หรือมีคนคิดไว้",
  navLabelTh: "หมีเนยปังเพราะ",
  asOf: "2026-11-20",
  minutes: 2,
  factIds: [FANS, CHINA, BUZZ, LUCK],
  og: {
    headlineTh: "หมีเต้นตัวเดียว คนพูดถึงราว 13.6 ล้านครั้งใน 12 วัน เบื้องหลังคืองานการตลาด",
    stat: { th: "1 ถึง 12 มิ.ย. 2567 หมีเนยมีเอนเกจเมนต์ราว 13.6 ล้านครั้ง", factIds: [BUZZ] },
  },
  blocks: [
    dialogue(
      "intro",
      host("เปิดรันสายการตลาด เริ่มจากเรื่องที่เธอน่าจะเคยไถฟีดเจอ", { mood: "wow" }),
      host("หมีเต้นหน้าห้าง ที่คนแห่ไปต่อคิวรอเจอตัวจริง")
    ),
    choice(
      "why-viral",
      host("เธอว่าหมีเนยดังขึ้นมาได้ยังไง"),
      answer("luck", "ดวงล้วนๆ คลิปมันไวรัลไปเอง", host("ดวงมีส่วนจริง แต่พอคลิปดัง มีคนคิดต่อไว้ทุกก้าวเลยนะ", { mood: "wink" })),
      answer("cute", "ก็น่ารักอะ ใครเห็นก็โดนตก", host("น่ารักอย่างเดียวไม่พอหรอก ต้องรู้ด้วยว่าน่ารักให้ใครดู", { mood: "wow" })),
      answer(
        "never",
        "ไม่เคยสงสัยเลยอะ",
        host("ไม่แปลกเลย ปกติเราเห็นแต่ตอนมันดังแล้ว ไม่เคยเห็นคนที่คิดไว้"),
        host("งั้นไปแอบส่องเบื้องหลังกัน", { mood: "wink" })
      )
    ),
    item(
      "intel-origin",
      "intel",
      "หมีเนยคือมาสคอตของ Butterbear ร้านขนมเล็กๆ ในห้าง EmSphere ร้านสร้างหมีตัวนี้ขึ้นมา เป็นภาพจำของแบรนด์",
      { title: "แฟ้ม: หมีเนย", facts: [FANS] }
    ),
    beat(
      "beat-guess",
      "ลองทายดู",
      dialogue(
        "guess-intro",
        host("กลางปี 2567 มีบริษัทนั่งนับเลยว่าคนพูดถึงหมีเนยบนโซเชียลแค่ไหน", { facts: [BUZZ] }),
        host("ลองทายดู 12 วันแรกของ มิ.ย. ไลก์ คอมเมนต์ แชร์ รวมกันกี่ครั้ง", { facts: [BUZZ], mood: "wink" })
      ),
      {
        kind: "game",
        id: "buzz",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "1 ถึง 12 มิ.ย. 2567 คนเอนเกจกับหมีเนยรวมกี่ครั้ง",
            min: 0,
            max: 30000000,
            step: 500000,
            unit: "count",
            answer: 13600000,
            answerFactId: BUZZ,
            buckets: [2000000, 6000000, 12000000, 16000000, 30000001],
            chart: {
              kind: "bars",
              bars: [{ labelTh: "เอนเกจเมนต์เรื่องหมีเนย (1 ถึง 12 มิ.ย. 2567)", value: null }],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอเดาสูงไป {d} ครั้ง",
            underTh: "เธอเดาต่ำไป {d} ครั้ง",
            nearWithin: 1500000,
            revealTh: "เธอเดา {g} ของจริงคือราว 13.6 ล้านครั้ง",
          },
        },
        track: { done: "dream:buzz-guess", value: "bucket" },
        answersTh: [
          "1 ถึง 12 มิ.ย. 2567 หมีเนยมีเอนเกจเมนต์บนโซเชียลราว 13.6 ล้านครั้ง (นับโดย Zanroo)",
          "ราว 73.3% มาจาก TikTok",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "buzz.plus" },
          { at: 900, action: "tap", target: "buzz.plus" },
          { at: 1200, action: "tap", target: "buzz.plus" },
          { at: 2000, action: "tap", target: "buzz.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-buzz", "stat", "ราว 13.6 ล้านเอนเกจเมนต์ใน 12 วัน ราว 73.3% มาจาก TikTok", {
        title: "ตัวเลขจาก Zanroo",
        meta: "1 ถึง 12 มิ.ย. 2567",
        facts: [BUZZ],
      }),
      dialogue(
        "who-counts",
        host("คนที่นั่งนับตัวเลขพวกนี้ ก็ทำงานสายการตลาดเหมือนกันนะ"),
        me("แต่ดังขนาดนี้ มันคิดไว้ก่อน หรือฟลุกกันแน่"),
        host("ไปแกะดูด้วยกันเลย", { mood: "wink" })
      )
    ),
    beat(
      "beat-clues",
      "แกะเบาะแส",
      dialogue(
        "clues-intro",
        host("นักการตลาดถามแค่นี้: ใครคือคนดู เขารู้สึกอะไร แล้วเห็นจากที่ไหน"),
        host("ลองจับเบาะแสพวกนี้แยกใส่ช่องดูนะ", { facts: [FANS, CHINA] })
      ),
      {
        kind: "game",
        id: "clues",
        game: {
          engine: "SortGame",
          data: {
            layout: "cards",
            tagTh: "แกะเบาะแสหมีเนย",
            goalTh: "แยกเบาะแส: ใคร รู้สึกอะไร เห็นที่ไหน",
            bins: [
              { id: "who", labelTh: "ใครคือแฟน" },
              { id: "feel", labelTh: "เขารู้สึกอะไร" },
              { id: "where", labelTh: "เห็นจากที่ไหน" },
            ],
            items: [
              {
                id: "adults",
                labelTh: "แฟนส่วนใหญ่ไม่ใช่เด็กเล็ก แต่เป็นผู้ใหญ่วัยทำงาน",
                answer: "who",
                revealTh: "หมีน่ารัก แต่คนที่รักที่สุดคือผู้ใหญ่ ที่เรียกตัวเองว่ามัมหมี",
              },
              {
                id: "stress",
                labelTh: "อยากพักใจจากความเครียดเรื่องงาน",
                answer: "feel",
                revealTh: "ดูหมีเต้นแล้วได้พัก แฟนๆ เลยเรียกว่าฮีลใจ",
              },
              {
                id: "tiktok",
                labelTh: "ไถ TikTok ทีไรก็เจอ",
                answer: "where",
                revealTh: "เอนเกจเมนต์ราว 73.3% อยู่บน TikTok คนดูอยู่ที่ไหน หมีก็ไปอยู่ที่นั่น",
              },
              {
                id: "teddy",
                labelTh: "นึกถึงตุ๊กตาหมีตอนเด็ก",
                answer: "feel",
                revealTh: "ความคิดถึงวัยเด็ก เป็นความรู้สึกที่แบรนด์ไม่ต้องอธิบายเลย",
              },
              {
                id: "tourists",
                labelTh: "นักท่องเที่ยวจีนที่แวะมาหาถึงห้าง",
                answer: "who",
                revealTh: "แฟนไม่ได้มีแค่คนไทย บางคนตั้งใจมาหาถึงห้างเลย",
              },
              {
                id: "fan-clip",
                labelTh: "คลิปเต้นที่นักท่องเที่ยวจีนถ่าย แล้วไปดังในจีน",
                answer: "where",
                nearTh: { who: "ใช่ แฟนจีนก็เป็นคนดู แต่เบาะแสข้อนี้บอกว่าคนเห็นหมีจากที่ไหน" },
                revealTh: "คลิปที่ดังที่สุด แบรนด์ไม่ได้ถ่ายเอง แฟนเป็นคนถ่าย",
              },
            ],
            resultTh: "แยกถูก {score}/{total}",
          },
        },
        track: { done: "dream:clues", value: "score" },
        answersTh: [
          "ใครคือแฟน: ผู้ใหญ่วัยทำงาน (มัมหมี), นักท่องเที่ยวจีน",
          "เขารู้สึกอะไร: อยากพักใจจากงาน, คิดถึงตุ๊กตาหมีตอนเด็ก",
          "เห็นจากที่ไหน: TikTok, คลิปที่แฟนถ่ายแล้วไปดังในจีน",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "clues.item-adults" },
          { at: 1400, action: "tap", target: "clues.bin-who" },
          { at: 3200, action: "wait" },
        ],
      },
      dialogue(
        "queue",
        host("แถมยังเปิดให้เจอตัวจริงทุกสัปดาห์ จนมีคนมาต่อคิวตั้งแต่ตี 4 กว่าๆ", { facts: [CHINA] })
      ),
      item(
        "honesty",
        "intel",
        "ไม่มีใครสั่งให้ไวรัลได้ อาจารย์การตลาดจุฬาฯ บอกว่าจังหวะกับโชคก็มีส่วน แบรนด์เลยต้องทำต่อเนื่อง เรื่องนี้เล่าจากข่าว เราไม่ได้ทำงานกับแบรนด์นี้",
        { title: "พูดตรงๆ", facts: [LUCK] }
      ),
      dialogue(
        "exit",
        host("หมีน่ารักมีเต็มไปหมด แต่ตัวนี้รู้ชัดว่าน่ารักให้ใครดู", { mood: "wink" }),
        sys("ด่านต่อไป: ถึงตาเธอวางแผนให้ร้านจริงบ้างแล้ว")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "หมีเต้นตัวเดียว คนพูดถึงราว 13.6 ล้านครั้งใน 12 วัน เบื้องหลังคืองานการตลาด", factIds: [BUZZ] },
    variantsTh: ["คนที่รักหมีเนยที่สุด ไม่ใช่เด็กเล็กนะ", "หมีน่ารักมีเต็มไปหมด ทำไมตัวนี้ถึงปัง"],
    sendToFriendTh: "ส่งให้เพื่อนที่เป็นมัมหมีดูเลย",
    visual: [
      "หมีพิกเซลเต้นหน้าห้างตอนเย็น ฟองไลก์กับคอมเมนต์ลอยขึ้นเต็มจอ",
      "ตัวนับวิ่งถึงราว 13.6 ล้าน แถบ TikTok ยาวกว่าแถบอื่นเยอะ",
      "ป้าย ใคร รู้สึกอะไร เห็นที่ไหน ขึ้นมาทีละป้าย แล้วเบาะแสบินเข้าแต่ละป้าย",
    ],
  },
};
