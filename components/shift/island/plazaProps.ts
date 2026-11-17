import type { Festival } from "@/lib/shift-island/festival";
import type { VisitorsInput } from "@/lib/shift-island/live/crowd";
import { MAX_SEATS, plazaCrowd, type PlazaInput, type PlazaLabelId, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { NoticePin } from "@/lib/shift-island/notice";
import type { CampfireSummary } from "@/lib/supabase/shift-quests/types";

import { CAMPFIRE, FESTIVAL, NOTICE, SEASON, VISITORS, thaiShortDate } from "./copy";
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
 * drawn). Labels over the canvas are aria-hidden; each spot's accessible
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
  if (festival) labels.sign = FESTIVAL.sign(date, festival.daysToDemo);
  if (count > 0) labels.campfireCount = CAMPFIRE.count(count);
  if (count > MAX_SEATS) labels.campfireMore = CAMPFIRE.more(count - MAX_SEATS);
  const crowd = plazaCrowd({ campfire: campfire ? { count } : null, visitors });
  if (visitors && visitors.count > 0) {
    const team = crowd.team > 0 ? `\n${VISITORS.team(visitors.team)}` : "";
    labels.visitors = `${VISITORS.count(visitors.count)}${team}`;
  }
  if (crowd.more > 0) labels.visitorsMore = VISITORS.more(crowd.more);
  if (crowd.me) labels.me = VISITORS.me;
  const names: PlazaProps["names"] = {};
  if (onSpot) {
    if (pins) names.notice = pins.length > 0 ? NOTICE.pinned(pins.map((pin) => pin.title)) : NOTICE.board;
    if (festival) names.stage = FESTIVAL.stage(`${date} · ${SEASON.daysLeft(festival.daysToDemo)}`);
    if (campfire) names.campfire = CAMPFIRE.spot(count);
    names.prizes = PRIZES_UI.spot;
  }
  return {
    // The Demo Day prize board always stands in the plaza.
    input: { festival, pins: pins ? pins.map((pin) => pin.kind) : null, campfire: campfire ? { count } : null, prizes: true, visitors },
    labels,
    names,
    onSpot,
  };
}
