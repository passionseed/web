"use client";

import Script from "next/script";
import { useEffect } from "react";

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

/**
 * Meta Pixel for SHIFT pages. Mount once per page (replaces the old
 * local ShiftPageViewTracker). Fires PageView on mount/navigation and
 * ViewContent when a round name is provided.
 */
export function MetaPixel({
  pagePath,
  viewContent,
}: {
  pagePath?: string;
  viewContent?: { content_name: string };
}) {
  const contentName = viewContent?.content_name;

  useEffect(() => {
    trackMetaEvent("PageView");
    if (contentName) {
      trackMetaEvent("ViewContent", {
        content_name: contentName,
        content_category: "shift",
      });
    }
  }, [pagePath, contentName]);

  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
