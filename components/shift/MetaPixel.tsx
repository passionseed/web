"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

import { INK } from "@/components/shift/poster/riso";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1435021828557401";

type Fbq = (
  action: "track" | "trackCustom",
  event: string,
  params?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
) {
  try {
    window.fbq?.("track", event, params);
  } catch {
    // Analytics must never break UX.
  }
}

export function trackMetaCustom(
  event: string,
  params?: Record<string, unknown>,
) {
  try {
    window.fbq?.("trackCustom", event, params);
  } catch {
    // Analytics must never break UX.
  }
}

const CONSENT_KEY = "ps_ads_consent_v1";
type AdsConsent = "granted" | "denied";

function readConsent(): AdsConsent | null {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function saveConsent(value: AdsConsent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage disabled: the choice holds for this page view only.
  }
}

/** Asks once. Declining changes nothing about using the page or applying. */
function CookieBanner({ onChoose }: { onChoose: (value: AdsConsent) => void }) {
  return (
    <div
      role="dialog"
      aria-label="คุกกี้"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-xl px-5 py-4 font-bai-jamjuree text-sm leading-relaxed shadow-lg"
      style={{ backgroundColor: INK.paper, color: INK.black }}
      lang="th"
    >
      <p>
        เว็บนี้ใช้คุกกี้ของ Meta เพื่อวัดผลโฆษณา ไม่ยอมรับก็ใช้เว็บและสมัครได้ตามปกติ
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onChoose("granted")}
          className="min-h-12 flex-1 rounded-full px-4 font-semibold"
          style={{ backgroundColor: INK.black, color: INK.paper }}
        >
          ยอมรับ
        </button>
        <button
          type="button"
          onClick={() => onChoose("denied")}
          className="min-h-12 flex-1 rounded-full px-4 font-semibold"
          style={{ boxShadow: `inset 0 0 0 1.5px ${INK.black}` }}
        >
          ไม่ยอมรับ
        </button>
      </div>
    </div>
  );
}

/**
 * Meta Pixel for SHIFT pages. Mount once per page. Loads only after the
 * visitor accepts the cookie banner (PDPA: advertising cookies need consent),
 * then fires PageView, and ViewContent when a round name is provided. Until
 * then trackMetaEvent is a no-op, because window.fbq does not exist.
 */
export function MetaPixel({
  pagePath,
  viewContent,
}: {
  pagePath?: string;
  viewContent?: { content_name: string };
}) {
  const contentName = viewContent?.content_name;
  // undefined until read after mount, so the server render and hydration match.
  const [consent, setConsent] = useState<AdsConsent | null | undefined>(undefined);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  useEffect(() => {
    if (consent !== "granted") return;
    trackMetaEvent("PageView");
    if (contentName) {
      trackMetaEvent("ViewContent", {
        content_name: contentName,
        content_category: "shift",
      });
    }
  }, [consent, pagePath, contentName]);

  function choose(value: AdsConsent) {
    saveConsent(value);
    setConsent(value);
  }

  if (consent === null) return <CookieBanner onChoose={choose} />;
  if (consent !== "granted") return null;

  return (
    <Script
      id="meta-pixel-base"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
      }}
    />
  );
}
