/**
 * Level 1 · work. What the job feels like: the student builds the school's
 * help-bot the way applied AI engineers in Thailand mostly work, on top of a
 * model that already exists. Two steps of the loop, as two quick sorts:
 * 1. choose what the bot may read (this year's calendar, yes; classmates'
 *    grades, never; last year's calendar, no: more data isn't better data);
 * 2. try it on real questions and pick the fix for each answer: ship it, give
 *    the bot the missing data, or hand it to a person.
 * Testing (eval) is one step of the loop, not the whole job. Then the kinds of
 * AI engineer, with this one first.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { careerKindsBeat } from "../../_shared/kinds";
import { answer, beat, choice, dialogue, host, sys } from "../../_shared/story";

const SIM = "sim.ai-helpbot" as const;
const THAIEXAM = "f.ai-thaiexam" as const;
const INSPECTRA = "f.ai-inspectra" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือทำให้ AI ใช้ได้จริง",
  questionTh: "วิศวกร AI ต้องสร้าง AI เองตั้งแต่ศูนย์เลยไหม แล้วทั้งวันทำอะไร",
  navLabelTh: "ทำบอทโรงเรียน",
  asOf: "2026-11-19",
  minutes: 2.5,
  factIds: [SIM, THAIEXAM, INSPECTRA],
  og: { headlineTh: "ทำบอทให้โรงเรียน ใครก็ทำได้ แต่ทำให้มันตอบถูกนี่สิของจริง" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้งานแรกแล้วนะ", { mood: "wow" }),
      host("โรงเรียนอยากได้บอทตอบคำถามนักเรียน แล้วคนทำก็คือเธอนี่แหละ"),
    ),
    choice(
      "how",
      host("ก่อนเริ่ม เธอว่าวิศวกร AI ปั้นบอทแบบนี้ยังไง"),
      answer(
        "scratch",
        "สร้าง AI ใหม่ตั้งแต่ศูนย์เลย",
        host("หลายคนคิดงี้เลย แต่ส่วนใหญ่ไม่ต้องเริ่มจากศูนย์หรอก"),
        host("งานส่วนใหญ่คือเอาโมเดลที่มีอยู่แล้ว มาทำให้ใช้ได้จริง", { mood: "wink" })
      ),
      answer("reuse", "เอา AI ที่มีอยู่แล้วมาจูน", host("ใช่เลย งานส่วนใหญ่คือเอาโมเดลที่มีอยู่แล้ว มาทำให้ใช้ได้จริง", { mood: "wow" })),
      answer(
        "prompt",
        "แค่พิมพ์สั่ง AI ก็จบปะ",
        host("ถ้าแค่นั้นก็ดีดิ แต่บอทที่ใช้จริงพังได้หลายแบบเลย", { mood: "wink" }),
        host("ของจริงคือต้องทำให้มันตอบถูกทุกวัน กับคนทั้งโรงเรียน")
      )
    ),
    dialogue("steps", host("ทำเป็นขั้นๆ: ป้อนข้อมูล ลองถาม แล้วแก้จุดที่พัง")),
    beat(
      "beat-docs",
      "ขั้นแรก: ป้อนข้อมูล",
      dialogue(
        "docs-intro",
        host("บอทจะตอบได้แค่จากเอกสารที่เธอให้มันอ่านเท่านั้น", { facts: [SIM] }),
        host("คัดให้ดี บางอย่างห้ามให้บอทเห็นเด็ดขาด", { mood: "serious" })
      ),
      {
        kind: "game",
        id: "docs",
        game: {
          engine: "SortGame",
          data: {
            layout: "cards",
            tagTh: "เลือกข้อมูลให้บอท",
            goalTh: "เลือกเอกสารที่บอทโรงเรียนควรอ่าน",
            bins: [
              { id: "feed", labelTh: "ให้บอทอ่าน" },
              { id: "keep", labelTh: "ไม่ให้อ่าน" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "doc-calendar",
                labelTh: "ปฏิทินโรงเรียนปีนี้",
                answer: "feed",
                revealTh: "วันสอบ วันหยุด นักเรียนถามเรื่องพวกนี้บ่อยสุด",
              },
              {
                id: "doc-handbook",
                labelTh: "คู่มือนักเรียน",
                answer: "feed",
                revealTh: "กฎการแต่งกาย การส่งงาน เวลาห้องสมุด อยู่ในนี้หมด",
              },
              {
                id: "doc-grades",
                labelTh: "เกรดของนักเรียนทุกคน",
                answer: "keep",
                revealTh: "ข้อมูลส่วนตัว ถ้าบอทอ่านได้ แค่ใครมาถามดีๆ ก็อาจหลุดออกไปได้นะ",
              },
              {
                id: "doc-old",
                labelTh: "ปฏิทินโรงเรียนปีที่แล้ว",
                answer: "keep",
                revealTh: "ของเก่าทำให้บอทตอบวันผิด ข้อมูลเยอะไม่ได้แปลว่าดีเสมอ",
              },
              {
                id: "doc-phones",
                labelTh: "เบอร์โทรผู้ปกครอง",
                answer: "keep",
                revealTh: "ข้อมูลส่วนตัวเหมือนกัน บอทตอบคำถามได้โดยไม่ต้องรู้เลย",
              },
              {
                id: "doc-teachers",
                labelTh: "แชตกลุ่มครู",
                answer: "keep",
                revealTh: "เรื่องภายในของครู ไม่ใช่ข้อมูลที่จะเอาไปตอบนักเรียน",
              },
            ],
            resultTh: "เลือกถูก {score}/{total}",
          },
        },
        track: { done: "work:docs", value: "score" },
        answersTh: [
          "ให้บอทอ่าน: ปฏิทินโรงเรียนปีนี้, คู่มือนักเรียน",
          "ไม่ให้อ่าน: เกรดของนักเรียนทุกคน, ปฏิทินปีที่แล้ว, เบอร์โทรผู้ปกครอง, แชตกลุ่มครู",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "docs.item-doc-grades-bin-keep" },
          { at: 2400, action: "wait" },
        ],
      },
      dialogue(
        "docs-after",
        host("คัดข้อมูลให้ถูก สำคัญกว่าโยนข้อมูลให้เยอะๆ", { mood: "wink" }),
        host("บอทพร้อมแล้ว ลองไปถามมันดูกัน")
      )
    ),
    beat(
      "beat-test",
      "ขั้นสอง: ลองถาม แล้วแก้",
      dialogue(
        "test-intro",
        host("ลองยิงคำถามที่นักเรียนถามจริงดู ว่าข้อไหนพัง", { facts: [SIM] }),
        host("ข้อไหนดีก็ปล่อยผ่าน ข้อไหนพังค่อยเลือกว่าจะแก้ยังไง")
      ),
      {
        kind: "game",
        id: "helpbot",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "ลองถาม แล้วแก้",
            goalTh: "ลองถามบอทโรงเรียน แล้วเลือกวิธีแก้ทีละข้อ",
            bins: [
              { id: "ok", labelTh: "ปล่อยได้" },
              { id: "data", labelTh: "เพิ่มข้อมูลให้บอท" },
              { id: "human", labelTh: "ส่งต่อให้คน" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "library",
                labelTh: "ห้องสมุดเปิดถึงกี่โมง",
                meta: { sender: "นักเรียน ม.4" },
                detailTh: "บอท: เปิด 7:30 ถึง 16:30 ค่ะ · คู่มือนักเรียน: ห้องสมุดเปิด 7:30 ถึง 16:30",
                answer: "ok",
                revealTh: "ตรงคู่มือทุกตัว แบบนี้ปล่อยได้เลย",
              },
              {
                id: "bus",
                labelTh: "รถโรงเรียนออกกี่โมง",
                meta: { sender: "ผู้ปกครอง" },
                detailTh: "บอท: ออก 16:30 ค่ะ · เอกสารที่บอทอ่าน: ไม่มีเรื่องรถโรงเรียนเลย",
                answer: "data",
                flags: ["แต่งคำตอบขึ้นมาเอง"],
                revealTh:
                  "เอกสารไม่มีเรื่องนี้ บอทเลยมั่วขึ้นมา แก้โดยเติมตารางรถให้มัน แล้วสั่งให้ตอบว่าไม่รู้ ถ้าหาในเอกสารไม่เจอ",
              },
              {
                id: "isan",
                labelTh: "ห้องน้ำอยู่ไส",
                meta: { sender: "นักเรียน ม.1" },
                detailTh: "บอท: ขอโทษค่ะ ไม่เข้าใจคำถาม · คู่มือนักเรียน: ห้องน้ำอยู่ชั้น 1 อาคาร 2",
                answer: "data",
                nearTh: { human: "ส่งให้คนตอบก็ได้ แต่คำถามแบบนี้มาทุกวัน สอนบอทให้เข้าใจเองดีกว่า" },
                flags: ["ไม่เข้าใจภาษาถิ่น"],
                revealTh: "เพิ่มตัวอย่างคำถามภาษาอีสานให้มัน AI ภาษาไทยต้องเข้าใจคนทั้งประเทศ ไม่ใช่แค่คนกรุงเทพฯ",
              },
              {
                id: "grades",
                labelTh: "ขอดูเกรดของเพื่อนในห้องได้ไหม",
                meta: { sender: "นักเรียน ม.6" },
                detailTh: "บอท: ดูเกรดคนอื่นไม่ได้นะ ถ้าอยากรู้เกรดตัวเอง ถามครูประจำชั้นได้เลย",
                answer: "ok",
                revealTh: "ปฏิเสธก็เป็นคำตอบที่ถูกได้ และบอทไม่มีเกรดใครให้หลุดอยู่แล้ว เพราะเธอไม่ได้ให้มันอ่าน",
              },
              {
                id: "bullied",
                labelTh: "โดนเพื่อนแกล้งทุกวัน ไม่อยากมาโรงเรียนแล้ว",
                meta: { sender: "นักเรียน ม.2" },
                detailTh: "บอท: ลองคิดบวกนะคะ เดี๋ยวทุกอย่างก็ดีขึ้นเอง",
                answer: "human",
                nearTh: { data: "เพิ่มข้อมูลก็ไม่พอ เรื่องนี้ต้องถึงมือครู" },
                flags: ["เรื่องความรู้สึกและความปลอดภัย"],
                revealTh: "เรื่องนี้บอทไม่ควรตอบเอง ต้องส่งต่อให้ครูแนะแนวหรือครูที่ดูแลนักเรียน",
              },
              {
                id: "medicine",
                labelTh: "ปวดหัว กินยาพาราได้กี่เม็ด",
                meta: { sender: "นักเรียน ม.3" },
                detailTh: "บอท: กินได้เลย 2 เม็ดค่ะ",
                answer: "human",
                nearTh: { data: "ต่อให้บอทรู้คำตอบ เรื่องยาก็ต้องให้คนตอบอยู่ดี" },
                flags: ["เรื่องสุขภาพ"],
                revealTh: "เรื่องยาให้ห้องพยาบาลหรือผู้ใหญ่ตอบ บอทที่ดีต้องรู้ว่าข้อไหนไม่ใช่งานตัวเอง",
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
            resultTh: "แก้ถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "ปล่อยได้: เวลาห้องสมุด, ปฏิเสธไม่ให้ดูเกรดเพื่อน, กติกาส่งงานช้า",
          "เพิ่มข้อมูลให้บอท: ตารางรถโรงเรียน, ตัวอย่างคำถามภาษาอีสาน",
          "ส่งต่อให้คน: โดนเพื่อนแกล้ง, เรื่องยา",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "helpbot.item-bus" },
          { at: 1600, action: "tap", target: "helpbot.item-bus-bin-data" },
          { at: 3200, action: "tap", target: "helpbot.item-bullied" },
          { at: 4200, action: "tap", target: "helpbot.item-bullied-bin-human" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำ คืองานจริงของวิศวกร AI เลยนะ", { mood: "wow" }),
        host("ป้อนข้อมูล ลองถาม แก้จุดพัง แล้ววนลูปจนใช้ได้จริง"),
        host("ขั้นลองถาม ทีม AI เรียกว่า eval แต่นี่แค่ส่วนหนึ่งของงาน"),
        host("เปิดใช้แล้วก็ยังต้องคอยเช็ก ว่ามีคนถามอะไรที่บอทยังตอบไม่ได้", { mood: "serious" })
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    careerKindsBeat({
      nameTh: "วิศวกร AI",
      facts: [THAIEXAM, INSPECTRA],
      tiles: [
        { id: "app", icon: "phone", titleTh: "สร้างแอป AI", lineTh: "เอาโมเดลที่มีอยู่ มาทำของให้คนใช้จริง แบบบอทเมื่อกี้", played: true },
        { id: "lang", icon: "speech", titleTh: "สอนภาษา", lineTh: "สอน AI ให้เก่งภาษาไทย แบบทีม Typhoon" },
        { id: "vision", icon: "eye", titleTh: "สอนดูรูป", lineTh: "สอน AI ให้ดูรูปเป็น แบบ Inspectra ที่ช่วยหมออ่านเอกซเรย์" },
        { id: "infra", icon: "server", titleTh: "คุมระบบ", lineTh: "คุมไม่ให้ AI ล่ม ต่อให้คนแห่มาใช้พร้อมกัน" },
        { id: "research", icon: "flask", titleTh: "วิจัย", lineTh: "คิดวิธีใหม่ให้ AI เก่งขึ้น ในแล็บมหาลัยหรือบริษัท" },
      ],
    }),
    dialogue("exit", sys("ด่านต่อไป: คืนนี้มาลองสอน AI ตัวแรกของเธอเอง")),
  ],
  reel: {
    format: "motion",
    hook: { th: "ทำบอทให้โรงเรียน ใครก็ทำได้ แต่ทำให้มันตอบถูกนี่สิของจริง" },
    variantsTh: ["วิศวกร AI ไม่ได้สร้าง AI จากศูนย์ทุกครั้ง งานจริงคือนี่", "บอทยอมรับว่าไม่รู้ ดีกว่าบอทที่แต่งเรื่องมาตอบ"],
    sendToFriendTh: "ส่งให้เพื่อนที่อยากทำ AI",
    visual: [
      "การ์ดเอกสารบินเข้ากล่องบอท เกรดเพื่อนถูกเด้งออก",
      "คำถามนักเรียนเด้งขึ้นทีละข้อ ป้าย ปล่อยได้ เพิ่มข้อมูล ส่งต่อให้คน ประทับลง",
      "วงกลมหมุน ป้อนข้อมูล ลองถาม แก้ วนกลับมาที่เดิม",
    ],
  },
};
