import { GUIDE_INDEX } from "@/lib/radar-guides";
import { adminGuidePages, adminPageLabel, reelPlanTakes } from "../admin-pages";

test("lists a code guide's pages in level order, and none for a deck career", () => {
  const pages = adminGuidePages("cybersecurity")!;
  expect(pages.map((p) => p.key)).toEqual(
    [...GUIDE_INDEX.cybersecurity.pages].sort((a, b) => a.order - b.order).map((p) => p.key)
  );
  expect(adminGuidePages("data-scientist")).toBeNull();
  expect(adminGuidePages(null)).toBeNull();
  expect(adminGuidePages("toString")).toBeNull();
});

test("labels pages by level and title, and unknown keys as they are", () => {
  const money = GUIDE_INDEX.cybersecurity.pages.find((p) => p.key === "money")!;
  expect(adminPageLabel("cybersecurity", "money")).toBe(`${money.order}. ${money.titleTh}`);
  expect(adminPageLabel("cybersecurity", "hook")).toBe("hook");
  expect(adminPageLabel("cybersecurity", null)).toBe("");
});

test("hook takes put the hook first", () => {
  expect(reelPlanTakes({ hookTh: "h", variantsTh: ["a", "b"] })).toEqual(["h", "a", "b"]);
  expect(reelPlanTakes(null)).toEqual([]);
});
