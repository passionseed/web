/**
 * InlineEditableTitle - Click to edit milestone title
 * Uses the auto-save system for consistency
 */

"use client";

import React, { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useInlineEdit } from "@/hooks/milestone-details/useInlineEdit";
import { CharacterCounter } from "../common/CharacterCounter";
import { ProjectMilestone } from "@/types/journey";
import { updateMilestone } from "@/lib/supabase/journey";
import { toast } from "sonner";

interface InlineEditableTitleProps {
  milestone: ProjectMilestone;
  onUpdate: (updatedMilestone?: ProjectMilestone) => void;
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
    console.log("🔄 InlineEditableTitle: Starting save for milestone:", milestone.id, "with title:", value.trim());
    try {
      const updatedMilestone = await updateMilestone(milestone.id, {
        title: value.trim(),
      });
      console.log("✅ InlineEditableTitle: Save successful, updated milestone:", updatedMilestone);
      toast.success("Title updated");
      onUpdate(updatedMilestone);
      return updatedMilestone;
    } catch (error) {
      console.error("❌ InlineEditableTitle: Error updating milestone title:", error);
      toast.error("Failed to update title");
      throw new Error("Failed to update title");
    }
  };

  const {
    isEditing,
    value,
    error,
    isSaving,
    startEdit,
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
