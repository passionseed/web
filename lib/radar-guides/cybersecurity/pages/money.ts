/**
 * Level 6 · money. Design: docs/radar-guide/cybersecurity-guide.md, Page 6.
 * Guess the median, then reveal on a Thai axis. The ceiling sits after an
 * axis break (different source); US numbers stay on their own card.
 * The mid-run share card follows this level (meta.shareCardAfter).
 */
import type { GuidePage } from "@/lib/radar-guide/guide-types";
import { CLIP, dialogue, host, item } from "./_story";

const JOBSDB = "f.jobsdb-security" as const;
const ADECCO = "f.adecco" as const;

export const money: GuidePage = {
  key: "money",
  order: 6,
  titleTh: "เงินเดือนจริงในไทย",
  questionTh: "ทำสายนี้ในไทย ได้เท่าไหร่ ตั้งแต่เริ่มจนเก๋า",
  navLabelTh: "เงินเดือน",
  asOf: "2026-11-11",
  minutes: 1,
  legacyHashes: ["money"],
  factIds: [JOBSDB, "f.jobsdb-entry", ADECCO, "f.bls-infosec", "f.sans-titles"],
  og: {
    headlineTh: "เงินเดือนสายไซเบอร์ในไทย ของจริง",
    stat: { th: "ค่ากลาง 35,500 เพดาน 250,000", factIds: [JOBSDB, ADECCO] },
  },
  blocks: [
    dialogue(
      "intro",
      host("ด่านนี้เดาก่อน แล้วค่อยดูของจริง"),
      host("ลากหรือกดปุ่ม ล็อกคำตอบแล้วห้ามแก้นะ", { mood: "wink" })
    ),
    {
      kind: "game",
      id: "guess",
      game: {
        engine: "GuessReveal",
        data: {
          promptTh: "ลองทายค่ากลางเงินเดือนในประกาศงาน Security Engineer ในไทย (บาทต่อเดือน)",
          min: 15000,
          max: 100000,
          step: 500,
          unit: "baht",
          answer: 35500,
          answerFactId: JOBSDB,
          buckets: [30000, 40000, 60000, 100001],
          chart: {
            kind: "axis",
            markers: [
              { labelTh: "10% ล่าง", value: 27000 },
              { labelTh: "25% ล่าง", value: 33000 },
              { labelTh: "ค่ากลาง", value: 35500, strong: true },
              { labelTh: "25% บน", value: 39000 },
              { labelTh: "10% บน", value: 45000 },
            ],
            shade: { from: 33000, to: 39000 },
            gapLabelTh: "ช่วงกลางอาชีพ: ไม่มีข้อมูลที่ตรวจสอบได้ เราเลยไม่เดาเอง",
          },
          nearTh: "เกือบเป๊ะ",
          overTh: "เธอเดาสูงไป {d} บาท",
          underTh: "เธอเดาต่ำไป {d} บาท",
          nearWithin: 1000,
          revealTh: "ค่ากลางในประกาศงานคือ 35,500 บาทต่อเดือน",
        },
      },
      track: { done: "money:guess", value: "bucket" },
      answersTh: [
        "ค่ากลางในประกาศงาน Security Engineer บน JobsDB คือ 35,500 บาทต่อเดือน",
        "ประกาศช่วงกลางๆ อยู่ระหว่าง 33,000 ถึง 39,000 บาท รวมทุกระดับประสบการณ์",
      ],
      demoScript: [
        { at: 600, action: "tap", target: "guess.plus" },
        { at: 900, action: "tap", target: "guess.plus" },
        { at: 1800, action: "tap", target: "guess.lock" },
        { at: 5000, action: "wait" },
      ],
    },
    item(
      "stat-median",
      "stat",
      "ค่ากลางในประกาศงาน Security Engineer บน JobsDB คือ 35,500 บาทต่อเดือน ครึ่งกลางของประกาศอยู่ระหว่าง 33,000 ถึง 39,000 บาท",
      { title: "ค่ากลาง", facts: [JOBSDB], badge: "confirmed" }
    ),
    dialogue("median-note", host("นี่รวมทุกระดับประสบการณ์ ไม่ใช่เงินเดือนแรกของทุกคน", { mood: "serious" })),
    item("stat-entry", "stat", "ประกาศระดับเริ่มต้นอยู่ราว 25,000 ถึง 35,000 บาท เงินเดือนแรกอาจไม่หวือหวา", {
      title: "ด่านแรก",
      facts: ["f.jobsdb-entry"],
      badge: "pending",
    }),
    CLIP,
    item(
      "intel-ceiling",
      "intel",
      "คู่มือเงินเดือน Adecco ปี 2569 บอกว่า IT Security ระดับอาวุโส 7 ปีขึ้นไป สูงสุดราว 250,000 แต่ตัวเลขนี้ค่อนไปทางบริษัทข้ามชาติ",
      { title: "เพดาน (คนละแหล่งข้อมูล)", facts: [ADECCO] }
    ),
    item(
      "intel-switch",
      "intel",
      "Adecco บอกว่าคนย้ายงานสายไซเบอร์ ข้อมูล และ AI ขอขึ้นเงินเดือนราว 20 ถึง 25% ส่วนพนักงานทั่วไปปรับขึ้นปีละราว 2 ถึง 5%",
      { title: "ตอนย้ายงาน", facts: [ADECCO] }
    ),
    item(
      "intel-us",
      "intel",
      "ค่ากลาง Information Security Analyst ในสหรัฐฯ ปีละ $129,180 ตำแหน่งใหม่อย่าง AI/ML security engineer ค่ากลางในประกาศ $140,000 คนละประเทศ คนละค่าครองชีพ อย่าเอามาเทียบตรงๆ",
      { title: "ตัวเลขสหรัฐฯ (ไม่ใช่ของไทย)", facts: ["f.bls-infosec", "f.sans-titles"], labels: ["usOnly"] }
    ),
    dialogue(
      "exit",
      host("จุดเริ่มไม่หวือหวา แต่ทางขึ้นชัน"),
      host("ที่ช่วยให้ไต่ขึ้นได้ คือผลงานที่พิสูจน์ว่าทำได้จริง", { mood: "serious" }),
      host("ซึ่งเริ่มเก็บได้ตั้งแต่ ม.ปลาย", { mood: "wink" })
    ),
  ],
  clip: {
    seconds: 25,
    hookTh: "เงินเดือนไซเบอร์ไทย ของจริง",
    scriptLinesTh: [
      "ตัวเลขเงินเดือนไซเบอร์ที่เห็นในคลิป บางตัวเป็นของอเมริกา",
      "ของไทย ไปดูประกาศงาน Security Engineer บน JobsDB",
      "ตัวเลขกลางๆ อยู่ที่เดือนละ 35,500 บาท",
      "อันนี้รวมทุกระดับนะ ไม่ใช่เงินเดือนแรก",
      "ส่วนตัวเลขสูงสุด คู่มือเงินเดือนของ Adecco บอกว่า",
      "ระดับอาวุโส 7 ปีขึ้นไป สูงสุดราว 250,000 บาท",
      "แต่ตัวเลขนี้ค่อนไปทางบริษัทข้ามชาตินะ",
      "จุดเริ่มไม่หวือหวา แต่ทางขึ้นชันสำหรับคนที่พิสูจน์ฝีมือได้",
    ],
    required: false,
    safety: false,
    factIds: [JOBSDB, ADECCO],
  },
  reel: {
    format: "founder",
    hook: { th: "สายไซเบอร์ในไทย ค่ากลาง 35,500 เพดาน 250,000", factIds: [JOBSDB, ADECCO] },
    variantsTh: ["เดาดู เงินเดือนสายไซเบอร์ในไทยเท่าไหร่", "ตัวเลขเงินเดือนไซเบอร์ในคลิป อาจไม่ใช่ตัวเลขไทย"],
    sendToFriendTh: "ส่งให้เพื่อนที่คิดว่าสายนี้รวยตั้งแต่วันแรก",
    visual: [
      "หมุดตกลงที่ 35,500 ในแถบที่แรเงา",
      "แกนหักแบบซิกแซก",
      "แท่งสูงแยกของเพดาน 250,000 พร้อมคำอธิบาย",
    ],
  },
};
