"use client";

import { useState, useRef, useEffect, KeyboardEvent, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Mic, X, AlertCircle } from "lucide-react";
import { HoldToTalk } from "./HoldToTalk";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/expert-interview";

const STORAGE_KEY = "expert-interview-draft";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  language?: string;
  messages?: ChatMessage[];
}

export function ChatInput({
  onSend,
  isLoading,
  disabled,
  placeholder,
  language,
  messages = [],
}: ChatInputProps) {
  const [value, setValue] = useState(() => {
    // Restore from sessionStorage on mount
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(STORAGE_KEY) || "";
    }
    return "";
  });
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState(false);
  const [micPermission, setMicPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Persist to sessionStorage on change
  useEffect(() => {
    if (value.trim()) {
      sessionStorage.setItem(STORAGE_KEY, value);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [value]);

  // Auto-grow textarea (with larger max for long paragraphs)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue("");
    sessionStorage.removeItem(STORAGE_KEY);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePartial = (text: string) => setLiveTranscript(text);

  const handleTranscribed = (text: string) => {
    setLiveTranscript(null);
    setVoiceMode(false);
    if (text.trim()) {
      setValue((prev) => (prev.trim() ? `${prev}\n\n${text.trim()}` : text.trim()));
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  // Request mic permission when clicking the mic button
  const requestMicPermission = useCallback(async () => {
    if (micPermission === "granted") {
      setVoiceMode(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately stop the stream - we just wanted permission
      stream.getTracks().forEach((track) => track.stop());
      setMicPermission("granted");
      setVoiceMode(true);
    } catch (err) {
      console.error("[ChatInput] Mic permission denied", err);
      setMicPermission("denied");
    }
  }, [micPermission]);

  // Convert messages to the format expected by HoldToTalk
  const chatHistory = messages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  // ── Voice mode ────────────────────────────────────────────────────────────
  if (voiceMode) {
    const transcriptPlaceholder =
      language === "th"
        ? "กดค้างปุ่มด้านล่างเพื่อพูด"
        : "Hold the button below to speak";

    return (
      <div className="flex flex-col gap-3">
        {/* Live transcription display */}
        <div
          className={cn(
            "min-h-[64px] rounded-xl px-4 py-3 text-sm leading-relaxed transition-all",
            liveTranscript
              ? "bg-gray-800/80 border border-purple-500/40 text-purple-200 italic"
              : "bg-gray-800/40 border border-gray-700/40 text-gray-500 flex items-center justify-center text-center"
          )}
        >
          {liveTranscript || transcriptPlaceholder}
        </div>

        {/* Big hold-to-talk + back to text */}
        <div className="flex items-stretch gap-3">
          <button
            type="button"
            onClick={() => {
              setLiveTranscript(null);
              setVoiceMode(false);
            }}
            className="shrink-0 w-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label={language === "th" ? "กลับไปพิมพ์" : "Switch to text"}
          >
            <X className="h-5 w-5" />
          </button>
          <HoldToTalk
            onPartial={handlePartial}
            onTranscribed={handleTranscribed}
            disabled={isLoading || disabled}
            language={language}
            chatHistory={chatHistory}
            big
          />
        </div>
      </div>
    );
  }

  // ── Text mode ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      {/* Mic permission denied warning */}
      {micPermission === "denied" && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {language === "th"
              ? "ไม่สามารถเข้าถึงไมโครโฟน กรุณาอนุญาตในการตั้งค่าเบราว์เซอร์"
              : "Microphone access denied. Please enable it in browser settings."}
          </span>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type your answer..."}
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 resize-none overflow-y-auto bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 leading-relaxed"
          style={{ minHeight: "44px", maxHeight: "300px", fontSize: "16px" }}
        />

        {/* Mic toggle — requests permission on click */}
        <button
          type="button"
          onClick={requestMicPermission}
          disabled={isLoading || disabled}
          className="shrink-0 h-11 w-11 rounded-xl bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors disabled:opacity-40"
          aria-label={language === "th" ? "เปลี่ยนเป็นโหมดเสียง" : "Switch to voice mode"}
        >
          <Mic className="h-4 w-4 text-gray-300" />
        </button>

        <Button
          onClick={handleSend}
          disabled={!value.trim() || isLoading || disabled}
          size="icon"
          className="bg-purple-600 hover:bg-purple-500 shrink-0 h-11 w-11 rounded-xl"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}