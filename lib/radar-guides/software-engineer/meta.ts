/**
 * Light metadata for the software engineer guide (client-safe: no pages, no
 * facts). Level 1 only: the career's DB deck (?view=deck) is its Level 2.
 * guide-lint keeps `pages` equal to the page files. `games` and `cutscene`
 * are derived by registry.server, never authored here.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const SOFTWARE_ENGINEER_META = {
  slug: "software-engineer",
  alias: "dev",
  nameTh: "นักพัฒนาซอฟต์แวร์",
  nameEn: "Software Engineer",
  accent: "#639bf8",
  status: "draft",
  asOf: "2026-11-18",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "แอปที่เริ่มจากคนตกรถ", navLabelTh: "คนตกรถ", minutes: 1.5, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง คือฟังคนใช้ แล้วแก้ที่พัง", navLabelTh: "งานจริง", minutes: 1.5, tier: 1 },
    { key: "round1", order: 3, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 1 },
    { key: "tonight", order: 4, titleTh: "คืนนี้ ทำเว็บหน้าเดียวให้เพื่อนใช้", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 5, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายโค้ดของฉัน",
    badges: [
      { id: "dream", nameTh: "เห็นปัญหาเป็นโอกาส", descTh: "รู้แล้วว่าแอปดังเริ่มจากปัญหาเล็กๆ", icon: "map", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "คนคัดบั๊ก", descTh: "เลือกได้ว่าอะไรต้องแก้ก่อน", icon: "bug", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "รู้จักรอบพอร์ต", descTh: "รู้แล้วว่าผลงานของเธอยื่นได้", icon: "key", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนทำผลงานชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "star", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-triage", nameTh: "ตาไวจับบั๊ก", descTh: "จัดลำดับแจ้งปัญหาถูกครบทุกข้อ", icon: "eye", trigger: { on: "game", game: "work:*", perfect: true } },
      { id: "folio-pro", nameTh: "จัดแฟ้มเป๊ะ", descTh: "จัดของลงแฟ้มถูกครบทุกชิ้น", icon: "compass", trigger: { on: "game", game: "round1:*", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "problem-finder", labelTh: "เห็นปัญหาแล้วอยากแก้", icon: "map", when: [{ favourite: "dream" }] },
      { id: "triager", labelTh: "จัดลำดับงานเป็น", icon: "bug", when: [{ favourite: "work" }, { perfect: "work:*" }] },
      { id: "folio-starter", labelTh: "เริ่มเก็บพอร์ตแล้ว", icon: "key", when: [{ cleared: "round1" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "compass", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "eye", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "star", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
