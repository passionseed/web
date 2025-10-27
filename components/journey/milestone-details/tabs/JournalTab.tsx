/**
 * JournalTab - Journal entries view
 */

"use client";

import React, { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MilestoneJournal, ProjectMilestone } from "@/types/journey";
import { getMilestoneJournals } from "@/lib/supabase/journey";
import { JournalEntryForm } from "../journal/JournalEntryForm";
import { JournalEntriesList } from "../journal/JournalEntriesList";

interface JournalTabProps {
  milestone: ProjectMilestone;
}

export function JournalTab({ milestone }: JournalTabProps) {
  const [journals, setJournals] = useState<MilestoneJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadJournals = async () => {
    setIsLoading(true);
    try {
      const journalData = await getMilestoneJournals(milestone.id);
      setJournals(journalData);
    } catch (error) {
      console.error("Error loading journals:", error);
      toast.error("Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, [milestone.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <JournalEntryForm
        milestoneId={milestone.id}
        currentProgress={milestone.progress_percentage}
        onJournalAdded={loadJournals}
      />

      <Separator className="bg-slate-800" />

      <JournalEntriesList journals={journals} />
    </div>
  );
}
