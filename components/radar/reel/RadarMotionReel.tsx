"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { cameraKeyframes, flashKeyframes } from "@/components/shift/poster/testimonial/reelEngine";
import { REEL_H, REEL_W, useRenderMode, whole } from "@/components/shift/poster/testimonial/reelParts";

import { DUSK } from "./duskCity";
import { DuskSky, EdgeLines, ProgressDots, SeriesTag, Sources } from "./parts";
import type { RadarReelPayload } from "./payload";
import { buildRadarReelTimeline, type RadarReelScene, type RadarReelTimeline } from "./radarReel";
import { AiScore } from "./scenes/AiScore";
import { Compare } from "./scenes/Compare";
import { Cover } from "./scenes/Cover";
import { DayInLife } from "./scenes/DayInLife";
import { EndCard } from "./scenes/EndCard";
import { FantasyReality } from "./scenes/FantasyReality";
import { HookStat } from "./scenes/HookStat";
import { SalaryLadder } from "./scenes/SalaryLadder";
import { StartStep } from "./scenes/StartStep";
import "./radarReel.css";

/** The element scripts/radar-guide/reel.ts films. */
export const RADAR_REEL_ELEMENT_ID = "radar-reel";

function SceneView({ scene, payload, last }: { scene: RadarReelScene; payload: RadarReelPayload; last: boolean }) {
  const common = { scene, last };
  switch (scene.id) {
    case "hook":
      return <HookStat {...common} data={payload.hook} nameTh={payload.nameTh} />;
    case "reality":
      return payload.reality ? <FantasyReality {...common} data={payload.reality} /> : null;
    case "money":
      return payload.money ? <SalaryLadder {...common} data={payload.money} /> : null;
    case "ai":
      return payload.ai ? <AiScore {...common} data={payload.ai} /> : null;
    case "day":
      return payload.day ? <DayInLife {...common} data={payload.day} /> : null;
    case "study":
      return payload.study ? <DayInLife {...common} data={payload.study} /> : null;
    case "start":
      return payload.start ? <StartStep {...common} data={payload.start} /> : null;
    case "compare":
      return payload.compare ? <Compare {...common} data={payload.compare} /> : null;
    case "end":
      return <EndCard {...common} data={payload.end} />;
  }
}

function Stage({ payload, children }: { payload: RadarReelPayload; children: ReactNode }) {
  return (
    <div
      id={RADAR_REEL_ELEMENT_ID}
      className="relative shrink-0 overflow-hidden"
      style={{ width: REEL_W, height: REEL_H, backgroundColor: DUSK.plum }}
    >
      <DuskSky seed={payload.slug} />
      {children}
      <EdgeLines />
      <SeriesTag tag={payload.seriesTag} />
    </div>
  );
}

function Timeline({ payload, timeline, render }: { payload: RadarReelPayload; timeline: RadarReelTimeline; render: boolean }) {
  useRenderMode(render, timeline.cues);
  const { seconds, scenes } = timeline;
  return (
    <Stage payload={payload}>
      <style>{cameraKeyframes(timeline.cues)}</style>
      <style>{flashKeyframes(timeline.cues)}</style>
      <div className="absolute inset-0 origin-[50%_40%]" style={whole("reel-cam", seconds)}>
        {scenes.map((scene, i) => (
          <SceneView key={scene.id} scene={scene} payload={payload} last={i === scenes.length - 1} />
        ))}
        <Sources sources={payload.sources} />
      </div>
      <ProgressDots scenes={scenes} />
      <div className="pointer-events-none absolute inset-0" style={{ backgroundColor: DUSK.cream, ...whole("reel-flash", seconds) }} />
    </Stage>
  );
}

/** The still cover: no timeline, so it is ready once fonts load and the dot type has lit. */
function CoverFrame({ payload }: { payload: RadarReelPayload }) {
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      window.setTimeout(() => {
        if (!cancelled) window.__reelReady = true;
      }, 1200);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <Stage payload={payload}>
      <Cover payload={payload} />
    </Stage>
  );
}

/**
 * Career Radar motion reel, 1080x1920, Dusk City style. Plays live; click to
 * replay. With `render`, every animation is paused and `window.__seekReel`
 * jumps to a frame so scripts/radar-guide/reel.ts can film it, and
 * `window.__reelCues` is the cue sheet the soundtrack is scored from.
 */
export function RadarMotionReel({ payload, render = false, cover = false }: { payload: RadarReelPayload; render?: boolean; cover?: boolean }) {
  const timeline = useMemo(() => buildRadarReelTimeline(payload), [payload]);
  const [take, setTake] = useState(0);
  if (cover) return <CoverFrame payload={payload} />;
  return (
    <div key={take} onClick={render ? undefined : () => setTake((t) => t + 1)} title={render ? undefined : "Click to replay"}>
      <Timeline payload={payload} timeline={timeline} render={render} />
    </div>
  );
}
