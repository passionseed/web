"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  FlipHorizontal2,
  Maximize,
  Pause,
  Play,
  Rows3,
  ScrollText,
  X,
} from "lucide-react";
import { teleprompterSteps, type TeleprompterPage, type TeleprompterStep } from "@/lib/radar-guide/teleprompter";
import { cn } from "@/lib/utils";

const FONT = "var(--font-kodchasan), var(--font-bai-jamjuree), sans-serif";
const SPEEDS = [20, 35, 50, 70, 95, 125] as const;
const SIZES = ["text-[34px] sm:text-[44px] md:text-[56px]", "text-[42px] sm:text-[54px] md:text-[68px]", "text-[52px] sm:text-[64px] md:text-[80px]"] as const;

type Mode = "scroll" | "beats";

const STATUS_STYLE: Record<TeleprompterPage["status"], string> = {
  missing: "bg-white/10 text-white/70",
  recorded: "bg-emerald-500/20 text-emerald-200",
  stale: "bg-amber-500/25 text-amber-100",
};

function StepText({ step, size, dim }: { step: TeleprompterStep; size: number; dim?: boolean }) {
  return (
    <div className={cn("transition-opacity", dim && "opacity-35")}>
      {step.cue ? (
        <p className={cn("mb-2 font-sans text-sm leading-snug sm:text-base", step.safety ? "text-amber-200" : "text-white/45")}>
          [{step.cue}]
        </p>
      ) : null}
      <p
        className={cn(
          "whitespace-pre-wrap leading-[1.4] text-white",
          SIZES[size],
          step.kind === "reelHook" && "text-sky-100",
          step.safety && "border-l-4 border-amber-300 pl-4"
        )}
      >
        {step.say}
      </p>
    </div>
  );
}

function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    let cancelled = false;
    (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock
      .request("screen")
      .then((l) => {
        if (cancelled) void l.release();
        else lock = l;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      void lock?.release().catch(() => {});
    };
  }, [enabled]);
}

/**
 * Full-screen teleprompter for the founder's cutscene clips, read from the
 * guide's code (ClipSlot.scriptLinesTh). Phone first: tap the right of the
 * screen for the next line, the left to go back. Keyboard: Space next line
 * (Shift+Space back), arrows between pages, M mirrors (for a beam-splitter
 * rig), + and - change the text size.
 */
export function RadarTeleprompter({
  slug,
  guideName,
  pages,
  initialKey,
}: {
  slug: string;
  guideName: string;
  pages: TeleprompterPage[];
  initialKey: string | null;
}) {
  const [pageIdx, setPageIdx] = useState(() => Math.max(0, pages.findIndex((p) => p.pageKey === initialKey)));
  const [mode, setMode] = useState<Mode>("beats");
  const [mirror, setMirror] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2);
  const [size, setSize] = useState(1);
  const [beat, setBeat] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const page = pages[pageIdx] ?? null;
  const steps = useMemo(() => (page ? teleprompterSteps(page) : []), [page]);
  useWakeLock(true);

  const goPage = useCallback(
    (delta: number) => {
      const next = Math.min(Math.max(pageIdx + delta, 0), pages.length - 1);
      if (next === pageIdx) return;
      setPageIdx(next);
      setBeat(0);
      setPlaying(false);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [pageIdx, pages.length]
  );

  const goBeat = useCallback(
    (delta: number) => setBeat((current) => Math.min(Math.max(current + delta, 0), Math.max(steps.length - 1, 0))),
    [steps.length]
  );

  // Keep ?page= in the address bar so a reload stays on the same clip.
  useEffect(() => {
    if (!page) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("page", page.pageKey);
      window.history.replaceState(null, "", url);
    } catch {
      // History can be unavailable in embedded browsers; the page still works.
    }
  }, [page]);

  // Auto-scroll.
  useEffect(() => {
    if (mode !== "scroll" || !playing) return;
    let frame = 0;
    let last = performance.now();
    let carry = 0;
    const tick = (now: number) => {
      const el = scrollRef.current;
      if (!el) return;
      carry += (SPEEDS[speedIdx] * (now - last)) / 1000;
      last = now;
      const whole = Math.floor(carry);
      if (whole > 0) {
        el.scrollTop += whole;
        carry -= whole;
      }
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [mode, playing, speedIdx]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("input, select, textarea")) return;
      switch (event.key) {
        case " ":
          event.preventDefault();
          if (mode === "scroll") setPlaying((p) => !p);
          else goBeat(event.shiftKey ? -1 : 1);
          break;
        case "ArrowRight":
          event.preventDefault();
          goPage(1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          goPage(-1);
          break;
        case "ArrowDown":
          event.preventDefault();
          if (mode === "beats") goBeat(1);
          else setSpeedIdx((i) => Math.max(i - 1, 0));
          break;
        case "ArrowUp":
          event.preventDefault();
          if (mode === "beats") goBeat(-1);
          else setSpeedIdx((i) => Math.min(i + 1, SPEEDS.length - 1));
          break;
        case "m":
        case "M":
          setMirror((m) => !m);
          break;
        case "+":
        case "=":
          setSize((s) => Math.min(s + 1, SIZES.length - 1));
          break;
        case "-":
          setSize((s) => Math.max(s - 1, 0));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goBeat, goPage, mode]);

  const backHref = "/admin/radar";

  if (!page) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black p-6 text-center text-white">
        <p className="text-lg">No cutscene scripts in the {guideName} guide yet.</p>
        <p className="text-sm text-white/60">Add a clip slot to a page in lib/radar-guides/{slug}/pages/.</p>
        <Link href={backHref} className="underline underline-offset-4">
          Back to Radar admin
        </Link>
      </div>
    );
  }

  const control =
    "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm text-white/80 hover:bg-white/10 active:bg-white/10 disabled:opacity-30";
  const mirrorStyle = mirror ? { transform: "scaleX(-1)" } : undefined;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white" style={{ fontFamily: FONT }}>
      <header
        className={cn(
          "flex flex-wrap items-center gap-1 border-b border-white/10 px-2 py-1 font-sans transition-opacity sm:px-3",
          playing && "opacity-25 hover:opacity-100"
        )}
      >
        <Link href={backHref} className={control} aria-label="Close teleprompter">
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
        <button type="button" className={control} onClick={() => goPage(-1)} disabled={pageIdx === 0} aria-label="Previous clip">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <label className="min-w-0 max-w-[52vw]">
          <span className="sr-only">Clip</span>
          <select
            value={page.pageKey}
            onChange={(e) => {
              const idx = pages.findIndex((p) => p.pageKey === e.target.value);
              if (idx >= 0) {
                setPageIdx(idx);
                setBeat(0);
                setPlaying(false);
              }
            }}
            className="min-h-11 w-full truncate rounded-md bg-transparent px-1 text-sm text-white"
          >
            {pages.map((p, i) => (
              <option key={p.pageKey} value={p.pageKey} className="text-black">
                {i + 1}. Lv{p.order} {p.titleTh} ({p.seconds}s{p.required ? ", required" : ""}
                {p.safety ? ", safety" : ""})
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={control} onClick={() => goPage(1)} disabled={pageIdx === pages.length - 1} aria-label="Next clip">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className={cn("rounded px-2 py-0.5 text-xs", STATUS_STYLE[page.status])}>
          {page.status === "stale" ? "script changed: re-record" : page.status}
        </span>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button
            type="button"
            className={control}
            onClick={() => {
              setMode((m) => (m === "beats" ? "scroll" : "beats"));
              setPlaying(false);
            }}
            aria-label={mode === "beats" ? "Switch to auto-scroll" : "Switch to line by line"}
          >
            {mode === "beats" ? <ScrollText className="h-5 w-5" aria-hidden="true" /> : <Rows3 className="h-5 w-5" aria-hidden="true" />}
            <span className="hidden sm:inline">{mode === "beats" ? "Scroll" : "Lines"}</span>
          </button>
          {mode === "scroll" ? (
            <>
              <label className="flex items-center gap-1 px-1 text-xs text-white/60">
                Speed
                <input
                  type="range"
                  min={0}
                  max={SPEEDS.length - 1}
                  value={speedIdx}
                  onChange={(e) => setSpeedIdx(Number(e.target.value))}
                  className="w-20"
                />
              </label>
              <button type="button" className={control} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
              </button>
            </>
          ) : null}
          <button type="button" className={control} onClick={() => setSize((s) => Math.max(s - 1, 0))} disabled={size === 0} aria-label="Smaller text">
            A-
          </button>
          <button
            type="button"
            className={control}
            onClick={() => setSize((s) => Math.min(s + 1, SIZES.length - 1))}
            disabled={size === SIZES.length - 1}
            aria-label="Bigger text"
          >
            A+
          </button>
          <button
            type="button"
            className={cn(control, mirror && "bg-white/15 text-white")}
            aria-pressed={mirror}
            onClick={() => setMirror((m) => !m)}
            aria-label="Mirror"
          >
            <FlipHorizontal2 className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={cn(control, "hidden sm:inline-flex")}
            onClick={() => void document.documentElement.requestFullscreen?.().catch(() => {})}
            aria-label="Full screen"
          >
            <Maximize className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {mode === "beats" ? (
        <main className="relative flex flex-1 select-none items-center overflow-hidden px-5 sm:px-10 md:px-16">
          <div className="mx-auto w-full max-w-5xl" style={mirrorStyle}>
            {steps[beat] ? <StepText step={steps[beat]} size={size} /> : null}
            {steps[beat + 1] ? (
              <div className="mt-10 origin-top-left scale-[0.6]">
                <StepText step={steps[beat + 1]} size={size} dim />
              </div>
            ) : null}
          </div>
          {/* Tap zones: left third goes back, the rest goes forward. */}
          <button type="button" className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous line" onClick={() => goBeat(-1)} />
          <button type="button" className="absolute inset-y-0 right-0 w-2/3" aria-label="Next line" onClick={() => goBeat(1)} />
          <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center font-sans text-xs text-white/40">
            {beat + 1}/{steps.length}
            {steps[beat]?.safety ? "  ·  safety line: face on screen" : ""}
            {beat === steps.length - 1 && page.sendToFriendTh ? `  ·  end card: ${page.sendToFriendTh}` : ""}
          </p>
        </main>
      ) : (
        <main ref={scrollRef} className="relative flex-1 overflow-y-auto px-5 sm:px-10 md:px-16" onClick={() => setPlaying((p) => !p)}>
          <div className="pointer-events-none fixed left-0 right-0 top-[30%] h-px bg-white/15" aria-hidden="true" />
          <div className="mx-auto max-w-5xl space-y-12 pb-[70vh] pt-[25vh]" style={mirrorStyle}>
            {steps.map((step, i) => (
              <StepText key={i} step={step} size={size} />
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
