import { fireEvent, render, screen, within } from "@testing-library/react";

import { ISLAND_PRIZES_DRAFT } from "@/lib/content/shift-island-economy";
import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";

import { PRIZES_UI } from "../prizes/copy";
import { PrizeSheet } from "../prizes/PrizeSheet";

jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, children }: { open: boolean; title: string; children: unknown }) =>
      open ? createElement("div", { role: "dialog", "aria-label": title }, children as never) : null,
  };
});

// The consent builder's banner, by its contract: nothing when consent is unknown or ok.
jest.mock("../consent/ConsentBanner", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    ConsentBanner: ({ consent, onOpen }: { consent: { ok: boolean } | null | undefined; onOpen: () => void }) =>
      consent && !consent.ok ? createElement("button", { type: "button", onClick: onOpen }, "ขอความยินยอม") : null,
  };
});

function consent(over: Partial<IslandConsent> = {}): IslandConsent {
  return {
    required: true,
    state: "none",
    basis: null,
    ok: false,
    ai: false,
    linkExpiresAt: null,
    adultAge: 20,
    parentSaidNo: false,
    ...over,
  };
}

function show(props: Partial<Parameters<typeof PrizeSheet>[0]> = {}) {
  render(<PrizeSheet open onClose={jest.fn()} consent={null} {...props} />);
  return screen.getByRole("dialog", { name: "รางวัล Demo Day" });
}

describe("PrizeSheet", () => {
  it("lists all four prizes, each with its title and reward, emoji hidden from screen readers", () => {
    const sheet = show();
    const rows = within(within(sheet).getByRole("list", { name: PRIZES_UI.list })).getAllByRole("listitem");
    expect(rows).toHaveLength(4);
    ISLAND_PRIZES_DRAFT.prizes.forEach((prize, i) => {
      expect(rows[i]).toHaveTextContent(prize.title);
      expect(rows[i]).toHaveTextContent(prize.reward);
      const emoji = within(rows[i]).getByText(prize.emoji);
      expect(emoji).toHaveAttribute("aria-hidden", "true");
    });
    expect(rows.map((row) => row.getAttribute("data-money"))).toEqual(["true", "true", null, null]);
    expect(sheet).toHaveTextContent("ไปได้ไกลที่สุด มีหลักฐานจริง");
    expect(sheet).toHaveTextContent("$100");
    expect(sheet).toHaveTextContent("$50");
  });

  it("always shows the 18+ money note and the judging line, with no leaderboard", () => {
    const sheet = show({ consent: consent({ ok: true, state: "granted", basis: "parent", ai: true }) });
    expect(within(sheet).getByText(ISLAND_PRIZES_DRAFT.moneyNote)).toBeVisible();
    expect(within(sheet).getByText(ISLAND_PRIZES_DRAFT.judging)).toBeInTheDocument();
    expect(sheet).toHaveTextContent("รางวัลเงินเป็นเครดิต Claude สำหรับผู้มีอายุ 18 ปีขึ้นไป");
    expect(within(sheet).queryByRole("table")).toBeNull();
    // Never folded away behind a disclosure.
    expect(sheet.querySelector("details")).toBeNull();
  });

  it("shows the consent line and banner only while consent is not ok, and the banner opens the consent sheet", () => {
    const onOpenConsent = jest.fn();
    const sheet = show({ consent: consent({ state: "waiting", linkExpiresAt: "2026-11-25T00:00:00Z" }), onOpenConsent });
    expect(within(sheet).getByText(ISLAND_PRIZES_DRAFT.consentNote)).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "ขอความยินยอม" }));
    expect(onOpenConsent).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["unknown (null)", null],
    ["unknown (undefined)", undefined],
    ["granted", consent({ ok: true, state: "granted", basis: "adult", ai: true })],
    ["not required", consent({ required: false, ok: true, ai: true })],
  ])("shows no consent line or banner when consent is %s", (_label, value) => {
    const sheet = show({ consent: value, onOpenConsent: jest.fn() });
    expect(within(sheet).queryByText(ISLAND_PRIZES_DRAFT.consentNote)).toBeNull();
    expect(within(sheet).queryByRole("button", { name: "ขอความยินยอม" })).toBeNull();
  });

  it("keeps the consent line without a banner when there is nowhere to open", () => {
    const sheet = show({ consent: consent({ state: "declined" }) });
    expect(within(sheet).getByText(ISLAND_PRIZES_DRAFT.consentNote)).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "ขอความยินยอม" })).toBeNull();
  });

  it("leaves the Passioncoin prizes out, and says why, while the season gives out no coins", () => {
    const sheet = show({ coinsLive: false });
    const rows = within(within(sheet).getByRole("list", { name: PRIZES_UI.list })).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.getAttribute("data-money") === "true")).toBe(true);
    expect(within(sheet).getByText(PRIZES_UI.coinsOff)).toBeInTheDocument();
  });

  it("says who may confirm their own age, from the island's setting", () => {
    const sheet = show({ consent: consent({ adultAge: 20 }) });
    expect(within(sheet).getByText(PRIZES_UI.selfConfirm(20))).toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    render(<PrizeSheet open={false} onClose={jest.fn()} consent={consent()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
