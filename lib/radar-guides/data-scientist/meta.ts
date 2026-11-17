/**
 * Light metadata for the data scientist guide (client-safe: no pages, no facts).
 * Level 1 only (5 pages, tier 1): the career's DB deck is its Level 2
 * (/radar/data-scientist?view=deck).
 *
 * `games` and `cutscene` are derived by registry.server, never authored here.
 * Story text (badges, traits) carries no digits.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const DATA_SCIENTIST_META = {
  slug: "data-scientist",
  alias: "data",
  nameTh: "นักวิทยาศาสตร์ข้อมูล",
  nameEn: "Data Scientist",
  accent: "#696cf2",
  status: "draft",
  asOf: "2026-11-18",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "ตัวเลขฝุ่นทุกเช้า มีคนทำขึ้นมา", navLabelTh: "ตัวเลขฝุ่น", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง เริ่มจากตารางรกๆ", navLabelTh: "ตารางรก", minutes: 2, tier: 1 },
    { key: "round1", order: 3, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 1 },
    { key: "tonight", order: 4, titleTh: "คืนนี้ ข้อมูลฝุ่นจริง หนึ่งกราฟ หนึ่งข้อค้นพบ", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 5, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายข้อมูลของฉัน",
    badges: [
      { id: "dream", nameTh: "นักตั้งคำถาม", descTh: "รู้แล้วว่าตัวเลขฝุ่นเริ่มจากคำถาม", icon: "eye", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "มือเคลียร์ข้อมูล", descTh: "เคลียร์ตารางรกๆ จนเจอคำตอบ", icon: "terminal", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "เปิดแฟ้มแรก", descTh: "รู้แล้วว่ารอบแรกก็มีที่ให้ผลงานของเธอ", icon: "map", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนลุยงานข้อมูลชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "star", trigger: { on: "clear", pageKey: "next" } },
      { id: "clean-sweep", nameTh: "ตารางสะอาดกริบ", descTh: "เคลียร์ถูกทุกแถวในด่านเดียว", icon: "radar", trigger: { on: "game", game: "work:clean", perfect: true } },
      { id: "folio-pro", nameTh: "จัดแฟ้มเป๊ะ", descTh: "จัดของลงแฟ้มถูกครบทุกชิ้น", icon: "key", trigger: { on: "game", game: "round1:*", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "asker", labelTh: "ชอบตั้งคำถาม", icon: "eye", when: [{ favourite: "dream" }] },
      { id: "cleaner", labelTh: "ตาไวจับแถวเพี้ยน", icon: "terminal", when: [{ favourite: "work" }, { perfect: "work:clean" }] },
      { id: "folio", labelTh: "เริ่มเก็บแฟ้มแล้ว", icon: "map", when: [{ cleared: "round1" }] },
      { id: "doer", labelTh: "ลงมือเลยคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "compass", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "radar", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "star", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
