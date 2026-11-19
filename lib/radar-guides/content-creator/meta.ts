/**
 * Light metadata for the Content Creator guide (client-safe: no pages, no
 * facts). Level 1 only (tier 1): dream, real work, one step tonight, then the
 * ending; round 1 opens Level 2, then the DB deck (/radar/content-creator?view=deck).
 * `games` and `cutscene` are derived by registry.server, never authored here.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const CONTENT_CREATOR_META = {
  slug: "content-creator",
  alias: "creator",
  nameTh: "นักสร้างสรรค์คอนเทนต์",
  nameEn: "Content Creator",
  accent: "#ff6b6b",
  status: "draft",
  asOf: "2026-11-20",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "หมูเด้งไม่ได้ดังเพราะดวง", navLabelTh: "หมูเด้ง", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง คือวางแผน ตัด แล้วอ่านผล", navLabelTh: "คลิปร้านโรตี", minutes: 2.5, tier: 1 },
    { key: "tonight", order: 3, titleTh: "คืนนี้ ถ่ายคลิปสั้นเรื่องที่เธอรู้ดี", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 4, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
    { key: "round1", order: 5, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 2 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายคอนเทนต์ของฉัน",
    badges: [
      { id: "dream", nameTh: "รู้แล้วไม่ใช่ดวง", descTh: "เห็นแล้วว่าหลังคลิปดัง มีคนวางแผนอยู่", icon: "star", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "ครีเอเตอร์มือใหม่", descTh: "ทำคลิปร้านโรตีจนโพสต์และอ่านผลได้", icon: "eye", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "เปิดแฟ้มแรก", descTh: "รู้แล้วว่าผลงานแบบไหนใส่แฟ้มรอบ 1 ได้", icon: "map", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนถ่ายคลิปชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "compass", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-cut", nameTh: "ตัดเป๊ะ", descTh: "คัดช็อตลงคลิปถูกครบทุกช็อต", icon: "radar", trigger: { on: "game", game: "work:shots", perfect: true } },
      { id: "sharp-read", nameTh: "อ่านผลขาด", descTh: "เลือกทำถูกครบทุกข้อหลังโพสต์", icon: "chat", trigger: { on: "game", game: "work:feedback", perfect: true } },
      { id: "close-guess", nameTh: "เดาเกือบเป๊ะ", descTh: "ทายคนมาสวนสัตว์หลังหมูเด้งดังได้ใกล้มาก", icon: "heart", trigger: { on: "game", game: "dream:visitors", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "storyteller", labelTh: "อยากเล่าเรื่องที่ตัวเองรู้ดี", icon: "chat", when: [{ favourite: "dream" }] },
      { id: "editor", labelTh: "ชอบคัดช็อตให้คลิปคม", icon: "eye", when: [{ favourite: "work" }, { perfect: "work:shots" }] },
      { id: "consent", labelTh: "ขอก่อนถ่ายคนอื่นเสมอ", icon: "heart", when: [{ choice: "work:face", value: "cut" }] },
      { id: "safe", labelTh: "รู้ทันคนแปลกหน้าในคอมเมนต์", icon: "shield", when: [{ choice: "work:stranger", value: "skip" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "star", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "compass", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
