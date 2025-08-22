// app/components/NodeViewPanel/AssessmentSection.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckSquare,
  Upload,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { NodeAssessment, QuizQuestion } from "@/types/map";
import { SubmissionItem } from "./SubmissionItem"; // Assuming component is created

interface AssessmentSectionProps {
  assessment: NodeAssessment;
  canResubmit: boolean;
  showAssessmentForm: boolean;
  assessmentAnswer: string;
  setAssessmentAnswer: (value: string) => void;
  quizAnswers: Record<string, string>;
  setQuizAnswers: (value: React.SetStateAction<Record<string, string>>) => void;
  isSubmitting: boolean;
  onSubmit: (fileUrl?: string[], fileName?: string[], checklistData?: Record<string, boolean>) => void;
  submissionsWithGrades: { submission: any; grade: any }[]; // Adjust type as needed
  nodeId: string;
  progressStatus?: "not_started" | "in_progress" | "submitted" | "passed" | "failed";
}

const renderQuizQuestion = (
  question: QuizQuestion,
  index: number,
  quizAnswers: Record<string, string>,
  setQuizAnswers: (value: React.SetStateAction<Record<string, string>>) => void
) => (
  <Card key={question.id} className="bg-muted/30">
    <CardContent className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </div>
        <p className="font-medium text-foreground flex-1">
          {question.question_text}
        </p>
      </div>
      <div className="space-y-2 ml-9">
        {question.options?.map((option) => (
          <label
            key={option.option}
            className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-background cursor-pointer transition-colors"
          >
            <input
              type="radio"
              name={question.id}
              value={option.option}
              checked={quizAnswers[question.id] === option.option}
              onChange={(e) =>
                setQuizAnswers((prev) => ({
                  ...prev,
                  [question.id]: e.target.value,
                }))
              }
              className="w-4 h-4 text-primary"
            />
            <span className="text-sm">{option.text}</span>
          </label>
        ))}
      </div>
    </CardContent>
  </Card>
);

export function AssessmentSection({
  assessment,
  canResubmit,
  showAssessmentForm,
  assessmentAnswer,
  setAssessmentAnswer,
  quizAnswers,
  setQuizAnswers,
  isSubmitting,
  onSubmit,
  submissionsWithGrades,
  nodeId,
  progressStatus,
}: AssessmentSectionProps) {
  const [isFileRequired, setIsFileRequired] = useState(false);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [fileSizeError, setFileSizeError] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Initialize checklist items from assessment metadata
  useEffect(() => {
    if (assessment.assessment_type === "checklist" && assessment.metadata?.checklist_items) {
      const initialChecklist: Record<string, boolean> = {};
      assessment.metadata.checklist_items.forEach((item: any) => {
        initialChecklist[item.id] = false;
      });
      setChecklistItems(initialChecklist);
    }
  }, [assessment]);

  // Check if file is required for submission
  const validateSubmission = () => {
    if (assessment.assessment_type === "file_upload" && fileUrls.length === 0) {
      setIsFileRequired(true);
      return false;
    }
    
    // For checklist, ensure all items are checked
    if (assessment.assessment_type === "checklist") {
      const allChecked = Object.values(checklistItems).every(checked => checked);
      if (!allChecked) {
        return false;
      }
    }
    
    setIsFileRequired(false);
    return true;
  };

  const handleChecklistToggle = (itemId: string) => {
    setChecklistItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleFileUpload = (url: string, name: string) => {
    setFileUrls((prev) => [...prev, url]);
    setFileNames((prev) => [...prev, name]);
    setIsFileRequired(false);
    setFileSizeError(null); // Clear any previous file size error
  };

  const handleFileSizeError = (error: string) => {
    setFileSizeError(error);
    // Also clear the file required error since we're showing a different error
    setIsFileRequired(false);
  };

  const handleSubmit = () => {
    if (validateSubmission()) {
      if (assessment.assessment_type === "checklist") {
        onSubmit(undefined, undefined, checklistItems);
      } else {
        onSubmit(fileUrls, fileNames);
      }
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            Assessment
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline" className="capitalize">
              {assessment.assessment_type.replace(/_/g, " ")}
            </Badge>
            {assessment.assessment_type === "quiz" && (
              <Badge variant="secondary">
                {assessment.quiz_questions?.length || 0} Questions
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canResubmit && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">
                  Resubmission Required
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your previous submission needs improvement. Please review the
                  feedback and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {showAssessmentForm && (
          <div className="space-y-4">
            {assessment.assessment_type === "text_answer" && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Your Answer
                </label>
                <Textarea
                  value={assessmentAnswer}
                  onChange={(e) => setAssessmentAnswer(e.target.value)}
                  placeholder="Type your detailed answer here..."
                  className="min-h-[120px] resize-y"
                />
              </div>
            )}

            {assessment.assessment_type === "quiz" &&
              assessment.quiz_questions && assessment.quiz_questions.length > 0 && (
                <div className="space-y-6">
                  {assessment.quiz_questions.map((question, index) =>
                    renderQuizQuestion(
                      question,
                      index,
                      quizAnswers,
                      setQuizAnswers
                    )
                  )}
                </div>
              )}

            {assessment.assessment_type === "checklist" && assessment.metadata?.checklist_items && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Checklist Items
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Check off each item as you complete it. All items must be checked to submit.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {assessment.metadata.checklist_items.map((item: any, index: number) => (
                    <Card key={item.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`checklist-${item.id}`}
                            checked={checklistItems[item.id] || false}
                            onCheckedChange={() => handleChecklistToggle(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`checklist-${item.id}`}
                              className="font-medium text-foreground text-sm"
                            >
                              {index + 1}. {item.title}
                            </label>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {checklistItems[item.id] && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {/* Checklist completion indicator */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {Object.values(checklistItems).filter(Boolean).length} of {Object.keys(checklistItems).length} items completed
                    </span>
                    {Object.values(checklistItems).every(checked => checked) ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        All items completed!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        Complete all items to submit
                      </span>
                    )}
                  </div>
                  <div className="mt-2 w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(Object.values(checklistItems).filter(Boolean).length / Math.max(Object.keys(checklistItems).length, 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {assessment.assessment_type === "file_upload" && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Upload Your Work{" "}
                  {isFileRequired && <span className="text-red-500">*</span>}
                </label>
                {(isFileRequired || fileSizeError) && (
                  <div className="text-sm text-red-600 mb-2">
                    {fileSizeError || "Please upload at least one file before submitting."}
                  </div>
                )}

                <FileUpload
                  nodeId={nodeId}
                  onUploadComplete={handleFileUpload}
                  onValidationError={handleFileSizeError}
                  onUploadStateChange={setIsUploading}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip"
                  maxSize={10}
                  disabled={isSubmitting}
                  allowMultiple={true}
                />

                <p className="text-xs text-muted-foreground">
                  You can upload multiple files. Each file must be under 10MB.
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                isUploading || 
                (assessment.assessment_type === "checklist" && !Object.values(checklistItems).every(checked => checked))
              }
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
              size="lg"
            >
              {isSubmitting ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : isUploading ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {isSubmitting 
                ? "Submitting..." 
                : isUploading 
                ? "Uploading Files..." 
                : "Submit Assessment"
              }
            </Button>
          </div>
        )}

        {/* Submissions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Your Submissions</h4>
            <Badge variant="outline" className="text-xs">
              {submissionsWithGrades.length} submission
              {submissionsWithGrades.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {submissionsWithGrades.length > 0 ? (
            <div className="space-y-3">
              {submissionsWithGrades.map(({ submission, grade }, index) => (
                <SubmissionItem
                  key={submission.id}
                  submission={submission}
                  grade={grade}
                  index={index}
                  totalSubmissions={submissionsWithGrades.length}
                  progressStatus={progressStatus}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No submissions yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete the assessment above to submit your work.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
