"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

export interface DailyReflectionDraft {
  energyLevel: number;
  confusionLevel: number;
  interestLevel: number;
  openResponse: string;
  timeSpentMinutes: number | null;
}

interface ReflectionFormProps {
  value: DailyReflectionDraft;
  extraPrompts?: string[];
  submitting?: boolean;
  onChange: (value: DailyReflectionDraft) => void;
  onSubmit: () => void;
}

function MetricRow(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-neutral-200">{props.label}</Label>
        <span className="text-sm text-neutral-400">{props.value}/5</span>
      </div>
      <Slider
        min={1}
        max={5}
        step={1}
        value={[props.value]}
        onValueChange={(value) => props.onChange(value[0] || 1)}
      />
    </div>
  );
}

export function ReflectionForm({
  value,
  extraPrompts = [],
  submitting = false,
  onChange,
  onSubmit,
}: ReflectionFormProps) {
  const parsedTimeSpent = useMemo(
    () => (value.timeSpentMinutes === null ? "" : String(value.timeSpentMinutes)),
    [value.timeSpentMinutes]
  );

  return (
    <Card className="border-neutral-800 bg-neutral-900/80">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Reflection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <MetricRow
          label="How's your energy?"
          value={value.energyLevel}
          onChange={(energyLevel) => onChange({ ...value, energyLevel })}
        />
        <MetricRow
          label="How confused are you?"
          value={value.confusionLevel}
          onChange={(confusionLevel) => onChange({ ...value, confusionLevel })}
        />
        <MetricRow
          label="How interested are you?"
          value={value.interestLevel}
          onChange={(interestLevel) => onChange({ ...value, interestLevel })}
        />

        <div className="space-y-2">
          <Label className="text-neutral-200">What stood out to you?</Label>
          <Textarea
            value={value.openResponse}
            onChange={(event) => onChange({ ...value, openResponse: event.target.value })}
            placeholder="What stood out to you?"
            className="min-h-28 bg-neutral-950 border-neutral-700 text-white"
          />
        </div>

        {extraPrompts.length > 0 && (
          <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-950/70 p-4">
            <p className="text-sm text-neutral-400">Today’s extra prompts</p>
            {extraPrompts.map((prompt, index) => (
              <p key={`${prompt}-${index}`} className="text-sm text-neutral-200">
                {index + 1}. {prompt}
              </p>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-neutral-200">Time spent today (minutes)</Label>
          <input
            type="number"
            min={0}
            value={parsedTimeSpent}
            onChange={(event) => {
              const raw = event.target.value.trim();
              const numeric = raw.length === 0 ? null : Math.max(0, Number(raw));
              onChange({
                ...value,
                timeSpentMinutes: Number.isFinite(numeric as number) ? (numeric as number | null) : null,
              });
            }}
            className="h-10 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-sm text-white outline-none focus:border-neutral-500"
          />
        </div>

        <div className="flex justify-end">
          <Button disabled={submitting} onClick={onSubmit} className="bg-white text-black hover:bg-neutral-200">
            {submitting ? "Saving..." : "Continue to decision"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
