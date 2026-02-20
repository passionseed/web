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
  extraPromptResponses?: string[];
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
  color?: "green" | "amber" | "blue";
  icon?: string;
}) {
  const colorConfig = props.color === "green"
    ? {
        slider: "[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-green-400 [&_[role=slider]]:to-emerald-500 [&_[role=slider]]:shadow-[0_0_10px_rgba(52,211,153,0.5)]",
        track: "[&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-green-500/30 [&_.bg-primary]:to-emerald-500/30",
        badge: "bg-green-500/20 text-green-300 border border-green-500/30",
        glow: "shadow-[0_0_20px_rgba(52,211,153,0.15)]"
      }
    : props.color === "amber"
    ? {
        slider: "[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-amber-400 [&_[role=slider]]:to-orange-500 [&_[role=slider]]:shadow-[0_0_10px_rgba(251,191,36,0.5)]",
        track: "[&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-amber-500/30 [&_.bg-primary]:to-orange-500/30",
        badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
        glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]"
      }
    : {
        slider: "[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-400 [&_[role=slider]]:to-cyan-500 [&_[role=slider]]:shadow-[0_0_10px_rgba(59,130,246,0.5)]",
        track: "[&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-blue-500/30 [&_.bg-primary]:to-cyan-500/30",
        badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
        glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]"
      };

  return (
    <div className={`group space-y-3 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 transition-all hover:border-neutral-700/50 ${colorConfig.glow}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {props.icon && <span className="text-2xl">{props.icon}</span>}
          <Label className="text-base font-medium text-neutral-100">{props.label}</Label>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${colorConfig.badge}`}>
          {props.value}/10
        </span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[props.value]}
        onValueChange={(value) => props.onChange(value[0] || 1)}
        className={`${colorConfig.slider} ${colorConfig.track}`}
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
    <Card className="border-neutral-800/50 bg-gradient-to-br from-neutral-900/90 via-neutral-900/80 to-neutral-950/90 shadow-2xl backdrop-blur-sm">
      <CardHeader className="border-b border-neutral-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <span className="text-2xl">💭</span>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-white">Reflection</CardTitle>
            <p className="text-sm text-neutral-400 mt-1">Take a moment to reflect on your experience</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-8">
        <div className="space-y-5">
          <MetricRow
            label="How's your energy?"
            value={value.energyLevel}
            onChange={(energyLevel) => onChange({ ...value, energyLevel })}
            color="green"
            icon="⚡"
          />
          <MetricRow
            label="How confused are you?"
            value={value.confusionLevel}
            onChange={(confusionLevel) => onChange({ ...value, confusionLevel })}
            color="amber"
            icon="🤔"
          />
          <MetricRow
            label="How interested are you?"
            value={value.interestLevel}
            onChange={(interestLevel) => onChange({ ...value, interestLevel })}
            color="blue"
            icon="✨"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <Label className="text-base font-medium text-neutral-100">What stood out to you?</Label>
          </div>
          <Textarea
            value={value.openResponse}
            onChange={(event) => onChange({ ...value, openResponse: event.target.value })}
            placeholder="Share your thoughts, insights, or anything that caught your attention..."
            className="min-h-32 resize-none rounded-lg border-neutral-700/50 bg-neutral-950/80 text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/20 transition-all"
          />
        </div>

        {extraPrompts.length > 0 && (
          <div className="space-y-5 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-950/30 to-neutral-950/50 p-6 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <p className="text-base font-medium text-purple-200">Today's extra prompts</p>
            </div>
            {extraPrompts.map((prompt, index) => {
              const responses = value.extraPromptResponses || [];
              const response = responses[index] || "";

              return (
                <div key={`${prompt}-${index}`} className="space-y-3">
                  <Label className="text-sm font-medium text-purple-100">
                    {index + 1}. {prompt}
                  </Label>
                  <Textarea
                    value={response}
                    onChange={(event) => {
                      const newResponses = [...responses];
                      newResponses[index] = event.target.value;
                      onChange({ ...value, extraPromptResponses: newResponses });
                    }}
                    placeholder="Your response..."
                    className="min-h-24 resize-none rounded-lg border-purple-500/20 bg-neutral-950/80 text-white placeholder:text-neutral-500 focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              <Label className="text-base font-medium text-neutral-100">Time spent today (minutes)</Label>
            </div>
            {value.timeSpentMinutes !== null && (
              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/30">
                Auto-tracked
              </span>
            )}
          </div>
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
            placeholder="Auto-tracked when you start activities"
            className="h-12 w-full rounded-lg border border-neutral-700/50 bg-neutral-950/80 px-4 text-sm text-white placeholder:text-neutral-500 outline-none focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/20 transition-all"
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button
            disabled={submitting}
            onClick={onSubmit}
            className="h-12 px-8 bg-gradient-to-r from-white to-neutral-100 text-black font-semibold hover:from-neutral-100 hover:to-neutral-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Saving...
              </div>
            ) : (
              "Continue to decision →"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
