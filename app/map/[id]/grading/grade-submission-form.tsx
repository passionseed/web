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
import { gradeSubmission } from "@/lib/supabase/maps";
import { SubmissionWithDetails } from "@/lib/supabase/maps";
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

export function GradeSubmissionForm({
  submission,
  userId,
}: {
  submission: SubmissionWithDetails;
  userId: string;
}) {
  const { toast } = useToast();
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

  const handleSubmit = async () => {
    if (!grade) {
      toast({ title: "Please select a grade.", variant: "destructive" });
      return;
    }

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
    } catch (error) {
      toast({ title: "Failed to grade submission.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Grade</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Submission Content</h3>
            <p>{submission.text_answer}</p>
            {submission.file_url && (
              <a
                href={submission.file_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Attachment
              </a>
            )}
            {submission.image_url && (
              <img src={submission.image_url} alt="Submission Image" />
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
            <Select
              onValueChange={(value) => setRating(parseInt(value, 10))}
              defaultValue={rating?.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rating" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(5)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit}>Submit Grade</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
