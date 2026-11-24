/**
 * Level 1 · dream. The hook: things a student uses every day got easier
 * because someone watched people get stuck and fixed it. A designer who
 * couldn't read the numbers on a Bangkok bus sign started Mayday, surveyed
 * the real signs and watched people use new ones; this year Bangkok is
 * upgrading more than 1,100 stops with Mayday among its partners. Guess that
 * number, then the rider stickers in LINE MAN's chat (the intern story is one
 * person's account: pending, said so on screen).
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { answer, beat, choice, dialogue, host, item, me, sys } from "../../_shared/story";

const MAYDAY = "f.ux-mayday" as const;
const BMA = "f.ux-bma-bus-stops" as const;
const STICKERS = "f.ux-lineman-stickers" as const;
const INTERN = "f.ux-lineman-intern" as const;

export const dream: GuidePage = {
  key: "dream",
  order: 1,
  titleTh: "ของที่ใช้ง่าย มีคนตั้งใจออกแบบ",
  questionTh: "ป้ายกับแอปที่เธอใช้ทุกวัน ใครทำให้ใช้ง่าย แล้วเขาเริ่มจากตรงไหน",
  navLabelTh: "ป้ายรถเมล์",
  asOf: "2026-11-20",
  minutes: 2,
  factIds: [MAYDAY, BMA, STICKERS, INTERN],
  og: {
    headlineTh: "ป้ายรถเมล์ที่เคยชวนงง มีคนตั้งใจแก้อยู่นะ",
    stat: { th: "ปี 2569 กทม. อัปเกรดป้ายรถเมล์กว่า 1,100 ป้าย ให้เข้าใจง่ายขึ้น", factIds: [BMA] },
  },
  blocks: [
    dialogue("intro", host("เปิดรันสาย UX/UI กัน เริ่มจากเรื่องใกล้ตัวที่เธอน่าจะเคยเจอ", { mood: "wow" })),
    choice(
      "bus",
      host("เคยยืนงงหน้าป้ายรถเมล์ไหม หาเลขสายตัวเองไม่เจอสักที"),
      answer("often", "บ่อยเลย สุดท้ายก็เปิดแอปดูอยู่ดี", host("เหมือนกันเลย แต่มีคนหนึ่งที่ไม่ยอมยืนงงอยู่เฉยๆ", { mood: "wink" })),
      answer("ask", "งงแหละ แต่หันไปถามคนข้างๆ เอา", host("ก็รอดนะ แต่ถ้าป้ายชัดตั้งแต่แรก เธอก็ไม่ต้องถามใครเลย", { mood: "wink" })),
      answer("never", "ไม่ค่อยได้ขึ้นรถเมล์อะ", host("ไม่เป็นไร เรื่องนี้ใช้ได้กับของทุกอย่างที่ชวนงงเลย"))
    ),
    item(
      "intel-mayday",
      "intel",
      "นักออกแบบคนหนึ่งยืนอยู่หน้าป้ายรถเมล์ แต่หาเลขสายที่คุ้นไม่เจอ เพราะเลขบนป้ายเว้นวรรคผิด เขาเลยเปิดเพจ Mayday ชวนคนมาช่วยคิด",
      { title: "แฟ้ม: Mayday", meta: "Sanook พ.ย. 2560", facts: [MAYDAY] }
    ),
    dialogue(
      "mayday-after",
      host("แต่เขาไม่ได้เริ่มจากวาดป้ายใหม่ให้สวยเลยนะ", { mood: "serious" }),
      host("ทีมลงไปเก็บข้อมูลป้ายจริง 160 ป้าย ดูว่าป้ายมีปัญหาตรงไหนบ้าง", { facts: [MAYDAY] }),
      host("แถมเพิ่มสีที่คิดเผื่อคนตาบอดสีด้วยนะ", { facts: [MAYDAY] })
    ),
    item(
      "stat-installed",
      "stat",
      "ติดป้ายใหม่กว่า 100 ป้ายบนเกาะรัตนโกสินทร์ ทีมเห็นคนแวะดูตลอด รวมถึงชาวต่างชาติ",
      { title: "ติดจริง ดูคนใช้จริง", facts: [MAYDAY] }
    ),
    beat(
      "beat-guess",
      "แล้ววันนี้ล่ะ",
      dialogue("guess-intro", host("ลองทายดูสิ ปีนี้ กทม. กำลังอัปเกรดป้ายรถเมล์กี่ป้าย", { facts: [BMA], mood: "wink" })),
      {
        kind: "game",
        id: "signs",
        game: {
          engine: "GuessReveal",
          data: {
            promptTh: "ปี 2569 กทม. อัปเกรดป้ายรถเมล์กี่ป้าย",
            min: 0,
            max: 3000,
            step: 100,
            unit: "count",
            answer: 1100,
            answerFactId: BMA,
            buckets: [300, 700, 1000, 1500, 3001],
            chart: {
              kind: "bars",
              bars: [{ labelTh: "ป้ายที่ กทม. กำลังอัปเกรด (ข่าว เม.ย. 2569)", value: null }],
            },
            nearTh: "เกือบเป๊ะ",
            overTh: "เธอเดาสูงไปราว {d} ป้าย",
            underTh: "เธอเดาต่ำไปราว {d} ป้าย",
            nearWithin: 200,
            revealTh: "เธอเดา {g} ป้าย ของจริงคือกว่า 1,100 ป้าย",
          },
        },
        track: { done: "dream:signs-guess", value: "bucket" },
        answersTh: [
          "ปี 2569 กทม. อัปเกรดป้ายรถเมล์กว่า 1,100 ป้าย จากที่มีราว 5,199 ป้าย",
          "เป็นป้ายแบบใหม่ 600 ป้าย กับป้ายดิจิทัล 500 ป้าย",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "signs.plus" },
          { at: 900, action: "tap", target: "signs.plus" },
          { at: 1200, action: "tap", target: "signs.plus" },
          { at: 2000, action: "tap", target: "signs.lock" },
          { at: 5000, action: "wait" },
        ],
      },
      item(
        "notif-bma",
        "notification",
        "กทม. จับมือ Mayday, Grab และ ททท. อัปเกรดป้ายรถเมล์กว่า 1,100 ป้าย ให้เข้าใจง่ายตั้งแต่แวบแรก",
        { title: "ข่าว", meta: "เม.ย. 2569", facts: [BMA] }
      ),
      dialogue("guess-after", host("ความงงหน้าป้ายรถเมล์ ตอนนี้กลายเป็นโจทย์ใหญ่ของทั้งเมืองเลย", { mood: "wow" }))
    ),
    beat(
      "beat-app",
      "ในแอปก็มี",
      dialogue("app-intro", host("ในแอปที่เธอเปิดทุกวัน ก็มีเรื่องแบบนี้เหมือนกัน")),
      item("chat-rider", "chat", "มาถึงแล้วครับ", { meta: "ไรเดอร์", facts: [STICKERS] }),
      item(
        "intel-stickers",
        "intel",
        "สติกเกอร์แบบนี้ในแชตไลน์แมน มีไว้เพราะไรเดอร์ลุยแดดลุยฝน พิมพ์ยาวๆ ไม่สะดวก ทีมเลยเอาคำที่ไรเดอร์พิมพ์บ่อยมาทำเป็นสติกเกอร์",
        { title: "แฟ้ม: สติกเกอร์ไรเดอร์", meta: "Marketeer ต.ค. 2569", facts: [STICKERS] }
      ),
      item(
        "intel-intern",
        "intel",
        "Marketeer เล่าว่าสติกเกอร์ชุดแรกเป็นงานของเด็กฝึกงาน UX/UI ที่ไลน์แมน ปี 2564 เรื่องนี้มาจากคนที่บอกว่าเคยฝึกงานที่นั่นเอง บริษัทยังไม่ได้ยืนยัน",
        { title: "พูดตรงๆ", facts: [INTERN], badge: "pending" }
      ),
      dialogue(
        "app-after",
        me("เดี๋ยวนะ เด็กฝึกงานก็ทำของที่คนเห็นทุกวันได้จริงเหรอ"),
        host("อันนี้ยังไม่ชัวร์นะ แต่ที่ชัวร์คือทีมเริ่มจากคำที่ไรเดอร์พิมพ์บ่อยจริงๆ", { facts: [STICKERS] }),
        host("จุดเริ่มแบบนี้ เธอก็ลองได้ตั้งแต่คืนนี้เลย", { mood: "wink" })
      )
    ),
    dialogue(
      "exit",
      host("สองเรื่องนี้มีจุดร่วมกัน คือเริ่มจากปัญหาที่คนใช้เจอจริงๆ"),
      host("นั่นแหละ หัวใจของงานนักออกแบบ UX/UI เลย", { mood: "wink" }),
      sys("ด่านต่อไป: ลองนั่งดูคนใช้แอปด้วยตัวเอง")
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "ป้ายรถเมล์ที่เคยชวนงง มีคนตั้งใจแก้อยู่นะ" },
    variantsTh: [
      "ปีนี้ กทม. อัปเกรดป้ายรถเมล์กว่า 1,100 ป้าย ให้อ่านง่ายตั้งแต่แวบแรก",
      "สติกเกอร์ไรเดอร์ในแชต มีไว้เพราะพิมพ์กลางแดดกลางฝนไม่สะดวก",
    ],
    sendToFriendTh: "ส่งให้เพื่อนที่ยืนงงที่ป้ายรถเมล์บ่อยๆ",
    visual: [
      "ป้ายรถเมล์เก่า เลขสายเว้นวรรคเพี้ยน แล้วเลขเลื่อนกลับมาเรียงอ่านง่าย",
      "ตัวนับวิ่งถึง 1,100 แล้วหมุดป้ายรถเมล์ผุดเต็มแผนที่กรุงเทพฯ",
      "ฟองแชต มาถึงแล้วครับ เด้งขึ้นในมือถือ",
    ],
  },
};
