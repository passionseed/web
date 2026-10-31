import { fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import type { AdminQueueSnapshot } from "@/lib/admin/console";

import { makeSnapshot } from "../__fixtures__/overview";
import { AttentionList } from "../AttentionList";
import { OverviewSummary } from "../OverviewSummary";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const live: { snapshot: AdminQueueSnapshot | null; refresh: jest.Mock } = {
  snapshot: null,
  refresh: jest.fn(),
};
jest.mock("@/components/admin/console/live-counts", () => ({
  useAdminLiveCounts: () => ({ snapshot: live.snapshot, refresh: live.refresh, seed: jest.fn() }),
}));

beforeEach(() => {
  live.snapshot = null;
  live.refresh = jest.fn();
});

function rowLabels() {
  return screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
}

test("lists open queues most urgent first, each linking to its tool", () => {
  render(
    <AttentionList
      initial={makeSnapshot([
        { key: "experts_pending", count: 7, href: "/admin/experts?status=pending" },
        { key: "dm_awaiting_reply", count: 3, href: "/admin/dm-leads?sort=waiting", context: "2 inside the 24h window" },
        { key: "ig_missed", count: 0 },
      ])}
    />,
  );

  expect(rowLabels()).toEqual(["DMs waiting for a reply", "Expert interviews to review"]);
  const dm = screen.getByRole("link", { name: /DMs waiting for a reply/ });
  expect(dm).toHaveAttribute("href", "/admin/dm-leads?sort=waiting");
  expect(within(dm).getByText("3")).toBeInTheDocument();
  expect(within(dm).getByText("Now")).toBeInTheDocument();
  expect(within(dm).getByText("2 inside the 24h window")).toBeInTheDocument();

  const experts = screen.getByRole("link", { name: /Expert interviews to review/ });
  expect(within(experts).queryByText("Now")).not.toBeInTheDocument();
  expect(screen.queryByText("IG comments to answer")).not.toBeInTheDocument();
});

test("marks approximate counts as an upper bound", () => {
  render(<AttentionList initial={makeSnapshot([{ key: "ig_missed", count: 12, approximate: true }])} />);
  const row = screen.getByRole("link", { name: /IG comments to answer/ });
  expect(row).toHaveTextContent("up to12");
});

test("shows a calm all-clear state when nothing is waiting", () => {
  render(<AttentionList initial={makeSnapshot([{ key: "dm_awaiting_reply", count: 0 }])} />);
  expect(screen.getByRole("status")).toHaveTextContent("All clear");
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});

test("names queues that could not load in a quiet line with a retry", () => {
  render(
    <AttentionList
      initial={makeSnapshot([
        { key: "line_unanswered", count: null },
        { key: "experts_pending", count: 2 },
      ])}
    />,
  );
  expect(screen.getByText("Could not load: LINE chats to answer.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(live.refresh).toHaveBeenCalledTimes(1);
});

test("shows an error with retry when no counts loaded at all", () => {
  render(<AttentionList initial={null} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Work queues could not load");
  fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
  expect(live.refresh).toHaveBeenCalled();
});

test("follows the shell's live counts once they are newer", () => {
  const initial = makeSnapshot([{ key: "experts_pending", count: 2 }], "2026-10-26T05:00:00.000Z");
  live.snapshot = makeSnapshot(
    [
      { key: "experts_pending", count: 0 },
      { key: "trials_pending", count: 1 },
    ],
    "2026-10-26T05:01:00.000Z",
  );
  render(<AttentionList initial={initial} />);
  expect(rowLabels()).toEqual(["Payment slips to verify"]);
});

test("ignores an older live snapshot left over from another page", () => {
  const initial = makeSnapshot([{ key: "experts_pending", count: 2 }], "2026-10-26T05:00:00.000Z");
  live.snapshot = makeSnapshot([{ key: "trials_pending", count: 9 }], "2026-10-26T04:58:00.000Z");
  render(<AttentionList initial={initial} />);
  expect(rowLabels()).toEqual(["Expert interviews to review"]);
});

test("server HTML uses the page's own snapshot, so hydration always matches", () => {
  const initial = makeSnapshot([{ key: "experts_pending", count: 2 }], "2026-10-26T05:00:00.000Z");
  live.snapshot = makeSnapshot([{ key: "trials_pending", count: 1 }], "2026-10-26T05:01:00.000Z");
  const html = renderToString(<AttentionList initial={initial} />);
  expect(html).toContain("Expert interviews to review");
  expect(html).not.toContain("Payment slips to verify");
});

test("the header summary reads the same live counts", () => {
  render(
    <OverviewSummary
      initial={makeSnapshot([
        { key: "trials_pending", count: 1 },
        { key: "experts_pending", count: 4 },
      ])}
      shiftLine="SHIFT[3] applications close in 12 days."
    />,
  );
  expect(
    screen.getByText("5 things need you, 1 of them now. SHIFT[3] applications close in 12 days."),
  ).toBeInTheDocument();
});
