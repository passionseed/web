import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import type { AdminQueueSnapshot } from "@/lib/admin/console";
import { AdminNav } from "../../AdminNav";

let pathname = "/admin/users";
jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

let snapshot: AdminQueueSnapshot | null = null;
jest.mock("../live-counts", () => ({
  useAdminLiveCounts: () => ({ snapshot, refresh: jest.fn(), seed: jest.fn() }),
}));

const details = (label: string) =>
  screen
    .getByText(label, { selector: ".admin-nav-group-label" })
    .closest("details")!;

/** Clicking a summary toggles <details> natively; jsdom fires toggle async. */
async function toggle(label: string) {
  const el = details(label);
  await act(async () => {
    el.open = !el.open;
    el.dispatchEvent(new Event("toggle"));
  });
}

beforeEach(() => {
  pathname = "/admin/users";
  snapshot = null;
  window.localStorage.clear();
});

describe("AdminNav", () => {
  it("opens daily groups and the active group by default", () => {
    render(<AdminNav />);
    expect(details("Workspace").open).toBe(true);
    expect(details("SHIFT").open).toBe(true);
    expect(details("People").open).toBe(true);
    expect(details("Learning").open).toBe(false);
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("remembers a group the admin opened across navigation and reloads", async () => {
    const { rerender, unmount } = render(<AdminNav />);
    await toggle("Learning");
    expect(details("Learning").open).toBe(true);
    expect(
      JSON.parse(window.localStorage.getItem("admin:nav-groups")!),
    ).toEqual({
      learning: true,
    });

    pathname = "/admin/line";
    rerender(<AdminNav />);
    expect(details("Learning").open).toBe(true);

    unmount();
    render(<AdminNav />);
    await waitFor(() => expect(details("Learning").open).toBe(true));
  });

  it("keeps a closed daily group closed, until a page inside it opens", async () => {
    const { rerender } = render(<AdminNav />);
    await toggle("SHIFT");
    expect(details("SHIFT").open).toBe(false);

    pathname = "/admin/maps";
    rerender(<AdminNav />);
    expect(details("SHIFT").open).toBe(false);

    pathname = "/admin/shift/rounds";
    rerender(<AdminNav />);
    await waitFor(() => expect(details("SHIFT").open).toBe(true));
  });

  it("filters tools and forces matching groups open", () => {
    render(<AdminNav />);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Filter admin tools" }),
      {
        target: { value: "experts" },
      },
    );
    expect(details("Learning").open).toBe(true);
    expect(screen.getByRole("link", { name: "Experts" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Users" }),
    ).not.toBeInTheDocument();
  });

  it("shows count badges with screen reader text", () => {
    snapshot = {
      generatedAt: "2026-10-26T00:00:00.000Z",
      queues: [
        { key: "dm_awaiting_reply", count: 4, href: "/admin/dm-leads" },
        { key: "experts_pending", count: 120, href: "/admin/experts" },
      ],
    };
    render(<AdminNav />);
    expect(
      screen.getByRole("link", { name: "DM leads , 4 waiting" }),
    ).toBeInTheDocument();
    // Learning is closed, so its summary carries the group total.
    expect(details("Learning").querySelector("summary")).toHaveTextContent(
      "99+",
    );
  });
});
