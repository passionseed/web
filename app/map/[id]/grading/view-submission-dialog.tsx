"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SubmissionWithDetails } from "@/lib/supabase/maps";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  Calendar,
  Star,
  MessageCircle,
  FileText,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  X,
} from "lucide-react";

export function ViewSubmissionDialog({
  submission,
}: {
  submission: SubmissionWithDetails;
}) {
  const grade = submission.submission_grades[0];
  const hasGrade = !!grade;
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
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            View
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submission Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Student and Submission Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Student Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Student:</span>
                  <span>
                    {submission.student_node_progress.profiles.username}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Node:</span>
                  <span>{submission.node_assessments.map_nodes.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Submitted:</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">
                      {new Date(submission.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <Badge
                    variant={
                      hasGrade
                        ? grade.grade === "pass"
                          ? "default"
                          : "destructive"
                        : "outline"
                    }
                  >
                    {hasGrade ? grade.grade.toUpperCase() : "PENDING"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Submission Content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Submission Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {submission.text_answer && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Text Answer:
                    </h4>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {submission.text_answer}
                      </p>
                    </div>
                  </div>
                )}

                {submission.quiz_answers && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Quiz Answers:
                    </h4>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <pre className="text-sm font-mono">
                        {JSON.stringify(submission.quiz_answers, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {submission.file_urls && submission.file_urls.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      File Uploads ({submission.file_urls.length}):
                    </h4>
                    <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
                      {submission.file_urls.map((url, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getFileIcon(url)}
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              File {index + 1} - View Attachment
                            </a>
                          </div>

                          {/* Image thumbnail */}
                          {isImageFile(url) && (
                            <div className="ml-6">
                              <img
                                src={url}
                                alt={`File ${index + 1}`}
                                className="max-w-64 max-h-40 object-cover rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => setExpandedImage(url)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {submission.image_url && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Image Upload:
                    </h4>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <img
                        src={submission.image_url}
                        alt="Submission Image"
                        className="max-w-full h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setExpandedImage(submission.image_url!)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grade and Feedback */}
            {hasGrade && (
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      Instructor Feedback
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {grade.grade === "pass" ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <Badge
                        variant={
                          grade.grade === "pass" ? "default" : "destructive"
                        }
                        className="font-medium"
                      >
                        {grade.grade.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Graded by:</span>
                      <span className="font-medium">Instructor</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Graded at:</span>
                      <span className="font-mono text-xs">
                        {new Date(grade.graded_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {grade.rating && (
                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="font-medium text-yellow-800">
                        Rating:
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-yellow-800">
                          {grade.rating}/5
                        </span>
                      </div>
                    </div>
                  )}

                  {grade.comments && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Comments:
                      </h4>
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <p className="text-blue-800 leading-relaxed">
                          "{grade.comments}"
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!hasGrade && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-muted-foreground mb-2">
                    No Feedback Yet
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This submission is awaiting review and grading.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Expansion Modal */}
      {expandedImage && (
        <Dialog
          open={!!expandedImage}
          onOpenChange={() => setExpandedImage(null)}
        >
          <DialogContent className="max-w-5xl max-h-[90vh] p-0">
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
