"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { createCampfireAudio } from "./campfireAudio";
import { CAMPFIRE } from "./copy";

export interface CampfireSoundState {
  playing: boolean;
  pending: boolean;
  failed: boolean;
  toggle: () => void;
}

/**
 * Opt-in island ambience, independent of Discord presence or the campfire
 * read. A hook, so the sound keeps playing while the control that toggles it
 * (the menu's tile) comes and goes.
 */
export function useCampfireSound(): CampfireSoundState {
  const audio = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onVisibility = () => {
      const context = audio.current;
      if (!context) return;
      const operation = document.hidden ? context.suspend() : context.resume();
      void operation.catch(() => {
        if (audio.current !== context) return;
        audio.current = null;
        void context.close().catch(() => {});
        setPlaying(false);
        setFailed(true);
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      const context = audio.current;
      audio.current = null;
      if (context) void context.close().catch(() => {});
    };
  }, []);

  async function toggle() {
    if (pending) return;
    setFailed(false);
    const previous = audio.current;
    if (previous) {
      audio.current = null;
      setPlaying(false);
      void previous.close().catch(() => {});
      return;
    }
    setPending(true);
    let context: AudioContext | null = null;
    try {
      context = createCampfireAudio();
      audio.current = context;
      await context.resume();
      if (audio.current === context) {
        if (document.hidden) await context.suspend();
        setPlaying(true);
      }
    } catch {
      if (audio.current === context) {
        audio.current = null;
        setFailed(true);
      }
      if (context) void context.close().catch(() => {});
    } finally {
      setPending(false);
    }
  }

  return { playing, pending, failed, toggle };
}

/** The ambience as one round button (the island before a plot is claimed). */
export function CampfireSound({ className }: { className: string }) {
  const { playing, pending, failed, toggle } = useCampfireSound();
  const label = failed ? CAMPFIRE.soundError : playing ? CAMPFIRE.soundOff : CAMPFIRE.soundOn;
  const Icon = playing ? Volume2 : VolumeX;
  return (
    <button type="button" className={className} aria-label={label} title={label} aria-pressed={playing} disabled={pending} onClick={toggle}>
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
