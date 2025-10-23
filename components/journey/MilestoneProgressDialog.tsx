/**
 * MilestoneProgressDialog - Dialog for updating milestone progress
 * Includes journal entry, progress slider, and reflection prompts
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle, Calendar } from "lucide-react";
import { updateMilestoneProgress, getMilestoneJournals } from "@/lib/supabase/journey";
import { ProjectMilestone, MilestoneJournal } from "@/types/journey";
import { toast } from "sonner";
import { format } from "date-fns";

interface MilestoneProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestone: ProjectMilestone | null;
  onSuccess: () => void;
}

export function MilestoneProgressDialog({
  open,
  onOpenChange,
  milestone,
  onSuccess,
}: MilestoneProgressDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [journalContent, setJournalContent] = useState("");
  const [previousJournals, setPreviousJournals] = useState<MilestoneJournal[]>([]);
  const [showReflectionPrompt, setShowReflectionPrompt] = useState(false);

  // Load milestone data when dialog opens
  useEffect(() => {
    if (open && milestone) {
      const currentProgress =
        (milestone as any).progress_percentage || (milestone.status === "completed" ? 100 : 0);
      setProgress(currentProgress);
      setShowReflectionPrompt(currentProgress === 100);
      loadJournals();
    }
  }, [open, milestone]);

  const loadJournals = async () => {
    if (!milestone) return;

    setIsLoading(true);
    try {
      const journals = await getMilestoneJournals(milestone.id);
      setPreviousJournals(journals);
    } catch (error) {
      console.error("Error loading journals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!milestone) return;

    if (!journalContent.trim()) {
      toast.error("Please add a journal entry about your progress");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateMilestoneProgress(milestone.id, progress, journalContent.trim());

      toast.success(
        progress === 100
          ? "Milestone completed! Congratulations!"
          : "Progress updated successfully!"
      );

      // Reset form
      setJournalContent("");

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating milestone progress:", error);
      toast.error("Failed to update progress. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0];
    setProgress(newProgress);
    setShowReflectionPrompt(newProgress === 100);
  };

  if (!milestone) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {progress === 100 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Calendar className="w-5 h-5 text-blue-500" />
            )}
            Update Progress: {milestone.title}
          </DialogTitle>
          <DialogDescription>
            Track your progress and document your journey with a journal entry.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Progress slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="progress">Progress</Label>
                <Badge
                  variant={progress === 100 ? "default" : "secondary"}
                  className={progress === 100 ? "bg-green-500" : ""}
                >
                  {progress}%
                </Badge>
              </div>
              <Slider
                id="progress"
                min={0}
                max={100}
                step={5}
                value={[progress]}
                onValueChange={handleProgressChange}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Not Started</span>
                <span>In Progress</span>
                <span>Complete</span>
              </div>
            </div>

            {/* Reflection prompt for completion */}
            {showReflectionPrompt && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  Milestone Complete!
                </div>
                <p className="text-sm text-green-700">
                  Take a moment to reflect on what you learned and accomplished:
                </p>
                <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                  <li>What were your key takeaways?</li>
                  <li>What challenges did you overcome?</li>
                  <li>How will this help you move forward?</li>
                </ul>
              </div>
            )}

            {/* Journal entry */}
            <div className="space-y-2">
              <Label htmlFor="journal">
                Journal Entry *
                {showReflectionPrompt && " (Include your reflection)"}
              </Label>
              <Textarea
                id="journal"
                placeholder={
                  showReflectionPrompt
                    ? "Reflect on your journey with this milestone..."
                    : "What did you work on? What progress did you make?"
                }
                value={journalContent}
                onChange={(e) => setJournalContent(e.target.value)}
                rows={8}
                required
              />
              <p className="text-xs text-gray-500">
                Document your work, blockers, learnings, and next steps.
              </p>
            </div>

            {/* Previous journals */}
            {previousJournals.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-base">Previous Journal Entries</Label>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {previousJournals.map((journal) => (
                        <div
                          key={journal.id}
                          className="bg-gray-50 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              {format(new Date(journal.created_at), "MMM d, yyyy")}
                            </span>
                            {journal.progress_percentage !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {journal.progress_percentage}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">
                            {journal.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {progress === 100 ? "Complete Milestone" : "Save Progress"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
