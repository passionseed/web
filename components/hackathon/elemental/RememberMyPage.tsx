"use client";

import { useEffect } from "react";

/**
 * This device remembers the last Elemental sign-up page it opened, so a
 * friend's team link opened later on the same phone can offer "go to my page
 * and join this team" instead of a second sign-up. Only the page token is
 * kept, the same key the page's own address already holds in the browser's
 * history; nothing the person typed.
 */
const KEY = "elemental:my-page";

export function rememberedPageToken(): string | null {
  try {
    const token = localStorage.getItem(KEY);
    return token && /^[0-9a-f]{32}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

export function RememberMyPage({ token }: { token: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, token);
    } catch {
      // Private mode or storage blocked: the team link falls back to the email.
    }
  }, [token]);
  return null;
}
