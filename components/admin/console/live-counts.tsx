"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  ADMIN_COUNTS_REFRESH_EVENT,
  type AdminQueueSnapshot,
} from "@/lib/admin/console";

/** Poll while the tab is visible. Counts are head queries, so this is cheap. */
const POLL_MS = 60_000;
/** Focus and route changes refetch, but never more often than this. */
const MIN_GAP_MS = 10_000;

interface AdminLiveCounts {
  snapshot: AdminQueueSnapshot | null;
  /** The last fetch failed. With no snapshot yet, counts are unavailable. */
  failed: boolean;
  /** Refetch now, skipping the minimum gap. */
  refresh: () => void;
  /** Accept a snapshot a server component already loaded. */
  seed: (snapshot: AdminQueueSnapshot) => void;
}

const LiveCountsContext = createContext<AdminLiveCounts | null>(null);

/**
 * Live work-queue counts for the whole admin shell: sidebar badges, the
 * command palette, and the overview all read this one snapshot from
 * GET /api/admin/overview/counts.
 */
export function AdminLiveCountsProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AdminQueueSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const lastFetch = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetch.current < MIN_GAP_MS) return;
    lastFetch.current = Date.now();
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setFailed(false);
    try {
      const response = await fetch("/api/admin/overview/counts", {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Counts failed (${response.status})`);
      const data = (await response.json()) as AdminQueueSnapshot;
      if (!controller.signal.aborted) setSnapshot(data);
    } catch {
      // Keep the last snapshot; the next tick tries again. A newer load
      // aborting this one is not a failure.
      if (!controller.signal.aborted) setFailed(true);
    }
  }, []);

  const seed = useCallback((next: AdminQueueSnapshot) => {
    lastFetch.current = Date.now();
    setSnapshot((prev) =>
      !prev || prev.generatedAt <= next.generatedAt ? next : prev,
    );
  }, []);

  const pathname = usePathname();
  useEffect(() => {
    // Mount and every route change. Children's effects run first, so a
    // seeded page skips this fetch; MIN_GAP_MS throttles quick hops.
    void load();
  }, [load, pathname]);

  useEffect(() => {
    const whenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const forceRefresh = () => void load(true);
    const timer = window.setInterval(whenVisible, POLL_MS);
    document.addEventListener("visibilitychange", whenVisible);
    window.addEventListener("focus", whenVisible);
    window.addEventListener(ADMIN_COUNTS_REFRESH_EVENT, forceRefresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", whenVisible);
      window.removeEventListener("focus", whenVisible);
      window.removeEventListener(ADMIN_COUNTS_REFRESH_EVENT, forceRefresh);
      inFlight.current?.abort();
    };
  }, [load]);

  const value = useMemo(
    () => ({ snapshot, failed, refresh: () => void load(true), seed }),
    [snapshot, failed, load, seed],
  );

  return (
    <LiveCountsContext.Provider value={value}>
      {children}
    </LiveCountsContext.Provider>
  );
}

/** Outside the provider this returns an empty, inert value. */
export function useAdminLiveCounts(): AdminLiveCounts {
  return (
    useContext(LiveCountsContext) ?? {
      snapshot: null,
      failed: false,
      refresh: () => {},
      seed: () => {},
    }
  );
}

/** Render on a server-loaded page to hand its fresh counts to the shell. */
export function SeedAdminLiveCounts({
  snapshot,
}: {
  snapshot: AdminQueueSnapshot;
}) {
  const { seed } = useAdminLiveCounts();
  useEffect(() => {
    seed(snapshot);
  }, [seed, snapshot]);
  return null;
}

/** Call after a mutation that clears queue items (reply sent, slip verified). */
export function refreshAdminCounts() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_COUNTS_REFRESH_EVENT));
  }
}
