/**
 * Fact registry for the Mechanical Engineer guide (Level 1). Every fact was
 * re-read at its source on 2026-11-19 and 2026-11-20. Research behind it:
 * docs/radar-guide/factsheets/mechanical-engineer.md. Salary and job-market
 * figures from the DB deck stay on Level 2 and are not repeated here.
 *
 * Rules (guide-lint): every number a Thai sentence prints is in `claimEn` or
 * `values` of a fact that sentence cites; a team's own numbers about its own
 * product carry the vendor badge; simulated game data is `sim.*`.
 */
import type { Fact } from "@/lib/radar-guide/guide-types";

const AS_OF = "2026-11-20" as const;

export const MECHANICAL_ENGINEER_FACTS: readonly Fact[] = [
  // ---------------------------------------------------------------- dream
  {
    id: "f.me-thai-train",
    claimEn:
      'On Jul 3, 2026 (3 ก.ค. 2569) "รถไฟไทยทำ", a prototype passenger rail car from a KMITL (สจล.) research project run with government and private partners (PostToday names a joint-venture company), was handed over to the State Railway of Thailand at Bangkok (Hua Lamphong) station. Daily News: the research team designed the car body itself ("ทีมวิจัยออกแบบตัวรถเองทั้งหมด"). Reported specs: 25 seats, 24 metres long, a body about 22% lighter, top speed 120 km/h, more than 10,000 km of test runs, and local content of 44.1% (Daily News: about 44%) of its parts made in Thailand.',
    values: ["3", "2569", "25", "24", "22", "120", "10,000", "44.1", "44"],
    sources: [
      { outlet: "PostToday", url: "https://www.posttoday.com/smart-city/744879", publishedAt: "2026-07-03" },
      { outlet: "เดลินิวส์ (Daily News)", url: "https://www.dailynews.co.th/news/5959448/", publishedAt: "2026-06-19" },
    ],
    asOf: AS_OF,
    badge: "vendor",
    note: "The specs and test distance are the project team's own figures, reported by the press at the handover. Say กว่า 10,000: the source says more than, so the guess game never says a guess above 10,000 is wrong by an exact amount. Never say the car is 100% Thai-made (local content is 44.1%). Neither source says the Faculty of Engineering led the project: say ทีมวิจัยจาก สจล. The 22% lighter body has no stated baseline, so it is not printed. Neither source says the car carried passengers: say ก่อนส่งมอบ, not ก่อนให้คนขึ้น.",
  },
  {
    id: "f.me-ecomarathon",
    claimEn:
      "Thairath (Jul 21, 2023): team Virgin from Sakon Nakhon Technical College (วิทยาลัยเทคนิคสกลนคร), a Thai youth team (ทีมเยาวชนไทย) whose members are students (นักศึกษา), won 1st place in the prototype class (ประเภทรถต้นแบบ), internal combustion engine category, at Shell Eco-marathon Asia Pacific and Middle East 2023 (Mandalika circuit, Lombok, Indonesia); the competition has young people design energy-saving cars, and the article speaks of the cars as designed and built (ออกแบบและสร้างขึ้น) by the teams. Their car ran on ethanol and went the equivalent (เทียบเท่า) of 1,867.8 km on 1 litre.",
    values: ["1", "1,867.8", "2566", "2023"],
    sources: [{ outlet: "ไทยรัฐ (Thairath)", url: "https://www.thairath.co.th/news/local/2711384", publishedAt: "2023-07-21" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "The fuel was ethanol, not petrol: say เอทานอล, not น้ำมันเบนซิน. 1,867.8 km is an equivalent figure, not a distance driven: say วิ่งได้เทียบเท่า. The article does not give the students' ages or ปวช./ปวส. level.",
  },
  {
    id: "f.me-car-output",
    claimEn:
      "InfoQuest (Jan 28, 2026), citing the Federation of Thai Industries (ส.อ.ท.) automotive group: Thailand produced 1,455,569 cars in 2025 (2568); EV production for the home market and export helped.",
    values: ["1,455,569", "2568", "2025"],
    sources: [{ outlet: "InfoQuest", url: "https://www.infoquest.co.th/?p=564712", publishedAt: "2026-01-28" }],
    asOf: AS_OF,
    badge: "confirmed",
  },
  {
    id: "f.me-aircon-export",
    claimEn:
      "Thansettakij (Jul 19, 2025): in 2024 (2567) Thailand exported more than 21 million wall-type air conditioners, worth USD 7,044 million, up 9% from 2023, making Thailand the 3rd largest air-conditioner exporter in the world (all air conditioners, not only wall-type) after China and Mexico. The article calls Thailand a major global production hub for air conditioners.",
    values: ["21", "2567", "3"],
    sources: [{ outlet: "ฐานเศรษฐกิจ (Thansettakij)", url: "https://www.thansettakij.com/business/marketing/633316", publishedAt: "2025-07-19" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Older articles (2022 and 2023 data) say 2nd in the world; the 2024 figure is 3rd. Say กว่า 21 ล้าน. The rank is Thailand as an air-conditioner exporter, so say ไทยเป็นผู้ส่งออกแอร์อันดับ 3, not that wall-type units rank 3rd.",
  },

  // ---------------------------------------------------------------- work
  {
    id: "sim.me-fan",
    claimEn:
      "Simulated: designing a stand fan (พัดลมตั้งพื้น) for hot Thai classrooms. First the student sorts 6 complaints about today's fans into what the new fan must fix (weak airflow at the back of the room, too loud to teach over, tips over when bumped, a grille too hard to take off and clean) and what can wait (play music from a phone, more colours). Then they test a prototype 7 ways and pick a result for each: it passes, change the shape, or change the material. Results are invented for the game, based on common product failures: cracks starting at a sharp corner, plastic going brittle in sunlight, a stand that tips, a finger-sized gap in the guard, a steel grille that rusts. The two passes are a motor that stays within its set temperature limit and a light hum at top speed that the class can still hear the teacher over (the brief's noise criterion).",
    sources: [],
    asOf: AS_OF,
    badge: "simulated",
  },

  // ---------------------------------------------------------------- tonight
  {
    id: "f.me-excalidraw",
    claimEn:
      "Excalidraw's README on GitHub (read Nov 19, 2026): a virtual whiteboard for hand-drawn style sketches; free and open source (MIT licence); the hosted app at excalidraw.com autosaves to the browser (local-first); drawings export to PNG, SVG or the clipboard.",
    values: ["19", "2026"],
    sources: [{ outlet: "GitHub (excalidraw)", url: "https://github.com/excalidraw/excalidraw", publishedAt: "2026-11" }],
    asOf: AS_OF,
    badge: "confirmed",
    note: "The README does not say whether an account is needed: never write ไม่ต้องสร้างบัญชี. Paper works just as well; the tool is optional.",
  },

  // ---------------------------------------------------------------- round1 (Level 2)
  {
    id: "f.me-mytcas-fields",
    claimEn:
      "mytcas course feed for TCAS70 (read Nov 19, 2026): programmes are listed under the fields วิศวกรรมเครื่องกล (mechanical engineering), วิศวกรรมยานยนต์ (automotive engineering), วิศวกรรมหุ่นยนต์ (robotics engineering) and วิศวกรรมเมคคาทรอนิกส์ (mechatronics engineering), at many universities.",
    sources: [
      { outlet: "mytcas (วิศวกรรมเครื่องกล)", url: "https://course.mytcas.com/programs/10010121300701A", publishedAt: "2026-11" },
      { outlet: "mytcas (วิศวกรรมยานยนต์)", url: "https://course.mytcas.com/programs/10020328302001E", publishedAt: "2026-11" },
      { outlet: "mytcas (วิศวกรรมหุ่นยนต์)", url: "https://course.mytcas.com/programs/10020328302901E", publishedAt: "2026-11" },
      { outlet: "mytcas (วิศวกรรมเมคคาทรอนิกส์)", url: "https://course.mytcas.com/programs/10100101301901A", publishedAt: "2026-11" },
    ],
    asOf: AS_OF,
    badge: "confirmed",
    note: "Programme counts change during the cycle and are not printed. course.mytcas.com has no search URL, so the level links its home page.",
  },
];
