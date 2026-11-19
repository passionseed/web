"use client";

/**
 * A story reel frame: frame N of the timeline, drawn whole from the frame
 * number (scene, cast, words, wipe, end card, and P'Seed through GuideNPC's
 * clock), so any frame can be drawn in any order and looks the same every
 * time. StoryReelStudio decides which frame to draw.
 */
import { FRAME_MS } from "@/lib/radar-stories/timing";

import { CAST_LOOK, slotXs, STAGE_FLOOR, STORY_FRAME } from "./cast";
import type { StoryEndCard } from "./endCard";
import { AvatarActor, HostActor, mouthOpen } from "./StoryCast";
import { EndCardView } from "./StoryEndCard";
import { Dim, PixelWipe, SceneArt } from "./StoryScene";
import { BigLine, DialogueLine, NarrationLine } from "./StoryText";
import { phaseAt, segmentAt, wipeAt, type CastWho, type StoryTimeline } from "./storyTimeline";
import "./storyReel.css";

/** The element radar:story films; it fills the 432x768 viewport. */
export const STORY_FRAME_ID = "radar-story-frame";

/** Where P'Seed stands on the end card, and how big. */
const END_HOST = { x: STORY_FRAME.width / 2, floor: STAGE_FLOOR + 24, cell: 3.6 } as const;
const NO_ENTRANCE = -10_000;

export function StoryReel({ timeline, frame, card }: { timeline: StoryTimeline; frame: number; card: StoryEndCard }) {
  const f = Math.max(0, Math.min(timeline.totalF - 1, Math.round(frame)));
  const phase = phaseAt(timeline, f);
  const segment = segmentAt(timeline, f);
  const wipe = wipeAt(timeline, f);
  const cue = phase.kind === "beat" ? phase.cue : null;
  const speaker: CastWho | null = cue && cue.beat.who !== "text" ? cue.beat.who : null;
  const talkingNow = Boolean(cue && f >= cue.startF && f < cue.startF + cue.talkF);

  const xs = slotXs(segment.cast.length);
  const placed = segment.cast.map((c, i) => ({ ...c, x: xs[i], enterF: c.enterF > segment.startF ? c.enterF : NO_ENTRANCE }));
  // During the hook only the people already there at the start are on stage.
  const onStage = placed.filter((p) => f >= p.enterF && (phase.kind !== "hook" || p.enterF === NO_ENTRANCE));
  const host = placed.find((p) => p.who === "host");
  const hostOn = phase.kind === "end" || Boolean(host && onStage.includes(host));
  const big = phase.kind === "hook" || Boolean(cue?.beat.big);

  // P'Seed's clock: on screen since it appeared, in its pose since its line (or the end card, or this beat) began.
  const appearF = phase.kind === "end" ? timeline.end.startF : host && host.enterF !== NO_ENTRANCE ? host.enterF : segment.startF;
  const poseF = phase.kind === "end" ? timeline.end.startF : Math.max(appearF, cue ? cue.startF : 0);
  const hostClock = { ms: (f - appearF) * FRAME_MS, poseMs: (f - poseF) * FRAME_MS };

  return (
    <div className="sr-frame" style={{ width: STORY_FRAME.width, height: STORY_FRAME.height }} data-frame={f} data-phase={phase.kind}>
      <div key="backdrop" className="absolute inset-0">
        {phase.kind === "end" ? (
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
          </>
        )}
      </div>
      <div key="host" className="absolute inset-0">
        <HostActor
          x={phase.kind === "end" ? END_HOST.x : host?.x ?? STORY_FRAME.width / 2}
          floor={phase.kind === "end" ? END_HOST.floor : STAGE_FLOOR}
          cell={phase.kind === "end" ? END_HOST.cell : CAST_LOOK.host.cell}
          frame={f}
          enterF={phase.kind === "end" ? NO_ENTRANCE : host?.enterF ?? NO_ENTRANCE}
          visible={hostOn}
          speaking={phase.kind === "end" || speaker === null || speaker === "host"}
          talking={speaker === "host" && talkingNow}
          mood={phase.kind === "end" ? "wink" : speaker === "host" ? cue?.beat.mood ?? "talk" : "idle"}
          clock={hostClock}
        />
      </div>
      <div key="words" className="absolute inset-0">
        {phase.kind === "hook" ? <BigLine text={timeline.hookTh} who={null} hook /> : null}
        {cue && cue.beat.big ? <BigLine text={cue.beat.lineTh} who={cue.beat.who} /> : null}
        {cue && !cue.beat.big && cue.beat.who === "text" ? <NarrationLine cue={cue} frame={f} /> : null}
        {cue && !cue.beat.big && speaker ? <DialogueLine cue={cue} frame={f} speakerX={onStage.find((p) => p.who === speaker)?.x ?? null} /> : null}
      </div>
      <div key="wipe" className="absolute inset-0">
        {wipe ? <PixelWipe progress={wipe.progress} closing={wipe.closing} /> : null}
      </div>
    </div>
  );
}
