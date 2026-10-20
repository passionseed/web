/** @jest-environment node */
import {
  addLogLine,
  applyEdits,
  renderEvent,
  setUpdated,
  upsertNumber,
  upsertRoundRow,
  upsertSessionRow,
} from "./render";
import { findPii } from "./pii";
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

const ALUMNI = `---
title: Alumni community
updated: 2026-10-20
---

# Alumni community

## Weekly session

- **When:** (fill in)

## Open questions

- Time. (fill in)
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

  it("drops an unsafe session title but keeps the event", () => {
    const parsed = parseBrainEvent({
      type: "alumni_session_created",
      payload: { date: "2026-10-24", title: "Call 081 234 5678 | @someone", host: "Nong A" },
    });
    expect(parsed).toEqual({ type: "alumni_session_created", payload: { date: "2026-10-24" } });
  });

  it("accepts Thai titles and rejects bad times and negative totals", () => {
    expect(
      parseBrainEvent({
        type: "alumni_session_changed",
        payload: { date: "2026-10-24", title: "Icebreak: วาดโปรเจกต์ใน 60 วิ · Build", start_time: "19:00", rsvps: 4 },
      }),
    ).toEqual({
      type: "alumni_session_changed",
      payload: { date: "2026-10-24", title: "Icebreak: วาดโปรเจกต์ใน 60 วิ · Build", start_time: "19:00", rsvps: 4 },
    });
    expect(
      parseBrainEvent({ type: "alumni_session_changed", payload: { date: "2026-10-24", start_time: "7pm" } }),
    ).toBeNull();
    expect(
      parseBrainEvent({ type: "alumni_session_cancelled", payload: { date: "2026-10-24", rsvps: -1 } }),
    ).toBeNull();
  });

  it("keeps hackathon invite events empty", () => {
    expect(
      parseBrainEvent({ type: "hackathon_team_invites_opened", payload: { team: "x", token: "abc" } }),
    ).toEqual({ type: "hackathon_team_invites_opened", payload: {} });
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

describe("upsertSessionRow", () => {
  it("creates the alumni section before Open questions and merges later facts", () => {
    const first = upsertSessionRow(ALUMNI, "2026-10-24", { title: "Build night", status: "Scheduled" }, "a", TODAY);
    expect(first.indexOf("## Sessions in the web app")).toBeLessThan(first.indexOf("## Open questions"));
    expect(first).toContain("| 2026-10-24 | Build night | (fill in) | Scheduled | a | 2026-10-21 |");
    const out = upsertSessionRow(first, "2026-10-24", { status: "Cancelled" }, "b", "2026-10-22");
    expect(out).toContain("| 2026-10-24 | Build night | (fill in) | Cancelled | b | 2026-10-22 |");
    expect(out.match(/\| 2026-10-24 \|/g)).toHaveLength(1);
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
    "alumni.md": ALUMNI,
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

  it("renders hackathon invite toggles into the log only", () => {
    const { summary, out } = run(stored({ type: "hackathon_team_invites_opened", payload: {} }));
    expect(summary).toBe("Hackathon team invite links turned on in the admin");
    expect(Object.keys(out)).toEqual(["product-log.md"]);
    expect(run(stored({ type: "hackathon_team_invites_closed", payload: {} })).summary).toBe(
      "Hackathon team invite links turned off in the admin",
    );
  });

  it("keeps the hackathon gallery total in numbers.md", () => {
    const { summary, out } = run(
      stored({ type: "program_count_snapshot", payload: { program: "hackathon", metric: "gallery_products", value: 12 } }),
    );
    expect(summary).toBe("Hackathon products published in the gallery: 12 (total)");
    expect(out["numbers.md"]).toContain("| Hackathon products published in the gallery | 12 |");
  });

  it("renders the alumni weekly schedule", () => {
    const { summary, out } = run(
      stored({ type: "alumni_schedule_changed", payload: { first_date: "2026-10-17", start_time: "19:00", end_time: "21:00" } }),
    );
    expect(summary).toBe("Alumni weekly session set to every Saturday from 2026-10-17, 19:00 to 21:00");
    expect(out["alumni.md"]).toContain(
      "| Weekly series | Every Saturday from 2026-10-17 | 19:00 to 21:00 | Scheduled | passionseed.org admin, event 12345678 | 2026-10-21 |",
    );
    expect(out["alumni.md"]).toContain(`updated: ${TODAY}`);
    expect(out["product-log.md"]).toContain(summary);
  });

  it("renders an added one-off alumni event", () => {
    const { summary, out } = run(
      stored({ type: "alumni_session_created", payload: { date: "2026-10-28", title: "TCAS talk", start_time: "18:00", end_time: "19:30" } }),
    );
    expect(summary).toBe("Alumni event added on Wednesday 2026-10-28: TCAS talk");
    expect(out["alumni.md"]).toContain("| 2026-10-28 | TCAS talk | 18:00 to 19:30 | One-off event |");
    expect(out["numbers.md"]).toBeUndefined();
  });

  it("keeps alumni RSVP totals in numbers.md, not alumni.md", () => {
    const changed = run(
      stored({ type: "alumni_session_changed", payload: { date: "2026-10-24", title: "Build night", start_time: "19:00", rsvps: 7 } }),
    );
    expect(changed.summary).toBe("Alumni session on Saturday 2026-10-24 updated: Build night, from 19:00");
    expect(changed.out["alumni.md"]).toContain("| 2026-10-24 | Build night | from 19:00 | Scheduled |");
    expect(changed.out["alumni.md"]).not.toContain("| 7 |");
    expect(changed.out["numbers.md"]).toContain("| Alumni session 2026-10-24 RSVPs | 7 |");

    const cancelled = run(stored({ type: "alumni_session_cancelled", payload: { date: "2026-10-24", rsvps: 3 } }));
    expect(cancelled.summary).toBe("Alumni session on Saturday 2026-10-24 cancelled");
    expect(cancelled.out["alumni.md"]).toContain("| 2026-10-24 | (fill in) | (fill in) | Cancelled |");
    expect(cancelled.out["numbers.md"]).toContain("| Alumni session 2026-10-24 RSVPs | 3 |");

    const noCount = run(stored({ type: "alumni_session_cancelled", payload: { date: "2026-10-24" } }));
    expect(noCount.out["numbers.md"]).toBeUndefined();
  });

  it("seeds a missing alumni page with a header", () => {
    const { edits } = renderEvent(stored({ type: "alumni_session_cancelled", payload: { date: "2026-10-24" } }), TODAY);
    const page = applyEdits("", "alumni.md", edits.filter((e) => e.path === "alumni.md"), TODAY);
    expect(page.startsWith(`---\ntitle: Alumni community\nupdated: ${TODAY}\n---`)).toBe(true);
    expect(page).toContain("## Sessions in the web app");
  });

  it("never writes em dashes", () => {
    const events = [
      stored({ type: "shift_round_created", payload: { round: 3 } }),
      stored({ type: "shift_round_dates_changed", payload: { round: 3, closes_on: "2026-11-09" } }),
      stored({ type: "shift_camp_cohort_created", payload: { name: "SHIFT[3]" } }),
      stored({ type: "shift_registration_opened", payload: { round: 3 } }),
      stored({ type: "alumni_schedule_changed", payload: { first_date: "2026-10-17", start_time: "19:00" } }),
      stored({ type: "alumni_session_changed", payload: { date: "2026-10-24", rsvps: 2 } }),
      stored({ type: "hackathon_team_invites_closed", payload: {} }),
    ];
    for (const event of events) {
      for (const page of Object.values(run(event).out)) expect(page).not.toContain("—");
    }
  });

  it("passes the PII guard with dates, times and totals", () => {
    const events = [
      stored({ type: "alumni_schedule_changed", payload: { first_date: "2026-10-17", start_time: "19:00", end_time: "21:00" } }),
      stored({ type: "alumni_session_changed", payload: { date: "2026-10-24", title: "Build night", start_time: "19:00", end_time: "21:00", rsvps: 12 } }),
      stored({ type: "program_count_snapshot", payload: { program: "hackathon", metric: "gallery_products", value: 40 } }),
    ];
    for (const event of events) {
      const { summary, edits } = renderEvent(event, TODAY);
      expect(findPii([summary, ...edits.flatMap((e) => e.text)].join("\n"))).toBeNull();
    }
  });
});
