import { ACTOR_FRAMES, MOTION_SIZES, MOTION_SPRITES } from "@/bot/assets/island/motion-sprites";
import { SPRITES } from "@/bot/assets/island/sprites";

import { FESTIVAL_PLOTS, TREE_VIEW, fitPanel, storyPanels, treeView, type PixelRect } from "../scenes";

const panels = storyPanels();

function inside(inner: PixelRect, outer: PixelRect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h;
}

function whole(rect: PixelRect): boolean {
  return [rect.x, rect.y, rect.w, rect.h].every(Number.isInteger);
}

describe("story scenes", () => {
  it("builds four valid scenes without throwing", () => {
    expect(panels.map((p) => p.n)).toEqual([1, 2, 3, 4]);
    for (const panel of panels) {
      expect(panel.scene).not.toBeNull();
      expect(panel.scene!.tiles).toHaveLength(panel.scene!.cols * panel.scene!.rows);
      // A story panel never pins anyone's plot.
      expect(panel.scene!.marker).toBeNull();
    }
  });

  it("tells the story in dawn, day, day, night", () => {
    expect(panels.map((p) => p.phase)).toEqual(["dawn", "day", "day", "night"]);
    expect(panels[0].ambient).toBe(true);
  });

  it("1: the empty island, whole", () => {
    const [first] = panels;
    expect(first.scene!.trees).toHaveLength(0);
    expect(first.view).toEqual({ x: 0, y: 0, w: first.scene!.width, h: first.scene!.height });
    expect(first.actors).toEqual([]);
  });

  it("2 and 3: one tree framed at about 160 x 112, a seedling then a stage 5 tree", () => {
    const [, second, third] = panels;
    expect(second.scene!.trees.map((t) => t.stage)).toEqual([2]);
    expect(third.scene!.trees.map((t) => t.stage)).toEqual([5]);
    for (const panel of [second, third]) {
      const tree = panel.scene!.trees[0];
      expect(panel.view).toEqual(treeView(panel.scene!, tree));
      expect(panel.view.w).toBe(TREE_VIEW.w);
      expect(panel.view.h).toBe(TREE_VIEW.h);
      expect(inside({ x: tree.left, y: tree.top, w: tree.w, h: tree.h }, panel.view)).toBe(true);
      expect(inside(panel.scene!.tags[0], panel.view)).toBe(true);
    }
    // The same plot on the same island: the cut from 2 to 3 shows the tree growing in place.
    expect(third.view).toEqual(second.view);
  });

  it("2 has the builder beside the seedling; 3 adds the tester on the other side, both facing the tree", () => {
    const [, second, third] = panels;
    const tree = third.scene!.trees[0];
    expect(second.actors.map((a) => a.frames)).toEqual([ACTOR_FRAMES.builder]);
    expect(third.actors.map((a) => a.frames)).toEqual([ACTOR_FRAMES.builder, ACTOR_FRAMES.tester]);
    const [builder, tester] = third.actors;
    expect(builder.x + MOTION_SIZES.builder_0[0]).toBeLessThanOrEqual(tree.left + tree.w / 2);
    expect(tester.x).toBeGreaterThanOrEqual(tree.left + tree.w / 2);
    // The sprites already face inward (hammer on the builder's right, phone on the tester's left).
    expect(third.actors.map((a) => a.flip)).toEqual([false, false]);
  });

  it("every actor frame exists and every actor stands inside its panel's view", () => {
    for (const panel of panels) {
      for (const actor of panel.actors) {
        for (const frame of actor.frames) {
          expect(SPRITES[frame] ?? MOTION_SPRITES[frame as keyof typeof MOTION_SPRITES]).toBeDefined();
        }
        const [w, h] = MOTION_SIZES[actor.frames[0] as keyof typeof MOTION_SIZES];
        expect(inside({ x: actor.x, y: actor.y, w, h }, panel.view)).toBe(true);
      }
    }
  });

  it("4: the festival night with eight mixed trees, three lanterns and the banner", () => {
    const fourth = panels[3];
    const scene = fourth.scene!;
    expect(scene.trees).toHaveLength(FESTIVAL_PLOTS.length);
    expect(new Set(scene.trees.map((t) => t.stage)).size).toBeGreaterThan(4);
    expect(scene.trees.filter((t) => t.lantern)).toHaveLength(3);
    expect(scene.banner).not.toBeNull();
    for (const tree of scene.trees) {
      expect(inside({ x: tree.left, y: tree.top, w: tree.w, h: tree.h }, fourth.view)).toBe(true);
    }
  });

  it("keeps every view and focus inside its scene, in whole pixels", () => {
    for (const panel of panels) {
      const scene = panel.scene!;
      expect(whole(panel.view)).toBe(true);
      expect(inside(panel.view, { x: 0, y: 0, w: scene.width, h: scene.height })).toBe(true);
      expect(inside({ ...panel.focus, w: 0, h: 0 }, panel.view)).toBe(true);
    }
  });

  it("falls back to the matching tree sprite for each panel", () => {
    expect(panels.map((p) => p.fallback)).toEqual([0, 2, 5, 7]);
    for (const panel of panels) expect(SPRITES[`stage_${panel.fallback}`]).toBeDefined();
  });
});

describe("fitPanel", () => {
  const boxes = [
    { w: 358, h: 420, dpr: 3 },
    { w: 358, h: 420, dpr: 2 },
    { w: 358, h: 420, dpr: 2.75 },
    { w: 880, h: 560, dpr: 1 },
    { w: 880, h: 560, dpr: 2 },
    { w: 600, h: 300, dpr: 2 },
    { w: 120, h: 80, dpr: 1 },
  ];

  it.each(boxes)("crops inside the view, whole device pixels per native pixel, never bigger than the box (%o)", (box) => {
    for (const panel of panels) {
      const fit = fitPanel(panel.view, panel.focus, box, box.dpr);
      expect(whole(fit.crop)).toBe(true);
      expect(inside(fit.crop, panel.view)).toBe(true);
      expect(Number.isInteger(fit.scale)).toBe(true);
      expect(fit.scale).toBeGreaterThanOrEqual(1);
      expect(fit.width).toBeCloseTo((fit.crop.w * fit.scale) / box.dpr);
      expect(fit.width).toBeLessThanOrEqual(box.w + 1e-9);
      expect(fit.height).toBeLessThanOrEqual(box.h + 1e-9);
    }
  });

  it("shows the whole view when an integer scale fills the box", () => {
    const view = { x: 0, y: 0, w: 480, h: 256 };
    const fit = fitPanel(view, { x: 240, y: 128 }, { w: 358, h: 420 }, 3);
    expect(fit).toEqual({ crop: view, scale: 2, width: 320, height: 256 * (2 / 3) });
  });

  it("zooms one step and crops around the focus when the fit would leave the box mostly empty", () => {
    const view = { x: 0, y: 0, w: 480, h: 256 };
    // At 2 device px per CSS px, 1 device px per native px would be 240 CSS px of a 358 px box.
    const fit = fitPanel(view, { x: 240, y: 128 }, { w: 358, h: 420 }, 2);
    expect(fit.scale).toBe(2);
    expect(fit.crop).toEqual({ x: 61, y: 0, w: 358, h: 256 });
    expect(fit.width).toBe(358);
  });

  it("keeps a crop against the view's edge when the focus is near it", () => {
    const view = { x: 10, y: 20, w: 400, h: 200 };
    const fit = fitPanel(view, { x: 12, y: 22 }, { w: 300, h: 150 }, 1);
    expect(fit.crop.x).toBe(10);
    expect(fit.crop.y).toBe(20);
  });

  it("treats a broken device pixel ratio as 1", () => {
    const view = { x: 0, y: 0, w: 160, h: 112 };
    expect(fitPanel(view, { x: 80, y: 56 }, { w: 320, h: 224 }, Number.NaN).scale).toBe(2);
    expect(fitPanel(view, { x: 80, y: 56 }, { w: 320, h: 224 }, 0).scale).toBe(2);
  });
});
