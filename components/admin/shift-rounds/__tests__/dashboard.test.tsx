import { fireEvent, render, screen } from "@testing-library/react";

import * as actions from "@/app/admin/shift/rounds/actions";
import { RoundDashboard } from "../RoundDashboard";
import { ROUND_ID, makeRound } from "../__fixtures__/rounds";

jest.mock("@/app/admin/shift/rounds/actions", () => ({
  listRoundsAction: jest.fn(),
  dashboardAction: jest.fn(),
  roundStepsAction: jest.fn(),
}));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const m = actions as jest.Mocked<typeof actions>;

beforeEach(() => {
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [makeRound()] });
  m.roundStepsAction.mockResolvedValue({ ok: true, data: { rows: [] } });
});

test("renders the dashboard counts", async () => {
  m.dashboardAction.mockResolvedValue({
    ok: true,
    data: {
      entrants_total: 24,
      entrants_by_track: { high_school: 24 },
      entrants_by_group: { alumni: 10, new: 14 },
      pending_review: 7,
      rejection_rate: 0.125,
      mission_distribution: [2, 3, 4, 5, 4, 3, 3],
      active4_entrants: 15,
      certificates: { issued: 3, revoked: 1 },
      share_visits: 41,
      review_minutes_per_entrant: 2.25,
      next_round_joins: 6,
      non_alumni_4plus: 5,
      joins_per_day: [{ date: "2026-11-10", count: 20 }],
      logs_per_day: [{ date: "2026-11-10", type: "contact", count: 9 }],
      jobs: [{ job: "issue", last_run: { job: "issue", started_at: "2026-11-10T05:00:00Z", status: "failed" }, last_ok_at: null, failures_7d: 2 }],
    },
  });
  render(<RoundDashboard roundId={ROUND_ID} />);
  const stat = async (label: string) => (await screen.findByText(label, { selector: "dt" })).nextElementSibling;
  expect(await stat("Entrants")).toHaveTextContent("24");
  expect(await stat("Active 4+ days")).toHaveTextContent("15");
  expect(await stat("Share visits")).toHaveTextContent("41");
  expect(await stat("Certificates revoked")).toHaveTextContent("1");
  expect(screen.getByRole("link", { name: "7" })).toHaveAttribute("href", `/admin/shift/rounds/${ROUND_ID}/review`);
  expect(screen.getByText("12.5%")).toBeInTheDocument();
  expect(screen.getByText("2.3")).toBeInTheDocument();
  expect(screen.getByText("2 failures in 7 days")).toBeInTheDocument();
  expect(screen.getByText("2026-11-10")).toBeInTheDocument();
  expect(screen.getByText("Alumni")).toBeInTheDocument();
  // Distribution follows the round's 7 missions, not a fixed 6.
  expect(screen.getByText("7 of 7")).toBeInTheDocument();
  expect(screen.queryByText(/of 6$/)).not.toBeInTheDocument();
});

test("shows an error with retry, then loads", async () => {
  m.dashboardAction
    .mockResolvedValueOnce({ ok: false, error: { code: "forbidden", category: "forbidden" } })
    .mockResolvedValueOnce({ ok: true, data: { entrants_total: 0 } });
  render(<RoundDashboard roundId={ROUND_ID} />);
  expect(await screen.findByText(/\(forbidden\)/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
  expect(await screen.findByText("No activity yet")).toBeInTheDocument();
});
