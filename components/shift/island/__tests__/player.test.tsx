import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { cancelRedemption, loadWallet, redeemItem } from "@/app/shift/island/wallet-actions";
import type { CharacterStats, IslandConsent, ShopItem, WalletDetail } from "@/lib/supabase/shift-quests/playerTypes";

import { HudChip } from "../IslandHud";
import { CharacterSheet } from "../player/CharacterSheet";
import { CoinPill, showCoinPill } from "../player/CoinPill";
import { CHARACTER, coinNumber, PLAYER, SHOP, WALLET } from "../player/copy";
import { PixelAvatar } from "../player/PixelAvatar";
import { markerBox } from "../player/PlotMarker";
import { lockReason, ShopList } from "../player/ShopList";
import { WalletSheet } from "../player/WalletSheet";

jest.mock("@/app/shift/island/wallet-actions", () => ({
  loadWallet: jest.fn(),
  redeemItem: jest.fn(),
  cancelRedemption: jest.fn(),
}));
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

const mockedLoad = loadWallet as jest.MockedFunction<typeof loadWallet>;
const mockedRedeem = redeemItem as jest.MockedFunction<typeof redeemItem>;
const mockedCancel = cancelRedemption as jest.MockedFunction<typeof cancelRedemption>;

const AVATAR = "https://cdn.discordapp.com/avatars/123456789012345678/0123456789abcdef0123456789abcdef.png?size=64";
const KEY = "44444444-4444-4444-8444-000000000001";
const STICKER = "11111111-1111-4111-8111-000000000001";
const MATCHA = "11111111-1111-4111-8111-000000000002";
const SHIRT = "11111111-1111-4111-8111-000000000003";
const HELD = "22222222-2222-4222-8222-000000000001";

const stats = (over: Partial<CharacterStats> = {}): CharacterStats => ({
  stage: 3,
  main: { team: 3, mine: 2 },
  side: { team: 4, mine: 1 },
  community: { milestones: 1, mine: 2, thanks: 5 },
  checkins: { daysActive: 12, thisWeek: 3, run: 4 },
  coins: { live: true, shopLive: true, balance: 2300, reserved: 0 },
  ...over,
});

const waiting: IslandConsent = {
  required: true,
  state: "waiting",
  basis: null,
  ok: false,
  ai: false,
  linkExpiresAt: "2026-11-25T08:00:00Z",
  adultAge: 20,
  parentSaidNo: false,
};

const item = (over: Partial<ShopItem> = {}): ShopItem => ({
  id: STICKER,
  name: "สติกเกอร์ SHIFT High",
  description: "สติกเกอร์ติดโน้ตบุ๊ก",
  cost: 300,
  inStock: true,
  minStage: 0,
  requiresCommunity: false,
  lock: null,
  affordable: true,
  ...over,
});

const wallet = (over: Partial<WalletDetail> = {}): WalletDetail => ({
  live: true,
  shopLive: true,
  balance: 2300,
  reserved: 300,
  terms: "coin ใช้ได้ถึงสิ้นซีซัน",
  earn: { main: { amount: 300, cap: 5 }, side: { amount: 100, cap: null }, community: null, taught: null, helped: null },
  entries: [
    { amount: 300, label: "เควสต์หลักที่ผ่าน", title: "ตั้งชื่อปัญหา", at: "2026-11-11T08:00:00Z" },
    { amount: -300, label: "แลกของในร้าน", title: null, at: "2026-11-11T09:00:00Z" },
  ],
  stage: 3,
  communityDone: false,
  consentOk: true,
  shop: {
    live: true,
    terms: null,
    items: [
      item(),
      item({ id: MATCHA, name: "มัทฉะ", cost: 8000, minStage: 5, requiresCommunity: true, lock: "stage", affordable: false }),
      item({ id: SHIRT, name: "เสื้อ PassionSeed", cost: 12000, minStage: 6, requiresCommunity: true, lock: "stage", affordable: false }),
    ],
    mine: [{ id: HELD, item: "สติกเกอร์ SHIFT High", cost: 300, status: "reserved", at: "2026-11-11T09:00:00Z", cancellable: true }],
  },
  ...over,
});

beforeEach(() => {
  mockedLoad.mockReset();
  mockedRedeem.mockReset();
  mockedCancel.mockReset();
});

describe("PixelAvatar", () => {
  let getContext: jest.SpyInstance;
  const images: { src: string; referrerPolicy: string; crossOrigin: string | null; onload: (() => void) | null; onerror: (() => void) | null }[] = [];
  const RealImage = window.Image;

  beforeEach(() => {
    images.length = 0;
    getContext = jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => null) as never);
    // A stand-in that loads only when the test says so.
    window.Image = class {
      src = "";
      referrerPolicy = "";
      crossOrigin: string | null = null;
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        images.push(this);
      }
    } as unknown as typeof Image;
  });

  afterEach(() => {
    getContext.mockRestore();
    window.Image = RealImage;
  });

  it("shows the first letter when there is no picture, named for screen readers", () => {
    render(<PixelAvatar name="mint" url={null} size={40} />);
    const avatar = screen.getByRole("img", { name: PLAYER.avatar("mint") });
    expect(avatar).toHaveTextContent("m");
    expect(avatar.querySelector("canvas")).toBeNull();
    expect(images).toHaveLength(0);
  });

  it("is hidden from screen readers when decorative", () => {
    const { container } = render(<PixelAvatar name="mint" url={null} size={40} decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the initial when the browser has no 2D canvas (jsdom), without loading the picture", () => {
    render(<PixelAvatar name="mint" url={AVATAR} size={40} />);
    expect(screen.getByRole("img")).toHaveTextContent("m");
    expect(images).toHaveLength(0);
  });

  it("draws the picture into a 16x16 canvas without a referrer or CORS, then shows it pixelated", () => {
    const context = { clearRect: jest.fn(), drawImage: jest.fn(), imageSmoothingEnabled: false };
    getContext.mockImplementation((() => context) as never);
    const { container } = render(<PixelAvatar name="mint" url={AVATAR} size={64} />);
    const canvas = container.querySelector("canvas")!;
    expect(canvas).toHaveAttribute("width", "16");
    expect(canvas).toHaveAttribute("height", "16");
    expect(images).toHaveLength(1);
    const [image] = images;
    expect(image.src).toBe(AVATAR);
    expect(image.referrerPolicy).toBe("no-referrer");
    expect(image.crossOrigin).toBeNull();
    const avatar = screen.getByRole("img", { name: PLAYER.avatar("mint") });
    expect(avatar).not.toHaveAttribute("data-ready");
    act(() => image.onload?.());
    expect(context.drawImage).toHaveBeenCalledWith(image, 0, 0, 16, 16);
    expect(avatar).toHaveAttribute("data-ready", "true");
    expect(avatar).not.toHaveTextContent("m");
    expect(avatar).toHaveStyle({ width: "64px", height: "64px" });
  });

  it("falls back to the initial when the picture fails to load", () => {
    getContext.mockImplementation((() => ({ clearRect: jest.fn(), drawImage: jest.fn() })) as never);
    render(<PixelAvatar name="mint" url={AVATAR} size={40} />);
    act(() => images[0].onerror?.());
    expect(screen.getByRole("img")).toHaveTextContent("m");
    expect(screen.getByRole("img")).not.toHaveAttribute("data-ready");
  });
});

describe("HudChip", () => {
  it("is named after the student, the project and the tree's stage, and opens the character sheet", () => {
    const onOpen = jest.fn();
    render(<HudChip me={{ name: "มิ้นต์", avatarUrl: null }} name="แอปจองห้องสมุด" stage={3} onOpen={onOpen} />);
    const chip = screen.getByRole("button", { name: PLAYER.chip("มิ้นต์", "แอปจองห้องสมุด", 3) });
    expect(chip).toHaveAttribute("aria-haspopup", "dialog");
    // The meter is the level bar: three of seven cells lit.
    expect(chip.querySelectorAll("[data-filled='true']")).toHaveLength(3);
    fireEvent.click(chip);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("clamps the stage on the label and the meter", () => {
    render(<HudChip me={{ name: "มิ้นต์", avatarUrl: null }} name="ทีม" stage={12} onOpen={jest.fn()} />);
    const chip = screen.getByRole("button", { name: PLAYER.chip("มิ้นต์", "ทีม", 7) });
    expect(chip.querySelectorAll("[data-filled='true']")).toHaveLength(7);
  });

  it("says today's check-in is still open", () => {
    render(<HudChip me={{ name: "มิ้นต์", avatarUrl: null }} name="ทีม" stage={1} todayOpen onOpen={jest.fn()} />);
    expect(screen.getByRole("button", { name: /^มิ้นต์, ทีม, ต้นไม้ขั้น 1 จาก 7, ดูตัวละคร, / })).toBeInTheDocument();
    expect(screen.getByTestId("chip-today-open")).toBeInTheDocument();
  });
});

describe("CoinPill", () => {
  it.each([
    ["no stats", null, false],
    ["coins off and nothing earned", stats({ coins: { live: false, shopLive: false, balance: 0, reserved: 0 } }), false],
    ["coins live", stats({ coins: { live: true, shopLive: false, balance: 0, reserved: 0 } }), true],
    ["coins earned before coins went off", stats({ coins: { live: false, shopLive: false, balance: 400, reserved: 0 } }), true],
  ])("is shown or hidden with %s", (_label, character, shown) => {
    expect(showCoinPill(character)).toBe(shown);
  });

  it("shows the balance with Thai grouping, a 44px tap area, and opens the wallet", () => {
    const onOpen = jest.fn();
    render(<CoinPill balance={12000} onOpen={onOpen} />);
    const pill = screen.getByRole("button", { name: PLAYER.coinPill(coinNumber(12000)) });
    expect(pill).toHaveTextContent("12,000");
    fireEvent.click(pill);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("markerBox", () => {
  const mine = { slot: 3, mine: true, plain: false, stage: 2, name: null, x: 50, y: 40, w: 6, h: 10 };

  it("sits over the scene's pin, sized to the pin sprite", () => {
    const box = markerBox({ width: 480, height: 288, mine, scene: { marker: { x: 240, y: 72, scale: 2 } } as never });
    expect(box?.anchor).toBe("pin");
    expect(box?.style).toEqual({ left: "50%", top: "25%", width: "3.75%" });
  });

  it("sits above the top centre of the plot without a scene", () => {
    const box = markerBox({ width: 480, height: 288, mine, scene: null });
    expect(box?.anchor).toBe("top");
    expect(box?.style).toMatchObject({ left: "53%", top: "40%" });
  });

  it("is null without a plot of one's own or a picture size", () => {
    expect(markerBox({ width: 480, height: 288, mine: null, scene: null })).toBeNull();
    expect(markerBox({ width: 0, height: 288, mine, scene: null })).toBeNull();
  });
});

describe("CharacterSheet", () => {
  const me = { name: "มิ้นต์", avatarUrl: AVATAR, staff: false };
  function sheet(props: Partial<ComponentProps<typeof CharacterSheet>> = {}) {
    const handlers = { onClose: jest.fn(), onOpenWallet: jest.fn(), onOpenConsent: jest.fn() };
    render(
      <CharacterSheet
        open
        me={me}
        stats={stats()}
        project={{ name: "แอปจองห้องสมุด", stage: 3 }}
        season={null}
        today={<p>today-card</p>}
        {...handlers}
        {...props}
      />,
    );
    return handlers;
  }

  it("shows who the student is, the tree as the level, and the real work as bars", () => {
    sheet();
    const dialog = screen.getByRole("dialog", { name: CHARACTER.title });
    for (const line of [
      "มิ้นต์",
      CHARACTER.level(3),
      CHARACTER.teamVsMine,
      CHARACTER.mainMine(2),
      CHARACTER.sideTeam(4),
      CHARACTER.communityTeam(1),
      CHARACTER.communityMine(2),
      CHARACTER.thanks(5),
      CHARACTER.week(3),
      CHARACTER.days(12),
      CHARACTER.run(4),
    ]) {
      expect(within(dialog).getByText(line)).toBeInTheDocument();
    }
    // The team's main quests are the level; the main stat is the viewer's own share, and side shows theirs too.
    expect(within(dialog).queryByText(CHARACTER.mainTeam(3))).toBeNull();
    expect(within(dialog).getByText(CHARACTER.mine(1))).toBeInTheDocument();
    // The bars: level 3/7, the viewer's main 2/7, community 1/2 pips (this week is text only).
    const filled = [...dialog.querySelectorAll("[aria-hidden='true']")]
      .filter((el) => el.children.length > 0 && [...el.children].every((cell) => cell.tagName === "SPAN" && cell.children.length === 0))
      .map((bar) => [bar.querySelectorAll("[data-filled='true']").length, bar.children.length]);
    expect(filled).toEqual([
      [3, 7],
      [2, 7],
      [1, 2],
    ]);
    // Today's check-in right under the head, before the stats; the project underneath.
    const todayCard = within(dialog).getByText("today-card");
    expect(within(dialog).getByText("มิ้นต์").compareDocumentPosition(todayCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(todayCard.compareDocumentPosition(within(dialog).getByText(CHARACTER.teamVsMine)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(dialog).getByRole("heading", { name: "แอปจองห้องสมุด" })).toBeInTheDocument();
  });

  it("never ranks the student against anyone", () => {
    sheet();
    expect(screen.getByRole("dialog").textContent).not.toMatch(/อันดับ|เก่งกว่า|ดีกว่า|สตรีค|streak/i);
  });

  it("opens the wallet from the coin row", () => {
    const { onOpenWallet } = sheet();
    fireEvent.click(screen.getByRole("button", { name: `${CHARACTER.coinRow(coinNumber(2300))} ${CHARACTER.coinOpen}` }));
    expect(onOpenWallet).toHaveBeenCalledTimes(1);
  });

  it("says coins are off this season when nothing is live or earned", () => {
    sheet({ stats: stats({ coins: { live: false, shopLive: false, balance: 0, reserved: 0 } }) });
    expect(screen.getByText(CHARACTER.coinsOff)).toBeInTheDocument();
  });

  it("shows the consent step first while consent is not on file", () => {
    const { onOpenConsent } = sheet({ consent: waiting });
    const dialog = screen.getByRole("dialog", { name: CHARACTER.title });
    const banner = within(dialog).getByRole("region", { name: "ความยินยอม" });
    expect(banner.compareDocumentPosition(within(dialog).getByText("มิ้นต์")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(banner).getByRole("button"));
    expect(onOpenConsent).toHaveBeenCalledTimes(1);
  });

  it("is the project sheet as before when the stats cannot be read", () => {
    sheet({ stats: null });
    const dialog = screen.getByRole("dialog", { name: "แอปจองห้องสมุด" });
    expect(within(dialog).getByText("today-card")).toBeInTheDocument();
    expect(within(dialog).queryByText(CHARACTER.level(3))).toBeNull();
  });
});

describe("lockReason", () => {
  it("gives the gates first, then stock, then coins", () => {
    expect(lockReason(item({ lock: "consent" }), 0)).toBe(SHOP.lockConsent);
    expect(lockReason(item({ lock: "stage", minStage: 5 }), 99_999)).toBe(SHOP.lockStage(5));
    expect(lockReason(item({ lock: "community" }), 99_999)).toBe(SHOP.lockCommunity);
    expect(lockReason(item({ inStock: false }), 99_999)).toBe(SHOP.soldOut);
    expect(lockReason(item({ cost: 8000, affordable: false }), 7300)).toBe(SHOP.short("700"));
    expect(lockReason(item(), 300)).toBeNull();
  });
});

describe("WalletSheet", () => {
  function open(props: Partial<ComponentProps<typeof WalletSheet>> = {}) {
    const onOpenConsent = jest.fn();
    render(<WalletSheet open onClose={jest.fn()} onOpenConsent={onOpenConsent} {...props} />);
    return { onOpenConsent, dialog: screen.getByRole("dialog", { name: WALLET.title }) };
  }

  it("reads the wallet when it opens, and not before", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: wallet() });
    const { rerender } = render(<WalletSheet open={false} onClose={jest.fn()} onOpenConsent={jest.fn()} />);
    expect(mockedLoad).not.toHaveBeenCalled();
    rerender(<WalletSheet open onClose={jest.fn()} onOpenConsent={jest.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent(WALLET.loading);
    expect(await screen.findByText(coinNumber(2300))).toBeInTheDocument();
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  it("shows the balance, how coins are earned (never hours), recent lines and the shop", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: wallet() });
    const { dialog } = open();
    await within(dialog).findByText(coinNumber(2300));
    expect(within(dialog).getByText(WALLET.reserved("300"))).toBeInTheDocument();
    expect(within(dialog).getByText(WALLET.earnMain("300"))).toBeInTheDocument();
    expect(within(dialog).getByText(WALLET.earnSide("100"))).toBeInTheDocument();
    expect(within(dialog).getByText(WALLET.cap(5))).toBeInTheDocument();
    // Rates that are not published are left out.
    expect(within(dialog).queryByText(/เควสต์ชุมชน: ช่วยเพื่อน/)).toBeNull();
    expect(within(dialog).queryByText(/ไปสอนใน SHIFT/)).toBeNull();
    expect(within(dialog).getByText(WALLET.notHours)).toBeInTheDocument();
    expect(within(dialog).getByText("เควสต์หลักที่ผ่าน")).toBeInTheDocument();
    expect(within(dialog).getByText("+300")).toBeInTheDocument();
    expect(within(dialog).getByText("-300")).toBeInTheDocument();
    const shop = within(dialog).getByRole("region", { name: SHOP.heading });
    expect(within(shop).getByText("สติกเกอร์ SHIFT High", { selector: "p" })).toBeInTheDocument();
    expect(within(shop).getByText(SHOP.lockStage(5))).toBeInTheDocument();
    expect(within(shop).getByText(SHOP.lockStage(6))).toBeInTheDocument();
    expect(within(shop).getByRole("button", { name: SHOP.redeemLabel("มัทฉะ") })).toBeDisabled();
    expect(within(shop).getByRole("button", { name: SHOP.redeemLabel("มัทฉะ") })).toHaveAccessibleDescription(SHOP.lockStage(5));
    expect(within(shop).getByRole("button", { name: SHOP.redeemLabel("สติกเกอร์ SHIFT High") })).toBeEnabled();
  });

  it("says coins are off this season and lists nothing while the shop is closed", async () => {
    mockedLoad.mockResolvedValue({
      ok: true,
      data: wallet({ live: false, shopLive: false, balance: 0, reserved: 0, entries: [], shop: { live: false, terms: null, items: [], mine: [] } }),
    });
    const { dialog } = open();
    expect(await within(dialog).findByText(WALLET.off)).toBeInTheDocument();
    expect(within(dialog).getByText(WALLET.recentEmpty)).toBeInTheDocument();
    expect(within(dialog).getByText(SHOP.closed)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /^แลก/ })).toBeNull();
  });

  it("shows the server's Thai error and reads again on retry", async () => {
    mockedLoad.mockResolvedValueOnce({ ok: false, code: "unknown", error: "ระบบขัดข้อง" });
    const { dialog } = open();
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("ระบบขัดข้อง");
    mockedLoad.mockResolvedValueOnce({ ok: true, data: wallet() });
    fireEvent.click(within(dialog).getByRole("button", { name: WALLET.retry }));
    expect(await within(dialog).findByText(coinNumber(2300))).toBeInTheDocument();
  });

  it("puts the consent step above the shop while consent is not on file", async () => {
    mockedLoad.mockResolvedValue({ ok: true, data: wallet({ consentOk: false }) });
    const { dialog, onOpenConsent } = open({ consent: waiting });
    await within(dialog).findByText(coinNumber(2300));
    const banner = within(dialog).getByRole("region", { name: "ความยินยอม" });
    const shop = within(dialog).getByRole("region", { name: SHOP.heading });
    expect(banner.compareDocumentPosition(shop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(banner).getByRole("button"));
    expect(onOpenConsent).toHaveBeenCalledTimes(1);
  });
});

describe("ShopList", () => {
  const savedCrypto = globalThis.crypto;
  const randomUUID = jest.fn(() => KEY);

  beforeEach(() => {
    randomUUID.mockClear();
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID } });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: savedCrypto });
  });

  function shop(data: WalletDetail = wallet()) {
    const onChanged = jest.fn();
    render(<ShopList wallet={data} onChanged={onChanged} />);
    return { onChanged };
  }

  it("asks to confirm with the item and the cost, making the request key when the step opens", async () => {
    mockedRedeem.mockResolvedValue({ ok: true, data: { redemptionId: HELD, status: "reserved", duplicate: false, balance: 2000 } });
    const { onChanged } = shop();
    expect(randomUUID).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: SHOP.redeemLabel("สติกเกอร์ SHIFT High") }));
    expect(randomUUID).toHaveBeenCalledTimes(1);
    expect(screen.getByText(SHOP.confirm("สติกเกอร์ SHIFT High", "300"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: SHOP.confirmYes }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SHOP.done("สติกเกอร์ SHIFT High")));
    expect(mockedRedeem).toHaveBeenCalledWith({ itemId: STICKER, requestKey: KEY, expectedCost: 300 });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("moves focus to the confirm button, and back to the item's button when the step is cancelled", () => {
    shop();
    const redeem = screen.getByRole("button", { name: SHOP.redeemLabel("สติกเกอร์ SHIFT High") });
    fireEvent.click(redeem);
    expect(screen.getByRole("button", { name: SHOP.confirmYes })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: SHOP.confirmNo }));
    expect(screen.getByRole("button", { name: SHOP.redeemLabel("สติกเกอร์ SHIFT High") })).toHaveFocus();
  });

  it("lists everything a gated item needs at once, each with where the student is now", () => {
    shop(wallet({ balance: 300, stage: 2, communityDone: false }));
    const lists = screen.getAllByRole("list", { name: SHOP.needsLabel });
    // Matcha and the shirt are gated; the sticker is not.
    expect(lists).toHaveLength(2);
    expect(lists[0]).toHaveTextContent(SHOP.needStage(5, 2));
    expect(lists[0]).toHaveTextContent(SHOP.needCommunity);
    expect(lists[0]).toHaveTextContent(SHOP.needCoins("8,000", "7,700"));
    expect(lists[1]).toHaveTextContent(SHOP.needStage(6, 2));
  });

  it("shows the reason first and still the whole path when consent is the first gate", () => {
    shop(
      wallet({
        balance: 9000,
        stage: 5,
        communityDone: true,
        consentOk: false,
        shop: { ...wallet().shop, items: [item({ id: MATCHA, name: "มัทฉะ", cost: 8000, minStage: 5, requiresCommunity: true, lock: "consent" })] },
      }),
    );
    const list = screen.getByRole("list", { name: SHOP.needsLabel });
    expect(list).toHaveTextContent(SHOP.needConsent);
    expect(list).toHaveTextContent(`${SHOP.needStage(5, 5)}${SHOP.met}`);
    expect(screen.getByRole("button", { name: SHOP.redeemLabel("มัทฉะ") })).toHaveAccessibleDescription(SHOP.lockConsent);
  });

  it("shows a refusal in the server's Thai words", async () => {
    mockedRedeem.mockResolvedValue({ ok: false, code: "stage_required", error: "ต้นไม้ยังไม่ถึงขั้นที่ของชิ้นนี้ต้องการ" });
    const { onChanged } = shop();
    fireEvent.click(screen.getByRole("button", { name: SHOP.redeemLabel("สติกเกอร์ SHIFT High") }));
    fireEvent.click(screen.getByRole("button", { name: SHOP.confirmYes }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ต้นไม้ยังไม่ถึงขั้นที่ของชิ้นนี้ต้องการ");
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("keeps the same request key on a retry after no answer, so nothing is charged twice", async () => {
    mockedRedeem.mockRejectedValueOnce(new Error("network"));
    shop();
    fireEvent.click(screen.getByRole("button", { name: SHOP.redeemLabel("สติกเกอร์ SHIFT High") }));
    fireEvent.click(screen.getByRole("button", { name: SHOP.confirmYes }));
    expect(await screen.findByRole("alert")).toHaveTextContent(SHOP.retryLater);
    mockedRedeem.mockResolvedValueOnce({ ok: true, data: { redemptionId: HELD, status: "reserved", duplicate: true, balance: 2000 } });
    fireEvent.click(screen.getByRole("button", { name: SHOP.confirmYes }));
    await waitFor(() => expect(mockedRedeem).toHaveBeenCalledTimes(2));
    expect(mockedRedeem.mock.calls.map(([input]) => input.requestKey)).toEqual([KEY, KEY]);
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it("steps back from the confirm without redeeming", () => {
    shop();
    fireEvent.click(screen.getByRole("button", { name: SHOP.redeemLabel("สติกเกอร์ SHIFT High") }));
    fireEvent.click(screen.getByRole("button", { name: SHOP.confirmNo }));
    expect(screen.queryByText(SHOP.confirm("สติกเกอร์ SHIFT High", "300"))).toBeNull();
    expect(mockedRedeem).not.toHaveBeenCalled();
  });

  it("cancels a reservation until staff start on it", async () => {
    mockedCancel.mockResolvedValue({ ok: true, data: { cancelled: true } });
    const { onChanged } = shop();
    fireEvent.click(screen.getByRole("button", { name: SHOP.cancelLabel("สติกเกอร์ SHIFT High") }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(SHOP.cancelled));
    expect(mockedCancel).toHaveBeenCalledWith({ redemptionId: HELD });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it("says when it is too late to cancel", async () => {
    mockedCancel.mockResolvedValue({ ok: true, data: { cancelled: false } });
    shop();
    fireEvent.click(screen.getByRole("button", { name: SHOP.cancelLabel("สติกเกอร์ SHIFT High") }));
    expect(await screen.findByRole("alert")).toHaveTextContent(SHOP.cancelTooLate);
  });

  it("has no cancel for a redemption staff already handled", () => {
    shop(wallet({ shop: { ...wallet().shop, mine: [{ id: HELD, item: "มัทฉะ", cost: 8000, status: "completed", at: "2026-11-11T09:00:00Z", cancellable: false }] } }));
    expect(screen.getByText(new RegExp(SHOP.status.completed))).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SHOP.cancelLabel("มัทฉะ") })).toBeNull();
  });

  it("says why each locked item waits: consent, stage, community, stock or coins", () => {
    shop(
      wallet({
        balance: 500,
        shop: {
          live: true,
          terms: null,
          mine: [],
          items: [
            item({ id: "a", name: "ก", lock: "consent" }),
            item({ id: "b", name: "ข", lock: "stage", minStage: 6 }),
            item({ id: "c", name: "ค", lock: "community" }),
            item({ id: "d", name: "ง", inStock: false }),
            item({ id: "e", name: "จ", cost: 800, affordable: false }),
          ],
        },
      }),
    );
    for (const [name, reason] of [
      ["ก", SHOP.lockConsent],
      ["ข", SHOP.lockStage(6)],
      ["ค", SHOP.lockCommunity],
      ["ง", SHOP.soldOut],
      ["จ", SHOP.short("300")],
    ]) {
      const button = screen.getByRole("button", { name: SHOP.redeemLabel(name) });
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleDescription(reason);
    }
  });
});
