"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle } from "lucide-react";
import { QuizQuestion } from "@/types/map";
import { QuizEditorProps } from "./types";
import { QuestionForm } from "./QuestionForm";
import { QuestionCard } from "./QuestionCard";
import { convertFormDataToQuestion } from "./utils";

export function QuizEditor({ assessment, onQuestionChange }: QuizEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formKey, setFormKey] = useState(0);
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

  const EmptyState = useCallback(
    () => (
      <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
        <div className="space-y-2">
          <p className="text-sm font-medium">Add questions to get started</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormKey(prev => prev + 1);
              setIsAdding(true);
            }}
            className="mt-2"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Question
          </Button>
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
        )}
      </div>

      {/* Add new question form */}
      {isAdding && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-1 max-h-[75vh] overflow-hidden">
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
    </div>
  );
}
