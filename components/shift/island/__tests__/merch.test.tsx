import { fireEvent, render, screen, within } from "@testing-library/react";

import { ISLAND_MERCH } from "@/lib/content/shift-island-merch";
import type { ShopItem } from "@/lib/supabase/shift-quests/playerTypes";

import { MenuSheet } from "../HudSheets";
import { HUD } from "../copy";
import { SHOP } from "../player/copy";
import { ShopList } from "../player/ShopList";

jest.mock("@/app/shift/island/wallet-actions", () => ({ redeemItem: jest.fn(), cancelRedemption: jest.fn() }));
jest.mock("@/app/shift/island/actions", () => ({ setShowName: jest.fn() }));
jest.mock("@/app/shift/island/admin-actions", () => ({ resetMyIsland: jest.fn() }));
jest.mock("../IslandDiscordButton", () => ({ IslandDiscordButton: () => null }));
jest.mock("../IslandSheet", () => ({
  IslandSheet: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) =>
    open ? <div role="dialog" aria-label={title}>{children}</div> : null,
}));

describe("PassionSeed physical merch", () => {
  it("allows browsing both designs while redemption is off, without offering a purchase", () => {
    render(<ShopList wallet={{ balance: 0, shop: { live: false, items: [], mine: [], terms: null } }} onChanged={jest.fn()} />);
    expect(screen.getByText(SHOP.merch.tee)).toBeInTheDocument();
    expect(screen.getByText(SHOP.merch.hoodie)).toBeInTheDocument();
    expect(screen.getAllByText(SHOP.comingSoon)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /^แลก / })).not.toBeInTheDocument();
  });

  it("uses a configured catalog item's real price and confirmation without duplicating its preview", () => {
    const product = ISLAND_MERCH[0];
    const item: ShopItem = {
      id: "11111111-1111-4111-8111-000000000001",
      name: product.catalogName,
      description: null,
      cost: 1234,
      inStock: true,
      minStage: 0,
      requiresCommunity: false,
      lock: null,
      affordable: true,
    };
    render(<ShopList wallet={{ balance: 2000, shop: { live: true, items: [item], mine: [], terms: null } }} onChanged={jest.fn()} />);
    expect(screen.getAllByText(product.catalogName)).toHaveLength(1);
    expect(screen.getAllByText(SHOP.comingSoon)).toHaveLength(1);
    expect(screen.getByText(SHOP.cost("1,234"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: SHOP.redeemLabel(product.catalogName) }));
    expect(screen.getByText(SHOP.confirm(product.catalogName, "1,234"))).toBeInTheDocument();
  });

  it("keeps sold-out merchandise unavailable", () => {
    const item: ShopItem = {
      id: "11111111-1111-4111-8111-000000000002", name: ISLAND_MERCH[1].catalogName,
      description: null, cost: 1234, inStock: false, minStage: 0,
      requiresCommunity: false, lock: null, affordable: true,
    };
    render(<ShopList wallet={{ balance: 2000, shop: { live: true, items: [item], mine: [], terms: null } }} onChanged={jest.fn()} />);
    expect(screen.getByRole("button", { name: SHOP.redeemLabel(item.name) })).toBeDisabled();
    expect(screen.getByText(SHOP.soldOut)).toBeInTheDocument();
  });

  it("offers the shop from the menu before a student has claimed a plot", () => {
    const onShop = jest.fn();
    render(<MenuSheet open onClose={jest.fn()} me={{ name: "Player", avatarUrl: null, staff: false }} claimed={false} whole={false} onToggleWhole={jest.fn()} items={[{ id: "shop", icon: "coin", label: SHOP.heading, onClick: onShop }]} />);
    const menu = screen.getByRole("dialog", { name: HUD.menu });
    fireEvent.click(within(menu).getByRole("button", { name: SHOP.heading }));
    expect(onShop).toHaveBeenCalledTimes(1);
  });
});
