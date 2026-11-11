/**
 * Words for the player round on /shift/island: who you are on the island
 * (your Discord picture), the character sheet, coins and the shop. Thai
 * first, DRAFT COPY for the founder's review.
 *
 * Rules (checked by __tests__/player-copy.test.ts, same as copy.ts): no em
 * dash, no emoji, no markdown, never talk down (no น้อง, ลูก, เด็ก), no
 * streak wording. Progress, never ranking: nothing here compares a student
 * with anyone else. Coins come from approved work and community value, never
 * from hours.
 */

/** Numbers as Thai readers group them (2,000). */
export function coinNumber(n: number): string {
  const value = Number.isFinite(n) ? Math.trunc(n) : 0;
  return value.toLocaleString("th-TH");
}

export const PLAYER = {
  /** The pixel avatar's accessible name. */
  avatar: (name: string) => `รูปตัวละครของ ${name}`,
  /** The HUD chip's accessible name: who you are, the project, its tree as the level, and what the tap opens. */
  chip: (name: string, project: string, stage: number) => `${name}, ${project}, ต้นไม้ขั้น ${stage} จาก 7, ดูตัวละคร`,
  /** The coin pill's accessible name. */
  coinPill: (balance: string) => `Passioncoin ${balance}, เปิดกระเป๋า`,
};

export const CHARACTER = {
  title: "ตัวละครของฉัน",
  level: (stage: number) => `ต้นไม้ขั้น ${stage} จาก 7`,
  /** Says once what "team" and "mine" count, so no number reads as a comparison. */
  teamVsMine: "ต้นไม้นับงานทั้งทีม ส่วน \"ที่คุณร่วมทำ\" นับงานที่มีชื่อคุณ",
  mainHeading: "เควสต์หลัก",
  /** The team's count is the level above; this is the student's own part. */
  mainMine: (n: number) => `ที่คุณร่วมทำ ${n}/7`,
  mainTeam: (n: number) => `เควสต์หลักที่ทีมผ่าน ${n}/7`,
  mine: (n: number) => `ที่คุณร่วมทำ ${n}`,
  sideHeading: "เควสต์เสริม",
  sideTeam: (n: number) => `เควสต์เสริมที่ทีมผ่าน ${n}`,
  communityHeading: "ช่วยชุมชน",
  communityTeam: (n: number) => `เควสต์ชุมชนที่ทีมผ่าน ${n}/2`,
  communityMine: (n: number) => `ที่คุณช่วยเอง ${n}`,
  thanks: (n: number) => `คำขอบคุณ ${n}`,
  checkinHeading: "การลงมือ",
  week: (n: number) => `สัปดาห์นี้ลงมือ ${n} วัน`,
  days: (n: number) => `ลงมือมาแล้วทั้งหมด ${n} วัน`,
  /**
   * A run that tolerates one empty Bangkok day and waits while the student
   * rests (rest mode), so resting is never punished. Shown only above 0.
   */
  run: (n: number) => `จังหวะตอนนี้ ${n} วัน เว้นได้ 1 วัน และหยุดรอเมื่อกดพัก`,
  coinRow: (balance: string) => `Passioncoin ${balance} coin`,
  coinOpen: "ดูกระเป๋า",
  coinsOff: "ซีซันนี้ยังไม่เปิดแจก coin",
};

export const WALLET = {
  title: "กระเป๋า Passioncoin",
  loading: "กำลังเปิดกระเป๋า",
  error: "เปิดกระเป๋าไม่ได้ตอนนี้ ลองอีกครั้งได้",
  retry: "ลองอีกครั้ง",
  balance: "coin ที่ใช้ได้",
  reserved: (n: string) => `กันไว้สำหรับของที่แลก ${n} coin`,
  off: "ซีซันนี้ยังไม่เปิดแจก coin",
  earnHeading: "ได้ coin จากอะไร",
  earnMain: (n: string) => `เควสต์หลักที่พี่เลี้ยงตรวจผ่าน ได้ ${n} coin`,
  earnSide: (n: string) => `เควสต์เสริมที่ผ่าน ได้ ${n} coin`,
  earnCommunity: (n: string) => `เควสต์ชุมชน: ช่วยเพื่อน หรือพัฒนาชุมชน ได้ ${n} coin`,
  earnTaught: (n: string) => `ไปสอนใน SHIFT รุ่นถัดไป ได้ ${n} coin`,
  earnHelped: (n: string) => `ช่วยเพื่อนมากที่สุด ได้ ${n} coin`,
  cap: (n: number) => `สูงสุด ${n} ครั้งต่อคน`,
  notHours: "coin มาจากงานที่ผ่านการตรวจและการช่วยชุมชน ไม่ได้นับจากเวลาที่ใช้",
  termsHeading: "อ่านกติกา coin ทั้งหมด",
  recentHeading: "รายการล่าสุด",
  /** Shows every entry the wallet read (at most 10) after the newest 3. */
  recentMore: (n: number) => `ดูทั้งหมด (${n})`,
  recentEmpty: "ยังไม่มีรายการ เควสต์ที่ผ่านการตรวจจะขึ้นที่นี่",
};

/** Ledger lines, mapped on the server (wallet-actions.ts) from kind, rule key and category. */
export const WALLET_LABELS = {
  main: "เควสต์หลักที่ผ่าน",
  community: "เควสต์ชุมชนที่ผ่าน",
  side: "เควสต์เสริมที่ผ่าน",
  taught: "ไปสอนใน SHIFT รุ่นถัดไป",
  helped: "ช่วยเพื่อนมากที่สุด",
  award: "งานที่ผ่านการตรวจ",
  recognition: "คำชื่นชมจากทีมพี่เลี้ยง",
  recognitionIn: (category: string) => `คำชื่นชมจากทีมพี่เลี้ยง: ${category}`,
  reversal: "ทีมงานหักคืน",
  hold: "แลกของในร้าน",
  release: "ยกเลิกการแลก ได้ coin คืน",
  other: "รายการ coin",
};

export const SHOP = {
  heading: "ร้านค้า",
  closed: "ร้านยังไม่เปิด เมื่อเปิด จะประกาศกติกาและของที่มีจริงให้ทราบก่อน",
  empty: "ยังไม่มีของในร้านตอนนี้",
  cost: (n: string) => `${n} coin`,
  lockConsent: "รอผู้ปกครองยินยอมก่อน",
  lockStage: (n: number) => `ต้องถึงต้นไม้ขั้น ${n}`,
  lockCommunity: "ต้องผ่านเควสต์ชุมชนอย่างน้อย 1 เควสต์",
  short: (n: string) => `coin ยังขาดอีก ${n}`,
  /** The checklist of what an item needs, every line at once, each with where the student is now. */
  needsLabel: "ต้องมีอะไรบ้าง",
  needConsent: "ผู้ปกครองยินยอม หรือยืนยันอายุเอง",
  needStage: (need: number, now: number) => `ต้นไม้ขั้น ${need} (ตอนนี้ ${now})`,
  needCommunity: "ผ่านเควสต์ชุมชน 1 เควสต์",
  needCoins: (cost: string, short: string) => `${cost} coin (ขาดอีก ${short})`,
  met: "ผ่านแล้ว",
  notYet: "ยังไม่ถึง",
  soldOut: "ของหมดแล้ว",
  redeem: "แลก",
  redeemLabel: (item: string) => `แลก ${item}`,
  confirm: (item: string, cost: string) => `แลก ${item} ใช้ ${cost} coin ทีมงานจะแจ้งขั้นตอนรับของในกล่องข้อความของบอทใน Discord`,
  confirmYes: "ยืนยันแลก",
  confirmNo: "ยังไม่แลก",
  redeeming: "กำลังแลก",
  done: (item: string) => `แลก ${item} แล้ว ทีมงานจะแจ้งขั้นตอนรับของในกล่องข้อความของบอทใน Discord`,
  mineHeading: "ของที่แลกไว้",
  status: {
    reserved: "รอทีมงาน",
    processing: "ทีมงานกำลังจัดส่ง",
    completed: "ได้รับแล้ว",
    cancelled: "ยกเลิกแล้ว",
  },
  cancel: "ยกเลิกการแลก",
  cancelLabel: (item: string) => `ยกเลิกการแลก ${item}`,
  cancelled: "ยกเลิกแล้ว coin กลับเข้ากระเป๋า",
  cancelTooLate: "ยกเลิกเองไม่ได้แล้ว ทีมงานเริ่มจัดส่งแล้ว",
  /** The redeem request did not get an answer: the same key on a retry is never charged twice. */
  retryLater: "ส่งคำขอไม่สำเร็จ ลองกดยืนยันอีกครั้งได้ ระบบไม่หัก coin ซ้ำ",
  offline: "เชื่อมต่อไม่ได้ตอนนี้ ลองอีกครั้งได้",
};

/** The ⋯ menu's row for consent, shown until it is on file. */
export const PLAYER_MENU = {
  consent: "ยืนยันความยินยอม",
  consentHint: "ผู้ปกครองกดยินยอม หรือยืนยันอายุเอง แล้วทีมจะขึ้นบนเกาะ แลกของ และลุ้นรางวัลได้",
  /** Consent is on file but AI news is not: the row stays, pointing at the AI line. */
  aiNews: "ข่าวเกาะที่สรุปโดย AI",
  aiNewsHint: "ทีมขึ้นข่าวเกาะได้เมื่อทุกคนในทีมอนุญาตเรื่อง AI เพิ่ม",
};
