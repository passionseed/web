// app/components/NodeViewPanel/AssessmentSection.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import {
  CheckSquare,
  Upload,
  AlertCircle,
  MessageCircle,
  Clock,
  Star,
  X,
  FileText,
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
  onSubmit: (fileUrl: string[], fileName: string[]) => void;
  submissionsWithGrades: { submission: any; grade: any }[]; // Adjust type as needed
  nodeId: string;
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
}: AssessmentSectionProps) {
  const [isFileRequired, setIsFileRequired] = useState(false);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);

  // Check if file is required for submission
  const validateSubmission = () => {
    if (assessment.assessment_type === "file_upload" && fileUrls.length === 0) {
      setIsFileRequired(true);
      return false;
    }
    setIsFileRequired(false);
    return true;
  };

  const handleFileUpload = (url: string, name: string) => {
    setFileUrls((prev) => [...prev, url]);
    setFileNames((prev) => [...prev, name]);
    setIsFileRequired(false);
  };

  const handleSubmit = () => {
    if (validateSubmission()) {
      onSubmit(fileUrls, fileNames);
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
              {assessment.assessment_type.replace("_", " ")}
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
              assessment.quiz_questions?.length > 0 && (
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

            {assessment.assessment_type === "file_upload" && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Upload Your Work{" "}
                  {isFileRequired && <span className="text-red-500">*</span>}
                </label>
                {isFileRequired && (
                  <div className="text-sm text-red-600 mb-2">
                    Please upload at least one file before submitting.
                  </div>
                )}

                <FileUpload
                  nodeId={nodeId}
                  onUploadComplete={handleFileUpload}
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
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
              size="lg"
            >
              {isSubmitting ? (
                <Clock className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Submit Assessment
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
