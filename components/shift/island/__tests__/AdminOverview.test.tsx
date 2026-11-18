import { fireEvent, render, screen } from "@testing-library/react";
import { AdminOverview } from "../AdminOverview";

jest.mock("../IslandSheet", () => ({ IslandSheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null }));
const data = { projects: [
  { slot: 1, name: "Lantern", route: "software", ambition: "Build a light", milestones: [1], members: ["Mint"], waitingReview: 2, openHelp: 1, checkinsWeek: 3, lastActivity: "2026-11-15T12:00:00Z" },
  { slot: 2, name: "Garden", route: "service", ambition: null, milestones: [], members: ["Ploy"], waitingReview: 0, openHelp: 0, checkinsWeek: 0, lastActivity: "2026-11-15T12:00:00Z" },
] };
it("finds a team by its member name or plot number", () => {
  render(<AdminOverview open onClose={jest.fn()} data={data} />);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "mint" } });
  expect(screen.getByRole("heading", { name: "แปลง 1 · Lantern" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: /Garden/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "2" } });
  expect(screen.getByRole("heading", { name: "แปลง 2 · Garden" })).toBeInTheDocument();
});
it("shows a read failure instead of a misleading empty island", () => {
  render(<AdminOverview open onClose={jest.fn()} data={null} />);
  expect(screen.getByRole("status")).toHaveTextContent("ยังโหลดข้อมูลแอดมินไม่ได้");
});

