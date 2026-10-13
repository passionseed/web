"use client";

import { listRoundsAction } from "@/app/admin/shift/rounds/actions";
import type { AdminResult, AdminRoundListItem } from "@/lib/shift-round/admin/types";

import { useAdminQuery } from "./useAdminData";

/** One round from `shift_round_admin_rounds` (there is no single-round RPC). */
export function useRound(roundId: string) {
  return useAdminQuery<AdminRoundListItem>(async (): Promise<AdminResult<AdminRoundListItem>> => {
    const result = await listRoundsAction();
    if (!result.ok) return result;
    const round = result.data.find((r) => r.id === roundId);
    return round
      ? { ok: true, data: round }
      : { ok: false, error: { code: "round_not_found", category: "validation" } };
  }, [roundId]);
}
