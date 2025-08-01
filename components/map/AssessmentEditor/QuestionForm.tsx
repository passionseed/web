"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, AlertCircle, PlusCircle } from "lucide-react";
import { QuestionFormProps, QuestionType } from "./types";
import { QUESTION_TYPE_CONFIG } from "./constants";
import { validateQuestionForm, detectQuestionType } from "./utils";

export function QuestionForm({
  existingQuestion,
  onSave,
  onCancel,
}: QuestionFormProps) {
  const [questionText, setQuestionText] = useState(
    existingQuestion?.question_text || ""
  );
  const [questionType, setQuestionType] = useState<QuestionType>(
    existingQuestion ? detectQuestionType(existingQuestion) : "multiple_choice"
  );
  const [options, setOptions] = useState<
    Array<{ option: string; text: string }>
  >(
    (existingQuestion?.options as any[]) ||
      QUESTION_TYPE_CONFIG[questionType].defaultOptions
  );
  const [correctOption, setCorrectOption] = useState(
    existingQuestion?.correct_option || ""
  );
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const validationErrors = validateQuestionForm(
        questionText,
        questionType,
        options,
        correctOption
      );

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      onSave({
        question_text: questionText.trim(),
        type: questionType,
        options: questionType === "single_answer" ? [] : options,
        correct_option: correctOption,
      });
    },
    [questionText, questionType, options, correctOption, onSave]
  );

  const handleTypeChange = useCallback((newType: QuestionType) => {
    setQuestionType(newType);
    setOptions(QUESTION_TYPE_CONFIG[newType].defaultOptions);
    setCorrectOption("");
    setErrors([]);
  }, []);

  const handleOptionChange = useCallback(
    (index: number, newText: string) => {
      const newOptions = [...options];
      newOptions[index].text = newText;
      setOptions(newOptions);
      setErrors([]);
    },
    [options]
  );

  const addOption = useCallback(() => {
    if (questionType === "multiple_choice") {
      const nextLetter = String.fromCharCode(65 + options.length);
      setOptions([...options, { option: nextLetter, text: "" }]);
    }
  }, [questionType, options]);

  const removeOption = useCallback(
    (index: number) => {
      if (options.length > 2) {
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);

        if (correctOption === options[index].option) {
          setCorrectOption("");
        }
      }
    },
    [options, correctOption]
  );

  const clearErrors = useCallback(() => setErrors([]), []);

  const config = QUESTION_TYPE_CONFIG[questionType];

  return (
    <div className="max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-4 border rounded-lg bg-muted/30 relative"
      >
        {/* Form content container - scrollable area */}
        <div className="space-y-4 max-h-[calc(70vh-120px)] overflow-y-auto pr-2">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="questionText">Question Text *</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={(e) => {
                setQuestionText(e.target.value);
                clearErrors();
              }}
              placeholder="Enter your question here..."
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="questionType">Question Type *</Label>
            <Select value={questionType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select question type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-col">
                      <span className="font-medium">{config.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {config.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {questionType === "single_answer" ? (
            <div className="space-y-2">
              <Label htmlFor="correctAnswer">Correct Answer *</Label>
              <Input
                id="correctAnswer"
                value={correctOption}
                onChange={(e) => {
                  setCorrectOption(e.target.value);
                  clearErrors();
                }}
                placeholder="Enter the correct answer"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Answer Options *</Label>
                {questionType === "multiple_choice" && options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {options.map((option, index) => (
                  <div key={option.option} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="min-w-[2rem] justify-center flex-shrink-0"
                    >
                      {option.option.toUpperCase()}
                    </Badge>
                    <Input
                      value={option.text}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${option.option.toUpperCase()}`}
                      className="flex-1"
                    />
                    <div className="flex items-center flex-shrink-0">
                      <input
                        type="radio"
                        name="correctOption"
                        value={option.option}
                        checked={correctOption === option.option}
                        onChange={(e) => {
                          setCorrectOption(e.target.value);
                          clearErrors();
                        }}
                        className="w-4 h-4 text-green-600"
                      />
                      <Label className="ml-1 text-xs text-muted-foreground">
                        Correct
                      </Label>
                    </div>
                    {questionType === "multiple_choice" && options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="text-red-600 hover:text-red-800 p-1 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {correctOption && (
                <div className="text-xs text-green-600 flex items-center gap-1 mt-2">
                  <Check className="h-3 w-3" />
                  Correct answer: Option {correctOption.toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky action buttons at bottom */}
        <div className="sticky bottom-0 left-0 right-0 bg-muted/30 border-t border-border -mx-4 -mb-4 px-4 py-3 flex justify-end gap-2 z-10">
          <Button type="button" variant="ghost" onClick={onCancel} size="sm">
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button type="submit" size="sm">
            <Check className="h-4 w-4 mr-1" />
            {existingQuestion ? "Update Question" : "Add Question"}
          </Button>
        </div>
      </form>
    </div>
  );
}
