"use client";

import { useScribe } from "@elevenlabs/react";
import { useCallback, useRef } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface HoldToTalkProps {
  onPartial: (text: string) => void;
  onCommitted: (text: string) => void;
  disabled?: boolean;
  language?: string;
}

export function HoldToTalk({ onPartial, onCommitted, disabled, language }: HoldToTalkProps) {
  // Stable callback refs — avoids stale closures inside useScribe
  const onPartialRef = useRef(onPartial);
  const onCommittedRef = useRef(onCommitted);
  onPartialRef.current = onPartial;
  onCommittedRef.current = onCommitted;

  const committedRef = useRef("");
  // Tracks whether we're mid-connect() so we can disconnect after it resolves
  const connectingRef = useRef(false);
  const shouldDisconnectRef = useRef(false);

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    onPartialTranscript: (data) => {
      onPartialRef.current(data.text);
    },
    onCommittedTranscript: (data) => {
      committedRef.current = data.text;
    },
  });

  const isRecording = scribe.isConnected || connectingRef.current;

  const doDisconnect = useCallback(() => {
    try {
      scribe.disconnect();
    } catch {
      // Ignore — already disconnected
    }
    setTimeout(() => {
      const text = committedRef.current.trim();
      if (text) onCommittedRef.current(text);
      committedRef.current = "";
    }, 200);
  }, [scribe]);

  const startRecording = useCallback(async () => {
    if (connectingRef.current || scribe.isConnected || disabled) return;
    committedRef.current = "";
    shouldDisconnectRef.current = false;
    connectingRef.current = true;
    try {
      const res = await fetch("/api/expert-interview/scribe-token");
      if (!res.ok) throw new Error("Token fetch failed");
      const token = await res.json();
      await scribe.connect({
        token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (err) {
      console.error("[HoldToTalk] connect failed", err);
    } finally {
      connectingRef.current = false;
      // User released while we were connecting — disconnect immediately
      if (shouldDisconnectRef.current) {
        doDisconnect();
        shouldDisconnectRef.current = false;
      }
    }
  }, [scribe, disabled, doDisconnect]);

  const stopRecording = useCallback(() => {
    if (connectingRef.current) {
      // Still connecting — flag to disconnect once connect() resolves
      shouldDisconnectRef.current = true;
      return;
    }
    if (!scribe.isConnected) return;
    doDisconnect();
  }, [scribe, doDisconnect]);

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
