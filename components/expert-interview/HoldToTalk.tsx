"use client";

import { useScribe } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoldToTalkProps {
  onPartial: (text: string) => void;
  onCommitted: (text: string) => void;
  disabled?: boolean;
  language?: string;
  big?: boolean;
}

type ConnectionPhase = "idle" | "connecting" | "connected";

export function HoldToTalk({ onPartial, onCommitted, disabled, language, big }: HoldToTalkProps) {
  // Stable callback refs — avoids stale closures inside useScribe
  const onPartialRef = useRef(onPartial);
  const onCommittedRef = useRef(onCommitted);
  onPartialRef.current = onPartial;
  onCommittedRef.current = onCommitted;

  const committedRef = useRef("");
  const shouldDisconnectRef = useRef(false);
  const [connectionPhase, setConnectionPhase] = useState<ConnectionPhase>("idle");

  const flushCommittedText = useCallback(() => {
    window.setTimeout(() => {
      const text = committedRef.current.trim();
      if (text) onCommittedRef.current(text);
      committedRef.current = "";
    }, 200);
  }, []);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      onPartialRef.current(data.text);
    },
    onCommittedTranscript: (data) => {
      committedRef.current = data.text;
    },
    onConnect: () => {
      setConnectionPhase("connected");
    },
    onDisconnect: () => {
      shouldDisconnectRef.current = false;
      setConnectionPhase("idle");
    },
    onError: () => {
      shouldDisconnectRef.current = false;
      setConnectionPhase("idle");
    },
  });

  useEffect(() => {
    if (connectionPhase === "connected" && shouldDisconnectRef.current) {
      shouldDisconnectRef.current = false;
      try {
        scribe.disconnect();
      } catch {
        // Ignore — already disconnected
      }
      setConnectionPhase("idle");
      flushCommittedText();
    }
  }, [connectionPhase, flushCommittedText, scribe]);

  const isRecording = connectionPhase !== "idle";

  const doDisconnect = useCallback(() => {
    try {
      scribe.disconnect();
    } catch {
      // Ignore — already disconnected
    }
    setConnectionPhase("idle");
    flushCommittedText();
  }, [flushCommittedText, scribe]);

  const startRecording = useCallback(async () => {
    if (connectionPhase !== "idle" || disabled) return;
    committedRef.current = "";
    shouldDisconnectRef.current = false;
    setConnectionPhase("connecting");

    try {
      const res = await fetch("/api/expert-interview/scribe-token");
      if (!res.ok) throw new Error("Token fetch failed");
      const token = await res.json();
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      setConnectionPhase("idle");
      console.error("[HoldToTalk] connect failed", err);
    }
  }, [connectionPhase, disabled, scribe]);

  const stopRecording = useCallback(() => {
    if (connectionPhase === "connecting") {
      shouldDisconnectRef.current = true;
      return;
    }

    if (connectionPhase !== "connected") return;

    doDisconnect();
  }, [connectionPhase, doDisconnect]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startRecording();
    },
    [startRecording]
  );

  const handlePointerUp = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const label = language === "th" ? "กดค้างเพื่อพูด" : "Hold to talk";

  if (big) {
    return (
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={disabled}
        className={cn(
          "flex-1 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 select-none touch-none transition-all duration-150",
          isRecording
            ? "bg-red-500 ring-4 ring-red-500/40 scale-[1.02]"
            : "bg-gray-700 hover:bg-gray-600 active:scale-[0.98]",
          disabled && "opacity-40 pointer-events-none"
        )}
        aria-label={label}
        title={label}
      >
        <Mic
          className={cn(
            "text-white transition-all",
            isRecording ? "h-7 w-7 animate-pulse" : "h-6 w-6 text-gray-200"
          )}
        />
        <span className={cn(
          "text-xs font-medium tracking-wide",
          isRecording ? "text-red-100" : "text-gray-300"
        )}>
          {isRecording
            ? (language === "th" ? "กำลังฟัง..." : "Listening...")
            : label}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      disabled={disabled}
      className={cn(
        "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-150 select-none touch-none",
        isRecording
          ? "bg-red-500 ring-4 ring-red-500/30 scale-110"
          : "bg-gray-700 hover:bg-gray-600 active:scale-95",
        disabled && "opacity-40 pointer-events-none"
      )}
      aria-label={label}
      title={label}
    >
      <Mic
        className={cn(
          "text-white transition-all",
          isRecording ? "h-5 w-5 animate-pulse" : "h-4 w-4 text-gray-300"
        )}
      />
    </button>
  );
}
