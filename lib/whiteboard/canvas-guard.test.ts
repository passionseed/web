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

describe("canvas guard: live edits from others", () => {
  const from = (user: string, el: El): El => ({ ...el, customData: { ...el.customData, updatedBy: user } });

  it("applies edits only from people allowed to make them", () => {
    const guard = createCanvasGuard(scene);
    const ok = from(MATE, { ...note, version: 2, x: 1 });
    const bad = from(OTHER, { ...note, version: 3, x: 2 });
    const free = from(OTHER, { ...loose, version: 2 });
    expect(guard.filterRemote([ok, bad, free], new Set()).map((e) => e.customData?.updatedBy)).toEqual([MATE, OTHER]);
  });

  it("ignores a forged owner or team change", () => {
    const guard = createCanvasGuard(scene);
    const forged = from(MATE, { ...frame, version: 2, customData: { project: "p1", owner: MATE, editors: [MATE] } });
    expect(guard.filterRemote([forged], new Set())).toEqual([]);
    const ownersChange = from(OWNER, { ...frame, version: 2, customData: { project: "p1", owner: OWNER, editors: [MATE, OTHER] } });
    expect(guard.filterRemote([ownersChange], new Set())).toEqual([ownersChange]);
    // OTHER is on the team now.
    expect(guard.filterRemote([from(OTHER, { ...note, version: 4 })], new Set())).toHaveLength(1);
  });

  it("trusts the board owner", () => {
    const guard = createCanvasGuard(scene);
    expect(guard.filterRemote([from(STAFF, { ...note, version: 2 })], new Set([STAFF]))).toHaveLength(1);
  });
});
