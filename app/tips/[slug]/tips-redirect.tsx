"use client";

import { useEffect } from "react";

/**
 * Forwards a human reader to the PDF as soon as the page paints.
 *
 * Deliberately client-side: a server redirect would send the Instagram/LINE
 * preview crawler to the PDF too, and the DM would fall back to a bare link
 * with no card. Crawlers do not run scripts, so they keep the metadata while
 * real readers are handed straight to the file.
 *
 * `replace` rather than `assign` so the back button returns to Instagram
 * instead of bouncing through this page and redirecting again.
 */
export function TipsRedirect({ fileUrl }: { fileUrl: string }) {
  useEffect(() => {
    window.location.replace(fileUrl);
  }, [fileUrl]);

  return null;
}
