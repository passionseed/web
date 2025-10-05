"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const errorRef = useRef<HTMLDivElement>(null);

  // Reset form state when component mounts with no existing question (new question form)
  useEffect(() => {
    if (!existingQuestion) {
      // This runs when the component is mounted fresh (due to key change)
      console.log("🔄 Resetting question form to clean state");
      setQuestionText("");
      setQuestionType("multiple_choice");
      // Create fresh copies of default options to avoid reference issues
      setOptions(JSON.parse(JSON.stringify(QUESTION_TYPE_CONFIG["multiple_choice"].defaultOptions)));
      setCorrectOption("");
      setErrors([]);
    }
  }, []); // Empty dependency array means this only runs on mount

  // Scroll to errors when they appear
  useEffect(() => {
    if (errors.length > 0 && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [errors]);

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
    <div>
      <form
        onSubmit={handleSubmit}
        className="space-y-3 p-3 border rounded-lg bg-muted/30 relative"
      >
        {/* Form content container */}
        <div className="space-y-3">
          {errors.length > 0 && (
            <Alert ref={errorRef} variant="destructive">
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

          <div className="space-y-1.5">
            <Label htmlFor="questionText">Question *</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={(e) => {
                setQuestionText(e.target.value);
                clearErrors();
              }}
              placeholder="Type your question here..."
              className="min-h-[60px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="questionType">Type *</Label>
            <Select value={questionType} onValueChange={handleTypeChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select question type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(QUESTION_TYPE_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{config.label}</span>
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
            <div className="space-y-1.5">
              <Label htmlFor="correctAnswer">Answer *</Label>
              <Input
                id="correctAnswer"
                value={correctOption}
                onChange={(e) => {
                  setCorrectOption(e.target.value);
                  clearErrors();
                }}
                placeholder="Type the correct answer"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Choices *</Label>
                {questionType === "multiple_choice" && options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="h-7 text-xs"
                  >
                    <PlusCircle className="h-3 w-3 mr-1" />
                    Add Choice
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                {options.map((option, index) => (
                  <div key={option.option} className="space-y-1 p-1.5 border rounded bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0.5"
                        >
                          {option.option.toUpperCase()}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <input
                            type="radio"
                            name="correctOption"
                            value={option.option}
                            checked={correctOption === option.option}
                            onChange={(e) => {
                              setCorrectOption(e.target.value);
                              clearErrors();
                            }}
                            className="w-3 h-3 text-green-600"
                          />
                          <Label className="text-xs text-muted-foreground">
                            Correct
                          </Label>
                        </div>
                      </div>
                      {questionType === "multiple_choice" &&
                        options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(index)}
                            className="text-red-600 hover:text-red-800 h-5 w-5 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                    </div>
                    <Textarea
                      value={option.text}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Enter text for choice ${option.option.toUpperCase()}...`}
                      className="min-h-[40px] resize-none text-sm"
                    />
                  </div>
                ))}
              </div>

              {correctOption && (
                <div className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <Check className="h-3 w-3" />
                  Answer: {correctOption.toUpperCase()}
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
            {existingQuestion ? "Update" : "Add Question"}
          </Button>
        </div>
      </form>
    </div>
  );
}
