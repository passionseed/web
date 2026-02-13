import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  AssessmentAnswers,
  DirectionFinderResult,
  Message,
} from "@/types/direction-finder";
import { translations, Language } from "@/lib/i18n/direction-finder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  ArrowLeft,
  Pencil,
  RefreshCw,
  Braces,
} from "lucide-react";
import {
  conductDirectionConversation,
  generateDirectionProfile,
  generateDirectionProfileCore,
  generatePrograms,
  generateCommitments,
  generateVectorDetails,
} from "@/app/actions/advisor-actions";
import {
  findCachedResult,
  incrementCacheHitCount,
} from "@/app/actions/save-direction";
import { selectModelForUser } from "@/lib/ai/modelSelector";
import {
  recordGenerationMetrics,
  getModelProvider,
} from "@/lib/utils/metrics-collector";
import { toast } from "sonner";
import { createHash } from "crypto";
import { marked } from "marked";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { cn } from "@/lib/utils";

interface AIConversationProps {
  answers: AssessmentAnswers;
  onComplete: (result: DirectionFinderResult) => void;
  history?: Message[];
  onHistoryChange?: (messages: Message[]) => void;
  onBack: () => void;
  model?: string;
  lang: Language;
  className?: string;
  existingResult?: DirectionFinderResult | null;
}

export function AIConversation({
  answers,
  onComplete,
  history,
  onHistoryChange,
  onBack,
  model,
  lang,
  className,
  existingResult,
}: AIConversationProps) {
  const t = translations[lang];
  const [messages, setMessages] = useState<Message[]>(history || []);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  // const [isGeneratingProfile, setIsGeneratingProfile] = useState(false); // Deprecated for loadingStage
  const [showIntro, setShowIntro] = useState(!history || history.length === 0);
  const [loadingStage, setLoadingStage] = useState<
    "none" | "core" | "details" | "programs" | "commitments"
  >("none");
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [lastSystemPrompt, setLastSystemPrompt] = useState<string>("");
  const [showDevPreview, setShowDevPreview] = useState(false);
  const [devSelectedModel, setDevSelectedModel] = useState<string>(
    model || "gemini-3-flash-preview",
  );

  const handleResetChat = () => {
    if (confirm("Reset chat history? This cannot be undone.")) {
      console.log("🔄 [Chat] Resetting conversation...", {
        previousMessages: messages.length,
        model: model || "auto",
      });

      setMessages([]);
      setShowIntro(true);
      hasStartedRef.current = false;
      setLoadingStage("none");
      onHistoryChange?.([]);

      console.log("✅ [Chat] Conversation reset complete");
    } else {
      console.log("❌ [Chat] Reset cancelled by user");
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  const startEditing = (msg: Message) => {
    setEditingId(msg.id);
    setEditValue(msg.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return;

    const msgIndex = messages.findIndex((m) => m.id === id);
    if (msgIndex === -1) return;

    const originalMessage = messages[msgIndex];

    console.log("✏️ [Chat] Editing message:", {
      id,
      index: msgIndex,
      oldContent: originalMessage.content.slice(0, 50) + "...",
      newContent: editValue.slice(0, 50) + "...",
      role: originalMessage.role,
    });

    // Slice history to include everything BEFORE the edited message
    const prevHistory = messages.slice(0, msgIndex);

    // Create the updated user message
    const newUserMsg: Message = { ...messages[msgIndex], content: editValue };

    // New history state starts with [ ...prev, updatedUserMsg ]
    const newHistory = [...prevHistory, newUserMsg];

    console.log("🔄 [Chat] Re-generating from edit...", {
      deletedMessages: messages.length - newHistory.length,
      newHistoryLength: newHistory.length,
    });

    setMessages(newHistory);
    setEditingId(null);
    setCurrentOptions([]); // clear options

    // Trigger API call
    const apiHistory = newHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    await handleAIResponse(apiHistory);
  };

  // Component mount logging
  useEffect(() => {
    console.log("🎬 [Chat] AIConversation component mounted", {
      hasHistory: !!(history && history.length > 0),
      historyLength: history?.length || 0,
      hasExistingResult: !!existingResult,
      model: model || "auto",
      language: lang,
      timestamp: new Date().toISOString(),
    });

    if (history && history.length > 0) {
      console.log("📜 [Chat] Loading conversation history:", {
        messages: history.map((m, i) => ({
          index: i,
          role: m.role,
          contentPreview: m.content.slice(0, 50) + "...",
          contentLength: m.content.length,
        })),
      });
    }
  }, []); // Only on mount

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isTyping, currentOptions]);

  // Sync to parent
  useEffect(() => {
    onHistoryChange?.(messages);
  }, [messages, onHistoryChange]);

  // Initial greeting if no history

  // Handle intro start
  const handleStartChat = () => {
    console.log("🚀 [Chat] Starting conversation...", {
      hasHistory: !!(history && history.length > 0),
      hasStarted: hasStartedRef.current,
      model: model || "auto",
    });

    setShowIntro(false);
    if ((!history || history.length === 0) && !hasStartedRef.current) {
      hasStartedRef.current = true;
      console.log("👋 [Chat] Sending initial trigger to AI");
      handleAIResponse(
        [
          { role: "user", content: "Start conversation" }, // Hidden trigger message
        ],
        true,
      );
    } else {
      console.log("ℹ️ [Chat] Resuming existing conversation", {
        messageCount: history?.length || 0,
      });
    }
  };

  const simulateTyping = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleAIResponse = async (
    currentHistory: { role: "user" | "assistant"; content: string }[],
    isInitial = false,
  ) => {
    const requestStartTime = Date.now();
    setIsTyping(true);
    setCurrentOptions([]); // Hide options while thinking

    console.log("🤖 [AI Response] Requesting AI conversation...", {
      historyLength: currentHistory.length,
      isInitial,
      model: model || "auto",
      language: lang,
      lastUserMessage:
        currentHistory[currentHistory.length - 1]?.content.slice(0, 50) + "...",
    });

    try {
      // If initial, we send the "Start conversation" trigger to the AI so it knows to begin.
      // The server action expects history.

      const response = await conductDirectionConversation(
        currentHistory,
        answers,
        model,
        lang,
      );

      const responseTime = Date.now() - requestStartTime;
      console.log("✅ [AI Response] Received response", {
        responseTime: responseTime + "ms",
        messagesCount: response.messages.length,
        optionsCount: response.options.length,
        hasSystemPrompt: !!response.debug_system_prompt,
      });

      if (response.debug_system_prompt) {
        setLastSystemPrompt(response.debug_system_prompt);
      }

      // Simulate "human" typing and message splitting
      for (let i = 0; i < response.messages.length; i++) {
        const msgContent = response.messages[i];
        const typingDelay = 300 + Math.random() * 300;

        console.log(
          `💭 [AI Response] Typing message ${i + 1}/${response.messages.length}...`,
          {
            contentLength: msgContent.length,
            delay: Math.round(typingDelay) + "ms",
            preview:
              msgContent.slice(0, 60) + (msgContent.length > 60 ? "..." : ""),
          },
        );

        await simulateTyping(typingDelay); // Shorter, snappier delay

        const messageId = Date.now().toString();
        setMessages((prev) => [
          ...prev,
          { id: messageId, role: "assistant", content: msgContent },
        ]);

        console.log(`✅ [AI Response] Message ${i + 1} displayed`, {
          id: messageId,
          timestamp: new Date().toISOString(),
        });
      }

      if (response.options.length > 0) {
        console.log("🎯 [AI Response] Showing options:", {
          count: response.options.length,
          options: response.options,
        });
      }

      setCurrentOptions(response.options);
    } catch (error: any) {
      const errorTime = Date.now() - requestStartTime;
      console.error("❌ [AI Response] Failed", {
        error: error.message,
        time: errorTime + "ms",
        stack: error.stack,
      });
      toast.error("Failed to connect to AI advisor");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    const newHistory = [...messages, userMsg];

    console.log("💬 [Chat] User sent message:", {
      id: userMsg.id,
      content: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
      contentLength: text.length,
      totalMessages: newHistory.length,
      timestamp: new Date().toISOString(),
    });

    setMessages(newHistory);
    setInput("");
    setCurrentOptions([]); // Clear options after selection

    // Convert to format for API
    const apiHistory = newHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    console.log("🔄 [Chat] Requesting AI response...", {
      historyLength: apiHistory.length,
      model: model || "auto",
      language: lang,
    });

    await handleAIResponse(apiHistory);
  };

  const handleFinish = async () => {
    // If we already have a result, just navigate to it instead of regenerating
    if (existingResult) {
      onComplete(existingResult);
      return;
    }

    // In development mode, show preview dialog first
    if (process.env.NODE_ENV === "development" && !showDevPreview) {
      setShowDevPreview(true);
      return;
    }

    // Proceed with generation
    await proceedWithGeneration();
  };

  const proceedWithGeneration = async () => {
    setShowDevPreview(false); // Close preview if open

    const generationStartTime = Date.now();
    let cacheHit = false;
    let cacheLookupTime = 0;
    let coreGenerationTime = 0;
    let detailsGenerationTime = 0;
    let selectedModel =
      process.env.NODE_ENV === "development"
        ? devSelectedModel
        : model || "gemini-3-flash-preview";
    let hadTimeout = false;
    let hadRateLimit = false;
    let errorMessage: string | undefined;
    let retryCount = 0;

    // Import getCurrentUserId from save-direction
    const { getCurrentUserId } = await import("@/app/actions/save-direction");

    setLoadingStage("core");
    try {
      // Get current user ID for model selection
      const userId = await getCurrentUserId();

      // If no userId, default to provided model or gemini-2.5-flash
      if (userId && !model) {
        // Select model for this user (consistent A/B testing)
        selectedModel = selectModelForUser(userId);
        console.log("🤖 [AI] Auto-selected model for user:", {
          userId: userId.slice(0, 8) + "...",
          model: selectedModel,
          source: "A/B Testing (hash-based)",
        });
      } else if (model) {
        selectedModel = model;
        console.log("🎯 [AI] Using manually selected model:", {
          model: selectedModel,
          source: "Manual Override",
        });
      } else {
        console.log("⚠️ [AI] Using default model:", {
          model: selectedModel,
          source: "Fallback (no user ID)",
        });
      }

      // Check cache before generating
      const cacheStartTime = Date.now();
      console.log("🔍 [Cache] Checking for cached result...", {
        model: selectedModel,
        answersHash: createHash("md5")
          .update(JSON.stringify(answers))
          .digest("hex")
          .slice(0, 8),
      });
      const cachedResult = await findCachedResult(answers, selectedModel);
      cacheLookupTime = Date.now() - cacheStartTime;

      if (cachedResult) {
        // Cache hit! Return cached result immediately
        cacheHit = true;
        await incrementCacheHitCount(cachedResult.id);

        console.log("✅ [Cache] HIT! Returning cached result", {
          resultId: cachedResult.id.slice(0, 8) + "...",
          lookupTime: cacheLookupTime + "ms",
          cacheHitCount: cachedResult.cache_hit_count + 1,
        });
        toast.success("Found matching profile from cache! ⚡");

        // Record metrics for cache hit
        if (userId) {
          await recordGenerationMetrics(cachedResult.id, userId, {
            modelProvider: await getModelProvider(selectedModel),
            modelName: selectedModel,
            totalGenerationTimeMs: Date.now() - generationStartTime,
            cacheHit: true,
            cacheLookupTimeMs: cacheLookupTime,
            hadTimeout: false,
            hadRateLimit: false,
            retryCount: 0,
            conversationTurnCount: messages.length,
            language: lang,
          });
        }

        onComplete(cachedResult.result);
        return;
      }

      // No cache hit, proceed with fresh generation
      console.log("❌ [Cache] MISS. Generating fresh profile...", {
        lookupTime: cacheLookupTime + "ms",
      });

      const apiHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Step 1: Core generation
      const coreStartTime = Date.now();
      console.log("🧠 [Generation] Starting CORE generation...", {
        model: selectedModel,
        conversationLength: apiHistory.length,
        language: lang,
      });
      const coreResult = await generateDirectionProfileCore(
        apiHistory,
        answers,
        selectedModel,
        lang,
      );
      coreGenerationTime = Date.now() - coreStartTime;
      console.log("✅ [Generation] CORE complete", {
        time: coreGenerationTime + "ms",
        vectors: coreResult.vectors?.length || 0,
      });

      // Step 1.5: Vector details generation (Split for timeout safety)
      setLoadingStage("details");
      const detailsStartTime = Date.now();
      console.log(
        "🔍 [Generation] Starting details generation for each vector...",
      );

      const detailedVectors = await Promise.all(
        (coreResult.vectors || []).map(async (v: any) => {
          const details = await generateVectorDetails(
            v,
            answers,
            selectedModel,
            lang,
          );
          return { ...v, ...details };
        }),
      );

      const vectorDetailsTime = Date.now() - detailsStartTime;
      console.log("✅ [Generation] Details complete", {
        time: vectorDetailsTime + "ms",
      });

      // Step 2: Programs generation
      setLoadingStage("programs");
      const programsStartTime = Date.now();
      console.log("📋 [Generation] Starting PROGRAMS generation...");
      const programsResult = await generatePrograms(
        { ...coreResult, vectors: detailedVectors },
        answers,
        selectedModel,
        lang,
      );
      const programsGenerationTime = Date.now() - programsStartTime;
      console.log("✅ [Generation] PROGRAMS complete", {
        time: programsGenerationTime + "ms",
        programs: programsResult.programs?.length || 0,
      });

      // Step 3: Commitments generation
      setLoadingStage("commitments");
      const commitmentsStartTime = Date.now();
      console.log("📋 [Generation] Starting COMMITMENTS generation...");
      const commitmentsResult = await generateCommitments(
        { ...coreResult, vectors: detailedVectors },
        answers,
        selectedModel,
        lang,
      );
      const commitmentsGenerationTime = Date.now() - commitmentsStartTime;
      console.log("✅ [Generation] COMMITMENTS complete", {
        time: commitmentsGenerationTime + "ms",
        commitments:
          (commitmentsResult.commitments?.this_week?.length || 0) +
          (commitmentsResult.commitments?.this_month?.length || 0),
      });

      // Merge results while preserving all metadata
      const finalResult: DirectionFinderResult = {
        profile: coreResult.profile!,
        vectors: detailedVectors as any,
        programs: programsResult.programs!,
        commitments: commitmentsResult.commitments!,
        debugMetadata: (coreResult as any).debugMetadata,
        programsMetadata: (programsResult as any).debugMetadata,
        commitmentsMetadata: (commitmentsResult as any).debugMetadata,
      } as any;

      const totalGenerationTime = Date.now() - generationStartTime;

      console.log("🎉 [Generation] Complete!", {
        totalTime: totalGenerationTime + "ms",
        coreTime: coreGenerationTime + "ms",
        programsTime: programsGenerationTime + "ms",
        commitmentsTime: commitmentsGenerationTime + "ms",
        model: selectedModel,
        cacheUsed: false,
      });

      // Record metrics for successful generation
      // Note: We don't have resultId yet, will need to get it after save
      // For now, we'll skip recording metrics here and do it in the parent component
      // after saveDirectionFinderResult is called

      onComplete(finalResult);
    } catch (error: any) {
      const totalTime = Date.now() - generationStartTime;
      console.error("❌ [Generation] FAILED", {
        error: error.message,
        time: totalTime + "ms",
        model: selectedModel,
        stack: error.stack,
      });

      // Classify error type
      if (
        error.message?.includes("unexpected response") ||
        error.message?.includes("504")
      ) {
        hadTimeout = true;
        errorMessage = "Generation timed out";
        console.error("⏱️ [Error] TIMEOUT - exceeded 300s limit");
        toast.error(
          "Generation timed out. Please try again or use a faster model.",
        );
      } else if (
        error.message?.includes("429") ||
        error.message?.includes("rate limit")
      ) {
        hadRateLimit = true;
        errorMessage = "Rate limit exceeded";
        console.error(
          "🚫 [Error] RATE LIMIT - too many requests to AI provider",
        );
        toast.error("Too many requests. Please wait a moment and try again.");
      } else {
        errorMessage = error.message || "Unknown error";
        console.error("💥 [Error] UNKNOWN -", errorMessage);
        toast.error("Failed to generate profile. Please try again.");
      }

      // Record error metrics (without resultId since generation failed)
      const userId = await getCurrentUserId();
      if (userId) {
        // Create a placeholder record to track the failed attempt
        // This helps us understand error patterns
        // We'll need to handle this in recordGenerationMetrics by making result_id optional
      }

      setLoadingStage("none");
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col bg-slate-900 border-slate-700 relative h-full",
        className,
      )}
    >
      <CardHeader className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 py-2 md:py-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-slate-400 hover:text-white mr-1 w-8 h-8 md:w-10 md:h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-slate-700 bg-white/5 shrink-0 relative flex items-center justify-center">
            <Image
              src="/passionseed-logo.svg"
              alt="PassionSeed"
              width={48}
              height={48}
              className="absolute max-w-none w-[120%] h-[120%] object-contain scale-110 translate-y-0.5 pointer-events-none drop-shadow-lg"
            />
          </div>
          <div>
            <CardTitle className="text-sm md:text-base text-white">
              {t.ai_chat.title}
            </CardTitle>
            <p className="text-[10px] md:text-xs text-slate-400 hidden sm:block">
              {t.ai_chat.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {/* DEV: Model Debug Badge */}
          {process.env.NODE_ENV === "development" && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-mono text-blue-300">
                {model || "auto"}
              </span>
            </div>
          )}
          {/* Reset Chat Button */}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetChat}
              className="text-slate-400 hover:text-amber-400 h-8 px-2"
              title="Restart Analysis"
            >
              <RefreshCw className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" />
              <span className="text-[10px] md:text-xs hidden sm:inline">
                Restart
              </span>
            </Button>
          )}

          {messages.filter((m) => m.role === "user").length < 6 &&
            !showIntro && (
              <div className="flex flex-col items-end">
                <span className="text-[8px] md:text-[10px] text-slate-500 font-medium uppercase tracking-wider hidden sm:block">
                  Analysis Progress
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-16 md:w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min(100, (messages.filter((m) => m.role === "user").length / 6) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] md:text-xs text-blue-400 font-bold">
                    {Math.round(
                      Math.min(
                        100,
                        (messages.filter((m) => m.role === "user").length / 6) *
                          100,
                      ),
                    )}
                    %
                  </span>
                </div>
              </div>
            )}
        </div>

        {messages.filter((m) => m.role === "user").length >= 6 && (
          <Button
            onClick={handleFinish}
            disabled={loadingStage !== "none" || isTyping}
            className="bg-green-600 hover:bg-green-700 text-xs h-7 px-3 md:h-8"
          >
            {loadingStage !== "none" ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />{" "}
                {loadingStage === "core"
                  ? "Analyzing..."
                  : loadingStage === "details"
                    ? "Building Skill Trees..."
                    : loadingStage === "programs"
                      ? "Finding Programs..."
                      : "Finalizing..."}
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-2" /> {t.ai_chat.view_results}
              </>
            )}
          </Button>
        )}
      </CardHeader>

      {showIntro ? (
        <CardContent className="flex-1 flex flex-col items-center justify-center p-6 md:p-8 text-center bg-slate-900/50">
          <div className="max-w-md space-y-6 animate-in fade-in zoom-in duration-500 w-full">
            <div className="bg-slate-800 w-16 h-16 md:w-20 md:h-20 rounded-2xl mx-auto flex items-center justify-center shadow-lg border border-slate-700 bg-white/5 relative">
              <Image
                src="/passionseed-logo.svg"
                alt="PassionSeed"
                width={100}
                height={100}
                className="absolute max-w-none w-[115%] h-[115%] object-contain translate-y-[-2%] drop-shadow-2xl"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg md:text-xl font-bold text-white">
                {lang === "th" ? "คุยกับพี่ Seed AI" : "Chat with Seed AI"}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed px-4 md:px-0">
                {lang === "th"
                  ? "ผมจะช่วยวิเคราะห์สิ่งที่คุณชอบ ค้นหาจุดแข็ง และแนะนำคณะที่ใช่สำหรับคุณ ลองคุยกันดูนะครับ!"
                  : "I'll help analyze your interests, find your strengths, and recommend the best faculties for you. Let's chat!"}
              </p>
            </div>

            <div className="grid gap-2 md:gap-3 text-left w-full">
              <div className="bg-slate-800/50 p-2.5 md:p-3 rounded-lg border border-slate-700/50 flex gap-3 items-center">
                <span className="bg-blue-500/10 text-blue-400 p-1.5 rounded text-xs font-bold">
                  1
                </span>
                <span className="text-xs text-slate-300">
                  {lang === "th"
                    ? "ตอบคำถามสั้นๆ เกี่ยวกับตัวคุณ"
                    : "Answer short questions about yourself"}
                </span>
              </div>
              <div className="bg-slate-800/50 p-2.5 md:p-3 rounded-lg border border-slate-700/50 flex gap-3 items-center">
                <span className="bg-purple-500/10 text-purple-400 p-1.5 rounded text-xs font-bold">
                  2
                </span>
                <span className="text-xs text-slate-300">
                  {lang === "th"
                    ? "ค้นหาจุดแข็งและสิ่งที่เหมาะกับคุณ"
                    : "Discover your strengths and best fits"}
                </span>
              </div>
              <div className="bg-slate-800/50 p-2.5 md:p-3 rounded-lg border border-slate-700/50 flex gap-3 items-center">
                <span className="bg-green-500/10 text-green-400 p-1.5 rounded text-xs font-bold">
                  3
                </span>
                <span className="text-xs text-slate-300">
                  {lang === "th"
                    ? "รับคำแนะนำเส้นทางที่ใช่สำหรับคุณ"
                    : "Get personalized pathway recommendations"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleStartChat}
              className="w-full bg-blue-600 hover:bg-blue-700 h-10 md:h-11 text-sm md:text-base shadow-lg shadow-blue-900/20"
            >
              {lang === "th" ? "เริ่มคุยเลย" : "Start Chatting"}
            </Button>
          </div>
        </CardContent>
      ) : (
        <>
          <CardContent className="flex-1 flex flex-col p-0 overflow-y-auto overscroll-contain">
          <div className="p-3 md:p-4" ref={scrollRef as any}>
            <div className="space-y-4 pb-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 md:gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} group relative`}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 border border-slate-700 shrink-0 mt-1 bg-white/5 overflow-visible relative ml-1">
                      <AvatarImage
                        src="/passionseed-logo.svg"
                        alt="AI Advisor"
                        className="absolute max-w-none w-[125%] h-[125%] left-1/2 top-1/2 -translate-x-1/2 -translate-y-[45%] object-contain drop-shadow-md"
                      />
                      <AvatarFallback className="bg-slate-800 text-purple-400">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-[90%] md:max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed relative ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                    } shadow-sm`}
                  >
                    {editingId === msg.id ? (
                      <div className="min-w-[200px]">
                        <Textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="bg-blue-700/50 border-blue-400/30 text-white min-h-[60px] text-sm mb-2 focus-visible:ring-offset-0"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditing}
                            className="h-6 text-xs hover:bg-white/10 text-white/70 hover:text-white"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => saveEdit(msg.id)}
                            className="h-6 text-xs bg-white text-blue-600 hover:bg-blue-50"
                          >
                            Save & Regenerate
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="prose prose-invert prose-sm max-w-none [&>p]:m-0 [&>p]:leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(
                              marked.parse(msg.content) as string,
                            ),
                          }}
                        />
                        {/* Edit Button for User Messages */}
                        {msg.role === "user" && !isTyping && (
                          <button
                            onClick={() => startEditing(msg)}
                            className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white"
                            title="Edit message"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {msg.role === "user" && (
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 border border-slate-700 shrink-0 mt-1">
                      <AvatarFallback className="bg-slate-800 text-blue-400">
                        Me
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 md:gap-3">
                  <Avatar className="w-7 h-7 md:w-8 md:h-8 border border-slate-700 mt-1">
                    <AvatarFallback className="bg-slate-800 text-purple-400">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-500 rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-slate-500 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}

              {/* ... (keep Regenerate button logic) */}

              {/* Options Buttons */}
              {!isTyping && currentOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 pl-9 md:pl-11">
                  {currentOptions.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        console.log("🎯 [Chat] Option clicked:", {
                          index: idx + 1,
                          total: currentOptions.length,
                          option:
                            option.slice(0, 50) +
                            (option.length > 50 ? "..." : ""),
                          fullOption: option,
                        });
                        setInput(option);
                      }}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-800 hover:bg-blue-600/20 border border-slate-600 hover:border-blue-500 text-slate-200 hover:text-blue-200 text-xs md:text-sm rounded-full transition-all text-left animate-in fade-in slide-in-from-bottom-2 duration-300 active:scale-95"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>

        {/* Input Form - Fixed at bottom */}
        <div className="p-3 md:p-4 border-t border-slate-800 bg-slate-950/95 backdrop-blur-sm shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex gap-2 relative"
          >
            <Textarea
              value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t.ai_chat.input_placeholder}
                className="bg-slate-800/80 border-slate-700 focus-visible:ring-blue-500 min-h-[44px] max-h-[120px] resize-none py-3 pr-10 text-sm md:text-base rounded-xl"
                disabled={loadingStage !== "none" || isTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(input);
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isTyping || loadingStage !== "none"}
                className="absolute right-1.5 top-1.5 h-8 w-8 bg-blue-600 hover:bg-blue-700 rounded-lg transition-transform active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </>
      )}

      {/* ... (Dev Debug View remains same) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-2 right-2 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log({ answers, messages })}
            className="text-xs bg-black/50 border-white/20 text-white backdrop-blur-md"
            title="Log context to console"
          >
            {t.ai_chat.log_context}
          </Button>
          <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-96 p-4 bg-black/90 text-xs font-mono text-green-400 rounded-lg border border-green-900 shadow-2xl max-h-[500px] overflow-auto whitespace-pre-wrap">
            {/* We can make this a proper dialog or just log to console as implemented above for simplicity, 
                 but user asked to "show" it. Let's make a collapsible details element. */}
          </div>
        </div>
      )}

      {process.env.NODE_ENV === "development" && (
        <details className="absolute top-14 right-2 z-40 max-w-md w-full bg-slate-900/95 backdrop-blur border border-slate-700 shadow-xl rounded-lg overflow-hidden text-xs">
          <summary className="p-3 bg-slate-800 font-bold text-slate-300 cursor-pointer hover:text-white flex justify-between items-center transition-colors">
            <span className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-500" />
              Dev Tools & Context
            </span>
            <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded-full text-slate-400 font-mono">
              {messages.length} msgs
            </span>
          </summary>

          <div className="p-4 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleResetChat}
                variant="destructive"
                size="sm"
                className="h-8 text-xs bg-red-900/50 hover:bg-red-900 text-red-100 border border-red-800/50"
              >
                <RefreshCw className="w-3 h-3 mr-2" /> Reset Chat
              </Button>
              <Button
                onClick={() =>
                  console.log({ answers, messages, lastSystemPrompt })
                }
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"
              >
                <Braces className="w-3 h-3 mr-2" /> Log to Console
              </Button>
            </div>

            <div className="space-y-4">
              {/* Last System Prompt */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-blue-400 font-semibold">
                  <span>Latest Generated Prompt</span>
                  <span className="text-[10px] opacity-60">
                    Server-side Context
                  </span>
                </div>
                {lastSystemPrompt ? (
                  <div className="bg-slate-950 p-3 rounded-md border border-blue-900/30 font-mono text-[10px] text-blue-200/90 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                    {lastSystemPrompt}
                  </div>
                ) : (
                  <div className="text-slate-500 italic p-3 bg-slate-950/50 rounded border border-slate-800 border-dashed text-center">
                    No prompt generated yet. Send a message to see the context!
                  </div>
                )}
              </div>

              {/* Assessment Answers */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-emerald-400 font-semibold">
                  <span>Input Data (Answers)</span>
                  <span className="text-[10px] opacity-60">Client State</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-md border border-emerald-900/30 font-mono text-[10px] text-emerald-200/90 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed shadow-inner">
                  {JSON.stringify(answers, null, 2)}
                </div>
              </div>
            </div>
          </div>
        </details>
      )}
      {/* Dev Preview Dialog */}
      {process.env.NODE_ENV === "development" && (
        <Dialog open={showDevPreview} onOpenChange={setShowDevPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 z-[110] [&~div]:z-[100]">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Generation Preview
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Configure and review before generating the direction profile
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">
                  AI Model
                </label>
                <Select
                  value={devSelectedModel}
                  onValueChange={setDevSelectedModel}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {/* Google Models */}
                    <SelectItem value="gemini-3-flash-preview">
                      Gemini 3 Flash Preview (Default) - Fast, Low Cost
                    </SelectItem>
                    <SelectItem value="gemini-2.5-flash">
                      Gemini 2.5 Flash - Fast, Low Cost
                    </SelectItem>
                    <SelectItem value="gemini-flash-lite-latest">
                      Gemini Flash Lite - Fastest, Lowest Cost
                    </SelectItem>

                    {/* OpenAI Models */}
                    <SelectItem value="gpt-5-mini-2025-08-07">
                      GPT-5 Mini - Medium Speed, Medium Cost
                    </SelectItem>
                    <SelectItem value="gpt-5.2-chat-latest">
                      GPT-5.2 Chat - Slow, High Cost
                    </SelectItem>
                    {/* <SelectItem value="codex-mini-latest">
                      Codex Mini - Medium Speed, Medium Cost
                    </SelectItem> */}

                    {/* Anthropic Models */}
                    <SelectItem value="claude-haiku-4-5">
                      Claude Haiku 4.5 - Fast, Medium Cost
                    </SelectItem>

                    {/* DeepSeek Models */}
                    <SelectItem value="deepseek-chat">
                      DeepSeek Chat - Medium Speed, Low Cost
                    </SelectItem>
                    <SelectItem value="deepseek-reasoner">
                      DeepSeek Reasoner (R1) - Slow, Medium Cost
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Selected:{" "}
                  <span className="font-mono">{devSelectedModel}</span>
                </p>
              </div>

              {/* Generation Info */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">
                  Generation Pipeline
                </label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-300">
                      Step 1: Core Profile (Energizers, Strengths, Values,
                      Vectors)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-slate-300">
                      Step 2: Program Recommendations (Universities & Faculties)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-300">
                      Step 3: Action Commitments (Weekly & Monthly)
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversation Summary */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">
                  Conversation Context
                </label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Total Messages:</span>
                      <span className="text-white font-semibold ml-2">
                        {messages.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">User Responses:</span>
                      <span className="text-white font-semibold ml-2">
                        {messages.filter((m) => m.role === "user").length}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Language:</span>
                      <span className="text-white font-semibold ml-2">
                        {lang === "th" ? "Thai" : "English"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Cache Check:</span>
                      <span className="text-emerald-400 font-semibold ml-2">
                        Enabled ✓
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assessment Answers Preview */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">
                  Assessment Data
                </label>
                <details className="bg-slate-800 border border-slate-700 rounded-lg">
                  <summary className="p-3 cursor-pointer text-sm text-slate-300 hover:text-white">
                    View raw assessment answers (click to expand)
                  </summary>
                  <div className="p-3 pt-0">
                    <pre className="text-xs text-slate-400 overflow-auto max-h-60 font-mono">
                      {JSON.stringify(answers, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-3">
                <div className="text-amber-400 shrink-0">⚠️</div>
                <div className="text-sm text-amber-200">
                  <strong>Generation Time:</strong> This may take 30-90 seconds
                  depending on the model. The process will check cache first
                  before generating fresh results.
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => setShowDevPreview(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={proceedWithGeneration}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Loading Overlay */}
      {loadingStage !== "none" && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 space-y-8 animate-in fade-in duration-500">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-slate-800" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-transparent border-r-transparent border-b-transparent border-l-blue-500 animate-spin" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin delay-150 duration-1000" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Bot className="w-8 h-8 text-white animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-3 max-w-xs">
            <h3 className="text-xl font-bold text-white animate-pulse">
              {loadingStage === "core"
                ? lang === "th"
                  ? "กำลังวิเคราะห์ตัวตนของคุณ..."
                  : "Analyzing your unique profile..."
                : loadingStage === "programs"
                  ? lang === "th"
                    ? "กำลังคัดเลือกคณะที่ใช่..."
                    : "Curating your personalized programs..."
                  : lang === "th"
                    ? "กำลังวางแผนก้าวแรกของคุณ..."
                    : "Planning your first steps..."}
            </h3>
            <p className="text-slate-400 text-sm">
              {loadingStage === "core"
                ? lang === "th"
                  ? "พี่ Seed AI กำลังประมวลผลคำตอบของคุณ"
                  : "Connecting the dots from our chat"
                : loadingStage === "programs"
                  ? lang === "th"
                    ? "กำลังหาข้อมูลคณะและมหาวิทยาลัยที่เหมาะกับคุณ"
                    : "Matching you with top universities"
                  : lang === "th"
                    ? "สรุปแผนปฏิบัติการเพื่ออนาคตของคุณ"
                    : "Outlining your action plan for success"}
            </p>
          </div>

          <div className="flex gap-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${loadingStage === "core" ? "w-12 bg-blue-500" : "w-4 bg-blue-500/30"}`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${loadingStage === "programs" ? "w-12 bg-purple-500" : "w-4 bg-purple-500/30"}`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${loadingStage === "commitments" ? "w-12 bg-emerald-500" : "w-4 bg-emerald-500/30"}`}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
