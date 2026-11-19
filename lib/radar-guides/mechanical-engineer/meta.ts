/**
 * Light metadata for the Mechanical Engineer guide (client-safe: no pages, no
 * facts). Level 1 only (tier 1): dream, real work, one step tonight, then the
 * ending; round 1 opens Level 2, then the DB deck
 * (/radar/mechanical-engineer?view=deck).
 * `games` and `cutscene` are derived by registry.server, never authored here.
 *
 * Accent: mint, not the orange of the DB colour. The host flame is yellow and
 * orange, and the games use orange and yellow for "hot" and "near", so an
 * orange accent would not read as the career's colour or as "correct".
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const MECHANICAL_ENGINEER_META = {
  slug: "mechanical-engineer",
  alias: "mech",
  nameTh: "วิศวกรเครื่องกล",
  nameEn: "Mechanical Engineer",
  accent: "#4cf2c0",
  status: "draft",
  asOf: "2026-11-20",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "รถไฟที่วิศวกรไทยออกแบบเอง", navLabelTh: "รถไฟไทยทำ", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง คือทำให้เครื่องไม่พัง", navLabelTh: "ทดสอบพัดลม", minutes: 2.5, tier: 1 },
    { key: "tonight", order: 3, titleTh: "คืนนี้ แกะของในบ้าน แล้วออกแบบให้ดีขึ้น", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 4, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
    { key: "round1", order: 5, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 2 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายเครื่องกลของฉัน",
    badges: [
      { id: "dream", nameTh: "รู้แล้วว่าใครสร้าง", descTh: "เห็นแล้วว่าเครื่องจักรรอบตัว หลายอย่างทำในไทย", icon: "star", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "คนทดสอบพัดลม", descTh: "ทดสอบพัดลมห้องเรียนจนพร้อมผลิต", icon: "eye", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "เปิดแฟ้มแรก", descTh: "รู้แล้วว่าผลงานแบบไหนใส่แฟ้มรอบ 1 ได้", icon: "map", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนแกะของชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "compass", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-fix", nameTh: "แก้ตรงจุด", descTh: "เลือกวิธีแก้พัดลมถูกครบทุกข้อ", icon: "radar", trigger: { on: "game", game: "work:fantest", perfect: true } },
      { id: "clear-brief", nameTh: "โจทย์ชัด", descTh: "แยกเรื่องที่ต้องแก้กับเรื่องไว้ทีหลังได้ครบ", icon: "shield", trigger: { on: "game", game: "work:brief", perfect: true } },
      { id: "close-guess", nameTh: "เดาเกือบเป๊ะ", descTh: "ทายระยะทดสอบของรถไฟไทยทำได้ใกล้มาก", icon: "chat", trigger: { on: "game", game: "dream:testrun", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "big-builder", labelTh: "อยากสร้างของใหญ่ที่คนขึ้นนั่ง", icon: "star", when: [{ favourite: "dream" }] },
      { id: "tester", labelTh: "ชอบทดสอบให้ของไม่พัง", icon: "eye", when: [{ favourite: "work" }, { perfect: "work:fantest" }] },
      { id: "safety", labelTh: "คิดถึงนิ้วเด็กก่อนเสมอ", icon: "shield", when: [{ choice: "work:finger", value: "shape" }] },
      { id: "simple", labelTh: "รู้ว่าของยิ่งเยอะ ยิ่งพังง่าย", icon: "heart", when: [{ choice: "work:music", value: "later" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "star", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "compass", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
