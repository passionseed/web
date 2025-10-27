/**
 * JournalEntryForm - Form for adding new journal entries
 */

"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addMilestoneJournal } from "@/lib/supabase/journey";
import { CharacterCounter } from "../common/CharacterCounter";

interface JournalEntryFormProps {
  milestoneId: string;
  currentProgress: number;
  onJournalAdded: () => void;
}

const MAX_LENGTH = 5000;

export function JournalEntryForm({
  milestoneId,
  currentProgress,
  onJournalAdded,
}: JournalEntryFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await addMilestoneJournal(milestoneId, content.trim(), currentProgress);
      setContent("");
      onJournalAdded();
      toast.success("Journal entry added");
    } catch (error) {
      console.error("Error adding journal:", error);
      toast.error("Failed to add journal entry");
    } finally {
      setIsSubmitting(false);
    }
  }, [milestoneId, content, currentProgress, onJournalAdded]);

  return (
    <div className="bg-slate-800/30 rounded-lg p-3">
      <Label className="text-sm font-semibold text-slate-200 mb-2 block">
        Add Journal Entry
      </Label>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What did you work on? What challenges did you face? What did you learn?"
        className="bg-slate-900 border-slate-700 mb-2 min-h-[100px]"
        maxLength={MAX_LENGTH}
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <CharacterCounter current={content.length} max={MAX_LENGTH} />
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          size="sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 mr-2" />
              Add Entry
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
