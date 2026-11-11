"use client";

/**
 * A level's cutscene: the founder's vertical short, full-bleed 9:16.
 * - Opens on the poster with one big "แตะเพื่อดู" button; the tap starts it
 *   with sound (playsInline, so the IG in-app browser stays inline). Nothing
 *   ever autoplays with sound.
 * - Captions come from the VTT, drawn as a pixel strip over the video.
 * - "ข้าม" is always on screen; Esc skips too. The end calls onDone("watched").
 * - With no recorded clip (media null), or if the video fails, the host NPC
 *   says the same script lines in dialogue boxes over the level's scene, so
 *   every level is complete without video.
 *
 * Rendered in a portal on <body> as a modal dialog; it locks page scroll while
 * open and gives focus back when it closes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { activeCue, parseVtt, type VttCue } from "@/lib/radar-guide/vtt";
import { DialogueBox } from "./DialogueBox";
import { PixelScene } from "./PixelScene";
import { cutsceneStart, cutsceneStep, type CutsceneEvent, type CutscenePhase } from "./story-logic";
import "./story.css";

export interface CutsceneMedia {
  videoUrl: string;
  posterUrl?: string;
  durationS?: number;
}

export type CutsceneEventName = "open" | "play" | "complete" | "skip" | "error" | "fallback";

export interface CutsceneProps {
  open: boolean;
  /** ClipSlot.hookTh: the line on the title plate. */
  hookTh: string;
  /** ClipSlot.scriptLinesTh: what the host says when there is no video. */
  scriptLinesTh: readonly string[];
  /** From clips.json; null until the clip is recorded. */
  media: CutsceneMedia | null;
  /** Captions: raw VTT text, or cues already parsed on the server. */
  vtt?: string | null;
  cues?: readonly VttCue[];
  /** Backdrop for the NPC fallback (the level scene). */
  sceneSrc?: string | null;
  reducedMotion?: boolean;
  /** Called once: "watched" at the end (video or dialogue), "skipped" on skip. */
  onDone(status: "watched" | "skipped"): void;
  /** Optional analytics hook (the shell maps these to video_* events with pageKey). */
  onEvent?(name: CutsceneEventName, detail?: { t?: number }): void;
}

export function Cutscene(props: CutsceneProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!props.open || !mounted) return null;
  return createPortal(<CutsceneDialog {...props} />, document.body);
}

function CutsceneDialog({ hookTh, scriptLinesTh, media, vtt, cues, sceneSrc, reducedMotion = false, onDone, onEvent }: CutsceneProps) {
  const [phase, setPhase] = useState<CutscenePhase>(() => cutsceneStart(Boolean(media?.videoUrl)));
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(media?.durationS ?? 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const parsedCues = useMemo(() => cues ?? parseVtt(vtt), [cues, vtt]);
  const cue = activeCue(parsedCues, time);

  const send = useCallback((ev: CutsceneEvent) => setPhase((p) => cutsceneStep(p, ev)), []);

  const finish = useCallback(
    (status: "watched" | "skipped") => {
      if (finished.current) return;
      finished.current = true;
      videoRef.current?.pause();
      onEvent?.(status === "watched" ? "complete" : "skip", { t: videoRef.current?.currentTime });
      onDone(status);
    },
    [onDone, onEvent]
  );

  // Open: lock scroll, move focus in, Esc skips; restore all on close.
  useEffect(() => {
    onEvent?.("open");
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The play button, or the dialogue box in the NPC fallback (first button in the frame).
    (primaryRef.current ?? frameRef.current?.querySelector<HTMLButtonElement>("button"))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish("skipped");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "done") finish("watched");
    if (phase === "fallback" && media?.videoUrl) onEvent?.("fallback");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (phase === "playing") {
      video.pause();
      return;
    }
    send({ type: "tapPlay" });
    video.muted = false;
    onEvent?.("play", { t: video.currentTime });
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch((err: unknown) => {
        const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
        if (name === "NotAllowedError") send({ type: "blocked" });
        else {
          onEvent?.("error");
          send({ type: "error" });
        }
      });
    }
  }, [phase, send, onEvent]);

  const showVideo = phase !== "fallback" && Boolean(media?.videoUrl);
  const progress = duration > 0 ? Math.min(1, time / duration) : 0;

  return (
    <div className="rgs-cutscene" role="dialog" aria-modal="true" aria-label={hookTh} data-testid="cutscene">
      <div className="rgs-cutscene__frame" ref={frameRef}>
        {showVideo && media ? (
          <>
            <video
              ref={videoRef}
              className="rgs-cutscene__video"
              src={media.videoUrl}
              poster={media.posterUrl}
              playsInline
              preload="metadata"
              onClick={play}
              onPlaying={() => send({ type: "playing" })}
              onPause={() => send({ type: "pause" })}
              onEnded={() => send({ type: "ended" })}
              onError={() => {
                onEvent?.("error");
                send({ type: "error" });
              }}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => {
                if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration);
              }}
              data-testid="cutscene-video"
            />
            {cue ? (
              <div className="rgs-cutscene__captions" aria-hidden="true">
                <p className="rgs-cutscene__cue" data-testid="cutscene-cue">
                  {cue.text}
                </p>
              </div>
            ) : null}
            <div className="rgs-cutscene__progress" aria-hidden="true">
              <span style={{ transform: `scaleX(${progress})` }} />
            </div>
            {phase !== "playing" ? (
              <div className="rgs-cutscene__start">
                <p className="rgs-cutscene__hook">{hookTh}</p>
                <button
                  ref={primaryRef}
                  type="button"
                  className="rgs-pixel-btn rgs-pixel-btn--primary rgs-cutscene__play"
                  onClick={play}
                  disabled={phase === "loading"}
                  data-demo="cutscene-play"
                >
                  {phase === "loading" ? "กำลังโหลด" : phase === "paused" ? "▶ ดูต่อ" : "▶ แตะเพื่อดู (เปิดเสียง)"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rgs-cutscene__fallback">
            <PixelScene src={sceneSrc} variant="backdrop" />
            <p className="rgs-cutscene__hook rgs-cutscene__hook--top">{hookTh}</p>
            <div className="rgs-cutscene__talk">
              <DialogueBox
                speaker="host"
                mood="talk"
                lines={scriptLinesTh}
                reducedMotion={reducedMotion}
                onDone={() => send({ type: "fallbackDone" })}
              />
            </div>
          </div>
        )}
        <button
          type="button"
          className="rgs-pixel-btn rgs-cutscene__skip"
          onClick={() => finish("skipped")}
          data-demo="cutscene-skip"
        >
          ข้าม ▶▶
        </button>
      </div>
    </div>
  );
}
