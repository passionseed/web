/** @jest-environment node */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { STAGE_NAMES as BOT_STAGE_NAMES } from "@/bot/src/quests/island/copy";
import { STAGE_NAMES as WEB_STAGE_NAMES } from "@/components/shift/island/copy";
import {
  ISLAND_DAILY,
  ISLAND_QUESTS,
  ISLAND_SEASON,
  ISLAND_STAGES,
  ISLAND_TREE,
  SHIFT_ISLAND,
  islandSeasonLine,
  islandSeasonPhase,
  islandStageSprite,
} from "@/lib/content/shift-island";

const inPublic = (path: string) => existsSync(join(process.cwd(), "public", path));
/** Midday in Bangkok on the given day. */
const bangkok = (iso: string) => new Date(`${iso}T12:00:00+07:00`);

describe("SHIFT High Island copy", () => {
  it("has a tree stage for every number of quests done, each with its sprite", () => {
    expect(ISLAND_QUESTS).toHaveLength(7);
    expect(ISLAND_STAGES).toHaveLength(ISLAND_QUESTS.length + 1);
    ISLAND_STAGES.forEach((_, stage) => expect(inPublic(islandStageSprite(stage))).toBe(true));
    expect(islandStageSprite(99)).toBe(islandStageSprite(7));
    expect(inPublic(SHIFT_ISLAND.sample.src)).toBe(true);
  });

  it("counts the stages under the row of sprites from the data, empty plot apart", () => {
    // Eight sprites: the empty plot, then one per stage of growth.
    expect(SHIFT_ISLAND.stages).toContain(`${ISLAND_STAGES.length - 1} ขั้น`);
    expect(SHIFT_ISLAND.stages).toContain("แปลงว่าง");
  });

  it("starts the tree demo from quests that exist", () => {
    for (const i of ISLAND_TREE.startDone) expect(ISLAND_QUESTS[i]).toBeDefined();
    expect(new Set(ISLAND_TREE.startDone).size).toBe(ISLAND_TREE.startDone.length);
  });

  it("tells the season by the day it is read, on Bangkok time", () => {
    expect(islandSeasonPhase(bangkok("2026-11-13"))).toBe("before");
    expect(islandSeasonPhase(bangkok("2026-11-14"))).toBe("running");
    expect(islandSeasonPhase(bangkok("2026-11-28"))).toBe("running");
    expect(islandSeasonPhase(bangkok("2026-11-29"))).toBe("after");
    // 23:30 on the 13th in UTC is already kickoff morning in Bangkok.
    expect(islandSeasonPhase(new Date("2026-11-13T23:30:00Z"))).toBe("running");
    expect(ISLAND_SEASON.kickoff < ISLAND_SEASON.lastDay).toBe(true);
  });

  it("only names the kickoff date before it happens", () => {
    expect(islandSeasonLine(bangkok("2026-11-12"))).toContain("14 พ.ย.");
    expect(islandSeasonLine(bangkok("2026-11-20"))).not.toContain("14 พ.ย.");
    expect(islandSeasonLine(bangkok("2026-11-20"))).toContain("28 พ.ย.");
    expect(islandSeasonLine(bangkok("2026-12-05"))).toContain("จบเมื่อ");
  });

  it("keeps Demo day for day 7 of SHIFT: the season line never uses the words", () => {
    for (const day of ["2026-11-12", "2026-11-20", "2026-12-05"]) {
      expect(islandSeasonLine(bangkok(day))).not.toMatch(/demo/i);
    }
  });

  it("states no prize money and no leaderboard claim", () => {
    const copy = JSON.stringify([SHIFT_ISLAND, ISLAND_SEASON, ISLAND_TREE, ISLAND_DAILY, ISLAND_QUESTS]);
    expect(copy).not.toMatch(/[$฿]|Passioncoin|ลีดเดอร์บอร์ด/);
  });

  it("uses no em dashes and never says น้องๆ", () => {
    const copy = JSON.stringify([
      SHIFT_ISLAND,
      ISLAND_QUESTS,
      ISLAND_TREE,
      ISLAND_DAILY,
      ISLAND_SEASON,
      islandSeasonLine(bangkok("2026-11-12")),
    ]);
    expect(copy).not.toMatch(/—|น้องๆ|น้อง ๆ/);
  });
});

describe("one island: the invite, the game and the bot agree", () => {
  it("names the tree stages the same everywhere", () => {
    expect([...WEB_STAGE_NAMES]).toEqual([...ISLAND_STAGES]);
    expect([...BOT_STAGE_NAMES]).toEqual([...ISLAND_STAGES]);
  });

  it("runs Season 1 on the dates the rollout runbook gives /admin season", () => {
    const runbook = readFileSync(join(process.cwd(), "docs/runbooks/shift-high-island-rollout.md"), "utf8");
    expect(ISLAND_SEASON).toEqual({ name: "Season 1", kickoff: "2026-11-14", lastDay: "2026-11-28" });
    expect(runbook).toContain(
      `/admin season name:${ISLAND_SEASON.name} starts:${ISLAND_SEASON.kickoff} ends:${ISLAND_SEASON.lastDay}`,
    );
  });
});
