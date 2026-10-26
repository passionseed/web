import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import type {
  AdminQueueSnapshot,
  AdminSearchResponse,
} from "@/lib/admin/console";
import { CommandPalette } from "../CommandPalette";
import { RECENT_PAGES_KEY } from "../recent-pages";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/admin/users",
}));

const refresh = jest.fn();
let snapshot: AdminQueueSnapshot | null = null;
let countsFailed = false;
jest.mock("../live-counts", () => ({
  useAdminLiveCounts: () => ({
    snapshot,
    failed: countsFailed,
    refresh,
    seed: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const searchResponse: AdminSearchResponse = {
  q: "somchai",
  tookMs: 12,
  partial: true,
  groups: [
    {
      type: "shift_application",
      label: "SHIFT applications",
      hits: [
        {
          type: "shift_application",
          id: "app-1",
          title: "Somchai K.",
          subtitle: "SHIFT[3] · new · s***@gmail.com",
          badges: ["new"],
          href: "/admin/shift/applications?id=app-1",
          score: 90,
        },
      ],
    },
  ],
};

let fetchMock: jest.Mock;

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  countsFailed = false;
  snapshot = {
    generatedAt: "2026-10-26T00:00:00.000Z",
    queues: [
      {
        key: "shift_new_applications",
        count: 2,
        href: "/admin/shift/applications?status=new",
      },
      {
        key: "dm_awaiting_reply",
        count: 5,
        href: "/admin/dm-leads?sort=waiting",
        context: "4 inside the 24h window",
      },
      { key: "experts_pending", count: 0, href: "/admin/experts" },
    ],
  };
  window.localStorage.setItem(
    RECENT_PAGES_KEY,
    JSON.stringify(["/admin/users", "/admin/line"]),
  );
  fetchMock = jest.fn(async () => ({
    ok: true,
    json: async () => searchResponse,
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => window.localStorage.clear());

function renderPalette(onOpenChange = jest.fn(), onShowShortcuts = jest.fn()) {
  render(
    <CommandPalette
      open
      onOpenChange={onOpenChange}
      onShowShortcuts={onShowShortcuts}
    />,
  );
  return { onOpenChange, onShowShortcuts, input: screen.getByRole("combobox") };
}

const groupNamed = (name: string) =>
  screen
    .getByText(name, { selector: "[cmdk-group-heading]" })
    .closest("[cmdk-group]") as HTMLElement;

describe("CommandPalette", () => {
  it("shows attention, recent, go to, and actions for an empty query", () => {
    renderPalette();

    const attention = groupNamed("Needs attention");
    const rows = within(attention).getAllByRole("option");
    // Most urgent first; empty queues are left out.
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("DMs waiting for a reply"),
      expect.stringContaining("SHIFT applications to review"),
    ]);
    expect(
      within(attention).getByText("4 inside the 24h window"),
    ).toBeInTheDocument();

    // The current page is not offered as a recent page.
    const recent = groupNamed("Recent");
    expect(within(recent).getAllByRole("option")).toHaveLength(1);
    expect(within(recent).getByText("LINE inbox")).toBeInTheDocument();

    expect(
      within(groupNamed("Go to")).getByText("PathLabs"),
    ).toBeInTheDocument();
    expect(
      within(groupNamed("Actions")).getByText("Refresh counts"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("navigates to a queue's deep link and closes", () => {
    const { onOpenChange } = renderPalette();
    fireEvent.click(screen.getByText("DMs waiting for a reply"));
    expect(push).toHaveBeenCalledWith("/admin/dm-leads?sort=waiting");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("filters tools locally as soon as the admin types", () => {
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: "l" } });

    const tools = groupNamed("Tools");
    expect(within(tools).getByText("LINE inbox")).toBeInTheDocument();
    expect(within(tools).queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs attention")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders server hits grouped by type with the partial note", async () => {
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: "somchai" } });

    expect(await screen.findByText("Somchai K.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/search?q=somchai");
    const group = groupNamed("SHIFT applications");
    expect(
      within(group).getByText("SHIFT[3] · new · s***@gmail.com"),
    ).toBeInTheDocument();
    expect(within(group).getByText("new")).toBeInTheDocument();
    expect(screen.getByText(/results may be incomplete/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Somchai K."));
    expect(push).toHaveBeenCalledWith("/admin/shift/applications?id=app-1");
  });

  it("debounces typing into a single request", async () => {
    jest.useFakeTimers();
    try {
      const { input } = renderPalette();
      fireEvent.change(input, { target: { value: "so" } });
      fireEvent.change(input, { target: { value: "som" } });
      fireEvent.change(input, { target: { value: "somc" } });
      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/search?q=somc");
    } finally {
      jest.useRealTimers();
    }
  });

  it("shows an error row with a retry when record search fails", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: "zz" } });

    expect(await screen.findByText(/Record search failed/)).toBeInTheDocument();
    fetchMock.mockImplementation(async () => ({
      ok: true,
      json: async () => searchResponse,
    }));
    fireEvent.click(screen.getByText("Try the search again"));
    expect(await screen.findByText("Somchai K.")).toBeInTheDocument();
  });

  it("opens in a new tab with Cmd+Enter", async () => {
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: "line inbox" } });
    await waitFor(() =>
      expect(
        screen.getByText("LINE inbox").closest("[cmdk-item]"),
      ).toHaveAttribute("data-selected", "true"),
    );
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });

    expect(open).toHaveBeenCalledWith(
      "/admin/line",
      "_blank",
      "noopener,noreferrer",
    );
    expect(push).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("ignores Enter while an IME composition is active", async () => {
    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: "line" } });
    await waitFor(() =>
      expect(
        screen.getByText("LINE inbox").closest("[cmdk-item]"),
      ).toHaveAttribute("data-selected", "true"),
    );
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
    expect(push).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/admin/line");
  });

  it("runs actions: refresh counts and keyboard shortcuts", () => {
    const { onShowShortcuts } = renderPalette();
    fireEvent.click(screen.getByText("Refresh counts"));
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Keyboard shortcuts"));
    expect(onShowShortcuts).toHaveBeenCalledTimes(1);
  });

  it("keeps palette keys from reaching page shortcuts on window", async () => {
    // Stands in for CampaignReviewQueue: Cmd+Enter in an input sends a DM.
    const pageKeys: string[] = [];
    const pageHandler = (event: KeyboardEvent) => pageKeys.push(event.key);
    window.addEventListener("keydown", pageHandler);
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    try {
      const { input } = renderPalette();
      fireEvent.change(input, { target: { value: "users" } });
      await waitFor(() =>
        expect(
          screen.getByText("Users").closest("[cmdk-item]"),
        ).toHaveAttribute("data-selected", "true"),
      );
      fireEvent.keyDown(input, { key: "Enter", metaKey: true });
      fireEvent.keyDown(input, { key: "s" });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(open).toHaveBeenCalledTimes(1);
      expect(pageKeys).toEqual([]);
    } finally {
      window.removeEventListener("keydown", pageHandler);
      open.mockRestore();
    }
  });

  it("never opens a record from the previous query while a new one loads", async () => {
    const pim: AdminSearchResponse = {
      q: "pi",
      tookMs: 5,
      partial: false,
      groups: [
        {
          type: "user",
          label: "Users",
          hits: [
            {
              type: "user",
              id: "u-pim",
              title: "Pim",
              href: "/admin/users?id=u-pim",
              score: 80,
            },
          ],
        },
      ],
    };
    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => pim,
    }));
    // The next search never answers, so the "pi" rows stay on screen.
    fetchMock.mockImplementation(() => new Promise(() => {}));

    const { input } = renderPalette();
    fireEvent.change(input, { target: { value: "pi" } });
    const row = (await screen.findByText("Pim")).closest("[cmdk-item]");
    expect(row).not.toHaveAttribute("aria-disabled", "true");

    fireEvent.change(input, { target: { value: "pit" } });
    expect(screen.getByText("Pim").closest("[cmdk-item]")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByText("Searching records…")).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByText("Pim"));

    expect(push).not.toHaveBeenCalled();
  });

  it("skips queue keys from a newer server instead of crashing", () => {
    snapshot = {
      generatedAt: "2026-10-26T00:00:00.000Z",
      queues: [
        {
          key: "brand_new_queue" as never,
          count: 4,
          href: "/admin/new",
        },
        {
          key: "dm_awaiting_reply",
          count: 5,
          href: "/admin/dm-leads?sort=waiting",
        },
        {
          key: "shift_new_applications",
          count: 2,
          href: "/admin/shift/applications?status=new",
        },
      ],
    };
    renderPalette();
    const rows = within(groupNamed("Needs attention")).getAllByRole("option");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("DMs waiting for a reply");
  });

  it("says when counts could not load and offers a retry", () => {
    snapshot = null;
    countsFailed = true;
    renderPalette();
    const attention = groupNamed("Needs attention");
    expect(within(attention).getByText(/Counts could not load/)).toBeInTheDocument();
    expect(
      within(attention).queryByText("Counting open work…"),
    ).not.toBeInTheDocument();
    fireEvent.click(within(attention).getByText("Try loading counts again"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("says when every queue is clear", () => {
    snapshot = { generatedAt: "2026-10-26T00:00:00.000Z", queues: [] };
    renderPalette();
    expect(screen.getByText("Every queue is clear.")).toBeInTheDocument();
  });
});
