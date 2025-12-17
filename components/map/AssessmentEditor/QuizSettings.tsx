"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NodeAssessment, GroupSubmissionMode } from "@/types/map";
import { ChevronDown, ChevronUp, Users, Settings, Trophy } from "lucide-react";

type SeedAssessmentType = 'competition' | 'teamwork';

interface QuizSettingsProps {
  assessment: NodeAssessment;
  onGradingChange: (field: 'is_graded' | 'points_possible', value: boolean | number | null) => void;
  onGroupSettingsChange: (field: string, value: any) => void;
  onManageGroups: () => void;
  isSeedMap?: boolean; // New prop to identify seed maps
}

export function QuizSettings({
  assessment,
  onGradingChange,
  onGroupSettingsChange,
  onManageGroups,
  isSeedMap = false,
}: QuizSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [questionsInputValue, setQuestionsInputValue] = useState<string>("");

  // Sync local input state with assessment data
  useEffect(() => {
    const currentValue = assessment.metadata?.questions_to_show || assessment.quiz_questions?.length || 1;
    setQuestionsInputValue(currentValue.toString());
  }, [assessment.id, assessment.metadata?.questions_to_show, assessment.quiz_questions?.length]);

  const getSettingsSummary = () => {
    const parts: string[] = [];

    if (assessment.is_graded) {
      parts.push(`${assessment.points_possible || 10} points`);
    } else {
      parts.push('Ungraded');
    }

    if (assessment.metadata?.randomize_questions) {
      const questionsToShow = assessment.metadata?.questions_to_show || assessment.quiz_questions?.length || 0;
      const totalQuestions = assessment.quiz_questions?.length || 0;
      parts.push(`${questionsToShow}/${totalQuestions} randomized`);
    }

    if (!(assessment.metadata?.allow_multiple_attempts ?? true)) {
      parts.push('Single attempt');
    } else {
      const maxAttempts = assessment.metadata?.max_attempts || 3;
      parts.push(`${maxAttempts} attempts`);
    }

    if (isSeedMap) {
      const seedType = (assessment.metadata?.seed_assessment_type as SeedAssessmentType) || 'competition';
      if (seedType === 'competition') {
        parts.push('Competition');
      } else {
        parts.push('Team work');
      }
    } else {
      if (assessment.is_group_assessment) {
        parts.push('Group work');
      } else {
        parts.push('Individual');
      }
    }

    return parts.join(' · ');
  };

  return (
    <div className="border rounded bg-muted/20">
      {/* Collapsed Header */}
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-2.5 h-auto hover:bg-muted/40"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          <span className="font-medium text-xs">Settings</span>
          <span className="text-xs text-muted-foreground">
            {getSettingsSummary()}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Expanded Settings */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Grading Configuration - More compact layout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_graded"
                  checked={assessment.is_graded || false}
                  onCheckedChange={(checked) =>
                    onGradingChange('is_graded', checked as boolean)
                  }
                />
                <Label htmlFor="is_graded" className="text-xs font-normal">
                  Grade this quiz
                </Label>
              </div>
              
              {assessment.is_graded && (
                <div className="flex items-center gap-1">
                  <Label htmlFor="points_possible" className="text-xs text-muted-foreground">
                    Points:
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
                    placeholder="10"
                    className="w-16 h-7 text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Question Randomization Configuration */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="randomize_questions"
                checked={assessment.metadata?.randomize_questions || false}
                onCheckedChange={(checked) => {
                  // When enabling randomization, also set a sensible default for questions_to_show
                  if (checked) {
                    const totalQuestions = assessment.quiz_questions?.length || 1;
                    const defaultQuestionsToShow = Math.min(3, totalQuestions);

                    // Update both randomize_questions and questions_to_show
                    const updatedMetadata = {
                      ...assessment.metadata,
                      randomize_questions: true,
                      questions_to_show: assessment.metadata?.questions_to_show || defaultQuestionsToShow
                    };

                    // Save the complete metadata object
                    Object.keys(updatedMetadata).forEach(key => {
                      if (key !== 'randomize_questions') {
                        // Only need to set randomize_questions once, other fields are already set
                        return;
                      }
                    });

                    onGroupSettingsChange('randomize_questions', checked as boolean);

                    // If questions_to_show wasn't set before, set it now
                    if (!assessment.metadata?.questions_to_show) {
                      setTimeout(() => {
                        onGroupSettingsChange('questions_to_show', defaultQuestionsToShow);
                      }, 100);
                    }
                  } else {
                    onGroupSettingsChange('randomize_questions', checked as boolean);
                  }
                }}
              />
              <Label htmlFor="randomize_questions" className="text-xs font-normal flex items-center gap-1">
                🎲 Randomize questions
              </Label>
            </div>

            {assessment.metadata?.randomize_questions && (
              <div className="ml-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Show:
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max={assessment.quiz_questions?.length || 1}
                    value={questionsInputValue}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      
                      // Update local state immediately for responsive typing
                      setQuestionsInputValue(inputValue);
                      
                      // Allow empty input for editing
                      if (inputValue === '') {
                        return; // Don't save empty value, let user continue typing
                      }
                      
                      const numValue = parseInt(inputValue, 10);
                      const maxQuestions = assessment.quiz_questions?.length || 1;
                      
                      // Only save if the value is a valid number within range
                      if (!isNaN(numValue) && numValue > 0 && numValue <= maxQuestions) {
                        onGroupSettingsChange('questions_to_show', numValue);
                      }
                    }}
                    onBlur={(e) => {
                      // Handle the case when user leaves field empty or invalid
                      const inputValue = e.target.value;
                      const numValue = parseInt(inputValue, 10);
                      const maxQuestions = assessment.quiz_questions?.length || 1;
                      
                      if (inputValue === '' || isNaN(numValue) || numValue < 1 || numValue > maxQuestions) {
                        // Set to default value and update both local and global state
                        const defaultValue = Math.min(3, maxQuestions);
                        setQuestionsInputValue(defaultValue.toString());
                        onGroupSettingsChange('questions_to_show', defaultValue);
                      }
                    }}
                    className="w-16 h-6 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">
                    of {assessment.quiz_questions?.length || 0} questions
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Students will receive a random subset of questions
                </p>
              </div>
            )}
          </div>

          {/* Submission Attempts Configuration */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allow_multiple_attempts"
                checked={assessment.metadata?.allow_multiple_attempts ?? true}
                onCheckedChange={(checked) =>
                  onGroupSettingsChange('allow_multiple_attempts', checked as boolean)
                }
              />
              <Label htmlFor="allow_multiple_attempts" className="text-xs font-normal flex items-center gap-1">
                🔄 Allow multiple attempts
              </Label>
            </div>

            {(assessment.metadata?.allow_multiple_attempts ?? true) && (
              <div className="ml-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">
                    Max attempts:
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={assessment.metadata?.max_attempts || 3}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (value > 0 && value <= 10) {
                        onGroupSettingsChange('max_attempts', value);
                      }
                    }}
                    className="w-16 h-6 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">
                    attempts
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Students can resubmit if they fail
                </p>
              </div>
            )}

            {!(assessment.metadata?.allow_multiple_attempts ?? true) && (
              <div className="ml-5">
                <p className="text-xs text-muted-foreground">
                  Students can only submit once
                </p>
              </div>
            )}
          </div>

          {/* Group Assessment Configuration / Seed Type - More compact */}
          <div className="space-y-2 pt-2 border-t">
            {isSeedMap ? (
              // Seed Map: Dropdown for Competition vs Team work
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Type:</Label>
                <Select
                  value={(assessment.metadata?.seed_assessment_type as SeedAssessmentType) || 'competition'}
                  onValueChange={(value: SeedAssessmentType) => {
                    onGroupSettingsChange('metadata', {
                      ...assessment.metadata,
                      seed_assessment_type: value
                    });
                    // If switching to teamwork, enable group assessment
                    if (value === 'teamwork') {
                      onGroupSettingsChange('is_group_assessment', true);
                    } else {
                      // If switching to competition, disable group assessment
                      onGroupSettingsChange('is_group_assessment', false);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competition">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-3 w-3" />
                        Competition
                      </div>
                    </SelectItem>
                    <SelectItem value="teamwork">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        Team work
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {(assessment.metadata?.seed_assessment_type as SeedAssessmentType) === 'competition'
                    ? 'Everyone submits individually with leaderboard'
                    : 'Students work in teams'}
                </p>

                {/* Team work options (only show if teamwork is selected) */}
                {(assessment.metadata?.seed_assessment_type as SeedAssessmentType) === 'teamwork' && (
                  <div className="ml-3 space-y-2 border-l-2 border-muted pl-3">
                    {/* Group Submission Mode */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Submission:</Label>
                      <RadioGroup
                        value={assessment.group_submission_mode || 'all_members'}
                        onValueChange={(value) =>
                          onGroupSettingsChange('group_submission_mode', value as GroupSubmissionMode)
                        }
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all_members" id="all_members" className="h-3 w-3" />
                          <Label htmlFor="all_members" className="text-xs font-normal">
                            Everyone submits
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="single_submission" id="single_submission" className="h-3 w-3" />
                          <Label htmlFor="single_submission" className="text-xs font-normal">
                            One per group
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Manage Groups Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 h-7 text-xs"
                      onClick={onManageGroups}
                    >
                      <Users className="h-3 w-3" />
                      Manage Groups
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Regular Map: Original Group work checkbox
              <>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_group_assessment"
                    checked={assessment.is_group_assessment || false}
                    onCheckedChange={(checked) =>
                      onGroupSettingsChange('is_group_assessment', checked as boolean)
                    }
                  />
                  <Label htmlFor="is_group_assessment" className="text-xs font-normal flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Group work
                  </Label>
                </div>

                {assessment.is_group_assessment && (
                  <div className="ml-5 space-y-2">
                    {/* Group Submission Mode - Inline */}
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-muted-foreground">Submission:</Label>
                      <RadioGroup
                        value={assessment.group_submission_mode || 'all_members'}
                        onValueChange={(value) =>
                          onGroupSettingsChange('group_submission_mode', value as GroupSubmissionMode)
                        }
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="all_members" id="all_members" className="h-3 w-3" />
                          <Label htmlFor="all_members" className="text-xs font-normal">
                            Everyone submits
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="single_submission" id="single_submission" className="h-3 w-3" />
                          <Label htmlFor="single_submission" className="text-xs font-normal">
                            One per group
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Manage Groups Button - Smaller */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 h-7 text-xs"
                      onClick={onManageGroups}
                    >
                      <Users className="h-3 w-3" />
                      Manage Groups
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
