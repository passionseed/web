import {
  RECENT_PAGES_KEY,
  RECENT_PAGES_LIMIT,
  cleanAdminPath,
  pushRecentPath,
  readRecentPaths,
  recordRecentPath,
} from "../recent-pages";

beforeEach(() => window.localStorage.clear());

describe("recent admin pages", () => {
  it("stores paths only, never queries or non-admin pages", () => {
    expect(cleanAdminPath("/admin/dm-leads?search=somchai#x")).toBe(
      "/admin/dm-leads",
    );
    expect(cleanAdminPath("/me")).toBeNull();
    expect(cleanAdminPath("/administrator")).toBeNull();
    expect(cleanAdminPath("/admin/")).toBe("/admin");
  });

  it("keeps the newest first, unique, and capped", () => {
    let list: string[] = [];
    for (let i = 0; i < RECENT_PAGES_LIMIT + 3; i++)
      list = pushRecentPath(list, `/admin/t${i}`);
    list = pushRecentPath(list, "/admin/t5");
    expect(list[0]).toBe("/admin/t5");
    expect(list).toHaveLength(RECENT_PAGES_LIMIT);
    expect(new Set(list).size).toBe(list.length);
  });

  it("round-trips through localStorage and survives junk", () => {
    recordRecentPath("/admin/line?c=abc");
    recordRecentPath("/admin/users");
    expect(readRecentPaths()).toEqual(["/admin/users", "/admin/line"]);
    expect(window.localStorage.getItem(RECENT_PAGES_KEY)).not.toContain(
      "c=abc",
    );

    window.localStorage.setItem(RECENT_PAGES_KEY, "{not json");
    expect(readRecentPaths()).toEqual([]);
    window.localStorage.setItem(
      RECENT_PAGES_KEY,
      JSON.stringify(["/x", 4, "/admin/maps"]),
    );
    expect(readRecentPaths()).toEqual(["/admin/maps"]);
  });
});
