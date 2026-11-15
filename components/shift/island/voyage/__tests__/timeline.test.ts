import { SHIP_H, SHIP_W } from "../../shipArt";
import { BERTH_OVERLAP, ISLAND_LIGHTS, ISLAND_RUNS, ISLAND_W, ISLAND_WATER, surfaceAt } from "../islandArt";
import {
  beachTopAt,
  CRUISE_SPEED,
  islandAlphaAt,
  islandXAt,
  lineAt,
  passengerAt,
  shipTopAt,
  shipWaterAt,
  shipXAt,
  skyAt,
  speedAt,
  travelAt,
  VOYAGE,
  voyageLayout,
} from "../timeline";

const PHONE = voyageLayout(390, 844, 3);
const DESKTOP = voyageLayout(1440, 900, 2);
const SHORT = voyageLayout(1280, 600, 1);

describe("voyageLayout", () => {
  it.each([
    ["phone", PHONE],
    ["desktop", DESKTOP],
    ["short landscape", SHORT],
  ])("keeps pixels whole and the berth on screen (%s)", (_name, layout) => {
    expect(Number.isInteger(layout.px)).toBe(true);
    expect(layout.px).toBeGreaterThanOrEqual(1);
    // The island and the ship side by side fit across the screen.
    expect(layout.islandDock).toBeGreaterThanOrEqual(0);
    expect(layout.shipDock + SHIP_W).toBeLessThanOrEqual(layout.cols);
    expect(layout.shipDock).toBe(layout.islandDock + ISLAND_W - BERTH_OVERLAP);
    // The tallest tree clears the top; the ship sails below the horizon, the beach below the ship.
    expect(layout.islandWater - ISLAND_WATER).toBeGreaterThanOrEqual(0);
    expect(layout.shipWater).toBeGreaterThan(layout.horizon);
    expect(layout.beach).toBeGreaterThan(layout.shipWater);
    expect(layout.beach).toBeLessThan(layout.rows);
  });

  it("gives wide screens more columns, not bigger pixels", () => {
    expect(PHONE.cols).toBeGreaterThanOrEqual(140);
    expect(DESKTOP.cols).toBeGreaterThanOrEqual(200);
  });

  it("survives a nonsense device pixel ratio", () => {
    expect(voyageLayout(390, 844, Number.NaN).px).toBeGreaterThanOrEqual(1);
    expect(voyageLayout(390, 844, 0).px).toBeGreaterThanOrEqual(1);
  });
});

describe("timeline", () => {
  it("keeps its beats in order", () => {
    const beats = Object.values(VOYAGE);
    expect([...beats].sort((a, b) => a - b)).toEqual(beats);
  });

  it("goes from dusk through night to dawn, the light always adding up to one", () => {
    for (let t = 0; t <= VOYAGE.end; t += 100) {
      const { dusk, night, dawn } = skyAt(t);
      expect(dusk + night + dawn).toBeCloseTo(1, 6);
      for (const share of [dusk, night, dawn]) expect(share).toBeGreaterThanOrEqual(0);
    }
    expect(skyAt(0)).toEqual({ dusk: 1, night: 0, dawn: 0 });
    expect(skyAt(4500).night).toBe(1);
    expect(skyAt(VOYAGE.dock).dawn).toBe(1);
  });

  it("sets off from rest, sails, and is still again alongside the jetty", () => {
    expect(speedAt(0)).toBe(0);
    expect(speedAt(VOYAGE.cruise + 1)).toBe(1);
    expect(speedAt(VOYAGE.dock)).toBe(0);
    // The sea only ever slides one way, and stops sliding once alongside.
    let previous = -1;
    for (let t = 0; t <= VOYAGE.end; t += 50) {
      const travel = travelAt(t);
      expect(travel).toBeGreaterThanOrEqual(previous);
      previous = travel;
    }
    expect(travelAt(VOYAGE.end)).toBeCloseTo(travelAt(VOYAGE.dock), 6);
    // Full sail between cruise and brake.
    expect(travelAt(VOYAGE.brake) - travelAt(VOYAGE.cruise)).toBeCloseTo(CRUISE_SPEED * (VOYAGE.brake - VOYAGE.cruise), 6);
  });

  it("starts at anchor and ends alongside the jetty, level with it", () => {
    expect(shipXAt(PHONE, 0)).toBe(PHONE.shipAnchor);
    expect(shipXAt(PHONE, VOYAGE.cruise + 100)).toBe(PHONE.shipCruise);
    expect(shipXAt(PHONE, VOYAGE.dock)).toBe(PHONE.shipDock);
    expect(islandXAt(PHONE, VOYAGE.dock)).toBe(PHONE.islandDock);
    expect(shipWaterAt(PHONE, 0)).toBe(PHONE.shipWater);
    expect(shipWaterAt(PHONE, VOYAGE.dock)).toBe(PHONE.islandWater + 1);
    // Still once alongside: no bob.
    expect(shipTopAt(PHONE, VOYAGE.dock + 400, SHIP_H)).toBe(shipTopAt(PHONE, VOYAGE.dock + 1100, SHIP_H));
  });

  it("keeps the island out of sight until it is sighted, then never slides backwards", () => {
    expect(islandAlphaAt(VOYAGE.sighted)).toBe(0);
    expect(islandAlphaAt(VOYAGE.land)).toBe(1);
    let previous = -Infinity;
    for (let t = VOYAGE.sighted; t <= VOYAGE.end; t += 50) {
      const x = islandXAt(DESKTOP, t);
      expect(x).toBeGreaterThanOrEqual(previous);
      previous = x;
    }
  });

  it("lets the beach fall out of frame as the ship gets under way", () => {
    expect(beachTopAt(PHONE, 0)).toBe(PHONE.beach);
    expect(beachTopAt(PHONE, VOYAGE.sea)).toBeGreaterThanOrEqual(PHONE.rows);
  });

  it("names each beat once, in order", () => {
    expect(lineAt(0)).toBe(0);
    expect(lineAt(VOYAGE.sea)).toBe(1);
    expect(lineAt(VOYAGE.land)).toBe(2);
    expect(lineAt(VOYAGE.end)).toBe(2);
  });

  it("puts the student on the ship", () => {
    for (const t of [0, VOYAGE.sea, VOYAGE.dock]) {
      const head = passengerAt(PHONE, t, SHIP_H);
      const left = shipXAt(PHONE, t);
      const top = shipTopAt(PHONE, t, SHIP_H);
      expect(head.x).toBeGreaterThan(left);
      expect(head.x).toBeLessThan(left + SHIP_W);
      expect(head.y).toBeGreaterThanOrEqual(top);
    }
  });
});

describe("island art", () => {
  it("stays inside its grid", () => {
    for (const run of ISLAND_RUNS) {
      expect(run.x).toBeGreaterThanOrEqual(0);
      expect(run.x + run.w).toBeLessThanOrEqual(ISLAND_W);
      expect(run.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("plants every tree on the hill, below the top of the grid", () => {
    expect(Math.min(...ISLAND_RUNS.map((run) => run.y))).toBeGreaterThanOrEqual(0);
    expect(surfaceAt(40)).toBeLessThan(ISLAND_WATER);
  });

  it("lights two festival lanterns", () => {
    expect(ISLAND_LIGHTS).toHaveLength(2);
    // Their flames keep the untinted keys.
    expect(ISLAND_RUNS.some((run) => run.key === "Y")).toBe(true);
  });
});
