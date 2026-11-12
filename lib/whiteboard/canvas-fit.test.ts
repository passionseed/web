import { type FitElement, type FitMove, fitCanvas, NOTE_LINE } from "./canvas-fit";

const rect = (id: string, x: number, y: number, width: number, height: number, extra: Partial<FitElement> = {}): FitElement => ({
  id,
  type: "rectangle",
  x,
  y,
  width,
  height,
  frameId: "f",
  ...extra,
});

/**
 * A small canvas: a beliefs row (problem, target) and an interview row below
 * it, each with a note and its text, an arrow from the problem note down to
 * the interview note, and a sticky outside the canvas.
 */
function canvas(): FitElement[] {
  return [
    { id: "f", type: "frame", x: 0, y: 0, width: 1000, height: 1100, customData: { project: "p" } },
    { id: "hint", type: "text", x: 40, y: 24, width: 600, height: 30, frameId: "f", customData: { canvasHint: true } },
    rect("zP", 40, 100, 400, 360, { customData: { zone: "problem" } }),
    rect("zT", 456, 100, 400, 360, { customData: { zone: "target" } }),
    rect("zI", 40, 476, 816, 544, { customData: { zone: "interview" } }),
    { id: "lP", type: "text", x: 64, y: 120, width: 200, height: 60, frameId: "f", customData: { zoneLabel: "problem" } },
    { id: "lI", type: "text", x: 64, y: 496, width: 200, height: 60, frameId: "f", customData: { zoneLabel: "interview" } },
    rect("nP", 64, 196, 240, 200, { customData: { card: "problem" } }),
    { id: "tP", type: "text", x: 69, y: 201, width: 230, height: 30, containerId: "nP", frameId: null },
    rect("nI", 64, 572, 240, 200, { customData: { card: "interview" } }),
    { id: "tI", type: "text", x: 69, y: 577, width: 230, height: 30, containerId: "nI", frameId: "f" },
    {
      id: "a",
      type: "arrow",
      x: 184,
      y: 396,
      width: 0,
      height: 176,
      frameId: "f",
      points: [
        [0, 0],
        [0, 88],
        [0, 176],
      ],
      startBinding: { elementId: "nP" },
      endBinding: { elementId: "nI" },
    },
    rect("outside", 2000, 600, 200, 200, { frameId: null }),
  ];
}

const apply = (elements: FitElement[], moves: FitMove[]) =>
  elements.map((el) => {
    const m = moves.find((x) => x.id === el.id);
    return m ? { ...el, ...m } : el;
  });
const set = (elements: FitElement[], id: string, change: Partial<FitElement>) =>
  elements.map((el) => (el.id === id ? { ...el, ...change } : el));
const byId = (moves: FitMove[]) => Object.fromEntries(moves.map((m) => [m.id, m]));

describe("fitCanvas", () => {
  it("leaves a canvas alone when every note fits", () => {
    expect(fitCanvas(canvas(), "f")).toEqual([]);
  });

  it("grows a row to fit a taller note and moves the rows below with everything in them", () => {
    const moves = byId(fitCanvas(set(canvas(), "nP", { height: 400 }), "f"));
    // 196 + 400 is the note's bottom; 24 of room under it; the row starts at 100.
    expect(moves.zP).toEqual({ id: "zP", y: 100, height: 520 });
    expect(moves.zT).toEqual({ id: "zT", y: 100, height: 520 });
    expect(moves.zI).toEqual({ id: "zI", y: 636, height: 544 });
    expect(moves.lI).toEqual({ id: "lI", y: 656 });
    expect(moves.nI).toEqual({ id: "nI", y: 732 });
    expect(moves.tI).toEqual({ id: "tI", y: 737 });
    expect(moves.f).toEqual({ id: "f", height: 1260 });
    // The note that grew, its label and its row stay put; so does the hint and anything outside the canvas.
    for (const id of ["nP", "tP", "lP", "hint", "outside"]) expect(moves[id]).toBeUndefined();
  });

  it("bends an arrow whose ends are in different rows, so it still meets both notes", () => {
    const moves = byId(fitCanvas(set(canvas(), "nP", { height: 400 }), "f"));
    expect(moves.a).toEqual({
      id: "a",
      y: 396,
      points: [
        [0, 0],
        [0, 168],
        [0, 336],
      ],
    });
  });

  it("changes nothing the second time", () => {
    const grown = set(canvas(), "nP", { height: 400 });
    expect(fitCanvas(apply(grown, fitCanvas(grown, "f")), "f")).toEqual([]);
  });

  it("shrinks back to the template, never below it, when the note gets shorter again", () => {
    const grown = set(canvas(), "nP", { height: 400 });
    const fitted = apply(grown, fitCanvas(grown, "f"));
    const shorter = set(fitted, "nP", { height: 200 });
    const moves = byId(fitCanvas(shorter, "f"));
    expect(moves.zP).toEqual({ id: "zP", y: 100, height: 360 });
    expect(moves.zI).toEqual({ id: "zI", y: 476, height: 544 });
    expect(moves.nI).toEqual({ id: "nI", y: 572 });
    expect(moves.f).toEqual({ id: "f", height: 1100 });
  });

  it("keeps a tall note with its own row even when it reaches into the next one", () => {
    const moves = byId(fitCanvas(set(canvas(), "nP", { height: 700 }), "f"));
    expect(moves.nP).toBeUndefined();
    expect(moves.zP).toEqual({ id: "zP", y: 100, height: 820 });
  });

  it("makes room for one more line of notes when a zone is full", () => {
    const full = [...canvas(), rect("nI2", 64, 796, 240, 200, { customData: { card: "interview" } })];
    const moves = byId(fitCanvas(full, "f", { zoneId: "zI", height: NOTE_LINE }));
    // Lowest note ends at 996, 520 into the zone; one more line and the room under it.
    expect(moves.zI).toEqual({ id: "zI", y: 476, height: 520 + NOTE_LINE + 24 });
    expect(moves.f).toEqual({ id: "f", height: 1100 + (520 + NOTE_LINE + 24 - 544) });
  });

  it("does nothing outside a SHIFT canvas", () => {
    const plain = canvas().map((el) => (el.id === "f" ? { ...el, customData: null } : el));
    expect(fitCanvas(set(plain, "nP", { height: 400 }), "f")).toEqual([]);
    expect(fitCanvas(canvas(), "missing")).toEqual([]);
  });

  it("does not move an arrow end attached to something outside the canvas", () => {
    const withArrow = [
      ...set(canvas(), "nP", { height: 400 }),
      {
        id: "out-arrow",
        type: "arrow",
        x: 1500,
        y: 700,
        width: 300,
        height: 0,
        points: [
          [0, 0],
          [-1300, 0],
        ] as [number, number][],
        startBinding: { elementId: "outside" },
        endBinding: { elementId: "nI" },
      },
    ];
    expect(byId(fitCanvas(withArrow, "f"))["out-arrow"]).toEqual({
      id: "out-arrow",
      y: 700,
      points: [
        [0, 0],
        [-1300, 160],
      ],
    });
  });
});
