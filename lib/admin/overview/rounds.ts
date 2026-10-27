import "server-only";

import { cache } from "react";

import { listRounds } from "@/lib/shift-round/admin/api";
import type { RpcClient, RpcResponse } from "@/lib/shift-round/admin/rpc";
import type { AdminRoundListItem } from "@/lib/shift-round/admin/types";
import { createClient } from "@/utils/supabase/server";

import { timeoutSignal } from "./query";

/** A row of shift_round_admin_rounds(), with the count the shared type leaves out. */
export type OverviewRound = AdminRoundListItem & { certificates_issued?: number };

/**
 * Every SHIFT round the signed-in admin can review, with entrants,
 * pending_review and certificates_issued. The RPC checks auth.uid(), so it
 * needs the SESSION client: under the service role it answers
 * "unauthenticated". Memoized per request so the queues and the SHIFT
 * snapshot share one call.
 */
export const loadOverviewRounds = cache(async (): Promise<OverviewRound[]> => {
  const session = await createClient();
  const client: RpcClient = {
    rpc: (name, args) =>
      session.rpc(name, args).abortSignal(timeoutSignal()) as unknown as PromiseLike<RpcResponse>,
  };
  const result = await listRounds(client);
  if (!result.ok) throw new Error(`shift_round_admin_rounds: ${result.error.code}`);
  return result.data as OverviewRound[];
});

/** The published round that is running or in review now, preferring the cohort's own. */
export function pickLiveRound(
  rounds: readonly OverviewRound[],
  cohortName: string | null,
): OverviewRound | null {
  const live = rounds.filter(
    (r) => r.status === "published" && (r.phase === "active" || r.phase === "review"),
  );
  if (live.length === 0) return null;
  return (
    live.find((r) => cohortName && r.application_cohort === cohortName) ??
    [...live].sort((a, b) => (b.number ?? 0) - (a.number ?? 0))[0]
  );
}

/** "Round 3: Title" for a round, falling back to whichever title exists. */
export function roundTitle(round: Pick<OverviewRound, "number" | "title_en" | "title_th">): string {
  const title = (round.title_en || round.title_th || "").trim();
  return title ? `Round ${round.number}: ${title}` : `Round ${round.number}`;
}
