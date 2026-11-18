import { render, screen } from "@testing-library/react";

import PortalPage from "./page";
import { loadFeaturedRadars } from "@/lib/radar/featured";
import { loadPersistedMyPathResult } from "@/lib/my-path/server-read";
import { buildMyPathSummary } from "@/lib/my-path/summary";
import { redirect } from "next/navigation";
import { SHIFT_ISLAND } from "@/lib/content/shift-island";
import { SEAL } from "@/lib/content/shift-island-invite";
import { loadIslandViewer } from "@/lib/supabase/shift-island-viewer";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const getUser = jest.fn();

jest.mock("@/utils/supabase/server", () => ({
  createClient: jest.fn().mockImplementation(() => Promise.resolve({ auth: { getUser } })),
}));

jest.mock("@/lib/radar/featured", () => ({
  loadFeaturedRadars: jest.fn(),
}));

jest.mock("@/lib/supabase/shift-island-viewer", () => ({
  loadIslandViewer: jest.fn(),
}));

jest.mock("@/lib/my-path/server-read", () => ({
  loadPersistedMyPathResult: jest.fn(),
}));

jest.mock("@/lib/my-path/summary", () => ({
  buildMyPathSummary: jest.fn(),
}));

jest.mock("@/components/my-path/MyPathSummaryCard", () => ({
  MyPathSummaryCard: ({ summary }: { summary: { plan: { headline: string } } }) => (
    <section>Saved plan: {summary.plan.headline}</section>
  ),
}));

jest.mock("@/components/ui/in-view-animator", () => ({ InViewAnimator: () => null }));

const viewerIs = (kind: string) =>
  (loadIslandViewer as jest.Mock).mockResolvedValue({ viewer: { kind }, userId: "user-a", input: {} });

const cyber = {
  slug: "cybersecurity",
  nameTh: "ความปลอดภัยไซเบอร์",
  taglineTh: "จับแฮกเกอร์ก่อนเขาเข้ามา",
  emoji: "🛡️",
  playable: true,
  href: "/radar/cybersecurity",
};

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: "user-a" } } });
  (loadFeaturedRadars as jest.Mock).mockResolvedValue([cyber]);
  viewerIs("going");
  (loadPersistedMyPathResult as jest.Mock).mockResolvedValue({ status: "ready", state: null });
  (buildMyPathSummary as jest.Mock).mockReturnValue(null);
});

test("sends a signed-out visitor to login", async () => {
  getUser.mockResolvedValue({ data: { user: null } });

  await expect(PortalPage()).rejects.toThrow("NEXT_REDIRECT");
  expect(redirect).toHaveBeenCalledWith("/login");
});

test("leads with the SHIFT High Island; a member goes straight in", async () => {
  render(await PortalPage());

  expect(screen.getByRole("heading", { level: 1, name: SHIFT_ISLAND.heading })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /เข้าเกาะ/ })).toHaveAttribute("href", "/shift/island");
  expect(screen.queryByRole("link", { name: /สมัคร SHIFT/ })).not.toBeInTheDocument();
});

test("someone who never did SHIFT is sent to SHIFT first, with a door for unconfirmed alumni", async () => {
  viewerIs("notAlumni");
  render(await PortalPage());

  expect(screen.getByRole("link", { name: /สมัคร SHIFT/ })).toHaveAttribute("href", "/shift");
  expect(screen.getByRole("link", { name: new RegExp(SEAL.alumniCta) })).toHaveAttribute("href", "/shift/island/verify");
  expect(screen.getByText(SHIFT_ISLAND.entry)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /เข้าเกาะ/ })).not.toBeInTheDocument();
});

test("an alumnus who hasn't RSVPed opens the invitation", async () => {
  viewerIs("canRsvp");
  render(await PortalPage());

  expect(screen.getByRole("link", { name: /เปิดจดหมายเชิญ/ })).toHaveAttribute("href", "/shift/island");
});

test("falls back to the island's own gate when the viewer can't be read", async () => {
  (loadIslandViewer as jest.Mock).mockRejectedValue(new Error("db down"));
  jest.spyOn(console, "error").mockImplementation(() => {});
  render(await PortalPage());

  expect(screen.getByRole("link", { name: /เข้าเกาะ/ })).toHaveAttribute("href", "/shift/island");
});

test("shows featured Radar careers and a way to the whole hub", async () => {
  render(await PortalPage());

  expect(screen.getByRole("link", { name: /ความปลอดภัยไซเบอร์/ })).toHaveAttribute("href", "/radar/cybersecurity");
  expect(screen.getByText("มีด่านให้เล่น")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /ดูทุกอาชีพ/ })).toHaveAttribute("href", "/radar");
});

test("hides the Radar section when no career can be loaded", async () => {
  (loadFeaturedRadars as jest.Mock).mockResolvedValue([]);
  render(await PortalPage());

  expect(screen.queryByRole("heading", { name: "ลองส่องอาชีพ" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /เข้าเกาะ/ })).toBeInTheDocument();
});

test("keeps the My Path fragment target on the Dawn landmark", async () => {
  render(await PortalPage());

  expect(screen.getByRole("main")).toHaveAttribute("id", "my-path");
  expect(screen.getByRole("main")).toHaveClass("dawn-theme");
});

test("shows the plan saved from /plan, which promises it lives at /me#my-path", async () => {
  (loadPersistedMyPathResult as jest.Mock).mockResolvedValue({
    status: "ready",
    state: { hasPersistedPath: true, draft: { answers: {}, possibilities: [] }, evidence: [] },
  });
  (buildMyPathSummary as jest.Mock).mockReturnValue({ plan: { headline: "แผน 4 เดือน" } });
  render(await PortalPage());

  expect(screen.getByRole("main")).toHaveTextContent("Saved plan: แผน 4 เดือน");
});

test("shows no plan card when nothing was saved, or the plan can't be read", async () => {
  render(await PortalPage());
  expect(screen.queryByText(/Saved plan/)).not.toBeInTheDocument();

  (loadPersistedMyPathResult as jest.Mock).mockRejectedValue(new Error("db down"));
  jest.spyOn(console, "error").mockImplementation(() => {});
  render(await PortalPage());
  expect(screen.queryByText(/Saved plan/)).not.toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /เข้าเกาะ/ }).length).toBeGreaterThan(0);
});
