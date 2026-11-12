import { focusElement, type FocusApi } from "./focusElement";

type Element = ReturnType<FocusApi["getSceneElements"]>[number];

const el = (id: string, type: string, isDeleted = false) => ({ id, type, isDeleted }) as unknown as Element;

function fakeApi(elements: Element[], zoom = 1.5) {
  const scrollToContent = jest.fn();
  const api = {
    getSceneElements: () => elements,
    getAppState: () => ({ zoom: { value: zoom } }),
    scrollToContent,
  } as unknown as FocusApi;
  return { api, scrollToContent };
}

const FRAME = el("frame_A1", "frame");
const NOTE = el("note-7", "rectangle");

describe("focusElement", () => {
  it("fits a frame (a SHIFT canvas) to the screen", () => {
    const { api, scrollToContent } = fakeApi([NOTE, FRAME]);
    expect(focusElement(api, "frame_A1", false)).toBe(true);
    expect(scrollToContent).toHaveBeenCalledTimes(1);
    expect(scrollToContent).toHaveBeenCalledWith(FRAME, { fitToViewport: true, viewportZoomFactor: 0.9, animate: true });
  });

  it("centres a note without zooming in past the current zoom or 100%", () => {
    const { api, scrollToContent } = fakeApi([FRAME, NOTE], 0.6);
    expect(focusElement(api, "note-7", false)).toBe(true);
    expect(scrollToContent).toHaveBeenCalledWith(NOTE, expect.objectContaining({ fitToViewport: true, maxZoom: 0.6, animate: true }));

    const zoomedIn = fakeApi([NOTE], 2.5);
    focusElement(zoomedIn.api, "note-7", false);
    expect(zoomedIn.scrollToContent).toHaveBeenCalledWith(NOTE, expect.objectContaining({ maxZoom: 1 }));
  });

  it("tolerates a broken zoom value", () => {
    const { api, scrollToContent } = fakeApi([NOTE], Number.NaN);
    focusElement(api, "note-7", false);
    expect(scrollToContent).toHaveBeenCalledWith(NOTE, expect.objectContaining({ maxZoom: 1 }));
  });

  it("jumps without animation for reduced motion", () => {
    const { api, scrollToContent } = fakeApi([FRAME, NOTE]);
    focusElement(api, "frame_A1", true);
    focusElement(api, "note-7", true);
    for (const call of scrollToContent.mock.calls) expect(call[1]).toMatchObject({ animate: false });
  });

  it("returns false and moves nothing for a missing or deleted element", () => {
    const { api, scrollToContent } = fakeApi([FRAME, el("gone", "rectangle", true)]);
    expect(focusElement(api, "nope", false)).toBe(false);
    expect(focusElement(api, "gone", false)).toBe(false);
    expect(scrollToContent).not.toHaveBeenCalled();
  });
});
