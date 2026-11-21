/**
 * Level 2 · round1, just before tcas (where to apply). The shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts) with cybersecurity examples to sort
 * into the TCASfolio bins. Every example is legal: practice rooms, the
 * student's own home network with a parent's OK, and a real competition.
 */
import { host, sys } from "../../_shared/story";
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 10,
  asOf: "2026-11-17",
  careerTh: "สายไซเบอร์",
  facultiesTh: "ไซเบอร์ วิศวะคอม วิทย์คอม",
  mytcasHref: "https://course.mytcas.com",
  extraFactIds: ["f.tctt", "f.thm-free"],
  bridge: [sys("ผลงานชิ้นแรกไม่ต้องใหญ่โตเลย"), host("ด่านต่อไป มาดูกันว่าที่ไหนเปิดรับสายไซเบอร์บ้าง", { mood: "wow" })],
  items: [
    {
      id: "writeup",
      labelTh: "write-up จากห้องฝึก TryHackMe ที่ทำจบเอง",
      answer: "project",
      revealTh: "ลงมือเองแล้วเล่าได้ว่าทำอะไรไป นี่แหละโครงงาน",
    },
    {
      id: "router",
      labelTh: "เช็กรหัสเราเตอร์ที่บ้าน (ขอผู้ปกครองก่อนนะ) แล้วเขียนวิธีแก้ให้ที่บ้าน",
      answer: "project",
      revealTh: "เจอปัญหาจริง แก้ให้คนจริง บนเครื่องบ้านตัวเอง นับเป็นโครงงานได้เต็มปาก",
    },
    {
      id: "tctt",
      labelTh: "ลงแข่ง Thailand Cyber Top Talent รุ่น Junior กับเพื่อน",
      answer: "activity",
      revealTh: "แค่ลงแข่งนับเป็นกิจกรรม ถ้าคว้ารางวัลค่อยย้ายไปช่องรางวัล",
    },
    {
      id: "cert",
      labelTh: "เกียรติบัตรจากงานแข่งตอบปัญหาไซเบอร์",
      answer: "award",
      revealTh: "เกียรติบัตรใส่ได้นะ แต่ถ้าเล่าได้ว่าเรียนรู้อะไรจากมัน จะยิ่งมีน้ำหนัก",
    },
  ],
});
