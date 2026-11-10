"use client";

import { Eye, VenetianMask } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { GameView } from "@/lib/whiteboard/games";

type MyCard = NonNullable<GameView["me"]>;

const HOLD_MS = 300;
const TAP_SHOW_MS = 5000;
/** A pointer that moves further than this is a scroll or swipe, not a tap or hold. */
const MOVE_PX = 8;

/**
 * My card, face down until I hold it (shown while pressed) or tap it (shown
 * for a few seconds), so sharing a screen does not give it away.
 */
export function CardView({ card, onShownChange }: { card: MyCard; onShownChange?: (shown: boolean) => void }) {
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
      className="relative flex min-h-36 w-full touch-pan-y select-none flex-col items-center justify-center gap-1 rounded-2xl border border-[color:var(--wb-hairline-strong)] p-4 text-center"
      style={{ background: shown ? "color-mix(in srgb, #f97316 12%, transparent)" : "repeating-linear-gradient(45deg, rgba(249,115,22,0.18) 0 10px, rgba(249,115,22,0.08) 10px 20px)" }}
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
      <span className="absolute left-3 top-2 text-xs font-semibold opacity-60">ที่นั่ง {card.seat + 1}</span>
      {!shown ? (
        <>
          <Eye className="h-6 w-6 opacity-60" />
          <span className="text-sm font-semibold">แตะหรือกดค้างเพื่อดูการ์ด</span>
          <span className="text-xs opacity-60">Tap or hold to see your card</span>
        </>
      ) : card.spy ? (
        <>
          <VenetianMask className="h-7 w-7" />
          <span className="text-lg font-bold">คุณคือสายลับ · You are the spy</span>
          <span className="text-xs opacity-70">ฟังคำถามแล้วเดาว่าเราอยู่ที่ไหน ดูรายชื่อสถานที่ด้านล่าง</span>
        </>
      ) : (
        <>
          <span className="text-xs opacity-60">สถานที่ · Location</span>
          <span className="text-lg font-bold leading-tight">{card.location}</span>
          <span className="mt-1 text-xs opacity-60">บทบาทของคุณ · Your role</span>
          <span className="text-base font-semibold">{card.role}</span>
        </>
      )}
    </button>
  );
}
