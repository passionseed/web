import {
  buildHackathonTeams,
  type HackathonMatchingParticipant,
} from "./team-matching";

function participant(
  id: string,
  rankedParticipantIds: string[] = [],
  overrides: Partial<HackathonMatchingParticipant> = {}
): HackathonMatchingParticipant {
  return {
    id,
    name: id.toUpperCase(),
    rankedParticipantIds,
    problemPreferences: [],
    teamRolePreference: null,
    ...overrides,
  };
}

describe("buildHackathonTeams", () => {
  it("keeps top mutual rankings together", () => {
    const teams = buildHackathonTeams([
      participant("a", ["b", "c"]),
      participant("b", ["a", "d"]),
      participant("c", ["d", "a"]),
      participant("d", ["c", "b"]),
      participant("e", []),
      participant("f", []),
    ]);

    const abTeam = teams.find((team) => team.memberIds.includes("a"));
    expect(abTeam?.memberIds).toContain("b");
  });

  it("assigns everyone exactly once", () => {
    const teams = buildHackathonTeams([
      participant("a", ["b"]),
      participant("b", ["c"]),
      participant("c", ["a"]),
      participant("d", []),
      participant("e", []),
      participant("f", []),
      participant("g", []),
    ]);

    const memberIds = teams.flatMap((team) => team.memberIds).sort();
    expect(memberIds).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
  });

  it("produces valid 3-5 team sizes when possible", () => {
    const teams = buildHackathonTeams([
      participant("a"),
      participant("b"),
      participant("c"),
      participant("d"),
      participant("e"),
      participant("f"),
      participant("g"),
    ]);

    const sizes = teams.map((team) => team.memberIds.length).sort();
    expect(sizes).toEqual([3, 4]);
  });

  it("uses questionnaire overlap as fallback for isolated participants", () => {
    const teams = buildHackathonTeams([
      participant("a", ["b"], { problemPreferences: ["ai"], teamRolePreference: "builder" }),
      participant("b", ["a"], { problemPreferences: ["ai"], teamRolePreference: "designer" }),
      participant("c", [], { problemPreferences: ["climate"], teamRolePreference: "operator" }),
      participant("d", [], { problemPreferences: ["climate"], teamRolePreference: "researcher" }),
      participant("e", [], { problemPreferences: ["ai"], teamRolePreference: "operator" }),
      participant("f", [], { problemPreferences: ["health"], teamRolePreference: "researcher" }),
    ]);

    const aiTeam = teams.find((team) => team.memberIds.includes("a"));
    expect(aiTeam?.memberIds).toContain("b");
    expect(aiTeam?.memberIds).toContain("e");
  });

  it("returns no teams for empty input", () => {
    expect(buildHackathonTeams([])).toEqual([]);
  });
});
