import { render, screen } from "@testing-library/react";

import { HACKATHON_ITEMS, HackathonNav, activeHackathonHref } from "../HackathonNav";

let mockPathname = "/admin/hackathon/activities";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

describe("activeHackathonHref", () => {
  it("matches a tab's own page and the pages under it", () => {
    expect(activeHackathonHref("/admin/hackathon/teams")).toBe("/admin/hackathon/teams");
    expect(activeHackathonHref("/admin/hackathon/activities/abc/clusters")).toBe("/admin/hackathon/activities");
  });

  it("does not confuse tabs that share a prefix", () => {
    expect(activeHackathonHref("/admin/hackathon/team-submissions")).toBe("/admin/hackathon/team-submissions");
    expect(activeHackathonHref("/admin/hackathon/team-finder")).toBe("/admin/hackathon/team-finder");
  });

  it("selects nothing on the bare section path, which only redirects", () => {
    expect(activeHackathonHref("/admin/hackathon")).toBeUndefined();
  });
});

describe("HackathonNav", () => {
  it("has no Overview tab and links the Learning page", () => {
    expect(HACKATHON_ITEMS.map((i) => i.label)).not.toContain("Overview");
    mockPathname = "/admin/hackathon/learning";
    render(<HackathonNav />);
    const learning = screen.getByRole("link", { name: "Learning" });
    expect(learning).toHaveAttribute("href", "/admin/hackathon/learning");
    expect(learning).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page")).toHaveLength(1);
  });
});
