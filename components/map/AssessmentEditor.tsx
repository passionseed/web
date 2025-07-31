"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { NodeAssessment, AssessmentType, QuizQuestion } from "@/types/map";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuizEditor } from "./AssessmentEditor/QuizEditor";
import { ASSESSMENT_TYPE_CONFIG } from "./AssessmentEditor/constants";
import { AssessmentEditorProps } from "./AssessmentEditor/types";

export function AssessmentEditor({
  nodeId,
  assessment,
  onAssessmentChange,
}: AssessmentEditorProps) {
  const { toast } = useToast();

  // The useEffect causing the infinite loop has been removed.

  const handleAddAssessment = useCallback(
    (type: AssessmentType) => {
      const newAssessment: NodeAssessment = {
        id: `temp_assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        node_id: nodeId,
        assessment_type: type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        quiz_questions: [],
      };

      console.log("➕ Creating new assessment:", newAssessment);
      // Only one state update is needed.
      onAssessmentChange(newAssessment, "add");

      toast({ title: "Assessment added (Save map to persist)" });
    },
    [nodeId, onAssessmentChange, toast]
  );

  const handleDeleteAssessment = useCallback(() => {
    if (!assessment) return;

    if (
      window.confirm(
        "Are you sure you want to delete this assessment? This will also remove all questions."
      )
    ) {
      console.log("🗑️ Deleting assessment:", assessment.id);
      onAssessmentChange(null, "delete");
      toast({ title: "Assessment removed (Save map to persist)" });
    }
  }, [assessment, onAssessmentChange, toast]);

  const handleQuestionChange = useCallback(
    (changedQuestion: QuizQuestion, action: "add" | "update" | "delete") => {
      if (!assessment) return;

      console.log(
        `🔧 ${action.toUpperCase()} quiz question:`,
        changedQuestion.id,
        changedQuestion.question_text?.substring(0, 50)
      );

      let newQuestions: QuizQuestion[];
      if (action === "add") {
        newQuestions = [...(assessment.quiz_questions || []), changedQuestion];
      } else if (action === "update") {
        newQuestions = (assessment.quiz_questions || []).map((q) =>
          q.id === changedQuestion.id ? changedQuestion : q
        );
      } else {
        newQuestions = (assessment.quiz_questions || []).filter(
          (q) => q.id !== changedQuestion.id
        );
      }

      const updatedAssessment = { ...assessment, quiz_questions: newQuestions };
      console.log("📊 Updated assessment with questions:", updatedAssessment);

      // We now only call the single handler with the complete, updated assessment object.
      onAssessmentChange(updatedAssessment, "add");
    },
    [assessment, onAssessmentChange]
  );

  if (!assessment) {
    return (
      <div className="p-4 space-y-4 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            No assessment configured for this node.
          </p>
          <p className="text-xs text-muted-foreground">
            Choose an assessment type to get started:
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ASSESSMENT_TYPE_CONFIG).map(([type, config]) => (
            <Button
              key={type}
              variant="outline"
              className="h-auto p-3 flex flex-col gap-1"
              onClick={() => handleAddAssessment(type as AssessmentType)}
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
        <CardContent>
          {assessment.assessment_type === "quiz" && (
            <QuizEditor
              assessment={assessment}
              onQuestionChange={handleQuestionChange}
            />
          )}
          {assessment.assessment_type !== "quiz" && (
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
