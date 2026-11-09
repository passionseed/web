"use client";

import { useEffect } from "react";

/**
 * Scrolls to #id when the page mounts with that hash. Next.js applies a hash
 * scroll on the navigation's first commit, which for a dynamic admin page is
 * app/admin/loading.tsx, so the target is not there yet and the scroll is lost.
 */
export function ScrollToHash({ id }: { id: string }) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);

  return null;
}
