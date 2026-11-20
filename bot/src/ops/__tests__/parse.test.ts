/**
 * @jest-environment node
 *
 * The seed parser (bot/src/ops/parse.ts) reads operation pages. Every page
 * here is made up: the real pages are private and never enter this repo.
 */
import { parseDeadline, parseFolder, parseOperation, plainText, readmeOrder } from "../parse";

const PAGE = `---
title: Venue booking
updated: 2026-11-20
---

# Venue booking

Intro line with a [link](other.md).

| | |
|---|---|
| Goal | A room for **forty** people |
| Done when | Contract signed by Fri 4 Dec |
| Owner | (fill in) |
| Deadline | Sat 28 Nov (deposit); Fri 4 Dec (contract) |
| Status | Two rooms shortlisted, see [notes](notes.md) |

## Steps

- [ ] Ask three venues for a quote
- [x] Check the fire exits
- [ ] Pay the deposit ([budget](../budget.md#venue))
  - [ ] a nested note that is not a step
* [X] Confirm the date

## Open questions

- [ ] Not a step: this list is under another heading
`;

describe("plainText", () => {
  it("keeps link text and drops emphasis", () => {
    expect(plainText("See [the plan](a.md#x) and **bold** `code`")).toBe("See the plan and bold code");
  });
});

describe("parseDeadline", () => {
  const ref = { year: 2026, month: 11 };

  it("takes the first date in the text", () => {
    expect(parseDeadline("Sat 28 Nov (deposit); Fri 4 Dec (contract)", ref)).toBe("2026-11-28");
    expect(parseDeadline("Tue 15 Dec (end); Mon 14 Dec", ref)).toBe("2026-12-15");
  });

  it("reads ISO dates and full month names", () => {
    expect(parseDeadline("by 2026-12-19 at noon", ref)).toBe("2026-12-19");
    expect(parseDeadline("17 December", ref)).toBe("2026-12-17");
    expect(parseDeadline("1 Jan 2028", ref)).toBe("2028-01-01");
  });

  it("rolls a month far before the page's month into the next year", () => {
    expect(parseDeadline("Fri 8 Jan", ref)).toBe("2027-01-08");
    expect(parseDeadline("Tue 1 Sep", ref)).toBe("2026-09-01");
  });

  it("returns null when there is no real date", () => {
    expect(parseDeadline("after the event", ref)).toBeNull();
    expect(parseDeadline("31 Feb", ref)).toBeNull();
    expect(parseDeadline(null, ref)).toBeNull();
  });
});

describe("parseOperation", () => {
  it("reads the field table and the steps", () => {
    const op = parseOperation("venue-booking.md", PAGE, { position: 3 });
    expect(op).toEqual({
      slug: "venue-booking",
      title: "Venue booking",
      goal: "A room for forty people",
      done_when: "Contract signed by Fri 4 Dec",
      owner: null,
      deadline_text: "Sat 28 Nov (deposit); Fri 4 Dec (contract)",
      deadline_on: "2026-11-28",
      status: "Two rooms shortlisted, see notes",
      position: 3,
      steps: [
        { text: "Ask three venues for a quote", done: false },
        { text: "Check the fire exits", done: true },
        { text: "Pay the deposit (budget)", done: false },
        { text: "Confirm the date", done: true },
      ],
    });
  });

  it("falls back to the first heading for the title, and keeps a named owner", () => {
    const op = parseOperation("snacks.md", "# Snack run\n\n| | |\n|---|---|\n| Owner | Pat |\n| Status | Done |\n");
    expect(op?.title).toBe("Snack run");
    expect(op?.owner).toBe("Pat");
    expect(op?.steps).toEqual([]);
  });

  it("skips a page that is not an operation", () => {
    expect(parseOperation("notes.md", "# Notes\n\nJust text.\n")).toBeNull();
  });

  it("refuses a file name that cannot be a slug", () => {
    expect(() => parseOperation("Bad Name.md", PAGE)).toThrow(/file name/);
  });

  it("caps long text at the database limits", () => {
    const long = "x".repeat(700);
    const op = parseOperation("long.md", `# Long\n\n| | |\n|---|---|\n| Status | ${long} |\n\n## Steps\n\n- [ ] ${long}\n`);
    expect(op?.status).toHaveLength(300);
    expect(op?.steps[0].text).toHaveLength(500);
  });
});

describe("parseFolder", () => {
  const files = {
    "README.md": "| Op |\n|---|\n| [Snack run](snacks.md) |\n| [Venue booking](./venue-booking.md#top) |\n| [Snack run again](snacks.md) |\n",
    "venue-booking.md": PAGE,
    "snacks.md": "# Snack run\n\n## Steps\n\n- [ ] Buy fruit\n",
    "zebra.md": "# Zebra crossing\n\n## Steps\n\n- [ ] Paint it\n",
    "archive.md": "# Archive\n\nNothing here.\n",
  };

  it("orders pages as the README links them, then the rest by name, and never seeds the README", () => {
    expect(readmeOrder(files["README.md"])).toEqual(["snacks.md", "venue-booking.md"]);
    const ops = parseFolder(files);
    expect(ops.map((op) => [op.slug, op.position])).toEqual([
      ["snacks", 1],
      ["venue-booking", 2],
      ["zebra", 3],
    ]);
  });

  it("uses --year for pages without an updated date", () => {
    const [op] = parseFolder({ "a.md": "# A\n\n| | |\n|---|---|\n| Deadline | Fri 4 Dec |\n" }, { year: 2031 });
    expect(op.deadline_on).toBe("2031-12-04");
  });
});
