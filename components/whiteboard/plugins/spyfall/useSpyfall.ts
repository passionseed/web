"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { GameAction, GameStart, GameView } from "@/lib/whiteboard/games";

/** While a round is live. */
const POLL_MS = 5000;
/** While there is no round: slower, just so a newly dealt one is noticed without the ping. */
const IDLE_POLL_MS = 10000;

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not JSON.
  }
  return `HTTP ${res.status}`;
}

/** The server's ping after every write: which round, at which version. */
function pingOf(payload: unknown): { round: string; v: number } | null {
  const p = payload as { round?: unknown; v?: unknown } | null;
  return p && typeof p.round === "string" && typeof p.v === "number" ? { round: p.round, v: p.v } : null;
}

/**
 * The board's Spyfall round as this viewer may see it. Refetches when the
 * server pings the plugin channel after a write (skipping versions it already
 * has, and folding a burst of pings into one request), and polls while the tab
 * is visible in case a ping was missed: every 5 s during a round, every 10 s
 * when there is none, so an open window still notices a newly dealt round.
 */
export function useSpyfall(boardId: string, onBroadcast: (handler: (payload: unknown) => void) => () => void) {
  const [view, setView] = useState<GameView | null>(null);
  const [busy, setBusy] = useState(false);
  const url = `/api/whiteboards/${boardId}/game`;
  // Only the newest request may set the view, so a slow GET never undoes a write.
  const seq = useRef(0);
  const viewRef = useRef<GameView | null>(null);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const fetchView = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(await readError(res));
      const next = (await res.json()) as GameView;
      if (mine === seq.current) setView(next);
    } catch (error) {
      if (mine === seq.current) setView((v) => v ?? { round: null, me: null });
      console.warn("Spyfall: could not load the round", error);
    }
  }, [url]);

  // One request in flight at a time; anything asked for meanwhile runs once after it.
  const inFlight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const reload = useCallback(async () => {
    if (inFlight.current) {
      again.current = true;
      return inFlight.current;
    }
    const run = (async () => {
      do {
        again.current = false;
        await fetchView();
      } while (again.current);
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, [fetchView]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(
    () =>
      onBroadcast((payload) => {
        const ping = pingOf(payload);
        const round = viewRef.current?.round;
        if (ping && round && ping.round === round.id && ping.v <= round.version) return;
        void reload();
      }),
    [onBroadcast, reload],
  );

  const live = Boolean(view?.round);
  useEffect(() => {
    // reload() folds overlapping requests into one, so a poll never stacks on a ping.
    const tick = () => document.visibilityState === "visible" && void reload();
    const timer = window.setInterval(tick, live ? POLL_MS : IDLE_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [live, reload]);

  const write = useCallback(
    async (method: "POST" | "PATCH", body: GameStart | GameAction, failMessage: string) => {
      setBusy(true);
      const mine = ++seq.current;
      try {
        const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(await readError(res));
        const next = (await res.json()) as GameView;
        // The server pings everyone else after the write.
        if (mine === seq.current) setView(next);
        return true;
      } catch (error) {
        toast.error(`${failMessage}: ${error instanceof Error ? error.message : "ลองใหม่อีกครั้ง"}`);
        void reload();
        return false;
      } finally {
        setBusy(false);
      }
    },
    [url, reload],
  );

  const start = useCallback((input: GameStart) => write("POST", input, "แจกการ์ดไม่สำเร็จ · Could not deal"), [write]);
  const act = useCallback((action: GameAction) => write("PATCH", action, "ทำรายการไม่สำเร็จ · Could not do that"), [write]);

  return { view, busy, start, act, reload };
}
