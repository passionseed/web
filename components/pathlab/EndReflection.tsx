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

function MetricRow(props: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color?: "green" | "amber" | "blue" | "purple";
  icon?: string;
}) {
  const colorConfig =
    props.color === "green"
      ? {
          slider:
            "[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-green-400 [&_[role=slider]]:to-emerald-500 [&_[role=slider]]:shadow-[0_0_10px_rgba(52,211,153,0.5)]",
          track:
            "[&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-green-500/30 [&_.bg-primary]:to-emerald-500/30",
          badge: "bg-green-500/20 text-green-300 border border-green-500/30",
          glow: "shadow-[0_0_20px_rgba(52,211,153,0.15)]",
        }
      : props.color === "amber"
        ? {
            slider:
              "[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-amber-400 [&_[role=slider]]:to-orange-500 [&_[role=slider]]:shadow-[0_0_10px_rgba(251,191,36,0.5)]",
            track:
              "[&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-amber-500/30 [&_.bg-primary]:to-orange-500/30",
            badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
            glow: "shadow-[0_0_20px_rgba(251,191,36,0.15)]",
          }
        : props.color === "purple"
          ? {
              slider:
                "[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-purple-400 [&_[role=slider]]:to-fuchsia-500 [&_[role=slider]]:shadow-[0_0_10px_rgba(168,85,247,0.5)]",
              track:
                "[&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-purple-500/30 [&_.bg-primary]:to-fuchsia-500/30",
              badge:
                "bg-purple-500/20 text-purple-300 border border-purple-500/30",
              glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]",
            }
          : {
              slider:
                "[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-blue-400 [&_[role=slider]]:to-cyan-500 [&_[role=slider]]:shadow-[0_0_10px_rgba(59,130,246,0.5)]",
              track:
                "[&_.bg-primary]:bg-gradient-to-r [&_.bg-primary]:from-blue-500/30 [&_.bg-primary]:to-cyan-500/30",
              badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
              glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
            };

  return (
    <div
      className={`group space-y-3 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 transition-all hover:border-neutral-700/50 ${colorConfig.glow}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {props.icon && <span className="text-2xl">{props.icon}</span>}
          <Label className="text-base font-medium text-neutral-100">
            {props.label}
          </Label>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${colorConfig.badge}`}
        >
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

export function EndReflection({
  submitting = false,
  onSubmit,
}: EndReflectionProps) {
  const [overallInterest, setOverallInterest] = useState(5);
  const [fitLevel, setFitLevel] = useState(5);
  const [surpriseResponse, setSurpriseResponse] = useState("");
  const [wouldExploreDeeper, setWouldExploreDeeper] =
    useState<PathWouldExploreDeeper>("maybe");

  return (
    <Card className="border-neutral-800/50 bg-gradient-to-br from-neutral-900/90 via-neutral-900/80 to-neutral-950/90 shadow-2xl backdrop-blur-sm">
      <CardHeader className="border-b border-neutral-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
            <span className="text-2xl">🎉</span>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-white">
              End Reflection
            </CardTitle>
            <p className="text-sm text-neutral-400 mt-1">
              Look back at what you've learned on this path
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-8">
        <div className="space-y-5">
          <MetricRow
            label="How interested are you now?"
            value={overallInterest}
            onChange={setOverallInterest}
            color="blue"
            icon="🌟"
          />
          <MetricRow
            label="How well did this fit how you like to work?"
            value={fitLevel}
            onChange={setFitLevel}
            color="purple"
            icon="🧩"
          />
        </div>

        <div className="space-y-3 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">😲</span>
            <Label className="text-base font-medium text-neutral-100">
              What surprised you most?
            </Label>
          </div>
          <Textarea
            value={surpriseResponse}
            onChange={(event) => setSurpriseResponse(event.target.value)}
            placeholder="Did anything stand out, catch you off guard, or challenge your assumptions?"
            className="min-h-32 resize-none rounded-lg border-neutral-700/50 bg-neutral-950/80 text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/20 transition-all"
          />
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧭</span>
            <Label className="text-base font-medium text-neutral-100">
              Would you explore deeper in this area?
            </Label>
          </div>
          <RadioGroup
            value={wouldExploreDeeper}
            onValueChange={(value) =>
              setWouldExploreDeeper(value as PathWouldExploreDeeper)
            }
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {[
              {
                value: "yes",
                label: "Yes",
                icon: "🚀",
                desc: "Defintely, I want to learn more",
              },
              {
                value: "maybe",
                label: "Maybe",
                icon: "🤔",
                desc: "I'm curious but not entirely sure",
              },
              {
                value: "no",
                label: "No",
                icon: "🛑",
                desc: "Not right now, I've seen enough",
              },
            ].map((option) => {
              const isActive = wouldExploreDeeper === option.value;
              return (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={`end-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`end-${option.value}`}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center cursor-pointer transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        : "border-neutral-800/50 bg-neutral-950/50 hover:border-neutral-700 hover:bg-neutral-900/50"
                    }`}
                  >
                    <span className="text-3xl mb-1">{option.icon}</span>
                    <span
                      className={`font-semibold ${isActive ? "text-blue-300" : "text-neutral-200"}`}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs text-neutral-400 font-normal">
                      {option.desc}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <div className="flex justify-end pt-4">
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
            className="h-12 px-8 bg-gradient-to-r from-white to-neutral-100 text-black font-semibold hover:from-neutral-100 hover:to-neutral-200 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Saving...
              </div>
            ) : (
              "Finish Path →"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
