import {
  ADMIN_SHIFT_APPLICATION_COLUMNS,
  ADMIN_SHIFT_APPLICATION_SELECT,
  bulkTargets,
  hasActiveFilters,
  matchesApplicationSearch,
  parseShiftApplicationsView,
  shiftApplicationsHref,
  shiftApplicationsQuery,
  toAdminShiftApplication,
  visibleApplications,
  type AdminShiftApplication,
} from "@/lib/admin/queue-tools/shift-applications";
import type { ShiftApplicationRow } from "@/types/shift";

const ID = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";
const DEFAULTS = { defaultCohort: "SHIFT[3]", cohorts: ["SHIFT[1]", "SHIFT[2]", "SHIFT[3]"] };

function app(overrides: Partial<AdminShiftApplication>): AdminShiftApplication {
  return {
    id: ID,
    cohort: "SHIFT[3]",
    full_name: "Somchai Jaidee",
    nickname: "Chai",
    grade: "m5",
    target_track: null,
    problem: "Problem",
    availability: "all_days",
    ig_handle: "chai",
    discord_handle: null,
    parent_contact: "081",
    parent_email: null,
    consent: true,
    birth_date: null,
    consent_notice_version: null,
    parent_email_sent_at: null,
    parent_name: null,
    parent_relationship: null,
    parent_consented_at: null,
    parent_declined_at: null,
    parent_withdrawn_at: null,
    parent_consent_ip: null,
    parent_ai_consented_at: null,
    source: null,
    found_via: null,
    status: "new",
    paid_at: null,
    admin_note: null,
    discord_username: null,
    linked_at: null,
    discord_joined_at: null,
    discord_error: null,
    created_at: "2026-10-20T10:00:00Z",
    ...overrides,
  };
}

describe("parseShiftApplicationsView", () => {
  it("opens the default cohort with no filters", () => {
    expect(parseShiftApplicationsView({}, DEFAULTS)).toEqual({
      cohort: "SHIFT[3]",
      status: "all",
      paid: "all",
      q: "",
      sort: "newest",
      id: null,
    });
  });

  it("reads every param from a queue link", () => {
    const params = new URLSearchParams(
      `cohort=${encodeURIComponent("SHIFT[2]")}&status=accepted&paid=unpaid&q=%20chai%20&sort=name&id=${ID}`,
    );
    expect(parseShiftApplicationsView(params, DEFAULTS)).toEqual({
      cohort: "SHIFT[2]",
      status: "accepted",
      paid: "unpaid",
      q: "chai",
      sort: "name",
      id: ID,
    });
  });

  it("falls back on unknown values instead of trusting the URL", () => {
    const view = parseShiftApplicationsView(
      { cohort: "SHIFT[99]", status: "hacked", paid: "maybe", sort: "random", id: "nope" },
      DEFAULTS,
    );
    expect(view).toMatchObject({ cohort: "SHIFT[3]", status: "all", paid: "all", sort: "newest", id: null });
  });
});

describe("URL writing", () => {
  it("leaves defaults out, including the default cohort", () => {
    const view = parseShiftApplicationsView({}, DEFAULTS);
    expect(shiftApplicationsQuery(view, DEFAULTS.defaultCohort)).toBe("");
    expect(shiftApplicationsQuery({ ...view, status: "new" }, DEFAULTS.defaultCohort)).toBe("status=new");
    expect(shiftApplicationsQuery({ ...view, cohort: "SHIFT[1]" }, DEFAULTS.defaultCohort)).toBe(
      "cohort=SHIFT%5B1%5D",
    );
  });

  it("round-trips through the parser", () => {
    const view = {
      cohort: "SHIFT[2]",
      status: "waitlist" as const,
      paid: "paid" as const,
      q: "ploy",
      sort: "oldest" as const,
      id: ID,
    };
    const query = shiftApplicationsQuery(view, DEFAULTS.defaultCohort);
    expect(parseShiftApplicationsView(new URLSearchParams(query), DEFAULTS)).toEqual(view);
  });

  it("builds deep links for the overview and the palette", () => {
    expect(shiftApplicationsHref({ status: "new" })).toBe("/admin/shift/applications?status=new");
    expect(shiftApplicationsHref({ id: ID })).toBe(`/admin/shift/applications?id=${ID}`);
    expect(shiftApplicationsHref({ status: "all", paid: "all", sort: "newest" })).toBe(
      "/admin/shift/applications",
    );
  });

  it("knows when filters are on", () => {
    const view = parseShiftApplicationsView({}, DEFAULTS);
    expect(hasActiveFilters(view)).toBe(false);
    expect(hasActiveFilters({ ...view, sort: "name" })).toBe(false);
    expect(hasActiveFilters({ ...view, paid: "unpaid" })).toBe(true);
  });
});

describe("filtering", () => {
  const rows = [
    app({ id: "a", nickname: "Beam", status: "new", created_at: "2026-10-21T00:00:00Z" }),
    app({ id: "b", nickname: "Aom", status: "accepted", paid_at: "2026-10-22T00:00:00Z", created_at: "2026-10-20T00:00:00Z" }),
    app({ id: "c", nickname: "Cake", status: "accepted", created_at: "2026-10-22T00:00:00Z", ig_handle: "cake.ig" }),
  ];

  it("applies status, paid, search, and sort together", () => {
    const base = { status: "all" as const, paid: "all" as const, q: "", sort: "newest" as const };
    expect(visibleApplications(rows, base).map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(visibleApplications(rows, { ...base, status: "accepted", paid: "unpaid" }).map((r) => r.id)).toEqual(["c"]);
    expect(visibleApplications(rows, { ...base, sort: "name" }).map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(visibleApplications(rows, { ...base, q: "@CAKE" }).map((r) => r.id)).toEqual(["c"]);
  });

  it("lists paid seats that have not joined Discord", () => {
    const base = { status: "all" as const, paid: "not_in_discord" as const, q: "", sort: "newest" as const };
    const withJoined = [
      ...rows,
      app({ id: "d", paid_at: "2026-10-22T00:00:00Z", discord_joined_at: "2026-10-23T00:00:00Z" }),
    ];
    expect(visibleApplications(withJoined, base).map((r) => r.id)).toEqual(["b"]);
    expect(parseShiftApplicationsView({ paid: "not_in_discord" }, DEFAULTS).paid).toBe("not_in_discord");
  });

  it("searches handles and contacts, ignoring a leading @", () => {
    expect(matchesApplicationSearch(app({ discord_username: "chai_dev" }), "@chai_dev")).toBe(true);
    expect(matchesApplicationSearch(app({}), "nobody")).toBe(false);
    expect(matchesApplicationSearch(app({}), "   ")).toBe(true);
  });

  it("only targets rows a bulk action would change", () => {
    expect(bulkTargets(rows, "accept").map((r) => r.id)).toEqual(["a"]);
    expect(bulkTargets(rows, "paid").map((r) => r.id)).toEqual(["a", "c"]);
  });
});

describe("browser-safe row", () => {
  it("never selects or copies the join token", () => {
    expect(ADMIN_SHIFT_APPLICATION_COLUMNS).not.toContain("join_token");
    expect(ADMIN_SHIFT_APPLICATION_SELECT).not.toMatch(/join_token|\*/);

    const full = {
      ...app({}),
      join_token: "secret-token",
      parent_token_hash: "secret-hash",
      parent_consent_user_agent: null,
      parent_ai_notice_version: null,
      user_id: "u",
      discord_user_id: "d",
      updated_at: "2026-10-20T10:00:00Z",
    } satisfies ShiftApplicationRow;
    const safe = toAdminShiftApplication(full);
    expect(safe).not.toHaveProperty("join_token");
    expect(safe).not.toHaveProperty("parent_token_hash");
    expect(Object.keys(safe).sort()).toEqual([...ADMIN_SHIFT_APPLICATION_COLUMNS].sort());
  });
});
