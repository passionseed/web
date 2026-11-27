import { useSyncExternalStore } from "react";

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
 */

const KEY = "elemental-quiz-sound";
const listeners = new Set<() => void>();
let on: boolean | null = null;
let out: SfxOut | null = null;

/** "ui": taps. "preview": an icon tapped to hear it (a new tap replaces the last). "reveal": the result landing. */
export type Channel = "ui" | "preview" | "reveal";
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
  if (!next) for (const channel of [...buses.keys()]) stop(channel);
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

/** Fades out everything playing on `channel` and retires it, including notes already scheduled. */
export function stop(channel: Channel) {
  const g = buses.get(channel);
  if (!g || !out) return;
  buses.delete(channel);
  try {
    const now = out.ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(g.gain.value, now);
    g.gain.linearRampToValueAtTime(0, now + CUT_S);
    setTimeout(() => g.disconnect(), 100);
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
