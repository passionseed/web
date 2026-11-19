/**
 * Light metadata for the UX/UI Designer guide (client-safe: no pages, no
 * facts). Level 1 only (tier 1): dream, real work, one step tonight, then the
 * ending; round 1 opens Level 2, then the DB deck (/radar/ux-design?view=deck).
 * `games` and `cutscene` are derived by registry.server, never authored here.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const UX_DESIGN_META = {
  slug: "ux-design",
  alias: "ux",
  nameTh: "นักออกแบบ UX/UI",
  nameEn: "UX/UI Designer",
  accent: "#ff7ad9",
  status: "draft",
  asOf: "2026-11-20",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "ของที่ใช้ง่าย มีคนตั้งใจออกแบบ", navLabelTh: "ป้ายรถเมล์", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง คือดูคนใช้ แล้วแก้จุดที่ติด", navLabelTh: "แก้แอปโรงอาหาร", minutes: 2.5, tier: 1 },
    { key: "tonight", order: 3, titleTh: "คืนนี้ รีดีไซน์หน้าจอเดียว", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 4, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
    { key: "round1", order: 5, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 2 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สาย UX/UI ของฉัน",
    badges: [
      { id: "dream", nameTh: "เห็นคนออกแบบ", descTh: "รู้แล้วว่าของที่ใช้ง่าย มีคนตั้งใจออกแบบ", icon: "map", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "คนนั่งดู", descTh: "ดูเพื่อนใช้แอป แล้วแก้จุดที่ติดได้", icon: "eye", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "แฟ้มพร้อมยื่น", descTh: "รู้แล้วว่าผลงานแบบไหนใส่แฟ้มรอบ 1 ได้", icon: "key", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนรีดีไซน์หน้าจอแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "compass", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-eye", nameTh: "ตาไวจับจุดติด", descTh: "แยกได้ครบว่าอะไรต้องแก้ก่อน", icon: "radar", trigger: { on: "game", game: "work:watch", perfect: true } },
      { id: "fixer", nameTh: "แก้ตรงจุด", descTh: "เลือกวิธีแก้ถูกครบทุกข้อ", icon: "star", trigger: { on: "game", game: "work:fix", perfect: true } },
      { id: "close-guess", nameTh: "เดาเกือบเป๊ะ", descTh: "ทายจำนวนป้ายรถเมล์ที่อัปเกรดได้ใกล้มาก", icon: "chat", trigger: { on: "game", game: "dream:signs", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "service", labelTh: "อยากออกแบบของที่คนใช้ทุกวัน", icon: "map", when: [{ favourite: "dream" }] },
      { id: "app-fixer", labelTh: "ชอบแก้แอปให้ใช้ง่าย", icon: "eye", when: [{ favourite: "work" }, { perfect: "work:fix" }] },
      { id: "watcher", labelTh: "เชื่อสิ่งที่เห็นคนทำ", icon: "radar", when: [{ choice: "work:how", value: "watch" }, { perfect: "work:watch" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "compass", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "star", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "heart", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
