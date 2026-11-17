import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { HUD, MENU, PRE_STAGE, stageName } from "../copy";
import { MenuSheet, ProjectBody, type MenuTile } from "../HudSheets";
import { NEWS } from "../news/copy";
import { PLAYER_MENU } from "../player/copy";
import { PRIZES_UI } from "../prizes/copy";

jest.mock("@/app/shift/island/actions", () => ({ setShowName: jest.fn() }));
jest.mock("@/app/shift/island/admin-actions", () => ({ resetMyIsland: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../IslandDiscordButton", () => ({ IslandDiscordButton: () => null }));
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, children }: { open: boolean; title: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title }, children as never) : null,
  };
});

const SUGGEST_URL = "https://discord.com/channels/444444444444444444/555555555555555555";
const PROJECT = { id: "55555555-5555-4555-8555-000000000001", show_name: false, name_visible: false };

function menu(props: Partial<ComponentProps<typeof MenuSheet>> = {}) {
  return render(
    <MenuSheet
      open
      onClose={jest.fn()}
      me={{ name: "พลอย", avatarUrl: null, staff: false }}
      project={PROJECT}
      whole={false}
      onToggleWhole={jest.fn()}
      tiles={[]}
      {...props}
    />,
  );
}

describe("MenuSheet: the suggestions link", () => {
  it.each([
    ["with a project", PROJECT],
    ["before a plot is claimed", null],
  ])("opens the suggestions channel on Discord in a new tab %s", (_label, project) => {
    menu({ suggestUrl: SUGGEST_URL, project });
    const sheet = screen.getByRole("dialog", { name: HUD.menu });
    const link = within(sheet).getByRole("link", { name: "เสนอไอเดีย / แจ้งบั๊ก" });
    expect(link).toHaveAttribute("href", SUGGEST_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("เสนอไอเดีย / แจ้งบั๊ก");
    expect(link).toHaveAccessibleDescription(HUD.suggestHint);
  });

  it.each([
    ["null", null],
    ["unset", undefined],
    ["empty", ""],
  ])("is hidden when the link is %s", (_label, suggestUrl) => {
    menu({ suggestUrl });
    expect(screen.getByRole("dialog", { name: HUD.menu })).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByText(HUD.suggestHint)).toBeNull();
    expect(screen.queryByText(/เสนอไอเดีย/)).toBeNull();
  });

  it("keeps the view switch above the link", () => {
    menu({ suggestUrl: SUGGEST_URL });
    const view = screen.getByRole("button", { name: "ดูทั้งเกาะ" });
    const link = screen.getByRole("link", { name: HUD.suggest });
    expect(view.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("MenuSheet: the places", () => {
  const tiles = (): MenuTile[] => [
    { id: "news", icon: "news", label: NEWS.menu, onClick: jest.fn() },
    { id: "prizes", icon: "trophy", label: PRIZES_UI.menu, onClick: jest.fn() },
    { id: "guide", icon: "signpost", label: MENU.guide, href: "/shift/island/guide" },
    { id: "canvas", icon: "note", label: MENU.canvas, href: "/shift/island/canvas", external: true },
    { id: "sound", icon: "megaphone", label: MENU.soundOff, pressed: true, onClick: jest.fn() },
  ];

  it("lays out every place it is given as a tile, each doing its own thing", () => {
    const given = tiles();
    menu({ tiles: given });
    const grid = screen.getByRole("list", { name: MENU.places });
    expect(within(grid).getAllByRole("listitem")).toHaveLength(given.length);
    fireEvent.click(within(grid).getByRole("button", { name: NEWS.menu }));
    fireEvent.click(within(grid).getByRole("button", { name: PRIZES_UI.menu }));
    expect(given[0].onClick).toHaveBeenCalledTimes(1);
    expect(given[1].onClick).toHaveBeenCalledTimes(1);
    expect(within(grid).getByRole("button", { name: NEWS.menu })).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("links a page in place, the canvas in a new tab, and says whether a switch is on", () => {
    menu({ tiles: tiles() });
    expect(screen.getByRole("link", { name: MENU.guide })).toHaveAttribute("href", "/shift/island/guide");
    const canvas = screen.getByRole("link", { name: MENU.canvas });
    expect(canvas).toHaveAttribute("target", "_blank");
    const sound = screen.getByRole("button", { name: MENU.soundOff });
    expect(sound).toHaveAttribute("aria-pressed", "true");
    expect(sound).not.toHaveAttribute("aria-haspopup");
  });

  it("puts the consent step first, with its reason, above the places and the view switch", () => {
    const onConsent = jest.fn();
    menu({ tiles: tiles(), onConsent });
    const consent = screen.getByRole("button", { name: PLAYER_MENU.consent });
    expect(consent).toHaveAccessibleDescription(PLAYER_MENU.consentHint);
    fireEvent.click(consent);
    expect(onConsent).toHaveBeenCalledTimes(1);
    const order = [consent, screen.getByRole("list", { name: MENU.places }), screen.getByRole("button", { name: "ดูทั้งเกาะ" })];
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("has no grid and no consent row when given none", () => {
    menu({ project: null });
    expect(screen.queryByRole("list", { name: MENU.places })).toBeNull();
    expect(screen.queryByRole("button", { name: PLAYER_MENU.consent })).toBeNull();
    expect(screen.getByRole("button", { name: "ดูทั้งเกาะ" })).toBeInTheDocument();
  });
});

describe("ProjectBody: the team's tree", () => {
  const tree = { seed: "oak", equipped: { shape: "shape:round", leaf: "leaf:forest", bark: "bark:oak", bloom: "bloom:cream" }, owned: [], gifts: [], roots: { count: 0, recent: 0 }, stage: 0 };

  it("calls a planted seed at stage 0 the seed, never an empty plot", () => {
    const { unmount } = render(<ProjectBody project={{ name: "แอป", stage: 0 }} tree={tree} season={null} today={null} />);
    expect(screen.getByText(HUD.myTree(PRE_STAGE))).toBeInTheDocument();
    unmount();
    render(<ProjectBody project={{ name: "แอป", stage: 0 }} tree={{ ...tree, seed: null }} season={null} today={null} />);
    expect(screen.getByText(HUD.myTree(stageName(0)))).toBeInTheDocument();
  });
});
