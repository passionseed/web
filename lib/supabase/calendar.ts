import { loadAlumniCalendar } from "@/lib/supabase/shift-alumni-calendar";
import { profilesById, type Viewer } from "@/lib/supabase/whiteboards";
import { alumniCalendar, sessionDetails } from "@/lib/content/shift-alumni";
import { addDays, bangkokInstant, blockInputSchema, type CalendarBlock } from "@/lib/calendar/core";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Community calendar data. Tables are admin-only under RLS; every signed-in
 * person may read all blocks and add their own, so the checks live here and
 * the service role does the work (same pattern as whiteboards).
 */

const db = () => createAdminClient();

/** A team meeting has a start only; show it as this long. */
const TEAM_MEETING_MINUTES = 30;

type BlockRow = {
  id: string;
  title: string;
  kind: CalendarBlock["kind"];
  starts_at: string;
  ends_at: string;
  place: string | null;
  note: string | null;
  whiteboard_id: string | null;
  created_by: string;
  calendar_block_people: { user_id: string }[] | null;
  whiteboards: { share_token: string; link_access: string } | null;
};

/** Blocks between two Bangkok dates (inclusive), plus the alumni sessions and the viewer's team meetings. */
export async function listBlocks(viewer: Viewer, fromDate: string, toDate: string): Promise<CalendarBlock[]> {
  const from = bangkokInstant(fromDate, "00:00");
  const to = bangkokInstant(addDays(toDate, 1), "00:00");
  const [{ data, error }, alumni, team] = await Promise.all([
    db()
      .from("calendar_blocks")
      .select(
        "id, title, kind, starts_at, ends_at, place, note, whiteboard_id, created_by, calendar_block_people(user_id), whiteboards(share_token, link_access)",
      )
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at"),
    alumniBlocks(fromDate, toDate).catch(() => []),
    teamBlocks(viewer.id, from, to).catch(() => []),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as unknown as BlockRow[];

  const ids = new Set(rows.flatMap((r) => [r.created_by, ...(r.calendar_block_people ?? []).map((p) => p.user_id)]));
  const profiles = await profilesById([...ids]);
  const person = (userId: string) => ({
    userId,
    name: profiles[userId]?.name ?? "Someone",
    avatarUrl: profiles[userId]?.avatarUrl ?? null,
  });

  const blocks: CalendarBlock[] = rows.map((r) => {
    const people = (r.calendar_block_people ?? []).map((p) => person(p.user_id));
    const board = r.whiteboards;
    return {
      id: r.id,
      source: "block",
      kind: r.kind,
      title: r.title,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      place: r.place,
      note: r.note,
      boardUrl: board && board.link_access !== "none" ? `/whiteboard/join/${board.share_token}` : null,
      createdBy: person(r.created_by),
      people,
      joined: people.some((p) => p.userId === viewer.id),
      canEdit: viewer.isAdmin || r.created_by === viewer.id,
    };
  });
  return [...blocks, ...alumni, ...team].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

async function alumniBlocks(fromDate: string, toDate: string): Promise<CalendarBlock[]> {
  const { doc } = await loadAlumniCalendar();
  const { upcoming, past } = alumniCalendar(doc, fromDate);
  return [...past, ...upcoming]
    .filter((s) => !s.cancelled && s.date >= fromDate && s.date <= toDate)
    .flatMap((s) => {
      const { startTime, endTime, place } = sessionDetails(s, doc.defaults);
      if (!startTime || !endTime) return [];
      return [
        {
          id: `alumni-${s.date}`,
          source: "alumni" as const,
          kind: "alumni" as const,
          title: s.topic ? `SHIFT Alumni: ${s.topic}` : "SHIFT Alumni session",
          startsAt: bangkokInstant(s.date, startTime),
          endsAt: bangkokInstant(s.date, endTime),
          place: place || null,
          note: s.note || null,
          boardUrl: null,
          createdBy: null,
          people: [],
          joined: false,
          canEdit: false,
        },
      ];
    });
}

async function teamBlocks(userId: string, from: string, to: string): Promise<CalendarBlock[]> {
  const { data: member } = await db().from("shift_alumni_members").select("team_id").eq("user_id", userId).maybeSingle();
  if (!member?.team_id) return [];
  const [{ data: meetings }, { data: team }] = await Promise.all([
    db()
      .from("shift_alumni_meetings")
      .select("id, starts_at")
      .eq("team_id", member.team_id)
      .gte("starts_at", from)
      .lt("starts_at", to),
    db().from("shift_alumni_teams").select("name").eq("id", member.team_id).maybeSingle(),
  ]);
  return (meetings ?? []).map((m) => ({
    id: `team-${m.id}`,
    source: "team" as const,
    kind: "team" as const,
    title: `ประชุมทีม ${team?.name ?? ""}`.trim(),
    startsAt: m.starts_at as string,
    endsAt: new Date(Date.parse(m.starts_at as string) + TEAM_MEETING_MINUTES * 60_000).toISOString(),
    place: null,
    note: null,
    boardUrl: "/shift/alumni/board/team",
    createdBy: null,
    people: [],
    joined: false,
    canEdit: false,
  }));
}

/** Validated block fields as table columns, or an error message. */
export function blockColumns(input: unknown): { ok: true; columns: Record<string, unknown> } | { ok: false; error: string } {
  const parsed = blockInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the block" };
  const b = parsed.data;
  return {
    ok: true,
    columns: {
      title: b.title,
      kind: b.kind,
      starts_at: bangkokInstant(b.date, b.start),
      ends_at: bangkokInstant(b.date, b.end),
      place: b.place,
      note: b.note,
      ...(b.whiteboardId !== undefined ? { whiteboard_id: b.whiteboardId } : {}),
    },
  };
}

export async function createBlock(viewer: Viewer, columns: Record<string, unknown>): Promise<string> {
  const { data, error } = await db()
    .from("calendar_blocks")
    .insert({ ...columns, created_by: viewer.id })
    .select("id")
    .single();
  if (error) throw error;
  // Whoever makes a block is in it.
  await db().from("calendar_block_people").upsert({ block_id: data.id, user_id: viewer.id });
  return data.id as string;
}

/** The block's creator, or null when there is no such block. */
export async function blockOwner(blockId: string): Promise<string | null> {
  const { data, error } = await db().from("calendar_blocks").select("created_by").eq("id", blockId).maybeSingle();
  if (error) throw error;
  return (data?.created_by as string | undefined) ?? null;
}

export async function updateBlock(blockId: string, columns: Record<string, unknown>): Promise<void> {
  const { error } = await db()
    .from("calendar_blocks")
    .update({ ...columns, updated_at: new Date().toISOString() })
    .eq("id", blockId);
  if (error) throw error;
}

export async function deleteBlock(blockId: string): Promise<void> {
  const { error } = await db().from("calendar_blocks").delete().eq("id", blockId);
  if (error) throw error;
}

export async function setJoined(blockId: string, userId: string, joined: boolean): Promise<void> {
  const { error } = joined
    ? await db().from("calendar_block_people").upsert({ block_id: blockId, user_id: userId })
    : await db().from("calendar_block_people").delete().eq("block_id", blockId).eq("user_id", userId);
  if (error) throw error;
}


/** When a block starts, for opening /calendar?block=<id> on the right week. */
export async function blockStartsAt(blockId: string): Promise<string | null> {
  const { data } = await db().from("calendar_blocks").select("starts_at").eq("id", blockId).maybeSingle();
  return (data?.starts_at as string | undefined) ?? null;
}
