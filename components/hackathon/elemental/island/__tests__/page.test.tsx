import { render, screen } from "@testing-library/react";

import { fullHealth } from "@/lib/elemental/island/healing";
import type { ElementalPublicEdition, ElementalPublicIsland } from "@/lib/supabase/elemental";

const mockIsland = jest.fn<Promise<ElementalPublicIsland | null>, [ElementalPublicEdition]>();

jest.mock("@/lib/supabase/elemental", () => ({
  ...jest.requireActual("@/lib/supabase/elemental"),
  getElementalPublicIsland: (edition: ElementalPublicEdition) => mockIsland(edition),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock("@/components/hackathon/elemental/fonts", () => ({ trirong: { variable: "font-trirong" } }));

import ElementalIslandPage, { dynamic, metadata } from "@/app/hackathon/island/page";

async function renderPage(params: Record<string, string>) {
  render(await ElementalIslandPage({ searchParams: Promise.resolve(params) }));
}

beforeEach(() => mockIsland.mockReset());

describe("/hackathon/island page", () => {
  it("is read at request time and kept out of search", () => {
    expect(dynamic).toBe("force-dynamic");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("reads the event edition by default and shows its legend", async () => {
    mockIsland.mockResolvedValue({
      edition: "elemental-2026",
      plots: [{ slot: 5, element: "earth", projectName: "Soil Diary", counted: 1, lit: false, badges: 0 }],
      health: fullHealth(),
    });
    await renderPage({});
    expect(mockIsland).toHaveBeenCalledWith("elemental-2026");
    expect(screen.getByText("Soil Diary")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("passes ?screen=1 and an allowed ?edition through", async () => {
    mockIsland.mockResolvedValue({ edition: "elemental-dryrun", plots: [], health: fullHealth() });
    await renderPage({ screen: "1", edition: "elemental-dryrun" });
    expect(mockIsland).toHaveBeenCalledWith("elemental-dryrun");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
