/**
 * Level 2 · round1: the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts), with things a high-school student into
 * lab work could do, to sort into the TCASfolio bins. The bridge adds how
 * many medical technology programmes on mytcas list a round 1 (f.mt-mytcas).
 *
 * mytcas has no search URL, so the link opens course.mytcas.com, where the
 * student types เทคนิคการแพทย์ into the search box.
 */
import { roundOnePage } from "../../_shared/round1";
import { host, sys } from "../../_shared/story";

const MYTCAS = "f.mt-mytcas" as const;

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-20",
  careerTh: "สายแล็บ",
  facultiesTh: "เทคนิคการแพทย์ สหเวชศาสตร์",
  mytcasHref: "https://course.mytcas.com",
  extraFactIds: [MYTCAS],
  items: [
    {
      id: "scope",
      labelTh: "ส่องเกลือกับน้ำตาลด้วยเลนส์หยดน้ำ แล้วเขียนบันทึกแล็บ",
      answer: "project",
      revealTh: "โครงงาน: เธอทำเองทั้งหมด มีรูปกับบันทึกที่คนอื่นเปิดดูได้",
    },
    {
      id: "journey",
      labelTh: "ทำอินโฟกราฟิกว่าหลอดเลือดหนึ่งหลอด เดินทางไปแล็บยังไง",
      answer: "project",
      revealTh: "โครงงาน: อธิบายงานแล็บให้คนอื่นเข้าใจ ก็เป็นทักษะของสายนี้เหมือนกัน",
    },
    {
      id: "camp",
      labelTh: "ไปค่ายหรือวันเปิดบ้านคณะเทคนิคการแพทย์",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าด้วยว่าได้ลองทำอะไร ไม่ใช่แค่ไปเดินดู",
    },
    {
      id: "blood-drive",
      labelTh: "ช่วยโต๊ะลงทะเบียน วันรับบริจาคเลือดที่โรงเรียน",
      answer: "activity",
      revealTh: "กิจกรรม: ได้เห็นงานจริงใกล้ๆ เล่าด้วยว่าเห็นอะไร",
    },
    {
      id: "olympiad",
      labelTh: "เกียรติบัตรจากการแข่งขันชีววิทยา",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล: ใส่ได้นะ แต่เล่าด้วยว่าเธอได้อะไรจากมัน",
    },
  ],
  bridge: [
    sys("ผลงานชิ้นแรกไม่ต้องใหญ่โตเลย"),
    host("TCAS70 เทคนิคการแพทย์ใน mytcas มี 20 หลักสูตร มีรอบ 1 ถึง 17 หลักสูตร", { facts: [MYTCAS], mood: "wow" }),
    host("อยากรู้เรื่องเงินเดือนกับที่เรียนต่อใช่ไหม"),
    host("กด แผนที่ด่าน ข้างล่าง ไปดูข้อมูลเต็มของสายนี้ได้เลย"),
  ],
});
