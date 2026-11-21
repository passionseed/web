/**
 * Level 4 · tonight. One free first step that ends with something a friend can
 * actually use: a one-page site on GitHub Pages that fixes one small problem,
 * then a write-up of what the friend said. GitHub accounts need age 13+, so
 * the age line from the brief is on the card. Free plans make the repository
 * public, so nothing personal goes on the page (pinned safety block).
 */
import { whenChoice } from "../../_shared/choices";
import { ROUND_ONE_FACT, roundOneTeaser } from "../../_shared/round1";
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item, sys } from "../../_shared/story";

const GH = "f.gh-pages" as const;
const MDN = "f.mdn-first-site" as const;
const QUICKSTART_URL = "https://docs.github.com/en/pages/quickstart" as const;

export const tonight: GuidePage = {
  key: "tonight",
  order: 3,
  titleTh: "คืนนี้ ทำเว็บหน้าเดียวให้เพื่อนใช้",
  questionTh: "คืนนี้ลองทำอะไรสักอย่าง ที่จบแล้วมีของจริงใส่พอร์ตได้เลย",
  navLabelTh: "ภารกิจคืนนี้",
  asOf: "2026-11-18",
  minutes: 1,
  factIds: [GH, MDN, ROUND_ONE_FACT],
  og: { headlineTh: "คืนนี้ทำเว็บหน้าเดียวที่เพื่อนใช้ได้จริง แล้วเธอจะมีผลงานสายโค้ดชิ้นแรกเลย" },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้ไม่ได้เล่นในจอ เป็นภารกิจจริงคืนนี้", { mood: "wow" }),
      host("ทำเว็บหน้าเดียวไว้ช่วยแก้ปัญหาเล็กๆ ให้เพื่อนสักคน"),
      host("เหมือนคนตกรถในด่านแรกนั่นแหละ เริ่มจากปัญหาที่เจอจริง", { mood: "wink" })
    ),
    item(
      "ideas",
      "intel",
      "หน้ารวมลิงก์ที่ห้องเธอหาไม่เคยเจอ ตารางสอบห้อง สูตรที่เพื่อนถามซ้ำทุกคาบ หรือลิสต์ว่าใครยืมอะไรไป",
      { title: "ไอเดียตั้งต้น" }
    ),
    {
      kind: "safety",
      id: "privacy",
      lineTh:
        "เว็บนี้ใครในอินเทอร์เน็ตก็เปิดดูได้ อย่าใส่ชื่อจริง เบอร์โทร รูป หรือข้อมูลส่วนตัวของเธอและเพื่อนลงไป",
    },
    item(
      "intel-pages",
      "intel",
      "GitHub Pages เอาไฟล์ index.html ของเธอขึ้นเป็นเว็บจริงได้ฟรี ถ้าเก็บโค้ดแบบสาธารณะ แก้แล้วอาจรอถึง 10 นาทีกว่าเว็บจะอัปเดต",
      { title: "ที่ฝากเว็บ: GitHub Pages", facts: [GH] }
    ),
    {
      kind: "game",
      id: "writeup",
      game: {
        engine: "EvidenceMaker",
        data: {
          room: {
            titleTh: "GitHub Pages · คู่มือเริ่มใช้",
            href: QUICKSTART_URL,
            badgeTh: "ฟรีตามคู่มือของ GitHub ณ 18 พ.ย. 2569 เช็กอีกครั้งก่อนสมัคร",
            subTh: "GitHub รับคนอายุ 13 ปีขึ้นไป เช็กเกณฑ์อายุของเว็บก่อน ถ้าต้องมีผู้ปกครอง ให้สมัครด้วยกัน",
            factIds: [GH],
          },
          checklistTh: [
            "หยิบปัญหาเล็กๆ ที่เพื่อนเจอจริง",
            "เขียนเว็บหน้าเดียว ตั้งชื่อไฟล์ index.html",
            "อัปขึ้น GitHub Pages ตามคู่มือ",
            "ส่งลิงก์ให้เพื่อนลองใช้ แล้วนั่งดูเขาใช้จริง",
            "จดไว้ว่าเพื่อนพูดอะไร ติดตรงไหน",
          ],
          fields: [
            { id: "problem", placeholderTh: "ปัญหาคืออะไร ใครเจอ" },
            { id: "built", placeholderTh: "สิ่งที่ฉันทำออกมา (ลิงก์)" },
            { id: "friend", placeholderTh: "เพื่อนว่ายังไงบ้าง ติดตรงไหน" },
            { id: "fix", placeholderTh: "รอบหน้าจะแก้อะไรเป็นอย่างแรก เพราะอะไร" },
            { id: "help", placeholderTh: "ส่วนไหนเขียนเอง ส่วนไหนให้คนหรือเครื่องมือช่วย" },
          ],
          fixedLinesTh: ["บนหน้าเว็บไม่มีข้อมูลส่วนตัวของใคร"],
          privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
        },
      },
      track: {
        done: "tonight:done",
        value: "count",
        milestones: { checklist: "tonight:checklist", copied: "tonight:writeup-copied" },
      },
      answersTh: [
        "เลือกปัญหาเล็กๆ ที่เพื่อนเจอจริง แล้วเขียนหน้าเว็บหน้าเดียว (index.html)",
        "เอาขึ้น GitHub Pages ตามคู่มือ (เช็กเกณฑ์อายุของเว็บก่อน ถ้าต้องมีผู้ปกครอง ให้สมัครด้วยกัน)",
        "ส่งลิงก์ให้เพื่อนลองใช้ แล้วเขียนสรุป: ปัญหาอะไร ทำอะไรออกมา เพื่อนว่ายังไง รอบหน้าจะแก้อะไร",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "writeup.check-0" },
        { at: 1200, action: "type", target: "writeup.field-problem", text: "เพื่อนในห้องหาลิงก์ส่งงานแต่ละวิชาไม่เจอ" },
        { at: 3200, action: "type", target: "writeup.field-friend", text: "เพื่อนบอกว่าปุ่มเล็กไป กดบนมือถือยาก" },
        { at: 5200, action: "tap", target: "writeup.copy" },
        { at: 6500, action: "wait" },
      ],
    },
    {
      kind: "link",
      id: "mdn",
      labelTh: "ไม่เคยเขียน HTML มาก่อน เริ่มที่คู่มือนี้เลย (ภาษาอังกฤษ ไม่ต้องสมัคร)",
      href: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website",
      cta: "first-step",
    },
    dialogue(
      "no-account",
      host("ไม่อยากสมัครอะไรเลยก็ยังได้นะ"),
      host("เขียนไฟล์ไว้ในเครื่อง แล้วเปิดให้เพื่อนลองบนเครื่องเธอเลย"),
      host("จุดสำคัญคือมีคนจริงได้ลองใช้ ไม่ใช่ว่าเว็บอยู่ที่ไหน")
    ),
    dialogue(
      "writeup-why",
      host("ที่มีค่ากว่าตัวเว็บ คือสิ่งที่เพื่อนพูดตอนลองใช้", { mood: "serious" }),
      host("จำด่านงานจริงได้ไหม งานสายนี้คือฟังคนใช้ แล้วตามแก้จุดที่พัง"),
      host("ทีมเราคิดว่าช่องรอบหน้าจะแก้อะไรก่อน มีค่าที่สุด อย่าข้ามนะ", { labels: ["teamView"] })
    ),
    dialogue(
      "folio",
      host("write-up นี้คือโครงงานที่มีคนใช้จริงด้วยนะ", { mood: "wink" })
    ),
    roundOneTeaser(),
    whenChoice("ทำเสร็จแล้ว พรุ่งนี้แก้ตามที่เพื่อนบอกต่อเลย"),
    dialogue(
      "callback",
      sys("ถ้าใช้โค้ดหรือรูปของคนอื่น แปะเครดิตไว้ในหน้าเว็บด้วย")
    ),
  ],
};
