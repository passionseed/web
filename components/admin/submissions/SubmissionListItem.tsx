"use client";

import { format } from "date-fns";
import { Image as ImageIcon, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import type { AdminSubmission } from "@/types/admin-hackathon";

function getOwnerLabel(submission: AdminSubmission) {
  if (submission.scope === "team") {
    return submission.team?.name ?? "Unnamed team";
  }
  return submission.participant?.name ?? submission.participant?.email ?? "Unnamed participant";
}

interface SubmissionListItemProps {
  submission: AdminSubmission;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function SubmissionListItem({ submission, isSelected, onSelect }: SubmissionListItemProps) {
  return (
    <button
      key={`${submission.scope}-${submission.id}`}
      type="button"
      onClick={() => onSelect(submission.id)}
      className={`w-full rounded-md border p-3 text-left transition-colors ${
        isSelected
          ? "border-amber-400/60 bg-amber-500/10"
          : "border-slate-800 bg-slate-950/50 hover:border-slate-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">{getOwnerLabel(submission)}</div>
          <div className="mt-1 text-xs text-slate-400">{submission.activity?.title ?? "Untitled activity"}</div>
        </div>
        <StatusBadge status={submission.review_status} variant="review" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge variant="outline" className="border-slate-700 text-slate-400">
          {submission.scope}
        </Badge>
        {submission.submitted_at && (
          <span>{format(new Date(submission.submitted_at), "MMM d, HH:mm")}</span>
        )}
        {submission.file_urls.length > 0 && <Paperclip className="h-3.5 w-3.5" />}
        {submission.image_url && <ImageIcon className="h-3.5 w-3.5" />}
      </div>
    </button>
  );
}
