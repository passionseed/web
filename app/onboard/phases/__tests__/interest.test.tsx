import { act, fireEvent, render, screen } from "@testing-library/react";

import { InterestPhase } from "../interest";
import type { CollectedData } from "@/types/onboarding";

/*
 * The interests step used to disable "Next" until something was picked. On a
 * phone the greyed-out button read as a broken page and people stopped there.
 * Now the button always responds: with nothing picked it highlights the
 * interest buttons instead of moving on.
 */

const scrollIntoView = jest.fn();

beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
  window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as never;
});

beforeEach(() => {
  jest.useFakeTimers();
  scrollIntoView.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

function setup(data: Partial<CollectedData> = {}) {
  const advance = jest.fn();
  render(<InterestPhase data={{ language: "en", ...data } as CollectedData} advance={advance} goBack={jest.fn()} />);
  return { advance, next: () => screen.getByRole("button", { name: /pick at least one|next/i }) };
}

function aChip() {
  return screen.getAllByRole("button").find((button) => button.className.includes("rounded-2xl"))!;
}

test("with nothing picked, Next stays tappable and highlights the interests instead of moving on", () => {
  const { advance, next } = setup();

  expect(next()).not.toBeDisabled();
  expect(next()).toHaveAttribute("aria-disabled", "true");

  fireEvent.click(next());

  expect(advance).not.toHaveBeenCalled();
  expect(scrollIntoView).toHaveBeenCalledTimes(1);
  expect(aChip().className).toContain("border-blue-300/60");

  act(() => {
    jest.advanceTimersByTime(1500);
  });
  expect(aChip().className).not.toContain("border-blue-300/60");
});

test("after picking an interest, Next moves on with the picks", () => {
  const { advance, next } = setup();

  fireEvent.click(aChip());
  expect(next()).toHaveAttribute("aria-disabled", "false");

  fireEvent.click(next());

  expect(advance).toHaveBeenCalledWith("assessment", { interests: [expect.any(String)] });
  expect(scrollIntoView).not.toHaveBeenCalled();
});
