"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NodeAssessment } from "@/types/map";
import { useToast } from "@/components/ui/use-toast";
import { updateAssessmentMetadata } from "@/lib/supabase/assessment";

interface FileUploadEditorProps {
  assessment: NodeAssessment;
  onAssessmentChange: (assessment: NodeAssessment | null, action: "add" | "delete") => void;
}

export function FileUploadEditor({ assessment, onAssessmentChange }: FileUploadEditorProps) {
  const [prompt, setPrompt] = useState(assessment.metadata?.prompt || "");
  const { toast } = useToast();

  useEffect(() => {
    setPrompt(assessment.metadata?.prompt || "");
  }, [assessment.metadata?.prompt]);

  const handlePromptChange = async (newPrompt: string) => {
    setPrompt(newPrompt);

    try {
      // Update the metadata with the prompt
      const updatedMetadata = {
        ...assessment.metadata,
        prompt: newPrompt,
      };

      // Only update in database if this is not a temporary assessment
      if (!assessment.id.startsWith('temp_')) {
        await updateAssessmentMetadata(assessment.id, updatedMetadata);
      }

      // Update local state
      const updatedAssessment = {
        ...assessment,
        metadata: updatedMetadata,
      };

      onAssessmentChange(updatedAssessment, "add");
    } catch (error) {
      console.error("Failed to update prompt:", error);
      toast({
        title: "Failed to update prompt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="file-upload-prompt">Prompt/Instructions</Label>
        <Textarea
          id="file-upload-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={(e) => handlePromptChange(e.target.value)}
          placeholder="Enter instructions for what students should upload..."
          className="min-h-[100px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Students will see this prompt and upload their file(s) accordingly
        </p>
      </div>
    </div>
  );
}
