import { SHIFT_SOURCE_CAPTURE_SCRIPT, getShiftSource, normalizeShiftSource, withShiftSource } from "../attribution";

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/shift");
});

test("retains a reel source through gallery, round and application navigation", () => {
  window.history.replaceState({}, "", "/shift?utm_source=ig_reel_01");
  expect(getShiftSource()).toBe("ig_reel_01");
  window.history.replaceState({}, "", "/shift/1");
  expect(getShiftSource()).toBe("ig_reel_01");
  expect(withShiftSource("/shift/apply?round=1#form", getShiftSource()))
    .toBe("/shift/apply?round=1&utm_source=ig_reel_01#form");
  window.history.replaceState({}, "", "/shift/apply?round=1");
  expect(getShiftSource()).toBe("ig_reel_01");
});

test("a new explicit campaign replaces the previous source", () => {
  window.history.replaceState({}, "", "/shift?utm_source=camphub");
  getShiftSource();
  window.history.replaceState({}, "", "/shift?utm_source=line_bc");
  expect(getShiftSource()).toBe("line_bc");
});

test("rejects malformed and oversized sources without altering external URLs", () => {
  expect(normalizeShiftSource("https://example.com")).toBeNull();
  expect(normalizeShiftSource("x".repeat(81))).toBeNull();
  expect(normalizeShiftSource("IG_reel_01")).toBe("ig_reel_01");
  expect(withShiftSource("//example.com", "camphub")).toBe("//example.com");
});

test("reads query attribution when browser storage is blocked", () => {
  window.history.replaceState({}, "", "/shift?utm_source=camphub");
  const spy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(getShiftSource()).toBe("camphub");
  spy.mockRestore();
});

// The inline script in the SHIFT layout runs while the HTML loads, before React,
// in the page's global scope: indirect eval runs it the same way.
const runCaptureScript = () => (0, eval)(SHIFT_SOURCE_CAPTURE_SCRIPT);
// Taken before any test runs the script.
const PAGE_GLOBALS = new Set(Object.keys(window));

test("the early capture script remembers the channel before the page is interactive", () => {
  // A tap before hydration follows an untagged link; the channel must already be saved.
  window.history.replaceState({}, "", "/shift/3?utm_source=IG_Reel_01");
  runCaptureScript();
  window.history.replaceState({}, "", "/shift/apply?round=3");
  expect(getShiftSource()).toBe("ig_reel_01");
});

test("the early capture script leaves no globals behind on the page", () => {
  window.history.replaceState({}, "", "/shift/3?utm_source=camphub");
  runCaptureScript();
  expect(Object.keys(window).filter((key) => !PAGE_GLOBALS.has(key))).toEqual([]);
});

test("the early capture script keeps the saved channel on an untagged page and skips malformed ones", () => {
  window.sessionStorage.setItem("shift_source", "camphub");
  window.history.replaceState({}, "", "/shift/3");
  runCaptureScript();
  window.history.replaceState({}, "", "/shift/3?utm_source=https://example.com");
  runCaptureScript();
  expect(window.sessionStorage.getItem("shift_source")).toBe("camphub");
});

test("the early capture script never throws when browser storage is blocked", () => {
  window.history.replaceState({}, "", "/shift/3?utm_source=camphub");
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(runCaptureScript).not.toThrow();
  jest.restoreAllMocks();
});
