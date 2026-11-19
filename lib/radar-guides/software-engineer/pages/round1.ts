/**
 * Level 3 · round1, the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts) with coding examples to sort.
 */
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-18",
  careerTh: "สายโค้ด",
  facultiesTh: "วิศวะคอม วิทย์คอม",
  mytcasHref: "https://course.mytcas.com",
  items: [
    {
      id: "timetable-site",
      labelTh: "ทำเว็บตารางสอบให้ห้อง แล้วเพื่อนใช้จริง",
      answer: "project",
      revealTh: "โครงงาน เธอสร้างเอง และมีคนใช้จริง ยิ่งเล่าได้ว่าแก้อะไรตามที่เพื่อนบอก ยิ่งดี",
    },
    {
      id: "class-fund",
      labelTh: "เขียนโปรแกรมเล็กๆ ช่วยเหรัญญิกห้องเก็บเงิน",
      answer: "project",
      revealTh: "โครงงาน ของเล็กแต่แก้ปัญหาจริง กรรมการอยากเห็นแบบนี้",
    },
    {
      id: "club-teach",
      labelTh: "สอนรุ่นน้องในชมรมคอมพิวเตอร์เขียนโค้ด",
      answer: "activity",
      revealTh: "กิจกรรม บอกว่าเธอทำงานกับคนอื่นเป็น และอธิบายเรื่องยากให้เข้าใจได้",
    },
    {
      id: "coding-camp",
      labelTh: "เข้าค่ายเขียนโปรแกรมช่วงปิดเทอม",
      answer: "activity",
      revealTh: "กิจกรรม ใส่ได้ แต่จะเด่นกว่าถ้ามีของที่ทำเสร็จจากค่ายติดมาด้วย",
    },
    {
      id: "hackathon-award",
      labelTh: "รางวัลจากงานแข่งเขียนโปรแกรมระดับโรงเรียน",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล ใส่ได้เลย แต่ไม่ต้องรอรางวัลถึงจะเริ่มเก็บแฟ้ม",
    },
  ],
});
