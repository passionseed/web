"use client";

import { useMemo, useState } from "react";

import type { CollectedData, OnboardingStep } from "@/types/onboarding";

interface WelcomePhaseProps {
  data: CollectedData;
  oauthName: string | null;
  advance: (
    step: OnboardingStep,
    updates: Partial<CollectedData>
  ) => void | Promise<void>;
  goBack: () => void | Promise<void>;
}

const CONTENT = {
  en: {
    eyebrow: "Onboarding",
    intro: "A short setup before we shape your direction.",
    nameLabel: "What's your first name?",
    namePlaceholder: "Your name",
    greeting: (name: string) =>
      `Hey ${name}, let’s figure out what excites you.`,
    helper: "Choose how you want to move through onboarding.",
    chatTitle: "Talk it through",
    chatDescription: "Talk naturally and let the system read your signal.",
    wizardTitle: "Go step by step",
    wizardDescription: "Answer one focused question at a time.",
    selected: "Selected path",
    choose: "Tap to choose",
    continue: "Continue",
    languageToggle: "TH",
  },
  th: {
    eyebrow: "เริ่มต้น",
    intro: "ตั้งค่าสั้น ๆ ก่อน เราจะช่วยหาทิศทางที่เหมาะกับคุณ",
    nameLabel: "ชื่อของคุณคืออะไร?",
    namePlaceholder: "ชื่อของคุณ",
    greeting: (name: string) =>
      `สวัสดี ${name} เรามาหาสิ่งที่ทำให้คุณรู้สึกอยากไปต่อกัน`,
    helper: "เลือกวิธีที่คุณอยากเริ่มต้น",
    chatTitle: "เล่าแบบคุยกัน",
    chatDescription: "เล่าแบบธรรมชาติ แล้วให้ระบบจับสัญญาณของคุณ",
    wizardTitle: "ค่อย ๆ ไปทีละขั้น",
    wizardDescription: "ค่อย ๆ ตอบทีละคำถามอย่างมีโครงสร้าง",
    selected: "วิธีที่เลือกอยู่",
    choose: "แตะเพื่อเลือก",
    continue: "ไปต่อ",
    languageToggle: "EN",
  },
} as const;

export function WelcomePhase({ data, oauthName, advance }: WelcomePhaseProps) {
  const [language] = useState<"en" | "th">(data.language ?? "en");
  const [name, setName] = useState(data.name ?? oauthName ?? "");
  const [mode, setMode] = useState<"chat" | "wizard">(data.mode ?? "wizard");

  const content = useMemo(() => CONTENT[language], [language]);
  const trimmedName = name.trim();
  const canContinue = trimmedName.length > 0;
  const isOauthUser = Boolean(oauthName);

  return (
    <section className="w-full max-w-3xl">
      <div className="ei-card ei-card--static relative overflow-hidden rounded-[28px] border border-white/10 px-6 py-6 sm:px-10 sm:py-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.16),transparent_70%)] opacity-90" />

        <div className="relative flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <p className="text-xs font-medium text-orange-200/70">
                {content.eyebrow}
              </p>
              <div className="space-y-1.5">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {isOauthUser
                    ? content.greeting(trimmedName || oauthName || "")
                    : content.nameLabel}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                  {isOauthUser ? content.helper : content.intro}
                </p>
              </div>
            </div>
          </div>

          {!isOauthUser ? (
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-white/75">
                {content.nameLabel}
              </span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={content.namePlaceholder}
                className="h-12 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-base text-white placeholder:text-white/30 focus:border-orange-300/50 focus:outline-none"
              />
            </label>
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-medium text-white/72">
              {content.helper}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {(
                [
                  {
                    value: "chat",
                    title: content.chatTitle,
                    description: content.chatDescription,
                    accent: "from-orange-300/24 via-pink-400/16 to-transparent",
                  },
                  {
                    value: "wizard",
                    title: content.wizardTitle,
                    description: content.wizardDescription,
                    accent:
                      "from-violet-300/18 via-fuchsia-400/12 to-transparent",
                  },
                ] as const
              ).map((option) => {
                const isSelected = mode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={[
                      "ei-card relative flex min-h-[164px] flex-col items-start justify-between overflow-hidden rounded-[24px] border p-5 text-left transition-all duration-200",
                      isSelected
                        ? "ei-card--lit bg-[linear-gradient(180deg,rgba(255,245,200,0.24)_0%,rgba(252,211,77,0.20)_22%,rgba(251,191,36,0.18)_54%,rgba(249,115,22,0.16)_100%)]"
                        : "border-white/10 bg-white/[0.03]",
                    ].join(" ")}
                    aria-pressed={isSelected}
                  >
                    <div
                      className={[
                        "pointer-events-none absolute inset-0 bg-gradient-to-br transition-opacity duration-200",
                        option.accent,
                        isSelected
                          ? "opacity-100 mix-blend-screen"
                          : "opacity-65",
                      ].join(" ")}
                    />
                    {isSelected ? (
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,250,214,0.42),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(251,191,36,0.36),transparent_58%)]" />
                    ) : null}
                    <div className="relative space-y-3">
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-semibold text-white">
                          {option.title}
                        </h2>
                        <p
                          className={[
                            "text-sm leading-6",
                            isSelected ? "text-white/88" : "text-white/65",
                          ].join(" ")}
                        >
                          {option.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={[
                        "relative mt-5 inline-flex items-center text-xs font-semibold",
                        isSelected ? "text-white/92" : "text-white/42",
                      ].join(" ")}
                    >
                      {isSelected ? content.selected : content.choose}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canContinue}
              onClick={() =>
                advance("interest", {
                  language,
                  name: trimmedName,
                  mode,
                })
              }
              className="ei-button-dusk min-w-[180px] justify-center disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>{content.continue}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
