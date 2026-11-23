import { render, screen, within } from "@testing-library/react";

import { fullHealth } from "@/lib/elemental/island/healing";
import type { ElementalPublicIsland, ElementalPublicPlot } from "@/lib/supabase/elemental";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

import { ISLAND_COPY } from "../copy";
import { ElementalIslandView } from "../ElementalIslandView";
import { elementLevels, pictureVersion, plotLabel } from "../model";

/** Words that would mean a person, an account or a sign-up leaked into the page. */
const FORBIDDEN = /discord|registration|member/i;

const SEEDED: ElementalPublicPlot[] = [
  { slot: 3, element: "water", projectName: "Rain Barrel Tracker", counted: 2, lit: false, badges: 0 },
  { slot: 12, element: "fire", projectName: "Smoke Alert Map", counted: 6, lit: true, badges: 1 },
  { slot: 41, element: "fire", projectName: "Ash Sorter", counted: 0, lit: false, badges: 0 },
  { slot: 120, element: "aether", projectName: "Quiet Hours", counted: 3, lit: false, badges: 2 },
];

function island(plots: ElementalPublicPlot[], edition: ElementalPublicIsland["edition"] = "elemental-2026"): ElementalPublicIsland {
  return { edition, plots, health: fullHealth() };
}

afterEach(() => {
  jest.useRealTimers();
  mockRefresh.mockReset();
});

describe("ElementalIslandView", () => {
  it("lists every seeded project with its plot number and element, in slot order", () => {
    render(<ElementalIslandView island={island(SEEDED)} />);
    const rows = within(screen.getByTestId("island-legend")).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.textContent)).toEqual([
      "03Rain Barrel Trackerน้ำ",
      "12Smoke Alert Mapไฟ",
      "41Ash Sorterไฟ",
      "120Quiet Hoursธาตุที่มองไม่เห็น",
    ]);
    expect(screen.getByRole("img")).toHaveAttribute("alt", ISLAND_COPY.pictureAlt(4));
  });

  it("renders the plaza for an empty edition", () => {
    render(<ElementalIslandView island={island([])} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", ISLAND_COPY.plazaAlt);
    expect(img.getAttribute("src")).toMatch(/^\/hackathon\/island\/png\?layout=portrait&v=/);
    expect(screen.getByText(ISLAND_COPY.legendEmpty)).toBeInTheDocument();
    expect(screen.queryByTestId("island-legend")).not.toBeInTheDocument();
    // All five bars, empty.
    const bars = screen.getAllByRole("meter");
    expect(bars).toHaveLength(5);
    for (const bar of bars) expect(bar).toHaveAttribute("aria-valuenow", "0");
  });

  it("draws five level bars in the fixed element order, filled against the highest element", () => {
    render(<ElementalIslandView island={island(SEEDED)} />);
    const bars = screen.getAllByRole("meter");
    expect(bars.map((b) => b.getAttribute("aria-label"))).toEqual(["น้ำ", "ดิน", "ลม", "ไฟ", "ธาตุที่มองไม่เห็น"]);
    expect(bars.map((b) => b.getAttribute("aria-valuenow"))).toEqual(["33", "0", "0", "100", "50"]);
    expect(screen.getByText(ISLAND_COPY.levelLine(6, 2))).toBeInTheDocument();
  });

  it("serves portrait on phones and landscape on wider screens, both tagged with the picture version", () => {
    const { container } = render(<ElementalIslandView island={island(SEEDED)} />);
    const v = pictureVersion(SEEDED, fullHealth());
    expect(container.querySelector("source")).toHaveAttribute("media", "(min-width: 768px)");
    expect(container.querySelector("source")).toHaveAttribute("srcset", `/hackathon/island/png?layout=landscape&v=${v}`);
    expect(screen.getByRole("img")).toHaveAttribute("src", `/hackathon/island/png?layout=portrait&v=${v}`);
    expect(screen.getByRole("link", { name: ISLAND_COPY.openPicture })).toHaveAttribute(
      "href",
      `/hackathon/island/png?layout=landscape&v=${v}`
    );
  });

  it("keeps the dry-run edition on the picture URL", () => {
    render(<ElementalIslandView island={island(SEEDED, "elemental-dryrun")} />);
    expect(screen.getByRole("img").getAttribute("src")).toContain("edition=elemental-dryrun");
  });

  it("never prints a person, an account or a sign-up", () => {
    const { container } = render(<ElementalIslandView island={island(SEEDED)} />);
    expect(container.innerHTML).not.toMatch(FORBIDDEN);
    const empty = render(<ElementalIslandView island={island([])} />);
    expect(empty.container.innerHTML).not.toMatch(FORBIDDEN);
  });

  it("says so in a few words when the island cannot be read", () => {
    render(<ElementalIslandView island={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(ISLAND_COPY.unavailable);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("screen mode shows the landscape picture without the header and refreshes every 60 s", () => {
    jest.useFakeTimers();
    const { container } = render(<ElementalIslandView island={island(SEEDED)} screen />);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(container.querySelector("source")).toBeNull();
    expect(screen.getByRole("img").getAttribute("src")).toContain("layout=landscape");
    expect(screen.getByTestId("island-legend").querySelectorAll("li")).toHaveLength(4);
    jest.advanceTimersByTime(59_000);
    expect(mockRefresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1_000);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh outside screen mode", () => {
    jest.useFakeTimers();
    render(<ElementalIslandView island={island(SEEDED)} />);
    jest.advanceTimersByTime(120_000);
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});

describe("island model", () => {
  it("pads plot numbers like the island tags and the Discord legend", () => {
    expect([plotLabel(3), plotLabel(12), plotLabel(120)]).toEqual(["03", "12", "120"]);
  });

  it("changes the picture version whenever the picture would change", () => {
    const base = pictureVersion(SEEDED, fullHealth());
    expect(pictureVersion(SEEDED, fullHealth())).toBe(base);
    expect(pictureVersion([{ ...SEEDED[0], counted: 3 }, ...SEEDED.slice(1)], fullHealth())).not.toBe(base);
    expect(pictureVersion(SEEDED.slice(1), fullHealth())).not.toBe(base);
    expect(pictureVersion(SEEDED, { ...fullHealth(), fire: 0.4 })).not.toBe(base);
    // A project rename does not redraw the picture (names are not in it).
    expect(pictureVersion([{ ...SEEDED[0], projectName: "Renamed" }, ...SEEDED.slice(1)], fullHealth())).toBe(base);
  });

  it("levels are zero with no teams", () => {
    expect(elementLevels([]).every((l) => l.level === 0 && l.fill === 0 && l.teams === 0)).toBe(true);
  });
});
