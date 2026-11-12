/**
 * The guide shell end to end in jsdom: one visit, `chapter_view` once per level,
 * the header's level and minutes, the sticky "ต่อ" stepper, and the game island's
 * skip and static answers. Engines, bespoke pieces, the visit hook and the
 * router are stubbed; the story components (U7) are real.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import type { GuideIndexEntry, GuidePage } from "@/lib/radar-guide/guide-types";
import { GuideShellProvider } from "../GuideShellProvider";
import { GuidePageView } from "../GuidePageView";
import { GameIsland } from "../GameIsland";

const push = jest.fn();
const prefetch = jest.fn();
let segment: string | null = "mythos";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, prefetch, replace: jest.fn(), back: jest.fn() }),
  useSelectedLayoutSegment: () => segment,
}));

const track = jest.fn();
const TRACKER = { visitId: "visit-1", track, submitCareerRequest: jest.fn() };
jest.mock("@/lib/radar-guide/use-radar-visit", () => ({
  useRadarVisit: () => ({ tracker: TRACKER, attribution: null }),
}));

jest.mock("@/components/radar/guide/games", () => {
  const Fake = ({ onResult }: { onResult(r: { done: boolean; score?: number; total?: number }): void }) => (
    <button type="button" onClick={() => onResult({ done: true, score: 1, total: 1 })}>
      fake-engine
    </button>
  );
  const loader = () => Promise.resolve({ default: Fake });
  return { ENGINE_LOADERS: new Proxy({}, { get: () => loader }) };
});

jest.mock("@/components/radar/guides/registry", () => ({
  loadBespoke: () => Promise.resolve({}),
}));

jest.mock("@/lib/radar/record-intent", () => ({ recordFieldIntent: jest.fn(() => true) }));

const INDEX: GuideIndexEntry = {
  slug: "cybersecurity",
  alias: "cyber",
  nameTh: "ไซเบอร์",
  nameEn: "Cyber",
  accent: "#5cff5c",
  status: "draft",
  asOf: "2026-11-11",
  intentPathSlug: "interested",
  pages: [
    { key: "mythos", order: 1, titleTh: "ด่านแรก", navLabelTh: "แรก", minutes: 2, games: 1 },
    { key: "doors", order: 2, titleTh: "ด่านสอง", navLabelTh: "สอง", minutes: 3.5, games: 0 },
  ],
};

const MYTHOS: GuidePage = {
  key: "mythos",
  order: 1,
  titleTh: "ด่านแรก",
  questionTh: "คำถามแรก",
  navLabelTh: "แรก",
  asOf: "2026-11-11",
  minutes: 2,
  factIds: [],
  og: { headlineTh: "หัวข้อ" },
  blocks: [
    { kind: "dialogue", id: "intro", lines: [{ speaker: "host", text: { th: "สวัสดี มาเริ่มกัน" } }] },
    {
      kind: "beat",
      id: "b",
      unlockLabelTh: "ลองเล่นเลย",
      blocks: [
        {
          kind: "game",
          id: "find",
          game: { engine: "FlipCards", data: { highlightTh: "x", cards: [] } },
          track: { done: "mythos:find-done", value: "none" },
          answersTh: ["บั๊กอยู่บรรทัดที่ห้า"],
        },
      ],
    },
  ],
};

function storage(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)!;
    out[k] = window.localStorage.getItem(k)!;
  }
  return out;
}

function renderLevel(page: GuidePage = MYTHOS) {
  return render(
    <GuideShellProvider index={INDEX}>
      <GuidePageView index={INDEX} page={page} clip={null} facts={[]} />
    </GuideShellProvider>
  );
}

beforeEach(() => {
  segment = "mythos";
  push.mockReset();
  prefetch.mockReset();
  track.mockReset();
  window.localStorage.clear();
  window.history.replaceState(null, "", "/radar/cybersecurity/mythos");
});

describe("GuideShellProvider", () => {
  it("fires chapter_view once per level and visit, with pageKey", () => {
    const view = renderLevel();
    const views = () => track.mock.calls.filter(([e]) => e.type === "chapter_view").map(([e]) => e.pageKey);
    expect(views()).toEqual(["mythos"]);

    view.rerender(
      <GuideShellProvider index={INDEX}>
        <GuidePageView index={INDEX} page={MYTHOS} clip={null} facts={[]} />
      </GuideShellProvider>
    );
    expect(views()).toEqual(["mythos"]);

    segment = "doors";
    view.rerender(
      <GuideShellProvider index={INDEX}>
        <div />
      </GuideShellProvider>
    );
    expect(views()).toEqual(["mythos", "doors"]);

    segment = "mythos";
    view.rerender(
      <GuideShellProvider index={INDEX}>
        <div />
      </GuideShellProvider>
    );
    expect(views()).toEqual(["mythos", "doors"]);
  });

  it("shows the level and the minutes left in the header, and prefetches the next level", () => {
    renderLevel();
    expect(screen.getByTestId("guide-top-rail")).toHaveTextContent("LV 1/2");
    // 2 + 3.5 minutes left from level 1, rounded up.
    expect(screen.getByTestId("guide-minutes-left")).toHaveTextContent("เหลือราว 6 นาที");
    expect(prefetch).toHaveBeenCalledWith("/radar/cybersecurity/doors");
  });

  it("reveals steps on 'ต่อ', then clears the level and moves on", () => {
    renderLevel();
    const next = screen.getByTestId("guide-next");
    expect(screen.getByTestId("step-intro")).toHaveAttribute("data-state", "shown");
    expect(screen.getByTestId("step-find")).toHaveAttribute("data-state", "ahead");
    expect(next).toHaveTextContent("ลองเล่นเลย");
    expect(next).toHaveAttribute("data-ready", "false");

    // The first press reads the typing line on (as a tap on the box would).
    fireEvent.click(next);
    expect(screen.getByTestId("step-find")).toHaveAttribute("data-state", "ahead");
    expect(next).toHaveAttribute("data-ready", "true");

    fireEvent.click(next);
    expect(screen.getByTestId("step-find")).toHaveAttribute("data-state", "shown");
    expect(next).toHaveTextContent("ด่านต่อไป");

    fireEvent.click(next);
    expect(push).toHaveBeenCalledWith("/radar/cybersecurity/doors");
    const saved = JSON.parse(storage()["radar-guide:v1:cybersecurity"]);
    expect(saved.cleared).toContain("mythos");
    expect(saved.visited).toContain("mythos");
  });

  it("skipping a game fires <pageKey>:skip, shows the answers and records a skipped result", () => {
    renderLevel();
    fireEvent.click(screen.getByTestId("guide-next")); // reads the intro line
    fireEvent.click(screen.getByTestId("guide-next"));
    fireEvent.click(screen.getByTestId("game-skip"));
    expect(track).toHaveBeenCalledWith({ type: "interactive_tap", pageKey: "mythos", target: "mythos:skip" });
    expect(screen.getByText("บั๊กอยู่บรรทัดที่ห้า")).toBeInTheDocument();
    expect(screen.queryByTestId("game-skip")).toBeNull();
    const saved = JSON.parse(storage()["radar-guide:v1:cybersecurity"]);
    expect(saved.games["mythos:find"]).toMatchObject({ done: true, skipped: true });
  });

  it("loads the engine and records its result", async () => {
    jest.useFakeTimers();
    try {
      renderLevel();
      fireEvent.click(screen.getByTestId("guide-next")); // reads the intro line
      fireEvent.click(screen.getByTestId("guide-next"));
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });
      jest.useRealTimers();
      fireEvent.click(await screen.findByText("fake-engine"));
      const saved = JSON.parse(storage()["radar-guide:v1:cybersecurity"]);
      expect(saved.games["mythos:find"]).toMatchObject({ done: true, score: 1 });
      expect(screen.getByTestId("guide-next")).toHaveAttribute("data-ready", "true");
    } finally {
      jest.useRealTimers();
    }
  });

  it("a cleared level reopens fully read, and one 'ต่อ' moves on (after a reload)", () => {
    const ENDS_ON_TALK: GuidePage = {
      ...MYTHOS,
      blocks: [
        ...MYTHOS.blocks,
        {
          kind: "dialogue",
          id: "outro",
          lines: [
            { speaker: "host", text: { th: "ผ่านด่านแรกแล้ว" } },
            { speaker: "host", text: { th: "ไปด่านต่อไปกัน" } },
            { speaker: "player", text: { th: "ไปเลย" } },
          ],
        },
      ],
    };
    window.localStorage.setItem(
      "radar-guide:v1:cybersecurity",
      JSON.stringify({ v: 1, visited: ["mythos"], cleared: ["mythos"], games: {}, choices: {} })
    );
    renderLevel(ENDS_ON_TALK);
    // Every speaker group is on screen, typed, on its last box.
    const outro = screen.getByTestId("step-outro");
    expect(outro).toHaveTextContent("ไปด่านต่อไปกัน");
    expect(outro).toHaveTextContent("ไปเลย");
    expect(screen.getByTestId("guide-next")).toHaveTextContent("ด่านต่อไป");
    fireEvent.click(screen.getByTestId("guide-next"));
    expect(push).toHaveBeenCalledWith("/radar/cybersecurity/doors");
  });

  it("demo mode sends nothing and writes nothing", () => {
    window.history.replaceState(null, "", "/radar/cybersecurity/mythos?demo=1");
    renderLevel();
    fireEvent.click(screen.getByTestId("guide-next"));
    fireEvent.click(screen.getByTestId("guide-next"));
    expect(track).not.toHaveBeenCalled();
    expect(storage()["radar-guide:v1:cybersecurity"]).toBeUndefined();
  });
});

describe("GameIsland server render (JS off)", () => {
  it("puts the static answers in the HTML", () => {
    const html = renderToStaticMarkup(
      <GuideShellProvider index={INDEX}>
        <GameIsland
          pageKey="mythos"
          blockId="find"
          game={{ engine: "FlipCards", data: { highlightTh: "x", cards: [] } }}
          track={{ done: "mythos:find-done", value: "none" }}
          answersTh={["บั๊กอยู่บรรทัดที่ห้า"]}
        />
      </GuideShellProvider>
    );
    expect(html).toContain("<noscript>");
    expect(html).toContain("บั๊กอยู่บรรทัดที่ห้า");
    expect(html).toContain("ข้ามเกม ดูเฉลย");
  });
});
