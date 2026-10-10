/**
 * Student voices for SHIFT marketing, from interviews with SHIFT and
 * TechSeed students. Consent for public use was collected by the site owner
 * (2026-10-07). Students are minors: nicknames and grade only, never a school,
 * town, surname or handle.
 *
 * Quotes are trimmed with "…" but never reworded. \u2060 (word joiner) glues
 * loanwords Chrome's Thai line breaker would otherwise split, e.g. ออนไซต์.
 */

export interface ShiftVoice {
  name: string;
  meta: string;
  quote: string;
}

export const SHIFT_VOICES = {
  kkGrandpa: {
    name: "เคเค",
    meta: "SHIFT",
    quote:
      "เห็นคุณตาที่บ้านสแกน QR Code ไม่เป็น ถ้าไม่เปิด LINE สแกนไม่ถูก ผมเลยทำแอปช่วยคนแก่ สแกนเด้งเข้าแอปธนาคารได้เลย",
  },
  potterIntrovert: {
    name: "พ็อตเตอร์",
    meta: "ม.6 · SHIFT[0]",
    quote:
      "ผมเป็นคน introvert ไปค่ายไหนก็ไม่ค่อย make friend แต่เพราะอยากได้ผลงานเข้าพอร์ต เราเลยต้องกัดฟันเผชิญหน้าไปสัมภาษณ์คนอื่น",
  },
  potterSelfTaught: {
    name: "พ็อตเตอร์",
    meta: "ม.6 · SHIFT[0]",
    quote:
      "งานที่โรงเรียนครูคอยทำให้ … แต่ค่ายนี้เราต้องค้นเองหมด ทำให้รู้ว่าไม่ต้องมีครูก็ได้ เราหาความรู้เองได้",
  },
  /** The founder's words, not a student's: never label this as a student voice. */
  founderFishingRod: {
    name: "ผู้ก่อตั้ง PassionSeed",
    meta: "ทำไมเราให้ใช้ AI",
    quote:
      "ที่พี่ให้ OpenCode ไป มันเหมือนการให้เบ็ดตกปลา ไม่ใช่ให้ปลา มันทำให้เด็กได้ฝึกคิดนอกกรอบและรับผิดชอบผลงานตัวเอง",
  },
  hanaPrice: {
    name: "ฮานะ",
    meta: "ม.5 · ศิษย์เก่า TechSeed",
    quote: "7 วัน 990 บาท คุ้มและถูกมากค่ะ ค่ายอื่นที่หนูไป 3 วันออน\u2060ไซต์โดนไปเกือบ 2,000 บาท",
  },
} satisfies Record<string, ShiftVoice>;

/**
 * What students told us after a round, and what the next round does about
 * it. Each row pairs a real remark with a real change in the SHIFT[1] format.
 */
export interface ShiftChange {
  heard: string;
  who: string;
  changed: string;
}

export const SHIFT_CHANGES: ShiftChange[] = [
  {
    heard: "หาคนนอกมาลองใช้ ต้องใช้เวลา",
    who: "เคเค",
    changed: "ทุกคนเลือกคนที่จะไปขอให้ลองตั้งแต่วันแรก และมีการ์ด Tester Hunt สอนทักทีละคน ไม่ใช่โพสต์ลงสตอรี่",
  },
  {
    heard: "มันง่ายเกินไป แค่สั่ง AI ก็ได้ เลยขี้เกียจ",
    who: "ป่าน",
    changed: "การ์ด Anti Meat Proxy: ไม่ก๊อป AI ไปแปะ ต้องตั้งคำถาม ตัดสิน และรับผิดชอบเอง",
  },
  {
    heard: "เขียนว่าทำเครื่องมือได้ในวันเดียว คนจะคิดว่าหลอก",
    who: "เคเค",
    changed: "เราสัญญาแค่ของที่ทำได้จริง: ต้นแบบที่คนนอกลองใช้ได้ ไม่ใช่แอปเสร็จสมบูรณ์",
  },
  {
    heard: "เป็นคน introvert ไปค่ายไหนก็ไม่ค่อยมีเพื่อน",
    who: "พ็อตเตอร์",
    changed: "ทำเดี่ยวหรือทีม 1-3 คนก็ได้ และทุกเย็นทั้งห้องช่วยกันดูงาน ไม่ต้องเก่งเข้าสังคมก่อน",
  },
];
