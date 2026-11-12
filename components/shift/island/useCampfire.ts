"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { loadCampfire } from "@/app/shift/island/actions";
import type { CampfireNames, CampfireSummary } from "@/lib/supabase/shift-quests/types";

/** The campfire sheet's names: loaded on tap only, never with the page. */
export interface CampfireNamesState {
  state: "idle" | "loading" | "ready" | "error";
  names: string[];
}

export interface CampfireState {
  /** null: no campfire (no coworking channel, or the page's read failed); the world draws none. */
  summary: CampfireSummary | null;
  names: CampfireNamesState;
  /** Reads the names once (the sheet opening); a newer call drops the older answer. */
  loadNames: () => void;
}

/** How often the count is read again while the island is in view. */
export const CAMPFIRE_REFRESH_MS = 90_000;

const IDLE: CampfireNamesState = { state: "idle", names: [] };

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

/** The same summary object when nothing changed, so React bails out and the canvas does not repaint. */
function merge(current: CampfireSummary | null, next: CampfireNames | CampfireSummary): CampfireSummary {
  if (current && current.count === next.count && current.joinUrl === next.joinUrl) return current;
  return { count: next.count, joinUrl: next.joinUrl };
}

/**
 * Who is coworking in the SHIFT voice channel, as a count for the world and
 * names for the sheet. The count is read again every 90 s while `active`
 * (no sheet over the island) and the tab is visible: one timer, cleared on
 * hide, inactive and unmount, and an answer that arrives after that is
 * dropped. A changed count is the only React update it makes. Without a
 * campfire on the page (null) it never polls.
 */
export function useCampfire(initial: CampfireSummary | null, active: boolean): CampfireState {
  const [summary, setSummary] = useState<CampfireSummary | null>(initial);
  // A fresh page payload (router.refresh after an action) replaces what was polled.
  const [seed, setSeed] = useState(initial);
  if (initial !== seed) {
    setSeed(initial);
    setSummary(initial);
  }
  const [names, setNames] = useState<CampfireNamesState>(IDLE);

  // When the count was last read: the page itself counts as a read.
  const readAt = useRef(0);
  useEffect(() => {
    readAt.current = Date.now();
  }, [seed]);

  const polling = active && summary !== null;
  useEffect(() => {
    if (!polling) return;
    let timer: number | undefined;
    // Bumped on hide and cleanup: an answer from before that is ignored.
    let round = 0;
    let stopped = false;

    const tick = () => {
      timer = undefined;
      if (!visible()) return;
      const mine = ++round;
      loadCampfire({ names: false }).then(
        (result) => {
          if (stopped || mine !== round) return;
          readAt.current = Date.now();
          if (result.ok && result.data) {
            const data = result.data;
            // The channel was unset: the campfire leaves the island, and polling stops with it.
            if ("none" in data) {
              setSummary(null);
              return;
            }
            setSummary((current) => merge(current, data));
          }
          // A failed read (null data or an error) keeps the last count.
          schedule();
        },
        () => {
          if (stopped || mine !== round) return;
          readAt.current = Date.now();
          schedule();
        },
      );
    };

    const schedule = () => {
      window.clearTimeout(timer);
      const wait = Math.max(0, CAMPFIRE_REFRESH_MS - (Date.now() - readAt.current));
      timer = window.setTimeout(tick, wait);
    };

    const onVisibility = () => {
      if (visible()) {
        schedule();
      } else {
        window.clearTimeout(timer);
        timer = undefined;
        round++;
      }
    };

    if (visible()) schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      round++;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [polling]);

  // Names: one request per opening; the newest wins, and nothing lands after unmount.
  const namesRound = useRef(0);
  useEffect(
    () => () => {
      namesRound.current++;
    },
    [],
  );
  const loadNames = useCallback(() => {
    const mine = ++namesRound.current;
    setNames({ state: "loading", names: [] });
    loadCampfire({ names: true }).then(
      (result) => {
        if (mine !== namesRound.current) return;
        const data = result.ok ? result.data : null;
        if (data && "none" in data) {
          readAt.current = Date.now();
          setSummary(null);
          setNames(IDLE);
        } else if (data) {
          readAt.current = Date.now();
          setSummary((current) => merge(current, data));
          setNames({ state: "ready", names: data.names });
        } else {
          setNames({ state: "error", names: [] });
        }
      },
      () => {
        if (mine === namesRound.current) setNames({ state: "error", names: [] });
      },
    );
  }, []);

  return { summary, names, loadNames };
}
