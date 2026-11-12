"use client";

/**
 * A level's founder clip as a cutscene. Inline, the step is a small card
 * (poster or the host, the hook, "ดูคัตซีน"); the cutscene itself (U7
 * Cutscene: full-bleed 9:16 in a portal, tap to play with sound, captions,
 * "ข้าม") opens on its own the first time the step is revealed, and from the
 * card any time after. Without recorded media the cutscene is the host NPC
 * saying the same script lines, so the level is complete either way.
 *
 * The shell side: progress (watched or skipped), `video_*` events with
 * `pageKey` (play from the cutscene's event hook; progress milestones and
 * complete from the playing <video>, matched by URL), and the transcript.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cutscene } from "@/components/radar/guide/story";
import type { ClipMedia, ClipSlot } from "@/lib/radar-guide/guide-types";
import { cueTranscript, type VttCue } from "@/lib/radar-guide/vtt";
import { GUIDE_HOST, levelSceneSrc } from "@/lib/radar-guide/story";
import { newProgressMilestones, VIDEO_COMPLETE_FRACTION } from "../guide-helpers";
import { TranscriptSheet } from "../TranscriptSheet";
import { NextGlyph } from "./glyphs";
import { useGuideShell } from "./shell-context";

/** Client-safe shape of registry.server LoadedClip. */
export interface GuideClipData {
  slot: ClipSlot;
  /** null: not recorded yet; the cutscene falls back to the host NPC. */
  media: ClipMedia | null;
  cues: VttCue[];
}

export interface GuideClipProps {
  pageKey: string;
  stepId: string;
  titleTh: string;
  clip: GuideClipData;
}

function sameUrl(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const base = typeof window !== "undefined" ? window.location.href : "https://passionseed.org/";
    return new URL(a, base).href === new URL(b, base).href;
  } catch {
    return a === b;
  }
}

/**
 * video_progress (25/50/75) and video_complete for the <video> playing `url`.
 * Media events do not bubble, so this listens in the capture phase on the
 * document, which also reaches the cutscene's portal.
 */
export function useClipProgressEvents(url: string | null, pageKey: string) {
  const { tracker } = useGuideShell();
  const trackerRef = useRef(tracker);
  useEffect(() => {
    trackerRef.current = tracker;
  }, [tracker]);

  useEffect(() => {
    if (!url || typeof document === "undefined") return;
    const sent = { complete: false, milestones: new Set<number>() };
    const onTime = (e: Event) => {
      const el = e.target;
      if (!(el instanceof HTMLMediaElement) || !sameUrl(el.currentSrc || el.src, url)) return;
      if (!(el.duration > 0) || !Number.isFinite(el.duration)) return;
      const fraction = Math.min(1, el.currentTime / el.duration);
      for (const m of newProgressMilestones(fraction, sent.milestones)) {
        sent.milestones.add(m);
        trackerRef.current.track({ type: "video_progress", pageKey, valueInt: m });
      }
      if (!sent.complete && fraction >= VIDEO_COMPLETE_FRACTION) {
        sent.complete = true;
        trackerRef.current.track({ type: "video_complete", pageKey });
      }
    };
    document.addEventListener("timeupdate", onTime, true);
    return () => document.removeEventListener("timeupdate", onTime, true);
  }, [url, pageKey]);
}

export function GuideClip({ pageKey, stepId, titleTh, clip }: GuideClipProps) {
  const { slug, index, ready, demo, reducedMotion, progress, dispatch, markStepDone, tracker } = useGuideShell();
  const seenBefore = Boolean(progress.cutscenes?.[pageKey]);
  const [open, setOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const autoOpened = useRef(false);
  const media = clip.media;
  useClipProgressEvents(media?.videoUrl ?? null, pageKey);

  // First reveal on this device: the cutscene opens by itself (still tap to play).
  useEffect(() => {
    if (!ready || demo || autoOpened.current || seenBefore) return;
    autoOpened.current = true;
    setOpen(true);
  }, [ready, demo, seenBefore]);

  // Already seen on an earlier visit: the step needs nothing more.
  useEffect(() => {
    if (seenBefore) markStepDone(pageKey, stepId);
  }, [seenBefore, markStepDone, pageKey, stepId]);

  const transcript = useMemo(
    () => (media && clip.cues.length ? cueTranscript(clip.cues) : [...clip.slot.scriptLinesTh]),
    [media, clip]
  );

  const onDone = useCallback(
    (status: "watched" | "skipped") => {
      setOpen(false);
      dispatch({ type: "cutscene", pageKey, status });
      markStepDone(pageKey, stepId);
    },
    [dispatch, markStepDone, pageKey, stepId]
  );

  const onEvent = useCallback(
    (name: string) => {
      if (name === "play" && media) tracker.track({ type: "video_play", pageKey, metadata: { muted: false } });
    },
    [tracker, pageKey, media]
  );

  return (
    <section className="rg-cutscene" data-has-media={media ? "true" : "false"} aria-label="คัตซีน">
      <button type="button" className="rg-cutscene__card" onClick={() => setOpen(true)} data-demo={`${stepId}-open`}>
        <span className="rg-cutscene__poster" aria-hidden="true">
          {media?.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.posterUrl} alt="" loading="lazy" decoding="async" />
          ) : (
            <span className="rg-cutscene__noposter" />
          )}
        </span>
        <span className="rg-cutscene__text">
          <span className="rg-cutscene__kicker">{media ? "คัตซีน" : `${GUIDE_HOST.nameTh} เล่าให้ฟัง`}</span>
          <span className="rg-cutscene__hook">{clip.slot.hookTh}</span>
          <span className="rg-cutscene__cta">
            {seenBefore ? "ดูอีกครั้ง" : "ดูคัตซีน"}
            <NextGlyph />
          </span>
        </span>
      </button>
      {media ? (
        <button type="button" className="rg-link rg-cutscene__transcript" onClick={() => setTranscriptOpen(true)}>
          อ่านสิ่งที่พูด
        </button>
      ) : null}
      <noscript>
        <div className="rg-dialogue__static">
          {clip.slot.scriptLinesTh.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </noscript>
      <Cutscene
        open={open}
        hookTh={clip.slot.hookTh}
        scriptLinesTh={clip.slot.scriptLinesTh}
        media={media ? { videoUrl: media.videoUrl, posterUrl: media.posterUrl, durationS: media.durationS } : null}
        cues={clip.cues}
        sceneSrc={index.pages.find((p) => p.key === pageKey)?.scene ?? levelSceneSrc(slug, pageKey)}
        reducedMotion={reducedMotion}
        onDone={onDone}
        onEvent={onEvent}
      />
      {media ? (
        <TranscriptSheet
          open={transcriptOpen}
          onOpenChange={setTranscriptOpen}
          chapterTitleTh={titleTh}
          transcriptTh={transcript}
          accent={index.accent}
        />
      ) : null}
    </section>
  );
}
