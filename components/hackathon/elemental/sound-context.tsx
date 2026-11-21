"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

interface SoundContextValue {
  /** Defaults to true; unmuted audio engages automatically on first user gesture if browser blocks initial unmuted autoplay. */
  soundOn: boolean;
  audioUnlocked: boolean;
  activeAudioId: string | null;
  toggleSound: () => void;
  markAudioUnlocked: () => void;
  activateVideoWithSound: (id: string) => void;
  reportVisibility: (id: string, ratio: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function ElementalSoundProvider({ children }: { children: React.ReactNode }) {
  const [soundOn, setSoundOn] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const ratiosRef = useRef<Map<string, number>>(new Map());
  const pinnedIdRef = useRef<string | null>(null);

  // Unlock browser audio policy automatically on the first tap, click, or keypress anywhere on the page.
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => setAudioUnlocked(true);
    window.addEventListener("pointerdown", unlock, { passive: true, once: true });
    window.addEventListener("keydown", unlock, { passive: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [audioUnlocked]);

  const pickWinner = useCallback(() => {
    let bestId: string | null = null;
    let bestRatio = 0.35;
    for (const [id, ratio] of ratiosRef.current.entries()) {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestId = id;
      }
    }
    if (pinnedIdRef.current) {
      const pinnedRatio = ratiosRef.current.get(pinnedIdRef.current) ?? 0;
      if (pinnedRatio >= 0.35) {
        bestId = pinnedIdRef.current;
      } else {
        pinnedIdRef.current = null;
      }
    }
    setActiveAudioId(bestId);
  }, []);

  const reportVisibility = useCallback(
    (id: string, ratio: number) => {
      ratiosRef.current.set(id, ratio);
      pickWinner();
    },
    [pickWinner]
  );

  const toggleSound = useCallback(() => {
    setAudioUnlocked(true);
    setSoundOn((prev) => {
      const next = !prev;
      if (!next) pinnedIdRef.current = null;
      return next;
    });
  }, []);

  const markAudioUnlocked = useCallback(() => {
    setAudioUnlocked(true);
  }, []);

  const activateVideoWithSound = useCallback((id: string) => {
    pinnedIdRef.current = id;
    setAudioUnlocked(true);
    setSoundOn(true);
    setActiveAudioId(id);
  }, []);

  const value = useMemo(
    () => ({
      soundOn,
      audioUnlocked,
      activeAudioId,
      toggleSound,
      markAudioUnlocked,
      activateVideoWithSound,
      reportVisibility,
    }),
    [
      soundOn,
      audioUnlocked,
      activeAudioId,
      toggleSound,
      markAudioUnlocked,
      activateVideoWithSound,
      reportVisibility,
    ]
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useElementalSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useElementalSound must be used inside ElementalSoundProvider");
  return ctx;
}
