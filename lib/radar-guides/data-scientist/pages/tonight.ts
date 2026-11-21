/**
 * Level 1 · tonight. One real first step: download real Thai open data
 * (Nonthaburi's daily PM2.5 on data.go.th, no account needed), ask one
 * question, clean the n/a cells, make one chart, write it up. The write-up
 * builder never leaves the device. Only the spreadsheet app may need an
 * account, so the age-check line is on the room card and the checklist.
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item, sys } from "../../_shared/story";

const NONT = "f.ds-nont-data" as const;
const DATASET_URL = "https://data.go.th/dataset/nont-pm2-5" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ ข้อมูลฝุ่นจริง หนึ่งกราฟ หนึ่งข้อค้นพบ",
  questionTh: "คืนนี้ทำอะไรได้เลย ที่จบด้วยผลงานจริงในแฟ้ม",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-18",
  minutes: 1,
  factIds: [NONT, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้ลองเปิดข้อมูลฝุ่นจริงของรัฐ แล้วเธอจะได้งานข้อมูลชิ้นแรก" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นในจอ แต่เป็นภารกิจจริงคืนนี้", { mood: "wow" }),
      host("ใช้ข้อมูลฝุ่นของจริงจากเว็บข้อมูลเปิดของรัฐ ฟรี ไม่ต้องสมัคร", { facts: [NONT] })
    ),
    item(
      "dataset",
      "intel",
      "สำนักงานทรัพยากรธรรมชาติและสิ่งแวดล้อมจังหวัดนนทบุรี เปิดไฟล์ CSV ค่าฝุ่น PM2.5 รายวันจาก 2 สถานี ให้ทุกคนโหลดไปใช้ได้ ไม่ต้องมีบัญชี",
      { title: "ชุดข้อมูล: ฝุ่นนนทบุรี", meta: "data.go.th", facts: [NONT], badge: "confirmed" }
    ),
    dialogue(
      "hint",
      host("ใบ้ให้เลย บางช่องในไฟล์นี้เขียนว่า n/a", { facts: [NONT] }),
      host("จำด่านตารางรกได้ไหม นั่นแหละงานแรกของเธอ", { mood: "wink" })
    ),
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "data.go.th · รายงานคุณภาพอากาศ (pm2.5) จังหวัดนนทบุรี",
            href: DATASET_URL,
            badgeTh: "ข้อมูลเปิดของรัฐ โหลดได้ไม่ต้องสมัคร (เช็กเมื่อ 18 พ.ย. 2569)",
            subTh: "อยู่จังหวัดอื่น? ลองค้นคำว่า PM2.5 ตามด้วยชื่อจังหวัดใน data.go.th ได้เลย",
            factIds: [NONT],
          },
          checklistTh: [
            "โหลดไฟล์ CSV",
            "เปิดในโปรแกรมตาราง เช่น Google Sheets หรือ Excel (ถ้าต้องสมัครบัญชี เช็กเกณฑ์อายุของเว็บก่อน ถ้าต้องมีผู้ปกครอง ให้สมัครด้วยกัน)",
            "ตั้งคำถามหนึ่งข้อก่อนเริ่มทำกราฟ",
            "เคลียร์ช่อง n/a แล้วทำกราฟหนึ่งรูป",
            "เขียน write-up",
          ],
          fields: [
            { id: "question", placeholderTh: "คำถามของฉัน (เช่น เดือนไหนฝุ่นหนักสุด)" },
            { id: "data", placeholderTh: "ใช้ข้อมูลอะไร ช่วงไหน" },
            { id: "clean", placeholderTh: "เจออะไรแปลกๆ ในไฟล์ แล้วเธอจัดการยังไง" },
            { id: "finding", placeholderTh: "หนึ่งเรื่องที่กราฟนี้บอก" },
            { id: "limit", placeholderTh: "สิ่งที่ข้อมูลนี้ยังบอกไม่ได้" },
          ],
          fixedLinesTh: ["ที่มาข้อมูล: data.go.th ข้อมูลเปิดภาครัฐ (แปะชื่อชุดข้อมูลกับลิงก์ไว้ด้วย)"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: { done: "tonight:done", value: "count", milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" } },
      answersTh: [
        "เปิดชุดข้อมูลฝุ่นนนทบุรีใน data.go.th แล้วโหลดไฟล์ CSV ไม่ต้องสมัคร",
        "เปิดในโปรแกรมตาราง (ถ้าต้องสมัครบัญชี เช็กเกณฑ์อายุของเว็บก่อน ถ้าต้องมีผู้ปกครอง ให้สมัครด้วยกัน) ตั้งคำถามหนึ่งข้อ จัดการช่อง n/a แล้วทำกราฟหนึ่งรูป",
        "เขียน write-up: คำถามของฉัน ใช้ข้อมูลอะไร เจออะไรแปลกๆ ในไฟล์ ข้อค้นพบหนึ่งข้อ และข้อมูลนี้ยังบอกอะไรไม่ได้",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-question", text: "เดือนไหนฝุ่นที่ปากเกร็ดหนักสุด" },
        { at: 3200, action: "type", target: "writeup.field-limit", text: "มีแค่สองสถานี บอกไม่ได้ว่าทั้งจังหวัดเป็นแบบนี้" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    dialogue(
      "writeup-why",
      host("ช่องที่สำคัญสุด คือสิ่งที่ข้อมูลนี้ยังบอกไม่ได้", { mood: "serious" }),
      host("เช่น ไฟล์นี้มีแค่ 2 สถานี เลยเหมารวมทั้งจังหวัดไม่ได้", { facts: [NONT] }),
      host("คนที่บอกข้อจำกัดของข้อมูลตัวเองได้ คือคนที่คนอื่นเชื่อใจ", { labels: ["teamView"] })
    ),
    dialogue(
      "callback",
      host("จำการ์ดเชียงใหม่ได้ไหม ทุกอย่างเริ่มจากคำถามเดียวเลย", { mood: "wink" }),
      host("กราฟนี้กับ write-up คือผลงานชิ้นแรกในแฟ้มของเธอ")
    ),
    roundOneTeaser(),
    whenChoice("ทำเสร็จแล้ว พรุ่งนี้ลองถามคำถามที่สองกับไฟล์เดิมดู"),
    dialogue(
      "callback-next",
      sys("ถ้าจะเอาไปโพสต์ แปะที่มาของข้อมูลไว้ด้วยทุกครั้งนะ")
    ),
  ],
};
