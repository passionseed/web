import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { listInstagramMedia, type GraphMediaSummary } from "@/lib/meta/graph";
import { ReelUpsertBody, type RadarMediaOption } from "@/lib/radar-guide/admin-social";
import { radarShortUrl } from "@/lib/radar-guide/dm-copy";
import { requireAdmin, safeServerError } from "@/lib/security/route-guards";
import {
  isMissingRadarGuideTable,
  isPublishedFieldSlug,
  type RadarAdminDb,
} from "@/lib/supabase/radar-guide-admin";
import { listReels, RadarReelInputError, upsertReel } from "@/lib/supabase/radar-reels";

export const dynamic = "force-dynamic";

const RECENT_REELS_TAG = "radar-reels";

function toMediaOption(media: GraphMediaSummary): RadarMediaOption {
  return {
    id: media.id,
    shortcode: media.shortcode ?? null,
    permalink: media.permalink ?? null,
    caption: media.caption ? media.caption.slice(0, 280) : null,
    timestamp: media.timestamp,
    thumbnailUrl: media.thumbnail_url ?? null,
    productType: media.media_product_type ?? null,
  };
}

/**
 * GET: mapped reels. With `?media=1` also the account's recent Instagram posts
 * (two Graph pages), so the mapper can pick one instead of pasting a link.
 */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const db = admin.value.supabase as unknown as RadarAdminDb;
    const reels = await listReels({ limit: 200 }, db);
    if (request.nextUrl.searchParams.get("media") !== "1") return NextResponse.json({ reels });

    const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    if (!igUserId) {
      return NextResponse.json({ reels, media: [], mediaError: "INSTAGRAM_BUSINESS_ACCOUNT_ID is not set." });
    }
    try {
      const media = await listInstagramMedia(igUserId, { maxPages: 2 });
      return NextResponse.json({ reels, media: media.map(toMediaOption), mediaError: null });
    } catch (error) {
      // Graph being down must not break the mapper: links can still be pasted.
      const message = error instanceof Error ? error.message.slice(0, 200) : "Graph request failed";
      return NextResponse.json({ reels, media: [], mediaError: message });
    }
  } catch (error) {
    if (isMissingRadarGuideTable(error)) {
      return NextResponse.json({ error: "Radar reels are not installed yet. Apply the pending migrations." }, { status: 503 });
    }
    return safeServerError("Failed to load radar reels", error);
  }
}

/**
 * Creates or updates a reel mapping (career and, for a code guide, the page the
 * DM link opens); a career reel on Instagram also gets its own short link.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => null);
  const parsed = ReelUpsertBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reel", issues: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const db = admin.value.supabase as unknown as RadarAdminDb;
    const input = parsed.data;
    if (input.fieldSlug && !(await isPublishedFieldSlug(db, input.fieldSlug))) {
      return NextResponse.json({ error: "Map reels to a published career or to the hub." }, { status: 422 });
    }

    const { reel, linkCode } = await upsertReel(
      {
        id: input.id,
        platform: input.platform,
        mediaId: input.mediaId ?? null,
        shortcode: input.shortcode ?? null,
        permalink: input.permalink ?? null,
        fieldSlug: input.fieldSlug,
        pageKey: input.fieldSlug ? input.pageKey ?? null : null,
        videoKind: input.videoKind,
        angle: input.angle ?? null,
        isTrial: input.isTrial,
        hookVariant: input.hookVariant ?? null,
        careerLabelTh: input.careerLabelTh ?? null,
        dmEnabled: input.dmEnabled,
        postedAt: input.postedAt ?? null,
        note: input.note ?? null,
      },
      { createdBy: admin.value.userId, db }
    );
    revalidateTag(RECENT_REELS_TAG, { expire: 0 });

    // Only Instagram reels are DM'd; TikTok and YouTube use the typeable alias.
    const dmLinkCode = reel.platform === "instagram" ? linkCode : null;
    return NextResponse.json({
      reel,
      linkCode: dmLinkCode,
      shortUrl: dmLinkCode ? radarShortUrl(dmLinkCode) : null,
    });
  } catch (error) {
    if (error instanceof RadarReelInputError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "";
    if (/duplicate key|23505|radar_reels_platform_media_uidx/.test(message)) {
      return NextResponse.json({ error: "This post is already mapped. Edit the existing row instead." }, { status: 409 });
    }
    if (isMissingRadarGuideTable(error)) {
      return NextResponse.json({ error: "Radar reels are not installed yet. Apply the pending migrations." }, { status: 503 });
    }
    return safeServerError("Failed to save radar reel", error);
  }
}
