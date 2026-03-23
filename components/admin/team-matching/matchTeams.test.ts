import { matchTeams } from "./matchTeams";
import type { SimUser } from "./types";

const u = (id: string, name: string, preferences: string[] = []): SimUser => ({
  id,
  name,
  preferences,
});

describe("matchTeams", () => {
  it("places mutual picks in the same team", () => {
    const users = [
      u("a", "Alice", ["b"]),
      u("b", "Bob", ["a"]),
      u("c", "Carol", []),
      u("d", "Dave", []),
      u("e", "Eve", []),
    ];
    const teams = matchTeams(users);
    const aliceTeam = teams.find((t) => t.members.some((m) => m.id === "a"));
    const bobTeam = teams.find((t) => t.members.some((m) => m.id === "b"));
    expect(aliceTeam?.id).toBe(bobTeam?.id);
  });

  it("assigns all users to a team", () => {
    const users = [
      u("a", "Alice", ["b"]),
      u("b", "Bob", ["c"]),
      u("c", "Carol", ["a"]),
      u("d", "Dave", []),
      u("e", "Eve", []),
    ];
    const teams = matchTeams(users);
    const allMembers = teams.flatMap((t) => t.members.map((m) => m.id));
    expect(allMembers.sort()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("no team exceeds 5 members", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const users = ids.map((id) =>
      u(id, id, ids.filter((x) => x !== id).slice(0, 5))
    );
    const teams = matchTeams(users);
    teams.forEach((t) => expect(t.members.length).toBeLessThanOrEqual(5));
  });

  it("merges 1-2 leftover solo users into an existing team", () => {
    // mutual pair (a,b) + 1 solo (c) — solo must merge into [a,b]
    const users = [
      u("a", "A", ["b"]),
      u("b", "B", ["a"]),
      u("c", "C", []),
    ];
    const teams = matchTeams(users);
    const allMembers = teams.flatMap((t) => t.members.map((m) => m.id));
    expect(allMembers.sort()).toEqual(["a", "b", "c"]);
    expect(teams).toHaveLength(1);
    expect(teams[0].members).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(matchTeams([])).toEqual([]);
  });
});
