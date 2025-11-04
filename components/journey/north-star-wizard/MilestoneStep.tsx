/**
 * Step 2: Milestone Creator with SMART details and AI generation
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Check, Plus } from "lucide-react";
import { WizardStepProps, SMARTMilestone } from "./types";
import { translations } from "./translations";
import { MilestoneEditor } from "./MilestoneEditor";
import { MilestoneItem } from "./MilestoneItem";
import { generateMilestones } from "@/lib/ai/north-star-enhancer";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";

interface MilestoneStepProps extends WizardStepProps {
  aiUsed: boolean;
  onAiUsed: () => void;
}

export function MilestoneStep({
  language,
  formData,
  onFormDataChange,
  aiUsed,
  onAiUsed,
}: MilestoneStepProps) {
  const t = translations[language];
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showSMARTDetails, setShowSMARTDetails] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleGenerateMilestones = async () => {
    if (aiUsed) {
      toast.error(t.aiLimitReached);
      return;
    }

    if (!formData.visionQuestion.trim()) {
      toast.error("Please complete your vision first");
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await generateMilestones(
        formData.visionQuestion,
        language
      );
      if (result.success && result.data) {
        const milestones = result.data as string[];
        const today = new Date();

        const smartMilestones: SMARTMilestone[] = milestones.map(
          (title, index) => ({
            title,
            startDate: format(addMonths(today, index * 6), "yyyy-MM-dd"),
            dueDate: format(addMonths(today, (index + 1) * 6), "yyyy-MM-dd"),
            measurable: "",
          })
        );

        onFormDataChange({ milestones: smartMilestones });
        onAiUsed();
        toast.success(`Generated ${milestones.length} milestones!`);
      } else {
        toast.error(result.error || t.aiError);
      }
    } catch (error) {
      toast.error(t.aiError);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveMilestone = (milestone: SMARTMilestone) => {
    if (editingIndex !== null) {
      // Update existing
      const newMilestones = [...formData.milestones];
      newMilestones[editingIndex] = milestone;
      onFormDataChange({ milestones: newMilestones });
      setEditingIndex(null);
    } else {
      // Add new
      onFormDataChange({
        milestones: [...formData.milestones, milestone],
      });
      setIsAdding(false);
    }
  };

  const handleDelete = (index: number) => {
    const newMilestones = formData.milestones.filter((_, i) => i !== index);
    onFormDataChange({ milestones: newMilestones });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newMilestones = [...formData.milestones];
    const [removed] = newMilestones.splice(draggedIndex, 1);
    newMilestones.splice(index, 0, removed);

    onFormDataChange({ milestones: newMilestones });
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Show Vision as Goal */}
      {formData.visionQuestion && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-xl p-6 border-2 border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="text-3xl mt-1">🌟</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {t.yourGoal}
              </p>
              <p className="text-base text-amber-800 dark:text-amber-200 leading-relaxed">
                {formData.visionQuestion}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-xl p-8 border-2 border-blue-200 dark:border-blue-800">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-base text-blue-800 dark:text-blue-200 italic">
            {t.milestoneIntro}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {t.milestoneTitle}
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSMARTDetails(!showSMARTDetails)}
              className="text-xs"
            >
              {showSMARTDetails ? t.simpleMode : t.smartMode}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground text-center mb-4">
            {t.milestoneSubtitle}
          </p>

          {/* AI Generate Button */}
          <div className="flex justify-center mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateMilestones}
              disabled={
                isAiLoading || aiUsed || !formData.visionQuestion.trim()
              }
              className="gap-2"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.generating}
                </>
              ) : aiUsed ? (
                <>
                  <Check className="w-4 h-4" />
                  {t.aiEnhanced}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t.aiGenerate}
                </>
              )}
            </Button>
          </div>

          {/* Milestone List */}
          <div className="space-y-3">
            {formData.milestones.length === 0 && !isAdding ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">{t.noMilestones}</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-blue-700 dark:text-blue-300 text-center italic">
                  {t.dragToReorder}
                </p>
                <div className="space-y-2">
                  {formData.milestones.map((milestone, index) =>
                    editingIndex === index ? (
                      <MilestoneEditor
                        key={index}
                        milestone={milestone}
                        language={language}
                        onSave={handleSaveMilestone}
                        onCancel={() => setEditingIndex(null)}
                        showSMARTDetails={showSMARTDetails}
                      />
                    ) : (
                      <MilestoneItem
                        key={index}
                        milestone={milestone}
                        index={index}
                        language={language}
                        isDragging={draggedIndex === index}
                        onEdit={() => setEditingIndex(index)}
                        onDelete={() => handleDelete(index)}
                        onDragStart={(e) => {
                          handleDragStart(index);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDrop(index);
                        }}
                        onDragEnd={() => setDraggedIndex(null)}
                      />
                    )
                  )}

                  {/* Add New Milestone Editor */}
                  {isAdding && (
                    <MilestoneEditor
                      milestone={null}
                      language={language}
                      onSave={handleSaveMilestone}
                      onCancel={() => setIsAdding(false)}
                      showSMARTDetails={showSMARTDetails}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* Add Milestone Button */}
          {!isAdding && (
            <div className="pt-4 border-t border-blue-200 dark:border-blue-700">
              <Button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.addMilestone}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
