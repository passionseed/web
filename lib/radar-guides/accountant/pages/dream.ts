/**
 * Level 1 · dream. The hook: the person who asks whether the numbers are
 * true. In 2023 a special audit of STARK, a listed Thai wire and cable
 * company, found 202 unusual sales sitting in the books like normal ones.
 * Guess how many, then flip the four clues the checkers followed (ask the
 * customer, follow the payment, check the payer's name, see whose account
 * paid). Ends on the question the work level answers: if AI records
 * everything, what do people do?
 *
 * Never name a person or an audit firm; the criminal case is not decided.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { answer, beat, choice, dialogue, host, item, me, sys } from "../../_shared/story";

const AUDIT = "f.acc-stark-audit" as const;
const SEC = "f.acc-stark-sec" as const;
const TOOLS = "f.acc-ai-tools" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "คนที่ถามว่าตัวเลขจริงไหม",
  questionTh: "ใครเป็นคนถามว่าตัวเลขในบัญชีจริงไหม",
  navLabelTh: "ตัวเลขจริงไหม",
  asOf: "2026-11-20",
  minutes: 2,
  factIds: [AUDIT, SEC, TOOLS],
  og: {
    headlineTh: "ยอดขายดูดีทุกบรรทัด จนมีคนถามว่ามันจริงไหม",
    stat: { th: "ทีมตรวจพิเศษเจอรายการขายผิดปกติ 202 รายการ ในบริษัทเดียว", factIds: [AUDIT] },
  },
  blocks: [
    dialogue("intro", host("เปิดรันสายบัญชีกันเลย ขอถามข้อเดียวก่อนนะ", { mood: "wow" })),
    choice(
      "picture",
      host("พอพูดถึงนักบัญชี ภาพแรกในหัวเธอคืออะไรอะ"),
      answer(
        "calc",
        "นั่งกดเครื่องคิดเลขทั้งวัน",
        host("ภาพนั้นกำลังเปลี่ยนนะ เดี๋ยวนี้โปรแกรมช่วยลงตัวเลขให้เพียบเลย", { facts: [TOOLS] }),
        host("ส่วนงานที่เหลือให้คนทำ สนุกกว่าที่คิดเยอะเลย", { mood: "wink" })
      ),
      answer("tax", "ทำภาษีให้บริษัทมั้ง", host("ก็ใช่ส่วนหนึ่งนะ แต่ยังมีอีกงานที่คนไม่ค่อยรู้", { mood: "wow" })),
      answer(
        "unsure",
        "ไม่รู้เลย ยังไม่เคยเจอนักบัญชีตัวจริง",
        host("ไม่แปลกหรอก งานนี้อยู่เบื้องหลังตลอดเลย"),
        host("แต่บางที นักบัญชีนี่แหละ ที่เจออะไรซ่อนอยู่ในตัวเลข", { mood: "wink" })
      )
    ),
    dialogue(
      "case",
      host("ปี 2566 มีบริษัทใหญ่ในตลาดหุ้นไทยชื่อ STARK ทำสายไฟเป็นหลัก", { facts: [AUDIT] }),
      host("ดูจากงบก็เหมือนขายดีนะ แต่มีทีมตรวจพิเศษเข้าไปไล่เช็กละเอียด", { facts: [AUDIT], mood: "serious" })
    ),
    item(
      "intel-audit",
      "intel",
      "ก.ล.ต. ให้ขยายขอบเขตการตรวจ ทีมตรวจพิเศษเลยไล่เช็กรายการขายย้อนหลังของ STARK",
      { title: "แฟ้ม: ตรวจพิเศษ", facts: [AUDIT] }
    ),
    beat(
      "beat-guess",
      "ลองทายดู",
      dialogue(
        "guess-intro",
        host("แล้วผลตรวจก็ออกมา", { facts: [AUDIT] }),
        host("ลองทายดิ เขาเจอรายการขายผิดปกติกี่รายการ", { facts: [AUDIT], mood: "wink" })
      ),
      {
        kind: "game",
        id: "sales",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "ทีมตรวจพิเศษเจอรายการขายผิดปกติใน STARK กี่รายการ",
            min: 0,
            max: 500,
            step: 10,
            unit: "count",
            answer: 202,
            answerFactId: AUDIT,
            buckets: [50, 100, 200, 300, 501],
            chart: {
              kind: "bars",
              bars: [{ labelTh: "รายการขายผิดปกติที่ทีมตรวจเจอ", value: null }],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอทายเกินไป {d} รายการ",
            underTh: "เธอทายน้อยไป {d} รายการ",
            nearWithin: 20,
            revealTh: "เธอทาย {g} แต่ของจริงคือ 202 รายการ",
          },
        },
        track: { done: "dream:sales-guess", value: "bucket" },
        answersTh: [
          "ทีมตรวจพิเศษเจอรายการขายผิดปกติ 202 รายการ",
          "มูลค่า 8,063 ล้านบาทในปี 2565 และ 3,593 ล้านบาทในปี 2564",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "sales.plus" },
          { at: 900, action: "tap", target: "sales.plus" },
          { at: 1200, action: "tap", target: "sales.plus" },
          { at: 2000, action: "tap", target: "sales.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item("stat-sales", "stat", "202 รายการ มูลค่า 8,063 ล้านบาทในปี 2565 และ 3,593 ล้านบาทในปี 2564", {
        title: "ฐานเศรษฐกิจ มิ.ย. 2566",
        facts: [AUDIT],
        badge: "confirmed",
      }),
      dialogue(
        "guess-after",
        host("ทุกรายการอยู่ในบัญชีครบ ดูผ่านๆ ก็เหมือนยอดขายปกติ", { facts: [AUDIT], mood: "serious" }),
        me("อ้าว แล้วเขาจับได้ยังไงอะ"),
        host("มีเบาะแสอยู่สี่อย่าง ลองพลิกดูทีละใบเลย", { mood: "wink" })
      )
    ),
    beat(
      "beat-clues",
      "เขาจับได้ยังไง",
      {
        kind: "game",
        id: "clues",
        game: {
          engine: "FlipCards",
          data: {
            highlightTh: "เบาะแส",
            cards: [
              {
                id: "customer",
                frontTh: "ถามลูกค้าตรงๆ ว่าซื้อไปจริงไหม",
                backTh: "ทีมตรวจขอให้ลูกค้ายืนยันยอดซื้อ ยอดที่ลูกค้าไม่ยืนยัน คือจุดแรกที่ต้องไล่ต่อ",
                dateTh: "มิ.ย. 2566",
                factIds: [AUDIT],
              },
              {
                id: "payment",
                frontTh: "ดูว่าลูกค้าจ่ายเงินเข้ามายังไง",
                backTh: "ตรวจการรับชำระเงิน แล้วเจอว่าบางรายการจ่ายเงินแบบไม่ปกติ",
                dateTh: "มิ.ย. 2566",
                factIds: [AUDIT],
              },
              {
                id: "name",
                frontTh: "เช็กชื่อคนที่จ่ายเงิน",
                backTh: "ทีมตรวจเจอว่าบางรายการ ชื่อผู้จ่ายเงินถูกปลอมขึ้นมา",
                dateTh: "มิ.ย. 2566",
                factIds: [AUDIT],
              },
              {
                id: "account",
                frontTh: "เงินที่ลูกค้าควรจ่าย ใครเป็นคนโอน",
                backTh: "ทีมตรวจเจอว่าบางรายการ เงินมาจากบัญชีอดีตพนักงาน แทนที่จะมาจากลูกค้า",
                dateTh: "มิ.ย. 2566",
                factIds: [AUDIT],
              },
            ],
          },
        },
        track: { done: "dream:clues", value: "count", milestones: { flip: "dream:flip" } },
        answersTh: [
          "ถามลูกค้าให้ยืนยันยอดซื้อ",
          "ตรวจว่าลูกค้าจ่ายเงินเข้ามายังไง แล้วเจอการจ่ายเงินที่ไม่ปกติ",
          "เจอชื่อผู้จ่ายเงินที่ถูกปลอม",
          "เจอเงินที่โอนจากบัญชีอดีตพนักงาน แทนที่จะมาจากลูกค้า",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "clues.card-name" },
          { at: 2000, action: "tap", target: "clues.card-account" },
          { at: 4000, action: "wait" },
        ],
      },
      item(
        "honesty",
        "intel",
        "ก.ล.ต. กล่าวโทษอดีตกรรมการและผู้บริหาร 10 ราย ต่อ DSI ในปี 2566 แล้วปี 2569 ก็กล่าวโทษผู้สอบบัญชีที่ตรวจงบปีก่อนๆ ด้วย โดยชี้ว่าตรวจไม่ได้มาตรฐาน แต่นี่แค่จุดเริ่มต้นของคดี ใครผิดหรือไม่ ยังต้องรอการสอบสวนและศาล",
        { title: "พูดตรงๆ", facts: [SEC] }
      ),
      dialogue(
        "exit",
        host("เบาะแสพวกนี้จะโผล่มา ก็ตอนที่มีคนถามว่าตัวเลขนี้จริงไหม", { mood: "serious" }),
        host("คำถามนี้แหละ หัวใจของงานบัญชีเลย", { mood: "wow" }),
        sys("คำถามต่อไป: ถ้า AI ลงบัญชีให้หมดแล้ว คนจะทำอะไร")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "ยอดขายดูดีทุกบรรทัด จนมีคนถามว่ามันจริงไหม" },
    variantsTh: ["ทีมตรวจเจอรายการขายผิดปกติ 202 รายการ ลองดูว่าเขาจับได้ยังไง", "นักบัญชีไม่ได้แค่กดเครื่องคิดเลข บางคนคือคนที่เจอว่าตัวเลขผิดปกติ"],
    sendToFriendTh: "ส่งให้เพื่อนที่คิดว่านักบัญชีน่าเบื่อดูเลย",
    visual: [
      "บรรทัดยอดขายเรียงลงมาสวยๆ แล้วบางบรรทัดเริ่มกะพริบ",
      "ตัวนับวิ่งถึง 202",
      "การ์ดเบาะแสสี่ใบพลิกทีละใบ ลูกค้า เงิน ชื่อ บัญชี",
    ],
  },
};
