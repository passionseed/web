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
} from "lucide-react";
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
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const isImageFile = (url: string): boolean => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const extension = url.toLowerCase().split(".").pop();
    return extension ? imageExtensions.includes(`.${extension}`) : false;
  };

  const getFileIcon = (url: string) => {
    if (isImageFile(url)) {
      return <ImageIcon className="h-4 w-4 text-blue-600" />;
    }
    return <FileText className="h-4 w-4 text-blue-600" />;
  };

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
            <div className="mb-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Your Answer:
              </p>
              <p className="text-sm">{submission.text_answer}</p>
            </div>
          )}

          {submission.file_urls && submission.file_urls.length > 0 && (
            <div className="mb-3 p-3 bg-muted/50 rounded-lg space-y-2">
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
                      className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
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
                        className="max-w-32 max-h-20 object-cover rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setExpandedImage(url)}
                      />
                    </div>
                  )}
                </div>
              ))}
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
                <span>
                  Graded: {new Date(grade.graded_at).toLocaleString()}
                </span>
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

      {/* Image Expansion Modal */}
      {expandedImage && (
        <Dialog
          open={!!expandedImage}
          onOpenChange={() => setExpandedImage(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="relative bg-black rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full"
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
