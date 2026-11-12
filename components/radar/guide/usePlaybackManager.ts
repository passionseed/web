"use client";

/**
 * One playback manager per page (spec 2.5, playback rules).
 *
 * iOS (and the IG in-app browser) rejects unmuted autoplay without a tap on
 * that element, so the rules assume one tap per chapter:
 * 1. The first video in a visit may autoplay muted after its section has been
 *    at least 60% visible for 700ms, unless the visitor prefers reduced motion
 *    or has Save-Data on. A rejected play() shows the play button.
 * 2. Every later video shows its poster and play button. Once the visitor has
 *    turned sound on in this visit, the manager tries an unmuted play() after
 *    the same dwell; a rejection shows the play button. It never falls back to
 *    muted autoplay for later videos.
 * 3. Below 40% visible a video pauses. Only one video plays at a time.
 * 4. Tapping a muted video unmutes it and sets soundOn; the first unmute in a
 *    visit rewinds to 0.
 * 5. Tapping a video playing with sound toggles play and pause. The play
 *    button plays with sound.
 *
 * The class is framework-free so it can be tested with a mocked
 * HTMLMediaElement; the React glue is at the bottom of the file.
 */
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";

export const PLAYBACK_DWELL_MS = 700;
export const PLAYBACK_PLAY_RATIO = 0.6;
export const PLAYBACK_PAUSE_RATIO = 0.4;
export const SOUND_ON_STORAGE_KEY = "radar-guide:sound-on";

/** The subset of HTMLVideoElement the manager touches. */
export type ManagedMedia = Pick<HTMLMediaElement, "muted" | "paused" | "currentTime" | "play" | "pause">;

export interface PlaybackHandle {
  media: ManagedMedia;
  /** True when the manager could not start the video and the play button must show. */
  setNeedsTap(needsTap: boolean): void;
  /** Called when a tap turns sound on for a video that was playing muted. */
  onUnmute?(): void;
}

export interface PlaybackEnv {
  storage: Pick<Storage, "getItem" | "setItem"> | null;
  /** False with prefers-reduced-motion or Save-Data. */
  canAutoplayMuted(): boolean;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(id: unknown): void;
}

interface Entry {
  handle: PlaybackHandle;
  ratio: number;
  dwell: unknown;
  /** The visitor paused it; visibility never restarts it. */
  userPaused: boolean;
  ended: boolean;
}

export class PlaybackManager {
  private readonly env: PlaybackEnv;
  private readonly entries = new Map<string, Entry>();
  /** The one video allowed to autoplay muted (the first to reach the dwell). */
  private mutedAutoplayId: string | null = null;
  private autoplayDecided = false;
  private unmutedOnce = false;
  private soundOnValue: boolean;

  constructor(env: PlaybackEnv) {
    this.env = env;
    this.soundOnValue = readSoundOn(env.storage);
  }

  get soundOn(): boolean {
    return this.soundOnValue;
  }

  register(id: string, handle: PlaybackHandle): () => void {
    const previous = this.entries.get(id);
    if (previous?.dwell != null) this.env.clearTimeout(previous.dwell);
    this.entries.set(id, { handle, ratio: 0, dwell: null, userPaused: false, ended: false });
    return () => {
      const entry = this.entries.get(id);
      if (!entry || entry.handle !== handle) return;
      this.clearDwell(entry);
      this.entries.delete(id);
    };
  }

  /** Feed the section's intersection ratio (0..1). */
  setVisibility(id: string, ratio: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.ratio = ratio;
    if (ratio < PLAYBACK_PAUSE_RATIO) {
      this.clearDwell(entry);
      if (!entry.handle.media.paused) entry.handle.media.pause();
      return;
    }
    if (ratio < PLAYBACK_PLAY_RATIO) {
      this.clearDwell(entry);
      return;
    }
    if (entry.dwell != null || !entry.handle.media.paused) return;
    entry.dwell = this.env.setTimeout(() => {
      entry.dwell = null;
      this.onDwell(id);
    }, PLAYBACK_DWELL_MS);
  }

  /** The video's surface was tapped. */
  tap(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    const { media } = entry.handle;
    if (media.muted) {
      media.muted = false;
      if (!this.unmutedOnce) {
        this.unmutedOnce = true;
        media.currentTime = 0;
      }
      this.setSoundOn(true);
      entry.userPaused = false;
      entry.handle.onUnmute?.();
      if (media.paused) this.start(id, entry);
      return;
    }
    if (media.paused) {
      entry.userPaused = false;
      entry.ended = false;
      this.start(id, entry);
    } else {
      entry.userPaused = true;
      media.pause();
    }
  }

  /** The large play button: play with sound. */
  playWithSound(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.handle.media.muted = false;
    this.unmutedOnce = true;
    this.setSoundOn(true);
    entry.userPaused = false;
    entry.ended = false;
    this.start(id, entry);
  }

  /** "ดูอีกครั้ง" and the replay control. */
  replay(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    entry.handle.media.currentTime = 0;
    this.playWithSound(id);
  }

  /** The sound control: off mutes and clears soundOn; on behaves like a tap on a muted video. */
  setMuted(id: string, muted: boolean): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (!muted) {
      if (entry.handle.media.muted) this.tap(id);
      return;
    }
    entry.handle.media.muted = true;
    this.setSoundOn(false);
  }

  /** The play/pause control. */
  togglePlay(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    if (entry.handle.media.paused) {
      entry.userPaused = false;
      entry.ended = false;
      this.start(id, entry);
    } else {
      entry.userPaused = true;
      entry.handle.media.pause();
    }
  }

  markEnded(id: string): void {
    const entry = this.entries.get(id);
    if (entry) entry.ended = true;
  }

  pauseAll(exceptId?: string): void {
    for (const [id, entry] of this.entries) {
      if (id !== exceptId && !entry.handle.media.paused) entry.handle.media.pause();
    }
  }

  dispose(): void {
    for (const entry of this.entries.values()) this.clearDwell(entry);
    this.entries.clear();
  }

  private onDwell(id: string): void {
    const entry = this.entries.get(id);
    if (!entry || entry.userPaused || entry.ended || !entry.handle.media.paused) return;
    if (entry.ratio < PLAYBACK_PLAY_RATIO) return;

    if (this.soundOnValue) {
      entry.handle.media.muted = false;
      this.start(id, entry);
      return;
    }

    if (!this.autoplayDecided) {
      this.autoplayDecided = true;
      if (this.env.canAutoplayMuted()) this.mutedAutoplayId = id;
    }
    if (this.mutedAutoplayId === id) {
      entry.handle.media.muted = true;
      this.start(id, entry);
      return;
    }
    entry.handle.setNeedsTap(true);
  }

  private start(id: string, entry: Entry): void {
    this.pauseAll(id);
    entry.handle.setNeedsTap(false);
    let result: Promise<void> | undefined;
    try {
      result = entry.handle.media.play();
    } catch {
      entry.handle.setNeedsTap(true);
      return;
    }
    // Some engines still return undefined from play().
    if (result && typeof result.catch === "function") {
      result.catch(() => entry.handle.setNeedsTap(true));
    }
  }

  private clearDwell(entry: Entry): void {
    if (entry.dwell != null) {
      this.env.clearTimeout(entry.dwell);
      entry.dwell = null;
    }
  }

  private setSoundOn(value: boolean): void {
    this.soundOnValue = value;
    try {
      this.env.storage?.setItem(SOUND_ON_STORAGE_KEY, value ? "1" : "0");
    } catch {
      // Private mode or blocked storage: keep it in memory only.
    }
  }
}

function readSoundOn(storage: PlaybackEnv["storage"]): boolean {
  try {
    return storage?.getItem(SOUND_ON_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Browser environment and React glue
// ---------------------------------------------------------------------------

function safeSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** False with prefers-reduced-motion or `navigator.connection.saveData`. */
export function browserCanAutoplayMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {
    // matchMedia unavailable: assume no preference.
  }
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData !== true;
}

export function createBrowserPlaybackManager(): PlaybackManager {
  return new PlaybackManager({
    storage: safeSessionStorage(),
    canAutoplayMuted: browserCanAutoplayMuted,
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id as number),
  });
}

const PlaybackManagerContext = createContext<PlaybackManager | null>(null);

/**
 * Mount once around the deck (key it by field slug so each career is a fresh
 * visit). Videos rendered outside a provider share a page-level fallback.
 */
export function PlaybackManagerProvider({ children }: { children: ReactNode }) {
  const [manager] = useState(createBrowserPlaybackManager);
  useEffect(() => () => manager.dispose(), [manager]);
  return createElement(PlaybackManagerContext.Provider, { value: manager }, children);
}

let fallbackManager: PlaybackManager | null = null;

export function usePlaybackManager(): PlaybackManager {
  const context = useContext(PlaybackManagerContext);
  if (context) return context;
  if (!fallbackManager) fallbackManager = createBrowserPlaybackManager();
  return fallbackManager;
}
