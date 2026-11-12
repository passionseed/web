"use client";

/**
 * Platform-aware follow link (spec 2.8). TikTok visitors see "ติดตามใน TikTok"
 * when the TikTok URL is set; everyone else follows the IG account from
 * `CONTACT`. Reported as follow intent (`follow_click`), not follows. Inside
 * the guide shell it takes the pixel look and the level's page key.
 */
import { ArrowUpRight } from "lucide-react";
import { followTarget, PASSIONSEED_TIKTOK_URL } from "@/lib/radar-guide/social";
import type { GuideTracker, UaApp } from "@/lib/radar-guide/types";
import { useFunnelContext, type FunnelLook } from "./funnel-look";
import "./guide.css";
import "./share-pixel.css";

export interface FollowButtonProps {
  uaApp: UaApp | null;
  /** The last tagged touch's utm_source (`tiktok-*` counts as TikTok). */
  utmSource: string | null;
  tracker: GuideTracker;
  /** Guide page for events. Defaults to the shell's level. */
  pageKey?: string | null;
  placement?: "mid" | "outro" | "profile";
  /** "button" is a full-width 48px button; "line" is a quiet text link. */
  variant?: "button" | "line";
  /** For tests; defaults to PASSIONSEED_TIKTOK_URL. */
  tiktokUrl?: string | null;
  look?: FunnelLook;
  className?: string;
}

export function FollowButton({
  uaApp,
  utmSource,
  tracker,
  pageKey,
  placement,
  variant = "button",
  tiktokUrl = PASSIONSEED_TIKTOK_URL,
  look: lookProp,
  className,
}: FollowButtonProps) {
  const { look, shellPageKey } = useFunnelContext(lookProp);
  const eventPage = pageKey ?? shellPageKey ?? undefined;
  const target = followTarget({ uaApp, utmSource, tiktokUrl });
  const base =
    look === "pixel"
      ? variant === "button"
        ? "rgf rgf-btn rgf-btn--quiet"
        : "rgf rgf-follow"
      : variant === "button"
        ? "radar-guide-button w-full"
        : "radar-guide-follow-line";
  return (
    <a
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} ${className ?? ""}`}
      data-demo="follow"
      onClick={() =>
        tracker.track({
          type: "follow_click",
          ...(eventPage ? { pageKey: eventPage } : {}),
          target: target.platform,
          metadata: placement ? { placement } : undefined,
        })
      }
    >
      <span>{target.labelTh}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}
