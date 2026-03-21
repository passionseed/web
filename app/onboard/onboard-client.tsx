"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CollectedData,
  OnboardingState,
  OnboardingStep,
} from "@/types/onboarding";
import { ProgressDots } from "./components/progress-dots";
import { WelcomePhase } from "./phases/welcome";
import { InterestPhase } from "./phases/interest";
import { AssessmentWizardPhase } from "./phases/assessment-wizard";
import { AssessmentChatPhase } from "./phases/assessment-chat";
import { InfluencePhase } from "./phases/influence";
import { ResultsPhase } from "./phases/results";
import { AccountPhase } from "./phases/account";

interface OnboardClientProps {
  userId: string;
  isAnonymous: boolean;
  oauthName: string | null;
  initialState: OnboardingState | null;
}

type ChatMessage = { role: "user" | "assistant"; content: string };
const IS_DEV = process.env.NODE_ENV !== "production";

const PREVIOUS_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  interest: "welcome",
  assessment: "interest",
  influence: "assessment",
  results: "influence",
  account: "results",
};

export function OnboardClient({
  userId,
  isAnonymous,
  oauthName,
  initialState,
}: OnboardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(
    initialState?.current_step ?? "welcome"
  );
  const [data, setData] = useState<CollectedData>(
    initialState?.collected_data ?? {}
  );
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(
    initialState?.chat_history ?? []
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
    await saveState(previousStep, data);
  }, [data, saveState, step]);

  const language = (data.language ?? "en") as "en" | "th";

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
    setChatHistory([]);
  }, [language]);
  const sharedProps = { data, advance, goBack };

  return (
    <div className="min-h-screen bg-[linear-gradient(to_bottom,#06000f_0%,#1a0336_28%,#3b0764_58%,#4a1230_82%,#2a0818_100%)] text-white">
      <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-[-12%] h-[38rem] bg-[radial-gradient(circle_at_top,rgba(107,33,168,0.34),transparent_62%)] blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(to_top,rgba(251,146,60,0.14),transparent_68%)] blur-3xl" />
        </div>

        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#120320]/80 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 flex-col">
              <span className="text-xs uppercase tracking-[0.24em] text-white/45">
                PassionSeed
              </span>
              <span className="truncate text-sm text-white/75">
                Career onboarding
              </span>
            </div>
            <ProgressDots currentStep={step} />
            <div className="flex items-center gap-2">
              {IS_DEV ? (
                <button
                  type="button"
                  onClick={() => {
                    void resetOnboarding();
                  }}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/55"
                >
                  Reset
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  void updateLanguage(language === "en" ? "th" : "en");
                }}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-white/70"
              >
                {language === "en" ? "TH" : "EN"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/me")}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/55"
              >
                Exit
              </button>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-6 sm:px-6 sm:py-8">
          {step === "welcome" && (
            <WelcomePhase {...sharedProps} oauthName={oauthName} />
          )}
          {step === "interest" && <InterestPhase {...sharedProps} />}
          {step === "assessment" && data.mode === "chat" && (
            <AssessmentChatPhase
              {...sharedProps}
              chatHistory={chatHistory}
              onChatHistoryChange={setChatHistory}
            />
          )}
          {step === "assessment" && data.mode !== "chat" && (
            <AssessmentWizardPhase {...sharedProps} />
          )}
          {step === "influence" && <InfluencePhase {...sharedProps} />}
          {step === "results" && <ResultsPhase {...sharedProps} />}
          {step === "account" && (
            <AccountPhase {...sharedProps} isAnonymous={isAnonymous} />
          )}
        </main>
      </div>
    </div>
  );
}
