import {
  canReplaceRound,
  deal,
  decideAction,
  gameActionSchema,
  gameStartSchema,
  toGameView,
  type GamePlayerRow,
  type GameRoundRow,
  type SpyfallLocation,
} from "./games";

const LOCATIONS: SpyfallLocation[] = [
  { name: "โรงเรียน · School", roles: ["ครู", "นักเรียน", "ภารโรง"] },
  { name: "โรงพยาบาล · Hospital", roles: ["หมอ", "พยาบาล"] },
];

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ids = (count: number) => Array.from({ length: count }, (_, i) => uuid(i + 1));

/** A seeded rng so failures reproduce. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("deal", () => {
  it.each([
    [3, 1],
    [6, 2],
    [12, 3],
  ])("deals %i players with %i spies", (count, spies) => {
    for (let seed = 1; seed <= 25; seed++) {
      const result = deal(LOCATIONS, ids(count), spies, seeded(seed));
      expect(result.players).toHaveLength(count);
      expect(result.players.filter((p) => p.isSpy)).toHaveLength(spies);
      expect(new Set(result.players.map((p) => p.seat)).size).toBe(count);
      expect(new Set(result.players.map((p) => p.userId))).toEqual(new Set(ids(count)));
      const place = LOCATIONS.find((l) => l.name === result.location);
      expect(place).toBeDefined();
      for (const p of result.players) {
        if (p.isSpy) expect(p.role).toBeNull();
        else expect(place!.roles).toContain(p.role);
      }
    }
  });

  it("uses every role before repeating one", () => {
    const result = deal([LOCATIONS[0], LOCATIONS[0]], ids(4), 1, seeded(7));
    const roles = result.players.filter((p) => !p.isSpy).map((p) => p.role);
    expect(new Set(roles).size).toBe(3);
  });

  it("refuses as many spies as players", () => {
    expect(() => deal(LOCATIONS, ids(3), 3)).toThrow();
  });
});

describe("schemas", () => {
  const start = { locations: LOCATIONS, playerIds: ids(3), spyCount: 1, seconds: 480 };

  it("accepts a valid start and rejects rule breaks", () => {
    expect(gameStartSchema.safeParse(start).success).toBe(true);
    expect(gameStartSchema.safeParse({ ...start, spyCount: 3 }).success).toBe(false);
    expect(gameStartSchema.safeParse({ ...start, playerIds: [uuid(1), uuid(1), uuid(2)] }).success).toBe(false);
    expect(gameStartSchema.safeParse({ ...start, seconds: 30 }).success).toBe(false);
    expect(gameStartSchema.safeParse({ ...start, locations: [LOCATIONS[0]] }).success).toBe(false);
    expect(gameStartSchema.safeParse({ ...start, extra: 1 }).success).toBe(false);
  });

  it("parses each action", () => {
    expect(gameActionSchema.safeParse({ action: "vote", targetId: uuid(2) }).success).toBe(true);
    expect(gameActionSchema.safeParse({ action: "guess", location: "School" }).success).toBe(true);
    expect(gameActionSchema.safeParse({ action: "phase", phase: "playing" }).success).toBe(false);
  });
});

const HOST = uuid(1);
const SPY = uuid(2);
const AGENT = uuid(3);
const OUTSIDER = uuid(9);

const round = (over: Partial<GameRoundRow> = {}): GameRoundRow => ({
  id: "round-1",
  host_id: HOST,
  phase: "playing",
  locations: LOCATIONS,
  location: LOCATIONS[0].name,
  spy_count: 1,
  round_seconds: 480,
  round_ends_at: "2026-11-10T12:08:00.000Z",
  version: 3,
  spy_guess_by: null,
  spy_guess: null,
  spy_guess_correct: null,
  created_at: "2026-11-10T12:00:00.000Z",
  ...over,
});

const players: GamePlayerRow[] = [
  { user_id: AGENT, seat: 2, is_spy: false, role: "ครู", vote_for: SPY },
  { user_id: HOST, seat: 0, is_spy: false, role: "นักเรียน", vote_for: null },
  { user_id: SPY, seat: 1, is_spy: true, role: null, vote_for: null },
];

const names = { [HOST]: { name: "Host", avatarUrl: null } };

describe("toGameView privacy", () => {
  it("shows nobody a round that has ended", () => {
    expect(toGameView(round({ phase: "ended" }), players, HOST, names)).toEqual({ round: null, me: null });
    expect(toGameView(null, [], HOST, names)).toEqual({ round: null, me: null });
  });

  it("gives a non-player no card and no answer", () => {
    const view = toGameView(round(), players, OUTSIDER, names);
    expect(view.me).toBeNull();
    expect(view.round?.reveal).toBeNull();
    expect(JSON.stringify(view)).not.toContain("ครู");
  });

  it("tells a spy only that they are the spy", () => {
    const view = toGameView(round(), players, SPY, names);
    expect(view.me).toEqual({ spy: true, seat: 1, voteFor: null });
    expect(view.round?.reveal).toBeNull();
  });

  it("gives an agent their own location and role only", () => {
    const view = toGameView(round(), players, AGENT, names);
    expect(view.me).toEqual({ spy: false, seat: 2, location: LOCATIONS[0].name, role: "ครู", voteFor: SPY });
    expect(JSON.stringify(view)).not.toContain("นักเรียน");
  });

  it("never leaks who the spies are or who voted for whom before the reveal", () => {
    const view = toGameView(round({ phase: "voting" }), players, HOST, names);
    expect(view.round?.reveal).toBeNull();
    for (const p of view.round?.players ?? []) {
      expect(Object.keys(p).sort()).toEqual(["avatarUrl", "name", "seat", "userId", "voted"]);
    }
    expect(view.round?.players.map((p) => [p.seat, p.voted])).toEqual([
      [0, false],
      [1, false],
      [2, true],
    ]);
    expect(view.round?.players[0].name).toBe("Host");
    expect(view.round?.players[1].name).toBe("Someone");
  });

  it("reveals the answer, spies, votes and guess once revealed", () => {
    const view = toGameView(
      round({ phase: "revealed", spy_guess_by: SPY, spy_guess: LOCATIONS[1].name, spy_guess_correct: false }),
      players,
      OUTSIDER,
      names
    );
    expect(view.round?.reveal).toEqual({
      location: LOCATIONS[0].name,
      spyIds: [SPY],
      votes: { [AGENT]: SPY },
      spyGuess: { userId: SPY, location: LOCATIONS[1].name, correct: false },
    });
    expect(view.me).toBeNull();
  });
});

describe("decideAction", () => {
  it("lets players vote for another player while the round is open", () => {
    expect(decideAction(round(), players, AGENT, false, { action: "vote", targetId: SPY })).toMatchObject({ ok: true, kind: "vote" });
    expect(decideAction(round(), players, OUTSIDER, false, { action: "vote", targetId: SPY })).toMatchObject({ status: 403 });
    expect(decideAction(round(), players, AGENT, false, { action: "vote", targetId: AGENT })).toMatchObject({ status: 422 });
    expect(decideAction(round({ phase: "revealed" }), players, AGENT, false, { action: "vote", targetId: SPY })).toMatchObject({ status: 409 });
  });

  it("lets only a spy guess, once, from the deck", () => {
    expect(decideAction(round(), players, SPY, false, { action: "guess", location: " โรงเรียน · school " })).toEqual({
      ok: true,
      kind: "guess",
      location: LOCATIONS[0].name,
      correct: true,
    });
    expect(decideAction(round(), players, AGENT, false, { action: "guess", location: LOCATIONS[0].name })).toMatchObject({ status: 403 });
    expect(decideAction(round({ spy_guess_by: SPY }), players, SPY, false, { action: "guess", location: LOCATIONS[0].name })).toMatchObject({ status: 409 });
    expect(decideAction(round(), players, SPY, false, { action: "guess", location: "Moon" })).toMatchObject({ status: 422 });
  });

  it("lets only the host or owner move the phase forward", () => {
    expect(decideAction(round(), players, AGENT, false, { action: "phase", phase: "voting" })).toMatchObject({ status: 403 });
    expect(decideAction(round(), players, HOST, true, { action: "phase", phase: "voting" })).toMatchObject({ ok: true });
    expect(decideAction(round({ phase: "revealed" }), players, HOST, true, { action: "phase", phase: "voting" })).toMatchObject({ status: 409 });
    expect(decideAction(round({ phase: "revealed" }), players, HOST, true, { action: "phase", phase: "ended" })).toMatchObject({ ok: true });
  });
});

describe("canReplaceRound", () => {
  const now = new Date("2026-11-10T12:30:00.000Z").getTime();
  it("lets the host or owner replace a live round, and anyone once it is stale", () => {
    expect(canReplaceRound(null, AGENT, false, now)).toBe(true);
    expect(canReplaceRound(round(), HOST, false, now)).toBe(true);
    expect(canReplaceRound(round(), AGENT, true, now)).toBe(true);
    expect(canReplaceRound(round(), AGENT, false, now)).toBe(false);
    expect(canReplaceRound(round(), AGENT, false, now + 2 * 60 * 60 * 1000)).toBe(true);
  });

  it("lets anyone replace a revealed round, or one left idle after its timer", () => {
    expect(canReplaceRound(round({ phase: "revealed" }), AGENT, false, now)).toBe(true);
    const touched = round({ updated_at: "2026-11-10T12:20:00.000Z" });
    expect(canReplaceRound(touched, AGENT, false, new Date("2026-11-10T12:45:00.000Z").getTime())).toBe(false);
    expect(canReplaceRound(touched, AGENT, false, new Date("2026-11-10T12:51:00.000Z").getTime())).toBe(true);
    expect(canReplaceRound(round(), AGENT, false, new Date("2026-11-10T12:39:00.000Z").getTime())).toBe(true);
  });
});
