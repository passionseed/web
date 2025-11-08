/**
 * useDebouncedProgress - Smooth progress updates with debounced API calls
 * Provides immediate visual feedback while batching API requests
 * Creates automatic journal entries for progress updates
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ProjectMilestone } from "@/types/journey";
import { updateMilestoneProgressWithJournal } from "@/lib/supabase/journey";
import { toast } from "sonner";

interface UseDebouncedProgressProps {
  milestone: ProjectMilestone;
  onUpdate: (updatedMilestone?: ProjectMilestone) => void;
  debounceMs?: number;
}

interface UseDebouncedProgressReturn {
  currentProgress: number;
  isSaving: boolean;
  updateProgress: (newProgress: number) => void;
}

export function useDebouncedProgress({
  milestone,
  onUpdate,
  debounceMs = 500, // 500ms debounce by default
}: UseDebouncedProgressProps): UseDebouncedProgressReturn {
  const [currentProgress, setCurrentProgress] = useState(milestone.progress_percentage);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastSavedProgress = useRef(milestone.progress_percentage);

  // Update local progress when milestone prop changes (from external updates)
  useEffect(() => {
    setCurrentProgress(milestone.progress_percentage);
    lastSavedProgress.current = milestone.progress_percentage;
  }, [milestone.progress_percentage]);

  const saveProgress = useCallback(
    async (progressValue: number) => {
      if (progressValue === lastSavedProgress.current) {
        return; // No change needed
      }

      setIsSaving(true);

      try {
        // Use the new function that creates journal entries automatically
        const { milestone: updatedMilestone, journalEntry } =
          await updateMilestoneProgressWithJournal(milestone.id, progressValue);

        lastSavedProgress.current = progressValue;
        onUpdate(updatedMilestone);

        toast.success(
          progressValue === 100
            ? "Milestone completed! Journal entry created"
            : "Progress updated with journal entry"
        );
      } catch (error) {
        console.error("Error updating progress:", error);
        toast.error("Failed to update progress");
        // Revert to last saved progress on error
        setCurrentProgress(lastSavedProgress.current);
      } finally {
        setIsSaving(false);
      }
    },
    [milestone.id, onUpdate]
  );

  const updateProgress = useCallback(
    (newProgress: number) => {
      // Immediately update visual state for smooth UX
      setCurrentProgress(newProgress);

      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Set new timer for API call
      debounceTimer.current = setTimeout(() => {
        saveProgress(newProgress);
      }, debounceMs);
    },
    [saveProgress, debounceMs]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    currentProgress,
    isSaving,
    updateProgress,
  };
}