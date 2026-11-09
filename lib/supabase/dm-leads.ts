import { createAdminClient } from "@/utils/supabase/admin";
import type { MetaAttachmentType } from "@/lib/meta/graph";
import {
  getMessagingWindowMode,
  type MessagingWindowMode,
} from "@/lib/dm-leads/messaging-window";
import {
  CLOSED_LEAD_STATUSES,
  classifyBucket,
  getFieldCoverage,
  isClosedLeadStatus,
  type DmLeadBucket,
  type DmLeadSignals,
  type FunnelScoreboard,
} from "@/lib/dm-leads/playbook";
import { messageSignalFlags, signalsFor } from "@/lib/dm-leads/signals";
import { gateDraft } from "@/lib/dm-leads/send-gate";
import { scoreLead } from "@/lib/dm-leads/scoring";
import type { DmScriptRung } from "@/lib/dm-leads/scripts";
import { DM_LEAD_LIST_COLUMNS } from "@/types/dm-leads";
import type {
  DmConversation,
  DmConversationListColumn,
  DmConversationWithBucket,
  DmConversationWithMessages,
  DmLeadClassification,
  DmLeadStage,
  DmLeadStatus,
  DmMessageDirection,
  DmMessageSendStatus,
  DmMessageSenderType,
  DmMessageType,
  DmPlatform,
} from "@/types/dm-leads";

export interface InboundMessageWriteResult {
  conversation: DmConversation;
  messageId: string;
  outcome: "created" | "duplicate";
}

export interface InboundAttachmentInput {
  type: string;
  url: string | null;
  title: string | null;
  payload: Record<string, unknown>;
}

/**
 * Upserts the conversation for an inbound DM and appends the message.
 * Called from the Meta webhook, which has no authenticated user, so this
 * always runs through the service-role client.
 */
export async function recordInboundMessage(params: {
  platform: DmPlatform;
  platformThreadId: string;
  platformUserId: string;
  username?: string | null;
  displayName?: string | null;
  body: string;
  platformMessageId?: string | null;
  messageType?: DmMessageType;
  metadata?: Record<string, unknown>;
  attachments?: InboundAttachmentInput[];
  sentAt: string;
}): Promise<InboundMessageWriteResult> {
  const supabase = createAdminClient();

  const ensureAttachments = async (messageId: string): Promise<void> => {
    const attachments = params.attachments ?? [];
    if (attachments.length === 0) return;

    const { error } = await supabase.from("dm_message_attachments").upsert(
      attachments.map((attachment, position) => ({
        message_id: messageId,
        attachment_type: attachment.type,
        position,
        source_url: attachment.url,
        title: attachment.title,
        payload: attachment.payload,
      })),
      { onConflict: "message_id,position" }
    );
    if (error) {
      console.error("Error persisting dm_message attachments:", error);
      throw new Error("Failed to record message attachments");
    }
  };

  const loadExisting = async (): Promise<InboundMessageWriteResult | null> => {
    if (!params.platformMessageId) return null;
    const { data: existing, error: existingError } = await supabase
      .from("dm_messages")
      .select("id, conversation_id")
      .eq("platform_message_id", params.platformMessageId)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing inbound dm_message:", existingError);
      throw new Error("Failed to deduplicate inbound message");
    }
    if (!existing) return null;

    const { data: existingConversation, error: existingConversationError } = await supabase
      .from("dm_conversations")
      .select("*")
      .eq("id", existing.conversation_id)
      .single();
    if (existingConversationError || !existingConversation) {
      console.error("Error loading deduplicated dm_conversation:", existingConversationError);
      throw new Error("Failed to load deduplicated conversation");
    }
    await ensureAttachments(existing.id);
    return {
      conversation: existingConversation,
      messageId: existing.id,
      outcome: "duplicate",
    };
  };

  const existing = await loadExisting();
  if (existing) return existing;

  const { data: conversation, error: conversationError } = await supabase
    .from("dm_conversations")
    .upsert(
      {
        platform: params.platform,
        platform_thread_id: params.platformThreadId,
        platform_user_id: params.platformUserId,
        ...(params.username !== undefined ? { username: params.username } : {}),
        ...(params.displayName !== undefined ? { display_name: params.displayName } : {}),
        last_message_at: params.sentAt,
        last_message_direction: "inbound",
      },
      { onConflict: "platform,platform_thread_id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (conversationError) {
    console.error("Error upserting dm_conversation:", conversationError);
    throw new Error("Failed to record conversation");
  }

  const { data: message, error: messageError } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id: conversation.id,
      direction: "inbound" as DmMessageDirection,
      sender_type: "lead" as DmMessageSenderType,
      body: params.body,
      ...messageSignalFlags(params.body),
      platform_message_id: params.platformMessageId ?? null,
      message_type: params.messageType ?? "text",
      metadata: params.metadata ?? {},
      sent_at: params.sentAt,
    })
    .select("id")
    .single();

  if (messageError) {
    if (messageError.code === "23505") {
      const racedExisting = await loadExisting();
      if (racedExisting) return racedExisting;
    }
    console.error("Error inserting inbound dm_message:", messageError);
    throw new Error("Failed to record message");
  }

  await ensureAttachments(message.id);

  const { error: reactionLinkError } = await supabase
    .from("dm_message_reactions")
    .update({ message_id: message.id, updated_at: new Date().toISOString() })
    .eq("target_platform_message_id", params.platformMessageId ?? "")
    .is("message_id", null);
  if (reactionLinkError) {
    console.error("Error linking earlier dm_message reactions:", reactionLinkError);
    throw new Error("Failed to link message reactions");
  }

  return { conversation, messageId: message.id, outcome: "created" };
}

/**
 * Upserts a conversation + message pulled from Graph API history, not the
 * webhook. Dedupes on platform_message_id so re-running backfill is safe.
 */
export async function recordBackfilledMessage(params: {
  platform: DmPlatform;
  platformThreadId: string;
  platformUserId: string;
  username?: string | null;
  displayName?: string | null;
  direction: DmMessageDirection;
  body: string;
  platformMessageId: string;
  sentAt: string;
  messageType?: DmMessageType;
  attachments?: InboundAttachmentInput[];
}): Promise<{ conversationId: string; outcome: "created" | "duplicate" }> {
  const supabase = createAdminClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("dm_conversations")
    .upsert(
      {
        platform: params.platform,
        platform_thread_id: params.platformThreadId,
        platform_user_id: params.platformUserId,
        username: params.username ?? null,
        ...(params.displayName !== undefined ? { display_name: params.displayName } : {}),
        last_message_at: params.sentAt,
        last_message_direction: params.direction,
      },
      { onConflict: "platform,platform_thread_id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (conversationError) {
    console.error("Error upserting dm_conversation (backfill):", conversationError);
    throw new Error("Failed to record conversation");
  }

  const { data: msgData, error: messageError } = await supabase
    .from("dm_messages")
    .upsert(
      {
        conversation_id: conversation.id,
        direction: params.direction,
        sender_type: params.direction === "inbound" ? "lead" : "admin",
        body: params.body,
        ...messageSignalFlags(params.body),
        platform_message_id: params.platformMessageId,
        message_type:
          params.messageType ??
          (params.attachments && params.attachments.length > 0 ? "attachment" : "text"),
        sent_at: params.sentAt,
      },
      { onConflict: "platform_message_id", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();

  if (messageError) {
    console.error("Error upserting dm_message (backfill):", messageError);
    throw new Error("Failed to record message");
  }

  let messageId = msgData?.id;
  if (!messageId && params.attachments && params.attachments.length > 0) {
    const { data: existingMessage, error: existingMessageError } = await supabase
      .from("dm_messages")
      .select("id")
      .eq("platform_message_id", params.platformMessageId)
      .single();
    if (existingMessageError) {
      console.error("Error loading duplicate dm_message attachments (backfill):", existingMessageError);
      throw new Error("Failed to update backfilled message attachments");
    }
    messageId = existingMessage.id;
  }

  if (messageId && params.attachments && params.attachments.length > 0) {
    const { error: attError } = await supabase.from("dm_message_attachments").upsert(
      params.attachments.map((attachment, position) => ({
        message_id: messageId,
        attachment_type: attachment.type,
        position,
        source_url: attachment.url,
        title: attachment.title,
        payload: attachment.payload,
      })),
      { onConflict: "message_id,position" }
    );
    if (attError) {
      console.error("Error upserting dm_message_attachments (backfill):", attError);
    }
  }

  return {
    conversationId: conversation.id,
    outcome: msgData ? "created" : "duplicate",
  };
}

export async function updateConversationUsername(
  conversationId: string,
  username: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("dm_conversations")
    .update({ username })
    .eq("id", conversationId);

  if (error) {
    console.error("Error updating dm_conversation username:", error);
    throw new Error("Failed to update username");
  }
}

export async function updateConversationProfile(
  conversationId: string,
  profile: { displayName?: string | null; username?: string | null }
): Promise<void> {
  const patch: { display_name?: string; username?: string } = {};
  if (profile.displayName?.trim()) patch.display_name = profile.displayName.trim();
  if (profile.username?.trim()) patch.username = profile.username.trim();
  if (Object.keys(patch).length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dm_conversations")
    .update(patch)
    .eq("id", conversationId);

  if (error) {
    console.error("Error updating dm_conversation profile:", error);
    throw new Error("Failed to update profile");
  }
}

export type DmLeadIntentFilter =
  | "pay_ready"
  | "pathlab"
  | "community"
  | "talent"
  | "hands_on";

export interface DmLeadFilters {
  stage?: DmLeadStage;
  /** Grade label ("ม.4", "ปี 1", …) or "none" for unclassified. */
  grade?: string;
  platform?: DmPlatform;
  intent?: DmLeadIntentFilter;
  /**
   * The lead wrote last and the conversation is still open. Converted, lost
   * and spam conversations are never waiting on us (the same rule as
   * needsReply, the done bucket and the overview's dm_awaiting_reply queue).
   */
  myTurnOnly?: boolean;
  /** Case-insensitive match on username / display name. */
  search?: string;
  /** "newest" (default), "waiting", "propensity" (ML score), or "engagement" (RFM-E). */
  sort?: "newest" | "waiting" | "propensity" | "engagement";
  /** Only conversations where we already sent a /pathlab link (outbound). */
  pathlabLinkSent?: boolean;
  starredOnly?: boolean;
  /** Only conversations whose follow-up time has arrived (or passed). */
  followUpDue?: boolean;
  leadStatus?: DmLeadStatus;
  /** Hide finished conversations: lead_status converted, lost or spam. */
  openOnly?: boolean;
  /** Exact match on an admin tag. */
  tag?: string;
  /**
   * Playbook work-order bucket. Derived from message history, not a column, so
   * it is applied in memory after the DB-side filters have narrowed the set.
   */
  bucket?: DmLeadBucket;
}

const INTENT_COLUMN: Record<DmLeadIntentFilter, string> = {
  pay_ready: "pathlab_pay_ready",
  pathlab: "wants_pathlab",
  community: "wants_community",
  talent: "wants_talent",
  hands_on: "has_hands_on_experience",
};

function escapeIlike(term: string): string {
  return term.replace(/[%_,()"]/g, " ").trim();
}

/** Matches the value written by scripts/tag-internal-lead.ts. */
const INTERNAL_TAG = "internal";

/** PostgREST list for `.not("lead_status", "in", ...)`: "(converted,lost,spam)". */
const CLOSED_LEAD_STATUS_LIST = `(${CLOSED_LEAD_STATUSES.join(",")})`;

/** Shared filter application so list + facet counts stay in sync. */
function applyDmLeadFilters<T>(
  query: T,
  filters: DmLeadFilters,
  { skipStage = false }: { skipStage?: boolean } = {}
): T {
  let q = query as {
    eq: (col: string, val: unknown) => typeof q;
    is: (col: string, val: unknown) => typeof q;
    or: (expr: string) => typeof q;
    lte: (col: string, val: unknown) => typeof q;
    contains: (col: string, val: unknown) => typeof q;
    not: (col: string, op: string, val: unknown) => typeof q;
  };

  // Internal accounts (founder, team) are never leads — exclude unconditionally.
  // admin_tags is NOT NULL DEFAULT '{}', so `not cs` never trips on nulls.
  q = q.not("admin_tags", "cs", `{${INTERNAL_TAG}}`);

  if (filters.stage && !skipStage) q = q.eq("stage", filters.stage);
  if (filters.grade) {
    q = filters.grade === "none" ? q.is("grade_level", null) : q.eq("grade_level", filters.grade);
  }
  if (filters.platform) q = q.eq("platform", filters.platform);
  if (filters.intent) q = q.eq(INTENT_COLUMN[filters.intent], true);
  if (filters.myTurnOnly) q = q.eq("last_message_direction", "inbound");
  if (filters.starredOnly) q = q.eq("starred", true);
  if (filters.followUpDue) q = q.lte("follow_up_at", new Date().toISOString());
  if (filters.leadStatus) q = q.eq("lead_status", filters.leadStatus);
  if (filters.openOnly || filters.myTurnOnly) {
    q = q.not("lead_status", "in", CLOSED_LEAD_STATUS_LIST);
  }
  if (filters.tag) q = q.contains("admin_tags", [filters.tag]);
  if (filters.search) {
    const term = escapeIlike(filters.search);
    if (term) q = q.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
  }

  return q as unknown as T;
}

/**
 * Admin-managed inbox fields. Partial patch — only provided keys change.
 */
export async function updateLeadMeta(
  conversationId: string,
  patch: Partial<{
    starred: boolean;
    follow_up_at: string | null;
    lead_status: DmLeadStatus;
    admin_tags: string[];
    grade_level: string | null;
    interests: string[];
    stage: DmLeadStage;
  }>
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("dm_conversations")
    .update(patch)
    .eq("id", conversationId);

  if (error) {
    console.error("Error updating dm_conversation meta:", error);
    throw new Error("Failed to update conversation");
  }
}

export type DmLeadSignalMap = Map<string, DmLeadSignals>;

/** One row of `dm_conversation_signals` — the SQL-side rollup of the matchers. */
interface ConversationSignalRow {
  conversation_id: string;
  has_inbound: boolean | null;
  last_inbound_message_at: string | null;
  pathlab_link_sent: boolean | null;
  price_mentioned: boolean | null;
  offer_made: boolean | null;
}

let cachedSignals: { data: DmLeadSignalMap; timestamp: number } | null = null;
let cachedScoreboard: { data: FunnelScoreboard; timestamp: number } | null = null;
const CACHE_TTL_MS = 20_000; // 20 seconds

export function invalidateDmLeadCache(): void {
  cachedSignals = null;
  cachedScoreboard = null;
}

/**
 * Every playbook signal for every conversation, as one row per conversation
 * straight from `dm_conversation_signals`.
 *
 * The aggregate happens in Postgres because the alternative — the paginated
 * scan of `dm_messages` this replaced — moved ~800KB of message bodies over the
 * wire on every cold request to produce five booleans per thread. The view is
 * the same reduction as `reduceMessagesToSignals`, which still owns the matchers
 * and still runs on the write path; the two must be edited together.
 */
export async function getDmLeadSignals(forceFresh = false): Promise<DmLeadSignalMap> {
  const now = Date.now();
  if (!forceFresh && cachedSignals && now - cachedSignals.timestamp < CACHE_TTL_MS) {
    return cachedSignals.data;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dm_conversation_signals")
    .select(
      "conversation_id, has_inbound, last_inbound_message_at, pathlab_link_sent, price_mentioned, offer_made"
    );

  if (error) {
    console.error("Error fetching dm_conversation_signals:", error);
    throw new Error("Failed to compute lead signals");
  }

  const signals: DmLeadSignalMap = new Map();
  for (const row of (data ?? []) as ConversationSignalRow[]) {
    signals.set(row.conversation_id, {
      hasInbound: row.has_inbound ?? false,
      lastInboundMessageAt: row.last_inbound_message_at,
      pathlabLinkSent: row.pathlab_link_sent ?? false,
      priceMentioned: row.price_mentioned ?? false,
      offerMade: row.offer_made ?? false,
    });
  }

  cachedSignals = { data: signals, timestamp: Date.now() };
  return signals;
}


/**
 * Conversation IDs where any outbound message contains a /pathlab link.
 * Derived from the signal map so the list, the facets and the buckets can never
 * disagree about who got a link.
 */
function pathlabLinkConversationIds(signals: DmLeadSignalMap): Set<string> {
  const ids = new Set<string>();
  for (const [conversationId, signal] of signals) {
    if (signal.pathlabLinkSent) ids.add(conversationId);
  }
  return ids;
}

/** Attaches the derived bucket + offer routing to a raw conversation row. */
function withBucket(
  conversation: Pick<DmConversation, DmConversationListColumn>,
  signals: DmLeadSignalMap
): DmConversationWithBucket {
  const conversationSignals = signalsFor(signals, conversation.id);
  const scoreResult = scoreLead(conversation, {
    signals: conversationSignals,
  });
  return {
    ...conversation,
    last_inbound_message_at: conversationSignals.lastInboundMessageAt,
    bucket: classifyBucket(conversation, conversationSignals),
    coverage: getFieldCoverage(conversation.interests),
    engagement_index: scoreResult.engagementIndex,
    propensity_score: scoreResult.propensityScore,
    cohort: scoreResult.cohort,
    tier: scoreResult.tier,
  };
}

export async function getConversationsForAdmin(
  filters: DmLeadFilters = {},
  preloadedSignals?: DmLeadSignalMap
): Promise<DmConversationWithBucket[]> {
  const supabase = createAdminClient();
  const signals = preloadedSignals ?? (await getDmLeadSignals());

  let query = supabase
    .from("dm_conversations")
    .select(DM_LEAD_LIST_COLUMNS.join(", "));
  query = applyDmLeadFilters(query, filters);
  if (filters.pathlabLinkSent) {
    const ids = pathlabLinkConversationIds(signals);
    if (ids.size === 0) return [];
    query = query.in("id", [...ids]);
  }
  query = query.order("last_message_at", {
    ascending: filters.sort === "waiting",
  });

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching dm_conversations:", error);
    throw new Error("Failed to fetch conversations");
  }

  // PostgREST can only infer a row type from a literal select string, and ours
  // is built from DM_LEAD_LIST_COLUMNS so the columns and the type stay one
  // source. That shared constant is what makes this cast safe.
  const rows = (data ?? []) as unknown as Pick<DmConversation, DmConversationListColumn>[];
  let classified = rows.map((row) => withBucket(row, signals));
  // Bucket is derived, so it cannot be pushed into SQL — filter last, after the
  // DB has already narrowed the set as far as it can.
  if (filters.bucket) {
    classified = classified.filter((c) => c.bucket === filters.bucket);
  }

  if (filters.sort === "propensity") {
    classified.sort((a, b) => (b.propensity_score ?? 0) - (a.propensity_score ?? 0));
  } else if (filters.sort === "engagement") {
    classified.sort((a, b) => (b.engagement_index ?? 0) - (a.engagement_index ?? 0));
  }

  return classified;
}

export interface DmLeadFacets {
  /** Stage counts respect every active filter except the stage filter itself. */
  stageCounts: Record<DmLeadStage, number>;
  /** Bucket counts respect every active filter except the bucket filter itself. */
  bucketCounts: Record<DmLeadBucket, number>;
  /** Funnel health for the WHOLE inbox — never scoped to the current view. */
  scoreboard: FunnelScoreboard;
  total: number;
  /** Lead wrote last and the conversation is still open (not converted, lost or spam). */
  needsReply: number;
  payReady: number;
  /** Conversations we already sent a /pathlab link to. */
  pathlabSent: number;
  starred: number;
  /** Follow-up time arrived (or passed). */
  followUpDue: number;
  leadStatusCounts: Record<DmLeadStatus, number>;
  /** Distinct admin tags in the filtered set, with counts — filter options. */
  tagCounts: Record<string, number>;
}

function emptyBucketCounts(): Record<DmLeadBucket, number> {
  return {
    hot: 0,
    waiting_qualified: 0,
    waiting_unqualified: 0,
    link_no_price: 0,
    never_pitched: 0,
    no_reply: 0,
    done: 0,
  };
}

const EMPTY_SCOREBOARD: FunnelScoreboard = {
  engaged: 0,
  offerMade: 0,
  priceStated: 0,
  endsOnOurMessage: 0,
};

const EMPTY_FACETS: DmLeadFacets = {
  stageCounts: { unknown: 0, exploring: 0, building: 0, job_seeking: 0 },
  bucketCounts: emptyBucketCounts(),
  scoreboard: EMPTY_SCOREBOARD,
  total: 0,
  needsReply: 0,
  payReady: 0,
  pathlabSent: 0,
  starred: 0,
  followUpDue: 0,
  leadStatusCounts: { new: 0, contacted: 0, qualified: 0, converted: 0, lost: 0, spam: 0 },
  tagCounts: {},
};

const CONVERSATION_PAGE_SIZE = 1000;

/**
 * Funnel health for the operation, computed over the WHOLE inbox — never scoped
 * to the current filters. "How are we selling?" must not change when the
 * operator clicks a pill; a filtered scoreboard would be a vanity number.
 *
 * Denominator is engaged threads (the lead replied at least once) because a
 * thread nobody answered says nothing about how we sell.
 */
async function computeScoreboard(
  supabase: ReturnType<typeof createAdminClient>,
  signals: DmLeadSignalMap,
  forceFresh = false
): Promise<FunnelScoreboard> {
  const now = Date.now();
  if (!forceFresh && cachedScoreboard && now - cachedScoreboard.timestamp < CACHE_TTL_MS) {
    return cachedScoreboard.data;
  }

  const scoreboard: FunnelScoreboard = { ...EMPTY_SCOREBOARD };

  for (let offset = 0; ; offset += CONVERSATION_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("dm_conversations")
      .select("id, last_message_direction")
      .not("admin_tags", "cs", `{${INTERNAL_TAG}}`)
      .order("id", { ascending: true })
      .range(offset, offset + CONVERSATION_PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching dm_conversations for scoreboard:", error);
      throw new Error("Failed to compute funnel scoreboard");
    }

    const page = data ?? [];
    for (const row of page) {
      const signal = signalsFor(signals, row.id);
      if (!signal.hasInbound) continue;
      scoreboard.engaged += 1;
      if (signal.offerMade) scoreboard.offerMade += 1;
      if (signal.priceMentioned) scoreboard.priceStated += 1;
      if (row.last_message_direction === "outbound") scoreboard.endsOnOurMessage += 1;
    }

    if (page.length < CONVERSATION_PAGE_SIZE) break;
  }

  cachedScoreboard = { data: scoreboard, timestamp: Date.now() };
  return scoreboard;
}


export async function getDmLeadFacets(
  filters: DmLeadFilters = {},
  preloadedSignals?: DmLeadSignalMap
): Promise<DmLeadFacets> {
  const supabase = createAdminClient();

  const signals = preloadedSignals ?? (await getDmLeadSignals());
  const pathlabIds = pathlabLinkConversationIds(signals);

  let query = supabase
    .from("dm_conversations")
    .select(
      "id, stage, grade_level, interests, last_message_direction, pathlab_pay_ready, starred, follow_up_at, lead_status, admin_tags"
    );
  query = applyDmLeadFilters(query, filters, { skipStage: true });
  const emptyByPathlabFilter = filters.pathlabLinkSent && pathlabIds.size === 0;
  if (filters.pathlabLinkSent && !emptyByPathlabFilter) {
    query = query.in("id", [...pathlabIds]);
  }

  // The scoreboard spans the whole inbox and the facets respect the active
  // filters, so they cannot share one read — but neither depends on the other.
  const [scoreboard, facetRows] = await Promise.all([
    computeScoreboard(supabase, signals),
    emptyByPathlabFilter ? Promise.resolve(null) : query,
  ]);

  if (emptyByPathlabFilter) return { ...EMPTY_FACETS, scoreboard };

  const { data, error } = facetRows!;

  if (error) {
    console.error("Error fetching dm_conversation facets:", error);
    throw new Error("Failed to fetch conversation facets");
  }

  const rows = data ?? [];
  const now = Date.now();
  const stageCounts: Record<DmLeadStage, number> = {
    unknown: 0,
    exploring: 0,
    building: 0,
    job_seeking: 0,
  };
  const leadStatusCounts: Record<DmLeadStatus, number> = {
    new: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    spam: 0,
  };
  const bucketCounts = emptyBucketCounts();
  const tagCounts: Record<string, number> = {};
  let needsReply = 0;
  let payReady = 0;
  let pathlabSent = 0;
  let starred = 0;
  let followUpDue = 0;

  for (const row of rows) {
    // `filters.bucket` is never applied here — bucket counts must show what each
    // pill would give you, exactly like stageCounts skips the stage filter.
    bucketCounts[classifyBucket(row, signalsFor(signals, row.id))] += 1;
    if (row.stage in stageCounts) stageCounts[row.stage as DmLeadStage] += 1;
    if (row.lead_status in leadStatusCounts) {
      leadStatusCounts[row.lead_status as DmLeadStatus] += 1;
    }
    // Same rule as the `done` bucket and the overview's dm_awaiting_reply count:
    // a finished conversation is never waiting on us, whoever wrote last.
    if (row.last_message_direction === "inbound" && !isClosedLeadStatus(row.lead_status)) {
      needsReply += 1;
    }
    if (row.pathlab_pay_ready) payReady += 1;
    if (pathlabIds.has(row.id)) pathlabSent += 1;
    if (row.starred) starred += 1;
    if (row.follow_up_at && new Date(row.follow_up_at).getTime() <= now) followUpDue += 1;
    for (const tag of row.admin_tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  return {
    stageCounts,
    bucketCounts,
    scoreboard,
    total: rows.length,
    needsReply,
    payReady,
    pathlabSent,
    starred,
    followUpDue,
    leadStatusCounts,
    tagCounts,
  };
}

export async function getConversationWithMessages(
  conversationId: string
): Promise<DmConversationWithMessages | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("dm_conversations")
    .select("*, dm_messages(*, dm_message_attachments(*), dm_message_reactions(*))")
    .eq("id", conversationId)
    .order("sent_at", { referencedTable: "dm_messages", ascending: true })
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("Error fetching dm_conversation:", error);
    throw new Error("Failed to fetch conversation");
  }

  return data;
}

export async function reconcileOutboundEcho(params: {
  platformMessageId: string;
}): Promise<{ messageId: string | null; outcome: "processed" | "ignored" }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dm_messages")
    .select("id")
    .eq("platform_message_id", params.platformMessageId)
    .eq("direction", "outbound")
    .maybeSingle();

  if (error) {
    console.error("Error reconciling outbound Meta echo:", error);
    throw new Error("Failed to reconcile outbound echo");
  }
  return data
    ? { messageId: data.id, outcome: "processed" }
    : { messageId: null, outcome: "ignored" };
}

export async function applyMessageReaction(params: {
  targetPlatformMessageId: string;
  actorPlatformUserId: string;
  reaction: string | null;
  action: "react" | "unreact";
  reactedAt: string;
}): Promise<{ messageId: string | null; outcome: "processed" | "ignored" }> {
  const supabase = createAdminClient();
  const { data: message, error: messageError } = await supabase
    .from("dm_messages")
    .select("id")
    .eq("platform_message_id", params.targetPlatformMessageId)
    .maybeSingle();

  if (messageError) {
    console.error("Error resolving reacted-to dm_message:", messageError);
    throw new Error("Failed to resolve reaction target");
  }

  if (params.action === "unreact") {
    const { error } = await supabase
      .from("dm_message_reactions")
      .delete()
      .eq("target_platform_message_id", params.targetPlatformMessageId)
      .eq("actor_platform_user_id", params.actorPlatformUserId);
    if (error) {
      console.error("Error removing dm_message reaction:", error);
      throw new Error("Failed to remove message reaction");
    }
    return { messageId: message?.id ?? null, outcome: "processed" };
  }

  const { error } = await supabase.from("dm_message_reactions").upsert(
    {
      message_id: message?.id ?? null,
      target_platform_message_id: params.targetPlatformMessageId,
      actor_platform_user_id: params.actorPlatformUserId,
      reaction: params.reaction,
      reacted_at: params.reactedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "target_platform_message_id,actor_platform_user_id" }
  );
  if (error) {
    console.error("Error upserting dm_message reaction:", error);
    throw new Error("Failed to record message reaction");
  }
  return {
    messageId: message?.id ?? null,
    outcome: message ? "processed" : "ignored",
  };
}

const SEND_STATUS_RANK: Record<NonNullable<DmMessageSendStatus>, number> = {
  pending: 0,
  failed: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

async function updateOutboundStatus(params: {
  platform: DmPlatform;
  platformUserId: string | null;
  messageIds?: string[];
  watermark?: string | null;
  status: "delivered" | "read";
  occurredAt: string;
}): Promise<string[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("dm_messages")
    .select("id, send_status, sent_at, delivered_at, conversation_id, dm_conversations!inner(platform, platform_user_id)")
    .eq("direction", "outbound")
    .eq("dm_conversations.platform", params.platform);

  if (params.platformUserId) {
    query = query.eq("dm_conversations.platform_user_id", params.platformUserId);
  }
  if (params.messageIds?.length) {
    query = query.in("platform_message_id", params.messageIds);
  } else if (params.watermark) {
    const watermarkNumber = Number(params.watermark);
    if (Number.isFinite(watermarkNumber)) {
      query = query.lte("sent_at", new Date(watermarkNumber).toISOString());
    }
  } else {
    return [];
  }

  const { data, error } = await query;
  if (error) {
    console.error(`Error finding outbound messages for ${params.status}:`, error);
    throw new Error(`Failed to find ${params.status} messages`);
  }

  const targetRank = SEND_STATUS_RANK[params.status];
  const ids = (data ?? [])
    .filter((message) => {
      const current = message.send_status as DmMessageSendStatus | null;
      return current === null || SEND_STATUS_RANK[current] < targetRank;
    })
    .map((message) => message.id);
  if (ids.length === 0) return [];

  const patch = params.status === "read"
    ? { send_status: "read", read_at: params.occurredAt }
    : { send_status: "delivered", delivered_at: params.occurredAt };
  const { error: updateError } = await supabase.from("dm_messages").update(patch).in("id", ids);
  if (updateError) {
    console.error(`Error marking outbound messages ${params.status}:`, updateError);
    throw new Error(`Failed to mark messages ${params.status}`);
  }

  if (params.status === "read") {
    const missingDeliveryIds = (data ?? [])
      .filter((message) => ids.includes(message.id) && !message.delivered_at)
      .map((message) => message.id);
    if (missingDeliveryIds.length > 0) {
      const { error: deliveryError } = await supabase
        .from("dm_messages")
        .update({ delivered_at: params.occurredAt })
        .in("id", missingDeliveryIds);
      if (deliveryError) {
        console.error("Error backfilling delivery timestamp from read receipt:", deliveryError);
        throw new Error("Failed to save delivery timestamp");
      }
    }
  }
  return ids;
}

export function markOutboundDelivered(params: {
  platform: DmPlatform;
  platformUserId: string | null;
  messageIds: string[];
  watermark: string | null;
  occurredAt: string;
}) {
  return updateOutboundStatus({ ...params, status: "delivered" });
}

export function markOutboundRead(params: {
  platform: DmPlatform;
  platformUserId: string | null;
  watermark: string | null;
  occurredAt: string;
}) {
  return updateOutboundStatus({ ...params, status: "read" });
}

export async function applyClassification(
  conversationId: string,
  classification: DmLeadClassification
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("dm_conversations")
    .update({
      grade_level: classification.gradeLevel,
      interests: classification.interests,
      activities_summary: classification.activitiesSummary,
      stage: classification.stage,
      recommended_product: classification.recommendedProduct,
      has_hands_on_experience: classification.hasHandsOnExperience,
      wants_pathlab: classification.wantsPathlab,
      pathlab_pay_ready: classification.pathlabPayReady,
      wants_community: classification.wantsCommunity,
      wants_talent: classification.wantsTalent,
      classified_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) {
    console.error("Error applying dm lead classification:", error);
    throw new Error("Failed to save classification");
  }
}

/**
 * Records an admin-sent reply and pushes it to the lead via the Send API.
 * Insert-then-send: if the Send API call fails, the outbound message row is
 * still there so the admin UI shows it was attempted, not silently dropped.
 */
/**
 * Sends one outbound message (text or a media attachment — the Send API
 * accepts only one per call) and records it. Shared by sendAdminReply for
 * both parts of a combined text+attachment reply.
 */
async function sendAndRecordOutboundMessage(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string,
  conversation: {
    platform: DmPlatform;
    platform_user_id: string;
    last_message_at: string;
    last_message_direction: DmMessageDirection | null;
  },
  input: { text?: string; attachmentUrl?: string; attachmentType?: MetaAttachmentType },
  windowMode: MessagingWindowMode,
  /**
   * Stamped on the row so an A/B readout joins arm to outcome without a second
   * lookup, and so the attribution survives the campaign target being deleted.
   */
  campaign?: {
    campaignId: string;
    variant: string;
    auto?: {
      rung: DmScriptRung;
      bucket: DmLeadBucket;
      consecutiveOutbound: number;
    };
  }
): Promise<{ sentAt: string; messageId: string }> {
  const sentAt = new Date().toISOString();
  const isAttachment = Boolean(input.attachmentUrl);
  const attachmentType = input.attachmentType ?? "image";
  const outboundBody = isAttachment
    ? input.text?.trim() || `[${attachmentType}]`
    : (input.text ?? "");

  const { data: outboundMessage, error: insertError } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id: conversationId,
      direction: "outbound" as DmMessageDirection,
      sender_type: "admin" as DmMessageSenderType,
      body: outboundBody,
      ...messageSignalFlags(outboundBody),
      message_type: (isAttachment ? "attachment" : "text") as DmMessageType,
      send_status: "pending",
      sent_at: sentAt,
      campaign_id: campaign?.campaignId ?? null,
      campaign_variant: campaign?.variant ?? null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error inserting outbound dm_message:", insertError);
    throw new Error("Failed to record reply");
  }

  if (isAttachment && input.attachmentUrl) {
    const { error: attError } = await supabase.from("dm_message_attachments").insert({
      message_id: outboundMessage.id,
      attachment_type: attachmentType,
      position: 0,
      source_url: input.attachmentUrl,
      title: attachmentType.charAt(0).toUpperCase() + attachmentType.slice(1),
      payload: {},
    });
    if (attError) {
      console.error("Error persisting outbound dm_message attachment:", attError);
    }
  }

  await supabase
    .from("dm_conversations")
    .update({ last_message_at: sentAt, last_message_direction: "outbound" })
    .eq("id", conversationId);

  const { sendMetaMessage, sendMetaAttachmentMessage } = await import("@/lib/meta/graph");
  let platformMessageId: string;
  try {
    platformMessageId = isAttachment
      ? await sendMetaAttachmentMessage(
          conversation.platform,
          conversation.platform_user_id,
          input.attachmentUrl!,
          attachmentType,
          windowMode
        )
      : await sendMetaMessage(
          conversation.platform,
          conversation.platform_user_id,
          input.text ?? "",
          windowMode
        );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "unknown";
    // The exact Graph API wording for a window-closed rejection varies, so
    // don't pattern-match it — we already know from our own pre-check which
    // window the thread is in, which is a much clearer signal.
    const finalMessage =
      windowMode === "closed"
        ? `เกิน 7 วันจากข้อความล่าสุดของน้อง ส่งผ่านระบบไม่ได้แล้ว ตอบมือใน Instagram แทนได้ (${rawMessage.slice(0, 160)})`
        : rawMessage;

    const { error: failedStateError } = await supabase
      .from("dm_messages")
      .update({
        send_status: "failed",
        metadata: { send_error: finalMessage.slice(0, 300) },
      })
      .eq("id", outboundMessage.id);
    if (failedStateError) {
      console.error("Failed to persist failed outbound message state:", failedStateError);
    }
    const { error: restoreConversationError } = await supabase
      .from("dm_conversations")
      .update({
        last_message_at: conversation.last_message_at,
        last_message_direction: conversation.last_message_direction,
      })
      .eq("id", conversationId)
      .eq("last_message_at", sentAt)
      .eq("last_message_direction", "outbound");
    if (restoreConversationError) {
      console.error("Failed to restore conversation state after send failure:", restoreConversationError);
    }
    throw new Error(finalMessage);
  }

  const { error: sentError } = await supabase
    .from("dm_messages")
    .update({ platform_message_id: platformMessageId, send_status: "sent" })
    .eq("id", outboundMessage.id);
  if (sentError) {
    console.error("Meta reply sent but dm_message state update failed:", sentError);
    throw new Error("Reply sent, but delivery state was not saved");
  }

  return { sentAt, messageId: outboundMessage.id };
}

/**
 * Sends one campaign message and returns the recorded message id.
 *
 * Separate from `sendAdminReply` because a campaign send is text-only, must
 * carry its A/B attribution, and the caller needs the message id to close out
 * the campaign target row.
 */
export async function sendCampaignReply(
  conversationId: string,
  body: string,
  campaign: {
    campaignId: string;
    variant: string;
    auto?: {
      rung: DmScriptRung;
      bucket: DmLeadBucket;
      consecutiveOutbound: number;
    };
  }
): Promise<{ messageId: string }> {
  const text = body.trim();
  if (!text) throw new Error("Empty reply");

  const supabase = createAdminClient();

  const { data: conversation, error: fetchError } = await supabase
    .from("dm_conversations")
    .select("platform, platform_user_id, last_message_at, last_message_direction")
    .eq("id", conversationId)
    .single();

  if (fetchError || !conversation) {
    console.error("Error fetching conversation for campaign reply:", fetchError);
    throw new Error("Conversation not found");
  }

  const { data: lastInbound } = await supabase
    .from("dm_messages")
    .select("sent_at")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const windowMode = getMessagingWindowMode(lastInbound?.sent_at ?? null);
  if (windowMode === "closed") {
    throw new Error("เกิน 7 วันจากข้อความล่าสุดของน้อง ส่งผ่านระบบไม่ได้แล้ว");
  }

  // Auto eligibility is a snapshot at queue-build time. Re-run the gate here
  // with the live window and the edited draft so an old queue cannot silently
  // cross into HUMAN_AGENT or acquire a price/link before it leaves.
  if (campaign.auto) {
    const gate = gateDraft({
      body: text,
      rung: campaign.auto.rung,
      bucket: campaign.auto.bucket,
      windowMode,
      consecutiveOutbound: campaign.auto.consecutiveOutbound,
    });
    if (gate.decision !== "auto") {
      throw new Error(`Auto-send blocked: ${gate.reasons.join(", ")}`);
    }
  }

  const { messageId } = await sendAndRecordOutboundMessage(
    supabase,
    conversationId,
    conversation,
    { text },
    windowMode,
    campaign
  );

  invalidateDmLeadCache();
  return { messageId };
}

export async function sendAdminReply(
  conversationId: string,
  input:
    | string
    | { text?: string; attachmentUrl?: string; attachmentType?: MetaAttachmentType }
): Promise<void> {
  const { text, attachmentUrl, attachmentType } =
    typeof input === "string" ? { text: input, attachmentUrl: undefined, attachmentType: undefined } : input;

  if (!text?.trim() && !attachmentUrl) {
    throw new Error("Empty reply");
  }

  const supabase = createAdminClient();

  const { data: conversation, error: fetchError } = await supabase
    .from("dm_conversations")
    .select("platform, platform_user_id, last_message_at, last_message_direction")
    .eq("id", conversationId)
    .single();

  if (fetchError || !conversation) {
    console.error("Error fetching conversation for reply:", fetchError);
    throw new Error("Conversation not found");
  }

  const { data: lastInbound } = await supabase
    .from("dm_messages")
    .select("sent_at")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const windowMode = getMessagingWindowMode(lastInbound?.sent_at ?? null);

  // Attachment and caption are sent as two separate Send API calls (the
  // platform doesn't support a combined media+text message), so two
  // dm_messages rows.
  if (attachmentUrl) {
    const { sentAt } = await sendAndRecordOutboundMessage(
      supabase,
      conversationId,
      conversation,
      { attachmentUrl, attachmentType },
      windowMode
    );
    if (text?.trim()) {
      await sendAndRecordOutboundMessage(
        supabase,
        conversationId,
        { ...conversation, last_message_at: sentAt, last_message_direction: "outbound" },
        { text: text.trim() },
        windowMode
      );
    }
  } else {
    await sendAndRecordOutboundMessage(
      supabase,
      conversationId,
      conversation,
      { text: text!.trim() },
      windowMode
    );
  }

  invalidateDmLeadCache();
}

/**
 * Sends a text message with structured Meta quick-reply buttons (see
 * lib/dm-leads/quick-reply-buttons.ts) and records it. Mirrors
 * sendAdminReply's insert-then-send/rollback pattern, but as its own
 * function since the payload shape (quick_replies array, no attachment)
 * and message_type ("quick_reply") differ from a plain reply.
 */
export async function sendLeadQuickReplies(
  conversationId: string,
  text: string,
  options: { title: string; payload: string }[]
): Promise<void> {
  if (!text.trim() || options.length === 0) {
    throw new Error("Quick-reply message needs text and at least one option");
  }

  const supabase = createAdminClient();

  const { data: conversation, error: fetchError } = await supabase
    .from("dm_conversations")
    .select("platform, platform_user_id, last_message_at, last_message_direction")
    .eq("id", conversationId)
    .single();

  if (fetchError || !conversation) {
    console.error("Error fetching conversation for quick-reply send:", fetchError);
    throw new Error("Conversation not found");
  }

  const { data: lastInbound } = await supabase
    .from("dm_messages")
    .select("sent_at")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { getMessagingWindowMode } = await import("@/lib/dm-leads/messaging-window");
  const windowMode = getMessagingWindowMode(lastInbound?.sent_at ?? null);

  const sentAt = new Date().toISOString();
  const { data: outboundMessage, error: insertError } = await supabase
    .from("dm_messages")
    .insert({
      conversation_id: conversationId,
      direction: "outbound" as DmMessageDirection,
      sender_type: "admin" as DmMessageSenderType,
      body: text.trim(),
      ...messageSignalFlags(text),
      message_type: "quick_reply" as DmMessageType,
      metadata: { quick_reply_options: options },
      send_status: "pending",
      sent_at: sentAt,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Error inserting outbound quick-reply dm_message:", insertError);
    throw new Error("Failed to record quick-reply message");
  }

  await supabase
    .from("dm_conversations")
    .update({ last_message_at: sentAt, last_message_direction: "outbound" })
    .eq("id", conversationId);

  const { sendMetaQuickReplies } = await import("@/lib/meta/graph");
  let platformMessageId: string;
  try {
    platformMessageId = await sendMetaQuickReplies(
      conversation.platform,
      conversation.platform_user_id,
      text.trim(),
      options,
      windowMode
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown";
    const { error: failedStateError } = await supabase
      .from("dm_messages")
      .update({ send_status: "failed", metadata: { quick_reply_options: options, send_error: errorMessage.slice(0, 300) } })
      .eq("id", outboundMessage.id);
    if (failedStateError) {
      console.error("Failed to persist failed quick-reply message state:", failedStateError);
    }
    const { error: restoreConversationError } = await supabase
      .from("dm_conversations")
      .update({
        last_message_at: conversation.last_message_at,
        last_message_direction: conversation.last_message_direction,
      })
      .eq("id", conversationId)
      .eq("last_message_at", sentAt)
      .eq("last_message_direction", "outbound");
    if (restoreConversationError) {
      console.error("Failed to restore conversation state after quick-reply send failure:", restoreConversationError);
    }
    throw error;
  }

  const { error: sentError } = await supabase
    .from("dm_messages")
    .update({ platform_message_id: platformMessageId, send_status: "sent" })
    .eq("id", outboundMessage.id);
  if (sentError) {
    console.error("Quick-reply sent but dm_message state update failed:", sentError);
    throw new Error("Message sent, but delivery state was not saved");
  }

  invalidateDmLeadCache();
}
