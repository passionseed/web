"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { HoldToTalk } from "./HoldToTalk";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  language?: string;
}

export function ChatInput({ onSend, isLoading, disabled, placeholder, language }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [liveTranscript, setLiveTranscript] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value, liveTranscript]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Partial transcript: preview in field while speaking
  const handlePartial = (text: string) => {
    setLiveTranscript(text);
  };

  // Committed transcript: auto-send
  const handleCommitted = (text: string) => {
    setLiveTranscript(null);
    if (text.trim()) {
      onSend(text.trim());
    }
  };

  const displayValue = liveTranscript !== null ? liveTranscript : value;
  const isRecordingPreview = liveTranscript !== null;

  return (
    <div className="flex gap-2 items-end">
      <HoldToTalk
        onPartial={handlePartial}
        onCommitted={handleCommitted}
        disabled={isLoading || disabled}
        language={language}
      />

      <textarea
        ref={textareaRef}
        value={displayValue}
        onChange={(e) => {
          if (!isRecordingPreview) setValue(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        readOnly={isRecordingPreview}
        placeholder={isRecordingPreview ? "" : (placeholder || "Type your answer...")}
        disabled={isLoading || disabled}
        rows={1}
        className={cn(
          "flex-1 resize-none overflow-hidden bg-gray-800 border border-gray-700 rounded-xl text-white placeholder:text-gray-500 px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 leading-relaxed",
          isRecordingPreview && "text-purple-300 italic border-red-500/50 bg-gray-800/60"
        )}
        style={{ minHeight: "44px", maxHeight: "160px" }}
      />

      <Button
        onClick={handleSend}
        disabled={!value.trim() || isLoading || disabled || isRecordingPreview}
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
  );
}
