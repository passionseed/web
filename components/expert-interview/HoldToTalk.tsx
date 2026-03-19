"use client";

import { useCallback, useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HoldToTalkProps {
  onPartial: (text: string) => void;
  onTranscribed: (text: string) => void;
  disabled?: boolean;
  language?: string;
  big?: boolean;
  chatHistory?: ChatMessage[];
}

type RecordingState = "idle" | "recording" | "processing";

export function HoldToTalk({
  onPartial,
  onTranscribed,
  disabled,
  language,
  big,
  chatHistory = [],
}: HoldToTalkProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    if (state !== "idle" || disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Use webm format which is widely supported
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setState("recording");

      // Show "listening..." feedback
      onPartial(language === "th" ? "กำลังฟัง..." : "Listening...");
    } catch (err) {
      console.error("[HoldToTalk] Failed to start recording", err);
      setState("idle");
    }
  }, [state, disabled, onPartial, language]);

  const stopRecording = useCallback(async () => {
    if (state !== "recording") return;

    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) {
      setState("idle");
      return;
    }

    // Stop the recorder and stream
    mediaRecorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setState("processing");
    onPartial(language === "th" ? "กำลังประมวลผล..." : "Processing...");

    // Wait for the recorder to finish
    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
    });

    // Create audio blob
    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    // Send to transcription API
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("chatHistory", JSON.stringify(chatHistory));
      formData.append("language", language || "en");

      const response = await fetch("/api/expert-interview/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      const text = data.text?.trim();

      onPartial("");
      if (text) {
        onTranscribed(text);
      }
    } catch (err) {
      console.error("[HoldToTalk] Transcription failed", err);
      onPartial("");
      // Could show an error state here
    } finally {
      setState("idle");
    }
  }, [state, chatHistory, language, onPartial, onTranscribed]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startRecording();
    },
    [startRecording]
  );

  const handlePointerUp = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    }
  }, [state, stopRecording]);

  const isRecording = state === "recording";
  const isProcessing = state === "processing";
  const isActive = isRecording || isProcessing;

  const label = language === "th" ? "กดค้างเพื่อพูด" : "Hold to talk";
  const statusText = isRecording
    ? language === "th"
      ? "กำลังฟัง..."
      : "Listening..."
    : isProcessing
      ? language === "th"
        ? "กำลังประมวลผล..."
        : "Processing..."
      : label;

  if (big) {
    return (
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        disabled={disabled || isProcessing}
        className={cn(
          "flex-1 h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 select-none touch-none transition-all duration-150",
          isRecording
            ? "bg-red-500 ring-4 ring-red-500/40 scale-[1.02]"
            : isProcessing
              ? "bg-purple-600 ring-4 ring-purple-500/40"
              : "bg-gray-700 hover:bg-gray-600 active:scale-[0.98]",
          disabled && "opacity-40 pointer-events-none"
        )}
        aria-label={label}
        title={label}
      >
        {isProcessing ? (
          <Loader2 className="h-7 w-7 text-white animate-spin" />
        ) : (
          <Mic
            className={cn(
              "text-white transition-all",
              isRecording ? "h-7 w-7 animate-pulse" : "h-6 w-6 text-gray-200"
            )}
          />
        )}
        <span
          className={cn(
            "text-xs font-medium tracking-wide",
            isRecording
              ? "text-red-100"
              : isProcessing
                ? "text-purple-100"
                : "text-gray-300"
          )}
        >
          {statusText}
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
      disabled={disabled || isProcessing}
      className={cn(
        "shrink-0 h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-150 select-none touch-none",
        isRecording
          ? "bg-red-500 ring-4 ring-red-500/30 scale-110"
          : isProcessing
            ? "bg-purple-600 ring-4 ring-purple-500/30"
            : "bg-gray-700 hover:bg-gray-600 active:scale-95",
        disabled && "opacity-40 pointer-events-none"
      )}
      aria-label={label}
      title={label}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 text-white animate-spin" />
      ) : (
        <Mic
          className={cn(
            "text-white transition-all",
            isRecording ? "h-5 w-5 animate-pulse" : "h-4 w-4 text-gray-300"
          )}
        />
      )}
    </button>
  );
}