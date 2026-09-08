import type { FunnelOffer, FunnelStage } from "./marketing-funnel";

/**
 * Self-Determination Theory needs. Every segment is diagnosed by the need that
 * is starved right now, and every worksheet restores that one need only.
 */
export type SdtNeed = "autonomy" | "competence" | "relatedness";

export type SegmentId =
  | "collector"
  | "drifter"
  | "maker"
  | "achiever"
  | "parent-led";

export interface SdtNeedDefinition {
  id: SdtNeed;
  label: string;
  thaiLabel: string;
  definition: string;
  starvedSignal: string;
  killedBy: string;
}

export interface AudienceSegment {
  id: SegmentId;
  label: string;
  thaiLabel: string;
  grade: string;
  /** Share of inbound leads, from the 2026-08 IG PORT campaign. Sums to 100. */
  share: number;
  signal: string;
  saidVerbatim: string;
  belief: string;
  starvedNeed: SdtNeed;
  needEvidence: string;
  restoreMove: string;
  guardrail: string;
  keyword: string;
  entryStage: FunnelStage;
  route: FunnelOffer;
  worksheetSlug: string;
  nextStep: string;
}

export interface WorksheetPrompt {
  n: number;
  ask: string;
  why: string;
}

export interface Worksheet {
  slug: string;
  segmentId: SegmentId;
  title: string;
  thaiTitle: string;
  promise: string;
  timeBox: string;
  need: SdtNeed;
  prompts: WorksheetPrompt[];
  output: string;
  sendBack: string;
  keyword: string;
}

export const SDT_NEEDS: SdtNeedDefinition[] = [
  {
    id: "autonomy",
    label: "Autonomy",
    thaiLabel: "การได้เลือกเอง",
    definition: "The student decides what to work on and why.",
    starvedSignal: "ทุกทางเลือกมีคนอื่นเป็นคนบอกว่าดี",
    killedBy: "เสนอไอเดียหรือคำตอบให้ก่อนที่เขาจะได้เลือกเอง",
  },
  {
    id: "competence",
    label: "Competence",
    thaiLabel: "การพิสูจน์ว่าทำได้",
    definition: "The student sees proof that their own action changed something real.",
    starvedSignal: "มีกิจกรรมเยอะ แต่ไม่มีชิ้นงานที่ตัวเองทำจนจบ",
    killedBy: "ให้คะแนนหรือให้คำชมแทนหลักฐานที่วัดได้",
  },
  {
    id: "relatedness",
    label: "Relatedness",
    thaiLabel: "การมีวงที่เข้าใจ",
    definition: "The student builds inside a room where building is normal.",
    starvedSignal: "สร้างของอยู่คนเดียว ไม่มีใครถามต่อ",
    killedBy: "ปล่อยให้ทำงานคนเดียวแบบ async แล้วหวังว่าจะจบเอง",
  },
];

export const AUDIENCE_SEGMENTS: AudienceSegment[] = [
  {
    id: "collector",
    label: "Certificate collector",
    thaiLabel: "นักสะสมใบเซอร์",
    grade: "ม.5 - ม.6",
    share: 34,
    signal: "คอมเมนต์ PORT แล้วถามว่าพอร์ตพอหรือยัง",
    saidVerbatim: "อยากรู้วิธีการเก็บพอร์ต ควรเริ่มตรงไหน",
    belief: "จำนวนใบเซอร์ คือ น้ำหนักของพอร์ต",
    starvedNeed: "competence",
    needEvidence:
      "สะสมกิจกรรมมาเยอะ แต่ยังไม่มีชิ้นงานที่ตัวเองตัดสินใจแล้วทำจนจบ ความสามารถเลยพิสูจน์ไม่ได้",
    restoreMove:
      "ให้เขาตรวจพอร์ตตัวเองด้วยเกณฑ์ที่วัดได้ แล้วเห็นด้วยตาตัวเองว่าชิ้นไหนมีน้ำหนักจริง",
    guardrail: "ห้ามให้คะแนนพอร์ตแทนเขา ให้เขาให้คะแนนเอง แล้วเราถามต่อเท่านั้น",
    keyword: "PORT",
    entryStage: "tofu",
    route: "both",
    worksheetSlug: "portfolio-weight-test",
    nextStep: "คุย 15 นาทีเรื่องชิ้นที่คะแนนต่ำสุด แล้วเสนอทางอัปเกรด 1 ทาง",
  },
  {
    id: "drifter",
    label: "Undecided explorer",
    thaiLabel: "ยังไม่รู้ว่าชอบอะไร",
    grade: "ม.4",
    share: 26,
    signal: "ทักมาถามว่าไม่รู้ชอบอะไร เริ่มตรงไหนดี",
    saidVerbatim: "ยังไม่รู้ว่าตัวเองชอบอะไร กลัวเลือกผิด",
    belief: "ต้องรู้ก่อนว่าชอบอะไร ถึงจะเริ่มลงมือได้",
    starvedNeed: "autonomy",
    needEvidence:
      "ทางเลือกถูกกำหนดโดยสายการเรียนและที่บ้านมาตลอด เลยยังไม่เคยได้ฝึกเลือกเองในเรื่องที่มีต้นทุนต่ำ",
    restoreMove:
      "เริ่มจากสิ่งที่เขาหงุดหงิดเอง ไม่ใช่จากลิสต์อาชีพ ทำให้การเลือกครั้งแรกเล็กจนกล้าเลือก",
    guardrail: "ห้ามเสนอไอเดียโปรเจกต์ให้ ถามได้ข้อเดียวคือ ใครอีกที่เจอปัญหานี้",
    keyword: "START",
    entryStage: "tofu",
    route: "techseed",
    worksheetSlug: "complaint-to-project",
    nextStep: "ชวนเข้า TechSeed รอบถัดไป โดยใช้ประโยคปัญหาของเขาเป็นโจทย์เริ่ม",
  },
  {
    id: "maker",
    label: "Quiet builder",
    thaiLabel: "ทำของอยู่แล้ว แต่เล่าไม่เป็น",
    grade: "ม.4 - ม.6",
    share: 14,
    signal: "ส่งงานที่ทำอยู่มาให้ดู แล้วถามว่าเอาไปใส่พอร์ตยังไง",
    saidVerbatim: "ทำเกมกับบอทอยู่แล้ว แต่ไม่รู้จะเล่ายังไงให้ดูเป็นเรื่อง",
    belief: "งานที่ทำเล่นๆ เอาไปยื่นไม่ได้",
    starvedNeed: "relatedness",
    needEvidence:
      "สร้างของคนเดียวมาตลอด ไม่มีวงที่การสร้างเป็นเรื่องปกติ เลยไม่มีใครถามต่อและไม่มีหลักฐานสะสม",
    restoreMove:
      "ให้เขามีบันทึกที่คนอื่นอ่านแล้วถามต่อได้ และมีที่ให้เอาไปแปะให้คนเห็น",
    guardrail:
      "ห้ามเขียน case study ให้เขา แก้ภาษาได้ แต่ข้อมูลและการตัดสินใจต้องเป็นของเขา",
    keyword: "SHIP",
    entryStage: "mofu",
    route: "shift",
    worksheetSlug: "ship-log-7-day",
    nextStep: "รับ Ship Log วันที่ 3 แล้วยิง 3 คำถามที่กรรมการชอบถาม ก่อนเสนอ SHIFT",
  },
  {
    id: "achiever",
    label: "High achiever, low conviction",
    thaiLabel: "เก่งแต่ยังไม่กล้าเลือก",
    grade: "ม.5 - ม.6",
    share: 18,
    signal: "ถามเทียบคณะ วิศวะ กับ แพทย์ หรือถามว่าพอร์ตแบบไหนกรรมการชอบ",
    saidVerbatim: "เกรดโอเค แต่ยังตัดสินใจไม่ได้ว่าจะยื่นคณะไหน",
    belief: "เลือกผิดครั้งเดียวคือเสียเวลาทั้งชีวิต",
    starvedNeed: "autonomy",
    needEvidence:
      "มีทางเลือกเยอะ แต่ทุกทางถูกให้คุณค่าจากคนอื่น เลยยังไม่มีเกณฑ์ตัดสินใจของตัวเอง",
    restoreMove:
      "ให้เขาไปเก็บข้อมูลจากคนที่อยู่ในคณะนั้นจริง แล้วตัดสินด้วยเกณฑ์ที่เขาเขียนเอง",
    guardrail: "ห้ามบอกว่าคณะไหนดีกว่า ให้เทียบจากงานจริงที่เขาไปเจอมาเท่านั้น",
    keyword: "PICK",
    entryStage: "mofu",
    route: "both",
    worksheetSlug: "faculty-reality-check",
    nextStep: "อ่านเกณฑ์ 3 ข้อของเขา แล้วเสนอโปรเจกต์ที่พิสูจน์เกณฑ์นั้นได้ใน 7 วัน",
  },
  {
    id: "parent-led",
    label: "Parent-led applicant",
    thaiLabel: "ผู้ปกครองเป็นคนทักมา",
    grade: "ม.4 - ม.6",
    share: 8,
    signal: "ข้อความมาจากผู้ปกครอง ถามราคาและตารางก่อนถามเนื้อหา",
    saidVerbatim: "คุณแม่ทักมาถามแทนลูก อยากให้ลูกมีพอร์ตติดตัว",
    belief: "ถ้าจ่ายค่าค่ายให้ ลูกจะได้พอร์ตกลับมา",
    starvedNeed: "autonomy",
    needEvidence:
      "การตัดสินใจทั้งหมดเกิดนอกตัวเด็ก เด็กเลยเข้าโปรแกรมมาในฐานะผู้ชม ไม่ใช่เจ้าของงาน",
    restoreMove:
      "ย้ายการตัดสินใจกลับไปที่เด็ก ด้วยข้อตกลง 7 วันที่ทั้งสองฝ่ายเซ็นร่วมกัน",
    guardrail:
      "ห้ามปิดการขายกับผู้ปกครองอย่างเดียว ต้องได้ยินเสียงเด็กอย่างน้อย 1 ข้อความก่อนเสนอราคา",
    keyword: "PARENT",
    entryStage: "bofu",
    route: "both",
    worksheetSlug: "seven-day-agreement",
    nextStep: "ได้ข้อตกลงที่เซ็นแล้ว จึงส่ง parent pack พร้อมราคาและตาราง",
  },
];

export const WORKSHEETS: Worksheet[] = [
  {
    slug: "portfolio-weight-test",
    segmentId: "collector",
    title: "Portfolio Weight Test",
    thaiTitle: "เทสต์น้ำหนักพอร์ต",
    promise: "รู้ภายใน 15 นาที ว่าในพอร์ตมีกี่ชิ้นที่เป็นหลักฐานจริง และกี่ชิ้นที่เป็นแค่กิจกรรม",
    timeBox: "15 นาที",
    need: "competence",
    prompts: [
      {
        n: 1,
        ask: "ลิสต์ผลงานและกิจกรรมในพอร์ตตอนนี้ให้ครบ ยังไม่ต้องตัดอะไรออก",
        why: "เห็นของจริงทั้งหมดก่อน ค่อยตัดสิน",
      },
      {
        n: 2,
        ask: "ชิ้นไหนที่เราเป็นคนเลือกเอง ให้ 1 คะแนน ถ้าครูหรือที่บ้านเลือกให้ ให้ 0",
        why: "กรรมการอ่านออกว่าใครเป็นคนตัดสินใจ",
      },
      {
        n: 3,
        ask: "ชิ้นไหนที่เราลงมือทำเอง ไม่ใช่แค่ไปนั่งฟังแล้วได้ใบ ให้ 1 คะแนน",
        why: "การเข้าร่วม กับ การสร้าง คนละน้ำหนัก",
      },
      {
        n: 4,
        ask: "ชิ้นไหนที่มีคนนอกอย่างน้อย 1 คนเคยใช้หรือเคยให้ feedback ให้ 1 คะแนน",
        why: "หลักฐานที่ปลอมไม่ได้ คือ คนอื่นที่แตะของเราจริง",
      },
      {
        n: 5,
        ask: "รวมคะแนนแต่ละชิ้น 0 ถึง 3 แล้ววงชิ้นที่ได้ 2 ขึ้นไป",
        why: "ที่วงไว้คือพอร์ตจริง ที่เหลือคือกิจกรรม",
      },
      {
        n: 6,
        ask: "เลือก 1 ชิ้นที่ได้ 1 คะแนน แล้วเขียนว่าต้องเพิ่มอะไรให้ขึ้นเป็น 3",
        why: "อัปเกรดของเดิมเร็วกว่าเริ่มใหม่",
      },
    ],
    output: "พอร์ตจริง 1 หน้า พร้อมชิ้นที่จะอัปเกรด 1 ชิ้น",
    sendBack: "ถ่ายรูปหน้าที่เขียนเสร็จส่งกลับมาในแชท เราจะบอกว่าชิ้นไหนอัปเกรดง่ายที่สุด",
    keyword: "PORT",
  },
  {
    slug: "complaint-to-project",
    segmentId: "drifter",
    title: "Complaint to Project",
    thaiTitle: "10 เรื่องน่าหงุดหงิด สู่ 1 โปรเจกต์",
    promise: "ไม่ต้องรู้ว่าชอบอะไร ก็เริ่มโปรเจกต์แรกได้ภายใน 20 นาที",
    timeBox: "20 นาที",
    need: "autonomy",
    prompts: [
      {
        n: 1,
        ask: "เขียน 10 อย่างที่ทำให้หงุดหงิดในสัปดาห์นี้ เรื่องเล็กมากก็นับ",
        why: "ความหงุดหงิดเป็นข้อมูลที่ไม่ต้องรอแรงบันดาลใจ",
      },
      {
        n: 2,
        ask: "วงไว้ 3 ข้อที่เจอมากกว่าหนึ่งครั้ง",
        why: "เจอซ้ำ แปลว่าเป็นปัญหาจริง ไม่ใช่อารมณ์วันนั้น",
      },
      {
        n: 3,
        ask: "เลือก 1 ข้อที่คิดว่าเพื่อนอย่างน้อย 3 คนน่าจะเจอเหมือนกัน",
        why: "โปรเจกต์ต้องมีคนอื่นอยู่ในนั้น ไม่งั้นไม่มีใครให้ทดสอบ",
      },
      {
        n: 4,
        ask: "เขียนประโยคเดียว ใครเจอปัญหานี้ ตอนไหน และตอนนี้เขาแก้ด้วยวิธีอะไร",
        why: "ถ้าเขียนไม่ได้ แปลว่ายังไม่รู้จักปัญหาพอ",
      },
      {
        n: 5,
        ask: "ถามเพื่อน 3 คนว่าจริงไหม จดคำตอบเป็นคำพูดของเขาเป๊ะๆ ห้ามสรุปเอง",
        why: "คำพูดจริงคือหลักฐาน ส่วนบทสรุปของเราคือความเห็น",
      },
    ],
    output: "ประโยคปัญหา 1 บรรทัด ที่มีคนยืนยันแล้ว 3 คน",
    sendBack: "ส่งประโยคปัญหากับคำพูดของเพื่อน 3 คนกลับมา แล้วเราจะช่วยตัดให้เล็กพอที่จะทำจบ",
    keyword: "START",
  },
  {
    slug: "ship-log-7-day",
    segmentId: "maker",
    title: "7-Day Ship Log",
    thaiTitle: "Ship Log 7 วัน",
    promise: "เปลี่ยนของที่ทำเล่นอยู่แล้ว ให้กลายเป็นหลักฐานที่กรรมการถามต่อได้",
    timeBox: "10 นาทีต่อวัน เป็นเวลา 7 วัน",
    need: "relatedness",
    prompts: [
      {
        n: 1,
        ask: "ก่อนลงมือแต่ละวัน เขียนสมมติฐาน 1 บรรทัด ว่าเดาว่าอะไรจะเวิร์ก",
        why: "มีคำทำนายก่อน ถึงจะรู้ว่าผลลัพธ์แปลว่าอะไร",
      },
      {
        n: 2,
        ask: "ปล่อยของให้คนนอก 3 คนใช้ จดว่าเขาติดตรงไหน เป็นคำพูดของเขา",
        why: "คนนอก คือ คนที่ไม่เกรงใจเรา",
      },
      {
        n: 3,
        ask: "เขียนว่าอะไรพัง และเราเปลี่ยนอะไรเพราะข้อมูลนั้น พร้อมวันที่",
        why: "นี่คือ Pivot Log ส่วนที่ลอกกันไม่ได้",
      },
      {
        n: 4,
        ask: "จดตัวเลข 1 ตัว ก่อนและหลัง เช่น กี่คนใช้จนจบ หรือติดอยู่กี่วินาที",
        why: "ตัวเลขเดียวที่วัดซ้ำได้ ดีกว่าสิบตัวที่วัดครั้งเดียว",
      },
      {
        n: 5,
        ask: "วันที่ 7 สรุปลงหน้าเดียว สมมติฐาน จุดพัง การเปลี่ยน และตัวเลข",
        why: "หน้าเดียวนี้ใช้ตอบสัมภาษณ์ได้ทั้งห้อง",
      },
      {
        n: 6,
        ask: "ส่งให้คนที่สร้างของเหมือนกัน 1 คนอ่าน แล้วให้เขาถามกลับ 1 คำถาม",
        why: "งานที่ไม่มีใครถามต่อ จะหยุดโตตรงนั้น",
      },
    ],
    output: "Pivot Log 7 วัน และ Case Study 1 หน้า",
    sendBack: "ส่ง Ship Log ของวันที่ 3 มา เราจะยิง 3 คำถามที่กรรมการชอบถามกลับไป",
    keyword: "SHIP",
  },
  {
    slug: "faculty-reality-check",
    segmentId: "achiever",
    title: "Faculty Reality Check",
    thaiTitle: "เช็กคณะจากงานจริง",
    promise: "เลือกคณะด้วยเกณฑ์ของตัวเอง แทนที่จะเลือกตามคนที่เสียงดังที่สุด",
    timeBox: "30 นาที บวกเวลาไปคุยกับคนจริง",
    need: "autonomy",
    prompts: [
      {
        n: 1,
        ask: "เขียน 3 คณะที่ลังเลอยู่ พร้อมเหตุผลปัจจุบัน คณะละ 1 บรรทัด",
        why: "เหตุผลที่ยังไม่ได้เขียนออกมา ตรวจสอบไม่ได้",
      },
      {
        n: 2,
        ask: "ข้างเหตุผลแต่ละข้อ เขียนว่าใครเป็นคนบอกเรา ตัวเราเอง เพื่อน ที่บ้าน หรือติวเตอร์",
        why: "แยกให้ออกว่าอันไหนเป็นความคิดเรา อันไหนเป็นเสียงคนอื่น",
      },
      {
        n: 3,
        ask: "หาคนที่เรียนหรือทำงานสายนั้นจริง คณะละ 1 คน แล้วถามว่า สัปดาห์ที่แล้วทำอะไรจริงบ้าง อะไรน่าเบื่อที่สุด และถ้าย้อนกลับไปได้จะเลือกใหม่ไหม",
        why: "อาชีพจริงวัดกันที่วันธรรมดา ไม่ใช่วันที่ดีที่สุด",
      },
      {
        n: 4,
        ask: "จดคำตอบเป็นคำพูดเขา แล้วขีดฆ่าเหตุผลเดิมที่ข้อมูลจริงไม่รองรับ",
        why: "การตัดเหตุผลที่ผิดออก คือ การตัดสินใจ",
      },
      {
        n: 5,
        ask: "เขียนเกณฑ์ของตัวเอง 3 ข้อ แล้วให้คะแนนทั้ง 3 คณะด้วยเกณฑ์นั้น",
        why: "เกณฑ์ที่เราเขียนเอง ใช้ได้อีกหลายครั้งในชีวิต",
      },
    ],
    output: "1 คณะที่เลือก พร้อมเหตุผลที่มาจากข้อมูลจริง",
    sendBack: "ส่งเกณฑ์ 3 ข้อกับตารางคะแนนกลับมา เราจะช่วยหาโปรเจกต์ที่พิสูจน์เกณฑ์นั้นได้",
    keyword: "PICK",
  },
  {
    slug: "seven-day-agreement",
    segmentId: "parent-led",
    title: "7-Day Agreement",
    thaiTitle: "ข้อตกลง 7 วัน ระหว่างลูกกับที่บ้าน",
    promise: "ทำให้ลูกเป็นคนตัดสินใจบรรทัดแรก ก่อนที่บ้านจะจ่ายค่าอะไรก็ตาม",
    timeBox: "20 นาที นั่งด้วยกัน",
    need: "autonomy",
    prompts: [
      {
        n: 1,
        ask: "ลูกเขียนเอง 1 บรรทัด สิ่งที่อยากลองทำใน 7 วันนี้",
        why: "ถ้าบรรทัดแรกไม่ใช่ลายมือลูก ที่เหลือจะไม่เกิด",
      },
      {
        n: 2,
        ask: "ที่บ้านเขียน 1 อย่างที่จะหยุดทำแทนลูกใน 7 วันนี้ เช่น หยุดหาคอร์สให้",
        why: "พื้นที่ตัดสินใจของลูก ต้องมีคนถอยออกมาก่อน",
      },
      {
        n: 3,
        ask: "ตกลงเวลา 3 ช่วง ช่วงละ 60 นาที ที่ลูกทำงานได้โดยไม่มีใครถามความคืบหน้า",
        why: "การถูกถามทุกชั่วโมง ทำให้ความเป็นเจ้าของหายไป",
      },
      {
        n: 4,
        ask: "เขียนว่าวันที่ 7 จะเอาอะไรมาให้ดู ต้องเป็นของที่จับต้องได้ 1 ชิ้น ไม่ใช่คำอธิบาย",
        why: "ของจริง 1 ชิ้น ตรวจสอบง่ายกว่าคำสัญญา",
      },
      {
        n: 5,
        ask: "เซ็นทั้งสองฝ่าย แล้วแปะไว้ในที่ที่เห็นทุกวัน",
        why: "ข้อตกลงที่มองเห็น ทำให้ไม่ต้องทวงกันด้วยเสียง",
      },
    ],
    output: "ข้อตกลง 1 หน้า ที่ลูกเป็นคนเขียนบรรทัดแรก",
    sendBack: "ส่งรูปข้อตกลงที่เซ็นแล้วกลับมา แล้วเราจะส่ง parent pack พร้อมราคาและตารางให้",
    keyword: "PARENT",
  },
];

export interface FunnelConversionStep {
  id: string;
  label: string;
  baseline: number;
  target: number;
  baselineSource: string;
  mechanism: string;
  /** Steps the segmentation is not allowed to claim credit for. */
  heldFlat?: boolean;
}

/**
 * Baseline rates come from the 2026-08-12/13 IG "PORT" campaign
 * (326 DM threads, 114 engaged). The close rate is deliberately held flat so
 * the projected lift is earned by answering and giving, not by a better pitch.
 */
export const FUNNEL_CONVERSION_STEPS: FunnelConversionStep[] = [
  {
    id: "answered",
    label: "ทักมาแล้วได้คำตอบใน 24 ชั่วโมง",
    baseline: 0.34,
    target: 0.85,
    baselineSource: "66% ของเธรดจบลงที่ลีดรอคำตอบอยู่",
    mechanism: "คำถามแรกจับ segment ได้ทันที คำตอบแรกจึงเป็น worksheet ที่เตรียมไว้แล้ว",
  },
  {
    id: "asset",
    label: "ได้ worksheet ไปจริง",
    baseline: 0.17,
    target: 0.6,
    baselineSource: "มีแค่ 17% ของลีดที่คุยด้วย ที่เคยเห็นลิงก์ของเราเลย",
    mechanism: "หนึ่ง segment หนึ่ง worksheet ฟรี ไม่ต้องคิดใหม่ทุกครั้งว่าจะส่งอะไร",
  },
  {
    id: "qualified",
    label: "ส่งงานกลับมา กลายเป็นบทสนทนาที่ qualify",
    baseline: 0.25,
    target: 0.3,
    baselineSource: "ประเมินจากเธรดที่คุยต่อจนได้บริบทของนักเรียน",
    mechanism: "worksheet มีของให้ส่งกลับ 1 ชิ้น การ qualify จึงเกิดจากพฤติกรรม ไม่ใช่คำพูด",
  },
  {
    id: "paid",
    label: "จาก qualified ไปเป็นจ่ายเงิน",
    baseline: 0.2,
    target: 0.2,
    baselineSource: "อัตราปิดปัจจุบัน",
    mechanism: "ตั้งใจไม่แตะ เพื่อไม่ให้ตัวเลขรวมมาจากการเคลมว่าปิดการขายเก่งขึ้น",
    heldFlat: true,
  },
];

export interface FunnelLiftStep extends FunnelConversionStep {
  lift: number;
}

export interface FunnelLiftProjection {
  steps: FunnelLiftStep[];
  baselineRate: number;
  targetRate: number;
  totalLift: number;
}

function multiply(values: number[]) {
  return values.reduce((total, value) => total * value, 1);
}

export function projectFunnelLift(
  steps: FunnelConversionStep[] = FUNNEL_CONVERSION_STEPS
): FunnelLiftProjection {
  const baselineRate = multiply(steps.map((step) => step.baseline));
  const targetRate = multiply(steps.map((step) => step.target));

  return {
    steps: steps.map((step) => ({ ...step, lift: step.target / step.baseline })),
    baselineRate,
    targetRate,
    totalLift: baselineRate === 0 ? 0 : targetRate / baselineRate,
  };
}

/** Paid conversations produced by a given number of inbound leads. */
export function projectPaidFromLeads(leads: number, rate: number) {
  return Math.round(leads * rate * 10) / 10;
}

export function getWorksheet(slug: string): Worksheet | undefined {
  return WORKSHEETS.find((worksheet) => worksheet.slug === slug);
}

export function getSegment(id: SegmentId): AudienceSegment | undefined {
  return AUDIENCE_SEGMENTS.find((segment) => segment.id === id);
}

export function getSegmentByKeyword(keyword: string): AudienceSegment | undefined {
  const normalized = keyword.trim().toUpperCase();
  return AUDIENCE_SEGMENTS.find((segment) => segment.keyword === normalized);
}

export function getWorksheetForSegment(id: SegmentId): Worksheet | undefined {
  const segment = getSegment(id);
  return segment ? getWorksheet(segment.worksheetSlug) : undefined;
}

export function getSdtNeed(id: SdtNeed): SdtNeedDefinition {
  const need = SDT_NEEDS.find((entry) => entry.id === id);
  if (!need) {
    throw new Error(`Unknown SDT need: ${id}`);
  }
  return need;
}

export function getSegmentsByStage(stage: FunnelStage): AudienceSegment[] {
  return AUDIENCE_SEGMENTS.filter((segment) => segment.entryStage === stage);
}

export const WORKSHEET_BASE_PATH = "/worksheet";

export function worksheetPath(slug: string) {
  return `${WORKSHEET_BASE_PATH}/${slug}`;
}

/**
 * The canned first reply for a segment. One tap, so the 24-hour answer rate is
 * a routing problem instead of a writing problem.
 */
export function buildDmReply(segment: AudienceSegment, origin = "https://passionseed.co") {
  const worksheet = getWorksheet(segment.worksheetSlug);
  if (!worksheet) {
    throw new Error(`Segment ${segment.id} has no worksheet.`);
  }

  return [
    `เข้าใจแล้วครับ ${segment.saidVerbatim} เป็นสิ่งที่หลายคนเจอเหมือนกัน`,
    "",
    `ส่งของให้ก่อน ไม่มีค่าใช้จ่าย: ${worksheet.thaiTitle} ใช้เวลา ${worksheet.timeBox}`,
    `${origin}${worksheetPath(worksheet.slug)}`,
    "",
    `ทำเสร็จจะได้: ${worksheet.output}`,
    worksheet.sendBack,
  ].join("\n");
}
