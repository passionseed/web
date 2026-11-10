"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { refreshAdminCounts } from "@/components/admin/console/live-counts";

/** Re-reads every overview section and the shell's live counts. */
export function OverviewRefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="admin-quiet-link overview-refresh"
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        refreshAdminCounts();
        startTransition(() => router.refresh());
      }}
    >
      <RefreshCw size={15} aria-hidden="true" />
      {pending ? "Refreshing" : "Refresh"}
    </button>
  );
}
