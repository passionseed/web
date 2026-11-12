import { render } from "@testing-library/react";
import { ShiftPageView } from "./ShiftPageView";

const originalFetch = global.fetch;
const trackEvent = jest.fn();
beforeEach(() => {
  global.fetch = trackEvent;
  trackEvent.mockReset();
  trackEvent.mockResolvedValue({ ok: true });
  window.sessionStorage.clear();
});
afterAll(() => { global.fetch = originalFetch; });

function sentEvent() {
  expect(trackEvent).toHaveBeenCalledTimes(1);
  const [url, init] = trackEvent.mock.calls[0];
  expect(url).toBe("/api/hackathon/track-event");
  return JSON.parse(init.body);
}

test("records a view of the given page with the incoming source", () => {
  window.history.pushState({}, "", "/shift/3?utm_source=IG-Grid");
  render(<ShiftPageView pagePath="/shift/3" />);
  expect(sentEvent()).toEqual({
    event_type: "shift_page_view",
    page_path: "/shift/3",
    event_data: { source: "ig-grid" },
  });
});

test("keeps the tab's earlier source when the link has none", () => {
  window.sessionStorage.setItem("shift_source", "line");
  window.history.pushState({}, "", "/shift/apply");
  render(<ShiftPageView pagePath="/shift/apply" />);
  expect(sentEvent().event_data).toEqual({ source: "line" });
});

test("records an untagged visit without a source", () => {
  window.history.pushState({}, "", "/shift");
  render(<ShiftPageView pagePath="/shift" />);
  expect(sentEvent().event_data).toEqual({});
});
