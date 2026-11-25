import {
  actorFor,
  appendNote,
  buildPipelineWrite,
  clearsOpenPlanProblem,
  mergeServerItems,
  patchClearsPlan,
  daysInStage,
  columnSummaries,
  compareForList,
  daysSinceTouch,
  isNextStepDue,
  isNextStepOverdue,
  isStale,
  lastTouchAt,
  matchesFilter,
  noReasonLine,
  sponsorMoney,
  stageMoveProblem,
  STAGE_WEIGHT_GUESS,
  looksLikePhoneNumber,
  neighbourStage,
  pipelineCreateSchema,
  pipelineImportSchema,
  pipelineProgress,
  pipelineUpdateSchema,
  type PipelineItem,
} from "../pipeline";

function item(p: Partial<PipelineItem>): PipelineItem {
  return {
    id: Math.random().toString(36),
    event_slug: "elemental-2026",
    kind: "sponsor",
    name: "X",
    organisation: null,
    element: null,
    stage: "to_contact",
    owner: null,
    amount_thb: null,
    why_fit: null,
    reach: null,
    next_step: null,
    next_step_due: null,
    notes: null,
    position: null,
    in_kind: false,
    stage_changed_at: null,
    last_touched_at: null,
    updated_by: null,
    created_at: "2026-11-21T00:00:00Z",
    updated_at: "2026-11-21T00:00:00Z",
    ...p,
  };
}

describe("pipelineCreateSchema", () => {
  it("fills defaults and turns empty text into null", () => {
    const r = pipelineCreateSchema.parse({ kind: "sponsor", name: "  Acme  ", organisation: "", next_step_due: "" });
    expect(r).toMatchObject({ name: "Acme", stage: "to_contact", organisation: null, next_step_due: null, amount_thb: null });
  });

  it("rejects bad kinds, stages, elements, amounts and dates", () => {
    const bad = [
      { kind: "vendor", name: "A" },
      { kind: "sponsor", name: "" },
      { kind: "sponsor", name: "A", stage: "won" },
      { kind: "speaker", name: "A", element: "metal" },
      { kind: "sponsor", name: "A", amount_thb: -1 },
      { kind: "sponsor", name: "A", amount_thb: 10.5 },
      { kind: "sponsor", name: "A", next_step_due: "30/11/2026" },
      { kind: "sponsor", name: "A", next_step_due: "2026-02-31" },
      { kind: "sponsor", name: "A", next_step_due: "2026-13-01" },
      { kind: "sponsor", name: "x".repeat(201) },
    ];
    for (const b of bad) expect(pipelineCreateSchema.safeParse(b).success).toBe(false);
  });

  it("accepts a real date, including a leap day", () => {
    expect(pipelineCreateSchema.parse({ kind: "sponsor", name: "A", next_step_due: "2028-02-29" }).next_step_due).toBe(
      "2028-02-29",
    );
    expect(pipelineCreateSchema.safeParse({ kind: "sponsor", name: "A", next_step_due: "2026-02-29" }).success).toBe(false);
  });

  it("takes owners only from the fixed list", () => {
    expect(pipelineCreateSchema.parse({ kind: "sponsor", name: "A", owner: "Kirt" }).owner).toBe("Kirt");
    expect(pipelineCreateSchema.parse({ kind: "sponsor", name: "A", owner: "" }).owner).toBeNull();
    expect(pipelineCreateSchema.safeParse({ kind: "sponsor", name: "A", owner: "someone@example.com" }).success).toBe(false);
    expect(pipelineCreateSchema.safeParse({ kind: "sponsor", name: "A", owner: "big" }).success).toBe(false);
  });

  it("defaults to cash and accepts merchandise", () => {
    expect(pipelineCreateSchema.parse({ kind: "sponsor", name: "A" }).in_kind).toBe(false);
    expect(pipelineCreateSchema.parse({ kind: "sponsor", name: "A", in_kind: true, amount_thb: 5000 }).in_kind).toBe(true);
  });

  it("needs a next step and date to start in contacted, talking or yes, and never starts in no", () => {
    expect(pipelineCreateSchema.safeParse({ kind: "sponsor", name: "A", stage: "talking" }).success).toBe(false);
    expect(
      pipelineCreateSchema.safeParse({
        kind: "sponsor",
        name: "A",
        stage: "talking",
        next_step: "Send deck",
        next_step_due: "2026-11-24",
      }).success,
    ).toBe(true);
    expect(pipelineCreateSchema.safeParse({ kind: "sponsor", name: "A", stage: "no" }).success).toBe(false);
    expect(pipelineCreateSchema.safeParse({ kind: "sponsor", name: "A", stage: "signed" }).success).toBe(true);
  });

  it("refuses a phone number in reach", () => {
    const r = pipelineCreateSchema.safeParse({ kind: "partner", name: "A", reach: "call 081 234 5678" });
    expect(r.success).toBe(false);
    expect(pipelineCreateSchema.safeParse({ kind: "partner", name: "A", reach: "facebook.com/acme" }).success).toBe(true);
  });
});

describe("pipelineUpdateSchema", () => {
  it("keeps only the fields sent", () => {
    expect(pipelineUpdateSchema.parse({ stage: "signed" })).toEqual({ stage: "signed" });
    expect(pipelineUpdateSchema.parse({ touched: true, updated_by: "Big" })).toEqual({ touched: true, updated_by: "Big" });
    expect(pipelineUpdateSchema.parse({ owner: "", amount_thb: null })).toEqual({ owner: null, amount_thb: null });
  });

  it("rejects an empty patch, unknown fields and blank names", () => {
    expect(pipelineUpdateSchema.safeParse({}).success).toBe(false);
    expect(pipelineUpdateSchema.safeParse({ event_slug: "other" }).success).toBe(false);
    expect(pipelineUpdateSchema.safeParse({ created_by: "x" }).success).toBe(false);
    expect(pipelineUpdateSchema.safeParse({ name: "  " }).success).toBe(false);
    // Saying who you are is not a change on its own.
    expect(pipelineUpdateSchema.safeParse({ updated_by: "Big" }).success).toBe(false);
    expect(pipelineUpdateSchema.safeParse({ updated_by: "Someone" }).success).toBe(false);
  });

  it("refuses a move into contacted, talking or yes without a next step and date", () => {
    for (const stage of ["contacted", "talking", "yes"]) {
      expect(pipelineUpdateSchema.safeParse({ stage }).success).toBe(false);
      expect(pipelineUpdateSchema.safeParse({ stage, next_step: "Call" }).success).toBe(false);
      expect(pipelineUpdateSchema.safeParse({ stage, next_step: "Call", next_step_due: "" }).success).toBe(false);
      expect(pipelineUpdateSchema.safeParse({ stage, next_step: "Call", next_step_due: "2026-11-25" }).success).toBe(true);
    }
    expect(pipelineUpdateSchema.safeParse({ stage: "to_contact" }).success).toBe(true);
  });

  it("needs a reason to move to no", () => {
    expect(pipelineUpdateSchema.safeParse({ stage: "no" }).success).toBe(false);
    expect(pipelineUpdateSchema.safeParse({ stage: "no", append_note: "  " }).success).toBe(false);
    expect(pipelineUpdateSchema.parse({ stage: "no", append_note: "No budget this year" })).toEqual({
      stage: "no",
      append_note: "No budget this year",
    });
  });
});

describe("stageMoveProblem", () => {
  it("names what is missing", () => {
    expect(stageMoveProblem("talking", {})).toMatch(/next step and a date/);
    expect(stageMoveProblem("talking", { next_step: "x", next_step_due: "2026-11-22" })).toBeNull();
    expect(stageMoveProblem("no", {})).toMatch(/reason/);
    expect(stageMoveProblem("signed", {})).toBeNull();
    expect(stageMoveProblem("to_contact", {})).toBeNull();
  });
});

describe("pipelineImportSchema", () => {
  it("needs 1 to 300 valid rows", () => {
    expect(pipelineImportSchema.safeParse({ rows: [] }).success).toBe(false);
    expect(pipelineImportSchema.safeParse({ rows: [{ kind: "sponsor", name: "A" }] }).success).toBe(true);
    const many = Array.from({ length: 301 }, () => ({ kind: "sponsor", name: "A" }));
    expect(pipelineImportSchema.safeParse({ rows: many }).success).toBe(false);
  });
});

describe("board math", () => {
  const items = [
    item({ stage: "signed", amount_thb: 10000 }),
    item({ stage: "yes", amount_thb: 5000 }),
    item({ stage: "talking", amount_thb: 1000 }),
    item({ kind: "partner", stage: "yes" }),
    item({ kind: "partner", stage: "no" }),
    item({ kind: "speaker", stage: "yes", element: "water" }),
    item({ kind: "speaker", stage: "signed", element: "water" }),
    item({ kind: "speaker", stage: "talking", element: "fire" }),
    item({ kind: "speaker", stage: "signed", element: "aether" }),
  ];

  it("sums counts and cash per column for one kind, weighted by the guessed odds", () => {
    const s = columnSummaries(items, "sponsor");
    expect(s.signed).toEqual({ stage: "signed", count: 1, baht: 10000, inKind: 0, weighted: 10000 });
    expect(s.talking).toMatchObject({ baht: 1000, weighted: 300 });
    expect(s.yes.weighted).toBe(4000);
    expect(s.to_contact.count).toBe(0);
  });

  it("keeps merchandise out of the cash column totals", () => {
    const s = columnSummaries(
      [item({ stage: "talking", amount_thb: 5000, in_kind: true }), item({ stage: "talking", amount_thb: 10000 })],
      "sponsor",
    );
    expect(s.talking).toEqual({ stage: "talking", count: 2, baht: 10000, inKind: 5000, weighted: 3000 });
  });

  it("labels the stage weights and keeps them between 0 and 1", () => {
    expect(STAGE_WEIGHT_GUESS).toEqual({ to_contact: 0.05, contacted: 0.1, talking: 0.3, yes: 0.8, signed: 1, no: 0 });
  });

  it("splits sponsor money into cash signed, cash at yes and merchandise", () => {
    expect(
      sponsorMoney([
        item({ stage: "signed", amount_thb: 10000 }),
        item({ stage: "signed", amount_thb: 3000, in_kind: true }),
        item({ stage: "yes", amount_thb: 5000 }),
        item({ stage: "yes", amount_thb: 2000, in_kind: true }),
        item({ stage: "talking", amount_thb: 9000 }),
        item({ kind: "partner", stage: "signed", amount_thb: 7000 }),
        item({ stage: "signed", amount_thb: null }),
      ]),
    ).toEqual({ cashSigned: 10000, cashYes: 5000, inKindValue: 5000 });
  });

  it("measures progress against the targets", () => {
    const p = pipelineProgress(items);
    expect(p).toMatchObject({
      sponsorsSigned: 1,
      sponsorsYes: 1,
      sponsorsTalking: 1,
      sponsorsTarget: 3,
      cashSigned: 10000,
      cashYes: 5000,
      inKindValue: 0,
      prizePool: 20000,
      elementsCovered: ["water", "aether"],
      elementsMissing: ["earth", "air", "fire"],
      partnersCommitted: 1,
    });
  });

  it("flags overdue next steps only on open cards", () => {
    expect(isNextStepOverdue({ next_step_due: "2026-11-20", stage: "talking" }, "2026-11-21")).toBe(true);
    expect(isNextStepOverdue({ next_step_due: "2026-11-21", stage: "talking" }, "2026-11-21")).toBe(false);
    expect(isNextStepOverdue({ next_step_due: "2026-11-20", stage: "signed" }, "2026-11-21")).toBe(false);
    expect(isNextStepOverdue({ next_step_due: null, stage: "talking" }, "2026-11-21")).toBe(false);
  });

  it("counts due today as well as overdue for the Today strip", () => {
    expect(isNextStepDue({ next_step_due: "2026-11-21", stage: "talking" }, "2026-11-21")).toBe(true);
    expect(isNextStepDue({ next_step_due: "2026-11-22", stage: "talking" }, "2026-11-21")).toBe(false);
    expect(isNextStepDue({ next_step_due: "2026-11-21", stage: "no" }, "2026-11-21")).toBe(false);
  });

  it("steps left and right along the board", () => {
    expect(neighbourStage("to_contact", -1)).toBeNull();
    expect(neighbourStage("to_contact", 1)).toBe("contacted");
    expect(neighbourStage("signed", 1)).toBeNull();
    expect(neighbourStage("no", -1)).toBe("talking");
  });

  it("spots phone numbers", () => {
    expect(looksLikePhoneNumber("+66 81-234-5678")).toBe(true);
    expect(looksLikePhoneNumber("0812345678")).toBe(true);
    expect(looksLikePhoneNumber("call 081 234 5678 after 5")).toBe(true);
    expect(looksLikePhoneNumber("(081) 234-5678")).toBe(true);
    expect(looksLikePhoneNumber("02-123-4567")).toBe(true);
    expect(looksLikePhoneNumber("https://www.facebook.com/acme")).toBe(false);
  });

  it("does not take page ids, links or dates for phone numbers", () => {
    expect(looksLikePhoneNumber("https://www.facebook.com/profile.php?id=100064123456789")).toBe(false);
    expect(looksLikePhoneNumber("facebook.com/people/Some-Org/100088765432101")).toBe(false);
    expect(looksLikePhoneNumber("นัดคุย 2026-11-30 10.00")).toBe(false);
    expect(looksLikePhoneNumber("10,000 baht")).toBe(false);
  });
});

describe("staleness", () => {
  it("takes the latest of stage change, touch and creation", () => {
    expect(
      lastTouchAt({
        created_at: "2026-11-18T03:00:00Z",
        stage_changed_at: "2026-11-19T03:00:00Z",
        last_touched_at: "2026-11-20T03:00:00Z",
      }),
    ).toBe("2026-11-20T03:00:00Z");
    expect(lastTouchAt({ created_at: "2026-11-18T03:00:00Z", stage_changed_at: null, last_touched_at: null })).toBe(
      "2026-11-18T03:00:00Z",
    );
  });

  it("counts Bangkok days since the last touch", () => {
    // 20:00 UTC on 18 Nov is already 19 Nov in Bangkok.
    const t = { created_at: "2026-11-18T20:00:00Z", stage_changed_at: null, last_touched_at: null };
    expect(daysSinceTouch(t, "2026-11-19")).toBe(0);
    expect(daysSinceTouch(t, "2026-11-21")).toBe(2);
  });

  it("counts days in the stage from the stage change, else creation", () => {
    expect(daysInStage({ created_at: "2026-11-15T03:00:00Z", stage_changed_at: "2026-11-19T03:00:00Z" }, "2026-11-21")).toBe(2);
    expect(daysInStage({ created_at: "2026-11-15T03:00:00Z", stage_changed_at: null }, "2026-11-21")).toBe(6);
  });

  it("goes stale after 2 days, only while contacted or talking", () => {
    const base = { created_at: "2026-11-18T03:00:00Z", stage_changed_at: null, last_touched_at: null };
    expect(isStale({ ...base, stage: "talking" }, "2026-11-20")).toBe(false);
    expect(isStale({ ...base, stage: "talking" }, "2026-11-21")).toBe(true);
    expect(isStale({ ...base, stage: "contacted" }, "2026-11-21")).toBe(true);
    expect(isStale({ ...base, stage: "yes" }, "2026-11-25")).toBe(false);
    expect(isStale({ ...base, stage: "to_contact" }, "2026-11-25")).toBe(false);
    expect(isStale({ ...base, stage: "talking", last_touched_at: "2026-11-20T03:00:00Z" }, "2026-11-21")).toBe(false);
  });
});

describe("buildPipelineWrite", () => {
  const now = new Date("2026-11-21T07:00:00Z");

  it("stamps stage_changed_at only when the stage really changes", () => {
    expect(buildPipelineWrite({ stage: "to_contact", notes: null }, { stage: "signed" }, now)).toMatchObject({
      stage: "signed",
      stage_changed_at: now.toISOString(),
    });
    expect(buildPipelineWrite({ stage: "signed", notes: null }, { stage: "signed" }, now)).not.toHaveProperty(
      "stage_changed_at",
    );
  });

  it("turns touched into last_touched_at and never writes the flag itself", () => {
    const w = buildPipelineWrite(null, { touched: true, updated_by: "Angpao" }, now);
    expect(w).toEqual({ last_touched_at: now.toISOString(), updated_by: "Angpao", updated_at: now.toISOString() });
  });

  it("leaves updated_by alone when the patch does not set it", () => {
    expect(buildPipelineWrite(null, { touched: true }, now)).not.toHaveProperty("updated_by");
  });

  it("appends the reason to the notes instead of replacing them", () => {
    const w = buildPipelineWrite(
      { stage: "talking", notes: "Met at the fair" },
      { stage: "no", append_note: "Said no (21 Nov): no budget" },
      now,
    );
    expect(w.notes).toBe("Met at the fair\nSaid no (21 Nov): no budget");
    expect(w).not.toHaveProperty("append_note");
  });

  it("appends after notes sent in the same save", () => {
    const w = buildPipelineWrite({ stage: "talking", notes: "old" }, { notes: "new", append_note: "line" }, now);
    expect(w.notes).toBe("new\nline");
  });
});

describe("notes and list helpers", () => {
  it("appendNote keeps what is there", () => {
    expect(appendNote(null, " first ")).toBe("first");
    expect(appendNote("a\n\n", "b")).toBe("a\nb");
  });

  it("noReasonLine dates the reason", () => {
    expect(noReasonLine(" no budget ", "2026-11-21")).toBe("Said no (21 Nov): no budget");
  });

  it("sorts the dense list overdue first, then by due date, undated last", () => {
    const list = [
      item({ name: "undated" }),
      item({ name: "later", next_step_due: "2026-11-25", stage: "talking" }),
      item({ name: "overdue", next_step_due: "2026-11-19", stage: "talking" }),
      item({ name: "soon", next_step_due: "2026-11-22", stage: "talking" }),
    ].sort(compareForList("2026-11-21"));
    expect(list.map((i) => i.name)).toEqual(["overdue", "soon", "later", "undated"]);
  });

  it("filters on name, organisation, owner and next step", () => {
    const i = item({ name: "Acme", organisation: "Green Co", owner: "Kirt", next_step: "Send deck" });
    expect(matchesFilter(i, "green")).toBe(true);
    expect(matchesFilter(i, "kirt")).toBe(true);
    expect(matchesFilter(i, "DECK")).toBe(true);
    expect(matchesFilter(i, "zzz")).toBe(false);
    expect(matchesFilter(i, "  ")).toBe(true);
  });
});

describe("phone numbers on the server", () => {
  it("refuses a phone number in any text field, not only reach", () => {
    for (const field of ["name", "organisation", "why_fit", "next_step", "notes"]) {
      const r = pipelineCreateSchema.safeParse({ kind: "sponsor", name: "X", [field]: "call 081 234 5678" });
      expect(r.success).toBe(false);
    }
    expect(pipelineUpdateSchema.safeParse({ notes: "081-234-5678" }).success).toBe(false);
    expect(pipelineUpdateSchema.safeParse({ stage: "no", append_note: "ring 0812345678" }).success).toBe(false);
    expect(pipelineUpdateSchema.safeParse({ notes: "Meeting 2026-11-30 10.00" }).success).toBe(true);
  });
});

describe("an open conversation keeps its plan", () => {
  const talking = { stage: "talking" as const, next_step: "Send deck", next_step_due: "2026-11-24" };

  it("refuses clearing the next step or its date on a contacted, talking or yes card", () => {
    expect(clearsOpenPlanProblem(talking, { next_step: null })).toMatch(/Talking needs a next step and a date/);
    expect(clearsOpenPlanProblem(talking, { next_step_due: null })).toMatch(/next step and a date/);
    expect(clearsOpenPlanProblem({ ...talking, stage: "yes" }, { next_step: null })).not.toBeNull();
  });

  it("allows changing the plan, clearing it elsewhere, or a move (checked on its own)", () => {
    expect(clearsOpenPlanProblem(talking, { next_step: "Call back", next_step_due: "2026-11-25" })).toBeNull();
    expect(clearsOpenPlanProblem({ ...talking, stage: "to_contact" }, { next_step: null })).toBeNull();
    expect(clearsOpenPlanProblem(talking, { stage: "signed", next_step: null })).toBeNull();
  });

  it("only reads the row when the patch empties the plan", () => {
    expect(patchClearsPlan({ next_step: null })).toBe(true);
    expect(patchClearsPlan({ next_step_due: null })).toBe(true);
    expect(patchClearsPlan({ next_step: "x" })).toBe(false);
    expect(patchClearsPlan({ stage: "to_contact", next_step: null })).toBe(false);
  });
});

describe("actorFor", () => {
  const map = JSON.stringify({ "user-1": "Big", "user-2": "angpao", "user-3": "someone@x.co" });

  it("maps a signed-in admin to an owner, and nothing else", () => {
    expect(actorFor("user-1", map)).toBe("Big");
    expect(actorFor("user-2", map)).toBe("Angpao");
    expect(actorFor("user-3", map)).toBeNull();
    expect(actorFor("user-9", map)).toBeNull();
    expect(actorFor("user-1", undefined)).toBeNull();
    expect(actorFor("user-1", "not json")).toBeNull();
  });
});

describe("mergeServerItems", () => {
  const a = item({ id: "a", stage: "to_contact", updated_at: "2026-11-22T03:00:00Z" });
  const b = item({ id: "b", updated_at: "2026-11-22T03:00:00Z" });

  it("keeps a row saved here after the server read it", () => {
    const savedHere = { ...a, stage: "contacted" as const, updated_at: "2026-11-22T03:05:00Z" };
    const merged = mergeServerItems([savedHere, b], [a, b], new Set(), new Set());
    expect(merged.find((i) => i.id === "a")?.stage).toBe("contacted");
  });

  it("takes the server row when it is newer", () => {
    const newer = { ...a, stage: "talking" as const, updated_at: "2026-11-22T04:00:00Z" };
    expect(mergeServerItems([a], [newer], new Set(), new Set())[0].stage).toBe("talking");
  });

  it("keeps a card deleted here gone, and a card added here present", () => {
    const added = item({ id: "c" });
    const merged = mergeServerItems([b, added], [a, b], new Set(["a"]), new Set(["c"]));
    expect(merged.map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("drops a card someone else deleted", () => {
    expect(mergeServerItems([a, b], [b], new Set(), new Set()).map((i) => i.id)).toEqual(["b"]);
  });
});
