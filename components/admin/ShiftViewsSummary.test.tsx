import { fireEvent, render, screen } from "@testing-library/react";
import { ShiftViewsSummary } from "./ShiftViewsSummary";

const originalFetch = global.fetch;
const fetchViews = jest.fn();
beforeEach(() => {
  global.fetch = fetchViews;
  fetchViews.mockReset();
});
afterAll(() => { global.fetch = originalFetch; });

test("shows recorded views by source with their global scope", async () => {
  fetchViews.mockResolvedValue({
    ok: true,
    json: async () => ({
      totalViews: 1200,
      sources: [{ source: "ig-grid", count: 1100 }, { source: "direct", count: 100 }],
    }),
  });
  render(<ShiftViewsSummary />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading page views");
  expect(await screen.findByText("ig-grid")).toBeInTheDocument();
  expect(screen.getByText("1,200")).toBeInTheDocument();
  expect(screen.getByText("1,100")).toBeInTheDocument();
  expect(screen.getByText("All cohorts, all time")).toBeInTheDocument();
  expect(screen.getByText(/Repeat visits count/)).toBeInTheDocument();
});

test("keeps failed analytics distinct from zero views and allows retry", async () => {
  fetchViews.mockResolvedValueOnce({ ok: false });
  render(<ShiftViewsSummary />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Failed to load page views");
  expect(screen.queryByText("No page views recorded yet.")).not.toBeInTheDocument();
  fetchViews.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ totalViews: 0, sources: [] }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("No page views recorded yet.")).toBeInTheDocument();
});

test("selecting /shift/1 loads and labels only that page's source counts", async () => {
  fetchViews.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ totalViews: 1200, sources: [{ source: "poster", count: 1200 }] }),
  });
  render(<ShiftViewsSummary />);
  await screen.findByText("poster");
  fetchViews.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ totalViews: 25, sources: [{ source: "ig-grid", count: 25 }] }),
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Page" }), { target: { value: "/shift/1" } });
  expect(await screen.findByText("ig-grid")).toBeInTheDocument();
  expect(screen.getByText("/shift/1, all time")).toBeInTheDocument();
  expect(screen.queryByText("1,200")).not.toBeInTheDocument();
  expect(fetchViews).toHaveBeenLastCalledWith("/api/admin/shift/views?page=%2Fshift%2F1", expect.any(Object));
});
