"use client";

import { useCallback, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type {
  CollectedData,
  OnboardingState,
  OnboardingStep,
} from "@/types/onboarding";
import { DawnScene } from "@/components/projectseed/dawn-scene";
import { ProgressDots } from "./components/progress-dots";
import { WelcomePhase } from "./phases/welcome";
import { InterestPhase } from "./phases/interest";
import { AssessmentWizardPhase } from "./phases/assessment-wizard";
import { ResultsPhase } from "./phases/results";
import { AccountPhase, type AccountPrefill } from "./phases/account";
import { UserNav } from "@/components/user-nav";

interface OnboardClientProps {
  user: SupabaseUser;
  userId: string;
  isAnonymous: boolean;
  oauthName: string | null;
  initialState: OnboardingState | null;
  /** Overrides the saved step, e.g. to reopen the account form. */
  initialStep?: OnboardingStep;
  accountPrefill?: AccountPrefill | null;
  /** Same-origin path to land on after onboarding, e.g. a lobby join link. */
  nextAfterOnboarding?: string | null;
}

const IS_DEV = process.env.NODE_ENV !== "production";

const PREVIOUS_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  interest: "welcome",
  assessment: "interest",
  results: "assessment",
  account: "results",
};

const HEADER_CHIP =
  "inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 text-xs font-medium text-white/70 sm:min-h-0 sm:py-1.5 sm:text-white/60";

export function OnboardClient({
  user,
  userId,
  isAnonymous,
  oauthName,
  initialState,
  initialStep,
  accountPrefill,
  nextAfterOnboarding,
}: OnboardClientProps) {
  const [step, setStep] = useState<OnboardingStep>(() => {
    const initial = initialStep ?? initialState?.current_step ?? "welcome";
    // Influence step removed — send leftover sessions forward.
    return initial === "influence" ? "results" : initial;
  });
  const [data, setData] = useState<CollectedData>(
    initialState?.collected_data ?? { language: "th" }
  );

  const saveState = useCallback(
    async (nextStep: OnboardingStep, nextData: CollectedData) => {
      await fetch("/api/onboarding/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          step: nextStep,
          collected_data: nextData,
        }),
      });
    },
    [userId]
  );

  const advance = useCallback(
    async (nextStep: OnboardingStep, updates: Partial<CollectedData>) => {
      const nextData = { ...data, ...updates };
      setData(nextData);
      setStep(nextStep);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
      await saveState(nextStep, nextData);
    },
    [data, saveState]
  );

  const updateLanguage = useCallback(
    async (language: "en" | "th") => {
      const nextData = { ...data, language };
      setData(nextData);
      await saveState(step, nextData);
    },
    [data, saveState, step]
  );

  const goBack = useCallback(async () => {
    const previousStep = PREVIOUS_STEP[step];
    if (!previousStep) {
      return;
    }

    setStep(previousStep);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    await saveState(previousStep, data);
  }, [data, saveState, step]);

  const language = (data.language ?? "th") as "en" | "th";

  const resetOnboarding = useCallback(async () => {
    if (!IS_DEV) {
      return;
    }

    const response = await fetch("/api/onboarding/reset", {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    setStep("welcome");
    setData({ language });
  }, [language]);
  const sharedProps = { data, advance, goBack };

  return (
    <div className="dawn-theme relative min-h-dvh text-white antialiased">
      <DawnScene />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#020617]/85 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <span className="dawn-eyebrow block truncate">PassionSeed</span>
              <span className="hidden truncate text-sm text-white/70 sm:block">
                {language === "en" ? "Career onboarding" : "เริ่มต้นเส้นทาง"}
              </span>
            </div>
            <ProgressDots currentStep={step} compact />
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {IS_DEV ? (
                <button
                  type="button"
                  onClick={() => {
                    void resetOnboarding();
                  }}
                  className={HEADER_CHIP}
                >
                  Reset
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void updateLanguage(language === "en" ? "th" : "en");
                }}
                className={`${HEADER_CHIP} tracking-[0.14em]`}
              >
                {language === "en" ? "TH" : "EN"}
              </button>
              <UserNav user={user} />
            </div>
          </div>
        </header>

        <main className="relative flex flex-1 justify-center px-3 py-4 sm:px-6 sm:py-8">
          <div className="w-full pb-[max(1rem,env(safe-area-inset-bottom))]">
            {step === "welcome" && (
              <WelcomePhase {...sharedProps} oauthName={oauthName} />
            )}
            {step === "interest" && <InterestPhase {...sharedProps} />}
            {step === "assessment" && (
              <AssessmentWizardPhase {...sharedProps} />
            )}
            {step === "results" && <ResultsPhase {...sharedProps} />}
            {step === "account" && (
              <AccountPhase
                {...sharedProps}
                isAnonymous={isAnonymous}
                prefill={accountPrefill}
                nextAfterOnboarding={nextAfterOnboarding}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
