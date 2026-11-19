/**
 * Level 1 · work. What the job feels like: the student makes a 15-second
 * clip for their regular roti shop (not one at their school: the clip must not
 * show where they study), the way most creator work goes.
 * Not luck, not only being on camera: a loop of planning, shooting, cutting,
 * posting and reading results. Played as one choice and two quick sorts:
 * 1. what the clip opens with (the hook), a dating-game choice;
 * 2. which shots go in (a stranger's face never does, a 10-second walk is too
 *    long for a 15-second clip);
 * 3. after posting, what to do with each result: fix the next clip, reply, or
 *    don't answer (a stranger asking for their school and phone number: don't
 *    answer, block, tell an adult they trust; replying is wrong, never a near miss).
 * Then the kinds of content work, with this one first.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { careerKindsBeat } from "../../_shared/kinds";
import { answer, beat, choice, dialogue, host, sys } from "../../_shared/story";

const SIM = "sim.cc-roti-clip" as const;
const ROLES = "f.cc-roles" as const;
const RETENTION = "f.cc-yt-retention" as const;
const LIVE = "f.cc-live-host" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือวางแผน ตัด แล้วอ่านผล",
  questionTh: "ครีเอเตอร์แค่ถ่ายแล้วโพสต์จริงเหรอ แล้วทั้งวันทำอะไรบ้าง",
  navLabelTh: "คลิปร้านโรตี",
  asOf: "2026-11-20",
  minutes: 2.5,
  factIds: [SIM, ROLES, RETENTION, LIVE],
  og: { headlineTh: "คลิปสั้นแค่ไม่กี่วิ แต่งานจริงอยู่ก่อนกับหลังกดถ่าย" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้โจทย์แรกแล้วนะ ลุยเลย", { mood: "wow" }),
      host("ร้านโรตีเจ้าประจำของเธอ อยากได้คลิป 15 วิ เอาไว้ลงเพจร้าน", { facts: [SIM] })
    ),
    choice(
      "opening",
      host("ก่อนกดถ่าย ลองคิดดูก่อน คลิปนี้เปิดด้วยอะไรดี"),
      answer(
        "sign",
        "เปิดป้ายชื่อร้านใหญ่ๆ เลย",
        host("ชื่อร้านต้องมีแหละ แต่เปิดมาเจอป้าย คนอาจไถหนีก่อนเห็นโรตีนะ"),
        host("เปิดด้วยช็อตที่ทำให้คนหยุดนิ้วดูก่อนดีกว่า", { mood: "wink" })
      ),
      answer("roti", "ช็อตโรตีราดนมข้นเยิ้มๆ ไปเลย", host("เป๊ะเลย เปิดด้วยของน่ากินสุดๆ ก่อน นิ้วคนดูจะได้หยุดกึก", { mood: "wow" })),
      answer(
        "story",
        "เปิดมาเล่าประวัติร้านก่อนเลย",
        host("เล่าเรื่องก็ดีนะ แต่ 15 วิมันสั้นนิดเดียวเอง", { facts: [SIM] }),
        host("เก็บประวัติไว้เล่าคลิปยาวดีกว่า คลิปนี้เปิดด้วยของน่ากินก่อนเลย", { mood: "wink" })
      )
    ),
    dialogue("steps", host("งานจริงทำเป็นสเต็ปเลย: วางแผน ถ่าย ตัด โพสต์ แล้วอ่านผล", { facts: [ROLES] })),
    beat(
      "beat-shots",
      "ขั้นแรก: คัดช็อต",
      dialogue(
        "shots-intro",
        host("เธอถ่ายมา 6 ช็อต แต่คลิปยาวได้แค่ 15 วิเองนะ", { facts: [SIM] }),
        host("คัดช็อตที่จะใช้ให้ดี บางช็อตห้ามเอาลงเด็ดขาดเลยนะ", { mood: "serious" })
      ),
      {
        kind: "game",
        id: "shots",
        game: {
          engine: "SortGame",
          data: {
            layout: "cards",
            tagTh: "คัดช็อตลงคลิป",
            goalTh: "เลือกช็อตที่จะใส่คลิปร้านโรตี",
            bins: [
              { id: "use", labelTh: "ใส่คลิป" },
              { id: "cut", labelTh: "ตัดทิ้ง" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "roti",
                labelTh: "โรตีราดนมข้นเยิ้มๆ ถ่ายใกล้ๆ",
                answer: "use",
                revealTh: "ช็อตเปิดเลย ของน่ากินต้องมาก่อน คนถึงจะหยุดดู",
              },
              {
                id: "sign",
                labelTh: "ป้ายหน้าร้าน ให้รู้ว่าร้านอยู่ตรงไหน",
                answer: "use",
                revealTh: "ดูจบแล้วอยากไปกิน ก็ต้องรู้ว่าร้านอยู่ไหน",
              },
              {
                id: "friend",
                labelTh: "เพื่อนกัดคำแรกแล้วทำหน้าฟิน (เพื่อนอนุญาตแล้ว)",
                answer: "use",
                revealTh: "เพื่อนอนุญาตแล้ว ใช้ได้ หน้าฟินของคนกินจริงเล่าได้ดีกว่าคำบรรยาย แค่เช็กว่าไม่ติดชื่อโรงเรียนบนเสื้อ",
              },
              {
                id: "face",
                labelTh: "ลูกค้าโต๊ะข้างๆ ติดมาเต็มหน้า",
                answer: "cut",
                revealTh: "เขาไม่ได้อนุญาต ต้องตัดทิ้ง หรือถ่ายใหม่ให้ไม่ติดหน้าคนอื่น",
              },
              {
                id: "blur",
                labelTh: "ภาพเบลอ มือสั่น",
                answer: "cut",
                revealTh: "ภาพไม่ชัด คนดูไถผ่านทันที ถ่ายใหม่ดีกว่า",
              },
              {
                id: "walk",
                labelTh: "เดินจากโรงเรียนมาร้าน ยาว 10 วิ",
                answer: "cut",
                revealTh: "ทั้งคลิปมีแค่ 15 วิ เดินอย่างเดียวก็กินไป 10 วิ แถมยังบอกคนดูว่าเธอเรียนที่ไหนด้วย",
              },
            ],
            resultTh: "คัดถูก {score}/{total}",
          },
        },
        track: { done: "work:shots", value: "score" },
        answersTh: [
          "ใส่คลิป: โรตีราดนมถ่ายใกล้ๆ, ป้ายหน้าร้าน, เพื่อนกัดคำแรก (เพื่อนอนุญาตแล้ว)",
          "ตัดทิ้ง: หน้าลูกค้าที่เราไม่ได้ขออนุญาต, ภาพเบลอ, เดินยาว 10 วิ",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "shots.item-face" },
          { at: 1400, action: "tap", target: "shots.bin-cut" },
          { at: 3200, action: "wait" },
        ],
      },
      dialogue(
        "shots-after",
        host("คนตัดเก่ง ไม่ใช่คนที่ยัดทุกช็อตลงไปหมดนะ", { mood: "wink" }),
        host("ลงคลิปแล้ว ทีนี้มาเช็กกันว่าคนดูว่าไงบ้าง")
      )
    ),
    beat(
      "beat-feedback",
      "ขั้นสอง: อ่านผล",
      dialogue(
        "feedback-intro",
        host("กดโพสต์แล้วงานยังไม่จบนะ ต้องตามอ่านตัวเลขกับคอมเมนต์ต่อ"),
        host("หน้าสถิติหลังบ้านบอกได้เลยนะ ว่าคนดูข้ามหรือกดออกตรงช่วงไหน", { facts: [RETENTION] })
      ),
      {
        kind: "game",
        id: "feedback",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "อ่านผล แล้วตัดสินใจ",
            goalTh: "อ่านผลคลิปร้านโรตี แล้วเลือกทีละข้อว่าจะทำอะไร",
            bins: [
              { id: "fix", labelTh: "แก้คลิปหน้า" },
              { id: "reply", labelTh: "ตอบกลับ" },
              { id: "skip", labelTh: "ไม่ตอบ" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "drop",
                labelTh: "คนดูกดออกเยอะสุดตรงวินาทีที่ 9",
                meta: { sender: "หลังบ้าน" },
                detailTh: "วินาทีที่ 9: ช็อตป้ายร้านค้างนิ่งนานไป ไม่มีอะไรขยับ",
                answer: "fix",
                revealTh: "ตัวเลขชี้จุดที่คนหลุดให้แล้ว คลิปหน้าตัดช็อตป้ายให้สั้นลง แล้วดูว่าคนอยู่นานขึ้นไหม",
              },
              {
                id: "where",
                labelTh: "ร้านอยู่ตรงไหนอะ อยากไปกิน",
                meta: { sender: "คอมเมนต์" },
                answer: "reply",
                revealTh: "คนอยากไปจริง ตอบพิกัดร้านให้ชัดเลย คอมเมนต์แบบนี้ร้านอยากได้ที่สุด",
              },
              {
                id: "subs",
                labelTh: "ซับตัวเล็กไป อ่านไม่ทัน",
                meta: { sender: "คอมเมนต์" },
                answer: "fix",
                nearTh: { reply: "ตอบขอบคุณก็ดี แต่ที่สำคัญกว่าคือแก้ในคลิปหน้า" },
                revealTh: "คนดูบอกจุดพังให้ฟรีๆ คลิปหน้าใช้ตัวใหญ่ขึ้น ขึ้นจอนานขึ้น",
              },
              {
                id: "mean",
                labelTh: "คลิปห่วยมาก",
                meta: { sender: "คอมเมนต์" },
                answer: "skip",
                nearTh: { reply: "ตอบไปก็ไม่ได้อะไร เปลืองแรงเปล่าๆ" },
                revealTh: "ด่าเฉยๆ ไม่บอกเหตุผล ไม่ต้องตอบ ไปดูตัวเลขหลังบ้านดีกว่า",
              },
              {
                id: "stranger",
                labelTh: "อยู่โรงเรียนไหนอะ ขอเบอร์หน่อย",
                meta: { sender: "บัญชีที่ไม่รู้จัก" },
                answer: "skip",
                flags: ["ถามข้อมูลส่วนตัว"],
                revealTh: "ไม่ตอบ ไม่บอกโรงเรียนหรือเบอร์ บล็อกได้เลย แล้วเล่าให้ผู้ใหญ่ที่ไว้ใจฟัง",
              },
              {
                id: "idea",
                labelTh: "ทำคลิปร้านน้ำปั่นข้างๆ ต่อได้ไหม",
                meta: { sender: "คอมเมนต์" },
                answer: "reply",
                revealTh: "คนดูส่งไอเดียคลิปหน้ามาให้แล้ว ตอบขอบคุณแล้วจดไว้เลย",
              },
              {
                id: "owner",
                labelTh: "เขียนว่าอร่อยที่สุดในประเทศได้ไหม",
                meta: { sender: "เจ้าของร้าน" },
                answer: "reply",
                nearTh: { fix: "ไม่ต้องแก้ตามทันที คุยกับเจ้าของร้านก่อนดีกว่า" },
                flags: ["พูดเกินจริง"],
                revealTh: "ตอบดีๆ ว่าคำเกินจริงใช้ไม่ได้ แล้วเสนอข้อมูลจริงแทน เช่น เปิดร้านมากี่ปีแล้ว",
              },
            ],
            resultTh: "เลือกถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "แก้คลิปหน้า: ช็อตป้ายที่ค้างนานจนคนกดออก, ซับตัวเล็ก",
          "ตอบกลับ: ร้านอยู่ไหน, ไอเดียคลิปหน้า, เจ้าของร้านขอคำเกินจริง (ตอบดีๆ ว่าใช้ไม่ได้)",
          "ไม่ตอบ: คอมเมนต์ด่าเฉยๆ, คนแปลกหน้าถามชื่อโรงเรียนกับขอเบอร์ (บล็อก แล้วเล่าให้ผู้ใหญ่ที่ไว้ใจฟัง)",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "feedback.item-drop" },
          { at: 1600, action: "tap", target: "feedback.item-drop-bin-fix" },
          { at: 3200, action: "tap", target: "feedback.item-stranger" },
          { at: 4200, action: "tap", target: "feedback.item-stranger-bin-skip" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำไปเมื่อกี้ นั่นแหละงานจริงของครีเอเตอร์เลย", { mood: "wow" }),
        host("วางแผน ถ่าย ตัด โพสต์ อ่านผล แล้วก็วนลูปไปทำคลิปใหม่"),
        host("คนดูเห็นแค่ตัวคลิป ไม่เห็นงานก่อนกับหลังกดถ่ายหรอกนะ"),
        host("คนแปลกหน้าถามเรื่องส่วนตัว ไม่ต้องตอบ บล็อกเลย แล้วบอกผู้ใหญ่ที่ไว้ใจนะ", { mood: "serious" })
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    careerKindsBeat({
      nameTh: "สายคอนเทนต์",
      facts: [ROLES, LIVE],
      tiles: [
        { id: "brand", icon: "phone", titleTh: "ดูแลเพจแบรนด์", lineTh: "ทำคลิปให้ร้านหรือบริษัท วางแผนจนถึงอ่านผล แบบร้านโรตี", played: true },
        { id: "channel", icon: "camera", titleTh: "ช่องตัวเอง", lineTh: "เล่าเรื่องที่รู้ดีที่สุด ลงช่องตัวเองแบบสม่ำเสมอ" },
        { id: "script", icon: "clipboard", titleTh: "เขียนบท", lineTh: "คิดเรื่อง เขียนสคริปต์ วางลำดับช็อตให้ทีมถ่ายตาม" },
        { id: "edit", icon: "scissors", titleTh: "ตัดต่อ", lineTh: "ตัดฟุตเทจยาวๆ ให้เหลือคลิปสั้นที่คนอยากดูจนจบ" },
        { id: "live", icon: "mic", titleTh: "พิธีกรไลฟ์", lineTh: "ไลฟ์แนะนำสินค้า ตอบคำถามสดๆ แล้วเอาผลมาปรับรอบหน้า" },
      ],
    }),
    dialogue("exit", sys("ด่านต่อไป: คืนนี้ ลุยถ่ายคลิปแรกของเธอเอง")),
  ],
  reel: {
    format: "motion",
    hook: { th: "ครีเอเตอร์ไม่ได้แค่กดถ่าย งานจริงอยู่ก่อนกับหลังกดถ่าย" },
    variantsTh: ["คลิปร้านโรตี ช็อตไหนใส่ ช็อตไหนห้ามใช้", "คนแปลกหน้าถามโรงเรียนกับขอเบอร์ใต้คลิป ไม่ตอบ บล็อก แล้วบอกผู้ใหญ่"],
    sendToFriendTh: "ส่งให้เพื่อนที่อยากเป็นครีเอเตอร์",
    visual: [
      "การ์ดช็อตบินเข้าไทม์ไลน์ ช็อตหน้าคนแปลกหน้าถูกเด้งออก",
      "กราฟคนดูไหลลงตรงช็อตป้ายร้าน แล้วมีตราประทับ แก้คลิปหน้า ทับลงมา",
      "วงกลมหมุน วางแผน ถ่าย ตัด โพสต์ อ่านผล วนกลับมาที่เดิม",
    ],
  },
};
