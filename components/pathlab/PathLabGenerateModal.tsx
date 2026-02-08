"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { PathLabGenerateResponse } from "@/types/pathlab-generator";

interface PathLabGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategoryId?: string | null;
  defaultTotalDays?: number;
  onGenerated: (response: PathLabGenerateResponse) => void;
}

export function PathLabGenerateModal({
  open,
  onOpenChange,
  defaultCategoryId,
  defaultTotalDays = 5,
  onGenerated,
}: PathLabGenerateModalProps) {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("High school learners (15-18)");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [totalDays, setTotalDays] = useState(defaultTotalDays);
  const [tone, setTone] = useState("encouraging");
  const [constraints, setConstraints] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Topic is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/pathlab/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topic.trim(),
          audience: audience.trim(),
          difficulty,
          totalDays,
          tone: tone.trim(),
          constraints: constraints.trim() || undefined,
          categoryId: defaultCategoryId || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to generate PathLab draft");
      }

      const warningCount = Array.isArray(payload.warnings) ? payload.warnings.length : 0;
      toast.success(
        warningCount > 0
          ? `PathLab draft generated with ${warningCount} warning${warningCount === 1 ? "" : "s"}`
          : "PathLab draft generated successfully",
      );

      onGenerated(payload as PathLabGenerateResponse);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to generate PathLab draft");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-neutral-900 text-white border-neutral-800 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate PathLab with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Climate Entrepreneurship"
              className="bg-neutral-800 border-neutral-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="audience">Audience / Age range</Label>
            <Input
              id="audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="e.g. Middle school learners (12-14)"
              className="bg-neutral-800 border-neutral-700"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(value) =>
                  setDifficulty(value as "beginner" | "intermediate" | "advanced")
                }
              >
                <SelectTrigger className="bg-neutral-800 border-neutral-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDays">Days</Label>
              <Input
                id="totalDays"
                type="number"
                min={1}
                max={30}
                value={totalDays}
                onChange={(event) =>
                  setTotalDays(Math.max(1, Math.min(30, Number(event.target.value) || defaultTotalDays)))
                }
                className="bg-neutral-800 border-neutral-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                value={tone}
                onChange={(event) => setTone(event.target.value)}
                placeholder="encouraging"
                className="bg-neutral-800 border-neutral-700"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="constraints">Constraints (optional)</Label>
            <Textarea
              id="constraints"
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="Any constraints, must-have themes, pacing notes, or exclusions"
              className="bg-neutral-800 border-neutral-700 min-h-24"
            />
          </div>

          <div className="rounded-md border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-400">
            Generated draft is saved as editable PathLab data. You can review and regenerate all/day/node before publishing.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Generate Draft
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
