import { render, screen, within } from "@testing-library/react";

import type { AdminKpi } from "@/lib/admin/console";

import { kpiDelta } from "../format";
import { KpiDeltaBadge, KpiRow } from "../KpiRow";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const KPIS: AdminKpi[] = [
  {
    key: "revenue_30d",
    label: "Revenue, 30 days",
    value: 12340,
    previous: 11000,
    format: "baht",
    series: [0, 1200, 400, 3900],
    hint: "Paid trials and SHIFT seats, Bangkok days",
    href: "/admin/ceo/payments",
  },
  {
    key: "shift_seats",
    label: "SHIFT[3] seats paid",
    value: 12,
    total: 30,
    format: "ratio",
    href: "/admin/shift/applications",
  },
  {
    key: "signups_7d",
    label: "Sign-ups, 7 days",
    value: 1234,
    previous: 1300,
    format: "number",
    series: [180, 170, 175],
  },
  {
    key: "new_leads_7d",
    label: "New leads, 7 days",
    value: null,
    previous: 4,
    format: "number",
  },
];

test("formats each KPI by kind and links it to its tool", () => {
  render(<KpiRow kpis={KPIS} />);
  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(4);

  const revenue = screen.getByRole("link", { name: /Revenue, 30 days/ });
  expect(revenue).toHaveAttribute("href", "/admin/ceo/payments");
  expect(revenue).toHaveAttribute("title", "Paid trials and SHIFT seats, Bangkok days");
  expect(within(revenue).getByText("฿12,340")).toBeInTheDocument();
  expect(within(revenue).getByText("4-day trend: low ฿0, high ฿3,900, latest ฿3,900.")).toBeInTheDocument();

  const seats = screen.getByRole("link", { name: /SHIFT\[3\] seats paid/ });
  expect(within(seats).getByText("12/30")).toHaveAttribute("aria-hidden", "true");
  expect(within(seats).getByText("12 of 30")).toHaveClass("sr-only");
  expect(seats.querySelector(".overview-meter > span")).toHaveStyle({ width: "40%" });

  expect(screen.getByText("1,234")).toBeInTheDocument();
});

test("a KPI without a link is still shown, and a missing value says so", () => {
  render(<KpiRow kpis={KPIS} />);
  expect(screen.queryByRole("link", { name: /Sign-ups/ })).not.toBeInTheDocument();
  expect(screen.getByText("Sign-ups, 7 days")).toBeInTheDocument();
  expect(screen.getByText("Unavailable")).toBeInTheDocument();
});

test("shows deltas with an arrow, a sign and words, never colour alone", () => {
  render(<KpiRow kpis={KPIS} />);
  expect(screen.getByText("+12%")).toBeInTheDocument();
  expect(screen.getByText("Up 12% from the previous period")).toHaveClass("sr-only");
  const down = screen.getByText("−5%").closest(".overview-delta");
  expect(down).toHaveAttribute("data-direction", "down");
  expect(down?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(screen.getByText("Down 5% from the previous period")).toBeInTheDocument();
});

test("renders no delta without a previous value", () => {
  const { container } = render(<KpiDeltaBadge delta={kpiDelta(5, undefined)} />);
  expect(container).toBeEmptyDOMElement();
});

test("flat deltas read as no change", () => {
  render(<KpiDeltaBadge delta={kpiDelta(8, 8)} />);
  expect(screen.getByText("0%").closest(".overview-delta")).toHaveAttribute("data-direction", "flat");
  expect(screen.getByText("No change from the previous period")).toBeInTheDocument();
});

test("says so when there are no KPIs at all", () => {
  render(<KpiRow kpis={[]} />);
  expect(screen.getByText(/Key numbers are not available right now/)).toBeInTheDocument();
});
