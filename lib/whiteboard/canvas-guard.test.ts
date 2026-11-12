import { createCanvasGuard } from "./canvas-guard";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const OWNER = id(1);
const MATE = id(2);
const OTHER = id(3);
const STAFF = id(4);

type El = {
  id: string;
  type: string;
  version: number;
  frameId?: string | null;
  containerId?: string | null;
  isDeleted?: boolean;
  x?: number;
  customData?: Record<string, unknown> | null;
};

const frame: El = { id: "F", type: "frame", version: 1, customData: { project: "p1", owner: OWNER, editors: [MATE] } };
const note: El = { id: "N", type: "rectangle", version: 1, frameId: "F", x: 0 };
const loose: El = { id: "L", type: "rectangle", version: 1, x: 0 };
const scene = [frame, note, loose];

describe("canvas guard: this browser's edits", () => {
  it("keeps allowed edits and undoes the rest", () => {
    const guard = createCanvasGuard(scene);
    const { fixes, blocked } = guard.checkLocal([frame, { ...note, version: 2, x: 50 }, { ...loose, version: 2, x: 9 }], OTHER, false);
    expect(blocked).toBe(1);
    expect(fixes).toEqual([note]);
    // The undone note and the kept edit now count as seen.
    expect(guard.checkLocal([frame, note, { ...loose, version: 2, x: 9 }], OTHER, false)).toEqual({ fixes: [], blocked: 0 });
  });

  it("lets the team and the board owner edit", () => {
    expect(createCanvasGuard(scene).checkLocal([{ ...note, version: 2 }], MATE, false).blocked).toBe(0);
    expect(createCanvasGuard(scene).checkLocal([{ ...note, version: 2 }], STAFF, true).blocked).toBe(0);
  });

  it("removes something new an outsider puts into a canvas", () => {
    const { fixes } = createCanvasGuard(scene).checkLocal([{ id: "X", type: "rectangle", version: 1, frameId: "F" }], OTHER, false);
    expect(fixes[0]).toMatchObject({ id: "X", isDeleted: true, version: 2 });
  });

  it("gives a new canvas to its maker, as a new version so it syncs", () => {
    const made: El = { id: "G", type: "frame", version: 3, customData: { project: "p2" } };
    const { fixes } = createCanvasGuard(scene).checkLocal([made], OTHER, false);
    expect(fixes[0]).toMatchObject({ id: "G", version: 4, customData: { project: "p2", owner: OTHER, editors: [] } });
  });
});

describe("canvas guard: note versions", () => {
  const v1 = { v: 1, text: "แรก", at: "2026-11-01T03:00:00.000Z", by: OWNER };
  const card: El = { id: "C", type: "rectangle", version: 1, frameId: "F", customData: { card: "problem", versions: [v1] } };

  it("puts back a version someone removed (an undo, or a tampered client)", () => {
    const guard = createCanvasGuard([...scene, card]);
    const { fixes, blocked } = guard.checkLocal([{ ...card, version: 2, customData: { card: "problem", versions: [] } }], MATE, false);
    expect(blocked).toBe(0);
    expect(fixes).toHaveLength(1);
    expect(fixes[0]).toMatchObject({ id: "C", version: 3, customData: { versions: [v1] } });
  });

  it("keeps a new version as written by this person", () => {
    const guard = createCanvasGuard([...scene, card]);
    const v2 = { v: 2, text: "ใหม่", at: new Date().toISOString(), by: MATE };
    expect(guard.checkLocal([{ ...card, version: 2, customData: { card: "problem", versions: [v1, v2] } }], MATE, false)).toEqual({
      fixes: [],
      blocked: 0,
    });
  });
});

describe("canvas guard: live edits from others", () => {
  const from = (user: string, el: El): El => ({ ...el, customData: { ...el.customData, updatedBy: user } });

  it("shows edits outside canvases at once", () => {
    const guard = createCanvasGuard(scene);
    const free = from(OTHER, { ...loose, version: 2, x: 4 });
    expect(guard.filterRemote([free])).toEqual({ apply: [free], verify: new Map() });
    // Now trusted: the same element arriving again is no change of this browser's.
    expect(guard.checkLocal([frame, note, free], OTHER, false)).toEqual({ fixes: [], blocked: 0 });
  });

  it("holds every edit touching a canvas for its saved copy, whoever it claims to be from", () => {
    const guard = createCanvasGuard(scene);
    const forged = from(STAFF, { ...note, version: 5, x: 99 });
    const intoCanvas = from(MATE, { ...loose, version: 2, frameId: "F" });
    const frameEdit = from(OWNER, { ...frame, version: 2, customData: { project: "p1", owner: OWNER, editors: [MATE, OTHER] } });
    const { apply, verify } = guard.filterRemote([forged, intoCanvas, frameEdit]);
    expect(apply).toEqual([]);
    expect(verify).toEqual(
      new Map([
        ["N", 5],
        ["L", 2],
        ["F", 2],
      ]),
    );
  });

  it("holds new canvases and what is in them until saved", () => {
    const guard = createCanvasGuard(scene);
    const made = from(OTHER, { id: "G", type: "frame", version: 1, customData: { project: "p2", owner: OWNER } });
    const inside = from(OTHER, { id: "Y", type: "rectangle", version: 1, frameId: "G" });
    expect([...guard.filterRemote([made, inside]).verify.keys()]).toEqual(["G", "Y"]);
  });

  it("holds text for a note on a canvas, before or after", () => {
    const guard = createCanvasGuard([...scene, { id: "T", type: "text", version: 1, containerId: "N" }]);
    const retyped = from(MATE, { id: "T", type: "text", version: 2, containerId: "N" });
    const moved = from(MATE, { id: "T", type: "text", version: 3, containerId: "L" });
    expect([...guard.filterRemote([retyped]).verify.keys()]).toEqual(["T"]);
    expect([...guard.filterRemote([moved]).verify.keys()]).toEqual(["T"]);
  });

  it("keeps holding an element once it touched a canvas, so a later fake cannot move it out first", () => {
    const guard = createCanvasGuard(scene);
    // A teammate's new note in the canvas: not saved yet, so not in the trusted copy.
    const real = from(MATE, { id: "N2", type: "rectangle", version: 1, frameId: "F" });
    expect([...guard.filterRemote([real]).verify.keys()]).toEqual(["N2"]);
    // Someone else re-sends it outside the canvas with a higher version.
    const fake = from(OTHER, { id: "N2", type: "rectangle", version: 50, frameId: null });
    expect(guard.filterRemote([fake])).toEqual({ apply: [], verify: new Map([["N2", 50]]) });
    expect(guard.isHeld("N2")).toBe(true);
    expect(guard.isHeld("L")).toBe(false);
  });

  it("trusts saved copies from the database, so later edits are judged against them", () => {
    const guard = createCanvasGuard(scene);
    const savedFrame = { ...frame, version: 2, customData: { project: "p1", owner: OWNER, editors: [MATE, OTHER] } };
    guard.trust([savedFrame]);
    // OTHER is on the team now.
    expect(guard.checkLocal([savedFrame, { ...note, version: 2, x: 3 }], OTHER, false).blocked).toBe(0);
  });

  it("ignores badly typed live edits, like a string isDeleted that browsers read as true", () => {
    const guard = createCanvasGuard(scene);
    const sneaky = from(MATE, { ...loose, version: 2, isDeleted: "false" as unknown as boolean });
    expect(guard.filterRemote([sneaky])).toEqual({ apply: [], verify: new Map() });
  });

  it("ignores live edits that push a version out of reach of later edits", () => {
    const guard = createCanvasGuard(scene);
    expect(guard.filterRemote([from(OTHER, { ...loose, version: 2_000_000 })]).apply).toEqual([]);
    expect(guard.filterRemote([from(OTHER, { ...loose, version: 2 ** 60 })]).apply).toEqual([]);
  });
});
