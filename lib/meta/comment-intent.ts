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
 * Whether a comment opted into a follow-up from any live campaign.
 *
 * Campaigns run alongside each other: the "port" reels are still in the feed
 * collecting comments while "uni" runs, so both keywords stay active and a
 * commenter on either is someone who asked to hear from us.
 */
export function isCampaignRequest(text: string | null | undefined): boolean {
  return isPortRequest(text) || isUniRequest(text);
}
