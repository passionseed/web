"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { BOARD_PATH } from "@/lib/shift/alumniBoard";
import { currentShiftAdmin } from "@/lib/shift/admin";
import { createTeam, setMemberTeam, startRound } from "@/lib/supabase/shift-alumni-board/mentor";

/** Mentor tools for the alumni board: teams, who is in them, and rounds. Admins only. */

export type MentorActionResult = { ok: true } | { ok: false; error: string };

const uuid = z.string().uuid();

async function asAdmin(run: (adminId: string) => Promise<MentorActionResult | void>): Promise<MentorActionResult> {
  const admin = await currentShiftAdmin();
  if (!admin) return { ok: false, error: "Admins only." };
  try {
    const result = await run(admin.user.id);
    if (result && !result.ok) return result;
    revalidatePath("/admin/shift/alumni/board");
    revalidatePath(BOARD_PATH, "layout");
    return { ok: true };
  } catch (error) {
    console.error("Alumni board mentor action failed:", error);
    return { ok: false, error: "Failed to save. Try again." };
  }
}

export async function createTeamAction(name: string) {
  return asAdmin(async () => {
    if (!(await createTeam(name))) return { ok: false, error: "The team needs a name." };
  });
}

export async function setMemberTeamAction(userId: string, teamId: string | null) {
  return asAdmin(async () => {
    if (!uuid.safeParse(userId).success) return { ok: false, error: "Unknown member." };
    if (teamId !== null && !uuid.safeParse(teamId).success) return { ok: false, error: "Unknown team." };
    await setMemberTeam(userId, teamId);
  });
}

/** Run at each alumni session. */
export async function startRoundAction() {
  return asAdmin((adminId) => startRound(adminId));
}
