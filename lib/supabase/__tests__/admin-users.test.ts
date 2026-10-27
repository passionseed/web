/**
 * Admin user directory: query parsing, ILIKE-safe search, pagination maths,
 * the self-demotion guard, and the order of writes in a primary-role switch.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ADMIN_USERS_MAX_PAGE_SIZE,
  ADMIN_USERS_PAGE_SIZE,
  SELF_DEMOTION_ERROR,
  adminUsersQueryToParams,
  applyRoleChange,
  buildUserSearchFilter,
  canRemoveAdminRole,
  listAdminUsers,
  pageRange,
  parseAdminUsersQuery,
  parseProfileUpdate,
  parseRoleChangeRequest,
  profileEditDetails,
  planPrimaryRoleChange,
  roleChangeGuard,
  searchTokens,
  totalPages,
} from "../admin-users";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

// ---------------------------------------------------------------------------
// A tiny fake of the PostgREST builder: records every call per table and
// resolves with whatever the test queued for that table.
// ---------------------------------------------------------------------------

type Call = { table: string; method: string; args: unknown[] };
type Result = { data?: unknown; error?: { code?: string; message: string } | null; count?: number | null };

function fakeClient(results: Record<string, Result[]>) {
  const calls: Call[] = [];
  const queues = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, [...v]]));

  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    const chain = (method: string) =>
      (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    for (const method of ["select", "insert", "delete", "update", "eq", "neq", "in", "or", "order", "range", "limit"]) {
      builder[method] = chain(method);
    }
    const settle = () => {
      const next = queues[table]?.shift() ?? { data: null, error: null };
      return { data: next.data ?? null, error: next.error ?? null, count: next.count ?? null };
    };
    builder.maybeSingle = () => {
      calls.push({ table, method: "maybeSingle", args: [] });
      return Promise.resolve(settle());
    };
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(settle()).then(resolve, reject);
    return builder;
  };

  return { client: { from } as unknown as SupabaseClient, calls };
}

describe("parseAdminUsersQuery", () => {
  test("falls back to defaults for missing or junk params", () => {
    expect(parseAdminUsersQuery(new URLSearchParams(""))).toEqual({
      q: "",
      role: null,
      page: 1,
      pageSize: ADMIN_USERS_PAGE_SIZE,
      sort: "newest",
      id: null,
    });
    const junk = parseAdminUsersQuery(
      new URLSearchParams("page=-3&pageSize=abc&role=superuser&sort=sideways&id=not-a-uuid"),
    );
    expect(junk).toMatchObject({ page: 1, pageSize: ADMIN_USERS_PAGE_SIZE, role: null, sort: "newest", id: null });
  });

  test("accepts every real role, including admin", () => {
    expect(parseAdminUsersQuery(new URLSearchParams("role=admin")).role).toBe("admin");
    expect(parseAdminUsersQuery(new URLSearchParams("role=TA")).role).toBe("TA");
    expect(parseAdminUsersQuery(new URLSearchParams("role=passion-seed-team")).role).toBe("passion-seed-team");
  });

  test("caps the page size and normalises the search", () => {
    const query = parseAdminUsersQuery({ q: "  jane    doe  ", pageSize: "5000", page: "3", sort: "oldest" });
    expect(query).toMatchObject({ q: "jane doe", pageSize: ADMIN_USERS_MAX_PAGE_SIZE, page: 3, sort: "oldest" });
    expect(parseAdminUsersQuery({ q: "x".repeat(500) }).q).toHaveLength(100);
  });

  test("keeps a valid id, lower-cased", () => {
    expect(parseAdminUsersQuery({ id: ADMIN_ID.toUpperCase() }).id).toBe(ADMIN_ID);
  });

  test("serialising drops defaults and round-trips", () => {
    expect(adminUsersQueryToParams({ q: "", page: 1, sort: "newest", pageSize: ADMIN_USERS_PAGE_SIZE }).toString()).toBe("");
    const params = adminUsersQueryToParams({ q: "jane", role: "admin", page: 2, sort: "oldest", id: OTHER_ID });
    expect(parseAdminUsersQuery(params)).toMatchObject({ q: "jane", role: "admin", page: 2, sort: "oldest", id: OTHER_ID });
    expect(adminUsersQueryToParams({ id: OTHER_ID }, { includeId: false }).has("id")).toBe(false);
  });
});

describe("search escaping", () => {
  test("wildcards and filter syntax become separators, never pattern characters", () => {
    expect(searchTokens("100%")).toEqual(["100"]);
    expect(searchTokens("jane_doe")).toEqual(["jane", "doe"]);
    expect(searchTokens("a*b")).toEqual(["a", "b"]);
    expect(searchTokens('x,role.eq.admin)or(id.neq."')).toEqual(["x", "role.eq.admin", "or", "id.neq."]);
    expect(searchTokens("back\\slash")).toEqual(["back", "slash"]);
    expect(searchTokens("%%%___***")).toEqual([]);
  });

  test("dedupes, lower-cases and caps tokens", () => {
    expect(searchTokens("Jane JANE jane")).toEqual(["jane"]);
    expect(searchTokens("a b c d e f g")).toHaveLength(5);
  });

  test("keeps email and Thai text intact", () => {
    expect(searchTokens("Jane.Doe+test@Gmail.com")).toEqual(["jane.doe+test@gmail.com"]);
    expect(searchTokens("สมชาย ใจดี")).toEqual(["สมชาย", "ใจดี"]);
  });

  test("one token searches username, full name and email", () => {
    expect(buildUserSearchFilter("jane")).toBe(
      "username.ilike.%jane%,full_name.ilike.%jane%,email.ilike.%jane%",
    );
  });

  test("several tokens must each match some column", () => {
    expect(buildUserSearchFilter("jane doe")).toBe(
      "and(or(username.ilike.%jane%,full_name.ilike.%jane%,email.ilike.%jane%)," +
        "or(username.ilike.%doe%,full_name.ilike.%doe%,email.ilike.%doe%))",
    );
  });

  test("an empty or wildcard-only search adds no filter", () => {
    expect(buildUserSearchFilter("")).toBeNull();
    expect(buildUserSearchFilter("  %_*  ")).toBeNull();
  });

  test("no output ever contains a raw quote, comma inside a value, or a bracket from input", () => {
    const filter = buildUserSearchFilter('evil"),id.eq.1,(x') ?? "";
    expect(filter).not.toContain('"');
    // The only commas and brackets are the ones the builder wrote itself.
    expect(filter.startsWith("and(or(")).toBe(true);
  });
});

describe("pagination maths", () => {
  test("pageRange returns an inclusive range", () => {
    expect(pageRange(1, 25)).toEqual({ from: 0, to: 24 });
    expect(pageRange(3, 25)).toEqual({ from: 50, to: 74 });
    expect(pageRange(0, 25)).toEqual({ from: 0, to: 24 });
  });

  test("totalPages rounds up and handles empty lists", () => {
    expect(totalPages(0, 25)).toBe(0);
    expect(totalPages(1, 25)).toBe(1);
    expect(totalPages(25, 25)).toBe(1);
    expect(totalPages(26, 25)).toBe(2);
    expect(totalPages(1001, 25)).toBe(41);
  });
});

describe("listAdminUsers", () => {
  test("filters, sorts and pages in SQL, then reads roles for the page only", async () => {
    const { client, calls } = fakeClient({
      profiles: [
        {
          data: [
            { id: ADMIN_ID, username: "boss", full_name: "Boss", email: "b@x.org", avatar_url: null, discord_uid: null, created_at: "2026-01-01" },
            { id: OTHER_ID, username: "kid", full_name: null, email: null, avatar_url: null, discord_uid: null, created_at: "2026-02-01" },
          ],
          count: 60,
        },
      ],
      user_roles: [
        { data: [{ user_id: ADMIN_ID, role: "student" }, { user_id: ADMIN_ID, role: "admin" }, { user_id: ADMIN_ID, role: "bogus" }] },
      ],
    });

    const page = await listAdminUsers(client, {
      q: "bo",
      role: "admin",
      page: 2,
      pageSize: 25,
      sort: "oldest",
      id: null,
    });

    const profileCalls = calls.filter((c) => c.table === "profiles");
    expect(profileCalls.find((c) => c.method === "select")?.args[0]).toContain("user_roles!inner(role)");
    expect(profileCalls.find((c) => c.method === "select")?.args[1]).toEqual({ count: "exact" });
    expect(profileCalls).toContainEqual({ table: "profiles", method: "eq", args: ["user_roles.role", "admin"] });
    expect(profileCalls).toContainEqual({
      table: "profiles",
      method: "or",
      args: ["username.ilike.%bo%,full_name.ilike.%bo%,email.ilike.%bo%"],
    });
    expect(profileCalls).toContainEqual({ table: "profiles", method: "range", args: [25, 49] });
    expect(profileCalls.find((c) => c.method === "order")?.args).toEqual([
      "created_at",
      { ascending: true, nullsFirst: false },
    ]);

    const roleCalls = calls.filter((c) => c.table === "user_roles");
    expect(roleCalls).toContainEqual({ table: "user_roles", method: "in", args: ["user_id", [ADMIN_ID, OTHER_ID]] });

    expect(page.total).toBe(60);
    expect(page.totalPages).toBe(3);
    expect(page.users[0].roles).toEqual(["student", "admin"]);
    expect(page.users[1].roles).toEqual([]);
  });

  test("without a role filter there is no inner join", async () => {
    const { client, calls } = fakeClient({ profiles: [{ data: [], count: 0 }] });
    const page = await listAdminUsers(client, parseAdminUsersQuery(new URLSearchParams("")));
    expect(calls.find((c) => c.table === "profiles" && c.method === "select")?.args[0]).not.toContain("!inner");
    expect(calls.some((c) => c.method === "or")).toBe(false);
    expect(calls.some((c) => c.table === "user_roles")).toBe(false);
    expect(page).toMatchObject({ users: [], total: 0, totalPages: 0 });
  });

  test("throws on a database error instead of returning an empty list", async () => {
    const { client } = fakeClient({ profiles: [{ error: { code: "42501", message: "denied" } }] });
    await expect(listAdminUsers(client, parseAdminUsersQuery({}))).rejects.toThrow("Failed to load users");
  });

  const kid = { id: OTHER_ID, username: "kid", full_name: null, email: null, avatar_url: null, discord_uid: null, created_at: "2026-02-01" };

  test("a page past the end (PostgREST 416) is served as the last page with the real total", async () => {
    const { client, calls } = fakeClient({
      profiles: [
        // 416 carries no count, so the loader asks for one with the same filters.
        { error: { code: "PGRST103", message: "range" } },
        { count: 30 },
        { data: [kid], count: 30 },
      ],
    });
    const page = await listAdminUsers(client, parseAdminUsersQuery({ page: "9", role: "admin" }));
    expect(page).toMatchObject({ total: 30, totalPages: 2, page: 2 });
    expect(page.users.map((u) => u.id)).toEqual([OTHER_ID]);
    const selects = calls.filter((c) => c.table === "profiles" && c.method === "select");
    expect(selects[1].args).toEqual(["id, user_roles!inner(role)", { count: "exact", head: true }]);
    expect(calls.filter((c) => c.table === "profiles" && c.method === "eq")).toHaveLength(3);
    expect(calls.filter((c) => c.method === "range").map((c) => c.args)).toEqual([[200, 224], [25, 49]]);
  });

  test("a page exactly at the end also falls back to the last page", async () => {
    const { client } = fakeClient({ profiles: [{ data: [], count: 50 }, { data: [kid], count: 50 }] });
    const page = await listAdminUsers(client, parseAdminUsersQuery({ page: "3" }));
    expect(page).toMatchObject({ total: 50, totalPages: 2, page: 2 });
    expect(page.users).toHaveLength(1);
  });

  test("a page past the end of an empty list is page 1 with nothing on it", async () => {
    const { client } = fakeClient({ profiles: [{ error: { code: "PGRST103", message: "range" } }, { count: 0 }] });
    const page = await listAdminUsers(client, parseAdminUsersQuery({ page: "4" }));
    expect(page).toMatchObject({ users: [], total: 0, totalPages: 0, page: 1 });
  });
});

describe("self-demotion guard", () => {
  test("blocks removing your own admin role", () => {
    expect(roleChangeGuard(ADMIN_ID, { userId: ADMIN_ID, role: "admin", action: "remove" })).toBe(SELF_DEMOTION_ERROR);
    expect(
      roleChangeGuard(ADMIN_ID.toUpperCase(), { userId: ADMIN_ID, role: "admin", action: "remove" }),
    ).toBe(SELF_DEMOTION_ERROR);
  });

  test("allows every other change", () => {
    expect(roleChangeGuard(ADMIN_ID, { userId: OTHER_ID, role: "admin", action: "remove" })).toBeNull();
    expect(roleChangeGuard(ADMIN_ID, { userId: ADMIN_ID, role: "beta-tester", action: "remove" })).toBeNull();
    expect(roleChangeGuard(ADMIN_ID, { userId: ADMIN_ID, role: "admin", action: "add" })).toBeNull();
    expect(roleChangeGuard(ADMIN_ID, { userId: ADMIN_ID, role: "student", action: "set_primary" })).toBeNull();
  });

  test("the client mirror agrees", () => {
    expect(canRemoveAdminRole(ADMIN_ID, ADMIN_ID)).toBe(false);
    expect(canRemoveAdminRole(ADMIN_ID, OTHER_ID)).toBe(true);
    expect(canRemoveAdminRole(null, OTHER_ID)).toBe(false);
  });
});

describe("parseRoleChangeRequest", () => {
  test("validates ids, roles and actions", () => {
    expect(parseRoleChangeRequest(null)).toEqual({ ok: false, error: "Missing request body" });
    expect(parseRoleChangeRequest({ userId: "x", role: "admin", action: "add" })).toEqual({ ok: false, error: "Invalid user ID" });
    expect(parseRoleChangeRequest({ userId: OTHER_ID, role: "owner", action: "add" })).toEqual({ ok: false, error: "Invalid role" });
    expect(parseRoleChangeRequest({ userId: OTHER_ID, role: "admin", action: "toggle" }).ok).toBe(false);
    expect(parseRoleChangeRequest({ userId: OTHER_ID, role: "admin", action: "set_primary" }).ok).toBe(false);
    expect(parseRoleChangeRequest({ userId: OTHER_ID, role: "TA", action: "set_primary" })).toEqual({
      ok: true,
      value: { userId: OTHER_ID, role: "TA", action: "set_primary" },
    });
  });
});

describe("primary role switch", () => {
  test("plans an add before removing the others", () => {
    expect(planPrimaryRoleChange(["student", "beta-tester"], "instructor")).toEqual({ add: "instructor", remove: ["student"] });
    expect(planPrimaryRoleChange(["student", "TA"], "TA")).toEqual({ add: null, remove: ["student"] });
    expect(planPrimaryRoleChange(["admin"], "student")).toEqual({ add: "student", remove: [] });
  });

  test("inserts the new role before deleting the old one", async () => {
    const { client, calls } = fakeClient({
      user_roles: [{ data: [{ role: "student" }, { role: "admin" }] }, { error: null }, { error: null }],
    });
    const result = await applyRoleChange(client, { userId: OTHER_ID, role: "instructor", action: "set_primary" });
    const writes = calls.filter((c) => c.method === "insert" || c.method === "delete").map((c) => c.method);
    expect(writes).toEqual(["insert", "delete"]);
    expect(calls).toContainEqual({ table: "user_roles", method: "in", args: ["role", ["student"]] });
    expect(result).toEqual({ status: "ok", message: "Primary role set to Instructor", added: ["instructor"], removed: ["student"] });
  });

  test("a failed add changes nothing", async () => {
    const { client, calls } = fakeClient({
      user_roles: [{ data: [{ role: "student" }] }, { error: { code: "XX000", message: "boom" } }],
    });
    const result = await applyRoleChange(client, { userId: OTHER_ID, role: "TA", action: "set_primary" });
    expect(result).toMatchObject({ status: "error", httpStatus: 500 });
    expect(calls.some((c) => c.method === "delete")).toBe(false);
  });

  test("a failed removal reports a partial change", async () => {
    const { client } = fakeClient({
      user_roles: [{ data: [{ role: "student" }] }, { error: null }, { error: { code: "XX000", message: "boom" } }],
    });
    const result = await applyRoleChange(client, { userId: OTHER_ID, role: "TA", action: "set_primary" });
    expect(result).toMatchObject({ status: "partial", added: ["TA"], failed: ["student"] });
    if (result.status === "partial") expect(result.message).toContain("could not be removed");
  });

  test("adding a role the user already has is not an error", async () => {
    const { client } = fakeClient({ user_roles: [{ error: { code: "23505", message: "dup" } }] });
    const result = await applyRoleChange(client, { userId: OTHER_ID, role: "beta-tester", action: "add" });
    expect(result).toMatchObject({ status: "ok", added: [] });
  });

  test("an unknown user is a 404", async () => {
    const { client } = fakeClient({ user_roles: [{ error: { code: "23503", message: "fk" } }] });
    const result = await applyRoleChange(client, { userId: OTHER_ID, role: "admin", action: "add" });
    expect(result).toEqual({ status: "error", httpStatus: 404, message: "User not found" });
  });
});

describe("parseProfileUpdate", () => {
  test("rejects an empty username but allows clearing optional fields", () => {
    expect(parseProfileUpdate({ userId: OTHER_ID, username: "  " })).toEqual({ ok: false, error: "Username cannot be empty" });
    expect(parseProfileUpdate({ userId: OTHER_ID, username: " kid ", full_name: "", discord_uid: "" })).toEqual({
      ok: true,
      userId: OTHER_ID,
      update: { username: "kid", full_name: null, discord_uid: null },
    });
    expect(parseProfileUpdate({ userId: "nope" }).ok).toBe(false);
  });
});

describe("profileEditDetails", () => {
  const before = { username: "kid", full_name: "Somchai Jaidee", discord_uid: "111" };

  test("lists changed fields, keeps handles and Discord IDs, never full names", () => {
    expect(profileEditDetails(before, { username: "kid2", full_name: "New Name", discord_uid: "222" })).toEqual({
      fields: ["username", "full_name", "discord_uid"],
      username: { from: "kid", to: "kid2" },
      discord_uid: { from: "111", to: "222" },
    });
    expect(JSON.stringify(profileEditDetails(before, { full_name: "New Name" }))).not.toMatch(/Somchai|New Name/);
  });

  test("records clearing a value, and nothing when nothing changed", () => {
    expect(profileEditDetails(before, { discord_uid: null })).toEqual({
      fields: ["discord_uid"],
      discord_uid: { from: "111", to: null },
    });
    expect(profileEditDetails(before, { username: "kid", discord_uid: "111" })).toBeNull();
    expect(profileEditDetails(null, { discord_uid: "9" })).toEqual({
      fields: ["discord_uid"],
      discord_uid: { from: null, to: "9" },
    });
  });
});
