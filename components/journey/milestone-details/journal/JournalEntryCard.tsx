/**
 * JournalEntryCard - Display a single journal entry
 */

"use client";

import React from "react";
import { format } from "date-fns";
import { MilestoneJournal } from "@/types/journey";

interface JournalEntryCardProps {
  journal: MilestoneJournal;
}

export function JournalEntryCard({ journal }: JournalEntryCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-slate-500">
          {format(new Date(journal.created_at), "MMM d, yyyy 'at' h:mm a")}
        </span>
        {journal.progress_percentage !== null && (
          <span className="text-xs text-blue-400 font-medium">
            {journal.progress_percentage}% complete
          </span>
        )}
      </div>
      <p className="text-sm text-slate-300 whitespace-pre-wrap">
        {journal.content}
      </p>
    </div>
  );
}
