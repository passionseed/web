"use client";

import Link from "next/link";

import { totalAttention } from "@/lib/admin/console";
import { useAdminLiveCounts } from "./live-counts";
import { formatBadgeCount, hasUrgentAttention } from "./nav-badges";

/** Topbar "needs you" count. Hidden until counts load, and when nothing waits. */
export function AttentionIndicator() {
  const { snapshot } = useAdminLiveCounts();
  const total = totalAttention(snapshot);
  if (!snapshot || total <= 0) return null;

  const text = formatBadgeCount(total);
  const label =
    total === 1
      ? "1 item needs you. Open the attention list."
      : `${text} items need you. Open the attention list.`;

  return (
    <Link
      href="/admin#attention"
      prefetch={false}
      className="admin-attention"
      data-urgent={hasUrgentAttention(snapshot) || undefined}
      aria-label={label}
    >
      <span className="admin-attention-dot" aria-hidden="true" />
      <span className="admin-attention-label" aria-hidden="true">
        Needs you
      </span>
      <span className="admin-attention-count" aria-hidden="true">
        {text}
      </span>
    </Link>
  );
}
