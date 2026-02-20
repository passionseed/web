"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type {
  PathExitInterestChange,
  PathExitReasonCategory,
} from "@/types/pathlab";

interface ExitReflectionProps {
  submitting?: boolean;
  onBack: () => void;
  onSubmit: (payload: {
    reasonCategory: PathExitReasonCategory;
    interestChange: PathExitInterestChange;
    openResponse: string;
  }) => void;
}

export function ExitReflection({
  submitting = false,
  onBack,
  onSubmit,
}: ExitReflectionProps) {
  const [reasonCategory, setReasonCategory] =
    useState<PathExitReasonCategory>("not_me");
  const [interestChange, setInterestChange] =
    useState<PathExitInterestChange>("same");
  const [openResponse, setOpenResponse] = useState("");

  return (
    <Card className="border-neutral-800/50 bg-gradient-to-br from-neutral-900/90 via-neutral-900/80 to-neutral-950/90 shadow-2xl backdrop-blur-sm">
      <CardHeader className="border-b border-neutral-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
            <span className="text-2xl">🚪</span>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold text-white">
              Quitting is a valid outcome
            </CardTitle>
            <p className="text-sm text-neutral-400 mt-1">
              It's completely okay to switch gears if this isn't for you
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 pt-8">
        <div className="space-y-4 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛑</span>
            <Label className="text-base font-medium text-neutral-100">
              Before you go, what made this not fit?
            </Label>
          </div>
          <RadioGroup
            value={reasonCategory}
            onValueChange={(value) =>
              setReasonCategory(value as PathExitReasonCategory)
            }
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {[
              { value: "boring", label: "Boring", icon: "😴" },
              { value: "confusing", label: "Confusing", icon: "😵‍💫" },
              { value: "stressful", label: "Stressful", icon: "😰" },
              { value: "not_me", label: "Not me", icon: "🙅" },
            ].map((option) => {
              const isActive = reasonCategory === option.value;
              return (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={`exit-reason-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`exit-reason-${option.value}`}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center cursor-pointer transition-all ${
                      isActive
                        ? "border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                        : "border-neutral-800/50 bg-neutral-950/50 hover:border-neutral-700 hover:bg-neutral-900/50"
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span
                      className={`text-sm font-semibold ${isActive ? "text-orange-300" : "text-neutral-200"}`}
                    >
                      {option.label}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <div className="space-y-4 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <Label className="text-base font-medium text-neutral-100">
              Interest after this path
            </Label>
          </div>
          <RadioGroup
            value={interestChange}
            onValueChange={(value) =>
              setInterestChange(value as PathExitInterestChange)
            }
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {[
              {
                value: "more",
                label: "More",
                icon: "🔥",
                desc: "Still interested, but maybe in a different way",
              },
              {
                value: "same",
                label: "About the same",
                icon: "⚖️",
                desc: "My interest level didn't change much",
              },
              {
                value: "less",
                label: "Less",
                icon: "📉",
                desc: "I've realized this isn't for me",
              },
            ].map((option) => {
              const isActive = interestChange === option.value;
              return (
                <div key={option.value} className="relative">
                  <RadioGroupItem
                    value={option.value}
                    id={`exit-interest-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`exit-interest-${option.value}`}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center cursor-pointer transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                        : "border-neutral-800/50 bg-neutral-950/50 hover:border-neutral-700 hover:bg-neutral-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{option.icon}</span>
                      <span
                        className={`font-semibold ${isActive ? "text-blue-300" : "text-neutral-200"}`}
                      >
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-400 font-normal">
                      {option.desc}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        <div className="space-y-3 rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-900/50 to-neutral-950/50 p-5 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <Label className="text-base font-medium text-neutral-100">
              Anything else you want to add? (optional)
            </Label>
          </div>
          <Textarea
            value={openResponse}
            onChange={(event) => setOpenResponse(event.target.value)}
            placeholder="Any parting thoughts? Maybe what you'll try next?"
            className="min-h-24 resize-none rounded-lg border-neutral-700/50 bg-neutral-950/80 text-white placeholder:text-neutral-500 focus:border-neutral-600 focus:ring-2 focus:ring-neutral-600/20 transition-all"
          />
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={submitting}
            className="text-neutral-400 hover:text-white hover:bg-neutral-800 h-12 px-6 border border-neutral-800"
          >
            ← Back
          </Button>
          <Button
            onClick={() =>
              onSubmit({ reasonCategory, interestChange, openResponse })
            }
            disabled={submitting}
            className="h-12 px-8 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold hover:from-orange-500 hover:to-red-500 shadow-lg hover:shadow-xl shadow-red-500/20 hover:shadow-red-500/30 transition-all duration-200 hover:scale-[1.02] border-none"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </div>
            ) : (
              "Finish & Stop Path"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
