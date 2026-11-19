import { fireEvent, render, screen } from "@testing-library/react";
import type { GuideIndexPage } from "@/lib/radar-guide/guide-types";
import type { GuideTracker } from "@/lib/radar-guide/types";
import { emptyProgress } from "@/lib/radar-guide/story";
import { GuideLevelTwoDoor } from "../../GuideOutro";
import { LEVEL_ONE_HEADING_TH, LEVEL_TWO_HEADING_TH, TieredLevelMap } from "../TieredLevelMap";

const SPLIT: GuideIndexPage[] = [
  { key: "mythos", order: 1, titleTh: "หนึ่ง", navLabelTh: "หนึ่ง", minutes: 1, tier: 1 },
  { key: "next", order: 2, titleTh: "สอง", navLabelTh: "สอง", minutes: 1, tier: 1 },
  { key: "doors", order: 3, titleTh: "สาม", navLabelTh: "สาม", minutes: 1, tier: 2 },
  { key: "money", order: 4, titleTh: "สี่", navLabelTh: "สี่", minutes: 1, tier: 2 },
];
const LEVEL_ONE_ONLY = SPLIT.slice(0, 2);

describe("TieredLevelMap", () => {
  it("shows Level 1 and Level 2 as two maps, numbered from 1, with the host on one level only", () => {
    render(
      <TieredLevelMap
        slug="cybersecurity"
        pages={SPLIT}
        progress={{ ...emptyProgress(), cleared: ["mythos", "next"] }}
        currentKey="doors"
        hrefFor={(k) => `/radar/cybersecurity/${k}`}
      />
    );
    expect(screen.getByText(LEVEL_ONE_HEADING_TH)).toBeInTheDocument();
    expect(screen.getByText(LEVEL_TWO_HEADING_TH)).toBeInTheDocument();
    const maps = screen.getAllByTestId("level-map");
    expect(maps).toHaveLength(2);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/radar/cybersecurity/mythos",
      "/radar/cybersecurity/next",
      "/radar/cybersecurity/doors",
      "/radar/cybersecurity/money",
      // Level 2 ends in the career's full deck.
      "/radar/cybersecurity?view=deck",
    ]);
    expect(links[2]).toHaveAccessibleName(/ด่าน 1:/);
    expect(links.filter((l) => l.getAttribute("aria-current") === "step")).toEqual([links[2]]);
  });

  it("opens Level 2 on the deck when the guide has no tier-2 pages", () => {
    render(
      <TieredLevelMap
        slug="ai-engineer"
        pages={LEVEL_ONE_ONLY}
        progress={emptyProgress()}
        hrefFor={(k) => `/radar/ai-engineer/${k}`}
      />
    );
    expect(screen.getAllByTestId("level-map")).toHaveLength(1);
    expect(screen.getByTestId("level-two-deck")).toHaveAttribute("href", "/radar/ai-engineer?view=deck");
  });
});

describe("GuideLevelTwoDoor", () => {
  it("links to Level 2 and sends cta_click level-two", () => {
    const tracker: GuideTracker & { track: jest.Mock } = {
      visitId: null,
      track: jest.fn(),
      submitCareerRequest: jest.fn(async () => "ok" as const),
    };
    render(<GuideLevelTwoDoor tracker={tracker} kind="pages" href="/radar/cybersecurity/doors" pageKey="next" />);
    expect(screen.getByText(/รอบ 1 Portfolio/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Level 2/ });
    expect(link).toHaveAttribute("href", "/radar/cybersecurity/doors");
    fireEvent.click(link);
    expect(tracker.track).toHaveBeenCalledWith(expect.objectContaining({ type: "cta_click", target: "level-two" }));
  });
});
