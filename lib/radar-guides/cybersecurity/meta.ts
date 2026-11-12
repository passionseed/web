/**
 * Light metadata for the cybersecurity guide (client-safe: no pages, no facts).
 * Design: docs/radar-guide/cybersecurity-guide.md section 0.1.
 *
 * Ownership: U0 created the skeleton. Content (U3) may edit titles, minutes and
 * the story badges/traits; guide-lint keeps `pages` equal to the page files.
 * `games` and `cutscene` are derived by registry.server, never authored here.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";

export const CYBERSECURITY_META = {
  slug: "cybersecurity",
  alias: "cyber",
  nameTh: "ไซเบอร์ซีเคียวริตี้",
  nameEn: "Cybersecurity",
  accent: "#5cff5c", // readableAccent(radar_fields.color "#004d00")
  // Draft until the founder records the required "tonight" safety clip
  // (pages/tonight.ts, required + safety): `pnpm radar:check` fails a live guide
  // without it. Drafts still render on preview and dev (guideVisible). Flip to
  // "live" once clips.json has "tonight" and radar:check exits 0.
  status: "draft",
  asOf: "2026-11-11",
  intentPathSlug: "interested", // ctaPathSlug(null): the deck's CtaCard value for this career
  shareCardAfter: "money",
  pages: [
    { key: "mythos", order: 1, titleTh: "AI เพิ่งเจอบั๊กที่อายุมากกว่าเธอ", navLabelTh: "บั๊กอายุมากกว่าเธอ", minutes: 2, legacyHashes: ["hook"] },
    { key: "doors", order: 2, titleTh: "AI ตัวเดียวกัน สองประตู", navLabelTh: "สองประตู", minutes: 2 },
    { key: "triage", order: 3, titleTh: "งานจริง คือจับผิด AI", navLabelTh: "จับผิด AI", minutes: 1.5, legacyHashes: ["reality", "day"] },
    { key: "scam", order: 4, titleTh: "แชตบ้านเธอ คือสนามจริง", navLabelTh: "แชตบ้านเธอ", minutes: 1.5 },
    { key: "firstjob", order: 5, titleTh: "งานแรกของฉัน จะเหลืออะไร", navLabelTh: "งานแรก", minutes: 1, legacyHashes: ["ai"] },
    { key: "money", order: 6, titleTh: "เงินเดือนจริงในไทย", navLabelTh: "เงินเดือน", minutes: 1, legacyHashes: ["money"] },
    { key: "fit", order: 7, titleTh: "ฉันเหมาะไหม เทียบกับคอม วิศวะ หมอ", navLabelTh: "เหมาะไหม", minutes: 1 },
    { key: "tcas", order: 8, titleTh: "สมัครที่ไหน เมื่อไหร่", navLabelTh: "สมัครที่ไหน", minutes: 1, legacyHashes: ["study"] },
    { key: "terminal", order: 9, titleTh: "ลองเป็นนักป้องกันในเครื่องจำลอง", navLabelTh: "ลองเป็นนักป้องกัน", minutes: 3 },
    { key: "tonight", order: 10, titleTh: "คืนนี้ ห้องเดียว ได้ผลงานชิ้นแรก", navLabelTh: "ภารกิจคืนนี้", minutes: 1, legacyHashes: ["start"] },
    { key: "next", order: 11, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, legacyHashes: ["outro"] },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายไซเบอร์ของฉัน",
    badges: [
      { id: "mythos", nameTh: "ตาไวกว่าบั๊ก", descTh: "ผ่านด่านบั๊กที่อายุมากกว่าเธอ", icon: "bug", trigger: { on: "clear", pageKey: "mythos" } },
      { id: "doors", nameTh: "คนเฝ้าประตู", descTh: "รู้แล้วว่าใครได้เข้าประตูที่สอง", icon: "key", trigger: { on: "clear", pageKey: "doors" } },
      { id: "triage", nameTh: "หัวหน้าทีม AI", descTh: "คัดสัญญาณจริงออกจากเสียงรบกวน", icon: "radar", trigger: { on: "clear", pageKey: "triage" } },
      { id: "scam", nameTh: "สายตรวจแชต", descTh: "แยกข้อความโกงออกจากของจริง", icon: "chat", trigger: { on: "clear", pageKey: "scam" } },
      { id: "firstjob", nameTh: "นักต่อบันได", descTh: "ต่อขั้นบันไดงานแรกขึ้นมาใหม่", icon: "ladder", trigger: { on: "clear", pageKey: "firstjob" } },
      { id: "money", nameTh: "รู้ราคาตลาด", descTh: "เห็นเงินเดือนจริงในไทยแล้ว", icon: "coin", trigger: { on: "clear", pageKey: "money" } },
      { id: "fit", nameTh: "รู้ใจตัวเอง", descTh: "รู้แล้วว่าตัวเองเอนไปทางไหน", icon: "compass", trigger: { on: "clear", pageKey: "fit" } },
      { id: "tcas", nameTh: "นักวางแผน TCAS", descTh: "รู้แล้วว่าต้องยื่นที่ไหน รอบไหน", icon: "map", trigger: { on: "clear", pageKey: "tcas" } },
      { id: "terminal", nameTh: "นักป้องกันฝึกหัด", descTh: "อ่านขอบเขตก่อนลงมือ แบบมืออาชีพ", icon: "terminal", trigger: { on: "clear", pageKey: "terminal" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนทำผลงานชิ้นแรกแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนถึงด่านสุดท้าย", icon: "star", trigger: { on: "clear", pageKey: "next" } },
      { id: "sharp-eye", nameTh: "ตาคมไม่พลาด", descTh: "จับผิดได้ครบทุกข้อในด่านเดียว", icon: "eye", trigger: { on: "game", game: "triage:*", perfect: true } },
      { id: "scam-proof", nameTh: "แชตปลอมทำอะไรไม่ได้", descTh: "แยกแชตถูกครบทุกข้อ", icon: "shield", trigger: { on: "game", game: "scam:*", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "breaker", labelTh: "ชอบหาจุดพัง", icon: "bug", when: [{ fit: "A" }, { favourite: "mythos" }] },
      { id: "wide-door", labelTh: "เปิดประตูกว้างไว้ก่อน", icon: "compass", when: [{ fit: "B" }] },
      { id: "people", labelTh: "ใจอยู่กับคน", icon: "heart", when: [{ fit: "C" }] },
      { id: "contract-hacker", labelTh: "เจาะแบบมีสัญญา", icon: "key", when: [{ favourite: "doors" }] },
      { id: "soc", labelTh: "ตาคมจับผิด AI", icon: "radar", when: [{ favourite: "triage" }, { perfect: "triage:*" }] },
      { id: "anti-scam", labelTh: "ทีมกันโกง", icon: "chat", when: [{ favourite: "scam" }, { perfect: "scam:*" }] },
      { id: "log-detective", labelTh: "นักสืบจาก log", icon: "terminal", when: [{ favourite: "terminal" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "eye", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "star", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
