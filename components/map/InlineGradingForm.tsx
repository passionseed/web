"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  Award,
} from "lucide-react";
import { SubmissionWithDetails } from "@/lib/supabase/grading";
import { useToast } from "@/components/ui/use-toast";

interface InlineGradingFormProps {
  submission: SubmissionWithDetails;
  userId: string;
  onGradeComplete: () => void;
  onCancel: () => void;
}

export function InlineGradingForm({
  submission,
  userId,
  onGradeComplete,
  onCancel,
}: InlineGradingFormProps) {
  const [grade, setGrade] = useState<"pass" | "fail">("pass");
  const [comments, setComments] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Import the grading function
      const { gradeSubmission } = await import("@/lib/supabase/grading");
      
      await gradeSubmission(
        submission.id,
        grade,
        comments,
        rating,
        userId,
        submission.student_node_progress.id,
        submission.node_assessments.is_graded ? pointsAwarded : null
      );

      toast({
        title: "Submission graded successfully",
        description: `Marked as ${grade.toUpperCase()} for ${submission.student_node_progress.profiles.username}`,
      });

      onGradeComplete();
    } catch (error) {
      console.error("Error grading submission:", error);
      toast({
        title: "Error grading submission",
        description: "Could not save the grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAssessmentTypeLabel = (type: string) => {
    return type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Grade Submission</h4>
        <div className="text-sm text-muted-foreground">
          {getAssessmentTypeLabel(submission.node_assessments.assessment_type)}
        </div>
      </div>

      {/* Student Info */}
      <div className="border rounded-lg p-3 bg-gray-50">
        <div className="text-sm font-medium">
          {submission.student_node_progress.profiles.username}
        </div>
        <div className="text-xs text-muted-foreground">
          {submission.node_assessments?.map_nodes?.title || "Unknown Node"}
        </div>
        <div className="text-xs text-muted-foreground">
          Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
        </div>
      </div>

      {/* Grade Selection */}
      <div className="space-y-2">
        <Label>Grade</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={grade === "pass" ? "default" : "outline"}
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => setGrade("pass")}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Pass
          </Button>
          <Button
            type="button"
            variant={grade === "fail" ? "destructive" : "outline"}
            className="flex-1"
            onClick={() => setGrade("fail")}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Fail
          </Button>
        </div>
      </div>

      {/* Rating (optional) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <Star className="h-4 w-4" />
          Rating (optional)
        </Label>
        <Select
          value={rating?.toString() || ""}
          onValueChange={(value) => setRating(value ? parseInt(value) : null)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select rating (1-5)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No rating</SelectItem>
            <SelectItem value="1">⭐ 1 Star</SelectItem>
            <SelectItem value="2">⭐⭐ 2 Stars</SelectItem>
            <SelectItem value="3">⭐⭐⭐ 3 Stars</SelectItem>
            <SelectItem value="4">⭐⭐⭐⭐ 4 Stars</SelectItem>
            <SelectItem value="5">⭐⭐⭐⭐⭐ 5 Stars</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Points (optional) */}
      <div className="space-y-2">
        {submission.node_assessments.is_graded && (
          <>
            <Label className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              Points Awarded (optional)
            </Label>
            <Input
              type="number"
              min="0"
              placeholder="Enter points"
              value={pointsAwarded ?? ""}
              onChange={(e) =>
                setPointsAwarded(e.target.value ? parseInt(e.target.value) : null)
              }
            />
          </>
        )}
      </div>

      {/* Comments */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          Comments
        </Label>
        <Textarea
          placeholder="Add feedback for the student..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Grading..." : "Submit Grade"}
        </Button>
      </div>

      {/* Quick Feedback Suggestions */}
      {grade === "pass" && !comments && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="font-medium mb-1">Quick feedback suggestions:</p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setComments("Excellent work! Very thorough and well-explained.")}
              className="text-blue-600 hover:text-blue-800 text-left"
            >
              Excellent work! Very thorough and well-explained.
            </button>
            <button
              type="button"
              onClick={() => setComments("Great job meeting all the requirements. Keep it up!")}
              className="text-blue-600 hover:text-blue-800 text-left"
            >
              Great job meeting all the requirements. Keep it up!
            </button>
            <button
              type="button"
              onClick={() => setComments("Well done! Your submission demonstrates good understanding.")}
              className="text-blue-600 hover:text-blue-800 text-left"
            >
              Well done! Your submission demonstrates good understanding.
            </button>
          </div>
        </div>
      )}

      {grade === "fail" && !comments && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="font-medium mb-1">Constructive feedback suggestions:</p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setComments("Please review the requirements and try again. Let me know if you need clarification.")}
              className="text-blue-600 hover:text-blue-800 text-left"
            >
              Please review the requirements and try again.
            </button>
            <button
              type="button"
              onClick={() => setComments("This needs more detail. Consider expanding on your explanations.")}
              className="text-blue-600 hover:text-blue-800 text-left"
            >
              This needs more detail. Consider expanding on your explanations.
            </button>
            <button
              type="button"
              onClick={() => setComments("Good attempt, but some key elements are missing. Please review and resubmit.")}
              className="text-blue-600 hover:text-blue-800 text-left"
            >
              Good attempt, but some key elements are missing.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}