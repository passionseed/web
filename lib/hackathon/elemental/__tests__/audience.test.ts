import { ageBucket, summarizeAudience, type AudienceRow } from "../audience";

const row = (patch: Partial<AudienceRow> = {}): AudienceRow => ({
  status: "paid",
  source: null,
  heardFrom: null,
  ages: [16],
  ...patch,
});

describe("ageBucket", () => {
  it("groups the edges and keeps 15 to 18 as they are", () => {
    expect(ageBucket(12)).toBe("14 or under");
    expect(ageBucket(14)).toBe("14 or under");
    expect(ageBucket(15)).toBe("15");
    expect(ageBucket(18)).toBe("18");
    expect(ageBucket(19)).toBe("19 or over");
    expect(ageBucket(30)).toBe("19 or over");
  });
});

describe("summarizeAudience", () => {
  it("leaves cancelled sign-ups out", () => {
    const s = summarizeAudience([row(), row({ status: "cancelled" })]);
    expect(s.signups).toBe(1);
    expect(s.people).toBe(1);
  });

  it("counts every person's age, shares add up to 1, and buckets stay in age order", () => {
    const s = summarizeAudience([row({ ages: [17, 16] }), row({ ages: [16] }), row({ ages: [20] })]);
    expect(s.ages.map((a) => [a.label, a.value])).toEqual([["16", 2], ["17", 1], ["19 or over", 1]]);
    expect(s.ages.reduce((n, a) => n + a.share, 0)).toBeCloseTo(1);
    expect(s.people).toBe(4);
  });

  it("labels where they saw the post, and keeps earlier sign-ups as their own slice", () => {
    const s = summarizeAudience([
      row({ heardFrom: "camp_hub" }),
      row({ heardFrom: "passion_seed" }),
      row({ heardFrom: "passion_seed" }),
      row(),
    ]);
    expect(s.heardFrom.map((h) => [h.label, h.value])).toEqual([
      ["Passion Seed", 2],
      ["Camp Hub", 1],
      ["Signed up before the question", 1],
    ]);
  });

  it("counts people without a tracked link as direct, most common first", () => {
    const s = summarizeAudience([row({ source: "ig" }), row(), row(), row({ source: "poster" })]);
    expect(s.sources[0]).toMatchObject({ label: "direct", value: 2 });
  });

  it("folds the smallest slices into Other past seven", () => {
    const rows = Array.from({ length: 9 }, (_, i) => row({ source: `s${i}` }));
    const s = summarizeAudience(rows);
    expect(s.sources).toHaveLength(7);
    expect(s.sources[6]).toMatchObject({ label: "Other", value: 3 });
  });

  it("is empty and safe with no sign-ups", () => {
    const s = summarizeAudience([]);
    expect(s.signups).toBe(0);
    expect(s.ages).toEqual([]);
  });
});
