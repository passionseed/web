/** @jest-environment node */
import type { AdminSearchGroup } from "@/lib/admin/console";
import {
  detectShape,
  escapeIlike,
  filterPlan,
  maskEmail,
  maskPhone,
  matchScore,
  normalizeQuery,
  parseSearchParams,
  rankGroups,
  recencyBoost,
  SCORE,
  SEARCH_ENTITIES,
  SEARCH_TYPES,
  searchAdmin,
} from "@/lib/supabase/admin-search";

jest.mock("server-only", () => ({}));

describe("input", () => {
  test("normalizes: trim, NFC, no leading @, single spaces, 64 characters", () => {
    expect(normalizeQuery("  @@somchai_dev  ")).toBe("somchai_dev");
    expect(normalizeQuery("José")).toBe("José");
    expect(normalizeQuery("a\u0000b\n  c")).toBe("a b c");
    expect(normalizeQuery("x".repeat(80))).toHaveLength(64);
    expect(normalizeQuery(null)).toBe("");
  });

  test("parses q, types and limit, rejecting a query under 2 characters", () => {
    expect(parseSearchParams(new URLSearchParams("q=@a"))).toEqual({
      ok: false,
      error: "Type at least 2 characters.",
    });
    const parsed = parseSearchParams(new URLSearchParams("q=mint&types=user,nope,dm_lead,user&limit=50"));
    expect(parsed).toEqual({ ok: true, value: { q: "mint", types: ["user", "dm_lead"], limit: 10 } });
    const defaults = parseSearchParams(new URLSearchParams("q=mint&limit=abc"));
    expect(defaults.ok && defaults.value).toEqual({ q: "mint", types: [...SEARCH_TYPES], limit: 5 });
  });

  test("detects ids, emails, phone numbers and text", () => {
    expect(detectShape("3F2A9C1E-77B0-4C1A-9D2E-5B8F0A1C2D3E")).toBe("uuid");
    expect(detectShape("mint@gmail.com")).toBe("email");
    expect(detectShape("mint@gm")).toBe("text");
    expect(detectShape("081-234-5678")).toBe("digits");
    expect(detectShape("+66 81 234 5678")).toBe("digits");
    expect(detectShape("12")).toBe("text");
    expect(detectShape("SHIFT[3]")).toBe("text");
    expect(detectShape("สมชาย")).toBe("text");
  });

  test("escapes ILIKE wildcards and or() syntax but keeps underscores", () => {
    expect(escapeIlike('50%*off,(x)"\\y')).toBe("50 off x y");
    expect(escapeIlike("john_doe")).toBe("john_doe");
    expect(escapeIlike("%%%")).toBe("");
  });

  test("user input cannot add conditions to the or() filter", () => {
    const plan = filterPlan(SEARCH_ENTITIES.user, "a,id.eq.x),or(email.ilike.*", "text");
    expect(plan?.kind).toBe("or");
    const expression = plan?.kind === "or" ? plan.expression : "";
    expect(expression.split(",")).toHaveLength(SEARCH_ENTITIES.user.text.length);
    expect(expression).not.toMatch(/[()*"]/);
  });

  test("plans per shape: id equality, exact email, phone digits, round numbers", () => {
    const id = "3F2A9C1E-77B0-4C1A-9D2E-5B8F0A1C2D3E";
    expect(filterPlan(SEARCH_ENTITIES.map, id, "uuid")).toEqual({ kind: "eq", column: "id", value: id.toLowerCase() });
    expect(filterPlan(SEARCH_ENTITIES.user, "Mint@Gmail.com", "email")).toEqual({
      kind: "ilike",
      column: "email",
      pattern: "Mint@Gmail.com",
    });
    expect(filterPlan(SEARCH_ENTITIES.dm_lead, "mint@gmail.com", "email")).toBeNull();
    const phone = filterPlan(SEARCH_ENTITIES.talent, "081-234-5678", "digits");
    expect(phone?.kind === "or" && phone.expression).toContain("phone.ilike.%0812345678%");
    const round = filterPlan(SEARCH_ENTITIES.shift_round, "SHIFT[3]", "text");
    expect(round?.kind === "or" && round.expression).toContain("number.eq.3");
    expect(filterPlan(SEARCH_ENTITIES.user, "%%", "text")).toBeNull();
  });
});

describe("privacy", () => {
  const SECRET = /join_token|claim_token|password_hash|legal_name|birth|date_of_birth|parent_contact|pay_token|line_id|\bage\b|interview_|ip_address|user_agent|\*/;

  test.each(Object.values(SEARCH_ENTITIES).map((e) => [e.type, e.select]))(
    "%s selects explicit, non-secret columns",
    (_type, select) => {
      expect(select).not.toMatch(SECRET);
      expect(select.split(",").length).toBeGreaterThan(1);
    },
  );

  test("masks emails and phones", () => {
    expect(maskEmail("student@example.com")).toBe("s***@example.com");
    expect(maskEmail("x@y.co")).toBe("x***@y.co");
    expect(maskEmail("broken@")).toBe("***");
    expect(maskEmail(null)).toBeNull();
    expect(maskPhone("081-234-5678")).toBe("***5678");
    expect(maskPhone("123")).toBe("***");
    expect(maskPhone("")).toBeNull();
  });
});

describe("ranking", () => {
  test("exact beats prefix beats word prefix beats substring", () => {
    expect(matchScore("mint", ["Mint"])).toBe(SCORE.exact);
    expect(matchScore("mint", ["@mint"])).toBe(SCORE.exact);
    expect(matchScore("mint", ["mintdev"])).toBe(SCORE.prefix);
    expect(matchScore("mint", ["dev.mint_x"])).toBe(SCORE.wordPrefix);
    expect(matchScore("mint", ["peppermint"])).toBe(SCORE.substring);
    expect(matchScore("0812", [null, "Somchai"])).toBe(SCORE.other);
    expect(matchScore("mint", ["peppermint", "mintdev"])).toBe(SCORE.prefix);
  });

  test("recency adds at most 10 and fades with age", () => {
    const now = new Date("2026-10-26T00:00:00Z");
    expect(recencyBoost("2026-10-26T00:00:00Z", now)).toBeCloseTo(10);
    expect(recencyBoost("2026-09-26T00:00:00Z", now)).toBeCloseTo(10 * Math.exp(-1));
    expect(recencyBoost(null, now)).toBe(0);
  });

  test("groups are ordered by their best hit and capped at 40 hits", () => {
    const hits = (type: AdminSearchGroup["type"], scores: number[]) => ({
      type,
      label: type,
      hits: scores.map((score, i) => ({ type, id: `${type}${i}`, title: "t", href: "/x", score })),
    });
    const ranked = rankGroups([
      hits("map", [40, 45]),
      hits("user", [100]),
      hits("expert", []),
      hits("talent", Array(45).fill(30)),
    ]);
    expect(ranked.map((g) => g.type)).toEqual(["user", "map", "talent"]);
    expect(ranked[1].hits.map((h) => h.score)).toEqual([45, 40]);
    expect(ranked.reduce((n, g) => n + g.hits.length, 0)).toBe(40);
  });
});

describe("searchAdmin", () => {
  interface Call {
    table: string;
    select?: string;
    ops: unknown[][];
  }
  const calls: Call[] = [];
  let reply: (call: Call) => { data?: unknown; error?: unknown } = () => ({ data: [] });

  const db = {
    from(table: string) {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const builder: Record<string, unknown> = {
        select(columns: string) {
          call.select = columns;
          return builder;
        },
        then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
          return Promise.resolve({ data: null, error: null, ...reply(call) }).then(resolve, reject);
        },
      };
      for (const name of ["eq", "ilike", "or", "order", "limit", "abortSignal"]) {
        builder[name] = (...args: unknown[]) => {
          call.ops.push([name, ...args]);
          return builder;
        };
      }
      return builder;
    },
  };
  const now = new Date("2026-10-26T00:00:00Z");

  beforeEach(() => {
    calls.length = 0;
    reply = () => ({ data: [] });
  });

  test("ranks hits, masks contact data, links by id only, and reports partial failures", async () => {
    reply = (call) => {
      if (call.table === "profiles") {
        return {
          data: [
            { id: "u-old", username: "peppermint", full_name: null, email: "pep@example.com", created_at: "2025-01-01T00:00:00Z" },
            { id: "u-exact", username: "mint", full_name: "Mint Somchai", email: "mint.s@example.com", created_at: "2026-10-20T00:00:00Z" },
          ],
        };
      }
      if (call.table === "shift_applications") {
        return {
          data: [
            { id: "a1", cohort: "SHIFT[3]", full_name: "Mint Somchai", nickname: "Mint", ig_handle: "mint.dev", status: "new", paid_at: null, discord_joined_at: null, created_at: "2026-10-25T00:00:00Z" },
          ],
        };
      }
      if (call.table === "dm_conversations") return { error: { message: "timeout" } };
      return { data: [] };
    };
    const result = await searchAdmin(db as never, { q: "mint", types: [...SEARCH_TYPES], limit: 5 }, now);

    expect(result.q).toBe("mint");
    expect(result.partial).toBe(true);
    expect(result.groups.map((g) => g.type)).toEqual(["shift_application", "user"]);
    const [applications, users] = result.groups;
    expect(users.label).toBe("People");
    expect(users.hits.map((h) => h.id)).toEqual(["u-exact", "u-old"]);
    expect(users.hits[0]).toMatchObject({
      title: "Mint Somchai",
      subtitle: "@mint · m***@example.com",
      href: "/admin/users?id=u-exact",
    });
    expect(applications.hits[0]).toMatchObject({
      title: "Mint (@mint.dev)",
      subtitle: "SHIFT[3] · new",
      href: "/admin/shift/applications?cohort=SHIFT%5B3%5D&id=a1",
    });
    // Needs action (status new) and recent: above the exact-match user.
    expect(applications.hits[0].score).toBeGreaterThan(users.hits[0].score);

    const json = JSON.stringify(result);
    expect(json).not.toContain("mint.s@example.com");
    expect(json).not.toContain("pep@example.com");
    for (const group of result.groups) {
      for (const hit of group.hits) expect(hit.href).not.toMatch(/Somchai|@|%40/);
    }
    for (const call of calls) {
      expect(call.ops.find((o) => o[0] === "abortSignal")?.[1]).toBeInstanceOf(AbortSignal);
      expect(call.ops.find((o) => o[0] === "limit")?.[1]).toBe(15);
    }
  });

  test("an id query looks the id up in every requested table", async () => {
    const id = "3f2a9c1e-77b0-4c1a-9d2e-5b8f0a1c2d3e";
    reply = (call) => (call.table === "learning_maps" ? { data: [{ id, title: "AI map", category: "ai", visibility: "public", created_at: null }] } : { data: [] });
    const result = await searchAdmin(db as never, { q: id, types: ["map", "user"], limit: 5 }, now);
    expect(calls.map((c) => c.table).sort()).toEqual(["learning_maps", "profiles"]);
    for (const call of calls) expect(call.ops[0]).toEqual(["eq", "id", id]);
    expect(result.groups[0].hits[0]).toMatchObject({ href: `/map/${id}`, score: SCORE.id });
  });

  test("an email query only touches tables with an email column", async () => {
    await searchAdmin(db as never, { q: "mint@gmail.com", types: [...SEARCH_TYPES], limit: 5 }, now);
    expect(calls.map((c) => c.table).sort()).toEqual(["expert_profiles", "hackathon_participants", "profiles"]);
  });
});
