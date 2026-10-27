"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminSearchResponse } from "@/lib/admin/console";

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_DEBOUNCE_MS = 150;

export type AdminSearchState =
  | { status: "idle"; data: null }
  | { status: "loading"; data: AdminSearchResponse | null }
  /** `query` is the trimmed text these results answer. */
  | { status: "success"; data: AdminSearchResponse; query: string }
  | { status: "error"; data: null };

const IDLE: AdminSearchState = { status: "idle", data: null };

/**
 * True only when the results answer exactly this query. While a newer query
 * loads (and on the render before loading starts) the old rows are stale and
 * must not be selectable, or Enter opens a record from the previous search.
 */
export function searchIsCurrent(state: AdminSearchState, query: string): boolean {
  return state.status === "success" && state.query === query.trim();
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : (error as { name?: string } | null)?.name === "AbortError";
}

/**
 * Record search for the command palette: GET /api/admin/search, debounced,
 * with stale requests aborted. While a new query loads, the last results stay
 * so the list does not flash empty; see searchIsCurrent before acting on them.
 */
export function useAdminSearch(query: string, enabled: boolean) {
  const [state, setState] = useState<AdminSearchState>(IDLE);
  const [attempt, setAttempt] = useState(0);
  const q = query.trim();
  const active = enabled && q.length >= SEARCH_MIN_CHARS;

  useEffect(() => {
    if (!active) {
      setState(IDLE);
      return;
    }
    setState((prev) => ({ status: "loading", data: prev.data }));
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/search?q=${encodeURIComponent(q)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok) throw new Error(`Search failed (${response.status})`);
        const data = (await response.json()) as AdminSearchResponse;
        if (!controller.signal.aborted) {
          setState({
            status: "success",
            data: { ...data, groups: data.groups ?? [] },
            query: q,
          });
        }
      } catch (error) {
        if (controller.signal.aborted || isAbort(error)) return;
        setState({ status: "error", data: null });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [active, q, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, retry };
}
