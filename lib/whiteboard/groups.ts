import { z } from "zod";

/**
 * Mentor groups: staff split a board's students into groups, each with its
 * mentors, so a mentor's dashboard opens on their own students. Only staff
 * views use them; students never see groups.
 */
export type MentorGroup = {
  id: string;
  name: string;
  mentorIds: string[];
  studentIds: string[];
};

const ids = z.array(z.string().uuid()).max(200).transform((list) => [...new Set(list)]);

export const groupInputSchema = z
  .object({ name: z.string().trim().min(1).max(60), mentorIds: ids, studentIds: ids })
  .strict();
export type GroupInput = z.infer<typeof groupInputSchema>;

/** "mine": the groups I mentor; "all": everyone; otherwise one group's id. */
export type GroupPick = "mine" | "all" | string;

/**
 * The students a staff view is about, or null for everyone. "mine" with no
 * group of mine falls back to everyone, so a staff member without a group still
 * sees the board.
 */
export function pickedStudents(groups: readonly MentorGroup[], pick: GroupPick, meId: string): Set<string> | null {
  if (pick === "all") return null;
  const chosen = pick === "mine" ? groups.filter((g) => g.mentorIds.includes(meId)) : groups.filter((g) => g.id === pick);
  if (chosen.length === 0) return null;
  return new Set(chosen.flatMap((g) => g.studentIds));
}
