"use client";

/**
 * Share (spec 2.8): "ส่งใน LINE" and "คัดลอกลิงก์", 48px each. The native share
 * sheet replaces them only when `navigator.canShare()` is true and the visitor
 * is not in Instagram's in-app browser. A failed copy shows the link in a
 * selectable field instead.
 *
 * Inside the guide shell the buttons take the pixel game look, events carry
 * the level's page key, and the link opens the level the student is on
 * (`mid`) or the guide cover (`outro`, `profile`), so a friend starts the run
 * from level 1.
 */
import { useEffect, useRef, useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import {
  browserCanShare,
  lineShareHref,
  radarGuideShareText,
  radarShareText,
  radarShareUrl,
  shouldUseNativeShare,
} from "@/lib/radar-guide/social";
import type { GuideTracker, UaApp } from "@/lib/radar-guide/types";
import { lookClass, useFunnelContext, type FunnelLook } from "./funnel-look";
import "./guide.css";
import "./share-pixel.css";

export type SharePlacement = "mid" | "outro" | "profile";

export interface ShareButtonsProps {
  fieldSlug: string;
  fieldNameTh: string | null;
  uaApp: UaApp | null;
  tracker: GuideTracker;
  /** Guide page the buttons sit on, for events. Defaults to the shell's level. */
  pageKey?: string | null;
  /** Where the buttons sit, sent as event metadata. */
  placement?: SharePlacement;
  /**
   * The guide page the shared link opens. Defaults to the current level for
   * `mid` and to the cover otherwise. Null forces the cover.
   */
  sharePage?: string | null;
  /** utm_content override (the profile card uses `<slug>-card`, see radarProfileShareTag). */
  shareContent?: string;
  /** Text sent with the link. Defaults to the career share text. */
  shareText?: string;
  look?: FunnelLook;
  className?: string;
}

type CopyState = "idle" | "copied" | "failed";

export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through: IG and LINE webviews often block the clipboard API.
  }
  return false;
}

export function ShareButtons({
  fieldSlug,
  fieldNameTh,
  uaApp,
  tracker,
  pageKey,
  placement,
  sharePage,
  shareContent,
  shareText,
  look: lookProp,
  className,
}: ShareButtonsProps) {
  const { look, shellPageKey } = useFunnelContext(lookProp);
  const eventPage = pageKey ?? shellPageKey ?? undefined;
  const linkPage = sharePage !== undefined ? sharePage : placement === "mid" ? (eventPage ?? null) : null;
  const url = radarShareUrl(fieldSlug, linkPage, shareContent);
  const text = shareText ?? (look === "pixel" ? radarGuideShareText(fieldNameTh) : radarShareText(fieldNameTh));
  const [useNative, setUseNative] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number | null>(null);
  const pixel = look === "pixel";

  // Decided after mount so the server render and first client render agree.
  useEffect(() => {
    setUseNative(shouldUseNativeShare({ uaApp, canShare: browserCanShare({ title: text, text, url }) }));
  }, [uaApp, text, url]);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    []
  );

  const fire = (target: "line" | "copy" | "native") =>
    tracker.track({
      type: "share_click",
      ...(eventPage ? { pageKey: eventPage } : {}),
      target,
      metadata: placement ? { placement } : undefined,
    });

  const onNative = async () => {
    fire("native");
    try {
      await navigator.share({ title: text, text, url });
    } catch (error) {
      // A cancelled sheet is fine; anything else falls back to the buttons.
      if ((error as { name?: string } | null)?.name !== "AbortError") setUseNative(false);
    }
  };

  const onCopy = async () => {
    fire("copy");
    const ok = await copyText(url);
    setCopyState(ok ? "copied" : "failed");
    if (ok) {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopyState("idle"), 2500);
    }
  };

  const btn = (variant: "" | "accent" | "line") =>
    pixel
      ? `rgf-btn${variant ? ` rgf-btn--${variant}` : ""}`
      : `radar-guide-button${variant ? ` radar-guide-button--${variant}` : ""}`;
  const root = lookClass(look, "rgf-share", "radar-guide-share", className);

  if (useNative) {
    return (
      <div className={root}>
        <button
          type="button"
          className={pixel ? btn("accent") : `${btn("accent")} w-full`}
          onClick={onNative}
          data-demo="share-native"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" /> ส่งให้เพื่อน
        </button>
      </div>
    );
  }

  return (
    <div className={root}>
      <div className={pixel ? "rgf-grid2" : "grid grid-cols-2 gap-2"}>
        <a
          href={lineShareHref(text, url)}
          target="_blank"
          rel="noopener noreferrer"
          className={btn("line")}
          onClick={() => fire("line")}
          data-demo="share-line"
        >
          ส่งใน LINE
        </a>
        <button type="button" className={btn("")} onClick={onCopy} aria-live="polite" data-demo="share-copy">
          {copyState === "copied" ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> คัดลอกแล้ว
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" aria-hidden="true" /> คัดลอกลิงก์
            </>
          )}
        </button>
      </div>
      {copyState === "failed" ? (
        <label className="mt-2 block">
          <span className={pixel ? "rgf-note" : "text-xs text-neutral-400"}>คัดลอกเองได้จากช่องนี้</span>
          <input
            type="text"
            readOnly
            value={url}
            aria-label="ลิงก์หน้านี้"
            className={`${pixel ? "rgf-input" : "radar-guide-input"} mt-1 w-full select-all`}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      ) : null}
    </div>
  );
}
