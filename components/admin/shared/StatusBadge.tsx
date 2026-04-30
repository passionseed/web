"use client";

import { Badge } from "@/components/ui/badge";
import type { ReviewStatus } from "@/types/admin-hackathon";

const REVIEW_CLASSES: Record<ReviewStatus, string> = {
  pending_review: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  passed: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  revision_required: "border-rose-400/40 bg-rose-500/15 text-rose-200",
};

const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending_review: "Pending",
  passed: "Passed",
  revision_required: "Needs revision",
};

function genericStatusColor(status: string): string {
  if (status === "submitted" || status === "passed") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "revision_required") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (status === "draft" || status === "in_progress") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  if (status === "pending_review") return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
  return "bg-slate-500/15 text-slate-400 border-slate-500/30";
}

/** Unified status badge. Pass `variant="review"` for the review-specific styling with labels. */
export function StatusBadge({
  status,
  variant = "generic",
}: {
  status: string;
  variant?: "generic" | "review";
}) {
  if (variant === "review" && status in REVIEW_CLASSES) {
    return (
      <Badge variant="outline" className={REVIEW_CLASSES[status as ReviewStatus]}>
        {REVIEW_LABELS[status as ReviewStatus]}
      </Badge>
    );
  }

  return (
    <Badge className={`text-[10px] border px-2 py-0 ${genericStatusColor(status)}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
