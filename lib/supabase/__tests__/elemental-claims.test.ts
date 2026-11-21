import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

type Call = { method: string; args: unknown[] };
type Result = { data: unknown; error: unknown };

const calls: Call[] = [];
let results: Result[] = [];

/** A thenable query builder that records every call and resolves to the next queued result. */
function builder(): unknown {
  const target: Record<string, unknown> = {};
  const proxy: unknown = new Proxy(target, {
    get(_t, prop: string) {
      if (prop === "then") {
        const next = results.shift() ?? { data: [], error: null };
        return (resolve: (r: Result) => unknown) => resolve(next);
      }
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return proxy;
      };
    },
  });
  return proxy;
}

jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: () => builder() }));

import {
  ELEMENTAL_CLAIM_EDITION,
  getClaimCounts,
  getMemberClaimCodes,
  toClaimCounts,
  toMemberClaimCodes,
} from "@/lib/supabase/elemental-claims";

const REG = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function claim(position: number, code: string, used = false, registrationId = REG) {
  return {
    code,
    used_at: used ? "2026-12-04T12:00:00Z" : null,
    hackathon_event_registration_members: { position, registration_id: registrationId },
  };
}

beforeEach(() => {
  calls.length = 0;
  results = [];
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe("elemental-claims source", () => {
  const source = readFileSync(join(process.cwd(), "lib/supabase/elemental-claims.ts"), "utf8");

  it("never names a parent, school or other member column", () => {
    expect(source).not.toMatch(/parent/i);
    expect(source).not.toMatch(/school/i);
    for (const column of ["full_name", "nickname", "age", "phone", "email", "line_id", "consent"]) {
      expect(source).not.toMatch(new RegExp(`\\b${column}\\b`, "i"));
    }
  });

  it("selects only the code, its use and the member position", () => {
    const selects = [...source.matchAll(/\.select\(`([^`]*)`\)/g)].map((m) => m[1]);
    expect(selects.length).toBe(2);
    for (const select of selects) expect(select).toMatch(/^(code|id), used_at, \$\{MEMBER_JOIN\}$/);
    expect(source).toContain('"hackathon_event_registration_members!inner(position, registration_id)"');
  });

  it("imports nothing from the Elemental bot or core libs (cherry-picked to main early)", () => {
    expect(source).not.toMatch(/from "@\/lib\/elemental/);
    expect(source).not.toMatch(/bot\//);
  });

  it("reads the edition that the event slug names", () => {
    expect(ELEMENTAL_CLAIM_EDITION).toBe(ELEMENTAL.slug);
  });
});

describe("toMemberClaimCodes", () => {
  it("gives one stable code per position in position order, whatever the row order", () => {
    const rows = [claim(3, "CCCCCCCC"), claim(1, "AAAAAAAA", true), claim(2, "BBBBBBBB")];
    const expected = [
      { position: 1, code: "AAAAAAAA", claimed: true },
      { position: 2, code: "BBBBBBBB", claimed: false },
      { position: 3, code: "CCCCCCCC", claimed: false },
    ];
    expect(toMemberClaimCodes(rows, REG)).toEqual(expected);
    expect(toMemberClaimCodes([...rows].reverse(), REG)).toEqual(expected);
  });

  it("drops rows of another registration and malformed rows", () => {
    const rows = [
      claim(1, "AAAAAAAA"),
      claim(2, "BBBBBBBB", false, OTHER),
      claim(3, "bad"),
      { code: "DDDDDDDD", used_at: null, hackathon_event_registration_members: null },
      null,
      claim(1, "EEEEEEEE"),
    ];
    expect(toMemberClaimCodes(rows, REG)).toEqual([{ position: 1, code: "AAAAAAAA", claimed: false }]);
    expect(toMemberClaimCodes(null, REG)).toEqual([]);
  });

  it("reads an embedded member given as an array", () => {
    const row = { code: "AAAAAAAA", used_at: null, hackathon_event_registration_members: [{ position: 1, registration_id: REG }] };
    expect(toMemberClaimCodes([row], REG)).toEqual([{ position: 1, code: "AAAAAAAA", claimed: false }]);
  });
});

describe("toClaimCounts", () => {
  it("counts used and issued codes per registration", () => {
    const counts = toClaimCounts([
      claim(1, "AAAAAAAA", true),
      claim(2, "BBBBBBBB"),
      claim(1, "CCCCCCCC", true, OTHER),
      { used_at: null },
    ]);
    expect(counts.get(REG)).toEqual({ claimed: 1, issued: 2 });
    expect(counts.get(OTHER)).toEqual({ claimed: 1, issued: 1 });
    expect(counts.size).toBe(2);
  });
});

describe("getMemberClaimCodes", () => {
  it("filters by edition, member kind and the registration", async () => {
    results = [{ data: [claim(2, "BBBBBBBB"), claim(1, "AAAAAAAA")], error: null }];
    await expect(getMemberClaimCodes(REG)).resolves.toEqual([
      { position: 1, code: "AAAAAAAA", claimed: false },
      { position: 2, code: "BBBBBBBB", claimed: false },
    ]);
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: "from", args: ["elemental_claims"] },
        { method: "eq", args: ["edition", "elemental-2026"] },
        { method: "eq", args: ["kind", "member"] },
        { method: "eq", args: ["hackathon_event_registration_members.registration_id", REG] },
      ]),
    );
  });

  it("returns null when the table is missing, logging a code only", async () => {
    results = [{ data: null, error: { code: "PGRST205", message: "secret detail" } }];
    await expect(getMemberClaimCodes(REG)).resolves.toBeNull();
    expect(console.error).toHaveBeenCalledWith("[elemental-claims] codes read failed: PGRST205");
  });
});

describe("getClaimCounts", () => {
  it("reads every page until a short one", async () => {
    const full = Array.from({ length: 1000 }, (_, i) => claim(1, "AAAAAAAA", i % 2 === 0, `reg-${i}`));
    results = [
      { data: full, error: null },
      { data: [claim(1, "AAAAAAAA", true)], error: null },
    ];
    const counts = await getClaimCounts();
    expect(counts?.size).toBe(1001);
    expect(calls.filter((c) => c.method === "range").map((c) => c.args)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("returns null on an error", async () => {
    results = [{ data: null, error: { code: "42P01" } }];
    await expect(getClaimCounts()).resolves.toBeNull();
  });
});
