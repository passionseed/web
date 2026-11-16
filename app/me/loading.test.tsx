import { render, screen } from "@testing-library/react";

import Loading from "./loading";

test("shows a calm Dawn skeleton instead of a central spinner", () => {
  const { container } = render(<Loading />);

  expect(screen.getByRole("status", { name: /กำลังโหลด/ })).toBeInTheDocument();
  expect(container.firstElementChild).toHaveClass("dawn-theme");
  const bars = Array.from(container.querySelectorAll(".ei-skeleton"));
  expect(bars.length).toBeGreaterThan(2);
  // .ei-skeleton has no stylesheet rule, so each bar carries its own fill.
  for (const bar of bars) expect(bar.className).toMatch(/\bbg-white\//);
  expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
});
