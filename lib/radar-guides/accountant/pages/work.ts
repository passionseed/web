/**
 * Level 1 · work. What the job is now that software records the numbers: a
 * bubble-tea shop's app reads slips and receipts and books the week itself;
 * the student checks each entry against its evidence (adds up, doesn't add
 * up, not the shop's money), then tells the owner the truth about the week.
 * The honest beat: employers worldwide expect accounting roles to shrink
 * (WEF 2025), and even an accounting-software company says AI can't do the
 * analysis and advice. Then the kinds of accountant, with this one first.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { careerKindsBeat } from "../../_shared/kinds";
import { answer, beat, choice, dialogue, host, item, sys } from "../../_shared/story";

const SIM = "sim.acc-shop-books" as const;
const TOOLS = "f.acc-ai-tools" as const;
const WEF = "f.acc-wef-2025" as const;
const CPA_TA = "f.acc-cpa-ta" as const;
const FORENSIC = "f.acc-forensic" as const;
const CFO = "f.acc-cfo" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "AI ลงบัญชีให้ คนเช็กว่าจริงไหม",
  questionTh: "ถ้าโปรแกรมลงบัญชีให้เองได้แล้ว นักบัญชีทำอะไร",
  navLabelTh: "เช็กบัญชีร้าน",
  asOf: "2026-11-20",
  minutes: 2,
  factIds: [SIM, TOOLS, WEF, CPA_TA, FORENSIC, CFO],
  og: {
    headlineTh: "AI ลงบัญชีให้ไวมาก แต่ใครเป็นคนเช็กว่าตัวเลขจริง",
    stat: { th: "บัญชีร้านชานม 7 รายการ มีกี่รายการที่ไม่ตรง", factIds: [SIM], badge: "simulated" },
  },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้งานแรกแล้วนะ", { mood: "wow" }),
      host("ร้านชานมหน้าโรงเรียนใช้แอป AI อ่านสลิปกับใบเสร็จ แล้วลงบัญชีให้เอง", { facts: [SIM] }),
      host("เจ้าของร้านอยากรู้ว่าอาทิตย์นี้เงินไปไหนหมด คนเช็กคือเธอเลย")
    ),
    item(
      "intel-tools",
      "intel",
      "โปรแกรมบัญชีในไทยตอนนี้ใช้ AI อ่านใบเสร็จกับใบกำกับภาษี แล้วช่วยบันทึกรายการกับกระทบยอดบัญชีให้",
      { title: "เครื่องมือจริงตอนนี้", meta: "FlowAccount", facts: [TOOLS], badge: "vendor" }
    ),
    beat(
      "beat-books",
      "เปิดบัญชีร้าน",
      dialogue(
        "books-intro",
        host("AI ลงให้ไวจริง แต่มันไม่รู้หรอกว่าอันไหนแปลก", { mood: "wink" }),
        host("ไล่เช็กทีละรายการเลย อันไหนผ่าน อันไหนไม่ตรง อันไหนไม่ใช่เงินร้าน")
      ),
      {
        kind: "game",
        id: "books",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "เช็กบัญชีที่ AI ลงให้",
            goalTh: "เทียบทุกรายการกับหลักฐาน แล้วเลือกทีละข้อ",
            bins: [
              { id: "ok", labelTh: "ผ่าน" },
              { id: "check", labelTh: "ไม่ตรง ต้องเช็ก" },
              { id: "personal", labelTh: "ไม่ใช่เงินร้าน" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "milk",
                labelTh: "ค่านมสด",
                meta: { day: "จันทร์" },
                detailTh: "AI ลงไว้: ค่าวัตถุดิบ 1,200 บาท · ใบเสร็จ: นมสด 1,200 บาท",
                answer: "ok",
                revealTh: "ตัวเลขตรงใบเสร็จ หมวดก็ถูก ผ่านได้เลย",
              },
              {
                id: "ice",
                labelTh: "ค่าน้ำแข็ง",
                meta: { day: "จันทร์" },
                detailTh: "AI ลงไว้: ค่าน้ำแข็ง 350 บาท 2 รายการ · สลิปโอน: มีใบเดียว 350 บาท",
                answer: "check",
                flags: ["ลงซ้ำ"],
                revealTh: "AI อ่านสลิปใบเดียวกันสองรอบ ถ้าไม่มีใครเช็ก ร้านจะคิดว่าจ่ายค่าน้ำแข็งไป 700",
              },
              {
                id: "game",
                labelTh: "ค่าเติมเกมมือถือ",
                meta: { day: "อังคาร" },
                detailTh: "AI ลงไว้: ค่าใช้จ่ายร้าน 299 บาท · จ่ายด้วยบัตรของร้าน แต่เป็นเกมในมือถือเจ้าของ",
                answer: "personal",
                nearTh: { check: "ใกล้แล้ว ตัวเลขไม่ได้ผิด แต่เป็นเงินส่วนตัว ต้องแยกออกจากบัญชีร้าน" },
                flags: ["เงินส่วนตัวปนเงินร้าน"],
                revealTh: "เงินส่วนตัวปนกับเงินร้าน กำไรของร้านจะดูน้อยกว่าที่เป็นจริง ต้องแยกออกมา",
              },
              {
                id: "cups",
                labelTh: "ค่าแก้วพลาสติก",
                meta: { day: "พุธ" },
                detailTh: "AI ลงไว้: 2,500 บาท · ใบเสร็จ: 250 บาท",
                answer: "check",
                flags: ["AI อ่านเลขผิด"],
                revealTh: "AI อ่านเลขเกินมาหนึ่งหลัก ตัวเลขไหนดูแปลก คนต้องเทียบกับใบเสร็จจริง",
              },
              {
                id: "rent",
                labelTh: "ค่าเช่าร้าน",
                meta: { day: "พฤหัสบดี" },
                detailTh: "AI ลงไว้: ค่าเช่า 8,000 บาท · สัญญาเช่า: 8,000 บาท",
                answer: "ok",
                revealTh: "ตรงสัญญาเช่า หมวดก็ถูก แบบนี้ผ่าน",
              },
              {
                id: "saturday",
                labelTh: "ยอดขายวันเสาร์",
                meta: { day: "เสาร์" },
                detailTh: "แอปร้านบันทึกยอดขาย 6,400 บาท · เงินเข้าบัญชีธนาคาร 5,200 บาท",
                answer: "check",
                nearTh: { ok: "ยอดขายในแอปดูดีก็จริง แต่เงินเข้าบัญชีไม่ถึง ต้องหาส่วนที่ขาดให้เจอก่อน" },
                flags: ["ยอดไม่ตรง"],
                revealTh: "ต่างกัน 1,200 บาท อาจเป็นเงินสดในลิ้นชัก หรืออาจหายจริง ต้องนับเงินสดก่อนสรุป",
              },
              {
                id: "transfer",
                labelTh: "เงินโอนเข้า",
                meta: { day: "อาทิตย์" },
                detailTh: "AI ลงไว้: ยอดขาย 3,000 บาท · ชื่อผู้โอน: ไม่รู้จัก ไม่มีออเดอร์ไหนตรงเลย",
                answer: "check",
                nearTh: { ok: "เงินเข้าก็จริง แต่ไม่มีออเดอร์ ลงเป็นยอดขายเลยไม่ได้" },
                flags: ["ไม่รู้ที่มา"],
                revealTh: "เงินเข้าไม่ได้แปลว่าขายได้ ต้องถามก่อนว่าเงินนี้มาจากไหน แบบเบาะแสในด่านแรกเลย",
              },
            ],
            resultTh: "เช็กถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "ผ่าน: ค่านมสด, ค่าเช่าร้าน",
          "ไม่ตรง ต้องเช็ก: ค่าน้ำแข็งลงซ้ำ, ค่าแก้วที่ AI อ่านเลขผิด, ยอดขายวันเสาร์ที่เงินเข้าไม่ครบ, เงินโอนเข้าที่ไม่รู้ที่มา",
          "ไม่ใช่เงินร้าน: ค่าเติมเกมมือถือของเจ้าของ",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "books.item-ice" },
          { at: 1600, action: "tap", target: "books.item-ice-bin-check" },
          { at: 3200, action: "tap", target: "books.item-game" },
          { at: 4200, action: "tap", target: "books.item-game-bin-personal" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำไปเมื่อกี้ คืองานจริงของนักบัญชีเลยนะ", { mood: "wow" }),
        host("AI ช่วยลงตัวเลขให้ แต่คนนี่แหละที่ถามว่ามันจริงไหม")
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    beat(
      "beat-tell",
      "บอกเจ้าของร้าน",
      dialogue("tell-intro", host("เจ้าของร้านทักมาถามแล้วว่า อาทิตย์นี้ร้านเป็นไงบ้าง")),
      choice(
        "tell",
        host("เธอจะบอกเขาเรื่องไหนก่อนดี"),
        answer(
          "good",
          "ร้านขายดีมาก ไม่ต้องห่วงเลย",
          host("ขายดีจริงแหละ แต่เงินวันเสาร์ยังหาไม่เจออยู่นะ", { mood: "wink" }),
          host("เรื่องที่ไม่สบายใจก็ต้องบอกนะ แค่พูดให้เขาเอาไปแก้ต่อได้")
        ),
        answer(
          "gap",
          "เงินวันเสาร์ไม่ตรง ต้องนับเงินสดดูก่อน",
          host("เป๊ะเลย บอกตรงๆ ว่าเจออะไร แล้วบอกว่าต้องเช็กอะไรต่อ", { mood: "wow" })
        ),
        answer(
          "wait",
          "ขอเช็กให้ครบก่อน ค่อยบอกทีเดียว",
          host("รอบคอบดีนะ แต่เจ้าของร้านอยากรู้ตั้งแต่ตอนนี้เลยแหละ"),
          host("บอกไปก่อนเลยว่าเจออะไร แล้วอัปเดตว่ากำลังเช็กอะไรอยู่", { mood: "wink" })
        )
      )
    ),
    beat(
      "beat-ai",
      "แล้ว AI ล่ะ",
      item(
        "honesty",
        "intel",
        "รายงาน Future of Jobs ปี 2568 ของ World Economic Forum: นายจ้างทั่วโลกคาดว่างานนักบัญชีและผู้สอบบัญชี จะอยู่ในกลุ่มที่ลดลงเร็ว เพราะ AI กับระบบดิจิทัล",
        { title: "พูดตรงๆ", facts: [WEF] }
      ),
      dialogue(
        "ai-after",
        host("เราว่านะ คนที่แค่กรอกตัวเลขอย่างเดียวจะเหนื่อยขึ้นเรื่อยๆ", { labels: ["teamView"], mood: "serious" }),
        host("แต่ถ้าเช็กเป็น แล้วอธิบายให้คนอื่นเข้าใจได้ ยังไปต่อได้นะ", { labels: ["teamView"] }),
        host("ขนาดบริษัททำโปรแกรมบัญชีเองยังบอกเลยนะ", { mood: "wink" }),
        host("ว่า AI ยังวิเคราะห์กับให้คำปรึกษาแทนคนไม่ได้", { facts: [TOOLS] })
      )
    ),
    careerKindsBeat({
      nameTh: "นักบัญชี",
      facts: [CPA_TA, FORENSIC, CFO],
      tiles: [
        { id: "business", icon: "calculator", titleTh: "บัญชีธุรกิจ", lineTh: "ดูแลเงินของร้านหรือบริษัท เช็กที่ AI ลงให้ แบบเมื่อกี้", played: true },
        { id: "audit", icon: "clipboard", titleTh: "ผู้สอบบัญชี", lineTh: "ตรวจงบของบริษัท แล้วเซ็นรับรองว่าเชื่อถือได้" },
        { id: "forensic", icon: "magnifier", titleTh: "นักสืบบัญชี", lineTh: "ตามหาหลักฐานในคดีเรื่องเงิน แล้วไปอธิบายในศาล" },
        { id: "tax", icon: "receipt", titleTh: "สายภาษี", lineTh: "ช่วยร้านกับบริษัทเสียภาษีให้ถูก บางคนเป็นผู้สอบบัญชีภาษี" },
        { id: "cfo", icon: "trend", titleTh: "สาย CFO", lineTh: "ดูแลเงินทั้งบริษัท แล้วบอกผู้บริหารว่าควรไปทางไหน" },
      ],
    }),
    dialogue("exit", sys("ด่านต่อไป: คืนนี้ลองเป็นนักบัญชีให้เงินตัวเอง")),
  ],
  reel: {
    format: "motion",
    hook: { th: "AI ลงบัญชีให้ไวมาก แต่ใครเป็นคนเช็กว่าตัวเลขจริง" },
    variantsTh: ["ร้านชานมขายดี แต่เงินวันเสาร์หายไปไหน", "นักบัญชียุคนี้ไม่ได้แค่กรอกตัวเลข แต่เช็กว่าตัวเลขโกหกไหม"],
    sendToFriendTh: "ส่งให้เพื่อนที่ตาไวเรื่องตัวเลขดูเลย",
    visual: [
      "สลิปกับใบเสร็จบินเข้าแอป ตัวเลขเรียงลงตาราง",
      "บางบรรทัดกะพริบ ป้าย ผ่าน ไม่ตรง ไม่ใช่เงินร้าน ประทับลง",
      "ยอดขายในแอปกับเงินเข้าธนาคารวางคู่กัน ช่องว่างตรงกลางสว่างขึ้น",
    ],
  },
};
