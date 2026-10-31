/**
 * Admin maps list: filter param parsing, SQL-side filtering, embedded node
 * counts, and bulk-delete validation and concurrency.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ADMIN_MAPS_MAX_PAGE_SIZE,
  ADMIN_MAPS_PAGE_SIZE,
  BULK_DELETE_MAX,
  adminMapsQueryToParams,
  buildMapSearchFilter,
  bulkDeleteMaps,
  listAdminMaps,
  mapWithConcurrency,
  parseAdminMapsQuery,
  parseBulkDeleteIds,
  toAdminMapRow,
} from "../admin-maps";

const MAP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MAP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CREATOR = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type Call = { table: string; method: string; args: unknown[] };
type Result = { data?: unknown; error?: { code?: string; message: string } | null; count?: number | null };

function fakeClient(results: Record<string, Result[]>) {
  const calls: Call[] = [];
  const queues = Object.fromEntries(Object.entries(results).map(([k, v]) => [k, [...v]]));
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "or", "order", "range", "limit"]) {
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      const next = queues[table]?.shift() ?? {};
      return Promise.resolve({ data: next.data ?? null, error: next.error ?? null, count: next.count ?? null }).then(
        resolve,
        reject,
      );
    };
    return builder;
  };
  return { client: { from } as unknown as SupabaseClient, calls };
}

describe("parseAdminMapsQuery", () => {
  test("defaults", () => {
    expect(parseAdminMapsQuery(new URLSearchParams(""))).toEqual({
      q: "",
      visibility: null,
      difficulty: null,
      page: 1,
      limit: ADMIN_MAPS_PAGE_SIZE,
    });
  });

  test("validates visibility and difficulty", () => {
    expect(parseAdminMapsQuery({ visibility: "team" }).visibility).toBe("team");
    expect(parseAdminMapsQuery({ visibility: "secret" }).visibility).toBeNull();
    expect(parseAdminMapsQuery({ difficulty: "3" }).difficulty).toBe(3);
    expect(parseAdminMapsQuery({ difficulty: "10" }).difficulty).toBe(10);
    expect(parseAdminMapsQuery({ difficulty: "0" }).difficulty).toBeNull();
    expect(parseAdminMapsQuery({ difficulty: "11" }).difficulty).toBeNull();
    expect(parseAdminMapsQuery({ difficulty: "2.5" }).difficulty).toBeNull();
    expect(parseAdminMapsQuery({ difficulty: "all" }).difficulty).toBeNull();
  });

  test("clamps paging and accepts the old search param", () => {
    expect(parseAdminMapsQuery({ page: "0", limit: "999" })).toMatchObject({ page: 1, limit: ADMIN_MAPS_MAX_PAGE_SIZE });
    expect(parseAdminMapsQuery({ search: "  robots  " }).q).toBe("robots");
    expect(parseAdminMapsQuery({ q: "ai", search: "ignored" }).q).toBe("ai");
  });

  test("serialising drops defaults and round-trips", () => {
    expect(adminMapsQueryToParams({ page: 1, limit: ADMIN_MAPS_PAGE_SIZE }).toString()).toBe("");
    const params = adminMapsQueryToParams({ q: "ai", visibility: "private", difficulty: 4, page: 3 });
    expect(params.toString()).toBe("q=ai&visibility=private&difficulty=4&page=3");
    expect(parseAdminMapsQuery(params)).toMatchObject({ q: "ai", visibility: "private", difficulty: 4, page: 3 });
  });
});

describe("buildMapSearchFilter", () => {
  test("searches title, description and category", () => {
    expect(buildMapSearchFilter("robot")).toBe(
      "title.ilike.%robot%,description.ilike.%robot%,category.ilike.%robot%",
    );
  });

  test("adds matching creators as another alternative, valid IDs only", () => {
    expect(buildMapSearchFilter("jane", [CREATOR, CREATOR, "nope"])).toBe(
      `title.ilike.%jane%,description.ilike.%jane%,category.ilike.%jane%,creator_id.in.(${CREATOR})`,
    );
  });

  test("returns null when nothing searchable is left", () => {
    expect(buildMapSearchFilter("%_*", [CREATOR])).toBeNull();
  });
});

describe("listAdminMaps", () => {
  test("filters in SQL and reads node counts from the embedded count", async () => {
    const { client, calls } = fakeClient({
      profiles: [{ data: [{ id: CREATOR }] }],
      learning_maps: [
        {
          data: [
            {
              id: MAP_A,
              title: "AI basics",
              description: null,
              creator_id: CREATOR,
              difficulty: 2,
              category: "ai",
              visibility: "public",
              created_at: "2026-10-01",
              updated_at: "2026-10-02",
              profiles: { username: "jane", full_name: "Jane" },
              map_nodes: [{ count: 7 }],
            },
          ],
          count: 120,
        },
      ],
    });

    const page = await listAdminMaps(client, { q: "jane", visibility: "public", difficulty: 2, page: 3, limit: 50 });

    const mapCalls = calls.filter((c) => c.table === "learning_maps");
    const select = mapCalls.find((c) => c.method === "select");
    expect(String(select?.args[0])).toContain("map_nodes ( count )");
    expect(select?.args[1]).toEqual({ count: "exact" });
    expect(mapCalls).toContainEqual({ table: "learning_maps", method: "eq", args: ["visibility", "public"] });
    expect(mapCalls).toContainEqual({ table: "learning_maps", method: "eq", args: ["difficulty", 2] });
    expect(mapCalls).toContainEqual({ table: "learning_maps", method: "range", args: [100, 149] });
    expect(String(mapCalls.find((c) => c.method === "or")?.args[0])).toContain(`creator_id.in.(${CREATOR})`);
    expect(calls.some((c) => c.table === "map_nodes")).toBe(false);

    expect(page.pagination).toEqual({ page: 3, limit: 50, total: 120, totalPages: 3 });
    expect(page.maps[0]).toMatchObject({ id: MAP_A, creator_name: "Jane", node_count: 7 });
  });

  test("skips the creator lookup without a search", async () => {
    const { client, calls } = fakeClient({ learning_maps: [{ data: [], count: 0 }] });
    await listAdminMaps(client, parseAdminMapsQuery({}));
    expect(calls.some((c) => c.table === "profiles")).toBe(false);
    expect(calls.some((c) => c.method === "or" || c.method === "eq")).toBe(false);
  });

  test("throws on a database error", async () => {
    const { client } = fakeClient({ learning_maps: [{ error: { code: "42501", message: "denied" } }] });
    await expect(listAdminMaps(client, parseAdminMapsQuery({}))).rejects.toThrow("Failed to load maps");
  });

  const orphan = { id: MAP_B, title: "Orphan", creator_id: null, profiles: null, map_nodes: null };

  test("a page past the end (PostgREST 416) is served as the last page with the real total", async () => {
    const { client, calls } = fakeClient({
      learning_maps: [
        // 416 carries no count, so the loader asks for one with the same filters.
        { error: { code: "PGRST103", message: "range" } },
        { count: 140 },
        { data: [orphan], count: 140 },
      ],
    });
    const page = await listAdminMaps(client, { q: "", visibility: "public", difficulty: null, page: 4, limit: 50 });
    expect(page.pagination).toEqual({ page: 3, limit: 50, total: 140, totalPages: 3 });
    expect(page.maps.map((m) => m.id)).toEqual([MAP_B]);
    const selects = calls.filter((c) => c.table === "learning_maps" && c.method === "select");
    expect(selects[1].args).toEqual(["id", { count: "exact", head: true }]);
    expect(calls.filter((c) => c.method === "eq")).toHaveLength(3);
    expect(calls.filter((c) => c.method === "range").map((c) => c.args)).toEqual([[150, 199], [100, 149]]);
  });

  test("a page exactly at the end also falls back to the last page", async () => {
    const { client } = fakeClient({ learning_maps: [{ data: [], count: 100 }, { data: [orphan], count: 100 }] });
    const page = await listAdminMaps(client, { q: "", visibility: null, difficulty: null, page: 3, limit: 50 });
    expect(page.pagination).toEqual({ page: 2, limit: 50, total: 100, totalPages: 2 });
    expect(page.maps).toHaveLength(1);
  });

  test("a page past the end of an empty list is page 1 with nothing on it", async () => {
    const { client } = fakeClient({
      learning_maps: [{ error: { code: "PGRST103", message: "range" } }, { count: 0 }],
    });
    const page = await listAdminMaps(client, { q: "", visibility: null, difficulty: null, page: 2, limit: 50 });
    expect(page).toEqual({ maps: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } });
  });

  test("row mapping tolerates missing joins", () => {
    expect(
      toAdminMapRow({
        id: MAP_B,
        title: "Orphan",
        description: null,
        creator_id: null,
        difficulty: null,
        category: null,
        visibility: "weird",
        created_at: null,
        updated_at: null,
        profiles: null,
        map_nodes: null,
      }),
    ).toMatchObject({ creator_name: "Unknown", node_count: 0, visibility: null });
  });
});

describe("bulk delete", () => {
  test("validates and dedupes IDs", () => {
    expect(parseBulkDeleteIds(null).ok).toBe(false);
    expect(parseBulkDeleteIds({ ids: [] }).ok).toBe(false);
    expect(parseBulkDeleteIds({ ids: [MAP_A, "drop table"] }).ok).toBe(false);
    expect(parseBulkDeleteIds({ ids: [MAP_A, MAP_A.toUpperCase(), MAP_B] })).toEqual({ ok: true, ids: [MAP_A, MAP_B] });
    const tooMany = Array.from({ length: BULK_DELETE_MAX + 1 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    );
    expect(parseBulkDeleteIds({ ids: tooMany }).ok).toBe(false);
  });

  test("never runs more than the limit at once and keeps order", async () => {
    let running = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      if (n === 4) throw new Error("four");
      return n * 10;
    });
    expect(peak).toBe(3);
    expect(results.map((r) => (r.status === "fulfilled" ? r.value : "x"))).toEqual([10, 20, 30, "x", 50, 60, 70]);
  });

  test("summarises deleted and failed maps", async () => {
    const result = await bulkDeleteMaps([MAP_A, MAP_B], async (id) => {
      if (id === MAP_B) throw new Error("Could not delete the map.");
    });
    expect(result).toEqual({ deleted: [MAP_A], failed: [{ id: MAP_B, error: "It may still have linked data" }] });
  });
});
