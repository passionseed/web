/**
 * Milestone Editor Component
 * Handles editing a single milestone with SMART details
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Calendar } from "lucide-react";
import { SMARTMilestone } from "./types";
import { translations } from "./translations";
import type { Language } from "./types";

interface MilestoneEditorProps {
  milestone: SMARTMilestone | null;
  language: Language;
  onSave: (milestone: SMARTMilestone) => void;
  onCancel: () => void;
  showSMARTDetails: boolean;
}

export function MilestoneEditor({
  milestone,
  language,
  onSave,
  onCancel,
  showSMARTDetails,
}: MilestoneEditorProps) {
  const t = translations[language];
  const [editData, setEditData] = useState<SMARTMilestone>(
    milestone || {
      title: "",
      startDate: "",
      dueDate: "",
      measurable: "",
    }
  );

  const handleSave = () => {
    if (!editData.title.trim()) {
      return;
    }

    if (editData.startDate && editData.dueDate) {
      if (new Date(editData.dueDate) <= new Date(editData.startDate)) {
        alert(t.dateError);
        return;
      }
    }

    onSave(editData);
  };

  return (
    <div className="p-4 bg-white/80 dark:bg-black/40 rounded-lg border-2 border-blue-400 dark:border-blue-500 space-y-3">
      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="milestone-title" className="text-sm font-medium">
          {t.milestoneTitle_field}
        </Label>
        <Input
          id="milestone-title"
          value={editData.title}
          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          placeholder="E.g., Complete online course"
          className="w-full"
          autoFocus
        />
      </div>

      {/* SMART Details */}
      {showSMARTDetails && (
        <>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label
                htmlFor="start-date"
                className="text-sm font-medium flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                {t.startDate}
              </Label>
              <Input
                id="start-date"
                type="date"
                value={editData.startDate}
                onChange={(e) =>
                  setEditData({ ...editData, startDate: e.target.value })
                }
                className="w-full"
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor="due-date"
                className="text-sm font-medium flex items-center gap-1"
              >
                <Calendar className="w-3 h-3" />
                {t.dueDate}
              </Label>
              <Input
                id="due-date"
                type="date"
                value={editData.dueDate}
                onChange={(e) =>
                  setEditData({ ...editData, dueDate: e.target.value })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Measurable */}
          <div className="space-y-1">
            <Label htmlFor="measurable" className="text-sm font-medium">
              {t.measurableGoal}
            </Label>
            <Textarea
              id="measurable"
              value={editData.measurable}
              onChange={(e) =>
                setEditData({ ...editData, measurable: e.target.value })
              }
              placeholder="E.g., Complete 10 modules with 80% score"
              rows={2}
              className="resize-none"
            />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4 mr-1" />
          {t.cancelEdit}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!editData.title.trim()}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="w-4 h-4 mr-1" />
          {t.saveMilestone}
        </Button>
      </div>
    </div>
  );
}
