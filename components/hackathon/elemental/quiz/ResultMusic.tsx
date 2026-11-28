"use client";

import { useEffect } from "react";

import type { ElementKey } from "@/components/hackathon/elemental/media";

import { startMusic, stopMusic } from "./sound";

/**
 * The result page's music: its element's theme. Arriving from the quiz, it
 * carries straight on; a friend opening a shared link hears it after their
 * first tap on the icon (PlayableIcon's `music`). It stops when the page goes.
 */
export function ResultMusic({ element }: { element: ElementKey }) {
  useEffect(() => {
    startMusic(element, undefined, { ifRunning: true });
    return () => stopMusic({ only: [element] });
  }, [element]);
  return null;
}
