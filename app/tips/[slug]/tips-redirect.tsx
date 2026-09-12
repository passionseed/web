"use client";

import { useEffect } from "react";

/**
 * Forwards a human reader to the PDF shortly after the page paints.
 *
 * Deliberately client-side and delayed: a server redirect would send the
 * Instagram/LINE preview crawler to the PDF too, and the DM would fall back to
 * a bare link with no card. The delay also leaves the title and button visible
 * for a beat, so the reader sees a Passion Seed page rather than being thrown
 * at a file from a domain they do not recognise.
 */
export function TipsRedirect({ fileUrl }: { fileUrl: string }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace(fileUrl);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [fileUrl]);

  return null;
}
