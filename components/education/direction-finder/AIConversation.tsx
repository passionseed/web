import { useState, useEffect, useRef } from "react";
import {
  AssessmentAnswers,
  DirectionFinderResult,
  Message,
} from "@/types/direction-finder";
import { translations, Language } from "@/lib/i18n/direction-finder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  generateDirectionProfileDetails,
} from "@/app/actions/advisor-actions";
import { toast } from "sonner";
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
}: AIConversationProps) {
  const t = translations[lang];
  const [messages, setMessages] = useState<Message[]>(history || []);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  // const [isGeneratingProfile, setIsGeneratingProfile] = useState(false); // Deprecated for loadingStage
  const [showIntro, setShowIntro] = useState(!history || history.length === 0);
  const [loadingStage, setLoadingStage] = useState<"none" | "core" | "details">(
    "none",
  );
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [lastSystemPrompt, setLastSystemPrompt] = useState<string>("");

  const handleResetChat = () => {
    if (confirm("Reset chat history? This cannot be undone.")) {
      setMessages([]);
      setShowIntro(true);
      hasStartedRef.current = false;
      setLoadingStage("none");
      onHistoryChange?.([]);
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

    // Slice history to include everything BEFORE the edited message
    const prevHistory = messages.slice(0, msgIndex);

    // Create the updated user message
    const newUserMsg: Message = { ...messages[msgIndex], content: editValue };

    // New history state starts with [ ...prev, updatedUserMsg ]
    const newHistory = [...prevHistory, newUserMsg];

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
    setShowIntro(false);
    if ((!history || history.length === 0) && !hasStartedRef.current) {
      hasStartedRef.current = true;
      handleAIResponse(
        [
          { role: "user", content: "Start conversation" }, // Hidden trigger message
        ],
        true,
      );
    }
  };

  const simulateTyping = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleAIResponse = async (
    currentHistory: { role: "user" | "assistant"; content: string }[],
    isInitial = false,
  ) => {
    setIsTyping(true);
    setCurrentOptions([]); // Hide options while thinking

    try {
      // If initial, we send the "Start conversation" trigger to the AI so it knows to begin.
      // The server action expects history.

      const response = await conductDirectionConversation(
        currentHistory,
        answers,
        model,
        lang,
      );

      if (response.debug_system_prompt) {
        setLastSystemPrompt(response.debug_system_prompt);
      }

      // Simulate "human" typing and message splitting
      for (const msgContent of response.messages) {
        await simulateTyping(300 + Math.random() * 300); // Shorter, snappier delay
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), role: "assistant", content: msgContent },
        ]);
      }

      setCurrentOptions(response.options);
    } catch (error) {
      console.error("Error getting AI response:", error);
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

    setMessages(newHistory);
    setInput("");
    setCurrentOptions([]); // Clear options after selection

    // Convert to format for API
    const apiHistory = newHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await handleAIResponse(apiHistory);
  };

  const handleFinish = async () => {
    // setIsGeneratingProfile(true);
    setLoadingStage("core");
    try {
      const apiHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Step 1: Core
      const coreResult = await generateDirectionProfileCore(
        apiHistory,
        answers,
        model,
        lang,
      );

      setLoadingStage("details");

      // Step 2: Details
      const detailsResult = await generateDirectionProfileDetails(
        coreResult,
        answers,
        model,
        lang,
      );

      // Merge
      const finalResult: DirectionFinderResult = {
        ...(coreResult as any),
        ...(detailsResult as any),
      };

      onComplete(finalResult);
    } catch (error: any) {
      console.error("Error generating profile:", error);
      if (
        error.message?.includes("unexpected response") ||
        error.message?.includes("504")
      ) {
        toast.error(
          "Generation timed out. Please try again or use a faster model.",
        );
      } else {
        toast.error("Failed to generate profile. Please try again.");
      }
      setLoadingStage("none");
    }
  };

  return (
    <Card
      className={cn(
        "h-[85vh] md:h-[600px] flex flex-col bg-slate-900 border-slate-700 relative overflow-hidden shadow-2xl",
        className,
      )}
    >
      <CardHeader className="border-b border-slate-800 py-2 md:py-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="text-slate-400 hover:text-white mr-1 w-8 h-8 md:w-10 md:h-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-1.5 md:p-2 rounded-full">
            <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
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
                  : "Finding Programs..."}
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
            <div className="bg-gradient-to-br from-purple-500 to-blue-600 w-14 h-14 md:w-16 md:h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-7 h-7 md:w-8 md:h-8 text-white" />
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
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-3 md:p-4" ref={scrollRef}>
            <div className="space-y-4 pb-4">
              {messages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 md:gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} group relative`}
                >
                  {msg.role === "assistant" && (
                    <Avatar className="w-7 h-7 md:w-8 md:h-8 border border-slate-700 shrink-0 mt-1">
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
                            __html: sanitizeHtml(marked.parse(msg.content) as string),
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
          </ScrollArea>

          <div className="p-3 md:p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
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
        </CardContent>
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
                : lang === "th"
                  ? "กำลังคัดเลือกคณะที่ใช่..."
                  : "Curating your personalized programs..."}
            </h3>
            <p className="text-slate-400 text-sm">
              {loadingStage === "core"
                ? lang === "th"
                  ? "พี่ Seed AI กำลังประมวลผลคำตอบของคุณ"
                  : "Connecting the dots from our chat"
                : lang === "th"
                  ? "กำลังหาข้อมูลคณะและมหาวิทยาลัยที่เหมาะกับคุณ"
                  : "Matching you with top universities"}
            </p>
          </div>

          <div className="flex gap-2">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${loadingStage === "core" ? "w-12 bg-blue-500" : "w-4 bg-blue-500/30"}`}
            />
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${loadingStage === "details" ? "w-12 bg-purple-500" : "w-4 bg-purple-500/30"}`}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
