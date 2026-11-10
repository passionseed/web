"use client";

import { Hand, VenetianMask } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { GameView } from "@/lib/whiteboard/games";

import { CardBack } from "./CardBack";

type MyCard = NonNullable<GameView["me"]>;

const HOLD_MS = 300;
const TAP_SHOW_MS = 5000;
/** A pointer that moves further than this is a scroll or swipe, not a tap or hold. */
const MOVE_PX = 8;

/**
 * My card, face down until I hold it (shown while pressed) or tap it (shown
 * for a few seconds), so sharing a screen does not give it away. Face down it
 * is the grain bloom (the same for a spy and everyone else); face up it is
 * plain paper and ink.
 */
export function CardView({
  card,
  seed = "",
  onShownChange,
}: {
  card: MyCard;
  /** Varies the card back's line, e.g. the round id. Decorative only. */
  seed?: string;
  onShownChange?: (shown: boolean) => void;
}) {
  const [shown, setShown] = useState(false);
  const press = useRef<{ at: number; x: number; y: number; wasShown: boolean } | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);
  const holdTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(hideTimer.current);
      window.clearTimeout(holdTimer.current);
    },
    [],
  );
  useEffect(() => onShownChange?.(shown), [shown, onShownChange]);

  const show = (ms?: number) => {
    window.clearTimeout(hideTimer.current);
    setShown(true);
    if (ms) hideTimer.current = window.setTimeout(() => setShown(false), ms);
  };
  const hide = () => {
    window.clearTimeout(hideTimer.current);
    setShown(false);
  };
  // A swipe across the card scrolls the panel and never turns it face up.
  const cancelPress = () => {
    window.clearTimeout(holdTimer.current);
    const p = press.current;
    press.current = null;
    if (p && !p.wasShown) hide();
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_PX) cancelPress();
  };

  return (
    <button
      type="button"
      aria-label={shown ? "ซ่อนการ์ด · Hide card" : "ดูการ์ดของฉัน · Show my card"}
      className="wb-spy-cardbtn touch-pan-y select-none"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        press.current = { at: Date.now(), x: e.clientX, y: e.clientY, wasShown: shown };
        // Face up only once the press is held still, so a passing swipe never shows it.
        window.clearTimeout(holdTimer.current);
        if (!shown) holdTimer.current = window.setTimeout(() => press.current && show(), HOLD_MS);
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={cancelPress}
      onPointerUp={() => {
        window.clearTimeout(holdTimer.current);
        const p = press.current;
        press.current = null;
        if (!p) return;
        // Held: it showed while pressed. A tap on a shown card hides it; otherwise it stays up a moment.
        if (Date.now() - p.at >= HOLD_MS || p.wasShown) hide();
        else show(TAP_SHOW_MS);
      }}
      onPointerCancel={cancelPress}
      onClick={(e) => {
        // Keyboard (Enter/Space) has no pointer events.
        if (e.detail !== 0) return;
        if (shown) hide();
        else show(TAP_SHOW_MS);
      }}
    >
      <span className={`wb-spy-card ${shown ? "wb-spy-card--face" : ""} ${shown && card.spy ? "wb-spy-card--spy" : ""}`}>
        {!shown && <CardBack seed={`${seed}:${card.seat}`} />}
        <span className="wb-spy-seat">
          ที่นั่ง <span className="wb-num">{card.seat + 1}</span>
        </span>
        {!shown ? null : card.spy ? (
          <>
            <VenetianMask className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            <span className="text-base font-semibold">คุณคือสายลับ · You are the spy</span>
            <span className="wb-soft text-xs">ฟังคำถามแล้วเดาว่าเราอยู่ที่ไหน ดูรายชื่อสถานที่ด้านล่าง</span>
          </>
        ) : (
          <>
            <span className="wb-soft text-[11px]">สถานที่ · Location</span>
            <span className="wb-spy-place">{card.location}</span>
            <span className="wb-soft mt-1.5 text-[11px]">บทบาทของคุณ · Your role</span>
            <span className="text-sm font-semibold">{card.role}</span>
          </>
        )}
      </span>
      {/* Kept in the layout while the card is up, so nothing below it jumps. */}
      <span className={`wb-spy-hint ${shown ? "invisible" : ""}`}>
        <Hand className="h-4 w-4" aria-hidden />
        <span>
          แตะหรือกดค้างเพื่อดูการ์ด <span className="wb-soft">· Tap or hold to see your card</span>
        </span>
      </span>
    </button>
  );
}
