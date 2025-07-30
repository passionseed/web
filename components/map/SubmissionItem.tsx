// app/components/NodeViewPanel/SubmissionItem.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Clock, Star } from "lucide-react";
import { AssessmentSubmission, SubmissionGrade } from "@/types/map";

interface SubmissionItemProps {
  submission: AssessmentSubmission;
  grade: SubmissionGrade | null;
  index: number; // Index in the submissions list
  totalSubmissions: number; // Total number of submissions
}

export function SubmissionItem({
  submission,
  grade,
  index,
  totalSubmissions,
}: SubmissionItemProps) {
  const isLatest = index === 0;
  const submissionNumber = totalSubmissions - index;

  return (
    <Card
      key={submission.id}
      className={`${isLatest ? "ring-2 ring-primary/20" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-sm font-medium">
              Submission #{submissionNumber}
            </span>
            {isLatest && (
              <Badge variant="secondary" className="text-xs">
                Latest
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {new Date(submission.submitted_at).toLocaleString()}
          </span>
        </div>

        {submission.text_answer && (
          <div className="mb-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Your Answer:
            </p>
            <p className="text-sm">{submission.text_answer}</p>
          </div>
        )}

        {grade ? (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  Instructor Feedback
                </span>
              </div>
              <Badge
                variant={grade.grade === "pass" ? "default" : "destructive"}
                className="font-medium"
              >
                {grade.grade === "pass" ? "PASSED" : "NEEDS IMPROVEMENT"}
              </Badge>
            </div>
            {grade.comments && (
              <div className="mb-3">
                <p className="text-sm text-blue-800 leading-relaxed">
                  "{grade.comments}"
                </p>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-blue-700">
              <span>Graded: {new Date(grade.graded_at).toLocaleString()}</span>
              {grade.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{grade.rating}/5</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Awaiting Review
              </span>
            </div>
            <p className="text-xs text-yellow-700 mt-1">
              Your submission is being reviewed by the instructor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
