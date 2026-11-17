import { render, screen, waitFor } from "@testing-library/react";

import { ShiftTopBar } from "./ShiftTopBar";

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/shift");
});

afterEach(() => jest.restoreAllMocks());

const backPill = () => screen.getByRole("link", { name: /รายละเอียด SHIFT\[3\]/ });

test("the back pill keeps the channel when browser storage is blocked", async () => {
  // Without storage, the URL is the only place the channel survives: an
  // untagged back link files the next application as "direct".
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  window.history.replaceState({}, "", "/shift/apply?round=3&utm_source=camphub");

  render(<ShiftTopBar back={{ href: "/shift/3", label: "รายละเอียด SHIFT[3]", solid: true }} />);

  await waitFor(() => expect(backPill()).toHaveAttribute("href", "/shift/3?utm_source=camphub"));
});

test("the back pill carries the channel remembered in this tab, so a new tab keeps it", async () => {
  window.sessionStorage.setItem("shift_source", "ig_reel_01");
  window.history.replaceState({}, "", "/shift/apply?round=3");

  render(<ShiftTopBar back={{ href: "/shift/3", label: "รายละเอียด SHIFT[3]", solid: true }} />);

  await waitFor(() => expect(backPill()).toHaveAttribute("href", "/shift/3?utm_source=ig_reel_01"));
});

test("a back pill that leaves SHIFT is not tagged", () => {
  window.sessionStorage.setItem("shift_source", "camphub");
  window.history.replaceState({}, "", "/login?utm_source=camphub");

  // render() flushes effects, so any tagging would already be applied here.
  render(<ShiftTopBar back={{ href: "/", label: "กลับหน้าแรก" }} />);

  expect(screen.getByRole("link", { name: /กลับหน้าแรก/ })).toHaveAttribute("href", "/");
});
