/**
 * InlineEditableDescription - Click to edit milestone description
 * Multi-line textarea with character limit and checklist support
 */

"use client";

import React, { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInlineEdit } from "@/hooks/milestone-details/useInlineEdit";
import { CharacterCounter } from "../common/CharacterCounter";
import { updateMilestone } from "@/lib/supabase/journey";
import { ProjectMilestone } from "@/types/journey";
import { toast } from "sonner";
import { Loader2, ListChecks } from "lucide-react";
import { ChecklistRenderer } from "./ChecklistRenderer";
import { useChecklistParser } from "@/hooks/milestone-details/useChecklistParser";
import { insertChecklistItem } from "@/components/journey/utils/checklistMarkdown";

interface InlineEditableDescriptionProps {
  milestone: ProjectMilestone;
  onUpdate: () => void;
}

const MAX_LENGTH = 1000;

export function InlineEditableDescription({
  milestone,
  onUpdate,
}: InlineEditableDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const validate = (value: string): string | null => {
    if (value.length > MAX_LENGTH) {
      return `Maximum ${MAX_LENGTH} characters allowed`;
    }
    return null;
  };

  const handleSave = async (value: string) => {
    try {
      await updateMilestone(milestone.id, {
        description: value.trim() || null,
      });
      toast.success("Description updated");
      onUpdate();
    } catch (error) {
      console.error("Error updating description:", error);
      throw new Error("Failed to update description");
    }
  };

  const {
    isEditing,
    value,
    error,
    isSaving,
    startEdit,
    cancelEdit,
    setValue,
    saveEdit,
    handleKeyDown,
  } = useInlineEdit({
    initialValue: milestone.description || "",
    onSave: handleSave,
    validate,
    maxLength: MAX_LENGTH,
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (isEditing && !isSaving) {
      saveEdit();
    }
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    handleKeyDown(e);
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleTextareaKeyDown}
            maxLength={MAX_LENGTH}
            disabled={isSaving}
            placeholder="Add a brief description..."
            className={cn(
              "min-h-[100px] bg-slate-800 border-slate-700 focus-visible:border-blue-500",
              error && "border-red-500 focus-visible:border-red-500"
            )}
          />
          {isSaving && (
            <div className="absolute right-3 top-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-xs text-red-500">{error}</span>
          ) : (
            <span className="text-xs text-slate-500">
              Escape to cancel, click outside to save
            </span>
          )}
          <CharacterCounter
            current={value.length}
            max={MAX_LENGTH}
            show={isEditing}
          />
        </div>
      </div>
    );
  }

  const displayValue = milestone.description?.trim();

  return (
    <div
      onClick={startEdit}
      className={cn(
        "cursor-pointer rounded px-3 py-2 transition-colors min-h-[60px]",
        "hover:bg-slate-800/50 hover:border hover:border-slate-700",
        !displayValue && "text-slate-500 italic"
      )}
      title="Click to edit description"
    >
      {displayValue ? (
        <p className="text-sm text-slate-300 whitespace-pre-wrap">
          {displayValue}
        </p>
      ) : (
        <p className="text-sm">Click to add description...</p>
      )}
    </div>
  );
}
