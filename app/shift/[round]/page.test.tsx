import { render, screen, waitFor } from "@testing-library/react";

import { getShiftCohort } from "@/lib/content/shift-cohort";

import ShiftRoundPage from "./page";

// Only the clock is frozen: timers stay real so effects and waitFor behave normally.
const ONLY_DATE = [
  "nextTick", "setImmediate", "clearImmediate", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
  "queueMicrotask", "requestAnimationFrame", "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback",
  "hrtime", "performance",
] as const;

beforeEach(() => {
  window.sessionStorage.clear();
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as unknown as typeof fetch;
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  } as unknown as typeof IntersectionObserver;
  // jsdom has no media playback; the testimonial reels pause offscreen videos.
  jest.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  jest.spyOn(window.HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  // Without storage, the URL is the only place the visitor's channel survives.
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test("a closed round sends visitors to the other rounds without losing their channel", async () => {
  // The day after SHIFT[1]'s deadline, every apply CTA on its page is the "see other rounds" link.
  const deadline = Date.parse(`${getShiftCohort(1)!.applyDeadline}T12:00:00+07:00`);
  jest.useFakeTimers({ now: deadline + 24 * 60 * 60 * 1000, doNotFake: [...ONLY_DATE] });
  window.history.replaceState({}, "", "/shift/1?utm_source=camphub");

  render(await ShiftRoundPage({ params: Promise.resolve({ round: "1" }) }));

  const links = screen.getAllByRole("link", { name: /ดูรุ่นอื่น/ });
  expect(links.length).toBeGreaterThan(0);
  await waitFor(() => {
    for (const link of links) expect(link).toHaveAttribute("href", "/shift?utm_source=camphub");
  });
});
