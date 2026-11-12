"use client";

/**
 * Level 3 (cybersecurity `triage`): the bucket vs the pipe. A tall pixel
 * bucket of vulnerabilities reported to open-source projects next to a thin
 * pipe of the ones known to be fixed. Something to look at, not a task, so it
 * reports no result. Fills once when it scrolls into view; with reduced motion
 * (or no IntersectionObserver) it shows the final state at once.
 */
import { useEffect, useRef, useState } from "react";
import type { BespokeProps } from "@/lib/radar-guide/guide-types";
import "./cyber.css";

export interface BucketPipeProps {
  [key: string]: string | number;
  titleTh: string;
  asOfTh: string;
  bucketLabelTh: string;
  bucket: number;
  pipeLabelTh: string;
  pipe: number;
  unitTh: string;
  ratioTh: string;
  ratioLabelTh: string;
  badgeTh: string;
}

const formatCount = (n: number) => n.toLocaleString("en-US");

/** Pure: the pipe's share of the bucket, 0..100 (%), at least 2 so it stays visible. */
export function pipeShare(pipe: number, bucket: number): number {
  if (!(bucket > 0)) return 0;
  return Math.max(2, Math.min(100, (pipe / bucket) * 100));
}

export default function BucketPipe({ props, reducedMotion }: BespokeProps<BucketPipeProps>) {
  const p = props;
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(reducedMotion);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);

  const share = pipeShare(Number(p.pipe), Number(p.bucket));

  return (
    <div
      ref={ref}
      className="cy-piece cy-bucket"
      data-shown={shown ? "" : undefined}
      data-still={reducedMotion ? "" : undefined}
    >
      <div className="cy-piece__head">
        <p className="cy-piece__title">{p.titleTh}</p>
        <span className="cy-badge">{p.badgeTh}</span>
      </div>
      <div className="cy-bucket__stage">
        <figure className="cy-bucket__col">
          <div className="cy-bucket__tank" aria-hidden>
            <div className="cy-bucket__water" style={{ height: shown ? "100%" : "0%" }} />
          </div>
          <figcaption>
            <span className="cy-bucket__num">{formatCount(Number(p.bucket))}</span>
            <span className="cy-bucket__cap">
              {p.bucketLabelTh} {p.unitTh}
            </span>
          </figcaption>
        </figure>
        <figure className="cy-bucket__col cy-bucket__col--pipe">
          <div className="cy-bucket__pipe" aria-hidden>
            <div className="cy-bucket__flow" style={{ height: shown ? `${share}%` : "0%" }} />
          </div>
          <figcaption>
            <span className="cy-bucket__num cy-bucket__num--pipe">{formatCount(Number(p.pipe))}</span>
            <span className="cy-bucket__cap">
              {p.pipeLabelTh} {p.unitTh}
            </span>
          </figcaption>
        </figure>
      </div>
      <p className="cy-piece__result">
        {p.ratioTh} <span className="cy-label">{p.ratioLabelTh}</span>
      </p>
      <p className="cy-piece__fine">{p.asOfTh}</p>
    </div>
  );
}
