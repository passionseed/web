import { profilesById } from "@/lib/supabase/whiteboards";
import { boardTopic } from "@/lib/whiteboard/core";
import {
  canReplaceRound,
  deal,
  decideAction,
  toGameView,
  type GameAction,
  type GamePlayerRow,
  type GameRoundRow,
  type GameStart,
  type GameView,
} from "@/lib/whiteboard/games";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Board game data access (Spyfall). Tables are admin-only under RLS, so the
 * route checks the board role with guardBoard first and every call here uses
 * the service role. Only toGameView decides what a caller may see.
 */

const db = () => createAdminClient();

const ROUND_COLUMNS =
  "id, host_id, phase, locations, location, spy_count, round_seconds, round_ends_at, version, spy_guess_by, spy_guess, spy_guess_correct, created_at, updated_at";

/** A rule failure the route turns into an HTTP error. */
export type GameFailure = { ok: false; status: 403 | 409 | 422; error: string };
export type GameResult = { ok: true; view: GameView } | GameFailure;

type Live = { round: GameRoundRow | null; players: GamePlayerRow[] };

async function loadLive(boardId: string): Promise<Live> {
  const { data: round, error } = await db()
    .from("whiteboard_game_rounds")
    .select(ROUND_COLUMNS)
    .eq("whiteboard_id", boardId)
    .neq("phase", "ended")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!round) return { round: null, players: [] };
  const { data: players, error: playersError } = await db()
    .from("whiteboard_game_players")
    .select("user_id, seat, is_spy, role, vote_for")
    .eq("round_id", round.id);
  if (playersError) throw playersError;
  return { round: round as GameRoundRow, players: (players ?? []) as GamePlayerRow[] };
}

async function viewFor(live: Live, viewerId: string): Promise<GameView> {
  if (!live.round) return { round: null, me: null };
  const names = await profilesById([...new Set([live.round.host_id, ...live.players.map((p) => p.user_id)])]);
  return toGameView(live.round, live.players, viewerId, names);
}

/** How long a write waits on the realtime ping. It is best effort, so never hold the response for long. */
const PING_TIMEOUT_MS = 1500;

/**
 * Tells everyone on the board to refetch. A missed ping only delays the update; clients also poll.
 * `round` and `v` let clients skip a ping for a version they already have.
 */
async function ping(boardId: string, roundId: string, version: number): Promise<void> {
  try {
    const client = db();
    const channel = client.channel(boardTopic(boardId), { config: { private: true } });
    await channel.httpSend("plugin", { id: "spyfall", payload: { round: roundId, v: version } }, { timeout: PING_TIMEOUT_MS });
    await client.removeChannel(channel);
  } catch {
    // Never fail the request over a ping.
  }
}

/** The subset of `ids` who own or are members of the board (the same people roleFor resolves without admin). */
async function boardPeople(boardId: string, ids: string[]): Promise<Set<string>> {
  const [{ data: board, error }, { data: members, error: membersError }] = await Promise.all([
    db().from("whiteboards").select("owner_id").eq("id", boardId).maybeSingle(),
    db().from("whiteboard_members").select("user_id").eq("whiteboard_id", boardId).in("user_id", ids),
  ]);
  if (error) throw error;
  if (membersError) throw membersError;
  const out = new Set<string>((members ?? []).map((m) => m.user_id as string));
  if (board && ids.includes(board.owner_id as string)) out.add(board.owner_id as string);
  return out;
}

export async function getGameView(boardId: string, viewerId: string): Promise<GameView> {
  return viewFor(await loadLive(boardId), viewerId);
}

/** Deals a new round, ending the live one. `isOwner` is canManage on the board. */
export async function startGame(boardId: string, viewerId: string, isOwner: boolean, input: GameStart): Promise<GameResult> {
  const live = await loadLive(boardId);
  if (!canReplaceRound(live.round, viewerId, isOwner)) {
    return { ok: false, status: 409, error: "A round is already live" };
  }
  const allowed = await boardPeople(boardId, input.playerIds);
  const playerIds = input.playerIds.filter((id) => allowed.has(id));
  const dropped = input.playerIds.filter((id) => !allowed.has(id));
  if (dropped.length) {
    // Say who, so the host can untick them instead of getting a card count that does not add up.
    const names = await profilesById(dropped);
    const who = dropped.map((id) => names[id]?.name ?? "Someone").join(", ");
    return { ok: false, status: 422, error: `ไม่ใช่สมาชิกบอร์ดนี้ เอาออกก่อนแจก · Not members of this board, untick them: ${who}` };
  }
  if (playerIds.length < 3) return { ok: false, status: 422, error: "Need at least 3 players on this board" };
  if (input.spyCount >= playerIds.length) return { ok: false, status: 422, error: "Need more players than spies" };

  const now = new Date();
  if (live.round) {
    const { error } = await db()
      .from("whiteboard_game_rounds")
      .update({ phase: "ended", ended_at: now.toISOString(), updated_at: now.toISOString(), version: live.round.version + 1 })
      .eq("id", live.round.id);
    if (error) throw error;
  }

  const dealt = deal(input.locations, playerIds, input.spyCount);
  const { data: round, error } = await db()
    .from("whiteboard_game_rounds")
    .insert({
      whiteboard_id: boardId,
      host_id: viewerId,
      locations: input.locations,
      location: dealt.location,
      spy_count: input.spyCount,
      round_seconds: input.seconds,
      round_ends_at: input.seconds ? new Date(now.getTime() + input.seconds * 1000).toISOString() : null,
    })
    .select(ROUND_COLUMNS)
    .single();
  if (error) {
    // The partial unique index: someone else started a round at the same moment.
    if (error.code === "23505") return { ok: false, status: 409, error: "Someone just started a round" };
    throw error;
  }

  const rows = dealt.players.map((p) => ({
    round_id: round.id as string,
    user_id: p.userId,
    seat: p.seat,
    is_spy: p.isSpy,
    role: p.role,
  }));
  const { error: playersError } = await db().from("whiteboard_game_players").insert(rows);
  if (playersError) {
    await db().from("whiteboard_game_rounds").delete().eq("id", round.id);
    throw playersError;
  }

  await ping(boardId, round.id as string, round.version as number);
  return {
    ok: true,
    view: await viewFor(
      { round: round as GameRoundRow, players: rows.map(({ round_id: _r, ...p }) => ({ ...p, vote_for: null })) },
      viewerId
    ),
  };
}

const changed: GameFailure = { ok: false, status: 409, error: "The round just changed, try again" };
const votingClosed: GameFailure = { ok: false, status: 409, error: "Voting is closed" };

const OPEN_PHASES = ["playing", "voting"];

/**
 * Bumps the round version while the round is still open, retrying if another
 * write landed first. Returns the new version, or null once voting has closed.
 * Bumping before the vote is written means a phase change the host read
 * earlier fails on the version instead of racing the vote.
 */
async function bumpOpenVersion(roundId: string, from: number): Promise<number | null> {
  let current = from;
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await db()
      .from("whiteboard_game_rounds")
      .update({ version: current + 1, updated_at: new Date().toISOString() })
      .eq("id", roundId)
      .eq("version", current)
      .in("phase", OPEN_PHASES)
      .select("version");
    if (error) throw error;
    if (data?.length) return current + 1;
    const { data: row, error: readError } = await db()
      .from("whiteboard_game_rounds")
      .select("version, phase")
      .eq("id", roundId)
      .maybeSingle();
    if (readError) throw readError;
    if (!row || !OPEN_PHASES.includes(row.phase as string)) return null;
    current = row.version as number;
  }
  throw new Error("Could not bump the round version");
}

async function isOpen(roundId: string): Promise<boolean> {
  const { data, error } = await db().from("whiteboard_game_rounds").select("phase").eq("id", roundId).maybeSingle();
  if (error) throw error;
  return Boolean(data && OPEN_PHASES.includes(data.phase as string));
}

async function setVote(roundId: string, userId: string, targetId: string | null, stamp: string | null) {
  const { error } = await db()
    .from("whiteboard_game_players")
    .update({ vote_for: targetId, voted_at: stamp })
    .eq("round_id", roundId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Applies a vote, a spy's guess or a phase change. `isOwner` is canManage on the board. */
export async function actOnGame(boardId: string, viewerId: string, isOwner: boolean, action: GameAction): Promise<GameResult> {
  const live = await loadLive(boardId);
  const canHost = isOwner || live.round?.host_id === viewerId;
  const decision = decideAction(live.round, live.players, viewerId, canHost, action);
  if (!decision.ok) return decision;
  const round = live.round as GameRoundRow;
  const stamp = new Date().toISOString();
  let version: number;

  if (decision.kind === "vote") {
    const bumped = await bumpOpenVersion(round.id, round.version);
    if (bumped === null) return votingClosed;
    const before = live.players.find((p) => p.user_id === viewerId)?.vote_for ?? null;
    await setVote(round.id, viewerId, decision.targetId, stamp);
    // The host may have revealed between the bump and the vote: put the old vote back so the tally stays as revealed.
    if (!(await isOpen(round.id))) {
      await setVote(round.id, viewerId, before, before ? stamp : null);
      return votingClosed;
    }
    version = bumped;
  } else {
    const patch =
      decision.kind === "guess"
        ? {
            spy_guess_by: viewerId,
            spy_guess: decision.location,
            spy_guess_correct: decision.correct,
            phase: "revealed",
          }
        : { phase: decision.phase, ...(decision.phase === "ended" ? { ended_at: stamp } : {}) };
    let query = db()
      .from("whiteboard_game_rounds")
      .update({ ...patch, version: round.version + 1, updated_at: stamp })
      .eq("id", round.id)
      .eq("version", round.version);
    if (decision.kind === "guess") query = query.is("spy_guess_by", null);
    const { data, error } = await query.select("id");
    if (error) throw error;
    if (!data?.length) return changed;
    version = round.version + 1;
  }

  await ping(boardId, round.id, version);
  return { ok: true, view: await getGameView(boardId, viewerId) };
}
