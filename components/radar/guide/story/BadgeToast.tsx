/**
 * One earned badge, as a small pixel toast: glyph, "ได้ตราใหม่", name and the
 * one-line description. Presentational: the shell queues badges, wraps the
 * toast in its polite live region and dismisses it after BADGE_TOAST_MS.
 * It pops in with a two-step pixel bounce, off under reduced motion (CSS).
 */
import type { BadgeDef } from "@/lib/radar-guide/story";
import { PixelIcon } from "./PixelSprite";
import "./story.css";

export const BADGE_TOAST_MS = 2800;

export interface BadgeToastProps {
  badge: BadgeDef;
  /** Tap to dismiss early. */
  onDismiss?(): void;
  className?: string;
}

export function BadgeToast({ badge, onDismiss, className }: BadgeToastProps) {
  const body = (
    <>
      <span className="rgs-toast__icon" aria-hidden="true">
        <PixelIcon icon={badge.icon} size={32} color="var(--rgs-accent)" color2="#ff8a4c" />
      </span>
      <span className="rgs-toast__text">
        <span className="rgs-toast__kicker">ได้ตราใหม่</span>
        <span className="rgs-toast__name">{badge.nameTh}</span>
        <span className="rgs-toast__desc">{badge.descTh}</span>
      </span>
    </>
  );
  return onDismiss ? (
    <button type="button" className={`rgs-toast rgs-pixel-box ${className ?? ""}`} onClick={onDismiss} data-testid="badge-toast">
      {body}
    </button>
  ) : (
    <div className={`rgs-toast rgs-pixel-box ${className ?? ""}`} data-testid="badge-toast">
      {body}
    </div>
  );
}
