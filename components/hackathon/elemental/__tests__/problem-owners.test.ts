import { cleanFunnelEvent } from "@/lib/hackathon/elemental/funnel";

import {
  boardCounts,
  buildBoard,
  DEMO_OWNER_PROBLEMS,
  OWNER_PROBLEMS,
  ownerTileKey,
  type OwnerProblem,
} from "../problem-owners";
import { ELEMENT_CHAPTERS } from "../media";

const thaiText = (p: OwnerProblem) => [p.ownerTh, p.ownerRoleTh, p.titleTh, p.bodyTh, p.askTh].filter(Boolean) as string[];

describe("problem owners", () => {
  const all = [...OWNER_PROBLEMS, ...DEMO_OWNER_PROBLEMS];

  it("gives every owner a link-safe, unique id", () => {
    for (const p of all) expect(p.id).toMatch(/^[a-z0-9_]+$/);
    expect(new Set(all.map(ownerTileKey)).size).toBe(all.length);
  });

  it("keeps real owners real: confirmed with a date, never a sample", () => {
    for (const p of OWNER_PROBLEMS) {
      expect(p.demo).toBeUndefined();
      expect(p.confirmed.by).not.toBe("demo");
      expect(p.confirmed.on).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const p of DEMO_OWNER_PROBLEMS) expect(p.demo).toBe(true);
  });

  it("links only to https pages and serves clips from our own folder", () => {
    for (const p of OWNER_PROBLEMS) {
      if (p.ownerUrl) expect(p.ownerUrl).toMatch(/^https:\/\//);
      if (p.clip) expect(p.clip.src).toMatch(/^\/hackathon\/elemental\/owners\//);
    }
  });

  it("has no em dashes in what the page shows", () => {
    for (const p of all) for (const line of thaiText(p)) expect(line).not.toContain("—");
  });
});

describe("buildBoard", () => {
  it("has one column per element, each starting with our starter problem", () => {
    const board = buildBoard([]);
    expect(board.map((c) => c.chapter.key)).toEqual(ELEMENT_CHAPTERS.map((c) => c.key));
    for (const column of board) expect(column.tiles[0]).toMatchObject({ kind: "starter", key: column.chapter.key });
  });

  it("locks one tile in each element with no owner yet", () => {
    const board = buildBoard([]);
    for (const column of board) expect(column.tiles.map((t) => t.kind)).toEqual(["starter", "locked"]);
    expect(boardCounts(board)).toEqual({ starter: 5, owner: 0, locked: 5 });
  });

  it("unlocks an element once it has an owner", () => {
    const board = buildBoard(DEMO_OWNER_PROBLEMS);
    const water = board.find((c) => c.chapter.key === "water")!;
    expect(water.tiles.map((t) => t.kind)).toEqual(["starter", "owner"]);
    expect(water.tiles[1].key).toBe("water:demo_water");
    expect(boardCounts(board)).toEqual({ starter: 5, owner: 2, locked: 3 });
  });

  it("makes tile keys the funnel accepts as a detail", () => {
    const sid = "123e4567-e89b-42d3-a456-426614174000";
    for (const column of buildBoard(DEMO_OWNER_PROBLEMS)) {
      for (const tile of column.tiles) {
        expect(cleanFunnelEvent({ sid, step: "board_open", detail: tile.key }, "passionseed.org")).not.toBeNull();
      }
    }
  });
});
