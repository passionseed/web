"use client";

/**
 * The persistent game shell around every level of a guide (mounted once by
 * app/radar/[slug]/(guide)/layout.tsx, so it survives level changes):
 * - one Radar visit for the whole guide (VisitBridge, never in demo mode)
 * - progress in localStorage through useGuideState (memory only in demo mode)
 * - `chapter_view` once per level and visit, with `pageKey`, when visible
 * - the level stepper behind the sticky "ต่อ ▶" (clears the level past its last step)
 * - chrome: header (level, XP bar, level map), sticky nav, level map sheet,
 *   badge toasts, and the "start from level 1" chip when landing mid-guide
 *
 * No edge swipes anywhere: Instagram's in-app browser owns them for "back".
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import type { FactId, GuideIndexEntry } from "@/lib/radar-guide/guide-types";
import { isDemoMode } from "@/lib/radar-guide/demo";
import { NOOP_GUIDE_TRACKER } from "@/lib/radar-guide/events";
import { nextLevelKey } from "@/lib/radar-guide/story";
import { useGuideProgress } from "@/components/radar/guide/story";
import type { GuideTracker, RadarAttribution } from "@/lib/radar-guide/types";
import { PlaybackManagerProvider } from "../usePlaybackManager";
import { levelHref } from "./guide-routes";
import { advanceLabel, initialCursor, nextStepIndex, type StepMeta } from "./level-steps";
import { GuideShellContext, type GuideShellValue } from "./shell-context";
import { useReducedMotion } from "./use-reduced-motion";
import { VisitBridge } from "./VisitBridge";
import { GuideTopRail } from "./GuideTopRail";
import { GuideStickyNav } from "./GuideStickyNav";
import { PageMapSheet } from "./PageMapSheet";
import { BadgeToastHost } from "./BadgeToastHost";
import { LandingChip } from "./ResumeChip";
import "./shell.css";

/** Presses of "ต่อ" one dialogue absorbs (finish line, next box) before the level moves on anyway. */
const MAX_DIALOGUE_NUDGES = 24;

export interface GuideShellProviderProps {
  /** Index with derived games/cutscene (registry.server guideIndexFor). */
  index: GuideIndexEntry;
  children: ReactNode;
  /** Filming frame (app/studio/radar-guide): demo mode regardless of the URL. */
  forceDemo?: boolean;
  /** Header, sticky nav and sheets. Off for the filming frame. */
  chrome?: boolean;
  /** The level on screen when not under the (guide) layout (filming frame). */
  pageKey?: string;
}

/** Keys of `chapter_view` already sent, per provider instance (one visit). */
type Seen = Set<string>;

export function GuideShellProvider({
  index,
  children,
  forceDemo = false,
  chrome = true,
  pageKey: pageKeyProp,
}: GuideShellProviderProps) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const slug = index.slug;
  const pages = index.pages;
  const rawKey = pageKeyProp ?? segment;
  const page = useMemo(() => pages.find((p) => p.key === rawKey) ?? null, [pages, rawKey]);
  const pageKey = page?.key ?? null;
  const reducedMotion = useReducedMotion();

  // Demo mode is read in the browser only (pages are force-static). Every side
  // effect waits for `ready`, so nothing is written or sent before it is known.
  const [mode, setMode] = useState({ ready: false, demo: forceDemo });
  useEffect(() => {
    setMode({ ready: true, demo: forceDemo || isDemoMode() });
  }, [forceDemo]);
  const { ready, demo } = mode;

  // ------------------------------------------------------------ visit + tracker
  const [visit, setVisit] = useState<{ tracker: GuideTracker; attribution: RadarAttribution | null } | null>(null);
  const onVisit = useCallback((tracker: GuideTracker, attribution: RadarAttribution | null) => {
    setVisit((prev) =>
      prev && prev.tracker === tracker && prev.attribution === attribution ? prev : { tracker, attribution }
    );
  }, []);
  const tracker = !demo && visit ? visit.tracker : NOOP_GUIDE_TRACKER;
  const attribution = !demo && visit ? visit.attribution : null;

  // ------------------------------------------------------------ progress, toasts, XP pop
  // U7's game layer over useGuideState: badge toast queue and the "+XP" pop.
  const {
    state: progress,
    dispatch,
    xp,
    toast,
    dismissToast,
    xpPop,
    xpPopId,
  } = useGuideProgress(index, { demo });

  // ------------------------------------------------------------ level arrival
  // The level this visit landed on, for the "start from level 1" chip.
  const [landingKey] = useState(pageKey);

  useEffect(() => {
    if (!ready || !pageKey) return;
    dispatch({ type: "visit", pageKey });
  }, [ready, pageKey, dispatch]);

  const seen = useRef<Seen>(new Set());
  useEffect(() => {
    if (!ready || demo || !visit || !pageKey || seen.current.has(pageKey)) return;
    const send = () => {
      if (seen.current.has(pageKey)) return;
      seen.current.add(pageKey);
      visit.tracker.track({ type: "chapter_view", pageKey });
    };
    if (typeof document === "undefined" || document.visibilityState !== "hidden") {
      send();
      return;
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") send();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [ready, demo, visit, pageKey]);

  const nextKey = pageKey ? nextLevelKey(pages, pageKey) : null;
  useEffect(() => {
    if (!nextKey) return;
    try {
      router.prefetch(levelHref(slug, nextKey));
    } catch {
      // Prefetch is a nicety.
    }
  }, [router, slug, nextKey]);

  // ------------------------------------------------------------ stepper
  const [stepsByPage, setStepsByPage] = useState<Record<string, readonly StepMeta[]>>({});
  const [cursors, setCursors] = useState<Record<string, number>>({});
  const [doneSteps, setDoneSteps] = useState<Record<string, true>>({});

  const registerSteps = useCallback((key: string, steps: readonly StepMeta[]) => {
    setStepsByPage((prev) => {
      const before = prev[key];
      if (before && JSON.stringify(before) === JSON.stringify(steps)) return prev;
      return { ...prev, [key]: steps };
    });
  }, []);

  const cleared = progress.cleared;
  const cursorFor = useCallback(
    (key: string) => {
      const steps = stepsByPage[key] ?? [];
      if (!steps.length) return 0;
      if (demo || (cleared ?? []).includes(key)) return steps.length - 1;
      return Math.min(cursors[key] ?? initialCursor(steps), steps.length - 1);
    },
    [stepsByPage, cursors, cleared, demo]
  );

  const markStepDone = useCallback((key: string, stepId: string) => {
    setDoneSteps((prev) => (prev[`${key}:${stepId}`] ? prev : { ...prev, [`${key}:${stepId}`]: true }));
  }, []);

  const [mapOpen, setMapOpen] = useState(false);
  const openMap = useCallback(() => setMapOpen(true), []);

  const currentSteps = pageKey ? stepsByPage[pageKey] ?? [] : [];
  const currentCursor = pageKey ? cursorFor(pageKey) : 0;
  const advanceLabelTh = advanceLabel(currentSteps, currentCursor, Boolean(nextKey));

  const currentStep = currentSteps[currentCursor];
  const waits = currentStep && ["dialogue", "copy", "game", "bespoke", "clip"].includes(currentStep.kind);
  const readyToAdvance = !pageKey || !waits || Boolean(doneSteps[`${pageKey}:${currentStep.id}`]);

  const [advanceSeq, setAdvanceSeq] = useState(0);
  const [dialogueNudge, setDialogueNudge] = useState<{ key: string; seq: number } | null>(null);
  const nudges = useRef<Record<string, number>>({});
  const advance = useCallback(() => {
    if (!pageKey) return;
    const steps = stepsByPage[pageKey] ?? [];
    const cur = cursorFor(pageKey);
    // An unread dialogue: "ต่อ" reads it on (like tapping the box) before the
    // level moves on. A cap keeps "ต่อ" from ever getting stuck on one box.
    // A cleared level is already read: its dialogues open complete, so "ต่อ"
    // goes straight to the next level (doneSteps is memory only, so it would
    // otherwise eat presses after a reload).
    const step = steps[cur];
    const levelCleared = (cleared ?? []).includes(pageKey);
    if (step && !demo && !levelCleared && (step.kind === "dialogue" || step.kind === "copy")) {
      const key = `${pageKey}:${step.id}`;
      const count = nudges.current[key] ?? 0;
      if (!doneSteps[key] && count < MAX_DIALOGUE_NUDGES) {
        nudges.current[key] = count + 1;
        setDialogueNudge((prev) => ({ key, seq: (prev?.seq ?? 0) + 1 }));
        return;
      }
    }
    const next = nextStepIndex(steps, cur);
    if (next >= 0) {
      // The profile card closes the final level: clear it first so the card counts it.
      if (steps[next].kind === "profile") dispatch({ type: "clear", pageKey });
      setCursors((prev) => ({ ...prev, [pageKey]: next }));
      setAdvanceSeq((n) => n + 1);
      return;
    }
    dispatch({ type: "clear", pageKey });
    if (nextKey) router.push(levelHref(slug, nextKey));
    else setMapOpen(true);
  }, [pageKey, stepsByPage, cursorFor, demo, cleared, doneSteps, dispatch, nextKey, router, slug]);

  // ------------------------------------------------------------ sources sheet
  const [sources, setSources] = useState<{ open: boolean; focus: readonly FactId[] }>({ open: false, focus: [] });
  const openSources = useCallback((focus: readonly FactId[] = []) => {
    setSources({ open: true, focus });
  }, []);
  const closeSources = useCallback(() => setSources((s) => ({ ...s, open: false })), []);

  // Leaving a level closes its sheets.
  useEffect(() => {
    setSources({ open: false, focus: [] });
  }, [pageKey]);

  const value = useMemo<GuideShellValue>(
    () => ({
      slug,
      index,
      pageKey,
      page,
      demo,
      ready,
      reducedMotion,
      tracker,
      attribution,
      progress,
      xp,
      dispatch,
      registerSteps,
      cursor: cursorFor,
      advance,
      advanceSeq,
      advanceLabelTh,
      markStepDone,
      readyToAdvance,
      dialogueNudge,
      openMap,
      sources,
      openSources,
      closeSources,
    }),
    [
      slug,
      index,
      pageKey,
      page,
      demo,
      ready,
      reducedMotion,
      tracker,
      attribution,
      progress,
      xp,
      dispatch,
      registerSteps,
      cursorFor,
      advance,
      advanceSeq,
      advanceLabelTh,
      markStepDone,
      readyToAdvance,
      dialogueNudge,
      openMap,
      sources,
      openSources,
      closeSources,
    ]
  );

  const firstKey = useMemo(() => [...pages].sort((a, b) => a.order - b.order)[0]?.key ?? null, [pages]);
  const showLandingChip =
    chrome &&
    ready &&
    !demo &&
    pageKey !== null &&
    pageKey === landingKey &&
    firstKey !== null &&
    pageKey !== firstKey &&
    !progress.visited.includes(firstKey);

  return (
    <PlaybackManagerProvider>
      <GuideShellContext.Provider value={value}>
        <div
          className="rg-shell"
          data-demo={demo ? "true" : undefined}
          data-reduced-motion={reducedMotion ? "true" : undefined}
          style={{ "--radar-accent": index.accent } as CSSProperties}
        >
          {chrome ? <GuideTopRail xpPop={xpPop} xpPopId={xpPopId} /> : null}
          {showLandingChip && firstKey ? <LandingChip slug={slug} firstKey={firstKey} total={pages.length} /> : null}
          <div className="rg-shell__main">{children}</div>
          {chrome ? <GuideStickyNav /> : null}
          {chrome ? <PageMapSheet open={mapOpen} onOpenChange={setMapOpen} /> : null}
          <BadgeToastHost badge={toast} onDismiss={dismissToast} />
        </div>
        {ready && !demo ? <VisitBridge slug={slug} onVisit={onVisit} /> : null}
      </GuideShellContext.Provider>
    </PlaybackManagerProvider>
  );
}
