/**
 * @jest-environment node
 *
 * The ops board's pure rules and embeds (bot/src/ops/model.ts), on made-up
 * operations.
 */
import {
  bangkokDate,
  bangkokMinutes,
  boardEmbed,
  dueEmbed,
  embedSize,
  isDueSoon,
  isOverdue,
  operationChoices,
  resolveOperation,
  resolveStep,
  showEmbed,
  stepChoices,
  worthPosting,
  type OpDetail,
  type OpSummary,
} from "../model";

/** 08:30 Bangkok on 2026-12-08 (01:30 UTC). */
const MORNING = Date.parse("2026-12-08T01:30:00Z");

function op(over: Partial<OpSummary> = {}): OpSummary {
  return {
    slug: "snack-run",
    title: "Snack run",
    owner: null,
    deadline_text: "Wed 9 Dec",
    deadline_on: "2026-12-09",
    status: "Not started",
    steps_done: 0,
    steps_total: 3,
    ...over,
  };
}

function allText(value: unknown): string {
  return JSON.stringify(value);
}

describe("Bangkok time", () => {
  it("turns UTC into the Bangkok day and minute", () => {
    expect(bangkokDate(MORNING)).toBe("2026-12-08");
    expect(bangkokMinutes(MORNING)).toBe(8 * 60 + 30);
    // 18:00 UTC is already the next day in Bangkok.
    expect(bangkokDate(Date.parse("2026-12-08T18:00:00Z"))).toBe("2026-12-09");
  });
});

describe("overdue and due soon", () => {
  it("flags a deadline before today, unless every step is done", () => {
    expect(isOverdue(op({ deadline_on: "2026-12-07" }), MORNING)).toBe(true);
    expect(isOverdue(op({ deadline_on: "2026-12-08" }), MORNING)).toBe(false);
    expect(isOverdue(op({ deadline_on: "2026-12-07", steps_done: 3 }), MORNING)).toBe(false);
    expect(isOverdue(op({ deadline_on: null }), MORNING)).toBe(false);
  });

  it("counts today up to 48 hours ahead as due soon", () => {
    expect(isDueSoon(op({ deadline_on: "2026-12-08" }), MORNING)).toBe(true);
    expect(isDueSoon(op({ deadline_on: "2026-12-10" }), MORNING)).toBe(true);
    expect(isDueSoon(op({ deadline_on: "2026-12-12" }), MORNING)).toBe(false);
    expect(isDueSoon(op({ deadline_on: "2026-12-07" }), MORNING)).toBe(false);
    expect(isDueSoon(op({ deadline_on: "2026-12-09", steps_done: 3 }), MORNING)).toBe(false);
  });

  it("posts only while something is open", () => {
    expect(worthPosting([])).toBe(false);
    expect(worthPosting([op({ steps_done: 3 })])).toBe(false);
    expect(worthPosting([op({ steps_done: 3 }), op({ steps_total: 0 })])).toBe(true);
  });
});

describe("matching input", () => {
  const ops = [op(), op({ slug: "venue", title: "Venue booking" }), op({ slug: "venue-2", title: "Venue cleanup" })];

  it("finds an operation by slug, title, or a unique title start", () => {
    expect(resolveOperation(ops, "venue")?.title).toBe("Venue booking");
    expect(resolveOperation(ops, "  snack RUN ")?.slug).toBe("snack-run");
    expect(resolveOperation(ops, "Venue c")?.slug).toBe("venue-2");
    expect(resolveOperation(ops, "Ven")).toBeNull();
    expect(resolveOperation(ops, "")).toBeNull();
  });

  it("finds a step by number or unique text start", () => {
    const steps = [
      { position: 1, text: "Buy fruit", done: false },
      { position: 2, text: "Buy water", done: true },
    ];
    expect(resolveStep(steps, "2")?.text).toBe("Buy water");
    expect(resolveStep(steps, "buy f")?.position).toBe(1);
    expect(resolveStep(steps, "buy")).toBeNull();
    expect(resolveStep(steps, "9")).toBeNull();
  });

  it("offers at most 25 choices, names at most 100 characters, open steps first", () => {
    const many = Array.from({ length: 30 }, (_, k) => op({ slug: `op-${k}`, title: `Op ${k} ${"y".repeat(120)}` }));
    const choices = operationChoices(many, "");
    expect(choices).toHaveLength(25);
    expect(choices.every((c) => c.name.length <= 100)).toBe(true);
    expect(operationChoices(many, "op-7").map((c) => c.value)).toEqual(["op-7"]);

    const steps = stepChoices(
      [
        { position: 1, text: "Done one", done: true },
        { position: 2, text: "Open one", done: false },
      ],
      ""
    );
    expect(steps).toEqual([
      { name: "2. Open one", value: "2" },
      { name: "✓ 1. Done one", value: "1" },
    ]);
  });
});

describe("embeds", () => {
  it("shows owner, deadline, status and steps, and flags overdue ones", () => {
    const embed = boardEmbed(
      [op({ slug: "late", title: "Late op", deadline_on: "2026-12-06", owner: "Sam" }), op({ steps_done: 3 })],
      MORNING
    );
    expect(embed.fields).toHaveLength(2);
    expect(embed.fields?.[0].name).toBe("🔴 Late op");
    expect(embed.fields?.[0].value).toContain("Owner: Sam");
    expect(embed.fields?.[0].value).toContain("**overdue**");
    expect(embed.fields?.[0].value).toContain("Steps: 0/3");
    expect(embed.fields?.[1].name).toBe("✅ Snack run");
    expect(embed.fields?.[1].value).toContain("Owner: nobody yet");
    expect(embed.description).toContain("1 overdue");
  });

  it("stays inside Discord's limits on a long board", () => {
    const many = Array.from({ length: 40 }, (_, k) =>
      op({ slug: `op-${k}`, title: `Operation ${k} ${"t".repeat(300)}`, status: "s".repeat(300), owner: "o".repeat(100) })
    );
    const embed = boardEmbed(many, MORNING);
    expect(embed.fields).toHaveLength(25);
    expect(embed.fields?.[24].value).toContain("16 more");
    expect(embedSize(embed)).toBeLessThanOrEqual(6000);
    for (const field of embed.fields ?? []) {
      expect(field.name.length).toBeLessThanOrEqual(256);
      expect(field.value.length).toBeLessThanOrEqual(1024);
    }
  });

  it("lists steps with done marks and cuts a very long list", () => {
    const detail: OpDetail = {
      ...op({ steps_done: 1, steps_total: 2 }),
      goal: "Enough snacks",
      done_when: "Everyone ate",
      steps: [
        { position: 1, text: "Buy fruit", done: true },
        { position: 2, text: "Buy water", done: false },
      ],
    };
    const embed = showEmbed(detail, MORNING);
    expect(embed.description).toContain("✅ 1. Buy fruit");
    expect(embed.description).toContain("⬜ 2. Buy water");
    expect(embed.description).toContain("**Goal:** Enough snacks");

    const long = showEmbed(
      { ...detail, steps: Array.from({ length: 100 }, (_, k) => ({ position: k + 1, text: "z".repeat(400), done: false })) },
      MORNING
    );
    expect(long.description!.length).toBeLessThanOrEqual(4096);
    expect(long.description).toMatch(/more step\(s\)\.$/);
  });

  it("lists what is due in 48 hours and what is overdue", () => {
    const embed = dueEmbed(
      [op({ title: "Due tomorrow" }), op({ title: "Far away", deadline_on: "2026-12-20" }), op({ title: "Late", deadline_on: "2026-11-27" })],
      MORNING
    );
    expect(embed.description).toContain("Due tomorrow");
    expect(embed.description).not.toContain("Far away");
    expect(embed.description).toMatch(/\*\*Overdue\*\*\n\*\*Late\*\*/);
    expect(dueEmbed([], MORNING).description).toContain("Nothing due in the next 48 hours.");
  });

  it("never uses an em dash in what it shows", () => {
    const detail: OpDetail = { ...op(), goal: null, done_when: null, steps: [] };
    const text = allText([boardEmbed([op()], MORNING), boardEmbed([], MORNING), showEmbed(detail, MORNING), dueEmbed([op()], MORNING)]);
    expect(text).not.toContain("—");
  });
});
