/**
 * Level 2 · round1: the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts), with things a high-school student into
 * content could do, to sort into the TCASfolio bins. Faculties checked in the
 * mytcas course feed on 2026-11-20 (นิเทศศาสตร์, วารสารศาสตร์, สื่อสารมวลชน).
 * course.mytcas.com has no search URL (search runs on its home page), so the
 * link opens the home page, as in the other careers.
 */
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-20",
  careerTh: "สายคอนเทนต์",
  facultiesTh: "นิเทศศาสตร์ วารสารศาสตร์ สื่อสารมวลชน",
  mytcasHref: "https://course.mytcas.com",
  items: [
    {
      id: "series",
      labelTh: "ทำคลิปสั้นชุดหนึ่ง เล่าเรื่องที่รู้ดี พร้อมโน้ตว่าแต่ละคลิปคนดูหลุดตรงไหน แล้วแก้ยังไง",
      answer: "project",
      revealTh: "โครงงาน: เธอวางแผน ถ่าย อ่านผล แล้วแก้เอง ครบทั้งวงจรงานจริง",
    },
    {
      id: "school-page",
      labelTh: "ช่วยดูแลเพจชุมนุมหรือเพจงานโรงเรียน วางแผนโพสต์ แล้วสรุปว่าโพสต์ไหนคนสนใจ",
      answer: "project",
      revealTh: "โครงงาน: มีคนดูจริง มีผลจริง เขียนสรุปว่าได้เรียนรู้อะไรด้วยนะ",
    },
    {
      id: "club",
      labelTh: "เข้าชุมนุมสื่อหรือชมรมถ่ายภาพของโรงเรียน",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าด้วยว่าในชุมนุมเธอลงมือทำอะไร ไม่ใช่แค่ไปนั่งฟังเฉยๆ",
    },
    {
      id: "event",
      labelTh: "เป็นทีมถ่ายคลิปงานกีฬาสีหรืองานวันเปิดบ้านของโรงเรียน",
      answer: "activity",
      revealTh: "กิจกรรม: ทำงานกับทีม ทำตามบรีฟ ส่งงานทันเวลา นี่แหละสิ่งที่งานจริงต้องการ",
    },
    {
      id: "contest",
      labelTh: "เกียรติบัตรจากเวทีประกวดหนังสั้นหรือคลิปสั้น",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล: ใส่ได้นะ แต่ตัวคลิปที่ส่งประกวดสำคัญกว่าใบเกียรติบัตรเยอะ",
    },
  ],
});
