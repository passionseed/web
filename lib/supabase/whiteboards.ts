import type { User } from "@supabase/supabase-js";

import { isAnonymousUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import {
  joinRole,
  type LinkAccess,
  type MemberRole,
  type PatchBoard,
  type WhiteboardRole,
} from "@/lib/whiteboard/core";

/**
 * Whiteboard data access. Tables are admin-only under RLS, so every call here
 * checks the caller's role first and then uses the service role.
 */

const db = () => createAdminClient();

export type WhiteboardSummary = {
  id: string;
  title: string;
  thumbnail: string | null;
  updatedAt: string;
  role: WhiteboardRole;
  ownerName: string;
};

export type WhiteboardMember = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: WhiteboardRole;
};

export type WhiteboardDetail = {
  id: string;
  title: string;
  elements: unknown[];
  role: WhiteboardRole;
  linkAccess: LinkAccess;
  /** Only sent to the owner. */
  shareToken: string | null;
  members: WhiteboardMember[];
  timer: BoardTimer;
};

export type BoardTimer = { endsAt: string | null; seconds: number | null };

export type Viewer = { id: string; name: string; avatarUrl: string | null; isAdmin: boolean };

/** The signed-in, non-anonymous user, or null. */
export async function getViewer(): Promise<Viewer | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || isAnonymousUser(user)) return null;
  const [profiles, { data: roles }] = await Promise.all([
    profilesById([user.id]),
    db().from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").limit(1),
  ]);
  const profile = profiles[user.id];
  return {
    id: user.id,
    name: profile?.name ?? fallbackName(user),
    avatarUrl: profile?.avatarUrl ?? null,
    isAdmin: Boolean(roles?.length),
  };
}

function fallbackName(user: User): string {
  return (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Someone";
}

async function profilesById(ids: string[]): Promise<Record<string, { name: string; avatarUrl: string | null }>> {
  if (ids.length === 0) return {};
  const { data, error } = await db().from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
  if (error) throw error;
  const out: Record<string, { name: string; avatarUrl: string | null }> = {};
  for (const p of data ?? []) {
    out[p.id as string] = {
      name: (p.full_name as string | null) || (p.username as string | null) || "Someone",
      avatarUrl: (p.avatar_url as string | null) ?? null,
    };
  }
  return out;
}

/** The viewer's role on a board, or null when they have no access. Admins can always look. */
export async function roleFor(boardId: string, viewer: Viewer): Promise<WhiteboardRole | null> {
  const [{ data: board, error }, { data: member }] = await Promise.all([
    db().from("whiteboards").select("owner_id").eq("id", boardId).maybeSingle(),
    db().from("whiteboard_members").select("role").eq("whiteboard_id", boardId).eq("user_id", viewer.id).maybeSingle(),
  ]);
  if (error) throw error;
  if (!board) return null;
  if (board.owner_id === viewer.id) return "owner";
  if (member) return member.role as MemberRole;
  return viewer.isAdmin ? "viewer" : null;
}

export async function listBoards(viewer: Viewer): Promise<WhiteboardSummary[]> {
  const { data: memberships, error: memberError } = await db()
    .from("whiteboard_members")
    .select("whiteboard_id, role")
    .eq("user_id", viewer.id);
  if (memberError) throw memberError;
  const memberRole = new Map((memberships ?? []).map((m) => [m.whiteboard_id as string, m.role as MemberRole]));

  const columns = "id, title, thumbnail, updated_at, owner_id";
  const [{ data: owned, error: ownedError }, { data: shared, error: sharedError }] = await Promise.all([
    db().from("whiteboards").select(columns).eq("owner_id", viewer.id),
    memberRole.size
      ? db().from("whiteboards").select(columns).in("id", [...memberRole.keys()])
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (ownedError) throw ownedError;
  if (sharedError) throw sharedError;

  const rows = [...(owned ?? []), ...(shared ?? [])];
  const names = await profilesById([...new Set(rows.map((r) => r.owner_id as string))]);
  return rows
    .map((r) => ({
      id: r.id as string,
      title: r.title as string,
      thumbnail: (r.thumbnail as string | null) ?? null,
      updatedAt: r.updated_at as string,
      role: r.owner_id === viewer.id ? ("owner" as const) : (memberRole.get(r.id as string) ?? "viewer"),
      ownerName: r.owner_id === viewer.id ? "You" : (names[r.owner_id as string]?.name ?? "Someone"),
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createBoard(viewer: Viewer, title?: string): Promise<string> {
  const { data, error } = await db()
    .from("whiteboards")
    .insert({ owner_id: viewer.id, ...(title ? { title } : {}) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function loadBoard(boardId: string, viewer: Viewer, role: WhiteboardRole): Promise<WhiteboardDetail | null> {
  const [{ data: board, error }, { data: members, error: membersError }] = await Promise.all([
    db().from("whiteboards").select("id, title, elements, owner_id, link_access, share_token, timer_ends_at, timer_seconds").eq("id", boardId).maybeSingle(),
    db().from("whiteboard_members").select("user_id, role").eq("whiteboard_id", boardId),
  ]);
  if (error) throw error;
  if (membersError) throw membersError;
  if (!board) return null;

  if (members?.some((m) => m.user_id === viewer.id)) {
    await db()
      .from("whiteboard_members")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("whiteboard_id", boardId)
      .eq("user_id", viewer.id);
  }

  const people = [
    { userId: board.owner_id as string, role: "owner" as WhiteboardRole },
    ...(members ?? []).map((m) => ({ userId: m.user_id as string, role: m.role as WhiteboardRole })),
  ];
  const profiles = await profilesById(people.map((p) => p.userId));

  return {
    id: board.id as string,
    title: board.title as string,
    elements: (board.elements as unknown[]) ?? [],
    role,
    linkAccess: board.link_access as LinkAccess,
    shareToken: role === "owner" ? (board.share_token as string) : null,
    members: people.map((p) => ({
      ...p,
      name: profiles[p.userId]?.name ?? "Someone",
      avatarUrl: profiles[p.userId]?.avatarUrl ?? null,
    })),
    timer: {
      endsAt: (board.timer_ends_at as string | null) ?? null,
      seconds: (board.timer_seconds as number | null) ?? null,
    },
  };
}

/** Applies a patch the caller is already allowed to make. */
export async function patchBoard(boardId: string, patch: PatchBoard): Promise<void> {
  if (patch.elements?.length) {
    const { error } = await db().rpc("whiteboard_merge_elements", { p_board: boardId, p_elements: patch.elements });
    if (error) throw error;
  }
  const fields: Record<string, unknown> = {};
  if (patch.title !== undefined) fields.title = patch.title;
  if (patch.linkAccess !== undefined) fields.link_access = patch.linkAccess;
  if (patch.thumbnail !== undefined) fields.thumbnail = patch.thumbnail;
  if (Object.keys(fields).length === 0) return;
  // Title and link changes count as edits; a fresh thumbnail alone does not reorder the list.
  if (patch.title !== undefined || patch.linkAccess !== undefined) fields.updated_at = new Date().toISOString();
  const { error } = await db().from("whiteboards").update(fields).eq("id", boardId);
  if (error) throw error;
}

export async function deleteBoard(boardId: string): Promise<void> {
  const { error } = await db().from("whiteboards").delete().eq("id", boardId);
  if (error) throw error;
}

export async function removeMember(boardId: string, userId: string): Promise<void> {
  const { error } = await db().from("whiteboard_members").delete().eq("whiteboard_id", boardId).eq("user_id", userId);
  if (error) throw error;
}

export async function setMemberRole(boardId: string, userId: string, role: MemberRole): Promise<void> {
  const { error } = await db()
    .from("whiteboard_members")
    .update({ role })
    .eq("whiteboard_id", boardId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** A new token makes every old link stop working. People who already joined stay. */
export async function rotateShareToken(boardId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await db().from("whiteboards").update({ share_token: token }).eq("id", boardId);
  if (error) throw error;
  return token;
}

export type SharePreview = { title: string; ownerName: string; memberCount: number; thumbnail: string | null };

/**
 * What a share link shows before anyone signs in (link previews in chats).
 * Only for live links: anyone holding one could open the board anyway.
 */
export async function previewByToken(token: string): Promise<SharePreview | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const { data: board, error } = await db()
    .from("whiteboards")
    .select("title, owner_id, link_access, thumbnail, whiteboard_members(count)")
    .eq("share_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!board || board.link_access === "none") return null;
  const owner = (await profilesById([board.owner_id as string]))[board.owner_id as string];
  return {
    title: board.title as string,
    ownerName: owner?.name ?? "Someone",
    // The owner is not stored as a member row.
    memberCount: ((board.whiteboard_members as { count: number }[] | null)?.[0]?.count ?? 0) + 1,
    thumbnail: (board.thumbnail as string | null) ?? null,
  };
}

export type JoinResult = { kind: "joined"; boardId: string } | { kind: "invalid" };

/** Joins a board from its share link with the role the link grants. */
export async function joinByToken(token: string, viewer: Viewer): Promise<JoinResult> {
  if (!/^[0-9a-f]{32}$/.test(token)) return { kind: "invalid" };
  const { data: board, error } = await db()
    .from("whiteboards")
    .select("id, owner_id, link_access")
    .eq("share_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!board) return { kind: "invalid" };
  const boardId = board.id as string;
  if (board.owner_id === viewer.id) return { kind: "joined", boardId };

  const { data: member } = await db()
    .from("whiteboard_members")
    .select("role")
    .eq("whiteboard_id", boardId)
    .eq("user_id", viewer.id)
    .maybeSingle();
  const role = joinRole((member?.role as MemberRole | undefined) ?? null, board.link_access as LinkAccess);
  if (!role) return { kind: "invalid" };

  const { error: upsertError } = await db()
    .from("whiteboard_members")
    .upsert(
      { whiteboard_id: boardId, user_id: viewer.id, role, last_opened_at: new Date().toISOString() },
      { onConflict: "whiteboard_id,user_id" },
    );
  if (upsertError) throw upsertError;
  return { kind: "joined", boardId };
}

export type BoardFile = { id: string; mimeType: string; dataURL: string };

export async function saveFiles(boardId: string, userId: string, files: BoardFile[]): Promise<void> {
  const { error } = await db()
    .from("whiteboard_files")
    .upsert(
      files.map((f) => ({
        whiteboard_id: boardId,
        file_id: f.id,
        mime_type: f.mimeType,
        data_url: f.dataURL,
        created_by: userId,
      })),
      { onConflict: "whiteboard_id,file_id", ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function loadFiles(boardId: string, ids: string[]): Promise<BoardFile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db()
    .from("whiteboard_files")
    .select("file_id, mime_type, data_url")
    .eq("whiteboard_id", boardId)
    .in("file_id", ids);
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.file_id as string,
    mimeType: f.mime_type as string,
    dataURL: f.data_url as string,
  }));
}

/** Starts the shared timer for `seconds`, or stops it with null. */
export async function setTimer(boardId: string, seconds: number | null): Promise<BoardTimer> {
  const timer: BoardTimer = {
    endsAt: seconds ? new Date(Date.now() + seconds * 1000).toISOString() : null,
    seconds,
  };
  const { error } = await db()
    .from("whiteboards")
    .update({ timer_ends_at: timer.endsAt, timer_seconds: timer.seconds })
    .eq("id", boardId);
  if (error) throw error;
  return timer;
}

const live = (elements: unknown): unknown[] =>
  ((elements as { isDeleted?: boolean }[] | null) ?? []).filter((el) => !el.isDeleted);

export type WhiteboardVersion = {
  id: string;
  label: string | null;
  thumbnail: string | null;
  createdAt: string;
  createdBy: string | null;
};

export async function listVersions(boardId: string): Promise<WhiteboardVersion[]> {
  const { data, error } = await db()
    .from("whiteboard_versions")
    .select("id, label, thumbnail, created_at, created_by")
    .eq("whiteboard_id", boardId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const names = await profilesById([...new Set((data ?? []).flatMap((v) => (v.created_by ? [v.created_by as string] : [])))]);
  return (data ?? []).map((v) => ({
    id: v.id as string,
    label: (v.label as string | null) ?? null,
    thumbnail: (v.thumbnail as string | null) ?? null,
    createdAt: v.created_at as string,
    createdBy: v.created_by ? (names[v.created_by as string]?.name ?? "Someone") : null,
  }));
}

/** Saves the board as it is now under a name. */
export async function createVersion(boardId: string, userId: string, label: string, thumbnail?: string): Promise<string> {
  const { data: board, error } = await db().from("whiteboards").select("elements, thumbnail").eq("id", boardId).single();
  if (error) throw error;
  const { data, error: insertError } = await db()
    .from("whiteboard_versions")
    .insert({
      whiteboard_id: boardId,
      label,
      elements: live(board.elements),
      thumbnail: thumbnail ?? board.thumbnail ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return data.id as string;
}

export async function loadVersionElements(boardId: string, versionId: string): Promise<unknown[] | null> {
  const { data, error } = await db()
    .from("whiteboard_versions")
    .select("elements")
    .eq("whiteboard_id", boardId)
    .eq("id", versionId)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.elements as unknown[]) : null;
}

/** Copies a board (or one of its versions) into a new board the viewer owns, images included. */
export async function duplicateBoard(boardId: string, viewer: Viewer, versionId?: string): Promise<string | null> {
  const { data: board, error } = await db().from("whiteboards").select("title, elements, thumbnail").eq("id", boardId).single();
  if (error) throw error;
  const elements = versionId ? await loadVersionElements(boardId, versionId) : live(board.elements);
  if (!elements) return null;

  const title = `${board.title as string} (copy)`.slice(0, 120);
  const { data: created, error: insertError } = await db()
    .from("whiteboards")
    .insert({ owner_id: viewer.id, title, elements, thumbnail: board.thumbnail })
    .select("id")
    .single();
  if (insertError) throw insertError;
  const newId = created.id as string;

  const fileIds = [
    ...new Set(
      (elements as { type?: string; fileId?: string }[]).flatMap((el) => (el.type === "image" && el.fileId ? [el.fileId] : [])),
    ),
  ];
  for (let i = 0; i < fileIds.length; i += 20) {
    const files = await loadFiles(boardId, fileIds.slice(i, i + 20));
    if (files.length) await saveFiles(newId, viewer.id, files);
  }
  return newId;
}

export type WhiteboardComment = {
  id: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  x: number | null;
  y: number | null;
  body: string;
  resolvedAt: string | null;
  createdAt: string;
};

export async function listComments(boardId: string): Promise<WhiteboardComment[]> {
  const { data, error } = await db()
    .from("whiteboard_comments")
    .select("id, parent_id, author_id, x, y, body, resolved_at, created_at")
    .eq("whiteboard_id", boardId)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (error) throw error;
  const profiles = await profilesById([...new Set((data ?? []).map((c) => c.author_id as string))]);
  return (data ?? []).map((c) => ({
    id: c.id as string,
    parentId: (c.parent_id as string | null) ?? null,
    authorId: c.author_id as string,
    authorName: profiles[c.author_id as string]?.name ?? "Someone",
    authorAvatar: profiles[c.author_id as string]?.avatarUrl ?? null,
    x: (c.x as number | null) ?? null,
    y: (c.y as number | null) ?? null,
    body: c.body as string,
    resolvedAt: (c.resolved_at as string | null) ?? null,
    createdAt: c.created_at as string,
  }));
}

export async function addComment(
  boardId: string,
  authorId: string,
  comment: { body: string; parentId?: string; x?: number; y?: number },
): Promise<string | null> {
  if (comment.parentId) {
    const { data: parent } = await db()
      .from("whiteboard_comments")
      .select("id, parent_id")
      .eq("id", comment.parentId)
      .eq("whiteboard_id", boardId)
      .maybeSingle();
    if (!parent || parent.parent_id) return null;
  }
  const { data, error } = await db()
    .from("whiteboard_comments")
    .insert({
      whiteboard_id: boardId,
      author_id: authorId,
      body: comment.body,
      parent_id: comment.parentId ?? null,
      x: comment.parentId ? null : comment.x,
      y: comment.parentId ? null : comment.y,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function getComment(boardId: string, commentId: string) {
  const { data, error } = await db()
    .from("whiteboard_comments")
    .select("id, author_id, parent_id")
    .eq("whiteboard_id", boardId)
    .eq("id", commentId)
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; author_id: string; parent_id: string | null } | null;
}

export async function resolveComment(commentId: string, resolved: boolean): Promise<void> {
  const { error } = await db()
    .from("whiteboard_comments")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await db().from("whiteboard_comments").delete().eq("id", commentId);
  if (error) throw error;
}
