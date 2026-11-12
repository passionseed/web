/**
 * POST /api/copilot/advise
 *
 * The Chrome extension lives inside IG and scrapes the visible thread. It
 * posts the parsed messages here; we resolve the lead against dm_conversations
 * by username, run the same playbook the admin inbox uses (signals → bucket →
 * coverage → scripts + quick-replies), personalize via Qwen, and ship back
 * what the tray should render.
 *
 * Auth: bearer token issued from /admin/dm-leads/copilot. Service-role client
 * is used so RLS on dm_conversations does not block the lookup; the bearer
 * check is what gates access.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import {
  extractBearerFromHeader,
  verifyCopilotToken,
  touchCopilotToken,
  type SupabaseLookupClient,
  type SupabaseUpdateClient,
} from "@/lib/supabase/dm-copilot-tokens";
import { deriveSignalsFromMessages } from "@/lib/dm-leads/signals";
import {
  BUCKET_META,
  classifyBucket,
  COVERAGE_OFFER,
  getFieldCoverage,
  type DmLeadBucket,
  type FieldCoverage,
} from "@/lib/dm-leads/playbook";
import {
  BUCKET_NEXT_RUNG,
  selectScripts,
  type DmLeadScript,
} from "@/lib/dm-leads/scripts";
import {
  contextFromConversation,
  getQuickReplies,
  type QuickReply,
} from "@/lib/dm-leads/quick-replies";
import { getMessagingWindowMode } from "@/lib/dm-leads/messaging-window";
import { draftFromThread } from "@/lib/dm-leads/thread-advisor";

interface RawMessage {
  direction: "inbound" | "outbound";
  body: string;
  sent_at: string;
}

interface AdviseBody {
  username?: string | null;
  messages?: RawMessage[];
  /** Optional client-side guess; ignored if a conversation row matches. */
  partnerDisplayName?: string | null;
  /** Run the LLM drafter. Off by default so chips return without waiting. */
  includeDrafts?: boolean;
}

const ADVISE_REJECT = (reason: string, status = 401) => {
  // Auth failures are silent in the tray, so name the reason server-side.
  // Only the non-secret prefix of the bearer is ever logged.
  console.warn(`[copilot advise] rejected: ${reason}`);
  return NextResponse.json({ ok: false, reason }, { status });
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const bearer = extractBearerFromHeader(request.headers.get("authorization"));
  if (!bearer) return ADVISE_REJECT("missing_bearer");

  const supabase = createServiceRoleClient();
  const verified = await verifyCopilotToken({
    supabase: supabase as unknown as SupabaseLookupClient,
    raw: bearer,
  });
  if (!verified.ok) return ADVISE_REJECT(verified.reason);

  let body: AdviseBody;
  try {
    body = (await request.json()) as AdviseBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const username = (body.username ?? "").replace(/^@+/, "").trim() || null;
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];

  if (rawMessages.length > 500) {
    return NextResponse.json({ ok: false, error: "too_many_messages" }, { status: 400 });
  }
  const messages = rawMessages
    .filter((m) => m && (m.direction === "inbound" || m.direction === "outbound") && typeof m.body === "string")
    .slice(0, 500)
    .map((m) => ({
      direction: m.direction,
      body: m.body.slice(0, 4000),
      sent_at: typeof m.sent_at === "string" ? m.sent_at : new Date().toISOString(),
    }));

  // Resolve to a stored conversation by instagram username. Case-insensitive
  // match — IG handles keep their casing but our exports sometimes lowercase.
  let conversation: Pick<
    import("@/types/dm-leads").DmConversation,
    | "id"
    | "username"
    | "display_name"
    | "grade_level"
    | "interests"
    | "activities_summary"
    | "stage"
    | "wants_pathlab"
    | "pathlab_pay_ready"
    | "wants_community"
    | "wants_talent"
    | "has_hands_on_experience"
    | "last_message_direction"
    | "lead_status"
  > | null = null;

  if (username) {
    const { data } = await supabase
      .from("dm_conversations")
      .select(
        "id, username, display_name, grade_level, interests, activities_summary, stage, lead_status, last_message_direction, wants_pathlab, pathlab_pay_ready, wants_community, wants_talent, has_hands_on_experience"
      )
      .eq("platform", "instagram")
      .ilike("username", username)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    conversation = data ?? null;
  }

  // Radar-origin threads (students who asked for a Career Radar link) are
  // fenced off from the sales tooling (spec 5.6): no scripts, quick replies,
  // Qwen personalization or drafts. A failed check (for example before the
  // origin column exists) leaves the thread treated as a sales thread, which
  // is what it was before.
  let isRadarThread = false;
  if (conversation) {
    const { data: originRow, error: originError } = await supabase
      .from("dm_conversations")
      .select("origin")
      .eq("id", conversation.id)
      .maybeSingle();
    if (!originError) {
      isRadarThread = (originRow as unknown as { origin?: string | null } | null)?.origin === "radar";
    }
  }

  const signals = deriveSignalsFromMessages(
    messages.map((m) => ({ direction: m.direction, body: m.body, sent_at: m.sent_at }))
  );

  const bucket: DmLeadBucket = conversation
    ? classifyBucket(conversation, signals)
    : signals.hasInbound
      ? "waiting_unqualified"
      : "no_reply";

  const coverage: FieldCoverage = getFieldCoverage(conversation?.interests ?? null);

  // The script selector is rung-aware; ladder-1-qualify is the default fallback
  // for unknown leads who have not told us their grade or field yet.
  let scripts: DmLeadScript[] = isRadarThread ? [] : selectScripts(bucket, coverage);
  if (scripts.length === 0 && !isRadarThread) {
    scripts = selectScripts("waiting_unqualified", "unknown");
  }

  const quickReplies: QuickReply[] = isRadarThread
    ? []
    : conversation
    ? getQuickReplies(contextFromConversation(conversation))
    : getQuickReplies({
        stage: "unknown",
        gradeLevel: null,
        interests: [],
        wantsPathlab: false,
        pathlabPayReady: false,
        wantsCommunity: false,
        wantsTalent: false,
        hasHandsOnExperience: false,
      });

  // Personalize via Qwen. Falls back to verbatim copy on Qwen failure; that
  // path is already wired in personalize.ts so we don't need to handle errors
  // here beyond letting them pass through.
  const personalizeMessage = (await import("@/lib/dm-leads/personalize")).personalizeMessage;
  const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound")?.body ?? null;

  const lead = {
    displayName: conversation?.display_name ?? body.partnerDisplayName ?? null,
    username: conversation?.username ?? username,
    gradeLevel: conversation?.grade_level ?? null,
    interests: conversation?.interests ?? [],
    stage: conversation?.stage ?? "unknown",
    activitiesSummary: conversation?.activities_summary ?? null,
    coverage,
    wantsPathlab: conversation?.wants_pathlab ?? false,
    pathlabPayReady: conversation?.pathlab_pay_ready ?? false,
    wantsCommunity: conversation?.wants_community ?? false,
    wantsTalent: conversation?.wants_talent ?? false,
    hasHandsOnExperience: conversation?.has_hands_on_experience ?? false,
    lastInbound,
  };

  const personalizedScripts = await Promise.all(
    scripts.map(async (script) => ({
      ...script,
      body: await personalizeMessage({ template: script.body, lead, kind: "script" }),
    }))
  );
  const personalizedReplies = await Promise.all(
    quickReplies.map(async (reply) => ({
      ...reply,
      body: await personalizeMessage({ template: reply.body, lead, kind: "quick_reply" }),
    }))
  );

  const windowMode = getMessagingWindowMode(signals.lastInboundMessageAt);
  const windowOpen = windowMode !== "closed";

  // Free-form drafts read the actual conversation, so they can answer a
  // question the ladder has no chip for. Additive: the deterministic chips
  // above stand on their own if this returns nothing.
  //
  // Opt-in, because the model call is the slowest part of this route by an
  // order of magnitude. The tray asks for chips first and drafts in a second
  // request, so nothing waits on the LLM to render.
  const aiDrafts = body.includeDrafts === true && !isRadarThread ? await draftFromThread({
    origin: isRadarThread ? "radar" : null,
    messages,
    bucketLabel: BUCKET_META[bucket].label,
    coverageOffer: COVERAGE_OFFER[coverage],
    coverage,
    rung: BUCKET_NEXT_RUNG[bucket],
    lead: {
      displayName: conversation?.display_name ?? body.partnerDisplayName ?? null,
      username: conversation?.username ?? username,
      gradeLevel: conversation?.grade_level ?? null,
      interests: conversation?.interests ?? [],
    },
  }) : [];

  await touchCopilotToken({ supabase: supabase as unknown as SupabaseUpdateClient, tokenId: verified.token.id });
  await supabase.from("dm_copilot_audit_log").insert({
    token_id: verified.token.id,
    user_id: verified.token.user_id,
    action: "advise",
    conversation_id: conversation && UUID_PATTERN.test(conversation.id) ? conversation.id : null,
  });

  return NextResponse.json({
    ok: true,
    conversationId: conversation?.id ?? null,
    username: conversation?.username ?? username,
    origin: isRadarThread ? "radar" : null,
    bucket,
    bucketLabel: BUCKET_META[bucket].label,
    coverage,
    coverageOffer: COVERAGE_OFFER[coverage],
    rung: BUCKET_NEXT_RUNG[bucket],
    windowMode,
    windowOpen,
    lastInboundAt: signals.lastInboundMessageAt,
    hasInbound: signals.hasInbound,
    scripts: personalizedScripts.map((s) => ({
      id: s.id,
      label: s.label,
      rung: s.rung,
      body: s.body,
    })),
    quickReplies: personalizedReplies.map((r) => ({
      id: r.id,
      label: r.label,
      tone: r.tone,
      body: r.body,
    })),
    aiDrafts,
  });
}
