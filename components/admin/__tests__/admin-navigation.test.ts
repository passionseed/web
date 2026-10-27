import fs from "fs";
import path from "path";

import {
  ADMIN_NAV_ENTRIES,
  ADMIN_NAV_GROUPS,
  getActiveAdminItem,
  matchAdminNav,
  tokenize,
} from "../admin-navigation";

const APP_ROOT = path.join(__dirname, "..", "..", "..", "app");

function pageExists(href: string): boolean {
  return fs.existsSync(
    path.join(APP_ROOT, ...href.split("/").filter(Boolean), "page.tsx"),
  );
}

describe("getActiveAdminItem", () => {
  it("selects Tracker only on /admin/shift itself", () => {
    expect(getActiveAdminItem("/admin/shift")?.label).toBe("Tracker");
    for (const sub of [
      "feedback",
      "alumni",
      "views",
      "interest",
      "curriculum",
      "companion",
    ]) {
      expect(getActiveAdminItem(`/admin/shift/${sub}`)?.label).not.toBe(
        "Tracker",
      );
    }
    expect(getActiveAdminItem("/admin/shift/curriculum")).toBeUndefined();
  });

  it("lets the longest matching route win", () => {
    expect(getActiveAdminItem("/admin/dm-leads")?.label).toBe("DM leads");
    expect(getActiveAdminItem("/admin/dm-leads/insights")?.label).toBe(
      "Lead insights",
    );
    expect(getActiveAdminItem("/admin/dm-leads/copilot")?.label).toBe(
      "DM copilot",
    );
    expect(
      getActiveAdminItem("/admin/dm-leads/0b6c3a4e-1d2f-4a5b-9c8d-7e6f5a4b3c2d")
        ?.label,
    ).toBe("DM leads");
    expect(getActiveAdminItem("/admin/hackathon/analytics")?.label).toBe(
      "Traffic and links",
    );
    expect(getActiveAdminItem("/admin/hackathon/teams")?.label).toBe(
      "Hackathon",
    );
    expect(getActiveAdminItem("/admin/shift/rounds/abc/review")?.label).toBe(
      "Rounds",
    );
    expect(getActiveAdminItem("/admin/shift/alumni/board")?.label).toBe(
      "Alumni",
    );
    expect(getActiveAdminItem("/admin/ceo/payments")?.label).toBe("Payments");
  });

  it("keeps Overview exact and ignores trailing slashes and queries", () => {
    expect(getActiveAdminItem("/admin")?.label).toBe("Overview");
    expect(getActiveAdminItem("/admin/")?.label).toBe("Overview");
    expect(getActiveAdminItem("/admin/ceo")).toBeUndefined();
    expect(getActiveAdminItem("/admin/ceo/sync-hackathon-data")).toBeUndefined();
    expect(getActiveAdminItem("/admin/line?c=1")?.label).toBe("LINE inbox");
    expect(getActiveAdminItem("/admin/linear")).toBeUndefined();
  });
});

describe("ADMIN_NAV_GROUPS", () => {
  it("gives every item a unique href and every group a unique id", () => {
    const hrefs = ADMIN_NAV_ENTRIES.map((entry) => entry.item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const ids = ADMIN_NAV_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only links to pages that exist", () => {
    const missing = ADMIN_NAV_ENTRIES.map((entry) => entry.item.href).filter(
      (href) => !pageExists(href),
    );
    expect(missing).toEqual([]);
  });

  it("keeps daily work expanded by default", () => {
    const daily = ADMIN_NAV_GROUPS.filter((group) => group.defaultOpen).map(
      (g) => g.label,
    );
    expect(daily).toEqual(["Workspace", "SHIFT"]);
  });

  it("has no em dashes in labels or descriptions", () => {
    for (const { item } of ADMIN_NAV_ENTRIES) {
      expect(`${item.label} ${item.description}`).not.toMatch(/—/);
    }
  });
});

describe("matchAdminNav", () => {
  const labels = (query: string) =>
    matchAdminNav(query).map((entry) => entry.item.label);

  it("matches word prefixes across label, keywords, description and group", () => {
    expect(labels("line")[0]).toBe("LINE inbox");
    expect(labels("dm lea")[0]).toBe("DM leads");
    expect(labels("slips")).toEqual(
      expect.arrayContaining(["LINE inbox", "Trials"]),
    );
    expect(labels("shift app")[0]).toBe("Applications");
  });

  it("ranks label prefixes above description hits", () => {
    const hits = labels("rounds");
    expect(hits[0]).toBe("Rounds");
    expect(labels("payment")[0]).toBe("Payments");
  });

  it("finds the payment ledger by what it is for", () => {
    expect(labels("revenue")).toEqual(["Payments"]);
    expect(
      ADMIN_NAV_GROUPS.find((group) => group.id === "insights")?.items.map(
        (item) => item.href,
      ),
    ).toContain("/admin/ceo/payments");
  });

  it("returns nothing for words that start no word", () => {
    expect(labels("ads")).toEqual([]);
    expect(labels("   ")).toEqual([]);
  });

  it("keeps Thai marks inside words", () => {
    expect(tokenize("สวัสดี ครับ")).toEqual(["สวัสดี", "ครับ"]);
  });
});
