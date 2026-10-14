import { copyForRoute } from "@/lib/og/copy";

test("top-level fallback labels do not repeat the PASSIONSEED prefix", () => {
  expect(copyForRoute("/careers").label).toBe("EXPLORE");
});

test("admin pages read as team-only workspaces", () => {
  const copy = copyForRoute("/admin/hackathon/teams");
  expect(copy).toMatchObject({ title: "TEAMS", label: "ADMIN / HACKATHON", theme: "dusk" });
  expect(copy.footer).toContain("เฉพาะทีม");
  expect(copyForRoute("/admin/shift/views").title).toBe("PAGE VIEWS");
});

test("round poster studios are titled with the round name", () => {
  expect(copyForRoute("/shift/poster/2").title).toBe("SHIFT[2]");
  expect(copyForRoute("/shift/poster/2/grid").label).toBe("SHIFT / IG GRID");
});
