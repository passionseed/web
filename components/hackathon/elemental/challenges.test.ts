/** @jest-environment node */
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { ANY_PROBLEM_NOTE, ELEMENT_CHALLENGES } from "./challenges";

describe("ELEMENT_CHALLENGES", () => {
  it("covers every element in facts.ts exactly once", () => {
    const keys = ELEMENT_CHALLENGES.map((c) => c.key).sort();
    const factKeys = ELEMENTAL.elements.map((e) => e.key).sort();
    expect(keys).toEqual(factKeys);
  });

  it("gives every element a kind, an example and what it does to people", () => {
    for (const c of ELEMENT_CHALLENGES) {
      expect(c.kind.trim()).not.toBe("");
      expect(c.example.trim()).not.toBe("");
      expect(c.effect.trim()).not.toBe("");
    }
  });

  it("uses no em dashes in student copy", () => {
    const copy = [ANY_PROBLEM_NOTE, ...ELEMENT_CHALLENGES.flatMap((c) => [c.kind, c.example, c.effect])];
    for (const line of copy) expect(line).not.toMatch(/—/);
  });
});
