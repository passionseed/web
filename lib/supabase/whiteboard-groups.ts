import type { GroupInput, MentorGroup } from "@/lib/whiteboard/groups";
import { createAdminClient } from "@/utils/supabase/admin";

import type { Viewer } from "./whiteboards";

/**
 * Mentor groups on a board (whiteboard_groups). Admin-only under RLS: routes
 * check the caller is staff first (isQuestLead), then these use the service role.
 */

const db = () => createAdminClient();

type Row = { id: string; name: string; mentor_ids: string[] | null; student_ids: string[] | null };
const toGroup = (r: Row): MentorGroup => ({ id: r.id, name: r.name, mentorIds: r.mentor_ids ?? [], studentIds: r.student_ids ?? [] });

/** The owner, a site admin, or staff on the board: who may see and change its groups. */
export async function isQuestLead(boardId: string, viewer: Viewer): Promise<boolean> {
  if (viewer.isAdmin) return true;
  const [{ data: board }, { data: member }] = await Promise.all([
    db().from("whiteboards").select("owner_id").eq("id", boardId).maybeSingle(),
    db().from("whiteboard_members").select("quest_reviewer").eq("whiteboard_id", boardId).eq("user_id", viewer.id).maybeSingle(),
  ]);
  return board?.owner_id === viewer.id || Boolean(member?.quest_reviewer);
}

/** A board's groups, oldest first. Empty until the migration is applied (table missing, 42P01). */
export async function listGroups(boardId: string): Promise<MentorGroup[]> {
  const { data, error } = await db()
    .from("whiteboard_groups")
    .select("id, name, mentor_ids, student_ids")
    .eq("whiteboard_id", boardId)
    .order("created_at");
  if (error?.code === "42P01") return [];
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toGroup);
}

export async function createGroup(boardId: string, by: string, input: GroupInput): Promise<MentorGroup> {
  const { data, error } = await db()
    .from("whiteboard_groups")
    .insert({ whiteboard_id: boardId, name: input.name, mentor_ids: input.mentorIds, student_ids: input.studentIds, created_by: by })
    .select("id, name, mentor_ids, student_ids")
    .single();
  if (error) throw error;
  return toGroup(data as Row);
}

/** Changes a group on this board; null when there is no such group here. */
export async function updateGroup(boardId: string, groupId: string, input: GroupInput): Promise<MentorGroup | null> {
  const { data, error } = await db()
    .from("whiteboard_groups")
    .update({ name: input.name, mentor_ids: input.mentorIds, student_ids: input.studentIds, updated_at: new Date().toISOString() })
    .eq("whiteboard_id", boardId)
    .eq("id", groupId)
    .select("id, name, mentor_ids, student_ids")
    .maybeSingle();
  if (error) throw error;
  return data ? toGroup(data as Row) : null;
}

export async function deleteGroup(boardId: string, groupId: string): Promise<void> {
  const { error } = await db().from("whiteboard_groups").delete().eq("whiteboard_id", boardId).eq("id", groupId);
  if (error) throw error;
}
