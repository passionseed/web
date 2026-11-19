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
  /** The only word drawn over the island's plaza: the viewer's คุณ tag (the countdown board draws its own days). */
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
 * (null: no board), the campfire's count, today's visitors (null: none
 * drawn) and the merchant ship (the shop), always moored off the coast. Only
 * the viewer's tag is drawn over the canvas (aria-hidden). The stage's
 * countdown board is pixel art; its accessible name says the date and the
 * days in words. The ship carries no sign over it: its painted board is part
 * of the sprite and its accessible name says it is the shop. The notice
 * board, the campfire and the day's count are not printed on the island: a
 * tap opens the board, the campfire's sheet with its count, or has a person
 * say the day's count. Without `onSpot` there is nothing to tap, so no names
 * either.
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
    names.ship = SHOP.shipSpot;
  }
  return {
    // The Demo Day prize board always stands in the plaza, and the merchant ship always waits offshore.
    input: { festival, pins: pins ? pins.map((pin) => pin.kind) : null, campfire: campfire ? { count } : null, prizes: true, visitors, ship: true },
    labels,
    names,
    onSpot,
    ...(people ? { people } : {}),
  };
}
