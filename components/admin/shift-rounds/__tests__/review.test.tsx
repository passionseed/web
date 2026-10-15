import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import * as actions from "@/app/admin/shift/rounds/actions";
import { ReviewQueue } from "../ReviewQueue";
import { ROUND_ID, makeEvidence } from "../__fixtures__/rounds";

jest.mock("@/app/admin/shift/rounds/actions", () => ({
  reviewQueueAction: jest.fn(),
  listEntriesAction: jest.fn(),
  rejectEvidenceAction: jest.fn(),
  acceptEvidenceAction: jest.fn(),
  markReviewedAction: jest.fn(),
  signMediaAction: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const m = actions as jest.Mocked<typeof actions>;
const submitted = makeEvidence({ handle: "ต้น" });
const rejected = makeEvidence({ handle: "มิว", status: "rejected", status_reason_code: "duplicate" });

beforeEach(() => {
  m.reviewQueueAction.mockResolvedValue({ ok: true, data: [submitted, rejected] });
  m.listEntriesAction.mockResolvedValue({ ok: true, data: { entries: [], squads: [] } });
  m.signMediaAction.mockResolvedValue({ ok: true, data: {} });
});

async function confirmIn(label: string) {
  const dialog = await screen.findByRole("alertdialog");
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: label }));
  });
}

test("loads the queue with the default filter (submitted, unreviewed)", async () => {
  render(<ReviewQueue roundId={ROUND_ID} />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading review queue");
  expect(await screen.findByRole("heading", { name: "ต้น" })).toBeInTheDocument();
  expect(m.reviewQueueAction).toHaveBeenCalledWith(ROUND_ID, {
    status: "submitted",
    type: null,
    squad_id: null,
    unreviewed_only: true,
    sample: false,
  });
  expect(screen.getByText("ไม่มีเวลา")).toBeInTheDocument();
});

test("reject requires a reason, then calls the reject RPC with review time", async () => {
  m.rejectEvidenceAction.mockResolvedValue({ ok: true, data: { missions: { missions: [], missions_complete: 0, people_talked_to: 0, eligible: false }, invalidated_changes: ["x"] } });
  render(<ReviewQueue roundId={ROUND_ID} />);
  await screen.findByRole("heading", { name: "ต้น" });

  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  expect(await screen.findByText("Pick a reason before rejecting.")).toBeInTheDocument();
  expect(m.rejectEvidenceAction).not.toHaveBeenCalled();

  fireEvent.change(screen.getByLabelText("Reject reason"), { target: { value: "privacy" } });
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  await confirmIn("Reject");

  await waitFor(() =>
    expect(m.rejectEvidenceAction).toHaveBeenCalledWith(submitted.id, "privacy", null, expect.any(Number)),
  );
  expect(await screen.findByText(/1 linked change log\(s\) no longer count/)).toBeInTheDocument();
});

test("'other' needs a note for the student", async () => {
  render(<ReviewQueue roundId={ROUND_ID} />);
  await screen.findByRole("heading", { name: "ต้น" });
  fireEvent.change(screen.getByLabelText("Reject reason"), { target: { value: "other" } });
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  expect(await screen.findByText(/Add a note/)).toBeInTheDocument();
  expect(m.rejectEvidenceAction).not.toHaveBeenCalled();
});

test("shows the RPC error code when an action fails", async () => {
  m.rejectEvidenceAction.mockResolvedValue({ ok: false, error: { code: "review_closed", category: "validation" } });
  render(<ReviewQueue roundId={ROUND_ID} />);
  await screen.findByRole("heading", { name: "ต้น" });
  fireEvent.change(screen.getByLabelText("Reject reason"), { target: { value: "duplicate" } });
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  await confirmIn("Reject");
  const alerts = await screen.findAllByRole("alert");
  expect(alerts.some((a) => /review window.*\(review_closed\)/.test(a.textContent ?? ""))).toBe(true);
});

test("accept is offered only for rejected logs and calls the accept RPC", async () => {
  m.acceptEvidenceAction.mockResolvedValue({ ok: true, data: { missions: { missions: [], missions_complete: 1, people_talked_to: 1, eligible: false } } });
  render(<ReviewQueue roundId={ROUND_ID} />);
  await screen.findByRole("heading", { name: "ต้น" });
  expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /มิว/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Accept" }));
  await confirmIn("Accept");
  await waitFor(() => expect(m.acceptEvidenceAction).toHaveBeenCalledWith(rejected.id, null, expect.any(Number)));
});

test("mark reviewed calls its RPC and the keyboard shortcut works", async () => {
  m.markReviewedAction.mockResolvedValue({ ok: true, data: {} });
  render(<ReviewQueue roundId={ROUND_ID} />);
  await screen.findByRole("heading", { name: "ต้น" });
  await act(async () => {
    fireEvent.keyDown(window, { key: "m" });
  });
  await waitFor(() => expect(m.markReviewedAction).toHaveBeenCalledWith(submitted.id, expect.any(Number)));
});

test("load failure shows the error with retry", async () => {
  m.reviewQueueAction.mockResolvedValueOnce({ ok: false, error: { code: "forbidden", category: "forbidden" } });
  render(<ReviewQueue roundId={ROUND_ID} />);
  expect(await screen.findByText(/\(forbidden\)/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
  expect(await screen.findByRole("heading", { name: "ต้น" })).toBeInTheDocument();
});

test("empty queue shows the empty state", async () => {
  m.reviewQueueAction.mockResolvedValue({ ok: true, data: [] });
  render(<ReviewQueue roundId={ROUND_ID} />);
  expect(await screen.findByText("Nothing to review")).toBeInTheDocument();
});
