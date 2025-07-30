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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { gradeSubmission } from "@/lib/supabase/grading";
import { SubmissionWithDetails } from "@/lib/supabase/grading";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grade } from "@/types/map";
import { useRouter } from "next/navigation";
import {
  FileText,
  Image as ImageIcon,
  X,
  Eye,
  Calendar,
  Star,
  MessageCircle,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ViewAndGradeDialogProps {
  submission: SubmissionWithDetails;
  userId: string;
}

export function ViewAndGradeDialog({
  submission,
  userId,
}: ViewAndGradeDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const maxRetries = 3;

  const existingGrade = submission.submission_grades[0];
  const hasGrade = !!existingGrade;

  const [grade, setGrade] = useState<Grade | undefined>(
    existingGrade?.grade as Grade | undefined
  );
  const [feedback, setFeedback] = useState(existingGrade?.comments || "");
  const [rating, setRating] = useState<number | undefined>(
    existingGrade?.rating || undefined
  );

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

  const handleSubmit = async () => {
    if (!grade) {
      toast({ title: "Please select a grade.", variant: "destructive" });
      return;
    }

    // Additional validation before submitting
    if (grade !== "pass" && grade !== "fail") {
      toast({
        title: "Invalid grade value",
        description: "Grade must be 'pass' or 'fail'",
        variant: "destructive",
      });
      return;
    }

    if (rating && (rating < 1 || rating > 5)) {
      toast({
        title: "Invalid rating",
        description: "Rating must be between 1 and 5",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Attempting to submit grade:", {
        submissionId: submission.id,
        grade,
        feedback,
        rating,
        userId,
        progressId: submission.student_node_progress.id,
        attempt: submitAttempts + 1,
      });

      // Ensure rating is properly formatted
      const formattedRating = rating ? Number(rating) : null;

      await gradeSubmission(
        submission.id,
        grade,
        feedback,
        formattedRating,
        userId,
        submission.student_node_progress.id
      );

      toast({
        title: "Grade submitted successfully!",
        description: `Submission has been graded as ${grade.toUpperCase()}`,
      });

      setIsOpen(false);
      setSubmitAttempts(0);
      router.refresh();
    } catch (error) {
      console.error("Grading error:", error);

      const attempts = submitAttempts + 1;
      setSubmitAttempts(attempts);

      let errorMessage = "Failed to submit grade.";
      let showRetry = attempts < maxRetries;

      if (error instanceof Error) {
        errorMessage = error.message;

        // Don't retry on validation errors
        if (
          error.message.includes("Invalid") ||
          error.message.includes("Missing required") ||
          error.message.includes("constraint violation")
        ) {
          showRetry = false;
        }
      }

      toast({
        title: "Grading failed",
        description: showRetry
          ? `${errorMessage} (Attempt ${attempts}/${maxRetries})`
          : errorMessage,
        variant: "destructive",
        action: showRetry ? (
          <Button variant="outline" size="sm" onClick={() => handleSubmit()}>
            Retry
          </Button>
        ) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1" />
            {hasGrade ? "Review" : "Grade"}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Submission Review
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="view" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                View Submission
              </TabsTrigger>
              <TabsTrigger value="grade" className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                {hasGrade ? "Update Grade" : "Grade"}
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="view"
              className="overflow-y-auto max-h-[70vh] space-y-6"
            >
              {/* Student Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Student Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Student:</span>
                      <span>
                        {submission.student_node_progress.profiles.username}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Node:</span>
                      <span>{submission.node_assessments.map_nodes.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Type:</span>
                      <span className="capitalize">
                        {submission.node_assessments.assessment_type.replace(
                          "_",
                          " "
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge
                        variant={
                          hasGrade
                            ? existingGrade.grade === "pass"
                              ? "default"
                              : "destructive"
                            : "outline"
                        }
                      >
                        {hasGrade
                          ? existingGrade.grade.toUpperCase()
                          : "PENDING"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Submitted:{" "}
                      {new Date(submission.submitted_at).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Submission Content */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Submission Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ...existing content sections... */}
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
                                className="text-blue-600 hover:underline"
                              >
                                File {index + 1} - View Attachment
                              </a>
                            </div>
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
                </CardContent>
              </Card>

              {/* Existing Grade */}
              {hasGrade && (
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-primary" />
                      Current Grade & Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Grade:</span>
                      <Badge
                        variant={
                          existingGrade.grade === "pass"
                            ? "default"
                            : "destructive"
                        }
                        className="font-medium"
                      >
                        {existingGrade.grade.toUpperCase()}
                      </Badge>
                    </div>
                    {existingGrade.rating && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Rating:</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{existingGrade.rating}/5</span>
                        </div>
                      </div>
                    )}
                    {existingGrade.comments && (
                      <div className="space-y-2">
                        <span className="font-medium text-sm">Comments:</span>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-blue-800">
                            {existingGrade.comments}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Graded:{" "}
                      {new Date(existingGrade.graded_at).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="grade" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="grade">Grade *</Label>
                  <Select
                    onValueChange={(value) => {
                      console.log("Grade selected:", value);
                      setGrade(value as Grade);
                    }}
                    defaultValue={grade}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pass">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Pass
                        </div>
                      </SelectItem>
                      <SelectItem value="fail">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          Fail
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide detailed feedback to help the student improve..."
                    className="min-h-[100px]"
                  />
                </div>

                <div>
                  <Label htmlFor="rating">Rating (optional)</Label>
                  <Select
                    onValueChange={(value) => {
                      const numValue = parseInt(value, 10);
                      console.log("Rating selected:", numValue);
                      setRating(numValue);
                    }}
                    defaultValue={rating?.toString()}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rating (1-5)" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {num} Star{num !== 1 ? "s" : ""}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Debug info in development */}
                {process.env.NODE_ENV === "development" && (
                  <div className="p-2 bg-gray-100 rounded text-xs">
                    <p>
                      Debug: Grade = "{grade}" (type: {typeof grade})
                    </p>
                    <p>
                      Debug: Rating = {rating} (type: {typeof rating})
                    </p>
                  </div>
                )}

                {submitAttempts > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Previous attempts failed. Please check the form and try
                      again.
                      {submitAttempts >= maxRetries &&
                        " If the problem persists, please contact support."}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={
                    isSubmitting || !grade || submitAttempts >= maxRetries
                  }
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ClipboardCheck className="h-4 w-4 mr-2" />
                  )}
                  {submitAttempts >= maxRetries
                    ? "Max attempts reached"
                    : hasGrade
                      ? "Update Grade"
                      : "Submit Grade"}
                </Button>

                {submitAttempts >= maxRetries && (
                  <Button
                    onClick={() => {
                      setSubmitAttempts(0);
                      setGrade(undefined);
                      setFeedback("");
                      setRating(undefined);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Reset Form
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
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
