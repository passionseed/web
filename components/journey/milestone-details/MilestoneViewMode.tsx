/**
 * MilestoneViewMode - View and edit existing milestone
 * Orchestrates header, tabs, and data loading
 */

"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ProjectMilestone, MilestoneWithPaths } from "@/types/journey";
import { getMilestoneById, getMilestoneJournals } from "@/lib/supabase/journey";
import { MilestoneHeader } from "./header/MilestoneHeader";
import { MilestoneTabsContainer } from "./tabs/MilestoneTabsContainer";

interface MilestoneViewModeProps {
  milestone: ProjectMilestone;
  allMilestones: ProjectMilestone[];
  onMilestoneUpdated: () => void;
}

export function MilestoneViewMode({
  milestone,
  allMilestones,
  onMilestoneUpdated,
}: MilestoneViewModeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [milestoneDetails, setMilestoneDetails] =
    useState<MilestoneWithPaths | null>(null);
  const [journalCount, setJournalCount] = useState(0);

  const loadMilestoneData = async () => {
    setIsLoading(true);
    try {
      // Load full milestone data with paths
      const milestoneData = await getMilestoneById(milestone.id);
      setMilestoneDetails(milestoneData);

      // Load journal count
      const journals = await getMilestoneJournals(milestone.id);
      setJournalCount(journals.length);
    } catch (error) {
      console.error("Error loading milestone details:", error);
      toast.error("Failed to load milestone details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMilestoneData();
  }, [milestone.id]);

  const handleUpdate = () => {
    loadMilestoneData();
    onMilestoneUpdated();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900">
      <MilestoneHeader milestone={milestone} onUpdate={handleUpdate} />

      <MilestoneTabsContainer
        milestone={milestone}
        milestoneDetails={milestoneDetails}
        allMilestones={allMilestones}
        journalCount={journalCount}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
