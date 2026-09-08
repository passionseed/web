/**
 * The growth model behind the funnel: how a student moves from "mom paid" to
 * "I build on my own", and which scaling unit that leaves us with.
 *
 * Ref: ../internal/docs/project/BUSINESS_MODEL_CANVAS.md
 * Ref: docs/research/2026-08-13-dm-lead-pathlab-review.md
 */

export type Regulation =
  | "amotivation"
  | "external"
  | "introjected"
  | "identified"
  | "integrated"
  | "intrinsic";

export interface RegulationRung {
  id: Regulation;
  label: string;
  thaiLabel: string;
  sounds: string;
  entryPoint?: boolean;
  target?: boolean;
}

/**
 * Organismic Integration Theory. Motivation is not intrinsic or extrinsic, it
 * is a ladder. The product is one rung of movement, not a whole personality.
 */
export const REGULATION_LADDER: RegulationRung[] = [
  {
    id: "amotivation",
    label: "Amotivation",
    thaiLabel: "ไม่เห็นว่าจะทำไปทำไม",
    sounds: "ทำไปก็เท่านั้น",
  },
  {
    id: "external",
    label: "External regulation",
    thaiLabel: "ทำเพราะมีคนสั่งหรือมีเดดไลน์",
    sounds: "แม่จ่ายมาแล้ว กับ รอบ 1 ใกล้แล้ว",
    entryPoint: true,
  },
  {
    id: "introjected",
    label: "Introjected regulation",
    thaiLabel: "ทำเพราะกลัวอาย",
    sounds: "ถ้าไม่มีพอร์ตจะดูแย่กว่าเพื่อน",
  },
  {
    id: "identified",
    label: "Identified regulation",
    thaiLabel: "ทำเพราะเห็นค่าของมันเอง",
    sounds: "อันนี้มีประโยชน์กับสิ่งที่เราอยากเป็น",
    target: true,
  },
  {
    id: "integrated",
    label: "Integrated regulation",
    thaiLabel: "ทำเพราะมันคือตัวเรา",
    sounds: "เราเป็นคนที่สร้างของ",
  },
  {
    id: "intrinsic",
    label: "Intrinsic motivation",
    thaiLabel: "ทำเพราะมันสนุกในตัวมันเอง",
    sounds: "ทำเพลินจนลืมเวลา",
  },
];

export interface SdtMechanism {
  id: string;
  claim: string;
  evidence: string;
  designConsequence: string;
}

export const SDT_MECHANISMS: SdtMechanism[] = [
  {
    id: "peers-carry",
    claim: "เพื่อนเป็นคนพาให้ค่านิยมซึมเข้าไป ไม่ใช่ mentor",
    evidence:
      "PathLab แบบ async ล้วน มีคนสมัคร 35 ครั้ง จบ 0 คน ค่าย 1:5 ได้ผลเพราะซื้อความสัมพันธ์ด้วยชั่วโมง mentor ซึ่งเป็นวิธีที่แพงที่สุด",
    designConsequence:
      "อัตราส่วนที่ scale ได้คือ 1:20 ถึง 1:30 โดยให้ความหนาแน่นของเพื่อนทำงานแทน mentor",
  },
  {
    id: "informational-reward",
    claim: "รางวัลทำลายแรงจูงใจต่อเมื่อมันควบคุม ไม่ใช่ตอนที่มันให้ข้อมูล",
    evidence:
      "ใบเซอร์เป็นรางวัลแบบควบคุม ส่วน Pivot Log ที่เด็กใช้ตัดสินตัวเองเป็นข้อมูลป้อนกลับ ของสองอย่างนี้หน้าตาเหมือนกันแต่ผลตรงข้ามกัน",
    designConsequence:
      "ทุก deliverable ต้องเฟรมว่าเป็นหลักฐานสำหรับตัวเด็กเอง ห้ามเฟรมเป็นรางวัลตอบแทนความเชื่อฟัง",
  },
  {
    id: "reactance",
    claim: "วัยรุ่นคือช่วงที่ต้านแรงกดดันสูงสุดในชีวิต",
    evidence:
      "ยิ่งพ่อแม่ผลัก เด็กยิ่งต้าน เพราะการต้านคือวิธีทวงสิทธิ์ในการเลือกคืน ของที่แม่ซื้อมาให้จึงเริ่มต้นที่ระดับ external เสมอ",
    designConsequence:
      "การตลาดฝั่งผู้ปกครองต้องขายการถอยออกมา ไม่ใช่ขายการผลักลูกให้หนักขึ้น",
  },
  {
    id: "efficacy",
    claim: "ความพร้อมจะเปลี่ยน เกิดจากสองอย่างพร้อมกัน เห็นช่องว่าง และเชื่อว่าทำได้",
    evidence:
      "เห็นช่องว่างอย่างเดียวได้ความรู้สึกผิด เชื่อว่าทำได้อย่างเดียวได้ความมั่นใจลอยๆ ต้องมีทั้งคู่ถึงจะขยับ",
    designConsequence:
      "คอนเทนต์ต้องโชว์ช่องว่างด้วยงานของรุ่นพี่ที่หน้าตาเหมือนเขา ไม่ใช่ด้วยการสอนหรือการเตือน",
  },
];

/* ------------------------------------------------------------------ */
/* Scaling math                                                        */
/* ------------------------------------------------------------------ */

export interface CampCapacityInput {
  seats: number;
  pricePerSeat: number;
  cohortsPerYear: number;
  mentorCostShare: number;
}

export interface CampCapacity {
  revenue: number;
  contribution: number;
  seatsPerYear: number;
}

export function projectCampCapacity(input: CampCapacityInput): CampCapacity {
  const seatsPerYear = input.seats * input.cohortsPerYear;
  const revenue = seatsPerYear * input.pricePerSeat;

  return {
    revenue,
    contribution: revenue * (1 - input.mentorCostShare),
    seatsPerYear,
  };
}

export function seatsNeededForRevenue(targetRevenue: number, pricePerSeat: number) {
  return Math.ceil(targetRevenue / pricePerSeat);
}

export interface MentorLoop {
  conversionRate: number;
  menteesPerMentor: number;
  /** Cohort multiplier per cycle. Above 1 grows, below 1 needs bought mentors. */
  growthFactor: number;
  verdict: "shrinking" | "flat" | "growing";
}

/**
 * Each cohort must produce its own mentors. A cohort of N needs N/menteesPerMentor
 * mentors for the next run, so the loop sustains itself at a conversion rate of
 * exactly 1/menteesPerMentor.
 */
export function projectMentorLoop(conversionRate: number, menteesPerMentor = 6): MentorLoop {
  const growthFactor = conversionRate * menteesPerMentor;
  const verdict =
    growthFactor > 1.02 ? "growing" : growthFactor < 0.98 ? "shrinking" : "flat";

  return { conversionRate, menteesPerMentor, growthFactor, verdict };
}

export function breakEvenConversionRate(menteesPerMentor = 6) {
  return 1 / menteesPerMentor;
}

export interface CostDriver {
  id: string;
  label: string;
  falls: boolean;
  note: string;
}

/**
 * The Tesla question, restated: which number falls every generation?
 * Ours is cost per student who reaches identified regulation.
 */
export const COST_DRIVERS: CostDriver[] = [
  {
    id: "alumni",
    label: "Alumni mentor supply",
    falls: true,
    note: "ถูกลงเรื่อยๆ เมื่อลูปเริ่มหมุน แต่รุ่นพี่มีอายุใช้งานราว 2 ปีก่อนเข้ามหาลัย",
  },
  {
    id: "density",
    label: "Peer density",
    falls: true,
    note: "ยิ่งเด็กในโรงเรียนเดียวกันเยอะ ความสัมพันธ์ยิ่งฟรี",
  },
  {
    id: "record",
    label: "Verified record",
    falls: true,
    note: "เป็นซอฟต์แวร์ ต้นทุนต่อชิ้นเกือบเป็นศูนย์",
  },
  {
    id: "consulting",
    label: "Consultant hours",
    falls: false,
    note: "ไม่เคยถูกลง รายได้ผูกกับจำนวนคนที่จ้างตลอดไป",
  },
];

/* ------------------------------------------------------------------ */
/* Model options                                                       */
/* ------------------------------------------------------------------ */

export type ModelVerdict = "core" | "supporting" | "rejected";

export interface BusinessModelOption {
  id: string;
  label: string;
  scalingUnit: string;
  verdict: ModelVerdict;
  why: string;
}

export const MODEL_OPTIONS: BusinessModelOption[] = [
  {
    id: "record",
    label: "Verified proof of work",
    scalingUnit: "จำนวนผลงานที่ตรวจสอบแล้ว",
    verdict: "core",
    why:
      "เป็นชิ้นเดียวที่มีมาร์จิ้นแบบซอฟต์แวร์และมีคูเมือง ถ้าคำว่า PassionSeed verified น่าเชื่อกว่าใบเซอร์ เราจะเลิกเป็นค่ายแล้วกลายเป็นเกณฑ์ตัดสิน",
  },
  {
    id: "room",
    label: "The room, free forever",
    scalingUnit: "ความหนาแน่นของคนที่สร้างของ",
    verdict: "core",
    why:
      "ห้องไม่ใช่ช่องทางการตลาด มันคือกลไกส่งมอบ เพราะเพื่อนคือคนที่ทำให้ค่านิยมซึมเข้าไป คนที่ไม่จ่ายคือคนที่ทำให้ห้องมีค่าสำหรับคนที่จ่าย",
  },
  {
    id: "b2b",
    label: "School contracts",
    scalingUnit: "จำนวนโรงเรียน",
    verdict: "core",
    why:
      "ขายครั้งเดียวได้เด็ก 40 คนพร้อมความหนาแน่นฟรี แก้ทั้ง CAC และฤดูกาล โรงเรียนอยากได้ผลรอบ 1 ไปโฆษณา ซึ่งไม่ขัดกับ payload ของเรา",
  },
  {
    id: "camps",
    label: "Camps as the revenue engine",
    scalingUnit: "ที่นั่ง คูณ ราคา",
    verdict: "supporting",
    why:
      "ค่ายคือพิธีกรรมที่ผลิตหลักฐานและผลิตรุ่นพี่ ไม่ใช่เครื่องยนต์รายได้ เพดานมันคือชั่วโมง mentor",
  },
  {
    id: "marketplace",
    label: "Mentor marketplace",
    scalingUnit: "จำนวน mentor ที่เทรนแล้ว",
    verdict: "supporting",
    why: "เป็นธุรกิจจริง แต่มาร์จิ้นต่ำ งานปฏิบัติการหนัก และคุณภาพเสื่อมตามขนาด",
  },
  {
    id: "consulting",
    label: "Crimson-style consulting",
    scalingUnit: "จำนวนที่ปรึกษาที่จ้าง",
    verdict: "rejected",
    why:
      "ต้นทุนต่อผลลัพธ์ไม่เคยลด และทำให้เราไปแข่งกับคนรับทำพอร์ตในสนามที่เขาชนะ คือรับประกันผลงานให้ สุดท้ายเราจะกลายเป็นเขา",
  },
];

/* ------------------------------------------------------------------ */
/* Who decides, who pays                                               */
/* ------------------------------------------------------------------ */

export interface TwoKeyRule {
  id: string;
  actor: "student" | "parent" | "us";
  rule: string;
  because: string;
}

/**
 * Parent pays, student decides. Without this split, a parent purchase lands the
 * student at external regulation and adolescent reactance does the rest.
 */
export const TWO_KEY_RULES: TwoKeyRule[] = [
  {
    id: "student-applies",
    actor: "student",
    rule: "เด็กเป็นคนสมัครเอง ด้วยข้อความของตัวเอง",
    because: "ถ้าบรรทัดแรกไม่ใช่ของเด็ก ทุกอย่างหลังจากนั้นคือของที่ถูกสั่งมา",
  },
  {
    id: "parent-consents",
    actor: "parent",
    rule: "ผู้ปกครองมีหน้าที่ยินยอมและจ่าย ไม่ใช่หน้าที่ชวนหรือกดดัน",
    because: "แรงผลักจากพ่อแม่ทำให้เด็กต้าน เพราะการต้านคือการทวงสิทธิ์เลือกคืน",
  },
  {
    id: "parent-steps-back",
    actor: "parent",
    rule: "ผู้ปกครองเซ็นว่าจะหยุดทำแทน 1 อย่าง ตลอดโปรแกรม",
    because: "พื้นที่ตัดสินใจของเด็กเกิดขึ้นได้ต่อเมื่อมีคนถอยออกมาก่อน",
  },
  {
    id: "refusal",
    actor: "us",
    rule: "ไม่รับเงินถ้ายังไม่ได้ยินเสียงเด็กอย่างน้อย 1 ข้อความ",
    because: "ดีลที่ปิดกับผู้ปกครองล้วนๆ จะได้เด็กที่มานั่งเป็นผู้ชม แล้วเราจะเสียทั้งผลลัพธ์และรีวิว",
  },
  {
    id: "never-produce",
    actor: "us",
    rule: "ไม่มีใครในทีมแตะชิ้นงานของเด็ก ถามได้อย่างเดียว",
    because: "วินาทีที่ mentor เขียนงานให้ เราคือคนรับทำพอร์ตที่แบรนด์ดีกว่า",
  },
];

export interface MarketingLane {
  id: "student" | "parent";
  audience: string;
  channel: string;
  job: string;
  hook: string;
  antiPattern: string;
}

/**
 * Student pull is primary. Parent lane exists to remove the obstacle, never to
 * create the motivation.
 */
export const MARKETING_LANES: MarketingLane[] = [
  {
    id: "student",
    audience: "นักเรียน ม.4 ถึง ม.6",
    channel: "Instagram และ TikTok",
    job: "ทำให้รู้สึกว่าต้องเปลี่ยน และเปลี่ยนได้ถ้ามาอยู่กับเรา",
    hook: "งานของรุ่นพี่ที่หน้าตาเหมือนเขา พร้อมจุดที่พังและสิ่งที่แก้",
    antiPattern: "สอน เตือน หรือขู่เรื่องอนาคต เพราะได้ความรู้สึกผิด ไม่ได้การลงมือ",
  },
  {
    id: "parent",
    audience: "ผู้ปกครอง",
    channel: "Facebook",
    job: "ปลดล็อกงบและปลดแรงกดดัน ไม่ใช่สร้างแรงจูงใจให้ลูก",
    hook: "5 คำถามที่กรรมการถามต่อ ถ้าลูกตอบไม่ได้ แปลว่าพอร์ตนั้นไม่ใช่ของลูก",
    antiPattern: "ชวนให้ผู้ปกครองไปกดดันลูกให้สมัคร เพราะจะได้เด็กที่ต้านตั้งแต่วันแรก",
  },
];

export const NORTH_STAR = {
  metric: "% ของศิษย์เก่าที่ยังสร้างของเองแบบไม่มีใครจ้างและไม่มีใครคุม 60 วันหลังจบ",
  measures: "เป็นทั้งตัววัดว่าเด็กขยับถึงขั้น identified และเป็นเชื้อเพลิงของลูปรุ่นพี่",
  floor: 0.2,
  compounding: 0.4,
  note: "ต่ำกว่า 20% แปลว่าเราเป็นบริษัทค่าย เกิน 40% แปลว่าเน็ตเวิร์กเริ่มทบต้น",
} as const;

export interface ModelRisk {
  id: string;
  risk: string;
  defense: string;
}

export const MODEL_RISKS: ModelRisk[] = [
  {
    id: "school-pressure",
    risk: "โรงเรียนอยากได้ของที่ตรวจง่ายและคุมได้ ซึ่งคือสิ่งที่ฆ่า autonomy พอดี",
    defense: "หลักฐานที่ตรวจสอบได้ทำให้อ่านง่ายโดยไม่ต้องสั่งเด็ก ใช้ record เป็นเกราะ",
  },
  {
    id: "alumni-decay",
    risk: "รุ่นพี่มีอายุใช้งานสั้น และคุณภาพตกถ้าไม่เทรน",
    defense: "ทุกรุ่นต้องผลิต mentor ของตัวเอง วัดอัตราแปลงเป็น mentor ทุกรุ่น",
  },
  {
    id: "room-dies",
    risk: "ห้องฟรีตายถ้าไม่มีพลังงานป้อน และมีภาระ safeguarding",
    defense: "งานต้องมองเห็นได้ในห้อง ห้าม DM เดี่ยวกับเด็ก คุยในช่องที่เห็นกันหมด",
  },
  {
    id: "good-deed",
    risk: "ความรู้สึกว่าเป็นธุรกิจเพื่อสังคม ทำให้ตั้งราคาต่ำเกินจริง",
    defense: "ราคาต่ำไม่ใช่ความใจดี มันคัดผู้ปกครองที่เทียบราคา แทนที่จะคัดเด็กที่เอาจริง",
  },
];

export interface NextTest {
  id: string;
  question: string;
  test: string;
  passBar: string;
}

export const NEXT_TESTS: NextTest[] = [
  {
    id: "student-pull",
    question: "เด็กสมัครเองได้ไหม โดยที่ผู้ปกครองไม่ต้องผลัก",
    test: "โพสต์งานรุ่นพี่พร้อมจุดที่พัง แล้วให้ทางเดียวคือเด็กทักมาเอง",
    passBar: "เด็กทักเองอย่างน้อย 30 คน โดยไม่มีผู้ปกครองอยู่ในบทสนทนา",
  },
  {
    id: "parent-permission",
    question: "ผู้ปกครองจ่ายให้หลักฐาน แทนที่จะจ่ายให้ผลงานสำเร็จรูป ไหม",
    test: "โพสต์ Facebook ฮุกคำถามที่กรรมการถามต่อ ปลายทางคือใบงานข้อตกลง 7 วัน",
    passBar: "ได้ข้อตกลงที่เซ็นสองฝ่ายกลับมา 10 ใบ",
  },
  {
    id: "mentor-loop",
    question: "รุ่นที่ผ่านมาผลิต mentor ได้ถึงจุดคุ้มทุนหรือยัง",
    test: "ไล่นับศิษย์เก่าทุกคนว่า 60 วันหลังจบยังสร้างของเองอยู่ไหม แล้วชวนมาเป็น mentor",
    passBar: "อัตราแปลงเป็น mentor แตะ 17% ในรุ่นถัดไป",
  },
];
