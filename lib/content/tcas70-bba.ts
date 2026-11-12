/**
 * TCAS70 (entry 2570) Round 1 Portfolio routes for Business Administration
 * (บธ.บ. / BBA), Thai-language and international programs, main campus where
 * the university has one in TCAS. One entry per project (โครงการ) or entry
 * track. Collected 20 Oct 2569 from each faculty's own announcement or
 * course.mytcas.com, rechecked 29 Oct 2569. Narrow quotas (sports, arts, staff/alumni children,
 * partner schools, disability, regional, vocational, เด็กดีมีที่เรียน) are left
 * out. Where a faculty had not published its TCAS70 criteria yet, the entry
 * uses the TCAS69 announcement and carries `refCycle`. KMUTT has no
 * business administration bachelor program and SUT's program is
 * การจัดการบัณฑิต (not บธ.บ.), so both are left out. Mahidol's only BBA in
 * TCAS is at the Kanchanaburi campus. Re-check before reusing.
 */

import type { TcasDate, TcasPosterData, TcasReality, TcasSourceLink, TcasTakeaway, TcasUniversity } from "./tcas70-poster";

export const TCAS_BBA_AS_OF = "29 ต.ค. 2569";

const CU_BBA_APPLY = "26 พ.ย.-25 ธ.ค. 69";
const KMITL_TH_APPLY = "วันนี้-22 ม.ค. 70 · สัมภาษณ์ 10 ก.พ. 70";
const KU_APPLY = "18 ก.ย.-14 ต.ค. 69";
const CMU_APPLY = "28 ต.ค.-5 พ.ย. 69";
const KKU_APPLY = "15 ต.ค.-2 พ.ย. 69";

export const TCAS_BBA_UNIVERSITIES: TcasUniversity[] = [
  {
    key: "cu",
    nameTh: "จุฬาฯ",
    nameEn: "CHULA",
    source: "admission.chula.ac.th",
    projects: [
      {
        name: "ความสามารถทางวิชาการ (บธ.บ. ภาคไทย)",
        seats: "60 คน",
        gpax: "3.25 (5 ภาคเรียน)",
        requirement: "1 อย่าง: ค่าย 2 สอวน., SAT รวม 1,290 (EBRW 600) หรือ CU-AAT รวม 1,290 (Verbal 600)",
        gated: false,
        portfolio: "TCASFolio · เรียงความ 800-1,000 ตัวอักษร",
        scoring: "พอร์ตต้องได้ 80/100 · สัมภาษณ์ผ่าน 85/100",
        apply: "3-12 พ.ย. 69",
      },
      {
        name: "BBA นานาชาติ · Early Admission",
        seats: "205 คน (รวมสาขาบัญชี)",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "TOEFL iBT 79 (สอบตั้งแต่ 21 ม.ค. 69 ใช้ 4.0), IELTS 6.5 หรือ CU-TEP+Speaking 101 และ SAT 1,270 หรือ CU-AAT 1,200",
        gated: false,
        portfolio: "ไม่มีพอร์ตในรายการเอกสาร · ยื่นเกรดและคะแนนสอบ",
        scoring: "คุณสมบัติ + SAT/CU-AAT คัดเข้าสัมภาษณ์ภาษาอังกฤษ",
        apply: CU_BBA_APPLY,
      },
      {
        name: "BBA นานาชาติ · NextGen Admission",
        seats: "10 คน",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "ผลงานแข่งขัน/กิจกรรมวิชาการระดับชาติขึ้นไป + TOEFL 79/IELTS 6.5 + SAT 1,300 หรือ CU-AAT 1,230",
        gated: true,
        portfolio: "คลิปแนะนำตัวภาษาอังกฤษ ≤3 นาที + พอร์ตผลงาน 3 ปีล่าสุด",
        scoring: "คลิป 20 + ผลงาน 80 ต้องได้ 70 · สัมภาษณ์",
        apply: CU_BBA_APPLY,
      },
    ],
  },
  {
    key: "kmitl",
    nameTh: "ลาดกระบัง",
    nameEn: "KMITL",
    source: "admission.reg.kmitl.ac.th",
    projects: [
      {
        name: "บธ.บ. นวัตกรรมการจัดการอุตสาหกรรม",
        seats: "30 คน",
        gpax: "2.75 · คณิต อังกฤษ 2.75",
        requirement: "ไม่บังคับรางวัล · สายวิทย์-คณิต ศิลป์-คำนวณ หรือเรียนคณิต 9 หน่วยกิตขึ้นไป · มี CEFR B1 ได้พิจารณาพิเศษ",
        gated: false,
        portfolio: "≤10 หน้า A4 ผลงาน ม.4 ขึ้นไป · รางวัลระดับภูมิภาคขึ้นไปได้คะแนนเท่ากัน",
        scoring: "พอร์ตและสัมภาษณ์ รวม 100 คะแนน",
        apply: KMITL_TH_APPLY,
      },
      {
        name: "บธ.บ. การจัดการและการเป็นผู้ประกอบการนวัตกรรม",
        seats: "30 คน",
        gpax: "2.50",
        requirement: "ต้องยื่นผลสอบอังกฤษ ไม่ยื่นถือว่าขาดคุณสมบัติ เช่น TOEIC 525, TOEFL iBT 65, IELTS 4.5, CU-TEP 60",
        gated: false,
        portfolio: "≤10 หน้า · ผลงานทำธุรกิจจริงเป็นหนึ่งในเกณฑ์ให้คะแนน",
        scoring: "พอร์ต 100 คะแนน + สัมภาษณ์ภาษาอังกฤษ",
        apply: KMITL_TH_APPLY,
      },
      {
        name: "BBA นานาชาติ (2 แขนง)",
        seats: "60 + 60 คน (แบ่ง 5 รอบย่อย)",
        gpax: "2.50",
        requirement: "ไม่บังคับรางวัล · ควรมีผลสอบอังกฤษ เช่น TOEFL, IELTS (ไม่ระบุขั้นต่ำ)",
        gated: false,
        portfolio: "iFolio + นำพอร์ตมาเสนอวันสัมภาษณ์",
        scoring: "สัมภาษณ์ภาษาอังกฤษ 70 + พอร์ต 30",
        apply: "รอบนี้ 1-30 ต.ค. 69 · รอบสุดท้ายปิด 28 ม.ค. 70",
      },
      {
        name: "BBA Global Entrepreneurship (นานาชาติ)",
        seats: "40 คน",
        gpax: "ไม่กำหนด (GPAX ไม่ใช่เกณฑ์หลัก)",
        requirement: "ไม่บังคับรางวัล · personal statement ภาษาอังกฤษ ≤2 หน้า · ผลสอบอังกฤษหรือคณิตเป็นข้อได้เปรียบ",
        gated: false,
        portfolio: "iFolio + personal statement ≤2 หน้า",
        scoring: "สัมภาษณ์ 50 + พอร์ต 50",
        apply: "วันนี้-28 ม.ค. 70",
      },
    ],
  },
  {
    key: "ku",
    nameTh: "เกษตรฯ",
    nameEn: "KASETSART",
    source: "admission.ku.ac.th",
    projects: [
      {
        name: "ช้างเผือก 1.1 (3 สาขา)",
        seats: "55 คน (10 + 10 + 35)",
        gpax: "3.60-3.75 ตามสาขา · อังกฤษ คณิต 3.00",
        requirement: "1 อย่าง: ผลงานประกวดด้านธุรกิจหรือ SDGs จากเวทีภายนอก, SOP ≤2 หน้า หรือผลทดสอบความสามารถพิเศษ",
        gated: false,
        portfolio: "≤10 หน้า A4 · ผลงาน 3-4 ปีย้อนหลัง",
        scoring: "GPAX 25 + ผลงาน 25 + สัมภาษณ์ 50",
        apply: KU_APPLY,
        applyClosed: true,
      },
      {
        name: "BBA นานาชาติ 1.1",
        seats: "100 คน",
        gpax: "2.50",
        requirement: "IELTS 6.0, TOEFL iBT 78, CU-TEP 75, TU-GET 550 (CBT 80) หรือ KU-EPT 80 อายุไม่เกิน 2 ปี · มี SAT ได้พิจารณาพิเศษ",
        gated: false,
        portfolio: "TCASFolio + ตอบ 2 คำถามภาษาอังกฤษ",
        scoring: "GPAX 20 + คะแนนอังกฤษ 50 + สัมภาษณ์อังกฤษ 30",
        apply: KU_APPLY,
        applyClosed: true,
      },
    ],
  },
  {
    key: "tu",
    nameTh: "ธรรมศาสตร์",
    nameEn: "THAMMASAT",
    source: "tuadmissions.in.th",
    projects: [
      {
        name: "Portfolio บธ.บ. (รังสิต + ท่าพระจันทร์)",
        seats: "130 คน (100 + 30)",
        gpax: "ไม่กำหนด",
        requirement: "ต้องมีคะแนน FORWARD ปี 69 หรือ SAT · ไม่บังคับรางวัล",
        gated: false,
        portfolio: "ผู้มีสิทธิ์สัมภาษณ์ส่ง ≤10 หน้า · SOP + ผลงานด้านธุรกิจ",
        scoring: "FORWARD หรือ SAT 100% จัดอันดับ · สัมภาษณ์ผ่าน/ไม่ผ่าน",
        apply: "14 ก.ย.-16 ธ.ค. 69",
      },
      {
        name: "BBA นานาชาติ · Inter Portfolio 1",
        seats: "170 คน (รวมบัญชี)",
        refCycle: "TCAS69",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "SAT 1,280 และ TOEFL iBT 80, IELTS 6.0 (ทุกส่วน 5.5) หรือ TU-GET 550/80",
        gated: false,
        portfolio: "ไม่ระบุในแหล่งข้อมูล",
        scoring: "เรียงคะแนน SAT เข้าสัมภาษณ์ภาษาอังกฤษ",
        apply: "ปี 70 ยังไม่ประกาศ (ปี 69 7-26 ธ.ค. 68)",
      },
    ],
  },
  {
    key: "psu",
    nameTh: "ม.อ.",
    nameEn: "PSU",
    source: "admission.psu.ac.th",
    projects: [
      {
        name: "ผลการเรียนดี (พื้นฐานวิทย์ / ศิลป์)",
        seats: "136 + 182 คน",
        gpax: "2.75-3.00 ตามสาขา · คณิต ภาษาต่างประเทศ 2.00-3.00",
        requirement: "ไม่บังคับรางวัล · สายวิทย์ต้องมีวิทย์ 7-12 หน่วยกิตตามสาขา · ต้องมีคะแนน TGAT",
        gated: false,
        portfolio: "ไม่ระบุในแหล่งข้อมูล",
        scoring: "TGAT จัดลำดับเข้าสัมภาษณ์",
        apply: "23 ธ.ค. 69-11 ก.พ. 70",
      },
      {
        name: "BBA นานาชาติ · Best Performance Students",
        seats: "20 คน",
        refCycle: "TCAS69",
        gpax: "2.75 · อังกฤษ 2.75",
        requirement: "ไม่บังคับรางวัล · แนบผล TOEFL/IELTS ถ้ามี",
        gated: false,
        portfolio: "อัปโหลดเกียรติบัตร (ถ้ามี) + ผลการเรียน",
        scoring: "GPAX + เอกสาร คัดเข้าสัมภาษณ์",
        apply: "ปี 70 ยังไม่ประกาศ (ปี 69 1-22 ธ.ค. 68)",
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
        name: "ศักยภาพพิเศษสูงด้านการเป็นผู้ประกอบการ",
        seats: "25 คน",
        gpax: "3.50",
        requirement: "รางวัลแผนธุรกิจ/สตาร์ทอัพ, ทำสตาร์ทอัพจริง หรือร่วมแข่งธุรกิจระดับภูมิภาคขึ้นไป + IELTS 5.5/TOEFL iBT 71",
        gated: true,
        portfolio: "TCASFolio ≤10 หน้า · หลักฐานผลงาน ≤6 หน้า",
        scoring: "พอร์ต 60 + สัมภาษณ์ 40",
        apply: CMU_APPLY,
      },
      {
        name: "ศักยภาพผู้นำทางธุรกิจและสังคม",
        seats: "30 คน",
        gpax: "3.25",
        requirement: "1 อย่าง: ประธานนักเรียน, หัวหน้าชมรม 1,000 คน+, รางวัลผู้นำระดับชาติ, รางวัลแผนธุรกิจระดับจังหวัด+ หรือผู้ติดตาม 30,000",
        gated: true,
        portfolio: "TCASFolio ≤10 หน้า · ผลงานเด่น 3 เรื่อง เรื่องละ 1 หน้า",
        scoring: "พอร์ต 60 + สัมภาษณ์ 40",
        apply: CMU_APPLY,
      },
    ],
  },
  {
    key: "mu",
    nameTh: "มหิดล",
    nameEn: "MAHIDOL",
    source: "tcas.mahidol.ac.th",
    projects: [
      {
        name: "Portfolio 1/1 (วิทยาเขตกาญจนบุรี)",
        seats: "20 คน",
        gpax: "3.50 · คณิต อังกฤษ 2.80",
        requirement: "ไม่บังคับรางวัล · ต้องเข้า 1 ใน 2: ภาวะผู้นำ จิตสาธารณะ หรือสนใจหรือมีประสบการณ์ธุรกิจ",
        gated: false,
        portfolio: "ไม่เกิน 10 หน้า · เรียงความ 1 หน้า + จดหมายรับรองจากครู",
        scoring: "GPAX 25 + GPA 25 + พอร์ต 20 + สัมภาษณ์ 30",
        apply: "17 ส.ค.-10 ก.ย. 69 · ถ้าไม่เต็มเปิดรอบ 1/2 15 ธ.ค. 69-15 ม.ค. 70",
        applyClosed: true,
      },
    ],
  },
  {
    key: "kmutnb",
    nameTh: "พระนครเหนือ",
    nameEn: "KMUTNB",
    source: "admission.kmutnb.ac.th",
    projects: [
      {
        name: "โควตาเรียนดี · คณะพัฒนาธุรกิจและอุตสาหกรรม",
        seats: "70 คน ตามประกาศคณะ (mytcas แสดง 140)",
        gpax: "2.75 (4 ภาคเรียน)",
        requirement: "ไม่บังคับรางวัล · ม.6 ทุกแผนการเรียน",
        gated: false,
        portfolio: "นำพอร์ตมาวันสัมภาษณ์ (ใช้ประเมิน)",
        scoring: "พอร์ต + เกรด + สัมภาษณ์ · ไม่ระบุสัดส่วน",
        apply: "1 ก.ย.-10 พ.ย. 69 · รอบสอง 1 ธ.ค. 69-12 ม.ค. 70",
      },
      {
        name: "โควตาเรียนดี · BBA วิทยาลัยนานาชาติ (2 สาขา)",
        seats: "55 คน (40 + 15) · รอบสองอีก 50 คน",
        gpax: "3.00",
        requirement: "ไม่บังคับรางวัล · ผลสอบอังกฤษไม่บังคับ (เกณฑ์ เช่น IELTS 5.5, TOEFL iBT 62)",
        gated: false,
        portfolio: "พอร์ตภาษาอังกฤษ + SOP อังกฤษ 500 คำขึ้นไป",
        scoring: "สัมภาษณ์ภาษาอังกฤษ · ไม่ระบุสัดส่วน",
        apply: "14 ก.ย.-7 พ.ย. 69 · รอบสอง 9 พ.ย. 69-14 ม.ค. 70",
      },
    ],
  },
  {
    key: "kku",
    nameTh: "ขอนแก่น",
    nameEn: "KKU",
    source: "admissions.kku.ac.th",
    projects: [
      {
        name: "ผู้มีศักยภาพสูง (6 สาขา)",
        seats: "216 คน รวมทุกสาขา (มีกลุ่มเรียนภาษาอังกฤษ)",
        gpax: "3.00-3.50 ตามเงื่อนไข",
        requirement: "GPAX 3.50 + รางวัล/เกียรติบัตรระดับจังหวัดขึ้นไป หรือ GPAX 3.00 + ผ่านค่าย KKBS หรือเรียน KKBS Pre-B ได้ B",
        gated: true,
        portfolio: "พอร์ตคิด 50% · บางสาขาให้เขียนเรียงความ",
        scoring: "พอร์ต 50 + สัมภาษณ์ 50 · 8-9 ธ.ค. 69",
        apply: KKU_APPLY,
      },
      {
        name: "BBA นานาชาติ · วิทยาลัยนานาชาติ (3 วิชาเอก)",
        seats: "36 คน (เอกละ 12)",
        gpax: "3.00 · อังกฤษ คณิต 3.00",
        requirement: "ไม่บังคับรางวัล · พอร์ตและสัมภาษณ์เป็นภาษาอังกฤษ",
        gated: false,
        portfolio: "E-Portfolio ภาษาอังกฤษ ≤10 หน้า · มี essay",
        scoring: "พอร์ต 50 ต้องผ่าน 30% · สัมภาษณ์อังกฤษต้องผ่าน 30%",
        apply: KKU_APPLY,
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
        name: "BBA Global Business Management (นานาชาติ) 1.2",
        seats: "15 คน",
        gpax: "3.00",
        requirement: "ต้องมีผลสอบอังกฤษ 1 อย่าง: IELTS 5.5, TOEFL iBT 65, TOEIC 785, CU-TEP 70, SWU-SET 78 หรือ CEFR B2",
        gated: false,
        portfolio: "TCASFolio เท่านั้น ≤10 หน้า · ผลงานดีสุด ≤10 ชิ้น",
        scoring: "อังกฤษ 40 + GPAX 30 + ผลงาน 30 · มีสัมภาษณ์",
        apply: "1-16 ธ.ค. 69",
      },
    ],
  },
];

/** What they have in common, for a student building a portfolio. */
export const TCAS_BBA_TAKEAWAYS: TcasTakeaway[] = [
  {
    en: "English Score First",
    icon: "screen",
    title: "นานาชาติต้องมีผลสอบอังกฤษ",
    body: "จุฬาฯ ขอ TOEFL 79 หรือ IELTS 6.5 พร้อม SAT หรือ CU-AAT ม.เกษตรขอ IELTS 6.0 มศว ขอ IELTS 5.5 ธรรมศาสตร์ (ปี 69) ขอ SAT 1,280 กับ IELTS 6.0 วางแผนสอบก่อนเปิดรับ",
  },
  {
    en: "Tests Can Replace Trophies",
    icon: "chart",
    title: "คะแนนสอบแทนรางวัลได้",
    body: "ธรรมศาสตร์ภาคไทยจัดอันดับด้วย FORWARD หรือ SAT 100% จุฬาฯ ภาคไทยใช้ SAT หรือ CU-AAT แทนค่าย สอวน. ได้ ม.อ. ใช้ TGAT จัดลำดับเข้าสัมภาษณ์",
  },
  {
    en: "Real Business Counts",
    icon: "rocket",
    title: "ธุรกิจที่ทำจริงคือผลงาน",
    body: "เชียงใหม่รับหลักฐานการทำสตาร์ทอัพจริงหรือรางวัลแผนธุรกิจ ลาดกระบังนับผลงานทำธุรกิจจริงเป็นเกณฑ์ให้คะแนน ม.เกษตรนับผลงานประกวดด้านธุรกิจหรือ SDGs จากเวทีภายนอก",
  },
  {
    en: "Leaders Welcome",
    icon: "crew",
    title: "ภาวะผู้นำก็เป็นใบเบิกทาง",
    body: "โครงการผู้นำของเชียงใหม่รับประธานนักเรียน หัวหน้าชมรมใหญ่ หรือผู้ติดตามออนไลน์ 30,000 คน จุฬาฯ ภาคไทยให้คะแนนภาวะผู้นำ 20 จาก 100 ในการสัมภาษณ์",
  },
  {
    en: "Short and Sharp",
    icon: "portfolio",
    title: "พอร์ตสั้น เลือกชิ้นเด่น",
    body: "ม.เกษตร ธรรมศาสตร์ เชียงใหม่ มหิดล มศว จำกัด 10 หน้า เชียงใหม่ให้เลือกผลงานเด่น 3 เรื่อง เรื่องละ 1 หน้า มศว ให้เลือกผลงานดีที่สุดไม่เกิน 10 ชิ้น",
  },
  {
    en: "Interview in English",
    icon: "question",
    title: "ฝึกสัมภาษณ์ภาษาอังกฤษ",
    body: "BBA นานาชาติของจุฬาฯ ม.เกษตร ลาดกระบัง ขอนแก่น และพระนครเหนือสัมภาษณ์เป็นภาษาอังกฤษ ลาดกระบังให้น้ำหนัก 70% ม.เกษตรภาคไทยก็มีสัมภาษณ์เชิงวิชาการและภาษาอังกฤษ 30%",
  },
];

/** Key dates on one line, oldest first. */
export const TCAS_BBA_DATES: TcasDate[] = [
  { date: "10 ก.ย. 69", label: "มหิดล ปิดรอบ 1/1 แล้ว", done: true },
  { date: "14 ต.ค. 69", label: "ม.เกษตร ปิดรับแล้ว", done: true },
  { date: "2 พ.ย. 69", label: "ขอนแก่น ปิดรับ" },
  { date: "5 พ.ย. 69", label: "เชียงใหม่ ปิดรับ" },
  { date: "7 พ.ย. 69", label: "พระนครเหนือ นานาชาติ ปิดรับ" },
  { date: "12 พ.ย. 69", label: "จุฬาฯ ภาคไทย ปิดรับ" },
  { date: "16 ธ.ค. 69", label: "ธรรมศาสตร์ มศว ปิดรับ" },
  { date: "25 ธ.ค. 69", label: "จุฬาฯ นานาชาติ ปิดรับ" },
  { date: "22 ม.ค. 70", label: "ลาดกระบัง ภาคไทย ปิดรับ" },
  { date: "28 ม.ค. 70", label: "ลาดกระบัง นานาชาติ ปิดรอบสุดท้าย" },
  { date: "11 ก.พ. 70", label: "ม.อ. ผลการเรียนดี ปิดรับ" },
];

export const TCAS_BBA_SOURCES = [
  "admission.chula.ac.th",
  "bba.acc.chula.ac.th",
  "admission.reg.kmitl.ac.th",
  "admission.ku.ac.th",
  "tuadmissions.in.th",
  "bba.tbs.tu.ac.th",
  "admission.psu.ac.th",
  "admission.reg.cmu.ac.th",
  "tcas.mahidol.ac.th",
  "admission.kmutnb.ac.th",
  "admissions.kku.ac.th",
  "admission.swu.ac.th",
  "course.mytcas.com",
];

/**
 * Published outcomes only. Most faculties publish no Round 1 scores; projects
 * without data are listed in TCAS_BBA_NO_DATA instead of guessed.
 */
export const TCAS_BBA_REALITY: TcasReality[] = [
  {
    uni: "จุฬาฯ",
    project: "BBA นานาชาติ · Early Admission",
    min: "SAT 1,270",
    actual: "คนที่ติด ปี 68: SAT ต่ำสุด 1,440 · เฉลี่ย 1,480 · สูงสุด 1,560",
    source: "chula.ac.th/en/news/218802",
  },
  {
    uni: "ธรรมศาสตร์",
    project: "BBA นานาชาติ",
    min: "SAT 1,280",
    actual: "คนที่ติด ปี 69: SAT ต่ำสุด 1,350 · เฉลี่ย ~1,400 · สูงสุด 1,500",
    note: "ต่ำสุดขึ้นทุกปี 1,280 → 1,320 → 1,350 · รวมทุกรอบ",
    source: "bba.tbs.tu.ac.th · Admissions Statistics",
  },
  {
    uni: "ธรรมศาสตร์",
    project: "Portfolio บธ.บ. ภาคไทย",
    min: "FORWARD หรือ SAT",
    actual: "ปี 70 ณ 29 ต.ค. สมัครแล้ว: รังสิต 324/100 ที่ · ท่าพระจันทร์ 133/30 ที่",
    note: "ยังเปิดรับถึง 16 ธ.ค. ตัวเลขจะเพิ่มอีก",
    source: "tuadmissions.in.th/faculty",
  },
  {
    uni: "พระนครเหนือ",
    project: "โควตาเรียนดี · คณะพัฒนาธุรกิจฯ",
    min: "GPAX 2.75",
    actual: "ปี 69 ครั้งที่ 1: สมัคร 193 และ 179 คน ต่อสาขาละ 40 ที่",
    note: "ราว 5 คนแย่ง 1 ที่ เกรดถึงขั้นต่ำอย่างเดียวไม่พอ",
    source: "stdadmis2.kmutnb.ac.th/Information/ApplicantSummary",
  },
  {
    uni: "เกษตรฯ",
    project: "BBA นานาชาติ 1.1",
    min: "IELTS 6.0",
    actual: "ปี 69 ยืนยันสิทธิ์ 69 จาก 100 ที่ · ปี 69 คะแนนอังกฤษคิด 60%",
    note: "นับจากรายชื่อยืนยันสิทธิ์ · ด่านจริงคือคะแนนอังกฤษและสัมภาษณ์",
    source: "admission.ku.ac.th/media/announcements/2026/03/12/69-TCAS1-Clearinghouse.pdf",
  },
];

export const TCAS_BBA_NO_DATA =
  "ไม่พบข้อมูลคะแนนคนที่ติดที่เผยแพร่: จุฬาฯ ภาคไทยและ NextGen · ลาดกระบัง · ม.อ. · เชียงใหม่ · มหิดล · ขอนแก่น · มศว";

export const TCAS_BBA_SOURCE_LINKS: TcasSourceLink[] = [
  { uni: "จุฬาฯ", links: ["admission.chula.ac.th/upload/adm_announce/file_372_1_3050.pdf", "bba.acc.chula.ac.th/early-admission (Early Admission และ NextGen)"] },
  {
    uni: "ลาดกระบัง",
    links: [
      "reg.kmitl.ac.th/TCAS/news/files/2570_1_news1_4680_2026_10_27-10-18-04_d9647.pdf (ภาคไทย)",
      "reg.kmitl.ac.th/TCAS/news/files/2570_1_news1_4649_2026_09_09-10-07-33_17e3e.pdf (BBA)",
      "reg.kmitl.ac.th/TCAS/news/files/2570_1_news1_4641_2026_09_15-11-34-40_abea3.pdf (Global Entrepreneurship)",
    ],
  },
  {
    uni: "เกษตรฯ",
    links: [
      "admission.ku.ac.th/media/announcements/2026/10/07/70_TCAS1_White_Elephant_1.1.pdf",
      "admission.ku.ac.th/media/announcements/2026/09/16/70-TCAS1-International_Program_1.1.pdf",
    ],
  },
  { uni: "ธรรมศาสตร์", links: ["tuadmissions.in.th/img/2026092206261193.pdf (ภาคไทย)", "bba.tbs.tu.ac.th/upload/BBAAdmissions2026.pdf (นานาชาติ ปี 69)"] },
  {
    uni: "ม.อ.",
    links: [
      "admission.psu.ac.th/project/announcements/96ce3814-a2d8-45eb-b00f-eb9e2b16778f/academic-excellence-admission-project_r1-3.pdf",
      "admission.psu.ac.th/2569/pdf/071_Best_Performance_Students_BBA_r1-2&r2.pdf (ปี 69)",
    ],
  },
  { uni: "เชียงใหม่", links: ["admission.reg.cmu.ac.th/tcas/findfacultybyid.php?fid=1748 และ fid=1747"] },
  { uni: "มหิดล", links: ["tcas.mahidol.ac.th/qualified/Portfolio1-1/KA_BusinessAdministration.pdf"] },
  {
    uni: "พระนครเหนือ",
    links: ["admission.kmutnb.ac.th/sites/default/files/2026-08/16QuotaGdTCAS1-r1.pdf", "admission.kmutnb.ac.th/sites/default/files/2026-09/15TCAS1-1.pdf"],
  },
  {
    uni: "ขอนแก่น",
    links: ["registrar.kku.ac.th/apply/files/6fedd8a4-7363-4245-9a3e-efbfd161979e.pdf", "registrar.kku.ac.th/apply/files/2b8d9812-5521-4681-ae68-47f97e0000a0.pdf"],
  },
  { uni: "มศว", links: ["admission.swu.ac.th/file_staff_upload/file_news/1720260925041014.pdf"] },
  { uni: "ทุกที่", links: ["course.mytcas.com (จำนวนรับและโครงการ)"] },
];

export const TCAS_BBA_POSTER: TcasPosterData = {
  key: "bba",
  fieldEn: "BUSINESS ADMINISTRATION",
  coverTitle: ["บริหารธุรกิจ + BBA", "รอบ 1 Portfolio"],
  tableTitle: "บริหารธุรกิจ รอบ 1 ต้องมีอะไร",
  scope: "หลักสูตรภาษาไทยและนานาชาติ",
  skipped: "ไม่รวมโควตาเฉพาะกลุ่ม เช่น นักกีฬา ศิลปะ ทายาทธุรกิจ บุตรบุคลากร",
  gateLegend: "ช่องสีส้ม = ต้องมีผลงาน รางวัล หรือตำแหน่งที่กำหนดก่อนถึงจะสมัครได้",
  notes: ["บางมดและสุรนารีไม่มีหลักสูตร บธ.บ. ในระบบ TCAS · บธ.บ. ของมหิดลในระบบ TCAS เปิดที่วิทยาเขตกาญจนบุรี"],
  asOf: TCAS_BBA_AS_OF,
  universities: TCAS_BBA_UNIVERSITIES,
  sheets: [
    ["cu", "kmitl"],
    ["ku", "tu", "psu"],
    ["cmu", "mu", "kmutnb", "kku", "swu"],
  ],
  takeaways: TCAS_BBA_TAKEAWAYS,
  dates: TCAS_BBA_DATES,
  sources: TCAS_BBA_SOURCES,
  reality: TCAS_BBA_REALITY,
  realityGap: TCAS_BBA_NO_DATA,
  sourceLinks: TCAS_BBA_SOURCE_LINKS,
};
