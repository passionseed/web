"use client";

/**
 * Bridge from the guide shell's progress store to the engines.
 *
 * EngineProps only carries `onResult`; several engines also need to read and
 * write progress (fit, grade, proof picks, shortlist, device-only drafts, the
 * recap). The shell (U1 GameIsland) wraps each engine in
 * <EngineStoreProvider value={{ state, dispatch, pages }}> using the store from
 * useGuideState. Without that provider engines use the guide shell's own
 * context (GuideShellContext: progress, dispatch, index.pages) when they are
 * rendered inside the shell, and otherwise (tests, a standalone render) a
 * private in-memory store, so they always work.
 */
import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { GuideIndexPage, GuideState } from "@/lib/radar-guide/guide-types";
import { emptyProgress, reduceProgress, type ProgressAction } from "@/lib/radar-guide/story";
import { useGuideShellOptional } from "@/components/radar/guide/shell/shell-context";

export interface EngineStore {
  state: GuideState;
  dispatch(action: ProgressAction): void;
  /** The guide's levels (order, labels), for the recap's favourite value_int. */
  pages?: readonly Pick<GuideIndexPage, "key" | "order" | "navLabelTh" | "titleTh">[];
}

const EngineStoreContext = createContext<EngineStore | null>(null);

export function EngineStoreProvider({ value, children }: { value: EngineStore; children: ReactNode }) {
  return <EngineStoreContext.Provider value={value}>{children}</EngineStoreContext.Provider>;
}

/** The provided store, else the guide shell's progress, else a private in-memory one. */
export function useEngineStore(initial?: GuideState): EngineStore {
  const ctx = useContext(EngineStoreContext);
  const shell = useGuideShellOptional();
  const [state, dispatch] = useReducer(reduceProgress, initial ?? emptyProgress());
  const shellState = shell?.progress;
  const shellDispatch = shell?.dispatch;
  const shellPages = shell?.index.pages;
  const fromShell = useMemo<EngineStore | null>(
    () =>
      shellState && shellDispatch
        ? { state: shellState, dispatch: (action) => void shellDispatch(action), pages: shellPages }
        : null,
    [shellState, shellDispatch, shellPages]
  );
  const local = useMemo<EngineStore>(() => ({ state, dispatch }), [state]);
  return ctx ?? fromShell ?? local;
}
