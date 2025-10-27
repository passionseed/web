/**
 * InlineEditableDetails - Click to edit milestone details
 * Multi-line textarea with markdown preview when not editing
 */

"use client";

import React, { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useInlineEdit } from "@/hooks/milestone-details/useInlineEdit";
import { CharacterCounter } from "../common/CharacterCounter";
import { updateMilestone } from "@/lib/supabase/journey";
import { ProjectMilestone } from "@/types/journey";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";

interface InlineEditableDetailsProps {
  milestone: ProjectMilestone;
  onUpdate: () => void;
}

const MAX_LENGTH = 5000;

export function InlineEditableDetails({
  milestone,
  onUpdate,
}: InlineEditableDetailsProps) {
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
        details: value.trim() || null,
      });
      toast.success("Details updated");
      onUpdate();
    } catch (error) {
      console.error("Error updating details:", error);
      throw new Error("Failed to update details");
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
    initialValue: milestone.details || "",
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

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            placeholder="Add detailed notes, plans, or any additional information..."
            className={cn(
              "min-h-[200px] bg-slate-800 border-slate-700 focus-visible:border-blue-500 font-mono text-sm",
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
              Escape to cancel, click outside to save. Supports Markdown.
            </span>
          )}
          <CharacterCounter current={value.length} max={MAX_LENGTH} show={isEditing} />
        </div>
      </div>
    );
  }

  const displayValue = milestone.details?.trim();

  return (
    <div
      onClick={startEdit}
      className={cn(
        "cursor-pointer rounded px-3 py-2 transition-colors min-h-[100px]",
        "hover:bg-slate-800/50 hover:border hover:border-slate-700",
        !displayValue && "text-slate-500 italic"
      )}
      title="Click to edit details"
    >
      {displayValue ? (
        <div className="prose prose-sm prose-slate prose-invert max-w-none">
          <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
            {displayValue}
          </pre>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <p className="text-sm">Click to add detailed notes...</p>
        </div>
      )}
    </div>
  );
}
