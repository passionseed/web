"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { timing } from "@/components/shift/poster/testimonial/reelParts";

import { DEMO_FRAME, type DemoReelPlan } from "./demoReel";
import { demoCameraCues, locateDemoStep, revealDemoTarget } from "./demoDriver";
import { canDotType, DUSK, KANIT } from "./duskCity";
import { DotType, DuskSky, EdgeLines, Highlighted, SeriesTag, Strip } from "./parts";
import { RADAR_REEL_SERIES_TAG, toReelLine } from "./payload";
import "./radarReel.css";

/** The element radar:reel films; it fills the 432x768 viewport in render mode. */
export const DEMO_FRAME_ID = "radar-demo-frame";

type Phase = "idle" | "hook" | "page" | "end" | "done";

export interface RadarDemoHandle {
  ready: boolean;
  started: boolean;
  done: boolean;
  /** Steps whose target was not on the page. */
  misses: string[];
  plan: DemoReelPlan;
  start(): void;
}

declare global {
  interface Window {
    /** Driven by scripts/radar-guide/reel.ts (--format demo). */
    __radarDemo?: RadarDemoHandle;
  }
}

const SCALE = DEMO_FRAME.width / 1080;

/** A 1080x1920 Dusk City card shrunk onto the 432x768 frame. */
function Card1080({ seed, children }: { seed: string; children: ReactNode }) {
  return (
    <div className="absolute left-0 top-0 overflow-hidden" style={{ width: 1080, height: 1920, transform: `scale(${SCALE})`, transformOrigin: "0 0", backgroundColor: DUSK.plum }}>
      <DuskSky seed={seed} />
      {children}
      <EdgeLines />
      <SeriesTag tag={RADAR_REEL_SERIES_TAG} />
    </div>
  );
}

function HookCard({ plan }: { plan: DemoReelPlan }) {
  return (
    <Card1080 seed={`${plan.slug}-${plan.pageKey}`}>
      <div className="absolute flex flex-col items-center gap-14" style={{ left: 84, right: 84, top: 420 }}>
        <div className="reel-pop" style={timing(0.15)}>
          <Strip size={68}>{plan.hookTh}</Strip>
        </div>
        {plan.statTh ? (
          <div className="reel-pop text-center" style={timing(0.9)}>
            <Highlighted line={toReelLine(plan.statTh)} size={56} />
          </div>
        ) : null}
      </div>
    </Card1080>
  );
}

function EndCard({ plan }: { plan: DemoReelPlan }) {
  const { end } = plan;
  return (
    <Card1080 seed={`${plan.slug}-end`}>
      <div className="absolute flex flex-col items-center" style={{ left: 84, right: 84, top: 380 }}>
        <div className="reel-pop" style={timing(0.4)}>
          <Strip size={64}>{end.headline}</Strip>
        </div>
        <div className="mt-14">
          {canDotType(end.keyword) ? (
            <DotType text={end.keyword} at={1.2} cell={34} />
          ) : (
            <p className="reel-pop text-center" style={{ fontFamily: KANIT, fontSize: 60, fontWeight: 700, color: DUSK.orange, margin: 0, ...timing(1.2) }}>
              {end.keyword}
            </p>
          )}
        </div>
        {end.kind === "comment_radar" ? (
          <p className="reel-pop mt-12 text-center" style={{ fontFamily: KANIT, fontSize: 48, color: DUSK.cream, margin: 0, ...timing(1.8) }}>
            {end.sub}
          </p>
        ) : null}
        {end.sendToFriend ? (
          <p className="reel-pop mt-10 text-center" style={{ fontFamily: KANIT, fontSize: 40, color: DUSK.cream, opacity: 0.92, margin: 0, ...timing(2.6) }}>
            {end.sendToFriend}
          </p>
        ) : null}
      </div>
    </Card1080>
  );
}

/** Instagram's own UI covers the top band and the bottom 35%: preview only, never filmed. */
function SafeZones() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-x-0 top-0 border-b border-dashed border-cyan-300/70 bg-cyan-300/10" style={{ height: DEMO_FRAME.height * 0.12 }} />
      <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-cyan-300/70 bg-cyan-300/10" style={{ height: DEMO_FRAME.height * 0.35 }} />
      <div className="absolute bottom-0 right-0 border-l border-dashed border-cyan-300/70 bg-cyan-300/10" style={{ width: DEMO_FRAME.width * 0.15, top: DEMO_FRAME.height * 0.45 }} />
    </div>
  );
}

/** A pixel fingertip where a demo step taps. */
function Touch({ x, y }: { x: number; y: number }) {
  return (
    <span
      className="absolute block"
      style={{
        left: x - 14,
        top: y - 14,
        width: 28,
        height: 28,
        backgroundColor: `${DUSK.cream}cc`,
        boxShadow: `0 0 0 4px ${DUSK.magenta}`,
        imageRendering: "pixelated",
        clipPath: "polygon(25% 0, 75% 0, 75% 25%, 100% 25%, 100% 75%, 75% 75%, 75% 100%, 25% 100%, 25% 75%, 0 75%, 0 25%, 25% 25%)",
      }}
    />
  );
}

/**
 * The filming frame for demo reels: a hook card, then the live level (the
 * children: the guide shell in demo mode), then the end card. Timers only, so
 * Chrome virtual time in radar:reel makes every frame deterministic. In render
 * mode the clock waits for `window.__radarDemo.start()`; otherwise it starts
 * once fonts load.
 *
 * The level's own DemoPlayer performs the steps; it starts when the shell
 * mounts. So the level is mounted once early (engine chunks load, behind the
 * hook card) and mounted again, fresh, the moment the hook card ends: its
 * DemoPlayer then runs on the reel's clock (DEMO_REEL_TIMING.leadInMs equals
 * DemoPlayer's DEMO_LEAD_IN_MS). This frame only follows along: it scrolls each
 * target into view, draws the fingertip and records missing targets.
 */
export function PageFrame({ plan, render, children }: { plan: DemoReelPlan; render: boolean; children: ReactNode }) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [touch, setTouch] = useState<{ id: number; x: number; y: number } | null>(null);
  /** Bumped when the level shows: remounts the level so its DemoPlayer starts on the reel's clock. */
  const [run, setRun] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    const cancels: (() => void)[] = [];
    const handle: RadarDemoHandle = {
      ready: false,
      started: false,
      done: false,
      misses: [],
      plan,
      start() {
        if (handle.started) return;
        handle.started = true;
        setPhase("hook");
        timers.push(
          window.setTimeout(() => {
            window.scrollTo(0, 0);
            setRun((r) => r + 1);
            setPhase("page");
          }, plan.pageStartMs)
        );
        for (const cue of demoCameraCues(plan.steps)) {
          timers.push(
            window.setTimeout(() => {
              const root = pageRef.current;
              if (!root) return;
              if (cue.kind === "reveal") {
                cancels.push(revealDemoTarget(cue.step, root));
                return;
              }
              const outcome = locateDemoStep(cue.step, root);
              if (outcome.miss) handle.misses.push(outcome.miss);
              if (outcome.point) setTouch({ id: cue.index, ...outcome.point });
            }, plan.pageStartMs + cue.at)
          );
        }
        // Scroll steps get no camera cue (DemoPlayer scrolls); still report a missing target.
        plan.steps.forEach((step) => {
          if (step.action !== "scroll") return;
          timers.push(
            window.setTimeout(() => {
              const root = pageRef.current;
              const miss = root ? locateDemoStep(step, root).miss : undefined;
              if (miss) handle.misses.push(miss);
            }, plan.pageStartMs + step.at)
          );
        });
        timers.push(window.setTimeout(() => setPhase("end"), plan.endStartMs));
        timers.push(
          window.setTimeout(() => {
            handle.done = true;
            setPhase("done");
          }, plan.totalMs)
        );
      },
    };
    window.__radarDemo = handle;
    let alive = true;
    void document.fonts.ready.then(() => {
      if (!alive) return;
      handle.ready = true;
      if (!render) handle.start();
    });
    return () => {
      alive = false;
      timers.forEach((t) => window.clearTimeout(t));
      cancels.forEach((c) => c());
      if (window.__radarDemo === handle) delete window.__radarDemo;
    };
  }, [plan, render]);

  useEffect(() => {
    if (!touch) return;
    const t = window.setTimeout(() => setTouch((cur) => (cur?.id === touch.id ? null : cur)), 450);
    return () => window.clearTimeout(t);
  }, [touch]);

  const overlay = phase === "hook" || phase === "idle" ? <HookCard plan={plan} /> : phase === "end" || phase === "done" ? <EndCard plan={plan} /> : null;

  return (
    <>
      {render ? (
        <style>{`html,body{width:${DEMO_FRAME.width}px;overflow-x:hidden;scrollbar-width:none}::-webkit-scrollbar{display:none}nextjs-portal{display:none!important}`}</style>
      ) : (
        <style>{"nextjs-portal{display:none!important}"}</style>
      )}
      <div id={DEMO_FRAME_ID} ref={pageRef} className="relative" style={{ width: DEMO_FRAME.width, minHeight: DEMO_FRAME.height }}>
        <div key={run} data-demo-run={run}>
          {children}
        </div>
      </div>
      <div
        className="pointer-events-none fixed left-0 top-0 z-[2147483000] overflow-hidden"
        style={{ width: DEMO_FRAME.width, height: DEMO_FRAME.height }}
        data-phase={phase}
      >
        {overlay}
        {touch ? <Touch x={touch.x} y={touch.y} /> : null}
        {!render ? <SafeZones /> : null}
      </div>
    </>
  );
}
