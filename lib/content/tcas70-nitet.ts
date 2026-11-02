/**
 * TCAS70 (entry 2570) Round 1 Portfolio routes for Communication Arts and
 * Mass Communication (นิเทศศาสตร์, วารสารศาสตร์, สื่อสารมวลชน, นวัตกรรมสื่อ),
 * Thai-language and international programs. One entry per project (โครงการ)
 * or entry track. Collected 2 Nov 2569 from each faculty's own announcement,
 * cross-checked with course.mytcas.com. Where one project runs the same rules
 * for several majors (SWU COSCI, CMU's two majors), the majors share a row.
 * Left out on purpose: TU's Thai journalism program (round 1 is a sports
 * quota only), KU นิเทศศาสตร์ (rounds 2-3 only), Burapha (round 2 eastern
 * quota only), Naresuan (18 northern provinces only, closed 30 Sep), Mahidol
 * and MFU (no such program in TCAS70), Chula's JN major (a round 2 quota),
 * and narrow quotas (sports, disability, partner schools, family income).
 * Silpakorn's official announcement says 75 seats where mytcas shows 150;
 * the poster uses the announcement. Re-check before reusing.
 */

import type { TcasDate, TcasPosterData, TcasReality, TcasSourceLink, TcasTakeaway, TcasUniversity } from "./tcas70-poster";

export const TCAS_NITET_AS_OF = "2 พ.ย. 2569";

const CU_APPLY = "3-12 พ.ย. 69 (ปิด 16.00 น.)";
const CU_SCORE_70 = "สัมภาษณ์ผ่าน 70/100";
const SWU_FOLIO = "TCASFolio ไม่เกิน 15 หน้า · ผลงานดีสุดตรงวิชาเอก · ตอบ 3 คำถาม";
const SWU_SCORING = "พื้นฐาน 30 + ด้านสาขา 50 + องค์ประกอบพอร์ต 20 · สัมภาษณ์ 13-14 ก.พ. 70";
const SWU_APPLY = "1.1 ปิดแล้ว · 1.2 1-16 ธ.ค. 69";
const KMUTT_APPLY = "17 ส.ค. 69-11 ม.ค. 70";
const KMUTT_FOLIO = "ไม่เกิน 12 หน้า A4 · ผลงาน รางวัล กิจกรรม (ถ้ามี)";
const CMU_APPLY = "28 ต.ค.-5 พ.ย. 69 (ปิด 16.00 น.)";
const CMU_SCORING = "พอร์ต 90 + สัมภาษณ์ 10 · 19 ธ.ค. 69";
const CMU_FOLIO = "TCASFolio ไม่เกิน 10 หน้า · เรียงความเหตุผลที่สมัคร · ระบุบทบาทในทุกผลงาน";
const PSU_APPLY = "ช่วง 1 19 ต.ค.-5 พ.ย. 69 · ช่วง 2 6-19 พ.ย. 69";
const MSU_FOLIO = "ไม่เกิน 10 หน้า A4 ไม่รวมปก";
const MSU_SCORING = "ผ่านคุณสมบัติเข้าสัมภาษณ์ · สัดส่วนไม่ระบุ";

export const TCAS_NITET_UNIVERSITIES: TcasUniversity[] = [
  {
    key: "cu",
    nameTh: "จุฬาฯ",
    nameEn: "CHULA",
    source: "admission.chula.ac.th",
    projects: [
      {
        name: "MD NEW GEN (การออกแบบและผลิตสื่อ)",
        seats: "10 คน",
        gpax: "3.00",
        requirement: "ต้องมีงานเสียงหรือวิดีโอที่เผยแพร่สาธารณะต่อเนื่องในรอบ 4 ปี · ไม่บังคับรางวัล",
        gated: true,
        portfolio: "TCASFolio ไม่เกิน 10 หน้า · งานโจทย์ ep.1 รายการใหม่ 3 นาที ทำเองคนเดียว + Masterpiece + Showreel 2 นาที",
        scoring: `พอร์ต: โจทย์ 60 + Masterpiece 25 + Showreel 15 ต้องได้ 70 · ${CU_SCORE_70}`,
        apply: CU_APPLY,
      },
      {
        name: "นักวาทนิเทศรุ่นใหม่ (วาทนิเทศ)",
        seats: "10 คน",
        gpax: "3.50",
        requirement: "ผลสอบอังกฤษ 1 อย่าง: IELTS 4.0, TOEFL iBT 45 หรือ CU-TEP 45 · ไม่บังคับรางวัล",
        gated: false,
        portfolio: "TCASFolio · ผลงานพูด พิธีกร โต้วาที ไม่เกิน 10 หน้า · คลิปโจทย์ 5 นาที ห้ามใช้ AI",
        scoring: `พอร์ต: ผลงาน 40 + โจทย์ 40 + รางวัล 10 + ผู้นำ 10 ต้องได้ 70 · ${CU_SCORE_70}`,
        apply: CU_APPLY,
      },
      {
        name: "สื่อสารการแสดง",
        seats: "10 คน",
        gpax: "3.50",
        requirement: "ผลสอบอังกฤษ 1 อย่าง: IELTS 3.5, TOEFL iBT 40 หรือ CU-TEP 40 · ไม่บังคับรางวัล",
        gated: false,
        portfolio: "TCASFolio · ผลงานการแสดง 4 ปี ไม่เกิน 10 หน้า · คลิปแสดงโจทย์ 3 นาที คนเดียว + คลิปเล่าแนวคิด",
        scoring: `พอร์ต: โจทย์ 40 + ผลงาน 40 + รางวัล 10 + จิตอาสา 10 ต้องได้ 70 · ${CU_SCORE_70}`,
        apply: CU_APPLY,
      },
      {
        name: "CU Film Student (ศิลปะภาพยนตร์)",
        seats: "10 คน",
        gpax: "3.00",
        requirement: "ต้องมีหนังหรือภาพเคลื่อนไหว 3 เรื่องจากปี 66-69 · ไม่บังคับรางวัล · ไม่ต้องมีผลสอบ",
        gated: true,
        portfolio: "TCASFolio · หนังโจทย์ \"คนไทยคนแรก...\" 3-5 นาที + ผลงานเก่า 3 เรื่องพอดี + เรียงความ",
        scoring: `พอร์ต: โจทย์ 50 + ผลงาน 50 ต้องได้ 70 · ${CU_SCORE_70}`,
        apply: CU_APPLY,
      },
      {
        name: "BCM นานาชาติ · Early Admission",
        seats: "60 คน",
        gpax: "ไม่กำหนด",
        requirement: "IELTS 6.5 หรือ TOEFL iBT 80 + SAT หรือ CU-AAT 1,200 · ไม่บังคับรางวัล",
        gated: false,
        portfolio: "ไม่ใช้พอร์ต · ยื่นผลสอบ ใบเกรด ใบรับรอง",
        scoring: "SAT/CU-AAT Verbal 45 + Math 30 + สัมภาษณ์ 25",
        apply: "26 พ.ย.-25 ธ.ค. 69",
      },
    ],
  },
  {
    key: "tu",
    nameTh: "ธรรมศาสตร์",
    nameEn: "THAMMASAT",
    source: "bjm.jc.tu.ac.th",
    projects: [
      {
        name: "BJM นานาชาติ · Inter Portfolio 1",
        seats: "30 คน",
        gpax: "3.00",
        requirement: "IELTS 6.5, TOEFL iBT 79 หรือ SAT EBRW 450 + ผลงานสื่อใน 3 ปี: รางวัลระดับภูมิภาค, ทำสื่อต่อเนื่อง 1 ปี หรือฝึกงานด้านสื่อ",
        gated: true,
        portfolio: "BJM Portfolio Form · ด้านละไม่เกิน 2 ชิ้น · SOP 500 คำ · ไม่รับงานแสดง ร้อง เต้น",
        scoring: "พอร์ตคัดเข้าสัมภาษณ์ 6-7 ก.พ. 70 · สัดส่วนไม่ระบุ",
        apply: "2 พ.ย. 69-15 ม.ค. 70",
      },
    ],
  },
  {
    key: "swu",
    nameTh: "มศว",
    nameEn: "SWU",
    source: "admission.swu.ac.th",
    projects: [
      {
        name: "ผู้มีทักษะพิเศษ 1.2 · COSCI 3 สาขา",
        seats: "90 คน (36 + 27 + 27)",
        gpax: "ไม่กำหนด",
        requirement: "ไม่บังคับรางวัล · ไม่ต้องมีผลสอบ · หลักสูตรสองภาษา",
        gated: false,
        portfolio: SWU_FOLIO,
        scoring: SWU_SCORING,
        apply: SWU_APPLY,
      },
      {
        name: "พัฒนาบัณฑิตสู่สากล 1.2",
        seats: "19 คน",
        gpax: "ไม่กำหนด",
        requirement: "ผลสอบอังกฤษ 1 อย่าง: IELTS 5.0, TOEFL iBT 60, TOEIC 650 หรือ SWU-SET 78",
        gated: false,
        portfolio: SWU_FOLIO,
        scoring: SWU_SCORING,
        apply: SWU_APPLY,
      },
    ],
  },
  {
    key: "su",
    nameTh: "ศิลปากร",
    nameEn: "SILPAKORN",
    source: "admission.su.ac.th",
    projects: [
      {
        name: "แฟ้มสะสมผลงาน ช่วงที่ 2 · นิเทศศาสตร์ (เมืองทองธานี)",
        seats: "75 คน (ภาคพิเศษ)",
        gpax: "3.20",
        requirement: "ไม่บังคับรางวัล · ไม่ต้องมีผลสอบ",
        gated: false,
        portfolio: "PDF ไม่เกิน 10 หน้า · ผลงานเด่น 1 ชิ้น + อธิบายกระบวนการ · เรียงความ 2 เรื่อง · ไม่รับเกียรติบัตร",
        scoring: "พอร์ต 70 (ต้องได้ 75%) + สัมภาษณ์ออนไลน์ 30 · 20 ธ.ค. 69",
        apply: "20 ต.ค.-16 พ.ย. 69",
      },
    ],
  },
  {
    key: "kmutt",
    nameTh: "บางมด",
    nameEn: "KMUTT",
    source: "join.kmutt.ac.th",
    projects: [
      {
        name: "เรียนดี · สื่อสารมวลชน (ครุศาสตร์อุตฯ)",
        seats: "30 คน",
        gpax: "3.00",
        requirement: "ไม่บังคับรางวัล",
        gated: false,
        portfolio: KMUTT_FOLIO,
        scoring: "GPAX คัดเข้าสัมภาษณ์ · GPAX 60 + สัมภาษณ์ 40",
        apply: KMUTT_APPLY,
      },
      {
        name: "Active Recruitment · สื่อสารมวลชน (ครุศาสตร์อุตฯ)",
        seats: "20 คน",
        gpax: "2.75",
        requirement: "ไม่บังคับรางวัล",
        gated: false,
        portfolio: KMUTT_FOLIO,
        scoring: "GPAX 40 + สัมภาษณ์ 60",
        apply: KMUTT_APPLY,
      },
      {
        name: "เรียนดี · มีเดียอาตส์ (4 แขนง)",
        seats: "12 คน (ซินีมาติก 6 + กราฟิก แอนิเมชัน เกม อย่างละ 2)",
        gpax: "2.75",
        requirement: "ไม่บังคับรางวัล · ต้องมีผลงานที่เกี่ยวกับแขนง",
        gated: false,
        portfolio: "ไม่เกิน 12 หน้า A4 · ผลงานตรงแขนง ทักษะหรือรางวัลระดับชาติเป็นข้อได้เปรียบ",
        scoring: "GPAX คัดเข้าสัมภาษณ์ · สัมภาษณ์ 100%",
        apply: KMUTT_APPLY,
      },
    ],
  },
  {
    key: "kku",
    nameTh: "ขอนแก่น",
    nameEn: "KKU",
    source: "course.mytcas.com",
    projects: [
      {
        name: "นศ.บ. นานาชาติ (วิทยาลัยนานาชาติ)",
        seats: "20 คน (2 วิชาเอก)",
        gpax: "3.00 · ภาษาต่างประเทศ 3.00",
        requirement: "ไม่บังคับรางวัล · พอร์ตและสัมภาษณ์เป็นภาษาอังกฤษ",
        gated: false,
        portfolio: "KKU E-Portfolio ไม่เกิน 12 หน้า · ข้อมูลตัวเอง การศึกษา รางวัล กิจกรรม essay",
        scoring: "พอร์ต 50 + สัมภาษณ์อังกฤษ 50 · 8 ธ.ค. 69",
        apply: "ปิด 2 พ.ย. 69",
        applyClosed: true,
      },
    ],
  },
  {
    key: "cmu",
    nameTh: "เชียงใหม่",
    nameEn: "CMU",
    source: "admission.reg.cmu.ac.th",
    projects: [
      {
        name: "ความสามารถพิเศษทางการสื่อสารมวลชน",
        seats: "32 คน (ผลิตสื่อ 22 + การตลาด 10)",
        gpax: "2.75",
        requirement: "1 อย่าง: รางวัลด้านสื่อระดับท้องถิ่นขึ้นไป, ได้รับเลือกทำหน้าที่ด้านสื่อ หรือช่องออนไลน์ 50,000 ผู้ติดตาม · โรงเรียนเสนอชื่อ",
        gated: true,
        portfolio: `${CMU_FOLIO} แนบลิงก์หรือ QR`,
        scoring: CMU_SCORING,
        apply: CMU_APPLY,
      },
      {
        name: "สื่อสารมวลชนเพื่อสังคม",
        seats: "27 คน (ผลิตสื่อ 18 + การตลาด 9)",
        gpax: "2.75",
        requirement: "เกียรติบัตรบำเพ็ญประโยชน์จากหน่วยงานรัฐหรือองค์กรไม่แสวงกำไร (ไม่ใช่กิจกรรมโรงเรียน) · โรงเรียนเสนอชื่อ",
        gated: true,
        portfolio: CMU_FOLIO,
        scoring: CMU_SCORING,
        apply: CMU_APPLY,
      },
      {
        name: "นักเรียนผลการเรียนดี",
        seats: "7 คน (ผลิตสื่อ 5 + การตลาด 2)",
        gpax: "3.50",
        requirement: "ไม่บังคับรางวัล · มีกิจกรรมวิชาการและจิตอาสา · โรงเรียนเสนอชื่อ",
        gated: false,
        portfolio: CMU_FOLIO,
        scoring: CMU_SCORING,
        apply: CMU_APPLY,
      },
      {
        name: "ภาพยนตร์ดิจิทัล (สองภาษา)",
        seats: "20 คน",
        gpax: "3.00",
        requirement: "รางวัลหนังสั้น motion graphic หรือ VFX ระดับโรงเรียนขึ้นไป · โรงเรียนเสนอชื่อ",
        gated: true,
        portfolio: "TCASFolio ไม่เกิน 15 หน้า · ตอบ: หนัง 1 เรื่องที่เล่าตัวตนคุณ",
        scoring: CMU_SCORING,
        apply: CMU_APPLY,
      },
    ],
  },
  {
    key: "psu",
    nameTh: "ม.อ. ปัตตานี",
    nameEn: "PSU",
    source: "admission.psu.ac.th",
    projects: [
      {
        name: "คณะวิทยาการสื่อสาร โดยวิธีพิเศษ (รอบ 1/2)",
        seats: "นิเทศ 15 + 15 คน ต่อช่วง",
        gpax: "2.50",
        requirement: "ไม่บังคับรางวัล · รับ ม.6 และ กศน.",
        gated: false,
        portfolio: "TCASFolio · เรียงความ 500 คำ · ผลงานสื่อ การตลาด PR ถ่ายภาพ + ลิงก์ผลงาน",
        scoring: "GPAX + พอร์ต + สัมภาษณ์ที่ปัตตานี 14 พ.ย. 69 (ช่วง 1)",
        apply: PSU_APPLY,
      },
      {
        name: "นิเทศศาสตร์ โดยวิธีพิเศษ",
        seats: "10 คน ต่อช่วง (5 + 5)",
        gpax: "ไม่กำหนด",
        requirement: "รางวัลจากงานของคณะ: CommSci Talk, ประกวดนำเสนอผลิตภัณฑ์ชุมชน หรือคลิปสั้น งาน ม.อ.วิชาการ",
        gated: true,
        portfolio: "TCASFolio · เรียงความ 500 คำ + เกียรติบัตรรางวัล",
        scoring: "พิจารณาจากเอกสาร ไม่มีสัมภาษณ์",
        apply: PSU_APPLY,
      },
    ],
  },
  {
    key: "msu",
    nameTh: "มหาสารคาม",
    nameEn: "MSU",
    source: "admission.msu.ac.th",
    projects: [
      {
        name: "โควตารับตรง Portfolio 1 · นิเทศศาสตร์",
        seats: "70 คน",
        gpax: "2.00",
        requirement: "ไม่บังคับรางวัล · รับ ม.6 ปวช. กศน. · มีผลงานด้านนิเทศหรือการสื่อสาร",
        gated: false,
        portfolio: MSU_FOLIO,
        scoring: MSU_SCORING,
        apply: "10 พ.ย.-10 ธ.ค. 69",
      },
      {
        name: "โควตารับตรง Portfolio 1 + 2 · คอนเทนต์และนวัตกรรมสื่อดิจิทัล",
        seats: "25 คน (15 + 10)",
        gpax: "3.25 · ภาษาไทย 2.50",
        requirement: "ไม่บังคับรางวัล · มีผลงานเขียน คลิป ข่าว ภาพถ่าย หรือกราฟิก",
        gated: false,
        portfolio: MSU_FOLIO,
        scoring: MSU_SCORING,
        apply: "10 พ.ย.-10 ธ.ค. 69 · 20 ม.ค.-15 ก.พ. 70",
      },
    ],
  },
];

/** What they have in common, for a student building a portfolio project. */
export const TCAS_NITET_TAKEAWAYS: TcasTakeaway[] = [
  {
    en: "Make the Brief",
    icon: "rocket",
    title: "งานโจทย์คือคะแนนก้อนใหญ่",
    body: "จุฬาฯ ภาคไทยทั้ง 4 โครงการให้ทำงานใหม่ตามโจทย์ เช่น ep.1 รายการของตัวเอง 3 นาที หรือหนังสั้น \"คนไทยคนแรก...\" งานโจทย์คิด 40-60% ของพอร์ต และมีคะแนนขั้นต่ำของตัวเองก่อนจะดูส่วนอื่น",
  },
  {
    en: "Publish It",
    icon: "screen",
    title: "เผยแพร่จริงดีกว่าเกียรติบัตร",
    body: "MD จุฬาฯ ของานที่เผยแพร่ต่อเนื่อง BJM ธรรมศาสตร์ขอทำสื่อต่อเนื่อง 1 ปีที่มีเป้าหมายชัด ไม่ใช่แค่บันเทิง ศิลปากรไม่รับเกียรติบัตรเลย เชียงใหม่นับช่องออนไลน์ 50,000 ผู้ติดตาม",
  },
  {
    en: "Say Your Role",
    icon: "crew",
    title: "บอกว่าตัวเองทำส่วนไหน",
    body: "เชียงใหม่ให้ระบุบทบาทในทุกผลงานพร้อมลิงก์ ศิลปากรให้บอกเปอร์เซ็นต์ที่ทำในงานกลุ่มและอธิบายกระบวนการ MD จุฬาฯ ให้คิด เขียน กำกับ ตัดต่องานโจทย์เองคนเดียว",
  },
  {
    en: "AI Rules Differ",
    icon: "question",
    title: "เช็กกติกา AI ทุกที่",
    body: "วาทนิเทศ จุฬาฯ ห้ามใช้ AI ทุกขั้นตอน ศิลปากรตัดสิทธิ์ถ้าเรียงความเขียนด้วย AI MD ใช้เป็นผู้ช่วยได้แต่ต้องบอก CU Film กับสื่อสารการแสดงต้องแจ้งว่าใช้ AI ตรงไหน",
  },
  {
    en: "No Award? Still Open",
    icon: "sprout",
    title: "ไม่มีรางวัลก็ยังมีทาง",
    body: "มศว ไม่กำหนด GPAX ไม่บังคับรางวัลและไม่ต้องมีผลสอบ บางมด ศิลปากร ม.อ. และมหาสารคามไม่บังคับรางวัล มหาสารคามใช้ GPAX แค่ 2.00 ม.อ. 2.50",
  },
  {
    en: "Ask Your School",
    icon: "signpost",
    title: "เชียงใหม่ต้องให้โรงเรียนเสนอชื่อ",
    body: "ทุกโครงการของเชียงใหม่ต้องมีหนังสือเสนอชื่อจากโรงเรียน โรงเรียนละไม่เกิน 5 คน สายเพื่อสังคมต้องมีเกียรติบัตรจากหน่วยงานรัฐหรือองค์กรไม่แสวงกำไร ขอจากครูให้ทันก่อน 5 พ.ย.",
  },
];

/** Key dates on one line, oldest first. */
export const TCAS_NITET_DATES: TcasDate[] = [
  { date: "5 พ.ย. 69", label: "เชียงใหม่ ปิดรับ" },
  { date: "12 พ.ย. 69", label: "จุฬาฯ ภาคไทย ปิดรับ" },
  { date: "16 พ.ย. 69", label: "ศิลปากร ปิดรับ" },
  { date: "19 พ.ย. 69", label: "ม.อ. ช่วง 2 ปิดรับ" },
  { date: "10 ธ.ค. 69", label: "มมส ปิดรับ" },
  { date: "16 ธ.ค. 69", label: "มศว 1.2 ปิดรับ" },
  { date: "25 ธ.ค. 69", label: "จุฬาฯ BCM ปิดรับ" },
  { date: "11 ม.ค. 70", label: "บางมด ปิดรับ" },
  { date: "15 ม.ค. 70", label: "ธรรมศาสตร์ BJM ปิดรับ" },
];

export const TCAS_NITET_SOURCES = [
  "admission.chula.ac.th",
  "iscm.commarts.chula.ac.th",
  "bjm.jc.tu.ac.th",
  "admission.swu.ac.th",
  "admission.su.ac.th",
  "join.kmutt.ac.th",
  "admission.reg.cmu.ac.th",
  "admission.psu.ac.th",
  "admission.msu.ac.th",
  "course.mytcas.com",
];

/** Applicant and interview counts from official pages. No university publishes admitted scores for this field. */
export const TCAS_NITET_REALITY: TcasReality[] = [
  {
    uni: "เชียงใหม่",
    project: "ความสามารถพิเศษ · ผลิตสื่อสร้างสรรค์",
    min: "GPAX 2.75 + ผลงานสื่อ",
    actual: "ปี 70 ณ 2 พ.ย. สมัครแล้ว 43 คน ต่อ 22 ที่",
    note: "ยังเปิดถึง 5 พ.ย. · ผลการเรียนดี ผลิตสื่อ 17 คน ต่อ 5 ที่ · ภาพยนตร์ดิจิทัล 13 คน ต่อ 20 ที่",
    source: "admission.reg.cmu.ac.th/tcas/findfaculty.php?tfac=18",
  },
  {
    uni: "ม.อ. ปัตตานี",
    project: "คณะวิทยาการสื่อสาร รอบ 1/1 ช่วง 1",
    min: "GPAX 2.50",
    actual: "ปี 70 ได้สิทธิ์สัมภาษณ์ 6 และ 3 คน ต่อวิชาเอกละ 15 ที่",
    note: "ผ่านสัมภาษณ์ 5 และ 3 คน · ที่ว่างเปิดรับต่อในรอบ 1/2",
    source: "commsci.psu.ac.th (ประกาศรายชื่อสัมภาษณ์และผู้ผ่าน ก.ย. 69)",
  },
  {
    uni: "จุฬาฯ",
    project: "BCM นานาชาติ · Early Admission",
    min: "SAT/CU-AAT 1,200 + IELTS 6.5",
    actual: "ปี 69 ผ่านสัมภาษณ์ 71 คน + สำรอง 37 คน",
    note: "ปี 70 รับ 60 ที่ · ไม่มีคะแนนคนที่ติดเผยแพร่",
    source: "iscm.commarts.chula.ac.th/_docs/bcm-early-admission-2026-result2.pdf",
  },
];

export const TCAS_NITET_NO_DATA =
  "ไม่พบข้อมูลคนที่ติดที่เผยแพร่: จุฬาฯ ภาคไทย 4 โครงการ · BJM ธรรมศาสตร์ · มศว · ศิลปากร · บางมด · ขอนแก่น · มหาสารคาม";

export const TCAS_NITET_SOURCE_LINKS: TcasSourceLink[] = [
  {
    uni: "จุฬาฯ",
    links: [
      "admission.chula.ac.th/upload/adm_announce/file_373_1_3226.pdf (MD)",
      "admission.chula.ac.th/upload/adm_announce/file_374_2_1744.pdf (วาทนิเทศ)",
      "admission.chula.ac.th/upload/adm_announce/file_375_1_3253.pdf (การแสดง)",
      "admission.chula.ac.th/upload/adm_announce/file_376_1_3314.pdf (CU Film)",
      "iscm.commarts.chula.ac.th/_announcement-upload/8f8ef91cfdd956c4fc51a9ebc6100366.pdf (BCM)",
    ],
  },
  { uni: "ธรรมศาสตร์", links: ["bjm.jc.tu.ac.th/wp-content/uploads/2026/10/Inter-Portfolio-1-Announcement.pdf", "tuadmissions.in.th/faculty (ภาคไทยรอบ 1 มีแค่นักกีฬา)"] },
  { uni: "มศว", links: ["admission.swu.ac.th/file_staff_upload/file_news/1720260925041014.pdf (COSCI)"] },
  { uni: "ศิลปากร", links: ["admission.su.ac.th/view_pdf.php?id=14 (ช่วงที่ 2 หน้า 140-142)"] },
  { uni: "บางมด", links: ["join.kmutt.ac.th/news2026/117 (เกณฑ์เรียนดีและ Active Recruitment ลิงก์จากหน้าโครงการ)"] },
  { uni: "ขอนแก่น", links: ["course.mytcas.com/programs/10030129901105E"] },
  {
    uni: "เชียงใหม่",
    links: ["admission.reg.cmu.ac.th/tcas/findfaculty.php?tfac=18", "admission.reg.cmu.ac.th/tcas/files_download/3e8f31a6b2f9275bb43e8d94291be44e.pdf"],
  },
  {
    uni: "ม.อ.",
    links: [
      "admission.psu.ac.th/project/announcements/282c7d18-88bb-485a-8558-08c7845652ea/1_r1-2.pdf",
      "admission.psu.ac.th/project/announcements/2427e0c0-f8ec-4896-9121-d2695df2db4b/1_r1-2.pdf",
    ],
  },
  { uni: "มหาสารคาม", links: ["admission.msu.ac.th/appl (ระเบียบการ 70 หน้า 86-87 และ 93)"] },
  { uni: "ทุกที่", links: ["course.mytcas.com (จำนวนรับและโครงการ)"] },
];

export const TCAS_NITET_POSTER: TcasPosterData = {
  key: "nitet",
  fieldEn: "COMMUNICATION ARTS",
  coverTitle: ["นิเทศ + สื่อสารมวลชน", "รอบ 1 Portfolio"],
  tableTitle: "นิเทศ รอบ 1 ต้องมีอะไร",
  scope: "หลักสูตรภาษาไทย สองภาษา และนานาชาติ",
  skipped: "ไม่รวมโควตาเฉพาะกลุ่ม เช่น นักกีฬา ผู้พิการ โรงเรียนเครือข่าย",
  gateLegend: "ช่องสีส้ม = ต้องมีผลงานสื่อ รางวัล หรือเกียรติบัตรที่กำหนดก่อนถึงจะสมัครได้",
  notes: [
    "ไม่มีรอบ 1 ทั่วไป: วารสารฯ ธรรมศาสตร์ภาคไทย (มีแค่โควตานักกีฬา) · นิเทศ ม.เกษตร (รอบ 2-3) · บูรพา (รอบ 2 โควตาภาคตะวันออก) · มหิดลและแม่ฟ้าหลวงไม่มีหลักสูตรนี้ · นเรศวรรับเฉพาะ 18 จังหวัดภาคเหนือ ปิดแล้ว",
  ],
  asOf: TCAS_NITET_AS_OF,
  universities: TCAS_NITET_UNIVERSITIES,
  sheets: [
    ["cu", "tu"],
    ["swu", "su", "kmutt", "kku"],
    ["cmu", "psu", "msu"],
  ],
  takeaways: TCAS_NITET_TAKEAWAYS,
  dates: TCAS_NITET_DATES,
  sources: TCAS_NITET_SOURCES,
  realityTitle: "คนสมัครจริงกี่คน",
  reality: TCAS_NITET_REALITY,
  realityGap: TCAS_NITET_NO_DATA,
  sourceLinks: TCAS_NITET_SOURCE_LINKS,
};
