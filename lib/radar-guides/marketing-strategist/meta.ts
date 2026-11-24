/**
 * Light metadata for the marketing guide (client-safe: no pages, no facts).
 * Level 1 (tier 1): dream, real work, one step tonight, then the ending.
 * Level 2: the shared round 1 level, then the DB deck
 * (/radar/marketing-strategist?view=deck). `games` and `cutscene` are derived
 * by registry.server, never authored here.
 *
 * nameTh is "นักการตลาด", what students say ("อยากเป็นนักการตลาด",
 * "เรียนการตลาด"), not the DB's "นักกลยุทธ์การตลาด": the guide covers the
 * whole career (brand, online ads, insight, product, social), and the slug
 * stays as the DB row.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const MARKETING_STRATEGIST_META = {
  slug: "marketing-strategist",
  alias: "mkt",
  nameTh: "นักการตลาด",
  nameEn: "Marketing Strategist",
  accent: "#ff7f9e",
  status: "draft",
  asOf: "2026-11-20",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "หมีเนยปัง เบื้องหลังมีคนคิด", navLabelTh: "หมีเนยปังเพราะอะไร", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง คือรู้ว่าพูดกับใคร แล้วนับผล", navLabelTh: "ร้านปังหน้าโรงเรียน", minutes: 2.5, tier: 1 },
    { key: "tonight", order: 3, titleTh: "คืนนี้ วางแผนให้ร้านหน้าโรงเรียน", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 4, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
    { key: "round1", order: 5, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 2 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายการตลาดของฉัน",
    badges: [
      { id: "dream", nameTh: "แกะเบื้องหลังเป็น", descTh: "แกะเบื้องหลังหมีเนยมาแล้ว", icon: "star", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "คนวางแผน", descTh: "วางแผนให้ร้านปังปิ้งจนนับผลได้", icon: "eye", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "เปิดแฟ้มแรก", descTh: "รู้แล้วว่าผลงานแบบไหนใส่แฟ้มรอบ 1 ได้", icon: "map", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนทำผลงานการตลาดชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "compass", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-ideas", nameTh: "ตาแม่นตรงคน", descTh: "เลือกไอเดียตรงคน ตรงที่ ถูกครบทุกข้อ", icon: "radar", trigger: { on: "game", game: "work:ideas", perfect: true } },
      { id: "sharp-results", nameTh: "นับผลเป็น", descTh: "ตัดสินทุกไอเดียได้ถูกครบ", icon: "heart", trigger: { on: "game", game: "work:results", perfect: true } },
      { id: "close-guess", nameTh: "เดาเกือบเป๊ะ", descTh: "ทายเอนเกจเมนต์หมีเนยได้ใกล้มาก", icon: "chat", trigger: { on: "game", game: "dream:buzz", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "fan-reader", labelTh: "อ่านใจแฟนคลับเป็น", icon: "chat", when: [{ favourite: "dream" }, { perfect: "dream:clues" }] },
      { id: "planner", labelTh: "ชอบวางแผนแล้วนับผล", icon: "eye", when: [{ favourite: "work" }, { perfect: "work:results" }] },
      { id: "people-first", labelTh: "เริ่มจากคน ไม่ใช่โฆษณา", icon: "heart", when: [{ choice: "work:start", value: "look" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "star", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "compass", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
