"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { PathAssessment, PathAssessmentType, PathQuizQuestion } from "@/types/pathlab";
import { useToast } from "@/hooks/use-toast";

interface PathAssessmentEditorProps {
  activityId: string;
  initialAssessment?: PathAssessment | null;
}

const ASSESSMENT_TYPES: Array<{ value: PathAssessmentType; label: string }> = [
  // Inherited from nodes
  { value: "quiz", label: "Quiz" },
  { value: "text_answer", label: "Text Answer" },
  { value: "file_upload", label: "File Upload" },
  { value: "image_upload", label: "Image Upload" },
  { value: "checklist", label: "Checklist" },
  // PathLab-specific
  { value: "daily_reflection", label: "Daily Reflection" },
  { value: "interest_rating", label: "Interest Rating" },
  { value: "energy_check", label: "Energy Check" },
];

export function PathAssessmentEditor({
  activityId,
  initialAssessment,
}: PathAssessmentEditorProps) {
  const { toast } = useToast();
  const [assessment, setAssessment] = useState<PathAssessment | null>(
    initialAssessment || null
  );
  const [isCreating, setIsCreating] = useState(!initialAssessment);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [assessmentType, setAssessmentType] = useState<PathAssessmentType>(
    initialAssessment?.assessment_type || "text_answer"
  );
  const [pointsPossible, setPointsPossible] = useState(
    initialAssessment?.points_possible?.toString() || ""
  );
  const [isGraded, setIsGraded] = useState(initialAssessment?.is_graded || false);

  // Quiz questions state
  const [questions, setQuestions] = useState<PathQuizQuestion[]>(
    initialAssessment?.quiz_questions || []
  );
  const [newQuestionText, setNewQuestionText] = useState("");

  const handleCreateAssessment = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/pathlab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activityId,
          assessment_type: assessmentType,
          points_possible: pointsPossible ? parseInt(pointsPossible) : null,
          is_graded: isGraded,
          metadata: {},
        }),
      });

      if (!response.ok) throw new Error("Failed to create assessment");

      const { assessment: newAssessment } = await response.json();
      setAssessment(newAssessment);
      setIsCreating(false);

      toast({
        title: "Assessment created",
        description: "Assessment has been created successfully",
      });
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast({
        title: "Error",
        description: "Failed to create assessment",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!assessment) return;

    try {
      const response = await fetch(
        `/api/pathlab/assessments?assessmentId=${assessment.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete assessment");

      setAssessment(null);
      setIsCreating(true);

      toast({
        title: "Assessment deleted",
        description: "Assessment has been removed",
      });
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
    }
  };

  const handleAddQuestion = async () => {
    if (!assessment || !newQuestionText.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/pathlab/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: assessment.id,
          question: {
            question_text: newQuestionText,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to add question");

      const { question } = await response.json();
      setQuestions([...questions, question]);
      setNewQuestionText("");

      toast({
        title: "Question added",
        description: "Quiz question has been added",
      });
    } catch (error) {
      console.error("Error adding question:", error);
      toast({
        title: "Error",
        description: "Failed to add question",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/pathlab/assessments?questionId=${questionId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete question");

      setQuestions(questions.filter((q) => q.id !== questionId));

      toast({
        title: "Question deleted",
        description: "Quiz question has been removed",
      });
    } catch (error) {
      console.error("Error deleting question:", error);
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  if (isCreating) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Create Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="assessmentType">Assessment Type</Label>
            <Select
              value={assessmentType}
              onValueChange={(v) => setAssessmentType(v as PathAssessmentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSESSMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsPossible">Points Possible (optional)</Label>
            <Input
              id="pointsPossible"
              type="number"
              min="0"
              value={pointsPossible}
              onChange={(e) => setPointsPossible(e.target.value)}
              placeholder="e.g., 100"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isGraded"
              checked={isGraded}
              onCheckedChange={(checked) => setIsGraded(!!checked)}
            />
            <Label htmlFor="isGraded" className="cursor-pointer">
              This assessment is graded
            </Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCreateAssessment} disabled={isSaving} className="flex-1">
              {isSaving ? "Creating..." : "Create Assessment"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No assessment configured</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {ASSESSMENT_TYPES.find((t) => t.value === assessment.assessment_type)?.label}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleDeleteAssessment}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Points:</span>{" "}
              <span className="font-medium">{assessment.points_possible || "Ungraded"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Graded:</span>{" "}
              <span className="font-medium">{assessment.is_graded ? "Yes" : "No"}</span>
            </div>
          </div>

          {/* Quiz Questions */}
          {assessment.assessment_type === "quiz" && (
            <div className="space-y-2">
              <Label>Quiz Questions</Label>
              {questions.length > 0 && (
                <div className="space-y-2">
                  {questions.map((question, index) => (
                    <Card key={question.id}>
                      <CardContent className="p-3 flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="text-sm font-medium">Q{index + 1}:</span>{" "}
                          <span className="text-sm">{question.question_text}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Enter question text..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newQuestionText.trim()) {
                      handleAddQuestion();
                    }
                  }}
                />
                <Button
                  onClick={handleAddQuestion}
                  disabled={!newQuestionText.trim() || isSaving}
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
