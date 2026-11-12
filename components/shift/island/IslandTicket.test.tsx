import { render, screen } from "@testing-library/react";

import { ISLAND_DOOR, TICKET } from "@/lib/content/shift-island-invite";

import { IslandTicket } from "./IslandTicket";

const TICKET_DATA = { nickname: "มายด์", cohort: "SHIFT[1]" };
const FESTIVAL = "เทศกาลเปิดอยู่ตอนนี้";

it("shows who is coming, the round and the festival", () => {
  render(
    <IslandTicket ticket={TICKET_DATA} discordUrl="https://discord.com/channels/123" confirmed festival={FESTIVAL} />,
  );
  expect(screen.getByRole("heading", { name: TICKET.heading })).toBeInTheDocument();
  expect(screen.getByText(TICKET_DATA.nickname)).toBeInTheDocument();
  expect(screen.getByText(TICKET_DATA.cohort)).toBeInTheDocument();
  expect(screen.getByText(FESTIVAL)).toBeInTheDocument();
  const link = screen.getByRole("link", { name: TICKET.discordCta });
  expect(link).toHaveAttribute("href", "https://discord.com/channels/123");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.queryByText(TICKET.noDiscord)).not.toBeInTheDocument();
});

it("says the link comes in the round's group when confirmed but there is no Discord URL", () => {
  render(<IslandTicket ticket={TICKET_DATA} discordUrl={null} confirmed festival={FESTIVAL} />);
  expect(screen.getByText(TICKET.noDiscord)).toBeInTheDocument();
  expect(screen.queryByText(TICKET.pendingDiscord)).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("tells a member who is not confirmed yet that the team checks first", () => {
  render(<IslandTicket ticket={TICKET_DATA} discordUrl={null} confirmed={false} festival={FESTIVAL} />);
  expect(screen.getByText(TICKET.pendingDiscord)).toBeInTheDocument();
  expect(screen.queryByText(TICKET.noDiscord)).not.toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

it("takes focus when it replaces a pressed seal", () => {
  render(<IslandTicket ticket={TICKET_DATA} discordUrl={null} confirmed festival={FESTIVAL} focusHeading />);
  expect(screen.getByRole("heading", { name: TICKET.heading })).toHaveFocus();
});

it("shows no door when the page has nothing to say about the island", () => {
  const { container } = render(<IslandTicket ticket={TICKET_DATA} discordUrl={null} confirmed festival={FESTIVAL} />);
  expect(container.querySelector("[data-door]")).toBeNull();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("offers Discord sign-in under the ticket when the island needs a Discord account", () => {
  render(<IslandTicket ticket={TICKET_DATA} discordUrl={null} confirmed festival={FESTIVAL} door="discord" />);
  expect(screen.getByText(ISLAND_DOOR.discord)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: ISLAND_DOOR.discordCta })).toBeInTheDocument();
});

it.each(["waiting", "closed"] as const)("says why the island is not open yet (%s), with nothing to press", (door) => {
  render(<IslandTicket ticket={TICKET_DATA} discordUrl={null} confirmed festival={FESTIVAL} door={door} />);
  expect(screen.getByText(ISLAND_DOOR[door])).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
