"use client";

/** Shows the badge on top of the shell's toast queue (U7 useGuideProgress dismisses it after a few seconds). */
import { BadgeToast } from "@/components/radar/guide/story";
import type { BadgeDef } from "@/lib/radar-guide/story";

export function BadgeToastHost({ badge, onDismiss }: { badge: BadgeDef | null; onDismiss?(): void }) {
  return (
    <div className="rg-toast-host" aria-live="polite" aria-atomic="true">
      {badge ? <BadgeToast key={badge.id} badge={badge} onDismiss={onDismiss} /> : null}
    </div>
  );
}
