/** @jest-environment node */
import {
  addLogLine,
  applyEdits,
  renderEvent,
  setUpdated,
  upsertNumber,
  upsertRoundRow,
} from "./render";
import { parseBrainEvent, type StoredBrainEvent } from "./schema";

const TODAY = "2026-10-21";
const ID = "12345678-1234-4234-8234-123456789012";

const LOG = `---
title: Product log
updated: 2026-10-20
---

# Product log

## Format

    ## YYYY-MM

    - YYYY-MM-DD · [PR title](PR url): one-line summary

## Log

No entries yet.
`;

const SHIFT = `---
title: Shift
updated: 2026-10-14
---

# Shift

Intro.

## Open questions

- One.
`;

const NUMBERS = `---
title: Key numbers
updated: 2026-10-20
---

# Key numbers

| Number | Value | Source | As of |
|---|---|---|---|
| Shifts done | 2 | Told by a person, 2026-09-30 | 2026-09-30 |
| shift[2] price per person | ฿690 | Website | 2026-10-10 |

## Community membership proposal

| Number | Value | Source | As of |
|---|---|---|---|
| Other | 1 | x | 2026-10-20 |
`;

function stored(event: unknown, id = ID, created_at = "2026-10-21T03:00:00Z"): StoredBrainEvent {
  const parsed = parseBrainEvent(event);
  if (!parsed) throw new Error("invalid test event");
  return { ...parsed, id, created_at };
}

describe("schema", () => {
  it("strips fields outside the allowlist", () => {
    const parsed = parseBrainEvent({
      type: "shift_round_published",
      payload: { round: 3, student_name: "Somchai", email: "a@b.co" },
    });
    expect(parsed).toEqual({ type: "shift_round_published", payload: { round: 3 } });
  });

  it("rejects unknown types and bad labels", () => {
    expect(parseBrainEvent({ type: "student_joined", payload: {} })).toBeNull();
    expect(
      parseBrainEvent({ type: "shift_camp_cohort_created", payload: { name: "a@b.co" } }),
    ).toBeNull();
  });
});

describe("setUpdated", () => {
  it("replaces only the front-matter date", () => {
    const out = setUpdated(SHIFT, TODAY);
    expect(out).toContain(`updated: ${TODAY}`);
    expect(out).not.toContain("2026-10-14");
  });
});

describe("addLogLine", () => {
  it("replaces the empty marker with a month heading and entry", () => {
    const out = addLogLine(LOG, "2026-10-21", "shift[3] round published", ID);
    expect(out).not.toContain("No entries yet.");
    expect(out).toContain(`## Log\n\n## 2026-10\n\n- 2026-10-21 · shift[3] round published (event \`${ID}\`)\n`);
  });

  it("puts newer entries first under an existing month", () => {
    const first = addLogLine(LOG, "2026-10-21", "first", ID);
    const second = addLogLine(first, "2026-10-22", "second", "other-id");
    expect(second.indexOf("second")).toBeLessThan(second.indexOf("first"));
    expect(second.match(/## 2026-10/g)).toHaveLength(1);
  });

  it("adds a new month above older months", () => {
    const sept = addLogLine(LOG, "2026-09-30", "old", ID);
    const out = addLogLine(sept, "2026-10-01", "new", "other-id");
    expect(out.indexOf("## 2026-10")).toBeLessThan(out.indexOf("## 2026-09"));
  });

  it("is idempotent per event", () => {
    const once = addLogLine(LOG, "2026-10-21", "x", ID);
    expect(addLogLine(once, "2026-10-21", "x", ID)).toBe(once);
  });
});

describe("upsertRoundRow", () => {
  it("creates the section before Open questions and keeps unknowns as (fill in)", () => {
    const out = upsertRoundRow(SHIFT, "shift[3]", { status: "Draft" }, "src", TODAY);
    expect(out.indexOf("## Rounds in the web app")).toBeLessThan(out.indexOf("## Open questions"));
    expect(out).toContain("| shift[3] | Draft | (fill in) | (fill in) | (fill in) | src | 2026-10-21 |");
  });

  it("merges later facts into the same row", () => {
    const first = upsertRoundRow(SHIFT, "shift[3]", { status: "Draft", starts_on: "2026-11-01", days: 7 }, "a", TODAY);
    const out = upsertRoundRow(first, "shift[3]", { status: "Published, open to join" }, "b", "2026-10-22");
    expect(out).toContain("| shift[3] | Published, open to join | 2026-11-01 | 7 | (fill in) | b | 2026-10-22 |");
    expect(out.match(/\| shift\[3\] \|/g)).toHaveLength(1);
  });
});

describe("upsertNumber", () => {
  it("updates an existing row in the main table", () => {
    const out = upsertNumber(NUMBERS, "shift[2] price per person", "฿750", "admin", TODAY);
    expect(out).toContain("| shift[2] price per person | ฿750 | admin | 2026-10-21 |");
    expect(out).not.toContain("฿690");
  });

  it("appends new rows to the main table, not the later ones", () => {
    const out = upsertNumber(NUMBERS, "shift[3] entrants", "18", "admin", TODAY);
    expect(out.indexOf("| shift[3] entrants |")).toBeLessThan(out.indexOf("## Community"));
    expect(out.indexOf("| shift[3] entrants |")).toBeGreaterThan(out.indexOf("| shift[2] price"));
  });
});

describe("renderEvent", () => {
  const pages: Record<string, string> = {
    "product-log.md": LOG,
    "shift.md": SHIFT,
    "numbers.md": NUMBERS,
  };
  const run = (event: StoredBrainEvent) => {
    const { summary, edits } = renderEvent(event, TODAY);
    const out: Record<string, string> = {};
    for (const path of new Set(edits.map((e) => e.path))) {
      out[path] = applyEdits(pages[path] ?? "", path, edits.filter((e) => e.path === path), TODAY);
    }
    return { summary, out };
  };

  it("renders a created round into the log and shift.md", () => {
    const { summary, out } = run(
      stored({
        type: "shift_round_created",
        payload: { round: 3, starts_on: "2026-11-01", duration_days: 7, status: "draft" },
      }),
    );
    expect(summary).toBe("shift[3] round created in the web app, starts 2026-11-01, 7 days");
    expect(out["product-log.md"]).toContain(`- 2026-10-21 · ${summary} (event \`${ID}\`)`);
    expect(out["product-log.md"]).toContain(`updated: ${TODAY}`);
    expect(out["shift.md"]).toContain("| shift[3] | Draft | 2026-11-01 | 7 | (fill in) | passionseed.org admin, event 12345678 | 2026-10-21 |");
    expect(out["shift.md"]).toContain(`updated: ${TODAY}`);
    expect(out["numbers.md"]).toBeUndefined();
  });

  it("keeps prices and counts in numbers.md only", () => {
    const price = run(stored({ type: "shift_price_changed", payload: { round: 3, price_thb: 1500 } }));
    expect(price.out["numbers.md"]).toContain("| shift[3] price per person | ฿1,500 | passionseed.org admin, event 12345678 | 2026-10-21 |");
    expect(price.out["shift.md"]).toBeUndefined();

    const count = run(
      stored({ type: "program_count_snapshot", payload: { program: "shift", round: 3, metric: "entrants", value: 18 } }),
    );
    expect(count.out["numbers.md"]).toContain("| shift[3] entrants | 18 |");
    expect(count.summary).toBe("shift[3] entrants: 18 (total)");
  });

  it("dates log lines in Bangkok time", () => {
    const { out } = run(stored({ type: "shift_round_published", payload: { round: 3 } }, ID, "2026-10-21T20:00:00Z"));
    expect(out["product-log.md"]).toContain("- 2026-10-22 · shift[3] round published");
  });

  it("seeds a missing page with a header", () => {
    const { edits } = renderEvent(stored({ type: "shift_round_finished", payload: { round: 2 } }), TODAY);
    const log = applyEdits("", "product-log.md", edits.filter((e) => e.path === "product-log.md"), TODAY);
    expect(log.startsWith(`---\ntitle: Product log\nupdated: ${TODAY}\n---`)).toBe(true);
    expect(log).toContain("- 2026-10-21 · shift[2] round archived in the web app");
  });

  it("never writes em dashes", () => {
    const events = [
      stored({ type: "shift_round_created", payload: { round: 3 } }),
      stored({ type: "shift_round_dates_changed", payload: { round: 3, closes_on: "2026-11-09" } }),
      stored({ type: "shift_camp_cohort_created", payload: { name: "SHIFT[3]" } }),
      stored({ type: "shift_registration_opened", payload: { round: 3 } }),
    ];
    for (const event of events) {
      for (const page of Object.values(run(event).out)) expect(page).not.toContain("—");
    }
  });
});
