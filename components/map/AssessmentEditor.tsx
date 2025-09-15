"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { NodeAssessment, AssessmentType, QuizQuestion } from "@/types/map";
import { Trash2 } from "lucide-react";
import { createNodeAssessment, deleteNodeAssessment, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion } from "@/lib/supabase/assessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuizEditor } from "./AssessmentEditor/QuizEditor";
import { ChecklistEditor } from "./AssessmentEditor/ChecklistEditor";
import { ASSESSMENT_TYPE_CONFIG } from "./AssessmentEditor/constants";
import { AssessmentEditorProps } from "./AssessmentEditor/types";

export function AssessmentEditor({
  nodeId,
  assessment,
  onAssessmentChange,
  nodeData,
  mapId,
  onNodeSaved,
}: AssessmentEditorProps) {
  const { toast } = useToast();

  // The useEffect causing the infinite loop has been removed.

  const handleAddAssessment = useCallback(
    async (type: AssessmentType) => {
      try {
        console.log("➕ Creating new assessment in database for node:", nodeId);
        
        // 🚀 VALIDATION: Check if node is saved before adding assessments
        if (nodeId.startsWith("temp_")) {
          toast({ 
            title: "Save Node First", 
            description: "Please save the node before adding assessments. Click 'Save Map' to save all changes.",
            variant: "destructive",
          });
          return;
        }
        
        const newAssessment = await createNodeAssessment({
          node_id: nodeId,
          assessment_type: type,
          points_possible: null,
          is_graded: false,
        });

        console.log("✅ Assessment created in database:", newAssessment);
        
        onAssessmentChange(newAssessment, "add");

        toast({ title: "Assessment created successfully!" });
      } catch (error) {
        console.error("❌ Failed to create assessment:", error);
        toast({ 
          title: "Failed to create assessment", 
          description: (error as Error).message || "Unknown error",
          variant: "destructive" 
        });
      }
    },
    [nodeId, onAssessmentChange, toast]
  );

  const handleDeleteAssessment = useCallback(async () => {
    if (!assessment) return;

    if (
      window.confirm(
        "Are you sure you want to delete this assessment? This will also remove all questions."
      )
    ) {
      try {
        console.log("🗑️ Deleting assessment from database:", assessment.id);
        
        // Delete from database if it's a real assessment (not temp)
        if (!assessment.id.startsWith('temp_')) {
          await deleteNodeAssessment(assessment.id);
          console.log("✅ Assessment deleted from database");
        }
        
        // Update local state
        onAssessmentChange(null, "delete");
        toast({ title: "Assessment deleted successfully!" });
      } catch (error) {
        console.error("❌ Failed to delete assessment:", error);
        toast({ 
          title: "Failed to delete assessment", 
          description: (error as Error).message || "Unknown error",
          variant: "destructive" 
        });
      }
    }
  }, [assessment, onAssessmentChange, toast]);

  const handleGradingChange = useCallback(
    (field: 'is_graded' | 'points_possible', value: boolean | number | null) => {
      if (!assessment) return;

      const updatedAssessment = { ...assessment, [field]: value };
      console.log(`📊 Updating ${field}:`, value);
      onAssessmentChange(updatedAssessment, "add");
    },
    [assessment, onAssessmentChange]
  );

  const handleQuestionChange = useCallback(
    async (changedQuestion: QuizQuestion, action: "add" | "update" | "delete") => {
      if (!assessment) return;

      console.log(
        `🔧 ${action.toUpperCase()} quiz question:`,
        changedQuestion.id,
        changedQuestion.question_text?.substring(0, 50)
      );

      try {
        let updatedQuestion: QuizQuestion;
        
        if (action === "add") {
          // Create question in database
          console.log("➕ Creating quiz question in database...");
          updatedQuestion = await createQuizQuestion({
            assessment_id: assessment.id,
            question_text: changedQuestion.question_text,
            options: changedQuestion.options,
            correct_option: changedQuestion.correct_option,
          });
          console.log("✅ Quiz question created in database:", updatedQuestion);
        } else if (action === "update") {
          // Update question in database if it's not a temp ID
          if (!changedQuestion.id.startsWith('temp_')) {
            console.log("✏️ Updating quiz question in database...");
            updatedQuestion = await updateQuizQuestion(changedQuestion.id, {
              question_text: changedQuestion.question_text,
              options: changedQuestion.options,
              correct_option: changedQuestion.correct_option,
            });
            console.log("✅ Quiz question updated in database:", updatedQuestion);
          } else {
            updatedQuestion = changedQuestion;
          }
        } else {
          // Delete question from database if it's not a temp ID
          if (!changedQuestion.id.startsWith('temp_')) {
            console.log("🗑️ Deleting quiz question from database...");
            await deleteQuizQuestion(changedQuestion.id);
            console.log("✅ Quiz question deleted from database");
          }
          updatedQuestion = changedQuestion;
        }

        // Update local state
        let newQuestions: QuizQuestion[];
        if (action === "add") {
          newQuestions = [...(assessment.quiz_questions || []), updatedQuestion];
        } else if (action === "update") {
          newQuestions = (assessment.quiz_questions || []).map((q) =>
            q.id === changedQuestion.id ? updatedQuestion : q
          );
        } else {
          newQuestions = (assessment.quiz_questions || []).filter(
            (q) => q.id !== changedQuestion.id
          );
        }

        const updatedAssessment = { ...assessment, quiz_questions: newQuestions };
        console.log("📊 Updated assessment with questions:", updatedAssessment);
        
        onAssessmentChange(updatedAssessment, "add");
        
        if (action === "add") {
          toast({ title: "Quiz question created successfully!" });
        } else if (action === "update") {
          toast({ title: "Quiz question updated successfully!" });
        } else {
          toast({ title: "Quiz question deleted successfully!" });
        }
      } catch (error) {
        console.error(`❌ Failed to ${action} quiz question:`, error);
        toast({ 
          title: `Failed to ${action} quiz question`, 
          description: (error as Error).message || "Unknown error",
          variant: "destructive" 
        });
      }
    },
    [assessment, onAssessmentChange, toast]
  );

  if (!assessment) {
    const isUnsavedNode = nodeId.startsWith("temp_");
    
    return (
      <div className="p-4 space-y-4 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            No assessment configured for this node.
          </p>
          {isUnsavedNode ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
              <p className="text-sm font-medium">Save Required</p>
              <p className="text-xs">
                Please save the node first before adding assessments. Click 'Save Map' to save all changes.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Choose an assessment type to get started:
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ASSESSMENT_TYPE_CONFIG).map(([type, config]) => (
            <Button
              key={type}
              variant="outline"
              className="h-auto p-3 flex flex-col gap-1"
              onClick={() => handleAddAssessment(type as AssessmentType)}
              disabled={isUnsavedNode}
            >
              <span className="text-lg">{config.icon}</span>
              <span className="font-medium">{config.label}</span>
              <span className="text-xs text-muted-foreground">
                {config.description}
              </span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <CardTitle className="capitalize text-lg flex items-center gap-2">
                <span className="text-xl">
                  {ASSESSMENT_TYPE_CONFIG[assessment.assessment_type]?.icon ||
                    "📝"}
                </span>
                {assessment.assessment_type.replace("_", " ")} Assessment
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure your {assessment.assessment_type.replace("_", " ")}{" "}
                assessment
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAssessment}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Grading Configuration */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h4 className="font-medium text-sm">Grading Configuration</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_graded"
                  checked={assessment.is_graded || false}
                  onCheckedChange={(checked) => 
                    handleGradingChange('is_graded', checked as boolean)
                  }
                />
                <Label htmlFor="is_graded" className="text-sm">
                  Enable grading for this assessment
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                When enabled, instructors can set how many points this assessment is worth
              </p>
              
              {assessment.is_graded && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="points_possible" className="text-sm">
                    Points possible
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
                        handleGradingChange('points_possible', points);
                      }
                    }}
                    placeholder="Enter points (integer)"
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum points students can earn for this assessment
                  </p>
                </div>
              )}
            </div>
          </div>

          {assessment.assessment_type === "quiz" && (
            <QuizEditor
              assessment={assessment}
              onQuestionChange={handleQuestionChange}
            />
          )}
          {assessment.assessment_type === "checklist" && (
            <ChecklistEditor
              assessment={assessment}
              onAssessmentChange={(updatedAssessment) => 
                onAssessmentChange(updatedAssessment, "add")
              }
            />
          )}
          {assessment.assessment_type !== "quiz" && assessment.assessment_type !== "checklist" && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-4">
                {ASSESSMENT_TYPE_CONFIG[assessment.assessment_type]?.icon ||
                  "📝"}
              </div>
              <p className="text-sm font-medium mb-2">
                {assessment.assessment_type.replace("_", " ").toUpperCase()}{" "}
                Assessment
              </p>
              <p className="text-xs">
                Advanced configuration for this assessment type will be
                available in a future update.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
