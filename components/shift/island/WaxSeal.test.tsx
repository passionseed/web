import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SEAL } from "@/lib/content/shift-island-invite";

import { WaxSeal } from "./WaxSeal";

jest.mock("./useReducedMotion", () => ({ useReducedMotion: () => false }));

const TICKET = { nickname: "มายด์", cohort: "SHIFT[1]" };
const DISCORD = "https://discord.com/channels/123";

function reply(status: number, body: unknown) {
  return Promise.resolve({ status, json: () => Promise.resolve(body) } as Response);
}

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

function renderSeal() {
  const onGoing = jest.fn();
  render(<WaxSeal viewer={{ kind: "canRsvp" }} onGoing={onGoing} />);
  return { onGoing, seal: screen.getByRole("button", { name: SEAL.press }) };
}

it("sends one request for a double tap and stays disabled while it is in flight", async () => {
  let resolve!: (res: Response) => void;
  fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
  const { onGoing, seal } = renderSeal();

  fireEvent.click(seal);
  fireEvent.click(seal);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith("/api/shift/island/rsvp", { method: "POST" });
  expect(seal).toBeDisabled();
  expect(seal).toHaveTextContent(SEAL.pending);

  resolve(await reply(200, { ok: true, ticket: TICKET, discordUrl: DISCORD }));
  await waitFor(() => expect(onGoing).toHaveBeenCalledTimes(1), { timeout: 2000 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("returns to pressable with the error line on a 500, and never calls onGoing", async () => {
  fetchMock.mockReturnValue(reply(500, { error: "Internal server error" }));
  const { onGoing, seal } = renderSeal();

  fireEvent.click(seal);

  expect(await screen.findByRole("alert")).toHaveTextContent(SEAL.error);
  expect(screen.queryByText("Internal server error")).not.toBeInTheDocument();
  expect(seal).toBeEnabled();
  expect(seal).toHaveTextContent(SEAL.press);
  expect(onGoing).not.toHaveBeenCalled();
});

it("treats a network failure like a 500", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  const { onGoing, seal } = renderSeal();

  fireEvent.click(seal);

  expect(await screen.findByRole("alert")).toHaveTextContent(SEAL.error);
  expect(seal).toBeEnabled();
  expect(onGoing).not.toHaveBeenCalled();
});

it("shows the closed line from a 422", async () => {
  fetchMock.mockReturnValue(reply(422, { error: SEAL.closed }));
  const { onGoing, seal } = renderSeal();

  fireEvent.click(seal);

  expect(await screen.findByRole("alert")).toHaveTextContent(SEAL.closed);
  expect(onGoing).not.toHaveBeenCalled();
});

it("calls onGoing with the ticket and Discord link after a 200", async () => {
  fetchMock.mockReturnValue(reply(200, { ok: true, ticket: TICKET, discordUrl: DISCORD }));
  const { onGoing, seal } = renderSeal();

  fireEvent.click(seal);

  await waitFor(() => expect(onGoing).toHaveBeenCalledWith(TICKET, DISCORD), { timeout: 2000 });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("passes a null Discord link through", async () => {
  fetchMock.mockReturnValue(reply(200, { ok: true, ticket: TICKET, discordUrl: null }));
  const { onGoing, seal } = renderSeal();

  fireEvent.click(seal);

  await waitFor(() => expect(onGoing).toHaveBeenCalledWith(TICKET, null), { timeout: 2000 });
});

it("links a signed-out reader to sign in and back", () => {
  render(<WaxSeal viewer={{ kind: "signedOut" }} onGoing={jest.fn()} />);
  expect(screen.getByRole("link", { name: SEAL.signIn })).toHaveAttribute("href", "/login?next=%2Fshift%2Fisland");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("sends a reader who is not an alumnus to apply", () => {
  render(<WaxSeal viewer={{ kind: "notAlumni" }} onGoing={jest.fn()} />);
  expect(screen.getByText(SEAL.notAlumni)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: SEAL.applyCta })).toHaveAttribute("href", "/shift/apply");
});

it("shows the closed line with no seal once the season is over", () => {
  render(<WaxSeal viewer={{ kind: "closed" }} onGoing={jest.fn()} />);
  expect(screen.getByText(SEAL.closed)).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
