/**
 * Level 3 · round1: the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts), with things a high-school student into
 * AI could do, to sort into the TCASfolio bins.
 */
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-18",
  careerTh: "สาย AI",
  facultiesTh: "วิศวะคอม วิทย์คอม และหลักสูตร AI",
  mytcasHref: "https://course.mytcas.com",
  items: [
    {
      id: "sorter",
      labelTh: "สอนโมเดลแยกขยะในโรงเรียน แล้วจดไว้ว่ามันพลาดตรงไหนบ้าง",
      answer: "project",
      revealTh: "โครงงาน: เธอสร้างเอง พร้อมตารางผลสอบที่เปิดให้คนอื่นดูได้",
    },
    {
      id: "dialect",
      labelTh: "รวมชุดคำถามภาษาถิ่นบ้านเธอเอง เอาไว้ทดสอบว่า AI เข้าใจไหม",
      answer: "project",
      revealTh: "โครงงาน: ชุดสอบ AI ที่เธอทำเอง นี่แหละหลักฐานว่าเธอวัดผลเป็น",
    },
    {
      id: "club",
      labelTh: "เข้าชุมนุมคอมพิวเตอร์ หรือลองไปค่าย AI ของโรงเรียน",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าด้วยว่าในค่ายเธอลงมือทำอะไร ไม่ใช่แค่ไปนั่งฟังเฉยๆ",
    },
    {
      id: "teach",
      labelTh: "สอนรุ่นน้อง ม.ต้น ใช้ Teachable Machine ในชุมนุม",
      answer: "activity",
      revealTh: "กิจกรรม: สอนคนอื่นได้ แปลว่าเธอเข้าใจจริง",
    },
    {
      id: "contest",
      labelTh: "เกียรติบัตรจากเวทีแข่งโครงงานคอมพิวเตอร์",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล: ใส่ได้นะ แต่ตัวโครงงานที่ส่งแข่งสำคัญกว่าใบเกียรติบัตรเยอะ",
    },
  ],
});
