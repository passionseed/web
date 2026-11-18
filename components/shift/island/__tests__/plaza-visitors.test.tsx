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
      expect(props.people).toBeUndefined();
    }
  });

  it("prints no count: the day's count is only words for the people button, with no team line or tag for a viewer without a team", () => {
    const props = plazaProps(null, null, null, undefined, { count: 5, team: 0, me: false });
    expect(props.labels).toEqual({});
    expect(props.people).toBe("วันนี้มีคนเช็กอินบนเกาะแล้ว 5 คน");
  });

  it("adds the team's line to those words, and draws the viewer's small tag, on the viewer's own island", () => {
    const props = plazaProps(null, null, null, undefined, { count: 5, team: 2, me: true, shirt: "l" });
    expect(props.labels).toEqual({ me: "คุณ" });
    expect(props.people).toBe("วันนี้มีคนเช็กอินบนเกาะแล้ว 5 คน วันนี้เพื่อนร่วมทีมเช็กอินแล้ว 2 คน");
  });

  it("prints no +N and no campfire count past the figures it can draw: the day's count and the campfire's sheet say them", () => {
    // 20 people, a campfire of 2: the viewer, 3 teammates, 2 strollers and 2 guests by the fire.
    const props = plazaProps(null, null, { count: 2, joinUrl: "" }, undefined, { count: 20, team: 4, me: true, shirt: "l" });
    expect(props.labels).toEqual({ me: "คุณ" });
    expect(props.people).toBe("วันนี้มีคนเช็กอินบนเกาะแล้ว 20 คน วันนี้เพื่อนร่วมทีมเช็กอินแล้ว 4 คน");
  });
});

describe("today's visitors: PlazaLayer", () => {
  const props = plazaProps(null, null, null, undefined, { count: 3, team: 1, me: true, shirt: "l" });

  it("puts only คุณ over the viewer's own figure, prints no count, and reads the day's line out once", () => {
    const world = plazaWorld(scene, props.input);
    const { container } = render(
      <PlazaLayer world={world} labels={props.labels} names={{}} interactive={false} showLabels whole={false} people={props.people} />,
    );
    const tag = container.querySelector<HTMLElement>('[data-label="me"]')!;
    expect(tag.textContent).toBe("คุณ");
    expect(tag.dataset.delayed).toBeUndefined();
    // The tag is the only word floating over the plaza.
    expect([...container.querySelectorAll<HTMLElement>("[data-label]")].map((el) => el.dataset.label)).toEqual(["me"]);
    // Nobody can be greeted here (the island only shows the place): the line is said once, as one sentence, and never drawn.
    const said = container.querySelectorAll(".sr-only");
    expect([...said].map((el) => el.textContent)).toEqual(["วันนี้มีคนเช็กอินบนเกาะแล้ว 3 คน วันนี้เพื่อนร่วมทีมเช็กอินแล้ว 1 คน"]);
    expect(screen.getAllByText(/วันนี้มีคนเช็กอินบนเกาะแล้ว 3 คน/)).toHaveLength(1);
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
      />,
    );
    const tag = container.querySelector<HTMLElement>('[data-label="me"]')!;
    expect(tag.dataset.delayed).toBe("true");
    expect(tag.style.animationDelay).toBe(`${ARRIVE_MS}ms`);
  });

  it("shows no labels and says nothing while the canvas is not the picture", () => {
    const { container } = render(
      <PlazaLayer world={plazaWorld(scene, props.input)} labels={props.labels} names={{}} interactive={false} showLabels={false} whole={false} people={props.people} />,
    );
    expect(container.querySelector("[data-label]")).toBeNull();
    expect(container.querySelector(".sr-only")).toBeNull();
  });
});
