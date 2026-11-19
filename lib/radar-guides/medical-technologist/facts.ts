/**
 * Fact registry for the Medical Technologist guide (Level 1). Every fact was
 * re-read at its source on 2026-11-19 and 2026-11-20. Research behind it:
 * docs/radar-guide/factsheets/medical-technologist.md (the DB deck's salary
 * ladder, JobsDB count and employment estimate are not repeated here).
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; numbers a team states about its own
 * work carry the vendor badge; simulated game data is `sim.*`.
 *
 * No medical advice: facts describe what labs do, never what a result means.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-20" as const;

export const MEDICAL_TECHNOLOGIST_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.mt-licence",
    claimEn:
      "Medical technologists (นักเทคนิคการแพทย์) analyse specimens from the human body (blood, urine, stool, tissue) to support diagnosis, treatment monitoring and prevention, and must pass the licence exam overseen by the Medical Technology Council (สภาเทคนิคการแพทย์) after graduating (Eduzones, Apr 17, 2026). The Council's president (Hfocus, Nov 17, 2026): under the Medical Technology Profession Act B.E. 2547 the Council issues licences and regulates the profession.",
    values: ["2547"],
    sources: [
      { outlet: "Eduzones", url: "https://www.eduzones.com/2026/04/17/medical-technology-2/", publishedAt: "2026-04-17" },
      { outlet: "Hfocus", url: "https://www.hfocus.org/content/2026/11/40287", publishedAt: "2026-11-17" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Eduzones: \"จบแล้วต้องสอบ ใบอนุญาตประกอบวิชาชีพเทคนิคการแพทย์ ควบคุมโดยสภาเทคนิคการแพทย์\". Do not quote a pass mark, exam date or fee: none was verified.",
  },
  {
    id: "f.mt-nipah",
    claimEn:
      "Jan 2026 (ม.ค. 2569): with at least 5 Nipah virus infections confirmed in West Bengal, India, Thailand screened travellers at Suvarnabhumi, Don Mueang and Phuket airports; Thailand had no cases. The Department of Medical Sciences' Institute of Health Science Research (the national reference lab) tests for Nipah by real-time RT-PCR, collects at least 2 specimen types and can report results within 8 hours of receiving the specimen.",
    values: ["8", "2569", "2"],
    sources: [
      { outlet: "แนวหน้า (Naewna)", url: "https://www.naewna.com/local/942928", publishedAt: "2026-01-26" },
      { outlet: "แนวหน้า (Naewna)", url: "https://www.naewna.com/lady/943146", publishedAt: "2026-01-28" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "\"สามารถรายงานผลภายใน 8 ชั่วโมงหลังได้รับตัวอย่าง\". It is the department's stated readiness: Thailand found no Nipah case, so never say a Thai case was tested.",
  },
  {
    id: "f.mt-newborn",
    claimEn:
      "Thai newborns' blood spots on filter paper, taken 48 hours after birth, go to the Department of Medical Sciences' national newborn screening centre (Thansettakij, Feb 18, 2021). Screening for congenital hypothyroidism and PKU has been in the universal health coverage benefit package since 2548 (2005); in Aug 2023 (ส.ค. 2566) the department said screening for 24 more rare metabolic diseases covered all 13 health regions at no cost, and about 600,000 newborns are screened each year (PPTV, Aug 25, 2023).",
    values: ["48", "2548", "24", "13", "2566", "600,000"],
    sources: [
      { outlet: "PPTV", url: "https://www.pptvhd36.com/health/news/3906", publishedAt: "2023-08-25" },
      { outlet: "ฐานเศรษฐกิจ (Thansettakij)", url: "https://www.thansettakij.com/general-news/469171", publishedAt: "2021-02-18" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Births have fallen since 2023, so do not print 600,000 as this year's count. Say น่าจะ for the student's own screening: coverage is high, not total.",
  },
  {
    id: "f.mt-blood",
    claimEn:
      "Thai PBS (May 10, 2019): the Thai Red Cross confirms every bag of donated blood is screened; each unit must be tested for HIV, hepatitis B and C, and syphilis before use.",
    values: ["2562"],
    sources: [{ outlet: "Thai PBS", url: "https://www.thaipbs.or.th/news/content/279929", publishedAt: "2019-05-10" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Older source; the testing rule itself is stable. Do not claim NAT on every unit (the 2012 NBC paper covers about 45% of collections).",
  },
  {
    id: "f.mt-lab-benchmark",
    claimEn:
      "Hfocus (Nov 17, 2026): the Medical Technology Council and Roche Diagnostics published a study of 139 Thai medical labs (Apr to Jul 2025) on Roche's LabInsights platform. 24.1% run quality control every shift, against 7.7% across Asia Pacific; more than 60% report routine clinical chemistry within 60 minutes; about 15% use AI. The Council's plan (2026 to 2029) includes building future medical technologists in AI, genomics and digital, and supports the national 'Lab Anywhere' policy that extends testing to community medical technology clinics with data linked to the centre in real time. The Council says AI and automation are assistants, not replacements.",
    values: ["139", "24.1", "7.7", "60", "15", "2569"],
    sources: [{ outlet: "Hfocus", url: "https://www.hfocus.org/content/2026/11/40287", publishedAt: "2026-11-17" }],
    asOf: AS_OF,
    badge: "vendor",
    note: "Survey run with Roche, a lab-equipment seller, on its own platform: keep the vendor badge on any number from it.",
  },

  // ---------------------------------------------------------------- work
  {
    id: "f.mt-preanalytical",
    claimEn:
      "Carraro and Plebani, Clinical Chemistry 2007 (a stat lab in Padova, Italy): of 160 confirmed laboratory errors, 61.9% happened before analysis (pre-analytical), 15% during it and 23.1% after it. The most common pre-analytical errors were tube filling and patient identification.",
    values: ["160", "61.9", "15", "23.1"],
    sources: [
      { outlet: "PubMed (Clin Chem 2007;53:1338-42)", url: "https://pubmed.ncbi.nlm.nih.gov/17525103/", publishedAt: "2007-07" },
      {
        outlet: "acutecaretesting.org",
        url: "https://acutecaretesting.org/en/journal-scans/a-study-of-error-rates-in-laboratory-medicine",
        publishedAt: "2007-10",
      },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "One Italian hospital lab, not Thai data: say งานวิจัยหนึ่ง and ส่วนใหญ่, no percentage in copy.",
  },
  {
    id: "f.mt-proficiency",
    claimEn:
      "Daily News (Jul 8, 2026): at the Department of Medical Sciences' national proficiency testing (PT) conference, more than 1,200 laboratories nationwide take part in proficiency testing across 12 fields, including clinical pathology. In PT the provider sends samples with unknown results for the lab to analyse, and the results are compared to check the lab reports accurately.",
    values: ["1,200", "12", "2569"],
    sources: [{ outlet: "เดลินิวส์ (Daily News)", url: "https://www.dailynews.co.th/news/6010531/", publishedAt: "2026-07-08" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "The 1,200 labs span 12 fields (food, drugs and herbs too), not only medical labs: say แล็บ, not แล็บโรงพยาบาล.",
  },
  {
    id: "f.mt-paths",
    claimEn:
      "Eduzones (Apr 17, 2026): medical technology graduates work in public and private hospital labs, private clinics and health-check centres, their own labs, medical device companies (product or application specialist, sales) and state research institutes. Core subjects include clinical chemistry, haematology, clinical microbiology, blood bank and transfusion, and clinical parasitology.",
    sources: [{ outlet: "Eduzones", url: "https://www.eduzones.com/2026/04/17/medical-technology-2/", publishedAt: "2026-04-17" }],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "sim.mt-first-shift",
    claimEn:
      "Simulated: the student's first shift in a hospital lab. First they sort 6 incoming specimens into accept or ask for a new sample (an unlabelled tube, a name that does not match the order, an under-filled tube and a haemolysed sample are rejected). Then they decide 6 results: release, recheck first, or phone the ward now (QC out of range and a big unexplained change from yesterday mean recheck; an analyser flag means a slide under the microscope; a value past the lab's critical limit means phoning the doctor or nurse at once and logging who and when). Patients are letters, values are not shown, and the lab never tells patients what a result means: doctors interpret. Based on common pre-analytical errors (f.mt-preanalytical) and standard QC and critical-value practice.",
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },

  // ---------------------------------------------------------------- tonight
  {
    id: "f.mt-water-drop",
    claimEn:
      "Scientific American (Alex Wild, Mar 12, 2012): put a drop of water on a phone's camera lens and turn the phone over; the hanging droplet works as a liquid lens and magnifies small subjects. Magnification drops as the droplet evaporates, the phone needs a steady stand, and water is not good for phone electronics. Scout Life's water-drop microscope project lists onion skin, salt and sugar among things to look at, and says to ask an adult for help with unfamiliar tools.",
    sources: [
      {
        outlet: "Scientific American",
        url: "https://www.scientificamerican.com/blog/compound-eye/transform-your-iphone-into-a-microscope-just-add-water/",
        publishedAt: "2012-03-12",
      },
      { outlet: "Scout Life", url: "https://scoutlife.org/hobbies-projects/projects/200/make-a-microscope/", publishedAt: "2007-02" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Scout Life shows no date; 2007-02 is its image file date. Keep the tonight task to kitchen items: no blood, saliva or anything from the body.",
  },

  // ---------------------------------------------------------------- round1 (Level 2)
  {
    id: "f.mt-mytcas",
    claimEn:
      "mytcas course and round feeds for TCAS70, read Nov 19, 2026: 20 programmes are in the field เทคนิคการแพทย์ (faculties of medical technology, allied health sciences, and two faculties of science), and 17 of them list a round 1 (Portfolio) project, e.g. Mahidol's Faculty of Medical Technology (Portfolio รอบ 1/1, 30 seats), Chulalongkorn's Faculty of Allied Health Sciences (40 seats) and Khon Kaen's Faculty of Medical Technology (Portfolio, 16 seats).",
    values: ["20", "17", "70"],
    sources: [
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10060106111301A", publishedAt: "2026-11" },
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10010137111301A", publishedAt: "2026-11" },
      { outlet: "mytcas", url: "https://course.mytcas.com/programs/10030109111302A", publishedAt: "2026-11" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Counted from my-tcas.s3 courses.json and rounds/<id>.json (field_name_th = เทคนิคการแพทย์, type 1_2570). Re-count before going live: projects change.",
  },
];
