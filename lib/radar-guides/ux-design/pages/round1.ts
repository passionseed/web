/**
 * Level 2 · round1: the shared "TCAS round 1 is for you" level
 * (lib/radar-guides/_shared/round1.ts), with things a high-school student into
 * UX/UI could do, to sort into the TCASfolio bins. Programmes: design,
 * นิเทศศิลป์ and multimedia (f.ux-mytcas-programmes). course.mytcas.com has
 * no search link (its search is client state), so the link opens the home page.
 */
import { roundOnePage } from "../../_shared/round1";

export const round1 = roundOnePage({
  order: 5,
  asOf: "2026-11-20",
  careerTh: "สาย UX/UI",
  facultiesTh: "นิเทศศิลป์ ออกแบบดิจิทัล มัลติมีเดีย",
  mytcasHref: "https://course.mytcas.com",
  extraFactIds: ["f.ux-mytcas-programmes"],
  items: [
    {
      id: "redesign",
      labelTh: "รีดีไซน์หน้าจอแอปโรงเรียน มีภาพก่อนและหลัง กับบันทึกว่าเพื่อนติดตรงไหน",
      answer: "project",
      revealTh: "โครงงาน: เธอลงมือทำเอง แถมมีหลักฐานว่าดูคนใช้จริงก่อนแก้",
    },
    {
      id: "grandma",
      labelTh: "นั่งดูคุณยายลองวิดีโอคอลหาหลาน แล้วทำการ์ดสอนใช้ตัวใหญ่ที่ยายใช้ได้จริง",
      answer: "project",
      revealTh: "โครงงาน: ออกแบบให้คนจริงๆ สักคน แล้วดูว่ามันช่วยได้ไหม นี่แหละงาน UX",
    },
    {
      id: "sports-day",
      labelTh: "อาสาทำป้ายบอกทางในงานกีฬาสี ให้รุ่นน้องหาจุดลงทะเบียนเจอ",
      answer: "activity",
      revealTh: "กิจกรรม: เล่าด้วยว่าก่อนมีป้าย คนหลงตรงไหน แล้วหลังมีป้ายเป็นยังไง",
    },
    {
      id: "club",
      labelTh: "เข้าชุมนุมศิลปะหรือคอม แล้วรับทำหน้าเพจของชุมนุม",
      answer: "activity",
      revealTh: "กิจกรรม: บอกด้วยว่าเธอทำส่วนไหนเอง ไม่ใช่แค่ว่าเป็นสมาชิก",
    },
    {
      id: "contest",
      labelTh: "เกียรติบัตรจากเวทีแข่งออกแบบโปสเตอร์หรือแอป",
      answer: "award",
      revealTh: "เกียรติบัตร รางวัล: ใส่ได้นะ ถ้ามีชิ้นงานด้วย แนบไปพร้อมเหตุผลที่ออกแบบแบบนั้นเลย",
    },
  ],
});
