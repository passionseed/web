"use client";

import { memo, useEffect, useState, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  getSavedRadarReflectionChapterKeys,
  submitRadarReflection,
  syncPendingRadarReflections,
  recordRadarFieldView,
  recordRadarMyPathIntent,
  recordRadarPathIntent,
  routeRadarCardIntent,
  syncPendingRadarMyPathEvents,
} from "@/lib/supabase/radar";
import {
  CtaResourceLinks,
  RadarCardView,
  SourceRefs,
  ctaPathSlug,
  ctaResources,
} from "@/components/radar/RadarCards";
import { detailFigure, getCareerCardVisual, readableAccent } from "@/lib/radar/card-visuals";
import {
  RadarSkillExperience,
  StartOptionTile,
  firstStartOption,
  type RadarSkillSummary,
} from "@/components/radar/RadarSkillExperience";
import {
  GuideIntentButton,
  GuideOutro,
  GuideProgramLine,
  MidShareCard,
  type GuideSource,
} from "@/components/radar/guide";
import { useRadarVisit } from "@/lib/radar-guide/use-radar-visit";
import {
  buildDeckSections,
  isSkillsCard,
  outroCtaCard,
  type DeckInteractTarget,
  type DeckSection,
} from "@/lib/radar/deck-sections";
import type { GuideCtaTarget, GuideTracker } from "@/lib/radar-guide/types";
import { radarProgramLine } from "@/lib/content/radar-cta";
import type { Database } from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Heart,
  X,
} from "lucide-react";
import {
  readRadarInterests,
  toggleRadarInterest,
} from "@/lib/my-path/radar-interest";
import type { RadarIntentScope } from "@/lib/my-path/radar-sync";
import { createClient } from "@/utils/supabase/client";
import { isAnonymousUser } from "@/lib/supabase/auth";

type RadarField = Database["public"]["Tables"]["radar_fields"]["Row"];
type RadarCard = Database["public"]["Tables"]["radar_cards"]["Row"];

/** Stable empty defaults: a fresh `[]` per render would rebuild the deck and rerun its effects. */
const NO_SKILLS: RadarSkillSummary[] = [];
const NO_SOURCES: FieldSource[] = [];

function pickContent(card: RadarCard): Record<string, unknown> {
  const th = card.content_th as Record<string, unknown> | null;
  const en = card.content_en as Record<string, unknown> | null;
  return th ?? en ?? {};
}

function cardChapterKey(card: RadarCard): string {
  const content = pickContent(card);
  return (content.chapterKey as string) || card.id;
}

/** The deck position a section element carries. */
function sectionIndexOf(element: Element): number {
  return Number((element as HTMLElement).dataset.radarIndex);
}

/** Safari (not Chrome, Firefox, Edge or Opera on iOS), read on the client only. */
function detectSafari(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    (navigator.vendor ?? "").includes("Apple") &&
    !/(CriOS|FxiOS|EdgiOS|OPiOS)/.test(navigator.userAgent)
  );
}

/** The browser never changes under the page, so there is nothing to subscribe to. */
function subscribeNever(): () => void {
  return () => {};
}

export type FieldSource = GuideSource;

export function RadarFieldPageClient({
  initialField,
  initialCards,
  fieldSources = NO_SOURCES,
  initialSkills = NO_SKILLS,
  fromPlan = false,
}: {
  initialField: RadarField;
  initialCards: RadarCard[];
  fieldSources?: FieldSource[];
  initialSkills?: RadarSkillSummary[];
  /**
   * Arrived from the My Path wizard. The generic outro and CTA are the wrong
   * ending there: the student owes the plan a decision instead.
   */
  fromPlan?: boolean;
}) {
  const router = useRouter();
  const field = initialField;
  const fieldSlug = field.slug ?? "";
  // Attribution, utm stripping and the visit record.
  const { tracker, attribution } = useRadarVisit(fieldSlug || null);
  const visitIdRef = useRef<string | null>(null);
  visitIdRef.current = tracker.visitId;

  const sections = useMemo(
    () => buildDeckSections(initialCards, initialSkills, { fromPlan }),
    [initialCards, initialSkills, fromPlan]
  );
  const ctaCard = useMemo(() => outroCtaCard(initialCards, { fromPlan }), [initialCards, fromPlan]);

  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [showSignupPrompt, setShowSignupPrompt] = useState(true);
  const [hasGuestReflection, setHasGuestReflection] = useState(false);
  const [signupToastVisible, setSignupToastVisible] = useState(false);
  const [signupToastDismissed, setSignupToastDismissed] = useState(false);
  const [finalToastDismissed, setFinalToastDismissed] = useState(false);
  const [hasShownFirstToast, setHasShownFirstToast] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const followRef = useRef<HTMLDivElement>(null);
  const blackoutRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isSafariRef = useRef(false);
  // Server snapshot is false: Node has a global `navigator` without `vendor`,
  // so reading it during SSR crashed the render. The client value applies
  // right after hydration, so the markup never mismatches.
  const isSafari = useSyncExternalStore(subscribeNever, detectSafari, () => false);
  const fieldOpenRecordedRef = useRef(false);
  const touchSectionGuardRef = useRef<{
    sectionIndex: number;
    startY: number;
    direction: "up" | "down" | null;
    minScrollTop: number;
    maxScrollTop: number;
    lockUp: boolean;
    lockDown: boolean;
  } | null>(null);

  const handlePointer = useCallback((e: React.MouseEvent) => {
    if (isSafariRef.current) return;
    if (window.matchMedia("(hover: none)").matches) return;
    const root = rootRef.current;
    const glow = followRef.current;
    if (!root || !glow) return;
    const { left, top, width, height } = root.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      glow.style.transform = `translate(${x - width / 2}px, ${y - height / 2}px)`;
    });
  }, []);

  // Sync the ref with the initial state value
  useEffect(() => {
    isSafariRef.current = isSafari;
  }, [isSafari]);

  const goTo = useCallback((i: number, instant = false) => {
    touchSectionGuardRef.current = null;
    const section = sectionRefs.current[i];
    if (!section) return;
    const behavior: ScrollBehavior =
      instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";

    // The deck scrolls inside `.radar-deck`, not the window. scrollIntoView has
    // to guess which ancestor to move and does nothing once a section is
    // `content-visibility: auto` off-screen, so drive the container directly;
    // section offsets are already relative to the deck (it is their offsetParent).
    const deck = scrollRef.current;
    if (deck) {
      deck.scrollTo({ top: section.offsetTop, behavior });
      return;
    }
    section.scrollIntoView({ block: "start", behavior });
  }, []);

  const handleDeckTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const deck = scrollRef.current;
      if (!deck) {
        touchSectionGuardRef.current = null;
        return;
      }
      // On mobile, let the browser handle scrolling natively: no snap guard
      if (window.matchMedia("(max-width: 640px)").matches) {
        touchSectionGuardRef.current = null;
        return;
      }

      const sectionIndex = sectionRefs.current.findIndex(
        (candidate) =>
          !!candidate &&
          deck.scrollTop >= candidate.offsetTop - 2 &&
          deck.scrollTop < candidate.offsetTop + candidate.offsetHeight - 2
      );
      const activeSectionIndex = sectionIndex >= 0 ? sectionIndex : current;
      const section = sectionRefs.current[activeSectionIndex];
      if (!section) {
        touchSectionGuardRef.current = null;
        return;
      }

      const minScrollTop = section.offsetTop;
      const maxScrollTop = Math.max(
        minScrollTop,
        section.offsetTop + section.offsetHeight - deck.clientHeight
      );
      touchSectionGuardRef.current = {
        sectionIndex: activeSectionIndex,
        startY: event.touches[0]?.clientY ?? 0,
        direction: null,
        minScrollTop,
        maxScrollTop,
        lockUp: deck.scrollTop > minScrollTop + 2,
        lockDown: deck.scrollTop < maxScrollTop - 2,
      };
    },
    [current]
  );

  const handleDeckTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const guard = touchSectionGuardRef.current;
    if (!guard || guard.direction) return;
    const distance = guard.startY - (event.touches[0]?.clientY ?? guard.startY);
    if (Math.abs(distance) < 4) return;
    guard.direction = distance > 0 ? "down" : "up";
  }, []);

  const handleDeckScroll = useCallback(() => {
    const deck = scrollRef.current;
    const guard = touchSectionGuardRef.current;
    if (!deck || !guard?.direction) return;

    // On mobile, tall sections have scroll-snap disabled via CSS.
    // Skip JS clamping too so the browser's native inertia works smoothly.
    const section = sectionRefs.current[guard.sectionIndex];
    if (section?.classList.contains("radar-card-section--tall")) return;

    if (
      guard.direction === "down" &&
      guard.lockDown &&
      deck.scrollTop > guard.maxScrollTop
    ) {
      deck.scrollTop = guard.maxScrollTop;
    } else if (
      guard.direction === "up" &&
      guard.lockUp &&
      deck.scrollTop < guard.minScrollTop
    ) {
      deck.scrollTop = guard.minScrollTop;
    }
  }, []);

  const handleDeckTouchEnd = useCallback(() => {
    const deck = scrollRef.current;
    const guard = touchSectionGuardRef.current;
    if (!deck || !guard?.direction) return;

    const canAdvance = guard.direction === "down" && !guard.lockDown;
    const canReturn = guard.direction === "up" && !guard.lockUp;
    if (!canAdvance && !canReturn) return;

    const targetIndex = canAdvance
      ? guard.sectionIndex + 1
      : Math.max(0, guard.sectionIndex - 1);
    const target = sectionRefs.current[targetIndex];
    if (!target) return;

    const targetScrollTop = target.offsetTop;
    deck.scrollTo({ top: targetScrollTop, behavior: "auto" });
    touchSectionGuardRef.current = {
      sectionIndex: targetIndex,
      startY: 0,
      direction: guard.direction,
      minScrollTop: targetScrollTop,
      maxScrollTop: targetScrollTop,
      lockUp: true,
      lockDown: true,
    };
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    const loadSavedReflections = async () => {
      const savedChapterKeys = await getSavedRadarReflectionChapterKeys(fieldSlug);
      if (!active || savedChapterKeys.size === 0) return;

      const savedCardIds = initialCards
        .filter((card) => savedChapterKeys.has(cardChapterKey(card)))
        .map((card) => card.id);
      setSubmitted((prev) => new Set([...prev, ...savedCardIds]));
      setHasGuestReflection(true);
      setHasShownFirstToast(true);
    };

    void loadSavedReflections();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;
      setShowSignupPrompt(!user || isAnonymousUser(user));
      void syncPendingRadarReflections().then(loadSavedReflections);
      void syncPendingRadarMyPathEvents();
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setShowSignupPrompt(!session?.user || isAnonymousUser(session.user));
      void syncPendingRadarReflections().then(loadSavedReflections);
      void syncPendingRadarMyPathEvents();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fieldSlug, field.id, initialCards]);

  // Record a field view once per field mount (not when cards/auth state churn).
  useEffect(() => {
    if (!fieldSlug || !field.id) return;
    void recordRadarFieldView(fieldSlug, field.id);
    if (!fieldOpenRecordedRef.current) {
      fieldOpenRecordedRef.current = true;
      recordRadarMyPathIntent({ careerSlug: fieldSlug, intent: "opened" });
    }
  }, [fieldSlug, field.id]);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // Tag sections taller than the viewport so CSS can disable scroll-snap on them
  // This prevents Chrome mobile from snapping past tall content
  useEffect(() => {
    const deck = scrollRef.current;
    if (!deck) return;
    const markTall = () => {
      const vh = deck.clientHeight;
      sectionRefs.current.forEach((section) => {
        if (!section) return;
        section.classList.toggle(
          "radar-card-section--tall",
          section.scrollHeight > vh + 20
        );
      });
    };
    markTall();
    const ro = new ResizeObserver(markTall);
    ro.observe(deck);
    sectionRefs.current.forEach((s) => s && ro.observe(s));
    return () => ro.disconnect();
  }, [sections.length]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = sectionIndexOf(visible.target);
        if (Number.isInteger(index)) setCurrent(index);
      },
      { root, threshold: [0.25, 0.5, 0.75] }
    );
    sectionRefs.current.forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, [sections.length]);

  // Gradually fade in/out blackout overlay around AI impact section
  const aiIndex = sections.findIndex(
    (section) => section.type === "card" && section.card.kind === "aiImpact"
  );
  useEffect(() => {
    const deck = scrollRef.current;
    const blackout = blackoutRef.current;
    if (!deck || !blackout) return;
    if (aiIndex < 0) return;

    let raf = 0;
    let lastOpacity = "0";
    const update = () => {
      raf = 0;
      const section = sectionRefs.current[aiIndex];
      if (!section) return;
      const sectionTop = section.offsetTop;
      const sectionBottom = sectionTop + section.offsetHeight;
      const vh = deck.clientHeight;
      const scroll = deck.scrollTop;

      const fadeInStart = sectionTop - vh;
      const fadeInEnd = sectionTop;
      const fadeOutStart = sectionBottom - vh;
      const fadeOutEnd = sectionBottom;

      let progress: number;
      if (scroll <= fadeInStart) {
        progress = 0;
      } else if (scroll < fadeInEnd) {
        progress = (scroll - fadeInStart) / (fadeInEnd - fadeInStart);
      } else if (scroll <= fadeOutStart) {
        progress = 1;
      } else if (scroll < fadeOutEnd) {
        progress = 1 - (scroll - fadeOutStart) / (fadeOutEnd - fadeOutStart);
      } else {
        progress = 0;
      }

      // Round to 2 decimals to avoid unnecessary style writes
      const val = String(Math.round(Math.min(1, Math.max(0, progress)) * 100) / 100);
      if (val !== lastOpacity) {
        lastOpacity = val;
        blackout.style.opacity = val;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    deck.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      deck.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [aiIndex, sections.length]);

  const accent = readableAccent(field.color || "#3b82f6");
  const visual = getCareerCardVisual(field);

  const totalSlides = Math.max(sections.length, 1);
  const keepRadarHref = `/radar/keep?next=${encodeURIComponent(`/radar/${fieldSlug}`)}`;
  const isFinalSlide = current >= totalSlides - 1;
  // The plan decision bar owns the bottom of the screen in the wizard flow.
  const shouldShowSignupToast =
    !fromPlan &&
    showSignupPrompt &&
    hasGuestReflection &&
    signupToastVisible &&
    !signupToastDismissed;

  /** The CtaCard intent path: radar_path_intents plus the My Path intent, now with the visit id. */
  const recordIntent = useCallback(
    (pathSlug: string, buttonLabel: string | undefined, scope: RadarIntentScope | undefined, fallbackLabel?: string) => {
      if (!fieldSlug || !field.id) return;
      routeRadarCardIntent({
        scope,
        buttonLabel,
        recordAnalytics() {
          void recordRadarPathIntent({
            fieldSlug,
            fieldId: field.id,
            pathSlug,
            buttonLabel: buttonLabel || fallbackLabel || undefined,
            visitId: visitIdRef.current,
          });
        },
        recordCanonical(intent) {
          recordRadarMyPathIntent({ careerSlug: fieldSlug, intent });
        },
      });
    },
    [fieldSlug, field.id]
  );

  const handleReflect = useCallback(
    async (
      card: RadarCard,
      sectionIndex: number,
      chapterKey: string,
      payload: { rating?: number; tags?: string[]; text?: string }
    ) => {
      await submitRadarReflection({
        fieldSlug,
        chapterKey,
        wantToTry: payload.rating ?? null,
        tags: payload.tags,
        responseText: payload.text,
      });
      setSubmitted((prev) => new Set(prev).add(card.id));
      if (showSignupPrompt) {
        setHasGuestReflection(true);
        if (!hasShownFirstToast) {
          setSignupToastVisible(true);
          setHasShownFirstToast(true);
          setSignupToastDismissed(false);
        }
      }
      const nextIdx = sectionIndex + 1;
      if (nextIdx < sections.length) {
        setTimeout(() => {
          goTo(nextIdx);
        }, 400);
      }
    },
    [fieldSlug, sections.length, showSignupPrompt, hasShownFirstToast, goTo]
  );

  useEffect(() => {
    if (!signupToastVisible || !hasShownFirstToast || isFinalSlide) return;

    const timer = window.setTimeout(() => {
      setSignupToastVisible(false);
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [signupToastVisible, hasShownFirstToast, isFinalSlide]);

  useEffect(() => {
    if (
      !showSignupPrompt ||
      !hasGuestReflection ||
      !isFinalSlide ||
      finalToastDismissed
    ) {
      return;
    }

    setSignupToastDismissed(false);
    setSignupToastVisible(true);
  }, [showSignupPrompt, hasGuestReflection, isFinalSlide, finalToastDismissed]);

  const dismissSignupToast = useCallback(() => {
    setSignupToastVisible(false);
    setSignupToastDismissed(true);
    if (isFinalSlide) {
      setFinalToastDismissed(true);
    }
  }, [isFinalSlide]);

  const trackTap = useCallback(
    (target: DeckInteractTarget | string, cardId?: string) => {
      tracker.track({ type: "interactive_tap", cardId, target });
    },
    [tracker]
  );

  const firstStep = useMemo(() => firstStartOption(initialSkills), [initialSkills]);
  const programLine = radarProgramLine(fieldSlug);
  const outroResources = ctaCard ? ctaResources(pickContent(ctaCard)) : [];

  const renderSection = (section: DeckSection<RadarCard>) => {
    const i = section.index;
    const sectionRef = (element: HTMLElement | null) => {
      sectionRefs.current[i] = element;
    };

    switch (section.type) {
      case "midShare":
        return (
          <GuideShellSection key="mid-share" index={i} sectionRef={sectionRef}>
            <MidShareCard
              fieldSlug={fieldSlug}
              fieldNameTh={field.name_th}
              uaApp={attribution?.ua_app ?? null}
              utmSource={attribution?.utm_source ?? null}
              tracker={tracker}
            />
          </GuideShellSection>
        );
      case "outro":
        return (
          <GuideShellSection key="outro" index={i} sectionRef={sectionRef} grow>
            <GuideOutro
              fieldSlug={fieldSlug}
              fieldNameTh={field.name_th}
              tracker={tracker}
              uaApp={attribution?.ua_app ?? null}
              utmSource={attribution?.utm_source ?? null}
              firstStep={
                firstStep ? (
                  <StartOptionTile option={firstStep} accent={accent} visitId={tracker.visitId} />
                ) : undefined
              }
              intentSlot={
                <GuideIntentButton
                  tracker={tracker}
                  onIntent={() =>
                    recordIntent(ctaPathSlug(field.squad_url), "interested", "field", "สนใจสายนี้")
                  }
                />
              }
              programSlot={
                programLine ? (
                  <GuideProgramLine
                    tracker={tracker}
                    lineTh={programLine.body}
                    linkLabelTh={programLine.cta}
                    href={programLine.href}
                  />
                ) : undefined
              }
              resourcesSlot={
                outroResources.length > 0 ? (
                  <CtaResourceLinks
                    resources={outroResources}
                    onCtaClick={(target: GuideCtaTarget) =>
                      tracker.track({ type: "cta_click", target })
                    }
                  />
                ) : undefined
              }
            />
          </GuideShellSection>
        );
      case "skills":
        return (
          <section
            key="skills"
            ref={sectionRef}
            data-radar-index={i}
            className="radar-card-section in-view px-6 py-20"
          >
            <RadarViewportFit>
              <RadarSkillExperience
                skills={initialSkills}
                accent={accent}
                startFirst
                visitId={tracker.visitId}
                onInteract={(target) => trackTap(target)}
              />
            </RadarViewportFit>
          </section>
        );
      case "card": {
        const card = section.card;
        const content = pickContent(card);
        const reflectionKey = cardChapterKey(card);
        const sourceRefs = (content.source_refs as number[] | undefined) ?? [];
        const view = (
          <RadarCardView
            kind={card.kind}
            content={content}
            accent={accent}
            fieldNameTh={field.name_th ?? undefined}
            fieldNameEn={field.name_en ?? undefined}
            fieldSlug={field.slug ?? undefined}
            squadUrl={field.squad_url}
            fieldSources={fieldSources}
            reflectionSubmitted={submitted.has(card.id)}
            showSignupPrompt={false}
            onReflect={(payload) => handleReflect(card, i, reflectionKey, payload)}
            onIntent={(pathSlug, buttonLabel, scope) =>
              recordIntent(pathSlug, buttonLabel, scope, content.button as string | undefined)
            }
            onInteract={(target) => trackTap(target, card.id)}
            onCtaClick={(target) => tracker.track({ type: "cta_click", cardId: card.id, target })}
          />
        );
        return (
          <RadarCardSection
            key={card.id}
            isFirst={i === 0}
            hasMore={sections.length > 1}
            accent={accent}
            figure={detailFigure(visual.figure)}
            sourceRefs={sourceRefs}
            fieldSources={fieldSources}
            sectionRef={sectionRef}
            index={i}
          >
            {isSkillsCard(card) ? (
              <SkillsExpander onExpand={() => trackTap("skills:expand", card.id)}>
                {view}
              </SkillsExpander>
            ) : (
              view
            )}
          </RadarCardSection>
        );
      }
    }
  };

  return (
    <div
      ref={rootRef}
      onMouseMove={handlePointer}
      className={`radar-field-page ${isSafari ? "radar-field-page--safari" : ""} fixed inset-0 isolate z-[100] h-[100dvh] overflow-hidden bg-neutral-950`}
      style={{
        background: visual.background,
        ...visual.dotStyle,
        '--radar-accent': accent,
      } as React.CSSProperties}
    >
      <div className="radar-atmosphere pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span
          className="radar-career-card__grain radar-detail-grain"
          aria-hidden="true"
        />
        <div
          className="radar-atmosphere-shade absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.58)_0%,rgba(3,7,18,0.82)_48%,rgba(3,7,18,0.94)_100%)]"
          aria-hidden="true"
        />
        <div
          className="radar-glow-a absolute top-0 left-1/2 w-[720px] h-[420px] rounded-full blur-[140px]"
          style={{ background: accent }}
        />
        <div
          className="radar-glow-b absolute bottom-[-10%] left-[-5%] w-[480px] h-[480px] rounded-full blur-[150px]"
          style={{ background: accent }}
        />
        <div
          className="radar-glow-c absolute top-[35%] right-[-8%] w-[420px] h-[420px] rounded-full blur-[150px]"
          style={{ background: accent }}
        />
        <div
          ref={followRef}
          className="radar-glow-follow absolute top-1/2 left-1/2 -ml-[200px] -mt-[200px] w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.14]"
          style={{ background: accent }}
        />
        <div ref={blackoutRef} className="radar-detail-blackout" aria-hidden="true" />
      </div>

      <div className="absolute top-0 inset-x-0 z-30 px-4 pt-4">
        <div className="flex items-center gap-2 max-w-xl mx-auto">
          <button
            onClick={() => router.push("/radar")}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10 transition-colors"
            aria-label="กลับไปหน้า Career Radar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <DeckProgress current={current} total={totalSlides} accent={accent} />
          <span className="shrink-0 text-xs tabular-nums text-white/40">
            {Math.min(current + 1, totalSlides)}/{totalSlides}
          </span>
          <span className="shrink-0 text-lg">{field.emoji}</span>
        </div>
      </div>

      {shouldShowSignupToast && (
        <div className="absolute bottom-5 left-1/2 z-30 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
          <div className="relative flex flex-col gap-3 rounded-xl border border-white/10 bg-neutral-950/85 p-4 pr-12 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
            <button
              onClick={dismissSignupToast}
              className="absolute right-3 top-3 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="ซ่อนข้อความนี้"
            >
              <X className="h-4 w-4" />
            </button>
            <div>
              <p className="text-sm font-semibold text-white">
                เก็บ Career Radar นี้ไว้
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                {isFinalSlide
                  ? "อ่านจบแล้ว เก็บไว้ จะได้ต่อยอดเป็นก้าวถัดไปของเธอ"
                  : "บันทึกไว้ในเครื่องนี้แล้ว อยากเปิดจากเครื่องอื่นค่อยสมัครบัญชีทีหลังได้"}
              </p>
            </div>
            <Button
              asChild
              className="shrink-0 font-semibold text-white"
              style={{ background: accent }}
            >
              <a href={keepRadarHref}>
                ดูว่าทำไม <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}

      {fromPlan && (
        <PlanDecisionBar
          fieldSlug={fieldSlug}
          fieldTitle={field.name_th || field.name_en || "เส้นทางนี้"}
          accent={accent}
          tracker={tracker}
        />
      )}

      <div
        ref={scrollRef}
        className="radar-deck relative z-10"
        style={fromPlan ? { paddingBottom: "8.5rem" } : undefined}
        onTouchStart={handleDeckTouchStart}
        onTouchMove={handleDeckTouchMove}
        onTouchEnd={handleDeckTouchEnd}
        onScroll={handleDeckScroll}
      >
        {sections.length > 0 ? (
          sections.map(renderSection)
        ) : (
          <section data-radar-index={0} className="radar-card-section px-6 py-20">
            <div className="min-h-[calc(100dvh-10rem)] flex flex-col">
              <div className="my-auto text-center">
                <p className="text-neutral-400">สายนี้ยังไม่มีข้อมูล</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/** Header progress, display only: how far through the deck the student is. */
function DeckProgress({ current, total, accent }: { current: number; total: number; accent: string }) {
  const fill = total > 0 ? Math.min(1, (current + 1) / total) : 0;
  return (
    <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/[0.12]" aria-hidden="true">
      <span
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
        style={{ width: `${Math.round(fill * 100)}%`, background: accent }}
      />
    </div>
  );
}

/** Wraps a non-card guide section (mid-deck share card, outro) in the deck's section shell. */
function GuideShellSection({
  children,
  index,
  sectionRef,
  grow = false,
}: {
  children: React.ReactNode;
  index: number;
  sectionRef: (element: HTMLElement | null) => void;
  /** The outro grows with its content instead of fitting the viewport. */
  grow?: boolean;
}) {
  return (
    <section
      ref={sectionRef}
      data-radar-index={index}
      className="radar-card-section in-view px-6 py-20"
    >
      <div className={grow ? "mx-auto w-full max-w-xl" : "min-h-[calc(100dvh-10rem)] flex flex-col"}>
        <div className={grow ? undefined : "my-auto mx-auto w-full max-w-xl"}>{children}</div>
      </div>
    </section>
  );
}

/** The skills card sits behind "ดูทักษะทั้งหมด" after the skill rail. */
function SkillsExpander({
  children,
  onExpand,
}: {
  children: React.ReactNode;
  onExpand: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (open) return <>{children}</>;
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 text-center">
      <p className="text-sm text-neutral-400">อยากรู้ว่าสายนี้ใช้ทักษะอะไรบ้าง</p>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onExpand();
        }}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
      >
        ดูทักษะทั้งหมด <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Sticky decision bar shown only when the student came from the plan wizard.
 * Marking interest is a toggle, not an exit — they can flag several fields and
 * keep exploring before returning to the plan.
 */
function PlanDecisionBar({
  fieldSlug,
  fieldTitle,
  accent,
  tracker,
}: {
  fieldSlug: string;
  fieldTitle: string;
  accent: string;
  tracker: GuideTracker;
}) {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    setInterests(readRadarInterests(window.localStorage));
  }, []);

  const isInterested = interests.includes(fieldSlug);

  return (
    <div className="absolute bottom-0 inset-x-0 z-30 border-t border-white/10 bg-neutral-950/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-xl px-4 py-3">
        <p className="text-center text-[11px] text-white/45">
          {isInterested
            ? `เก็บ “${fieldTitle}” เข้าแผนของคุณแล้ว สำรวจต่อได้อีก`
            : "อ่านจบแล้วคิดว่าไง? เลือกได้หลายเส้นทาง"}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!isInterested) tracker.track({ type: "cta_click", target: "plan" });
              setInterests(toggleRadarInterest(window.localStorage, fieldSlug));
            }}
            aria-pressed={isInterested}
            className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
              isInterested
                ? "border-transparent text-neutral-950"
                : "border-white/15 bg-white/5 text-white hover:bg-white/10"
            }`}
            style={isInterested ? { background: accent } : undefined}
          >
            {isInterested ? (
              <Check className="h-4 w-4" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
            {isInterested ? "สนใจแล้ว" : "สนใจเส้นทางนี้"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/radar?from=plan")}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Compass className="h-4 w-4" />
            สำรวจเส้นทางอื่น
          </button>
        </div>
        {interests.length > 0 && (
          <button
            type="button"
            onClick={() => router.push("/plan")}
            className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            กลับไปทำแผนต่อ ({interests.length} เส้นทาง)
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function RadarViewportFit({ children }: { children: React.ReactNode }) {
  return (
    <div className="radar-viewport-fit">
      <div className="radar-viewport-fit__content">
        {children}
      </div>
    </div>
  );
}

const RadarCardSection = memo(function RadarCardSection({
  children,
  isFirst,
  hasMore,
  accent,
  figure,
  sourceRefs = [],
  fieldSources = [],
  sectionRef,
  index,
}: {
  children: React.ReactNode;
  isFirst: boolean;
  hasMore: boolean;
  accent: string;
  figure?: string;
  sourceRefs?: number[];
  fieldSources?: FieldSource[];
  sectionRef: (element: HTMLElement | null) => void;
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // First card starts visible
    if (isFirst) {
      el.classList.add("in-view");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isFirst]);

  // Hide scroll cue after first scroll
  useEffect(() => {
    if (!isFirst || !hasMore) return;
    const handler = () => {
      setHasScrolled(true);
      window.removeEventListener("scroll", handler, true);
    };
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [isFirst, hasMore]);

  return (
    <section
      ref={(element) => {
        ref.current = element;
        sectionRef(element);
      }}
      data-radar-index={index}
      className={`radar-card-section px-6 py-20 ${
        isFirst ? "radar-card-section--first" : ""
      } ${index === 1 ? "radar-card-section--after-first" : ""}`}
    >
      {isFirst && figure && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="radar-detail-figure-bg">
            <Image
              src={figure}
              alt=""
              fill
              sizes="100vw"
              className="object-contain object-center"
              draggable={false}
            />
          </div>
        </div>
      )}
      <div className="radar-card-viewport relative z-10 min-h-[calc(100dvh-10rem)]">
        <RadarViewportFit>
          {children}
          {sourceRefs.length > 0 && fieldSources.length > 0 && (
            <div className="radar-section-sources mt-2 max-w-xl mx-auto w-full">
              <SourceRefs refs={sourceRefs} sources={fieldSources} />
            </div>
          )}
        </RadarViewportFit>
        {isFirst && hasMore && !hasScrolled && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/30 font-medium">
              ปัดขึ้น
            </span>
            <div
              className="radar-scroll-cue"
              style={{ color: accent }}
            />
          </div>
        )}
      </div>
    </section>
  );
});
