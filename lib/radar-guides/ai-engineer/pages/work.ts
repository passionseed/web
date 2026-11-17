/**
 * Level 2 · work. What the job feels like: before a school help-bot goes live,
 * check its answers against the school's documents and sort each one into
 * ใช้ได้ / ผิด / ต้องให้คนตรวจ. That is an eval set, the core of the real work.
 * Then the real-world versions: ThaiExam (Thai exams as an AI test) and an
 * X-ray AI built to support doctors, not replace them.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { beat, dialogue, host, item, me, sys } from "../../_shared/story";

const SIM = "sim.ai-helpbot" as const;
const THAIEXAM = "f.ai-thaiexam" as const;
const INSPECTRA = "f.ai-inspectra" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือสอบ AI ก่อนปล่อย",
  questionTh: "นอกจากสร้าง AI วิศวกร AI ทำอะไรทั้งวัน",
  navLabelTh: "สอบ AI",
  asOf: "2026-11-18",
  minutes: 2,
  factIds: [SIM, THAIEXAM, INSPECTRA],
  og: { headlineTh: "บอทตอบมั่นมาก แต่ดันผิด เธอจับได้ไหม" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้งานแรกแล้วนะ", { mood: "wow" }),
      host("โรงเรียนหนึ่งทำบอทตอบคำถามนักเรียน จะเปิดใช้สัปดาห์หน้า"),
      host("งานของเธอคือตรวจคำตอบบอท ก่อนปล่อยให้ทุกคนใช้", { mood: "serious" }),
      me("แค่อ่านว่าถูกไหม ง่ายจะตาย"),
      host("ลองดูก่อน บางข้อหลอกตากว่าที่คิด", { mood: "wink" })
    ),
    beat(
      "beat-check",
      "เริ่มตรวจ",
      dialogue(
        "check-intro",
        host("แตะคำถาม แล้วเทียบคำตอบบอทกับเอกสารโรงเรียน", { facts: [SIM] }),
        host("แล้วเลือกว่า ใช้ได้ ผิด หรือต้องให้คนตรวจ")
      ),
      {
        kind: "game",
        id: "helpbot",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            goalTh: "ตรวจคำตอบบอทโรงเรียน ก่อนเปิดให้นักเรียนใช้",
            bins: [
              { id: "ok", labelTh: "ใช้ได้" },
              { id: "wrong", labelTh: "ผิด" },
              { id: "human", labelTh: "ต้องให้คนตรวจ" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "library",
                labelTh: "ห้องสมุดเปิดถึงกี่โมง",
                meta: { sender: "นักเรียน ม.4" },
                detailTh: "บอท: เปิด 7:30 ถึง 16:30 ค่ะ · คู่มือโรงเรียน: ห้องสมุดเปิด 7:30 ถึง 16:30",
                answer: "ok",
                revealTh: "ตรงคู่มือทุกตัว แบบนี้ปล่อยได้",
              },
              {
                id: "exam",
                labelTh: "สอบกลางภาควันไหน",
                meta: { sender: "นักเรียน ม.5" },
                detailTh: "บอท: วันที่ 12 ธ.ค. ค่ะ · ปฏิทินโรงเรียน: สอบกลางภาค 15 ถึง 19 ธ.ค.",
                answer: "wrong",
                flags: ["ตอบมั่นใจ แต่ไม่ตรงเอกสาร"],
                revealTh: "บอทตอบมั่นมาก แต่ไม่ตรงปฏิทิน ถ้าไม่มีใครจับ นักเรียนทั้งโรงเรียนจำวันสอบผิดแน่",
              },
              {
                id: "isan",
                labelTh: "ห้องน้ำอยู่ไส",
                meta: { sender: "นักเรียน ม.1" },
                detailTh: "บอท: ขอโทษค่ะ ไม่เข้าใจคำถาม · คู่มือโรงเรียน: ห้องน้ำอยู่ชั้น 1 อาคาร 2",
                answer: "wrong",
                nearTh: { human: "ส่งให้คนตอบก็ได้ แต่ข้อนี้บอทพลาดเอง ต้องเอาไปสอนเพิ่ม" },
                flags: ["ไม่เข้าใจภาษาถิ่น"],
                revealTh: "ภาษาอีสานก็เป็นคำถามจริง AI ภาษาไทยต้องเข้าใจคนทั้งประเทศ ไม่ใช่แค่คนกรุงเทพฯ",
              },
              {
                id: "grades",
                labelTh: "ขอดูเกรดของเพื่อนในห้องได้ไหม",
                meta: { sender: "นักเรียน ม.6" },
                detailTh: "บอท: ดูเกรดคนอื่นไม่ได้นะ ถ้าอยากรู้เกรดตัวเอง ถามครูประจำชั้นได้เลย",
                answer: "ok",
                revealTh: "ปฏิเสธก็เป็นคำตอบที่ถูกได้ เกรดเพื่อนเป็นข้อมูลส่วนตัว",
              },
              {
                id: "bullied",
                labelTh: "โดนเพื่อนแกล้งทุกวัน ไม่อยากมาโรงเรียนแล้ว",
                meta: { sender: "นักเรียน ม.2" },
                detailTh: "บอท: ลองคิดบวกนะคะ เดี๋ยวทุกอย่างก็ดีขึ้นเอง",
                answer: "human",
                nearTh: { wrong: "ตอบแบบนี้แย่จริง แต่ที่สำคัญกว่าคือเรื่องนี้ต้องถึงมือครู" },
                flags: ["เรื่องความรู้สึกและความปลอดภัย"],
                revealTh: "เรื่องนี้บอทไม่ควรตอบเอง ต้องส่งต่อให้ครูแนะแนวหรือครูที่ดูแลนักเรียน",
              },
              {
                id: "medicine",
                labelTh: "ปวดหัว กินยาพาราได้กี่เม็ด",
                meta: { sender: "นักเรียน ม.3" },
                detailTh: "บอท: กินได้เลย 2 เม็ดค่ะ",
                answer: "human",
                nearTh: { wrong: "เกือบได้แล้ว แต่เรื่องยา ต่อให้บอทตอบถูก ก็ต้องให้คนตอบอยู่ดี" },
                flags: ["เรื่องสุขภาพ"],
                revealTh: "เรื่องยาให้ห้องพยาบาลหรือผู้ใหญ่ตอบ บอทที่ดีต้องรู้ว่าข้อไหนไม่ใช่งานตัวเอง",
              },
              {
                id: "fee",
                labelTh: "ค่าบำรุงการศึกษาเทอมนี้เท่าไหร่",
                meta: { sender: "ผู้ปกครอง" },
                detailTh: "บอท: 3,500 บาทค่ะ · เอกสารที่บอทอ่านได้: ไม่มีเรื่องค่าบำรุงเลย",
                answer: "wrong",
                flags: ["แต่งตัวเลขขึ้นมาเอง"],
                revealTh: "เอกสารไม่มีข้อมูลนี้ แต่บอทมั่วตัวเลขขึ้นมาเอง ที่ถูกคือตอบว่าไม่รู้ แล้วส่งไปถามฝ่ายการเงิน",
              },
              {
                id: "late",
                labelTh: "ส่งงานช้าได้ไหม",
                meta: { sender: "นักเรียน ม.4" },
                detailTh: "บอท: ส่งช้าได้ไม่เกิน 3 วัน แต่ต้องแจ้งครูประจำวิชาก่อนค่ะ · คู่มือ: ส่งช้าได้ไม่เกิน 3 วัน ต้องแจ้งครูประจำวิชา",
                answer: "ok",
                revealTh: "ตรงตามคู่มือ แถมบอกขั้นตอนต่อให้ด้วย แบบนี้ผ่านเลย",
              },
            ],
            resultTh: "ตรวจถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "ใช้ได้: เวลาห้องสมุด, ปฏิเสธไม่ให้ดูเกรดเพื่อน, กติกาส่งงานช้า",
          "ผิด: วันสอบไม่ตรงปฏิทิน, ไม่เข้าใจภาษาอีสาน, แต่งค่าบำรุงขึ้นมาเอง",
          "ต้องให้คนตรวจ: โดนเพื่อนแกล้ง, เรื่องยา",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "helpbot.item-exam" },
          { at: 1600, action: "tap", target: "helpbot.item-exam-bin-wrong" },
          { at: 3200, action: "tap", target: "helpbot.item-bullied" },
          { at: 4200, action: "tap", target: "helpbot.item-bullied-bin-human" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำไป ทีม AI เรียกว่า eval หรือชุดสอบ AI", { mood: "wow" }),
        host("demo สวยๆ ใครก็ทำได้ แต่ของที่จะใช้จริงทุกวันต้องผ่านชุดสอบก่อน"),
        host("บอทที่มั่วแบบมั่นใจ อันตรายกว่าบอทที่ยอมรับว่าไม่รู้", { mood: "serious" })
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    beat(
      "beat-real",
      "ทีมจริงสอบ AI ยังไง",
      item(
        "intel-thaiexam",
        "intel",
        "ทีม Typhoon วัดว่า AI เข้าใจภาษาไทยจริงไหม ด้วยข้อสอบที่เธอคุ้นอย่าง O-NET TGAT A-Level ชุดนี้ชื่อ ThaiExam และ Stanford ก็ใช้จัดอันดับด้วย",
        { title: "ชุดสอบ AI จากข้อสอบไทย", facts: [THAIEXAM] }
      ),
      item(
        "intel-human",
        "intel",
        "อย่าง Inspectra CXR ที่ช่วยอ่านเอกซเรย์ปอด ทีมสร้างก็ย้ำชัดว่าทำมาช่วยหมอ ไม่ได้มาแทนหมอ",
        { title: "ช่อง ต้องให้คนตรวจ ในโลกจริง", facts: [INSPECTRA] }
      ),
      dialogue(
        "exit",
        host("งานสายนี้ไม่ได้มีแค่สร้าง แต่ต้องพิสูจน์ให้ได้ด้วยว่าใช้ได้จริง"),
        sys("ด่านต่อไป: ผลงานแบบนี้ เอาไปยื่นเข้ามหาลัยได้ไหม")
      )
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "บอทตอบมั่นมาก แต่ดันผิด เธอจับได้ไหม" },
    variantsTh: ["งานจริงของวิศวกร AI คือสอบ AI ก่อนปล่อย", "บอทยอมรับว่าไม่รู้ ดีกว่าบอทที่แต่งเรื่องมาตอบ"],
    sendToFriendTh: "ส่งให้เพื่อนที่ชอบจับผิด",
    visual: [
      "หน้าจอแชตบอทโรงเรียน คำตอบเด้งขึ้นทีละข้อ",
      "ป้าย ใช้ได้ ผิด ต้องให้คนตรวจ ประทับลงบนแต่ละคำตอบ",
      "ตัวเลขค่าบำรุงที่บอทแต่งขึ้น แตกเป็นเสี่ยง",
    ],
  },
};
