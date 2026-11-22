"use client";

/**
 * The studio frame for a story reel (app/studio/radar-story/[id]).
 *
 * Render mode (`?render=1`, driven by scripts/radar-guide/story.ts): nothing
 * but a preload layer shows until `window.__radarStory.start()`; then the CLI
 * calls `seek(frame, platform)` and screenshots, once per frame. `seek`
 * renders synchronously and every frame is a pure function of its number
 * (P'Seed runs on GuideNPC's clock), so each screenshot is exactly that frame.
 *
 * Preview mode (no `render`): plays on its own in a loop with Instagram's safe
 * zones drawn over it; click to restart; `?t=12.5` holds one moment.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { HOST_FRAME_NAMES, hostSpriteSrc } from "@/components/radar/guide/story/story-logic";
import type { ReelCues } from "@/components/shift/poster/testimonial/reelEngine";
import { storySceneSrc } from "@/lib/radar-stories/scenes";
import { FRAME_MS } from "@/lib/radar-stories/timing";
import type { StoryScript } from "@/lib/radar-stories/types";

import { SAFE, STORY_FRAME } from "./cast";
import { storyEndCard, type StoryPlatform } from "./endCard";
import { trirong } from "./fonts";
import { STORY_FRAME_ID, StoryReel } from "./StoryReel";
import { buildStoryTimeline } from "./storyTimeline";

export interface RadarStoryHandle {
  ready: boolean;
  started: boolean;
  id: string;
  totalFrames: number;
  /** First frame of the end card (IG and TikTok differ from here on). */
  endStartFrame: number;
  cues: ReelCues;
  start(): void;
  seek(frame: number, platform?: StoryPlatform): void;
}

declare global {
  interface Window {
    /** Driven by scripts/radar-guide/story.ts. */
    __radarStory?: RadarStoryHandle;
  }
}

/** Every image a reel can show, so none is still loading when it first appears. */
function storyImages(script: StoryScript): string[] {
  const scenes = script.beats.map((b) => storySceneSrc(b.scene)).filter((s): s is string => Boolean(s));
  return Array.from(new Set([...scenes, storySceneSrc("radar")!, ...HOST_FRAME_NAMES.map(hostSpriteSrc)]));
}

async function decodeAll(srcs: string[]): Promise<void> {
  await Promise.all(
    srcs.map(async (src) => {
      const img = new Image();
      img.src = src;
      try {
        await img.decode();
      } catch {
        // a missing scene shows the night fallback; the CLI's lint already failed it
      }
    })
  );
}

/** Text in every face and weight the reel uses, so the fonts are loaded before frame 0. */
function Warm({ script }: { script: StoryScript }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, opacity: 0, pointerEvents: "none" }}>
      {storyImages(script).map((src) => (
        // eslint-disable-next-line @next/next/no-img-element -- a plain eager preload, never shown
        <img key={src} src={src} alt="" width={4} height={4} />
      ))}
      {[200, 300, 400, 500, 600].map((w) => (
        <span key={w} style={{ fontFamily: "var(--sr-serif)", fontWeight: w }}>
          {script.hookTh} {script.endCardTh} ฉัน
        </span>
      ))}
      <span style={{ fontFamily: "var(--sr-pixel)" }}>CAREER RADAR</span>
      <span style={{ fontFamily: "var(--sr-mono)", fontWeight: 700 }}>passionseed.org</span>
    </div>
  );
}

/**
 * The platforms' own UI (cast.ts SAFE): the top 14%, the right 12% rail and
 * the bottom 20%, with the line readable copy stays above (65%). Preview only.
 */
function SafeZones() {
  const { width: w, height: h } = STORY_FRAME;
  const zone = "absolute border-dashed border-cyan-300/70 bg-cyan-300/10";
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className={`${zone} inset-x-0 top-0 border-b`} style={{ height: SAFE.top }} />
      <div className={`${zone} inset-x-0 bottom-0 border-t`} style={{ height: h - SAFE.floor }} />
      <div className={`${zone} right-0 border-l`} style={{ width: w - SAFE.right, top: SAFE.top, bottom: h - SAFE.floor }} />
      <div className="absolute inset-x-0 border-t border-dashed border-cyan-300/40" style={{ top: SAFE.bottom }} />
    </div>
  );
}

export function StoryReelStudio({
  script,
  hookTh,
  platform: initialPlatform,
  render,
  stillSeconds,
}: {
  script: StoryScript;
  hookTh: string;
  platform: StoryPlatform;
  render: boolean;
  stillSeconds: number | null;
}) {
  const timeline = useMemo(() => buildStoryTimeline(script, hookTh), [script, hookTh]);
  const [platform, setPlatform] = useState<StoryPlatform>(initialPlatform);
  const [frame, setFrame] = useState(stillSeconds !== null ? Math.round(stillSeconds * 30) : 0);
  const [started, setStarted] = useState(!render);
  const [take, setTake] = useState(0);
  const card = useMemo(() => storyEndCard(script, platform), [script, platform]);
  const t0 = useRef(0);

  // Render mode: the handle the CLI drives.
  useEffect(() => {
    if (!render) return;
    const handle: RadarStoryHandle = {
      ready: false,
      started: false,
      id: script.id,
      totalFrames: timeline.totalF,
      endStartFrame: timeline.end.startF,
      cues: timeline.cues,
      start() {
        handle.started = true;
        flushSync(() => {
          setFrame(0);
          setStarted(true);
        });
      },
      seek(f, p) {
        flushSync(() => {
          setFrame(f);
          if (p) setPlatform(p);
        });
      },
    };
    window.__radarStory = handle;
    let alive = true;
    void (async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await Promise.all([decodeAll(storyImages(script)), document.fonts.ready]);
      if (alive) handle.ready = true;
    })();
    return () => {
      alive = false;
      if (window.__radarStory === handle) delete window.__radarStory;
    };
  }, [render, script, timeline]);

  // Preview mode: real-time playback, looping.
  useEffect(() => {
    if (render || stillSeconds !== null) return;
    let raf = 0;
    t0.current = performance.now();
    const tick = () => {
      setFrame(Math.floor((performance.now() - t0.current) / FRAME_MS) % timeline.totalF);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [render, stillSeconds, timeline, take]);

  const frameBox = (
    <div
      id={STORY_FRAME_ID}
      className={`sr-frame ${trirong.variable}`}
      // Render mode: pinned over the site's navbar and everything else, like the demo reels' PageFrame.
      style={{ width: STORY_FRAME.width, height: STORY_FRAME.height, ...(render ? { position: "fixed", left: 0, top: 0, zIndex: 2147483000 } : {}) }}
    >
      {started ? <StoryReel key={take} timeline={timeline} frame={frame} card={card} /> : <div className="absolute inset-0" style={{ backgroundColor: "#120a14" }} />}
      <Warm script={script} />
      {!render ? <SafeZones /> : null}
    </div>
  );

  if (render) {
    return (
      <>
        <style>{`html,body{width:${STORY_FRAME.width}px;height:${STORY_FRAME.height}px;margin:0;overflow:hidden;scrollbar-width:none}::-webkit-scrollbar{display:none}nextjs-portal{display:none!important}`}</style>
        {frameBox}
      </>
    );
  }

  const seconds = (frame / 30).toFixed(1);
  return (
    <div className="flex flex-col items-start gap-4">
      <style>{"nextjs-portal{display:none!important}"}</style>
      <button type="button" onClick={() => setTake((t) => t + 1)} title="Click to restart" className="block cursor-pointer border-0 bg-transparent p-0">
        {frameBox}
      </button>
      <p className="m-0 font-mono text-xs text-neutral-400">
        {script.id} · {platform} · {seconds}s / {timeline.seconds.toFixed(1)}s · cyan = platform UI (preview only)
      </p>
    </div>
  );
}
