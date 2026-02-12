import { useState, useEffect, Suspense } from "react";
import {
  AIConversationCompletionPayload,
  AssessmentAnswers,
  DirectionFinderResult,
  AssessmentStep,
  Message,
  DirectionVector,
  ActionPlan,
  MilestoneEvaluation,
  Commitment,
  DirectionGenerationMetadata,
  DirectionSaveOptions,
} from "@/types/direction-finder";
import { translations, Language } from "@/lib/i18n/direction-finder";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CoreAssessment } from "./CoreAssessment";
import { AIConversation } from "./AIConversation";
import { DirectionResultsView } from "./DirectionResultsView";
import { MilestoneEvaluator } from "./MilestoneEvaluator";
import { CommitmentContract } from "./CommitmentContract";
import {
  getDirectionFinderResults,
  getDirectionFinderResultById,
  getCurrentUserId,
  saveDirectionFinderResult,
  getUserDirectionFinderResult,
} from "@/app/actions/save-direction";
import { Database, Settings, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { getModelProvider, recordGenerationMetrics } from "@/lib/utils/metrics-collector";

interface DirectionFinderFlowProps {
  onComplete: (result: DirectionFinderResult) => void;
  onCancel: () => void;
  isReviewMode?: boolean;
}

const STEPS_ORDER: AssessmentStep[] = [
  "intro",
  "q1", // Energy & Flow Discovery
  "q2", // Zone Grid
  "q3", // Work Style
  "q4", // Reputation
  "q5", // Proud Moment
  "q6", // Secret Weapon
  "ai_intro",
  "ai_chat",
  "results",
  "milestone_eval",
  "commitment",
];

import { useLanguage } from "@/lib/i18n/language-context";

export function DirectionFinderFlow({
  onComplete,
  onCancel,
  isReviewMode = false,
}: DirectionFinderFlowProps) {
  return (
    <Suspense
      fallback={
        <div className="text-center p-8 text-slate-500">Loading flow...</div>
      }
    >
      <DirectionFinderFlowContent
        onComplete={onComplete}
        onCancel={onCancel}
        isReviewMode={isReviewMode}
      />
    </Suspense>
  );
}

function DirectionFinderFlowContent({
  onComplete,
  onCancel,
  isReviewMode,
}: DirectionFinderFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // URL State Sync
  const stepParam = searchParams.get("step");
  const initialStepIndex = stepParam
    ? Math.max(0, STEPS_ORDER.indexOf(stepParam as AssessmentStep))
    : 0;

  const [currentStepIndex, setCurrentStepIndex] = useState(
    initialStepIndex !== -1 ? initialStepIndex : 0,
  );
  const [answers, setAnswers] = useState<Partial<AssessmentAnswers>>({});
  const [result, setResult] = useState<DirectionFinderResult | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[] | undefined>(
    undefined,
  );
  // New State for Action Plan
  const [selectedVector, setSelectedVector] = useState<DirectionVector | null>(
    null,
  );
  const [selectedVectorIndex, setSelectedVectorIndex] = useState<number>(-1);
  const [actionPlan, setActionPlan] = useState<ActionPlan | undefined>(
    undefined,
  );

  const [isLoaded, setIsLoaded] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(true);
  const [serverDataId, setServerDataId] = useState<string | null>(null);
  const [generationMetadata, setGenerationMetadata] =
    useState<DirectionGenerationMetadata | null>(null);
  const { language: lang, setLanguage: setLang } = useLanguage();

  // DEV: Saved sessions state
  const [devSessions, setDevSessions] = useState<
    { id: string; user_id: string; created_at: string }[]
  >([]);
  const [loadingDevSession, setLoadingDevSession] = useState(false);
  const [model, setModel] = useState<string | undefined>(undefined);

  // Sync state to URL
  const updateStep = (index: number) => {
    setCurrentStepIndex(index);
    const params = new URLSearchParams(searchParams.toString());
    const stepName = STEPS_ORDER[index];
    if (stepName) {
      params.set("step", stepName);
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  // 1. Check Server Persistent Data on Mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        setIsCheckingServer(true);
        const data = await getUserDirectionFinderResult();
        if (data) {
          // Found existing result!
          setAnswers(data.answers);
          setResult(data.result);
          if (data.chat_history) {
            setChatHistory(data.chat_history);
          }
          if (data.result.actionPlan) {
            setActionPlan(data.result.actionPlan);
            // Restore selection if exists
            const idx = data.result.actionPlan.selectedVectorIndex;
            if (idx >= 0 && data.result.vectors[idx]) {
              setSelectedVector(data.result.vectors[idx]);
              setSelectedVectorIndex(idx);
            }
          }
          setServerDataId(data.id);

          // If we have a result, we should be on the results page unless explicitly overriding via URL or internal state?
          // But usually we want to show results.
          if (!result && !searchParams.get("step")) {
            // Only set if not already set locally
            setCurrentStepIndex(STEPS_ORDER.indexOf("results"));
          }
        }
      } catch (e) {
        console.error("Failed to check server data", e);
      } finally {
        setIsCheckingServer(false);
      }
    };
    checkServer();
  }, []);

  // 2. Load LocalStorage Progress (if no server result or if continuing)
  useEffect(() => {
    if (result) return; // If we have result, ignore local storage progress for now? or maybe merge?

    const saved = localStorage.getItem("direction_finder_progress");
    if (saved) {
      try {
        const { step, answers: savedAnswers, history } = JSON.parse(saved);
        // Only restore step if URL param is NOT set (URL takes precedence)
        if (
          !stepParam &&
          step !== undefined &&
          step >= 0 &&
          step < STEPS_ORDER.length
        ) {
          setCurrentStepIndex(step);
        }
        if (savedAnswers) setAnswers(savedAnswers);
        if (history) setChatHistory(history);
      } catch (e) {
        console.error("Failed to load progress", e);
      }
    }
    setIsLoaded(true);
  }, [result, stepParam]);

  // DEV: Load sessions list on mount (dev only)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      getDirectionFinderResults(10).then(setDevSessions).catch(console.error);
    }
  }, []);

  // Save progress on change
  useEffect(() => {
    if (!isLoaded || isCheckingServer) return;

    // Don't save if we are on the results page (completed)
    // But do save if we are in chat or any other step
    if (result && currentStepIndex === STEPS_ORDER.indexOf("results")) return;

    // Don't save if we are on the very first intro step and haven't done anything
    if (currentStepIndex === 0 && Object.keys(answers).length === 0) return;

    localStorage.setItem(
      "direction_finder_progress",
      JSON.stringify({
        step: currentStepIndex,
        answers,
        history: chatHistory,
      }),
    );
  }, [
    currentStepIndex,
    answers,
    chatHistory,
    isLoaded,
    result,
    isCheckingServer,
  ]);

  // Clear progress on completion or explicit cancel (optional, typically we keep it until finished)
  const clearProgress = () => {
    localStorage.removeItem("direction_finder_progress");
  };

  const currentStep = STEPS_ORDER[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS_ORDER.length) * 100;

  const handleAnswer = (stepAnswers: Partial<AssessmentAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...stepAnswers }));
  };

  const handleNext = () => {
    // Q1 Redirect Logic: If flow description is too short, redirect to /seeds
    if (currentStep === "q1") {
      const q1Data = answers.q1_flow;
      if (!q1Data?.description || q1Data.description.trim().length < 20) {
        toast.info(
          lang === "th"
            ? "ไม่เป็นไร! ลองไปสำรวจค่ายของเราก่อน แล้วกลับมาใหม่เมื่อพร้อม 🌱"
            : "No worries! Let's get you exploring first. Check out our camps! 🌱",
        );
        router.push("/seeds");
        return;
      }
    }

    if (currentStepIndex < STEPS_ORDER.length - 1) {
      updateStep(currentStepIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      updateStep(currentStepIndex - 1);
    } else {
      onCancel();
    }
  };

  const getSaveOptions = (
    metadata?: DirectionGenerationMetadata | null,
  ): DirectionSaveOptions | undefined => {
    if (!metadata) return undefined;
    return {
      modelName: metadata.modelName,
      isCached: metadata.cacheHit,
      originalResultId: metadata.originalResultId,
      generationSessionId: metadata.generationSessionId,
    };
  };

  const handleAIComplete = async ({
    result: finalResult,
    metadata,
  }: AIConversationCompletionPayload) => {
    setResult(finalResult);
    setGenerationMetadata(metadata);

    // Save to Server
    try {
      const savedData = await saveDirectionFinderResult(
        answers as AssessmentAnswers,
        finalResult,
        chatHistory,
        serverDataId || undefined,
        getSaveOptions(metadata),
      );
      if (savedData?.id) {
        setServerDataId(savedData.id);

        const userId = await getCurrentUserId();
        if (userId) {
          await recordGenerationMetrics(savedData.id, userId, {
            modelProvider: await getModelProvider(metadata.modelName),
            modelName: metadata.modelName,
            coreGenerationTimeMs: metadata.timings.coreGenerationTimeMs,
            detailsGenerationTimeMs: metadata.timings.detailsGenerationTimeMs,
            totalGenerationTimeMs: metadata.timings.totalGenerationTimeMs,
            cacheHit: metadata.cacheHit,
            cacheLookupTimeMs: metadata.timings.cacheLookupTimeMs,
            hadTimeout: metadata.errorFlags.hadTimeout,
            hadRateLimit: metadata.errorFlags.hadRateLimit,
            errorMessage: metadata.errorFlags.errorMessage,
            retryCount: metadata.retryCount,
            conversationTurnCount: chatHistory?.length ?? 0,
            language: lang,
          });
        }
      }
      clearProgress();
      toast.success("Profile saved!");
    } catch (e) {
      console.error("Failed to save result", e);
      toast.error("Failed to save profile, but here are your results.");
    }

    updateStep(STEPS_ORDER.indexOf("results"));
  };

  const handleStartNewSession = () => {
    if (
      window.confirm(
        "Are you sure you want to start a new session? Current progress will be cleared from this view.",
      )
    ) {
      setAnswers({});
      setResult(null);
      setChatHistory(undefined);
      setServerDataId(null);
      setGenerationMetadata(null);
      // Reset action plan state
      setSelectedVector(null);
      setSelectedVectorIndex(-1);
      setActionPlan(undefined);

      clearProgress();
      updateStep(0); // Go to intro
    }
  };

  const handleBackFromResults = () => {
    // If in Review Mode, "Back" means exit (cancel), NOT go to chat
    if (isReviewMode) {
      onCancel();
      return;
    }

    // If we have chat history, go back to AI chat
    if (chatHistory && chatHistory.length > 0) {
      const aiChatIndex = STEPS_ORDER.indexOf("ai_chat");
      if (aiChatIndex !== -1) {
        updateStep(aiChatIndex);
        return;
      }
    }
    // No chat history available (e.g., loaded from DB)
    // Go to the last answered questionnaire step, or ai_intro if we have answers
    if (Object.keys(answers).length > 0) {
      // User has answers, go to ai_intro so they can start the AI chat
      const aiIntroIndex = STEPS_ORDER.indexOf("ai_intro");
      if (aiIntroIndex !== -1) {
        updateStep(aiIntroIndex);
        return;
      }
    }
    // Fallback: just go back one step
    handleBack();
  };

  const handleRetake = () => {
    if (
      window.confirm(
        "Are you sure you want to edit your answers? This will restart the AI analysis.",
      )
    ) {
      setResult(null);
      setChatHistory(undefined); // Clear chat history so we get a fresh analysis
      setGenerationMetadata(null);

      // Force update local storage to prevent auto-restore jumping to old step
      // We keep 'answers' so the user doesn't lose them, but reset step to q1
      const q1Index = STEPS_ORDER.indexOf("q1");
      localStorage.setItem(
        "direction_finder_progress",
        JSON.stringify({
          step: q1Index,
          answers,
          history: undefined,
        }),
      );

      // Go to Q1 to let them edit
      updateStep(q1Index);
    }
  };

  // --- New Handlers for Action Phase ---

  const handleSelectPath = (vector: DirectionVector, index: number) => {
    setSelectedVector(vector);
    setSelectedVectorIndex(index);
    updateStep(STEPS_ORDER.indexOf("milestone_eval"));
  };

  const handleEvaluationComplete = (evaluations: MilestoneEvaluation[]) => {
    // Save partial plan state?
    setActionPlan((prev) => ({
      selectedVectorIndex: selectedVectorIndex,
      evaluations,
      commitment: prev?.commitment || {
        agreedToViewDaily: false,
        duolingoMode: false,
      },
    }));
    updateStep(STEPS_ORDER.indexOf("commitment"));
  };

  const handleCommitmentComplete = async (commitment: Commitment) => {
    if (!result) return;

    const finalPlan: ActionPlan = {
      selectedVectorIndex,
      evaluations: actionPlan?.evaluations || [],
      commitment,
    };

    const updatedResult: DirectionFinderResult = {
      ...result,
      actionPlan: finalPlan,
    };

    setResult(updatedResult);
    setActionPlan(finalPlan);

    // Final Save
    try {
      await saveDirectionFinderResult(
        answers as AssessmentAnswers,
        updatedResult,
        chatHistory,
        serverDataId || undefined,
        getSaveOptions(generationMetadata),
      );
      toast.success("Journey started! Commitment saved.");
      onComplete(updatedResult); // Call parent onComplete
    } catch (error) {
      console.error("Failed to save commitment", error);
      toast.error("Failed to save commitment");
    }
  };

  // Render content based on current step
  const renderContent = () => {
    if (isCheckingServer) {
      return (
        <div className="flex h-[300px] items-center justify-center text-slate-500">
          Loading your profile...
        </div>
      );
    }

    if (currentStep === "ai_chat") {
      return (
        <AIConversation
          answers={answers as AssessmentAnswers}
          onComplete={handleAIComplete}
          history={chatHistory}
          onHistoryChange={setChatHistory}
          onBack={handleBack}
          model={model}
          lang={lang}
        />
      );
    }

    if (currentStep === "results" && result) {
      return (
        <div className="relative">
          <DirectionResultsView
            result={result}
            answers={answers as AssessmentAnswers}
            onBack={handleBackFromResults}
            onRefine={() => updateStep(STEPS_ORDER.indexOf("ai_chat"))}
            chatHistory={chatHistory}
            mode="assessment"
            resultId={serverDataId || undefined}
            onStartNew={handleStartNewSession}
            onSelect={handleSelectPath}
            onRetake={handleRetake}
            saveOptions={getSaveOptions(generationMetadata)}
          />
        </div>
      );
    }

    if (currentStep === "milestone_eval" && selectedVector) {
      return (
        <MilestoneEvaluator
          vector={selectedVector}
          onComplete={handleEvaluationComplete}
          onBack={() => updateStep(STEPS_ORDER.indexOf("results"))}
        />
      );
    }

    if (currentStep === "commitment") {
      return (
        <CommitmentContract
          onComplete={handleCommitmentComplete}
          onBack={() => updateStep(STEPS_ORDER.indexOf("milestone_eval"))}
        />
      );
    }

    return (
      <CoreAssessment
        step={currentStep}
        answers={answers}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onBack={handleBack}
        lang={lang}
      />
    );
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header with Language Toggle - Hide progress during quiz (handled by CoreAssessment) */}
      {currentStep !== "results" &&
        currentStep !== "milestone_eval" &&
        currentStep !== "commitment" &&
        currentStep !== "intro" &&
        currentStep &&
        !currentStep.startsWith("q") && // Hide during quiz - progress is in CoreAssessment
        !isCheckingServer &&
        !isReviewMode && (
          <div className="space-y-2 mb-6">
            <div className="flex justify-end text-sm text-slate-400">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLang(lang === "en" ? "th" : "en")}
                className="h-6 px-2 text-xs border border-white/10 hover:bg-white/10"
              >
                {lang === "en" ? "🇹🇭 TH" : "🇬🇧 EN"}
              </Button>
            </div>
          </div>
        )}

      {/* DEV: Load Saved Session */}
      {process.env.NODE_ENV === "development" && (
        <div className="flex gap-2 mb-4">
          <details className="flex-1 text-xs bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2">
            <summary className="cursor-pointer text-yellow-400 font-bold flex items-center gap-2">
              <Database className="w-3 h-3" /> DEV: Load Saved Session
            </summary>
            {/* ... keeping existing content ... */}
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {devSessions.length === 0 && (
                <p className="text-slate-500">No saved sessions found.</p>
              )}
              {devSessions.map((s) => (
                <button
                  key={s.id}
                  onClick={async () => {
                    setLoadingDevSession(true);
                    try {
                      const full = await getDirectionFinderResultById(s.id);
                      setAnswers(full.answers);
                      setResult(full.result);
                      if (full.chat_history) setChatHistory(full.chat_history);
                      // Restore action plan if exists
                      if (full.result.actionPlan) {
                        setActionPlan(full.result.actionPlan);
                        const idx = full.result.actionPlan.selectedVectorIndex;
                        if (idx >= 0 && full.result.vectors[idx]) {
                          setSelectedVector(full.result.vectors[idx]);
                          setSelectedVectorIndex(idx);
                        }
                      }

                      updateStep(STEPS_ORDER.indexOf("results"));
                    } catch (e) {
                      console.error("Failed to load session", e);
                    }
                    setLoadingDevSession(false);
                  }}
                  disabled={loadingDevSession}
                  className="w-full text-left p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                >
                  <span className="text-white">{s.id.slice(0, 8)}...</span>
                  {/* ... */}
                </button>
              ))}
            </div>
          </details>

          {/* Model Selector - DEV ONLY */}
          {currentStep === "ai_chat" && (
            <div className="w-[280px] animate-in fade-in slide-in-from-top-2">
              <Select
                value={model ?? "__auto__"}
                onValueChange={(value) =>
                  setModel(value === "__auto__" ? undefined : value)
                }
              >
                <SelectTrigger className="h-full bg-slate-900 border-slate-700 text-xs">
                  <Settings className="w-3 h-3 mr-2 text-slate-400" />
                  <SelectValue placeholder="Auto (A/B Test)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">
                    <span className="font-semibold text-blue-400">🎲 Auto (A/B Test)</span>
                  </SelectItem>

                  <div className="px-2 py-1 text-[10px] text-slate-500 font-bold">GOOGLE</div>
                  <SelectItem value="gemini-3-flash">
                    Gemini 3 Flash
                  </SelectItem>
                  <SelectItem value="gemini-2.5-flash">
                    Gemini 2.5 Flash
                  </SelectItem>
                  <SelectItem value="gemini-flash-lite-latest">
                    Gemini Flash Lite
                  </SelectItem>

                  <div className="px-2 py-1 text-[10px] text-slate-500 font-bold">ANTHROPIC</div>
                  <SelectItem value="claude-haiku-4-5">
                    Claude Haiku 4.5
                  </SelectItem>

                  <div className="px-2 py-1 text-[10px] text-slate-500 font-bold">OPENAI</div>
                  <SelectItem value="gpt-5-mini-2025-08-07">
                    GPT-5 Mini
                  </SelectItem>
                  <SelectItem value="gpt-5.2-chat-latest">
                    GPT-5.2 Chat
                  </SelectItem>
                  <SelectItem value="codex-mini-latest">
                    Codex Mini
                  </SelectItem>

                  <div className="px-2 py-1 text-[10px] text-slate-500 font-bold">DEEPSEEK</div>
                  <SelectItem value="deepseek-chat">
                    DeepSeek Chat
                  </SelectItem>
                  <SelectItem value="deepseek-reasoner">
                    DeepSeek Reasoner (R1)
                  </SelectItem>
                </SelectContent>
              </Select>
              {model && (
                <div className="mt-1 text-[10px] text-green-400 font-mono">
                  ✓ Override: {model}
                </div>
              )}
              {!model && (
                <div className="mt-1 text-[10px] text-blue-400 font-mono">
                  🎲 Auto model selection enabled
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-[500px]">{renderContent()}</div>
    </div>
  );
}
