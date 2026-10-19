import type { ReactElement } from "react";

import { SHIFT2_DEFAULT_DOC, type CurriculumDoc } from "@/lib/content/shift2-curriculum";

type Props = Record<string, unknown> & {
  round: string;
  label: string;
  initial: CurriculumDoc | null;
  options: { key: string; label: string; hasRow: boolean }[];
  copySources: { key: string; label: string; doc: CurriculumDoc }[];
  defaultDoc: CurriculumDoc;
  canEdit: boolean;
};

const doc2: CurriculumDoc = { ...SHIFT2_DEFAULT_DOC, sessionTime: "19:00–21:00 (SHIFT[2])" };
const docDefault: CurriculumDoc = { ...SHIFT2_DEFAULT_DOC, rules: ["กติกาแม่แบบ"] };

let mockRows: { data: unknown; error: unknown } = { data: [], error: null };
let mockRounds: unknown[] = [];
let mockAdmin = true;

jest.mock("@/utils/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "shift_curriculum") throw new Error(`service role must not read ${table}`);
      return { select: async () => mockRows };
    },
  }),
}));
jest.mock("@/utils/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockAdmin ? { id: "admin-1" } : null } }) },
    from: (table: string) =>
      table === "shift_rounds"
        ? { select: () => ({ not: async () => ({ data: mockRounds, error: null }) }) }
        : { select: () => ({ eq: () => ({ eq: () => ({ limit: async () => ({ data: mockAdmin ? [{ role: "admin" }] : [] }) }) }) }) },
  }),
}));
jest.mock("@/components/shift/CurriculumEditor", () => ({ CurriculumEditor: () => null }));

import ShiftCurriculumPage from "../page";

async function page(round?: string): Promise<{ key: string | null; props: Props }> {
  const el = (await ShiftCurriculumPage({ searchParams: Promise.resolve(round ? { round } : {}) })) as ReactElement<Props>;
  return { key: el.key, props: el.props };
}

beforeEach(() => {
  mockAdmin = true;
  mockRows = {
    data: [
      { round: "2", content: doc2, updated_at: "2026-10-13T10:00:00Z" },
      { round: "default", content: docDefault, updated_at: "2026-10-14T10:00:00Z" },
    ],
    error: null,
  };
  mockRounds = [
    { number: 3, curriculum_key: "3", starts_at: "2026-10-20T17:00:00Z", duration_days: 7, session_days: [1, 2, 4, 6, 7], session_start: "19:00:00", session_end: "21:00:00" },
    { number: 2, curriculum_key: "2", starts_at: "2026-10-13T17:00:00Z", duration_days: 7, session_days: [1, 2, 4, 6, 7], session_start: "19:00:00", session_end: "21:00:00" },
  ];
});

test("no ?round opens the latest round; a round without a row offers default and copies, re-dated", async () => {
  const { key, props } = await page();
  expect(key).toBe("3");
  expect(props.round).toBe("3");
  expect(props.label).toBe("SHIFT[3]");
  expect(props.initial).toBeNull();
  expect(props.options.map((o) => [o.key, o.hasRow])).toEqual([
    ["3", false],
    ["2", true],
    ["default", true],
  ]);
  expect(props.defaultDoc.rules).toEqual(["กติกาแม่แบบ"]);
  expect(props.defaultDoc.days[0].date).toBe("2026-10-21");
  expect(props.copySources.map((c) => [c.key, c.label, c.doc.days[6].date])).toEqual([
    ["2", "SHIFT[2]", "2026-10-27"],
    ["default", "แม่แบบ (default)", "2026-10-27"],
  ]);
});

test("?round=<key> opens that curriculum as saved", async () => {
  const { props } = await page("2");
  expect(props.round).toBe("2");
  expect(props.initial).toEqual(doc2);
  expect(props.copySources).toEqual([]);
});

test("a bad key falls back to the latest round; a new valid key opens empty", async () => {
  expect((await page("../x")).props.round).toBe("3");
  const fresh = await page("spring");
  expect(fresh.props.round).toBe("spring");
  expect(fresh.props.initial).toBeNull();
  expect(fresh.props.options[0]).toMatchObject({ key: "spring", hasRow: false });
});

test("without rounds (e.g. anonymous visitors) the latest saved curriculum opens", async () => {
  mockRounds = [];
  mockAdmin = false;
  const { props } = await page();
  expect(props.round).toBe("2");
  expect(props.canEdit).toBe(false);
});

test("no table or env: the SHIFT[2] defaults in code, as before", async () => {
  mockRows = { data: null, error: { message: "relation does not exist" } };
  const { props } = await page();
  expect(props.round).toBe("2");
  expect(props.initial).toBe(SHIFT2_DEFAULT_DOC);
});
