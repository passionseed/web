/**
 * DRAFT: company facts for the SHIFT High island economy and prizes. The
 * founder edits this file. Every value below (amounts, caps, prices, stock,
 * gates, terms and prizes) is a DRAFT until the founder signs it off.
 *
 * Applied to the DB only by /admin commands or the sandbox seed
 * (bot/scripts/economy-seed.ts), never by a migration. Changing a number
 * here does not change production: run the matching /admin rule,
 * /admin template-rule, /admin catalog or /admin terms command.
 *
 * Coins come from approved progress and community value, never from hours.
 * Money-value shop items are gated by tree stage and community quests, and
 * the database enforces the gates when a student redeems.
 *
 * Copy rules: Thai first, no em dashes, never talk down (no น้อง, no ลูก, no
 * เด็ก), no streak wording. Emoji live only in ISLAND_PRIZES_DRAFT and are
 * rendered aria-hidden.
 */

export const ECONOMY_STATUS = "DRAFT" as const;

/** What a rule pays for: main quests 1 to 5, community quests 6 and 7, side quests, or a staff award. */
export type RuleTarget = "main" | "community" | "side" | "staff";

export interface EconomyRuleDraft {
  /** Reward rule key, ^[a-z0-9-]{2,40}$ (shift_quest_admin_rule). */
  key: string;
  /** Passioncoin per award. */
  amount: number;
  /** Most awards one member can get under this key, null for no cap. */
  cap: number | null;
  /** How a team quest pays its confirmed contributors; null for staff awards to one person. */
  teamAllocation: "each_confirmed" | "split_confirmed" | null;
  target: RuleTarget;
  /** Staff-facing text, at most 300 characters each. */
  eligibility: string;
  review: string;
  reversal: string;
}

/** DRAFT reward rules. */
export const ECONOMY_RULES_DRAFT: readonly EconomyRuleDraft[] = [
  {
    key: "main-quest",
    amount: 300,
    cap: 5,
    teamAllocation: "each_confirmed",
    target: "main",
    eligibility: "เควสต์หลักขั้น 1 ถึง 5 ที่พี่เลี้ยงตรวจผ่าน จ่ายให้ทุกคนที่ทีมยืนยันว่าร่วมทำ",
    review: "พี่เลี้ยงตรวจหลักฐานบนการ์ดเควสต์ตามเกณฑ์ของเควสต์นั้น",
    reversal: "ถ้าผลตรวจถูกถอนภายหลัง หรือพบว่าหลักฐานไม่ตรงกับงานจริง ทีมงานหัก coin คืนพร้อมเขียนเหตุผล",
  },
  {
    key: "community-quest",
    amount: 500,
    cap: 4,
    teamAllocation: "each_confirmed",
    target: "community",
    eligibility: "เควสต์ชุมชนขั้น 6 ช่วยเพื่อนให้ไปต่อ และขั้น 7 ทำให้ชุมชนดีขึ้น ที่พี่เลี้ยงตรวจผ่าน ทำซ้ำได้จนถึงเพดาน",
    review: "พี่เลี้ยงตรวจว่ามีคนได้ประโยชน์จริง และเพื่อนทำได้เองหลังได้รับความช่วยเหลือ",
    reversal: "ถ้าผลตรวจถูกถอนภายหลัง หรือพบว่าทำงานแทนเพื่อน ทีมงานหัก coin คืนพร้อมเขียนเหตุผล",
  },
  {
    key: "side-quest",
    amount: 100,
    cap: 11,
    teamAllocation: "each_confirmed",
    target: "side",
    eligibility: "เควสต์เสริมที่เผยแพร่แล้ว และพี่เลี้ยงตรวจผ่าน จ่ายให้ทุกคนที่ทีมยืนยันว่าร่วมทำ",
    review: "พี่เลี้ยงตรวจหลักฐานบนการ์ดเควสต์ตามเกณฑ์ของเควสต์นั้น",
    reversal: "ถ้าผลตรวจถูกถอนภายหลัง ทีมงานหัก coin คืนพร้อมเขียนเหตุผล",
  },
  {
    key: "taught-next-shift",
    amount: 3000,
    cap: 1,
    teamAllocation: null,
    target: "staff",
    eligibility: "ทีมงานมอบให้คนที่กลับมาสอนหรือเล่างานของตัวเองใน SHIFT รุ่นถัดไป",
    review: "แอดมินยืนยันว่าสอนจริง แล้วมอบผ่าน /admin award พร้อมเขียนเหตุผลทุกครั้ง",
    reversal: "ถ้ามอบผิดคน ทีมงานหัก coin คืนพร้อมเขียนเหตุผล",
  },
  {
    key: "helped-most",
    amount: 1000,
    cap: 1,
    teamAllocation: null,
    target: "staff",
    eligibility: "รางวัลช่วยเพื่อนมากที่สุดของ Demo Day ตัดสินตามเกณฑ์ที่เขียนไว้",
    review: "ทีมงานตัดสินตามเกณฑ์ แล้วมอบผ่าน /admin award พร้อมเขียนเหตุผลทุกครั้ง",
    reversal: "ถ้ามอบผิดคน ทีมงานหัก coin คืนพร้อมเขียนเหตุผล",
  },
];

/** Main milestones paid by "main-quest". */
export const MAIN_RULE_MILESTONES = [1, 2, 3, 4, 5] as const;
/** Community milestones paid by "community-quest": 6 help another builder, 7 improve our community. */
export const COMMUNITY_RULE_MILESTONES = [6, 7] as const;

export interface ShopItemDraft {
  /** At most 80 characters (shift_quest_admin_catalog). */
  name: string;
  description: string;
  cost: number;
  stock: number;
  /** Tree stage 0..7 the student's project must reach first. */
  minStage: number;
  /** At least one approved community quest (milestone 6 or 7) first. */
  requiresCommunity: boolean;
}

/**
 * DRAFT shop ladder, cheapest first. The sticker costs one approved main
 * quest and has no gate; items with money value are gated by progress and
 * community value, so a student gets this far before redeeming them.
 *
 * The season's free sticker unlock (/admin unlock, "สติกเกอร์ SHIFT High"
 * in the sandbox) stays as well; it is separate from this shop item.
 *
 * Reachability under the DRAFT caps: one person earns at most 1,500 (main)
 * + 2,000 (community) + 1,100 (side) + 4,000 (both staff awards) = 8,600,
 * plus recognitions (capped at 200), so about 8,800 in all. The shirt at
 * 12,000 needs higher caps or more staff awards before anyone can reach it.
 */
export const SHOP_ITEMS_DRAFT: readonly ShopItemDraft[] = [
  {
    name: "สติกเกอร์ SHIFT High",
    description: "สติกเกอร์ SHIFT High 1 แผ่น แลกได้ตั้งแต่ผ่านเควสต์หลักแรก ทีมงานจะแจ้งวิธีรับในกล่องข้อความของบอทใน Discord",
    cost: 300,
    stock: 100,
    minStage: 0,
    requiresCommunity: false,
  },
  {
    name: "มัทฉะ",
    description: "มัทฉะ 1 ชุดจากทีม PassionSeed สำหรับคนที่พางานไปได้ไกลและช่วยชุมชนมาแล้ว ทีมงานจะแจ้งวิธีรับในกล่องข้อความของบอทใน Discord",
    cost: 8000,
    stock: 5,
    minStage: 5,
    requiresCommunity: true,
  },
  {
    name: "เสื้อ PassionSeed",
    description:
      "เสื้อยืด PassionSeed ลาย SHIFT High ของชิ้นใหญ่สุดในร้าน สำหรับคนที่พางานไปได้ไกลที่สุดและช่วยชุมชนมาแล้ว " +
      "หลังกดแลก ทีมงานจะแจ้งขั้นตอนเลือกไซซ์และรับของในกล่องข้อความของบอทใน Discord",
    cost: 12000,
    stock: 10,
    minStage: 6,
    requiresCommunity: true,
  },
];

function amountOf(key: string): string {
  const rule = ECONOMY_RULES_DRAFT.find((r) => r.key === key);
  return rule ? rule.amount.toLocaleString("en-US") : "0";
}

/** DRAFT terms set with /admin terms. reward_terms and redemption_terms are shown to students. */
export const ECONOMY_TERMS_DRAFT: {
  rewardTerms: string;
  redemptionTerms: string;
  fulfillmentProcess: string;
  fulfillmentOwner: string;
} = {
  rewardTerms:
    "Passioncoin มาจากงานที่ผ่านการตรวจและการช่วยชุมชน ไม่ได้นับจากเวลาที่ใช้ " +
    "coin ของแต่ละเควสต์ไปที่คนที่มีชื่อในงานนั้น (งานที่ส่งบนเว็บเกาะ: คนที่กดส่ง) ผลัดกันส่งในทีมได้: " +
    `เควสต์หลักที่พี่เลี้ยงตรวจผ่าน ${amountOf("main-quest")} coin ` +
    `เควสต์ชุมชน (ช่วยเพื่อนให้ไปต่อ หรือทำให้ชุมชนดีขึ้น) ${amountOf("community-quest")} coin ` +
    `เควสต์เสริม ${amountOf("side-quest")} coin ` +
    "แต่ละแบบมีเพดานต่อคน coin แลกเป็นเงินสดไม่ได้ ใช้แลกของในร้านบนเกาะเท่านั้น " +
    "ถ้าผลตรวจถูกถอนภายหลัง ทีมงานหัก coin คืนพร้อมเหตุผล",
  redemptionTerms:
    "แลกของได้เมื่อผู้ปกครองยินยอมแล้ว หรือยืนยันอายุเองแล้ว " +
    "ของบางชิ้นต้องให้ต้นไม้ของทีมถึงขั้นที่กำหนดและผ่านเควสต์ชุมชนก่อน " +
    "กดแลกแล้ว coin จะถูกกันไว้จนทีมงานส่งของ ยกเลิกได้ก่อนทีมงานเริ่มจัดส่ง ของมีจำนวนจำกัด",
  fulfillmentProcess:
    "ทีมงานแจ้งในกล่องข้อความของบอทใน Discord แล้วส่งแบบฟอร์มให้ผู้ปกครองเป็นคนกรอกชื่อผู้รับและที่อยู่จัดส่ง " +
    "ส่งของเมื่อได้ข้อมูลครบ และแจ้งอีกครั้งเมื่อส่งแล้ว",
  fulfillmentOwner: "ทีม PassionSeed",
};

export interface PrizeDraft {
  /** Rendered aria-hidden next to the title. */
  emoji: string;
  title: string;
  reward: string;
  /** A money prize: Claude credits for 18+, another prize of the same value under 18. */
  money: boolean;
  /** Paid in Passioncoin: hidden or explained while the season gives out no coins. */
  coins?: boolean;
}

/** DRAFT Demo Day prizes, shown in the island prize sheet. */
export const ISLAND_PRIZES_DRAFT: {
  title: string;
  prizes: readonly PrizeDraft[];
  moneyNote: string;
  moneyMinAge: 18;
  judging: string;
  consentNote: string;
} = {
  title: "รางวัล Demo Day",
  prizes: [
    { emoji: "🥇", title: "ไปได้ไกลที่สุด มีหลักฐานจริง", reward: "$100", money: true },
    { emoji: "🧪", title: "บทเรียนที่ดีที่สุดจากการทดสอบที่ล้ม", reward: "$50", money: true },
    { emoji: "🤝", title: "ช่วยเพื่อนมากที่สุด", reward: "Passioncoin พิเศษ", money: false, coins: true },
    { emoji: "🌱", title: "ทุกคน", reward: "Passioncoin ทุกเควสต์ที่ผ่าน แลกของในร้าน", money: false, coins: true },
  ],
  moneyNote: "รางวัลเงินเป็นเครดิต Claude สำหรับผู้มีอายุ 18 ปีขึ้นไป ถ้ายังไม่ถึง 18 เลือกรางวัลอื่นมูลค่าเท่ากันได้",
  moneyMinAge: 18,
  judging: "Demo Day ตัดสินตามเกณฑ์ที่เขียนไว้ ไม่มีกระดานจัดอันดับ",
  consentNote: "รับรางวัลได้เมื่อผู้ปกครองยินยอมแล้ว หรือยืนยันอายุเองแล้ว",
};
