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

  it("stops outsiders overwriting a canvas by sending its id as another type", () => {
    expect(ids(check([{ id: "F", type: "rectangle", isDeleted: true }], OTHER).dropped)).toEqual(["F"]);
    expect(ids(check([{ id: "F", type: "frame", customData: { owner: OTHER } }], OTHER).dropped)).toEqual(["F"]);
  });

  it("lets a teammate rename and move a canvas, but only its owner delete, retype or untag it", () => {
    expect(ids(check([{ ...frame, name: "ใหม่", x: 40 }], MATE).allowed)).toEqual(["F"]);
    expect(ids(check([{ ...frame, isDeleted: true }], MATE).dropped)).toEqual(["F"]);
    expect(ids(check([{ ...frame, type: "rectangle" }], MATE).dropped)).toEqual(["F"]);
    expect(ids(check([{ ...frame, customData: { owner: OWNER, editors: [MATE] } }], MATE).dropped)).toEqual(["F"]);
    expect(ids(check([{ ...frame, isDeleted: true }], OWNER).allowed)).toEqual(["F"]);
    expect(ids(check([{ ...frame, isDeleted: true }], STAFF, true).allowed)).toEqual(["F"]);
  });

  it("keeps a deleted canvas its owner's: no one else can bring it back as theirs", () => {
    const gone = [{ ...frame, isDeleted: true }, note];
    const back = { ...frame, isDeleted: false, customData: { project: "p1", owner: MATE, editors: [] } };
    expect(ids(enforceCanvasAccess(gone, [back], MATE, false).dropped)).toEqual(["F"]);
    expect(ids(enforceCanvasAccess(gone, [back], OTHER, false).dropped)).toEqual(["F"]);
    const [restored] = enforceCanvasAccess(gone, [{ ...back, customData: { project: "p1" } }], OWNER, false).allowed;
    expect(restored.customData).toMatchObject({ owner: OWNER });
  });

  it("stops outsiders putting things into a canvas, but not changing the rest of the board", () => {
    expect(ids(check([{ id: "new", type: "rectangle", frameId: "F" }], OTHER).dropped)).toEqual(["new"]);
    expect(ids(check([{ ...loose, x: 5 }], OTHER).allowed)).toEqual(["L"]);
  });

  it("lets only the owner or a moderator change the team or hand the canvas over", () => {
    const outsider = check([{ ...frame, name: "x" }], OTHER);
    expect(ids(outsider.dropped)).toEqual(["F"]);

    const [byMate] = check([{ ...frame, name: "renamed", customData: { project: "p1", owner: MATE, editors: [MATE, OTHER] } }], MATE).allowed;
    expect(byMate.customData).toEqual({ project: "p1", owner: OWNER, editors: [MATE] });

    const [byOwner] = check([{ ...frame, customData: { project: "p1", owner: OWNER, editors: [MATE, OTHER, OTHER, OWNER, "nope"] } }], OWNER).allowed;
    expect(byOwner.customData).toEqual({ project: "p1", owner: OWNER, editors: [MATE, OTHER] });

    const [handed] = check([{ ...frame, customData: { project: "p1", owner: MATE, editors: [OWNER] } }], OWNER).allowed;
    expect(handed.customData).toEqual({ project: "p1", owner: MATE, editors: [OWNER] });

    const [byStaff] = check([{ ...frame, customData: { project: "p1", owner: OTHER, editors: [] } }], STAFF, true).allowed;
    expect(byStaff.customData).toEqual({ project: "p1", owner: OTHER, editors: [] });

    // Not a user id: the owner stays.
    const [garbled] = check([{ ...frame, customData: { project: "p1", owner: "nope", editors: [MATE] } }], OWNER).allowed;
    expect(garbled.customData).toMatchObject({ owner: OWNER });
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
    expect(accessOf({ ...frame, isDeleted: true })).toEqual({ owner: OWNER, editors: [MATE] });
    expect([...canvasAccessMap(current).keys()]).toEqual(["F"]);
  });

  it("caps, cleans and sorts the team list the way Postgres does", () => {
    const many = Array.from({ length: MAX_EDITORS + 5 }, (_, i) => id(100 + i)).reverse();
    const kept = cleanEditors(many, OWNER);
    expect(kept).toHaveLength(MAX_EDITORS);
    // Postgres keeps the first 30 in byte order, so both copies keep the same people.
    expect(kept).toEqual([...many].sort().slice(0, MAX_EDITORS));
    expect(cleanEditors("x", OWNER)).toEqual([]);
    expect(cleanEditors(["0000000-0000-4000-8000-0000000000099", "------------------------------------"], OWNER)).toEqual([]);
  });

  it("treats a note's text as part of every canvas its note was in or is going into", () => {
    // Text moving to a note outside the canvas still came from one inside it.
    const outside = { id: "M", type: "rectangle", frameId: null };
    const moved = enforceCanvasAccess([...current, outside], [{ ...label, containerId: "M" }], OTHER, false);
    expect(ids(moved.dropped)).toEqual(["T"]);
  });
});
