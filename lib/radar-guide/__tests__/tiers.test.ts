import { minutesLeft } from "../story";
import { endsPartOfRun, levelOnePages, levelTwoPages, levelTwoTarget, pageTier, positionInTier } from "../tiers";

const page = (key: string, order: number, tier?: 1 | 2, minutes = 1) => ({
  key,
  order,
  titleTh: key,
  navLabelTh: key,
  minutes,
  ...(tier ? { tier } : {}),
});

const split = [page("c", 3, 1), page("a", 1), page("b", 2, 1), page("x", 4, 2, 2), page("y", 5, 2, 3)];
const single = [page("a", 1), page("b", 2), page("c", 3)];

describe("guide tiers", () => {
  it("treats a page with no tier as Level 1", () => {
    expect(pageTier({})).toBe(1);
    expect(pageTier({ tier: 2 })).toBe(2);
  });

  it("splits pages into Level 1 and Level 2, in order", () => {
    expect(levelOnePages(split).map((p) => p.key)).toEqual(["a", "b", "c"]);
    expect(levelTwoPages(split).map((p) => p.key)).toEqual(["x", "y"]);
    expect(levelTwoPages(single)).toEqual([]);
  });

  it("points Level 2 at the first tier-2 page, else at the deck", () => {
    expect(levelTwoTarget(split)).toEqual({ kind: "pages", firstKey: "x" });
    expect(levelTwoTarget(single)).toEqual({ kind: "deck" });
  });

  it("ends a part of the run on the last Level 1 page and the last page overall", () => {
    expect(endsPartOfRun(split, "c")).toBe(true);
    expect(endsPartOfRun(split, "y")).toBe(true);
    expect(endsPartOfRun(split, "b")).toBe(false);
    expect(endsPartOfRun(split, "x")).toBe(false);
    expect(endsPartOfRun(single, "c")).toBe(true);
    expect(endsPartOfRun(single, "a")).toBe(false);
  });

  it("numbers a page within its own Level", () => {
    expect(positionInTier(split, "b")).toEqual({ tier: 1, index: 2, total: 3 });
    expect(positionInTier(split, "y")).toEqual({ tier: 2, index: 2, total: 2 });
    expect(positionInTier(split, "nope")).toBeNull();
  });

  it("counts minutes left within the page's own Level", () => {
    expect(minutesLeft(split, "b")).toBe(2);
    expect(minutesLeft(split, "x")).toBe(5);
    expect(minutesLeft(single, "a")).toBe(3);
  });
});
