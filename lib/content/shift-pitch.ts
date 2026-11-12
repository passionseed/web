import type { RisoIconName } from "@/components/shift/poster/RisoIcons";
import type { ShiftCohort } from "@/lib/content/shift-cohort";

/**
 * SHIFT pitch copy shared by every round page (/shift/N) and the all-rounds
 * page (/shift): what a student leaves with, and the FAQ. The FAQ also feeds
 * each page's FAQPage structured data, so search engines and AI answer
 * engines quote the same answers students read.
 */

export const SHIFT_DELIVERABLES: {
  num: string;
  icon: RisoIconName;
  title: string;
  body: string;
}[] = [
  {
    num: "1",
    icon: "live",
    title: "Functional Prototype / Shipped Asset",
    body: "เว็บทูลที่ใช้งานได้จริง รายงานวิจัย หรือ hardware prototype ที่มีคนภายนอกแตะต้องได้",
  },
  {
    num: "2",
    icon: "metrics",
    title: "บันทึกจุดพังและสิ่งที่แก้",
    body: "บันทึกสมมติฐาน จุดพัง และการปรับแผนอย่างเป็นระบบ ซึ่งคือหลักฐาน mindset ที่อาจารย์มองหาตัวจริง",
  },
  {
    num: "3",
    icon: "caseStudy",
    title: "1-Page TCAS Case Study Blueprint",
    body: "สรุปตรรกะ ข้อมูล และผลลัพธ์ของโปรเจกต์ในหน้าเดียว พร้อมใช้ตอบคำถามในห้องสัมภาษณ์",
  },
];

export function buildShiftFaqs(cohort: Pick<ShiftCohort, "testerTarget">) {
  return [
    {
      q: "ทำไมใบเซอร์ค่าย 1 วันถึงไม่พอสำหรับ TCAS 1 อีกต่อไป?",
      a: "กรรมการสัมภาษณ์และอาจารย์มหาวิทยาลัยเจอนักเรียนส่งใบเซอร์หน้าตาเหมือนกันเป็นพันๆ ใบ อาจารย์ไม่ได้มองหาคนสะสมกระดาษ แต่มองหา 'ความสามารถในการแก้ปัญหาจริง' โปรเจกต์ที่คนนอกได้ใช้จริงพร้อมบันทึกตอนระบบพังและวิธีแก้ จึงมีน้ำหนักมากกว่าใบเซอร์ค่ายนั่งฟังหลายสิบเท่า",
    },
    {
      q: "ผลงานจาก SHIFT นำไปใส่ใน Portfolio TCAS รอบ 1 ได้อย่างไร?",
      a: "SHIFT ออกแบบผลลัพธ์ให้ออกมาเป็น '1-Page Defense Case Study' บรรจุในพอร์ต 10 หน้าได้อย่างลงตัว: มีทั้งลิงก์โปรเจกต์จริง, สถิติผู้ใช้งาน (Telemetry), กราฟการทดสอบ, และบันทึกจุดพังกับสิ่งที่แก้ ซึ่งเป็นจุดดึงดูดสายตากรรมการมากที่สุดในห้องสัมภาษณ์",
    },
    {
      q: "เด็ก ม.ปลาย จะหาคนนอกมาลองใช้ใน 7 วันได้อย่างไร?",
      a: `Day 1 ทุกคนเขียนชื่อคนจริง ${cohort.testerTarget} คนที่น่าจะเจอปัญหานี้ แล้วทักตรงทีละคน ไม่ใช่โพสต์ลงสตอรี่เพื่อนสนิทแล้วรอ ก่อนโพสต์ในกลุ่ม เพื่อนในทีมช่วยอ่านให้ก่อนว่าคนอ่านรู้ไหมว่าต้องทำอะไร ของที่ตัดเหลือ 1 จอ 1 แอ็กชัน ทำให้คนลองได้ในไม่กี่นาที ได้ไม่ครบก็ไม่เป็นไร จำนวนจริงพร้อมเหตุผลคือข้อมูลในบันทึกจุดพัง`,
    },
    {
      q: "ถ้าไม่มีพื้นฐานโปรแกรมมิ่งเลย จะทำได้ไหม?",
      a: "ทำได้ 100% เพราะเราใช้ระบบ Zero-Code Templates (Tally, Carrd, Notion, Hardware Modding) เน้นกระบวนการคิดและการแก้ปัญหาจริง ไม่ต้องเสียเวลานั่งแก้ Syntax",
    },
    {
      q: "ถ้าลองทำแล้วโปรเจกต์พัง หรือไม่มีคนใช้ จะทำยังไง?",
      a: "นั่นคือจุดประสงค์หลักของเรา อาจารย์ไม่ได้อยากเห็นพอร์ตเมคที่เพอร์เฟกต์ 100% แต่อยากเห็น Data ตอนพังบวกกับวิธีที่เราปรับแก้ ซึ่งเป็น asset ที่มีน้ำหนักที่สุดในพอร์ต",
    },
    {
      q: "เวลาจัดกิจกรรมเป็นยังไง กระทบเวลาเรียนไหม?",
      a: "เป็น Hybrid Sprint ออนไลน์บน Discord ใช้เวลาช่วงเย็นและเสาร์-อาทิตย์ ไม่กระทบการเรียนปกติ",
    },
  ];
}
