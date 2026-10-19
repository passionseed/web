import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AdminHackathonParticipants } from "../AdminHackathonParticipants";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("recharts", () => {
  const Box = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return { PieChart: Box, Pie: Box, Cell: Box, ResponsiveContainer: Box, Legend: Box, Tooltip: Box };
});

const person = (id: string, name: string) => ({
  id,
  name,
  email: `${id}@x.org`,
  phone: "",
  university: "Uni",
  role: "",
  track: "",
  grade_level: "",
  experience_level: 1,
  referral_source: "",
  bio: "",
  created_at: "2026-10-01T00:00:00Z",
  team: null,
  joined_team_at: null,
});

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/hackathon/participants" && !init) {
      return { ok: true, json: async () => ({ participants: [person("a", "Alice"), person("b", "Bob")] }) };
    }
    return { ok: true, json: async () => ({}) };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  window.confirm = jest.fn(() => true);
});

const rowCheckbox = (name: string) => within(screen.getByText(name).closest("tr")!).getByRole("checkbox");

test("bulk delete only sends selected rows that the search still shows", async () => {
  render(<AdminHackathonParticipants />);
  await screen.findByText("Alice");
  const search = screen.getByPlaceholderText(/Search by name/);

  // Select Alice, then search for Bob: the search change clears the hidden selection.
  fireEvent.click(rowCheckbox("Alice"));
  expect(screen.getByRole("button", { name: /Delete \(1\)/ })).toBeInTheDocument();
  fireEvent.change(search, { target: { value: "Bob" } });
  expect(screen.queryByRole("button", { name: /Delete \(/ })).not.toBeInTheDocument();

  fireEvent.click(rowCheckbox("Bob"));
  fireEvent.click(screen.getByRole("button", { name: /Delete \(1\)/ }));

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/hackathon/participants", expect.objectContaining({ method: "DELETE" })),
  );
  const del = fetchMock.mock.calls.find(([, init]) => init?.method === "DELETE")!;
  expect(JSON.parse(del[1].body)).toEqual({ participantIds: ["b"] });
});
