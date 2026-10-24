import { boardToMarkdown, summarizeElements, type SummaryComment } from "@/lib/whiteboard/summary";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Read-only access to every whiteboard for internal tools and AI agents
 * (scripts/whiteboard-read.ts). Uses the service role, so never expose it
 * through a route; the app's own access goes through lib/supabase/whiteboards.ts.
 */

export type BoardListing = {
  id: string;
  title: string;
  owner: string;
  updatedAt: string;
  elementCount: number;
  memberCount: number;
};

async function names(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await createAdminClient().from("profiles").select("id, full_name, username").in("id", ids);
  if (error) throw error;
  return new Map(
    (data ?? []).map((p) => [p.id as string, (p.full_name as string | null) || (p.username as string | null) || "Someone"]),
  );
}

export async function listAllBoards(search?: string): Promise<BoardListing[]> {
  let query = createAdminClient()
    .from("whiteboards")
    .select("id, title, owner_id, updated_at, elements, whiteboard_members(count)")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (search) query = query.ilike("title", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  const owners = await names([...new Set((data ?? []).map((b) => b.owner_id as string))]);
  return (data ?? []).map((b) => ({
    id: b.id as string,
    title: b.title as string,
    owner: owners.get(b.owner_id as string) ?? "Someone",
    updatedAt: b.updated_at as string,
    elementCount: ((b.elements as { isDeleted?: boolean }[]) ?? []).filter((e) => !e.isDeleted).length,
    memberCount: (b.whiteboard_members as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

/** A board as Markdown, or null when no board has that id. */
export async function readBoardMarkdown(boardId: string): Promise<string | null> {
  const db = createAdminClient();
  const [{ data: board, error }, { data: members }, { data: comments }] = await Promise.all([
    db.from("whiteboards").select("id, title, owner_id, updated_at, elements").eq("id", boardId).maybeSingle(),
    db.from("whiteboard_members").select("user_id").eq("whiteboard_id", boardId),
    db
      .from("whiteboard_comments")
      .select("id, parent_id, author_id, body, resolved_at, created_at")
      .eq("whiteboard_id", boardId)
      .order("created_at"),
  ]);
  if (error) throw error;
  if (!board) return null;

  const people = await names([
    ...new Set([
      board.owner_id as string,
      ...(members ?? []).map((m) => m.user_id as string),
      ...(comments ?? []).map((c) => c.author_id as string),
    ]),
  ]);
  const who = (id: string) => people.get(id) ?? "Someone";

  const threads: SummaryComment[] = (comments ?? [])
    .filter((c) => !c.parent_id)
    .map((c) => ({
      author: who(c.author_id as string),
      body: c.body as string,
      createdAt: c.created_at as string,
      resolved: Boolean(c.resolved_at),
      replies: (comments ?? [])
        .filter((r) => r.parent_id === c.id)
        .map((r) => ({ author: who(r.author_id as string), body: r.body as string, createdAt: r.created_at as string })),
    }));

  return boardToMarkdown(
    {
      title: board.title as string,
      owner: who(board.owner_id as string),
      updatedAt: (board.updated_at as string).slice(0, 16).replace("T", " "),
      members: (members ?? []).map((m) => who(m.user_id as string)),
    },
    summarizeElements((board.elements as unknown[]) ?? []),
    threads,
  );
}
