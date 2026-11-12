import { render, screen, within } from "@testing-library/react";

import type { AdminActivityItem } from "@/lib/admin/console";

import { ActivityFeed } from "../ActivityFeed";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    prefetch: _prefetch,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Monday 26 October 2026, 12:00 in Bangkok.
const NOW = new Date("2026-10-26T05:00:00Z");

const ITEMS: AdminActivityItem[] = [
  {
    id: "lead:1",
    kind: "lead",
    at: "2026-10-20T03:00:00Z",
    title: "New Instagram lead",
  },
  {
    id: "payment:1",
    kind: "payment",
    at: "2026-10-25T16:30:00Z",
    title: "SHIFT[3] seat paid",
    detail: "Marked paid by the team",
    href: "/admin/shift/applications?cohort=SHIFT%5B3%5D",
  },
  {
    id: "application:1",
    kind: "application",
    at: "2026-10-26T04:55:00Z",
    title: "New SHIFT[3] application",
    href: "/admin/shift/applications?cohort=SHIFT%5B3%5D&status=new",
  },
];

test("groups events by Bangkok day, newest first", () => {
  render(<ActivityFeed items={ITEMS} now={NOW} />);
  const headings = screen.getAllByRole("heading", { level: 3 });
  expect(headings.map((h) => h.textContent)).toEqual(["Today", "Yesterday", "Earlier"]);

  const today = headings[0].parentElement as HTMLElement;
  expect(within(today).getByText("New SHIFT[3] application")).toBeInTheDocument();
  expect(within(today).getByText("5 minutes ago")).toBeInTheDocument();

  const yesterday = headings[1].parentElement as HTMLElement;
  expect(within(yesterday).getByText("23:30")).toHaveAttribute("dateTime", "2026-10-25T16:30:00Z");

  const earlier = headings[2].parentElement as HTMLElement;
  expect(within(earlier).getByText("Tue 20 Oct, 10:00")).toBeInTheDocument();
});

test("links events that have a record and names their kind for screen readers", () => {
  render(<ActivityFeed items={ITEMS} now={NOW} />);
  const payment = screen.getByRole("link", { name: /SHIFT\[3\] seat paid/ });
  expect(payment).toHaveAttribute("href", "/admin/shift/applications?cohort=SHIFT%5B3%5D");
  expect(within(payment).getByText("Payment:")).toHaveClass("sr-only");
  expect(within(payment).getByText("Marked paid by the team")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /New Instagram lead/ })).not.toBeInTheDocument();
});

test("has a quiet empty state", () => {
  render(<ActivityFeed items={[]} now={NOW} />);
  expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
});
