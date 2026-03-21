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
    chatTitle: "Chat with AI",
    chatDescription: "Talk naturally and let the system read your signal.",
    wizardTitle: "Step-by-step wizard",
    wizardDescription: "Answer one focused question at a time.",
    selected: "Selected",
    choose: "Choose",
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
    chatTitle: "คุยกับ AI",
    chatDescription: "เล่าแบบธรรมชาติ แล้วให้ระบบจับสัญญาณของคุณ",
    wizardTitle: "ตอบแบบเป็นขั้นตอน",
    wizardDescription: "ค่อย ๆ ตอบทีละคำถามอย่างมีโครงสร้าง",
    selected: "เลือกแล้ว",
    choose: "เลือกวิธีนี้",
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
      <div className="ei-card relative overflow-hidden rounded-[28px] border border-white/10 px-6 py-6 sm:px-10 sm:py-8">
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
                      "ei-card relative flex min-h-[148px] flex-col items-start justify-between overflow-hidden rounded-[24px] border p-5 text-left transition-colors",
                      isSelected
                        ? "border-orange-300/40 bg-white/[0.07]"
                        : "border-white/10 bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                        option.accent,
                      ].join(" ")}
                    />
                    <div className="relative space-y-3">
                      <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-white/12 bg-black/15 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
                        {option.value}
                      </span>
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-semibold text-white">
                          {option.title}
                        </h2>
                        <p className="text-sm leading-6 text-white/65">
                          {option.description}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="relative mt-5 inline-flex items-center text-xs font-semibold text-white/55">
                        {content.selected}
                      </span>
                    ) : null}
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
