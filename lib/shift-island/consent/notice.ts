import { ECONOMY_TERMS_DRAFT, ISLAND_PRIZES_DRAFT } from "@/lib/content/shift-island-economy";
import type { SeedstackNoticeRow } from "@/lib/seedstack/consent";
import { SHIFT_NOTICE } from "@/lib/shift/parentConsent";
import { ISLAND_CONSENT_VERSION } from "@/lib/supabase/shift-quests/playerTypes";

/**
 * The PDPA notice for SHIFT High Island, read by the parent on
 * /shift/island/parent/{token} and by a student confirming their own age.
 * Same shape as SHIFT_NOTICE (one emoji row per point, rendered aria-hidden
 * by PdpaNotice). What it covers: the team showing up in public (the island,
 * Discord posts and shares), the shop and prizes, and, as a separate optional
 * item, the AI island news. Until consent the student plays privately.
 *
 * DRAFT COPY for the founder's Thai review. Bump ISLAND_CONSENT_VERSION
 * (lib/supabase/shift-quests/playerTypes.ts) whenever a row changes in
 * substance: adding or dropping a use, a recipient or a right.
 */

export const ISLAND_NOTICE_VERSION = ISLAND_CONSENT_VERSION;

/** The data controller and the rights, worded once in SHIFT_NOTICE; reused so the address lives in one place. */
const SHIFT_RIGHTS = SHIFT_NOTICE.rows.find((row) => row.lead === "สิทธิและช่องทางติดต่อ");

const RIGHTS: SeedstackNoticeRow = {
  emoji: "💬",
  lead: "สิทธิและช่องทางติดต่อ",
  short: "ขอดู แก้ ลบ หรือถอนความยินยอมได้ ทักพี่ใน LINE ของ SHIFT",
  text: (SHIFT_RIGHTS?.text ?? "").replace("ผู้สมัครและผู้ปกครอง", "นักเรียนและผู้ปกครอง"),
};

export const ISLAND_NOTICE: { title: string; version: string; rows: readonly SeedstackNoticeRow[] } = {
  title: "เกาะ SHIFT High แสดงอะไร และเก็บอะไรบ้าง",
  version: ISLAND_NOTICE_VERSION,
  rows: [
    {
      emoji: "🧭",
      lead: "ใช้ทำอะไร",
      short: "ให้ทีมขึ้นบนเกาะ โพสต์ในห้อง Discord ของ SHIFT แลกของในร้าน และรับรางวัลได้",
      text: "ความยินยอมนี้ใช้กับเกาะ SHIFT High เท่านั้น เกาะเป็นเว็บและห้อง Discord ที่นักเรียนทำโปรเจกต์จริงเป็นทีม ทำเควสต์ทีละขั้น และพี่เลี้ยงตรวจงานผ่านระบบของเกาะ ไม่มีแชตส่วนตัวระหว่างผู้ใหญ่กับนักเรียน ไม่ขาย และไม่ใช้ยิงโฆษณา",
    },
    {
      emoji: "🏝️",
      lead: "สิ่งที่คนอื่นเห็นหลังยินยอม",
      short: "ชื่อทีม ต้นไม้ของทีม และความคืบหน้าในห้อง Discord ของ SHIFT",
      items: [
        "ชื่อทีมและต้นไม้ของทีมบนเกาะ เฉพาะเมื่อทุกคนในทีมเลือกแสดงชื่อ",
        "ความคืบหน้าของทีมในโพสต์ประจำวันและสรุปรายสัปดาห์ ในห้อง Discord ของ SHIFT",
        "งานที่ผ่านที่นักเรียนกดแชร์เอง และคำขอบคุณระหว่างเพื่อน ในห้อง Discord ของ SHIFT",
      ],
    },
    {
      emoji: "🛍️",
      lead: "ร้านค้าและรางวัล",
      short: "แลก Passioncoin เป็นของในร้าน และรับรางวัล Demo Day ได้",
      items: [
        `แลก Passioncoin เป็นของในร้าน ${ECONOMY_TERMS_DRAFT.fulfillmentProcess}`,
        `รับรางวัล Demo Day ได้ ${ISLAND_PRIZES_DRAFT.moneyNote}`,
      ],
    },
    {
      emoji: "🔒",
      lead: "ก่อนยินยอม",
      short: "เล่นและทำเควสต์ได้ตามปกติ แค่ยังไม่ขึ้นที่สาธารณะ",
      text: "ระหว่างรอ นักเรียนเล่นและทำเควสต์ได้ตามปกติ พี่เลี้ยงตรวจงานได้ แต่ชื่อทีมไม่ขึ้นบนเกาะของคนอื่น ไม่ขึ้นโพสต์และข่าวเกาะใน Discord และยังแลกของหรือรับรางวัลไม่ได้",
    },
    {
      emoji: "🤖",
      lead: "ข่าวเกาะที่สรุปโดย AI (เลือกได้)",
      short: "ยินยอมแยก ไม่ยินยอมก็เล่นเกาะได้ครบ แค่ทีมไม่ขึ้นข่าวเกาะ",
      text: "วันละครั้ง AI (Claude ของ Anthropic) อ่านข้อมูลโปรเจกต์ของทีม ชื่อเควสต์ที่ผ่าน หลักฐานที่ส่งในการ์ดเควสต์ และจำนวนวันที่ลงมือ แล้วเขียนสรุปสั้นๆ ว่าทีมทำอะไรอยู่ ขึ้นใน “ข่าวเกาะ” บนเว็บและในห้อง Discord ของ SHIFT ระบบลบชื่อคนและช่องทางติดต่อออกก่อนส่งให้ AI สรุปไม่มีชื่อใคร และทีมงานซ่อนสรุปได้ทุกเมื่อ ทีมขึ้นข่าวเมื่อทุกคนในทีมยินยอมเรื่องนี้ ผู้ให้บริการ AI อยู่นอกประเทศไทย ส่วนนี้ยินยอมแยก ไม่ยินยอมก็เล่นเกาะได้ครบทุกอย่าง",
    },
    {
      emoji: "📍",
      lead: "เก็บอะไรบ้าง",
      short: "ชื่อเล่นที่นักเรียนพิมพ์ และหลักฐานตอนกดยินยอม",
      items: [
        "ชื่อเล่นที่นักเรียนพิมพ์ให้ผู้ปกครองจำได้",
        "ตอนผู้ปกครองกดยินยอม: ชื่อที่พิมพ์ ความเกี่ยวข้อง เวลา IP และเบราว์เซอร์ เก็บเป็นหลักฐานการลงชื่ออิเล็กทรอนิกส์",
        "ถ้านักเรียนยืนยันอายุเอง: วันเกิด ไว้เป็นหลักฐานว่าอายุถึงแล้ว",
        "อีเมลผู้ปกครองที่นักเรียนใส่ ใช้ส่งลิงก์ครั้งเดียว ไม่เก็บไว้",
      ],
    },
    {
      emoji: "👀",
      lead: "ใครเห็นบ้าง",
      short: "นักเรียนและทีมงานในเซิร์ฟเวอร์ SHIFT และผู้ให้บริการที่ช่วยเราทำงาน ไม่ขายให้ใคร",
      items: [
        "นักเรียนและทีมงานในเซิร์ฟเวอร์ Discord ของ SHIFT High: ชื่อทีม ต้นไม้ และโพสต์ของเกาะ",
        "ทีม SHIFT ของ PassionSeed: หลักฐานความยินยอม",
        "Supabase และ Vercel: เก็บข้อมูลและรันเว็บ",
        "Discord: ห้องเรียนและโพสต์ของเกาะ",
        "Anthropic: AI สรุปข่าวเกาะ เฉพาะทีมที่ยินยอมเรื่องนี้",
        "Resend: ส่งอีเมลถึงผู้ปกครอง เมื่อนักเรียนใส่อีเมลไว้",
      ],
    },
    {
      emoji: "🌏",
      lead: "ข้อมูลอยู่ที่ไหน",
      short: "เซิร์ฟเวอร์ของผู้ให้บริการบางรายอยู่นอกประเทศไทย",
      text: "เซิร์ฟเวอร์ของผู้ให้บริการด้านบนบางรายอยู่นอกประเทศไทย เราส่งไปเท่าที่จำเป็นต่อการจัดเกาะ SHIFT High และใช้ผู้ให้บริการที่มีมาตรการคุ้มครองข้อมูล",
    },
    {
      emoji: "🗓️",
      lead: "เก็บนานแค่ไหน",
      short: "ตลอดที่ยังอยู่ในชุมชน SHIFT และลบเมื่อขอ",
      text: "หลักฐานความยินยอมและสรุปข่าวเกาะเก็บไว้ตลอดที่นักเรียนยังอยู่ในชุมชน SHIFT และลบเมื่อขอ",
    },
    {
      emoji: "🔁",
      lead: "ถอนได้ทุกเมื่อ",
      short: "ผู้ปกครองกดถอนที่ลิงก์เดิมได้ ทีมจะไม่ขึ้นที่สาธารณะอีก",
      text: "ผู้ปกครองกดถอนที่ลิงก์เดิมได้ทุกเมื่อ ชื่อทีมจะหายจากเกาะของคนอื่น หยุดขึ้นโพสต์และข่าวเกาะ และแลกของใหม่ไม่ได้ งานและต้นไม้ของนักเรียนยังอยู่ครบ โพสต์ที่ขึ้นไปแล้ว ขอให้ลบได้ทาง LINE ของ SHIFT",
    },
    RIGHTS,
  ],
};
