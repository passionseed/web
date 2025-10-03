"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, Trash2, Check, X } from "lucide-react";
import { QuizQuestion } from "@/types/map";

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  onUpdate: (question: QuizQuestion) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

export function QuestionCard({
  question,
  index,
  onUpdate,
  onDelete,
  disabled = false,
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(question.question_text || "");
  const [editedOptions, setEditedOptions] = useState<Array<{ option: string; text: string }>>(
    (question.options as Array<{ option: string; text: string }>) || []
  );
  const [editedCorrect, setEditedCorrect] = useState(question.correct_option || "");

  const handleSave = () => {
    onUpdate({
      ...question,
      question_text: editedText,
      options: editedOptions,
      correct_option: editedCorrect,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(question.question_text || "");
    setEditedOptions((question.options as Array<{ option: string; text: string }>) || []);
    setEditedCorrect(question.correct_option || "");
    setIsEditing(false);
  };

  const handleOptionChange = (optionIndex: number, newText: string) => {
    const newOptions = [...editedOptions];
    newOptions[optionIndex].text = newText;
    setEditedOptions(newOptions);
  };

  const getQuestionType = () => {
    if (!question.options || (question.options as any[]).length === 0) {
      return "Short Answer";
    }
    if ((question.options as any[]).length === 2) {
      return "True/False";
    }
    return "Multiple Choice";
  };

  if (isEditing) {
    return (
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <Badge variant="outline" className="text-xs">
              Editing Q{index + 1}
            </Badge>
          </div>

          {/* Question Text */}
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            placeholder="Type your question..."
            className="min-h-[50px] resize-none"
          />

          {/* Options (if multiple choice) */}
          {editedOptions.length > 0 && (
            <div className="space-y-2">
              {editedOptions.map((option, idx) => (
                <div key={option.option} className="space-y-1.5 p-2 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Choice {option.option.toUpperCase()}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        value={option.option}
                        checked={editedCorrect === option.option}
                        onChange={(e) => setEditedCorrect(e.target.value)}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="text-xs text-muted-foreground">Right answer</span>
                    </div>
                  </div>
                  <Textarea
                    value={option.text}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Enter text for choice ${option.option.toUpperCase()}...`}
                    className="min-h-[50px] resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
            >
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Collapsed view
  return (
    <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
      <CardContent className="p-2.5">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Badge variant="outline" className="text-xs">
                Q{index + 1}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {getQuestionType()}
              </Badge>
              <Badge variant="outline" className="text-xs text-green-600">
                ✓ {question.correct_option}
              </Badge>
            </div>
            <p className="text-sm font-medium mb-0.5 line-clamp-2">
              {question.question_text}
            </p>
            {question.options && (question.options as any[]).length > 0 && (
              <div className="text-xs text-muted-foreground">
                {(question.options as any[]).length} choices
              </div>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
              disabled={disabled}
            >
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(question.id)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
              disabled={disabled}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
