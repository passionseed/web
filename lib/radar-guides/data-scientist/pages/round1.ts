/**
 * Level 1 · round1: the shared "TCAS round 1 is for you" level, with things a
 * student into data could do in high school. No digits in the items: this
 * page cites only the shared TCAS facts.
 */
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 3,
  asOf: "2026-11-18",
  careerTh: "สายข้อมูล",
  facultiesTh: "สถิติ วิทยาการข้อมูล วิทย์คอม",
  mytcasHref: "https://course.mytcas.com",
  items: [
    {
      id: "dust-map",
      labelTh: "ทำกราฟค่าฝุ่นจังหวัดตัวเอง จากข้อมูลเปิดของรัฐ แล้วเขียนเล่าว่าเจออะไร",
      answer: "project",
      revealTh: "โครงงาน เธอตั้งคำถามเอง หาข้อมูลเอง สรุปเอง ครบทุกขั้นตอน",
    },
    {
      id: "canteen",
      labelTh: "เก็บข้อมูลว่าโรงอาหารขายเมนูไหนหมดก่อน แล้วลองเสนอวิธีลดของเหลือ",
      answer: "project",
      revealTh: "โครงงาน ยิ่งมีคนเอาผลไปใช้ต่อได้จริง ยิ่งดีเลย",
    },
    {
      id: "camp",
      labelTh: "ไปเข้าค่ายวิทยาการข้อมูลของมหาวิทยาลัย",
      answer: "activity",
      revealTh: "กิจกรรม ถ้าในค่ายมีชิ้นงานออกมา อย่าลืมเก็บไว้ด้วยนะ",
    },
    {
      id: "science-day",
      labelTh: "เป็นทีมทำแบบสอบถามงานวันวิทยาศาสตร์ของโรงเรียน",
      answer: "activity",
      revealTh: "กิจกรรม ถ้าเธอช่วยสรุปผลแบบสอบถามด้วย ก็เล่าต่อเป็นโครงงานได้เลย",
    },
    {
      id: "math-award",
      labelTh: "เกียรติบัตรจากการแข่งคณิตศาสตร์หรือสถิติ",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล ช่วยยืนยันว่าเธอสนใจด้านนี้จริงๆ",
    },
  ],
});
