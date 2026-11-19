/**
 * Level 2 · round1: the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts), with things a high-school student into
 * accounting could do, to sort into the TCASfolio bins. The bridge adds how
 * many accounting programmes the TCAS70 feed lists.
 */
import { roundOnePage } from "../../_shared/round1";
import { host, sys } from "../../_shared/story";

const PROGRAMMES = "f.acc-tcas-programmes" as const;

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-20",
  careerTh: "สายบัญชี",
  facultiesTh: "บัญชี บริหารธุรกิจ",
  mytcasHref: "https://course.mytcas.com",
  extraFactIds: [PROGRAMMES],
  items: [
    {
      id: "club-books",
      labelTh: "ทำบัญชีรายรับรายจ่ายของชุมนุม แล้วสรุปให้ทุกคนดูท้ายเทอม",
      answer: "project",
      revealTh: "โครงงาน: ตารางกับสรุปที่เธอทำเอง คือหลักฐานว่าเธอทำบัญชีเป็นจริง",
    },
    {
      id: "fair-cost",
      labelTh: "คิดต้นทุนร้านในงานโรงเรียน ว่าต้องขายแก้วละเท่าไหร่ถึงไม่ขาดทุน",
      answer: "project",
      revealTh: "โครงงาน: ตั้งคำถามจริง แล้วตอบด้วยตัวเลข นี่แหละงานบัญชีที่ช่วยร้านตัดสินใจ",
    },
    {
      id: "treasurer",
      labelTh: "เป็นเหรัญญิกสภานักเรียน หรือเหรัญญิกชุมนุม",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าด้วยว่าเธอดูแลเงินยังไง ให้ทุกคนตรวจดูได้",
    },
    {
      id: "camp",
      labelTh: "ไปค่ายบัญชีที่มหาลัยจัดให้นักเรียน ม.ปลาย",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าว่าในค่ายเธอลงมือทำอะไร ไม่ใช่แค่ไปนั่งฟังเฉยๆ",
    },
    {
      id: "contest",
      labelTh: "เกียรติบัตรจากการแข่งตอบปัญหาบัญชี",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล: ใส่ได้นะ แต่สิ่งที่เธอลงมือทำเองสำคัญกว่าใบเกียรติบัตรเยอะ",
    },
  ],
  bridge: [
    sys("ผลงานชิ้นแรกไม่ต้องใหญ่โตเลย"),
    host("ใน mytcas ปีนี้ มีหลักสูตรที่ชื่อมีคำว่าบัญชี 94 หลักสูตร ใน 56 มหาลัย", { facts: [PROGRAMMES], mood: "wow" }),
    host("อยากรู้เรื่องเงินเดือนกับที่เรียนต่อใช่ไหม"),
    host("กด แผนที่ด่าน ข้างล่าง ไปดูข้อมูลเต็มของสายนี้ได้เลย"),
  ],
});
