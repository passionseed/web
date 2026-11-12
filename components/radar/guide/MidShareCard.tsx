"use client";

/**
 * The mid-run share card (spec 2.8; the guide's `shareCard` block after
 * `money`): one line, the two share buttons, and one follow line. No other
 * asks. In the guide shell it is a pixel panel and shares the level the
 * student is on; in the deck it keeps the deck card.
 */
import type { GuideTracker, UaApp } from "@/lib/radar-guide/types";
import { FollowButton } from "./FollowButton";
import { useFunnelContext, type FunnelLook } from "./funnel-look";
import { ShareButtons } from "./ShareButtons";
import "./guide.css";
import "./share-pixel.css";

export interface MidShareCardProps {
  fieldSlug: string;
  fieldNameTh: string | null;
  uaApp: UaApp | null;
  utmSource: string | null;
  tracker: GuideTracker;
  /** Guide page the card sits on. Defaults to the shell's level. */
  pageKey?: string | null;
  look?: FunnelLook;
  className?: string;
}

export const MID_SHARE_LINE_TH = "ข้อมูลแบบนี้ มีเพื่อนที่ควรเห็นไหม";

export function MidShareCard({
  fieldSlug,
  fieldNameTh,
  uaApp,
  utmSource,
  tracker,
  pageKey,
  look: lookProp,
  className,
}: MidShareCardProps) {
  const { look } = useFunnelContext(lookProp);
  const pixel = look === "pixel";
  return (
    <div
      className={`${pixel ? "rgf rgf-panel" : "radar-guide-card radar-guide-midshare"} ${className ?? ""}`}
      data-demo="mid-share"
    >
      <p className={pixel ? "rgf-heading rgf-dot" : "radar-guide-midshare__line"}>{MID_SHARE_LINE_TH}</p>
      <ShareButtons
        fieldSlug={fieldSlug}
        fieldNameTh={fieldNameTh}
        uaApp={uaApp}
        tracker={tracker}
        pageKey={pageKey}
        placement="mid"
        look={look}
        className={pixel ? "mt-4" : "mt-5"}
      />
      <FollowButton
        uaApp={uaApp}
        utmSource={utmSource}
        tracker={tracker}
        pageKey={pageKey}
        placement="mid"
        variant="line"
        look={look}
        className={pixel ? "mt-3" : "mt-5"}
      />
    </div>
  );
}
