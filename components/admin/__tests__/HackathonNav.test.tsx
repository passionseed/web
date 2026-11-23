import { render, screen } from "@testing-library/react";

import { FIRST_EDITION_ITEMS, HACKATHON_ITEMS, HackathonNav, activeHackathonHref } from "../HackathonNav";

let mockPathname = "/admin/hackathon/elemental";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

describe("activeHackathonHref", () => {
  it("matches the current hackathon's tabs", () => {
    expect(activeHackathonHref("/admin/hackathon/elemental")).toBe("/admin/hackathon/elemental");
    expect(activeHackathonHref("/admin/hackathon/registrations")).toBe("/admin/hackathon/registrations");
  });

  it("matches an archived tab's own page and the pages under it", () => {
    const base = "/admin/archive/hackathon-healthcare";
    expect(activeHackathonHref(`${base}/teams`, FIRST_EDITION_ITEMS)).toBe(`${base}/teams`);
    expect(activeHackathonHref(`${base}/activities/abc/clusters`, FIRST_EDITION_ITEMS)).toBe(`${base}/activities`);
  });

  it("does not confuse tabs that share a prefix", () => {
    const base = "/admin/archive/hackathon-healthcare";
    expect(activeHackathonHref(`${base}/team-submissions`, FIRST_EDITION_ITEMS)).toBe(`${base}/team-submissions`);
    expect(activeHackathonHref(`${base}/team-finder`, FIRST_EDITION_ITEMS)).toBe(`${base}/team-finder`);
  });

  it("selects nothing on the bare section path, which only redirects", () => {
    expect(activeHackathonHref("/admin/hackathon")).toBeUndefined();
  });
});

describe("HackathonNav", () => {
  it("shows only Elemental's tabs by default", () => {
    mockPathname = "/admin/hackathon/registrations";
    render(<HackathonNav />);
    expect(screen.getAllByRole("link")).toHaveLength(HACKATHON_ITEMS.length);
    expect(screen.getByRole("link", { name: "Sign-ups and slips" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Teams" })).toBeNull();
  });

  it("shows the archived tabs when given them", () => {
    mockPathname = "/admin/archive/hackathon-healthcare/learning";
    render(<HackathonNav items={FIRST_EDITION_ITEMS} />);
    const learning = screen.getByRole("link", { name: "Learning" });
    expect(learning).toHaveAttribute("href", "/admin/archive/hackathon-healthcare/learning");
    expect(learning).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page")).toHaveLength(1);
  });
});
