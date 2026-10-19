import { SHIFT2_DEFAULT_DOC } from "@/lib/content/shift2-curriculum";

import {
  curriculumOptions,
  pickCurriculumKey,
  prepareCurriculumCopy,
  roundForKey,
} from "../curriculum";

const rows = [
  { key: "default", updated_at: "2026-10-14T00:00:00Z" },
  { key: "2", updated_at: "2026-10-13T00:00:00Z" },
  { key: "1", updated_at: "2026-10-01T00:00:00Z" },
];
const rounds = [
  { number: 3, curriculum_key: "3", starts_at: "2026-10-20T17:00:00Z", duration_days: 7, session_days: [1, 3, 5], session_start: "18:30:00", session_end: "20:30:00" },
  { number: 2, curriculum_key: "2", starts_at: "2026-10-13T17:00:00Z" },
  { number: 1, curriculum_key: null },
];

test("options: keys of rounds (newest first), then other rows by number, default last", () => {
  const options = curriculumOptions(rows, rounds);
  expect(options.map((o) => [o.key, o.label, o.hasRow])).toEqual([
    ["3", "SHIFT[3]", false],
    ["2", "SHIFT[2]", true],
    ["1", "SHIFT[1]", true],
    ["default", "แม่แบบ (default)", true],
  ]);
});

test("a key shared by rounds, or named differently, shows the round names", () => {
  const options = curriculumOptions([{ key: "spring" }], [
    { number: 5, curriculum_key: "spring" },
    { number: 4, curriculum_key: "spring" },
  ]);
  expect(options).toEqual([{ key: "spring", label: "SHIFT[5], SHIFT[4] · spring", hasRow: true, rounds: [5, 4] }]);
});

test("pick: the asked key when valid (even without a row), else the latest round's", () => {
  const options = curriculumOptions(rows, rounds);
  expect(pickCurriculumKey(undefined, options)).toBe("3");
  expect(pickCurriculumKey("2", options)).toBe("2");
  expect(pickCurriculumKey("9", options)).toBe("9");
  expect(pickCurriculumKey(["1", "2"], options)).toBe("1");
  expect(pickCurriculumKey("../etc", options)).toBe("3");
  expect(pickCurriculumKey(undefined, curriculumOptions([{ key: "default" }], []))).toBe("default");
  expect(pickCurriculumKey(undefined, [])).toBe("default");
});

test("copy for a round: re-dated from its day 1, its session days and time; nothing else changes", () => {
  const target = roundForKey("3", rounds);
  const copy = prepareCurriculumCopy(SHIFT2_DEFAULT_DOC, target);
  expect(copy.days.map((d) => [d.day, d.date, d.mentorSession])).toEqual([
    [1, "2026-10-21", true],
    [2, "2026-10-22", false],
    [3, "2026-10-23", true],
    [4, "2026-10-24", false],
    [5, "2026-10-25", true],
    [6, "2026-10-26", false],
    [7, "2026-10-27", false],
  ]);
  expect(copy.sessionTime).toBe("18:30–20:30");
  expect(copy.days[0].mission).toBe(SHIFT2_DEFAULT_DOC.days[0].mission);
  expect(copy.interview).toEqual(SHIFT2_DEFAULT_DOC.interview);
  // The source is never mutated.
  expect(SHIFT2_DEFAULT_DOC.days[0].date).toBe("2026-10-14");
  expect(prepareCurriculumCopy(SHIFT2_DEFAULT_DOC, null)).toEqual(SHIFT2_DEFAULT_DOC);
});

test("copy drops days past a shorter round", () => {
  const copy = prepareCurriculumCopy(SHIFT2_DEFAULT_DOC, { number: 9, curriculum_key: "9", duration_days: 5 });
  expect(copy.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5]);
});
