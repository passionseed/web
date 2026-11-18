import { fireEvent, render, screen } from "@testing-library/react";

import { SHIFT_COHORTS } from "@/lib/content/shift-cohort";

import { ShiftApplyForm } from "./ShiftApplyForm";

const [cohort, other] = SHIFT_COHORTS;

beforeEach(() => {
  window.history.replaceState({}, "", `/shift/apply?round=${cohort.round}&utm_source=camphub`);
  // Without storage, the URL is the only place the visitor's channel survives.
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
});

afterEach(() => jest.restoreAllMocks());

test("the other-week link offered for 'some days' keeps the visitor's channel", () => {
  render(<ShiftApplyForm cohort={cohort} source="camphub" otherRounds={[other]} />);

  fireEvent.click(screen.getByText("ว่างบางวัน"));

  const link = screen.getByRole("link", { name: new RegExp(other.name.replace(/[[\]]/g, "\\$&")) });
  const href = new URL(link.getAttribute("href") ?? "", "https://passionseed.org");
  expect(href.pathname + href.search).toBe(
    `${new URL(other.applyUrl, "https://passionseed.org").pathname}?round=${other.round}&utm_source=camphub`,
  );
});
