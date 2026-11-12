/**
 * Which Radar page (if any) an Instagram comment should get (spec 5.2).
 *
 * Pure apart from the injected reel lookup, so the webhook, the admin queue
 * and the tests all share one decision. The lookup is
 * `getReelByMediaId` from `lib/supabase/radar-reels.ts` in production.
 */
import { getCampaign, isRadarKeywordOnly, isRadarLinkRequest, isRadarRequest } from "@/lib/meta/comment-intent";
import type { CommentTarget, RadarReel } from "./types";

export type ReelLookup = (mediaId: string) => Promise<RadarReel | null>;

/**
 * Words that make a comment on a mapped reel worth a human look, without
 * being explicit enough to send automatically ("ขอค่ะ", "อยากได้").
 */
const VAGUE_ASK = /ขอ|ลิ้?ง[กค]|link|อยากได้/i;

function radarTarget(
  reel: RadarReel | null,
  matchedBy: CommentTarget["matchedBy"],
  needsReview = false
): CommentTarget {
  return {
    campaign: "radar",
    fieldSlug: reel?.fieldSlug ?? null,
    chapterKey: reel?.chapterKey ?? null,
    reel,
    matchedBy,
    ...(needsReview ? { needsReview: true } : {}),
  };
}

/** A reel that can answer Radar comments: an Instagram reel we mapped. */
function isMappedInstagramReel(reel: RadarReel | null): reel is RadarReel {
  return reel !== null && reel.platform === "instagram";
}

/**
 * - Keyword (RADAR, เรดาร์): look the post up. A mapped reel gives its career
 *   and guide page (`chapterKey` carries the page key until the types.ts
 *   rename). On an unmapped post (or an empty media id) only a comment that is
 *   essentially the keyword gets the hub; the word inside a sentence
 *   ("ไม่อยู่ในเรดาร์เลย", "shift radar") is `needsReview` (admin queue only),
 *   so it never triggers an automatic DM.
 * - No keyword, mapped reel with DMs on, explicit link request: same target,
 *   matched by `request_phrase`.
 * - No keyword, mapped reel, vaguer ask: `needsReview` (admin queue only).
 * - Otherwise: the other campaigns' attribution unchanged, or null.
 *
 * A failed lookup is treated as unmapped: the keyword still gets the hub, and
 * a link request without the keyword gets nothing.
 */
export async function resolveCommentTarget(
  { text, mediaId }: { text: string | null | undefined; mediaId: string | null | undefined },
  getReel: ReelLookup
): Promise<CommentTarget | null> {
  const keyword = isRadarRequest(text);
  const media = mediaId?.trim() ?? "";

  let reel: RadarReel | null = null;
  if (media) {
    try {
      reel = await getReel(media);
    } catch (error) {
      console.error("Radar reel lookup failed", {
        errorCode: "radar_reel_lookup_failed",
        message: error instanceof Error ? error.message.slice(0, 120) : "unknown",
      });
      reel = null;
    }
  }
  const mapped = isMappedInstagramReel(reel) ? reel : null;

  if (keyword) {
    if (mapped || isRadarKeywordOnly(text)) return radarTarget(mapped, "keyword");
    return radarTarget(null, null, true);
  }

  if (mapped) {
    if (mapped.dmEnabled && isRadarLinkRequest(text)) return radarTarget(mapped, "request_phrase");
    // A shift/uni/port keyword on a Radar reel still belongs to that campaign.
    const other = getCampaign(text);
    if (other) return otherCampaign(other);
    if (text && VAGUE_ASK.test(text)) return radarTarget(mapped, null, true);
    return null;
  }

  const other = getCampaign(text);
  return other ? otherCampaign(other) : null;
}

function otherCampaign(campaign: CommentTarget["campaign"]): CommentTarget {
  return {
    campaign,
    fieldSlug: null,
    chapterKey: null,
    reel: null,
    matchedBy: null,
  };
}

/** True when the target should be DMed automatically (keyword or explicit request). */
export function isAutoSendableTarget(target: CommentTarget | null): target is CommentTarget {
  return (
    target !== null &&
    target.campaign === "radar" &&
    (target.matchedBy === "keyword" || target.matchedBy === "request_phrase")
  );
}

/** True for anything that belongs in the admin Radar queue. */
export function isRadarTarget(target: CommentTarget | null): target is CommentTarget {
  return target !== null && target.campaign === "radar";
}
