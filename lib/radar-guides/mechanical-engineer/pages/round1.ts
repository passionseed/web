/**
 * Level 2 · round1: the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts), with things a high-school student into
 * machines could do, to sort into the TCASfolio bins. The faculty names are
 * mytcas field names (f.me-mytcas-fields); course.mytcas.com has no search
 * URL, so the link opens its home page, where the student searches.
 */
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-20",
  careerTh: "สายเครื่องกล",
  facultiesTh: "วิศวะเครื่องกล ยานยนต์ หุ่นยนต์ เมคคาทรอนิกส์",
  mytcasHref: "https://course.mytcas.com",
  extraFactIds: ["f.me-mytcas-fields"],
  items: [
    {
      id: "pen",
      labelTh: "แกะปากกากด วาดกลไก แล้วออกแบบให้กดได้นุ่มขึ้น พร้อมผลทดสอบ",
      answer: "project",
      revealTh: "โครงงาน: เธอแกะเอง วาดเอง ทดสอบเอง ครบทุกขั้นแบบวิศวกร",
    },
    {
      id: "bottle-car",
      labelTh: "สร้างรถจากขวดพลาสติก ปรับล้อทีละอย่าง แล้วจดว่าวิ่งไกลขึ้นแค่ไหน",
      answer: "project",
      revealTh: "โครงงาน: ตารางที่จดไว้ทุกรอบ คือหลักฐานว่าเธอทดสอบเป็น",
    },
    {
      id: "club",
      labelTh: "เข้าชุมนุมหุ่นยนต์ หรือช่วยซ่อมจักรยานของเพื่อนในชุมนุม",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าด้วยว่าเธอลงมือทำส่วนไหน ไม่ใช่แค่ไปนั่งดู",
    },
    {
      id: "camp",
      labelTh: "ไปค่ายวิศวะที่มหาลัยเปิดให้นักเรียน ม.ปลาย",
      answer: "activity",
      revealTh: "กิจกรรม: ใส่ได้ แต่ของที่เธอสร้างในค่ายสำคัญกว่าใบที่ได้กลับมา",
    },
    {
      id: "contest",
      labelTh: "เกียรติบัตรจากเวทีแข่งหุ่นยนต์ หรือแข่งรถประหยัดพลังงาน",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล: ใส่ได้นะ แต่ตัวผลงานที่ส่งแข่งสำคัญกว่าใบเกียรติบัตรเยอะ",
    },
  ],
});
