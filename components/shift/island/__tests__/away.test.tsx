import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";

import { answerAway } from "@/app/shift/island/actions";
import { ISLAND_NOTICE } from "@/lib/shift-island/consent/notice";
import { lintText } from "@/lib/marketing/copyRules";
import type { AwayReport, IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";
import type { IslandActionResult } from "@/lib/supabase/shift-quests/types";

import { AwaySection, type AwayAdmin } from "../away/AwayAdmin";
import { AwayStrip } from "../away/AwayStrip";
import { ReturnSheet } from "../away/ReturnSheet";
import { AWAY, DETAIL, HUD } from "../copy";
import { COMPOSER } from "../canvas/copy";
import { CharacterSheet } from "../player/CharacterSheet";

jest.mock("@/app/shift/island/actions", () => ({
  answerAway: jest.fn(async () => ({ ok: true, data: { saved: true } })),
  setAwayDm: jest.fn(),
  setShowName: jest.fn(),
}));
jest.mock("@/app/shift/island/admin-actions", () => ({ resetMyIsland: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("../IslandDiscordButton", () => ({ IslandDiscordButton: () => null }));
// vaul needs layout APIs jsdom lacks: the sheet shows its content when open, and Escape stands in for its ways to close.
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({
      open,
      title,
      description,
      onOpenChange,
      children,
    }: {
      open: boolean;
      title: string;
      description?: string;
      onOpenChange?: (open: boolean) => void;
      children: unknown;
    }) =>
      open
        ? createElement(
            "div",
            {
              role: "dialog",
              "aria-label": title,
              onKeyDown: (event: { key: string }) => {
                if (event.key === "Escape") onOpenChange?.(false);
              },
            },
            description ? createElement("p", null, description) : null,
            children as never,
          )
        : null,
  };
});

const mockedAnswer = answerAway as jest.MockedFunction<typeof answerAway>;
const GAP = "2026-11-10";
const SUGGEST_URL = "https://discord.com/channels/444444444444444444/555555555555555555";

beforeEach(() => {
  jest.clearAllMocks();
  mockedAnswer.mockResolvedValue({ ok: true, data: { saved: true } });
});

/** Every string in AWAY, with a path for the failure message (functions called with a sample). */
function collect(value: unknown, path: string, out: [string, string][]): void {
  if (typeof value === "string") out.push([path, value]);
  else if (typeof value === "function") out.push([`${path}()`, String((value as (arg: unknown) => unknown)(7))]);
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) collect(item, `${path}.${key}`, out);
}

const all: [string, string][] = [];
collect(AWAY, "AWAY", all);
const card: [string, string][] = [];
collect(AWAY.card, "AWAY.card", card);

describe("AWAY copy", () => {
  it("collects every string", () => {
    expect(all.length).toBeGreaterThan(60);
    expect(card.length).toBeGreaterThan(20);
  });

  it.each(all)("%s carries no guilt and no pressure", (_path, text) => {
    expect(text).not.toMatch(/ยังไม่ได้|พลาด|เมื่อวาน|หายไป|สตรีค|ติดต่อกัน|streak/i);
    expect(text).not.toMatch(/พรุ่งนี้/);
    expect(text).not.toMatch(/น้อง|เด็ก|ลูก(?!ค้า)/);
    expect(text).not.toMatch(/[—–]/);
  });

  it.each(all)("%s passes the marketing copy rules", (path, text) => {
    expect(lintText(text, path, "instagram")).toEqual([]);
  });

  it.each(card)("%s (the return card) never counts days", (_path, text) => {
    expect(text).not.toMatch(/\d\s*วัน/);
  });

  it("lets only the consent strip say the setting's number of days", () => {
    expect(AWAY.strip.ask(7)).toContain("7 วัน");
    expect(AWAY.strip.ask(10)).toContain("10 วัน");
  });

  it("names a reason for each of the six, and keeps the safety line as written", () => {
    expect(Object.keys(AWAY.card.reasons).sort()).toEqual(["break", "busy", "island", "stuck", "team", "unclear"]);
    expect(AWAY.card.title).toBe("ช่วยเราปรับเกาะหน่อย");
    expect(AWAY.card.safety).toBe("ถ้ามีเรื่องหนักใจ คุยกับผู้ใหญ่ที่ไว้ใจ หรือโทร 1323\u00a0(24\u00a0ชม.)");
  });

  it("reuses the island's own hint and the contact-details warning", () => {
    expect(AWAY.card.lineHint).toBe(DETAIL.proofHint);
    expect(AWAY.card.pii).toBe(COMPOSER.piiLine);
    expect(AWAY.card.after.islandAction).toBe(HUD.suggest);
  });

  it("never promises secrecy: the card says, where the line is typed, that an admin can see who wrote it", () => {
    // Safeguarding 7.3: the audited reveal exists, so the card says so, as the notice's row does.
    expect(AWAY.card.who).toContain("ไม่มีชื่อ");
    expect(AWAY.card.who).toContain("ความปลอดภัย");
    expect(AWAY.card.who).toContain("แอดมินเปิดดูได้ว่าใครเขียน");
    expect(AWAY.card.who).toContain("ระบบบันทึกทุกครั้ง");
    const row = ISLAND_NOTICE.rows.find((r) => r.lead.includes("DM ชวนกลับเกาะ"));
    expect(row?.short).toContain("ความปลอดภัย");
    expect(JSON.stringify(row?.items)).toContain("ระบบบันทึกทุกครั้ง");
  });

  it("never asks a question in the card's lines after Send", () => {
    for (const text of Object.values(AWAY.card.after)) expect(text).not.toMatch(/\?|ไหม/);
  });
});

describe("AwayStrip", () => {
  it("says the setting's days in one line, with two equal buttons", () => {
    const onAnswer = jest.fn();
    render(<AwayStrip days={7} pending={false} onAnswer={onAnswer} />);
    const strip = screen.getByRole("region", { name: AWAY.strip.label });
    expect(strip).toHaveTextContent(AWAY.strip.ask(7));
    const buttons = within(strip).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual([AWAY.strip.yes, AWAY.strip.no]);
    // The same look for both answers: neither is the "right" one.
    expect(buttons[0].className).toBe(buttons[1].className);
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(onAnswer.mock.calls).toEqual([[true], [false]]);
  });

  it("greys both buttons while a choice is saved", () => {
    render(<AwayStrip days={7} pending onAnswer={jest.fn()} />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });
});

describe("CharacterSheet with the DM strip", () => {
  const me = { name: "มิ้นต์", avatarUrl: null, staff: false };
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
  const ok: IslandConsent = { ...waiting, state: "granted", basis: "adult", ok: true, ai: true, linkExpiresAt: null };

  function sheet(consent: IslandConsent | null, onAnswer = jest.fn()) {
    render(
      <CharacterSheet
        open
        me={me}
        stats={null}
        project={{ name: "แอปจองห้องสมุด", stage: 1 }}
        consent={consent}
        onClose={jest.fn()}
        onOpenWallet={jest.fn()}
        onOpenConsent={jest.fn()}
        away={{ days: 7, pending: false, onAnswer }}
        foot={<p>menu-foot</p>}
      />,
    );
    return onAnswer;
  }

  it.each([
    ["consent on file", ok],
    ["consent unknown", null],
  ])("shows the strip right at the top with %s", (_label, consent) => {
    const onAnswer = sheet(consent);
    const strip = screen.getByRole("region", { name: AWAY.strip.label });
    expect(strip.compareDocumentPosition(screen.getByText("มิ้นต์")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(within(strip).getByRole("button", { name: AWAY.strip.no }));
    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("waits while the consent banner shows: one ask at a time", () => {
    sheet(waiting);
    expect(screen.queryByRole("region", { name: AWAY.strip.label })).toBeNull();
  });
});

describe("ReturnSheet", () => {
  function open(props: Partial<{ suggestUrl: string | null; canRest: boolean }> = {}) {
    const handlers = { onClose: jest.fn(), onStuck: jest.fn() };
    render(<ReturnSheet open gapFrom={GAP} suggestUrl={SUGGEST_URL} canRest {...handlers} {...props} />);
    return { dialog: screen.getByRole("dialog", { name: AWAY.card.title }), ...handlers };
  }

  const choose = (dialog: HTMLElement, reason: keyof typeof AWAY.card.reasons) =>
    fireEvent.click(within(dialog).getByRole("radio", { name: AWAY.card.reasons[reason] }));
  const send = (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole("button", { name: AWAY.card.send }));

  it("asks with six one-tap reasons, an optional short line with the privacy hint, the safety line and who reads it", () => {
    const { dialog } = open();
    expect(within(dialog).getByText(AWAY.card.intro)).toBeInTheDocument();
    expect(within(dialog).getAllByRole("radio")).toHaveLength(6);
    const line = within(dialog).getByRole("textbox", { name: AWAY.card.lineLabel });
    expect(line).toHaveAttribute("maxLength", "140");
    expect(line).toHaveAccessibleDescription(expect.stringContaining(DETAIL.proofHint));
    // The line keeps "1323 (24 ชม.)" together with no-break spaces; the default text normalizer turns them into spaces.
    expect(within(dialog).getByText(AWAY.card.safety.replace(/ /g, " "))).toBeInTheDocument();
    expect(within(dialog).getByText(AWAY.card.who)).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button")).toHaveLength(1);
    // Never a day count on the card.
    expect(dialog.textContent).not.toMatch(/\d\s*วัน/);
  });

  it("asks for a reason before Send, and sends nothing until then", () => {
    const { dialog } = open();
    send(dialog);
    expect(within(dialog).getByRole("alert")).toHaveTextContent(AWAY.card.needReason);
    expect(mockedAnswer).not.toHaveBeenCalled();
    choose(dialog, "busy");
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  it("warns when the line looks like it carries contact details, without blocking it", () => {
    const { dialog } = open();
    const line = within(dialog).getByRole("textbox", { name: AWAY.card.lineLabel });
    fireEvent.change(line, { target: { value: "ทักไลน์มาที่ 081-234-5678" } });
    expect(within(dialog).getByRole("note")).toHaveTextContent(COMPOSER.piiLine);
    fireEvent.change(line, { target: { value: "ช่วงนี้สอบ" } });
    expect(within(dialog).queryByRole("note")).toBeNull();
  });

  it.each(["busy", "team"] as const)("thanks and closes after %s, with the trimmed line, and never sends a skip after", async (reason) => {
    const { dialog, onClose } = open();
    choose(dialog, reason);
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "  สอบกลางภาค  " } });
    send(dialog);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockedAnswer).toHaveBeenCalledWith({ gapFrom: GAP, reason, line: "สอบกลางภาค" });
    expect(toast.success).toHaveBeenCalledWith(AWAY.card.thanks);
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(mockedAnswer).toHaveBeenCalledTimes(1);
  });

  it("sends an empty line as null", async () => {
    const { dialog, onClose } = open();
    choose(dialog, "busy");
    send(dialog);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(mockedAnswer).toHaveBeenCalledWith({ gapFrom: GAP, reason: "busy", line: null });
  });

  it("counts closing the card as a skip: no reason, no line", () => {
    const { dialog, onClose } = open();
    choose(dialog, "stuck");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "ยังคิดอยู่" } });
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(mockedAnswer).toHaveBeenCalledWith({ gapFrom: GAP, reason: null, line: null });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("offers the group help after stuck, and only that", async () => {
    const { dialog, onStuck } = open();
    choose(dialog, "stuck");
    send(dialog);
    await within(dialog).findByText(AWAY.card.after.stuck);
    const buttons = within(dialog).getAllByRole("button");
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onStuck).toHaveBeenCalledTimes(1);
    // Already answered: the sheet closing is not a skip.
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(mockedAnswer).toHaveBeenCalledTimes(1);
  });

  it("links the suggestions channel after island, when the page has one", async () => {
    const { dialog } = open();
    choose(dialog, "island");
    send(dialog);
    await within(dialog).findByText(AWAY.card.after.island);
    const link = within(dialog).getByRole("link", { name: HUD.suggest });
    expect(link).toHaveAttribute("href", SUGGEST_URL);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("thanks and closes after island without a suggestions channel", async () => {
    const { dialog, onClose } = open({ suggestUrl: null });
    choose(dialog, "island");
    send(dialog);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(AWAY.card.thanks);
  });

  it("sends the student back to the next-step card after unclear", async () => {
    const { dialog, onClose } = open();
    choose(dialog, "unclear");
    send(dialog);
    fireEvent.click(await within(dialog).findByRole("button", { name: AWAY.card.after.unclearAction }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("says ขอพัก exists after break", async () => {
    const { dialog, onClose } = open();
    choose(dialog, "break");
    send(dialog);
    expect(await within(dialog).findByText(AWAY.card.after.break)).toHaveTextContent("ขอพัก");
    fireEvent.click(within(dialog).getByRole("button", { name: AWAY.card.after.back }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("thanks and closes after break where there is no ขอพัก to point to (no plot yet)", async () => {
    const { dialog, onClose } = open({ canRest: false });
    choose(dialog, "break");
    send(dialog);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toast.success).toHaveBeenCalledWith(AWAY.card.thanks);
    expect(within(dialog).queryByText(AWAY.card.after.break)).toBeNull();
  });

  it("keeps the form after a failed Send, and then counts closing as a skip again", async () => {
    mockedAnswer.mockResolvedValueOnce({ ok: false, code: "unknown", error: "ลองอีกครั้ง" });
    const { dialog, onClose } = open();
    choose(dialog, "busy");
    send(dialog);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("ลองอีกครั้ง"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(mockedAnswer).toHaveBeenLastCalledWith({ gapFrom: GAP, reason: null, line: null });
  });

  it("closes without a word, and never thanks, when another tab already answered ({saved: false})", async () => {
    mockedAnswer.mockResolvedValueOnce({ ok: true, data: { saved: false } });
    const { dialog, onClose } = open();
    choose(dialog, "stuck");
    send(dialog);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toast.success).not.toHaveBeenCalled();
    expect(within(dialog).queryByText(AWAY.card.after.stuck)).toBeNull();
    // Nothing of this one was saved, and closing now is not a skip either.
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(mockedAnswer).toHaveBeenCalledTimes(1);
  });

  it("closes quietly, never as a skip, when the refreshed page stops naming the stretch", () => {
    const onClose = jest.fn();
    const { rerender } = render(<ReturnSheet open gapFrom={GAP} suggestUrl={null} onClose={onClose} due />);
    expect(onClose).not.toHaveBeenCalled();
    rerender(<ReturnSheet open gapFrom={GAP} suggestUrl={null} onClose={onClose} due={false} />);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockedAnswer).not.toHaveBeenCalled();
  });

  it("keeps its own after-view when the page refreshes after its Send", async () => {
    const onClose = jest.fn();
    const { rerender } = render(<ReturnSheet open gapFrom={GAP} suggestUrl={SUGGEST_URL} onClose={onClose} due />);
    const dialog = screen.getByRole("dialog", { name: AWAY.card.title });
    choose(dialog, "island");
    send(dialog);
    await within(dialog).findByText(AWAY.card.after.island);
    rerender(<ReturnSheet open gapFrom={GAP} suggestUrl={SUGGEST_URL} onClose={onClose} due={false} />);
    expect(screen.getByText(AWAY.card.after.island)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without a word when the card is no longer due", async () => {
    mockedAnswer.mockResolvedValueOnce({ ok: false, code: "not_found", error: "x" });
    const { dialog, onClose } = open();
    choose(dialog, "busy");
    send(dialog);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
    expect(mockedAnswer).toHaveBeenCalledTimes(1);
  });
});

describe("AwaySection (admins)", () => {
  const ANSWER = "1f7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
  const report: AwayReport = {
    consent: { yes: 12, no: "1-2", unasked: 30 },
    awayNow: { resting: 4, waiting: 0, other: 9 },
    dms: { queued: 0, sent: 5, unreachable: "1-2", dropped: 3 },
    answers: { byReason: { busy: 6, stuck: "1-2", unclear: 3, team: 0, island: 4, break: 0 }, skipped: 7, cameByDm: "1-2" },
    lines: [
      { id: ANSWER, week: "2026-11-16", reason: "island", line: "ปุ่มส่งงานหายาก" },
      { id: "2f7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a", week: "2026-11-09", reason: null, line: "สอบ" },
    ],
  };

  function section(over: Partial<AwayAdmin> = {}) {
    const away: AwayAdmin = {
      state: { enabled: true, days: 7, dm: null, askConsent: false, askReturn: null },
      load: jest.fn(async (): Promise<IslandActionResult<AwayReport | null>> => ({ ok: true, data: report })),
      reveal: jest.fn(async (): Promise<IslandActionResult<{ name: string }>> => ({ ok: true, data: { name: "Mint" } })),
      ...over,
    };
    render(<AwaySection open away={away} />);
    return away;
  }

  it("shows counts, with 1-2 as it comes, and the lines by week without names", async () => {
    const away = section();
    expect(await screen.findByText("ปุ่มส่งงานหายาก")).toBeInTheDocument();
    expect(away.load).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("1-2").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: AWAY.admin.week("16 พ.ย.") })).toHaveTextContent("ปุ่มส่งงานหายาก");
    expect(screen.getByRole("region", { name: AWAY.admin.week("9 พ.ย.") })).toHaveTextContent(AWAY.admin.noReason);
    expect(screen.queryByText("Mint")).toBeNull();
    expect(screen.queryByText(AWAY.admin.off)).toBeNull();
  });

  it("reveals who wrote a line only after a confirm", async () => {
    const away = section();
    const week = within(await screen.findByRole("region", { name: AWAY.admin.week("16 พ.ย.") }));
    fireEvent.click(week.getByRole("button", { name: AWAY.admin.reveal }));
    expect(away.reveal).not.toHaveBeenCalled();
    expect(week.getByText(AWAY.admin.revealWhy)).toBeInTheDocument();
    fireEvent.click(week.getByRole("button", { name: AWAY.admin.revealCancel }));
    expect(week.queryByText(AWAY.admin.revealWhy)).toBeNull();
    fireEvent.click(week.getByRole("button", { name: AWAY.admin.reveal }));
    fireEvent.click(week.getByRole("button", { name: AWAY.admin.revealConfirm }));
    expect(await week.findByRole("status")).toHaveTextContent(AWAY.admin.revealed("Mint"));
    expect(away.reveal).toHaveBeenCalledWith(ANSWER);
  });

  it("says when the feature is off, and when the report cannot be read", async () => {
    section({
      state: { enabled: false, days: 7, dm: null, askConsent: false, askReturn: null },
      load: jest.fn(async () => ({ ok: false as const, code: "not_authorized", error: "x" })),
    });
    expect(screen.getByText(AWAY.admin.off)).toBeInTheDocument();
    expect(await screen.findByText(AWAY.admin.failed)).toBeInTheDocument();
  });
});
