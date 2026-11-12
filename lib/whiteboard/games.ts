import { z } from "zod";

/**
 * Board games (Spyfall). Pure rules shared by the API route and the data layer:
 * schemas, the deal, and the per-viewer view. The view builder is the only
 * place that decides what a caller may see, so its privacy rules are tested.
 */

export const ROUND_STALE_MS = 2 * 60 * 60 * 1000;
/** A live round nobody has touched for this long (after its timer ran out) can be replaced by anyone. */
export const ROUND_IDLE_MS = 30 * 60 * 1000;

const label = z.string().trim().min(1).max(80);

export const spyfallLocationSchema = z.object({ name: label, roles: z.array(label).min(1).max(12) }).strict();
export type SpyfallLocation = z.infer<typeof spyfallLocationSchema>;

export const normalizeName = (name: string) => name.trim().toLocaleLowerCase();

export const gameStartSchema = z
  .object({
    locations: z.array(spyfallLocationSchema).min(2).max(80),
    playerIds: z.array(z.string().uuid()).min(3).max(32),
    spyCount: z.number().int().min(1).max(3),
    seconds: z.number().int().min(60).max(3600).nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.playerIds).size !== value.playerIds.length) {
      ctx.addIssue({ code: "custom", path: ["playerIds"], message: "Players must be unique" });
    }
    if (value.spyCount >= value.playerIds.length) {
      ctx.addIssue({ code: "custom", path: ["spyCount"], message: "Need more players than spies" });
    }
    const names = value.locations.map((l) => normalizeName(l.name));
    if (new Set(names).size !== names.length) {
      ctx.addIssue({ code: "custom", path: ["locations"], message: "Location names must be unique" });
    }
  });
export type GameStart = z.infer<typeof gameStartSchema>;

export const gameActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("vote"), targetId: z.string().uuid() }).strict(),
  z.object({ action: z.literal("guess"), location: label }).strict(),
  z.object({ action: z.literal("phase"), phase: z.enum(["voting", "revealed", "ended"]) }).strict(),
]);
export type GameAction = z.infer<typeof gameActionSchema>;

export type GamePhase = "playing" | "voting" | "revealed" | "ended";
export type LivePhase = Exclude<GamePhase, "ended">;

export type GameView = {
  round: null | {
    id: string;
    phase: LivePhase;
    hostId: string;
    hostName: string;
    roundEndsAt: string | null;
    seconds: number | null;
    version: number;
    /** Anyone on the board may deal a new round over this one (it is revealed, idle or stale). */
    replaceable: boolean;
    spyCount: number;
    locationNames: string[];
    players: { userId: string; name: string; avatarUrl: string | null; seat: number; voted: boolean }[];
    reveal: null | {
      location: string;
      spyIds: string[];
      votes: Record<string, string>;
      spyGuess: { userId: string; location: string; correct: boolean } | null;
    };
  };
  /** `voteFor` is only ever my own vote. */
  me:
    | null
    | { spy: true; seat: number; voteFor: string | null }
    | { spy: false; seat: number; location: string; role: string; voteFor: string | null };
};

/** A whiteboard_game_rounds row as the data layer selects it. */
export type GameRoundRow = {
  id: string;
  host_id: string;
  phase: GamePhase;
  locations: SpyfallLocation[];
  location: string;
  spy_count: number;
  round_seconds: number | null;
  round_ends_at: string | null;
  version: number;
  spy_guess_by: string | null;
  spy_guess: string | null;
  spy_guess_correct: boolean | null;
  created_at: string;
  updated_at?: string | null;
};

/** A whiteboard_game_players row. */
export type GamePlayerRow = {
  user_id: string;
  seat: number;
  is_spy: boolean;
  role: string | null;
  vote_for: string | null;
};

export type Names = Record<string, { name: string; avatarUrl: string | null }>;

export type DealtPlayer = { userId: string; seat: number; isSpy: boolean; role: string | null };
export type Deal = { location: string; players: DealtPlayer[] };

type Rng = () => number;

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Picks a location, shuffles seats, makes `spyCount` spies and hands every other player a role there. */
export function deal(locations: readonly SpyfallLocation[], playerIds: readonly string[], spyCount: number, rng: Rng = Math.random): Deal {
  if (locations.length === 0) throw new Error("No locations");
  if (spyCount < 1 || spyCount >= playerIds.length) throw new Error("Need more players than spies");
  const place = locations[Math.min(locations.length - 1, Math.floor(rng() * locations.length))];
  const seated = shuffle(playerIds, rng);
  const spySeats = new Set(shuffle(seated.map((_, i) => i), rng).slice(0, spyCount));
  // Hand out every role once before any repeats, reshuffling each pass.
  const roles: string[] = [];
  while (roles.length < seated.length - spyCount) roles.push(...shuffle(place.roles, rng));
  let next = 0;
  return {
    location: place.name,
    players: seated.map((userId, seat) => {
      const isSpy = spySeats.has(seat);
      return { userId, seat, isSpy, role: isSpy ? null : roles[next++] };
    }),
  };
}

const person = (names: Names, id: string) => names[id] ?? { name: "Someone", avatarUrl: null };

/** What `viewerId` may see of a round: their own card only, the answer only once revealed. */
export function toGameView(
  round: GameRoundRow | null,
  players: GamePlayerRow[],
  viewerId: string,
  names: Names,
  now = Date.now()
): GameView {
  if (!round || round.phase === "ended") return { round: null, me: null };
  const seated = [...players].sort((a, b) => a.seat - b.seat);
  const mine = seated.find((p) => p.user_id === viewerId);
  const revealed = round.phase === "revealed";
  const votes: Record<string, string> = {};
  for (const p of seated) if (p.vote_for) votes[p.user_id] = p.vote_for;
  return {
    round: {
      id: round.id,
      phase: round.phase,
      hostId: round.host_id,
      hostName: person(names, round.host_id).name,
      roundEndsAt: round.round_ends_at,
      seconds: round.round_seconds,
      version: round.version,
      replaceable: canAnyoneReplace(round, now),
      spyCount: round.spy_count,
      locationNames: round.locations.map((l) => l.name),
      players: seated.map((p) => ({
        userId: p.user_id,
        name: person(names, p.user_id).name,
        avatarUrl: person(names, p.user_id).avatarUrl,
        seat: p.seat,
        voted: Boolean(p.vote_for),
      })),
      reveal: revealed
        ? {
            location: round.location,
            spyIds: seated.filter((p) => p.is_spy).map((p) => p.user_id),
            votes,
            spyGuess:
              round.spy_guess_by && round.spy_guess
                ? { userId: round.spy_guess_by, location: round.spy_guess, correct: Boolean(round.spy_guess_correct) }
                : null,
          }
        : null,
    },
    me: !mine
      ? null
      : mine.is_spy
        ? { spy: true, seat: mine.seat, voteFor: mine.vote_for }
        : { spy: false, seat: mine.seat, location: round.location, role: mine.role ?? "", voteFor: mine.vote_for },
  };
}

/** What a valid action changes. The data layer applies it; rule failures carry an HTTP status. */
export type ActionDecision =
  | { ok: false; status: 403 | 409 | 422; error: string }
  | { ok: true; kind: "vote"; targetId: string }
  | { ok: true; kind: "guess"; location: string; correct: boolean }
  | { ok: true; kind: "phase"; phase: GamePhase };

const NEXT_PHASES: Record<LivePhase, GamePhase[]> = {
  playing: ["voting", "revealed", "ended"],
  voting: ["revealed", "ended"],
  revealed: ["ended"],
};

/** Checks an action against the round's rules. `canHost` is true for the host or the board owner. */
export function decideAction(
  round: GameRoundRow | null,
  players: GamePlayerRow[],
  viewerId: string,
  canHost: boolean,
  action: GameAction
): ActionDecision {
  if (!round || round.phase === "ended") return { ok: false, status: 409, error: "No round is live" };
  const mine = players.find((p) => p.user_id === viewerId);
  const open = round.phase === "playing" || round.phase === "voting";
  switch (action.action) {
    case "vote": {
      if (!mine) return { ok: false, status: 403, error: "Only players can vote" };
      if (!open) return { ok: false, status: 409, error: "Voting is closed" };
      if (action.targetId === viewerId) return { ok: false, status: 422, error: "Vote for someone else" };
      if (!players.some((p) => p.user_id === action.targetId)) return { ok: false, status: 422, error: "Not a player" };
      return { ok: true, kind: "vote", targetId: action.targetId };
    }
    case "guess": {
      if (!mine?.is_spy) return { ok: false, status: 403, error: "Only a spy can guess" };
      if (!open) return { ok: false, status: 409, error: "The round is over" };
      if (round.spy_guess_by) return { ok: false, status: 409, error: "A spy already guessed" };
      const picked = round.locations.find((l) => normalizeName(l.name) === normalizeName(action.location));
      if (!picked) return { ok: false, status: 422, error: "Not a location in this deck" };
      return { ok: true, kind: "guess", location: picked.name, correct: normalizeName(picked.name) === normalizeName(round.location) };
    }
    case "phase": {
      if (!canHost) return { ok: false, status: 403, error: "Only the host can do that" };
      if (!NEXT_PHASES[round.phase].includes(action.phase)) return { ok: false, status: 409, error: "Cannot go back to that phase" };
      return { ok: true, kind: "phase", phase: action.phase };
    }
  }
}

/**
 * Whether anyone on the board may replace the live round, so a round whose host
 * left never gets stuck: once it is revealed, once nobody has touched it for
 * ROUND_IDLE_MS after its timer ran out, or once it is ROUND_STALE_MS old.
 */
function canAnyoneReplace(live: GameRoundRow, now: number): boolean {
  if (live.phase === "revealed") return true;
  if (now - new Date(live.created_at).getTime() > ROUND_STALE_MS) return true;
  const touched = new Date(live.updated_at ?? live.created_at).getTime();
  const endsAt = live.round_ends_at ? new Date(live.round_ends_at).getTime() : 0;
  return now - Math.max(touched, endsAt) > ROUND_IDLE_MS;
}

/** Whether a new round may replace the live one. */
export function canReplaceRound(live: GameRoundRow | null, viewerId: string, isOwner: boolean, now = Date.now()): boolean {
  if (!live || live.phase === "ended") return true;
  if (isOwner || live.host_id === viewerId) return true;
  return canAnyoneReplace(live, now);
}
