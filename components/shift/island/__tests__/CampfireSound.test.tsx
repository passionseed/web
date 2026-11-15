import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createCampfireAudio } from "../campfireAudio";
import { CampfireSound } from "../CampfireSound";

jest.mock("../campfireAudio", () => ({ createCampfireAudio: jest.fn() }));
const create = jest.mocked(createCampfireAudio);

beforeEach(() => {
  create.mockReset();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

function audio() {
  const context = { resume: jest.fn().mockResolvedValue(undefined), suspend: jest.fn().mockResolvedValue(undefined), close: jest.fn().mockResolvedValue(undefined) };
  create.mockReturnValue(context as unknown as AudioContext);
  return context;
}

it("starts silent, plays on tap, and closes the audio on mute", async () => {
  const context = audio();
  render(<CampfireSound className="sound" />);
  expect(create).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "เปิดเสียงกองไฟ" }));
  const mute = await screen.findByRole("button", { name: "ปิดเสียงกองไฟ" });
  expect(mute).toHaveAttribute("aria-pressed", "true");
  expect(context.resume).toHaveBeenCalledTimes(1);
  fireEvent.click(mute);
  expect(context.close).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
});

it("pauses in a hidden tab, resumes when visible, and closes on leaving the island", async () => {
  const context = audio();
  const view = render(<CampfireSound className="sound" />);
  fireEvent.click(screen.getByRole("button"));
  await screen.findByRole("button", { name: "ปิดเสียงกองไฟ" });
  Object.defineProperty(document, "hidden", { configurable: true, value: true });
  fireEvent(document, new Event("visibilitychange"));
  expect(context.suspend).toHaveBeenCalledTimes(1);
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
  fireEvent(document, new Event("visibilitychange"));
  expect(context.resume).toHaveBeenCalledTimes(2);
  view.unmount();
  expect(context.close).toHaveBeenCalledTimes(1);
});

it("offers a retry when browser audio fails", async () => {
  const context = audio();
  context.resume.mockRejectedValueOnce(new Error("blocked"));
  render(<CampfireSound className="sound" />);
  fireEvent.click(screen.getByRole("button"));
  const retry = await screen.findByRole("button", { name: "เปิดเสียงไม่ได้ ลองอีกครั้ง" });
  expect(context.close).toHaveBeenCalledTimes(1);
  fireEvent.click(retry);
  await screen.findByRole("button", { name: "ปิดเสียงกองไฟ" });
});

it("closes audio even when unmounted while resume is pending", async () => {
  const context = audio();
  let resolve!: () => void;
  context.resume.mockReturnValueOnce(new Promise<void>((done) => { resolve = done; }));
  const view = render(<CampfireSound className="sound" />);
  fireEvent.click(screen.getByRole("button"));
  view.unmount();
  expect(context.close).toHaveBeenCalledTimes(1);
  await act(async () => { resolve(); });
  await waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
});
