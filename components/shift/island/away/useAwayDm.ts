"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setAwayDm } from "@/app/shift/island/actions";
import type { AwayState } from "@/lib/supabase/shift-quests/playerTypes";

import { AWAY, COMMON } from "../copy";

/** The viewer's come-back DM choice, shared by the consent strip and the settings line. */
export interface AwayDm {
  /**
   * The viewer is a student and the switch is on, or they said yes (the page's own value): the
   * settings line shows. A yes can always be taken back, even while /admin feature away is off.
   */
  shown: boolean;
  /** settings.away_after_days, said on the strip only. */
  days: number;
  /** true: send; false: do not; null: never asked. */
  dm: boolean | null;
  /** The strip waits: the database asks for consent and nothing was chosen on this page. */
  ask: boolean;
  /** A choice is being saved: the switch is greyed. */
  pending: boolean;
  /** Saves a choice: shown at once, put back if the save fails. */
  set: (on: boolean) => void;
}

/**
 * The come-back DM choice (schema 23) for one page: the page's own value,
 * with the student's latest choice over it until the refreshed page carries
 * it. Nothing shows for staff (the database refuses them). While the feature
 * is off only a stored yes shows, so it can be turned off (the notice
 * promises it can, any time); the strip never shows then.
 */
export function useAwayDm(away: AwayState | null | undefined, staff: boolean): AwayDm {
  const pageDm = away?.dm ?? null;
  // undefined: follow the page. A new value from the page (after the refresh) wins again.
  const [chosen, setChosen] = useState<boolean | undefined>(undefined);
  const [lastPageDm, setLastPageDm] = useState(pageDm);
  if (pageDm !== lastPageDm) {
    setLastPageDm(pageDm);
    setChosen(undefined);
  }
  const [pending, startSave] = useTransition();
  const dm = chosen !== undefined ? chosen : pageDm;
  const shown = !staff && (away?.enabled === true || pageDm === true);

  function set(on: boolean) {
    if (pending) return;
    setChosen(on);
    startSave(async () => {
      const result = await setAwayDm(on);
      if (result.ok) {
        toast.success(on ? AWAY.saved.on : AWAY.saved.off);
      } else {
        setChosen(undefined);
        toast.error(result.error || COMMON.failed);
      }
    });
  }

  return {
    shown,
    days: away?.days ?? 0,
    dm,
    ask: shown && away?.enabled === true && away.askConsent === true && dm === null,
    pending,
    set,
  };
}
