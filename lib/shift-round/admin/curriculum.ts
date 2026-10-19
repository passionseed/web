import type { CurriculumDoc } from "@/lib/content/shift2-curriculum";

import { addDaysIso, hhmm, ictDate, isCurriculumKey } from "./format";

/**
 * Round picker for /shift/curriculum?round=<key> (v2 spec 3). Keys come from
 * `shift_curriculum` rows plus the rounds' `curriculum_key`; the page opens
 * the latest round when no key is asked for. `default` is the template the app
 * falls back to (v2 spec 2.5), listed last.
 */

export const DEFAULT_CURRICULUM_KEY = "default";

export interface CurriculumRowRef {
  key: string;
  updated_at?: string | null;
}

/** What the picker and "copy" need from `shift_rounds`. */
export interface CurriculumRoundRef {
  number: number;
  curriculum_key: string | null;
  starts_at?: string | null;
  duration_days?: number | null;
  session_days?: number[] | null;
  session_start?: string | null;
  session_end?: string | null;
}

export interface CurriculumOption {
  key: string;
  label: string;
  hasRow: boolean;
  /** Round numbers using this key, highest first. */
  rounds: number[];
}

const trailingNumber = (key: string): number | null => {
  const m = /(\d+)\D*$/.exec(key);
  return m ? Number(m[1]) : null;
};

export function curriculumKeyLabel(key: string, rounds: number[] = []): string {
  if (rounds.length) {
    const names = rounds.map((n) => `SHIFT[${n}]`).join(", ");
    return rounds.length === 1 && key === String(rounds[0]) ? names : `${names} · ${key}`;
  }
  if (key === DEFAULT_CURRICULUM_KEY) return "แม่แบบ (default)";
  if (/^\d+$/.test(key)) return `SHIFT[${key}]`;
  return key;
}

/** Every key, latest first: keys of rounds by round number, then other keys by their number, `default` last. */
export function curriculumOptions(rows: CurriculumRowRef[], rounds: CurriculumRoundRef[]): CurriculumOption[] {
  const byKey = new Map<string, { hasRow: boolean; rounds: number[]; updated: string }>();
  const entry = (key: string) => {
    let e = byKey.get(key);
    if (!e) byKey.set(key, (e = { hasRow: false, rounds: [], updated: "" }));
    return e;
  };
  for (const row of rows) {
    if (!isCurriculumKey(row.key)) continue;
    const e = entry(row.key);
    e.hasRow = true;
    e.updated = row.updated_at ?? "";
  }
  for (const round of rounds) {
    if (round.curriculum_key && isCurriculumKey(round.curriculum_key)) entry(round.curriculum_key).rounds.push(round.number);
  }

  const rank = (key: string, e: { rounds: number[] }) =>
    key === DEFAULT_CURRICULUM_KEY ? 2 : e.rounds.length ? 0 : 1;
  return [...byKey.entries()]
    .map(([key, e]) => ({ key, ...e, rounds: [...e.rounds].sort((a, b) => b - a) }))
    .sort((a, b) => {
      const ra = rank(a.key, a);
      const rb = rank(b.key, b);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return b.rounds[0] - a.rounds[0];
      const na = trailingNumber(a.key);
      const nb = trailingNumber(b.key);
      if (na !== nb) return (nb ?? -1) - (na ?? -1);
      return b.updated.localeCompare(a.updated) || a.key.localeCompare(b.key);
    })
    .map(({ key, hasRow, rounds: nums }) => ({ key, hasRow, rounds: nums, label: curriculumKeyLabel(key, nums) }));
}

/** The asked-for key when it is a valid key (it may have no row yet), else the latest round's. */
export function pickCurriculumKey(requested: unknown, options: CurriculumOption[]): string {
  const asked = Array.isArray(requested) ? requested[0] : requested;
  if (isCurriculumKey(asked)) return asked;
  return options.find((o) => o.key !== DEFAULT_CURRICULUM_KEY)?.key ?? DEFAULT_CURRICULUM_KEY;
}

/** The newest round that reads this key, if any (dates and sessions for a copy). */
export function roundForKey(key: string, rounds: CurriculumRoundRef[]): CurriculumRoundRef | null {
  return rounds.filter((r) => r.curriculum_key === key).sort((a, b) => b.number - a.number)[0] ?? null;
}

/**
 * A copy of `doc` for another round: days re-dated from the round's day 1,
 * days past its length dropped, session days and time from the round (D5:
 * session days come from the round). Without a round the copy is unchanged.
 */
export function prepareCurriculumCopy(doc: CurriculumDoc, round?: CurriculumRoundRef | null): CurriculumDoc {
  const copy = JSON.parse(JSON.stringify(doc)) as CurriculumDoc;
  if (!round) return copy;
  let days = copy.days;
  if (round.duration_days) days = days.filter((d) => d.day <= (round.duration_days as number));
  if (round.starts_at) {
    const startsOn = ictDate(round.starts_at);
    days = days.map((d) => ({ ...d, date: addDaysIso(startsOn, d.day - 1) }));
  }
  if (round.session_days) {
    const sessions = new Set(round.session_days);
    days = days.map((d) => ({ ...d, mentorSession: sessions.has(d.day) }));
  }
  copy.days = days;
  const start = hhmm(round.session_start);
  const end = hhmm(round.session_end);
  if (start && end) copy.sessionTime = `${start}–${end}`;
  return copy;
}
