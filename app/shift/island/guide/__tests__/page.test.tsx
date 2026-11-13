import { render, screen, within } from "@testing-library/react";

import {
  GUIDE_CAMPFIRE,
  GUIDE_COINS,
  GUIDE_HERO,
  GUIDE_SECTIONS,
  GUIDE_START,
} from "@/lib/content/shift-island-guide";

import { ROOT_LEVELS, ROOTS_H, ROOTS_W, rootsGrid } from "../roots";
import Page, { metadata } from "../page";

// The touch-glow replayer needs matchMedia, which jsdom lacks; it draws nothing.
jest.mock("@/components/ui/in-view-animator", () => ({ InViewAnimator: () => null }));

describe("/shift/island/guide", () => {
  it("renders every section in order, each with its heading", () => {
    const { container } = render(<Page />);
    expect(screen.getByRole("heading", { level: 1, name: GUIDE_HERO.heading })).toBeInTheDocument();
    const ids = Array.from(container.querySelectorAll("section[id]")).map((s) => s.id);
    expect(ids).toEqual(GUIDE_SECTIONS.map((s) => s.id));
    for (const s of GUIDE_SECTIONS) {
      const section = container.querySelector(`#${s.id}`) as HTMLElement;
      expect(within(section).getByRole("heading", { level: 2 })).toHaveTextContent(s.title);
    }
  });

  it("links the contents to each section", () => {
    render(<Page />);
    const nav = screen.getByRole("navigation", { name: GUIDE_HERO.toc });
    const hrefs = within(nav).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(GUIDE_SECTIONS.map((s) => `#${s.id}`));
  });

  it("shows the campfire buttons, the coin commands and the way onto the island", () => {
    render(<Page />);
    for (const step of GUIDE_CAMPFIRE.steps) expect(screen.getByText(step.label)).toBeInTheDocument();
    for (const c of GUIDE_COINS.commands) expect(screen.getByText(c.command)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: GUIDE_START.island })).toHaveAttribute("href", "/shift/island");
  });

  it("is not indexed", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("guide roots picture", () => {
  it("draws a full grid at every level, each level adding to the last", () => {
    let previous = 0;
    for (let level = 1; level <= ROOT_LEVELS; level++) {
      const grid = rootsGrid(level);
      expect(grid).toHaveLength(ROOTS_H);
      for (const row of grid) expect(row).toHaveLength(ROOTS_W);
      const drawn = grid.join("").replace(/\./g, "").length;
      expect(drawn).toBeGreaterThan(previous);
      previous = drawn;
    }
  });

  it("clamps out-of-range levels", () => {
    expect(rootsGrid(0)).toEqual(rootsGrid(1));
    expect(rootsGrid(99)).toEqual(rootsGrid(ROOT_LEVELS));
  });
});
