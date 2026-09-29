import { getShiftSource, normalizeShiftSource, withShiftSource } from "../attribution";

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
