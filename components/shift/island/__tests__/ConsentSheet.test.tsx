import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { confirmAdult, requestParentLink } from "@/app/shift/island/consent-actions";
import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";

import { ConsentBanner } from "../consent/ConsentBanner";
import { ConsentSheet } from "../consent/ConsentSheet";
import { CONSENT, CONSENT_BANNER } from "../consent/copy";
import { thaiShortDate } from "../copy";

jest.mock("@/app/shift/island/consent-actions", () => ({
  confirmAdult: jest.fn(),
  requestParentLink: jest.fn(),
}));
// vaul needs layout APIs jsdom lacks; the sheet only has to show its content when open.
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open
        ? createElement("div", { role: "dialog", "aria-label": title }, createElement("p", null, description), children as never)
        : null,
  };
});

const mockedLink = requestParentLink as jest.MockedFunction<typeof requestParentLink>;
const mockedAdult = confirmAdult as jest.MockedFunction<typeof confirmAdult>;

const URL = "https://passionseed.org/shift/island/parent/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
const EXPIRES = "2026-11-25T05:00:00.000Z";

const consent = (over: Partial<IslandConsent> = {}): IslandConsent => ({
  required: true,
  state: "none",
  basis: null,
  ok: false,
  ai: false,
  linkExpiresAt: null,
  adultAge: 20,
  parentSaidNo: false,
  ...over,
});

function sheet(value: IslandConsent) {
  render(<ConsentSheet open onClose={jest.fn()} consent={value} />);
  return screen.getByRole("dialog", { name: CONSENT.title });
}

beforeEach(() => {
  mockedLink.mockReset();
  mockedAdult.mockReset();
});

describe("ConsentBanner", () => {
  it.each([[null], [undefined], [consent({ state: "granted", basis: "parent", ok: true })], [consent({ required: false, ok: true })]])(
    "renders nothing when consent is unknown or ok (%#)",
    (value) => {
      const { container } = render(<ConsentBanner consent={value} onOpen={jest.fn()} />);
      expect(container).toBeEmptyDOMElement();
    },
  );

  it("shows the next step and opens the sheet", () => {
    const onOpen = jest.fn();
    render(<ConsentBanner consent={consent()} onOpen={onOpen} />);
    const banner = screen.getByRole("region", { name: CONSENT_BANNER.label });
    expect(within(banner).getByText(CONSENT_BANNER.none)).toBeInTheDocument();
    fireEvent.click(within(banner).getByRole("button", { name: CONSENT_BANNER.action }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("words each state, with a shorter line when compact", () => {
    const { rerender } = render(<ConsentBanner consent={consent({ state: "waiting" })} onOpen={jest.fn()} />);
    expect(screen.getByText(CONSENT_BANNER.waiting)).toBeInTheDocument();
    rerender(<ConsentBanner consent={consent({ state: "declined" })} onOpen={jest.fn()} compact />);
    expect(screen.getByText(CONSENT_BANNER.compact.declined)).toBeInTheDocument();
  });
});

describe("ConsentSheet: parent link", () => {
  it("starts on the parent path and lists what consent opens, and the meanwhile line", () => {
    const dialog = sheet(consent());
    expect(within(dialog).getByRole("radio", { name: CONSENT.parentPath })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: CONSENT.adultPath(20) })).not.toBeChecked();
    expect(within(dialog).getByText(CONSENT.meanwhile)).toBeInTheDocument();
    for (const line of CONSENT.unlocks) expect(within(dialog).getByText(line)).toBeInTheDocument();
  });

  it("asks for a nickname before making a link", async () => {
    const dialog = sheet(consent());
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.parent.create }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CONSENT.errors.nickname);
    expect(mockedLink).not.toHaveBeenCalled();
  });

  it("catches a mistyped email before sending", async () => {
    const dialog = sheet(consent());
    fireEvent.change(within(dialog).getByLabelText(CONSENT.parent.nickname), { target: { value: "มิ้นต์" } });
    fireEvent.change(within(dialog).getByLabelText(CONSENT.parent.email), { target: { value: "mom@" } });
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.parent.create }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CONSENT.errors.email);
    expect(mockedLink).not.toHaveBeenCalled();
  });

  it("makes a link without an email, shows it with its date, and copies it", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockedLink.mockResolvedValue({ ok: true, data: { url: URL, expiresAt: EXPIRES, emailed: false } });
    const dialog = sheet(consent());
    fireEvent.change(within(dialog).getByLabelText(CONSENT.parent.nickname), { target: { value: " มิ้นต์ " } });
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.parent.create }));

    const field = await within(dialog).findByLabelText(CONSENT.parent.linkLabel);
    expect(mockedLink).toHaveBeenCalledWith({ nickname: "มิ้นต์", parentEmail: null });
    expect(field).toHaveValue(URL);
    expect(field).toHaveAttribute("readonly");
    expect(within(dialog).getByText(CONSENT.parent.expires(thaiShortDate(EXPIRES)))).toBeInTheDocument();
    expect(within(dialog).queryByText(CONSENT.parent.emailed)).toBeNull();
    expect(within(dialog).queryByText(CONSENT.parent.emailFailed)).toBeNull();

    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.parent.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(URL));
    expect(await within(dialog).findByText(CONSENT.parent.copied)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: CONSENT.parent.createAgain })).toBeInTheDocument();
  });

  it("falls back to the text field when the clipboard is not there", async () => {
    Object.assign(navigator, { clipboard: undefined });
    mockedLink.mockResolvedValue({ ok: true, data: { url: URL, expiresAt: EXPIRES, emailed: false } });
    const dialog = sheet(consent());
    fireEvent.change(within(dialog).getByLabelText(CONSENT.parent.nickname), { target: { value: "Mint" } });
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.parent.create }));
    fireEvent.click(await within(dialog).findByRole("button", { name: CONSENT.parent.copy }));
    expect(await within(dialog).findByText(CONSENT.parent.copyFallback)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(CONSENT.parent.linkLabel)).toHaveFocus();
  });

  it("says whether the email went out", async () => {
    mockedLink.mockResolvedValue({ ok: true, data: { url: URL, expiresAt: EXPIRES, emailed: false } });
    const dialog = sheet(consent());
    fireEvent.change(within(dialog).getByLabelText(CONSENT.parent.nickname), { target: { value: "Mint" } });
    fireEvent.change(within(dialog).getByLabelText(CONSENT.parent.email), { target: { value: "mom@example.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.parent.create }));
    expect(await within(dialog).findByText(CONSENT.parent.emailFailed)).toBeInTheDocument();
    expect(mockedLink).toHaveBeenCalledWith({ nickname: "Mint", parentEmail: "mom@example.com" });
  });

  it("explains the daily limit in its own words", async () => {
    mockedLink.mockResolvedValue({ ok: false, code: "consent_rate_limited", error: "x" });
    const dialog = sheet(consent());
    fireEvent.change(within(dialog).getByLabelText(CONSENT.parent.nickname), { target: { value: "Mint" } });
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.parent.create }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CONSENT.errors.rateLimited);
  });

  it("shows a waiting link's date and offers a replacement", () => {
    const dialog = sheet(consent({ state: "waiting", linkExpiresAt: EXPIRES }));
    expect(within(dialog).getByRole("status")).toHaveTextContent(CONSENT.status.waiting(thaiShortDate(EXPIRES)));
    expect(within(dialog).getByRole("button", { name: CONSENT.parent.createAgain })).toBeInTheDocument();
    expect(within(dialog).getByText(CONSENT.parent.againHint)).toBeInTheDocument();
  });

  it.each([
    ["declined", CONSENT.status.declined],
    ["withdrawn", CONSENT.status.withdrawn],
  ] as const)("words a %s answer without pressure, and keeps both paths", (state, line) => {
    const dialog = sheet(consent({ state }));
    expect(within(dialog).getByRole("status")).toHaveTextContent(line);
    expect(within(dialog).getAllByRole("radio")).toHaveLength(2);
  });
});

describe("ConsentSheet: adult path", () => {
  function adult(value = consent()) {
    const dialog = sheet(value);
    fireEvent.click(within(dialog).getByRole("radio", { name: CONSENT.adultPath(value.adultAge) }));
    return dialog;
  }

  it("uses the adult age from the database", () => {
    const dialog = adult(consent({ adultAge: 18 }));
    expect(within(dialog).getByRole("heading", { name: CONSENT.adultPath(18) })).toBeInTheDocument();
    expect(within(dialog).getByText(CONSENT.adult.agree(18))).toBeInTheDocument();
  });

  it("needs a birth date and the tick", async () => {
    const dialog = adult();
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.adult.confirm }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CONSENT.errors.birthDate);
    fireEvent.change(within(dialog).getByLabelText(CONSENT.adult.birthDate), { target: { value: "2001-04-30" } });
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.adult.confirm }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CONSENT.errors.agree);
    expect(mockedAdult).not.toHaveBeenCalled();
  });

  it("says too young with the age, and points to the parent path", async () => {
    mockedAdult.mockResolvedValue({ ok: false, code: "consent_too_young", error: "x" });
    const dialog = adult();
    fireEvent.change(within(dialog).getByLabelText(CONSENT.adult.birthDate), { target: { value: "2010-04-30" } });
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.adult.confirm }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(CONSENT.errors.tooYoung(20));
    expect(mockedAdult).toHaveBeenCalledWith({ birthDate: "2010-04-30" });
  });

  it("shows the granted view as soon as the age is confirmed", async () => {
    mockedAdult.mockResolvedValue({ ok: true, data: consent({ state: "granted", basis: "adult", ok: true, ai: true }) });
    const dialog = adult();
    fireEvent.change(within(dialog).getByLabelText(CONSENT.adult.birthDate), { target: { value: "2001-04-30" } });
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: CONSENT.adult.confirm }));
    expect(await within(dialog).findByText(CONSENT.granted.basis.adult)).toBeInTheDocument();
    expect(within(dialog).queryByRole("radio")).toBeNull();
  });
});

describe("ConsentSheet: granted", () => {
  it("recognises consent from SHIFT", () => {
    const dialog = sheet(consent({ state: "granted", basis: "shift_parent", ok: true, ai: true }));
    expect(within(dialog).getByText(CONSENT.granted.basis.shift_parent)).toBeInTheDocument();
    expect(within(dialog).queryByText(CONSENT.granted.aiAddOn)).toBeNull();
  });

  it("adds the AI line when consent is ok but the AI news is not", () => {
    const dialog = sheet(consent({ state: "granted", basis: "parent", ok: true, ai: false }));
    expect(within(dialog).getByText(CONSENT.granted.basis.parent)).toBeInTheDocument();
    expect(within(dialog).getByText(CONSENT.granted.aiAddOn)).toBeInTheDocument();
  });

  it("offers the AI link to the parent of a student with consent imported from SHIFT", () => {
    const dialog = sheet(consent({ state: "granted", basis: "shift_parent", ok: true, ai: false }));
    expect(within(dialog).getByRole("heading", { name: CONSENT.granted.aiHeading })).toBeInTheDocument();
    expect(within(dialog).getByText(CONSENT.granted.aiAddOn)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: CONSENT.parent.create })).toBeInTheDocument();
  });

  it("says when an AI link is already out", () => {
    const dialog = sheet(consent({ state: "granted", basis: "parent", ok: true, ai: false, linkExpiresAt: EXPIRES }));
    expect(within(dialog).getByText(CONSENT.granted.aiWaiting(thaiShortDate(EXPIRES)))).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: CONSENT.parent.createAgain })).toBeInTheDocument();
  });

  it("asks an adult's SHIFT consent to confirm their age on the island for AI news", () => {
    const dialog = sheet(consent({ state: "granted", basis: "shift_adult", ok: true, ai: false }));
    expect(within(dialog).getByText(CONSENT.granted.aiAddOnAdult(20))).toBeInTheDocument();
    expect(within(dialog).getByLabelText(CONSENT.adult.birthDate)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: CONSENT.parent.create })).toBeNull();
  });

  it("says nothing is needed while consent is switched off", () => {
    const dialog = sheet(consent({ required: false, ok: true, ai: true }));
    expect(within(dialog).getByText(CONSENT.granted.notRequired)).toBeInTheDocument();
  });
});

describe("ConsentSheet: a parent said no", () => {
  it.each([
    ["declined", consent({ state: "declined", parentSaidNo: true })],
    ["withdrawn", consent({ state: "withdrawn", basis: "parent", parentSaidNo: true })],
  ])("respects a %s answer: no new link and no age confirmation, and says how to start again", (_label, value) => {
    const dialog = sheet(value);
    expect(within(dialog).getByText(CONSENT.status.saidNo)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: CONSENT.parent.create })).toBeNull();
    expect(within(dialog).queryByLabelText(CONSENT.adult.birthDate)).toBeNull();
  });
});
