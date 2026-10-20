import {
  clean,
  parseLink,
  POSTS_PER_DAY,
  REACTIONS,
  type BoardViewer,
  type Reaction,
  type Round,
} from "@/lib/shift/alumniBoard";

import { db, displayNames } from "./core";

/** "📣 ความคืบหน้า": progress posts for the whole alumni community, with reactions. */

const FEED_SIZE = 50;

export interface FeedPost {
  id: string;
  user_id: string;
  body: string;
  link: string;
  created_at: string;
  name: string;
  team: string | null;
  reactions: { emoji: Reaction; count: number; mine: boolean }[];
  canDelete: boolean;
}

export type AddPostResult = { ok: true; id: string } | { ok: false; error: string };

export async function addPost(userId: string, input: { body: unknown; link: unknown }): Promise<AddPostResult> {
  const body = clean(input.body);
  if (!body) return { ok: false, error: "เขียนความคืบหน้าก่อนโพสต์" };
  const link = parseLink(input.link);
  if (link === null) return { ok: false, error: "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://" };
  const { count, error } = await db()
    .from("shift_alumni_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if (error) throw error;
  if ((count ?? 0) >= POSTS_PER_DAY) {
    return { ok: false, error: `โพสต์ได้วันละ ${POSTS_PER_DAY} ครั้ง พักก่อน แล้วพรุ่งนี้มาเล่าต่อนะ` };
  }
  const { data, error: insertError } = await db()
    .from("shift_alumni_posts")
    .insert({ user_id: userId, body, link })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return { ok: true, id: data.id as string };
}

export async function toggleReaction(userId: string, postId: string, emoji: Reaction): Promise<void> {
  const { data, error } = await db()
    .from("shift_alumni_reactions")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .select("post_id");
  if (error) throw error;
  if ((data ?? []).length) return;
  const { error: insertError } = await db()
    .from("shift_alumni_reactions")
    .upsert({ post_id: postId, user_id: userId, emoji }, { onConflict: "post_id,user_id,emoji", ignoreDuplicates: true });
  if (insertError) throw insertError;
}

/** Authors and mentors only. False when the post is gone or not theirs. */
export async function deletePost(viewer: BoardViewer, postId: string): Promise<boolean> {
  let query = db().from("shift_alumni_posts").delete().eq("id", postId);
  if (viewer.role !== "mentor") query = query.eq("user_id", viewer.userId);
  const { data, error } = await query.select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function feedPosts(viewer: BoardViewer, limit = FEED_SIZE): Promise<FeedPost[]> {
  const { data, error } = await db()
    .from("shift_alumni_posts")
    .select("id, user_id, body, link, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const posts = (data ?? []) as Omit<FeedPost, "name" | "team" | "reactions" | "canDelete">[];
  if (posts.length === 0) return [];

  const userIds = posts.map((p) => p.user_id);
  const [names, reactions, members] = await Promise.all([
    displayNames(userIds),
    db()
      .from("shift_alumni_reactions")
      .select("post_id, user_id, emoji")
      .in(
        "post_id",
        posts.map((p) => p.id),
      ),
    db().from("shift_alumni_members").select("user_id, shift_alumni_teams(name)").in("user_id", userIds),
  ]);
  if (reactions.error) throw reactions.error;
  if (members.error) throw members.error;
  const teamByUser: Record<string, string | null> = {};
  for (const m of members.data ?? []) {
    teamByUser[m.user_id as string] = (m.shift_alumni_teams as unknown as { name: string } | null)?.name ?? null;
  }
  const reactionRows = (reactions.data ?? []) as { post_id: string; user_id: string; emoji: Reaction }[];

  return posts.map((p) => {
    const rows = reactionRows.filter((r) => r.post_id === p.id);
    return {
      ...p,
      name: names[p.user_id],
      team: teamByUser[p.user_id] ?? null,
      reactions: REACTIONS.map((emoji) => {
        const mine = rows.filter((r) => r.emoji === emoji);
        return { emoji, count: mine.length, mine: mine.some((r) => r.user_id === viewer.userId) };
      }),
      canDelete: p.user_id === viewer.userId || viewer.role === "mentor",
    };
  });
}

/** For the home card: just the newest few. */
export async function recentPosts(limit = 3): Promise<{ id: string; body: string; name: string }[]> {
  const { data, error } = await db()
    .from("shift_alumni_posts")
    .select("id, user_id, body")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as { id: string; user_id: string; body: string }[];
  const names = await displayNames(rows.map((r) => r.user_id));
  return rows.map((r) => ({ id: r.id, body: r.body, name: names[r.user_id] }));
}

/** Posts this round, and how many students posted. */
export async function postStats(round: Round, studentIds: Set<string>): Promise<{ posts: number; posters: number }> {
  const { data, error } = await db()
    .from("shift_alumni_posts")
    .select("user_id")
    .gte("created_at", new Date(round.started_at).toISOString());
  if (error) throw error;
  const rows = (data ?? []) as { user_id: string }[];
  return { posts: rows.length, posters: new Set(rows.map((r) => r.user_id).filter((id) => studentIds.has(id))).size };
}
