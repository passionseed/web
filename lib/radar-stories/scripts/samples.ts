/**
 * Two sample story reels the renderer was built against: one `lost`, one
 * `round1`. Ids end in 00 so they never collide with the writers' scripts.
 * TCAS facts come from lib/radar-guides/_shared/facts.ts (f.tcas70-rounds,
 * f.tcasfolio). Thai lines put a space between short phrases: the renderer
 * breaks lines only there. round1-00 carries the "4 rounds" and "40 items"
 * facts; the launch round1 reels each carry a different one.
 */
import type { StoryScript } from "../types";

const scripts: StoryScript[] = [
  {
    id: "lost-00-midnight",
    series: "lost",
    titleTh: "ตีสองแล้ว ยังไม่รู้จะเลือกคณะอะไร",
    hookTh: "ตีสองแล้ว ยังไม่รู้ จะเลือกคณะอะไร",
    hookVariantsTh: ["เพื่อนเลือกคณะ กันหมดแล้ว เหลือฉัน", "ไม่รู้ว่าชอบอะไร ผิดไหม"],
    beats: [
      { who: "friend", lineTh: "ทั้งกลุ่ม เลือกคณะกันหมดแล้ว เหลือแค่แกเหรอ?", stressTh: "เหลือแค่แก", scene: "phone-feed" },
      { who: "student", scene: "phone-feed", lineTh: "ไถดูรีวิวคณะ มาทั้งคืน ยิ่งดูยิ่งงง", stressTh: "ยิ่งดูยิ่งงง" },
      { who: "text", lineTh: "ยิ่งไถ ยิ่งรู้สึก ช้ากว่าคนอื่น", stressTh: "ช้ากว่าคนอื่น", scene: "phone-feed", big: true },
      { who: "host", mood: "talk", scene: "bedroom-night", lineTh: "ไม่รู้ว่าชอบอะไร ไม่ได้แปลว่า เธอช้านะ", stressTh: "ไม่ได้แปลว่า" },
      { who: "student", scene: "bedroom-night", lineTh: "แต่จะรู้ได้ไง ว่าชอบ ถ้ายังไม่เคยลองเลย", stressTh: "ถ้ายังไม่เคยลอง" },
      { who: "host", mood: "wow", scene: "bedroom-night", lineTh: "นั่นแหละ ลองทำงานจริง ดูสักชิ้นก่อน", stressTh: "ลองทำงานจริง" },
      { who: "host", mood: "talk", scene: "radar", lineTh: "เลือกอาชีพที่อยากรู้ แล้วลองทีละด่าน ได้เลยคืนนี้", stressTh: "ทีละด่าน" },
      { who: "student", scene: "radar", lineTh: "ลองของจริง คืนเดียว ได้มากกว่า ไถรีวิวทั้งคืน", stressTh: "ลองของจริง", big: true },
    ],
    endCardTh: "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้",
    sendToFriendTh: "ส่งให้เพื่อนที่ยังเลือกคณะไม่ได้",
    captionIgTh:
      "ตีสองแล้ว ยังไม่รู้ จะเลือกคณะอะไร\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ยังเลือกคณะไม่ได้\n\n#CareerRadar #เลือกคณะ #TCAS #ค้นหาตัวเอง",
    captionTtTh: "ตีสองแล้ว ยังไม่รู้ จะเลือกคณะอะไร\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
    factRefs: [
      {
        claim:
          "หน้าไซเบอร์ซีเคียวริตี้ใน Career Radar ให้ลองเล่นทีละด่าน (11 ด่าน) มีด่านลองเป็นนักป้องกันในเครื่องจำลอง และด่านภารกิจคืนนี้",
        source: "Career Radar (passionseed.org) เปิดดู 20 พ.ย. 2569",
        url: "https://www.passionseed.org/radar/cybersecurity",
      },
    ],
  },
  {
    id: "round1-00-portfolio",
    series: "round1",
    titleTh: "พอร์ตรอบ 1 ไม่ได้มีแค่รางวัล",
    hookTh: "รอบ 1 เขาดูอะไร นอกจากเกรด",
    hookVariantsTh: ["ไม่มีรางวัล ทำพอร์ตได้ไหม", "TCAS มีกี่รอบ รู้ยัง"],
    beats: [
      { who: "friend", scene: "school-gate", lineTh: "เธอจะยื่นรอบ 1 ไหม ทำพอร์ตยัง", stressTh: "ทำพอร์ตยัง" },
      { who: "student", scene: "school-gate", lineTh: "พอร์ตเหรอ ฉันไม่มีรางวัล อะไรเลยนะ", stressTh: "ไม่มีรางวัล" },
      { who: "host", mood: "wow", scene: "school-gate", lineTh: "เดี๋ยวก่อน พอร์ตไม่ได้มี แค่รางวัลนะ", stressTh: "แค่รางวัล" },
      { who: "text", scene: "classroom", lineTh: "TCAS70 มี 4 รอบ รอบ 1 คือ Portfolio", stressTh: "Portfolio", big: true },
      { who: "host", mood: "talk", scene: "classroom", lineTh: "TCASfolio ให้ทำแฟ้ม ได้สูงสุด 40 รายการ", stressTh: "40 รายการ" },
      { who: "student", scene: "classroom", lineTh: "ตั้ง 40 รายการ งั้นงานที่ลองทำเอง ก็ใส่ได้เหรอ", stressTh: "ลองทำเอง" },
      { who: "host", mood: "wink", scene: "radar", lineTh: "ใช่ งานจริง ที่เธอลงมือทำเอง ใส่ได้ ถ้าตรงเกณฑ์คณะ", stressTh: "งานจริง" },
      { who: "text", scene: "radar", lineTh: "ชิ้นแรก เริ่มได้คืนนี้", stressTh: "คืนนี้", big: true },
    ],
    endCardTh: "คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้",
    sendToFriendTh: "ส่งให้เพื่อนที่ยังไม่มีรางวัลเลย",
    captionIgTh:
      "รอบ 1 เขาดูอะไร นอกจากเกรด\nอยากได้ข้อมูลเต็ม คอมเมนต์ RADAR เดี๋ยวส่งลิงก์ให้ทาง DM\nส่งให้เพื่อนที่ยังไม่มีรางวัลเลย\n\n#CareerRadar #เลือกคณะ #TCAS #TCAS70 #พอร์ตรอบ1",
    captionTtTh: "รอบ 1 เขาดูอะไร นอกจากเกรด\nข้อมูลเต็ม พิมพ์ passionseed.org/radar",
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
