/**
 * Light metadata for the AI Engineer guide (client-safe: no pages, no facts).
 * Level 1 only (tier 1): dream, real work, TCAS round 1, one step tonight,
 * then the ending. The DB deck is Level 2 (/radar/ai-engineer?view=deck).
 * `games` and `cutscene` are derived by registry.server, never authored here.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const AI_ENGINEER_META = {
  slug: "ai-engineer",
  alias: "ai",
  nameTh: "วิศวกร AI",
  nameEn: "AI Engineer",
  accent: "#60e4fb",
  status: "draft",
  asOf: "2026-11-19",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "AI ภาษาไทย ฝีมือคนไทย", navLabelTh: "AI ฝีมือคนไทย", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง คือทำให้ AI ใช้ได้จริง", navLabelTh: "ทำบอทโรงเรียน", minutes: 2.5, tier: 1 },
        { key: "tonight", order: 3, titleTh: "คืนนี้ สอน AI แล้วสอบมัน", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 4, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
    { key: "round1", order: 5, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 2 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สาย AI ของฉัน",
    badges: [
      { id: "dream", nameTh: "รู้แล้วใครสร้าง", descTh: "เห็นแล้วว่า AI ภาษาไทยมีทีมในไทยเป็นคนสร้าง", icon: "star", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "คนทำบอท", descTh: "ทำบอทโรงเรียนจนพร้อมเปิดใช้", icon: "eye", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "แฟ้มพร้อมยื่น", descTh: "รู้แล้วว่าผลงานแบบไหนใส่แฟ้มรอบ 1 ได้", icon: "map", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนทำผลงาน AI ชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "compass", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-eval", nameTh: "แก้บอทเป๊ะ", descTh: "เลือกวิธีแก้บอทถูกครบทุกข้อ", icon: "radar", trigger: { on: "game", game: "work:helpbot", perfect: true } },
      { id: "data-guard", nameTh: "ผู้เฝ้าข้อมูล", descTh: "เลือกข้อมูลให้บอทถูกครบ ไม่หลุดข้อมูลส่วนตัวเลย", icon: "shield", trigger: { on: "game", game: "work:docs", perfect: true } },
      { id: "close-guess", nameTh: "เดาเกือบเป๊ะ", descTh: "ทายจำนวนนักเรียนที่ใช้ RISA ได้ใกล้มาก", icon: "chat", trigger: { on: "game", game: "dream:risa", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "builder", labelTh: "อยากสร้าง AI ภาษาไทย", icon: "chat", when: [{ favourite: "dream" }] },
      { id: "app-builder", labelTh: "ชอบทำ AI ให้ใช้ได้จริง", icon: "eye", when: [{ favourite: "work" }, { perfect: "work:helpbot" }] },
      { id: "privacy", labelTh: "ปกป้องข้อมูลเพื่อน", icon: "shield", when: [{ choice: "work:doc-grades", value: "keep" }] },
      { id: "careful", labelTh: "รู้ว่าเรื่องไหนต้องถึงมือคน", icon: "heart", when: [{ choice: "work:bullied", value: "human" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "star", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "compass", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
