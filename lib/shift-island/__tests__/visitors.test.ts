/**
 * @jest-environment node
 */
import { VISITORS_SCHEMA, visitorsFrom, visitorsNow } from "../visitors";

describe("visitorsFrom", () => {
  it("takes two whole, non-negative numbers", () => {
    expect(visitorsFrom({ count: 7, team: 2 })).toEqual({ count: 7, team: 2 });
    expect(visitorsFrom({ count: 0, team: 0 })).toEqual({ count: 0, team: 0 });
    expect(visitorsFrom({ count: 3.9, team: -1 })).toEqual({ count: 3, team: 0 });
  });

  it("is null for anything else", () => {
    for (const raw of [null, undefined, 7, "7", [], { count: 7 }, { team: 1 }, { count: "7", team: 0 }, { count: Number.NaN, team: 0 }, { count: Infinity, team: 0 }]) {
      expect(visitorsFrom(raw)).toBeNull();
    }
  });

  it("never has more teammates than other people", () => {
    expect(visitorsFrom({ count: 2, team: 5 })).toEqual({ count: 2, team: 1 });
    expect(visitorsFrom({ count: 0, team: 3 })).toEqual({ count: 0, team: 0 });
  });

  it("carries nothing but the two numbers, whatever the row holds", () => {
    expect(Object.keys(visitorsFrom({ count: 4, team: 1, names: ["x"], member_id: "m" })!).sort()).toEqual(["count", "team"]);
  });

  it("is read from schema 18", () => {
    expect(VISITORS_SCHEMA).toBe(18);
  });
});

describe("visitorsNow", () => {
  it("is null without a count from the server: no figures, not even the viewer's own", () => {
    expect(visitorsNow(null, { me: true, counted: true })).toBeNull();
    expect(visitorsNow(undefined, { me: true, counted: false })).toBeNull();
  });

  it("adds the viewer's own check-in when it landed after the page loaded", () => {
    expect(visitorsNow({ count: 6, team: 1 }, { me: true, counted: false })).toEqual({ count: 7, team: 1, me: true });
    // Nobody else today: the viewer is the first.
    expect(visitorsNow({ count: 0, team: 0 }, { me: true, counted: false })).toEqual({ count: 1, team: 0, me: true });
  });

  it("never counts the viewer twice once the server has their check-in", () => {
    expect(visitorsNow({ count: 6, team: 1 }, { me: true, counted: true })).toEqual({ count: 6, team: 1, me: true });
    // A stale count that missed them still holds at least the viewer.
    expect(visitorsNow({ count: 0, team: 0 }, { me: true, counted: true })).toEqual({ count: 1, team: 0, me: true });
  });

  it("draws no viewer figure before their check-in", () => {
    expect(visitorsNow({ count: 6, team: 2 }, { me: false, counted: false })).toEqual({ count: 6, team: 2, me: false });
    expect(visitorsNow({ count: 0, team: 0 }, { me: false, counted: false })).toEqual({ count: 0, team: 0, me: false });
  });
});
