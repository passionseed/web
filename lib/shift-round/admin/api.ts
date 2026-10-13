import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeCertificates,
  normalizeDashboard,
  normalizeEntries,
  normalizeEntryDetail,
  normalizeEvidence,
  normalizeJobs,
  normalizeSummary,
} from "./normalize";
import { callRpc, fail, listFrom, mapResult, type RpcClient } from "./rpc";
import type {
  AdminCertificatesData,
  AdminDashboard,
  AdminEntriesData,
  AdminEntry,
  AdminEntryDetail,
  AdminEvidence,
  AdminJobsData,
  AdminResult,
  AdminRoundListItem,
  AdminSummaryRevision,
  AppConfigRow,
  BetaGroup,
  MissionCounts,
  RejectReasonCode,
  RejectResult,
  ReviewFilter,
  RoleGrant,
  RoundPolicy,
  RoundRole,
  ShiftRound,
  SummaryStatus,
  Track,
} from "./types";

/**
 * Typed wrappers for the admin RPCs (spec 3.4). Every function takes the
 * signed-in user's client, so the RPC role checks (staff, reviewer, global)
 * apply. No service role anywhere in the staff tools.
 */

export const MEDIA_BUCKET = "shift-round-media";
const MEDIA_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/(photo\.jpg|audio\.m4a)$/;
export const SIGNED_URL_SECONDS = 300;

export function isMediaPath(path: string): boolean {
  return MEDIA_PATH.test(path);
}

// ---- Rounds -------------------------------------------------------------

export function listRounds(client: RpcClient): Promise<AdminResult<AdminRoundListItem[]>> {
  return callRpc<unknown>(client, "shift_round_admin_rounds").then((r) =>
    mapResult(r, (data) => listFrom<AdminRoundListItem>(data, "rounds")),
  );
}

export function createRound(
  client: RpcClient,
  round: Partial<RoundPolicy>,
): Promise<AdminResult<{ round_id: string }>> {
  return callRpc(client, "shift_round_admin_create_round", { p_round: round });
}

export function updateRound(
  client: RpcClient,
  roundId: string,
  patch: Partial<RoundPolicy> & { status?: ShiftRound["status"] },
): Promise<AdminResult<{ round: ShiftRound }>> {
  return callRpc(client, "shift_round_admin_update_round", {
    p_round_id: roundId,
    p_patch: patch,
  });
}

export function extendRound(
  client: RpcClient,
  roundId: string,
  days: number,
  reason: string,
): Promise<AdminResult<{ closes_at: string; review_ends_at: string }>> {
  return callRpc(client, "shift_round_admin_extend_round", {
    p_round_id: roundId,
    p_days: days,
    p_reason: reason,
  });
}

// ---- Roles and allowlist ------------------------------------------------

export function setRole(
  client: RpcClient,
  email: string,
  role: RoundRole,
  roundId: string | null,
  grant: boolean,
): Promise<AdminResult<{ user_id: string; role: RoundRole; round_id: string | null }>> {
  return callRpc(client, "shift_round_admin_set_role", {
    p_email: email.trim().toLowerCase(),
    p_role: role,
    p_round_id: roundId,
    p_grant: grant,
  });
}

/** Global staff plus that round's staff and mentors (`p_round_id` null = global staff only view). */
export function listRoles(client: RpcClient, roundId: string | null): Promise<AdminResult<RoleGrant[]>> {
  return callRpc<unknown>(client, "shift_round_admin_roles", { p_round_id: roundId }).then((r) =>
    mapResult(r, (data) => listFrom<RoleGrant>(data, "roles")),
  );
}

export function updateAllowlist(
  client: RpcClient,
  roundId: string,
  add: string[],
  remove: string[],
): Promise<AdminResult<{ count: number; emails?: string[] }>> {
  return callRpc(client, "shift_round_admin_allowlist", {
    p_round_id: roundId,
    p_add: add,
    p_remove: remove,
  });
}

export function importAllowlist(
  client: RpcClient,
  roundId: string,
  cohort: string,
): Promise<AdminResult<{ added: number }>> {
  return callRpc(client, "shift_round_admin_allowlist_import", {
    p_round_id: roundId,
    p_cohort: cohort,
  });
}

// ---- Entries and squads -------------------------------------------------

export function listEntries(
  client: RpcClient,
  roundId: string,
): Promise<AdminResult<AdminEntriesData>> {
  return callRpc<unknown>(client, "shift_round_admin_entries", { p_round_id: roundId }).then((r) =>
    mapResult(r, normalizeEntries),
  );
}

export function updateEntry(
  client: RpcClient,
  entryId: string,
  patch: { track?: Track; beta_group?: BetaGroup | null },
): Promise<AdminResult<{ entry: AdminEntry }>> {
  return callRpc(client, "shift_round_admin_update_entry", { p_entry_id: entryId, p_patch: patch });
}

export function upsertSquad(
  client: RpcClient,
  roundId: string,
  squad: { id?: string | null; name: string; mentor_user_id: string | null; discord_url: string | null },
): Promise<AdminResult<{ squad_id: string }>> {
  return callRpc(client, "shift_round_admin_upsert_squad", {
    p_round_id: roundId,
    p_squad_id: squad.id ?? null,
    p_name: squad.name,
    p_mentor_user_id: squad.mentor_user_id,
    p_discord_url: squad.discord_url,
  });
}

export function assignSquad(
  client: RpcClient,
  entryId: string,
  squadId: string | null,
): Promise<AdminResult<{ squad_id: string | null; icebreaker_question: number | null }>> {
  return callRpc(client, "shift_round_admin_assign_squad", {
    p_entry_id: entryId,
    p_squad_id: squadId,
  });
}

export function deleteSquad(client: RpcClient, squadId: string): Promise<AdminResult<object>> {
  return callRpc(client, "shift_round_admin_delete_squad", { p_squad_id: squadId });
}

// ---- Review -------------------------------------------------------------

export function reviewQueue(
  client: RpcClient,
  roundId: string,
  filter: ReviewFilter,
): Promise<AdminResult<AdminEvidence[]>> {
  return callRpc<unknown>(client, "shift_round_admin_review_queue", {
    p_round_id: roundId,
    p_filter: filter,
  }).then((r) => mapResult(r, (data) => listFrom<unknown>(data, "items").map(normalizeEvidence)));
}

export function entryDetail(
  client: RpcClient,
  entryId: string,
): Promise<AdminResult<AdminEntryDetail>> {
  return callRpc<unknown>(client, "shift_round_admin_entry_detail", { p_entry_id: entryId }).then((r) =>
    mapResult(r, normalizeEntryDetail),
  );
}

export function rejectEvidence(
  client: RpcClient,
  evidenceId: string,
  reasonCode: RejectReasonCode,
  note: string | null,
  reviewMs: number,
): Promise<AdminResult<RejectResult>> {
  return callRpc(client, "shift_round_admin_reject_evidence", {
    p_evidence_id: evidenceId,
    p_reason_code: reasonCode,
    p_note: note,
    p_review_ms: reviewMs,
  });
}

export function acceptEvidence(
  client: RpcClient,
  evidenceId: string,
  note: string | null,
  reviewMs: number,
): Promise<AdminResult<{ missions: MissionCounts }>> {
  return callRpc(client, "shift_round_admin_accept_evidence", {
    p_evidence_id: evidenceId,
    p_note: note,
    p_review_ms: reviewMs,
  });
}

export function markReviewed(
  client: RpcClient,
  evidenceId: string,
  reviewMs: number,
): Promise<AdminResult<object>> {
  return callRpc(client, "shift_round_admin_mark_reviewed", {
    p_evidence_id: evidenceId,
    p_review_ms: reviewMs,
  });
}

/** 5-minute signed URLs with the reviewer's session; storage RLS (`can_read_media`) decides access. */
export async function signMedia(
  client: SupabaseClient,
  paths: string[],
): Promise<AdminResult<Record<string, string>>> {
  const valid = [...new Set(paths)].filter(isMediaPath);
  if (valid.length === 0) return { ok: true, data: {} };
  const { data, error } = await client.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(valid, SIGNED_URL_SECONDS);
  if (error) return fail("retryable", "retryable", { message: error.message });
  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) urls[item.path] = item.signedUrl;
  }
  return { ok: true, data: urls };
}

// ---- Summaries and certificates ------------------------------------------

export function listSummaries(
  client: RpcClient,
  roundId: string,
  status: SummaryStatus | null,
): Promise<AdminResult<AdminSummaryRevision[]>> {
  return callRpc<unknown>(client, "shift_round_admin_summaries", {
    p_round_id: roundId,
    p_status: status,
  }).then((r) => mapResult(r, (data) => listFrom<unknown>(data, "revisions").map(normalizeSummary)));
}

export function decideSummary(
  client: RpcClient,
  revisionId: string,
  decision: "approve" | "reject",
  reason: string | null,
): Promise<AdminResult<{ status: SummaryStatus }>> {
  return callRpc(client, "shift_round_admin_decide_summary", {
    p_revision_id: revisionId,
    p_decision: decision,
    p_reason: reason,
  });
}

export function takeDownSummary(
  client: RpcClient,
  entryId: string,
  reason: string,
): Promise<AdminResult<object>> {
  return callRpc(client, "shift_round_admin_take_down_summary", {
    p_entry_id: entryId,
    p_reason: reason,
  });
}

export function listCertificates(
  client: RpcClient,
  roundId: string,
): Promise<AdminResult<AdminCertificatesData>> {
  return callRpc<unknown>(client, "shift_round_admin_certificates", { p_round_id: roundId }).then((r) =>
    mapResult(r, normalizeCertificates),
  );
}

export function revokeCertificate(
  client: RpcClient,
  certificateId: string,
  reason: string,
): Promise<AdminResult<{ status: string; render_version: number }>> {
  return callRpc(client, "shift_round_admin_revoke_certificate", {
    p_certificate_id: certificateId,
    p_reason: reason,
  });
}

export function reinstateCertificate(
  client: RpcClient,
  certificateId: string,
  note: string,
): Promise<AdminResult<{ status: string; render_version: number }>> {
  return callRpc(client, "shift_round_admin_reinstate_certificate", {
    p_certificate_id: certificateId,
    p_note: note,
  });
}

// ---- Dashboard, config, jobs ----------------------------------------------

export function dashboard(client: RpcClient, roundId: string): Promise<AdminResult<AdminDashboard>> {
  return callRpc<unknown>(client, "shift_round_admin_dashboard", { p_round_id: roundId }).then((r) =>
    mapResult(r, normalizeDashboard),
  );
}

export function setConfig(
  client: RpcClient,
  key: string,
  value: unknown,
): Promise<AdminResult<{ key: string; value: unknown }>> {
  return callRpc(client, "shift_round_admin_set_config", { p_key: key, p_value: value });
}

/** `app_config` rows are public-readable (RLS `is_public`); writes go through `set_config`. */
export async function readConfig(client: SupabaseClient): Promise<AdminResult<AppConfigRow[]>> {
  const { data, error, status } = await client
    .from("app_config")
    .select("key,value,updated_at")
    .like("key", "shift_round.%");
  if (error) {
    if (status === 404 || error.code === "42P01" || error.code === "PGRST205") {
      return fail("unavailable", "unavailable", { message: error.message });
    }
    return fail("retryable", "retryable", { message: error.message });
  }
  return { ok: true, data: (data ?? []) as AppConfigRow[] };
}

export function jobs(client: RpcClient): Promise<AdminResult<AdminJobsData>> {
  return callRpc<unknown>(client, "shift_round_admin_jobs").then((r) => mapResult(r, normalizeJobs));
}
