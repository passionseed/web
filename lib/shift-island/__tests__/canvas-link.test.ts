import { canvasHref, CANVAS_ROUTE, ELEMENT_ID, whiteboardFocusHref } from "@/lib/shift-island/canvas-link";

const BOARD = "9d1f2c3b-4a5e-4f60-8a7b-1c2d3e4f5a6b";

describe("ELEMENT_ID", () => {
  it.each(["frame-1", "aB3_x-Y", "a".repeat(100)])("accepts %s", (id) => {
    expect(ELEMENT_ID.test(id)).toBe(true);
  });

  it.each(["", "a".repeat(101), "a b", "x?y", "../admin", "a/b", "é", "id#1", "a&focus=b"])("refuses %p", (id) => {
    expect(ELEMENT_ID.test(id)).toBe(false);
  });
});

describe("canvasHref", () => {
  it("is the canvas route without a note", () => {
    expect(CANVAS_ROUTE).toBe("/shift/island/canvas");
    expect(canvasHref()).toBe(CANVAS_ROUTE);
    expect(canvasHref(null)).toBe(CANVAS_ROUTE);
    expect(canvasHref("")).toBe(CANVAS_ROUTE);
  });

  it("adds a valid note id", () => {
    expect(canvasHref("n-problem_2")).toBe("/shift/island/canvas?note=n-problem_2");
  });

  it("drops a note id that is not a plain element id", () => {
    expect(canvasHref("x&y=1")).toBe(CANVAS_ROUTE);
    expect(canvasHref("../../admin")).toBe(CANVAS_ROUTE);
    expect(canvasHref("a".repeat(101))).toBe(CANVAS_ROUTE);
  });
});

describe("whiteboardFocusHref", () => {
  it("is the board with a valid focus id", () => {
    expect(whiteboardFocusHref(BOARD, "frame-1")).toBe(`/whiteboard/${BOARD}?focus=frame-1`);
  });

  it("is the board alone without a focus id or with an invalid one", () => {
    expect(whiteboardFocusHref(BOARD, null)).toBe(`/whiteboard/${BOARD}`);
    expect(whiteboardFocusHref(BOARD, "x?y")).toBe(`/whiteboard/${BOARD}`);
    expect(whiteboardFocusHref(BOARD, "")).toBe(`/whiteboard/${BOARD}`);
  });
});
