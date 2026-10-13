"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import * as api from "@/lib/shift-round/admin/api";
import { isUuid } from "@/lib/shift-round/admin/format";
import { fail } from "@/lib/shift-round/admin/rpc";
import type {
  AdminResult,
  BetaGroup,
  EvidenceStatus,
  EvidenceType,
  RejectReasonCode,
  ReviewFilter,
  RoundPolicy,
  RoundRole,
  ShiftRound,
  SummaryStatus,
  Track,
} from "@/lib/shift-round/admin/types";
import { requireAdmin } from "@/lib/security/route-guards";

/**
 * Server actions for /admin/shift/rounds. Each one checks the web admin role
 * (user_roles admin) and then calls the RPC with the signed-in user's session,
 * so round-scoped staff/mentor permissions are enforced by the database.
 * No service role is used.
 */

async function withAdmin<T>(
  run: (client: SupabaseClient) => Promise<AdminResult<T>>,
): Promise<AdminResult<T>> {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response.status === 401
      ? fail("unauthenticated")
      : fail("forbidden");
  }
  return run(guard.value.supabase as unknown as SupabaseClient);
}

function badId(field: string) {
  return fail("invalid_field", "validation", { field });
}

const SHORT_TEXT = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;

// ---- Rounds -------------------------------------------------------------

export async function listRoundsAction() {
  return withAdmin((c) => api.listRounds(c));
}

export async function createRoundAction(round: RoundPolicy) {
  return withAdmin((c) => api.createRound(c, round));
}

export async function updateRoundAction(
  roundId: string,
  patch: Partial<RoundPolicy> & { status?: ShiftRound["status"] },
) {
  if (!isUuid(roundId)) return badId("round_id");
  return withAdmin((c) => api.updateRound(c, roundId, patch));
}

export async function extendRoundAction(roundId: string, days: number, reason: string) {
  if (!isUuid(roundId)) return badId("round_id");
  if (!Number.isInteger(days) || days < 1 || days > 7) return badId("days");
  if (!SHORT_TEXT(reason, 300)) return badId("reason");
  return withAdmin((c) => api.extendRound(c, roundId, days, reason.trim()));
}

// ---- Roles and allowlist ------------------------------------------------

export async function listRolesAction(roundId: string | null) {
  if (roundId !== null && !isUuid(roundId)) return badId("round_id");
  return withAdmin((c) => api.listRoles(c, roundId));
}

export async function setRoleAction(
  email: string,
  role: RoundRole,
  roundId: string | null,
  grant: boolean,
) {
  if (roundId !== null && !isUuid(roundId)) return badId("round_id");
  if (role !== "staff" && role !== "mentor") return badId("role");
  if (!SHORT_TEXT(email, 320)) return badId("email");
  return withAdmin((c) => api.setRole(c, email, role, roundId, grant));
}

export async function updateAllowlistAction(roundId: string, add: string[], remove: string[]) {
  if (!isUuid(roundId)) return badId("round_id");
  return withAdmin((c) => api.updateAllowlist(c, roundId, add, remove));
}

export async function importAllowlistAction(roundId: string, cohort: string) {
  if (!isUuid(roundId)) return badId("round_id");
  if (!SHORT_TEXT(cohort, 120)) return badId("cohort");
  return withAdmin((c) => api.importAllowlist(c, roundId, cohort.trim()));
}

// ---- Entries and squads -------------------------------------------------

export async function listEntriesAction(roundId: string) {
  if (!isUuid(roundId)) return badId("round_id");
  return withAdmin((c) => api.listEntries(c, roundId));
}

export async function updateEntryAction(
  entryId: string,
  patch: { track?: Track; beta_group?: BetaGroup | null },
) {
  if (!isUuid(entryId)) return badId("entry_id");
  return withAdmin((c) => api.updateEntry(c, entryId, patch));
}

export async function upsertSquadAction(
  roundId: string,
  squad: { id?: string | null; name: string; mentor_user_id: string | null; discord_url: string | null },
) {
  if (!isUuid(roundId)) return badId("round_id");
  if (squad.id && !isUuid(squad.id)) return badId("squad_id");
  if (squad.mentor_user_id && !isUuid(squad.mentor_user_id)) return badId("mentor_user_id");
  if (!SHORT_TEXT(squad.name, 40)) return badId("name");
  return withAdmin((c) => api.upsertSquad(c, roundId, { ...squad, name: squad.name.trim() }));
}

export async function assignSquadAction(entryId: string, squadId: string | null) {
  if (!isUuid(entryId)) return badId("entry_id");
  if (squadId !== null && !isUuid(squadId)) return badId("squad_id");
  return withAdmin((c) => api.assignSquad(c, entryId, squadId));
}

export async function deleteSquadAction(squadId: string) {
  if (!isUuid(squadId)) return badId("squad_id");
  return withAdmin((c) => api.deleteSquad(c, squadId));
}

// ---- Review -------------------------------------------------------------

export async function reviewQueueAction(roundId: string, filter: ReviewFilter) {
  if (!isUuid(roundId)) return badId("round_id");
  const clean: ReviewFilter = {
    status: (filter.status ?? null) as EvidenceStatus | null,
    type: (filter.type ?? null) as EvidenceType | null,
    squad_id: filter.squad_id && isUuid(filter.squad_id) ? filter.squad_id : null,
    unreviewed_only: Boolean(filter.unreviewed_only),
    sample: Boolean(filter.sample),
  };
  return withAdmin((c) => api.reviewQueue(c, roundId, clean));
}

export async function entryDetailAction(entryId: string) {
  if (!isUuid(entryId)) return badId("entry_id");
  return withAdmin((c) => api.entryDetail(c, entryId));
}

const reviewMs = (ms: number) => Math.max(0, Math.min(Math.round(ms), 3_600_000));

export async function rejectEvidenceAction(
  evidenceId: string,
  reasonCode: RejectReasonCode,
  note: string | null,
  ms: number,
) {
  if (!isUuid(evidenceId)) return badId("evidence_id");
  if (!reasonCode) return badId("reason_code");
  if (note && note.length > 500) return badId("note");
  return withAdmin((c) =>
    api.rejectEvidence(c, evidenceId, reasonCode, note?.trim() || null, reviewMs(ms)),
  );
}

export async function acceptEvidenceAction(evidenceId: string, note: string | null, ms: number) {
  if (!isUuid(evidenceId)) return badId("evidence_id");
  return withAdmin((c) => api.acceptEvidence(c, evidenceId, note?.trim() || null, reviewMs(ms)));
}

export async function markReviewedAction(evidenceId: string, ms: number) {
  if (!isUuid(evidenceId)) return badId("evidence_id");
  return withAdmin((c) => api.markReviewed(c, evidenceId, reviewMs(ms)));
}

export async function signMediaAction(paths: string[]) {
  if (!Array.isArray(paths) || paths.length > 50) return badId("paths");
  return withAdmin((c) => api.signMedia(c, paths));
}

// ---- Summaries and certificates -------------------------------------------

export async function listSummariesAction(roundId: string, status: SummaryStatus | null) {
  if (!isUuid(roundId)) return badId("round_id");
  return withAdmin((c) => api.listSummaries(c, roundId, status));
}

export async function decideSummaryAction(
  revisionId: string,
  decision: "approve" | "reject",
  reason: string | null,
) {
  if (!isUuid(revisionId)) return badId("revision_id");
  if (decision === "reject" && !SHORT_TEXT(reason, 300)) return badId("reason");
  return withAdmin((c) => api.decideSummary(c, revisionId, decision, reason?.trim() || null));
}

export async function takeDownSummaryAction(entryId: string, reason: string) {
  if (!isUuid(entryId)) return badId("entry_id");
  if (!SHORT_TEXT(reason, 300)) return badId("reason");
  return withAdmin((c) => api.takeDownSummary(c, entryId, reason.trim()));
}

export async function listCertificatesAction(roundId: string) {
  if (!isUuid(roundId)) return badId("round_id");
  return withAdmin((c) => api.listCertificates(c, roundId));
}

export async function revokeCertificateAction(certificateId: string, reason: string) {
  if (!isUuid(certificateId)) return badId("certificate_id");
  if (!SHORT_TEXT(reason, 300)) return badId("reason");
  return withAdmin((c) => api.revokeCertificate(c, certificateId, reason.trim()));
}

export async function reinstateCertificateAction(certificateId: string, note: string) {
  if (!isUuid(certificateId)) return badId("certificate_id");
  if (!SHORT_TEXT(note, 300)) return badId("note");
  return withAdmin((c) => api.reinstateCertificate(c, certificateId, note.trim()));
}

// ---- Dashboard, config, jobs ----------------------------------------------

export async function dashboardAction(roundId: string) {
  if (!isUuid(roundId)) return badId("round_id");
  return withAdmin((c) => api.dashboard(c, roundId));
}

export async function readConfigAction() {
  return withAdmin((c) => api.readConfig(c));
}

export async function setConfigAction(key: string, value: unknown) {
  if (typeof key !== "string" || !/^shift_round\.[a-z0-9_]+$/.test(key)) return badId("key");
  return withAdmin((c) => api.setConfig(c, key, value));
}

export async function jobsAction() {
  return withAdmin((c) => api.jobs(c));
}
