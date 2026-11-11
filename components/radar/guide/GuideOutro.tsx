"use client";

/**
 * The end of a run (spec 2.8; docs/radar-guide/cybersecurity-guide.md page
 * `next`). Each section is exported on its own so a level can place them as
 * separate steps, and `GuideOutro` composes them in the spec order:
 * 1. "ลองอันนี้ก่อน": the first start option tile (`firstStep`, deck only)
 * 2. the intent choice (`intentSlot`, normally GuideIntentButton)
 * 3. "อยากให้ทำอาชีพไหนต่อ?": GuideRequestSection
 * 4. share, 5. follow: GuideShareSection
 * 6. the program line (`programSlot`, normally GuideProgramLine: the open
 *    SHIFT round, no price) and the deck's resource links (`resourcesSlot`)
 * 7. "ดูอาชีพอื่น": GuideOtherCareers
 *
 * Inside the guide shell everything takes the pixel game look and events
 * carry the level's page key; in the DB deck the deck look is kept. Nothing
 * here opens a 1:1 channel: no chat, no LINE QR, questions go to comments.
 */
import Link from "next/link";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, Check, Heart } from "lucide-react";
import { otherCareerCards, RADAR_PILOT_CAREERS, type OtherCareerCard } from "@/lib/radar-guide/social";
import type { GuideTracker, UaApp } from "@/lib/radar-guide/types";
import { CareerRequestForm } from "./CareerRequestForm";
import { FollowButton } from "./FollowButton";
import { useFunnelContext, type FunnelLook } from "./funnel-look";
import { useGuideShellOptional } from "./shell/shell-context";
import { ShareButtons } from "./ShareButtons";
import "./guide.css";
import "./share-pixel.css";

/** Deck outro heading. */
export const GUIDE_OUTRO_TITLE_TH = "ไปต่อ";
export const GUIDE_SHARE_HEADING_TH = "ส่งให้เพื่อนที่กำลังเลือกอยู่";
export const GUIDE_OTHER_CAREERS_TH = "ดูอาชีพอื่น";

function eventPageFields(pageKey: string | null | undefined) {
  return pageKey ? { pageKey } : {};
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export interface GuideRequestSectionProps {
  tracker: GuideTracker;
  /** The current career, left out of the chips. */
  fieldSlug: string;
  /** Chips; defaults to the other pilot careers. */
  suggestionsTh?: readonly string[];
  look?: FunnelLook;
  className?: string;
}

/** "อยากให้ทำอาชีพไหนต่อ?" with the other pilots as chips. */
export function GuideRequestSection({ tracker, fieldSlug, suggestionsTh, look: lookProp, className }: GuideRequestSectionProps) {
  const { look } = useFunnelContext(lookProp);
  const chips = suggestionsTh ?? RADAR_PILOT_CAREERS.filter((c) => c.slug !== fieldSlug).map((c) => c.nameTh);
  return (
    <div className={`${look === "pixel" ? "rgf rgf-panel" : "radar-guide-outro__block"} ${className ?? ""}`}>
      <CareerRequestForm tracker={tracker} suggestionsTh={look === "pixel" ? chips : []} look={look} />
    </div>
  );
}

export interface GuideShareSectionProps {
  fieldSlug: string;
  fieldNameTh: string | null;
  tracker: GuideTracker;
  uaApp: UaApp | null;
  utmSource: string | null;
  pageKey?: string | null;
  look?: FunnelLook;
  className?: string;
}

/** Share (LINE, copy, or the native sheet) and the follow line. */
export function GuideShareSection({
  fieldSlug,
  fieldNameTh,
  tracker,
  uaApp,
  utmSource,
  pageKey,
  look: lookProp,
  className,
}: GuideShareSectionProps) {
  const { look } = useFunnelContext(lookProp);
  const pixel = look === "pixel";
  return (
    <div className={`${pixel ? "rgf rgf-panel" : "radar-guide-outro__block"} ${className ?? ""}`}>
      <p className={pixel ? "rgf-heading" : "radar-guide-outro__heading"}>{GUIDE_SHARE_HEADING_TH}</p>
      <ShareButtons
        fieldSlug={fieldSlug}
        fieldNameTh={fieldNameTh}
        uaApp={uaApp}
        tracker={tracker}
        pageKey={pageKey}
        placement="outro"
        look={look}
        className="mt-3"
      />
      <FollowButton
        uaApp={uaApp}
        utmSource={utmSource}
        tracker={tracker}
        pageKey={pageKey}
        placement="outro"
        variant={pixel ? "line" : "button"}
        look={look}
        className={pixel ? "mt-3" : "mt-2"}
      />
    </div>
  );
}

export interface GuideOtherCareersProps {
  fieldSlug: string;
  tracker: GuideTracker;
  pageKey?: string | null;
  /** Defaults to the other pilot careers (code guides first, with their cold open). */
  careers?: readonly OtherCareerCard[];
  allCareersHref?: string;
  look?: FunnelLook;
  className?: string;
}

/** "ดูอาชีพอื่น": cards for the other careers (`cta_click other-career`), then the hub. */
export function GuideOtherCareers({
  fieldSlug,
  tracker,
  pageKey,
  careers,
  allCareersHref = "/radar",
  look: lookProp,
  className,
}: GuideOtherCareersProps) {
  const { look, shellPageKey } = useFunnelContext(lookProp);
  const eventPage = pageKey ?? shellPageKey;
  const list = careers ?? otherCareerCards(fieldSlug);
  const onCareer = (slug: string) =>
    tracker.track({
      type: "cta_click",
      ...eventPageFields(eventPage),
      target: "other-career",
      metadata: { to: slug },
    });

  if (look !== "pixel") {
    return (
      <Link href={allCareersHref} className={`radar-guide-button mt-2 w-full ${className ?? ""}`}>
        {GUIDE_OTHER_CAREERS_TH} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <div className={`rgf rgf-panel ${className ?? ""}`} id="rgf-other-careers">
      <p className="rgf-heading">{GUIDE_OTHER_CAREERS_TH}</p>
      <div className="rgf-cards mt-3">
        {list.map((career) => (
          <Link
            key={career.slug}
            href={career.href}
            className="rgf-card"
            onClick={() => onCareer(career.slug)}
            data-demo={`other-${career.slug}`}
          >
            <span className="min-w-0">
              <span className="rgf-card__name">{career.nameTh}</span>
              {career.hookTh ? <span className="rgf-card__hook">{career.hookTh}</span> : null}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <Link href={allCareersHref} className="rgf-follow mt-2">
        <span>ดูทุกอาชีพ</span>
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

export interface GuideOutroProps {
  fieldSlug: string;
  fieldNameTh: string | null;
  tracker: GuideTracker;
  uaApp: UaApp | null;
  utmSource: string | null;
  /** Guide page for events. Defaults to the shell's level. */
  pageKey?: string | null;
  /** The primary skill's first start option tile. A click inside sends `cta_click` `first-step`. */
  firstStep?: ReactNode;
  /** The intent action, normally GuideIntentButton. */
  intentSlot?: ReactNode;
  /** One short line about the paid program; nothing when no round is open. */
  programSlot?: ReactNode;
  /** The CtaCard resource links, shown below the program line (deck). */
  resourcesSlot?: ReactNode;
  /** Request chips; defaults to the other pilot careers. */
  requestSuggestionsTh?: readonly string[];
  otherCareersHref?: string;
  look?: FunnelLook;
  className?: string;
}

export function GuideOutro({
  fieldSlug,
  fieldNameTh,
  tracker,
  uaApp,
  utmSource,
  pageKey,
  firstStep,
  intentSlot,
  programSlot,
  resourcesSlot,
  requestSuggestionsTh,
  otherCareersHref = "/radar",
  look: lookProp,
  className,
}: GuideOutroProps) {
  const { look, shellPageKey } = useFunnelContext(lookProp);
  const eventPage = pageKey ?? shellPageKey;
  const pixel = look === "pixel";
  const firstStepSent = useRef(false);

  const onFirstStepClick = (event: MouseEvent<HTMLDivElement>) => {
    if (firstStepSent.current) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest("a, button")) return;
    firstStepSent.current = true;
    tracker.track({ type: "cta_click", ...eventPageFields(eventPage), target: "first-step" });
  };

  const shared = { fieldSlug, tracker, look } as const;
  const block = pixel ? "rgf rgf-panel" : "radar-guide-outro__block";

  return (
    <div className={`${pixel ? "rgf rgf-stack" : "radar-guide-card radar-guide-outro"} ${className ?? ""}`}>
      {pixel ? null : <h2 className="radar-guide-outro__title">{GUIDE_OUTRO_TITLE_TH}</h2>}

      {firstStep ? (
        <div className={block}>
          <p className={pixel ? "rgf-heading" : "radar-guide-outro__heading"}>ลองอันนี้ก่อน</p>
          <div className="mt-3" onClickCapture={onFirstStepClick}>
            {firstStep}
          </div>
        </div>
      ) : null}

      {intentSlot ? <div className={block}>{intentSlot}</div> : null}

      <GuideRequestSection {...shared} suggestionsTh={requestSuggestionsTh} />

      <GuideShareSection
        {...shared}
        fieldNameTh={fieldNameTh}
        uaApp={uaApp}
        utmSource={utmSource}
        pageKey={eventPage}
      />

      {programSlot || resourcesSlot ? (
        <div className={block}>
          {programSlot}
          {resourcesSlot ? <div className={programSlot ? "mt-4" : undefined}>{resourcesSlot}</div> : null}
        </div>
      ) : null}

      <GuideOtherCareers {...shared} pageKey={eventPage} allCareersHref={otherCareersHref} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intent
// ---------------------------------------------------------------------------

export type GuideIntentChoice = "yes" | "unsure" | "no";

export const GUIDE_INTENT_SUB_TH = "กดไว้ เราจะรู้ว่าควรทำข้อมูลสายนี้ลึกขึ้น";
export const GUIDE_INTENT_AFTER_TH = "ไม่ว่าจะกดอันไหน ถือว่าได้ข้อมูล คนที่ลองแล้วรู้ว่าไม่ใช่ ประหยัดเวลาไปหลายปี";

export interface GuideIntentButtonProps {
  tracker: GuideTracker;
  /** The `recordInterested` path (radar_path_intents plus the My Path intent, with visit_id). */
  onIntent(): void | Promise<void>;
  /** Already recorded in this visit. */
  recorded?: boolean;
  label?: string;
  /** Guide page for events. Defaults to the shell's level. */
  pageKey?: string | null;
  /**
   * Pixel look only: also offer "ยังไม่แน่ใจ" and "ไม่ใช่ฉัน" (each an
   * `interactive_tap <page>:intent-unsure|intent-no`). Default true.
   */
  alternatives?: boolean;
  /** Called after any choice, e.g. to open the honesty fold on "no". */
  onChoice?(choice: GuideIntentChoice): void;
  /** Shown under the after-intent line when the student picks "สนใจ" (e.g. a link back to tonight). */
  interestedSlot?: ReactNode;
  look?: FunnelLook;
}

/**
 * "สนใจสายนี้". Sends `cta_click` `intent` once, runs `onIntent`, then shows
 * "บันทึกแล้ว". Never opens a chat or QR. In the guide shell it is the
 * three-way choice from the design, saved as the `<page>:intent` choice.
 */
export function GuideIntentButton({
  tracker,
  onIntent,
  recorded: recordedProp = false,
  label = "สนใจสายนี้",
  pageKey,
  alternatives = true,
  onChoice,
  interestedSlot,
  look: lookProp,
}: GuideIntentButtonProps) {
  const { look, shellPageKey } = useFunnelContext(lookProp);
  const shell = useGuideShellOptional();
  const eventPage = pageKey ?? shellPageKey;
  const saved = eventPage ? shell?.progress.choices[`${eventPage}:intent`] : undefined;
  const initial: GuideIntentChoice | null =
    recordedProp ? "yes" : saved === "yes" || saved === "unsure" || saved === "no" ? saved : null;
  const [choice, setChoice] = useState<GuideIntentChoice | null>(initial);
  const pixel = look === "pixel";
  const done = choice === "yes" || recordedProp;

  const choose = (next: GuideIntentChoice) => {
    if (next === "yes") {
      if (done) return;
      tracker.track({ type: "cta_click", ...eventPageFields(eventPage), target: "intent" });
      void Promise.resolve()
        .then(onIntent)
        .catch(() => undefined);
    } else if (eventPage) {
      tracker.track({ type: "interactive_tap", pageKey: eventPage, target: `${eventPage}:intent-${next}` });
    }
    setChoice(next);
    if (eventPage) shell?.dispatch({ type: "choice", key: `${eventPage}:intent`, value: next });
    onChoice?.(next);
  };

  if (!pixel) {
    return (
      <div>
        <button
          type="button"
          className={`radar-guide-button w-full ${done ? "" : "radar-guide-button--accent"}`}
          aria-pressed={done}
          disabled={done}
          onClick={() => choose("yes")}
        >
          {done ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> บันทึกแล้ว
            </>
          ) : (
            <>
              <Heart className="h-4 w-4" aria-hidden="true" /> {label}
            </>
          )}
        </button>
      </div>
    );
  }

  const showAlternatives = alternatives && Boolean(eventPage);
  return (
    <div className="rgf rgf-intent">
      <p className="rgf-heading rgf-dot">สายนี้ใช่เราไหม</p>
      <p className="rgf-note mt-1">{GUIDE_INTENT_SUB_TH}</p>
      <div className="mt-3 grid gap-1">
        <button
          type="button"
          className={`rgf-btn ${done ? "" : "rgf-btn--accent"}`}
          aria-pressed={done}
          disabled={done}
          onClick={() => choose("yes")}
          data-demo="intent-yes"
        >
          {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Heart className="h-4 w-4" aria-hidden="true" />}
          {done ? "บันทึกแล้ว" : label}
        </button>
        {showAlternatives ? (
          <div className="rgf-grid2">
            <button
              type="button"
              className="rgf-btn rgf-btn--quiet"
              aria-pressed={choice === "unsure"}
              onClick={() => choose("unsure")}
              data-demo="intent-unsure"
            >
              ยังไม่แน่ใจ
            </button>
            <button
              type="button"
              className="rgf-btn rgf-btn--quiet"
              aria-pressed={choice === "no"}
              onClick={() => choose("no")}
              data-demo="intent-no"
            >
              ไม่ใช่ฉัน
            </button>
          </div>
        ) : null}
      </div>
      {choice ? (
        <p className="rgf-line mt-3" role="status" aria-live="polite">
          {GUIDE_INTENT_AFTER_TH}
        </p>
      ) : null}
      {choice === "yes" && interestedSlot ? <div className="mt-2">{interestedSlot}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Program line
// ---------------------------------------------------------------------------

export interface GuideProgramLineProps {
  tracker: GuideTracker;
  /** One short line, for example the open SHIFT round. No price. */
  lineTh: string;
  linkLabelTh: string;
  href: string;
  /** Guide page for events. Defaults to the shell's level. */
  pageKey?: string | null;
  look?: FunnelLook;
}

/** The paid program line (the open SHIFT round, never a price). Sends `cta_click` `program`. */
export function GuideProgramLine({ tracker, lineTh, linkLabelTh, href, pageKey, look: lookProp }: GuideProgramLineProps) {
  const { look, shellPageKey } = useFunnelContext(lookProp);
  const eventPage = pageKey ?? shellPageKey;
  const pixel = look === "pixel";
  const external = /^https?:\/\//.test(href);
  const onClick = () => tracker.track({ type: "cta_click", ...eventPageFields(eventPage), target: "program" });
  const className = pixel ? "rgf-follow mt-2" : "radar-guide-program__link";
  const content = (
    <>
      {pixel ? <span>{linkLabelTh}</span> : linkLabelTh} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </>
  );
  return (
    <div className={pixel ? "rgf rgf-program" : "radar-guide-program"}>
      <p className={pixel ? "rgf-line" : "radar-guide-program__line"}>{lineTh}</p>
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
          {content}
        </a>
      ) : (
        <Link href={href} className={className} onClick={onClick}>
          {content}
        </Link>
      )}
    </div>
  );
}
