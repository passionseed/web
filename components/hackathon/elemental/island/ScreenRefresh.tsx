"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Screen mode: re-reads the island every `seconds` without a full reload, so a shared screen never flashes. */
export function ScreenRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
