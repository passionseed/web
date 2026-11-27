import { normalizeSource } from "../registration";
import { MAX_POSTER_NO, parsePosterNo, posterLabel, posterRange, posterSource } from "../poster-numbers";

describe("posterSource", () => {
  it("keeps the plain tag for the unnumbered poster", () => {
    expect(posterSource()).toBe("poster");
  });

  it("adds the copy's number", () => {
    expect(posterSource(7)).toBe("poster-7");
  });

  it("survives the sign-up form's source clean-up unchanged, so each copy is counted on its own", () => {
    expect(normalizeSource(posterSource(7))).toBe("poster-7");
    expect(normalizeSource(posterSource(MAX_POSTER_NO))).toBe(`poster-${MAX_POSTER_NO}`);
  });
});

describe("parsePosterNo", () => {
  it.each([
    ["7", 7],
    [" 12 ", 12],
    ["1", 1],
    [String(MAX_POSTER_NO), MAX_POSTER_NO],
  ])("reads %p as %p", (raw, n) => {
    expect(parsePosterNo(raw)).toBe(n);
  });

  it.each([undefined, null, "", "0", "-3", "2.5", "abc", "7a", String(MAX_POSTER_NO + 1)])("rejects %p", (raw) => {
    expect(parsePosterNo(raw)).toBeUndefined();
  });
});

describe("posterRange", () => {
  it("makes 1 to 30 when nothing is given", () => {
    const r = posterRange();
    expect(r[0]).toBe(1);
    expect(r).toHaveLength(30);
    expect(r[29]).toBe(30);
  });

  it("makes the range asked for", () => {
    expect(posterRange("31", "35")).toEqual([31, 32, 33, 34, 35]);
  });

  it("makes a single copy", () => {
    expect(posterRange("12", "12")).toEqual([12]);
  });

  it("turns a reversed range round", () => {
    expect(posterRange("5", "3")).toEqual([3, 4, 5]);
  });

  it("runs to 30 from a start below it when the end is missing", () => {
    expect(posterRange("28")).toEqual([28, 29, 30]);
  });

  it("makes one copy from a start above 30 when the end is missing", () => {
    expect(posterRange("40")).toEqual([40]);
  });

  it("ignores bad values", () => {
    expect(posterRange("x", "3")).toEqual([1, 2, 3]);
    expect(posterRange("2", "9999")).toHaveLength(29);
  });
});

describe("posterLabel", () => {
  it("pads to two digits", () => {
    expect(posterLabel(7)).toBe("No. 07");
    expect(posterLabel(30)).toBe("No. 30");
    expect(posterLabel(120)).toBe("No. 120");
  });
});
