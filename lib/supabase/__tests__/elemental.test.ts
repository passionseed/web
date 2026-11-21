/**
 * @jest-environment node
 */
import { fullHealth } from "@/lib/elemental/island/healing";

const mockRpc = jest.fn();
const mockMaybeSingle = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mockRpc, from: mockFrom }),
}));

import {
  ELEMENTAL_EVENT_EDITION,
  getElementalPublicIsland,
  healthOf,
  resolvePublicEdition,
  toPublicPlots,
} from "../elemental";

/** Fixture snowflakes are built, never real: 9 followed by 17 digits. */
const SNOWFLAKE = "9" + "1".repeat(17);

const ROW = {
  slot: 12,
  element: "fire",
  project_name: "Clean River Map",
  counted: 4,
  lit: true,
  badges: ["first_tester", "lesson"],
  // Columns the function does not return today: none of them may reach the page.
  discord_user_id: SNOWFLAKE,
  registration_id: "00000000-0000-4000-8000-000000000001",
  member_ids: [SNOWFLAKE],
  team_id: "00000000-0000-4000-8000-000000000002",
};

let errorLog: jest.SpyInstance;
beforeEach(() => {
  mockRpc.mockReset();
  mockMaybeSingle.mockReset();
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

describe("resolvePublicEdition", () => {
  it("allows the event and the dry run only", () => {
    expect(resolvePublicEdition("elemental-dryrun")).toBe("elemental-dryrun");
    expect(resolvePublicEdition("elemental-2026")).toBe("elemental-2026");
    expect(resolvePublicEdition("other")).toBe(ELEMENTAL_EVENT_EDITION);
    expect(resolvePublicEdition(undefined)).toBe(ELEMENTAL_EVENT_EDITION);
  });
});

describe("toPublicPlots", () => {
  it("copies the public columns field by field and nothing else", () => {
    const [plot] = toPublicPlots([ROW]);
    expect(plot).toEqual({ slot: 12, element: "fire", projectName: "Clean River Map", counted: 4, lit: true, badges: 2 });
    expect(JSON.stringify(plot)).not.toMatch(/discord|registration|member|team_id|9{1}1{17}/i);
  });

  it("sorts by slot and drops rows it cannot draw, logging the field only", () => {
    const plots = toPublicPlots([
      { ...ROW, slot: 40, element: "water" },
      ROW,
      { ...ROW, slot: 0 },
      { ...ROW, slot: 201 },
      { ...ROW, slot: 7, element: "plasma", project_name: "Hidden name" },
      { ...ROW, project_name: "Repeated slot" },
      null,
      "row",
    ]);
    expect(plots.map((p) => p.slot)).toEqual([12, 40]);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("Hidden name");
  });

  it("reads odd values safely", () => {
    const [plot] = toPublicPlots([{ slot: 3, element: "air", project_name: null, counted: -2, lit: "yes", badges: null }]);
    expect(plot).toEqual({ slot: 3, element: "air", projectName: "", counted: 0, lit: false, badges: 0 });
    expect(toPublicPlots(null)).toEqual([]);
  });
});

describe("healthOf", () => {
  it("is full health without settings or while healing is off (E10 stub keeps it full too)", () => {
    const plots = toPublicPlots([ROW]);
    expect(healthOf(plots, null)).toEqual(fullHealth());
    expect(healthOf(plots, { healing_enabled: false, heal_per_team: 3, heal_steps: 5 })).toEqual(fullHealth());
  });
});

describe("getElementalPublicIsland", () => {
  it("reads elemental_island_public for the edition with the service role", async () => {
    mockRpc.mockResolvedValue({ data: [ROW], error: null });
    mockMaybeSingle.mockResolvedValue({ data: { healing_enabled: false, heal_per_team: 3, heal_steps: 5 }, error: null });
    const island = await getElementalPublicIsland("elemental-dryrun");
    expect(mockRpc).toHaveBeenCalledWith("elemental_island_public", { p_edition: "elemental-dryrun" });
    expect(mockFrom).toHaveBeenCalledWith("elemental_settings");
    expect(mockSelect).toHaveBeenCalledWith("healing_enabled, heal_per_team, heal_steps");
    expect(mockEq).toHaveBeenCalledWith("edition", "elemental-dryrun");
    expect(island).toEqual({
      edition: "elemental-dryrun",
      plots: [{ slot: 12, element: "fire", projectName: "Clean River Map", counted: 4, lit: true, badges: 2 }],
      health: fullHealth(),
    });
  });

  it("gives an empty island before teams form", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getElementalPublicIsland("elemental-2026")).toEqual({ edition: "elemental-2026", plots: [], health: fullHealth() });
  });

  it("still draws when the settings cannot be read", async () => {
    mockRpc.mockResolvedValue({ data: [ROW], error: null });
    mockMaybeSingle.mockRejectedValue(new Error("down"));
    const island = await getElementalPublicIsland("elemental-2026");
    expect(island?.plots).toHaveLength(1);
    expect(island?.health).toEqual(fullHealth());
  });

  it("returns null with a code-only log when the function fails (not applied yet, database down)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "Could not find the function" } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getElementalPublicIsland("elemental-2026")).toBeNull();
    expect(errorLog).toHaveBeenCalledWith("[elemental-island] elemental_island_public failed: PGRST202");
  });

  it("returns null when the client cannot be made", async () => {
    mockRpc.mockImplementation(() => {
      throw new Error("Missing env.SUPABASE_SERVICE_ROLE_KEY");
    });
    expect(await getElementalPublicIsland("elemental-2026")).toBeNull();
    expect(errorLog).toHaveBeenCalledWith("[elemental-island] read failed: Error");
  });
});
