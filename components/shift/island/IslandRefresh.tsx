"use client";

import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { SYNC } from "./copy";
import { refreshIsland, useIslandRefresh } from "./useIslandRefresh";

/** Refresh the server payload without remounting the island or discarding drafts. */
export function IslandRefresh({ className }: { className: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);
  useIslandRefresh(refresh);
  const label = pending ? SYNC.refreshing : SYNC.refresh;
  return (
    <button type="button" className={className} aria-label={label} title={label} aria-busy={pending} disabled={pending} onClick={refreshIsland}>
      <RefreshCw size={20} aria-hidden="true" />
    </button>
  );
}
