/**
 * Small inline engine fixtures shaped like the cybersecurity design (U2 tests
 * only; no content imports). Shared by the reducer and RTL tests.
 */
import type {
  BinaryChoiceData,
  DateToggleData,
  EvidenceMakerData,
  FakeTerminalData,
  FindLineData,
  FlipCardsData,
  GuessRevealData,
  LadderRebuildData,
  ProgrammeFilterData,
  RecapCardData,
  SortGameData,
} from "../../guide-types";

export const findLine: FindLineData = {
  captionTh: "โค้ดจำลองแนวคิด",
  simulatedFactId: "sim.mythos-snippet",
  lines: Array.from({ length: 12 }, (_, i) => ({ n: i + 1, code: `line ${i + 1}` })),
  answer: 7,
  nearMissTh: { 8: "ใกล้แล้ว เช็กขนาดตรงนี้ถูก", 5: "ใช่ ค่านี้มาจากคนนอก" },
  hintsTh: ["ค่าไหนมาจากคนนอก", "name มีที่เท่าไหร่"],
  outlineOnHint2: [5, 7, 8],
  onFound: {
    counter: { to: 5_000_000, captionTh: "จำนวนครั้งที่เทสต์วิ่งผ่าน", factId: "f.glasswing-launch" },
    explanationTh: "บรรทัด 7 คัดลอกก่อนเช็ก",
  },
};

export const firefox: GuessRevealData = {
  promptTh: "ลองทายว่าเดือนเมษายนแก้ไปกี่ตัว",
  min: 0,
  max: 500,
  step: 10,
  unit: "count",
  answer: 423,
  answerFactId: "f.firefox-mozilla",
  buckets: [50, 150, 300],
  chart: {
    kind: "bars",
    band: { from: 20, to: 30, labelTh: "ปกติเดือนละ 20 ถึง 30" },
    bars: [
      { labelTh: "มี.ค.", value: 76 },
      { labelTh: "เม.ย.", value: null, segment: { value: 271, labelTh: "เจอด้วย Mythos Preview" } },
    ],
  },
  nearTh: "เกือบเป๊ะ",
  overTh: "เธอเดาสูงไป {d}",
  underTh: "เธอเดาต่ำไป {d}",
  nearWithin: 20,
  revealTh: "เธอเดา {g} ของจริง {a}",
};

export const money: GuessRevealData = {
  promptTh: "เดาค่ากลางเงินเดือน",
  min: 15_000,
  max: 100_000,
  step: 500,
  unit: "baht",
  answer: 35_500,
  answerFactId: "f.jobsdb-security",
  buckets: [30_000, 40_000, 60_000],
  chart: {
    kind: "axis",
    markers: [
      { labelTh: "p10", value: 27_000 },
      { labelTh: "ค่ากลาง", value: 35_500, strong: true },
      { labelTh: "p90", value: 45_000 },
    ],
    shade: { from: 33_000, to: 39_000 },
    gapLabelTh: "ช่วงกลางไม่มีข้อมูลที่ตรวจได้",
  },
  nearTh: "เกือบเป๊ะ",
  overTh: "เธอเดาสูงไป {d} บาท",
  underTh: "เธอเดาต่ำไป {d} บาท",
  nearWithin: 1000,
  revealTh: "ค่ากลางจริงคือ {a}",
};

export const doors: SortGameData = {
  layout: "cards",
  bins: [
    { id: "defense", labelTh: "Defense" },
    { id: "redteam", labelTh: "Red Team" },
    { id: "specialized", labelTh: "Specialized" },
    { id: "no", labelTh: "ไม่ผ่าน" },
  ],
  items: [
    { id: "hospital", labelTh: "ทีมความปลอดภัยของโรงพยาบาล", answer: "defense", revealTh: "เข้าทาง Defense ได้" },
    {
      id: "hunter",
      labelTh: "นักล่าบั๊กคนเดียว",
      answer: "defense",
      nearTh: { redteam: "ใกล้แล้ว Red Team รับเฉพาะองค์กร" },
      revealTh: "เข้า Defense ได้",
    },
    { id: "pentest", labelTh: "บริษัททดสอบเจาะระบบ", answer: "redteam", revealTh: "รับเฉพาะองค์กร" },
    { id: "grid", labelTh: "ผู้ดูแลระบบไฟฟ้า", answer: ["specialized", "defense"], revealTh: "ระบบที่พลาดไม่ได้" },
    { id: "anon", labelTh: "บัญชีไม่ระบุตัวตน", answer: "no", revealTh: "พิมพ์เองไม่นับ" },
    { id: "student", labelTh: "นักเรียนที่ชอบแฮก", answer: "no", scored: false, revealTh: "ตอนนี้ยังไม่ผ่าน" },
  ],
  resultTh: "ให้กุญแจถูก {score}/{total}",
};

const alert = (id: string, answer: "agree" | "miss", goal = false) => ({
  id,
  labelTh: `สัญญาณ ${id}`,
  meta: { time: "02:14", ai: "เตือนหลอก" },
  detailTh: `หลักฐาน ${id}`,
  answer,
  revealTh: `เฉลย ${id}`,
  ...(goal ? { flags: ["@goal"] } : {}),
});

export const triage: SortGameData = {
  layout: "queue",
  goalTh: "หาข้อที่ AI พลาด",
  bins: [
    { id: "agree", labelTh: "เห็นด้วยกับ AI" },
    { id: "miss", labelTh: "AI พลาด" },
  ],
  items: [
    alert("a1", "agree"),
    alert("a2", "miss", true),
    alert("a3", "agree"),
    alert("a4", "agree"),
    alert("a5", "miss", true),
    alert("a6", "agree"),
    alert("a7", "agree"),
    alert("a8", "agree"),
    alert("a9", "agree"),
    alert("a10", "agree"),
  ],
  timer: { seconds: 90, labelTh: "คนร้ายเคลื่อนที่" },
  simulated: { factId: "sim.triage-queue", watermarkTh: "ตัวอย่างจำลอง" },
  resultTh: "จับข้อที่ AI พลาดได้ {x}/{xTotal} · เห็นด้วยถูก {y}/{yTotal}",
  outcomesTh: {
    "hit:a2": "ข้อ 2 คือบัญชีโดนยึดจริง",
    "miss:a2": "ลองกดข้อ 2 ดูอีกที",
    wrong: "ข้อนี้ AI ถูก: {reveal}",
  },
};

export const scam: SortGameData = {
  layout: "chat",
  bins: [
    { id: "safe", labelTh: "ปลอดภัย" },
    { id: "scam", labelTh: "หลอก" },
  ],
  items: [
    { id: "m1", labelTh: "โอนให้แม่ก่อน", meta: { sender: "แม่" }, answer: "scam", flags: ["เร่ง", "ขอเงิน"], revealTh: "วางสายแล้วโทรกลับ" },
    { id: "m2", labelTh: "พรุ่งนี้สอบย่อย", meta: { sender: "ครู" }, answer: "safe", revealTh: "ไม่มีลิงก์" },
  ],
  simulated: { factId: "sim.scam-chat", watermarkTh: "ตัวอย่างจำลอง" },
  resultTh: "แยกข้อความถูก {score}/{total}",
  outcomesTh: { wrong: "เรื่องจริงเบื้องหลัง: {reveal}" },
};

export const flip: FlipCardsData = {
  highlightTh: "นี่คือการทดสอบที่ได้รับอนุญาต",
  cards: [
    { id: "c1", frontTh: "กลุ่มแรนซัมแวร์", backTh: "อ้างว่า นี่คือการทดสอบที่ได้รับอนุญาต แล้วเจาะ", dateTh: "ส.ค. 2569", factIds: ["f.cursor-reuters"] },
    { id: "c2", frontTh: "รัฐบาลแห่งหนึ่ง", backTh: "บอกว่า นี่คือการทดสอบที่ได้รับอนุญาต", dateTh: "ส.ค. 2569", factIds: ["f.dream-taiwan"] },
  ],
};

export const passport: DateToggleData = {
  chips: [
    { id: "d1", labelTh: "11 มิ.ย." },
    { id: "d2", labelTh: "13 มิ.ย." },
  ],
  columns: [
    { id: "fable", labelTh: "Fable 5" },
    { id: "mythos", labelTh: "Mythos 5" },
  ],
  cells: {
    d1: { fable: { open: true }, mythos: { open: false, noteTh: "เฉพาะองค์กรพันธมิตร" } },
    d2: { fable: { open: false }, mythos: { open: false } },
  },
  factIds: ["f.us-directive"],
};

export const ladder: LadderRebuildData = {
  rungsTh: ["นั่งเฝ้าจอ", "อ่าน log", "สแกนเบื้องต้น", "สืบสวนเหตุ", "วางระบบป้องกัน"],
  fadeCount: 3,
  aiCaption: { th: "คนสายนี้คิดว่า AI จะลดงานเริ่มต้น", factIds: ["f.isc2-pulse"] },
  newRungsTh: ["ตรวจงาน AI", "SOC ที่ใช้ AI ช่วย", "ทดสอบ AI เอง"],
  newCaption: { th: "แต่จะเกิดตำแหน่งใหม่", factIds: ["f.isc2-pulse"] },
  proofChips: [
    { id: "writeup", labelTh: "เขียน write-up", evidenceTh: "ลิงก์ write-up" },
    { id: "ctf", labelTh: "แข่ง CTF", evidenceTh: "อันดับ" },
    { id: "homelab", labelTh: "ทำแล็บที่บ้าน", evidenceTh: "รูปและบันทึก" },
    { id: "oss", labelTh: "ช่วยโอเพนซอร์ส", evidenceTh: "ลิงก์ PR" },
  ],
  pick: 3,
};

export const fit: BinaryChoiceData = {
  questions: [
    { id: "q1", leftTh: "ปริศนา", rightTh: "โจทย์มีเฉลย", left: { A: 1, B: 1 }, right: { C: 1 } },
    { id: "q2", leftTh: "อยากรู้ว่าพังเพราะอะไร", rightTh: "อยากให้ซ่อมเร็วๆ", left: { A: 2 }, right: {} },
    { id: "q3", leftTh: "สร้างของใหม่", rightTh: "หาจุดพัง", left: { B: 2 }, right: { A: 2 } },
  ],
  outcomes: {
    A: { titleTh: "ไซเบอร์ตรง", bodyTh: "หลักสูตรชื่อไซเบอร์" },
    B: { titleTh: "คอมกว้างก่อน", bodyTh: "วิศวะคอม วิทย์คอม" },
    C: { titleTh: "ใจอยู่กับคน", bodyTh: "หมออาจตอบโจทย์" },
  },
  disclaimerTh: "ไม่ใช่แบบทดสอบบุคลิก แค่ช่วยคิด",
};

export const tcas: ProgrammeFilterData = {
  gradeQuestionTh: "ตอนนี้เธออยู่ ม.อะไร",
  gradeBannersTh: { m4: "เธอคือ TCAS72", m5: "ปีหน้าเธอคือ TCAS71", m6: "รอบนี้ของเธอ" },
  extraChecklistTh: { m4: ["พื้นฐานเครือข่าย"] },
  programmes: [
    {
      id: "10030138220204A",
      uniTh: "มข.",
      degreeTh: "วท.บ. ความมั่นคงปลอดภัยไซเบอร์",
      track: "thai",
      rounds: ["portfolio"],
      badge: "confirmed",
      factIds: ["f.mytcas-9"],
      href: "https://course.mytcas.com/programs/10030138220204A",
      cyberInName: true,
    },
    {
      id: "10160101300504A",
      uniTh: "สจล.",
      degreeTh: "วศ.บ. วิศวกรรมคอมพิวเตอร์และความปลอดภัยไซเบอร์",
      track: "thai",
      rounds: ["portfolio"],
      seats: 40,
      minGpax: 3,
      deadline: { at: "2027-01-28T16:30:00+07:00", labelTh: "ปิด 28 ม.ค. 2570 เวลา 16:30" },
      badge: "pending",
      factIds: ["f.kmitl-portfolio"],
      href: "https://course.mytcas.com/programs/10160101300504A",
      cyberInName: true,
    },
    {
      id: "10040106300502E",
      uniTh: "มช.",
      degreeTh: "วศ.บ. ระบบสารสนเทศ (นานาชาติ)",
      track: "intl",
      rounds: ["admission"],
      badge: "confirmed",
      factIds: ["f.mytcas-9"],
      href: "https://course.mytcas.com/programs/10040106300502E",
      cyberInName: false,
    },
  ],
  snapshot: "tcas.json",
  broadRoutes: [{ labelTh: "วิศวะคอม วิทย์คอม ไอที", href: "/radar/computer-engineering" }],
  fitOrder: { A: "cyberFirst", B: "broadFirst", C: "both" },
};

export const terminal: FakeTerminalData = {
  labelTh: "เครื่องจำลองในหน้านี้",
  simulatedFactId: "sim.terminal",
  files: {
    "README.txt": ["เธอคือนักศึกษาฝึกงาน"],
    "scope.txt": ["ได้รับอนุญาต: lab.local"],
    "auth.log": [
      ...Array.from({ length: 41 }, (_, i) => `Failed password for intern01 from 203.0.113.45 port ${50000 + i} ssh2`),
      "Accepted password for intern01 from 203.0.113.45 port 51122 ssh2",
      ...Array.from({ length: 3 }, () => "Accepted publickey for admin from 192.0.2.10"),
      ...Array.from({ length: 15 }, () => "session opened for user admin from 192.0.2.11"),
    ],
    ".flag": ["FLAG{read_the_scope_first}"],
  },
  commands: [
    { match: ["help"], output: ["ls  cat  head  grep  scan  whoami  clear"] },
    { match: ["ls"], output: ["README.txt  scope.txt  auth.log"] },
    { match: ["ls -a"], output: [".  ..  .flag  README.txt  scope.txt  auth.log"], noteTh: "ไฟล์ที่ขึ้นต้นด้วยจุดถูกซ่อนไว้" },
    { match: ["cat README.txt"], output: { file: "README.txt" } },
    { match: ["cat scope.txt"], output: { file: "scope.txt" }, effect: "scopeRead" },
    { match: ["head auth.log"], output: { file: "auth.log", head: 10 } },
    { match: ['grep -c "Failed" auth.log'], output: { file: "auth.log", grep: "Failed", count: true } },
    { match: ['grep "Accepted" auth.log'], output: { file: "auth.log", grep: "Accepted" } },
    { match: ["cat .flag"], output: { file: ".flag" }, effect: "flag" },
    { match: ["scan lab.local"], output: ["พบพอร์ต 80 เปิดอยู่ (จำลอง)"], requiresScope: true },
    {
      match: ["scan school-web"],
      output: ["หยุด: นอกขอบเขต ไม่มีใครอนุญาต = ผิดกฎหมาย"],
      effect: "outOfScope",
      requiresScope: true,
      noteTh: "สแกนเว็บโรงเรียน ที่ดูหละหลวมมาก",
    },
    { match: ["clear"], output: [], effect: "clear" },
  ],
  unknownTh: "ไม่มีคำสั่งนี้ในแล็บ ลอง help",
  missions: [
    { id: 1, titleTh: "อ่านขอบเขตก่อน", doneWhen: "ran:cat scope.txt" },
    {
      id: 2,
      titleTh: "นับว่ามีคนเดารหัสผิดกี่ครั้ง",
      doneWhen: 'ran:grep -c "Failed" auth.log',
      question: { promptTh: "กี่ครั้ง", options: ["4", "41", "410"], answer: "41" },
    },
    {
      id: 3,
      titleTh: "หาว่าเดาสำเร็จไหม",
      doneWhen: 'ran:grep "Accepted" auth.log && tap:Accepted password for intern01',
      feedbackTh: "บรรทัดนี้แหละ",
    },
    { id: 4, titleTh: "หาไฟล์ที่ซ่อน", doneWhen: "ran:ls -a && flag" },
    { id: 5, titleTh: "ตัดสินใจ", doneWhen: "decision" },
  ],
  decision: {
    options: [
      { id: "block", labelTh: "บล็อก IP อย่างเดียว", correct: false, feedbackTh: "ยังไม่พอ" },
      { id: "lock", labelTh: "ล็อกบัญชี + รีเซ็ตรหัส + เปิดเคส + บล็อก IP", correct: true, feedbackTh: "ใช่" },
      { id: "none", labelTh: "ไม่ต้องทำอะไร", correct: false, feedbackTh: "บัญชีนี้โดนยึดแล้ว" },
    ],
  },
  poll: {
    prompt: { th: "ถ้าเป็นเครือข่ายโรงพยาบาล รับได้ไหม" },
    options: [
      { id: "ok", labelTh: "รับได้" },
      { id: "no", labelTh: "ไม่ได้" },
      { id: "depends", labelTh: "แล้วแต่ว่าออกไปทำอะไร" },
    ],
    reveal: { th: "การอยู่ในขอบเขตคือทักษะหลัก" },
  },
};

export const evidence: EvidenceMakerData = {
  room: {
    titleTh: "TryHackMe · Offensive Security Intro",
    href: "https://tryhackme.com/room/offensivesecurityintro",
    badgeTh: "ฟรีตามคู่มือ เช็กอีกครั้งก่อนสมัคร",
    subTh: "ถ้าเว็บกำหนดอายุ ให้ผู้ปกครองช่วยสมัคร",
    factIds: ["f.thm-free"],
  },
  checklistTh: ["สมัคร", "ทำห้องให้จบ", "แคปหน้าจอผลลัพธ์", "เขียน write-up"],
  fields: [
    { id: "room", placeholderTh: "ห้องอะไร / เป้าหมาย" },
    { id: "tried", placeholderTh: "ฉันลองอะไร" },
    { id: "fix", placeholderTh: "ถ้าเป็นเจ้าของระบบ จะแก้ยังไง" },
  ],
  fixedLinesTh: ["ทำในแล็บฝึกที่ได้รับอนุญาตเท่านั้น"],
  includeProofFrom: "firstjob",
  privacyTh: "เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน",
};

export const recap: RecapCardData = {
  lines: {
    mythos: "หาบรรทัดอันตรายเจอใน {attempts} ครั้ง",
    triage: "จับข้อที่ AI พลาดได้ {x}/2",
    terminal: "ลองสแกนนอกขอบเขต {scopeTries} ครั้ง || ภารกิจ log {score}/{total} · ไม่หลุดขอบเขต ✓",
    fit: "สายที่เอน: {title}",
  },
  favourites: {
    mythos: "สายที่เธอเลือกเอง: นักล่าช่องโหว่",
    triage: "สายที่เธอเลือกเอง: นักวิเคราะห์ SOC",
    terminal: "สายที่เธอเลือกเอง: ทีมรับมือเหตุ",
  },
  cardLineTh: "นี่ไม่ใช่คำทำนาย มันคือจุดเริ่ม",
};
