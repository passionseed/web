import type { Festival } from "@/lib/shift-island/festival";
import type { VisitorsInput } from "@/lib/shift-island/live/crowd";
import { plazaCrowd, type PlazaInput, type PlazaLabelId, type PlazaSpotId } from "@/lib/shift-island/live/plaza";
import type { NoticePin } from "@/lib/shift-island/notice";
import type { CampfireSummary } from "@/lib/supabase/shift-quests/types";

import { CAMPFIRE, FESTIVAL, NOTICE, SEASON, VISITORS, thaiShortDate } from "./copy";
import { PRIZES_UI } from "./prizes/copy";

/** The plaza in the world: what it draws, its labels and its tap targets (IslandViewport's `plaza`). */
export interface PlazaProps {
  input: PlazaInput;
  /** The only words drawn on the island: the Demo Day sign and the viewer's คุณ tag. */
  labels: Partial<Record<PlazaLabelId, string>>;
  names: Partial<Record<PlazaSpotId, string>>;
  onSpot?: (id: PlazaSpotId) => void;
  /**
   * The day's count in words (and the team's line, for the viewer's own
   * team), never drawn: the people button's name, or a line read once to
   * screen readers. A tap on a person says the same count.
   */
  people?: string;
}

/**
 * The plaza for the world: the Demo Day festival, the notice board's pins
 * (null: no board), the campfire's count and today's visitors (null: none
 * drawn). Only the sign and the viewer's tag are drawn over the canvas
 * (aria-hidden; the stage's accessible name carries the sign's words). The
 * notice board, the campfire and the day's count are not printed on the
 * island: a tap opens the board, the campfire's sheet with its count, or has
 * a person say the day's count. Without `onSpot` there is nothing to tap, so
 * no names either.
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
  const crowd = plazaCrowd({ campfire: campfire ? { count } : null, visitors });
  if (crowd.me) labels.me = VISITORS.me;
  let people: string | undefined;
  if (visitors && visitors.count > 0) {
    people = VISITORS.count(visitors.count);
    if (crowd.team > 0) people += ` ${VISITORS.team(visitors.team)}`;
  }
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
    ...(people ? { people } : {}),
  };
}
