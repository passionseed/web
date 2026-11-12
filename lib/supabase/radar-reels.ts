/**
 * Data access for Radar reels, their short links and the comment-DM log
 * (spec 3.4 and 5). Service-role client: the webhook has no user, and the
 * admin callers check `requireAdmin()` before calling in.
 *
 * Table types are hand-written in `lib/radar-guide/types.ts` until
 * `database.types.ts` is regenerated after `supabase db push`.
 */
import { createAdminClient } from "@/utils/supabase/admin";
import { guidePageError } from "@/lib/radar-guide/admin-social";
import { radarLinkRowForReel, RADAR_HUB_DM_LINK_CODE } from "@/lib/radar-guide/dm-copy";
import { findDashes } from "@/lib/radar-guide/thai-copy";
import {
  RADAR_PAGE_KEY_PATTERN,
  RADAR_REEL_ANGLES,
  RADAR_REEL_PLATFORMS,
  RADAR_RPC,
  RADAR_SLUG_PATTERN,
  RADAR_VIDEO_KINDS,
  type ClaimRadarCommentDmArgs,
  type GuidePageKey,
  type RadarCommentDmRow,
  type RadarCommentDmStatus,
  type RadarReel,
  type RadarReelAngle,
  type RadarReelPlatform,
  type RadarReelRow,
  type RadarVideoKind,
} from "@/lib/radar-guide/types";

type Db = ReturnType<typeof createAdminClient>;

/** The guide page key in a `chapter_key` column, or null when it is not one. Pure. */
export function rowPageKey(value: string | null): GuidePageKey | null {
  return value && RADAR_PAGE_KEY_PATTERN.test(value) ? value : null;
}

/**
 * Narrow a DB row to the shared `RadarReel` shape. Pure.
 *
 * `chapterKey` carries the code guide page key (`mythos`, `money`): the
 * column keeps its name.
 */
export function rowToReel(row: RadarReelRow): RadarReel {
  return {
    id: row.id,
    platform: row.platform,
    mediaId: row.media_id,
    shortcode: row.shortcode,
    fieldSlug: row.field_slug,
    chapterKey: rowPageKey(row.chapter_key),
    videoKind: row.video_kind,
    angle: row.angle,
    isTrial: row.is_trial,
    careerLabelTh: row.career_label_th,
    dmEnabled: row.dm_enabled,
  };
}

/** The mapped reel for a post, or null. */
export async function getReelByMediaId(
  mediaId: string,
  platform: RadarReelPlatform = "instagram",
  db: Db = createAdminClient()
): Promise<RadarReel | null> {
  if (!mediaId) return null;
  const { data, error } = await db
    .from("radar_reels")
    .select("*")
    .eq("platform", platform)
    .eq("media_id", mediaId)
    .maybeSingle();
  if (error) throw new Error(`Failed to read radar reel: ${error.message}`);
  return data ? rowToReel(data as RadarReelRow) : null;
}

/** Reels newest first, for the admin mapper and the insights cron. */
export async function listReels(
  options: { platform?: RadarReelPlatform; postedSince?: string; limit?: number } = {},
  db: Db = createAdminClient()
): Promise<RadarReelRow[]> {
  let query = db.from("radar_reels").select("*");
  if (options.platform) query = query.eq("platform", options.platform);
  if (options.postedSince) query = query.gte("posted_at", options.postedSince);
  const { data, error } = await query
    .order("posted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(options.limit ?? 200, 1), 1000));
  if (error) throw new Error(`Failed to list radar reels: ${error.message}`);
  return (data ?? []) as RadarReelRow[];
}

/** Media ids of every mapped Instagram reel, for the admin Radar queue. */
export async function listMappedInstagramMediaIds(db: Db = createAdminClient()): Promise<string[]> {
  const { data, error } = await db
    .from("radar_reels")
    .select("media_id")
    .eq("platform", "instagram")
    .not("media_id", "is", null);
  if (error) throw new Error(`Failed to list radar reel media: ${error.message}`);
  return (data ?? []).map((row: { media_id: string }) => row.media_id);
}

// ---------------------------------------------------------------------------
// Upsert (admin reel mapper, Unit E)
// ---------------------------------------------------------------------------

export interface RadarReelUpsert {
  /** Set to update an existing reel. */
  id?: string;
  platform: RadarReelPlatform;
  mediaId?: string | null;
  shortcode?: string | null;
  permalink?: string | null;
  /** Null maps the reel to the hub. */
  fieldSlug: string | null;
  /** Code guide page the DM link opens (stored in `chapter_key`). Null for deck careers and the hub. */
  pageKey?: GuidePageKey | null;
  videoKind?: RadarVideoKind;
  angle?: RadarReelAngle | null;
  isTrial?: boolean;
  hookVariant?: number | null;
  /** Required when `fieldSlug` is set: the DM reads "สาย {label}". */
  careerLabelTh?: string | null;
  dmEnabled?: boolean;
  postedAt?: string | null;
  note?: string | null;
}

export class RadarReelInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RadarReelInputError";
  }
}

/** Validation shared with the admin API. Returns the DB row to write. Pure. */
export function reelUpsertRow(
  input: RadarReelUpsert,
  createdBy: string | null
): Omit<RadarReelRow, "id" | "created_at" | "updated_at" | "created_by"> & {
  id?: string;
  created_by?: string | null;
} {
  if (!(RADAR_REEL_PLATFORMS as readonly string[]).includes(input.platform)) {
    throw new RadarReelInputError("Unknown platform");
  }
  if (input.fieldSlug !== null && !RADAR_SLUG_PATTERN.test(input.fieldSlug)) {
    throw new RadarReelInputError("Invalid field slug");
  }
  const label = input.careerLabelTh?.trim() || null;
  if (input.fieldSlug && !label) {
    throw new RadarReelInputError("A reel mapped to a career needs a short career label for the DM");
  }
  if (label && (label.length > 40 || findDashes(label).length > 0)) {
    throw new RadarReelInputError("The career label must be at most 40 characters with no dashes");
  }
  const pageError = guidePageError(input.fieldSlug, input.pageKey);
  if (pageError) throw new RadarReelInputError(pageError);
  const videoKind = input.videoKind ?? "founder";
  if (!(RADAR_VIDEO_KINDS as readonly string[]).includes(videoKind)) {
    throw new RadarReelInputError("Unknown video kind");
  }
  if (input.angle != null && !(RADAR_REEL_ANGLES as readonly string[]).includes(input.angle)) {
    throw new RadarReelInputError("Unknown angle");
  }
  if (input.mediaId != null && !/^[0-9_]{5,64}$/.test(input.mediaId)) {
    throw new RadarReelInputError("Invalid media id");
  }
  if (input.shortcode != null && !/^[A-Za-z0-9_-]{5,40}$/.test(input.shortcode)) {
    throw new RadarReelInputError("Invalid shortcode");
  }
  return {
    ...(input.id ? { id: input.id } : { created_by: createdBy }),
    platform: input.platform,
    media_id: input.mediaId ?? null,
    shortcode: input.shortcode ?? null,
    permalink: input.permalink ?? null,
    field_slug: input.fieldSlug,
    chapter_key: input.fieldSlug ? input.pageKey || null : null,
    video_kind: videoKind,
    angle: input.angle ?? null,
    is_trial: input.isTrial ?? false,
    hook_variant: input.hookVariant ?? null,
    career_label_th: label,
    dm_enabled: input.dmEnabled ?? true,
    posted_at: input.postedAt ?? null,
    note: input.note?.trim() || null,
  };
}

const LINK_CODE_ATTEMPTS = 4;

/**
 * Creates or updates a reel and, for an Instagram reel mapped to a career,
 * its own `radar_links` row (spec 5.3). Hub reels share `hub-ig`.
 *
 * An existing link keeps its code (it may already be in DMs) and only has its
 * target (career and page) and utm_content updated. The caller revalidates the `radar-reels` tag.
 */
export async function upsertReel(
  input: RadarReelUpsert,
  options: { createdBy?: string | null; db?: Db; random?: () => number } = {}
): Promise<{ reel: RadarReel; linkCode: string }> {
  const db = options.db ?? createAdminClient();
  const row = reelUpsertRow(input, options.createdBy ?? null);

  const { data, error } = row.id
    ? await db.from("radar_reels").update(row).eq("id", row.id).select("*").single()
    : await db.from("radar_reels").insert(row).select("*").single();
  if (error || !data) {
    // Keep the Postgres code in the message: the admin route maps 23505
    // (the post is already mapped) to a 409.
    const code = error?.code ? ` (${error.code})` : "";
    throw new Error(`Failed to save radar reel${code}: ${error?.message ?? "no row"}`);
  }
  const reel = rowToReel(data as RadarReelRow);

  if (reel.platform !== "instagram" || !reel.fieldSlug) {
    return { reel, linkCode: RADAR_HUB_DM_LINK_CODE };
  }

  const existing = await getReelLinkCode(reel.id, db);
  const linkInput = { ...reel, pageKey: rowPageKey(reel.chapterKey) };
  const fresh = radarLinkRowForReel(linkInput, options.random);
  if (existing) {
    const { error: updateError } = await db
      .from("radar_links")
      .update({
        field_slug: fresh.field_slug,
        chapter_key: fresh.chapter_key,
        utm_content: fresh.utm_content,
        is_active: true,
      })
      .eq("code", existing);
    if (updateError) throw new Error(`Failed to update radar link: ${updateError.message}`);
    return { reel, linkCode: existing };
  }

  for (let attempt = 0; attempt < LINK_CODE_ATTEMPTS; attempt += 1) {
    const link = attempt === 0 ? fresh : radarLinkRowForReel(linkInput, options.random);
    const { error: insertError } = await db
      .from("radar_links")
      .insert({ ...link, created_by: options.createdBy ?? null });
    if (!insertError) return { reel, linkCode: link.code };
    // 23505: the random code collided; try another. Anything else is real.
    if (insertError.code !== "23505") {
      throw new Error(`Failed to create radar link: ${insertError.message}`);
    }
    const raced = await getReelLinkCode(reel.id, db);
    if (raced) return { reel, linkCode: raced };
  }
  throw new Error("Failed to create a unique radar link code");
}

/** The active short-link code for a reel, or null. */
export async function getReelLinkCode(reelId: string, db: Db = createAdminClient()): Promise<string | null> {
  const { data, error } = await db
    .from("radar_links")
    .select("code, is_active")
    .eq("reel_id", reelId)
    .maybeSingle();
  if (error) throw new Error(`Failed to read radar link: ${error.message}`);
  return data && data.is_active ? (data.code as string) : null;
}

// ---------------------------------------------------------------------------
// Comment DM log and claim
// ---------------------------------------------------------------------------

/**
 * Atomic claim (service role only). Returns the `radar_comment_dms.id` when
 * this caller won the right to DM the comment, or null when someone else has
 * it, it was already sent, or the comment was answered outside Radar.
 */
export async function claimRadarCommentDm(
  args: ClaimRadarCommentDmArgs,
  db: Db = createAdminClient()
): Promise<string | null> {
  const { data, error } = await db.rpc(RADAR_RPC.claimCommentDm, {
    p_comment_id: args.p_comment_id,
    p_mode: args.p_mode,
    p_matched_by: args.p_matched_by,
    p_reel_id: args.p_reel_id ?? null,
    p_field_slug: args.p_field_slug ?? null,
    p_sent_by: args.p_sent_by ?? null,
  } as never);
  if (error) throw new Error(`Failed to claim radar comment DM: ${error.message}`);
  return typeof data === "string" && data ? data : null;
}

export type RadarCommentDmPatch = Partial<
  Pick<
    RadarCommentDmRow,
    "status" | "skip_reason" | "error_code" | "link" | "message" | "public_reply" | "sent_at" | "dm_tap_at"
  >
>;

export async function finishRadarCommentDm(
  id: string,
  patch: RadarCommentDmPatch,
  db: Db = createAdminClient()
): Promise<void> {
  const { error } = await db.from("radar_comment_dms").update(patch).eq("id", id);
  if (error) throw new Error(`Failed to update radar comment DM: ${error.message}`);
}

export async function getRadarCommentDm(
  id: string,
  db: Db = createAdminClient()
): Promise<RadarCommentDmRow | null> {
  const { data, error } = await db.from("radar_comment_dms").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to read radar comment DM: ${error.message}`);
  return (data as RadarCommentDmRow | null) ?? null;
}

/** Lets the admin queue retry a failed send (the claim lets a failed row be reclaimed). */
export async function clearCommentReplied(commentId: string, db: Db = createAdminClient()): Promise<void> {
  const { error } = await db.from("ig_comments").update({ replied_at: null }).eq("id", commentId);
  if (error) throw new Error(`Failed to reopen comment: ${error.message}`);
}

/** Public replies posted since `sinceIso`, for the 30-per-hour cap. */
export async function countRadarPublicRepliesSince(
  sinceIso: string,
  db: Db = createAdminClient()
): Promise<number> {
  const { count, error } = await db
    .from("radar_comment_dms")
    .select("id", { count: "exact", head: true })
    .not("public_reply", "is", null)
    .gte("claimed_at", sinceIso);
  if (error) throw new Error(`Failed to count radar public replies: ${error.message}`);
  return count ?? 0;
}

export interface RadarCommentDmSummary {
  status: RadarCommentDmStatus;
  matchedBy: RadarCommentDmRow["matched_by"];
  mode: RadarCommentDmRow["mode"];
  errorCode: string | null;
  skipReason: string | null;
  sentAt: string | null;
  publicReply: boolean;
}

/** Log rows keyed by `ig_comments.id`, for the admin rows. */
export async function listRadarCommentDms(
  commentIds: string[],
  db: Db = createAdminClient()
): Promise<Map<string, RadarCommentDmSummary>> {
  const out = new Map<string, RadarCommentDmSummary>();
  if (commentIds.length === 0) return out;
  const CHUNK = 200;
  for (let i = 0; i < commentIds.length; i += CHUNK) {
    const { data, error } = await db
      .from("radar_comment_dms")
      .select("comment_id, status, matched_by, mode, error_code, skip_reason, sent_at, public_reply")
      .in("comment_id", commentIds.slice(i, i + CHUNK));
    if (error) throw new Error(`Failed to list radar comment DMs: ${error.message}`);
    for (const row of (data ?? []) as RadarCommentDmRow[]) {
      out.set(row.comment_id, {
        status: row.status,
        matchedBy: row.matched_by,
        mode: row.mode,
        errorCode: row.error_code,
        skipReason: row.skip_reason,
        sentAt: row.sent_at,
        publicReply: Boolean(row.public_reply),
      });
    }
  }
  return out;
}

/** How long after a Radar DM a new thread from that person counts as Radar-origin. */
export const RADAR_ORIGIN_WINDOW_DAYS = 30;

/**
 * Whether a new DM thread comes from someone we sent a Radar DM to in the
 * last 30 days. Matched on the commenter's IG user id, falling back to the
 * username (the comment's `from.id` may not equal the messaging sender id;
 * day-0 test, spec 5.6).
 */
export async function isRadarOriginCandidate(
  sender: { platformUserId: string | null; username?: string | null },
  options: { now?: number; db?: Db } = {}
): Promise<boolean> {
  const db = options.db ?? createAdminClient();
  const since = new Date(
    (options.now ?? Date.now()) - RADAR_ORIGIN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const lookup = async (column: "ig_user_id" | "username", value: string): Promise<boolean> => {
    const { data, error } = await db
      .from("radar_comment_dms")
      .select("id, ig_comments!inner(ig_user_id, username)")
      .eq("status", "sent")
      .gte("sent_at", since)
      .eq(`ig_comments.${column}`, value)
      .limit(1);
    if (error) throw new Error(`Failed to check radar origin: ${error.message}`);
    return (data ?? []).length > 0;
  };

  if (sender.platformUserId && (await lookup("ig_user_id", sender.platformUserId))) return true;
  const handle = sender.username?.trim().replace(/^@+/, "").toLowerCase();
  if (handle && (await lookup("username", handle))) return true;
  return false;
}

/** Whether any Radar DM went out in the last 30 days (cheap gate before a Graph lookup). */
export async function hasRecentRadarDms(options: { now?: number; db?: Db } = {}): Promise<boolean> {
  const db = options.db ?? createAdminClient();
  const since = new Date(
    (options.now ?? Date.now()) - RADAR_ORIGIN_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const { count, error } = await db
    .from("radar_comment_dms")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", since);
  if (error) throw new Error(`Failed to check recent radar DMs: ${error.message}`);
  return (count ?? 0) > 0;
}
