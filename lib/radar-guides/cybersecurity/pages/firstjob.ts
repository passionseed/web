/**
 * Level 5 · firstjob. Design: docs/radar-guide/cybersecurity-guide.md, Page 5.
 * The missing-rung ladder, then three proof picks the player carries to
 * `tonight` and `next`. No cutscene (motion reel).
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { dialogue, host, item } from "./_story";

const PULSE = "f.isc2-pulse" as const;

export const firstjob: GuidePage = {
  key: "firstjob",
  order: 5,
  titleTh: "งานแรกของฉัน จะเหลืออะไร",
  questionTh: "ถ้า AI ทำงานพื้นฐานได้ ตำแหน่งเริ่มต้นจะหายไหม",
  navLabelTh: "งานแรก",
  asOf: "2026-11-11",
  minutes: 1,
  legacyHashes: ["ai"],
  factIds: [PULSE, "f.isc2-workforce", "f.gtg1002", "f.sans-titles", "f.tdri"],
  og: {
    headlineTh: "บันไดขั้นแรกอาจไม่ได้หาย แต่ย้ายจากเฝ้าจอ ไปเป็นตรวจงาน AI",
    stat: { th: "31% คิดว่าจะเกิดตำแหน่งเริ่มต้นแบบใหม่", factIds: [PULSE] },
  },
  blocks: [
    dialogue(
      "intro",
      host("พอ AI ทำงานพื้นฐานได้แล้ว งานแรกของเธอจะเหลืออะไร"),
      host("ลองกดเพิ่ม AI เข้าไปในบันไดนี้ แล้วดูว่าขั้นไหนจะหายไป", { mood: "wink" })
    ),
    {
      kind: "game",
      id: "ladder",
      game: {
        engine: "LadderRebuild",
        data: {
          rungsTh: ["นั่งเฝ้าจอแจ้งเตือน", "อ่าน log ทั้งคืน", "สแกนช่องโหว่เบื้องต้น", "สืบสวนเหตุ", "วางระบบป้องกัน"],
          fadeCount: 3,
          aiCaption: {
            th: "52% ของคนสายนี้ในผลสำรวจ ISC2 คิดว่า AI จะลดความต้องการคนระดับเริ่มต้น",
            factIds: [PULSE],
          },
          newRungsTh: ["ตรวจงาน AI", "นักวิเคราะห์ SOC ที่ใช้ AI ช่วย", "ทดสอบ AI เอง (AI red team)"],
          newCaption: {
            th: "แต่ 31% คิดว่าจะเกิดตำแหน่งเริ่มต้นแบบใหม่ เช่น นักวิเคราะห์ SOC ที่ใช้ AI ช่วย",
            factIds: [PULSE],
          },
          proofChips: [
            { id: "writeup", labelTh: "เขียน write-up จากห้องฝึก", evidenceTh: "ลิงก์ write-up ที่คนอื่นอ่านได้" },
            { id: "ctf", labelTh: "แข่ง CTF", evidenceTh: "อันดับหรือใบประกาศ" },
            { id: "homelab", labelTh: "ทำแล็บที่บ้าน", evidenceTh: "รูปและบันทึกว่าตั้งค่าอะไร" },
            { id: "oss", labelTh: "ช่วยงานโอเพนซอร์ส", evidenceTh: "ลิงก์ issue หรือ pull request" },
            { id: "network", labelTh: "เรียนพื้นฐานเครือข่าย", evidenceTh: "สรุปโน้ตของตัวเอง" },
            { id: "family", labelTh: "สอนที่บ้านเรื่องมิจฉาชีพ", evidenceTh: "เรื่องเล่าในพอร์ตว่าเธอช่วยใคร" },
          ],
          pick: 3,
        },
      },
      track: { done: "firstjob:proof", value: "bitmask", milestones: { ladder: "firstjob:ladder" } },
      answersTh: [
        "ขั้นล่างที่ AI ทำได้: นั่งเฝ้าจอแจ้งเตือน อ่าน log ทั้งคืน สแกนช่องโหว่เบื้องต้น",
        "ขั้นใหม่ที่อาจมาแทน: ตรวจงาน AI, นักวิเคราะห์ SOC ที่ใช้ AI ช่วย, ทดสอบ AI เอง (AI red team)",
        "ขั้นแรกของเธอสร้างเองได้: write-up จากห้องฝึก, แข่ง CTF, แล็บที่บ้าน, ช่วยงานโอเพนซอร์ส, พื้นฐานเครือข่าย, สอนที่บ้านเรื่องมิจฉาชีพ",
      ],
      demoScript: [
        { at: 700, action: "tap", target: "ladder.ai" },
        { at: 2400, action: "tap", target: "ladder.replace" },
        { at: 4200, action: "tap", target: "ladder.chip-writeup" },
        { at: 4800, action: "tap", target: "ladder.chip-ctf" },
        { at: 5400, action: "tap", target: "ladder.chip-family" },
        { at: 6000, action: "tap", target: "ladder.confirm" },
        { at: 7000, action: "wait" },
      ],
    },
    dialogue("after", host("บันไดขั้นแรกอาจไม่ได้หาย แต่ย้ายจากเฝ้าจอ ไปเป็นตรวจงาน AI", { mood: "wow" })),
    item("stat-skills", "stat", "ทักษะที่คนสายนี้ทั่วโลกบอกว่าขาดมากที่สุดตอนนี้คือ AI (41% จากผู้ตอบ 16,029 คน)", {
      title: "ISC2",
      facts: ["f.isc2-workforce"],
    }),
    item(
      "intel-attacker",
      "intel",
      "ฝั่งคนร้ายก็ใช้ AI: Anthropic บอกว่าเคสจารกรรมที่จับได้ปี 2568 AI ทำงานไปราว 80 ถึง 90% คนเข้ามาตัดสินใจแค่ราว 4 ถึง 6 จุด",
      { title: "อีกฝั่งก็อัปเกรด", facts: ["f.gtg1002"], badge: "vendor" }
    ),
    item(
      "intel-us-titles",
      "intel",
      "ในอเมริกามีชื่องานใหม่โผล่มาแล้ว: AI/ML security engineer กว่า 850 ตำแหน่ง, AI governance ราว 430, AI red team ราว 100, AI SOC orchestrator 36",
      { title: "ชื่องานใหม่ (สหรัฐฯ ก.ย. 2569)", facts: ["f.sans-titles"], labels: ["usOnly"] }
    ),
    item(
      "intel-thai",
      "intel",
      "ในไทย TDRI ประเมินว่าคนทำงานราว 2.2 ล้านคนเสี่ยงสูงที่งานจะถูก AI ทำแทน และเด็กจบใหม่เริ่มหางานระดับเริ่มต้นยากขึ้นแล้ว",
      { title: "ฝั่งไทย", facts: ["f.tdri"] }
    ),
    dialogue(
      "exit",
      host("อย่ารอเรียนจบค่อยมีผลงาน"),
      host("ขั้นแรกของเธอสร้างได้ตั้งแต่ ม.ปลาย", { mood: "wink" })
    ),
  ],
  reel: {
    format: "motion",
    hook: { th: "AI จะกินงานแรกของสายไซเบอร์ไหม" },
    variantsTh: ["AI อาจไม่ได้ลบงานแรก แต่ย้ายบันไดขั้นแรก", "52% ในวงการคิดว่างานแรกจะลด แต่ 31% คิดว่าจะมีงานแรกแบบใหม่"],
    sendToFriendTh: "ส่งให้เพื่อนที่กลัวว่า AI จะแย่งงาน",
    visual: [
      "บันไดหนึ่งอัน ขั้นล่างจางหายเมื่อตรา AI ผ่าน",
      "ขั้นใหม่สามขั้นเด้งเข้าที่สูงขึ้นหนึ่งระดับ",
      "บล็อกผลงานสามก้อนซ้อนใต้บันได",
    ],
  },
};
