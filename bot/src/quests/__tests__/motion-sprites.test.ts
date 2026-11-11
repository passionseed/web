/**
 * @jest-environment node
 */
import {
  ACTOR_FRAMES,
  GOAL_BULB_SPOTS,
  MOTION_SIZES,
  MOTION_SPRITES,
  SHORE_FRAMES,
  SWAY_FRAMES,
  WATER_FRAMES,
  motionGrid,
  type MotionSpriteName,
} from "../../../assets/island/motion-sprites";
import { MOTION_RULES, NOTICE_PIN_SPOTS, SWAY_TRUNK_ROW, motionSpriteProblems } from "../../../assets/island/motion-preview";
import { PALETTE, SPRITES } from "../../../assets/island/sprites";

const names = Object.keys(MOTION_SPRITES) as MotionSpriteName[];
const column = (rows: string[], x: number) => rows.map((row) => row[x]).join("");

describe("motion sprites", () => {
  it("keeps the bot palette at 24 keys", () => {
    expect(Object.keys(PALETTE)).toHaveLength(24);
  });

  it("has a size for every sprite and a sprite for every size", () => {
    expect(Object.keys(MOTION_SIZES).sort()).toEqual([...names].sort());
  });

  it.each(names)("%s matches its size and uses only palette keys", (name) => {
    const [width, height] = MOTION_SIZES[name];
    const rows = MOTION_SPRITES[name];
    expect(rows).toHaveLength(height);
    for (const row of rows) {
      expect(row).toHaveLength(width);
      for (const symbol of row) if (symbol !== ".") expect(PALETTE).toHaveProperty(symbol);
    }
  });

  it("never reuses a name from sprites.ts", () => {
    for (const name of names) expect(SPRITES).not.toHaveProperty(name);
  });

  it("keeps sea frames seamless: the outer ring equals the base tile", () => {
    for (const [base, ...frames] of Object.values(WATER_FRAMES)) {
      for (const frame of frames) {
        const rows = motionGrid(frame)!;
        expect([rows[0], rows[15], column(rows, 0), column(rows, 15)]).toEqual([
          SPRITES[base][0],
          SPRITES[base][15],
          column(SPRITES[base], 0),
          column(SPRITES[base], 15),
        ]);
      }
    }
  });

  it("keeps foam frames joined to the next shore tile", () => {
    for (const [base, ...frames] of Object.values(SHORE_FRAMES)) {
      const tile = SPRITES[base];
      const horizontal = base === "shore_n" || base === "shore_s";
      for (const frame of frames) {
        const rows = motionGrid(frame)!;
        const edges = (grid: string[]) => (horizontal ? [column(grid, 0), column(grid, 15)] : [grid[0], grid[15]]);
        expect(edges(rows)).toEqual(edges(tile));
      }
    }
  });

  it("sways only the canopy: soil equals stage_0 and the trunk equals frame A", () => {
    for (const [stage, frame] of Object.entries(SWAY_FRAMES)) {
      const rows = MOTION_SPRITES[frame];
      expect(rows.slice(30)).toEqual(SPRITES.stage_0.slice(30));
      expect(rows.slice(SWAY_TRUNK_ROW[stage])).toEqual(SPRITES[stage].slice(SWAY_TRUNK_ROW[stage]));
      expect(rows).not.toEqual(SPRITES[stage]);
    }
  });

  it("frame lists name sprites that exist", () => {
    const lists = [
      ...Object.values(WATER_FRAMES),
      ...Object.values(SHORE_FRAMES),
      ...Object.values(ACTOR_FRAMES),
      ...Object.entries(SWAY_FRAMES),
    ];
    for (const list of lists) for (const name of list) expect(motionGrid(name)).toBeDefined();
    expect(Object.keys(SWAY_FRAMES)).toEqual(["stage_2", "stage_3", "stage_4", "stage_5", "stage_6", "stage_7"]);
  });

  it("animates: every second frame differs from the first", () => {
    for (const list of [...Object.values(WATER_FRAMES), ...Object.values(SHORE_FRAMES), ...Object.values(ACTOR_FRAMES)]) {
      expect(motionGrid(list[1])).not.toEqual(motionGrid(list[0]));
    }
  });

  it.each(MOTION_RULES)("passes the preview's %s rule", (rule) => {
    expect(motionSpriteProblems().filter((problem) => problem.rule === rule)).toEqual([]);
  });

  it("the shared checker catches broken frames", () => {
    const broken: Record<string, string[]> = {
      ...MOTION_SPRITES,
      water_a_1: ["v".repeat(16), ...SPRITES.water_a.slice(1)],
      shore_n_1: SPRITES.shore_n.map((row) => row.replace(/s/g, "i")),
      stage_4_b: [...SPRITES.stage_4.slice(1), SPRITES.stage_4[0]],
      gull_0: ["rrrrrrrr", ...MOTION_SPRITES.gull_0.slice(1)],
      cloud_a: MOTION_SPRITES.cloud_a.slice(1),
    };
    const rules = new Set(motionSpriteProblems(broken).map((problem) => `${problem.rule}:${problem.name}`));
    expect([...rules]).toEqual(
      expect.arrayContaining(["water:water_a_1", "shore:shore_n_1", "sway:stage_4_b", "style:gull_0", "size:cloud_a"]),
    );
  });

  it("the shared checker catches broken plaza art", () => {
    const string = MOTION_SPRITES.goal_string;
    const board = MOTION_SPRITES.notice_board;
    const broken: Record<string, string[]> = {
      ...MOTION_SPRITES,
      // A lit key in the unlit string, and a bulb pixel no spot covers.
      goal_string: [string[0].replace("o", "t"), string[1], string[2].replace("oto", "oyo"), ...string.slice(3)],
      // Lights before the stage is finished, and a deck that moved.
      fest_stage_1: MOTION_SPRITES.fest_stage_1.map((row) => row.replace("eeee", "eyee")),
      fest_stage_2: [...MOTION_SPRITES.fest_stage_2.slice(0, 31), MOTION_SPRITES.fest_stage_2[30]],
      // An outline under the second pin spot.
      notice_board: [board[0], board[1], board[2].slice(0, 10) + "o" + board[2].slice(11), ...board.slice(3)],
      sit_c_1: MOTION_SPRITES.sit_c_1.map((row) => `${row}.`),
      star_flag: MOTION_SPRITES.star_flag.slice(1),
    };
    const rules = new Set(motionSpriteProblems(broken).map((problem) => `${problem.rule}:${problem.name}`));
    expect([...rules]).toEqual(
      expect.arrayContaining([
        "style:goal_string",
        "plaza:goal_string",
        "style:fest_stage_1",
        "plaza:fest_stage_2",
        "plaza:notice_board",
        "frames:sit_c_1",
        "frames:star_flag",
      ]),
    );
  });

  it("lights each goal bulb exactly over an unlit one, left to right", () => {
    const string = MOTION_SPRITES.goal_string;
    const bulb = MOTION_SPRITES.goal_bulb;
    expect(GOAL_BULB_SPOTS).toHaveLength(8);
    const centres = GOAL_BULB_SPOTS.map(([x, y]) => {
      for (const [dy, row] of bulb.entries()) {
        for (const [dx, symbol] of [...row].entries()) if (symbol !== ".") expect(string[y + dy][x + dx]).not.toBe(".");
      }
      return x + 1;
    });
    expect(centres).toEqual([2, 8, 14, 20, 27, 33, 39, 45]);
    // Every bulb centre column is a bulb on the night festoon too.
    for (const [i, [x, y]] of GOAL_BULB_SPOTS.entries()) expect(MOTION_SPRITES.festoon[y][centres[i]]).not.toBe(".");
    expect(string.join("").match(/[yifrp]/g)).toBeNull();
  });

  it("keeps the plaza families on shared sizes", () => {
    const sizeOf = (name: MotionSpriteName) => MOTION_SIZES[name].join("x");
    expect(new Set(["fest_stage_0", "fest_stage_1", "fest_stage_2", "fest_stage_3"].map((n) => sizeOf(n as MotionSpriteName)))).toEqual(new Set(["44x32"]));
    expect(new Set([...ACTOR_FRAMES.sitA, ...ACTOR_FRAMES.sitB, ...ACTOR_FRAMES.sitC, ...ACTOR_FRAMES.sitD].map(sizeOf))).toEqual(new Set(["8x10"]));
    expect(new Set(ACTOR_FRAMES.campfireFlame.map(sizeOf))).toEqual(new Set(["10x10"]));
    expect([sizeOf("booth_flag"), sizeOf("star_flag")]).toEqual(["7x12", "7x12"]);
    expect([sizeOf("notice_board"), sizeOf("fest_sign"), sizeOf("goal_string"), sizeOf("goal_bulb"), sizeOf("campfire_pit")]).toEqual([
      "24x22",
      "14x12",
      "48x8",
      "3x3",
      "14x10",
    ]);
    for (const [x, y] of NOTICE_PIN_SPOTS) {
      expect(x + MOTION_SIZES.notice_note_main[0]).toBeLessThanOrEqual(MOTION_SIZES.notice_board[0]);
      expect(y + MOTION_SIZES.notice_note_main[1]).toBeLessThanOrEqual(MOTION_SIZES.notice_board[1]);
    }
  });
});
