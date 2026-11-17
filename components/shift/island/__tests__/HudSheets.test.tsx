import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { FOOTER, HUD, MENU, PRE_STAGE, stageName } from "../copy";
import { MenuSheet, ProjectBody, type MenuItem } from "../HudSheets";
import { NEWS } from "../news/copy";
import { PLAYER_MENU } from "../player/copy";

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
function menu(props: Partial<ComponentProps<typeof MenuSheet>> = {}) {
  return render(
    <MenuSheet
      open
      onClose={jest.fn()}
      me={{ name: "พลอย", avatarUrl: null, staff: false }}
      claimed
      whole={false}
      onToggleWhole={jest.fn()}
      items={[]}
      {...props}
    />,
  );
}

describe("MenuSheet: the suggestions link", () => {
  it.each([
    ["with a project", true],
    ["before a plot is claimed", false],
  ])("opens the suggestions channel on Discord in a new tab %s", (_label, claimed) => {
    menu({ suggestUrl: SUGGEST_URL, claimed });
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

describe("MenuSheet: the ตั้งค่า fold", () => {
  it("folds the switches, the island view, suggestions and the account under one closed line after the list", () => {
    const sound: MenuItem = { id: "sound", icon: "megaphone", label: MENU.sound, state: MENU.off, pressed: false, onClick: jest.fn() };
    menu({ items: [{ id: "guide", icon: "signpost", label: MENU.guide, href: "/shift/island/guide" }], settings: [sound], suggestUrl: SUGGEST_URL });
    const sheet = screen.getByRole("dialog", { name: HUD.menu });
    const fold = within(sheet).getByText(MENU.settings).closest("details") as HTMLElement;
    expect(fold).not.toHaveAttribute("open");
    expect(within(sheet).getByRole("list", { name: HUD.menu }).compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(fold).getByRole("button", { name: MENU.sound }));
    expect(sound.onClick).toHaveBeenCalledTimes(1);
    expect(within(fold).getByRole("button", { name: "ดูทั้งเกาะ" })).toBeInTheDocument();
    expect(within(fold).getByRole("link", { name: "เสนอไอเดีย / แจ้งบั๊ก" })).toBeInTheDocument();
    expect(within(fold).getByText(/พลอย/)).toBeInTheDocument();
    // The short list itself holds only what it is given.
    expect(within(within(sheet).getByRole("list", { name: HUD.menu })).queryByRole("button", { name: MENU.sound })).toBeNull();
  });
});

describe("MenuSheet: the short list", () => {
  const items = (): MenuItem[] => [
    { id: "guide", icon: "signpost", label: MENU.guide, href: "/shift/island/guide" },
    { id: "news", icon: "news", label: NEWS.menu, onClick: jest.fn() },
    { id: "sound", icon: "megaphone", label: MENU.sound, state: MENU.on, pressed: true, onClick: jest.fn() },
    { id: "rest", icon: "moon", label: MENU.rest, action: true, onClick: jest.fn() },
  ];

  it("lists every line it is given, one under the other, each doing its own thing", () => {
    const given = items();
    menu({ items: given });
    const list = screen.getByRole("list", { name: HUD.menu });
    expect(within(list).getAllByRole("listitem")).toHaveLength(given.length);
    const news = within(list).getByRole("button", { name: NEWS.menu });
    expect(news).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(news);
    expect(given[1].onClick).toHaveBeenCalledTimes(1);
    expect(within(list).getByRole("link", { name: MENU.guide })).toHaveAttribute("href", "/shift/island/guide");
  });

  it("says whether a switch is on, and opens nothing from a switch or an action", () => {
    const given = items();
    menu({ items: given });
    const sound = screen.getByRole("button", { name: MENU.sound });
    expect(sound).toHaveAttribute("aria-pressed", "true");
    expect(sound).not.toHaveAttribute("aria-haspopup");
    expect(sound).toHaveTextContent(MENU.on);
    const rest = screen.getByRole("button", { name: MENU.rest });
    expect(rest).not.toHaveAttribute("aria-haspopup");
    expect(rest).not.toHaveAttribute("aria-pressed");
    fireEvent.click(rest);
    expect(given[3].onClick).toHaveBeenCalledTimes(1);
  });

  it("puts the consent step first, with its reason, above the list and the view switch", () => {
    const onConsent = jest.fn();
    menu({ items: items(), onConsent });
    const consent = screen.getByRole("button", { name: PLAYER_MENU.consent });
    expect(consent).toHaveAccessibleDescription(PLAYER_MENU.consentHint);
    fireEvent.click(consent);
    expect(onConsent).toHaveBeenCalledTimes(1);
    const order = [consent, screen.getByRole("list", { name: HUD.menu }), screen.getByRole("button", { name: "ดูทั้งเกาะ" })];
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("has no list and no consent row when given none", () => {
    menu({ claimed: false });
    expect(screen.queryByRole("list", { name: HUD.menu })).toBeNull();
    expect(screen.queryByRole("button", { name: PLAYER_MENU.consent })).toBeNull();
    expect(screen.getByRole("button", { name: "ดูทั้งเกาะ" })).toBeInTheDocument();
  });

  it("leaves the show-name switch to the team sheet", () => {
    menu({ items: items() });
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByText(FOOTER.showName)).toBeNull();
    expect(screen.getByText(FOOTER.signedInAs("พลอย"))).toBeInTheDocument();
  });
});

describe("ProjectBody: the team's tree", () => {
  const tree = { seed: "oak", equipped: { shape: "shape:round", leaf: "leaf:forest", bark: "bark:oak", bloom: "bloom:cream" }, owned: [], gifts: [], roots: { count: 0, recent: 0 }, stage: 0 };

  it("calls a planted seed at stage 0 the seed, never an empty plot", () => {
    const { unmount } = render(<ProjectBody project={{ name: "แอป", stage: 0 }} tree={tree} />);
    expect(screen.getByText(HUD.myTree(PRE_STAGE))).toBeInTheDocument();
    unmount();
    render(<ProjectBody project={{ name: "แอป", stage: 0 }} tree={{ ...tree, seed: null }} />);
    expect(screen.getByText(HUD.myTree(stageName(0)))).toBeInTheDocument();
  });

  it("becomes a button to the close-up when given one, with what waits there", () => {
    const onTree = jest.fn();
    const { unmount } = render(<ProjectBody project={{ name: "แอป", stage: 0 }} tree={tree} onTree={onTree} />);
    const line = screen.getByRole("button", { name: HUD.myTree(PRE_STAGE) });
    expect(line).toHaveAttribute("aria-haspopup", "dialog");
    expect(screen.queryByTestId("tree-line-dot")).toBeNull();
    fireEvent.click(line);
    expect(onTree).toHaveBeenCalledTimes(1);
    unmount();
    render(<ProjectBody project={{ name: "แอป", stage: 0 }} tree={tree} onTree={onTree} waiting="มีของขวัญรออยู่" />);
    expect(screen.getByRole("button", { name: `${HUD.myTree(PRE_STAGE)}, มีของขวัญรออยู่` })).toBeInTheDocument();
    expect(screen.getByTestId("tree-line-dot")).toBeInTheDocument();
  });
});
