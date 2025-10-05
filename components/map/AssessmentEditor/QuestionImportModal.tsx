"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileText, AlertCircle, CheckCircle, X } from "lucide-react";
import { QuizQuestion } from "@/types/map";
import { QuestionFormData } from "./types";

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: QuestionFormData[]) => void;
  assessmentId: string;
}

interface ImportedQuestion {
  type: "multiple_choice" | "true_false" | "single_answer";
  question_text: string;
  options?: Array<{ option: string; text: string }>;
  correct_option?: string;
}

interface JsonImportFormat {
  questions: ImportedQuestion[];
}

export function QuestionImportModal({
  isOpen,
  onClose,
  onImport,
  assessmentId,
}: QuestionImportModalProps) {
  const [importType, setImportType] = useState<"file" | "text">("file");
  const [jsonText, setJsonText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<QuestionFormData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const exampleJson = `{
  "questions": [
    {
      "type": "multiple_choice",
      "question_text": "What is 2 + 2?",
      "options": [
        {"option": "A", "text": "3"},
        {"option": "B", "text": "4"},
        {"option": "C", "text": "5"},
        {"option": "D", "text": "6"}
      ],
      "correct_option": "B"
    },
    {
      "type": "true_false",
      "question_text": "The sky is blue.",
      "correct_option": "true"
    },
    {
      "type": "single_answer",
      "question_text": "What is the capital of France?",
      "correct_option": "Paris"
    }
  ]
}`;

  const validateQuestion = (question: ImportedQuestion, index: number): string[] => {
    const errors: string[] = [];
    
    if (!question.question_text?.trim()) {
      errors.push(`Question ${index + 1}: Missing question text`);
    }
    
    if (!["multiple_choice", "true_false", "single_answer"].includes(question.type)) {
      errors.push(`Question ${index + 1}: Invalid type "${question.type}"`);
    }
    
    if (question.type === "multiple_choice") {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        errors.push(`Question ${index + 1}: Multiple choice needs at least 2 options`);
      } else {
        const validOptions = ["A", "B", "C", "D", "E", "F"];
        question.options.forEach((opt, optIndex) => {
          if (!opt.option || !validOptions.includes(opt.option)) {
            errors.push(`Question ${index + 1}, Option ${optIndex + 1}: Invalid option letter`);
          }
          if (!opt.text?.trim()) {
            errors.push(`Question ${index + 1}, Option ${optIndex + 1}: Missing option text`);
          }
        });
        
        if (!question.correct_option || !question.options.some(opt => opt.option === question.correct_option)) {
          errors.push(`Question ${index + 1}: Invalid correct_option`);
        }
      }
    } else if (question.type === "true_false") {
      if (!question.correct_option || !["true", "false"].includes(question.correct_option)) {
        errors.push(`Question ${index + 1}: True/False must have correct_option as "true" or "false"`);
      }
    } else if (question.type === "single_answer") {
      if (!question.correct_option?.trim()) {
        errors.push(`Question ${index + 1}: Single answer needs correct_option text`);
      }
    }
    
    return errors;
  };

  const parseJsonQuestions = useCallback((jsonString: string) => {
    try {
      const data: JsonImportFormat = JSON.parse(jsonString);
      
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("JSON must have a 'questions' array");
      }
      
      const allErrors: string[] = [];
      const validQuestions: QuestionFormData[] = [];
      
      data.questions.forEach((question, index) => {
        const questionErrors = validateQuestion(question, index);
        allErrors.push(...questionErrors);
        
        if (questionErrors.length === 0) {
          // Convert to QuestionFormData format
          let options: Array<{ option: string; text: string }> = [];
          
          if (question.type === "multiple_choice") {
            options = question.options || [];
          } else if (question.type === "true_false") {
            options = [
              { option: "true", text: "True" },
              { option: "false", text: "False" }
            ];
          }
          
          validQuestions.push({
            question_text: question.question_text,
            type: question.type,
            options,
            correct_option: question.correct_option || "",
          });
        }
      });
      
      setErrors(allErrors);
      setParsedQuestions(validQuestions);
      
      return allErrors.length === 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid JSON format";
      setErrors([errorMessage]);
      setParsedQuestions([]);
      return false;
    }
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      setErrors(["Please select a valid JSON file"]);
      return;
    }
    
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonText(content);
      parseJsonQuestions(content);
      setIsProcessing(false);
    };
    
    reader.onerror = () => {
      setErrors(["Failed to read file"]);
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  }, [parseJsonQuestions]);

  const handleTextChange = useCallback((text: string) => {
    setJsonText(text);
    if (text.trim()) {
      parseJsonQuestions(text);
    } else {
      setErrors([]);
      setParsedQuestions([]);
    }
  }, [parseJsonQuestions]);

  const handleImport = useCallback(() => {
    if (parsedQuestions.length > 0) {
      onImport(parsedQuestions);
      onClose();
      // Reset state
      setJsonText("");
      setParsedQuestions([]);
      setErrors([]);
    }
  }, [parsedQuestions, onImport, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setJsonText("");
    setParsedQuestions([]);
    setErrors([]);
    setImportType("file");
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Questions from JSON
          </DialogTitle>
          <DialogDescription>
            Import multiple questions at once using JSON format
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Import Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={importType === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setImportType("file")}
            >
              <FileText className="h-4 w-4 mr-1" />
              Upload File
            </Button>
            <Button
              variant={importType === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setImportType("text")}
            >
              Paste JSON
            </Button>
          </div>

          <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4">
            {/* Input Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Input</h3>
              
              {importType === "file" ? (
                <div className="space-y-2">
                  <Label htmlFor="jsonFile">Select JSON File</Label>
                  <Input
                    id="jsonFile"
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    disabled={isProcessing}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="jsonText">JSON Content</Label>
                  <Textarea
                    id="jsonText"
                    value={jsonText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="Paste your JSON here..."
                    className="min-h-[200px] font-mono text-xs"
                  />
                </div>
              )}

              {/* Example Format */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Example Format:</Label>
                <Textarea
                  value={exampleJson}
                  readOnly
                  className="min-h-[150px] font-mono text-xs bg-muted"
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-3 overflow-hidden flex flex-col">
              <h3 className="font-medium text-sm">Preview</h3>
              
              {errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc pl-4 space-y-1">
                      {errors.map((error, index) => (
                        <li key={index} className="text-xs">{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {parsedQuestions.length > 0 && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully parsed {parsedQuestions.length} question{parsedQuestions.length !== 1 ? 's' : ''}
                  </AlertDescription>
                </Alert>
              )}

              {/* Questions Preview */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {parsedQuestions.map((question, index) => (
                  <div key={index} className="p-2 border rounded bg-muted/20">
                    <div className="font-medium text-xs mb-1">
                      Q{index + 1}: {question.type.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {question.question_text.substring(0, 100)}
                      {question.question_text.length > 100 ? '...' : ''}
                    </div>
                    {question.options.length > 0 && (
                      <div className="text-xs">
                        Options: {question.options.map(opt => opt.option).join(', ')} 
                        (Correct: {question.correct_option})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={parsedQuestions.length === 0 || errors.length > 0 || isProcessing}
          >
            Import {parsedQuestions.length} Question{parsedQuestions.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}