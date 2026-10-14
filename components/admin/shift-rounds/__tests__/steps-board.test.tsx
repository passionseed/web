import { act, fireEvent, render, screen, within } from "@testing-library/react";

import * as actions from "@/app/admin/shift/rounds/actions";
import { RoundDashboard } from "../RoundDashboard";
import { StepsBoard } from "../StepsBoard";
import { ROUND_ID, at, makeCounts, makeShiftRound, makeStepsRow } from "../__fixtures__/rounds";

jest.mock("@/app/admin/shift/rounds/actions", () => ({
  listRoundsAction: jest.fn(),
  dashboardAction: jest.fn(),
  roundStepsAction: jest.fn(),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const m = actions as jest.Mocked<typeof actions>;
const round = makeShiftRound();

// Day 3 of SHIFT[2] (Fri 16 Oct, 10:00 Bangkok): the sessions of days 1 and 2 are done.
const DAY3 = at(3, "10:00");
const onTrack = { daily: { days: 2, need: 7, today_logged: false }, sessions: { attended: 2, held: 2, total: 5 } };
const allMissions = { ideas: 1, interviews: 3, problem: 1, prototype: 1, testers: 3, change: 1, demo: 1 };

function seed() {
  const fine = makeStepsRow({
    handle: "ฟ้า",
    squad_id: "s1",
    squad_name: "Squad 1",
    last_log_at: at(2, "21:30").toISOString(),
    counts: makeCounts({ ideas: 1, interviews: 2, problem: 1 }, onTrack),
  });
  const quiet = makeStepsRow({
    handle: "ต้น",
    display_name: "Ton Realname",
    squad_id: "s2",
    squad_name: "Squad 2",
    last_log_at: null,
    counts: makeCounts({}, { daily: { days: 0, need: 7, today_logged: false }, sessions: { attended: 1, held: 2, total: 5 } }),
  });
  const noPeople = makeStepsRow({
    handle: "มิว",
    squad_id: "s1",
    squad_name: "Squad 1",
    last_log_at: at(2, "20:00").toISOString(),
    counts: makeCounts({ ideas: 1 }, onTrack),
  });
  m.roundStepsAction.mockResolvedValue({ ok: true, data: { rows: [fine, quiet, noPeople] } });
  return { fine, quiet, noPeople };
}

async function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

test("ต้องดูแล lists the automated mentor checks on day 3, riskiest first", async () => {
  seed();
  render(<StepsBoard roundId={ROUND_ID} round={round} now={DAY3} />);
  const list = await screen.findByRole("list", { name: "นักเรียนที่ต้องดูแล" });
  const items = within(list).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent("ต้น");
  expect(within(items[0]).getByText("ยังไม่เลือกไอเดีย")).toBeInTheDocument();
  expect(within(items[0]).getByText("ยังไม่มีหลักฐานคุยกับคน")).toBeInTheDocument();
  expect(within(items[0]).getByText("เงียบ 2 วัน")).toBeInTheDocument();
  expect(items[1]).toHaveTextContent("มิว");
  expect(within(items[1]).getByText("ยังไม่มีหลักฐานคุยกับคน")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "ต้องดูแล (2)" })).toBeInTheDocument();
});

test("9 ขั้น table: one row per student by risk; step 8 days/need, step 9 attended/held", async () => {
  const { quiet } = seed();
  render(<StepsBoard roundId={ROUND_ID} round={round} now={DAY3} />);
  const table = within(await screen.findByRole("region", { name: "9 ขั้น" })).getByRole("table");
  const rows = within(table).getAllByRole("row").slice(1);
  expect(rows.map((r) => r.getAttribute("aria-label"))).toEqual(["ต้น", "มิว", "ฟ้า"]);

  const fine = within(table).getByRole("row", { name: "ฟ้า" });
  expect(within(fine).getByText("2/3")).toBeInTheDocument(); // step 2, interviews
  expect(within(fine).getByText("2/7")).toBeInTheDocument(); // step 8, days with a log
  expect(within(fine).getByText("2/2")).toBeInTheDocument(); // step 9, attended/held
  expect(within(fine).getByText("2/9")).toBeInTheDocument(); // steps done

  const ton = within(table).getByRole("row", { name: "ต้น" });
  expect(within(ton).getByText("1/2")).toBeInTheDocument();
  expect(within(ton).getByText("ขั้น 9 1/2 ตามไม่ทัน")).toBeInTheDocument();
  expect(within(ton).getByRole("link", { name: "ต้น" })).toHaveAttribute(
    "href",
    `/admin/shift/rounds/${ROUND_ID}/entrants/${quiet.entry_id}`,
  );
  // Legend names every step, missions first then the two habits.
  const legend = within(screen.getByRole("list", { name: "ขั้นทั้งหมด" })).getAllByRole("listitem");
  expect(legend.map((li) => li.textContent)).toEqual([
    "1 · คิด 3 ไอเดีย แล้วเลือก 1",
    "2 · คุยกับคนที่เจอปัญหาจริง",
    "3 · 1 ปัญหา 1 กลุ่มคนใช้",
    "4 · สร้างต้นแบบที่คนอื่นลองได้",
    "5 · ให้คนนอกลองใช้",
    "6 · ปรับจากที่คนลองบอก",
    "7 · นำเสนอเดโม",
    "8 · โพสต์ความคืบหน้าทุกวัน",
    "9 · เข้าเซสชันทุกครั้ง",
  ]);
});

test("squad filter narrows both lists", async () => {
  seed();
  render(<StepsBoard roundId={ROUND_ID} round={round} now={DAY3} />);
  await screen.findByRole("list", { name: "นักเรียนที่ต้องดูแล" });
  fireEvent.change(screen.getByLabelText("กรองตามสควอด"), { target: { value: "s1" } });
  const table = within(screen.getByRole("region", { name: "9 ขั้น" })).getByRole("table");
  expect(within(table).getAllByRole("row").slice(1).map((r) => r.getAttribute("aria-label"))).toEqual(["มิว", "ฟ้า"]);
  expect(screen.getByRole("region", { name: "ต้องดูแล (1)" })).toBeInTheDocument();
});

test("CSV export has handles only (no display names)", async () => {
  seed();
  const captured: { blob?: Blob } = {};
  const createObjectURL = jest.fn((b: Blob) => {
    captured.blob = b;
    return "blob:steps";
  });
  Object.assign(URL, { createObjectURL, revokeObjectURL: jest.fn() });
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<StepsBoard roundId={ROUND_ID} round={round} now={DAY3} />);
  expect((await screen.findAllByText("Ton Realname")).length).toBeGreaterThan(0); // staff see it on screen
  fireEvent.click(screen.getByRole("button", { name: /ดาวน์โหลด CSV/ }));
  expect(click).toHaveBeenCalled();
  const text = await readBlob(captured.blob as Blob);
  expect(text).toContain("handle,squad,step_1_ideas");
  expect(text).toContain("ต้น,Squad 2,");
  expect(text).not.toContain("Ton Realname");
  expect(text).not.toContain("99999999-"); // no entry or user ids
  click.mockRestore();
});

test("after close: the full checklist per student replaces ต้องดูแล", async () => {
  const done = makeStepsRow({
    handle: "ครบ",
    counts: makeCounts(allMissions, { daily: { days: 7, need: 7, today_logged: false }, sessions: { attended: 5, held: 5, total: 5 } }),
  });
  const short = makeStepsRow({
    handle: "ขาด",
    counts: makeCounts(allMissions, { daily: { days: 6, need: 7, today_logged: false }, sessions: { attended: 4, held: 5, total: 5 } }),
  });
  m.roundStepsAction.mockResolvedValue({ ok: true, data: { rows: [done, short] } });
  render(<StepsBoard roundId={ROUND_ID} round={round} now={at(8, "10:00")} />);
  const checklist = await screen.findByRole("region", { name: "เช็กลิสต์ 9 ขั้น หลังปิดรอบ" });
  expect(within(checklist).getByText("ครบทุกขั้น 1 จาก 2 คน")).toBeInTheDocument();
  expect(within(checklist).getByText("ขาดขั้น 8, 9")).toBeInTheDocument();
  expect(within(checklist).getByText("ครบทุกขั้น")).toBeInTheDocument();
  expect(within(checklist).getAllByLabelText("ขั้น 8 ไม่ครบ")).toHaveLength(1);
  expect(screen.queryByRole("region", { name: /ต้องดูแล/ })).not.toBeInTheDocument();
});

test("before day 1 nothing is flagged yet", async () => {
  seed();
  render(<StepsBoard roundId={ROUND_ID} round={round} now={new Date("2026-10-13T10:00:00Z")} />);
  expect(await screen.findByText("รอบยังไม่เริ่ม เช็กจะเริ่มเองตั้งแต่วันแรก")).toBeInTheDocument();
});

test("a steps RPC failure shows its code and retries without breaking the dashboard", async () => {
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [round] });
  m.dashboardAction.mockResolvedValue({ ok: true, data: { entrants_total: 3 } });
  seed();
  m.roundStepsAction.mockResolvedValueOnce({ ok: false, error: { code: "unavailable", category: "unavailable" } });
  render(<RoundDashboard roundId={ROUND_ID} now={DAY3} />);
  expect(await screen.findByText(/\(unavailable\)/)).toBeInTheDocument();
  expect(await screen.findByText("Entrants", { selector: "dt" })).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
  });
  expect(await screen.findByRole("region", { name: "ต้องดูแล (2)" })).toBeInTheDocument();
});
