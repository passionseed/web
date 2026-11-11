"use client";

/**
 * Level 1 cold open (cybersecurity `mythos`): "เธอเกิดปีไหน". Seven year chips
 * plus "ไม่บอก"; a pixel timeline runs from the year the bug was written, past
 * the player's birth year, to today, and says how long the bug sat in the code
 * before the player was born.
 *
 * Privacy: the chosen year is never stored or sent. Only the
 * `<pageKey>:<blockId>` tap (no value) is tracked, once.
 * Demo parts: `<blockId>.year-<year>`, `<blockId>.skip`.
 * Reduced motion: the timeline fill appears at its final width.
 */
import { useState } from "react";
import type { BespokeProps } from "@/lib/radar-guide/guide-types";
import "./cyber.css";

export interface BirthYearTimelineProps {
  [key: string]: string | number | number[];
  promptTh: string;
  years: number[];
  skipTh: string;
  bugYear: number;
  nowYear: number;
  bugLabelTh: string;
  youLabelTh: string;
  nowLabelTh: string;
  resultTh: string;
  resultNoYearTh: string;
  privacyTh: string;
}

type Pick = number | "skip" | null;

/** Pure: the result line for a pick ("{n}" = years between the bug and the birth year). */
export function birthYearResult(p: BirthYearTimelineProps, pick: Exclude<Pick, null>): string {
  if (pick === "skip") return p.resultNoYearTh;
  const n = Math.max(0, pick - p.bugYear);
  return p.resultTh.replace("{n}", String(n));
}

/** Pure: position of a year on the timeline, 0..100 (%). */
export function yearPosition(year: number, from: number, to: number): number {
  if (to <= from) return 0;
  return Math.min(100, Math.max(0, ((year - from) / (to - from)) * 100));
}

export default function BirthYearTimeline({
  pageKey,
  blockId,
  props,
  tracker,
  demo,
  reducedMotion,
  onResult,
}: BespokeProps<BirthYearTimelineProps>) {
  const [pick, setPick] = useState<Pick>(null);
  const p = props;
  const years = Array.isArray(p.years) ? p.years : [];

  const choose = (next: Exclude<Pick, null>) => {
    const first = pick === null;
    setPick(next);
    if (!first) return;
    if (!demo) tracker.track({ type: "interactive_tap", pageKey, target: `${pageKey}:${blockId}` });
    onResult?.({ done: true });
  };

  const youAt = typeof pick === "number" ? yearPosition(pick, p.bugYear, p.nowYear) : null;
  const fillTo = pick === null ? 0 : (youAt ?? 100);

  return (
    <div className="cy-piece cy-birth" data-still={reducedMotion ? "" : undefined}>
      <p className="cy-piece__prompt">{p.promptTh}</p>
      <div className="cy-birth__chips" role="group" aria-label={p.promptTh}>
        {years.map((y) => (
          <button
            key={y}
            type="button"
            className="cy-chip"
            aria-pressed={pick === y}
            data-demo={`${blockId}.year-${y}`}
            onClick={() => choose(y)}
          >
            {y}
          </button>
        ))}
        <button
          type="button"
          className="cy-chip cy-chip--ghost"
          aria-pressed={pick === "skip"}
          data-demo={`${blockId}.skip`}
          onClick={() => choose("skip")}
        >
          {p.skipTh}
        </button>
      </div>

      <div className="cy-birth__line" aria-hidden={pick === null}>
        <div className="cy-birth__track">
          <div className="cy-birth__fill" style={{ width: `${fillTo}%` }} />
          <span className="cy-birth__mark cy-birth__mark--bug" style={{ left: "0%" }}>
            <span className="cy-bug" aria-hidden />
            <span className="cy-birth__label">
              <b>{p.bugYear}</b>
              {p.bugLabelTh}
            </span>
          </span>
          {youAt !== null ? (
            <span className="cy-birth__mark cy-birth__mark--you" style={{ left: `${youAt}%` }}>
              <span className="cy-pin" aria-hidden />
              <span className="cy-birth__label">
                <b>{pick}</b>
                {p.youLabelTh}
              </span>
            </span>
          ) : null}
          <span className="cy-birth__mark cy-birth__mark--now" style={{ left: "100%" }}>
            <span className="cy-pin cy-pin--now" aria-hidden />
            <span className="cy-birth__label">
              <b>{p.nowYear}</b>
              {p.nowLabelTh}
            </span>
          </span>
        </div>
      </div>

      <p className="cy-piece__result" aria-live="polite">
        {pick === null ? " " : birthYearResult(p, pick)}
      </p>
      <p className="cy-piece__fine">{p.privacyTh}</p>
    </div>
  );
}
