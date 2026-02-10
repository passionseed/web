// app/components/NodeViewPanel/SubmissionItem.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  MessageCircle,
  FileText,
  Image as ImageIcon,
  X,
  User,
  Bot,
} from "lucide-react";
import { AssessmentSubmission, SubmissionGrade } from "@/types/map";

interface SubmissionItemProps {
  submission: AssessmentSubmission;
  grade: SubmissionGrade | null;
  index: number; // Index in the submissions list
  totalSubmissions: number; // Total number of submissions
  progressStatus?:
    | "not_started"
    | "in_progress"
    | "submitted"
    | "passed"
    | "failed";
  assessment?: { points_possible?: number | null; is_graded?: boolean };
}

export function SubmissionItem({
  submission,
  grade,
  index,
  totalSubmissions,
  progressStatus,
  assessment,
}: SubmissionItemProps) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const isImageFile = (url: string): boolean => {
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".heic",
      ".heif",
    ];
    const extension = url.toLowerCase().split(".").pop();
    return extension ? imageExtensions.includes(`.${extension}`) : false;
  };

  const getFileIcon = (url: string) => {
    if (isImageFile(url)) {
      return <ImageIcon className="h-4 w-4 text-blue-600" />;
    }
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

  // Determine if this was auto-graded (system) or manually graded
  const isAutoGraded = grade && grade.graded_by === null;
  const graderInfo = grade
    ? isAutoGraded
      ? {
          name: "System (Auto-graded)",
          icon: <Bot className="h-4 w-4 text-purple-600" />,
        }
      : {
          name: grade.profiles?.username || "Instructor",
          icon: <User className="h-4 w-4 text-blue-600" />,
        }
    : null;

  return (
    <>
      <Card className={`${index === 0 ? "ring-2 ring-primary/20" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-sm font-medium">
                Submission #{totalSubmissions - index}
              </span>
              {index === 0 && (
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
            <div className="mb-3 p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Your Answer:
              </p>
              <p className="text-sm text-foreground">
                {submission.text_answer}
              </p>
            </div>
          )}

          {submission.file_urls && submission.file_urls.length > 0 && (
            <div className="mb-3 p-3 bg-muted/50 rounded-lg border space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Your Files ({submission.file_urls.length}):
              </p>
              {submission.file_urls.map((url: string, fileIndex: number) => (
                <div key={fileIndex} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getFileIcon(url)}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 hover:underline text-sm transition-colors"
                    >
                      File {fileIndex + 1} - View
                    </a>
                  </div>

                  {/* Image thumbnail */}
                  {isImageFile(url) && (
                    <div className="ml-6">
                      <img
                        src={url}
                        alt={`File ${fileIndex + 1}`}
                        className="max-w-32 max-h-20 object-cover rounded border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setExpandedImage(url)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {grade ? (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                isAutoGraded
                  ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                  : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle
                    className={`h-4 w-4 ${isAutoGraded ? "text-purple-600 dark:text-purple-400" : "text-blue-600 dark:text-blue-400"}`}
                  />
                  <span
                    className={`text-sm font-semibold ${isAutoGraded ? "text-purple-900 dark:text-purple-100" : "text-blue-900 dark:text-blue-100"}`}
                  >
                    {isAutoGraded ? "System Feedback" : "Instructor Feedback"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={grade.grade === "pass" ? "default" : "destructive"}
                    className="font-medium"
                  >
                    {grade.grade === "pass" ? "PASSED" : "NEEDS IMPROVEMENT"}
                  </Badge>
                  {isAutoGraded && (
                    <Badge variant="secondary" className="text-xs">
                      🤖 Auto
                    </Badge>
                  )}
                </div>
              </div>

              {grade.comments && (
                <div className="mb-3">
                  <p
                    className={`text-sm leading-relaxed ${isAutoGraded ? "text-purple-800 dark:text-purple-200" : "text-blue-800 dark:text-blue-200"}`}
                  >
                    "{grade.comments}"
                  </p>
                </div>
              )}

              <div
                className={`flex items-center justify-between text-xs ${isAutoGraded ? "text-purple-700 dark:text-purple-300" : "text-blue-700 dark:text-blue-300"}`}
              >
                <div className="flex items-center gap-4">
                  <span>
                    Graded: {new Date(grade.graded_at).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {graderInfo?.icon}
                    <span className="font-medium">by {graderInfo?.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {(grade.points_awarded !== null &&
                    grade.points_awarded !== undefined) ||
                  assessment?.points_possible ? (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">
                        {grade.points_awarded ?? 0}
                        {assessment?.points_possible &&
                          ` / ${assessment.points_possible}`}{" "}
                        points
                      </span>
                    </div>
                  ) : null}
                  {grade.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{grade.rating}/5</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : progressStatus === "passed" ? (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Completed Successfully
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                You have successfully completed this checklist assessment.
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Awaiting Review
                </span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Your submission is being reviewed by the instructor.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Expansion Modal */}
      {expandedImage && (
        <Dialog
          open={!!expandedImage}
          onOpenChange={() => setExpandedImage(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-background border">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative bg-black dark:bg-background rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 dark:bg-background/80 text-white dark:text-foreground hover:bg-black/70 dark:hover:bg-muted rounded-full"
                onClick={() => setExpandedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={expandedImage}
                alt="Expanded view"
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
