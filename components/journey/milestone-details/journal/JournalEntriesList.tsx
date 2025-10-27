/**
 * JournalEntriesList - List of journal entries with empty state
 */

"use client";

import React from "react";
import { BookOpen } from "lucide-react";
import { MilestoneJournal } from "@/types/journey";
import { JournalEntryCard } from "./JournalEntryCard";

interface JournalEntriesListProps {
  journals: MilestoneJournal[];
}

export function JournalEntriesList({ journals }: JournalEntriesListProps) {
  if (journals.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No journal entries yet</p>
        <p className="text-xs text-slate-600 mt-1">Add your first entry above</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Journal History ({journals.length})
      </h3>
      <div className="space-y-3">
        {journals.map((journal) => (
          <JournalEntryCard key={journal.id} journal={journal} />
        ))}
      </div>
    </div>
  );
}
