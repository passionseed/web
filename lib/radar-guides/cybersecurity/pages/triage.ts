/**
 * Level 3 · triage. Design: docs/radar-guide/cybersecurity-guide.md, Page 3.
 * Manager of AI agents: 10 simulated alerts, 2 wrong labels. Cutscene after
 * the end screen, then speed, the bucket vs the pipe, the ER bridge.
 * The phase 2 maintainer bonus round is not built yet.
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { CLIP, beat, dialogue, host, item } from "./_story";

const SIM = "sim.triage-queue" as const;
const GAP = "f.patch-gap" as const;

export const triage: GuidePage = {
  key: "triage",
  order: 3,
  titleTh: "งานจริง คือจับผิด AI",
  questionTh: "วันธรรมดาของคนสายนี้ เขาทำอะไรกันแน่",
  navLabelTh: "จับผิด AI",
  asOf: "2026-11-11",
  minutes: 1.5,
  legacyHashes: ["reality", "day"],
  factIds: [
    SIM,
    "f.crowdstrike",
    GAP,
    "f.glasswing-bottleneck-quote",
    "f.oss-scanner",
    "f.isc2-pulse",
    "f.cso-manager-agents",
  ],
  og: {
    headlineTh: "งานแรกของเธออาจไม่ใช่นั่งดูจอ แต่คือการตรวจงาน AI",
    stat: { th: "AI ติดป้ายผิด 2 ใน 10 เธอหาเจอไหม", factIds: [SIM], badge: "simulated" },
  },
  blocks: [
    dialogue(
      "intro",
      host("ในหนัง แฮกเกอร์พิมพ์รัวๆ คืนเดียวระบบแตก"),
      host("ของจริงคือคิวสัญญาณเตือนยาวเหยียด และหลายทีมให้ AI ติดป้ายมาก่อน"),
      host("ด่านนี้เธอเป็นหัวหน้าทีม AI ป้ายไหนผิด เธอต้องจับให้ได้", { mood: "wink" })
    ),
    item("queue-brief", "terminal", "AI ติดป้ายสัญญาณเตือนมาให้แล้ว 10 อัน มี 2 อันที่มันพลาด", {
      title: "ภารกิจ",
      facts: [SIM],
      badge: "simulated",
      simulated: true,
    }),
    {
      kind: "game",
      id: "queue",
      game: {
        engine: "SortGame",
        data: {
          layout: "queue",
          goalTh: "หาข้อที่ AI พลาด (มี 2 ข้อ)",
          bins: [
            { id: "agree", labelTh: "เห็นด้วยกับ AI" },
            { id: "miss", labelTh: "AI พลาด" },
          ],
          timer: { seconds: 90, labelTh: "ก่อนคนร้ายขยับต่อ" },
          simulated: { factId: SIM, watermarkTh: "ตัวอย่างจำลอง" },
          items: [
            {
              id: "a1",
              labelTh: "รหัสผ่านผิด 3 ครั้ง บัญชี somchai.k",
              meta: { time: "02:14", aiLabel: "เตือนหลอก", confidence: "97%" },
              detailTh: "ครั้งที่ 4 เข้าได้จากเครื่องประจำของเขาเอง",
              answer: "agree",
              revealTh: "พิมพ์ผิดธรรมดา AI ถูก",
            },
            {
              id: "a2",
              labelTh: "ล็อกอินสำเร็จจากต่างประเทศ บัญชี finance01",
              meta: { time: "02:31", aiLabel: "เตือนหลอก", confidence: "91%", aiNote: "ผู้ใช้เดินทางบ่อย" },
              detailTh:
                "4 นาทีก่อน มีคนรีเซ็ตรหัสผ่านบัญชีนี้ผ่าน SMS และเจ้าของบัญชีเพิ่งแตะบัตรเข้าออฟฟิศที่กรุงเทพฯ เมื่อ 10 นาทีก่อน",
              answer: "miss",
              revealTh:
                "บัญชีโดนยึดจริง AI ดูแค่ประวัติการเดินทาง แต่ไม่ได้ดูว่าเพิ่งมีคนรีเซ็ตรหัสผ่าน และเจ้าของยังอยู่ที่ออฟฟิศ",
              flags: ["@goal"],
            },
            {
              id: "a3",
              labelTh: "งานสำรองข้อมูลตามตาราง ส่งไฟล์ใหญ่ไปเซิร์ฟเวอร์สำรอง",
              meta: { time: "03:00", aiLabel: "เตือนหลอก", confidence: "95%" },
              detailTh: "ตรงกับตารางสำรองข้อมูลทุกคืน",
              answer: "agree",
              revealTh: "AI ถูก",
            },
            {
              id: "a4",
              labelTh: "อีเมลฟิชชิงถูกบล็อกก่อนถึงกล่องจดหมาย",
              meta: { time: "03:12", aiLabel: "บล็อกแล้ว ไม่ต้องทำอะไร", confidence: "99%" },
              detailTh: "ไม่มีใครเปิด ระบบจัดการแล้ว",
              answer: "agree",
              revealTh: "AI ถูก",
            },
            {
              id: "a5",
              labelTh: "สแกนพอร์ตทั้งเครือข่ายจาก 198.51.100.23",
              meta: { time: "08:45", aiLabel: "โจมตีจริง", confidence: "88%" },
              detailTh:
                "IP นี้อยู่ในเอกสารขอบเขตงานของบริษัททดสอบเจาะระบบที่เราจ้างเอง และอยู่ในช่วงเวลาที่ตกลงไว้",
              answer: "miss",
              revealTh: "เตือนหลอก AI ไม่รู้ว่าเราจ้างคนมาทดสอบระบบเอง ถ้าอ่านเอกสารขอบเขตงานเป็น จะรู้ทันที",
              flags: ["@goal"],
            },
            {
              id: "a6",
              labelTh: "เครื่องพิมพ์ชั้น 3 ส่งสัญญาณผิดปกติ",
              meta: { time: "09:10", aiLabel: "เตือนหลอก", confidence: "93%" },
              detailTh: "กระดาษติดซ้ำ",
              answer: "agree",
              revealTh: "AI ถูก",
            },
            {
              id: "a7",
              labelTh: "อัปเดตระบบล้มเหลว 2 เครื่อง",
              meta: { time: "09:30", aiLabel: "เตือนหลอก", confidence: "90%" },
              detailTh: "ระบบตั้งให้ลองใหม่คืนนี้",
              answer: "agree",
              revealTh: "AI ถูก แต่จดไว้ตามต่อพรุ่งนี้",
            },
            {
              id: "a8",
              labelTh: "พนักงานคลิกลิงก์ในอีเมลฟิชชิง",
              meta: { time: "10:05", aiLabel: "โจมตีจริง", confidence: "87%", aiNote: "ให้รีเซ็ตรหัสและสแกนเครื่อง" },
              detailTh: "บันทึกพบว่ากรอกรหัสผ่านลงหน้าเว็บปลอมก่อนถูกบล็อก",
              answer: "agree",
              revealTh: "AI ถูก ข้อนี้ต้องรีบ",
            },
            {
              id: "a9",
              labelTh: "ไฟร์วอลล์บล็อกการเชื่อมต่อจากนอกประเทศ 1,200 ครั้ง",
              meta: { time: "11:20", aiLabel: "บล็อกแล้ว ไม่ต้องทำอะไร", confidence: "92%" },
              detailTh: "สแกนทั่วไปจากอินเทอร์เน็ต ถูกบล็อกหมด",
              answer: "agree",
              revealTh: "AI ถูก",
            },
            {
              id: "a10",
              labelTh: "ผู้ใช้ขอรีเซ็ตรหัสผ่านผ่านฝ่ายไอที",
              meta: { time: "13:40", aiLabel: "เตือนหลอก", confidence: "96%" },
              detailTh: "ยืนยันตัวตนผ่านหัวหน้าแล้ว",
              answer: "agree",
              revealTh: "AI ถูก",
            },
          ],
          resultTh: "จับข้อที่ AI พลาดได้ {x}/{xTotal} · เห็นด้วยถูก {y}/{yTotal}",
          outcomesTh: {
            wrong: "ข้อนี้ AI ถูก: {reveal}",
            "hit:a2": "ข้อ 2 คือบัญชีโดนยึดจริง เธอเห็นสิ่งที่ AI มองข้าม",
            "miss:a2": "AI ถูก 8 จาก 10 ฟังดูดี แต่ข้อหนึ่งที่มันพลาดคือโดนจริง ลองกดข้อ 2 ดูอีกที",
          },
        },
      },
      track: { done: "triage:done", value: "score", milestones: { "item:a2": "triage:caught-takeover" } },
      answersTh: [
        "ข้อ 2 (02:31 ล็อกอินจากต่างประเทศ): AI พลาด บัญชีโดนยึดจริง เพิ่งมีคนรีเซ็ตรหัสผ่าน และเจ้าของยังอยู่ที่ออฟฟิศ",
        "ข้อ 5 (08:45 สแกนพอร์ต): AI พลาด เป็นบริษัททดสอบเจาะระบบที่เราจ้างเอง อยู่ในเอกสารขอบเขตงาน",
        "อีก 8 ข้อ AI ติดป้ายถูก",
      ],
      demoScript: [
        { at: 700, action: "tap", target: "queue.item-a1" },
        { at: 1500, action: "tap", target: "queue.item-a1-bin-agree" },
        { at: 2600, action: "tap", target: "queue.item-a2" },
        { at: 4200, action: "tap", target: "queue.item-a2-bin-miss" },
        { at: 6000, action: "wait" },
      ],
    },
    CLIP,
    beat(
      "beat-speed",
      "ทำไมต้องรีบ",
      item("stat-breakout", "stat", "CrowdStrike รายงานว่าปี 2568 ในเคสที่ติดตาม คนร้ายใช้เวลาเฉลี่ย 29 นาที ตั้งแต่เจาะเข้าได้จนขยับไปเครื่องอื่น", {
        title: "นาฬิกาคนร้าย",
        facts: ["f.crowdstrike"],
        badge: "vendor",
      }),
      item("stat-fastest", "stat", "เคสเร็วที่สุดที่เคยเห็นใช้แค่ 27 วินาที (เคสเดียว ไม่ใช่ปกติ)", {
        title: "สถิติเร็วสุด",
        facts: ["f.crowdstrike"],
        badge: "vendor",
      }),
      dialogue("bucket-intro", host("ฝั่งโอเพนซอร์สก็ติดคอขวดเดียวกัน ดูถังกับท่อนี้")),
      {
        kind: "bespoke",
        id: "bucket",
        component: "BucketPipe",
        factIds: [GAP],
        props: {
          titleTh: "เจอเร็ว แต่แก้ช้า",
          asOfTh: "ถึง 2 พ.ย. 2569 เท่าที่ Anthropic รู้",
          bucketLabelTh: "แจ้งแล้ว",
          bucket: 5087,
          pipeLabelTh: "แก้แล้วอย่างน้อย",
          pipe: 629,
          unitTh: "ตัว",
          ratioTh: "ราว 12%",
          ratioLabelTh: "เราคำนวณเอง",
          badgeTh: "ตัวเลขจากบริษัทเจ้าของเอง",
        },
        fallbackTh: [
          "ถึง 2 พ.ย. 2569 Anthropic แจ้งช่องโหว่ให้โปรเจกต์โอเพนซอร์สไปแล้ว 5,087 ตัว เท่าที่บริษัทรู้ แก้แล้วอย่างน้อย 629 ตัว (ราว 12% เราคำนวณเอง)",
        ],
      },
      item(
        "quote-bottleneck",
        "intel",
        "ความปลอดภัยของซอฟต์แวร์เคยติดที่ความเร็วในการหาช่องโหว่ ตอนนี้ติดที่ความเร็วในการตรวจ แจ้ง และแก้",
        { title: "Anthropic เขียนไว้เอง", facts: ["f.glasswing-bottleneck-quote"], badge: "vendor" }
      )
    ),
    dialogue(
      "bridge",
      host("ถ้าเคยสนใจห้องฉุกเฉิน งานนี้คล้ายกัน คือคัดว่าอะไรด่วนจริง"),
      host("แค่คนไข้คือระบบ", { mood: "wink" }),
      host("ข้อเสีย: เหตุด่วนไม่เลือกเวลา โดนตอนตีสามก็ต้องตื่น", { mood: "serious" })
    ),
  ],
  clip: {
    seconds: 25,
    hookTh: "เกมนี้ AI ติดป้ายผิด 2 ใน 10 เธอเจอไหม",
    scriptLinesTh: [
      "ถ้าเธอลังเลระหว่างหมอกับคอม ลองดูงานนี้",
      "หมอห้องฉุกเฉินต้องคัดว่าใครด่วนจริง",
      "คนสายไซเบอร์ก็คัดว่าสัญญาณไหนคือโดนจริง",
      "ต่างกันที่ตอนนี้ AI ติดป้ายมาให้ก่อน และบางทีมันก็ผิด",
      "งานของเราคือรู้ว่ามันผิดตรงไหน",
      "ลองเล่นเกมนี้ดู ถ้าสนุก นั่นคือเบาะแสสำคัญเกี่ยวกับตัวเธอ",
    ],
    required: false,
    safety: false,
    factIds: [SIM],
  },
  reel: {
    format: "founder",
    hook: { th: "งานไซเบอร์จริง คือจับผิด AI" },
    variantsTh: ["เกมจำลอง: AI ติดป้ายผิด 2 ใน 10 เธอหาเจอไหม", "AI ตอบถูก 8 จาก 10 แต่ข้อที่ผิดคือโดนแฮกจริง (เกมจำลอง)"],
    sendToFriendTh: "ส่งให้เพื่อนที่ยังลังเลระหว่างหมอกับคอม",
    visual: [
      "รายการสัญญาณเตือนเลื่อน AI ประทับป้ายทีละแถว แถวที่ 2 กลายเป็นสีแดงทีหลัง",
      "ถังที่เติมเร็วกว่าท่อที่ไหลออก",
    ],
  },
};
