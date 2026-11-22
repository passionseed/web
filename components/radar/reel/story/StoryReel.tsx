"use client";

/**
 * A story reel frame: frame N of the timeline, drawn whole from the frame
 * number (scene, cast, words, wipe, end card, and P'Seed through GuideNPC's
 * clock), so any frame can be drawn in any order and looks the same every
 * time. StoryReelStudio decides which frame to draw.
 *
 * Text is measured once it is laid out (fit.ts), still before the frame is
 * shown: on the end card, P'Seed stands below wherever the share line ends,
 * so the two can never overlap.
 */
import { useLayoutEffect, useRef, useState } from "react";

import { FRAME_MS } from "@/lib/radar-stories/timing";

import { CAST_LOOK, END_HOST, endHostSpot, headTop, STAGE_FLOOR, stageXs, STORY_FRAME } from "./cast";
import type { StoryEndCard } from "./endCard";
import { AvatarActor, HostActor, mouthOpen } from "./StoryCast";
import { EndCardView } from "./StoryEndCard";
import { Dim, FilmGrain, PixelWipe, SceneArt, SceneForeground } from "./StoryScene";
import { BigLine, hookScale, NarrationLine, SpeechBubble } from "./StoryText";
import { hostMoodAt, phaseAt, segmentAt, wipeAt, type CastWho, type StoryTimeline } from "./storyTimeline";
import "./storyReel.css";

/** The element radar:story films; it fills the 432x768 viewport. */
export const STORY_FRAME_ID = "radar-story-frame";

const NO_ENTRANCE = -10_000;
type HostSpot = ReturnType<typeof endHostSpot>;
const RESTING_SPOT: HostSpot = endHostSpot(0);

/** `el`'s bottom edge in `root`'s coordinates, from layout (transforms such as the pop are ignored). */
function bottomWithin(el: HTMLElement, root: HTMLElement): number {
  let y = el.offsetHeight;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return y;
}

export function StoryReel({ timeline, frame, card }: { timeline: StoryTimeline; frame: number; card: StoryEndCard }) {
  const f = Math.max(0, Math.min(timeline.totalF - 1, Math.round(frame)));
  const phase = phaseAt(timeline, f);
  const segment = segmentAt(timeline, f);
  const wipe = wipeAt(timeline, f);
  const cue = phase.kind === "beat" ? phase.cue : null;
  const speaker: CastWho | null = cue && cue.beat.who !== "text" ? cue.beat.who : null;
  const talkingNow = Boolean(cue && f >= cue.startF && f < cue.startF + cue.talkF);
  const end = phase.kind === "end";

  const xs = stageXs(segment.cast.map((c) => c.who));
  const placed = segment.cast.map((c, i) => ({ ...c, x: xs[i], enterF: c.enterF > segment.startF ? c.enterF : NO_ENTRANCE }));
  // During the hook only the people already there at the start are on stage.
  const onStage = placed.filter((p) => f >= p.enterF && (phase.kind !== "hook" || p.enterF === NO_ENTRANCE));
  const host = placed.find((p) => p.who === "host");
  const big = phase.kind === "hook" || Boolean(cue?.beat.big);
  // Words stay above the highest head on stage.
  const headY = onStage.length ? Math.min(...onStage.map((p) => headTop(p.who))) : null;

  // The end card: P'Seed below the share line, measured once the card is laid out.
  const root = useRef<HTMLDivElement>(null);
  const [endSpot, setEndSpot] = useState<HostSpot>(RESTING_SPOT);
  // Runs after the card's own text has been fitted (children's layout effects run first).
  useLayoutEffect(() => {
    if (!end || !root.current) return;
    const share = root.current.querySelector<HTMLElement>("[data-end-share]");
    if (!share) return;
    const spot = endHostSpot(bottomWithin(share, root.current));
    if (spot?.top !== endSpot?.top || spot?.cell !== endSpot?.cell) setEndSpot(spot);
  }, [end, card, f, endSpot]);
  const hostOn = end ? endSpot !== null : Boolean(host && onStage.includes(host));

  // P'Seed's clock: on screen since it appeared, in its pose since its line (or the end card, or this beat) began.
  const appearF = end ? timeline.end.startF : host && host.enterF !== NO_ENTRANCE ? host.enterF : segment.startF;
  const poseF = end ? timeline.end.startF : Math.max(appearF, cue ? cue.startF : 0);
  const hostClock = { ms: (f - appearF) * FRAME_MS, poseMs: (f - poseF) * FRAME_MS };

  return (
    <div ref={root} className="sr-frame" style={{ width: STORY_FRAME.width, height: STORY_FRAME.height }} data-frame={f} data-phase={phase.kind}>
      <div key="backdrop" className="absolute inset-0">
        {end ? (
          <EndCardView card={card} frameInCard={f - timeline.end.startF} />
        ) : (
          <>
            <SceneArt scene={segment.scene} frame={f} />
            <Dim amount={big ? 0.5 : 0} />
            {onStage
              .filter((p) => p.who !== "host")
              .map((p) => (
                <AvatarActor
                  key={p.who}
                  who={p.who as Exclude<CastWho, "host">}
                  x={p.x}
                  frame={f}
                  enterF={p.enterF}
                  speaking={speaker === null || speaker === p.who}
                  talking={speaker === p.who && cue !== null && mouthOpen(f, cue.startF, cue.talkF)}
                />
              ))}
            <SceneForeground scene={segment.scene} />
          </>
        )}
      </div>
      <div key="host" className="absolute inset-0">
        <HostActor
          x={end ? END_HOST.x : host?.x ?? STORY_FRAME.width / 2}
          floor={end ? endSpot?.floor ?? STAGE_FLOOR : STAGE_FLOOR}
          cell={end ? endSpot?.cell ?? CAST_LOOK.host.cell : CAST_LOOK.host.cell}
          frame={f}
          enterF={end ? NO_ENTRANCE : host?.enterF ?? NO_ENTRANCE}
          visible={hostOn}
          speaking={end || speaker === null || speaker === "host"}
          talking={speaker === "host" && talkingNow}
          mood={hostMoodAt(phase, f)}
          clock={hostClock}
        />
      </div>
      <div key="words" className="absolute inset-0">
        {phase.kind === "hook" ? <BigLine text={timeline.hookTh} who={null} hook headY={headY} scale={hookScale(f, timeline.hook.endF)} /> : null}
        {cue && cue.beat.big ? <BigLine text={cue.beat.lineTh} who={cue.beat.who} stress={cue.beat.stressTh} headY={headY} /> : null}
        {cue && !cue.beat.big && cue.beat.who === "text" ? <NarrationLine cue={cue} frame={f} headY={headY} /> : null}
        {cue && !cue.beat.big && speaker ? (
          <SpeechBubble
            key={cue.index}
            cue={cue}
            frame={f}
            speakerX={onStage.find((p) => p.who === speaker)?.x ?? null}
            headY={onStage.some((p) => p.who === speaker) ? headTop(speaker) : STAGE_FLOOR - 160}
          />
        ) : null}
      </div>
      <div key="wipe" className="absolute inset-0">
        {wipe ? <PixelWipe progress={wipe.progress} closing={wipe.closing} /> : null}
      </div>
      <FilmGrain key="grain" frame={f} />
    </div>
  );
}
