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
import { Slider } from "@/components/ui/slider";
import { Grade } from "@/types/map";
import { useRouter } from "next/navigation";
import { FileText, Image as ImageIcon, X } from "lucide-react";

export function GradeSubmissionForm({
  submission,
  userId,
}: {
  submission: SubmissionWithDetails;
  userId: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [grade, setGrade] = useState<Grade | undefined>(
    submission.submission_grades[0]?.grade as Grade | undefined
  );
  const [feedback, setFeedback] = useState(
    submission.submission_grades[0]?.comments || ""
  );
  const [rating, setRating] = useState<number | undefined>(
    submission.submission_grades[0]?.rating || undefined
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!grade) {
      toast({ title: "Please select a grade.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await gradeSubmission(
        submission.id,
        grade,
        feedback,
        rating || null,
        userId,
        submission.student_node_progress.id
      );
      toast({ title: "Submission graded successfully!" });
      setIsOpen(false);

      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      toast({ title: "Failed to grade submission.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>Grade</Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Submission Content</h3>

              {submission.text_answer && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Text Answer:
                  </h4>
                  <div className="p-3 bg-muted/50 rounded border">
                    <p className="whitespace-pre-wrap">
                      {submission.text_answer}
                    </p>
                  </div>
                </div>
              )}

              {submission.quiz_answers && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Quiz Answers:
                  </h4>
                  <div className="p-3 bg-muted/50 rounded border">
                    <pre className="text-sm font-mono">
                      {JSON.stringify(submission.quiz_answers, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {submission.file_urls && submission.file_urls.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    File Uploads ({submission.file_urls.length}):
                  </h4>
                  <div className="space-y-3">
                    {submission.file_urls.map((url, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border">
                          {getFileIcon(url)}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
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
                              className="max-w-48 max-h-32 object-cover rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
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
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Image Upload:
                  </h4>
                  <img
                    src={submission.image_url}
                    alt="Submission Image"
                    className="max-w-full h-auto rounded border"
                  />
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Select
                onValueChange={(value) => setGrade(value as Grade)}
                defaultValue={grade}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="rating">Rating (optional)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  min={0}
                  max={10}
                  step={0.1}
                  value={[rating || 0]}
                  onValueChange={([value]) => setRating(value)}
                  className="w-full"
                />
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={rating || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setRating(undefined);
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 10) {
                        // Round to one decimal place
                        const roundedValue = Math.round(numValue * 10) / 10;
                        setRating(roundedValue);
                      }
                    }
                  }}
                  className="w-20 px-2 py-1 border rounded text-sm"
                  placeholder="0-10"
                />
                <span className="text-sm font-medium w-8">
                  {rating !== undefined ? rating.toFixed(1) : "-"}
                </span>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Grade"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
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
