/**
 * Light metadata for the Accountant guide (client-safe: no pages, no facts).
 * Level 1 only (tier 1): dream, real work, one step tonight, then the ending.
 * Round 1 opens Level 2, then the DB deck (/radar/accountant?view=deck).
 * `games` and `cutscene` are derived by registry.server, never authored here.
 * Story text (badges, traits) carries no digits.
 */
import type { GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { ROUND_ONE_MINUTES, ROUND_ONE_NAV_TH, ROUND_ONE_TITLE_TH } from "../_shared/round1-meta";

export const ACCOUNTANT_META = {
  slug: "accountant",
  alias: "acc",
  nameTh: "นักบัญชี",
  nameEn: "Accountant",
  accent: "#dda0ff",
  status: "draft",
  asOf: "2026-11-20",
  intentPathSlug: "interested",
  shareCardAfter: "work",
  pages: [
    { key: "dream", order: 1, titleTh: "คนที่เจอว่าตัวเลขไม่จริง", navLabelTh: "ตัวเลขไม่จริง", minutes: 2, tier: 1 },
    { key: "work", order: 2, titleTh: "AI ลงบัญชีให้ คนเช็กว่าจริงไหม", navLabelTh: "เช็กบัญชีร้าน", minutes: 2, tier: 1 },
    { key: "tonight", order: 3, titleTh: "คืนนี้ ทำบัญชีเงินตัวเอง แล้วหาเรื่องที่ไม่คาดคิด", navLabelTh: "ภารกิจคืนนี้", minutes: 1, tier: 1 },
    { key: "next", order: 4, titleTh: "แล้วเธอล่ะ", navLabelTh: "แล้วเธอล่ะ", minutes: 1, tier: 1 },
    { key: "round1", order: 5, titleTh: ROUND_ONE_TITLE_TH, navLabelTh: ROUND_ONE_NAV_TH, minutes: ROUND_ONE_MINUTES, tier: 2 },
  ],
  story: {
    profileTitleTh: "โปรไฟล์สายบัญชีของฉัน",
    badges: [
      { id: "dream", nameTh: "ตาไวเห็นพิรุธ", descTh: "รู้แล้วว่าทีมตรวจจับรายการขายแปลกๆ ได้ยังไง", icon: "eye", trigger: { on: "clear", pageKey: "dream" } },
      { id: "work", nameTh: "มือเช็กบัญชี", descTh: "เช็กบัญชีร้านชานมจนครบทุกรายการ", icon: "coin", trigger: { on: "clear", pageKey: "work" } },
      { id: "round1", nameTh: "แฟ้มพร้อมยื่น", descTh: "รู้แล้วว่าผลงานแบบไหนใส่แฟ้มรอบแรกได้", icon: "map", trigger: { on: "clear", pageKey: "round1" } },
      { id: "tonight", nameTh: "ภารกิจคืนนี้", descTh: "มีแผนทำบัญชีเงินตัวเองแล้ว", icon: "flag", trigger: { on: "clear", pageKey: "tonight" } },
      { id: "next", nameTh: "จบรันแรก", descTh: "เล่นจนจบ Level 1", icon: "compass", trigger: { on: "clear", pageKey: "next" } },
      { id: "no-baht-lost", nameTh: "ไม่มีบาทไหนหลุด", descTh: "เช็กบัญชีร้านถูกครบทุกรายการ", icon: "key", trigger: { on: "game", game: "work:books", perfect: true } },
      { id: "close-guess", nameTh: "เดาเกือบเป๊ะ", descTh: "ทายจำนวนรายการขายผิดปกติได้ใกล้มาก", icon: "radar", trigger: { on: "game", game: "dream:sales", perfect: true } },
      { id: "full-run", nameTh: "เคลียร์ครบทุกด่าน", descTh: "ผ่านครบทุกด่านในรันนี้", icon: "shield", trigger: { on: "allCleared" } },
    ],
    traits: [
      { id: "detective", labelTh: "ชอบตามหาความจริง", icon: "eye", when: [{ favourite: "dream" }] },
      { id: "checker", labelTh: "ตาไวจับตัวเลขเพี้ยน", icon: "coin", when: [{ favourite: "work" }, { perfect: "work:books" }] },
      { id: "straight", labelTh: "กล้าบอกความจริงเรื่องเงิน", icon: "chat", when: [{ choice: "work:tell", value: "gap" }] },
      { id: "careful", labelTh: "รอบคอบก่อนสรุป", icon: "heart", when: [{ choice: "work:tell", value: "wait" }] },
      { id: "doer", labelTh: "ลงมือคืนนี้", icon: "flag", when: [{ cleared: "tonight" }] },
      { id: "explorer", labelTh: "นักสำรวจสายงาน", icon: "map", when: [{ always: true }] },
      { id: "curious", labelTh: "อยากรู้ให้สุด", icon: "star", when: [{ always: true }] },
      { id: "first-run", labelTh: "กล้าลองรันแรก", icon: "compass", when: [{ always: true }] },
    ],
  },
} as const satisfies GuideIndexEntry;
