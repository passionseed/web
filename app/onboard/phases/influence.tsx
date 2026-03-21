"use client";

import { useState } from "react";

import { BackButton } from "../components/back-button";
import type {
  CollectedData,
  InfluenceSource,
  OnboardingStep,
} from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
  goBack: () => void | Promise<void>;
}

const OPTIONS: Array<{
  value: InfluenceSource;
  en: string;
  th: string;
  emoji: string;
}> = [
  { value: "self", en: "Myself", th: "ตัวเอง", emoji: "🙋" },
  { value: "parents", en: "Parents", th: "พ่อแม่", emoji: "👨‍👩‍👧" },
  { value: "peers", en: "Friends / Peers", th: "เพื่อน", emoji: "👫" },
  { value: "teachers", en: "Teachers", th: "ครู/อาจารย์", emoji: "👩‍🏫" },
  {
    value: "social_media",
    en: "Social media",
    th: "โซเชียลมีเดีย",
    emoji: "📱",
  },
];

export function InfluencePhase({ data, advance, goBack }: Props) {
  const [selected, setSelected] = useState<InfluenceSource[]>(
    data.influencers ?? []
  );
  const isEn = (data.language ?? "en") === "en";

  const toggle = (value: InfluenceSource) => {
    setSelected((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  return (
    <div className="w-full max-w-xl px-6">
      <div className="ei-card ei-card--static flex flex-col gap-6 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <div className="mb-4 flex justify-start">
            <BackButton
              label={isEn ? "Back" : "ย้อนกลับ"}
              onClick={() => {
                void goBack();
              }}
            />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-orange-300/70">
            {isEn ? "Your Circle" : "คนรอบตัวคุณ"}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {isEn
              ? "Who influences how you think about your future?"
              : "เอาจริง ๆ แล้ว ที่คุณเริ่มสนใจทางนี้ ได้แรงบันดาลใจมาจากใครเป็นพิเศษบ้าง?"}
          </h2>
          <p className="text-sm leading-6 text-white/60">
            {isEn
              ? "Select all that apply."
              : "เลือกได้หลายข้อ ถ้ามีหลายคนที่มีผลกับคุณ"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {OPTIONS.map((option) => {
            const isSelected = selected.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className={`ei-card flex items-center gap-4 rounded-[24px] border px-4 py-4 text-left transition-all ${
                  isSelected
                    ? "ei-card--lit bg-[linear-gradient(180deg,rgba(255,245,200,0.24)_0%,rgba(252,211,77,0.20)_22%,rgba(251,191,36,0.18)_54%,rgba(249,115,22,0.16)_100%)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="text-sm font-medium text-white/90 sm:text-base">
                  {isEn ? option.en : option.th}
                </span>
                {isSelected ? (
                  <span className="ml-auto text-sm font-semibold text-white/92">
                    {isEn ? "Selected" : "เลือกอยู่"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => advance("results", { influencers: selected })}
          className="ei-button-dusk w-full justify-center py-3 text-sm font-semibold"
        >
          {isEn ? "Next →" : "ถัดไป →"}
        </button>
      </div>
    </div>
  );
}
