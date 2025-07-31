"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { PlusCircle, Edit3, Trash2 } from "lucide-react";
import { QuizQuestion } from "@/types/map";
import { QuizEditorProps } from "./types";
import { QuestionForm } from "./QuestionForm";
import {
  getQuestionPreview,
  getQuestionTypeLabel,
  convertFormDataToQuestion,
} from "./utils";

export function QuizEditor({ assessment, onQuestionChange }: QuizEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const questions = assessment.quiz_questions || [];
  const isFormActive = isAdding || editingId;

  const handleSaveQuestion = useCallback(
    (questionData: any) => {
      const question = convertFormDataToQuestion(
        questionData,
        assessment.id,
        editingId || undefined
      );

      const action = editingId ? "update" : "add";
      onQuestionChange(question, action);

      setIsAdding(false);
      setEditingId(null);

      toast({
        title: `Question ${action === "add" ? "added" : "updated"}! (Save map to persist)`,
      });
    },
    [assessment.id, editingId, onQuestionChange, toast]
  );

  const handleDeleteQuestion = useCallback(
    (id: string) => {
      if (window.confirm("Are you sure you want to delete this question?")) {
        onQuestionChange({ id } as QuizQuestion, "delete");
        toast({ title: "Question deleted (Save map to persist)" });
      }
    },
    [onQuestionChange, toast]
  );

  const handleEditQuestion = useCallback((id: string) => {
    setEditingId(id);
    setIsAdding(false);
  }, []);

  const handleCancelForm = useCallback(() => {
    setIsAdding(false);
    setEditingId(null);
  }, []);

  const EmptyState = useCallback(
    () => (
      <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
        <div className="space-y-2">
          <p className="text-sm font-medium">No questions added yet</p>
          <p className="text-xs">
            Add questions to create your quiz assessment
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="mt-2"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Your First Question
          </Button>
        </div>
      </div>
    ),
    []
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">
          Quiz Questions ({questions.length})
        </h4>
        {!isFormActive && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        )}
      </div>

      {/* Add new question form */}
      {isAdding && (
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-1">
          <QuestionForm
            onSave={handleSaveQuestion}
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-3">
        {questions.map((question, index) => (
          <Card key={question.id} className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              {editingId === question.id ? (
                <div className="border border-yellow-300 rounded-lg p-1 bg-yellow-50">
                  <QuestionForm
                    existingQuestion={question}
                    onSave={handleSaveQuestion}
                    onCancel={handleCancelForm}
                  />
                </div>
              ) : (
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        Q{index + 1}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getQuestionTypeLabel(question)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs text-green-600"
                      >
                        ✓ {question.correct_option}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-1">
                      {getQuestionPreview(question)}
                    </p>
                    {question.options && (
                      <div className="text-xs text-muted-foreground">
                        {
                          (
                            question.options as Array<{
                              option: string;
                              text: string;
                            }>
                          ).length
                        }{" "}
                        options
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQuestion(question.id)}
                      className="h-8 w-8 p-0"
                      disabled={!!isFormActive}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                      disabled={!!isFormActive}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {questions.length === 0 && !isAdding && <EmptyState />}

      {/* Help text */}
      {questions.length > 0 && (
        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>
            💡 Questions will be presented to students in the order shown above
          </p>
          <p>✅ Make sure to set the correct answer for each question</p>
        </div>
      )}
    </div>
  );
}
