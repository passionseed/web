import fs from "fs";
import path from "path";

import {
  ADMIN_PAGE_PATTERNS,
  describeAdminPath,
  getAdminBreadcrumbs,
  isIdSegment,
  isKnownAdminPage,
} from "../breadcrumbs";

const APP_ROOT = path.join(__dirname, "..", "..", "..", "..", "app");
const ROUND = "5f0c2a7e-8b1d-4c3e-9a2f-6d7e8f9a0b1c";
const ENTRY = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

const labels = (pathname: string) =>
  getAdminBreadcrumbs(pathname).map((c) => c.label);

describe("getAdminBreadcrumbs", () => {
  it("shows Overview on the admin root", () => {
    expect(getAdminBreadcrumbs("/admin")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Overview" },
    ]);
  });

  it("names the tool and its readable sub-page", () => {
    expect(getAdminBreadcrumbs(`/admin/shift/rounds/${ROUND}/review`)).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Rounds", href: "/admin/shift/rounds" },
      { label: "Round", href: `/admin/shift/rounds/${ROUND}` },
      { label: "Review" },
    ]);
  });

  it("replaces record IDs with short labels, never the raw ID", () => {
    const trail = labels(`/admin/shift/rounds/${ROUND}/entrants/${ENTRY}`);
    expect(trail).toEqual(["Admin", "Rounds", "Round", "Entrants", "Entrant"]);
    expect(trail.join(" ")).not.toContain(ROUND);
    expect(labels(`/admin/dm-leads/${ROUND}`)).toEqual([
      "Admin",
      "DM leads",
      "Lead",
    ]);
  });

  it("does not show Tracker for other SHIFT pages", () => {
    expect(labels("/admin/shift/feedback")).toEqual(["Admin", "Feedback"]);
    expect(labels("/admin/shift/curriculum")).toEqual([
      "Admin",
      "SHIFT",
      "Curriculum",
    ]);
  });

  it("falls back to readable segments for routes outside the nav", () => {
    expect(getAdminBreadcrumbs("/admin/ceo")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "CEO dashboard" },
    ]);
    expect(getAdminBreadcrumbs("/admin/ceo/sync-hackathon-data")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "CEO dashboard", href: "/admin/ceo" },
      { label: "Sync hackathon data" },
    ]);
    expect(labels("/admin/team-matching-simulator")).toEqual([
      "Admin",
      "Team matching simulator",
    ]);
    expect(labels("/admin/no-such-tool")).toEqual(["Admin", "No such tool"]);
  });

  it("puts the payment ledger under its nav item", () => {
    expect(getAdminBreadcrumbs("/admin/ceo/payments")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Payments" },
    ]);
  });

  it("uses the page title where the slug says less", () => {
    expect(getAdminBreadcrumbs("/admin/archive/ai")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Archive", href: "/admin/archive" },
      { label: "AI agents" },
    ]);
    expect(getAdminBreadcrumbs("/admin/hackathon/learning")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Hackathon", href: "/admin/hackathon" },
      { label: "Learning analytics" },
    ]);
    expect(getAdminBreadcrumbs("/admin/hackathon/activities/editor")).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Hackathon", href: "/admin/hackathon" },
      { label: "Activities", href: "/admin/hackathon/activities" },
      { label: "Activity editor" },
    ]);
  });

  it("drops page-less segments from the university example-map trail", () => {
    expect(
      getAdminBreadcrumbs(
        `/admin/archive/universities/${ROUND}/example-maps/${ENTRY}`,
      ),
    ).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Archive", href: "/admin/archive" },
      { label: "Universities", href: "/admin/archive/universities" },
      { label: "Edit example map" },
    ]);
    expect(
      labels(`/admin/archive/universities/${ROUND}/example-maps/create`),
    ).toEqual(["Admin", "Archive", "Universities", "New example map"]);
    expect(labels(`/admin/archive/universities/${ROUND}`)).toEqual([
      "Admin",
      "Archive",
      "Universities",
      "University",
    ]);
  });

  it("only links crumbs that have a page", () => {
    const trail = getAdminBreadcrumbs(
      `/admin/hackathon/activities/${ROUND}/clusters`,
    );
    expect(trail).toEqual([
      { label: "Admin", href: "/admin" },
      { label: "Hackathon", href: "/admin/hackathon" },
      { label: "Activities", href: "/admin/hackathon/activities" },
      { label: "Activity" },
      { label: "Clusters" },
    ]);
  });
});

describe("helpers", () => {
  it("spots record IDs but not slugs", () => {
    expect(isIdSegment(ROUND)).toBe(true);
    expect(isIdSegment("42")).toBe(true);
    expect(isIdSegment("sync-hackathon-data")).toBe(false);
    expect(isIdSegment("review")).toBe(false);
  });

  it("matches dynamic page patterns", () => {
    expect(isKnownAdminPage(`/admin/shift/rounds/${ROUND}/squads`)).toBe(true);
    expect(isKnownAdminPage(`/admin/shift/rounds/${ROUND}/nope`)).toBe(false);
    expect(isKnownAdminPage(`/admin/archive/universities/${ROUND}`)).toBe(
      false,
    );
  });

  it("describes a path for the recent list", () => {
    expect(describeAdminPath("/admin/line")).toEqual({
      label: "LINE inbox",
      context: "Workspace",
    });
    expect(describeAdminPath(`/admin/shift/rounds/${ROUND}/review`)).toEqual({
      label: "Review",
      context: "Rounds / Round",
    });
    expect(describeAdminPath("/admin/ceo/payments")).toEqual({
      label: "Payments",
      context: "Insights",
    });
    expect(describeAdminPath("/admin/hackathon/activities/editor")).toEqual({
      label: "Activity editor",
      context: "Hackathon / Activities",
    });
  });

  it("lists only patterns that still have a page.tsx", () => {
    const missing = ADMIN_PAGE_PATTERNS.filter(
      (pattern) =>
        !fs.existsSync(
          path.join(
            APP_ROOT,
            ...pattern.split("/").filter(Boolean),
            "page.tsx",
          ),
        ),
    );
    expect(missing).toEqual([]);
  });
});
