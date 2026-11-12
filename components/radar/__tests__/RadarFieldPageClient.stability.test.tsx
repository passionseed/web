import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RadarFieldPageClient } from "../RadarFieldPageClient";
import { getSavedRadarReflectionChapterKeys } from "@/lib/supabase/radar";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/radar/RadarCards", () => ({
  RadarCardView: ({
    kind,
    onReflect,
  }: {
    kind: string;
    onReflect?: (payload: { rating?: number }) => void;
  }) => (
    <div>
      Radar card {kind}
      <button type="button" onClick={() => onReflect?.({ rating: 3 })}>
        reflect {kind}
      </button>
    </div>
  ),
  SourceRefs: () => null,
  CtaResourceLinks: () => null,
  ctaPathSlug: () => "interested",
  ctaResources: () => [],
}));

jest.mock("@/components/radar/RadarSkillExperience", () => ({
  RadarSkillExperience: () => null,
  StartOptionTile: () => null,
  firstStartOption: () => null,
}));

const mockTrack = jest.fn();
jest.mock("@/lib/radar-guide/use-radar-visit", () => ({
  useRadarVisit: () => mockVisit,
}));
const mockVisit = {
  visitId: null,
  attribution: null,
  tracker: {
    visitId: null,
    track: (...args: unknown[]) => mockTrack(...args),
    submitCareerRequest: async () => "ok" as const,
  },
};

jest.mock("@/components/radar/guide", () => {
  const helpers = jest.requireActual("@/components/radar/guide/guide-helpers");
  return {
    ...helpers,
    MidShareCard: () => <div>mid share</div>,
    GuideOutro: () => <div>outro</div>,
    GuideIntentButton: () => null,
    GuideProgramLine: () => null,
  };
});

jest.mock("@/lib/supabase/radar", () => ({
  getSavedRadarReflectionChapterKeys: jest.fn(async () => new Set()),
  submitRadarReflection: jest.fn(async () => undefined),
  syncPendingRadarReflections: jest.fn(async () => ({ synced: 0, remaining: 0 })),
  recordRadarFieldView: jest.fn(),
  recordRadarMyPathIntent: jest.fn(),
  recordRadarPathIntent: jest.fn(),
  routeRadarCardIntent: jest.fn(),
  syncPendingRadarMyPathEvents: jest.fn(async () => ({ synced: 0, remaining: 0 })),
}));

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "anonymous-user",
            is_anonymous: true,
            app_metadata: { provider: "anonymous" },
            identities: [],
          },
        },
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  }),
}));

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Each section is 1000px tall, stacked by its deck index; the deck is 1000px tall. */
const SECTION_HEIGHT = 1000;
function sectionIndex(element: HTMLElement): number {
  return Number(element.dataset.radarIndex ?? NaN);
}

const scrollTo = jest.fn();

beforeAll(() => {
  global.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    onchange: null,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  Object.defineProperty(HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get(this: HTMLElement) {
      const index = sectionIndex(this);
      return Number.isFinite(index) ? index * SECTION_HEIGHT : 0;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => SECTION_HEIGHT,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => SECTION_HEIGHT,
  });
  HTMLElement.prototype.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];
});

beforeEach(() => {
  window.history.replaceState(null, "", "/radar/ux-designer");
});

const field = {
  id: "field-1",
  slug: "ux-designer",
  color: "#3b82f6",
  emoji: "🎨",
  squad_url: null,
  name_th: "นักออกแบบ UX",
  researched_at: null,
};

function card(kind: string, position: number, content: Record<string, unknown> = {}) {
  return {
    id: `card-${kind}`,
    kind,
    position,
    content_th: { title: kind, ...content },
    content_en: null,
  };
}

test("does not reload saved reflections when unrelated renders keep the same cards", async () => {
  const cards = [card("hook", 1)];

  const view = render(
    <RadarFieldPageClient
      initialField={field as never}
      initialCards={cards as never}
    />
  );

  await waitFor(() =>
    expect(getSavedRadarReflectionChapterKeys).toHaveBeenCalledTimes(2)
  );

  view.rerender(
    <RadarFieldPageClient
      initialField={field as never}
      initialCards={cards as never}
    />
  );

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(getSavedRadarReflectionChapterKeys).toHaveBeenCalledTimes(2);
});

describe("with the mid-deck share card in the deck", () => {
  // Deck: 0 hook, 1 salary, 2 midShare, 3 aiImpact, 4 dayInLife, 5 outro.
  const cards = [
    card("hook", 0),
    card("salaryProgression", 1),
    card("aiImpact", 2),
    card("dayInLife", 3),
  ];

  function renderDeck() {
    return render(
      <RadarFieldPageClient
        initialField={field as never}
        initialCards={cards as never}
      />
    );
  }

  it("renders sections in deck order with no video sections or chapter labels", () => {
    const { container } = renderDeck();
    const order = Array.from(container.querySelectorAll<HTMLElement>("[data-radar-index]")).map(
      (el) => sectionIndex(el)
    );
    expect(order).toEqual([0, 1, 2, 3, 4, 5]);
    expect(screen.getByText("mid share")).toBeInTheDocument();
    expect(screen.getByText("outro")).toBeInTheDocument();
    expect(container.querySelector("video")).toBeNull();
    expect(container.textContent).not.toMatch(/\d\/7/);
    expect(screen.getByText("1/6")).toBeInTheDocument();
  });

  it("puts the AI blackout on the aiImpact section", async () => {
    const { container } = renderDeck();
    const deck = container.querySelector<HTMLElement>(".radar-deck")!;
    const blackout = container.querySelector<HTMLElement>(".radar-detail-blackout")!;

    // Section 3 (aiImpact) fills the viewport. A card-indexed lookup would
    // have pointed at section 2 and left the blackout off.
    deck.scrollTop = 3 * SECTION_HEIGHT;
    fireEvent.scroll(deck);
    await waitFor(() => expect(blackout.style.opacity).toBe("1"));

    deck.scrollTop = 1 * SECTION_HEIGHT;
    fireEvent.scroll(deck);
    await waitFor(() => expect(blackout.style.opacity).toBe("0"));
  });

  it("advances one section after a reflection", async () => {
    renderDeck();
    scrollTo.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "reflect salaryProgression" }));

    // salary is section 1; the next section is the mid-deck share card (2).
    await waitFor(() =>
      expect(scrollTo).toHaveBeenCalledWith({ top: 2 * SECTION_HEIGHT, behavior: "smooth" })
    );
  });

  it("sends no chapter_view events", async () => {
    mockTrack.mockClear();
    renderDeck();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockTrack.mock.calls.some(([event]) => (event as { type: string }).type === "chapter_view")).toBe(false);
  });

  it("neither jumps to nor rewrites a hash", async () => {
    window.history.replaceState(null, "", "/radar/ux-designer#money");
    scrollTo.mockClear();
    try {
      renderDeck();
      await act(async () => {
        await Promise.resolve();
      });
      expect(scrollTo).not.toHaveBeenCalled();
      expect(window.location.hash).toBe("#money");
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });
});
