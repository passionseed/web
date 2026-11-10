import { enforceCanvasAccess } from "./canvas-access";
import { checkFields, isModerator, mismatch, not, NOW, PEOPLE, trustCases } from "./canvas-trust.cases";
import { stampAuthor } from "./core";

// The same cases run through Postgres in `pnpm test:whiteboard-sql`, so the two copies of the rule agree.
describe("SHIFT canvas rule, TypeScript copy", () => {
  it.each(trustCases().map((c) => [c.name, c] as const))("%s", (_name, c) => {
    const saver = PEOPLE[c.saver];
    const { allowed, dropped } = enforceCanvasAccess(c.saved, stampAuthor(c.save, saver), saver, isModerator(c.saver));
    expect(dropped.map((el) => el.id).sort()).toEqual([...c.dropped].sort());
    expect(checkFields(new Map(allowed.map((el) => [el.id, el])), c.expect)).toEqual([]);
  });
});

describe("case matcher", () => {
  it("catches differences, so a passing case means something", () => {
    expect(mismatch({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBeNull();
    expect(mismatch({ a: [1, { b: 3 }] }, { a: [1, { b: 2 }] })).toMatch(/b/);
    expect(mismatch({ a: 1, extra: true }, { a: 1 })).toMatch(/extra/);
    expect(mismatch(new Date().toISOString(), NOW)).toBeNull();
    expect(mismatch("2020-01-01T00:00:00.000Z", NOW)).not.toBeNull();
    expect(mismatch("p2", not("p1"))).toBeNull();
    expect(mismatch("p1", not("p1"))).not.toBeNull();
    expect(mismatch(undefined, not("p1"))).not.toBeNull();
  });
});
