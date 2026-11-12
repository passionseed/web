/**
 * Per-viewer guide progress in localStorage (one key per guide,
 * GUIDE_STATE_KEY). A convenience only: every read and write is wrapped in
 * try/catch, a corrupt value resets to empty, and nothing is needed to render
 * a page. Demo mode keeps state in memory and never writes.
 *
 * The reducers and XP/badge rules live in story.ts; this file only stores.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { GUIDE_STATE_KEY, type GuideIndexEntry, type GuideState } from "./guide-types";
import {
  emptyProgress,
  normalizeProgress,
  stepProgress,
  storyContext,
  xpSummary,
  type BadgeDef,
  type ProgressAction,
  type StepResult,
  type XpSummary,
} from "./story";

/** The subset of Storage the store uses (window.localStorage, or a fake in tests). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/** window.localStorage, or null when the accessor throws (private mode, blocked storage, SSR). */
export function safeLocalStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readGuideState(slug: string, storage: StorageLike | null = safeLocalStorage()): GuideState {
  if (!storage) return emptyProgress();
  try {
    const raw = storage.getItem(GUIDE_STATE_KEY(slug));
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

/** Returns false when the write failed (quota, private mode). Never throws. */
export function writeGuideState(
  slug: string,
  state: GuideState,
  storage: StorageLike | null = safeLocalStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(GUIDE_STATE_KEY(slug), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * State safe to describe in events or share: `local` (birth year, GPAX,
 * drafts) is removed. Events never carry more than counts and keys anyway;
 * use this whenever state leaves the store.
 */
export function eventSafeState(state: GuideState): Omit<GuideState, "local"> {
  const { local: _local, ...rest } = state;
  return rest;
}

export interface GuideStore {
  getSnapshot(): GuideState;
  subscribe(listener: () => void): () => void;
  dispatch(action: ProgressAction): StepResult;
  /** Re-reads storage (another tab wrote). */
  reload(): void;
}

export interface GuideStoreOptions {
  /** Demo mode: memory only, never reads or writes storage. */
  demo?: boolean;
  /** Defaults to safeLocalStorage(). Pass null for memory only. */
  storage?: StorageLike | null;
}

export function createGuideStore(
  entry: Pick<GuideIndexEntry, "slug" | "pages" | "story">,
  options: GuideStoreOptions = {}
): GuideStore {
  const storage = options.demo ? null : options.storage === undefined ? safeLocalStorage() : options.storage;
  const ctx = storyContext(entry);
  let state = readGuideState(entry.slug, storage);
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      const result = stepProgress(state, action, ctx);
      if (result.state !== state) {
        state = result.state;
        writeGuideState(entry.slug, state, storage);
        emit();
      }
      return result;
    },
    reload() {
      if (!storage) return;
      const next = readGuideState(entry.slug, storage);
      if (JSON.stringify(next) !== JSON.stringify(state)) {
        state = next;
        emit();
      }
    },
  };
}

const SERVER_SNAPSHOT: GuideState = emptyProgress();

export interface UseGuideState {
  state: GuideState;
  dispatch(action: ProgressAction): StepResult;
  xp: XpSummary;
  store: GuideStore;
}

/**
 * React binding. The server render and the first client render use empty
 * progress (no hydration mismatch); stored progress appears right after.
 * `onEarned` fires once per badge earned through this hook's dispatch.
 */
export function useGuideState(
  entry: Pick<GuideIndexEntry, "slug" | "pages" | "story">,
  options: { demo?: boolean; onEarned?: (badges: BadgeDef[], result: StepResult) => void } = {}
): UseGuideState {
  const { demo = false, onEarned } = options;
  // One store per guide and mode; entry objects come from server props and may be new each render.
  const store = useMemo(
    () => createGuideStore(entry, { demo }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entry.slug, demo]
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, () => SERVER_SNAPSHOT);

  useEffect(() => {
    if (demo || typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUIDE_STATE_KEY(entry.slug)) store.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store, demo, entry.slug]);

  const dispatch = useCallback(
    (action: ProgressAction) => {
      const result = store.dispatch(action);
      if (result.earned.length && onEarned) onEarned(result.earned, result);
      return result;
    },
    [store, onEarned]
  );

  const xp = useMemo(() => xpSummary(state, entry.pages), [state, entry.pages]);
  return { state, dispatch, xp, store };
}
