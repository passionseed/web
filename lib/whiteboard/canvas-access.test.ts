import { accessOf, canvasAccessMap, cleanEditors, enforceCanvasAccess, MAX_EDITORS } from "./canvas-access";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const OWNER = id(1);
const MATE = id(2);
const OTHER = id(3);
const STAFF = id(4);

const frame = { id: "F", type: "frame", customData: { project: "p1", owner: OWNER, editors: [MATE] } };
const note = { id: "N", type: "rectangle", frameId: "F", customData: { card: "interview" } };
const label = { id: "T", type: "text", containerId: "N" };
const loose = { id: "L", type: "rectangle", frameId: null };
const current = [frame, note, label, loose];

const ids = (els: { id: string }[]) => els.map((e) => e.id);
type Change = { id: string; type: string; frameId?: string | null; containerId?: string; customData?: Record<string, unknown> } & Record<string, unknown>;
const check = (changes: Change[], user: string, manager = false) => enforceCanvasAccess(current, changes, user, manager);

describe("canvas access", () => {
  it("lets the owner, a teammate and the board owner change a canvas, and no one else", () => {
    const edit = [{ ...note, x: 10 }];
    expect(ids(check(edit, OWNER).allowed)).toEqual(["N"]);
    expect(ids(check(edit, MATE).allowed)).toEqual(["N"]);
    expect(ids(check(edit, STAFF, true).allowed)).toEqual(["N"]);
    expect(ids(check(edit, OTHER).dropped)).toEqual(["N"]);
  });

  it("stops outsiders moving a note out, deleting it, or editing its text", () => {
    expect(ids(check([{ ...note, frameId: null }], OTHER).dropped)).toEqual(["N"]);
    expect(ids(check([{ ...note, frameId: null, isDeleted: true }], OTHER).dropped)).toEqual(["N"]);
    expect(ids(check([{ ...label, text: "hacked" }], OTHER).dropped)).toEqual(["T"]);
  });

  it("stops outsiders putting things into a canvas, but not changing the rest of the board", () => {
    expect(ids(check([{ id: "new", type: "rectangle", frameId: "F" }], OTHER).dropped)).toEqual(["new"]);
    expect(ids(check([{ ...loose, x: 5 }], OTHER).allowed)).toEqual(["L"]);
  });

  it("lets only the owner (or board owner) change the team, and never the owner", () => {
    const outsider = check([{ ...frame, name: "x" }], OTHER);
    expect(ids(outsider.dropped)).toEqual(["F"]);

    const [byMate] = check([{ ...frame, name: "renamed", customData: { project: "p1", owner: MATE, editors: [MATE, OTHER] } }], MATE).allowed;
    expect(byMate.customData).toEqual({ project: "p1", owner: OWNER, editors: [MATE] });

    const [byOwner] = check([{ ...frame, customData: { project: "p1", owner: OWNER, editors: [MATE, OTHER, OTHER, OWNER, "nope"] } }], OWNER).allowed;
    expect(byOwner.customData).toEqual({ project: "p1", owner: OWNER, editors: [MATE, OTHER] });

    const [byStaff] = check([{ ...frame, customData: { project: "p1", owner: STAFF, editors: [] } }], STAFF, true).allowed;
    expect(byStaff.customData).toEqual({ project: "p1", owner: OWNER, editors: [] });
  });

  it("gives a new canvas to whoever saves it, whatever owner it claims", () => {
    const claimed = { id: "G", type: "frame", customData: { project: "p2", owner: OWNER, editors: [MATE] } };
    const [saved] = check([claimed], OTHER).allowed;
    expect(saved.customData).toEqual({ project: "p2", owner: OTHER, editors: [MATE] });
  });

  it("returns untouched changes as the same objects, and corrected frames as new ones", () => {
    const edit = { ...note, x: 10 };
    expect(check([edit], MATE).allowed[0]).toBe(edit);
    const spoof = { ...frame, customData: { project: "p1", owner: MATE, editors: [MATE] } };
    expect(check([spoof], MATE).allowed[0]).not.toBe(spoof);
  });

  it("falls back to the creator for canvases from before owners, and leaves ownerless ones open", () => {
    expect(accessOf({ id: "H", type: "frame", customData: { project: "p3", createdBy: OWNER } })).toEqual({ owner: OWNER, editors: [] });
    expect(accessOf({ id: "J", type: "frame", customData: { project: "p4" } })).toBeNull();
    expect(accessOf({ ...frame, isDeleted: true })).toBeNull();
    expect([...canvasAccessMap(current).keys()]).toEqual(["F"]);
  });

  it("caps and cleans the team list", () => {
    const many = Array.from({ length: MAX_EDITORS + 5 }, (_, i) => id(100 + i));
    expect(cleanEditors(many, OWNER)).toHaveLength(MAX_EDITORS);
    expect(cleanEditors("x", OWNER)).toEqual([]);
  });
});
