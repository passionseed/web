/**
 * TCAS70 (entry 2570) Round 1 Portfolio requirements for Computer Science
 * (วท.บ. วิทยาการคอมพิวเตอร์), Thai regular programs on the main campus first,
 * one entry per project (โครงการ) or entry track. Collected 20 Oct 2569 from
 * each faculty's own announcement, cross-checked with course.mytcas.com.
 * KMUTT's only CS program is the English program (SIT); KMUTNB's Portfolio
 * project is only open to its bilingual CS program. PSU Hat Yai had not
 * published its TCAS70 CS projects yet, so its rows use TCAS69 and carry
 * `refCycle`. Mahidol and SWU have no วิทยาการคอมพิวเตอร์ program in TCAS70
 * and are left out. Narrow quotas (sports, staff children, partner schools,
 * scholarship-only cohorts such as พสวท.) are left out. Re-check before reuse.
 */

import type { TcasDate, TcasPosterData, TcasTakeaway, TcasUniversity } from "./tcas70-poster";

export const TCAS_CS_AS_OF = "20 ต.ค. 2569";

const CU_APPLY = "3-12 พ.ย. 69";
const KMITL_SEATS = "25 คน/รอบ รวมทุกโครงการ";
const KMITL_FOLIO = "KMITL iFolio เท่านั้น";
const TU_APPLY = "14 ก.ย.-16 ธ.ค. 69";
const CMU_APPLY = "28 ต.ค.-5 พ.ย. 69";
const CMU_FOLIO = "ไม่เกิน 10 หน้า รวมปก จัดรูปแบบเองได้";
const CMU_SCORING = "พอร์ตคัดเข้าสัมภาษณ์ 19 ธ.ค. 69 · สัดส่วนไม่ระบุ";
const KMUTNB_APPLY = "1 ก.ย.-31 ต.ค. 69";
const KKU_APPLY = "15 ต.ค.-2 พ.ย. 69";
const KKU_FOLIO = "KKU E-Portfolio ไม่เกิน 10 หน้า + เรียงความ 1 หน้า";
const KKU_SCORING = "พอร์ต 70 + สัมภาษณ์ 30 · 9 ธ.ค. 69";

export const TCAS_CS_UNIVERSITIES: TcasUniversity[] = [
  {
    key: "cu",
    nameTh: "จุฬาฯ",
    nameEn: "CHULA",
    source: "admission.chula.ac.th",
    projects: [
      {
        name: "วิทย์ด้วยวิธีพิเศษ (วิทยาการคอมฯ)",
        seats: "40 คน",
        gpax: "2.50 · คณิต วิทย์ 2.50",
        requirement: "1 อย่าง: ค่าย 2 สอวน. คณิต ฟิสิกส์ คอมฯ, NSC/YSC ระดับประเทศ, Thailand ICT Awards, Super AI Lv.3, Cyber Top Talent ฯลฯ",
        gated: true,
        portfolio: "TCASFolio ข้อมูล + รางวัลตามเกณฑ์ · ต้องได้ 70/100",
        scoring: "พอร์ตคัดเข้าสัมภาษณ์ · สัมภาษณ์ผ่าน 70/100",
        apply: CU_APPLY,
      },
      {
        name: "พัฒนาอัจฉริยภาพฯ (JSTP)",
        seats: "25 คน รวม 17 สาขา",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "นักเรียน JSTP ของ สวทช., ผ่านแข่งโครงงานวิทย์ระดับชาติของสมาคมวิทยาศาสตร์ฯ หรือผู้แทน IYPT",
        gated: true,
        portfolio: "TCASFolio กิจกรรมคณิต วิทย์ หรือผลงานระดับชาติขึ้นไป",
        scoring: "สัมภาษณ์ 100% ต้องได้ 70/100",
        apply: CU_APPLY,
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
        name: "เรียนดี (1.1 / 1.2)",
        seats: KMITL_SEATS,
        gpax: "3.50 · คณิต วิทย์ 3.00",
        requirement: "ไม่บังคับรางวัล · แผนวิทย์-คณิต ศิลป์-คำนวณ หรือแผนเกี่ยวกับคอมฯ",
        gated: false,
        portfolio: KMITL_FOLIO,
        scoring: "พอร์ต 60 + สัมภาษณ์ 25 + เกรด 15",
        apply: "1.1 ปิด 30 ต.ค. 69 · 1.2 1 ธ.ค. 69-28 ม.ค. 70",
      },
      {
        name: "ความสามารถพิเศษทางวิทยาศาสตร์ (1.1 / 1.2)",
        seats: KMITL_SEATS,
        gpax: "2.75",
        requirement: "1 อย่าง: JSTP, ค่าย สสวท./สอวน., รางวัลวิชาการระดับจังหวัดขึ้นไป, รางวัลงานของวิทย์ สจล., เพชรยอดมงกุฎ",
        gated: true,
        portfolio: KMITL_FOLIO,
        scoring: "พอร์ต 75 + สัมภาษณ์ 25",
        apply: "1.1 ปิด 30 ต.ค. 69 · 1.2 1 ธ.ค. 69-28 ม.ค. 70",
      },
      {
        name: "นักพัฒนามืออาชีพ (1.2)",
        seats: KMITL_SEATS,
        gpax: "ไม่กำหนด (สายสามัญ)",
        requirement: "ผ่านอบรมโครงการนักพัฒนามืออาชีพของภาควิชาวิทยาการคอมฯ สจล. + เกียรติบัตร",
        gated: true,
        portfolio: KMITL_FOLIO,
        scoring: "พอร์ต 75 + สัมภาษณ์ 25",
        apply: "1 ธ.ค. 69-28 ม.ค. 70",
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
        name: "ช้างเผือก (1.1)",
        seats: "16 คน",
        gpax: "2.75",
        requirement: "ผลงานเขียนโปรแกรมที่ส่งประกวดหรือได้รางวัล · ต้องทำหลักอย่างน้อย 40% · บอกว่าใช้ AI ส่วนไหน",
        gated: true,
        portfolio: "ไม่เกิน 10 หน้า + คลิป 2 นาที อธิบายดีไซน์และ source code",
        scoring: "ผลงาน 80 + สัมภาษณ์ 20",
        apply: "18 ก.ย.-14 ต.ค. 69",
        applyClosed: true,
      },
      {
        name: "โอลิมปิกวิชาการ (1.1)",
        seats: "2 คน",
        gpax: "3.00",
        requirement: "ผ่านค่าย 2 สอวน. ขึ้นไป จากศูนย์ใดก็ได้",
        gated: true,
        portfolio: "ประวัติผลงานวิชาการ ไม่เกิน 10 หน้า",
        scoring: "สัมภาษณ์ 100%",
        apply: "18 ก.ย.-14 ต.ค. 69",
        applyClosed: true,
      },
      {
        name: "เรียนล่วงหน้า",
        seats: "5 คน",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "เรียนวิชาล่วงหน้าของ ม.เกษตร 1 วิชา (คณิต หรือแนวคิดการโปรแกรมเบื้องต้น) ได้ B ขึ้นไป",
        gated: false,
        portfolio: "ไม่ระบุในแหล่งข้อมูล",
        scoring: "เกรดวิชาล่วงหน้า + สัมภาษณ์",
        apply: "18 ก.ย.-18 ต.ค. 69",
        applyClosed: true,
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
        name: "Active Recruitment ครั้งที่ 2 / 3",
        seats: "5 + 3 คน",
        gpax: "3.00 · คณิต ภาษาต่างประเทศ 3.00",
        requirement: "ไม่บังคับรางวัล · หลักสูตรภาษาอังกฤษ · ใส่ผลงาน รางวัล กิจกรรมที่เกี่ยวกับสาขา",
        gated: false,
        portfolio: "ไม่เกิน 12 หน้า รวมปก · เกินให้ใช้ QR หรือลิงก์",
        scoring: "สัมภาษณ์ 50 + GPAX 25 + พอร์ต 25",
        apply: "27 ต.ค.-25 พ.ย. 69 · 15 ธ.ค. 69-18 ม.ค. 70",
      },
      {
        name: "คัดเลือกตรง ประเภทเรียนดี",
        seats: "2 คน",
        gpax: "3.25 · คณิต ภาษาต่างประเทศ 3.00",
        requirement: "ไม่บังคับรางวัล · หลักสูตรภาษาอังกฤษ · ใช้เกรดคัดเข้าสัมภาษณ์",
        gated: false,
        portfolio: "ไม่เกิน 12 หน้า",
        scoring: "เกรดคัดเข้าสัมภาษณ์ · สัมภาษณ์ 100%",
        apply: "17 ส.ค. 69-11 ม.ค. 70",
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
        name: "รับตรง Portfolio",
        seats: "20 คน",
        gpax: "3.00",
        requirement: "ไม่บังคับรางวัล แต่ต้องมีคะแนน TGAT และ TPAT3",
        gated: false,
        portfolio: "ไม่เกิน 10 หน้า · SOP + ตอบว่าชอบวิชา CS ไหน เพราะอะไร",
        scoring: "พอร์ต 50 + TGAT 35 + TPAT3 15 · ต้องผ่านสัมภาษณ์",
        apply: TU_APPLY,
      },
      {
        name: "ดีเด่นด้านวิชาการ กลุ่ม สอวน. (ค่าย 2)",
        seats: "ไม่เกิน 15 คน (รวมคณะ 30)",
        gpax: "3.00 · คณิต วิทย์ 3.00",
        requirement: "ผ่านค่าย 2 สอวน. สาขาใดก็ได้ใน 8 สาขา รวมคอมพิวเตอร์",
        gated: true,
        portfolio: "ไม่เกิน 10 หน้า · SOP + ผลงาน รางวัลคณิต วิทย์",
        scoring: "พอร์ต + สัมภาษณ์ 5-7 ก.พ. 70",
        apply: TU_APPLY,
      },
      {
        name: "ดีเด่นด้านวิชาการ กลุ่ม สสวท.",
        seats: "7 คน รวมทุกสาขาของคณะ",
        gpax: "3.00 · คณิต วิทย์ 3.00",
        requirement: "ได้รับคัดเลือกจาก สอวน. เข้าอบรมคัดเลือกครั้งที่ 1 ของ สสวท.",
        gated: true,
        portfolio: "ไม่เกิน 10 หน้า + หนังสือรับรองจาก สอวน.",
        scoring: "พอร์ต + สัมภาษณ์ 5-7 ก.พ. 70",
        apply: TU_APPLY,
      },
    ],
  },
  {
    key: "psu",
    nameTh: "ม.อ.",
    nameEn: "PSU",
    refCycle: "TCAS69",
    source: "admission.psu.ac.th",
    projects: [
      {
        name: "ผลการเรียนดี",
        seats: "48 คน (ปี 69)",
        gpax: "2.75 · วิทย์ คณิต 2.50",
        requirement: "ไม่บังคับรางวัล แต่ต้องมีคะแนน TGAT",
        gated: false,
        portfolio: "ไม่เกิน 10 หน้า ตามแบบฟอร์ม ม.อ.",
        scoring: "TGAT จัดลำดับเข้าสัมภาษณ์",
        apply: "ปี 70 ยังไม่ประกาศ (ปี 69 1 ธ.ค. 68-27 ม.ค. 69)",
        refCycle: "TCAS69",
      },
      {
        name: "Sci Seed สานฝัน คนพันธุ์วิทย์",
        seats: "35 คน (ปี 69)",
        gpax: "2.75 · วิทย์ คณิต 2.50",
        requirement: "ไม่บังคับรางวัล · นักเรียนโรงเรียนหรือห้องเรียนวิทย์ใช้ GPAX 2.50",
        gated: false,
        portfolio: "แบบฟอร์ม ม.อ. หรือ TCASFolio + หนังสือรับรองความประพฤติ",
        scoring: "GPAX และหลักฐานคัดเข้าสัมภาษณ์ออนไลน์",
        apply: "ปี 70 ยังไม่ประกาศ (ปี 69 1 ต.ค.-6 พ.ย. 68)",
        refCycle: "TCAS69",
      },
    ],
  },
  {
    key: "cmu",
    nameTh: "เชียงใหม่",
    nameEn: "CMU",
    source: "tcas.science.cmu.ac.th",
    projects: [
      {
        name: "ความสามารถพิเศษทางวิทยาศาสตร์และเทคโนโลยี",
        seats: "10 คน",
        gpax: "3.00 · วิทย์ คณิต 3.00",
        requirement: "1 อย่าง: ห้องเรียนพิเศษคอมฯ หรือ วมว., เข้ารอบสุดท้าย NSC/YSC, รางวัล CSCMU Coding Challenge, กิจกรรมภาค CS มช.",
        gated: true,
        portfolio: CMU_FOLIO,
        scoring: CMU_SCORING,
        apply: CMU_APPLY,
      },
      {
        name: "ค่ายโอลิมปิกวิชาการ",
        seats: "4 คน",
        gpax: "3.00",
        requirement: "ผ่านค่าย 1 สอวน. ศูนย์ใดก็ได้ หรือเคยเป็นผู้แทนประเทศในค่ายหรือการแข่งขันโอลิมปิก",
        gated: true,
        portfolio: CMU_FOLIO,
        scoring: CMU_SCORING,
        apply: CMU_APPLY,
      },
      {
        name: "สานฝันปั้นนักวิทยาศาสตร์",
        seats: "5 คน",
        gpax: "2.75",
        requirement: "1 อย่าง: ค่ายวิทย์ของ มช. สสวท. สวทช. ฯลฯ หรือรางวัลโครงงาน เขียนโปรแกรม หุ่นยนต์ ระดับภูมิภาคขึ้นไป",
        gated: true,
        portfolio: CMU_FOLIO,
        scoring: CMU_SCORING,
        apply: CMU_APPLY,
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
        name: "โควตาโอลิมปิกวิชาการ",
        seats: "2 คน",
        gpax: "3.50",
        requirement: "มีเกียรติบัตรเข้าค่ายโอลิมปิกวิชาการ สอวน.",
        gated: true,
        portfolio: "มีพอร์ต · จำนวนหน้าไม่ระบุในแหล่งข้อมูล",
        scoring: "เกรด + เกียรติบัตรค่าย + สัมภาษณ์ 28 พ.ย. 69",
        apply: KMUTNB_APPLY,
      },
      {
        name: "โควตา Portfolio (หลักสูตรสองภาษา)",
        seats: "10 คน",
        gpax: "3.50",
        requirement: "ไม่บังคับรางวัล · เฉพาะหลักสูตรสองภาษา ค่าเทอม 45,000 บาท",
        gated: false,
        portfolio: "ไม่เกิน 10 หน้า (ตาม mytcas)",
        scoring: "เกรด + พอร์ต + สัมภาษณ์ 28 พ.ย. 69",
        apply: KMUTNB_APPLY,
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
        name: "ผู้มีศักยภาพด้านคอมพิวเตอร์",
        seats: "16 คน",
        gpax: "2.75",
        requirement: "ไม่บังคับรางวัล: หลักฐาน 1 อย่าง เช่น เกียรติบัตรเรียนดี, อบรมวิชาการ, เข้าร่วมแข่งขันคอมฯ, ค่าย Coding",
        gated: false,
        portfolio: KKU_FOLIO,
        scoring: KKU_SCORING,
        apply: KKU_APPLY,
      },
      {
        name: "ทุนผู้มีความสามารถดีเด่นด้านคอมฯ และไอที",
        seats: "2 คน (ทุนค่าเทอม 4 ปี)",
        gpax: "2.75 · คณิต วิทย์ 2.75",
        requirement: "รางวัลใน 5 ปี เช่น รอบ 2 คอมพิวเตอร์โอลิมปิก สอวน., NSC ระดับประเทศ, Computing Fair",
        gated: true,
        portfolio: KKU_FOLIO,
        scoring: KKU_SCORING,
        apply: KKU_APPLY,
      },
    ],
  },
  {
    key: "sut",
    nameTh: "สุรนารี",
    nameEn: "SUT",
    source: "sutgateway.sut.ac.th",
    projects: [
      {
        name: "สำนักวิชาวิทยาศาสตร์ (วิทยาการคอมฯ)",
        seats: "30 คน",
        gpax: "3.00 · คณิต วิทย์ ภาษาต่างประเทศ 3.00",
        requirement: "1 อย่าง: ห้องเรียนเน้นวิทย์หรือ วมว. (มีหนังสือรับรอง), รางวัลวิชาการ/โครงงาน, TSAM AP-Test ระดับ B, ค่าย สอวน.",
        gated: false,
        portfolio: "TCASFolio · เรียงความเป้าหมาย ไม่เกิน 500 ตัวอักษร",
        scoring: "คัดจาก GPAX และอื่นๆ + สัมภาษณ์ 17 ต.ค. 69",
        apply: "17 ส.ค.-21 ก.ย. 69 (ขยายแล้ว)",
        applyClosed: true,
      },
    ],
  },
];

/** What they have in common, for a student building a portfolio project. */
export const TCAS_CS_TAKEAWAYS: TcasTakeaway[] = [
  {
    en: "Award = Ticket",
    icon: "trophy",
    title: "รางวัลหรือค่ายคือบัตรผ่าน",
    body: "ทุกโครงการของจุฬาฯ และเชียงใหม่ต้องมีรางวัลหรือค่ายก่อนสมัคร จุฬาฯ นับ NSC, YSC, Thailand ICT Awards, Super AI Engineer, Cyber Top Talent เชียงใหม่แค่เข้ารอบสุดท้าย NSC ก็นับ",
  },
  {
    en: "No Award? Still Open",
    icon: "sprout",
    title: "ไม่มีรางวัลก็ยังมีทาง",
    body: "เรียนดี ลาดกระบัง, รับตรง ธรรมศาสตร์, Active Recruitment บางมด, ผู้มีศักยภาพฯ ขอนแก่น และ Portfolio สองภาษา พระนครเหนือ ไม่บังคับรางวัล ขอนแก่นรับแค่เคยอบรมหรือเข้าร่วมแข่งคอมฯ",
  },
  {
    en: "Show the Code",
    icon: "screen",
    title: "โชว์โค้ดที่เขียนเอง",
    body: "ช้างเผือก ม.เกษตร ขอผลงานเขียนโปรแกรมที่ส่งประกวด ต้องเป็นคนทำหลักอย่างน้อย 40% บอกว่าใช้ AI ส่วนไหน และทำคลิปไม่เกิน 2 นาที อธิบายการออกแบบกับ source code ส่วนสำคัญ",
  },
  {
    en: "Why CS?",
    icon: "question",
    title: "ตอบให้ได้ว่าทำไมต้อง CS",
    body: "ธรรมศาสตร์ให้เขียน SOP และตอบว่าสนใจวิชา CS ไหนที่สุดเพราะอะไร ขอนแก่นขอเรียงความแนะนำตัว 1 หน้า สุรนารีขอเรียงความเป้าหมายไม่เกิน 500 ตัวอักษร",
  },
  {
    en: "Camps Count",
    icon: "spark",
    title: "ค่ายก็นับ",
    body: "พระนครเหนือขอแค่เกียรติบัตรค่าย สอวน. เชียงใหม่รับค่าย 1 สอวน. ม.เกษตรกับธรรมศาสตร์ขอค่าย 2 ลาดกระบังมีโครงการให้คนที่ผ่านอบรมนักพัฒนามืออาชีพของภาควิชาคอมฯ โดยตรง",
  },
  {
    en: "Portfolio Weighs Most",
    icon: "chart",
    title: "พอร์ตคือคะแนนก้อนใหญ่",
    body: "ช้างเผือก ม.เกษตร ให้ผลงาน 80% ความสามารถพิเศษ ลาดกระบัง 75% ขอนแก่น 70% ธรรมศาสตร์ 50% จุฬาฯ ต้องได้พอร์ต 70/100 ก่อนถึงจะได้สัมภาษณ์ ส่วนบางมดให้สัมภาษณ์ 50%",
  },
];

/** Key dates on one line, oldest first. */
export const TCAS_CS_DATES: TcasDate[] = [
  { date: "14 ต.ค. 69", label: "ม.เกษตร ช้างเผือก ปิดแล้ว", done: true },
  { date: "30 ต.ค. 69", label: "ลาดกระบัง 1.1 ปิดรับ" },
  { date: "31 ต.ค. 69", label: "พระนครเหนือ ปิดรับ" },
  { date: "2 พ.ย. 69", label: "ขอนแก่น ปิดรับ" },
  { date: "5 พ.ย. 69", label: "เชียงใหม่ ปิดรับ" },
  { date: "12 พ.ย. 69", label: "จุฬาฯ ปิดรับ" },
  { date: "25 พ.ย. 69", label: "บางมด AR ครั้งที่ 2 ปิดรับ" },
  { date: "16 ธ.ค. 69", label: "ธรรมศาสตร์ ปิดรับ" },
  { date: "28 ม.ค. 70", label: "ลาดกระบัง 1.2 ปิดรับ" },
];

export const TCAS_CS_SOURCES = [
  "admission.chula.ac.th",
  "admission.reg.kmitl.ac.th",
  "admission.ku.ac.th",
  "join.kmutt.ac.th",
  "tuadmissions.in.th",
  "admission.psu.ac.th",
  "tcas.science.cmu.ac.th",
  "admission.kmutnb.ac.th",
  "admissions.kku.ac.th",
  "sutgateway.sut.ac.th",
  "course.mytcas.com",
];

export const TCAS_CS_POSTER: TcasPosterData = {
  key: "comsci",
  fieldEn: "COMPUTER SCIENCE",
  coverTitle: ["วิทยาการคอมฯ", "รอบ 1 Portfolio"],
  tableTitle: "วิทยาการคอมฯ รอบ 1 ต้องมีอะไร",
  scope: "หลักสูตรภาษาไทย วิทยาเขตหลัก",
  skipped: "ไม่รวมโควตาเฉพาะกลุ่ม เช่น นักกีฬา บุตรบุคลากร โรงเรียนเครือข่าย ทุนเฉพาะกลุ่ม",
  gateLegend: "ช่องสีส้ม = ต้องมีรางวัล ค่าย หรือผลงานที่กำหนดก่อนถึงจะสมัครได้",
  notes: [
    "ไม่พบหลักสูตรวิทยาการคอมพิวเตอร์ของมหิดลและมศวใน mytcas · บางมดมีเฉพาะหลักสูตรภาษาอังกฤษ · พระนครเหนือรอบนี้เปิดเฉพาะหลักสูตรสองภาษา",
  ],
  asOf: TCAS_CS_AS_OF,
  universities: TCAS_CS_UNIVERSITIES,
  sheets: [
    ["cu", "kmitl", "ku"],
    ["kmutt", "tu", "psu", "cmu"],
    ["kmutnb", "kku", "sut"],
  ],
  takeaways: TCAS_CS_TAKEAWAYS,
  dates: TCAS_CS_DATES,
  sources: TCAS_CS_SOURCES,
};
