/**
 * Level 1 · dream. The hook: Moo Deng, the pygmy hippo the whole world knew
 * in Sep 2024, was made famous by the keeper who looks after her, after about
 * five years of filming the animals in his care, and he said before she was
 * born that he would make her famous. Not only luck: a plan. Guess how many people
 * came to the zoo on a weekday after the clips, then flip what followed (an
 * award, a trademark, a 24-hour live feed, a 2nd birthday party). Honest end:
 * fame rises and falls; the storytelling skill stays. No pay, no market data.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { answer, beat, choice, dialogue, host, item, me, sys } from "../../_shared/story";

const KEEPER = "f.cc-moodeng-keeper" as const;
const VISITORS = "f.cc-moodeng-visitors" as const;
const AWARD = "f.cc-moodeng-award" as const;
const BRAND = "f.cc-moodeng-brand" as const;
const BIRTHDAY = "f.cc-moodeng-birthday" as const;
const FADE = "f.cc-moodeng-fade" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "หมูเด้งไม่ได้ดังแค่เพราะดวง",
  questionTh: "หมูเด้งดังไปทั้งโลกได้ยังไง แล้วใครอยู่หลังคลิปพวกนั้น",
  navLabelTh: "หมูเด้ง",
  asOf: "2026-11-20",
  minutes: 2,
  factIds: [KEEPER, VISITORS, AWARD, BRAND, BIRTHDAY, FADE],
  og: {
    headlineTh: "หมูเด้งไม่ได้ดังแค่เพราะดวง คนเลี้ยงถ่ายคลิปมาก่อนตั้งนานแล้ว",
    stat: { th: "พอหมูเด้งดัง วันธรรมดามีคนมาสวนสัตว์จากราว 800 เป็นกว่า 4,000", factIds: [VISITORS], badge: "vendor" },
  },
  blocks: [
    dialogue("intro", host("ลุยรันสายคอนเทนต์กันเลย เปิดด้วยฮิปโปที่ทั้งโลกรู้จัก", { mood: "wow" })),
    choice(
      "why-viral",
      host("หมูเด้งดังไปทั่วโลกเลย เธอว่าเพราะอะไร"),
      answer("luck", "น่าจะดวงล้วนๆ อะ", host("ดวงก็มีส่วนจริง แต่ก่อนดวงจะมา ต้องมีคนถ่ายไว้ก่อนนะ", { mood: "wink" })),
      answer("cute", "ก็น่ารักซะขนาดนั้นอะ", host("จริงไม่เถียง แต่ฮิปโปน่ารักมีเยอะแยะ ตัวนี้มีคนถ่ายให้โลกเห็นไง")),
      answer("filmed", "ต้องมีคนตั้งใจถ่ายไว้แน่ๆ เลย", host("ตาถึงนะเธอ คนเลี้ยงถ่ายคลิปสัตว์มาหลายปี ก่อนหมูเด้งจะดังซะอีก", { mood: "wow" }))
    ),
    item(
      "intel-keeper",
      "intel",
      "พี่เบนซ์ คนเลี้ยงฮิปโปที่สวนสัตว์เปิดเขาเขียว ถ่ายคลิปสัตว์ที่ตัวเองดูแลลงโซเชียลมาราว 5 ปี ก่อนหมูเด้งจะดัง เป็นแอดมินเพจ ขาหมู แอนด์ เดอะแก๊ง",
      { title: "แฟ้ม: คนเลี้ยงที่ถือกล้อง", facts: [KEEPER] }
    ),
    dialogue(
      "plan",
      host("ตอนลูกฮิปโปแคระยังไม่คลอด เขาบอกไว้เลยว่าจะปั้นให้ดัง", { facts: [KEEPER] }),
      host("ไม่ได้นั่งรอดวงลอยมานะ เขาคิดแผนไว้ก่อนแล้ว", { mood: "wink" })
    ),
    beat(
      "beat-guess",
      "ลองทายดู",
      dialogue(
        "guess-intro",
        host("ผอ.สวนสัตว์เล่าว่า ก่อนหมูเด้งดัง วันธรรมดามีคนมาราว 800 คน", { facts: [VISITORS] }),
        host("พอหมูเด้งไวรัล วันธรรมดามีคนมากี่คน ลองทายดูสิ", { mood: "wink" })
      ),
      {
        kind: "game",
        id: "visitors",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "หลังหมูเด้งดัง วันธรรมดามีคนมาสวนสัตว์กี่คน",
            min: 0,
            max: 10000,
            step: 250,
            unit: "count",
            answer: 4000,
            answerFactId: VISITORS,
            buckets: [1000, 2500, 3500, 5000, 10001],
            chart: {
              kind: "bars",
              bars: [
                { labelTh: "ก่อนดัง (วันธรรมดา)", value: 800 },
                { labelTh: "หลังดัง ก.ย. 2567 (วันธรรมดา)", value: null },
              ],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอเดาสูงไป {d} คน",
            underTh: "เธอเดาต่ำไป {d} คน",
            nearWithin: 500,
            revealTh: "เธอเดา {g} คน ของจริงคือกว่า 4,000 คน",
          },
        },
        track: { done: "dream:visitors-guess", value: "bucket" },
        answersTh: [
          "ก่อนหมูเด้งดัง วันธรรมดามีคนมาราว 800 คน หลังดังมีกว่า 4,000 คน",
          "เสาร์อาทิตย์จากราว 3,000 เป็นกว่า 10,000 คน (ตัวเลขของ ผอ.สวนสัตว์ ที่ AP รายงาน ก.ย. 2567)",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "visitors.plus" },
          { at: 900, action: "tap", target: "visitors.plus" },
          { at: 1200, action: "tap", target: "visitors.plus" },
          { at: 2000, action: "tap", target: "visitors.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-visitors", "stat", "วันธรรมดา จากราว 800 เป็นกว่า 4,000 คน เสาร์อาทิตย์ จากราว 3,000 เป็นกว่า 10,000 คน", {
        title: "คนมาสวนสัตว์ ก.ย. 2567",
        meta: "ตัวเลขของ ผอ.สวนสัตว์ ที่ AP รายงาน",
        facts: [VISITORS],
        badge: "vendor",
      }),
      dialogue(
        "who",
        host("พอหมูเด้งดังในโซเชียล คนจริงๆ ก็แห่มาหน้าบ่อกันเต็มเลยนะ", { mood: "wow" }),
        me("งั้นคลิปที่ฉันถ่ายเอง ก็ทำได้แบบนี้เหรอ"),
        host("บอกตรงๆ ไม่มีใครรู้ว่าคลิปไหนจะปัง แต่สกิลเล่าเรื่องฝึกได้ ลองรันนี้เลย", { mood: "wink" })
      )
    ),
    beat(
      "beat-flip",
      "แล้วหลังจากนั้นล่ะ",
      dialogue(
        "flip-intro",
        host("คลิปดังแล้วงานจบเลยไหม บอกเลยว่าไม่ ของจริงเพิ่งเริ่ม"),
        host("ลองพลิกการ์ดดูสิ หลังคลิปดังมีอะไรตามมาบ้าง")
      ),
      {
        kind: "game",
        id: "after-viral",
        game: {
          engine: "FlipCards",
          data: {
            highlightTh: "มีคนทำงานอยู่เบื้องหลัง",
            cards: [
              {
                id: "trademark",
                frontTh: "สวนสัตว์เริ่มจดชื่อ หมูเด้ง",
                backTh: "เริ่มจดเครื่องหมายการค้า และดูแลลิขสิทธิ์ภาพหมูเด้ง กันคนอื่นเอาไปหาประโยชน์ งานดูแลแบรนด์แบบนี้ มีคนทำงานอยู่เบื้องหลัง",
                dateTh: "ก.ย. 2567",
                factIds: [BRAND],
              },
              {
                id: "live",
                frontTh: "เปิดไลฟ์ให้ดูหมูเด้งได้ 24 ชั่วโมง",
                backTh: "ให้แฟนคลับที่มาไม่ได้ ดูออนไลน์ได้ทั้งวันทั้งคืน กล้องไม่ได้เปิดเอง มีคนทำงานอยู่เบื้องหลัง",
                dateTh: "ก.ย. 2567",
                factIds: [BRAND],
              },
              {
                id: "award",
                frontTh: "คลิปหมูเด้งคว้ารางวัลวิดีโอแห่งปี",
                backTh: "TikTok Awards สาขา Video of the year ตกเป็นของพี่เบนซ์ คนเลี้ยงที่ถ่ายเองโพสต์เอง มีคนทำงานอยู่เบื้องหลัง",
                dateTh: "2 พ.ย. 2567",
                factIds: [AWARD],
              },
              {
                id: "birthday",
                frontTh: "ปาร์ตี้วันเกิดครบ 2 ขวบ",
                backTh: "งาน หมูเด้ง HAPPY เด้ง DAY วันที่ 10 ถึง 12 ก.ค. 2569 ผ่านมาสองปีตั้งแต่หมูเด้งเกิด ก็ยังมีคนทำงานอยู่เบื้องหลัง",
                dateTh: "ก.ค. 2569",
                factIds: [BIRTHDAY],
              },
            ],
          },
        },
        track: { done: "dream:flipped", value: "count", milestones: { flip: "dream:flip" } },
        answersTh: [
          "สวนสัตว์เริ่มจดเครื่องหมายการค้า และดูแลลิขสิทธิ์ภาพหมูเด้ง (ก.ย. 2567)",
          "เปิดไลฟ์ให้ดูได้ 24 ชั่วโมง สำหรับคนที่มาไม่ได้ (ก.ย. 2567)",
          "คลิปของพี่เบนซ์ได้รางวัล TikTok Awards สาขา Video of the year (2 พ.ย. 2567)",
          "ฉลองวันเกิดครบ 2 ขวบ 10 ถึง 12 ก.ค. 2569",
          "ทุกอย่างมีคนทำงานอยู่เบื้องหลัง",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "after-viral.card-award" },
          { at: 2000, action: "tap", target: "after-viral.card-trademark" },
          { at: 4000, action: "wait" },
        ],
      },
      item(
        "honesty",
        "intel",
        "กระแสมีขึ้นมีลง กลางปี 2568 ผอ.สวนสัตว์บอกว่าวันธรรมดาเหลือราว 2,000 คน ส่วนพี่เบนซ์บอกไว้ตั้งแต่ตอนที่หมูเด้งเพิ่งดังว่า ยังมีลูกสัตว์ตัวอื่นที่เขาเตรียมเล่าเรื่องต่อ",
        { title: "พูดตรงๆ", facts: [FADE], badge: "vendor" }
      ),
      dialogue(
        "exit",
        host("ตัวเลขขึ้นลงได้เสมอ แต่สกิลเล่าเรื่องติดตัวเธอไปตลอด", { mood: "serious", labels: ["teamView"] }),
        sys("ด่านต่อไป: งานจริงของครีเอเตอร์ ไม่ได้จบแค่กดถ่าย")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "หมูเด้งไม่ได้ดังแค่เพราะดวง คนเลี้ยงถ่ายคลิปมาราว 5 ปีก่อนหน้านั้น", factIds: [KEEPER] },
    variantsTh: ["คนเลี้ยงบอกไว้ก่อนคลอด ว่าจะปั้นฮิปโปตัวนี้ให้ดัง", "คลิปไม่กี่วิ พาคนมายืนถึงขอบบ่อหมูเด้ง"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบถ่ายคลิปดูเลย",
    visual: [
      "บ่อฮิปโปยามค่ำ แสงจอมือถือส่องจากขอบบ่อ",
      "ตัวนับวิ่งจาก 800 ไปเกิน 4,000 แล้วแถวคนยืดยาว",
      "การ์ดสี่ใบพลิกทีละใบ คำว่า มีคนทำงานอยู่เบื้องหลัง สว่างขึ้นทุกใบ",
    ],
  },
};
