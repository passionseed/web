"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

// Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoreAssessment } from "@/components/education/direction-finder/CoreAssessment";
import { AIConversation } from "@/components/education/direction-finder/AIConversation";
import { DirectionResultsView } from "@/components/education/direction-finder/DirectionResultsView";

// Types & Actions
import {
  AssessmentAnswers,
  DirectionFinderResult,
  AssessmentStep,
  Message,
} from "@/types/direction-finder";
import {
  saveDirectionFinderResult,
  getUserDirectionFinderResult,
} from "@/app/actions/save-direction";

type FlowStep = "tos" | "ikigai" | "ai-chat" | "results";

// Map our custom steps to CoreAssessment steps
// CoreAssessment expects: 'intro' | 'q1' | ... | 'q6' | ...
const IKIGAI_STEPS: AssessmentStep[] = [
  "intro",
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "part2_intro",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q12",
  "q13",
];

export function NewNorthStarFlow() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <NewNorthStarFlowContent />
    </Suspense>
  );
}

function NewNorthStarFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { language } = useLanguage();

  // --- State ---
  const [currentFlowStep, setCurrentFlowStep] = useState<FlowStep>("tos");
  const [ikigaiStepIndex, setIkigaiStepIndex] = useState(0);

  // Data State
  const [answers, setAnswers] = useState<Partial<AssessmentAnswers>>({});
  const [chatHistory, setChatHistory] = useState<Message[] | undefined>(
    undefined,
  );
  const [result, setResult] = useState<DirectionFinderResult | null>(null);
  const [serverDataId, setServerDataId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      // 1. Sync URL Step
      const stepParam = searchParams.get("step");
      const subStepParam = searchParams.get("substep"); // For keeping track of ikigai q1, q2...

      if (stepParam) {
        if (["tos", "ikigai", "ai-chat", "results"].includes(stepParam)) {
          setCurrentFlowStep(stepParam as FlowStep);
        }
      }

      if (subStepParam && stepParam === "ikigai") {
        const idx = IKIGAI_STEPS.indexOf(subStepParam as AssessmentStep);
        if (idx !== -1) setIkigaiStepIndex(idx);
      }

      // 2. Load Data from Server (Persistence)
      // We check server for existing session to allow resuming
      try {
        const data = await getUserDirectionFinderResult();
        if (data) {
          setAnswers(data.answers);
          setResult(data.result);
          if (data.chat_history) setChatHistory(data.chat_history);
          setServerDataId(data.id);

          // If we have a result, we might be done or in review mode
          // But strict URL adherence is preferred unless empty
          if (!stepParam && data.result) {
            updateURL("results");
          }
        } else {
          // Check local storage fallback
          const saved = localStorage.getItem("new_northstar_progress");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.answers) setAnswers(parsed.answers);
              if (parsed.history) setChatHistory(parsed.history);
            } catch (e) {
              console.error("Local load error", e);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- Persistence Effect ---
  useEffect(() => {
    if (isLoading) return;

    // Save to LocalStorage frequently
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(
        "new_northstar_progress",
        JSON.stringify({
          answers,
          history: chatHistory,
          updatedAt: Date.now(),
        }),
      );
    }
  }, [answers, chatHistory, isLoading]);

  // --- Handlers ---

  const updateURL = (step: FlowStep, subStep?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", step);
    if (subStep) {
      params.set("substep", subStep);
    } else {
      params.delete("substep");
    }
    router.push(`${pathname}?${params.toString()}`);
    setCurrentFlowStep(step);
    if (subStep && step === "ikigai") {
      setIkigaiStepIndex(IKIGAI_STEPS.indexOf(subStep as AssessmentStep));
    }
  };

  const handleTOSAccept = () => {
    updateURL("ikigai", IKIGAI_STEPS[0]);
  };

  const handleIkigaiAnswer = (newAnswers: Partial<AssessmentAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...newAnswers }));
  };

  const handleIkigaiNext = () => {
    if (ikigaiStepIndex < IKIGAI_STEPS.length - 1) {
      const nextIdx = ikigaiStepIndex + 1;
      setIkigaiStepIndex(nextIdx);
      updateURL("ikigai", IKIGAI_STEPS[nextIdx]);
    } else {
      // Finished Questionnaire -> Go to AI Chat
      // Save interim progress to server? Optional but good practice.
      saveProgressToServer();
      updateURL("ai-chat");
    }
  };

  const handleIkigaiBack = () => {
    if (ikigaiStepIndex > 0) {
      const prevIdx = ikigaiStepIndex - 1;
      setIkigaiStepIndex(prevIdx);
      updateURL("ikigai", IKIGAI_STEPS[prevIdx]);
    } else {
      updateURL("tos");
    }
  };

  const saveProgressToServer = async (finalResult?: DirectionFinderResult) => {
    try {
      const saved = await saveDirectionFinderResult(
        answers as AssessmentAnswers,
        finalResult || result || null, // Pass null if no result yet, need to check type compatibility
        chatHistory,
        serverDataId || undefined,
      );
      if (saved?.id) setServerDataId(saved.id);
    } catch (e) {
      console.error("Server save failed", e);
    }
  };

  const handleAIChatComplete = async (finalResult: DirectionFinderResult) => {
    setResult(finalResult);
    // Optimization: Save immediately
    try {
      await saveDirectionFinderResult(
        answers as AssessmentAnswers,
        finalResult,
        chatHistory,
        serverDataId || undefined,
      );
      toast.success("Analysis Complete!");
    } catch (e) {
      toast.error("Failed to save results, please try again.");
    }

    updateURL("results");
  };

  // --- Render ---

  if (isLoading) return null;

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen pb-20">
      {/* Header / Nav (Optional, maybe minimal) */}
      <div className="flex items-center justify-between py-6 px-4">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => router.push("/me")}
        >
          <div className="bg-white/10 p-2 rounded-full">
            <ArrowLeft className="w-4 h-4 text-slate-300" />
          </div>
          <span className="text-sm font-medium text-slate-400">
            Back to Journey
          </span>
        </div>

        <div className="text-sm text-slate-500 font-mono">
          {currentFlowStep === "ikigai" &&
            `Step ${ikigaiStepIndex + 1}/${IKIGAI_STEPS.length}`}
          {currentFlowStep === "ai-chat" && "AI Analysis"}
          {currentFlowStep === "results" && "Your North Star"}
        </div>
      </div>

      <div className="mt-4">
        {currentFlowStep === "tos" && <TOSStep onAccept={handleTOSAccept} />}

        {currentFlowStep === "ikigai" && (
          <div className="max-w-3xl mx-auto">
            <CoreAssessment
              step={IKIGAI_STEPS[ikigaiStepIndex]}
              answers={answers}
              onAnswer={handleIkigaiAnswer}
              onNext={handleIkigaiNext}
              onBack={handleIkigaiBack}
              lang={language as any}
            />
          </div>
        )}

        {currentFlowStep === "ai-chat" && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <AIConversation
              answers={answers as AssessmentAnswers}
              onComplete={handleAIChatComplete}
              history={chatHistory}
              onHistoryChange={setChatHistory}
              onBack={() =>
                updateURL("ikigai", IKIGAI_STEPS[IKIGAI_STEPS.length - 1])
              }
              lang={language as any}
              className="h-[700px] border-slate-800 shadow-2xl"
            />
          </div>
        )}

        {currentFlowStep === "results" && result && (
          <DirectionResultsView
            result={result}
            answers={answers as AssessmentAnswers}
            onBack={() => updateURL("ai-chat")}
            mode="assessment"
            userRole="beta-tester" // Placeholder, in real app we might pass actual role if needed for debug
          />
        )}
      </div>
    </div>
  );
}

function TOSStep({ onAccept }: { onAccept: () => void }) {
  return (
    <Card className="p-10 max-w-2xl mx-auto space-y-8 text-center bg-slate-900 border-slate-800 shadow-2xl mt-10 animate-in zoom-in-95 duration-500">
      <div className="space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-purple-500/20 transform rotate-3">
          <span className="text-4xl">🌟</span>
        </div>
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Welcome to Your Journey
        </h1>
      </div>

      <p className="text-lg text-slate-400 leading-relaxed max-w-lg mx-auto">
        Before we begin, please know that we collect your answers to
        <span className="text-purple-400 font-medium">
          {" "}
          improve our AI recommendation system
        </span>
        .
        <br />
        <br />
        Our goal is to provide you with the most{" "}
        <span className="text-white font-medium">truthful</span> and{" "}
        <span className="text-white font-medium">user-friendly</span> guidance
        for your future.
      </p>

      <div className="pt-6 border-t border-slate-800/50">
        <Button
          onClick={onAccept}
          size="lg"
          className="w-full md:w-auto px-12 py-6 text-lg rounded-full bg-white text-slate-950 hover:bg-slate-200 transition-all hover:scale-105 hover:shadow-xl font-bold"
        >
          I Understand & Agree
        </Button>
        <p className="text-xs text-slate-600 mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </Card>
  );
}
