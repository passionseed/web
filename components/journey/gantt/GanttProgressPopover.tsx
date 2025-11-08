"use client";

import { useState, useCallback, useEffect } from "react";
import { ProjectMilestone } from "@/types/journey";
import { updateMilestone, addMilestoneJournal } from "@/lib/supabase/journey";
import { toast } from "sonner";
import { Loader2, TrendingUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface GanttProgressPopoverProps {
  milestone: ProjectMilestone;
  onUpdate?: (updatedMilestone?: ProjectMilestone) => void;
  children: React.ReactNode;
}

export function GanttProgressPopover({
  milestone,
  onUpdate,
  children,
}: GanttProgressPopoverProps) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(milestone.progress_percentage);
  const [journalNote, setJournalNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when milestone changes or popover opens
  useEffect(() => {
    if (open) {
      setProgress(milestone.progress_percentage);
      setJournalNote("");
    }
  }, [open, milestone.progress_percentage]);

  const handleQuickUpdate = useCallback(
    (increment: number) => {
      const newProgress = Math.min(100, Math.max(0, progress + increment));
      setProgress(newProgress);
    },
    [progress]
  );

  const handleSave = useCallback(async () => {
    if (progress === milestone.progress_percentage && !journalNote.trim()) {
      // No changes to save
      setOpen(false);
      return;
    }

    setIsSaving(true);

    try {
      let updatedMilestone: ProjectMilestone | undefined;

      // Update progress if changed
      if (progress !== milestone.progress_percentage) {
        const newStatus =
          progress === 100
            ? "completed"
            : progress > 0
            ? "in_progress"
            : "not_started";

        const updateData: Partial<ProjectMilestone> = {
          progress_percentage: progress,
          status: newStatus,
        };

        // Handle completion logic
        if (newStatus === "completed") {
          updateData.completed_at = new Date().toISOString();
        } else if (
          milestone.status === "completed" &&
          newStatus !== "completed"
        ) {
          updateData.completed_at = null;
        }

        updatedMilestone = await updateMilestone(milestone.id, updateData);
      }

      // Add journal entry if there's a note
      if (journalNote.trim()) {
        await addMilestoneJournal(milestone.id, journalNote.trim(), progress);
      }

      // Notify parent component
      onUpdate?.(updatedMilestone);

      // Show success message
      if (progress === 100) {
        toast.success("Milestone completed! Congratulations!");
      } else if (journalNote.trim() && progress !== milestone.progress_percentage) {
        toast.success("Progress updated and journal entry added");
      } else if (journalNote.trim()) {
        toast.success("Journal entry added");
      } else {
        toast.success("Progress updated");
      }

      // Close popover
      setOpen(false);
    } catch (error) {
      console.error("Error updating progress:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [progress, journalNote, milestone, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && e.metaKey) {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [handleSave]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 bg-slate-900 border-slate-700"
        align="center"
        side="top"
        sideOffset={8}
        onKeyDown={handleKeyDown}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-slate-200">Quick Progress Update</h3>
          </div>

          {/* Progress Display */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-slate-300">
                Current Progress
              </Label>
              <span className="text-2xl font-bold text-blue-400">
                {progress}%
              </span>
            </div>

            {/* Progress Slider */}
            <Slider
              value={[progress]}
              onValueChange={(value) => setProgress(value[0])}
              max={100}
              step={5}
              className="mb-3"
            />

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickUpdate(10)}
                disabled={progress >= 100}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700"
              >
                +10%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickUpdate(25)}
                disabled={progress >= 100}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700"
              >
                +25%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickUpdate(50)}
                disabled={progress >= 100}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700"
              >
                +50%
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProgress(100)}
                disabled={progress === 100}
                className="bg-green-900/30 border-green-700 hover:bg-green-800/30 text-green-300"
              >
                Done
              </Button>
            </div>
          </div>

          {/* Optional Journal Note */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-slate-300">
              Quick Note (Optional)
            </Label>
            <Textarea
              value={journalNote}
              onChange={(e) => setJournalNote(e.target.value)}
              placeholder="What did you accomplish? Any blockers?"
              className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 min-h-[80px] resize-none"
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-slate-500">
              Press Cmd+Enter to save, Esc to cancel
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            <Button
              onClick={() => setOpen(false)}
              variant="outline"
              disabled={isSaving}
              className="bg-slate-800 border-slate-600 hover:bg-slate-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
