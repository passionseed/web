/**
 * @jest-environment node
 *
 * Missions on the certificate come from the snapshot: any count, titles from
 * the snapshot (round config) or the known-key copy (v2 spec 3).
 */
import { buildCertificateContent, certificateMissions } from "../content";
import { FIXTURE_PUBLIC_ID, FIXTURE_SNAPSHOTS } from "../fixtures";
import { missionTitle } from "../missions";
import { LAYOUTS } from "../layout";
import { missionGrid } from "../render";
import { snapshotV1Schema } from "../types";

const BASE = "https://www.passionseed.org";

test("SHIFT default: 7 missions in config order with TH and EN titles, all done", () => {
  const missions = certificateMissions(FIXTURE_SNAPSHOTS.handle);
  expect(missions.map((m) => m.key)).toEqual(["ideas", "interviews", "problem", "prototype", "testers", "change", "demo"]);
  expect(missions.every((m) => m.done)).toBe(true);
  expect(missions[0].label).toEqual({ th: "คิด 3 ไอเดีย แล้วเลือก 1", en: "Three ideas, pick one" });
  expect(missions[6].label).toEqual({ th: "นำเสนอเดโม", en: "Present the demo" });
});

test("a 10-mission round: snapshot titles win, known keys use the copy, unknown keys their own title", () => {
  const missions = certificateMissions(FIXTURE_SNAPSHOTS.ten_missions);
  expect(missions).toHaveLength(10);
  expect(missions[0].label.th).toBe("คิด 3 ไอเดีย แล้วเลือก 1");
  expect(missions[1].label).toEqual({ th: "สัมภาษณ์คนที่เจอปัญหา 5 คน", en: "Interview 5 people who have the problem" });
  expect(missions[3].label).toEqual({ th: "แบบสอบถามจากผู้ใช้ 20 คน", en: "Survey 20 users" });
  // Only a Thai title: English falls back to it (the page then shows it once).
  expect(missions[8].label.en).toBe(missions[8].label.th);
  // Long config titles are capped at a word boundary.
  expect(missions[8].label.th.endsWith("…")).toBe(true);
  const content = buildCertificateContent(FIXTURE_SNAPSHOTS.ten_missions, FIXTURE_PUBLIC_ID, BASE);
  expect(content.statement.en).toContain("completed all 10 Missions of SHIFT[7]");
  expect(content.statement.th).toContain("ทำภารกิจครบทั้ง 10 ใน SHIFT[7]");
});

test("first-beta snapshots keep their six titles", () => {
  const missions = certificateMissions(FIXTURE_SNAPSHOTS.legacy_six);
  expect(missions.map((m) => m.label.en)).toEqual([
    "First contact",
    "Interviews + problem",
    "Build an MVP",
    "Outside testers try it",
    "Change from what testers said",
    "Post your demo",
  ]);
});

test("unknown keys without titles read as words; a mission marked incomplete shows unchecked", () => {
  expect(missionTitle({ key: "pitch_night" })).toEqual({ th: "Pitch night", en: "Pitch night" });
  const missions = certificateMissions({ missions: [{ key: "ideas", complete: false }, "demo"] });
  expect(missions.map((m) => m.done)).toEqual([false, true]);
});

test("statement wording follows the count", () => {
  const one = buildCertificateContent({ ...FIXTURE_SNAPSHOTS.handle, missions: ["demo"] }, FIXTURE_PUBLIC_ID, BASE);
  expect(one.statement.en).toBe(
    "This certificate records that ต้น completed the Mission of SHIFT[4] (10 – 23 Nov 2026) with Passion Seed"
  );
  expect(one.roundTag).toEqual({ th: "SHIFT[4]", en: "SHIFT[4]" });
});

test("the snapshot schema takes keys or objects and rejects junk", () => {
  expect(snapshotV1Schema.safeParse(FIXTURE_SNAPSHOTS.ten_missions).success).toBe(true);
  expect(snapshotV1Schema.safeParse({ ...FIXTURE_SNAPSHOTS.handle, missions: [{ key: 7 }] }).success).toBe(false);
  expect(
    snapshotV1Schema.safeParse({ ...FIXTURE_SNAPSHOTS.handle, missions: Array.from({ length: 21 }, () => "ideas") }).success
  ).toBe(false);
});

test("mission grid: rows shrink to keep the statement's room; long lists go to 3 columns on the square", () => {
  // Room left between the header block and the statement for a typical certificate.
  expect(missionGrid(LAYOUTS.story, 7, 604)).toMatchObject({ columns: 1, rows: 7, rowHeight: 56, scale: 1 });
  expect(missionGrid(LAYOUTS.story, 10, 604)).toMatchObject({ columns: 1, rows: 10, rowHeight: 44 });
  expect(missionGrid(LAYOUTS.square, 6, 293)).toMatchObject({ columns: 2, rows: 3, rowHeight: 54, scale: 1 });
  expect(missionGrid(LAYOUTS.square, 7, 293)).toMatchObject({ columns: 2, rows: 4, rowHeight: 43 });
  expect(missionGrid(LAYOUTS.square, 10, 293)).toMatchObject({ columns: 3, rows: 4, rowHeight: 43 });
  // Never below the minimum row, even with no room.
  expect(missionGrid(LAYOUTS.square, 10, 0).rowHeight).toBe(LAYOUTS.square.missionRowMin);
});
