"use client";

/**
 * The end-of-run pieces a level can hold, wired to the shell's tracker and
 * attribution: outbound links, the mid-guide share card, the outro (intent,
 * career request, share, follow, the open SHIFT round, other careers) and the
 * shareable profile card. No 1:1 channel anywhere: no chat, no LINE QR.
 */
import { useMemo, useSyncExternalStore } from "react";
import { ProfileCard, guideArtSrc } from "@/components/radar/guide/story";
import { radarProgramLine } from "@/lib/content/radar-cta";
import { bangkokToday } from "@/lib/content/shift-cohort";
import { recordFieldIntent } from "@/lib/radar/record-intent";
import { detectUaApp } from "@/lib/radar-guide/attribution";
import { radarProfileShortLink } from "@/lib/radar-guide/social";
import { buildProfileCard } from "@/lib/radar-guide/story";
import { GuideIntentButton, GuideOutro, GuideProgramLine } from "../GuideOutro";
import { MidShareCard } from "../MidShareCard";
import { useGuideShell } from "./shell-context";

export interface GuideLinkButtonProps {
  pageKey: string;
  labelTh: string;
  href: string;
  cta: "first-step" | "program" | "other-career";
}

/** An outbound link step. Sends `cta_click` with the block's `cta` as target. */
export function GuideLinkButton({ pageKey, labelTh, href, cta }: GuideLinkButtonProps) {
  const { tracker } = useGuideShell();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rg-pixel-btn rg-pixel-btn--accent rg-linkstep"
      data-demo={`link-${cta}`}
      onClick={() => tracker.track({ type: "cta_click", pageKey, target: cta })}
    >
      {labelTh}
    </a>
  );
}

export function MidShareStep() {
  const { slug, index, tracker, attribution } = useGuideShell();
  return (
    <MidShareCard
      fieldSlug={slug}
      fieldNameTh={index.nameTh}
      uaApp={attribution?.ua_app ?? null}
      utmSource={attribution?.utm_source ?? null}
      tracker={tracker}
      className="rg-panel"
    />
  );
}

const noop = () => () => {};

/** Today in Bangkok, on the client only: the open round is decided at view time, not at build time. */
function useBangkokToday(): string | null {
  return useSyncExternalStore(noop, () => bangkokToday(), () => null);
}

export function GuideOutroStep() {
  const { slug, index, tracker, attribution } = useGuideShell();
  const today = useBangkokToday();
  const program = useMemo(() => (today ? radarProgramLine(slug, today) : null), [slug, today]);
  return (
    <GuideOutro
      fieldSlug={slug}
      fieldNameTh={index.nameTh}
      tracker={tracker}
      uaApp={attribution?.ua_app ?? null}
      utmSource={attribution?.utm_source ?? null}
      className="rg-panel"
      intentSlot={
        <GuideIntentButton
          tracker={tracker}
          onIntent={() => {
            recordFieldIntent({
              fieldSlug: slug,
              fieldId: null,
              pathSlug: index.intentPathSlug,
              scope: "field",
              buttonLabel: "interested",
              fallbackLabel: "สนใจสายนี้",
              visitId: tracker.visitId,
            });
          }}
        />
      }
      programSlot={
        program ? (
          <GuideProgramLine tracker={tracker} lineTh={program.body} linkLabelTh={program.cta} href={program.href} />
        ) : undefined
      }
    />
  );
}

/**
 * "โปรไฟล์สายไซเบอร์ของฉัน": pixel avatar, three traits from the student's
 * choices, XP. Built on the device; shared as a PNG with the guide's /r alias.
 */
export function ProfileStep() {
  const { slug, index, progress, tracker, pageKey, attribution } = useGuideShell();
  const card = useMemo(() => buildProfileCard(progress, index), [progress, index]);
  // IG and FB webviews drop the share sheet and blob downloads: the card then
  // opens as an image to long-press. Read from the visit, or the UA directly.
  const uaApp = useMemo(
    () => attribution?.ua_app ?? (typeof navigator === "undefined" ? null : detectUaApp(navigator.userAgent)),
    [attribution]
  );
  // /r/<alias>-card: tagged as a share, lands on the cover (not TikTok alias traffic).
  const share = useMemo(() => radarProfileShortLink(slug), [slug]);
  return (
    <ProfileCard
      card={card}
      accent={index.accent}
      shareUrl={share.url}
      shareLabel={share.label}
      frameSrc={guideArtSrc(slug, "frame")}
      uaApp={uaApp}
      onShare={(method) =>
        tracker.track({
          type: "share_click",
          pageKey: pageKey ?? undefined,
          target: method === "copy" ? "copy" : "native",
          metadata: { card: "profile", method },
        })
      }
    />
  );
}
