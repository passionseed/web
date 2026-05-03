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
  const [showOptions, setShowOptions] = useState(
    Boolean(data.name ?? oauthName)
  );

  const content = useMemo(() => CONTENT[language], [language]);
  const trimmedName = name.trim();
  const canContinue = trimmedName.length > 0;
  const isOauthUser = Boolean(oauthName);

  useEffect(() => {
    if (trimmedName.length > 0 && !showOptions) {
      const timer = setTimeout(() => setShowOptions(true), 500);
      return () => clearTimeout(timer);
    }
  }, [trimmedName, showOptions]);

  return (
    <section className="w-full max-w-3xl">
      <div className="ei-card ei-card--static relative overflow-hidden rounded-[28px] border border-white/10 px-6 py-6 sm:px-10 sm:py-8">
        <div className="relative flex flex-col gap-8">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200/70">
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
            <label className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                {content.nameLabel}
              </span>
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={content.namePlaceholder}
                className="h-14 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-lg text-white placeholder:text-white/20 transition-all focus:border-orange-300/50 focus:bg-white/[0.08] focus:outline-none"
              />
            </label>
          ) : null}

          {showOptions && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5 duration-700">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                  {content.helper}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    {
                      value: "chat",
                      title: content.chatTitle,
                      description: content.chatDescription,
                      icon: (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/20 text-xl">
                          💬
                        </div>
                      ),
                      accent:
                        "from-orange-300/24 via-pink-400/16 to-transparent",
                    },
                    {
                      value: "wizard",
                      title: content.wizardTitle,
                      description: content.wizardDescription,
                      icon: (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/20 text-xl">
                          ✨
                        </div>
                      ),
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
                        "ei-card group relative flex min-h-[180px] flex-col items-start justify-between overflow-hidden rounded-[24px] border p-6 text-left transition-all duration-300",
                        isSelected
                          ? "ei-card--lit border-orange-300/40 bg-[linear-gradient(180deg,rgba(255,245,200,0.24)_0%,rgba(252,211,77,0.20)_22%,rgba(251,191,36,0.18)_54%,rgba(249,115,22,0.16)_100%)] shadow-[0_20px_40px_rgba(251,146,60,0.15)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]",
                      ].join(" ")}
                      aria-pressed={isSelected}
                    >
                      <div
                        className={[
                          "pointer-events-none absolute inset-0 bg-gradient-to-br transition-opacity duration-300",
                          option.accent,
                          isSelected
                            ? "opacity-100 mix-blend-screen"
                            : "opacity-40 group-hover:opacity-60",
                        ].join(" ")}
                      />
                      
                      <div className="relative w-full space-y-4">
                        <div className="flex items-center justify-between">
                          {option.icon}
                          {isSelected && (
                            <div className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_white]" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-xl font-bold text-white">
                            {option.title}
                          </h2>
                          <p
                            className={[
                              "text-sm leading-relaxed",
                              isSelected ? "text-white/90" : "text-white/60",
                            ].join(" ")}
                          >
                            {option.description}
                          </p>
                        </div>
                      </div>

                      <span
                        className={[
                          "relative mt-6 inline-flex items-center text-[10px] font-bold uppercase tracking-widest",
                          isSelected ? "text-white" : "text-white/30",
                        ].join(" ")}
                      >
                        {isSelected ? content.selected : content.choose}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
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
                  className="ei-button-dusk min-w-[200px] justify-center py-4 text-base font-bold shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>{content.continue}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
