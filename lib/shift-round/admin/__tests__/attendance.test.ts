import { at, makeShiftRound, makeStepsRow } from "@/components/admin/shift-rounds/__fixtures__/rounds";

import {
  allPresentWrites,
  cellKey,
  marksFromRows,
  nextAttendance,
  sessionColumns,
  tallyDay,
} from "../attendance";

test("a cell cycles unset -> present -> makeup -> absent -> unset", () => {
  const seen: (string | null)[] = [null];
  let mark = nextAttendance(null);
  while (mark !== null) {
    seen.push(mark);
    mark = nextAttendance(mark);
  }
  expect(seen).toEqual([null, "present", "makeup", "absent"]);
});

test("session columns follow the round's session days with Bangkok phases", () => {
  const round = makeShiftRound();
  expect(sessionColumns(round, at(4, "19:30"))).toEqual([
    { day: 1, date: "2026-10-14", phase: "done" },
    { day: 2, date: "2026-10-15", phase: "done" },
    { day: 4, date: "2026-10-17", phase: "live" },
    { day: 6, date: "2026-10-19", phase: "upcoming" },
    { day: 7, date: "2026-10-20", phase: "upcoming" },
  ]);
  expect(sessionColumns(makeShiftRound({ session_days: [3, 1] }), at(1, "21:00")).map((c) => [c.day, c.phase])).toEqual([
    [1, "done"],
    [3, "upcoming"],
  ]);
});

test("marks come from the steps rows; mark all present only fills unmarked students", () => {
  const a = makeStepsRow({}, [{ day: 1, status: "absent" }]);
  const b = makeStepsRow({}, [{ day: 1, status: "present" }, { day: 2, status: "makeup" }]);
  const c = makeStepsRow();
  const marks = marksFromRows([a, b, c]);
  expect(marks).toEqual({
    [cellKey(a.entry_id, 1)]: "absent",
    [cellKey(b.entry_id, 1)]: "present",
    [cellKey(b.entry_id, 2)]: "makeup",
  });
  const ids = [a.entry_id, b.entry_id, c.entry_id];
  expect(allPresentWrites(ids, 1, marks)).toEqual([{ entry_id: c.entry_id, status: "present" }]);
  expect(allPresentWrites(ids, 2, marks).map((w) => w.entry_id)).toEqual([a.entry_id, c.entry_id]);
  expect(tallyDay(ids, 1, marks)).toEqual({ present: 1, makeup: 0, absent: 1, unset: 1 });
});
