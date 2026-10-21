/**
 * TCAS70 (entry 2570) Round 1 Portfolio requirements for Computer Engineering
 * (Thai regular programs, main campus), one entry per project (โครงการ) or
 * entry track. Collected 19-20 Oct 2569 from each faculty's own announcement
 * or course.mytcas.com. Talent quotas that only fit a narrow group (sports,
 * arts, staff children, partner schools) are left out. Where a faculty had
 * not published its TCAS70 criteria yet (KMITL Engineering, PSU's
 * ผลการเรียนดี), the entry uses the TCAS69 announcement and carries
 * `refCycle`. Re-check before reusing for a later cycle.
 */

import type { TcasPosterData, TcasProject, TcasTakeaway, TcasUniversity } from "./tcas70-poster";

export const TCAS_CPE_AS_OF = "20 ต.ค. 2569";

export type TcasCpeProject = TcasProject;
export type TcasCpeUniversity = TcasUniversity;

const CU_APPLY = "3-12 พ.ย. 69";
const CU_SCORING = "พอร์ตคัดเข้าสัมภาษณ์ · สัมภาษณ์ผ่าน 70/100";
const CMU_APPLY = "ปิดพอร์ต 6 พ.ย. 69";
const KMITL_APPLY = "ปี 70 ยังไม่ประกาศ (ปี 69 ปิด 22 ธ.ค. 68)";
const KMITL_SEATS = "40 คนทั้งรอบ 1 ไม่แยกตามโครงการ (ปี 69)";

export const TCAS_CPE_UNIVERSITIES: TcasCpeUniversity[] = [
  {
    key: "cu",
    nameTh: "จุฬาฯ",
    nameEn: "CHULA",
    source: "admission.chula.ac.th",
    projects: [
      {
        name: "โอลิมปิกวิชาการ (วิศวะคอมฯ)",
        seats: "75 คน",
        gpax: "3.00",
        requirement: "เหรียญโอลิมปิก สอวน. ระดับชาติ, ค่ายผู้แทน สสวท., รางวัลจากภาควิชาคอมฯ จุฬาฯ หรือ paper IEEE/ACM",
        gated: true,
        portfolio: "TCASFolio · ต้องได้ 70/100",
        scoring: CU_SCORING,
        apply: CU_APPLY,
      },
      {
        name: "CEDT · สายโอลิมปิก",
        seats: "225 คน (รวม 2 สาย)",
        gpax: "3.00",
        requirement: "เหรียญโอลิมปิกระดับชาติ, ค่ายผู้แทน สสวท. (IOI, IMO ฯลฯ) หรือค่าย 2 สอวน. คอมฯ",
        gated: true,
        portfolio: "กิจกรรมวิชาการ 3 ปี + จิตอาสา พร้อมเกียรติบัตร",
        scoring: CU_SCORING,
        apply: CU_APPLY,
      },
      {
        name: "CEDT · สายรางวัลแข่งขัน",
        seats: "225 คน (รวม 2 สาย)",
        gpax: "3.00",
        requirement: "รางวัลตามรายการ เช่น NSC, YSC, CEDT Hackathon, Swift Student Challenge, AI Builders, Super AI Engineer, Samsung Solve for Tomorrow",
        gated: true,
        portfolio: "กิจกรรมวิชาการ 3 ปี + จิตอาสา พร้อมเกียรติบัตร",
        scoring: CU_SCORING,
        apply: CU_APPLY,
      },
    ],
  },
  {
    key: "kmitl",
    nameTh: "ลาดกระบัง",
    nameEn: "KMITL",
    refCycle: "TCAS69",
    source: "admission.reg.kmitl.ac.th",
    projects: [
      {
        name: "Engineering Top Talents",
        seats: KMITL_SEATS,
        gpax: "3.00",
        requirement: "รางวัลตามรายการ เช่น NSC, Thailand Cyber Top Talent, TICTA, YSC, Coding Thailand",
        gated: true,
        portfolio: "iFolio + ผลงานเด่น 1 ชิ้น",
        scoring: "ผลงาน 100% คัดเข้าสัมภาษณ์",
        apply: KMITL_APPLY,
      },
      {
        name: "K-Engineering Incubator",
        seats: KMITL_SEATS,
        gpax: "3.00",
        requirement: "ผ่านรอบ 2 ค่ายเตรียมวิศวกร \"วิศวกรรมคอมพิวเตอร์และปัญญาประดิษฐ์\" ของ สจล.",
        gated: true,
        portfolio: "iFolio + ผลค่าย 1 ชิ้น",
        scoring: "ผลค่าย 100% คัดเข้าสัมภาษณ์",
        apply: KMITL_APPLY,
      },
      {
        name: "ผลการทดสอบวัดความรู้ทางวิชาการ",
        seats: KMITL_SEATS,
        gpax: "3.00",
        requirement: "ไม่บังคับรางวัล แต่ต้องมีคะแนน TGAT และ TPAT3",
        gated: false,
        portfolio: "iFolio + ผลงานเด่น 1 ชิ้น",
        scoring: "TPAT3 70 + TGAT 20 + ผลงาน 10",
        apply: KMITL_APPLY,
      },
      {
        name: "เรียนดี ช้างเผือก",
        seats: KMITL_SEATS,
        gpax: "3.00",
        requirement: "โรงเรียนจัดอันดับและเสนอชื่อ + ต้องมีคะแนน TGAT และ TPAT3",
        gated: false,
        portfolio: "iFolio + ผลงานเด่น 1 ชิ้น",
        scoring: "TPAT3 50 + อันดับโรงเรียน 25 + TGAT 15 + ผลงาน 10",
        apply: KMITL_APPLY,
      },
      {
        name: "K-Engineering Pathway",
        seats: "ไม่เกิน 5 คน อยู่ใน 40 คนของรอบ 1 (ปี 69)",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "เรียน Pre-Engineering School ของ สจล. เกรดรวม 6 วิชา 3.50 ขึ้นไป แต่ละวิชาไม่ต่ำกว่า C",
        gated: true,
        portfolio: "ส่งเกรดจาก Pre-Engineering School",
        scoring: "เกรด Pre-Engineering 100%",
        apply: KMITL_APPLY,
      },
      {
        name: "K-Engineering Pathway 3.0",
        seats: "5 คน แยกจาก 40 คน (mytcas ปี 70)",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "เรียน Pre-Engineering School ของ สจล. เกรดรวม 6 วิชา 3.00 ขึ้นไป + ต้องมีคะแนน TGAT และ TPAT3",
        gated: true,
        portfolio: "ส่งเกรดจาก Pre-Engineering School",
        scoring: "เกรด Pre-Engineering 70 + TPAT3 20 + TGAT 10",
        apply: "ปี 70 ยังไม่ประกาศ (ปี 69 ปิด 20 ม.ค. 69 และยังไม่รวมวิศวะคอมฯ)",
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
        seats: "20 คน",
        gpax: "2.50",
        requirement: "ไม่บังคับรางวัล: ผลงานคอมฯ ชัดเจน เช่น เขียนโปรแกรม ซอฟต์แวร์ ฮาร์ดแวร์ ถ้าแข่งต้องระดับประเทศขึ้นไป",
        gated: false,
        portfolio: "ไม่เกิน 10 หน้า A4 + ผลงานที่ภูมิใจที่สุด",
        scoring: "ผลงาน 50 + สัมภาษณ์ 50",
        apply: "18 ก.ย.-14 ต.ค. 69",
        applyClosed: true,
      },
      {
        name: "โอลิมปิกวิชาการ (1.2)",
        seats: "สอวน. 5 + สสวท. 5 คน",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "ผ่านค่าย 2 สอวน. ขึ้นไป หรือค่ายโอลิมปิกระดับประเทศของ สสวท.",
        gated: true,
        portfolio: "ไม่เกิน 10 หน้า",
        scoring: "พอร์ต 50 + สัมภาษณ์ 50",
        apply: "4 ม.ค.-4 ก.พ. 70",
      },
      {
        name: "เรียนล่วงหน้า",
        seats: "5 คน",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "เรียนวิชาล่วงหน้าของ ม.เกษตร 2 วิชา เฉลี่ย B+ ขึ้นไป",
        gated: false,
        portfolio: "ไม่ระบุในแหล่งข้อมูล",
        scoring: "เกรดวิชาล่วงหน้า + สัมภาษณ์",
        apply: "ปิด 18 ต.ค. 69",
        applyClosed: true,
      },
    ],
  },
  {
    key: "kmutt",
    nameTh: "บางมด",
    nameEn: "KMUTT",
    source: "course.mytcas.com",
    projects: [
      {
        name: "คัดเลือกตรง ประเภทเรียนดี",
        seats: "9 คน",
        gpax: "3.00 · วิทย์ คณิต 3.00 · อังกฤษ 2.75",
        requirement: "ไม่บังคับรางวัล ใส่ผลงานและกิจกรรมที่เกี่ยวกับสาขา",
        gated: false,
        portfolio: "ไม่เกิน 12 หน้า",
        scoring: "สัมภาษณ์ 80 + พอร์ต 20",
        apply: "ไม่ระบุในแหล่งข้อมูล",
      },
      {
        name: "Active Recruitment",
        seats: "4 คน",
        gpax: "3.00 · วิทย์ คณิต อังกฤษ 3.00",
        requirement: "รางวัลระดับชาติหรือนานาชาติ ด้านวิศวกรรม หรือวิทยาศาสตร์และเทคโนโลยี",
        gated: true,
        portfolio: "ไม่เกิน 12 หน้า + เล่าโปรเจกต์ที่ภูมิใจที่สุด 1 หน้า A4",
        scoring: "มีสัมภาษณ์ · สัดส่วนไม่ระบุ",
        apply: "ไม่ระบุในแหล่งข้อมูล",
      },
    ],
  },
  {
    key: "tu",
    nameTh: "ธรรมศาสตร์",
    nameEn: "THAMMASAT",
    source: "admission.engr.tu.ac.th",
    projects: [
      {
        name: "Portfolio",
        seats: "20 คน",
        gpax: "3.00",
        requirement: "ไม่บังคับรางวัล",
        gated: false,
        portfolio: "ไม่เกิน 10 หน้า · ถ้ามีรางวัล อธิบายบทบาทของเรา",
        scoring: "พอร์ต 40 + TPAT3 40 + สัมภาษณ์ 20",
        apply: "14 ก.ย.-16 ธ.ค. 69",
      },
      {
        name: "ความสามารถดีเด่นด้านวิชาการ กลุ่ม สสวท.",
        seats: "4 คน",
        gpax: "3.00",
        requirement: "ได้รับคัดเลือกจาก สอวน. เข้าอบรมคัดเลือกครั้งที่ 1 ของ สสวท.",
        gated: true,
        portfolio: "ไม่เกิน 10 หน้า",
        scoring: "พอร์ต 100%",
        apply: "ปิด 16 ธ.ค. 69",
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
        name: "ดาวรุ่งคอมพิวเตอร์ (1/2)",
        seats: "40 คน",
        gpax: "2.50 · วิทย์ 2.75 · คณิต อังกฤษ 2.50",
        requirement: "เกียรติบัตรแข่งขันคอมฯ แค่ผ่านเข้ารอบก็ได้: NSC, YSC, ค่ายคอมพิวเตอร์โอลิมปิก, YECC, Robocode, JSTP, Thailand Cyber Top Talent ฯลฯ",
        gated: true,
        portfolio: "TCASFolio · เรียงความ 500 คำ · โครงงาน บทบาท ผลลัพธ์ + ลิงก์ผลงาน",
        scoring: "สัมภาษณ์ + หลักฐาน · 4 ธ.ค. 69",
        apply: "19 ต.ค.-19 พ.ย. 69",
      },
      {
        name: "ผลการเรียนดี",
        seats: "10 คน",
        refCycle: "TCAS69",
        gpax: "2.75 · วิทย์ คณิต อังกฤษ 2.75",
        requirement: "ไม่บังคับรางวัล",
        gated: false,
        portfolio: "ไม่เกิน 10 หน้า ตามแบบฟอร์ม ม.อ.",
        scoring: "TGAT จัดลำดับเข้าสัมภาษณ์",
        apply: "ปี 70 ยังไม่ประกาศ (ปี 69 เปิด 1 ธ.ค. 68)",
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
        name: "อัจฉริยภาพทางคอมพิวเตอร์",
        seats: "27 + 3 คน (1.1 / 1.2)",
        gpax: "3.00 · คณิต ฟิสิกส์ 3.25 · อังกฤษ 3.00",
        requirement: "รางวัลระดับประเทศ: NSC, YDC.CS & YSC.EN หรือค่าย 2 สอวน.",
        gated: true,
        portfolio: "ไม่เกิน 15 หน้า + SOP 2 หน้า",
        scoring: "พอร์ต 80 + สัมภาษณ์ 20 · 1.2 เพิ่ม TGAT + TPAT3",
        apply: CMU_APPLY,
      },
      {
        name: "ผลการเรียนดีเด่น",
        seats: "22 + 3 คน (1.1 / 1.2)",
        gpax: "3.50 · คณิต 3.50 · ฟิสิกส์ 3.25 · อังกฤษ 3.00",
        requirement: "ไม่บังคับรางวัล ใช้เกรดเป็นเกณฑ์ (ใส่รางวัลในพอร์ตได้)",
        gated: false,
        portfolio: "ไม่เกิน 15 หน้า + SOP 2 หน้า",
        scoring: "พอร์ต 80 + สัมภาษณ์ 20 · 1.2 เพิ่ม TGAT + TPAT3",
        apply: CMU_APPLY,
      },
      {
        name: "ความรู้ ความสามารถทางวิศวกรรม",
        seats: "5 คน",
        gpax: "ไม่ระบุในแหล่งข้อมูล",
        requirement: "โรงเรียนในความร่วมมือเสนอชื่อ หรือผ่านคอร์ส Entaneer Academy ตามเกรดที่กำหนด",
        gated: false,
        portfolio: "ไม่เกิน 15 หน้า",
        scoring: "พอร์ต 80 + สัมภาษณ์ 20",
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
        name: "Portfolio รอบ 1/1",
        seats: "10 คน",
        gpax: "3.00 · ฟิสิกส์ คณิต อังกฤษ 3.00",
        requirement: "1 อย่าง: ค่าย สอวน./โอลิมปิก, เหรียญตัวแทนโรงเรียน, ผลงานหุ่นยนต์ ซอฟต์แวร์ หรือนวัตกรรม",
        gated: true,
        portfolio: "ไม่เกิน 10 หน้า",
        scoring: "GPAX 30 + GPA 40 + สัมภาษณ์ 30",
        apply: "17 ส.ค.-10 ก.ย. 69",
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
        name: "Portfolio (วิศวะคอมฯ เสริมทักษะภาษาอังกฤษ)",
        seats: "15 คน (ตารางสรุปในประกาศเขียน 10)",
        gpax: "3.50 · อังกฤษ ฟิสิกส์ คณิต 3.50",
        requirement: "ไม่บังคับรางวัล แต่รางวัลและเกียรติบัตรค่ายได้คะแนนเพิ่ม",
        gated: false,
        portfolio: "ประวัติ 1 หน้า + รางวัล + เกียรติบัตรค่าย",
        scoring: "เกรด 15 + รางวัลและค่าย 35 + สัมภาษณ์ 50",
        apply: "24 พ.ย. 69-5 ม.ค. 70",
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
        name: "ผู้มีศักยภาพสูง (1.1)",
        seats: "12 คน",
        gpax: "3.00 · คณิต ฟิสิกส์ อังกฤษ รวม 3.00",
        requirement: "ไม่บังคับรางวัล: มีผลงานหรือเคยร่วมโครงการวิชาการ วิทย์ คณิต คอมฯ ระดับจังหวัดขึ้นไป หรือผลสอบภาษา",
        gated: false,
        portfolio: "ให้คะแนนผลงานตามเกณฑ์ของคณะ",
        scoring: "พอร์ต 80 + เกรด 20 · สัมภาษณ์ 8 ธ.ค. 69",
        apply: "15 ต.ค.-2 พ.ย. 69",
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
        name: "วิศวะคอมฯ (เข้าตรงสาขา)",
        seats: "30 คน",
        gpax: "3.25 · คณิต วิทย์ อังกฤษ 3.25",
        requirement: "1 อย่าง: รางวัลชมเชยขึ้นไปจากแข่งขันวิชาการหรือ Hackathon คอมฯ ระดับภูมิภาคขึ้นไป, นักเรียน วมว. หรือค่าย 2 สอวน. คอมฯ",
        gated: true,
        portfolio: "TCASFolio ไม่เกิน 7 หน้า",
        scoring: "คัดจาก GPAX และอื่นๆ + สัมภาษณ์",
        apply: "17 ส.ค.-21 ก.ย. 69",
        applyClosed: true,
      },
      {
        name: "กลุ่มวิศวกรรมศาสตร์ (เลือกสาขาปี 2)",
        seats: "1,500 คน รวมทุกสาขา",
        gpax: "2.50 · คณิต วิทย์ อังกฤษ 2.75",
        requirement: "ไม่บังคับรางวัล",
        gated: false,
        portfolio: "TCASFolio ไม่เกิน 7 หน้า",
        scoring: "คัดจาก GPAX และอื่นๆ + สัมภาษณ์",
        apply: "17 ส.ค.-21 ก.ย. 69",
        applyClosed: true,
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
        name: "เด็กดีมีที่เรียน (1.2)",
        seats: "15 คน",
        gpax: "2.75",
        requirement: "1 อย่าง: ผ่านค่ายหรืออบรม, โครงงานวิจัย, รางวัลแข่งขันวิทย์หรือวิศวะ, ห้องเรียนเน้นวิทย์ หรือเกียรติบัตรในสาขา",
        gated: false,
        portfolio: "TCASFolio เท่านั้น ไม่เกิน 10 หน้า เฉพาะผลงานดีที่สุด",
        scoring: "พอร์ต (วิชาการ + กิจกรรม) · สัมภาษณ์ 13-14 ก.พ. 70",
        apply: "1-16 ธ.ค. 69",
      },
    ],
  },
];

/** Which universities go on which table sheet. */
export const TCAS_CPE_SHEETS = [
  ["cu", "kmitl"],
  ["ku", "kmutt", "tu", "psu"],
  ["cmu", "mu", "kmutnb", "kku", "sut", "swu"],
];

/** What they have in common, for a student building a portfolio project. */
export const TCAS_CPE_TAKEAWAYS: TcasTakeaway[] = [
  {
    en: "Award = Ticket",
    icon: "trophy",
    title: "รางวัลคือบัตรผ่าน",
    body: "ทุกโครงการของจุฬาฯ และมหิดล ต้องมีรางวัลหรือผ่านค่ายก่อน อัจฉริยภาพฯ เชียงใหม่ Top Talents ลาดกระบัง Active Recruitment บางมด และวิศวะคอมฯ สุรนารีก็เช่นกัน มหิดลกับ CEDT นับรางวัลซอฟต์แวร์ หุ่นยนต์ แฮกกาธอนด้วย",
  },
  {
    en: "No Award? Still Open",
    icon: "rocket",
    title: "ไม่มีรางวัลก็ยังมีทาง",
    body: "ช้างเผือก ม.เกษตร ขอผลงานคอมพิวเตอร์ที่ทำจริง ดาวรุ่งคอมพิวเตอร์ ม.อ. แค่ผ่านเข้ารอบหรือเข้าค่ายก็สมัครได้ ขอนแก่น มจพ. เรียนดี บางมด ธรรมศาสตร์ และผลการเรียนดีเด่น เชียงใหม่ ไม่บังคับรางวัล มจพ. ยังให้คะแนนเกียรติบัตรค่ายด้วย",
  },
  {
    en: "1-Page Project",
    icon: "portfolio",
    title: "เล่าโปรเจกต์ใน 1 หน้า",
    body: "บางมดขอโปรเจกต์ที่ภูมิใจที่สุด 1 หน้า A4: วิธีทำ ผลลัพธ์ สรุป ม.เกษตรถามผลงานที่ภูมิใจที่สุด และได้เรียนรู้อะไร",
  },
  {
    en: "One Highlight",
    icon: "screen",
    title: "ชิ้นเด่นชิ้นเดียว",
    body: "ลาดกระบังให้ส่งผลงานเด่นแค่ 1 ชิ้น ที่อื่นจำกัด 10-15 หน้า บางมดแนะนำใส่ QR code หรือลิงก์ไปดูงานเพิ่ม",
  },
  {
    en: "Your Role",
    icon: "crew",
    title: "บอกบทบาทของเรา",
    body: "ธรรมศาสตร์ให้อธิบายบทบาทและสัดส่วนของเราในผลงานที่ได้รางวัล ทำเป็นทีมได้ แต่ต้องชี้ได้ว่าเราทำส่วนไหน",
  },
  {
    en: "Ready to Talk",
    icon: "question",
    title: "พร้อมเล่าในห้องสัมภาษณ์",
    body: "โครงการส่วนใหญ่มีสัมภาษณ์ บางมด (เรียนดี) ให้น้ำหนัก 80% ม.เกษตร 50% จุฬาฯ กับมหิดลต้องได้ 70 คะแนนขึ้นไป",
  },
];

/** Key dates on one line, oldest first. */
export const TCAS_CPE_DATES = [
  { date: "10 ก.ย. 69", label: "มหิดล ปิดรับแล้ว", done: true },
  { date: "14 ต.ค. 69", label: "ม.เกษตร ช้างเผือก ปิดแล้ว", done: true },
  { date: "2 พ.ย. 69", label: "ขอนแก่น ปิดรับ" },
  { date: "6 พ.ย. 69", label: "เชียงใหม่ ปิดพอร์ต" },
  { date: "12 พ.ย. 69", label: "จุฬาฯ ปิดรับ" },
  { date: "19 พ.ย. 69", label: "ม.อ. ดาวรุ่งฯ ปิดรับ" },
  { date: "16 ธ.ค. 69", label: "ธรรมศาสตร์ มศว ปิดรับ" },
  { date: "5 ม.ค. 70", label: "พระนครเหนือ ปิดรับ" },
  { date: "4 ก.พ. 70", label: "ม.เกษตร โอลิมปิก ปิดรับ" },
];

export const TCAS_CPE_SOURCES = [
  "admission.chula.ac.th",
  "tcas.mahidol.ac.th",
  "admission.reg.cmu.ac.th",
  "course.mytcas.com",
  "admission.engr.tu.ac.th",
  "admission.ku.ac.th",
  "admission.psu.ac.th",
  "admission.reg.kmitl.ac.th",
  "admission.kmutnb.ac.th",
  "admissions.kku.ac.th",
  "sutgateway.sut.ac.th",
  "admission.swu.ac.th",
];

export const TCAS_CPE_POSTER: TcasPosterData = {
  key: "cpe",
  fieldEn: "COMPUTER ENGINEERING",
  coverTitle: ["วิศวะคอมฯ", "รอบ 1 Portfolio"],
  tableTitle: "วิศวะคอมฯ รอบ 1 ต้องมีอะไร",
  scope: "หลักสูตรภาษาไทย วิทยาเขตหลัก",
  skipped: "ไม่รวมโควตาเฉพาะกลุ่ม เช่น นักกีฬา ศิลปะ บุตรบุคลากร โรงเรียนเครือข่าย",
  gateLegend: "ช่องสีส้ม = ต้องมีรางวัลหรือผ่านค่ายก่อนถึงจะสมัครได้",
  asOf: TCAS_CPE_AS_OF,
  universities: TCAS_CPE_UNIVERSITIES,
  sheets: TCAS_CPE_SHEETS,
  takeaways: TCAS_CPE_TAKEAWAYS,
  dates: TCAS_CPE_DATES,
  sources: TCAS_CPE_SOURCES,
};
