/**
 * Card copy has no em or en dashes (spec 7.1, 8.3). Runs the same check as
 * `pnpm radar:dump` over the fixture copies of the four careers.
 *
 * The fixtures were dumped before the content sweep (spec section 9), so they
 * still contain dashes. Slugs in AWAITING_SWEEP run as `it.failing`: the suite
 * stays green while the dashes are there, and turns red the moment a refreshed
 * fixture is clean, as a reminder to remove the slug here so the check is
 * strict from then on.
 */
import { findCardCopyDashes, formatFinding } from "../../../scripts/radar-guide/lib/card-copy";
import { loadRadarFixture, RADAR_FIXTURE_SLUGS, type RadarFixtureSlug } from "../__fixtures__";

/** Remove a slug once its fixture is refreshed with `pnpm radar:dump <slug>` after the sweep. */
const AWAITING_SWEEP: ReadonlySet<RadarFixtureSlug> = new Set<RadarFixtureSlug>([
  "ai-engineer",
  "cybersecurity",
  "data-scientist",
  "software-engineer",
]);

describe("card copy has no dashes", () => {
  for (const slug of RADAR_FIXTURE_SLUGS) {
    const test = AWAITING_SWEEP.has(slug) ? it.failing : it;
    test(`${slug}: no dash in name_th, tagline_th or any visible card's content_th`, () => {
      const findings = findCardCopyDashes(loadRadarFixture(slug)).filter((f) => !f.hidden);
      expect(findings.map(formatFinding)).toEqual([]);
    });
  }
});

describe("findCardCopyDashes", () => {
  const field = {
    name_th: "นักวิทย์ข้อมูล",
    tagline_th: "ข้อมูล — คำตอบ",
    radar_cards: [
      { kind: "salaryProgression", position: 40, is_hidden: false, content_th: { levels: [{ salary: "25k–35k" }] } },
      { kind: "jobs", position: 930, is_hidden: true, content_th: { note: "a — b" } },
      { kind: "cta", position: 140, is_hidden: false, content_th: { url: "https://x.example/a—b", body: "ok" } },
    ],
  };

  it("finds em and en dashes with a readable path", () => {
    const findings = findCardCopyDashes(field);
    expect(findings.map((f) => f.path)).toEqual([
      "tagline_th",
      "cards[40:salaryProgression].content_th.levels.0.salary",
      "cards[930:jobs].content_th.note",
    ]);
    expect(formatFinding(findings[1])).toContain("U+2013");
  });

  it("marks hidden cards so the dump only warns about them", () => {
    const hidden = findCardCopyDashes(field).filter((f) => f.hidden);
    expect(hidden).toHaveLength(1);
    expect(hidden[0].path).toContain("jobs");
  });

  it("skips URLs", () => {
    expect(findCardCopyDashes(field).some((f) => f.path.endsWith(".url"))).toBe(false);
  });
});
