import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { toast } from "sonner";

import { equipItem, pickGift, plantSeed } from "@/app/shift/island/tree-actions";
import type { IslandHotspot } from "@/lib/shift-island/picture";
import { keynoteQuest } from "@/lib/supabase/shift-quests/board";
import type { MyTree } from "@/lib/supabase/shift-quests/types";

import { makeBoard } from "../__fixtures__/board";
import { PLOT, TREE } from "../copy";
import { clearAllDrafts } from "../drafts";
import { PlotSheet } from "../PlotSheet";
import { QuestBoard } from "../QuestBoard";
import { GiftPicker } from "../tree/GiftPicker";
import { TreeSheet } from "../tree/TreeSheet";

jest.mock("@/app/shift/island/tree-actions", () => ({
  plantSeed: jest.fn(),
  pickGift: jest.fn(),
  equipItem: jest.fn(),
}));
jest.mock("@/app/shift/island/news-actions", () => ({ hideTeamNews: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title }, createElement("p", null, description), children as never) : null,
  };
});

// The close-up canvas: what it was asked to draw (jsdom has no 2D canvas).
jest.mock("../tree/TreeCanvas", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    TreeCanvas: ({ input, view }: { input: unknown; view?: string }) =>
      createElement("div", { "data-testid": "tree-canvas", "data-input": JSON.stringify(input), "data-view": view ?? "full" }),
  };
});

const GIFT_ID = "7c1d2e3f-4a5b-4c6d-8e7f-000000000001";
const DEFAULTS = ["shape:round", "leaf:forest", "bark:oak", "bloom:cream"];

function tree(over: Partial<MyTree> = {}): MyTree {
  return {
    seed: "oak",
    equipped: { shape: "shape:round", leaf: "leaf:autumn", bark: "bark:oak", bloom: "bloom:cream" },
    owned: [...DEFAULTS, "leaf:autumn", "bark:birch"],
    gifts: [],
    roots: { count: 6, recent: 2 },
    stage: 3,
    ...over,
  };
}

const GIFT = { id: GIFT_ID, options: ["leaf:mint", "leaf:gold", "leaf:dusk"] };

const canvases = (scope: HTMLElement = document.body) =>
  within(scope)
    .queryAllByTestId("tree-canvas")
    .map((el) => ({ input: JSON.parse(el.getAttribute("data-input") ?? "null"), view: el.getAttribute("data-view") }));

const giftGroup = () => screen.getByRole("group", { name: TREE.gift.sub });

/** The close-up itself (gift and wardrobe tiles are "tree" previews). */
const main = () => canvases().find((c) => c.view === "full")!;

/** Every button in the scope, in order, is the one named so (accessible names, not text). */
function expectButtons(scope: HTMLElement, names: string[]) {
  expect(within(scope).getAllByRole("button")).toEqual(names.map((name) => within(scope).getByRole("button", { name })));
}

function renderSheet(t: MyTree, over: Partial<Parameters<typeof TreeSheet>[0]> = {}) {
  return render(<TreeSheet open tree={t} onClose={jest.fn()} {...over} />);
}

beforeEach(() => {
  jest.mocked(pickGift).mockReset();
  jest.mocked(plantSeed).mockReset();
  jest.mocked(equipItem).mockReset();
  jest.mocked(toast.success).mockReset();
  jest.mocked(toast.error).mockReset();
});

describe("TreeSheet", () => {
  it("draws the team's own tree with its roots and the recent glow", () => {
    renderSheet(tree());
    const sheet = screen.getByRole("dialog", { name: TREE.closeup.title });
    expect(canvases(sheet).filter((c) => c.view === "full")).toEqual([{
      input: {
        style: { shape: "shape:round", leaf: "leaf:autumn", bark: "bark:oak", bloom: "bloom:cream" },
        stage: 3,
        seeded: true,
        roots: { count: 6, recent: 2 },
      },
      view: "full",
    }]);
    expect(sheet).toHaveTextContent(TREE.closeup.roots(6));
    expect(sheet).toHaveTextContent(TREE.closeup.caption);
  });

  it("shows the seed card while the team has no seed, and plants the chosen seed with the idea", async () => {
    const planted = tree({ seed: "pine", stage: 0 });
    jest.mocked(plantSeed).mockResolvedValue({ ok: true, data: { tree: planted } });
    renderSheet(tree({ seed: null, stage: 0, roots: { count: 0, recent: 0 } }));
    const card = screen.getByRole("region", { name: TREE.seed.title });
    // Four seeds, each named, each drawn in its own look.
    for (const id of ["oak", "sakura", "pine", "maple"] as const) {
      expect(within(card).getByRole("radio", { name: new RegExp(TREE.seeds[id].name) })).toBeInTheDocument();
    }
    expect(canvases(card)).toHaveLength(4);
    expect(screen.getByText(TREE.seed.askHint)).toBeInTheDocument();

    fireEvent.change(within(card).getByLabelText(TREE.seed.ask), { target: { value: "  เว็บจองโต๊ะอ่านหนังสือ " } });
    fireEvent.click(within(card).getByRole("radio", { name: new RegExp(TREE.seeds.pine.name) }));
    await act(async () => {
      fireEvent.click(within(card).getByRole("button", { name: TREE.seed.action }));
    });
    expect(plantSeed).toHaveBeenCalledTimes(1);
    expect(plantSeed).toHaveBeenCalledWith("pine", "เว็บจองโต๊ะอ่านหนังสือ");
    expect(toast.success).toHaveBeenCalledWith(TREE.seed.planted);
    // The seed is in: the card goes and the close-up shows the planted seed.
    expect(screen.queryByRole("region", { name: TREE.seed.title })).toBeNull();
    expect(main().input).toMatchObject({ seeded: true, style: { shape: "shape:round" } });
  });

  it("starts the line from the project's ambition, says so, and plants the line as edited", async () => {
    jest.mocked(plantSeed).mockResolvedValue({ ok: true, data: { tree: tree({ seed: "oak", stage: 0 }) } });
    renderSheet(tree({ seed: null, stage: 0, ambition: "แอปจองโต๊ะอ่านหนังสือ" }));
    const card = screen.getByRole("region", { name: TREE.seed.title });
    const line = within(card).getByLabelText(TREE.seed.ask);
    expect(line).toHaveValue("แอปจองโต๊ะอ่านหนังสือ");
    expect(line).toHaveAccessibleDescription(TREE.seed.askHintPrefilled);
    expect(within(card).queryByText(TREE.seed.askHint)).toBeNull();

    fireEvent.change(line, { target: { value: "แอปจองโต๊ะอ่านหนังสือในโรงเรียน" } });
    fireEvent.click(within(card).getByRole("radio", { name: new RegExp(TREE.seeds.oak.name) }));
    await act(async () => {
      fireEvent.click(within(card).getByRole("button", { name: TREE.seed.action }));
    });
    expect(plantSeed).toHaveBeenCalledWith("oak", "แอปจองโต๊ะอ่านหนังสือในโรงเรียน");
  });

  it("starts empty without an ambition (none, or blank)", () => {
    renderSheet(tree({ seed: null, stage: 0, ambition: "   " }));
    const card = screen.getByRole("region", { name: TREE.seed.title });
    expect(within(card).getByLabelText(TREE.seed.ask)).toHaveValue("");
    expect(within(card).getByText(TREE.seed.askHint)).toBeInTheDocument();
  });

  it("asks for the idea and the seed before sending anything", () => {
    renderSheet(tree({ seed: null, stage: 0 }));
    const card = screen.getByRole("region", { name: TREE.seed.title });
    fireEvent.click(within(card).getByRole("button", { name: TREE.seed.action }));
    expect(within(card).getByText(TREE.seed.needIdea)).toBeInTheDocument();
    expect(within(card).getByText(TREE.seed.needSeed)).toBeInTheDocument();
    expect(plantSeed).not.toHaveBeenCalled();
  });

  it("shows the refusal when a teammate chose a seed first, and keeps the form", async () => {
    jest.mocked(plantSeed).mockResolvedValue({ ok: false, code: "seed_planted", error: "ทีมเลือกเมล็ดไปแล้ว" });
    renderSheet(tree({ seed: null, stage: 0 }));
    const card = screen.getByRole("region", { name: TREE.seed.title });
    fireEvent.change(within(card).getByLabelText(TREE.seed.ask), { target: { value: "เว็บจองโต๊ะ" } });
    fireEvent.click(within(card).getByRole("radio", { name: new RegExp(TREE.seeds.oak.name) }));
    await act(async () => {
      fireEvent.click(within(card).getByRole("button", { name: TREE.seed.action }));
    });
    expect(toast.error).toHaveBeenCalledWith("ทีมเลือกเมล็ดไปแล้ว");
  });

  it("shows no seed card once the team has a seed, and no gift card without a gift", () => {
    renderSheet(tree());
    expect(screen.queryByRole("region", { name: TREE.seed.title })).toBeNull();
    expect(screen.queryByRole("group", { name: TREE.gift.sub })).toBeNull();
    expect(screen.queryByText(TREE.gift.waiting(1))).toBeNull();
  });

  it("offers a waiting gift as three options named after the items", () => {
    renderSheet(tree({ gifts: [GIFT] }));
    expect(screen.getByText(TREE.gift.waiting(1))).toBeInTheDocument();
    expectButtons(giftGroup(), ["มิ้นต์", "ทอง", "ม่วงค่ำ"]);
    // Which part of the tree each option changes, as its description.
    expect(within(giftGroup()).getByRole("button", { name: "มิ้นต์" })).toHaveAccessibleDescription(TREE.slots.leaf);
  });

  it("skips a waiting gift whose every option the team owns, and counts only the others", () => {
    const STALE = { id: "7c1d2e3f-4a5b-4c6d-8e7f-000000000002", options: ["leaf:autumn"] };
    renderSheet(tree({ gifts: [STALE, GIFT] }));
    expect(screen.getByText(TREE.gift.waiting(1))).toBeInTheDocument();
    expectButtons(giftGroup(), ["มิ้นต์", "ทอง", "ม่วงค่ำ"]);
  });

  it("picks a gift option: one call, the tree updates", async () => {
    const after = tree({ equipped: { ...tree().equipped, leaf: "leaf:gold" }, owned: [...tree().owned, "leaf:gold"], gifts: [] });
    jest.mocked(pickGift).mockResolvedValue({ ok: true, data: { tree: after } });
    renderSheet(tree({ gifts: [GIFT] }));
    await act(async () => {
      fireEvent.click(within(giftGroup()).getByRole("button", { name: "ทอง" }));
    });
    expect(pickGift).toHaveBeenCalledTimes(1);
    expect(pickGift).toHaveBeenCalledWith(GIFT_ID, "leaf:gold");
    expect(toast.success).toHaveBeenCalledWith(TREE.gift.picked("ทอง"));
    expect(screen.queryByRole("group", { name: TREE.gift.sub })).toBeNull();
    expect(main().input.style.leaf).toBe("leaf:gold");
  });

  it("lists only the owned items of each slot in the wardrobe and marks the one in use", () => {
    renderSheet(tree());
    const wardrobe = screen.getByRole("region", { name: TREE.wardrobe.heading });
    const tabs = within(wardrobe).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual([TREE.slots.shape, TREE.slots.leaf, TREE.slots.bark, TREE.slots.bloom]);

    fireEvent.mouseDown(within(wardrobe).getByRole("tab", { name: TREE.slots.leaf }));
    const panel = within(wardrobe).getByRole("tabpanel");
    expectButtons(panel, ["ป่าเขียว", "ใบไม้แดง"]);
    expect(within(panel).getByRole("button", { name: "ใบไม้แดง" })).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getByRole("button", { name: "ป่าเขียว" })).toHaveAttribute("aria-pressed", "false");
    expect(within(panel).queryByRole("button", { name: "มิ้นต์" })).toBeNull();
    expect(panel).toHaveTextContent(TREE.wardrobe.using);

    fireEvent.mouseDown(within(wardrobe).getByRole("tab", { name: TREE.slots.bark }));
    expectButtons(within(wardrobe).getByRole("tabpanel"), ["โอ๊ก", "เบิร์ช"]);
  });

  it("puts an owned item on the tree from the wardrobe", async () => {
    const after = tree({ equipped: { ...tree().equipped, leaf: "leaf:forest" } });
    jest.mocked(equipItem).mockResolvedValue({ ok: true, data: { tree: after } });
    renderSheet(tree());
    const wardrobe = screen.getByRole("region", { name: TREE.wardrobe.heading });
    fireEvent.mouseDown(within(wardrobe).getByRole("tab", { name: TREE.slots.leaf }));
    await act(async () => {
      fireEvent.click(within(wardrobe).getByRole("button", { name: "ป่าเขียว" }));
    });
    expect(equipItem).toHaveBeenCalledWith("leaf:forest");
    expect(within(wardrobe).getByRole("button", { name: "ป่าเขียว" })).toHaveAttribute("aria-pressed", "true");
    expect(main().input.style.leaf).toBe("leaf:forest");
  });

  it("takes in a newer tree from the page", () => {
    const { rerender } = renderSheet(tree());
    rerender(<TreeSheet open tree={tree({ stage: 5 })} onClose={jest.fn()} />);
    expect(main().input.stage).toBe(5);
  });
});

describe("GiftPicker", () => {
  it("draws each option as the team's own tree wearing that item", () => {
    render(<GiftPicker tree={tree({ stage: 6 })} gift={GIFT} onPicked={jest.fn()} />);
    const drawn = canvases(giftGroup());
    expect(drawn.map((c) => c.input.style.leaf)).toEqual(["leaf:mint", "leaf:gold", "leaf:dusk"]);
    for (const c of drawn) {
      expect(c.input).toMatchObject({ stage: 6, seeded: true, style: { shape: "shape:round", bark: "bark:oak", bloom: "bloom:cream" } });
      expect(c.view).toBe("tree");
    }
  });

  it("shows a leaf shape option as a close look at the leaves, where shapes differ", () => {
    render(<GiftPicker tree={tree({ stage: 2 })} gift={{ id: GIFT_ID, options: ["shape:heart", "shape:star", "leaf:sky"] }} onPicked={jest.fn()} />);
    expect(canvases().map((c) => [c.input.style.shape, c.input.stage, c.view])).toEqual([
      ["shape:heart", 5, "canopy"],
      ["shape:star", 5, "canopy"],
      ["shape:round", 5, "tree"],
    ]);
    expect(within(giftGroup()).getByRole("button", { name: "หัวใจ" })).toHaveAccessibleDescription(TREE.slots.shape);
  });

  it("shows a blossom option at blossom, so a young tree still shows it", () => {
    render(<GiftPicker tree={tree({ stage: 1 })} gift={{ id: GIFT_ID, options: ["bloom:sakura"] }} onPicked={jest.fn()} />);
    const [only] = canvases();
    expect(only.input).toMatchObject({ stage: 7, style: { bloom: "bloom:sakura" } });
    // Fewer than three left: the line does not promise three.
    expect(screen.getByText(TREE.gift.subFew)).toBeInTheDocument();
  });

  it("sends one pick for a double click", async () => {
    let resolve: (value: Awaited<ReturnType<typeof pickGift>>) => void = () => undefined;
    jest.mocked(pickGift).mockReturnValue(new Promise((r) => (resolve = r)));
    const onPicked = jest.fn();
    render(<GiftPicker tree={tree()} gift={GIFT} onPicked={onPicked} />);
    const mint = within(giftGroup()).getByRole("button", { name: "มิ้นต์" });
    fireEvent.click(mint);
    fireEvent.click(mint);
    fireEvent.click(within(giftGroup()).getByRole("button", { name: "ทอง" }));
    expect(pickGift).toHaveBeenCalledTimes(1);
    const after = tree({ equipped: { ...tree().equipped, leaf: "leaf:mint" } });
    await act(async () => resolve({ ok: true, data: { tree: after } }));
    expect(onPicked).toHaveBeenCalledTimes(1);
    expect(onPicked).toHaveBeenCalledWith(after);
  });

  it("shows the refusal for a gift a teammate already picked, and offers it no more", async () => {
    jest.mocked(pickGift).mockResolvedValue({ ok: false, code: "gift_gone", error: "ของขวัญชิ้นนี้ถูกเลือกไปแล้ว ดูลุคที่ทีมมีได้ในลุคของต้นไม้" });
    const onPicked = jest.fn();
    render(<GiftPicker tree={tree()} gift={GIFT} onPicked={onPicked} />);
    await act(async () => {
      fireEvent.click(within(giftGroup()).getByRole("button", { name: "มิ้นต์" }));
    });
    expect(toast.error).toHaveBeenCalledWith("ของขวัญชิ้นนี้ถูกเลือกไปแล้ว ดูลุคที่ทีมมีได้ในลุคของต้นไม้");
    expect(screen.getByRole("status")).toHaveTextContent(TREE.gift.gone);
    expect(screen.queryByRole("button", { name: "มิ้นต์" })).toBeNull();
    expect(onPicked).not.toHaveBeenCalled();
  });

  it("lets the student try again after any other failure", async () => {
    jest.mocked(pickGift).mockResolvedValueOnce({ ok: false, code: "unknown", error: "ลองใหม่" });
    render(<GiftPicker tree={tree()} gift={GIFT} onPicked={jest.fn()} />);
    await act(async () => {
      fireEvent.click(within(giftGroup()).getByRole("button", { name: "มิ้นต์" }));
    });
    expect(toast.error).toHaveBeenCalledWith("ลองใหม่");
    jest.mocked(pickGift).mockResolvedValueOnce({ ok: true, data: { tree: tree() } });
    await act(async () => {
      fireEvent.click(within(giftGroup()).getByRole("button", { name: "มิ้นต์" }));
    });
    expect(pickGift).toHaveBeenCalledTimes(2);
  });

  it("offers เก็บไว้ก่อน only when the caller handles it", () => {
    const onLater = jest.fn();
    const { rerender } = render(<GiftPicker tree={tree()} gift={GIFT} onPicked={jest.fn()} />);
    expect(screen.queryByRole("button", { name: TREE.gift.keep })).toBeNull();
    rerender(<GiftPicker tree={tree()} gift={GIFT} onPicked={jest.fn()} onLater={onLater} />);
    fireEvent.click(screen.getByRole("button", { name: TREE.gift.keep }));
    expect(onLater).toHaveBeenCalledTimes(1);
    expect(pickGift).not.toHaveBeenCalled();
  });

  it("never offers a look the team owns by now (a teammate took it from another gift)", () => {
    render(<GiftPicker tree={tree({ owned: [...tree().owned, "leaf:gold"] })} gift={GIFT} onPicked={jest.fn()} />);
    expectButtons(screen.getByRole("group", { name: TREE.gift.subFew }), ["มิ้นต์", "ม่วงค่ำ"]);
  });

  it("shows nothing for a gift whose every option the team owns", () => {
    const { container } = render(
      <GiftPicker tree={tree({ owned: [...tree().owned, ...GIFT.options] })} gift={GIFT} onPicked={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("leaves out an option the catalog no longer has", () => {
    render(<GiftPicker tree={tree()} gift={{ id: GIFT_ID, options: ["leaf:mint", "leaf:plaid", "leaf:gold"] }} onPicked={jest.fn()} />);
    expectButtons(screen.getByRole("group", { name: TREE.gift.subFew }), ["มิ้นต์", "ทอง"]);
  });
});

describe("QuestBoard seed card", () => {
  beforeEach(() => clearAllDrafts());

  function renderBoard(t: MyTree | null | undefined, onSeed = jest.fn()) {
    const board = makeBoard();
    render(
      <QuestBoard
        board={board}
        stage={0}
        goal={null}
        keynote={keynoteQuest(board)}
        onOpen={jest.fn()}
        onPropose={jest.fn()}
        tree={t}
        onSeed={onSeed}
      />,
    );
    return onSeed;
  }

  it("shows the seed card at the top while the team has no seed, and opens the tree", () => {
    const onSeed = renderBoard(tree({ seed: null, stage: 0 }));
    const card = screen.getByRole("button", { name: new RegExp(TREE.seed.title) });
    const nav = screen.getByRole("group", { name: "หมวดบนกระดานเควสต์" });
    expect(card.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(card);
    expect(onSeed).toHaveBeenCalledTimes(1);
  });

  it("shows no seed card below schema 13 (no tree) or once a seed is chosen", () => {
    renderBoard(null);
    expect(screen.queryByRole("button", { name: new RegExp(TREE.seed.title) })).toBeNull();
    renderBoard(tree());
    expect(screen.queryByRole("button", { name: new RegExp(TREE.seed.title) })).toBeNull();
  });
});

describe("PlotSheet close-up of another team's plot", () => {
  function spot(over: Partial<IslandHotspot> = {}): IslandHotspot {
    return { slot: 4, mine: false, plain: false, stage: 5, name: "ร้านขนม", x: 10, y: 10, w: 5, h: 5, ...over };
  }

  it("draws no tree for a plain plot", () => {
    render(<PlotSheet hotspot={spot({ plain: true, stage: 0, name: null })} onClose={jest.fn()} />);
    expect(screen.getByRole("dialog", { name: PLOT.heading(4) })).toBeInTheDocument();
    expect(canvases()).toHaveLength(0);
  });

  it("draws a visible plot's tree in its style and stage, roots from its public level only", () => {
    const style = { shape: "shape:maple", leaf: "leaf:autumn", bark: "bark:birch", bloom: "bloom:lantern" };
    render(<PlotSheet hotspot={spot({ style, seeded: true, roots: 2 })} onClose={jest.fn()} />);
    expect(canvases()).toEqual([{ input: { style, stage: 5, seeded: true, roots: { count: 8, recent: 0 } }, view: "full" }]);
  });

  it.each([
    [undefined, 0],
    [1, 3],
    [3, 15],
    [9, 15],
  ])("turns roots level %s into %s roots, never a glow", (level, count) => {
    render(<PlotSheet hotspot={spot({ roots: level })} onClose={jest.fn()} />);
    const [drawn] = canvases();
    expect(drawn.input.roots).toEqual({ count, recent: 0 });
    // No style shown: the default tree.
    expect(drawn.input.style).toEqual({ shape: "shape:round", leaf: "leaf:forest", bark: "bark:oak", bloom: "bloom:cream" });
  });

  it("names a planted seed at stage 0 as the seed", () => {
    render(<PlotSheet hotspot={spot({ stage: 0, seeded: true })} onClose={jest.fn()} />);
    expect(screen.getByText(PLOT.stage("เมล็ด"))).toBeInTheDocument();
  });
});
