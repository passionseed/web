/**
 * Radar Guide shared types (spec docs/features/radar-guide.md, section 8.1).
 *
 * Every unit imports from here. Keep additions backwards compatible: add
 * optional fields or new union members, never rename or remove.
 *
 * Row types for the new tables live here until `lib/supabase/database.types.ts`
 * is regenerated after `supabase db push`. They mirror the migrations
 * 20261111100100-20261111100300 column for column.
 *
 * The DB-chapter guide (`radar_guide_chapters`, the 7 chapter keys) was
 * removed before reaching production (docs/features/radar-guides-in-code.md
 * 4.3). SQL columns named `chapter_key` keep their name and hold page keys.
 */
import type { Database } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Pages (code guides)
// ---------------------------------------------------------------------------

/** A page key of a code-authored guide (`mythos`, `triage`...). See RADAR_PAGE_KEY_PATTERN. */
export type GuidePageKey = string;

/** A `radar_cards` row (used by the deck fixtures and the dump scripts). */
export type RadarCardRow = Database["public"]["Tables"]["radar_cards"]["Row"];

// ---------------------------------------------------------------------------
// Events and tracker
// ---------------------------------------------------------------------------

export const GUIDE_EVENT_TYPES = [
  "chapter_view",
  "video_play",
  "video_unmute",
  "video_progress",
  "video_complete",
  "interactive_tap",
  "cta_click",
  "follow_click",
  "share_click",
] as const;
export type GuideEventType = (typeof GUIDE_EVENT_TYPES)[number];

/** Event types the database keeps once per (visit, type, chapter, value). */
export const GUIDE_ONCE_EVENT_TYPES = [
  "chapter_view",
  "video_play",
  "video_unmute",
  "video_progress",
  "video_complete",
] as const satisfies readonly GuideEventType[];

/** `cta_click` targets. `resource:<n>` is one of the CtaCard resource links. */
export type GuideCtaTarget =
  | "intent"
  | "program"
  | "first-step"
  | "plan"
  | `resource:${number}`;

export type GuideShareTarget = "line" | "copy" | "native";

/** SQL pattern for `radar_guide_events.target`; other targets are stored as NULL. */
export const GUIDE_EVENT_TARGET_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;

export interface GuideEventInput {
  type: GuideEventType;
  /** Older name for `pageKey`, kept for deck callers. Same pattern; `pageKey` wins. */
  chapterKey?: GuidePageKey;
  /**
   * Code guide page key (lib/radar-guides/<slug>), sent as `p_chapter_key`.
   * Must match RADAR_PAGE_KEY_PATTERN. Wins over `chapterKey` when both are set.
   */
  pageKey?: GuidePageKey;
  /** Only sent when it is a UUID (the synthetic score card is "__score__"). */
  cardId?: string;
  target?: string;
  valueInt?: number;
  metadata?: Record<string, string | number | boolean>;
}

export type CareerRequestResult = "ok" | "invalid" | "rate_limited" | "failed";

export interface GuideTracker {
  visitId: string | null;
  track(e: GuideEventInput): void;
  submitCareerRequest(text: string): Promise<CareerRequestResult>;
}

// ---------------------------------------------------------------------------
// Attribution and visits
// ---------------------------------------------------------------------------

export const UA_APPS = ["instagram", "tiktok", "line", "facebook", "other"] as const;
export type UaApp = (typeof UA_APPS)[number];

export interface RadarAttribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_host: string | null;
  ua_app: UaApp | null;
}

export interface RadarVisitContext {
  visitId: string;
  attribution: RadarAttribution;
}

// ---------------------------------------------------------------------------
// Reels, links, comment DMs
// ---------------------------------------------------------------------------

export const RADAR_REEL_PLATFORMS = ["instagram", "tiktok", "youtube"] as const;
export type RadarReelPlatform = (typeof RADAR_REEL_PLATFORMS)[number];

/** `demo`: a reel filmed from a guide page in demo mode (?demo=1). */
export const RADAR_VIDEO_KINDS = ["founder", "motion", "demo"] as const;
export type RadarVideoKind = (typeof RADAR_VIDEO_KINDS)[number];

export const RADAR_REEL_ANGLES = [
  "salary_reveal",
  "myth_busted",
  "ai_replace",
  "portfolio_for_this_career",
  "which_faculty",
  "compare",
  "day_in_life",
  "overview",
] as const;
export type RadarReelAngle = (typeof RADAR_REEL_ANGLES)[number];

export interface RadarReel {
  id: string;
  platform: RadarReelPlatform;
  mediaId: string | null;
  shortcode: string | null;
  fieldSlug: string | null;
  /** The guide page key (SQL column `chapter_key`). */
  chapterKey: GuidePageKey | null;
  videoKind: RadarVideoKind;
  angle: RadarReelAngle | null;
  isTrial: boolean;
  careerLabelTh: string | null;
  dmEnabled: boolean;
}

export interface RadarLink {
  code: string;
  fieldSlug: string | null;
  /** The guide page key (SQL column `chapter_key`). */
  chapterKey: GuidePageKey | null;
  utm: { source: string; medium: string; campaign: string; content: string | null };
  isActive: boolean;
}

export type RadarMatchedBy = "keyword" | "request_phrase" | "admin";
export type RadarCampaignKey = "radar" | "shift" | "uni" | "port";

export interface CommentTarget {
  campaign: RadarCampaignKey;
  fieldSlug: string | null;
  /** The guide page key (SQL column `chapter_key`). */
  chapterKey: GuidePageKey | null;
  reel: RadarReel | null;
  matchedBy: RadarMatchedBy | null;
  needsReview?: boolean;
}

// ---------------------------------------------------------------------------
// Row types for the new tables (until database.types.ts is regenerated)
// ---------------------------------------------------------------------------

/** `public.radar_visits` (one row per page visit, hub has `field_slug` NULL). */
export interface RadarVisitRow {
  visit_id: string;
  session_id: string;
  user_id: string | null;
  field_slug: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_host: string | null;
  ua_app: UaApp | null;
  created_at: string;
}

/** `public.radar_guide_events`. */
export interface RadarGuideEventRow {
  id: string;
  visit_id: string;
  session_id: string;
  user_id: string | null;
  field_slug: string | null;
  event_type: GuideEventType;
  chapter_key: string | null;
  card_id: string | null;
  target: string | null;
  value_int: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const RADAR_CAREER_REQUEST_STATUSES = [
  "new",
  "merged",
  "planned",
  "published",
  "rejected",
] as const;
export type RadarCareerRequestStatus = (typeof RADAR_CAREER_REQUEST_STATUSES)[number];
export type RadarCareerRequestSource = "page" | "ig_comment";

/** `public.radar_career_requests`. Admin-only; free text from minors, no contact details. */
export interface RadarCareerRequestRow {
  id: string;
  source: RadarCareerRequestSource;
  session_id: string | null;
  visit_id: string | null;
  user_id: string | null;
  from_field_slug: string | null;
  request_text: string;
  matched_field_slug: string | null;
  status: RadarCareerRequestStatus;
  created_at: string;
}

/** `public.analytics_radar_guide_funnel` (admin-only view). Counts come back as numbers or bigint strings. */
export interface RadarGuideFunnelRow {
  week: string;
  /** Field slug, or "hub". */
  page: string;
  channel: string;
  utm_campaign: string | null;
  utm_content: string | null;
  visits: number;
  unique_devices: number;
  chapters_seen: number;
  video_plays: number;
  unmutes: number;
  visits_with_complete: number;
  chapters_completed: number;
  interactive_visits: number;
  cta_clicks: number;
  follow_intents: number;
  share_clicks: number;
  intents: number;
  career_requests: number;
}

/** `public.radar_reels`. */
export interface RadarReelRow {
  id: string;
  platform: RadarReelPlatform;
  media_id: string | null;
  shortcode: string | null;
  permalink: string | null;
  field_slug: string | null;
  chapter_key: string | null;
  video_kind: RadarVideoKind;
  angle: RadarReelAngle | null;
  is_trial: boolean;
  hook_variant: number | null;
  career_label_th: string | null;
  dm_enabled: boolean;
  posted_at: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** `public.radar_links` (short links served by /r/[code]). */
export interface RadarLinkRow {
  code: string;
  field_slug: string | null;
  chapter_key: string | null;
  reel_id: string | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string | null;
  is_active: boolean;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** `public.radar_link_clicks`. `code` is not an FK, so alias clicks log too. */
export interface RadarLinkClickRow {
  id: string;
  code: string;
  field_slug: string | null;
  /** Guide page from a typed `<alias>-<page>` code (migration 20261111100300). */
  page_key: string | null;
  ua_app: UaApp | null;
  created_at: string;
}

export type RadarCommentDmMode = "auto" | "admin";
export type RadarCommentDmStatus = "claimed" | "sent" | "failed" | "skipped";

/** `public.radar_comment_dms`. `comment_id` is `ig_comments.id` (uuid), not Meta's text id. */
export interface RadarCommentDmRow {
  id: string;
  comment_id: string;
  reel_id: string | null;
  field_slug: string | null;
  matched_by: RadarMatchedBy;
  mode: RadarCommentDmMode;
  status: RadarCommentDmStatus;
  skip_reason: string | null;
  error_code: string | null;
  link: string | null;
  message: string | null;
  public_reply: string | null;
  sent_by: string | null;
  claimed_at: string;
  sent_at: string | null;
  dm_tap_at: string | null;
  created_at: string;
}

/** `public.radar_reel_insights` (daily Graph snapshot per reel). */
export interface RadarReelInsightRow {
  reel_id: string;
  captured_on: string;
  views: number | null;
  reach: number | null;
  saved: number | null;
  shares: number | null;
  comments: number | null;
  likes: number | null;
  avg_watch_ms: number | null;
  follows: number | null;
  profile_visits: number | null;
  raw: Record<string, unknown>;
  created_at: string;
}

/** New columns on `public.dm_conversations` (migration 20261111100300). */
export interface DmConversationRadarColumns {
  origin: "radar" | null;
  radar_reply_sent_at: string | null;
}

// ---------------------------------------------------------------------------
// RPC contracts (call with `.rpc(name, args as never)` until types are regenerated)
// ---------------------------------------------------------------------------

export interface RecordRadarVisitArgs {
  p_session_id: string;
  p_visit_id: string;
  p_field_slug?: string | null;
  /** Keys: utm_source, utm_medium, utm_campaign, utm_content, referrer_host, ua_app. At most 1KB. */
  p_attr?: Partial<RadarAttribution>;
}

export interface RecordRadarGuideEventArgs {
  p_session_id: string;
  p_visit_id: string;
  p_event_type: GuideEventType;
  p_field_slug?: string | null;
  p_chapter_key?: string | null;
  p_card_id?: string | null;
  p_target?: string | null;
  p_value_int?: number | null;
  p_metadata?: Record<string, string | number | boolean>;
}

export interface SubmitRadarCareerRequestArgs {
  p_session_id: string;
  p_visit_id: string | null;
  p_text: string;
  p_from_field_slug?: string | null;
}

/** Service role only. Returns the `radar_comment_dms.id` on a won claim, or null. */
export interface ClaimRadarCommentDmArgs {
  p_comment_id: string;
  p_mode: RadarCommentDmMode;
  p_matched_by: RadarMatchedBy;
  p_reel_id?: string | null;
  p_field_slug?: string | null;
  p_sent_by?: string | null;
}

export const RADAR_RPC = {
  recordVisit: "record_radar_visit",
  recordGuideEvent: "record_radar_guide_event",
  submitCareerRequest: "submit_radar_career_request",
  claimCommentDm: "claim_radar_comment_dm",
} as const;

/**
 * Postgres error codes raised by the RPCs: 22023 invalid input, P0001 rate
 * limit, P0002 field not found.
 */
export const RADAR_RPC_ERROR = {
  invalid: "22023",
  rateLimited: "P0001",
  notFound: "P0002",
} as const;

// ---------------------------------------------------------------------------
// Shared patterns (mirror the SQL CHECKs)
// ---------------------------------------------------------------------------

export const RADAR_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RADAR_CHAPTER_KEY_PATTERN = /^[a-z][a-z0-9_]{1,31}$/;
/**
 * Code guide page key (docs/features/radar-guides-in-code.md). Same values and
 * SQL CHECK as `chapter_key`, which keeps its column name and holds the page key.
 */
export const RADAR_PAGE_KEY_PATTERN = RADAR_CHAPTER_KEY_PATTERN;
export const RADAR_SESSION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
export const RADAR_LINK_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,31}$/;
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** CDN keys for guide clip media: radar/guide/<slug>/<page_key>.<sha8>.mp4|.webp */
export const RADAR_GUIDE_VIDEO_URL_PATTERN =
  /^https:\/\/cdn\.passionseed\.org\/radar\/guide\/[a-z0-9-]+\/[a-z0-9_]+\.[0-9a-f]{8}\.mp4$/;
export const RADAR_GUIDE_POSTER_URL_PATTERN =
  /^https:\/\/cdn\.passionseed\.org\/radar\/guide\/[a-z0-9-]+\/[a-z0-9_]+\.[0-9a-f]{8}\.webp$/;
