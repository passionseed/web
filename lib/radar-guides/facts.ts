/**
 * Fact registry helpers: shared facts plus a career's own, with unique ids.
 */
import type { Fact, FactId } from "@/lib/radar-guide/guide-types";
import { SHARED_FACTS } from "./_shared/facts";

export class DuplicateFactIdError extends Error {
  constructor(public readonly ids: readonly string[]) {
    super(`duplicate fact ids: ${ids.join(", ")}`);
    this.name = "DuplicateFactIdError";
  }
}

/** Shared facts first, then the career's. Throws DuplicateFactIdError on any repeated id. */
export function mergeFacts(career: readonly Fact[], shared: readonly Fact[] = SHARED_FACTS): readonly Fact[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  const out: Fact[] = [];
  for (const fact of [...shared, ...career]) {
    if (seen.has(fact.id)) dupes.add(fact.id);
    seen.add(fact.id);
    out.push(fact);
  }
  if (dupes.size) throw new DuplicateFactIdError([...dupes]);
  return out;
}

export function factMap(facts: readonly Fact[]): ReadonlyMap<FactId, Fact> {
  return new Map(facts.map((f) => [f.id, f]));
}

/** The facts with these ids, in the given order; unknown ids are skipped (guide-lint reports them). */
export function pickFacts(facts: readonly Fact[], ids: readonly FactId[]): Fact[] {
  const map = factMap(facts);
  return ids.map((id) => map.get(id)).filter((f): f is Fact => Boolean(f));
}
