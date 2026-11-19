import type { Festival } from "@/lib/shift-island/festival";
import type { VisitorsInput } from "@/lib/shift-island/live/crowd";
import { plazaCrowd, type PlazaInput, type PlazaLabelId, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { NoticePin } from "@/lib/shift-island/notice";
import type { CampfireSummary } from "@/lib/supabase/shift-quests/types";

import { CAMPFIRE, FESTIVAL, NOTICE, SEASON, VISITORS, thaiShortDate } from "./copy";
import { SHOP } from "./player/copy";
import { PRIZES_UI } from "./prizes/copy";

/** The plaza in the world: what it draws, its labels and its tap targets (IslandViewport's `plaza`). */
export interface PlazaProps {
  input: PlazaInput;
  labels: Partial<Record<PlazaLabelId, string>>;
  names: Partial<Record<PlazaSpotId, string>>;
  onSpot?: (id: PlazaSpotId) => void;
}

/**
 * The plaza for the world: the Demo Day festival, the notice board's pins
 * (null: no board), the campfire's count and today's visitors (null: none
 * drawn), and the merchant ship (the shop), always moored off the coast. Labels over the canvas are aria-hidden; each spot's accessible
 * name carries the same words, and PlazaLayer reads the visitors' line out.
 * Without `onSpot` there is nothing to tap, so no names either.
 */
export function plazaProps(
  festival: Festival | null,
  pins: NoticePin[] | null,
  campfire: CampfireSummary | null,
  onSpot?: (id: PlazaSpotId) => void,
  visitors: VisitorsInput | null = null,
): PlazaProps {
  const count = campfire ? Math.max(0, Math.trunc(campfire.count) || 0) : 0;
  const date = festival ? thaiShortDate(festival.demoDay) : "";
  const labels: PlazaProps["labels"] = {};
  if (count > 0) labels.campfireCount = CAMPFIRE.count(count);
  const crowd = plazaCrowd({ campfire: campfire ? { count } : null, visitors });
  if (visitors && visitors.count > 0) {
    const team = crowd.team > 0 ? `\n${VISITORS.team(visitors.team)}` : "";
    labels.visitors = `${VISITORS.count(visitors.count)}${team}`;
  }
  if (crowd.me) labels.me = VISITORS.me;
  labels.ship = SHOP.shipSign;
  const names: PlazaProps["names"] = {};
  if (onSpot) {
    if (pins) names.notice = pins.length > 0 ? NOTICE.pinned(pins.map((pin) => pin.title)) : NOTICE.board;
    if (festival) names.stage = FESTIVAL.stage(`${date} · ${SEASON.daysLeft(festival.daysToDemo)}`);
    if (campfire) names.campfire = CAMPFIRE.spot(count);
    names.prizes = PRIZES_UI.spot;
    names.ship = SHOP.shipSpot;
  }
  return {
    // The Demo Day prize board always stands in the plaza, and the merchant ship always waits offshore.
    input: { festival, pins: pins ? pins.map((pin) => pin.kind) : null, campfire: campfire ? { count } : null, prizes: true, visitors, ship: true },
    labels,
    names,
    onSpot,
  };
}
