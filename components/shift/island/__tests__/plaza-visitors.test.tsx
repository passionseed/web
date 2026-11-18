import { render, screen } from "@testing-library/react";

import { buildScene, type IslandPlot } from "@/bot/src/quests/island/scene";
import { ARRIVE_MS } from "@/lib/shift-island/live/crowd";
import { plazaWorld } from "@/lib/shift-island/live/plaza";

import { VISITORS } from "../copy";
import { plazaProps } from "../plazaProps";
import { PlazaLayer } from "../live/PlazaLayer";

const plots: IslandPlot[] = Array.from({ length: 12 }, (_, i) => ({
  slot: i + 1,
  stage: (i % 7) + 1,
  visitor: false,
  key: false,
  helper: false,
  lantern: false,
  name: null,
  mine: i === 0,
}));
const scene = buildScene(plots, { markMine: true, festival: false });

describe("today's visitors: copy", () => {
  it("says how many came today, and the team's line, in Thai with no em dash or น้อง", () => {
    expect(VISITORS.count(7)).toBe("วันนี้มีคนเช็กอินบนเกาะแล้ว 7 คน");
    expect(VISITORS.team(2)).toBe("วันนี้เพื่อนร่วมทีมเช็กอินแล้ว 2 คน");
    expect(VISITORS.more(4)).toBe("+4");
    expect(VISITORS.me).toBe("คุณ");
    for (const line of [VISITORS.count(1), VISITORS.team(1), VISITORS.me]) {
      expect(line).not.toMatch(/[—–]/);
      expect(line).not.toContain("น้อง");
    }
  });
});

describe("today's visitors: plazaProps", () => {
  it("draws nobody and says nothing without visitors, or with none today", () => {
    for (const visitors of [null, { count: 0, team: 0, me: false }]) {
      const props = plazaProps(null, null, null, undefined, visitors);
      expect(props.input.visitors).toEqual(visitors);
      expect(props.labels).toEqual({});
    }
  });

  it("labels the day's count; a viewer without a team gets no team line and no tag", () => {
    const props = plazaProps(null, null, null, undefined, { count: 5, team: 0, me: false });
    expect(props.labels).toEqual({ visitors: "วันนี้มีคนเช็กอินบนเกาะแล้ว 5 คน" });
  });

  it("adds the team's line and the viewer's tag for the viewer's own island", () => {
    const props = plazaProps(null, null, null, undefined, { count: 5, team: 2, me: true, shirt: "l" });
    expect(props.labels).toEqual({ visitors: "วันนี้มีคนเช็กอินบนเกาะแล้ว 5 คน\nวันนี้เพื่อนร่วมทีมเช็กอินแล้ว 2 คน", me: "คุณ" });
  });

  it("shows +N past the figures it can draw, with guests counted at the campfire", () => {
    // 20 people, a campfire of 2: the viewer, 3 teammates, 2 strollers and 2 guests by the fire.
    const props = plazaProps(null, null, { count: 2, joinUrl: "" }, undefined, { count: 20, team: 4, me: true, shirt: "l" });
    expect(props.labels.visitorsMore).toBe("+12");
    expect(props.labels.campfireCount).toBeDefined();
  });
});

describe("today's visitors: PlazaLayer", () => {
  const props = plazaProps(null, null, null, undefined, { count: 3, team: 1, me: true, shirt: "l" });

  it("puts the viewer's initial and คุณ over their own figure, and reads the day's line out once", () => {
    const world = plazaWorld(scene, props.input);
    const { container } = render(
      <PlazaLayer world={world} labels={props.labels} names={{}} interactive={false} showLabels whole={false} me={{ name: "Mint", avatarUrl: null }} />,
    );
    const tag = container.querySelector<HTMLElement>('[data-label="me"]')!;
    expect(tag.textContent).toBe("Mคุณ");
    expect(tag.dataset.delayed).toBeUndefined();
    expect(container.querySelector('[data-label="visitors"]')!.textContent).toBe("วันนี้มีคนเช็กอินบนเกาะแล้ว 3 คน\nวันนี้เพื่อนร่วมทีมเช็กอินแล้ว 1 คน");
    // The labels are decoration; the line is said once, as one sentence.
    const said = container.querySelectorAll(".sr-only");
    expect([...said].map((el) => el.textContent)).toEqual(["วันนี้มีคนเช็กอินบนเกาะแล้ว 3 คน วันนี้เพื่อนร่วมทีมเช็กอินแล้ว 1 คน"]);
    expect(screen.getAllByText(/วันนี้มีคนเช็กอินบนเกาะแล้ว 3 คน/)).toHaveLength(2);
  });

  it("holds the tag back while the viewer walks in", () => {
    const arriving = plazaProps(null, null, null, undefined, { count: 3, team: 1, me: true, shirt: "l", arriving: true });
    const { container } = render(
      <PlazaLayer
        world={plazaWorld(scene, arriving.input)}
        labels={arriving.labels}
        names={{}}
        interactive={false}
        showLabels
        whole={false}
        me={{ name: "Mint", avatarUrl: null }}
      />,
    );
    const tag = container.querySelector<HTMLElement>('[data-label="me"]')!;
    expect(tag.dataset.delayed).toBe("true");
    expect(tag.style.animationDelay).toBe(`${ARRIVE_MS}ms`);
  });

  it("shows no labels and says nothing while the canvas is not the picture", () => {
    const { container } = render(
      <PlazaLayer world={plazaWorld(scene, props.input)} labels={props.labels} names={{}} interactive={false} showLabels={false} whole={false} />,
    );
    expect(container.querySelector("[data-label]")).toBeNull();
    expect(container.querySelector(".sr-only")).toBeNull();
  });
});
