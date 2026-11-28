import { HEARD_FROM, heardFromLabel } from "./heard-from";

/**
 * Who signed up, for the pie charts on the admin page: age, where they say
 * they found the post, and which link they came through. Pure, so the page
 * and the tests share it. Cancelled sign-ups are left out.
 */

export type AudienceRow = {
  status: string;
  /** Tracked link (?src=), null for people who typed the address or came without one. */
  source: string | null;
  /** The self-reported answer; null before the question existed. */
  heardFrom: string | null;
  /** One age per person on the sign-up. */
  ages: number[];
};

export type Slice = { label: string; value: number; share: number };

export type AudienceSummary = {
  /** Sign-ups counted (one per payer), and people (members) behind them. */
  signups: number;
  people: number;
  ages: Slice[];
  heardFrom: Slice[];
  sources: Slice[];
};

/** Past this many slices the smallest fold into "Other", so a pie stays readable. */
const MAX_SLICES = 7;

function toSlices(counts: Map<string, number>, order?: string[]): Slice[] {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  let entries = [...counts.entries()];
  entries = order
    ? entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    : entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (entries.length > MAX_SLICES) {
    const head = entries.slice(0, MAX_SLICES - 1);
    const rest = entries.slice(MAX_SLICES - 1).reduce((n, [, v]) => n + v, 0);
    entries = [...head, ["Other", rest]];
  }
  return entries.map(([label, value]) => ({ label, value, share: total ? value / total : 0 }));
}

export const AGE_BUCKETS = ["14 or under", "15", "16", "17", "18", "19 or over"] as const;

export function ageBucket(age: number): (typeof AGE_BUCKETS)[number] {
  if (age <= 14) return "14 or under";
  if (age >= 19) return "19 or over";
  return String(age) as (typeof AGE_BUCKETS)[number];
}

const NO_ANSWER = "Signed up before the question";

export function summarizeAudience(rows: AudienceRow[]): AudienceSummary {
  const live = rows.filter((r) => r.status !== "cancelled");
  const ages = new Map<string, number>();
  const heard = new Map<string, number>();
  const sources = new Map<string, number>();
  let people = 0;

  for (const r of live) {
    for (const age of r.ages) {
      people += 1;
      const b = ageBucket(age);
      ages.set(b, (ages.get(b) ?? 0) + 1);
    }
    const h = r.heardFrom ? heardFromLabel(r.heardFrom) || "Other" : NO_ANSWER;
    heard.set(h, (heard.get(h) ?? 0) + 1);
    const s = r.source ?? "direct";
    sources.set(s, (sources.get(s) ?? 0) + 1);
  }

  return {
    signups: live.length,
    people,
    ages: toSlices(ages, [...AGE_BUCKETS]),
    heardFrom: toSlices(heard, [...HEARD_FROM.map((o) => o.label), NO_ANSWER]),
    sources: toSlices(sources),
  };
}
