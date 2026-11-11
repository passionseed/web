/**
 * Data layer for batch sweeps over the DM inbox.
 *
 * Builds a queue, drafts every message through Qwen, gates each draft, and
 * records the outcome so the A/B arm is answerable later.
 *
 * Drafting is the expensive step (one LLM call per lead, ~2s each), so it runs
 * bounded-concurrent at build time rather than lazily per row: the operator
 * opens the queue once and every card is already written. That is the opposite
 * of the rule for the single-lead inbox, where eager drafting was the bug —
 * there the operator needs one message now, here they need all of them.
 */

import { createAdminClient } from "@/utils/supabase/admin";
import { getDmLeadSignals } from "@/lib/supabase/dm-leads";
import { isMissingOriginColumn, warnMissingOriginColumn } from "@/lib/supabase/dm-origin";
import { classifyBucket, EMPTY_SIGNALS, type DmLeadBucket } from "@/lib/dm-leads/playbook";
import {
  buildQueue,
  type CampaignCandidate,
  type CampaignVariant,
} from "@/lib/dm-leads/campaign";
import { humanizeDraft, type ThreadTurn } from "@/lib/dm-leads/humanize";
import type { DmScriptRung } from "@/lib/dm-leads/scripts";
import {
  consecutiveOutboundTail,
  gateDraft,
  type GateReason,
  type SendDecision,
} from "@/lib/dm-leads/send-gate";
import { leadFromConversation } from "@/lib/dm-leads/personalize";
import type { DmConversation, DmPlatform } from "@/types/dm-leads";

/** One LLM call per lead; keep enough in flight to be quick, few enough not to melt Qwen. */
const DRAFT_CONCURRENCY = 4;
const CONVERSATION_PAGE_SIZE = 1000;

/** Turns handed to the model for continuation context. */
const CONTEXT_TURNS = 6;

const CANDIDATE_COLUMNS = [
  "id",
  "display_name",
  "username",
  "grade_level",
  "interests",
  "stage",
  "activities_summary",
  "admin_tags",
  "lead_status",
  "last_message_direction",
  "wants_pathlab",
  "pathlab_pay_ready",
  "wants_community",
  "wants_talent",
  "has_hands_on_experience",
] as const;

type CandidateColumn = (typeof CANDIDATE_COLUMNS)[number];
/**
 * `origin` is read alongside the typed columns so Radar-origin threads are
 * counted as skipped rather than silently missing (spec 5.6). It is not in
 * `DmConversation` until the types are regenerated after the migration.
 */
type CandidateRow = Pick<DmConversation, CandidateColumn> & { origin?: string | null };
const CANDIDATE_SELECT = [...CANDIDATE_COLUMNS, "origin"].join(", ");

export interface CampaignTargetRow {
  id: string;
  conversation_id: string;
  bucket: DmLeadBucket;
  rung: DmScriptRung;
  variant: CampaignVariant;
  window_mode: string;
  template_body: string;
  draft_body: string | null;
  gate_decision: SendDecision;
  gate_reasons: GateReason[];
  status: string;
  sent_at: string | null;
}

export interface CampaignBuildResult {
  campaignId: string;
  queued: number;
  auto: number;
  review: number;
  fellBack: number;
  skipped: Record<string, number>;
}

/**
 * Runs `task` over `items` with a fixed number in flight.
 *
 * Deliberately not `Promise.all` over the whole list: ~180 simultaneous
 * requests to a single self-hosted llama.cpp server queues them all anyway and
 * loses every timeout at once.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchCandidates(
  supabase: ReturnType<typeof createAdminClient>
): Promise<CandidateRow[]> {
  const rows: CandidateRow[] = [];
  // Before migration 20261111100300 there is no `origin` column: read without
  // it, so every thread counts as a sales thread (none can be Radar yet).
  let select = CANDIDATE_SELECT;
  for (let offset = 0; ; offset += CONVERSATION_PAGE_SIZE) {
    const read = (columns: string) =>
      supabase
        .from("dm_conversations")
        .select(columns)
        .order("id", { ascending: true })
        .range(offset, offset + CONVERSATION_PAGE_SIZE - 1);
    let { data, error } = await read(select);
    if (error && select === CANDIDATE_SELECT && isMissingOriginColumn(error)) {
      warnMissingOriginColumn("fetchCandidates");
      select = CANDIDATE_COLUMNS.join(", ");
      ({ data, error } = await read(select));
    }

    if (error) {
      console.error("Error loading campaign candidates:", error);
      throw new Error("Failed to load conversations");
    }
    // PostgREST loses column inference on a non-literal select; the shared
    // CANDIDATE_COLUMNS constant is what actually keeps these in step.
    const page = (data ?? []) as unknown as CandidateRow[];
    rows.push(...page);
    if (page.length < CONVERSATION_PAGE_SIZE) break;
  }
  return rows;
}

/** Last few turns per conversation, for continuation context and the tail count. */
async function fetchRecentTurns(
  supabase: ReturnType<typeof createAdminClient>,
  conversationIds: string[]
): Promise<Map<string, ThreadTurn[]>> {
  const byConversation = new Map<string, ThreadTurn[]>();
  if (conversationIds.length === 0) return byConversation;

  const CHUNK = 200;
  for (let i = 0; i < conversationIds.length; i += CHUNK) {
    const chunk = conversationIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from("dm_messages")
      .select("conversation_id, direction, body, sent_at")
      .in("conversation_id", chunk)
      .order("sent_at", { ascending: true });

    if (error) {
      console.error("Error loading campaign thread context:", error);
      throw new Error("Failed to load thread context");
    }

    for (const row of data ?? []) {
      const turns = byConversation.get(row.conversation_id) ?? [];
      turns.push({ direction: row.direction, body: row.body });
      byConversation.set(row.conversation_id, turns);
    }
  }

  // Trim after grouping so the tail count sees the true end of the thread.
  for (const [id, turns] of byConversation) {
    byConversation.set(id, turns.slice(-Math.max(CONTEXT_TURNS, 8)));
  }
  return byConversation;
}

/**
 * Creates a campaign and fills its queue.
 *
 * Nothing is sent here. Every row lands as `pending` with a gate decision
 * attached; sending is a separate, explicit step.
 */
export async function buildCampaign(
  name: string,
  options: { abVariable?: string } = {}
): Promise<CampaignBuildResult> {
  const supabase = createAdminClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("dm_campaigns")
    .insert({ name, ab_variable: options.abVariable ?? "ask_vs_no_ask" })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    console.error("Error creating campaign:", campaignError);
    throw new Error("Failed to create campaign");
  }

  const [rows, signals] = await Promise.all([
    fetchCandidates(supabase),
    getDmLeadSignals(true),
  ]);

  const candidates: CampaignCandidate[] = rows.map((row) => {
    const signal = signals.get(row.id) ?? EMPTY_SIGNALS;
    return {
      conversationId: row.id,
      bucket: classifyBucket(row, signal),
      interests: row.interests ?? [],
      adminTags: row.admin_tags ?? [],
      signals: signal,
      origin: row.origin ?? null,
    };
  });

  const { entries, skipped } = buildQueue(candidates, campaign.id, Date.now());
  const byId = new Map(rows.map((row) => [row.id, row]));
  const turns = await fetchRecentTurns(
    supabase,
    entries.map((e) => e.conversationId)
  );

  let fellBack = 0;
  const drafted = await mapWithConcurrency(entries, DRAFT_CONCURRENCY, async (entry) => {
    const row = byId.get(entry.conversationId)!;
    const recentTurns = turns.get(entry.conversationId) ?? [];

    const result = await humanizeDraft({
      template: entry.script.body,
      lead: leadFromConversation(row),
      variant: entry.variant,
      recentTurns,
    });
    if (result.fellBack) fellBack += 1;

    const gate = gateDraft({
      body: result.body,
      rung: entry.rung,
      bucket: entry.bucket,
      windowMode: entry.windowMode,
      consecutiveOutbound: consecutiveOutboundTail(recentTurns),
    });

    return { entry, body: result.body, gate };
  });

  const payload = drafted
    // A `block` verdict means no compliant send exists; it must not sit in the
    // queue looking actionable.
    .filter((d) => d.gate.decision !== "block")
    .map((d) => ({
      campaign_id: campaign.id,
      conversation_id: d.entry.conversationId,
      bucket: d.entry.bucket,
      rung: d.entry.rung,
      variant: d.entry.variant,
      window_mode: d.entry.windowMode,
      template_body: d.entry.script.body,
      draft_body: d.body,
      gate_decision: d.gate.decision,
      gate_reasons: d.gate.reasons,
      status: "pending",
    }));

  if (payload.length > 0) {
    const { error: insertError } = await supabase
      .from("dm_campaign_targets")
      .insert(payload);
    if (insertError) {
      console.error("Error inserting campaign targets:", insertError);
      throw new Error("Failed to queue campaign targets");
    }
  }

  return {
    campaignId: campaign.id,
    queued: payload.length,
    auto: payload.filter((p) => p.gate_decision === "auto").length,
    review: payload.filter((p) => p.gate_decision === "review").length,
    fellBack,
    skipped,
  };
}

export interface CampaignQueueItem extends CampaignTargetRow {
  display_name: string | null;
  username: string | null;
  grade_level: string | null;
  interests: string[];
  /** Carried so the review card can deep-link into the real chat app. */
  platform: DmPlatform;
  platform_user_id: string;
  recent_turns: ThreadTurn[];
}

/** The review queue, in the order the campaign was built (soonest to expire first). */
export async function getCampaignQueue(
  campaignId: string,
  decision?: SendDecision
): Promise<CampaignQueueItem[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("dm_campaign_targets")
    .select(
      "id, conversation_id, bucket, rung, variant, window_mode, template_body, draft_body, gate_decision, gate_reasons, status, sent_at"
    )
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (decision) query = query.eq("gate_decision", decision);

  const { data, error } = await query;
  if (error) {
    console.error("Error loading campaign queue:", error);
    throw new Error("Failed to load campaign queue");
  }

  const targets = (data ?? []) as CampaignTargetRow[];
  if (targets.length === 0) return [];

  const ids = targets.map((t) => t.conversation_id);
  const [{ data: convos }, turns] = await Promise.all([
    supabase
      .from("dm_conversations")
      .select("id, display_name, username, grade_level, interests, platform, platform_user_id")
      .in("id", ids),
    fetchRecentTurns(supabase, ids),
  ]);

  const byId = new Map((convos ?? []).map((c) => [c.id, c]));
  return targets.map((target) => {
    const convo = byId.get(target.conversation_id);
    return {
      ...target,
      display_name: convo?.display_name ?? null,
      username: convo?.username ?? null,
      grade_level: convo?.grade_level ?? null,
      interests: convo?.interests ?? [],
      platform: convo?.platform ?? "instagram",
      platform_user_id: convo?.platform_user_id ?? "",
      recent_turns: turns.get(target.conversation_id) ?? [],
    };
  });
}

/** Read one pending target from the server before accepting an edited send. */
export async function getPendingCampaignTarget(
  targetId: string,
  campaignId: string
): Promise<CampaignTargetRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dm_campaign_targets")
    .select(
      "id, conversation_id, bucket, rung, variant, window_mode, template_body, draft_body, gate_decision, gate_reasons, status, sent_at"
    )
    .eq("id", targetId)
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    console.error("Error loading pending campaign target:", error);
    throw new Error("Failed to load campaign target");
  }

  return (data as CampaignTargetRow | null) ?? null;
}

export async function markTargetSent(
  targetId: string,
  sentMessageId: string | null
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dm_campaign_targets")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_message_id: sentMessageId,
    })
    .eq("id", targetId);
  if (error) {
    console.error("Error marking campaign target sent:", error);
    throw new Error("Failed to record send");
  }
}

export async function skipTarget(targetId: string, reason: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("dm_campaign_targets")
    .update({ status: "skipped", skip_reason: reason })
    .eq("id", targetId);
  if (error) {
    console.error("Error skipping campaign target:", error);
    throw new Error("Failed to skip target");
  }
}

export interface VariantReadout {
  variant: CampaignVariant;
  sent: number;
  replied: number;
  replyRate: number;
}

/**
 * Reply rate per arm.
 *
 * Reply rate only — purchase rate is not readable at this sample size, and
 * reporting it would invite a decision the data cannot support.
 */
export async function getCampaignReadout(
  campaignId: string
): Promise<VariantReadout[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("dm_campaign_outcomes")
    .select("variant, replied_at")
    .eq("campaign_id", campaignId);

  if (error) {
    console.error("Error loading campaign readout:", error);
    throw new Error("Failed to load campaign readout");
  }

  const tally = new Map<CampaignVariant, { sent: number; replied: number }>();
  for (const row of data ?? []) {
    const variant = row.variant as CampaignVariant;
    const current = tally.get(variant) ?? { sent: 0, replied: 0 };
    current.sent += 1;
    if (row.replied_at) current.replied += 1;
    tally.set(variant, current);
  }

  return [...tally.entries()].map(([variant, counts]) => ({
    variant,
    sent: counts.sent,
    replied: counts.replied,
    replyRate: counts.sent === 0 ? 0 : Math.round((counts.replied / counts.sent) * 100),
  }));
}
