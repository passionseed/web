/**
 * Light metadata for the Medical Technologist guide (client-safe: no pages, no
 * facts). Level 1 only (tier 1): dream, real work, one step tonight, then the
 * ending; round 1 opens Level 2. The DB deck follows (/radar/medical-technologist?view=deck).
 * `games` and `cutscene` are derived by registry.server, never authored here.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const MEDICAL_TECHNOLOGIST_META = {
  slug: "medical-technologist",
  alias: "medtech",
  nameTh: "นักเทคนิคการแพทย์",
  nameEn: "Medical Technologist",
  accent: "#7dffb2",
  status: "draft",
  asOf: "2026-11-20",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "คำตอบแรก มาจากแล็บ", navLabelTh: "คำตอบจากแล็บ", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "งานจริง คือทำให้ผลเชื่อได้", navLabelTh: "เวรแรกในแล็บ", minutes: 2.5, tier: 1 },
    { key: "tonight", order: 3, titleTh: "คืนนี้ เปิดแล็บบนโต๊ะ", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 4, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
    { key: "round1", order: 5, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 2 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายแล็บของฉัน",
    badges: [
      { id: "dream", nameTh: "รู้แล้วใครตอบ", descTh: "รู้แล้วว่าตอนมีโรคใหม่ คำตอบแรกมาจากแล็บ", icon: "star", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "ผ่านเวรแรก", descTh: "คัดหลอดและเช็กผลจนจบเวรแรกในแล็บ", icon: "eye", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "แฟ้มพร้อมยื่น", descTh: "รู้แล้วว่าผลงานแบบไหนใส่แฟ้มรอบ 1 ได้", icon: "map", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนทำบันทึกแล็บชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "compass", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-tubes", nameTh: "ตาไวคัดหลอด", descTh: "คัดหลอดที่ใช้ไม่ได้ออกครบทุกหลอด", icon: "shield", trigger: { on: "game", game: "work:tubes", perfect: true } },
      { id: "safe-release", nameTh: "ปล่อยผลแม่น", descTh: "ตัดสินผลถูกครบทุกข้อในเวรแรก", icon: "radar", trigger: { on: "game", game: "work:results", perfect: true } },
      { id: "close-guess", nameTh: "เดาเกือบเป๊ะ", descTh: "ทายเวลารู้ผลนิปาห์ได้ใกล้มาก", icon: "chat", trigger: { on: "game", game: "dream:nipah", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "answer-first", labelTh: "อยากเป็นคนให้คำตอบแรก", icon: "star", when: [{ favourite: "dream" }] },
      { id: "lab-keeper", labelTh: "ชอบทำให้ผลเชื่อได้", icon: "eye", when: [{ favourite: "work" }, { perfect: "work:results" }] },
      { id: "no-label", labelTh: "หลอดไม่มีชื่อ ไม่รับ", icon: "shield", when: [{ choice: "work:nolabel", value: "reject" }] },
      { id: "call-now", labelTh: "รู้ว่าค่าไหนต้องรีบโทร", icon: "heart", when: [{ choice: "work:critical", value: "call" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "star", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "compass", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
