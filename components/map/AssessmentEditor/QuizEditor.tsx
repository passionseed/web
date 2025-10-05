"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Upload } from "lucide-react";
import { QuizQuestion } from "@/types/map";
import { QuizEditorProps, QuestionFormData } from "./types";
import { QuestionForm } from "./QuestionForm";
import { QuestionCard } from "./QuestionCard";
import { QuestionImportModal } from "./QuestionImportModal";
import { convertFormDataToQuestion } from "./utils";

export function QuizEditor({ assessment, onQuestionChange, onBatchImportQuestions }: QuizEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { toast } = useToast();

  const questions = assessment.quiz_questions || [];

  const handleSaveQuestion = useCallback(
    (questionData: any) => {
      const question = convertFormDataToQuestion(
        questionData,
        assessment.id
      );

      onQuestionChange(question, "add");
      setIsAdding(false);

      toast({
        title: "Question added ✓",
      });
    },
    [assessment.id, onQuestionChange, toast]
  );

  const handleUpdateQuestion = useCallback(
    (updatedQuestion: QuizQuestion) => {
      onQuestionChange(updatedQuestion, "update");
      toast({
        title: "Question updated ✓",
      });
    },
    [onQuestionChange, toast]
  );

  const handleDeleteQuestion = useCallback(
    (id: string) => {
      if (window.confirm("Delete this question?")) {
        onQuestionChange({ id } as QuizQuestion, "delete");
        toast({ title: "Question deleted ✓" });
      }
    },
    [onQuestionChange, toast]
  );

  const handleCancelForm = useCallback(() => {
    setIsAdding(false);
  }, []);

  const handleImportQuestions = useCallback(
    (importedQuestions: QuestionFormData[]) => {
      console.log(`📁 Importing ${importedQuestions.length} questions`);
      
      // Use batch import if available, otherwise fall back to individual imports
      if (onBatchImportQuestions) {
        console.log("🔧 Using batch import for better performance...");
        onBatchImportQuestions(importedQuestions);
      } else {
        console.log("⚠️ Falling back to individual imports...");
        importedQuestions.forEach((questionData) => {
          const question = convertFormDataToQuestion(
            questionData,
            assessment.id
          );
          onQuestionChange(question, "add");
        });

        toast({
          title: `${importedQuestions.length} questions imported ✓`,
          description: "Questions have been added to your quiz",
        });
      }
    },
    [assessment.id, onQuestionChange, onBatchImportQuestions, toast]
  );

  const EmptyState = useCallback(
    () => (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <div className="space-y-3">
          <p className="text-sm font-medium">Add questions to get started</p>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormKey(prev => prev + 1);
                setIsAdding(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>
      </div>
    ),
    []
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          Questions ({questions.length})
        </h4>
        {!isAdding && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFormKey(prev => prev + 1);
                setIsAdding(true);
              }}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        )}
      </div>

      {/* Add new question form */}
      {isAdding && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-1">
          <QuestionForm
            key={formKey}
            onSave={handleSaveQuestion}
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            onUpdate={handleUpdateQuestion}
            onDelete={handleDeleteQuestion}
            disabled={isAdding}
          />
        ))}
      </div>

      {/* Empty state */}
      {questions.length === 0 && !isAdding && <EmptyState />}

      {/* Help text */}
      {questions.length > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          <p>
            Students see questions in this order
          </p>
        </div>
      )}

      {/* Import Modal */}
      <QuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportQuestions}
        assessmentId={assessment.id}
      />
    </div>
  );
}
