/**
 * Words for the nightly island news card in #island-news (ข่าวเกาะคืนนี้,
 * news.ts). DRAFT COPY for the three-model Thai review in the root
 * AGENTS.md. No em or en dashes, never น้องๆ or เด็กๆ, no ranking, no streaks,
 * no "you missed", nothing that says a check-in grows a tree, and never a
 * minute: the campfire is a count of rounds (every focus round promises
 * ไม่มีใครนับเวลาของคุณ, rounds-copy.ts).
 */
import { thaiDay } from "./digestCopy";

/**
 * People counts (check-ins and campfire rounds) below this show with no
 * number: in a small cohort a 1 or a 2 could point at one person. The
 * campfire line is floored by the people behind the rounds, never by the
 * rounds: one student's four rounds would show their focus time. Approvals
 * and stages grown always show their exact number.
 */
export const PEOPLE_FLOOR = 3;

export const NEWS = {
  title: "🗞️ ข่าวเกาะคืนนี้",
  /** Members who checked in during the card's window (a people count: floored). */
  checkedIn: (n: number) => (n >= PEOPLE_FLOOR ? `👣 แวะมาเช็กอิน **${n}** คน` : "👣 มีเพื่อนแวะมาเช็กอินแล้ว"),
  /** Quests a mentor approved (exact). */
  approved: (n: number) => `✅ พี่เลี้ยงผ่านงาน **${n}** เควสต์`,
  /** Tree stages risen (exact), after the approvals on the same line. */
  grew: (n: number) => `🌱 ต้นไม้โตขึ้น **${n}** ขั้น`,
  /**
   * Campfire rounds started with an intention, by `people` different people:
   * the number shows only once that many people made them. Never minutes.
   */
  rounds: (n: number, people: number) =>
    people >= PEOPLE_FLOOR ? `🔥 ตั้งเป้าทำงานรอบกองไฟ **${n}** รอบ` : "🔥 มีคนมาตั้งเป้าทำงานที่กองไฟ",
  /** Nothing to count tonight: the island rests, warmly. */
  quiet: "🌙 วันนี้เกาะได้พัก ตะเกียงยังจุดรอทุกคนอยู่",
  /**
   * One lore line a night, picked by the day (the same day always gets the
   * same line). Only things the island draws or its lore already has.
   */
  moments: [
    "🏮 ตะเกียงตามต้นไม้ติดไฟครบแล้ว เกาะยามค่ำสว่างกำลังดี",
    "⛵ เรือจอดนิ่งอยู่ที่ท่า คืนนี้ไม่มีใครต้องรีบไปไหน",
    "🪶 นกนางนวลกลับรังไปแล้ว เหลือแต่เสียงคลื่นรอบเกาะ",
    "🌊 คืนนี้คลื่นเบา ได้ยินเสียงทะเลชัดเลย",
    "🪣 บ่อน้ำกลางเกาะสะท้อนแสงจันทร์",
    "🔥 กองไฟกลางลานยังอุ่นอยู่ อยากนั่งทำงานกับเพื่อน เข้ามาได้เลย",
    "🧭 ติดตรงไหน ถามในห้อง SHIFT High ได้ ไม่ต้องรอให้พร้อม",
  ],
  /** Above the AI team lines (only when a team can be featured). */
  aiHeading: "📣 เรื่องจากแปลง (สรุปโดย AI)",
  /** The same on a Bangkok Sunday, when the lines are the week recaps. */
  weekHeading: "📣 สรุปสัปดาห์จากแปลง (สรุปโดย AI)",
  /** The card's fine print: what the numbers cover. 2 ทุ่ม is 20:00. */
  fine: "ตัวเลขรวมทั้งเกาะ ตั้งแต่ 2 ทุ่มเมื่อวานถึง 2 ทุ่มคืนนี้ ไม่บอกว่าใครเป็นใคร",
  /** The issue line, e.g. "ฉบับ 18 พ.ย. 2569": also how a restarted bot finds its own card. Never the digest's "ข่าวของ". */
  dayLine: (day: string) => `ฉบับ ${thaiDay(day)}`,
  pictureAlt: "เกาะ SHIFT คืนนี้",
  pictureFailed: "🖼️ คืนนี้รูปเกาะวาดไม่ขึ้น",
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The staff channel's note when tonight's card did not post by 22:30 Bangkok
 * (kind news_missed, schema 20; copy.ts renders it). The day comes from the
 * queue; nothing about a student or a team. 4 ทุ่มครึ่ง is 22:30, 2 ทุ่ม is
 * 20:00. Never the card's issue line (NEWS.dayLine) or the digest's, which
 * the bot searches for to find its own card. Staff often read it the next
 * morning, so it never says พรุ่งนี้: the body names the card's day. DRAFT for
 * the three-model Thai review.
 */
export const NEWS_MISSED = {
  title: "⚠️ ข่าวเกาะคืนนี้ยังไม่ได้โพสต์",
  /** The card's day ("วันที่ 18 พ.ย. 2569") when the queue carries a date, else "คืนนี้". */
  body: (day: unknown) =>
    `ถึง 4 ทุ่มครึ่งแล้ว การ์ดข่าวเกาะ${typeof day === "string" && DAY.test(day) ? `วันที่ ${thaiDay(day)}` : "คืนนี้"} ยังไม่ขึ้นในห้องข่าวเกาะ`,
  /**
   * What to check: the two permissions that stop a post (View Channel, Send
   * Messages; without Attach Files the card goes out without its picture, and
   * sending needs no Read Message History), then the other cause, the bot
   * offline at 20:00, which only its log shows (news.ts logs every failure
   * as "[shift-quests] nightly island news: ...").
   */
  check: "เช็กสิทธิ์ของบอทในห้องข่าวเกาะ: ดูห้อง และส่งข้อความ ถ้าครบแล้ว บอทอาจออฟไลน์ช่วง 2 ทุ่ม แจ้งคนดูแลบอทให้ดู log คำว่า nightly island news",
  /**
   * A card whose send failed is tried again until midnight (a stale claim,
   * shift_quest__news_due), so a fix before midnight may still post it; after
   * that, the next night's card goes out at 20:00 once the cause is fixed. It
   * never says the bot recovers by itself.
   */
  note: "แก้ก่อนเที่ยงคืน บอทอาจยังโพสต์การ์ดฉบับนี้ได้ ถ้าไม่ทัน การ์ดคืนถัดไปจะโพสต์ 2 ทุ่มเมื่อแก้แล้ว",
};
