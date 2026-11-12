/**
 * Words around the island prize sheet and the plaza prize board. The prizes
 * themselves (titles, rewards, the 18+ note, the judging line, the consent
 * line and the emoji) are company facts in lib/content/shift-island-economy.ts,
 * which the founder edits. No emoji here, no em dashes, never talk down.
 */
import { ISLAND_PRIZES_DRAFT } from "@/lib/content/shift-island-economy";

export const PRIZES_UI = {
  /** The menu row that opens the prize sheet. */
  menu: "รางวัล",
  /** Accessible name of the prize board on the plaza (its tap target). */
  spot: "บอร์ดรางวัล Demo Day: ดูรางวัลทั้งหมด",
  /** The sheet's title, from the content file so the two never drift apart. */
  title: ISLAND_PRIZES_DRAFT.title,
  /** Accessible name of the prize list. */
  list: "รางวัลทั้งหมด",
  /** While the season gives out no coins: the coin prizes wait for it. */
  coinsOff: "ซีซันนี้ยังไม่เปิดแจก coin รางวัลที่เป็น Passioncoin เริ่มเมื่อเปิดแจก",
  /** Who may confirm their own age on the island (settings.consent_adult_age), next to the 18+ money note. */
  selfConfirm: (age: number) => `ยืนยันอายุเองบนเกาะได้เมื่ออายุ ${age} ปีขึ้นไป ถ้ายังไม่ถึง ให้ผู้ปกครองกดยินยอมแทน`,
} as const;
