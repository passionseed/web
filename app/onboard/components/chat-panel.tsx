"use client";

import { useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (text: string) => void;
  isLoading: boolean;
  placeholder?: string;
  contextChips?: string[];
}

export function ChatPanel({
  messages,
  onSend,
  isLoading,
  placeholder,
  contextChips,
}: ChatPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];
  const showLoadingBubble =
    isLoading &&
    (!lastMessage ||
      lastMessage.role !== "assistant" ||
      lastMessage.content.trim().length === 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const value = inputRef.current?.value.trim();
    if (!value || isLoading) return;

    onSend(value);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="ei-card ei-card--static flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04]">
      {contextChips?.length ? (
        <div className="border-b border-white/5 px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {contextChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-orange-300/25 bg-orange-400/10 px-2.5 py-1 text-xs text-orange-100/90"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex min-h-full flex-col gap-3">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={[
                  "max-w-[84%] rounded-[1.35rem] px-4 py-3 text-sm leading-relaxed shadow-[0_12px_32px_rgba(0,0,0,0.16)]",
                  message.role === "user"
                    ? "border border-orange-300/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.26),rgba(190,24,93,0.28))] text-white"
                    : "border border-white/8 bg-white/8 text-white/90",
                ].join(" ")}
              >
                {message.content}
              </div>
            </div>
          ))}

          {showLoadingBubble ? (
            <div className="flex justify-start">
              <div className="rounded-[1.35rem] border border-white/8 bg-white/8 px-4 py-3 text-sm text-white/55">
                ...
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t border-white/5 px-4 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSend();
              }
            }}
            placeholder={placeholder || "Type your message..."}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-orange-300/45 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isLoading}
            className="ei-button-dusk min-w-12 justify-center px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
