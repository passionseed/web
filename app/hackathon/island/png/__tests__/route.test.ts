/**
 * @jest-environment node
 */
import { PNG } from "pngjs";

import { PICTURE_SIZE } from "@/components/hackathon/elemental/island/model";
import { fullHealth } from "@/lib/elemental/island/healing";
import type { ElementalPublicEdition, ElementalPublicIsland, ElementalPublicPlot } from "@/lib/supabase/elemental";

const mockIsland = jest.fn<Promise<ElementalPublicIsland | null>, [ElementalPublicEdition]>();

jest.mock("@/lib/supabase/elemental", () => ({
  ...jest.requireActual("@/lib/supabase/elemental"),
  getElementalPublicIsland: (edition: ElementalPublicEdition) => mockIsland(edition),
}));

import { GET, dynamic, runtime } from "../route";

/** Words that would mean a person, an account or a sign-up leaked into the response. */
const FORBIDDEN = /discord|registration|member/i;

const ELEMENTS = ["water", "earth", "air", "fire", "aether"] as const;

function island(n: number, edition: ElementalPublicEdition = "elemental-2026"): ElementalPublicIsland {
  const plots: ElementalPublicPlot[] = Array.from({ length: n }, (_, k) => ({
    slot: k + 1,
    element: ELEMENTS[k % 5],
    projectName: `Project ${k + 1}`,
    counted: k % 9,
    lit: k % 3 === 0,
    badges: k % 4,
  }));
  return { edition, plots, health: fullHealth() };
}

function get(query = ""): Promise<Response> {
  return GET(new Request(`http://localhost/hackathon/island/png${query}`));
}

async function decode(res: Response): Promise<{ png: PNG; bytes: Buffer }> {
  const bytes = Buffer.from(await res.arrayBuffer());
  return { png: PNG.sync.read(bytes), bytes };
}

function expectNoPeople(res: Response, body: Buffer | string) {
  const text = typeof body === "string" ? body : body.toString("latin1");
  expect(text).not.toMatch(FORBIDDEN);
  for (const [name, value] of res.headers) expect(`${name}: ${value}`).not.toMatch(FORBIDDEN);
}

let errorLog: jest.SpyInstance;
beforeEach(() => {
  mockIsland.mockReset();
  errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorLog.mockRestore());

describe("GET /hackathon/island/png", () => {
  it("runs in Node at request time (the compositor uses node:zlib)", () => {
    expect(runtime).toBe("nodejs");
    expect(dynamic).toBe("force-dynamic");
  });

  it("draws the landscape island by default, public and cached for 60 s", async () => {
    mockIsland.mockResolvedValue(island(30));
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
    const { png, bytes } = await decode(res);
    expect([png.width, png.height]).toEqual([1600, 896]);
    expect({ width: png.width, height: png.height }).toEqual(PICTURE_SIZE.landscape);
    expectNoPeople(res, bytes);
    expect(mockIsland).toHaveBeenCalledWith("elemental-2026");
  });

  it("draws the portrait island when asked", async () => {
    mockIsland.mockResolvedValue(island(30));
    const { png } = await decode(await get("?layout=portrait&v=abc"));
    expect([png.width, png.height]).toEqual([896, 1600]);
    expect({ width: png.width, height: png.height }).toEqual(PICTURE_SIZE.portrait);
  });

  it("draws the plaza alone for an edition with no teams", async () => {
    mockIsland.mockResolvedValue(island(0));
    const res = await get();
    expect(res.status).toBe(200);
    const { png, bytes } = await decode(res);
    expect(png.width).toBe(1600);
    expectNoPeople(res, bytes);
  });

  it("shows only public editions: the dry run on request, anything else falls back to the event", async () => {
    mockIsland.mockResolvedValue(island(2, "elemental-dryrun"));
    await get("?edition=elemental-dryrun");
    expect(mockIsland).toHaveBeenLastCalledWith("elemental-dryrun");
    await get("?edition=someone-elses-edition");
    expect(mockIsland).toHaveBeenLastCalledWith("elemental-2026");
  });

  it("answers 503 in a few words when the island cannot be read", async () => {
    mockIsland.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.text();
    expect(body).toBe("unavailable");
    expectNoPeople(res, body);
  });

  it("answers 500 when a plot cannot be drawn, logging a code and never the project", async () => {
    const bad = island(2);
    bad.plots[1] = { ...bad.plots[1], slot: 1, projectName: "Secret project" };
    mockIsland.mockResolvedValue(bad);
    const res = await get();
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toBe("picture failed");
    expectNoPeople(res, body);
    expect(errorLog).toHaveBeenCalledWith("[elemental-island] picture failed: ElementalSceneError:duplicate_slot");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("Secret project");
  });
});
