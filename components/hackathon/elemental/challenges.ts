/**
 * What each element covers on /hackathon: the kind of problem, one example,
 * and what it does to people. Students in the first card test didn't see the
 * after effect, so every element says it (Big, 2026-11-20).
 *
 * Source: company-brain private/hackathon-december-2026-student-test.md (the
 * cards in the message sent to students before the test on Sun 22 Nov). Each
 * example is one problem of its kind; teams can pick any problem of that kind
 * (Angpao, 2026-11-20, decisions/log.md). Swap in students' own words after
 * the test. Element names come from ../poster/elemental/facts.ts.
 */
export type ElementKey = "water" | "earth" | "air" | "fire" | "aether";

export type ElementChallenge = {
  key: ElementKey;
  /** The kind of problem, in a few words. */
  kind: string;
  /** One real example of that kind. */
  example: string;
  /** What it does to people: the after effect. */
  effect: string;
};

export const ELEMENT_CHALLENGES: readonly ElementChallenge[] = [
  {
    key: "earth",
    kind: "ขยะและดินที่ปนเปื้อน",
    example:
      "มือถือเก่ากับแบตหมดที่เราทิ้ง บางส่วนไปจบที่โรงงานเถื่อนที่แกะแล้วเผา ไม่มีใครตามได้",
    effect: "ตะกั่วกับแคดเมียมซึมลงดินและน้ำแถวนั้น ตะกั่วทำให้สมองเด็กพัฒนาช้า",
  },
  {
    key: "water",
    kind: "น้ำเสียที่ไหลลงแม่น้ำ",
    example:
      "ที่เชียงราย แม่น้ำมีสารหนูจากเหมืองต้นน้ำ ชาวบ้านยังใช้น้ำรดผัก หาปลา เพราะผลตรวจอ่านไม่รู้เรื่อง",
    effect: "ใช้ไปนานๆ สารหนูสะสมในตัว ทำให้เป็นแผลที่ผิวหนังและเป็นมะเร็งได้",
  },
  {
    key: "air",
    kind: "ฝุ่นและควันที่ลอยอยู่ในอากาศ",
    example:
      "โรงงานเล็กๆ แอบเผาขยะใกล้บ้านคน เพื่อนบ้านได้กลิ่นเหม็นบ่อยๆ แต่พอไปแจ้งก็ไม่มีหลักฐาน",
    effect: "ควันพลาสติกกับฝุ่นเข้าปอดทุกวัน เด็กกับคนแก่ป่วยง่ายที่สุด",
  },
  {
    key: "fire",
    kind: "การเผาที่ลุกลามจนคุมไม่อยู่",
    example:
      "โกดังเก็บกากสารเคมีที่ถูกสั่งให้ขนออกไปนานแล้ว เกิดไฟไหม้ ชาวบ้านไม่รู้ว่าข้างในมีอะไร ต้องหนีไปไหน",
    effect: "ไฟดับแล้วแต่สารพิษยังค้างในดินและน้ำ ไร่นาแถวนั้นเสียหายไปอีกนาน",
  },
  {
    key: "aether",
    kind: "ภัยที่มองไม่เห็น",
    example:
      "ข่าวปลอม คลิป AI ปั่นยอดวิว โฆษณาว่ารักษ์โลกทั้งที่ไม่จริง ถูกส่งต่อในกลุ่มไลน์ครอบครัวทุกวัน",
    effect: "คนทำได้เงิน คนเชื่อเสียเงิน เสียสุขภาพ และปัญหาจริงถูกกลบจนไม่มีใครสนใจ",
  },
];

/** Under the list: the examples are not the only problems (from the sponsor deck). */
export const ANY_PROBLEM_NOTE = "ทีมเลือกปัญหาใดก็ได้ในธาตุนั้น หรือรวมหลายธาตุ";
