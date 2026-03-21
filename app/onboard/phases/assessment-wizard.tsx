"use client";

import { useState } from "react";

import { BackButton } from "../components/back-button";
import { TcasTargetPicker } from "../components/tcas-target-picker";
import { deriveOutputs } from "@/lib/onboarding/derive";
import type {
  CollectedData,
  OnboardingStep,
  TargetClarity,
} from "@/types/onboarding";

interface Props {
  data: CollectedData;
  advance: (step: OnboardingStep, updates: Partial<CollectedData>) => void;
  goBack: () => void | Promise<void>;
}

type WizardStep =
  | "stage"
  | "target_clarity"
  | "tcas_target"
  | "primary_blocker"
  | "confidence"
  | "career_direction"
  | "commitment_signal";

const QUESTIONS: Record<WizardStep, { en: string; th: string }> = {
  stage: {
    en: "Which stage are you in with choosing your next study or career direction?",
    th: "ตอนนี้คุณอยู่ช่วงไหนของการตัดสินใจเรื่องเรียนต่อหรือเส้นทางในอนาคต?",
  },
  target_clarity: {
    en: "How clear is your future direction right now?",
    th: "คุณมีเป้าหมายชัดเจนเรื่องอนาคตแค่ไหน?",
  },
  tcas_target: {
    en: "Let's pin down your target",
    th: "มาลองระบุเป้าหมายให้ชัดขึ้น",
  },
  primary_blocker: {
    en: "What feels like the biggest problem right now?",
    th: "ตอนนี้อะไรคือปัญหาใหญ่ที่สุดสำหรับคุณ?",
  },
  confidence: {
    en: "How confident do you feel about your direction?",
    th: "ตอนนี้คุณมั่นใจกับทิศทางที่ตัวเองกำลังคิดไว้แค่ไหน?",
  },
  career_direction: {
    en: "How clearly can you picture the future you want?",
    th: "ตอนนี้ภาพอนาคตที่คุณอยากไปถึง ชัดในใจแค่ไหนแล้ว?",
  },
  commitment_signal: {
    en: "How far have you already started acting on it?",
    th: "ตอนนี้คุณเริ่มลงมือกับเรื่องนี้ไปถึงไหนแล้ว?",
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
  tcas_target: [],
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
    { value: "some_ideas", en: "Some ideas", th: "พอมีแนวทาง", emoji: "💡" },
    {
      value: "clear_goal",
      en: "Clear goal",
      th: "ค่อนข้างชัดเจนแล้ว",
      emoji: "⭐",
    },
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

export function AssessmentWizardPhase({ data, advance, goBack }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<CollectedData>>({});
  const language = (data.language ?? "en") as "en" | "th";
  const isEnglish = language === "en";
  const wizardSteps = buildWizardSteps(
    answers.target_clarity ?? data.target_clarity
  );

  const currentField = wizardSteps[stepIndex];
  const question = QUESTIONS[currentField][language];
  const options = OPTIONS[currentField];

  const handleSelect = (value: string) => {
    const nextAnswers = { ...answers, [currentField]: value };
    if (currentField === "target_clarity" && value !== "specific") {
      delete nextAnswers.target_university_id;
      delete nextAnswers.target_university_name;
      delete nextAnswers.target_program_id;
      delete nextAnswers.target_program_name;
    }
    setAnswers(nextAnswers);

    const nextSteps = buildWizardSteps(
      nextAnswers.target_clarity ?? data.target_clarity
    );
    if (stepIndex < nextSteps.length - 1) {
      setStepIndex((current) => current + 1);
      return;
    }

    const completeAnswers = nextAnswers as AssessmentFields;
    const derived = deriveOutputs(completeAnswers);
    void advance("influence", { ...completeAnswers, ...derived });
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
      return;
    }

    void goBack();
  };

  return (
    <div className="w-full max-w-md px-6">
      <div className="ei-card ei-card--static rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <BackButton
              label={isEnglish ? "Back" : "ย้อนกลับ"}
              onClick={handleBack}
            />
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.22em] text-white/40">
                {stepIndex + 1} / {wizardSteps.length}
              </p>
              <h2 className="mt-3 text-2xl font-semibold leading-tight text-white">
                {question}
              </h2>
            </div>
            <div className="w-[72px]" aria-hidden="true" />
          </div>
        </div>

        {currentField === "tcas_target" ? (
          <TcasTargetPicker
            data={{ ...data, ...answers }}
            language={language}
            onChange={(updates) => {
              setAnswers((current) => ({ ...current, ...updates }));
            }}
            onContinue={() => {
              setStepIndex((current) => current + 1);
            }}
            onSkip={() => {
              setAnswers((current) => ({
                ...current,
                target_university_id: undefined,
                target_university_name: undefined,
                target_program_id: undefined,
                target_program_name: undefined,
              }));
              setStepIndex((current) => current + 1);
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className="ei-card flex items-center gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-left"
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
        )}
      </div>
    </div>
  );
}

function buildWizardSteps(targetClarity?: TargetClarity): WizardStep[] {
  const steps: WizardStep[] = ["stage", "target_clarity"];

  if (targetClarity === "specific") {
    steps.push("tcas_target");
  }

  steps.push(
    "primary_blocker",
    "confidence",
    "career_direction",
    "commitment_signal"
  );

  return steps;
}
