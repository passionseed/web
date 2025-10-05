"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { NodeAssessment, AssessmentType, QuizQuestion } from "@/types/map";
import { Trash2 } from "lucide-react";
import { createNodeAssessment, deleteNodeAssessment, createQuizQuestion, updateQuizQuestion, deleteQuizQuestion, updateAssessmentMetadata } from "@/lib/supabase/assessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAssessmentGroupSettings } from "@/lib/supabase/assessment-groups";
import { QuizEditor } from "./AssessmentEditor/QuizEditor";
import { ChecklistEditor } from "./AssessmentEditor/ChecklistEditor";
import { TextAnswerEditor } from "./AssessmentEditor/TextAnswerEditor";
import { GroupManagementModal } from "./AssessmentEditor/GroupManagementModal";
import { QuizSettings } from "./AssessmentEditor/QuizSettings";
import { ASSESSMENT_TYPE_CONFIG } from "./AssessmentEditor/constants";
import { AssessmentEditorProps, QuestionFormData } from "./AssessmentEditor/types";
import { convertFormDataToQuestion } from "./AssessmentEditor/utils";

export function AssessmentEditor({
  nodeId,
  assessment,
  onAssessmentChange,
  nodeData,
  mapId,
}: AssessmentEditorProps) {
  const { toast } = useToast();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // The useEffect causing the infinite loop has been removed.

  const handleAddAssessment = useCallback(
    async (type: AssessmentType) => {
      try {
        console.log("➕ Creating new assessment in database for node:", nodeId);
        
        const newAssessment = await createNodeAssessment({
          node_id: nodeId,
          assessment_type: type,
          points_possible: 10,
          is_graded: true,
        });

        console.log("✅ Assessment created in database:", newAssessment);
        
        onAssessmentChange(newAssessment, "add");

        toast({ title: "Assessment created ✓" });
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
        "Delete this assessment? All questions will be removed."
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
        toast({ title: "Assessment deleted ✓" });
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

  const handleGroupSettingsChange = useCallback(
    async (field: string, value: any) => {
      if (!assessment) return;

      try {
        console.log(`⚙️ Updating assessment setting ${field}:`, value);
        
        let updatedAssessment: NodeAssessment;

        // Handle metadata fields (randomization and attempt settings)
        if (field === 'randomize_questions' || field === 'questions_to_show' || field === 'allow_multiple_attempts' || field === 'max_attempts') {
          const updatedMetadata = {
            ...assessment.metadata,
            [field]: value
          };
          
          // Save metadata changes to database
          console.log("💾 Saving metadata to database:", updatedMetadata);
          const savedAssessment = await updateAssessmentMetadata(assessment.id, updatedMetadata);
          updatedAssessment = savedAssessment;
        } else {
          // Handle group assessment fields
          await updateAssessmentGroupSettings(assessment.id, {
            is_group_assessment: field === 'is_group_assessment' ? value : assessment.is_group_assessment || false,
            group_formation_method: field === 'group_formation_method' ? value : assessment.group_formation_method || 'manual',
            group_submission_mode: field === 'group_submission_mode' ? value : assessment.group_submission_mode || 'all_members',
            target_group_size: field === 'target_group_size' ? value : assessment.target_group_size || 3,
            allow_uneven_groups: field === 'allow_uneven_groups' ? value : assessment.allow_uneven_groups || true,
          });

          updatedAssessment = { ...assessment, [field]: value };
        }
        
        // Update local state
        onAssessmentChange(updatedAssessment, "update");

        toast({ title: "Settings updated ✓" });
      } catch (error) {
        console.error("❌ Failed to update settings:", error);
        toast({
          title: "Failed to update settings",
          description: (error as Error).message || "Unknown error",
          variant: "destructive"
        });
      }
    },
    [assessment, onAssessmentChange, toast]
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

        // Update local state - use the current assessment state to avoid race conditions
        const currentQuestions = assessment.quiz_questions || [];
        let newQuestions: QuizQuestion[];
        
        if (action === "add") {
          // Check if question already exists to prevent duplicates
          const existingQuestion = currentQuestions.find(q => 
            q.id === updatedQuestion.id || 
            (q.id.startsWith('temp_') && q.question_text === updatedQuestion.question_text)
          );
          
          if (existingQuestion) {
            console.log("⚠️ Question already exists, updating instead of adding");
            newQuestions = currentQuestions.map(q => 
              q.id === existingQuestion.id ? updatedQuestion : q
            );
          } else {
            newQuestions = [...currentQuestions, updatedQuestion];
          }
        } else if (action === "update") {
          newQuestions = currentQuestions.map((q) =>
            q.id === changedQuestion.id ? updatedQuestion : q
          );
        } else {
          newQuestions = currentQuestions.filter(
            (q) => q.id !== changedQuestion.id
          );
        }

        const updatedAssessment = { ...assessment, quiz_questions: newQuestions };
        console.log("📊 Updated assessment with questions:", updatedAssessment);
        
        onAssessmentChange(updatedAssessment, "update");

        if (action === "add") {
          toast({ title: "Question added ✓" });
        } else if (action === "update") {
          toast({ title: "Question updated ✓" });
        } else {
          toast({ title: "Question deleted ✓" });
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

  const handleBatchImportQuestions = useCallback(
    async (questionDataList: QuestionFormData[]) => {
      if (!assessment) return;
      console.log(`📁 Batch importing ${questionDataList.length} questions`);
      
      try {
        // Convert all QuestionFormData to QuizQuestion format
        const questionsToCreate = questionDataList.map(questionData => 
          convertFormDataToQuestion(questionData, assessment.id)
        );
        
        console.log("🔧 Converting questions for database insertion...");
        
        // Create all questions in database in parallel
        const createPromises = questionsToCreate.map(async (question) => {
          console.log("➕ Creating quiz question in database:", question.question_text?.substring(0, 50));
          return await createQuizQuestion({
            assessment_id: assessment.id,
            question_text: question.question_text,
            options: question.options,
            correct_option: question.correct_option,
          });
        });
        
        const createdQuestions = await Promise.all(createPromises);
        console.log("✅ All questions created in database:", createdQuestions.length);
        
        // Update local state with all new questions at once
        const currentQuestions = assessment.quiz_questions || [];
        const newQuestions = [...currentQuestions, ...createdQuestions];
        const updatedAssessment = { ...assessment, quiz_questions: newQuestions };
        
        console.log("📊 Updated assessment with batch questions:", updatedAssessment);
        onAssessmentChange(updatedAssessment, "update");
        
        toast({
          title: `${questionDataList.length} questions imported ✓`,
          description: "All questions have been added to your quiz",
        });
        
      } catch (error) {
        console.error("❌ Failed to batch import questions:", error);
        toast({
          title: "Failed to import questions",
          description: (error as Error).message || "Unknown error",
          variant: "destructive"
        });
      }
    },
    [assessment, onAssessmentChange, toast]
  );

  if (!assessment) {
    return (
      <div className="p-4 space-y-4 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground">
            Add an assessment to test understanding
          </p>
          <p className="text-xs text-muted-foreground">
            Choose a type to get started:
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
                {assessment.assessment_type.replace("_", " ")}
              </CardTitle>
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
          {/* Quiz Questions - Moved to top */}
          {assessment.assessment_type === "quiz" && (
            <>
              <QuizEditor
                assessment={assessment}
                onQuestionChange={handleQuestionChange}
                onBatchImportQuestions={handleBatchImportQuestions}
              />
              <QuizSettings
                assessment={assessment}
                onGradingChange={handleGradingChange}
                onGroupSettingsChange={handleGroupSettingsChange}
                onManageGroups={() => setIsGroupModalOpen(true)}
              />
            </>
          )}
          {assessment.assessment_type === "checklist" && (
            <ChecklistEditor
              assessment={assessment}
              onAssessmentChange={(updatedAssessment) =>
                onAssessmentChange(updatedAssessment, "add")
              }
            />
          )}
          {assessment.assessment_type === "text_answer" && (
            <>
              <TextAnswerEditor
                assessment={assessment}
                onAssessmentChange={onAssessmentChange}
              />
              <QuizSettings
                assessment={assessment}
                onGradingChange={handleGradingChange}
                onGroupSettingsChange={handleGroupSettingsChange}
                onManageGroups={() => setIsGroupModalOpen(true)}
              />
            </>
          )}
          {assessment.assessment_type !== "quiz" &&
           assessment.assessment_type !== "checklist" &&
           assessment.assessment_type !== "text_answer" && (
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

      {/* Group Management Modal */}
      {assessment && (
        <GroupManagementModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          assessment={assessment}
          onAssessmentChange={(updatedAssessment) => onAssessmentChange(updatedAssessment, "add")}
          onGroupsUpdated={() => {
            // Refresh assessment data or trigger parent update
            console.log("🔄 Groups updated, refreshing data...");
            // You might want to call a parent function here to refresh the assessment data
          }}
        />
      )}
    </div>
  );
}
