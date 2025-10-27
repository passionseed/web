/**
 * InlineEditableTitle - Click to edit milestone title
 * Single-line input with character limit and validation
 */

"use client";

import React, { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useInlineEdit } from "@/hooks/milestone-details/useInlineEdit";
import { CharacterCounter } from "../common/CharacterCounter";
import { updateMilestone } from "@/lib/supabase/journey";
import { ProjectMilestone } from "@/types/journey";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface InlineEditableTitleProps {
  milestone: ProjectMilestone;
  onUpdate: () => void;
}

const MAX_LENGTH = 200;

export function InlineEditableTitle({ milestone, onUpdate }: InlineEditableTitleProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Title is required";
    }
    if (trimmed.length > MAX_LENGTH) {
      return `Maximum ${MAX_LENGTH} characters allowed`;
    }
    return null;
  };

  const handleSave = async (value: string) => {
    try {
      await updateMilestone(milestone.id, {
        title: value.trim(),
      });
      toast.success("Title updated");
      onUpdate();
    } catch (error) {
      console.error("Error updating title:", error);
      throw new Error("Failed to update title");
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
    initialValue: milestone.title,
    onSave: handleSave,
    validate,
    maxLength: MAX_LENGTH,
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (isEditing && !isSaving) {
      saveEdit();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else {
      handleKeyDown(e);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleInputKeyDown}
            maxLength={MAX_LENGTH}
            disabled={isSaving}
            className={cn(
              "text-lg font-bold bg-slate-800 border-slate-700 focus-visible:border-blue-500",
              error && "border-red-500 focus-visible:border-red-500"
            )}
          />
          {isSaving && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          {error ? (
            <span className="text-xs text-red-500">{error}</span>
          ) : (
            <span className="text-xs text-slate-500">
              Press Enter to save, Escape to cancel
            </span>
          )}
          <CharacterCounter current={value.length} max={MAX_LENGTH} show={isEditing} />
        </div>
      </div>
    );
  }

  return (
    <h2
      onClick={startEdit}
      className={cn(
        "text-lg font-bold text-slate-100 cursor-pointer rounded px-2 py-1 -mx-2 transition-colors",
        "hover:bg-slate-800/50 hover:border hover:border-slate-700"
      )}
      title="Click to edit title"
    >
      {milestone.title}
    </h2>
  );
}
