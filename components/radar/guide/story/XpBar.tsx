/**
 * The chunky pixel XP bar for the sticky header: 12 segments plus "XP n/max".
 * XP is derived from progress (lib/radar-guide/story.ts xpSummary), so the bar
 * is the same on every render; the shell shows the "+50 XP" pop beside it.
 * Segments fill with a short step transition, off under reduced motion (CSS).
 */
import { xpSegments } from "./story-logic";
import "./story.css";

export interface XpBarProps {
  xp: number;
  max: number;
  segments?: number;
  /** Hide the "XP n/max" numbers (tight layouts). */
  compact?: boolean;
  className?: string;
}

export function XpBar({ xp, max, segments = 12, compact = false, className }: XpBarProps) {
  const filled = xpSegments(xp, max, segments);
  const safeMax = Math.max(0, max);
  const value = Math.max(0, Math.min(xp, safeMax));
  return (
    <div
      className={`rgs-xp ${className ?? ""}`}
      role="progressbar"
      aria-label="XP ของรันนี้"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={value}
      aria-valuetext={`${value} จาก ${safeMax} XP`}
      data-testid="xp-bar"
    >
      <span className="rgs-xp__track" aria-hidden="true">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={`rgs-xp__seg ${i < filled ? "rgs-xp__seg--on" : ""}`} />
        ))}
      </span>
      {compact ? null : (
        <span className="rgs-xp__num" aria-hidden="true">
          XP {value}
          <span className="rgs-xp__max">/{safeMax}</span>
        </span>
      )}
    </div>
  );
}
