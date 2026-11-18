jest.mock("server-only", () => ({}));
jest.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { pickFeaturedRadars, type FeaturedRadarRow } from "@/lib/radar/featured";

const row = (slug: string | null, sort_order: number | null, extra: Partial<FeaturedRadarRow> = {}): FeaturedRadarRow => ({
  slug,
  name_th: slug ? `ชื่อ ${slug}` : null,
  tagline_th: null,
  emoji: null,
  sort_order,
  territory: null,
  ...extra,
});

const playable = (slug: string) => slug === "cybersecurity";

test("ranks playable guides, then flagship careers, then hub order", () => {
  const picked = pickFeaturedRadars(
    [row("chef", 1), row("data-scientist", 9), row("ai-engineer", 8), row("cybersecurity", 50)],
    playable
  );
  expect(picked.map((r) => r.slug)).toEqual(["cybersecurity", "ai-engineer", "data-scientist", "chef"]);
  expect(picked[0]).toMatchObject({ playable: true, href: "/radar/cybersecurity" });
});

test("drops rows without a slug or Thai name, duplicates, and territory members", () => {
  const picked = pickFeaturedRadars(
    [
      row(null, 1),
      row("nameless", 2, { name_th: "  " }),
      row("chef", 3),
      row("chef", 4),
      row("member", 5, { territory: { reveal_th: "เผย", is_index: false } }),
    ],
    playable
  );
  expect(picked.map((r) => r.slug)).toEqual(["chef"]);
});

test("keeps at most the limit", () => {
  const rows = Array.from({ length: 10 }, (_, i) => row(`career-${i}`, i));
  expect(pickFeaturedRadars(rows, playable, 3)).toHaveLength(3);
});
