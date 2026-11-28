import { useSyncExternalStore } from "react";

import { ALL_LAYERS, barSeconds, musicBar, type Layer, type SongId } from "@/lib/hackathon/elemental/quiz-music";
import { connectMaster, type SfxOut } from "@/lib/hackathon/elemental/quiz-sfx";

/**
 * Plays the quiz's sounds (lib/hackathon/elemental/quiz-sfx.ts) in the
 * browser. Sound is on unless the person turned it off; that choice stays in
 * this browser. Nothing plays before their first tap, because browsers only
 * start audio from one, and on iPhone it stays silent when the ring switch is
 * on silent and mixes with their music instead of stopping it.
 *
 * Sound is a garnish: nothing here may throw into the quiz. Every sound
 * plays on a channel, so muting, a new preview, or leaving the reveal can
 * cut what is already playing.
 *
 * The music (lib/hackathon/elemental/quiz-music.ts) is one song per page:
 * the title theme on the intro, the quiz loop (building as you go) under the
 * questions, each element's theme on its result page. Songs crossfade, the
 * music steps out for the reveal, and it stops while the tab is hidden.
 */

const KEY = "elemental-quiz-sound";
const listeners = new Set<() => void>();
let on: boolean | null = null;
let out: SfxOut | null = null;

/** "ui": taps. "preview": an icon tapped to hear it (a new tap replaces the last). "reveal": the result landing. "music": the loop. */
export type Channel = "ui" | "preview" | "reveal" | "music";
const buses = new Map<Channel, GainNode>();
/** The latest sound asked for while the browser was still starting audio: only it plays, and only if audio starts in time. */
let waiting: symbol | null = null;
const RESUME_GRACE_MS = 120;
/** How long a cut takes: quick, but a fade, so it never clicks. */
const CUT_S = 0.012;

function stored(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function soundOn(): boolean {
  if (on === null) on = typeof window === "undefined" ? true : stored();
  return on;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether sound is on, kept in step across every toggle on the page. */
export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, soundOn, () => true);
}

export function setSoundOn(next: boolean) {
  on = next;
  try {
    window.localStorage.setItem(KEY, next ? "on" : "off");
  } catch {
    // Storage blocked: the choice lasts until the page closes.
  }
  if (next && musicWanted) startMusic(musicWanted);
  if (!next) {
    stopMusic({ keepWanted: true });
    for (const channel of [...buses.keys()]) stop(channel);
  }
  listeners.forEach((l) => l());
}

type AudioSession = { type: string };

/** The page's one audio context, made on first use and remade if the browser closed it. */
function audio(): SfxOut | null {
  if (typeof window === "undefined") return null;
  if (out && (out.ctx as AudioContext).state === "closed") {
    out = null;
    buses.clear();
  }
  if (!out) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    try {
      // "ambient": mix with the person's music, and respect the iPhone ring switch (Safari 16.4+).
      const session = (navigator as Navigator & { audioSession?: AudioSession }).audioSession;
      if (session) session.type = "ambient";
    } catch {
      // Not supported here: the default session is fine.
    }
    const ctx = new Ctx();
    out = { ctx, dest: connectMaster(ctx) };
  }
  return out;
}

/**
 * Starts the browser's audio from a tap, without playing anything. Call it
 * first thing in a tap whose sound comes later (after a share sheet closes).
 */
export function unlock() {
  try {
    const o = audio();
    const ctx = o?.ctx as AudioContext | undefined;
    if (soundOn() && ctx && ctx.state !== "running") void ctx.resume().catch(() => {});
  } catch {
    // No audio: the quiz works without it.
  }
}

function bus(o: SfxOut, channel: Channel): GainNode {
  let g = buses.get(channel);
  if (!g) {
    g = o.ctx.createGain();
    g.connect(o.dest);
    buses.set(channel, g);
  }
  return g;
}

/** Fades out everything playing on `channel` (over `fade` seconds) and retires it, including notes already scheduled. */
export function stop(channel: Channel, fade = CUT_S) {
  const g = buses.get(channel);
  if (!g || !out) return;
  buses.delete(channel);
  try {
    const now = out.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + fade);
    setTimeout(() => g.disconnect(), fade * 1000 + 100);
  } catch {
    // Already gone.
  }
}

/**
 * Plays a sound now on `channel`, if sound is on. `replace` cuts what is
 * already playing there first. The first sound should come from a tap,
 * which is what lets the browser start audio; a sound asked for while audio
 * is still starting plays only if it starts within 120 ms, so cues never
 * pile up and land together late.
 */
export function play(sound: (o: SfxOut, t: number) => void, { channel = "ui", replace = false }: { channel?: Channel; replace?: boolean } = {}) {
  try {
    if (!soundOn()) return;
    const o = audio();
    if (!o) return;
    if (replace) stop(channel);
    const ctx = o.ctx as AudioContext;
    const run = () => sound({ ctx, dest: bus(o, channel) }, ctx.currentTime + 0.01);
    if (ctx.state === "running") {
      run();
      return;
    }
    const token = Symbol();
    waiting = token;
    const asked = performance.now();
    ctx
      .resume()
      .then(() => {
        if (waiting !== token || !soundOn() || performance.now() - asked > RESUME_GRACE_MS) return;
        waiting = null;
        run();
      })
      .catch(() => {});
  } catch {
    // No audio, or it failed: the quiz carries on in silence.
  }
}

// ---------------------------------------------------------------- music

const MUSIC_FADE_IN_S = 1.5;
const MUSIC_FADE_OUT_S = 0.6;
/** Bars are scheduled this far ahead, checked four times a second. */
const MUSIC_LOOKAHEAD_S = 1.2;
/** The song the page wants, playing or not (sound off, tab hidden). */
let musicWanted: SongId | null = null;
let musicPlaying: SongId | null = null;
let musicLayers: readonly Layer[] = ALL_LAYERS;
let musicTimer: ReturnType<typeof setInterval> | null = null;
let watchingVisibility = false;

/** Music stops while the tab is hidden and comes back when it returns, if it's still wanted. */
function watchVisibility() {
  if (watchingVisibility || typeof document === "undefined") return;
  watchingVisibility = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopMusic({ keepWanted: true });
    else if (musicWanted) startMusic(musicWanted);
  });
}

/** Which parts the music plays from the next bar on (the quiz adds them as you go). */
export function setMusicLayers(layers: readonly Layer[]) {
  musicLayers = layers;
}

/**
 * Plays `song`, fading in over 1.5 s (crossfading from another song), if
 * sound is on and the tab is showing; otherwise remembers it's wanted. Call
 * it from a tap the first time, like `play`; from a page load, pass
 * `ifRunning` so it only carries on audio a tap already started.
 */
export function startMusic(song: SongId, layers: readonly Layer[] = ALL_LAYERS, { ifRunning = false }: { ifRunning?: boolean } = {}) {
  musicWanted = song;
  musicLayers = layers;
  watchVisibility();
  try {
    if (!soundOn() || (typeof document !== "undefined" && document.hidden)) return;
    // Without a tap, only carry on audio that's already running (arriving from the quiz); never start it cold.
    if (ifRunning && (!out || (out.ctx as AudioContext).state !== "running")) return;
    if (musicPlaying === song && musicTimer) return;
    if (musicTimer) stopMusic({ keepWanted: true });
    const o = audio();
    if (!o) return;
    const ctx = o.ctx as AudioContext;
    if (ctx.state !== "running") void ctx.resume().catch(() => {});
    const g = bus(o, "music");
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + MUSIC_FADE_IN_S);
    musicPlaying = song;
    const barS = barSeconds(song);
    let bar = 0;
    let at = ctx.currentTime + 0.3;
    const tick = () => {
      try {
        const dest = buses.get("music");
        if (!dest) return;
        // While audio is paused, keep the next bar just ahead; after a stall, skip ahead rather than cram bars in.
        if (ctx.state !== "running" || at < ctx.currentTime) at = ctx.currentTime + 0.3;
        while (at < ctx.currentTime + MUSIC_LOOKAHEAD_S) {
          musicBar({ ctx, dest }, at, bar, song, musicLayers);
          bar++;
          at += barS;
        }
      } catch {
        // A bar failed to schedule: the next tick tries the next one.
      }
    };
    tick();
    musicTimer = setInterval(tick, 250);
  } catch {
    // No audio: the quiz carries on in silence.
  }
}

/**
 * Fades the music out over 0.6 s. `keepWanted` pauses it (tab hidden, sound
 * off, a song change) so it can come back. `only` stops it only if one of
 * those songs is the one wanted, so a page leaving can't stop the next
 * page's song.
 */
export function stopMusic({ keepWanted = false, only }: { keepWanted?: boolean; only?: readonly SongId[] } = {}) {
  if (only && (!musicWanted || !only.includes(musicWanted))) return;
  if (!keepWanted) musicWanted = null;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  musicPlaying = null;
  stop("music", MUSIC_FADE_OUT_S);
}
