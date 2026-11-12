"use client";

/**
 * Renders the caption cue active at `time` over a video box (spec 2.5):
 * Bai Jamjuree 600, 18px mobile and 20px desktop, white on a dark strip, at
 * most two lines, 18% above the bottom of the box. The parent box must be
 * `position: relative`. Also imported by the admin chapter preview (Unit E).
 */
import { useMemo } from "react";
import { activeCue, parseVtt, type VttCue } from "@/lib/radar-guide/vtt";
import "./guide.css";

export interface CaptionOverlayProps {
  /** Parsed cues; pass `vtt` instead to parse here. */
  cues?: readonly VttCue[];
  vtt?: string | null;
  /** Current playback time in seconds. */
  time: number;
  enabled?: boolean;
  className?: string;
}

export function CaptionOverlay({ cues, vtt, time, enabled = true, className }: CaptionOverlayProps) {
  const parsed = useMemo(() => cues ?? parseVtt(vtt), [cues, vtt]);
  if (!enabled) return null;
  const cue = activeCue(parsed, time);
  return (
    <div className={`radar-guide-captions ${className ?? ""}`} aria-hidden="true">
      {cue ? (
        <p className="radar-guide-captions__cue" data-testid="caption-cue">
          {cue.text}
        </p>
      ) : null}
    </div>
  );
}
