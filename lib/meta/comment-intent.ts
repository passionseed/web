/**
 * Detects the call-to-action keyword our reels ask people to comment.
 *
 * Only these commenters asked us to follow up. Everyone else — "🔥", "สวยมาก",
 * a tag of a friend — commented without inviting a DM, so replying to them
 * would be unsolicited.
 */

/**
 * Latin "port" as a whole word, so "support", "important", and "airport" do
 * not qualify, while "port", "PORT", and "portfolio" do.
 */
const LATIN_PORT = /(?:^|[^a-z])port(?:folio)?(?![a-z])/i;

/**
 * Thai has no word boundaries, so `\b` cannot help here; "พอร์ต" is matched as
 * a plain substring, which is safe because it is not a fragment of a common
 * unrelated Thai word.
 */
const THAI_PORT = /พอร์?[ตท]/;

export function isPortRequest(text: string | null | undefined): boolean {
  if (!text) return false;
  return LATIN_PORT.test(text) || THAI_PORT.test(text);
}

/**
 * Latin "uni" as a whole word, so "university", "uniform", and "unique" do not
 * qualify. The reel asks for the bare word, and a substring match would sweep
 * in people discussing universities without asking for anything.
 */
const LATIN_UNI = /(?:^|[^a-z])uni(?![a-z])/i;

/** Thai transliteration, matched as a substring for the same reason as
 *  THAI_PORT: Thai has no word boundaries for `\b` to use. */
const THAI_UNI = /ยูนิ/;

export function isUniRequest(text: string | null | undefined): boolean {
  if (!text) return false;
  return LATIN_UNI.test(text) || THAI_UNI.test(text);
}

/**
 * Latin "shift" as a whole word, so "shifting" and "shifted" in ordinary
 * sentences do not qualify. SHIFT posts ask people to comment SHIFT.
 */
const LATIN_SHIFT = /(?:^|[^a-z])shift(?![a-z])/i;

/** Thai spellings of SHIFT, matched as substrings (no word boundaries). */
const THAI_SHIFT = /ชิ[ฟพ]/;

export function isShiftRequest(text: string | null | undefined): boolean {
  if (!text) return false;
  return LATIN_SHIFT.test(text) || THAI_SHIFT.test(text);
}

/**
 * Latin "radar" as a whole word, so "radars" and "radarscope" do not qualify.
 * Career Radar reels ask people to comment RADAR to get the guide by DM.
 */
const LATIN_RADAR = /(?:^|[^a-z])radar(?![a-z])/i;

/**
 * Thai spellings: เรดาร์, เรด้าร์, เรดาห์, เรดดาร์. The vowel after เรด is
 * required, so bare "เรด", "เรดบูล" and "เรดดิท" do not qualify.
 */
const THAI_RADAR = /เรดด?[่้]?า/;

export function isRadarRequest(text: string | null | undefined): boolean {
  if (!text) return false;
  return LATIN_RADAR.test(text) || THAI_RADAR.test(text);
}

/**
 * The comment is essentially just the keyword ("RADAR", "เรดาร์ค่ะ", "ขอ radar 🙏"),
 * after dropping @mentions, emoji and punctuation. Only this counts as an
 * opt-in on a post that is not a mapped Radar reel: the word also turns up in
 * ordinary sentences ("ไม่อยู่ในเรดาร์เลย", "radar ของพี่แม่นมาก"), and those
 * must never get an automatic DM.
 */
const RADAR_WORD = "(?:radar|เรดด?[่้]?า(?:ร์|ห์|ร|ห)?)";
const RADAR_POLITE = "(?:ค่ะ|ค่า|คะ|ครับ|คับ|ฮะ|นะ|จ้า|จ้ะ|ด้วย|หน่อย|พี่|please|pls|plz)";
const RADAR_ONLY = new RegExp(
  `^(?:ขอ\\s*)?${RADAR_WORD}(?:\\s*${RADAR_WORD})*(?:\\s*${RADAR_POLITE})*$`,
  "iu"
);
const NOISE = /@[\w.]+|[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️#*!?.,~:;'"()\-_]+/gu;

export function isRadarKeywordOnly(text: string | null | undefined): boolean {
  if (!text) return false;
  const core = text.replace(NOISE, " ").replace(/\s+/g, " ").trim();
  return core.length > 0 && RADAR_ONLY.test(core);
}

/**
 * An explicit ask for the link. Only counts on a mapped Radar reel, which the
 * caller checks (`lib/radar-guide/comment-target.ts`): on any other post
 * "ขอลิงก์" is someone asking about that post, not opting into Radar.
 * Vaguer comments ("ขอค่ะ", "อยากได้") are not link requests; they go to the
 * admin review queue instead of being sent automatically.
 *
 * "ลิงก์" is also spelled ลิงค์, ลิ้งค์ and ลิ้ง in comments, so all of those
 * count (the spec's pattern only had ลิงก์).
 */
const LINK_WORD = "ลิ้?ง(?:[กค]์?)?";
const LINK_REQUEST = new RegExp(
  [
    `ขอ\\s*${LINK_WORD}`,
    `ส่ง\\s*${LINK_WORD}`,
    `อยากได้\\s*${LINK_WORD}`,
    "ขอ\\s*ข้อมูล",
    "ขอ\\s*radar",
    "link\\s*(?:please|pls)",
    "ขอ\\s*link",
  ].join("|"),
  "i"
);

export function isRadarLinkRequest(text: string | null | undefined): boolean {
  if (!text) return false;
  return LINK_REQUEST.test(text);
}

/**
 * Whether a comment opted into a follow-up from any live campaign.
 *
 * Campaigns run alongside each other: the "port" reels are still in the feed
 * collecting comments while "uni" runs, so both keywords stay active and a
 * commenter on either is someone who asked to hear from us.
 */
export function isCampaignRequest(text: string | null | undefined): boolean {
  return (
    isRadarRequest(text) || isShiftRequest(text) || isPortRequest(text) || isUniRequest(text)
  );
}

/** The live campaigns, newest first, plus "all" for the unfiltered view. */
export type CampaignKey = "radar" | "shift" | "uni" | "port";
export const CAMPAIGN_KEYS: CampaignKey[] = ["radar", "shift", "uni", "port"];

/** Compile-time exhaustiveness check for `switch` statements on `CampaignKey`. */
export function assertNeverCampaign(campaign: never): never {
  throw new Error(`Unhandled campaign: ${String(campaign)}`);
}

/**
 * Which campaign a comment opted into.
 *
 * A comment containing more than one keyword is attributed to the newest
 * campaign (radar, then shift, then uni, then port), so the current push is
 * never under-counted. Returns null for comments that opted into nothing.
 *
 * Radar link requests without the keyword ("ขอลิงก์") are not detected here,
 * because they only count on a mapped Radar reel; see `resolveCommentTarget`.
 */
export function getCampaign(text: string | null | undefined): CampaignKey | null {
  if (isRadarRequest(text)) return "radar";
  if (isShiftRequest(text)) return "shift";
  if (isUniRequest(text)) return "uni";
  if (isPortRequest(text)) return "port";
  return null;
}
