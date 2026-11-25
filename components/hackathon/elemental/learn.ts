import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { ELEMENT_DETAILS } from "./challenges";
import type { ElementKey } from "./media";

/**
 * Helps a student (M.3 to M.6) go deeper on one element's brief: the words
 * they will meet when they read about it, and a prompt they can paste into
 * any AI chat to learn the problem before the hackathon.
 */

export interface Keyword {
  th: string;
  /** The English term, so they can search sources that aren't in Thai. */
  en: string;
  meaningTh: string;
}

export const ELEMENT_KEYWORDS: Record<ElementKey, readonly Keyword[]> = {
  water: [
    { th: "สารหนู", en: "arsenic", meaningTh: "ธาตุพิษที่ไม่มีสี กลิ่น หรือรส ถ้าได้รับทีละน้อยเป็นเวลานาน เสี่ยงมะเร็งและโรคผิวหนัง" },
    { th: "โลหะหนัก", en: "heavy metals", meaningTh: "สารอย่างตะกั่ว แคดเมียม ปรอท ที่สะสมในร่างกายและขับออกได้ยาก" },
    { th: "ค่ามาตรฐาน", en: "safe limit", meaningTh: "ระดับสูงสุดที่ยังถือว่าปลอดภัย ผลตรวจต้องเทียบกับค่านี้ถึงจะรู้ว่าอันตรายไหม" },
    { th: "ต้นน้ำ ปลายน้ำ", en: "upstream / downstream", meaningTh: "สิ่งที่ปล่อยลงแม่น้ำที่ต้นน้ำ ไหลไปถึงทุกคนที่อยู่ปลายน้ำ แม้จะอยู่คนละประเทศ" },
    { th: "การปนเปื้อน", en: "contamination", meaningTh: "สารที่ไม่ควรอยู่ในน้ำ ดิน หรืออาหาร เข้าไปปะปนอยู่" },
    { th: "การสะสมในห่วงโซ่อาหาร", en: "bioaccumulation", meaningTh: "สารพิษสะสมในหอยและปลา แล้วส่งต่อมาถึงคนที่กินมัน" },
  ],
  earth: [
    { th: "กากอุตสาหกรรม", en: "industrial waste", meaningTh: "ของเสียที่เหลือจากโรงงาน ต้องส่งไปกำจัดตามกฎหมาย" },
    { th: "ของเสียอันตราย", en: "hazardous waste", meaningTh: "ขยะที่เป็นพิษ ติดไฟ หรือกัดกร่อนได้ ต้องเก็บและขนแยกจากขยะทั่วไป" },
    { th: "แคดเมียม", en: "cadmium", meaningTh: "โลหะหนักที่ทำลายไตและกระดูก ถ้าเข้าสู่ร่างกายผ่านน้ำ อาหาร หรือฝุ่น" },
    { th: "ขยะอิเล็กทรอนิกส์", en: "e-waste", meaningTh: "มือถือ คอมพิวเตอร์ และเครื่องใช้ไฟฟ้าที่ทิ้งแล้ว มีทั้งโลหะมีค่าและสารพิษอยู่ข้างใน" },
    { th: "การลักลอบทิ้ง", en: "illegal dumping", meaningTh: "การแอบเอาขยะไปฝังหรือกองไว้ในที่ที่ไม่ได้รับอนุญาต เพื่อเลี่ยงค่ากำจัด" },
    { th: "การติดตามขยะ", en: "waste tracking / manifest", meaningTh: "การบันทึกว่าขยะแต่ละล็อตผ่านมือใครบ้าง ตั้งแต่โรงงานจนถึงที่กำจัด" },
  ],
  air: [
    { th: "ฝุ่น PM2.5", en: "fine particulate matter", meaningTh: "ฝุ่นที่เล็กกว่า 2.5 ไมครอน เล็กพอจะเข้าไปลึกถึงปอดและกระแสเลือด" },
    { th: "ดัชนีคุณภาพอากาศ", en: "AQI", meaningTh: "ตัวเลขเดียวที่สรุปว่าอากาศวันนี้อันตรายแค่ไหน ใช้ดูง่ายกว่าค่าฝุ่นดิบ" },
    { th: "ไมโครกรัมต่อลูกบาศก์เมตร", en: "µg/m³", meaningTh: "หน่วยที่บอกว่าในอากาศหนึ่งลูกบาศก์เมตรมีฝุ่นหนักเท่าไร" },
    { th: "การเผาในที่โล่ง", en: "open burning", meaningTh: "การเผาไร่ ป่า หรือขยะกลางแจ้ง ต้นเหตุใหญ่ของควันภาคเหนือหน้าแล้ง" },
    { th: "เซนเซอร์วัดฝุ่นราคาถูก", en: "low-cost sensor", meaningTh: "เครื่องวัดฝุ่นเล็กๆ ที่ชุมชนติดเองได้ แม่นน้อยกว่าสถานีของรัฐ แต่มีได้หลายจุด" },
    { th: "หลักฐาน", en: "evidence", meaningTh: "บันทึกเวลา รูป และอาการ ที่ทำให้เจ้าหน้าที่เชื่อและตามเรื่องต่อได้" },
  ],
  fire: [
    { th: "สารเคมีอันตราย", en: "hazardous chemicals", meaningTh: "สารที่ติดไฟ ระเบิด หรือเป็นพิษ ถ้าไหม้จะปล่อยควันที่อันตรายกว่าควันไฟธรรมดา" },
    { th: "การอพยพ", en: "evacuation", meaningTh: "การพาคนออกจากพื้นที่อันตรายไปที่ปลอดภัย ต้องรู้ก่อนว่าไปทางไหนและไปที่ไหน" },
    { th: "รัศมีอันตราย", en: "evacuation radius", meaningTh: "ระยะรอบจุดเกิดเหตุที่คนต้องออกห่าง เช่น 5 กิโลเมตรรอบโรงงาน" },
    { th: "สไตรีน", en: "styrene", meaningTh: "สารเคมีที่ใช้ทำโฟมและพลาสติก ไอของมันเป็นพิษเมื่อสูดเข้าไป" },
    { th: "แผนรับมือเหตุฉุกเฉิน", en: "emergency response plan", meaningTh: "แผนที่เขียนไว้ล่วงหน้าว่าใครต้องทำอะไร เมื่อไร ตอนเกิดเหตุ" },
    { th: "ระบบเตือนภัยล่วงหน้า", en: "early warning system", meaningTh: "ระบบที่บอกคนให้รู้ตัวก่อนอันตรายมาถึง เช่น SMS ไซเรน หรือแอป" },
  ],
  aether: [
    { th: "ดีปเฟก", en: "deepfake", meaningTh: "คลิปหรือเสียงที่ AI ทำให้ดูเหมือนคนจริงพูดหรือทำสิ่งที่เขาไม่เคยทำ" },
    { th: "ข่าวปลอม", en: "misinformation / disinformation", meaningTh: "ข้อมูลผิดที่แชร์ต่อโดยไม่ตั้งใจ หรือข้อมูลผิดที่ตั้งใจสร้างมาหลอก" },
    { th: "การตรวจสอบข้อเท็จจริง", en: "fact-checking", meaningTh: "การหาที่มาและหลักฐาน ว่าข้อความหรือรูปนั้นจริงไหม ก่อนเชื่อหรือแชร์" },
    { th: "อัลกอริทึมฟีด", en: "recommendation algorithm", meaningTh: "ระบบที่เลือกว่าเราจะเห็นโพสต์อะไรต่อ โดยดูจากสิ่งที่ทำให้เราอยู่ในแอปนานที่สุด" },
    { th: "การออกแบบให้เสพติด", en: "addictive design", meaningTh: "ลูกเล่นอย่างเลื่อนได้ไม่สิ้นสุดหรือแจ้งเตือนถี่ๆ ที่ทำให้วางมือถือได้ยาก" },
    { th: "ดาต้าเซ็นเตอร์", en: "data center", meaningTh: "อาคารที่มีคอมพิวเตอร์นับพันเครื่องทำงานตลอดเวลา และใช้ไฟกับน้ำปริมาณมาก" },
  ],
};

/**
 * The prompt a student copies into ChatGPT, Claude or Gemini. It carries the
 * brief and the real cases, asks for a plain explanation and the keywords,
 * then ends with a quiz so the student checks what they understood.
 */
export function buildLearnPrompt(key: ElementKey, elementName: string): string {
  const detail = ELEMENT_DETAILS[key];
  const cases = detail.cases.map((c) => `- ${c.titleTh} (${c.placeTh}, ${c.yearTh})`).join("\n");
  const keywords = ELEMENT_KEYWORDS[key].map((k) => `${k.th} (${k.en})`).join(", ");

  return [
    `ฉันเป็นนักเรียนมัธยมปลาย กำลังจะเข้า hackathon ${ELEMENTAL.days} วัน ทีมเราสนใจโจทย์${elementName}`,
    "",
    `ปัญหา: ${detail.problemTh}`,
    `โจทย์: ${detail.howMightWeTh}`,
    "",
    "เรื่องที่เกิดขึ้นจริงในไทย:",
    cases,
    "",
    `คำที่อยากเข้าใจ: ${keywords}`,
    "",
    "ช่วยฉันแบบนี้ ทีละข้อ:",
    "1. อธิบายปัญหานี้ด้วยภาษาง่ายๆ ใน 5 ประโยค เหมือนเล่าให้เพื่อน ม.3 ฟัง",
    "2. สอนคำข้างบนทีละคำ: แปลว่าอะไร และยกตัวอย่างใกล้ตัว",
    "3. ใครได้รับผลกระทบบ้าง และทำไมปัญหานี้ยังแก้ไม่ได้สักที",
    "4. แนะนำ 3 เรื่องที่ควรขุดต่อ พร้อมคำค้นภาษาอังกฤษสำหรับหาข้อมูลแต่ละเรื่อง",
    "5. ปิดท้ายด้วยคำถาม 3 ข้อ เพื่อเช็กว่าฉันเข้าใจจริงไหม แล้วรอฉันตอบก่อน",
    "",
    "อย่าแต่งตัวเลขหรือข่าวขึ้นมาเอง ถ้าไม่แน่ใจให้บอกตรงๆ และบอกว่าควรไปเช็กที่ไหน ตอบเป็นภาษาไทย",
  ].join("\n");
}
