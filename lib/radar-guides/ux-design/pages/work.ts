/**
 * Level 1 · work. What the job feels like: the school's new canteen
 * pre-order app is hard to use, and the student fixes it the way UX/UI
 * designers do. Two steps of the loop, as two quick sorts:
 * 1. watch three friends try to order (don't help) and sort what you saw:
 *    fix first (they got stuck or made a mistake), note for later, or no need
 *    to fix (one person's taste). What people do beats what they say.
 * 2. pick the fix for each problem: change size, colour or place; change the
 *    words; or tell the user what happened.
 * Then the kinds of UX/UI work, with this one first.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { careerKindsBeat } from "../../_shared/kinds";
import { answer, beat, choice, dialogue, host, sys } from "../../_shared/story";

const SIM = "sim.ux-canteen" as const;
const NNG = "f.ux-nng-watch" as const;
const MAYDAY = "f.ux-mayday" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือดูคนใช้ แล้วแก้จุดที่ติด",
  questionTh: "นักออกแบบ UX/UI แค่วาดหน้าจอให้สวยหรือเปล่า แล้วทั้งวันทำอะไร",
  navLabelTh: "แก้แอปโรงอาหาร",
  asOf: "2026-11-20",
  minutes: 2.5,
  factIds: [SIM, NNG, MAYDAY],
  og: { headlineTh: "แอปสวยแต่คนใช้งง งานยังไม่จบนะ" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้โจทย์งานแรกแล้วนะ", { mood: "wow" }),
      host("โรงเรียนเพิ่งออกแอปสั่งข้าวโรงอาหารล่วงหน้า แต่คนบ่นว่าใช้ยาก", { facts: [SIM] })
    ),
    choice(
      "how",
      host("ถ้าเป็นเธอ จะเริ่มแก้จากตรงไหนก่อนดี"),
      answer(
        "redraw",
        "วาดหน้าใหม่ให้สวยขึ้นเลย",
        host("สวยขึ้นก็ดี แต่ถ้ายังไม่รู้ว่าคนติดตรงไหน เดี๋ยวสวยแต่ยังงงนะ"),
        host("ลองไปนั่งดูคนใช้จริงก่อนดีกว่า", { mood: "wink" })
      ),
      answer(
        "ask",
        "ถามเพื่อนเลยว่าชอบไม่ชอบตรงไหน",
        host("มาถูกทางแล้ว แต่สิ่งที่คนพูดกับสิ่งที่คนทำ บางทีไม่ตรงกันนะ", { facts: [NNG] }),
        host("ให้เขาลองกดใช้จริงแล้วคอยดูมือเขา จะเห็นปัญหาชัดกว่าเยอะ", { mood: "wink" })
      ),
      answer("watch", "ให้เพื่อนลองสั่งข้าว แล้วนั่งดูเงียบๆ", host("ใช่เลย นักออกแบบ UX เริ่มกันตรงนี้แหละ", { mood: "wow" }))
    ),
    dialogue("steps", host("งานจริงวนแบบนี้: ดูคนใช้ จดจุดที่ติด แก้ แล้วให้ลองใหม่")),
    beat(
      "beat-watch",
      "ขั้นแรก: นั่งดู",
      dialogue(
        "watch-intro",
        host("เพื่อนสามคนจะลองสั่งกะเพราไข่ดาว เธอแค่นั่งดู ห้ามช่วยนะ", { facts: [SIM, NNG] }),
        host("แยกทีละข้อเลย ว่าต้องแก้ก่อน จดไว้ก่อน หรือไม่ต้องแก้")
      ),
      {
        kind: "game",
        id: "watch",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "นั่งดูเพื่อนลองใช้",
            goalTh: "ดูเพื่อนสั่งข้าว แล้วเลือกว่าจะทำยังไงกับแต่ละเรื่อง",
            bins: [
              { id: "fix", labelTh: "แก้ก่อน" },
              { id: "note", labelTh: "จดไว้ก่อน" },
              { id: "skip", labelTh: "ไม่ต้องแก้" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "order",
                labelTh: "หาปุ่มสั่งไม่เจอ",
                meta: { sender: "เพื่อนคนแรก" },
                detailTh: "เพื่อนกดรูปกะเพราซ้ำหลายรอบ ไม่รู้ว่าต้องเลื่อนลงไปกดปุ่มเล็กๆ ข้างล่าง จนบ่นว่าสั่งไม่ได้อะ",
                answer: "fix",
                flags: ["ทำงานหลักไม่ได้"],
                revealTh: "สั่งข้าวไม่ได้เลย ทั้งที่เป็นงานหลักของแอป ข้อนี้ต้องแก้ก่อนอย่างอื่น",
              },
              {
                id: "double",
                labelTh: "กดซ้ำ ได้ข้าวสองจาน",
                meta: { sender: "เพื่อนคนที่สอง" },
                detailTh: "กดสั่งแล้วหน้าจอนิ่ง ไม่ขึ้นบอกอะไรเลย เพื่อนเลยกดซ้ำอีกรอบ",
                answer: "fix",
                flags: ["ทำพลาด เสียเงินจริง"],
                revealTh: "พลาดแบบนี้เสียเงินจริงเลยนะ ต้องรีบแก้ก่อน",
              },
              {
                id: "pink",
                labelTh: "อยากได้สีชมพู",
                meta: { sender: "เพื่อนคนที่สาม" },
                detailTh: "เพื่อนบอกว่า ถ้าแอปเป็นสีชมพูจะน่ารักกว่านี้ แต่สั่งข้าวเสร็จเองแบบไม่ติดอะไรเลย",
                answer: "skip",
                nearTh: { note: "จดไว้ก็พอเข้าใจ แต่ไม่มีใครติดเพราะสี ข้อนี้ไม่ต้องแก้" },
                revealTh: "เป็นความชอบของคนเดียว ไม่มีใครติดเพราะสี ยังไม่ต้องแก้",
              },
              {
                id: "easy",
                labelTh: "ปากบอกว่าง่ายมาก",
                meta: { sender: "เพื่อนคนที่สาม" },
                detailTh: "เพื่อนบอกว่า ง่ายมาก แต่ก่อนหน้านั้นกดหลงเข้าหน้าเติมเงินไปสองรอบ",
                answer: "fix",
                nearTh: {
                  skip: "เขาบอกว่าง่ายก็จริง แต่มือหลงไปสองรอบนะ",
                  note: "จดไว้ก็พอเข้าใจ แต่หลงถึงสองรอบแปลว่ามีจุดชวนงงจริง แก้ก่อนดีกว่า",
                },
                flags: ["พูดกับทำไม่ตรงกัน"],
                revealTh: "ปากบอกง่าย แต่มือหลงไปสองรอบ เชื่อสิ่งที่เห็นเขาทำ มากกว่าสิ่งที่เขาพูด",
              },
              {
                id: "small",
                labelTh: "อ่านราคายาก",
                meta: { sender: "เพื่อนคนแรก" },
                detailTh: "ต้องยกมือถือมาจ่อใกล้หน้าถึงจะอ่านราคาออก แต่ก็ยังสั่งได้",
                answer: ["note", "fix"],
                revealTh: "ช้าหน่อยแต่ยังสั่งได้ จดไว้แก้รอบหน้าหรือแก้เลยก็ได้ ตัวหนังสือเล็กทำให้หลายคนอ่านลำบาก",
              },
              {
                id: "game",
                labelTh: "อยากมีเกมเล่นตอนรอข้าว",
                meta: { sender: "เพื่อนคนที่สอง" },
                detailTh: "เพื่อนบอกว่า ถ้ามีมินิเกมให้เล่นตอนรอข้าวก็คงดีนะ",
                answer: "note",
                nearTh: { skip: "ไม่ต้องแก้ตอนนี้ก็จริง แต่จดไว้ก่อน เผื่อมีอีกหลายคนขอ" },
                revealTh: "เป็นแค่ไอเดีย ไม่ใช่จุดที่ทำให้ติด จดเก็บไว้ก่อน เผื่อมีหลายคนขอ",
              },
            ],
            resultTh: "แยกถูก {score}/{total}",
          },
        },
        track: { done: "work:watch", value: "score" },
        answersTh: [
          "แก้ก่อน: หาปุ่มสั่งไม่เจอ, กดซ้ำได้ข้าวสองจาน, ปากบอกง่ายแต่กดผิดสองรอบ",
          "จดไว้ก่อน: อยากมีเกมเล่นตอนรอข้าว, อ่านราคายาก (แก้เลยก็ได้)",
          "ไม่ต้องแก้: อยากได้สีชมพู",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "watch.item-double" },
          { at: 1600, action: "tap", target: "watch.item-double-bin-fix" },
          { at: 3200, action: "tap", target: "watch.item-easy" },
          { at: 4200, action: "tap", target: "watch.item-easy-bin-fix" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "watch-after",
        host("ฟังคนใช้ก็ดี แต่ดูสิ่งที่เขาทำจริง จะเห็นปัญหาชัดกว่าเยอะ", { facts: [NNG], mood: "wink" })
      )
    ),
    beat(
      "beat-fix",
      "ขั้นสอง: เลือกวิธีแก้",
      dialogue("fix-intro", host("เจอจุดที่ต้องแก้แล้ว ทีนี้มาเลือกวิธีแก้ทีละจุดกัน", { facts: [SIM] })),
      {
        kind: "game",
        id: "fix",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "เลือกวิธีแก้",
            goalTh: "เลือกวิธีแก้ให้แต่ละจุดที่เพื่อนติด",
            bins: [
              { id: "look", labelTh: "ปรับขนาด สี ตำแหน่ง" },
              { id: "word", labelTh: "ใช้คำให้ชัด" },
              { id: "tell", labelTh: "บอกให้รู้ว่าเกิดอะไร" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "big",
                labelTh: "หาปุ่มสั่งไม่เจอ",
                detailTh: "ปุ่มสั่งเล็ก แถมอยู่ล่างสุด ต้องเลื่อนลงไปหา",
                answer: "look",
                revealTh: "ขยายปุ่มให้ใหญ่ขึ้นแล้วตรึงไว้ล่างจอ นิ้วโป้งกดถึงพอดี",
              },
              {
                id: "done",
                labelTh: "กดซ้ำ ได้ข้าวสองจาน",
                detailTh: "กดสั่งแล้วหน้าจอนิ่ง ไม่ขึ้นบอกเลยว่าสั่งติดไหม",
                answer: "tell",
                revealTh: "ขึ้นข้อความว่า สั่งแล้ว ทันทีที่กด คนจะได้ไม่เผลอกดซ้ำ",
              },
              {
                id: "word",
                labelTh: "ปุ่มที่ไม่มีใครกล้ากด",
                detailTh: "ปุ่มเขียนแค่ว่า ดำเนินการ ไม่มีใครรู้ว่ากดแล้วจะจ่ายเงินเลย",
                answer: "word",
                revealTh: "เปลี่ยนเป็น จ่ายเงิน ตรงๆ เลย คำบนปุ่มต้องบอกให้ชัดว่ากดแล้วจะเกิดอะไร",
              },
              {
                id: "icon",
                labelTh: "หลงเข้าหน้าเติมเงิน",
                detailTh: "ไอคอนเติมเงินกับไอคอนตะกร้าหน้าตาคล้ายกัน แถมไม่มีคำกำกับ",
                answer: "word",
                nearTh: { look: "เปลี่ยนรูปไอคอนก็ช่วยได้ แต่ใส่คำกำกับไว้ด้วย ชัวร์กว่า" },
                revealTh: "ใส่คำกำกับใต้ไอคอนด้วย ถ้ามีแค่ไอคอน แต่ละคนก็เดาไม่เหมือนกัน",
              },
              {
                id: "grey",
                labelTh: "อ่านราคายาก",
                detailTh: "ตัวเลขราคาเล็ก แถมเป็นสีเทาอ่อนบนพื้นขาว",
                answer: "look",
                revealTh: "ขยายตัวเลขให้ใหญ่แล้วใช้สีเข้มขึ้น คนสายตาไม่ดีก็อ่านสบาย",
              },
            ],
            resultTh: "แก้ตรงจุด {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "ปรับขนาด สี ตำแหน่ง: ปุ่มสั่งที่หาไม่เจอ, ราคาที่อ่านยาก",
          "ใช้คำให้ชัด: ปุ่ม ดำเนินการ เป็น จ่ายเงิน, ใส่คำกำกับใต้ไอคอน",
          "บอกให้รู้ว่าเกิดอะไร: ขึ้นข้อความ สั่งแล้ว ทันทีที่กด",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "fix.item-done" },
          { at: 1600, action: "tap", target: "fix.item-done-bin-tell" },
          { at: 3200, action: "tap", target: "fix.item-word" },
          { at: 4200, action: "tap", target: "fix.item-word-bin-word" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำไปเมื่อกี้ คืองานจริงของนักออกแบบ UX/UI เลยนะ", { mood: "wow" }),
        host("ดูคนใช้ จดจุดที่ติด แก้ แล้วให้ลองใหม่ วนไปแบบนี้เรื่อยๆ"),
        host("สวยด้วยก็ดีนะ แต่ยังไงต้องใช้ได้จริงก่อน", { mood: "wink" }),
        host("ในบริษัทจริง ต้องคุยกับคนเขียนโค้ดด้วย ว่าทำไมต้องแก้แบบนี้")
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    careerKindsBeat({
      nameTh: "นักออกแบบ UX/UI",
      facts: [MAYDAY],
      tiles: [
        { id: "app", icon: "phone", titleTh: "ออกแบบแอป", lineTh: "ดูคนใช้แล้วแก้หน้าจอจนใช้ง่าย เหมือนเมื่อกี้เลย", played: true },
        { id: "research", icon: "magnifier", titleTh: "วิจัยผู้ใช้", lineTh: "คุยและนั่งดูคนลองใช้จริง แล้วสรุปว่าติดตรงไหน" },
        { id: "writing", icon: "speech", titleTh: "เขียนคำในแอป", lineTh: "เลือกคำบนปุ่มและข้อความ ให้อ่านแวบเดียวก็เข้าใจ" },
        { id: "game", icon: "gamepad", titleTh: "ออกแบบหน้าเกม", lineTh: "ทำเมนูและหน้าจอในเกม ให้ผู้เล่นรู้ว่าต้องกดอะไร" },
        { id: "service", icon: "signpost", titleTh: "ออกแบบบริการ", lineTh: "ออกแบบทั้งในจอและนอกจอ เหมือนป้ายรถเมล์ที่อ่านง่าย" },
      ],
    }),
    dialogue("exit", sys("ด่านต่อไป: คืนนี้ลองรีดีไซน์หน้าจอแรกของเธอเอง")),
  ],
  reel: {
    format: "motion",
    hook: { th: "แอปสวยแต่คนใช้งง งานยังไม่จบนะ" },
    variantsTh: ["ปากบอกง่าย แต่มือกดผิดสองรอบ เชื่ออะไรดี", "นักออกแบบ UX/UI ไม่ได้วาดสวยอย่างเดียว งานจริงคือนี่"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบวาด แต่ยังไม่รู้จะเรียนอะไร",
    visual: [
      "มือถือโชว์แอปสั่งข้าว นิ้วกดรูปซ้ำๆ ปุ่มสั่งเล็กๆ ซ่อนอยู่ล่างจอ",
      "การ์ดสิ่งที่เห็นเด้งขึ้นทีละใบ ติดป้ายว่า แก้ก่อน จดไว้ก่อน ไม่ต้องแก้ ประทับลง",
      "หน้าจอเดิมเลื่อนเป็นหน้าใหม่ ปุ่มสั่งใหญ่ค้างล่างจอ ข้อความ สั่งแล้ว เด้งขึ้น",
    ],
  },
};
