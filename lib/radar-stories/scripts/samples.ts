/**
 * Two sample story reels the renderer was built against: one `lost`, one
 * `round1`. Ids end in 00 so they never collide with the writers' scripts.
 * TCAS facts come from lib/radar-guides/_shared/facts.ts (f.tcas70-rounds,
 * f.tcasfolio).
 */
import type { StoryScript } from "../types";

const scripts: StoryScript[] = [
  {
    id: "lost-00-midnight",
    series: "lost",
    titleTh: "ตีสองแล้ว ยังไม่รู้จะเลือกคณะอะไร",
    hookTh: "ตีสองแล้ว ยังไม่รู้จะเลือกคณะอะไร",
    hookVariantsTh: ["เพื่อนเลือกคณะกันหมดแล้ว เหลือฉัน", "ไม่รู้ว่าชอบอะไร ผิดไหม"],
    beats: [
      { who: "student", scene: "bedroom-night", lineTh: "เพื่อนในกลุ่มเลือกคณะกันได้หมดแล้ว" },
      { who: "student", scene: "phone-feed", lineTh: "ไถดูรีวิวคณะมาทั้งคืน ยิ่งดูยิ่งงง" },
      { who: "text", scene: "phone-feed", lineTh: "ทุกคนดูรู้หมด ยกเว้นฉัน", big: true },
      { who: "host", mood: "talk", scene: "bedroom-night", lineTh: "ไม่รู้ว่าชอบอะไร ไม่ได้แปลว่าเธอช้านะ" },
      { who: "student", scene: "bedroom-night", lineTh: "แต่จะรู้ได้ไงว่าชอบ ถ้ายังไม่เคยลองเลย" },
      { who: "host", mood: "wow", scene: "bedroom-night", lineTh: "นั่นแหละ ลองทำงานจริงดูสักชิ้นก่อน" },
      { who: "host", mood: "talk", scene: "radar", lineTh: "เลือกอาชีพที่สงสัย แล้วเล่นเป็นด่าน ๆ ได้เลยคืนนี้" },
      { who: "student", scene: "radar", lineTh: "ลองของจริงคืนเดียว ได้มากกว่าไถรีวิวทั้งคืน", big: true },
    ],
    endCardTh: "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้",
    sendToFriendTh: "ส่งให้เพื่อนที่ยังไม่รู้จะเลือกคณะอะไร",
    captionIgTh:
      "ตีสองแล้ว ยังไม่รู้จะเลือกคณะอะไร\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ยังไม่รู้จะเลือกคณะอะไร\n\n#CareerRadar #เลือกคณะ #TCAS #ค้นหาตัวเอง",
    captionTtTh: "ตีสองแล้ว ยังไม่รู้จะเลือกคณะอะไร\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
    factRefs: [],
  },
  {
    id: "round1-00-portfolio",
    series: "round1",
    titleTh: "พอร์ตรอบ 1 ไม่ได้มีแค่รางวัล",
    hookTh: "รอบ 1 เขาดูอะไรนอกจากเกรด",
    hookVariantsTh: ["ไม่มีรางวัล ทำพอร์ตได้ไหม", "TCAS มีกี่รอบ รู้ยัง"],
    beats: [
      { who: "friend", scene: "school-gate", lineTh: "เธอจะยื่นรอบ 1 ไหม ทำพอร์ตยัง" },
      { who: "student", scene: "school-gate", lineTh: "พอร์ตเหรอ ฉันไม่มีรางวัลอะไรเลยนะ" },
      { who: "host", mood: "wow", scene: "school-gate", lineTh: "เดี๋ยวก่อน พอร์ตไม่ได้มีแค่รางวัลนะ" },
      { who: "host", mood: "talk", scene: "classroom", lineTh: "TCAS70 มี 4 รอบ รอบ 1 คือ Portfolio" },
      { who: "host", mood: "talk", scene: "classroom", lineTh: "TCASfolio ทำได้สูงสุด 40 รายการ มีทั้งโครงงานและกิจกรรม" },
      { who: "host", mood: "serious", scene: "classroom", lineTh: "แต่ละมหาลัยเปิดรับรอบ 1 ไม่พร้อมกัน เช็กที่ mytcas" },
      { who: "student", scene: "classroom", lineTh: "งั้นงานที่ฉันลองทำเอง ก็เล่าเป็นโครงงานได้เหรอ" },
      { who: "host", mood: "wink", scene: "radar", lineTh: "ใช่ งานจริงที่เธอลงมือทำเอง เล่าได้ทั้งนั้น" },
      { who: "text", scene: "radar", lineTh: "ชิ้นแรก เริ่มได้คืนนี้", big: true },
    ],
    endCardTh: "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้",
    sendToFriendTh: "ส่งให้เพื่อนที่คิดว่าพอร์ตต้องมีรางวัล",
    captionIgTh:
      "รอบ 1 เขาดูอะไรนอกจากเกรด\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่คิดว่าพอร์ตต้องมีรางวัล\n\n#CareerRadar #เลือกคณะ #TCAS #TCAS70 #พอร์ตรอบ1",
    captionTtTh: "รอบ 1 เขาดูอะไรนอกจากเกรด\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
    factRefs: [
      {
        claim:
          "TCAS70 has 4 rounds: round 1 Portfolio, 2 Quota, 3 Admission, 4 Direct Admission. Each university sets its own round 1 application dates (from 15 Aug 2026 on), so closing dates differ by university and programme.",
        source: "mytcas (ทปอ.), TCAS70 timeline, updated 16/11/2026",
        url: "https://www.mytcas.com/",
      },
      {
        claim:
          "TCASfolio, the portfolio system ทปอ. introduced for TCAS70: a student can make up to 40 items, including an essay, projects (โครงการ/โครงงาน), activities, certificates or awards.",
        source: "PPTV, 8 Jul 2026",
        url: "https://www.pptvhd36.com/news/%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1/279213",
      },
    ],
  },
];

export default scripts;
