import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { HUD } from "../copy";
import { MenuSheet } from "../HudSheets";
import { NEWS } from "../news/copy";
import { PLAYER_MENU } from "../player/copy";
import { PRIZES_UI } from "../prizes/copy";

jest.mock("@/app/shift/island/actions", () => ({ setShowName: jest.fn() }));
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
    expect(link).toHaveTextContent("💡 เสนอไอเดีย / แจ้งบั๊ก");
    expect(link).toHaveAccessibleDescription(HUD.suggestHint);
  });

  it("keeps the bulb out of the accessible name", () => {
    menu({ suggestUrl: SUGGEST_URL });
    const bulb = screen.getByText("💡", { exact: false });
    expect(bulb).toHaveAttribute("aria-hidden", "true");
  });

  it.each([
    ["null", null],
    ["unset", undefined],
    ["empty", ""],
  ])("is hidden when the link is %s", (_label, suggestUrl) => {
    menu({ suggestUrl });
    expect(screen.getByRole("dialog", { name: HUD.menu })).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
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

describe("MenuSheet: the player rows", () => {
  it("shows a row for each sheet it is given, each opening its own", () => {
    const onNews = jest.fn();
    const onPrizes = jest.fn();
    const onConsent = jest.fn();
    menu({ onNews, onPrizes, onConsent });
    const sheet = screen.getByRole("dialog", { name: HUD.menu });
    const consent = within(sheet).getByRole("button", { name: PLAYER_MENU.consent });
    expect(consent).toHaveAccessibleDescription(PLAYER_MENU.consentHint);
    expect(consent).toHaveAttribute("aria-haspopup", "dialog");
    fireEvent.click(consent);
    fireEvent.click(within(sheet).getByRole("button", { name: NEWS.menu }));
    fireEvent.click(within(sheet).getByRole("button", { name: PRIZES_UI.menu }));
    expect(onConsent).toHaveBeenCalledTimes(1);
    expect(onNews).toHaveBeenCalledTimes(1);
    expect(onPrizes).toHaveBeenCalledTimes(1);
  });

  it("puts the consent step first, then the news, then the prizes, under the view switch", () => {
    menu({ onNews: jest.fn(), onPrizes: jest.fn(), onConsent: jest.fn() });
    const order = ["ดูทั้งเกาะ", PLAYER_MENU.consent, NEWS.menu, PRIZES_UI.menu].map((name) => screen.getByRole("button", { name }));
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("leaves out the rows it is not given", () => {
    menu({ onPrizes: jest.fn() });
    expect(screen.getByRole("button", { name: PRIZES_UI.menu })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: NEWS.menu })).toBeNull();
    expect(screen.queryByRole("button", { name: PLAYER_MENU.consent })).toBeNull();
    expect(screen.queryByText(PLAYER_MENU.consentHint)).toBeNull();
  });

  it("has no player rows at all when none are given", () => {
    menu({ project: null });
    expect(screen.queryByRole("button", { name: PRIZES_UI.menu })).toBeNull();
    expect(screen.getByRole("button", { name: "ดูทั้งเกาะ" })).toBeInTheDocument();
  });
});
