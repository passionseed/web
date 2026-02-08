"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { PathExitInterestChange, PathExitReasonCategory } from "@/types/pathlab";

interface ExitReflectionProps {
  submitting?: boolean;
  onBack: () => void;
  onSubmit: (payload: {
    reasonCategory: PathExitReasonCategory;
    interestChange: PathExitInterestChange;
    openResponse: string;
  }) => void;
}

export function ExitReflection({ submitting = false, onBack, onSubmit }: ExitReflectionProps) {
  const [reasonCategory, setReasonCategory] = useState<PathExitReasonCategory>("not_me");
  const [interestChange, setInterestChange] = useState<PathExitInterestChange>("same");
  const [openResponse, setOpenResponse] = useState("");

  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Quitting is a valid outcome</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-neutral-200">Before you go, what made this not fit?</Label>
          <RadioGroup
            value={reasonCategory}
            onValueChange={(value) => setReasonCategory(value as PathExitReasonCategory)}
            className="space-y-2"
          >
            {[
              { value: "boring", label: "Boring" },
              { value: "confusing", label: "Confusing" },
              { value: "stressful", label: "Stressful" },
              { value: "not_me", label: "Not me" },
            ].map((option) => (
              <div key={option.value} className="flex items-center gap-2 rounded-md border border-neutral-800 p-2">
                <RadioGroupItem value={option.value} id={`exit-reason-${option.value}`} />
                <Label htmlFor={`exit-reason-${option.value}`} className="text-neutral-200">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-3">
          <Label className="text-neutral-200">Interest after this path</Label>
          <RadioGroup
            value={interestChange}
            onValueChange={(value) => setInterestChange(value as PathExitInterestChange)}
            className="space-y-2"
          >
            {[
              { value: "more", label: "More interest" },
              { value: "less", label: "Less interest" },
              { value: "same", label: "About the same" },
            ].map((option) => (
              <div key={option.value} className="flex items-center gap-2 rounded-md border border-neutral-800 p-2">
                <RadioGroupItem value={option.value} id={`exit-interest-${option.value}`} />
                <Label htmlFor={`exit-interest-${option.value}`} className="text-neutral-200">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label className="text-neutral-200">Anything else you want to add? (optional)</Label>
          <Textarea
            value={openResponse}
            onChange={(event) => setOpenResponse(event.target.value)}
            className="min-h-24 bg-neutral-950 border-neutral-700 text-white"
          />
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack} disabled={submitting}>
            Back
          </Button>
          <Button
            onClick={() => onSubmit({ reasonCategory, interestChange, openResponse })}
            disabled={submitting}
            className="bg-white text-black hover:bg-neutral-200"
          >
            {submitting ? "Saving..." : "Finish"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
