"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NodeAssessment, GroupSubmissionMode } from "@/types/map";
import { ChevronDown, ChevronUp, Users, Settings } from "lucide-react";

interface QuizSettingsProps {
  assessment: NodeAssessment;
  onGradingChange: (field: 'is_graded' | 'points_possible', value: boolean | number | null) => void;
  onGroupSettingsChange: (field: string, value: any) => void;
  onManageGroups: () => void;
}

export function QuizSettings({
  assessment,
  onGradingChange,
  onGroupSettingsChange,
  onManageGroups,
}: QuizSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSettingsSummary = () => {
    const parts: string[] = [];

    if (assessment.is_graded) {
      parts.push(`${assessment.points_possible || 10} points`);
    } else {
      parts.push('Ungraded');
    }

    if (assessment.is_group_assessment) {
      parts.push('Group work');
    } else {
      parts.push('Individual');
    }

    return parts.join(' · ');
  };

  return (
    <div className="border rounded-lg bg-muted/20">
      {/* Collapsed Header */}
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/40"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="font-medium text-sm">Quiz Settings</span>
          <span className="text-xs text-muted-foreground">
            {getSettingsSummary()}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Expanded Settings */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          {/* Grading Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Points & Grading</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_graded"
                  checked={assessment.is_graded || false}
                  onCheckedChange={(checked) =>
                    onGradingChange('is_graded', checked as boolean)
                  }
                />
                <Label htmlFor="is_graded" className="text-sm font-normal">
                  Grade this quiz
                </Label>
              </div>

              {assessment.is_graded && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="points_possible" className="text-sm">
                    Points
                  </Label>
                  <Input
                    id="points_possible"
                    type="number"
                    min="1"
                    step="1"
                    value={assessment.points_possible || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const points = value === "" ? null : parseInt(value, 10);
                      if (points === null || (points > 0 && Number.isInteger(points))) {
                        onGradingChange('points_possible', points);
                      }
                    }}
                    placeholder="e.g., 10"
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Max points students can earn
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Group Assessment Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Group Work
            </h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_group_assessment"
                  checked={assessment.is_group_assessment || false}
                  onCheckedChange={(checked) =>
                    onGroupSettingsChange('is_group_assessment', checked as boolean)
                  }
                />
                <Label htmlFor="is_group_assessment" className="text-sm font-normal">
                  Enable group work
                </Label>
              </div>

              {assessment.is_group_assessment && (
                <div className="ml-6 space-y-4">
                  {/* Group Submission Mode */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Who submits?</Label>
                    <RadioGroup
                      value={assessment.group_submission_mode || 'all_members'}
                      onValueChange={(value) =>
                        onGroupSettingsChange('group_submission_mode', value as GroupSubmissionMode)
                      }
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all_members" id="all_members" />
                        <Label htmlFor="all_members" className="text-sm font-normal flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Everyone submits individually
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single_submission" id="single_submission" />
                        <Label htmlFor="single_submission" className="text-sm font-normal flex items-center gap-1">
                          One person submits for the group
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Manage Groups Button */}
                  <div className="pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                      onClick={onManageGroups}
                    >
                      <Users className="h-4 w-4" />
                      Manage Groups
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create and assign students to groups
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
