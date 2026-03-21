"use client";

import { useEffect, useState } from "react";

import { BackButton } from "../components/back-button";
import { ChatPanel } from "../components/chat-panel";
import { TcasTargetPicker } from "../components/tcas-target-picker";
import { isAssessmentComplete } from "@/types/onboarding";
import type { CollectedData, OnboardingStep } from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
  goBack: () => void | Promise<void>;
  chatHistory: Array<{ role: "user" | "assistant"; content: string }>;
  onChatHistoryChange: (
    history: Array<{ role: "user" | "assistant"; content: string }>
  ) => void;
}

const OPENING = {
  en: "Now tell me — do you have a plan for getting into a university or program that'll make you happy?",
  th: "บอกฉันหน่อยนะ — คุณมีแผนสำหรับการเข้ามหาวิทยาลัยหรือโปรแกรมที่จะทำให้คุณมีความสุขไหม?",
};

export function AssessmentChatPhase({
  data,
  advance,
  goBack,
  chatHistory,
  onChatHistoryChange,
}: Props) {
  const [localData, setLocalData] = useState<CollectedData>(data);
  const [isLoading, setIsLoading] = useState(false);
  const language = (data.language || "en") as "en" | "th";
  const isEn = language === "en";
  const shouldShowTargetPicker =
    isAssessmentComplete(localData) && localData.target_clarity === "specific";

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  useEffect(() => {
    if (chatHistory.length === 0) {
      onChatHistoryChange([{ role: "assistant", content: OPENING[language] }]);
    }
  }, [chatHistory.length, language, onChatHistoryChange]);

  const handleSend = async (text: string) => {
    const nextHistory = [
      ...chatHistory,
      { role: "user" as const, content: text },
    ];
    onChatHistoryChange(nextHistory);
    setIsLoading(true);

    try {
      const response = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory,
          collected_data: localData,
          interests: localData.interests || [],
        }),
      });

      if (!response.ok) {
        throw new Error("Chat error");
      }

      const json = await response.json();
      onChatHistoryChange([
        ...nextHistory,
        { role: "assistant", content: json.message as string },
      ]);
      setLocalData(json.collected_data as CollectedData);
    } catch {
      onChatHistoryChange([
        ...nextHistory,
        {
          role: "assistant",
          content: isEn
            ? "Something went wrong — please try again."
            : "เกิดข้อผิดพลาด — ลองอีกครั้ง",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const canAdvance = isAssessmentComplete(localData);

  return (
    <div className="flex h-[calc(100vh-9rem)] w-full max-w-3xl flex-col gap-4">
      <div className="px-1">
        <div className="mb-4 flex justify-start">
          <BackButton
            label={isEn ? "Back" : "ย้อนกลับ"}
            onClick={() => {
              void goBack();
            }}
          />
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-orange-200/50">
          {isEn ? "Assessment chat" : "บทสนทนาประเมินตัวเอง"}
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
          {isEn
            ? "Talk it through in your own words"
            : "เล่าความคิดของคุณในแบบของตัวเอง"}
        </h2>
      </div>

      <div className="min-h-0 flex-1">
        {shouldShowTargetPicker ? (
          <div className="ei-card h-full overflow-y-auto rounded-[var(--space-card-radius)] border border-white/10 bg-white/[0.04] p-5">
            <TcasTargetPicker
              data={localData}
              language={language}
              onChange={(updates) => {
                setLocalData((current) => ({ ...current, ...updates }));
              }}
              onContinue={() => {
                void advance("influence", localData);
              }}
              onSkip={() => {
                void advance("influence", {
                  ...localData,
                  target_university_id: undefined,
                  target_university_name: undefined,
                  target_program_id: undefined,
                  target_program_name: undefined,
                });
              }}
            />
          </div>
        ) : (
          <ChatPanel
            messages={chatHistory}
            onSend={handleSend}
            isLoading={isLoading}
            placeholder={
              isEn
                ? "Tell me about your plans..."
                : "เล่าให้ฟังเกี่ยวกับแผนของคุณ..."
            }
            contextChips={localData.interests}
          />
        )}
      </div>

      {canAdvance && !shouldShowTargetPicker ? (
        <div className="px-1">
          <button
            type="button"
            onClick={() => advance("influence", localData)}
            className="ei-button-dusk w-full justify-center py-3 text-sm font-semibold"
          >
            {isEn ? "Next →" : "ถัดไป →"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
