import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShiftCompanionStaff } from "./ShiftCompanionStaff";

jest.mock("@/components/ui/in-view-animator", () => ({ InViewAnimator: () => null }));

const cohort = "10000000-0000-4000-8000-000000000001";
const roster = "10000000-0000-4000-8000-000000000002";
const initial = { ok: true as const, is_admin: true, cohorts: [{ id: cohort, name: "SHIFT 2", starts_on: "2026-10-10" }] };
const fetchMock = jest.fn();
const response = (data: unknown) => ({ ok: true, json: async () => data });

beforeEach(() => {
  global.fetch = fetchMock;
  fetchMock.mockReset().mockResolvedValue(response({ ok: true, roster: [] }));
});

test("the code is shown once and never remains on the roster after closing", async () => {
  render(<ShiftCompanionStaff initial={initial} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Issue one code" })).toBeEnabled());
  fetchMock.mockResolvedValueOnce(response({ ok: true, code: "7KFM", roster_id: roster, expires_at: "2026-11-01T00:00:00Z" }));
  fireEvent.click(screen.getByRole("button", { name: "Issue one code" }));
  expect(await screen.findByText("7KFM")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Copy code" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Done, hide code" }));
  await waitFor(() => expect(screen.queryByText("7KFM")).not.toBeInTheDocument());
});

test("claimed people show contacts and have no replace-code action", async () => {
  fetchMock.mockResolvedValue(response({ ok: true, roster: [{ id: roster, email: "participant@example.invalid", mobile: "+66812345678", claimed: true, claimed_at: "2026-10-02T03:00:00Z", created_at: "2026-10-01T03:00:00Z", expires_at: null }] }));
  render(<ShiftCompanionStaff initial={initial} />);
  expect(await screen.findByText("participant@example.invalid")).toBeInTheDocument();
  expect(screen.getByText("+66812345678")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Replace code" })).not.toBeInTheDocument();
});

test("the updates tab removes contacts and codes from the screen", async () => {
  fetchMock.mockResolvedValueOnce(response({ ok: true, roster: [{ id: roster, email: "participant@example.invalid", mobile: "+66812345678", claimed: true, claimed_at: "2026-10-02T03:00:00Z", created_at: "2026-10-01T03:00:00Z", expires_at: null }] }));
  render(<ShiftCompanionStaff initial={initial} />);
  await screen.findByText("+66812345678");
  fetchMock.mockResolvedValueOnce(response({ ok: true, today: "2026-10-02", updates: [{ id: roster, author_id: roster, author_name: "Builder", tried: "Tested the prototype", learned: "The button was unclear", help: "Need a second tester", link: "javascript:alert(1)", image_path: null, submitted_at: "2026-10-02T03:00:00Z", updated_at: "2026-10-02T03:00:00Z", revision: 1 }] }));
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Today’s updates" }), { button: 0, ctrlKey: false });
  expect(await screen.findByText("Tested the prototype")).toBeInTheDocument();
  expect(screen.getByText("Need a second tester")).toBeInTheDocument();
  expect(screen.queryByText("+66812345678")).not.toBeInTheDocument();
  expect(screen.queryByText("participant@example.invalid")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Issue one code" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Open project link" })).not.toBeInTheDocument();
});

test("mentors can issue codes but do not see cohort creation", async () => {
  render(<ShiftCompanionStaff initial={{ ...initial, is_admin: false }} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Issue one code" })).toBeEnabled());
  expect(screen.queryByRole("button", { name: "New cohort" })).not.toBeInTheDocument();
});

test("changing cohorts discards the previous cohort roster immediately", async () => {
  fetchMock.mockResolvedValueOnce(response({ ok: true, roster: [{ id: roster, email: "first@example.invalid", mobile: "+66812345678", claimed: true, claimed_at: null, created_at: "2026-10-01T03:00:00Z", expires_at: null }] }));
  render(<ShiftCompanionStaff initial={{ ...initial, cohorts: [...initial.cohorts, { id: roster, name: "Other cohort", starts_on: "2026-10-20" }] }} />);
  await screen.findByText("first@example.invalid");
  fetchMock.mockImplementationOnce(() => new Promise(() => {}));
  fireEvent.change(screen.getByLabelText("Cohort"), { target: { value: roster } });
  expect(screen.queryByText("first@example.invalid")).not.toBeInTheDocument();
});
