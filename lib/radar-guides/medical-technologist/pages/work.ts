/**
 * Level 1 · work. What the job feels like: the student's first shift in a
 * hospital lab, played as two quick sorts in the order the work happens:
 * 1. receive specimens: accept, or ask for a new sample (no label, wrong
 *    name, under-filled, haemolysed). Most lab errors happen before the
 *    machine (f.mt-preanalytical).
 * 2. check results before they leave the lab: release, recheck first
 *    (QC out, a big unexplained change, an analyser flag), or phone the ward
 *    now (a value past the lab's critical limit).
 * Patients are letters and no values are shown: the level is about trusting a
 * result, never about what a result means. Doctors interpret; the lab says so.
 * Then the kinds of medical technologist, with this one first.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { careerKindsBeat } from "../../_shared/kinds";
import { answer, beat, choice, dialogue, host, sys } from "../../_shared/story";

const SIM = "sim.mt-first-shift" as const;
const PREANALYTICAL = "f.mt-preanalytical" as const;
const PT = "f.mt-proficiency" as const;
const BLOOD = "f.mt-blood" as const;
const NIPAH = "f.mt-nipah" as const;
const BENCH = "f.mt-lab-benchmark" as const;
const PATHS = "f.mt-paths" as const;

export const work: GuidePage = {
  key: "work",
  order: 2,
  titleTh: "งานจริง คือทำให้ผลเชื่อได้",
  questionTh: "นักเทคนิคการแพทย์แค่กดเครื่องรอผลหรือเปล่า แล้วทั้งวันทำอะไร",
  navLabelTh: "เวรแรกในแล็บ",
  asOf: "2026-11-20",
  minutes: 2.5,
  factIds: [SIM, PREANALYTICAL, PT, BLOOD, NIPAH, BENCH, PATHS],
  og: { headlineTh: "เครื่องออกตัวเลขได้ แต่ใครบอกว่าตัวเลขนั้นเชื่อได้" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เธอได้ประเดิมเวรแรกในแล็บโรงพยาบาลแล้วนะ", { mood: "wow" }),
      host("ตัวอย่างจากหอผู้ป่วยกำลังส่งมา เธอคือด่านแรกเลย")
    ),
    choice(
      "how",
      host("ก่อนเริ่ม เธอว่างานหลักในแล็บคืออะไร"),
      answer(
        "machine",
        "ใส่หลอดเข้าเครื่อง แล้วรอผลออก",
        host("เครื่องช่วยเยอะจริง แต่ก่อนเข้ากับหลังออก คืองานของคน"),
        host("ผลจะเชื่อได้ไหม วัดกันตรงนั้นแหละ", { mood: "wink" })
      ),
      answer(
        "scope",
        "ส่องกล้องทั้งวันเลยมั้ง",
        host("มีส่องจริง แต่ไม่ได้ส่องทั้งวันหรอก"),
        host("งานจริงคือคอยจับผิดทุกขั้น ให้ผลมันเชื่อได้", { mood: "wink" })
      ),
      answer("check", "เช็กว่าผลถูกก่อนส่งให้หมอ", host("เป๊ะเลย งานจริงคือทำให้ผลเชื่อได้ก่อนถึงมือหมอ", { mood: "wow" }))
    ),
    dialogue("steps", host("งานจะเรียงเป็นขั้น: รับตัวอย่าง ตรวจ แล้วเช็กก่อนปล่อยผล")),
    beat(
      "beat-tubes",
      "ขั้นแรก: รับตัวอย่าง",
      dialogue(
        "tubes-intro",
        host("มีงานวิจัยหนึ่งเจอว่า ผลผิดส่วนใหญ่เกิดก่อนหลอดถึงเครื่องอีก", { facts: [PREANALYTICAL] }),
        host("งั้นเธอต้องคัดหลอดที่ใช้ไม่ได้ออกก่อนเลย", { mood: "serious" })
      ),
      {
        kind: "game",
        id: "tubes",
        game: {
          engine: "SortGame",
          data: {
            layout: "cards",
            tagTh: "รับตัวอย่างเข้าแล็บ",
            goalTh: "คัดหลอดที่ใช้ไม่ได้ออก ก่อนเข้าเครื่อง",
            bins: [
              { id: "accept", labelTh: "รับเข้าแล็บ" },
              { id: "reject", labelTh: "ขอเก็บใหม่" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "tube-ok",
                labelTh: "หลอดเลือด ชื่อตรงกับใบสั่งตรวจ เลือดถึงขีด",
                answer: "accept",
                revealTh: "ครบเป๊ะ รับเข้าแล็บได้เลย",
              },
              {
                id: "nolabel",
                labelTh: "หลอดเลือดไม่มีสติกเกอร์ชื่อ",
                answer: "reject",
                revealTh: "ไม่รู้เลือดใคร ต่อให้ตรวจแม่นแค่ไหนก็ใช้ไม่ได้อยู่ดี",
              },
              {
                id: "mismatch",
                labelTh: "ชื่อบนหลอดไม่ตรงกับใบสั่งตรวจ",
                answer: "reject",
                revealTh: "เสี่ยงสลับคน ผลผิดคนอันตรายกว่าไม่มีผลอีกนะ",
              },
              {
                id: "short",
                labelTh: "เลือดในหลอดไม่ถึงขีดที่กำหนด",
                answer: "reject",
                revealTh: "เลือดน้อยไป สัดส่วนกับน้ำยาในหลอดเพี้ยน ผลก็เพี้ยนตามเลย",
              },
              {
                id: "hemolysis",
                labelTh: "ปั่นแล้วน้ำเลือดเป็นสีแดง เพราะเม็ดเลือดแดงแตก",
                answer: "reject",
                revealTh: "เม็ดเลือดแตกทำบางค่าในเลือดเพี้ยนได้ ต้องขอเก็บใหม่นะ",
              },
              {
                id: "urine-ok",
                labelTh: "กระปุกปัสสาวะ ปิดฝาสนิท ชื่อครบ",
                answer: "accept",
                revealTh: "ฉลากครบ ฝาสนิท รับเข้าแล็บได้เลย",
              },
            ],
            resultTh: "คัดถูก {score}/{total}",
          },
        },
        track: { done: "work:tubes", value: "score" },
        answersTh: [
          "รับเข้าแล็บ: หลอดที่ชื่อตรงและเลือดถึงขีด, กระปุกปัสสาวะที่ฉลากครบ",
          "ขอเก็บใหม่: หลอดไม่มีชื่อ, ชื่อไม่ตรงใบสั่งตรวจ, เลือดไม่ถึงขีด, เม็ดเลือดแดงแตก",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "tubes.item-nolabel-bin-reject" },
          { at: 2400, action: "wait" },
        ],
      },
      dialogue(
        "tubes-after",
        host("ถ้ารับหลอดที่ใช้ไม่ได้เข้ามา ผลก็ผิดตั้งแต่ยังไม่ทันตรวจ", { mood: "wink" }),
        host("คัดหลอดผ่านแล้ว ไปดูผลกันต่อ")
      )
    ),
    beat(
      "beat-results",
      "ขั้นสอง: เช็กก่อนปล่อยผล",
      dialogue(
        "results-intro",
        host("เครื่องตรวจเสร็จแล้ว แต่ผลยังไม่ถึงมือหมอหรอกนะ", { facts: [SIM] }),
        host("มาดูกัน เคสไหนปล่อยได้ เคสไหนตรวจซ้ำ เคสไหนต้องรีบโทร")
      ),
      {
        kind: "game",
        id: "results",
        game: {
          engine: "SortGame",
          data: {
            layout: "queue",
            tagTh: "เช็กก่อนปล่อยผล",
            goalTh: "ตัดสินทีละเคส ว่าผลนี้ออกจากแล็บได้หรือยัง",
            bins: [
              { id: "release", labelTh: "ปล่อยผล" },
              { id: "recheck", labelTh: "ตรวจซ้ำก่อน" },
              { id: "call", labelTh: "โทรแจ้งทันที" },
            ],
            simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
            items: [
              {
                id: "normal",
                labelTh: "ผลเลือดคนไข้ A",
                meta: { sender: "หอผู้ป่วยใน" },
                detailTh: "QC เช้านี้ผ่าน · ผลอยู่ในช่วงปกติ · ใกล้เคียงผลครั้งก่อน",
                answer: "release",
                revealTh: "ทุกอย่างเข้าที่ ปล่อยผลให้หมอได้เลย",
              },
              {
                id: "qc-fail",
                labelTh: "ผลทั้งชุดจากเครื่องเดียวกัน",
                meta: { sender: "เครื่องตรวจเคมี" },
                detailTh: "ตัวอย่างควบคุม (QC) ที่รู้คำตอบอยู่แล้ว ตรวจออกมาหลุดช่วง",
                answer: "recheck",
                nearTh: { call: "ยังไม่ต้องโทร ผลชุดนี้ยังเชื่อไม่ได้เลย แก้เครื่องแล้วตรวจใหม่ก่อน" },
                flags: ["QC ไม่ผ่าน"],
                revealTh: "เครื่องอาจเพี้ยน ห้ามปล่อยชุดนี้เด็ดขาด แก้เครื่องแล้วตรวจใหม่",
              },
              {
                id: "delta",
                labelTh: "ผลเลือดคนไข้ B",
                meta: { sender: "หอผู้ป่วยใน" },
                detailTh: "ผลวันนี้โดดจากเมื่อวานมาก แบบไม่น่าเป็นไปได้",
                answer: "recheck",
                flags: ["ต่างจากผลเดิมมาก"],
                revealTh: "อาจสลับหลอดหรือเก็บผิดวิธี ต้องตรวจซ้ำ หรือขอเก็บใหม่ก่อน",
              },
              {
                id: "flag",
                labelTh: "ผลนับเม็ดเลือดคนไข้ C",
                meta: { sender: "ห้องฉุกเฉิน" },
                detailTh: "เครื่องขึ้นเตือนว่าเจอเซลล์หน้าตาแปลกๆ",
                answer: "recheck",
                flags: ["เครื่องขึ้นเตือน"],
                revealTh: "ต้องทำสไลด์ส่องกล้องดูเอง เครื่องเตือนได้ แต่คนต้องยืนยัน",
              },
              {
                id: "critical",
                labelTh: "ผลเลือดคนไข้ D",
                meta: { sender: "ห้องฉุกเฉิน" },
                detailTh: "ค่าเกลือแร่ในเลือดสูงเกินเส้นวิกฤตที่แล็บตั้งไว้ · QC ผ่าน · ตัวอย่างไม่มีปัญหา",
                answer: "call",
                nearTh: {
                  release: "ปล่อยผลเฉยๆ ไม่พอ ค่าวิกฤตต้องโทรบอกทันที",
                  recheck: "QC กับตัวอย่างผ่านแล้ว อย่าให้ช้า โทรบอกก่อนเลย",
                },
                flags: ["ค่าวิกฤต"],
                revealTh: "เจอค่าวิกฤตต้องโทรแจ้งหมอหรือพยาบาลทันที แล้วจดไว้ว่าแจ้งใคร กี่โมง",
              },
              {
                id: "slightly-high",
                labelTh: "ผลเลือดคนไข้ E",
                meta: { sender: "คลินิกผู้ป่วยนอก" },
                detailTh: "QC ผ่าน · สูงกว่าช่วงปกตินิดหน่อย · ใกล้เคียงผลครั้งก่อน",
                answer: "release",
                nearTh: { call: "ไม่ถึงเส้นวิกฤต ไม่ต้องโทรด่วน ปล่อยผลแล้วหมอจะดูเอง" },
                revealTh: "ไม่ถึงเส้นวิกฤต แถมใกล้เคียงผลเดิม ปล่อยได้เลย หมอจะเป็นคนแปลผลเอง",
              },
            ],
            resultTh: "ตัดสินถูก {score}/{total}",
          },
        },
        track: { done: "work:done", value: "score" },
        answersTh: [
          "ปล่อยผล: QC ผ่านและผลใกล้เคียงครั้งก่อน (คนไข้ A และ E)",
          "ตรวจซ้ำก่อน: QC หลุดช่วง, ผลโดดจากเมื่อวานมาก, เครื่องขึ้นเตือนเซลล์แปลก",
          "โทรแจ้งทันที: ค่าเกินเส้นวิกฤตที่แล็บตั้งไว้ แล้วจดว่าแจ้งใคร กี่โมง",
        ],
        demoScript: [
          { at: 600, action: "tap", target: "results.item-qc-fail" },
          { at: 1600, action: "tap", target: "results.item-qc-fail-bin-recheck" },
          { at: 3200, action: "tap", target: "results.item-critical" },
          { at: 4200, action: "tap", target: "results.item-critical-bin-call" },
          { at: 6000, action: "wait" },
        ],
      },
      dialogue(
        "debrief",
        host("ที่เธอเพิ่งทำเมื่อกี้ คืองานจริงของนักเทคนิคการแพทย์เลยนะ", { mood: "wow" }),
        host("รับตัวอย่าง เช็กเครื่อง ดูผล แล้วตัดสินใจว่าปล่อยได้ไหม"),
        host("รู้ปะ แล็บก็ต้องสอบนะ", { mood: "wink" }),
        host("แล็บกว่า 1,200 แห่ง ตรวจตัวอย่างลับจากกรมวิทย์ฯ เพื่อเช็กความแม่น", { facts: [PT] }),
        host("ส่วนการบอกคนไข้ว่าผลแปลว่าอะไร อันนั้นเป็นงานของหมอนะ", { mood: "serious" })
      ),
      { kind: "shareCard", id: "share-work" }
    ),
    careerKindsBeat({
      nameTh: "นักเทคนิคการแพทย์",
      facts: [BLOOD, NIPAH, BENCH, PATHS],
      tiles: [
        { id: "hospital", icon: "microscope", titleTh: "แล็บโรงพยาบาล", lineTh: "ตรวจเลือด ปัสสาวะ เช็กชัวร์ก่อนปล่อยผล แบบเวรเมื่อกี้", played: true },
        { id: "blood-bank", icon: "droplet", titleTh: "ธนาคารเลือด", lineTh: "ตรวจหาเชื้อในเลือดบริจาค ให้มั่นใจว่าทุกถุงปลอดภัย" },
        { id: "microbe", icon: "magnifier", titleTh: "ล่าเชื้อโรค", lineTh: "ตามล่าเชื้อตัวการ แบบแล็บที่พร้อมตรวจนิปาห์" },
        { id: "genes", icon: "dna", titleTh: "แล็บยีน", lineTh: "อ่านสารพันธุกรรม หนึ่งในสายอนาคตที่สภาฯ วางแผนไว้" },
        { id: "devices", icon: "chip", titleTh: "สายเครื่องมือ", lineTh: "บริษัทเครื่องมือแพทย์ สอนแล็บใช้ แก้ให้เครื่องเดินได้" },
      ],
    }),
    dialogue("exit", sys("ด่านต่อไป: คืนนี้มาเปิดแล็บบนโต๊ะของเธอเอง")),
  ],
  reel: {
    format: "motion",
    hook: { th: "เครื่องออกตัวเลขได้ แต่ใครบอกว่าตัวเลขนั้นเชื่อได้" },
    variantsTh: ["หลอดเลือดไม่มีชื่อ ต่อให้ตรวจแม่นแค่ไหนก็ใช้ไม่ได้", "นักเทคนิคการแพทย์ไม่ได้แค่กดเครื่อง งานจริงคือนี่"],
    sendToFriendTh: "ส่งให้เพื่อนที่ละเอียดจนเพื่อนบ่น",
    visual: [
      "หลอดเลือดไหลมาบนสายพาน หลอดไม่มีชื่อถูกดีดออก",
      "ผลขึ้นจอทีละเคส ป้าย ปล่อยผล ตรวจซ้ำ โทรแจ้ง ประทับลง",
      "โทรศัพท์ในแล็บดัง ไฟวิกฤตกะพริบ แล้วสมุดจดเวลาแจ้งพลิกเปิด",
    ],
  },
};
