import { act, fireEvent, render, screen } from "@testing-library/react";

import { LETTER_CHAPTERS, MAP, PROLOGUE, SEAL } from "@/lib/content/shift-island-invite";

import { IslandInvite } from "./IslandInvite";

const FESTIVAL = "เทศกาลเปิดอยู่ตอนนี้";
const scrollIntoView = jest.fn();
let reducedMotion = false;

beforeEach(() => {
  scrollIntoView.mockReset();
  reducedMotion = false;
  Element.prototype.scrollIntoView = scrollIntoView;
  // jsdom has none; the prologue observes its line markers.
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: query.includes("reduce") && reducedMotion,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
});

it("opens on the prologue by default", () => {
  render(<IslandInvite viewer={{ kind: "canRsvp" }} festival={FESTIVAL} />);
  expect(screen.getByText(PROLOGUE[0])).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: LETTER_CHAPTERS[0].title })).not.toBeInTheDocument();
});

it("opens on the letter, not the prologue, when sent back to the seal", () => {
  render(<IslandInvite viewer={{ kind: "signedOut" }} festival={FESTIVAL} initialScene="letter" />);
  expect(screen.getByRole("heading", { name: LETTER_CHAPTERS[0].title })).toBeInTheDocument();
  expect(screen.queryByText(PROLOGUE[0])).not.toBeInTheDocument();
});

it("brings an alumnus back from sign-in straight to a focused seal", () => {
  render(<IslandInvite viewer={{ kind: "canRsvp" }} festival={FESTIVAL} initialScene="letter" />);
  const seal = screen.getByRole("button", { name: SEAL.press });
  expect(seal).toHaveFocus();
  expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
});

it("jumps to the seal without smooth scrolling under reduced motion", () => {
  reducedMotion = true;
  render(<IslandInvite viewer={{ kind: "canRsvp" }} festival={FESTIVAL} initialScene="letter" />);
  expect(screen.getByRole("button", { name: SEAL.press })).toHaveFocus();
  expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ behavior: "auto" }));
});

it("does not move focus to the seal when the letter opens on its own", () => {
  render(<IslandInvite viewer={{ kind: "canRsvp" }} festival={FESTIVAL} />);
  expect(scrollIntoView).not.toHaveBeenCalled();
});

it("folds the letter away to show the island and opens it again", () => {
  jest.useFakeTimers();
  window.scrollTo = jest.fn();
  try {
    render(<IslandInvite viewer={{ kind: "signedOut" }} festival={FESTIVAL} initialScene="letter" />);
    const letter = screen.getByRole("article");

    fireEvent.click(screen.getByRole("button", { name: MAP.close }));
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(letter).not.toBeVisible();
    const open = screen.getByRole("button", { name: MAP.open });
    expect(open).toHaveFocus();

    fireEvent.click(open);
    expect(letter).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: LETTER_CHAPTERS[0].title })).toHaveFocus();
    expect(screen.queryByRole("button", { name: MAP.open })).not.toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});
