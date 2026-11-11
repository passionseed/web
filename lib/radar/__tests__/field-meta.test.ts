import {
  radarFieldDescription,
  radarFieldTitle,
  radarHookStat,
} from "../field-meta";
import { RADAR_FIXTURE_SLUGS, loadRadarFixture } from "@/lib/radar-guide/__fixtures__";
import { findDashes } from "@/lib/radar-guide/thai-copy";

describe("Radar field link previews", () => {
  it.each(RADAR_FIXTURE_SLUGS)("%s: title and description carry no dashes", (slug) => {
    const field = loadRadarFixture(slug);
    const input = { ...field, cards: field.radar_cards };
    const title = radarFieldTitle(field);
    const description = radarFieldDescription(input);

    expect(title).toBe(`${field.name_th} ทำงานอะไร เงินเดือนเท่าไร | Career Radar`);
    expect(findDashes(title)).toEqual([]);
    expect(findDashes(description)).toEqual([]);
    expect(Array.from(description).length).toBeLessThanOrEqual(200);
    expect(description.length).toBeGreaterThan(0);
  });

  it("joins the tagline and the hook stat", () => {
    const description = radarFieldDescription({
      name_th: "นักวิทยาศาสตร์ข้อมูล",
      tagline_th: "เปลี่ยนข้อมูลเป็นคำตัดสินใจ",
      cards: [{ kind: "hook", content_th: { stat: "23%", statLabel: "ประกาศงานโตขึ้นต่อปี" } }],
    });
    expect(description).toBe("เปลี่ยนข้อมูลเป็นคำตัดสินใจ · 23% ประกาศงานโตขึ้นต่อปี");
  });

  it("turns a range dash into a hyphen and a clause dash into a comma", () => {
    const hook = radarHookStat([
      { kind: "hook", content_th: { stat: "25k–70k+", statLabel: "เติบโต — แต่จบใหม่ลดลง" } },
    ]);
    expect(hook).toEqual({ stat: "25k-70k+", label: "เติบโต, แต่จบใหม่ลดลง" });
  });

  it("falls back to a generic line without tagline or hook", () => {
    expect(radarFieldDescription({ name_th: "นักบัญชี", tagline_th: null, cards: [] })).toBe(
      "นักบัญชี ทำงานอะไร เงินเดือนเท่าไร AI จะมาแทนไหม"
    );
  });
});
