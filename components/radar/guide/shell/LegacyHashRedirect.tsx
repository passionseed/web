"use client";

/**
 * Old deck links (`/radar/cybersecurity#money`) land on the matching level
 * (`/radar/cybersecurity/money`), keeping the query string so utm tags reach
 * the level's visit. Runs before the cover records its visit: the visit beacon
 * mounts only once no redirect is pending, and never in demo mode.
 */
import { useEffect, useState } from "react";
import { legacyHashPage } from "@/lib/radar-guides";
import { isDemoMode } from "@/lib/radar-guide/demo";
import { levelHref } from "./guide-routes";
import { VisitBridge } from "./VisitBridge";

/** The level path for a legacy hash, with `search` kept, or null. */
export function legacyRedirectTarget(slug: string, hash: string, search = ""): string | null {
  if (!hash || hash === "#") return null;
  let clean = hash;
  try {
    clean = decodeURIComponent(hash);
  } catch {
    // keep the raw hash
  }
  const key = legacyHashPage(slug, clean);
  return key ? `${levelHref(slug, key)}${search}` : null;
}

export interface LegacyHashRedirectProps {
  slug: string;
  /** Called once with whether a redirect was started. */
  onSettled?(redirecting: boolean): void;
  /** Test seam. */
  replace?(url: string): void;
}

export function LegacyHashRedirect({ slug, onSettled, replace }: LegacyHashRedirectProps) {
  useEffect(() => {
    const target = legacyRedirectTarget(slug, window.location.hash, window.location.search);
    if (target) {
      (replace ?? ((url: string) => window.location.replace(url)))(target);
      onSettled?.(true);
      return;
    }
    onSettled?.(false);
    // Once per mount: the hash is read on arrival only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  return null;
}

/** The cover's client part: legacy redirect first, then the visit (with its utm tags). */
export function GuideCoverClient({ slug }: { slug: string }) {
  const [state, setState] = useState<"pending" | "visit" | "none">("pending");
  return (
    <>
      <LegacyHashRedirect
        slug={slug}
        onSettled={(redirecting) => setState(redirecting || isDemoMode() ? "none" : "visit")}
      />
      {state === "visit" ? <VisitBridge slug={slug} /> : null}
    </>
  );
}
