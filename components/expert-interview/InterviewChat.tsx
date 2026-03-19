"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ProgressIndicator } from "./ProgressIndicator";
import { useLanguage } from "@/lib/i18n/language-context";
import type {
  ChatMessage as ChatMessageType,
  ExtractedCareerData,
  InterviewProgress,
  InterviewQuestion,
  InterviewType,
} from "@/types/expert-interview";

interface InterviewChatProps {
  sessionId: string;
  firstQuestion: InterviewQuestion;
  initialProgress: InterviewProgress;
  interviewType?: InterviewType;
  onComplete: (extractedData: ExtractedCareerData, transcript: ChatMessageType[]) => void;
}

export function InterviewChat({
  sessionId,
  firstQuestion,
  initialProgress,
  interviewType = "expert",
  onComplete,
}: InterviewChatProps) {
  const { language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState<ChatMessageType[]>([
    { role: "assistant", content: firstQuestion.text, timestamp: new Date().toISOString() },
  ]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(firstQuestion.id);
  const [progress, setProgress] = useState<InterviewProgress>(initialProgress);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // On iOS Safari, the software keyboard overlays fixed elements without resizing the viewport.
  // Track the gap between the layout viewport and the visual viewport (= keyboard height on iOS,
  // ~0 on Android Chrome where the viewport already resizes).
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kh = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(kh);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const t = {
    en: { error: "Something went wrong. Please try again." },
    th: { error: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" },
  }[language];

  // Scroll to bottom on new messages or when keyboard opens (content shifts)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, keyboardInset]);

  const handleSend = async (message: string) => {
    if (isLoading) return;

    const userMessage: ChatMessageType = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/expert-interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message,
          currentQuestionId,
          language,
          interviewType,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) throw new Error("Failed to process message");

      const data = await response.json();

      if (data.isComplete) {
        onComplete(data.extractedData, updatedMessages);
        return;
      }

      if (data.nextQuestion) {
        const assistantMessage: ChatMessageType = {
          role: "assistant",
          content: data.nextQuestion.text,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setCurrentQuestionId(data.nextQuestion.id);
        setProgress(data.progress);
      }
    } catch {
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Nav + progress */}
      <div className="shrink-0 border-b border-gray-800/60 bg-black/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <span className="text-sm font-semibold text-white tracking-tight">
              PassionSeed <span className="text-gray-500 font-normal">· Expert Interview</span>
            </span>
            <button
              onClick={() => setLanguage(language === "en" ? "th" : "en")}
              className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-full px-3 py-1 transition-colors"
            >
              {language === "en" ? "🇹🇭 TH" : "🇬🇧 EN"}
            </button>
          </div>
          <div className="pb-3">
            <ProgressIndicator current={progress.current} total={progress.total} language={language} />
          </div>
        </div>
      </div>

      {/* Messages — scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area — paddingBottom lifts input above keyboard on iOS Safari */}
      <div
        className="shrink-0 bg-gradient-to-t from-black from-60% to-transparent pt-4"
        style={{ paddingBottom: keyboardInset > 0 ? `${keyboardInset}px` : undefined }}
      >
        <div
          className="max-w-3xl mx-auto px-4"
          style={{ paddingBottom: keyboardInset > 0 ? "8px" : "max(16px, env(safe-area-inset-bottom))" }}
        >
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            disabled={false}
            placeholder={language === "th" ? "พิมพ์คำตอบของคุณ..." : "Type your answer..."}
            language={language}
            messages={messages}
          />
        </div>
      </div>
    </div>
  );
}
