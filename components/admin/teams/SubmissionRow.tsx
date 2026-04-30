"use client";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { Image as ImageIcon, Paperclip } from "lucide-react";
import { format } from "date-fns";
import type { TeamSubmissionDetail, IndividualSubmissionDetail } from "@/types/admin-hackathon";

export function SubmissionRow({ sub }: { sub: TeamSubmissionDetail | IndividualSubmissionDetail }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/50">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-200">
          {sub.activity_title ?? sub.activity_id}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={sub.status} />
          {"submitted_by_name" in sub && sub.submitted_by_name && (
            <span className="text-[10px] text-slate-500">{sub.submitted_by_name}</span>
          )}
          {"participant_name" in sub && sub.participant_name && (
            <span className="text-[10px] text-slate-500">{sub.participant_name}</span>
          )}
          {sub.submitted_at && (
            <span className="text-[10px] text-slate-600 font-mono">
              {format(new Date(sub.submitted_at), "MMM d, HH:mm")}
            </span>
          )}
        </div>
      </div>

      {sub.text_answer && (
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mt-1">
          {sub.text_answer.length > 100 ? sub.text_answer.slice(0, 100) + "…" : sub.text_answer}
        </p>
      )}

      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {sub.image_url && (
          <div className="flex items-center gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sub.image_url}
              alt="submission"
              className="h-10 w-10 object-cover rounded border border-slate-700"
            />
            <ImageIcon className="h-3 w-3 text-slate-500" />
          </div>
        )}
        {sub.file_urls && sub.file_urls.length > 0 && (
          <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-400 px-2 py-0 flex items-center gap-1">
            <Paperclip className="h-2.5 w-2.5" />
            {sub.file_urls.length} {sub.file_urls.length === 1 ? "file" : "files"}
          </Badge>
        )}
      </div>
    </div>
  );
}
