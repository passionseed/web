import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import * as actions from "@/app/admin/shift/rounds/actions";
import { RolesSection, RoundSettings } from "../RoundSettings";
import { ROUND_ID, makeRound } from "../__fixtures__/rounds";

jest.mock("@/app/admin/shift/rounds/actions", () => ({
  listRoundsAction: jest.fn(),
  updateRoundAction: jest.fn(),
  extendRoundAction: jest.fn(),
  updateAllowlistAction: jest.fn(),
  importAllowlistAction: jest.fn(),
  listRolesAction: jest.fn(),
  setRoleAction: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const m = actions as jest.Mocked<typeof actions>;
const BEFORE_START = new Date("2026-11-01T00:00:00Z");
const DAY_3 = new Date("2026-11-12T03:00:00Z");

beforeEach(() => {
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [makeRound()] });
  m.updateAllowlistAction.mockResolvedValue({ ok: true, data: { count: 2, emails: ["a@x.org", "b@x.org"] } });
  m.listRolesAction.mockResolvedValue({ ok: true, data: [] });
});

test("after the start, locked policy columns are read-only and editable ones are not", async () => {
  render(<RoundSettings roundId={ROUND_ID} now={DAY_3} />);
  const duration = await screen.findByLabelText("Duration (days)");
  expect(duration).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Squad size")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Join mode")).toBeDisabled();
  expect(screen.getByLabelText("Title (English)")).not.toHaveAttribute("readonly");
  expect(screen.getByLabelText("Join cutoff day")).not.toHaveAttribute("readonly");
  expect(screen.getAllByText(/Locked after the round started/).length).toBeGreaterThan(3);
});

test("before the start every policy column is editable", async () => {
  render(<RoundSettings roundId={ROUND_ID} now={BEFORE_START} />);
  expect(await screen.findByLabelText("Duration (days)")).not.toHaveAttribute("readonly");
  expect(screen.queryByText(/Locked after the round started/)).not.toBeInTheDocument();
});

test("saving sends only the changed fields", async () => {
  m.updateRoundAction.mockResolvedValue({ ok: true, data: { round: makeRound() } });
  render(<RoundSettings roundId={ROUND_ID} now={DAY_3} />);
  fireEvent.change(await screen.findByLabelText("Title (English)"), { target: { value: "Beta round A" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  });
  expect(m.updateRoundAction).toHaveBeenCalledWith(ROUND_ID, { title_en: "Beta round A" });
});

test("server policy_locked error is shown with its code", async () => {
  m.updateRoundAction.mockResolvedValue({ ok: false, error: { code: "policy_locked", category: "validation" } });
  render(<RoundSettings roundId={ROUND_ID} now={BEFORE_START} />);
  fireEvent.change(await screen.findByLabelText("Duration (days)"), { target: { value: "10" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  });
  expect(await screen.findByText(/\(policy_locked\)/)).toBeInTheDocument();
});

test("extend needs a reason and a confirmation", async () => {
  m.extendRoundAction.mockResolvedValue({ ok: true, data: { closes_at: "2026-11-25T17:00:00.000Z", review_ends_at: "2026-11-27T17:00:00.000Z" } });
  render(<RoundSettings roundId={ROUND_ID} now={DAY_3} />);
  const extend = await screen.findByRole("button", { name: /Extend$/ });
  fireEvent.click(extend);
  expect(await screen.findByText(/Add a reason/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Extend by"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "School exams" } });
  fireEvent.click(extend);
  const dialog = await screen.findByRole("alertdialog");
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Extend" }));
  });
  expect(m.extendRoundAction).toHaveBeenCalledWith(ROUND_ID, 2, "School exams");
});

test("allowlist shows the current list and adds pasted emails after confirm", async () => {
  render(<RoundSettings roundId={ROUND_ID} now={DAY_3} />);
  expect(await screen.findByText("a@x.org")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Add emails"), { target: { value: "C@x.org\nd@x.org" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to allowlist" }));
  const dialog = await screen.findByRole("alertdialog");
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
  });
  await waitFor(() => expect(m.updateAllowlistAction).toHaveBeenCalledWith(ROUND_ID, ["c@x.org", "d@x.org"], []));
});

test("global staff list shows web admins as not removable and keeps grants revocable", async () => {
  m.listRolesAction.mockResolvedValue({
    ok: true,
    data: [
      { user_id: "u-admin", round_id: null, role: "staff", email: "admin@x.org", display_name: "Admin", source: "web_admin" },
      { user_id: "u-grant", round_id: null, role: "staff", email: "grant@x.org", display_name: "Granted", source: "shift_round_roles" },
    ],
  });
  render(<RolesSection roundId={null} title="Global SHIFT staff" />);
  const adminRow = (await screen.findByText("Admin")).closest("li")!;
  expect(within(adminRow).getByText(/Web admin · not removable here/)).toBeInTheDocument();
  expect(within(adminRow).queryByRole("button")).not.toBeInTheDocument();
  const grantRow = screen.getByText("Granted").closest("li")!;
  expect(within(grantRow).getByRole("button", { name: "Remove staff role from grant@x.org" })).toBeInTheDocument();
  expect(screen.getByText(/Every web admin is global SHIFT staff automatically/)).toBeInTheDocument();
});

describe("SHIFT format fields (v2)", () => {
  test("session days, times, curriculum link, cohort picker and the missions list", async () => {
    render(<RoundSettings roundId={ROUND_ID} now={BEFORE_START} />);
    expect(await screen.findByRole("checkbox", { name: "วันที่ 1" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "วันที่ 3" })).not.toBeChecked();
    expect(screen.getAllByRole("checkbox", { name: /^วันที่ \d+$/ })).toHaveLength(14);
    expect(screen.getByLabelText("เริ่มเซสชัน (เวลาไทย)")).toHaveValue("19:00");
    expect(screen.getByLabelText("จบเซสชัน (เวลาไทย)")).toHaveValue("21:00");
    expect(screen.getByRole("link", { name: /เปิดหลักสูตร 4/ })).toHaveAttribute("href", "/shift/curriculum?round=4");
    const cohort = screen.getByLabelText("รุ่นใบสมัคร");
    expect(within(cohort).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "ไม่ผูกกับใบสมัคร",
      "SHIFT[0]",
      "SHIFT[1]",
      "SHIFT[2]",
      "SHIFT[3]",
    ]);
    const missions = within(screen.getByRole("list", { name: "ภารกิจของรอบ" })).getAllByRole("listitem");
    expect(missions).toHaveLength(9);
    expect(missions[0]).toHaveTextContent("คิด 3 ไอเดีย แล้วเลือก 1");
    expect(missions[1]).toHaveTextContent("Interview ×3 (คนไม่ซ้ำ)");
    expect(missions[8]).toHaveTextContent("เข้าเซสชันทุกครั้ง");
  });

  test("before the start, session days and cohort save as a patch of just those fields", async () => {
    m.updateRoundAction.mockResolvedValue({ ok: true, data: { round: makeRound() } });
    render(<RoundSettings roundId={ROUND_ID} now={BEFORE_START} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "วันที่ 3" }));
    fireEvent.change(screen.getByLabelText("รุ่นใบสมัคร"), { target: { value: "SHIFT[2]" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });
    expect(m.updateRoundAction).toHaveBeenCalledWith(ROUND_ID, {
      session_days: [1, 2, 3, 4, 6, 7],
      application_cohort: "SHIFT[2]",
    });
  });

  test("a session that ends before it starts is caught before saving", async () => {
    render(<RoundSettings roundId={ROUND_ID} now={BEFORE_START} />);
    fireEvent.change(await screen.findByLabelText("จบเซสชัน (เวลาไทย)"), { target: { value: "18:00" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });
    expect(screen.getByText("ต้องหลังเวลาเริ่ม")).toBeInTheDocument();
    expect(m.updateRoundAction).not.toHaveBeenCalled();
  });

  test("after the start the session schedule and curriculum key still change (missions stay read-only)", async () => {
    m.updateRoundAction.mockResolvedValue({ ok: true, data: { round: makeRound() } });
    render(<RoundSettings roundId={ROUND_ID} now={DAY_3} />);
    const day8 = await screen.findByRole("checkbox", { name: "วันที่ 8" });
    expect(day8).not.toBeDisabled();
    expect(screen.getByLabelText("Duration (days)")).toHaveAttribute("readonly");
    fireEvent.click(day8);
    fireEvent.change(screen.getByLabelText("คีย์หลักสูตร"), { target: { value: "shift4" } });
    expect(screen.getByRole("link", { name: /เปิดหลักสูตร shift4/ })).toHaveAttribute("href", "/shift/curriculum?round=shift4");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });
    expect(m.updateRoundAction).toHaveBeenCalledWith(ROUND_ID, {
      session_days: [1, 2, 4, 6, 7, 8],
      curriculum_key: "shift4",
    });
  });
});
