import { compactElement, compactElements, simplify } from "./compact";

const wobble = (n: number) => Array.from({ length: n }, (_, i) => [i * 3.333333333333, (i % 2) * 0.1000000001] as [number, number]);

describe("simplify", () => {
  it("drops points within half a pixel of a straight run, keeping both ends", () => {
    expect(simplify(wobble(20))).toEqual([0, 19]);
  });

  it("keeps the corner of an L", () => {
    expect(simplify([[0, 0], [5, 0], [10, 0], [10, 5], [10, 10]])).toEqual([0, 2, 4]);
  });

  it("leaves two points alone", () => {
    expect(simplify([[0, 0], [1, 1]])).toEqual([0, 1]);
  });
});

describe("compactElement", () => {
  it("rounds a mouse stroke to 2 decimals but keeps every point", () => {
    const el = { id: "a", type: "freedraw", simulatePressure: true, points: wobble(10), pressures: [], lastCommittedPoint: [1.23456, 2.34567] };
    const out = compactElement(el);
    expect(out.points).toHaveLength(10);
    expect(out.points[1]).toEqual([3.33, 0.1]);
    expect(out.lastCommittedPoint).toEqual([1.23, 2.35]);
  });

  it("slims a stylus stroke, dropping pressures with their points", () => {
    const points = wobble(10);
    const pressures = points.map((_, i) => 0.123456 + i / 100);
    const out = compactElement({ id: "s", type: "freedraw", simulatePressure: false, points, pressures });
    expect(out.points).toEqual([[0, 0], [30, 0.1]]);
    expect(out.pressures).toEqual([0.12, 0.21]);
  });

  it("keeps every point of a stylus stroke whose pressures do not line up", () => {
    const out = compactElement({ type: "freedraw", simulatePressure: false, points: wobble(10), pressures: [0.5] });
    expect(out.points).toHaveLength(10);
  });

  it("slims a hand-drawn line but not a short placed one", () => {
    expect(compactElement({ type: "line", points: wobble(30) }).points).toHaveLength(2);
    const placed = [[0, 0], [10, 0.2], [20, 0]] as [number, number][];
    expect(compactElement({ type: "line", points: placed }).points).toEqual(placed);
  });

  it("does not touch arrows, shapes or malformed strokes", () => {
    const arrow = { type: "arrow", points: wobble(10) };
    const box = { type: "rectangle", x: 1.23456 };
    const broken = { type: "freedraw", points: [[1, "x"]] };
    expect(compactElements([arrow, box, broken])).toEqual([arrow, box, broken]);
  });

  it("keeps the version and every other field", () => {
    const el = { id: "a", type: "line", version: 7, versionNonce: 9, strokeColor: "#000", points: wobble(30) };
    const out = compactElement(el);
    expect({ ...out, points: undefined }).toEqual({ ...el, points: undefined });
  });

  it("is smaller", () => {
    const el = { type: "freedraw", simulatePressure: false, points: wobble(200), pressures: wobble(200).map(() => 0.123456789) };
    expect(JSON.stringify(compactElement(el)).length).toBeLessThan(JSON.stringify(el).length / 5);
  });
});
