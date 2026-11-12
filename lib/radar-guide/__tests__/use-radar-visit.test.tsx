import { act, renderHook, waitFor } from "@testing-library/react";
import { recordGuideEvent, recordRadarVisit } from "../events";
import { resetAttributionMemory } from "../attribution";
import { useRadarVisit } from "../use-radar-visit";

jest.mock("../events", () => ({
  ...jest.requireActual("../events"),
  recordRadarVisit: jest.fn().mockResolvedValue(undefined),
  recordGuideEvent: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  window.sessionStorage.clear();
  resetAttributionMemory();
});

test("records one visit with attribution, strips utm and sends queued events", async () => {
  window.history.replaceState(null, "", "/radar/cybersecurity?utm_source=ig-comment-dm&utm_medium=dm&from=plan#money");
  const { result, rerender } = renderHook(() => useRadarVisit("cybersecurity"));

  // Tracked during the first render, before the visit id exists.
  act(() => result.current.tracker.track({ type: "chapter_view", chapterKey: "hook" }));

  await waitFor(() => expect(result.current.visitId).not.toBeNull());
  rerender();
  expect(recordRadarVisit).toHaveBeenCalledTimes(1);
  expect(recordRadarVisit).toHaveBeenCalledWith({
    visitId: result.current.visitId,
    fieldSlug: "cybersecurity",
    attribution: expect.objectContaining({ utm_source: "ig-comment-dm", utm_medium: "dm" }),
  });
  expect(window.location.search).toBe("?from=plan");
  expect(window.location.hash).toBe("#money");
  expect(result.current.tracker.visitId).toBe(result.current.visitId);
  expect(recordGuideEvent).toHaveBeenCalledWith(
    { visitId: result.current.visitId, fieldSlug: "cybersecurity" },
    { type: "chapter_view", chapterKey: "hook" }
  );
});

test("a remount within the visit window reuses the visit and does not record it again", async () => {
  window.history.replaceState(null, "", "/radar");
  const first = renderHook(() => useRadarVisit(null));
  await waitFor(() => expect(first.result.current.visitId).not.toBeNull());
  const id = first.result.current.visitId;
  first.unmount();
  jest.mocked(recordRadarVisit).mockClear();

  const second = renderHook(() => useRadarVisit(null));
  await waitFor(() => expect(second.result.current.visitId).toBe(id));
  expect(recordRadarVisit).not.toHaveBeenCalled();
});
