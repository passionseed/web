import { act, fireEvent, render, screen, within } from "@testing-library/react";

import * as actions from "@/app/admin/shift/rounds/actions";
import type { AdminResult } from "@/lib/shift-round/admin/types";
import { AttendanceBoard } from "../AttendanceBoard";
import { ROUND_ID, at, makeShiftRound, makeStepsRow } from "../__fixtures__/rounds";

jest.mock("@/app/admin/shift/rounds/actions", () => ({
  listRoundsAction: jest.fn(),
  roundStepsAction: jest.fn(),
  markAttendanceAction: jest.fn(),
}));

const m = actions as jest.Mocked<typeof actions>;
const DAY4_LIVE = at(4, "19:30");

function deferred() {
  let resolve!: (value: AdminResult<Record<string, unknown>>) => void;
  const promise = new Promise<AdminResult<Record<string, unknown>>>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function seed() {
  const ton = makeStepsRow({ handle: "ต้น", squad_name: "Squad 1" }, [{ day: 1, status: "present" }]);
  const mew = makeStepsRow({ handle: "มิว", squad_name: "Squad 1" }, [{ day: 1, status: "absent" }, { day: 2, status: "makeup" }]);
  const fah = makeStepsRow({ handle: "ฟ้า", squad_name: "Squad 2" });
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [makeShiftRound()] });
  m.roundStepsAction.mockResolvedValue({ ok: true, data: { rows: [fah, ton, mew] } });
  return { ton, mew, fah };
}

const cell = (handle: string, day: number) => screen.getByRole("button", { name: new RegExp(`^${handle} วันที่ ${day}: `) });

test("students x session days, with the marks already saved", async () => {
  seed();
  render(<AttendanceBoard roundId={ROUND_ID} now={DAY4_LIVE} />);
  const table = await screen.findByRole("table");
  const headers = within(table).getAllByRole("columnheader").map((h) => h.textContent ?? "");
  expect(headers[0]).toBe("นักเรียน");
  expect(headers.slice(1).map((h) => h.match(/^วันที่ \d+/)?.[0])).toEqual(["วันที่ 1", "วันที่ 2", "วันที่ 4", "วันที่ 6", "วันที่ 7"]);
  expect(headers[3]).toContain("กำลังเซสชัน");
  expect(cell("ต้น", 1)).toHaveAccessibleName("ต้น วันที่ 1: มา");
  expect(cell("มิว", 2)).toHaveAccessibleName("มิว วันที่ 2: ชดเชย");
  expect(cell("ฟ้า", 1)).toHaveAccessibleName("ฟ้า วันที่ 1: ยังไม่เช็ก");
  // Squad 1 first, then by handle.
  expect(within(table).getAllByRole("rowheader").map((h) => h.textContent)).toEqual([
    "ต้นSquad 1",
    "มิวSquad 1",
    "ฟ้าSquad 2",
    "รวม",
  ]);
});

test("a tap cycles unset -> present -> makeup -> absent -> unset, shown before the server answers", async () => {
  const { fah } = seed();
  render(<AttendanceBoard roundId={ROUND_ID} now={DAY4_LIVE} />);
  await screen.findByRole("table");
  const expected: [string, string | null][] = [
    ["มา", "present"],
    ["ชดเชย", "makeup"],
    ["ขาด", "absent"],
    ["ยังไม่เช็ก", null],
  ];
  for (const [label, status] of expected) {
    const pending = deferred();
    m.markAttendanceAction.mockReturnValueOnce(pending.promise);
    fireEvent.click(cell("ฟ้า", 4));
    expect(cell("ฟ้า", 4)).toHaveAccessibleName(`ฟ้า วันที่ 4: ${label}`);
    expect(m.markAttendanceAction).toHaveBeenLastCalledWith(ROUND_ID, 4, [{ entry_id: fah.entry_id, status }]);
    await act(async () => pending.resolve({ ok: true, data: {} }));
  }
  expect(m.markAttendanceAction).toHaveBeenCalledTimes(4);
  expect(screen.getByRole("status")).toHaveTextContent("บันทึกแล้วทุกช่อง");
});

test("a failed write rolls the cell back and shows the error code", async () => {
  seed();
  m.markAttendanceAction.mockResolvedValueOnce({ ok: false, error: { code: "forbidden", category: "forbidden" } });
  render(<AttendanceBoard roundId={ROUND_ID} now={DAY4_LIVE} />);
  await screen.findByRole("table");
  await act(async () => {
    fireEvent.click(cell("ต้น", 1));
  });
  expect(cell("ต้น", 1)).toHaveAccessibleName("ต้น วันที่ 1: มา");
  expect(screen.getByRole("alert")).toHaveTextContent(/ย้อนกลับ.*\(forbidden\)/);
});

test("writes go one at a time; a later write on the same cell is not undone by an earlier failure", async () => {
  const { fah } = seed();
  const first = deferred();
  const second = deferred();
  m.markAttendanceAction.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  render(<AttendanceBoard roundId={ROUND_ID} now={DAY4_LIVE} />);
  await screen.findByRole("table");
  fireEvent.click(cell("ฟ้า", 2)); // present (in flight)
  fireEvent.click(cell("ฟ้า", 2)); // makeup (queued)
  expect(m.markAttendanceAction).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status")).toHaveTextContent("กำลังบันทึก");
  await act(async () => first.resolve({ ok: false, error: { code: "retryable", category: "retryable" } }));
  expect(cell("ฟ้า", 2)).toHaveAccessibleName("ฟ้า วันที่ 2: ชดเชย");
  expect(m.markAttendanceAction).toHaveBeenCalledTimes(2);
  expect(m.markAttendanceAction).toHaveBeenLastCalledWith(ROUND_ID, 2, [{ entry_id: fah.entry_id, status: "makeup" }]);
  await act(async () => second.resolve({ ok: true, data: {} }));
  expect(cell("ฟ้า", 2)).toHaveAccessibleName("ฟ้า วันที่ 2: ชดเชย");
});

test("มาครบ marks every unmarked student present for that day in one write; marked cells stay", async () => {
  const { fah, ton } = seed();
  m.markAttendanceAction.mockResolvedValue({ ok: true, data: {} });
  render(<AttendanceBoard roundId={ROUND_ID} now={DAY4_LIVE} />);
  await screen.findByRole("table");
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "มาครบ วันที่ 1" }));
  });
  expect(m.markAttendanceAction).toHaveBeenCalledWith(ROUND_ID, 1, [{ entry_id: fah.entry_id, status: "present" }]);
  expect(cell("ฟ้า", 1)).toHaveAccessibleName("ฟ้า วันที่ 1: มา");
  expect(cell("มิว", 1)).toHaveAccessibleName("มิว วันที่ 1: ขาด");
  expect(screen.getByRole("button", { name: "มาครบ วันที่ 1" })).toBeDisabled();

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "มาครบ วันที่ 4" }));
  });
  expect(m.markAttendanceAction).toHaveBeenLastCalledWith(
    ROUND_ID,
    4,
    expect.arrayContaining([
      { entry_id: fah.entry_id, status: "present" },
      { entry_id: ton.entry_id, status: "present" },
    ]),
  );
  expect(within(screen.getByRole("table")).getAllByText("มา 3 · ชดเชย 0 · ขาด 0")).toHaveLength(1);
});

test("a round without session days says so", async () => {
  seed();
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [makeShiftRound({ session_days: [] })] });
  render(<AttendanceBoard roundId={ROUND_ID} now={DAY4_LIVE} />);
  expect(await screen.findByText("รอบนี้ไม่มีเซสชัน")).toBeInTheDocument();
});
