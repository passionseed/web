"use client";

import type { OnboardingStep } from "@/types/onboarding";

const STEPS: OnboardingStep[] = [
  "welcome",
  "interest",
  "assessment",
  "influence",
  "results",
  "account",
];

interface ProgressDotsProps {
  currentStep: OnboardingStep;
}

export function ProgressDots({ currentStep }: ProgressDotsProps) {
  const currentIndex = STEPS.indexOf(currentStep);

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2"
      aria-label={`Onboarding step ${Math.max(currentIndex + 1, 1)} of ${STEPS.length}`}
    >
      {STEPS.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isComplete = index < currentIndex;

        return (
          <span
            key={step}
            className={[
              "block rounded-full transition-all duration-200",
              isCurrent
                ? "h-3 w-8 bg-white shadow-[0_0_22px_rgba(251,146,60,0.3)]"
                : isComplete
                  ? "h-2 w-2 bg-orange-300"
                  : "h-2 w-2 bg-white/20",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
