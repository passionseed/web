"use client";

import { sceneCoordsToViewportCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useInsertionEffect, useMemo, useRef, useState } from "react";

import { EMOTES } from "@/lib/whiteboard/core";

import type { BoardEvent } from "./useWhiteboardSync";

type Burst = { key: number; emoji: string; x: number; y: number; drift: number };
type EmotePayload = { emoji: string; x: number; y: number };

const LIFETIME_MS = 2200;
/** Outgoing reactions per second from one person, so a burst of taps cannot flood the room. */
const MAX_PER_SECOND = 8;
const STYLE_ID = "whiteboard-emote-style";
const EMOTE_CSS = `
.whiteboard-emote {
  transform: translate(-50%, -50%);
  animation: whiteboard-emote-rise ${LIFETIME_MS}ms cubic-bezier(0.05, 0.7, 0.35, 0.99) forwards;
}
@keyframes whiteboard-emote-rise {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); filter: blur(4px); }
  15% { opacity: 1; transform: translate(-50%, -80%) scale(1.15); filter: blur(0); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--drift)), -320%) scale(1); filter: blur(2px); }
}
@media (prefers-reduced-motion: reduce) {
  .whiteboard-emote { animation-duration: 1ms; animation-delay: 1500ms; }
}
`;

/** Adds the emote keyframes to the page once, instead of rendering a <style> on every update. */
function injectEmoteStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = EMOTE_CSS;
  document.head.appendChild(style);
}
const isEmote = (e: string): e is (typeof EMOTES)[number] => (EMOTES as readonly string[]).includes(e);

/**
 * Emoji reactions that float up from where someone is pointing, for everyone
 * on the board. Fixed emoji only, nothing typed.
 */
export function useEmotes(
  api: ExcalidrawImperativeAPI | null,
  channel: { send: (event: string, payload: unknown) => void; on: (event: BoardEvent, fn: (p: unknown) => void) => () => void },
  pointer: React.MutableRefObject<{ x: number; y: number } | null>,
) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const counter = useRef(0);
  const sentAt = useRef<number[]>([]);
  const { send, on } = channel;

  const spawn = useCallback((p: EmotePayload) => {
    if (!isEmote(p.emoji)) return;
    const burst = { ...p, key: ++counter.current, drift: Math.random() * 40 - 20 };
    setBursts((list) => [...list.slice(-30), burst]);
    setTimeout(() => setBursts((list) => list.filter((b) => b.key !== burst.key)), LIFETIME_MS);
  }, []);

  useEffect(() => on("emote", (p) => spawn(p as EmotePayload)), [on, spawn]);

  const react = useCallback(
    (emoji: (typeof EMOTES)[number]) => {
      if (!api) return;
      const now = Date.now();
      sentAt.current = sentAt.current.filter((t) => now - t < 1000);
      if (sentAt.current.length >= MAX_PER_SECOND) return;
      sentAt.current.push(now);
      const { scrollX, scrollY, width, height, zoom } = api.getAppState();
      const at = pointer.current ?? { x: -scrollX + width / 2 / zoom.value, y: -scrollY + height / 2 / zoom.value };
      const payload = { emoji, x: at.x, y: at.y };
      spawn(payload);
      send("emote", payload);
    },
    [api, pointer, send, spawn],
  );

  return useMemo(() => ({ bursts, react }), [bursts, react]);
}

export function EmoteLayer({ api, bursts }: { api: ExcalidrawImperativeAPI; bursts: Burst[] }) {
  useInsertionEffect(injectEmoteStyle, []);
  const appState = api.getAppState();
  return (
    <div className="pointer-events-none absolute inset-0 z-[4] overflow-hidden">
      {bursts.map((b) => {
        const pos = sceneCoordsToViewportCoords({ sceneX: b.x, sceneY: b.y }, appState);
        return (
          <span
            key={b.key}
            className="whiteboard-emote absolute select-none text-4xl"
            style={{ left: pos.x, top: pos.y, "--drift": `${b.drift}px` } as React.CSSProperties}
          >
            {b.emoji}
          </span>
        );
      })}
    </div>
  );
}

export function EmotePicker({ onPick }: { onPick: (emoji: (typeof EMOTES)[number]) => void }) {
  return (
    <div className="wb-pill gap-0.5 px-1">
      {EMOTES.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          aria-label={`React ${emoji}`}
          className="rounded-lg px-1.5 py-1 text-xl transition-transform hover:scale-125 active:scale-95"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
