"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { PathWouldExploreDeeper } from "@/types/pathlab";

interface EndReflectionProps {
  submitting?: boolean;
  onSubmit: (payload: {
    overallInterest: number;
    fitLevel: number;
    surpriseResponse: string;
    wouldExploreDeeper: PathWouldExploreDeeper;
  }) => void;
}

export function EndReflection({ submitting = false, onSubmit }: EndReflectionProps) {
  const [overallInterest, setOverallInterest] = useState(5);
  const [fitLevel, setFitLevel] = useState(5);
  const [surpriseResponse, setSurpriseResponse] = useState("");
  const [wouldExploreDeeper, setWouldExploreDeeper] = useState<PathWouldExploreDeeper>("maybe");

  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <CardTitle className="text-2xl text-white">End Reflection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-neutral-200">How interested are you now?</Label>
            <span className="text-sm text-neutral-400">{overallInterest}/10</span>
          </div>
          <Slider min={1} max={10} step={1} value={[overallInterest]} onValueChange={(value) => setOverallInterest(value[0] || 1)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-neutral-200">How well did this fit how you like to work?</Label>
            <span className="text-sm text-neutral-400">{fitLevel}/10</span>
          </div>
          <Slider min={1} max={10} step={1} value={[fitLevel]} onValueChange={(value) => setFitLevel(value[0] || 1)} />
        </div>

        <div className="space-y-2">
          <Label className="text-neutral-200">What surprised you most?</Label>
          <Textarea
            value={surpriseResponse}
            onChange={(event) => setSurpriseResponse(event.target.value)}
            className="min-h-24 bg-neutral-950 border-neutral-700 text-white"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-neutral-200">Would you explore deeper in this area?</Label>
          <RadioGroup
            value={wouldExploreDeeper}
            onValueChange={(value) => setWouldExploreDeeper(value as PathWouldExploreDeeper)}
            className="space-y-2"
          >
            {[
              { value: "yes", label: "Yes" },
              { value: "maybe", label: "Maybe" },
              { value: "no", label: "No" },
            ].map((option) => (
              <div key={option.value} className="flex items-center gap-2 rounded-md border border-neutral-800 p-2">
                <RadioGroupItem value={option.value} id={`end-${option.value}`} />
                <Label htmlFor={`end-${option.value}`} className="text-neutral-200">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() =>
              onSubmit({
                overallInterest,
                fitLevel,
                surpriseResponse,
                wouldExploreDeeper,
              })
            }
            disabled={submitting}
            className="bg-white text-black hover:bg-neutral-200"
          >
            {submitting ? "Saving..." : "Finish Path"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
