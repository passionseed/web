"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NodeAssessment } from "@/types/map";
import { useToast } from "@/components/ui/use-toast";
import { updateAssessmentMetadata } from "@/lib/supabase/assessment";

interface TextAnswerEditorProps {
  assessment: NodeAssessment;
  onAssessmentChange: (assessment: NodeAssessment | null, action: "add" | "delete") => void;
}

export function TextAnswerEditor({ assessment, onAssessmentChange }: TextAnswerEditorProps) {
  const [question, setQuestion] = useState(assessment.metadata?.question || "");
  const { toast } = useToast();

  useEffect(() => {
    setQuestion(assessment.metadata?.question || "");
  }, [assessment.metadata?.question]);

  const handleQuestionChange = async (newQuestion: string) => {
    setQuestion(newQuestion);

    try {
      // Update the metadata with the question
      const updatedMetadata = {
        ...assessment.metadata,
        question: newQuestion,
      };

      // Update in database
      await updateAssessmentMetadata(assessment.id, updatedMetadata);

      // Update local state
      const updatedAssessment = {
        ...assessment,
        metadata: updatedMetadata,
      };

      onAssessmentChange(updatedAssessment, "add");
    } catch (error) {
      console.error("Failed to update question:", error);
      toast({
        title: "Failed to update question",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="text-question">Question/Prompt</Label>
        <Textarea
          id="text-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onBlur={(e) => handleQuestionChange(e.target.value)}
          placeholder="Enter the question or prompt for students..."
          className="min-h-[100px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Students will see this question and provide a written response
        </p>
      </div>
    </div>
  );
}
