/**
 * Sends the fixed Radar DM for a comment (spec 5.4). Never throws.
 *
 * Two callers share one path:
 * - the webhook (`maybeAutoSendRadarDm`), only while RADAR_COMMENT_DM_AUTO=on
 * - the admin Radar queue (`sendRadarDmFromAdmin`), one click per comment
 *
 * The send lock is the `claim_radar_comment_dm` RPC: a comment is only DMed
 * by whoever wins the claim, so a webhook retry, a second webhook delivery or
 * an admin click at the same moment can never DM the same comment twice. A
 * failed send releases the comment so the admin queue can retry it.
 *
 * Every dependency is injected so the decision logic is testable without
 * Graph or the database; `defaultRadarDmDeps()` wires the real ones.
 */
import { isRadarLinkRequest, isRadarRequest } from "@/lib/meta/comment-intent";
import { isExcludedFromAutoReply } from "@/lib/meta/reply-exclusions";
import { isSelfAuthored } from "@/lib/meta/self-account";
import type { MetaQuickReplyOption } from "@/lib/meta/graph";
import type { RadarCommentDmPatch } from "@/lib/supabase/radar-reels";
import { resolveCommentTarget, type ReelLookup } from "./comment-target";
import {
  buildRadarDm,
  buildRadarPublicReply,
  buildRadarQuickReplyPrompt,
  RADAR_HUB_DM_LINK_CODE,
  RADAR_PUBLIC_REPLY_HOURLY_CAP,
  RADAR_QUICK_REPLY_TITLE,
  radarQuickReplyPayload,
} from "./dm-copy";
import type {
  ClaimRadarCommentDmArgs,
  CommentTarget,
  RadarCommentDmMode,
  RadarCommentDmRow,
  RadarMatchedBy,
} from "./types";

/** The `ig_comments` fields the send needs. */
export interface RadarDmComment {
  /** `ig_comments.id` (uuid): the claim key. */
  id: string;
  /** Meta's text id: what Graph calls take. */
  ig_comment_id: string;
  media_id: string;
  text: string;
  username: string | null;
  ig_user_id: string | null;
  commented_at: string;
}

export type RadarDmStatus = "sent" | "failed" | "skipped";

export type RadarDmReason =
  | "sent"
  | "sent_quick_reply"
  | "not_radar"
  | "flag_off"
  | "needs_review"
  | "dm_disabled"
  | "self"
  | "excluded"
  | "too_old"
  | "claim_lost"
  | "copy_error"
  | "send_failed"
  | "error";

export interface RadarDmOutcome {
  status: RadarDmStatus;
  reason: RadarDmReason;
  /** `radar_comment_dms.id` when a claim was won. */
  dmId?: string;
  errorCode?: string;
  publicReply?: "posted" | "capped" | "already" | "failed";
}

export interface RadarDmDeps {
  getReel: ReelLookup;
  getLinkCode(reelId: string): Promise<string | null>;
  claim(args: ClaimRadarCommentDmArgs): Promise<string | null>;
  finish(id: string, patch: RadarCommentDmPatch): Promise<void>;
  getDmRow(id: string): Promise<Pick<RadarCommentDmRow, "public_reply"> | null>;
  clearReplied(commentId: string): Promise<void>;
  privateReply(igCommentId: string, text: string): Promise<void>;
  privateReplyWithQuickReplies(
    igCommentId: string,
    text: string,
    options: MetaQuickReplyOption[]
  ): Promise<void>;
  publicReply(igCommentId: string, text: string): Promise<void>;
  countPublicRepliesSince(sinceIso: string): Promise<number>;
  now(): number;
  /** RADAR_COMMENT_DM_AUTO === "on". */
  autoEnabled(): boolean;
  /** RADAR_DM_QUICK_REPLY === "on". */
  quickReplyEnabled(): boolean;
}

/** Meta only allows a private reply within 7 days of the comment. */
export const RADAR_DM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function isRadarAutoDmEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RADAR_COMMENT_DM_AUTO === "on";
}

export function isRadarQuickReplyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.RADAR_DM_QUICK_REPLY === "on";
}

/** Short, log-safe code for a Graph failure. Never includes the message text. */
export function radarSendErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (
    lower.includes("2534019") ||
    lower.includes("don't allow new message requests") ||
    lower.includes("cannot receive") ||
    lower.includes("can't receive")
  ) {
    return "privacy_blocked";
  }
  const code = message.match(/"code"\s*:\s*(\d+)/)?.[1];
  const sub = message.match(/"error_subcode"\s*:\s*(\d+)/)?.[1];
  if (code) return sub ? `meta_${code}_${sub}` : `meta_${code}`;
  const status = message.match(/\((\d{3})\)/)?.[1];
  if (status) return `http_${status}`;
  return "send_failed";
}

/**
 * Checks that do not need the database: who wrote it and how old it is.
 * Returns the skip reason, or null when the comment may be sent to.
 */
export function radarCommentBlockReason(comment: RadarDmComment, now: number): RadarDmReason | null {
  if (isSelfAuthored({ igUserId: comment.ig_user_id, username: comment.username })) return "self";
  if (isExcludedFromAutoReply(comment.username)) return "excluded";
  const at = Date.parse(comment.commented_at);
  if (!Number.isFinite(at) || now - at > RADAR_DM_WINDOW_MS) return "too_old";
  return null;
}

/**
 * Whether a resolved target may be DMed in this mode.
 * - keyword: a mapped reel with DMs off is skipped; an unmapped post gets the hub.
 * - request_phrase: only on a mapped reel with DMs on (resolve already checks).
 * - needsReview: never automatic; the admin may send it.
 */
export function radarTargetBlockReason(
  target: CommentTarget | null,
  mode: RadarCommentDmMode
): RadarDmReason | null {
  if (!target || target.campaign !== "radar") return "not_radar";
  if (target.reel && !target.reel.dmEnabled) return "dm_disabled";
  if (target.matchedBy === "request_phrase" && !target.reel) return "not_radar";
  if (target.matchedBy === null) return mode === "admin" ? null : "needs_review";
  return null;
}

function claimArgs(
  comment: RadarDmComment,
  target: CommentTarget,
  mode: RadarCommentDmMode,
  sentBy: string | null
): ClaimRadarCommentDmArgs {
  const matchedBy: RadarMatchedBy = target.matchedBy ?? "admin";
  return {
    p_comment_id: comment.id,
    p_mode: mode,
    p_matched_by: matchedBy,
    p_reel_id: target.reel?.id ?? null,
    p_field_slug: target.fieldSlug,
    p_sent_by: sentBy,
  };
}

/** The career DM when the reel has its own link; the hub DM otherwise. */
async function buildCopy(target: CommentTarget, deps: RadarDmDeps) {
  const reel = target.reel;
  const ownCode = reel && target.fieldSlug ? await deps.getLinkCode(reel.id) : null;
  if (ownCode) {
    return {
      ...buildRadarDm({ fieldSlug: target.fieldSlug, careerLabelTh: reel!.careerLabelTh, linkCode: ownCode }),
      careerLabelTh: reel!.careerLabelTh,
    };
  }
  // No per-reel link (hub reel, unmapped post, or a mapping whose link is
  // missing): the hub copy and the shared hub link, so copy and link agree.
  return {
    ...buildRadarDm({ fieldSlug: null, careerLabelTh: null, linkCode: RADAR_HUB_DM_LINK_CODE }),
    careerLabelTh: null,
  };
}

async function safely(label: string, task: () => Promise<void>): Promise<boolean> {
  try {
    await task();
    return true;
  } catch (error) {
    console.error(`Radar DM: ${label} failed`, {
      errorCode: `radar_${label}_failed`,
      message: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return false;
  }
}

/**
 * Claim, DM, then the public reply. Assumes the caller already checked the
 * target and the comment; returns the outcome and never throws.
 */
async function claimAndSend(
  comment: RadarDmComment,
  target: CommentTarget,
  mode: RadarCommentDmMode,
  sentBy: string | null,
  deps: RadarDmDeps
): Promise<RadarDmOutcome> {
  const dmId = await deps.claim(claimArgs(comment, target, mode, sentBy));
  if (!dmId) return { status: "skipped", reason: "claim_lost" };

  let copy: Awaited<ReturnType<typeof buildCopy>>;
  try {
    copy = await buildCopy(target, deps);
  } catch (error) {
    await safely("finish", () =>
      deps.finish(dmId, { status: "failed", error_code: "copy_error" })
    );
    await safely("reopen", () => deps.clearReplied(comment.id));
    console.error("Radar DM: copy could not be built", {
      errorCode: "radar_copy_error",
      message: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return { status: "failed", reason: "copy_error", dmId, errorCode: "copy_error" };
  }

  const quickReply = deps.quickReplyEnabled();
  let outcome: RadarDmOutcome;
  try {
    if (quickReply) {
      await deps.privateReplyWithQuickReplies(
        comment.ig_comment_id,
        buildRadarQuickReplyPrompt(copy.careerLabelTh),
        [{ title: RADAR_QUICK_REPLY_TITLE, payload: radarQuickReplyPayload(dmId) }]
      );
    } else {
      await deps.privateReply(comment.ig_comment_id, copy.message);
    }
    // In the quick-reply flow `message` is what the tap will send. Retried
    // once: a row left at `claimed` could be reclaimed after 10 minutes (for
    // example by a comment edit webhook) and DM the same person twice.
    const sentPatch: RadarCommentDmPatch = {
      status: "sent",
      message: copy.message,
      link: copy.link,
      sent_at: new Date(deps.now()).toISOString(),
      error_code: null,
    };
    if (!(await safely("finish", () => deps.finish(dmId, sentPatch)))) {
      await safely("finish_retry", () => deps.finish(dmId, sentPatch));
    }
    outcome = { status: "sent", reason: quickReply ? "sent_quick_reply" : "sent", dmId };
  } catch (error) {
    const errorCode = radarSendErrorCode(error);
    await safely("finish", () =>
      deps.finish(dmId, { status: "failed", error_code: errorCode, link: copy.link })
    );
    // The claim set replied_at; clear it so the comment shows up for a retry.
    await safely("reopen", () => deps.clearReplied(comment.id));
    outcome = { status: "failed", reason: "send_failed", dmId, errorCode };
  }

  outcome.publicReply = await postPublicReply(comment, dmId, deps);
  return outcome;
}

/**
 * One public reply per claimed comment, after the DM attempt whatever Graph
 * said: Instagram often accepts a private reply the student never sees.
 * Skipped when this comment already has one (a retried failed DM) or over
 * the hourly cap.
 */
async function postPublicReply(
  comment: RadarDmComment,
  dmId: string,
  deps: RadarDmDeps
): Promise<RadarDmOutcome["publicReply"]> {
  try {
    const row = await deps.getDmRow(dmId);
    if (row?.public_reply) return "already";
    const since = new Date(deps.now() - HOUR_MS).toISOString();
    if ((await deps.countPublicRepliesSince(since)) >= RADAR_PUBLIC_REPLY_HOURLY_CAP) return "capped";
    const reply = buildRadarPublicReply(comment.username, comment.ig_comment_id);
    await deps.publicReply(comment.ig_comment_id, reply);
    await safely("finish", () => deps.finish(dmId, { public_reply: reply }));
    return "posted";
  } catch (error) {
    console.error("Radar DM: public reply failed", {
      errorCode: "radar_public_reply_failed",
      code: radarSendErrorCode(error),
    });
    return "failed";
  }
}

/**
 * Webhook entry point. Sends only when every check passes:
 * RADAR_COMMENT_DM_AUTO=on, matched by keyword or request phrase, the reel
 * allows DMs, the handle is not excluded, and the comment is under 7 days old.
 */
export async function maybeAutoSendRadarDm(
  comment: RadarDmComment,
  deps: RadarDmDeps = defaultRadarDmDeps()
): Promise<RadarDmOutcome> {
  try {
    if (!deps.autoEnabled()) {
      const radarish = isRadarRequest(comment.text) || isRadarLinkRequest(comment.text);
      return { status: "skipped", reason: radarish ? "flag_off" : "not_radar" };
    }
    const target = await resolveCommentTarget(
      { text: comment.text, mediaId: comment.media_id },
      deps.getReel
    );
    const targetBlock = radarTargetBlockReason(target, "auto");
    if (targetBlock) return { status: "skipped", reason: targetBlock };
    const commentBlock = radarCommentBlockReason(comment, deps.now());
    if (commentBlock) return { status: "skipped", reason: commentBlock };
    return await claimAndSend(comment, target!, "auto", null, deps);
  } catch (error) {
    console.error("Radar auto DM failed", {
      errorCode: "radar_auto_dm_failed",
      message: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return { status: "failed", reason: "error" };
  }
}

/**
 * Admin one-click send from the Radar queue (also the retry for failed rows).
 * Uses the same fixed copy and claim; ignores the auto flag. Never throws.
 */
export async function sendRadarDmFromAdmin(
  comment: RadarDmComment,
  sentBy: string | null,
  deps: RadarDmDeps = defaultRadarDmDeps()
): Promise<RadarDmOutcome> {
  try {
    const target = await resolveCommentTarget(
      { text: comment.text, mediaId: comment.media_id },
      deps.getReel
    );
    const targetBlock = radarTargetBlockReason(target, "admin");
    if (targetBlock) return { status: "skipped", reason: targetBlock };
    const commentBlock = radarCommentBlockReason(comment, deps.now());
    if (commentBlock) return { status: "skipped", reason: commentBlock };
    return await claimAndSend(comment, target!, "admin", sentBy, deps);
  } catch (error) {
    console.error("Radar admin DM failed", {
      errorCode: "radar_admin_dm_failed",
      message: error instanceof Error ? error.message.slice(0, 160) : "unknown",
    });
    return { status: "failed", reason: "error" };
  }
}

/** The production wiring: Supabase service role and Graph. Imported lazily. */
export function defaultRadarDmDeps(): RadarDmDeps {
  const reels = () => import("@/lib/supabase/radar-reels");
  const graph = () => import("@/lib/meta/graph");
  return {
    getReel: async (mediaId) => (await reels()).getReelByMediaId(mediaId),
    getLinkCode: async (reelId) => (await reels()).getReelLinkCode(reelId),
    claim: async (args) => (await reels()).claimRadarCommentDm(args),
    finish: async (id, patch) => (await reels()).finishRadarCommentDm(id, patch),
    getDmRow: async (id) => (await reels()).getRadarCommentDm(id),
    clearReplied: async (commentId) => (await reels()).clearCommentReplied(commentId),
    privateReply: async (igCommentId, text) => (await graph()).privateReplyToComment(igCommentId, text),
    privateReplyWithQuickReplies: async (igCommentId, text, options) =>
      (await graph()).privateReplyToCommentWithQuickReplies(igCommentId, text, options),
    publicReply: async (igCommentId, text) => (await graph()).replyToComment(igCommentId, text),
    countPublicRepliesSince: async (sinceIso) => (await reels()).countRadarPublicRepliesSince(sinceIso),
    now: () => Date.now(),
    autoEnabled: () => isRadarAutoDmEnabled(),
    quickReplyEnabled: () => isRadarQuickReplyEnabled(),
  };
}
