import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight } from "lucide-react";

import { paper } from "@/components/shift/ShiftRiso";
import type { AboutMilestone } from "@/lib/content/about";

const PAPER = "#f2ead9";
const BLACK = "#17151c";
/** Two metro lines: the one we left and the one we took. `text` is the readable tint for small type. */
const LINES = {
  before: { stroke: "#0078bf", text: "#5cb8f0", badgeFg: PAPER },
  after: { stroke: "#ffe800", text: "#ffe800", badgeFg: BLACK },
};
const LINE_W = 6;
/** Where each line runs, as the centre of the stroke in px from the left. */
const BEFORE_X = 11;
const AFTER_X = 55;
const STATION = 20;

type Line = (typeof LINES)["before"];

function LineBadge({ line, label }: { line: Line; label: string }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-[3px] px-2.5 text-xs font-bold leading-none"
      style={{ backgroundColor: line.stroke, color: line.badgeFg }}
    >
      {label}
    </span>
  );
}

/** A station: a paper disc ringed in its line's colour. */
function Station({ x, line, top = 4 }: { x: number; line: Line; top?: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute rounded-full"
      style={{
        left: x - STATION / 2,
        top,
        width: STATION,
        height: STATION,
        backgroundColor: PAPER,
        border: `${LINE_W - 1}px solid ${line.stroke}`,
        boxShadow: `0 0 0 3px ${BLACK}`,
      }}
    />
  );
}

function Segment({ x, line, from = 0, to }: { x: number; line: Line; from?: number; to?: number }) {
  return (
    <span
      aria-hidden="true"
      className="about-draw absolute"
      style={{
        left: x - LINE_W / 2,
        width: LINE_W,
        top: from,
        ...(to === undefined ? { bottom: 0 } : { height: to - from }),
        backgroundColor: line.stroke,
        borderRadius: LINE_W,
      }}
    />
  );
}

function StopText({ step, line }: { step: AboutMilestone; line: Line }) {
  const title = (
    <span className="font-kodchasan text-xl font-semibold">
      {step.title}
      {step.href && <ArrowUpRight className="ml-1.5 inline h-4 w-4 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden="true" />}
    </span>
  );
  return (
    <>
      <div>
        {step.href ? (
          <Link href={step.href} className="group transition-colors hover:text-[#ffe800]">
            {title}
          </Link>
        ) : (
          title
        )}
      </div>
      <p className="mt-1 text-xs font-semibold tracking-[0.08em] tabular-nums" style={{ color: line.text }}>
        {step.when}
      </p>
      {step.body && (
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: paper("a6") }}>
          {step.body}
        </p>
      )}
    </>
  );
}

/** Where the line runs out: dashes fading off, because it keeps going. */
function Extension({ x, line }: { x: number; line: Line }) {
  return (
    <span
      aria-hidden="true"
      className="absolute"
      style={{
        left: x - LINE_W / 2,
        top: 4 + STATION + 6,
        width: LINE_W,
        height: 72,
        backgroundImage: `repeating-linear-gradient(180deg, ${line.stroke} 0 9px, transparent 9px 16px)`,
        borderRadius: LINE_W,
        maskImage: "linear-gradient(180deg, #000 20%, transparent)",
        WebkitMaskImage: "linear-gradient(180deg, #000 20%, transparent)",
      }}
    />
  );
}

/**
 * Our history as a metro map. The blue line is where we taught; at the
 * pivot we change at an interchange onto the yellow line, where students
 * build. The lines draw themselves as they scroll in where scroll timelines
 * exist; elsewhere they are simply there.
 */
export function AboutTrail({
  steps,
  stamp,
  lines,
}: {
  steps: readonly AboutMilestone[];
  stamp: string;
  lines: { before: string; after: string };
}) {
  const turn = steps.findIndex((s) => s.pivot);
  return (
    <div className="relative">
      <div className="mb-6" style={{ paddingLeft: 0 }}>
        <LineBadge line={LINES.before} label={lines.before} />
      </div>
      {steps.map((step, i) => {
        const key = `${step.when}-${step.title}`;
        const last = i === steps.length - 1;
        const after = turn >= 0 && i > turn;

        if (i === turn) {
          // The interchange: the blue line ends, the yellow one begins beside it.
          return (
            <div key={key} className="relative pb-10" style={{ paddingLeft: AFTER_X + 32 }}>
              <Segment x={BEFORE_X} line={LINES.before} to={14} />
              <Segment x={AFTER_X} line={LINES.after} from={14} to={last ? 14 : undefined} />
              <span
                aria-hidden="true"
                className="absolute rounded-full"
                style={{
                  left: BEFORE_X - STATION / 2 - 4,
                  top: 0,
                  width: AFTER_X - BEFORE_X + STATION + 8,
                  height: STATION + 8,
                  backgroundColor: PAPER,
                  boxShadow: `0 0 0 3px ${BLACK}, 2px 6px 10px -4px rgba(0,0,0,0.8)`,
                }}
              />
              <Station x={BEFORE_X} line={LINES.before} />
              <Station x={AFTER_X} line={LINES.after} />
              <div className="about-sign-scroll -mt-1 mb-4">
                <span
                  className="inline-flex h-9 items-center gap-2.5 rounded-[3px] px-1.5"
                  style={{
                    backgroundColor: "#2b2832",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 3px 8px 14px -6px rgba(0,0,0,0.85)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px]"
                    style={{ backgroundColor: LINES.after.stroke, color: BLACK }}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-bold leading-none" style={{ color: PAPER }}>
                    {stamp}
                  </span>
                  <LineBadge line={LINES.after} label={lines.after} />
                </span>
              </div>
              <StopText step={step} line={LINES.after} />
            </div>
          );
        }

        const x = after ? AFTER_X : BEFORE_X;
        const line = after ? LINES.after : LINES.before;
        return (
          <div key={key} className={`relative ${last ? "" : "pb-10"}`} style={{ paddingLeft: x + 32 }}>
            <Segment x={x} line={line} to={last ? 14 : undefined} />
            {last && <Extension x={x} line={line} />}
            <Station x={x} line={line} />
            <StopText step={step} line={line} />
          </div>
        );
      })}
    </div>
  );
}
