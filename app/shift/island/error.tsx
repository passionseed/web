"use client";

import { useEffect } from "react";

import { IslandGate } from "@/components/shift/island/IslandGate";
import { IslandShell } from "@/components/shift/island/IslandShell";

/**
 * Anything the page did not turn into a gate itself: the same "closed for a
 * moment, your work is safe" card, with a retry that re-fetches the segment.
 */
export default function IslandError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // The digest only: server error messages are already hidden in production.
    const digest = error && typeof error === "object" && "digest" in error ? String(error.digest) : "none";
    console.error("[shift-island] render failed:", digest);
  }, [error]);

  return (
    <IslandShell>
      <IslandGate viewer={{ state: "unavailable", reason: "db_error" }} onRetry={retry} />
    </IslandShell>
  );
}
