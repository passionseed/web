"use client";

import { useState } from "react";

import { deriveOutputs } from "@/lib/onboarding/derive";
import type { CollectedData, OnboardingStep } from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
}

type WizardStep =
  | "stage"
  | "target_clarity"
  | "primary_blocker"
  | "confidence"
  | "career_direction"
  | "commitment_signal";

const WIZARD_STEPS: WizardStep[] = [
  "stage",
  "target_clarity",
  "primary_blocker",
  "confidence",
  "career_direction",
  "commitment_signal",
];

const QUESTIONS: Record<WizardStep, { en: string; th: string }> = {
  stage: {
    en: "Where are you right now?",
    th: "ตอนนี้คุณอยู่ที่จุดไหน?",
  },
  target_clarity: {
    en: "How clear is your target?",
    th: "คุณชัดเจนเรื่องเป้าหมายแค่ไหน?",
  },
  primary_blocker: {
    en: "What's holding you back most?",
    th: "อะไรที่ขวางคุณมากที่สุด?",
  },
  confidence: {
    en: "How confident do you feel about your direction?",
    th: "คุณมั่นใจเรื่องทิศทางของตัวเองแค่ไหน?",
  },
  career_direction: {
    en: "How clear is your career goal?",
    th: "เป้าหมายอาชีพของคุณชัดเจนแค่ไหน?",
  },
  commitment_signal: {
    en: "What are you doing about it right now?",
    th: "ตอนนี้คุณทำอะไรอยู่บ้าง?",
  },
};

const OPTIONS: Record<
  WizardStep,
  Array<{ value: string; en: string; th: string; emoji: string }>
> = {
  stage: [
    { value: "exploring", en: "Exploring", th: "กำลังสำรวจ", emoji: "🔍" },
    { value: "choosing", en: "Choosing", th: "กำลังเลือก", emoji: "🤔" },
    {
      value: "applying_soon",
      en: "Applying soon",
      th: "จะยื่นสมัครเร็วๆ นี้",
      emoji: "📝",
    },
    {
      value: "urgent",
      en: "Urgent (≤3 months)",
      th: "เร่งด่วน (≤3 เดือน)",
      emoji: "🚨",
    },
  ],
  target_clarity: [
    { value: "none", en: "No idea yet", th: "ยังไม่รู้เลย", emoji: "❓" },
    {
      value: "field_only",
      en: "I know the field",
      th: "รู้แค่สายงาน",
      emoji: "🗺️",
    },
    {
      value: "specific",
      en: "Specific school + program",
      th: "มีเป้าหมายชัดเจน",
      emoji: "🎯",
    },
  ],
  primary_blocker: [
    {
      value: "dont_know",
      en: "Don't know what to choose",
      th: "ไม่รู้จะเลือกอะไร",
      emoji: "🤷",
    },
    {
      value: "low_profile",
      en: "Not confident in my profile",
      th: "ไม่มั่นใจในโปรไฟล์ตัวเอง",
      emoji: "📉",
    },
    {
      value: "financial",
      en: "Financial concern",
      th: "กังวลเรื่องค่าใช้จ่าย",
      emoji: "💰",
    },
    {
      value: "family_pressure",
      en: "Family pressure",
      th: "แรงกดดันจากครอบครัว",
      emoji: "👨‍👩‍👧",
    },
    {
      value: "application_process",
      en: "Confused about applications",
      th: "สับสนเรื่องขั้นตอนสมัคร",
      emoji: "📋",
    },
  ],
  confidence: [
    {
      value: "low",
      en: "Low — very unsure",
      th: "ต่ำ — ไม่แน่ใจมาก",
      emoji: "😟",
    },
    {
      value: "medium",
      en: "Medium — some ideas",
      th: "กลาง — มีแนวคิดบ้าง",
      emoji: "🙂",
    },
    {
      value: "high",
      en: "High — pretty clear",
      th: "สูง — ค่อนข้างชัดเจน",
      emoji: "😊",
    },
  ],
  career_direction: [
    { value: "no_idea", en: "No idea", th: "ไม่รู้เลย", emoji: "🌫️" },
    { value: "some_ideas", en: "Some ideas", th: "มีแนวคิดบ้าง", emoji: "💡" },
    { value: "clear_goal", en: "Clear goal", th: "ชัดเจน", emoji: "⭐" },
  ],
  commitment_signal: [
    {
      value: "browsing",
      en: "Just browsing",
      th: "แค่เปิดดู",
      emoji: "👀",
    },
    {
      value: "researching",
      en: "Actively researching",
      th: "กำลังหาข้อมูลอยู่",
      emoji: "🔎",
    },
    {
      value: "preparing",
      en: "Already preparing / applying",
      th: "เตรียมตัวหรือสมัครแล้ว",
      emoji: "🏃",
    },
  ],
};

type AssessmentFields = Required<
  Pick<
    CollectedData,
    | "stage"
    | "target_clarity"
    | "primary_blocker"
    | "confidence"
    | "career_direction"
    | "commitment_signal"
  >
>;

export function AssessmentWizardPhase({ data, advance }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<CollectedData>>({});
  const language = (data.language ?? "en") as "en" | "th";
  const isEnglish = language === "en";

  const currentField = WIZARD_STEPS[stepIndex];
  const question = QUESTIONS[currentField][language];
  const options = OPTIONS[currentField];

  const handleSelect = (value: string) => {
    const nextAnswers = { ...answers, [currentField]: value };
    setAnswers(nextAnswers);

    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    const completeAnswers = nextAnswers as AssessmentFields;
    const derived = deriveOutputs(completeAnswers);
    void advance("influence", { ...completeAnswers, ...derived });
  };

  return (
    <div className="w-full max-w-md px-6">
      <div className="ei-card rounded-[var(--space-card-radius)] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.22em] text-white/40">
            {stepIndex + 1} / {WIZARD_STEPS.length}
          </p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">
            {question}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="ei-card flex items-center gap-4 rounded-[var(--space-card-radius)] border border-white/10 bg-white/[0.04] p-4 text-left transition-all duration-[160ms] hover:border-orange-300/40 hover:bg-orange-300/[0.08]"
            >
              <span className="text-2xl" aria-hidden="true">
                {option.emoji}
              </span>
              <span className="text-sm font-medium leading-6 text-white/92">
                {isEnglish ? option.en : option.th}
              </span>
            </button>
          ))}
        </div>

        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={() => setStepIndex((current) => current - 1)}
            className="mt-5 w-full text-center text-xs font-medium text-white/45 transition-colors hover:text-white/70"
          >
            ← {isEnglish ? "Back" : "ย้อนกลับ"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
