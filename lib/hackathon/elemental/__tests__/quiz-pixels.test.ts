import { ELEMENT_ICON_ROWS } from "@/components/hackathon/poster/elemental/element-icons";

import { QUIZ_ELEMENTS, QUIZ_QUESTIONS } from "../quiz";
import {
  CREST_COLS,
  CREST_ROWS,
  FX_FRAMES,
  FX_OFFSET,
  FX_STAGE,
  ICON_EFFECTS,
  PIXEL_PALETTE,
  QUIZ_CRESTS,
  QUIZ_SCENES,
  SCENE_COLS,
  SCENE_ROWS,
  fxFrame,
  fxRuns,
  iconPixels,
  pixelRuns,
  revealCells,
} from "../quiz-pixels";

/** The scenes' colours: neutrals, one flame accent, and toxic green for pollution. */
const SCENE_COLOURS = "dsakflcG";
/** Only the river (question 5) and the environment question (8) may show pollution. */
const POLLUTION_SCENES = new Set([4, 7]);

/** The colours each element may use: its own ramp, plus cream as the one shared highlight (not on aether). */
const ALLOWED: Record<(typeof QUIZ_ELEMENTS)[number], string> = {
  fire: "eflcwk",
  earth: "bryek",
  water: "TCGk",
  air: "sayk",
  aether: "gvL",
};

const iconCellSet = (el: (typeof QUIZ_ELEMENTS)[number]) => new Set(iconPixels(el).map(([x, y]) => `${x},${y}`));

describe("Elemental quiz pixel art", () => {
  it("has a palette entry for every character, all hex colours", () => {
    for (const hex of Object.values(PIXEL_PALETTE)) expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(QUIZ_ELEMENTS)("puts the %s icon on the stage unchanged", (el) => {
    const filled = ELEMENT_ICON_ROWS[el].join("").replaceAll(".", "").length;
    expect(iconPixels(el)).toHaveLength(filled);
    for (const [x, y] of iconPixels(el)) expect(ELEMENT_ICON_ROWS[el][y - FX_OFFSET][x - FX_OFFSET]).toBe("#");
  });

  it.each(QUIZ_ELEMENTS)("draws the %s effect as 8 frames on the 15x15 stage in its own colours", (el) => {
    const { frames, frameMs } = ICON_EFFECTS[el];
    expect(frames).toHaveLength(FX_FRAMES);
    expect(Number.isInteger(frameMs) && frameMs >= 90 && frameMs <= 260).toBe(true);
    const icon = iconCellSet(el);
    frames.forEach((frame) => {
      expect(frame).toHaveLength(FX_STAGE);
      let touched = 0;
      frame.forEach((row, y) => {
        expect(row).toHaveLength(FX_STAGE);
        Array.from(row).forEach((ch, x) => {
          if (ch === ".") return;
          const onIcon = icon.has(`${x},${y}`);
          if (onIcon) touched++;
          if (ch === "-") expect(onIcon).toBe(true);
          else expect(ALLOWED[el]).toContain(ch);
        });
      });
      expect(touched).toBeLessThanOrEqual(3);
    });
  });

  it.each(QUIZ_ELEMENTS)("keeps the %s icon exactly as it is in the still (frame 0)", (el) => {
    const still = new Map(fxFrame(el, 0).map((p) => [`${p[0]},${p[1]}`, p]));
    for (const p of iconPixels(el)) expect(still.get(`${p[0]},${p[1]}`)).toEqual(p);
  });

  it.each(QUIZ_ELEMENTS)("draws the %s crest on a 30x8 grid, dense at the top and gone by the bottom", (el) => {
    const art = QUIZ_CRESTS[el];
    expect(art).toHaveLength(CREST_ROWS);
    for (const row of art) {
      expect(row).toHaveLength(CREST_COLS);
      for (const ch of row) if (ch !== ".") expect(ALLOWED[el] + "k").toContain(ch);
    }
    const density = (row: string) => row.replaceAll(".", "").length / CREST_COLS;
    expect(density(art[0])).toBeGreaterThanOrEqual(0.7);
    expect(density(art[CREST_ROWS - 1])).toBeLessThanOrEqual(0.1);
  });

  it("draws every pixel exactly once as runs", () => {
    for (const el of QUIZ_ELEMENTS) {
      const crest = QUIZ_CRESTS[el];
      expect(pixelRuns(crest).reduce((n, [, , length]) => n + length, 0)).toBe(crest.join("").replaceAll(".", "").length);
      for (let n = 0; n < FX_FRAMES; n++) {
        const pixels = fxFrame(el, n);
        expect(fxRuns(pixels).reduce((sum, [, , length]) => sum + length, 0)).toBe(pixels.length);
      }
    }
  });

  it("draws a scene for every question", () => {
    expect(QUIZ_SCENES).toHaveLength(QUIZ_QUESTIONS.length);
  });

  it.each(QUIZ_SCENES.map((scene, q) => [q + 1, scene.title, q] as const))("draws scene %i (%s) at 38x14 in the scene colours, with at most a tiny idle", (_, __, q) => {
    const { frames } = QUIZ_SCENES[q];
    expect(frames.length === 1 || frames.length === 2).toBe(true);
    for (const frame of frames) {
      expect(frame).toHaveLength(SCENE_ROWS);
      for (const row of frame) {
        expect(row).toHaveLength(SCENE_COLS);
        for (const ch of row) if (ch !== ".") expect(SCENE_COLOURS).toContain(ch);
        if (!POLLUTION_SCENES.has(q)) expect(row).not.toContain("G");
      }
    }
    if (frames.length === 2) {
      const changed = frames[0].join("").split("").filter((ch, i) => ch !== frames[1].join("")[i]).length;
      expect(changed).toBeGreaterThanOrEqual(1);
      expect(changed).toBeLessThanOrEqual(6);
    }
  });

  it("builds every icon pixel once in the reveal, fire from its base up and air from the left", () => {
    for (const el of QUIZ_ELEMENTS) {
      const cells = revealCells(el);
      expect(cells).toHaveLength(iconPixels(el).length);
      expect(new Set(cells.map(([x, y]) => `${x},${y}`)).size).toBe(cells.length);
    }
    const fire = revealCells("fire");
    expect(fire[0][1]).toBe(Math.max(...fire.map(([, y]) => y)));
    const air = revealCells("air");
    expect(air[0][0]).toBe(Math.min(...air.map(([x]) => x)));
    const aether = revealCells("aether");
    expect(aether[0][3]).toBe(Math.min(...aether.map(([, , , a]) => a)));
  });
});
